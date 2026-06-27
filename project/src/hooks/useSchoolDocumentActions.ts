import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Application, UserProfile, Scholarship } from '../types';
import { getFileName } from '../utils/documentUploadUtils';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & {
    selection_survey_passed?: boolean;
    selected_application_id?: string | null;
  };
  scholarships: Scholarship;
}

const DOCUMENTS_INFO = [
  {
    key: 'passport',
    label: 'Passport',
    description: 'A valid copy of the student\'s passport. Used for identification and visa purposes.'
  }
];

interface UseSchoolDocumentActionsParams {
  application: ApplicationDetails | null;
  applicationId: string | undefined;
  allStudentApplications: any[];
  studentDocs: any[];
  studentDocuments: any[];
  documentRequests: any[];
  setApplication: React.Dispatch<React.SetStateAction<ApplicationDetails | null>>;
  setAllStudentApplications: React.Dispatch<React.SetStateAction<any[]>>;
  setStudentDocs: React.Dispatch<React.SetStateAction<any[]>>;
  setStudentDocuments: React.Dispatch<React.SetStateAction<any[]>>;
  setDocumentRequests: React.Dispatch<React.SetStateAction<any[]>>;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  latestDocByType: (type: string) => any;
}

export const useSchoolDocumentActions = (params: UseSchoolDocumentActionsParams) => {
  const {
    application,
    applicationId,
    allStudentApplications,
    studentDocs,
    studentDocuments,
    documentRequests,
    setApplication,
    setAllStudentApplications,
    setStudentDocs,
    setStudentDocuments,
    setDocumentRequests,
    setPreviewUrl,
    latestDocByType,
  } = params;

  const { user } = useAuth();

  const [updating, setUpdating] = useState<string | null>(null);
  // Modal para justificar solicitação de mudanças
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingRejectType, setPendingRejectType] = useState<string | null>(null);
  const [pendingRejectDocAppId, setPendingRejectDocAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedAppDocs, setExpandedAppDocs] = useState<Record<string, boolean>>({});
  // Modal para recusar aluno na bolsa
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');
  // Estados para a aba Documents
  const [showRejectDocumentModal, setShowRejectDocumentModal] = useState(false);
  const [pendingRejectDocumentId, setPendingRejectDocumentId] = useState<string | null>(null);
  const [rejectDocumentReason, setRejectDocumentReason] = useState('');
  const [approvingDocumentId, setApprovingDocumentId] = useState<Record<string, boolean>>({});
  const [rejectingDocumentId, setRejectingDocumentId] = useState<Record<string, boolean>>({});
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const updateApplicationDocStatus = async (
    type: string,
    status: 'approved' | 'changes_requested' | 'under_review',
    reviewNotes?: string,
    targetAppId?: string
  ) => {
    const appIdToUse = targetAppId || applicationId;
    const targetApp = allStudentApplications.find((a: any) => a.id === appIdToUse) || application;
    const docs = Array.isArray(targetApp?.documents) ? ([...targetApp.documents] as any[]) : [];
    const idx = docs.findIndex((d: any) => d.type === type);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], status, review_notes: reviewNotes ?? docs[idx]?.review_notes };
    }
    await supabase.from('scholarship_applications').update({ documents: docs }).eq('id', appIdToUse);
    if (appIdToUse === application?.id) {
      setApplication((prev) => prev ? ({ ...prev, documents: docs } as any) : prev);
    }
    setAllStudentApplications(prev =>
      prev.map((a: any) => a.id === appIdToUse ? { ...a, documents: docs } : a)
    );
  };

  // Funções para a aba Documents
  const handleViewUpload = (upload: any) => {
    if (!upload?.file_url) return;
    setPreviewUrl(upload.file_url);
  };

  const handleDownloadTemplate = (url: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const handleApproveDocument = async (documentId: string) => {
    setApprovingDocumentId(prev => ({ ...prev, [documentId]: true }));
    try {
      // Buscar informações do upload para notificação e log
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`*, document_requests!inner(id, title, description)`)
        .eq('id', documentId)
        .single();

      if (fetchError) throw new Error('Failed to fetch upload data: ' + fetchError.message);

      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', documentId);

      if (error) throw new Error('Failed to approve document: ' + error.message);

      // Optimistic update — sem re-fetch
      setStudentDocuments(prev => prev.map(doc =>
        doc.id === documentId ? { ...doc, status: 'approved' } : doc
      ));
      setDocumentRequests(prev => prev.map(req => ({
        ...req,
        uploads: (req.uploads || []).map((u: any) =>
          u.id === documentId ? { ...u, status: 'approved' } : u
        )
      })));

      toast.success('Document approved');

      // Notificações (fire-and-forget)
      try {
        const { data: userData } = await supabase
          .from('user_profiles').select('email').eq('user_id', application?.user_profiles.user_id).single();
        if (userData?.email) {
          fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_notf: "Documento aprovado",
              email_aluno: userData.email,
              nome_aluno: application?.user_profiles.full_name,
              email_universidade: user?.email,
              o_que_enviar: `Congratulations! Your document <strong>${uploadData.file_url ? getFileName(uploadData.file_url) : 'file'}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been approved.`
            }),
          }).catch(console.error);
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token) {
            fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({
                user_id: application?.user_profiles.user_id,
                title: 'Document approved',
                message: `Your document for request "${uploadData.document_requests?.title}" has been approved.`,
                type: 'document_approved',
                link: '/student/dashboard',
              }),
            }).catch(console.error);
          }
        });
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
      }

      // Log (fire-and-forget)
      const studentProfileId = application?.user_profiles?.id;
      const performedBy = user?.id;
      if (studentProfileId && performedBy) {
        fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) })
          .then(r => r.json()).catch(() => ({}))
          .then(j => supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'document_approval',
            p_action_description: `University approved document request upload: ${uploadData.file_url ? getFileName(uploadData.file_url) : 'file'} (${uploadData.document_requests?.title || 'Request'})`,
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: { upload_id: documentId, request_id: uploadData.document_requests?.id || null, request_title: uploadData.document_requests?.title || null, ip: j?.ip }
          })).catch(console.error);
      }

    } catch (err: any) {
      console.error("Error approving document:", err);
      toast.error('Failed to approve document: ' + err.message);
    } finally {
      setApprovingDocumentId(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc.file_url) return;

    try {
      // Não converter a URL aqui, deixar o DocumentViewerModal fazer isso
      // Isso permite que o modal teste ambos os buckets (document-attachments e student-documents)
      const downloadUrl = doc.file_url;

      // Fazer download usando a URL
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download document: ' + response.statusText);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro no download:', err);
      toast.error(`Failed to download document: ${err.message}`);
    }
  };

  const handleViewDocument = (doc: any) => {
    // Verificação de segurança adicional
    if (!doc || !doc.file_url) {
      return;
    }

    // Não converter a URL aqui, deixar o DocumentViewerModal fazer isso
    // Isso permite que o modal teste ambos os buckets (document-attachments e student-documents)
    setPreviewUrl(doc.file_url);
  };

  const approveDoc = async (type: string, targetAppId?: string) => {
    const appIdToUse = targetAppId || applicationId;
    if (!appIdToUse) return;

    try {
      setUpdating(`${appIdToUse}:${type}`);

      const { data: currentApp, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', appIdToUse)
        .single();

      if (fetchError) throw fetchError;

      const updatedDocuments = currentApp?.documents || [];
      const existingDocIndex = updatedDocuments.findIndex((d: any) => d.type === type);

      if (existingDocIndex >= 0) {
        updatedDocuments[existingDocIndex] = {
          ...updatedDocuments[existingDocIndex],
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        };
      } else {
        const currentDoc = latestDocByType(type);
        updatedDocuments.push({
          type,
          url: currentDoc?.file_url || '',
          status: 'approved',
          uploaded_at: currentDoc?.uploaded_at || new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        });
      }

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: updatedDocuments })
        .eq('id', appIdToUse);

      if (updateError) throw updateError;

      if (appIdToUse === application?.id) {
        setApplication(prev => prev ? ({
          ...prev,
          documents: updatedDocuments
        }) : prev);
        setStudentDocs(prev => prev.map(doc =>
          doc.type === type ? { ...doc, status: 'approved' } : doc
        ));
      }

      setAllStudentApplications(prev =>
        prev.map((a: any) => a.id === appIdToUse ? { ...a, documents: updatedDocuments } : a)
      );

      const basicDocTypes = ['passport'];
      const allBasicDocsApproved = basicDocTypes.every(t => {
        const doc = updatedDocuments.find((d: any) => d.type === t);
        return doc && doc.status === 'approved';
      });

      if (allBasicDocsApproved && application?.user_profiles?.user_id) {
        await supabase
          .from('user_profiles')
          .update({ documents_status: 'approved' })
          .eq('user_id', application.user_profiles.user_id);
      }

      if (application?.user_profiles?.user_id) {
        try {
          const docLabels: Record<string, string> = { passport: 'Passport' };
          const label = docLabels[type] || type;
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({
                user_id: application.user_profiles.user_id,
                title: 'Document Approved',
                message: `Your ${label} has been approved by the university.`,
                link: '/student/dashboard/applications'
              })
            });
          }
        } catch (notifErr) {
          console.error('Error sending notification:', notifErr);
        }
      }

      try {
        const studentProfileId = application?.user_profiles?.id;
        const performedBy = user?.id;
        if (studentProfileId && performedBy) {
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) { const j = await res.json(); clientIp = j?.ip; }
          } catch (_) { /* ignore */ }
          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'document_approval',
            p_action_description: `Document ${type} approved by university admin`,
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: { document_type: type, application_id: appIdToUse, ip: clientIp }
          });
        }
      } catch (logErr) {
        console.error('Error logging action:', logErr);
      }

      toast.success('Document approved');
    } catch (error: any) {
      console.error(`Error approving document ${type}:`, error);
      toast.error(`Failed to approve document: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const requestChangesDoc = async (type: string, reason: string, targetAppId?: string) => {
    const appIdToUse = targetAppId || applicationId;
    try {
      setUpdating(`${appIdToUse}:${type}`);
      await updateApplicationDocStatus(type, 'changes_requested', reason || undefined, appIdToUse);
      // Mantém o fluxo do aluno em revisão
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'under_review' })
        .eq('user_id', application.user_profiles.user_id);

      // --- NOTIFICAÇÃO VIA WEBHOOK N8N ---
      try {
        console.log('Enviando notificação de rejeição de documento via webhook...');
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const documentLabel = DOCUMENTS_INFO.find(doc => doc.key === type)?.label || type;
          const webhookPayload = {
            tipo_notf: "Changes Requested",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name || 'Student',
            email_universidade: user?.email,
            o_que_enviar: `Your document <strong>${documentLabel}</strong> has been rejected and needs changes. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          console.log('Enviando webhook para documento rejeitado:', webhookPayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          });

          console.log('Webhook response status:', webhookResponse.status);

          if (!webhookResponse.ok) {
            const webhookErrorText = await webhookResponse.text();
            console.error('Webhook error:', webhookErrorText);
          } else {
            console.log('Webhook enviado com sucesso para rejeição de documento');
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application.user_profiles.user_id,
                  title: 'Document rejected',
                  message: `Your ${documentLabel} document was rejected. Reason: ${reason}`,
                  type: 'document_rejected',
                  link: '/student/dashboard/applications',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }
      // --- FIM DA NOTIFICAÇÃO ---
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectDocument = async (documentId: string, reason: string) => {
    setRejectingDocumentId(prev => ({ ...prev, [documentId]: true }));
    try {
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`*, document_requests!inner(id, title, description)`)
        .eq('id', documentId)
        .single();

      if (fetchError) throw new Error('Failed to fetch upload data: ' + fetchError.message);

      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'rejected', rejection_reason: reason || null, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', documentId);

      if (error) throw new Error('Failed to reject document: ' + error.message);

      // Optimistic update — sem re-fetch
      setStudentDocuments(prev => prev.map(doc =>
        doc.id === documentId ? { ...doc, status: 'rejected', rejection_reason: reason } : doc
      ));
      setDocumentRequests(prev => prev.map(req => ({
        ...req,
        uploads: (req.uploads || []).map((u: any) =>
          u.id === documentId ? { ...u, status: 'rejected', rejection_reason: reason } : u
        )
      })));

      toast.success('Document rejected');

      // Log (fire-and-forget)
      const studentProfileId = application?.user_profiles?.id;
      const performedBy = user?.id;
      if (studentProfileId && performedBy) {
        fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) })
          .then(r => r.json()).catch(() => ({}))
          .then(j => supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'document_rejection',
            p_action_description: `University rejected document request upload: ${uploadData.file_url ? getFileName(uploadData.file_url) : 'file'} (${uploadData.document_requests?.title || 'Request'})`,
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: { upload_id: documentId, request_id: uploadData.document_requests?.id || null, request_title: uploadData.document_requests?.title || null, rejection_reason: reason, ip: j?.ip }
          })).catch(console.error);
      }

      // Notificações (fire-and-forget)
      try {
        const { data: userData } = await supabase
          .from('user_profiles').select('email').eq('user_id', application?.user_profiles.user_id).single();
        if (userData?.email) {
          fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_notf: "Changes Requested",
              email_aluno: userData.email,
              nome_aluno: application?.user_profiles.full_name,
              email_universidade: user?.email,
              o_que_enviar: `Your document <strong>${uploadData.file_url ? getFileName(uploadData.file_url) : 'file'}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
            }),
          }).catch(console.error);
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token) {
            fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({
                user_id: application?.user_profiles.user_id,
                title: 'Document rejected',
                message: `Your document for request "${uploadData.document_requests?.title}" was rejected. Reason: ${reason}`,
                type: 'document_rejected',
                link: '/student/dashboard/applications',
              }),
            }).catch(console.error);
          }
        });
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }

    } catch (err: any) {
      console.error("Error rejecting document:", err);
      toast.error('Failed to reject document: ' + err.message);
    } finally {
      setRejectingDocumentId(prev => ({ ...prev, [documentId]: false }));
    }
  };

  return {
    updating,
    showReasonModal, setShowReasonModal,
    pendingRejectType, setPendingRejectType,
    pendingRejectDocAppId, setPendingRejectDocAppId,
    rejectReason, setRejectReason,
    expandedAppDocs, setExpandedAppDocs,
    showRejectStudentModal, setShowRejectStudentModal,
    rejectStudentReason, setRejectStudentReason,
    showRejectDocumentModal, setShowRejectDocumentModal,
    pendingRejectDocumentId, setPendingRejectDocumentId,
    rejectDocumentReason, setRejectDocumentReason,
    approvingDocumentId,
    rejectingDocumentId,
    expandedRequests, setExpandedRequests,
    expandedHistory, setExpandedHistory,
    updateApplicationDocStatus,
    handleViewUpload,
    handleDownloadTemplate,
    handleApproveDocument,
    handleDownloadDocument,
    handleViewDocument,
    approveDoc,
    requestChangesDoc,
    handleRejectDocument,
  };
};
