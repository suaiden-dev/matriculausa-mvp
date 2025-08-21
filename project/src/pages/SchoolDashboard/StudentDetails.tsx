import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Application, UserProfile, Scholarship } from '../../types';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { MessageCircle, FileText, UserCircle, Eye, Download, CheckCircle2, XCircle } from 'lucide-react';
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

interface ApplicationDetails extends Application {
  user_profiles: UserProfile;
  scholarships: Scholarship;
}

const DOCUMENTS_INFO = [
  {
    key: 'passport',
    label: 'Passport',
    description: 'A valid copy of the student\'s passport. Used for identification and visa purposes.'
  },
  {
    key: 'diploma',
    label: 'High School Diploma',
    description: 'Proof of high school graduation. Required for university admission.'
  },
  {
    key: 'funds_proof',
    label: 'Proof of Funds',
    description: 'A bank statement or financial document showing sufficient funds for study.'
  }
];

const TABS = [
  { id: 'details', label: 'Details', icon: UserCircle },
  // { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'documents', label: 'Documents', icon: FileText },
  // { id: 'review', label: 'Review', icon: FileText }, // Removida a aba Review
];

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const chat = useApplicationChat(applicationId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'documents'>('details');

  // Removido: student_documents como fonte primária; usaremos application.documents
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  // Modal para justificar solicitação de mudanças
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingRejectType, setPendingRejectType] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Modal para recusar aluno na bolsa
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');
  
  // Estados para a aba Documents
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [showRejectDocumentModal, setShowRejectDocumentModal] = useState(false);
  const [pendingRejectDocumentId, setPendingRejectDocumentId] = useState<string | null>(null);
  const [rejectDocumentReason, setRejectDocumentReason] = useState('');

  // Estados para Acceptance Letter
  const [acceptanceLetterFile, setAcceptanceLetterFile] = useState<File | null>(null);
  const [uploadingAcceptanceLetter, setUploadingAcceptanceLetter] = useState(false);
  const [acceptanceLetterUploaded, setAcceptanceLetterUploaded] = useState(false);

  const [fileSelectionError, setFileSelectionError] = useState<string | null>(null);
  const [isFileSelecting, setIsFileSelecting] = useState(false);

  // Estados para o modal de nova solicitação de documento
  const [newDocumentRequest, setNewDocumentRequest] = useState({
    title: '',
    description: '',
    due_date: '',
    attachment: null as File | null
  });
  const [creatingDocumentRequest, setCreatingDocumentRequest] = useState(false);

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails();
    }
  }, [applicationId]);

  // Inicializar estado da Acceptance Letter baseado na aplicação
  useEffect(() => {
    if (application) {
      setAcceptanceLetterUploaded(application.acceptance_letter_status === 'approved');
    }
  }, [application]);

  // Limpar erros quando o arquivo for alterado
  useEffect(() => {
    if (acceptanceLetterFile) {
      clearFileSelectionError();
    }
  }, [acceptanceLetterFile]);

  // Limpar estados de arquivo quando a aba for alterada
  useEffect(() => {
    if (activeTab !== 'documents') {
      setAcceptanceLetterFile(null);
    }
  }, [activeTab]);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id(*),
          scholarships(*, universities(*))
        `)
        .eq('id', applicationId)
        .single();

      if (error) {
        throw error;
      }
      
      if (data) {
        setApplication(data as ApplicationDetails);
        // Mantemos uma cópia simplificada para compatibilidade antiga
        const appDocs = (data as any).documents;
        if (Array.isArray(appDocs) && appDocs.length > 0) {
          setStudentDocs(appDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
        } else {
          // Fallback 1: usar documentos salvos no perfil do aluno (user_profiles.documents)
          const profileDocs = (data as any).user_profiles?.documents;
          if (Array.isArray(profileDocs) && profileDocs.length > 0) {
            setStudentDocs(profileDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
          } else {
            // Fallback 2: buscar do storage se a application ainda não tiver documentos associados
            const studentId = (data as any).user_profiles?.user_id;
            if (studentId) {
              const { data: docs } = await supabase
                .from('student_documents')
                .select('*')
                .eq('user_id', studentId);
              if (docs && docs.length > 0) {
                setStudentDocs((docs || []).map((d: any) => ({ type: d.type, file_url: d.file_url, status: d.status || 'under_review' })));
              } else {
                setStudentDocs([]);
              }
            } else {
              setStudentDocs([]);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching application details:", err);
      setError("Failed to load application details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar e sincronizar o documents_status
  const syncDocumentsStatus = async () => {
    if (!application?.documents || !application?.user_profiles?.user_id) return;
    
    const allDocsApproved = ['passport', 'diploma', 'funds_proof']
      .every((docType) => {
        const doc = application.documents.find((d: any) => d.type === docType);
        return doc && (doc as any).status === 'approved';
      });
    
    // Se todos os documentos estão aprovados mas o status geral não está, atualizar
    if (allDocsApproved && application.user_profiles.documents_status !== 'approved') {
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', application.user_profiles.user_id);
      
      // Atualizar o estado local
      setApplication((prev) => prev ? ({
        ...prev,
        user_profiles: { ...prev.user_profiles, documents_status: 'approved' }
      } as any) : prev);
    }
  };

  // Sincronizar documents_status sempre que a aplicação for carregada
  useEffect(() => {
    if (application && application.user_profiles) {
      syncDocumentsStatus();
    }
  }, [application]);

  // Carregar dados dos documentos quando a aplicação for carregada
  useEffect(() => {
    if (applicationId && application?.user_profiles?.user_id) {
      console.log('Carregando dados dos documentos para application:', applicationId);
      fetchDocumentRequests();
      fetchStudentDocuments();
    }
  }, [applicationId, application]);

  const fetchDocumentRequests = async () => {
    if (!application) return;
    
    try {
      console.log('=== Buscando document requests ===');
      
      // Buscar requests específicos para esta aplicação
      const { data: requests, error: requestsError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', application.id)
        .order('created_at', { ascending: false });
      
      if (requestsError) {
        console.error("Error fetching document requests:", requestsError);
        setDocumentRequests([]);
        return;
      }

      console.log('Document requests encontrados:', requests);

      // Buscar uploads para cada request
      if (requests && requests.length > 0) {
        const requestIds = requests.map(req => req.id);
        console.log('IDs dos requests para buscar uploads:', requestIds);
        
        const { data: uploads, error: uploadsError } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', requestIds);

        if (uploadsError) {
          console.error("Error fetching uploads:", uploadsError);
        } else {
          console.log('Uploads encontrados para os requests:', uploads);
          // Associar uploads aos requests
          const requestsWithUploads = requests.map(request => ({
            ...request,
            uploads: uploads?.filter(upload => upload.document_request_id === request.id) || []
          }));
          console.log('Requests com uploads:', requestsWithUploads);
          setDocumentRequests(requestsWithUploads);
        }
      } else {
        setDocumentRequests([]);
      }
    } catch (error) {
      console.error("Error in fetchDocumentRequests:", error);
      setDocumentRequests([]);
    }
  };

  const fetchStudentDocuments = async () => {
    if (!application) return;
    
    try {
      console.log('=== Buscando todos os uploads do aluno ===');
      console.log('Student user_id:', application.user_profiles.user_id);
      
      // Primeiro, vamos verificar a estrutura da tabela document_request_uploads
      const { data: sampleUploads, error: sampleError } = await supabase
        .from('document_request_uploads')
        .select('*')
        .limit(5);
      
      if (sampleError) {
        console.error("Error fetching sample uploads:", sampleError);
      } else {
        console.log('Estrutura da tabela document_request_uploads:', sampleUploads);
      }
      
      // Buscar TODOS os uploads do aluno na tabela document_request_uploads
      // Vamos tentar diferentes campos que podem identificar o usuário
      let uploads: any[] = [];
      let uploadsError: any = null;
      
      // Tentativa 1: usando uploaded_by
      let { data: uploadsByUser, error: error1 } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description,
            created_at,
            is_global,
            university_id,
            scholarship_application_id
          )
        `)
        .eq('uploaded_by', application.user_profiles.user_id);
      
      if (error1) {
        console.log('Erro ao buscar por uploaded_by:', error1);
      } else if (uploadsByUser && uploadsByUser.length > 0) {
        console.log('Uploads encontrados por uploaded_by:', uploadsByUser);
        uploads = uploadsByUser;
      }
      
      // Tentativa 2: usando user_id
      if (uploads.length === 0) {
        let { data: uploadsByUserId, error: error2 } = await supabase
          .from('document_request_uploads')
          .select(`
            *,
            document_requests!inner(
              id,
              title,
              description,
              created_at,
              is_global,
              university_id,
              scholarship_application_id
            )
          `)
          .eq('user_id', application.user_profiles.user_id);
        
        if (error2) {
          console.log('Erro ao buscar por user_id:', error2);
        } else if (uploadsByUserId && uploadsByUserId.length > 0) {
          console.log('Uploads encontrados por user_id:', uploadsByUserId);
          uploads = uploadsByUserId;
        }
      }
      
      // Tentativa 3: buscar todos e filtrar por scholarship_application_id
      if (uploads.length === 0) {
        let { data: allUploads, error: error3 } = await supabase
          .from('document_request_uploads')
          .select(`
            *,
            document_requests!inner(
              id,
              title,
              description,
              created_at,
              is_global,
              university_id,
              scholarship_application_id
            )
          `);
        
        if (error3) {
          console.log('Erro ao buscar todos os uploads:', error3);
        } else if (allUploads) {
          // Filtrar por scholarship_application_id
          uploads = allUploads.filter(upload => 
            upload.document_requests?.scholarship_application_id === application.id
          );
          console.log('Uploads filtrados por scholarship_application_id:', uploads);
        }
      }

      console.log('Uploads finais encontrados:', uploads);

      if (!uploads || uploads.length === 0) {
        console.log('Nenhum upload encontrado para este aluno');
        setStudentDocuments([]);
        return;
      }

      // Formatar os documentos para exibição
      const studentDocuments = uploads.map(upload => {
        console.log('=== Formatando upload ===');
        console.log('Upload original:', upload);
        console.log('file_url:', upload.file_url);
        console.log('Tipo de file_url:', typeof upload.file_url);
        
        const formatted = {
          id: upload.id,
          filename: upload.file_url?.split('/').pop() || 'Document',
          file_url: upload.file_url,
          status: upload.status || 'under_review',
          uploaded_at: upload.uploaded_at || upload.created_at,
          request_title: upload.document_requests?.title,
          request_description: upload.document_requests?.description,
          request_created_at: upload.document_requests?.created_at,
          is_global: upload.document_requests?.is_global || false,
          request_type: upload.document_requests?.is_global ? 'Global Request' : 'Individual Request'
        };
        
        console.log('Documento formatado:', formatted);
        return formatted;
      });

      console.log('Documentos formatados para exibição:', studentDocuments);
      setStudentDocuments(studentDocuments);
    } catch (error) {
      console.error("Error in fetchStudentDocuments:", error);
      setStudentDocuments([]);
    }
  };

  // Debug: verificar estado da autenticação
  useEffect(() => {
    console.log('=== DEBUG: Estado da autenticação ===');
    console.log('User:', user);
    console.log('User ID:', user?.id);
    console.log('User role:', user?.role);
  }, [user]);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (!application) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p>Application not found.</p>
      </div>
    );
  }

  const { user_profiles: student, scholarships: scholarship } = application;
  const latestDocByType = (type: string) => {
    const docs = (application as any)?.documents as any[] | undefined;
    const appDoc = Array.isArray(docs) ? docs.find((d) => d.type === type) : undefined;
    if (appDoc) return { 
      id: `${type}`, 
      type, 
      file_url: appDoc.url, 
      status: appDoc.status || 'under_review',
      uploaded_at: appDoc.uploaded_at || appDoc.created_at || null
    };
    // fallback compatibilidade
    const fallbackDoc = studentDocs.find((d) => d.type === type);
    if (fallbackDoc) {
      return {
        ...fallbackDoc,
        uploaded_at: fallbackDoc.uploaded_at || fallbackDoc.created_at || null
      };
    }
    return fallbackDoc;
  };

  const updateApplicationDocStatus = async (
    type: string,
    status: 'approved' | 'changes_requested' | 'under_review',
    reviewNotes?: string
  ) => {
    const docs = Array.isArray((application as any)?.documents) ? ([...(application as any).documents] as any[]) : [];
    const idx = docs.findIndex((d) => d.type === type);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], status, review_notes: reviewNotes ?? docs[idx]?.review_notes };
    }
    await supabase.from('scholarship_applications').update({ documents: docs }).eq('id', applicationId);
    setApplication((prev) => prev ? ({ ...prev, documents: docs } as any) : prev);
  };

  // Funções para a aba Documents
  const handleViewUpload = (upload: any) => {
    // Implementar visualização do upload
    console.log('View upload:', upload);
  };

  const handleDownloadTemplate = (url: string) => {
    // Implementar download do template
    console.log('Download template:', url);
  };

  const handleApproveDocument = async (documentId: string) => {
    try {
      // Primeiro, buscar informações do upload para notificação
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description
          )
        `)
        .eq('id', documentId)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch upload data: ' + fetchError.message);
      }

      // Atualizar o status para aprovado
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'approved' })
        .eq('id', documentId);
      
      if (error) {
        throw new Error('Failed to approve document: ' + error.message);
      }

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application?.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Documento aprovado",
            email_aluno: userData.email,
            nome_aluno: application?.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been approved.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);
          
          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
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
                  user_id: application?.user_profiles.user_id,
                  title: 'Document approved',
                  message: `Your document ${uploadData.file_url?.split('/').pop()} was approved for request ${uploadData.document_requests?.title}.`,
                  type: 'document_approved',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
      }

      // Recarregar os dados para mostrar o novo status
      fetchStudentDocuments();

    } catch (err: any) {
      console.error("Error approving document:", err);
      alert(`Failed to approve document: ${err.message}`);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc.file_url) return;
    
    try {
      console.log('=== DEBUG handleDownloadDocument ===');
      console.log('Documento para download:', doc);
      console.log('file_url:', doc.file_url);
      
      // Se file_url é um path do storage, converter para URL pública
      let downloadUrl = doc.file_url;
      if (doc.file_url && !doc.file_url.startsWith('http')) {
        const publicUrl = supabase.storage
          .from('document-attachments')
          .getPublicUrl(doc.file_url)
          .data.publicUrl;
        downloadUrl = publicUrl;
        console.log('URL pública para download:', downloadUrl);
      }
      
      // Fazer download usando a URL pública
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
      alert(`Failed to download document: ${err.message}`);
    }
  };

  const handleViewDocument = (doc: any) => {
    console.log('=== DEBUG handleViewDocument ===');
    console.log('Documento recebido:', doc);
    console.log('file_url:', doc.file_url);
    console.log('Tipo de file_url:', typeof doc.file_url);
    
    if (!doc.file_url) {
      console.log('file_url está vazio ou undefined');
      return;
    }
    
    // Converter a URL do storage para URL pública
    try {
      // Se file_url é um path do storage, converter para URL pública
      if (doc.file_url && !doc.file_url.startsWith('http')) {
        const publicUrl = supabase.storage
          .from('document-attachments')
          .getPublicUrl(doc.file_url)
          .data.publicUrl;
        
        console.log('URL pública gerada:', publicUrl);
        setPreviewUrl(publicUrl);
      } else {
        // Se já é uma URL completa, usar diretamente
        console.log('Usando URL existente:', doc.file_url);
        setPreviewUrl(doc.file_url);
      }
    } catch (error) {
      console.error('Erro ao gerar URL pública:', error);
      // Fallback: tentar usar a URL original
      setPreviewUrl(doc.file_url);
    }
  };

  const approveDoc = async (type: string) => {
    try {
      setUpdating(type);
      await updateApplicationDocStatus(type, 'approved');
      
      // Buscar a aplicação atualizada para verificar o status real
      const { data: updatedApp } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', applicationId)
        .single();
      
      if (updatedApp?.documents) {
        // Verificar se todos os documentos foram aprovados usando os dados atualizados
        const allDocsApproved = ['passport', 'diploma', 'funds_proof']
          .every((docType) => {
            const doc = updatedApp.documents.find((d: any) => d.type === docType);
            return doc && doc.status === 'approved';
          });
        
        // Se todos os documentos foram aprovados, atualizar status geral
        if (allDocsApproved) {
          await supabase
            .from('user_profiles')
            .update({ documents_status: 'approved' })
            .eq('user_id', student.user_id);
          
          // Atualizar o estado local também
          setApplication((prev) => prev ? ({ ...prev, documents: updatedApp.documents } as any) : prev);
        }
      }
    } finally {
      setUpdating(null);
    }
  };

  const requestChangesDoc = async (type: string, reason: string) => {
    try {
      setUpdating(type);
      await updateApplicationDocStatus(type, 'changes_requested', reason || undefined);
      // Mantém o fluxo do aluno em revisão
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'under_review' })
        .eq('user_id', student.user_id);

      // --- NOTIFICAÇÃO VIA WEBHOOK N8N ---
      try {
        console.log('Enviando notificação de rejeição de documento via webhook...');
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', student.user_id)
          .single();

        if (userData?.email) {
          const documentLabel = DOCUMENTS_INFO.find(doc => doc.key === type)?.label || type;
          const webhookPayload = {
            tipo_notf: "Documento rejeitado",
            email_aluno: userData.email,
            nome_aluno: student.full_name,
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
                  user_id: student.user_id,
                  title: 'Document rejected',
                  message: `Your ${documentLabel} document was rejected. Reason: ${reason}`,
                  type: 'document_rejected',
                  link: '/student/dashboard',
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





  const rejectStudent = async () => {
    try {
      // Atualiza perfil do aluno para estado rejeitado
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'rejected' })
        .eq('user_id', student.user_id);
      // Atualiza aplicação com status e justificativa
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', applicationId);
      await fetchApplicationDetails();
      setActiveTab('details');
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
    } catch (error) {
      console.error('Error rejecting student:', error);
    }
  };

  const handleRejectDocument = async (documentId: string, reason: string) => {
    try {
      console.log('=== DEBUG: handleRejectDocument chamada ===');
      console.log('Document ID:', documentId);
      console.log('Reason:', reason);
      console.log('Application:', application);
      
      // Primeiro, buscar informações do upload para notificação
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description
          )
        `)
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar dados do upload:', fetchError);
        throw new Error('Failed to fetch upload data: ' + fetchError.message);
      }

      console.log('Upload data encontrado:', uploadData);

      // Atualizar o status para rejeitado
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ 
          status: 'rejected',
          review_notes: reason || null
        })
        .eq('id', documentId);
      
      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw new Error('Failed to reject document: ' + error.message);
      }

      console.log('Status atualizado com sucesso');

      // Enviar notificação ao aluno
      try {
        console.log('Buscando dados do usuário...');
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application?.user_profiles.user_id)
          .single();

        console.log('User data encontrado:', userData);

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Documento rejeitado",
            email_aluno: userData.email,
            nome_aluno: application?.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);
          
          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          console.log('Webhook enviado com sucesso');

          // Notificação in-app no sino do aluno — deve ser enviada SEMPRE, independente do e-mail
        }

        try {
          console.log('=== DEBUG: Enviando notificação in-app para rejeição de documento ===');
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          console.log('Access token:', accessToken ? 'Presente' : 'Ausente');
          console.log('Student user ID:', application?.user_profiles.user_id);
          console.log('Session:', session);
          
          if (accessToken) {
                          const notificationPayload = {
                user_id: application?.user_profiles.user_id,
                title: 'Document rejected',
                message: `Your document ${uploadData.file_url?.split('/').pop()} was rejected. Reason: ${reason}`,
                type: 'document_rejected',
                link: '/student/dashboard',
              };
            console.log('Payload da notificação:', notificationPayload);
            
            console.log('Chamando Edge Function...');
            const response = await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            let responseData;
            try {
              responseData = await response.json();
              console.log('Response data:', responseData);
            } catch (parseError) {
              console.error('Erro ao fazer parse da resposta:', parseError);
              const responseText = await response.text();
              console.log('Response text:', responseText);
            }
            
            if (!response.ok) {
              console.error('Erro na Edge Function:', responseData);
            } else {
              console.log('Notificação criada com sucesso!');
            }
          } else {
            console.error('Access token não encontrado');
          }
        } catch (e) {
          console.error('Error sending in-app student notification:', e);
          console.error('Error details:', e);
        }
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }

      // Recarregar documentos do estudante
      console.log('Recarregando documentos...');
      fetchStudentDocuments();
      alert('Document rejected successfully! The student will be notified.');
    } catch (err: any) {
      console.error("Error rejecting document:", err);
      alert(`Failed to reject document: ${err.message}`);
    }
  };

  // Função para limpar erros de seleção de arquivo
  const clearFileSelectionError = () => {
    setFileSelectionError(null);
  };

  // Função para selecionar arquivo da carta de aceite
  const handleAcceptanceLetterFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {

      setTimeout(() => {
        try {
          const file = event.target.files?.[0];
          if (file) {
            // Validar o arquivo
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
              setFileSelectionError('File size must be less than 10MB');
              return;
            }
            
            // Validar tipo de arquivo
            const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!allowedTypes.includes(fileExtension)) {
              setFileSelectionError('Please select a valid file type: PDF, DOC, DOCX, JPG, JPEG, or PNG');
              return;
            }
            
            setAcceptanceLetterFile(file);
            setAcceptanceLetterUploaded(false);
            setFileSelectionError(null);
            
            // Limpar o input para permitir selecionar o mesmo arquivo novamente
            event.target.value = '';
          }
        } catch (error) {
          console.error('Error processing file selection:', error);
          setFileSelectionError('Error processing file. Please try again.');
        } finally {
          setIsFileSelecting(false);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error selecting file:', error);
      setFileSelectionError('Error selecting file. Please try again.');
      setIsFileSelecting(false);
    }
  };

  // Função para processar a carta de aceite
  const handleProcessAcceptanceLetter = async () => {
    if (!application || !acceptanceLetterFile) {
      alert('Please select a file first.');
      return;
    }

    console.log('=== DEBUG handleProcessAcceptanceLetter ===');
    console.log('Application:', application);
    console.log('File:', acceptanceLetterFile);

    setUploadingAcceptanceLetter(true);
    try {
      // Upload do arquivo para o storage
      const fileName = `acceptance_letters/${Date.now()}_${acceptanceLetterFile.name}`;
      console.log('Uploading file:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, acceptanceLetterFile);

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      console.log('File uploaded successfully:', uploadData);

      // Atualizar a aplicação com a URL da carta de aceite
      const updateData = {
        acceptance_letter_url: uploadData.path,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      };
      
      console.log('Updating application with:', updateData);
      
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update(updateData)
        .eq('id', application.id);

      if (updateError) {
        throw new Error('Failed to update application: ' + updateError.message);
      }

      console.log('Application updated successfully');

      // Atualizar o perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          documents_status: 'approved',
          enrollment_status: 'enrolled'
        })
        .eq('user_id', application.user_profiles.user_id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      }

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Carta de aceite enviada",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your acceptance letter has been processed and you are now enrolled. Please check your dashboard for next steps.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);
          
          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
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
                  title: 'Enrolled - Acceptance letter processed',
                  message: 'Your enrollment is confirmed. Check your dashboard for next steps.',
                  type: 'enrolled',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending acceptance notification:', notificationError);
      }

      setAcceptanceLetterUploaded(true);
      alert('Acceptance letter processed successfully! The student is now enrolled and will be notified.');
      
      // Recarregar dados da aplicação
      fetchApplicationDetails();
    } catch (error: any) {
      console.error('Error processing acceptance letter:', error);
      alert(`Failed to process acceptance letter: ${error.message}`);
    } finally {
      setUploadingAcceptanceLetter(false);
    }
  };

  // Função para criar nova solicitação de documento
  const handleCreateDocumentRequest = async () => {
    if (!application) return;
    setCreatingDocumentRequest(true);
    try {
      let attachment_url = '';
      
      // Upload do arquivo se houver
      if (newDocumentRequest.attachment) {
        const { data, error } = await supabase.storage
          .from('document-attachments')
          .upload(`individual/${Date.now()}_${newDocumentRequest.attachment.name}`, newDocumentRequest.attachment);
        
        if (error) {
          throw new Error('Failed to upload attachment: ' + error.message);
        }
        attachment_url = data?.path;
      }

      // Buscar university_id da aplicação
      const { data: appData } = await supabase
        .from('scholarship_applications')
        .select('scholarship_id, scholarships(university_id)')
        .eq('id', application.id)
        .single();

      let university_id: string | undefined = undefined;
      if (appData?.scholarships) {
        if (Array.isArray(appData.scholarships)) {
          university_id = (appData.scholarships[0] as any)?.university_id;
        } else {
          university_id = (appData.scholarships as any).university_id;
        }
      }

      // Criar o request usando a Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const payload = {
        title: newDocumentRequest.title,
        description: newDocumentRequest.description,
        due_date: newDocumentRequest.due_date || null,
        attachment_url,
        university_id,
        is_global: false,
        status: 'open',
        created_by: user?.id || '',
        scholarship_application_id: application.id
      };

      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-document-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      let result: any = {};
      try {
        result = await response.json();
      } catch (e) {
        console.log('Erro ao fazer parse do JSON de resposta:', e);
      }

      if (!response.ok || !result.success) {
        throw new Error('Failed to create request: ' + (result.error || 'Unknown error'));
      }

      // Enviar notificação para o aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Nova solicitação de documento",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `A new document request has been submitted for your review: <strong>${newDocumentRequest.title}</strong>. Please log in to your dashboard to view the details and upload the requested document.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);
          
          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-student-notification', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application.user_profiles.user_id,
                  title: 'New document request',
                  message: `A new document request was created: ${newDocumentRequest.title}.`,
                  type: 'document_request_created',
                  link: '/student/documents',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

      // Limpar formulário e fechar modal
      setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
      setShowNewRequestModal(false);
      
      // Recarregar solicitações de documentos
      fetchDocumentRequests();
      
      alert('Document request created successfully! The student will be notified.');
    } catch (err: any) {
      console.error("Error creating document request:", err);
      alert(`Failed to create document request: ${err.message}`);
    } finally {
      setCreatingDocumentRequest(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto">   
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Student Application
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Review and manage {student.full_name}'s application details
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Enrolled
                </div>
              ) : (
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mr-2 animate-pulse"></div>
                  Pending Review
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-300 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-[#05294E] text-[#05294E]' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                onClick={() => setActiveTab(tab.id as any)}
                type="button"
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <tab.icon className={`w-5 h-5 mr-2 transition-colors ${
                  activeTab === tab.id ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                }`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
            
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Conteúdo das abas */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
              {/* Student Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <UserCircle className="w-6 h-6 mr-3" />
                    Student Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Personal Details</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                          <dd className="text-base font-semibold text-slate-900 mt-1">{student.full_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Email</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.email || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Phone</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.phone || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Country</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.country || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.field_of_interest || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.academic_level || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">GPA</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.gpa || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.english_proficiency || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Application & Status */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Student Type</dt>
                          <dd className="text-base text-slate-900 mt-1">
                            {application.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                             application.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                             application.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                             application.student_process_type || 'Not specified'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                student.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                student.is_application_fee_paid ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {student.is_application_fee_paid ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                student.documents_status === 'approved' ? 'bg-green-500' :
                                student.documents_status === 'rejected' ? 'bg-red-500' :
                                student.documents_status === 'pending' ? 'bg-yellow-500' :
                                student.documents_status === 'analyzing' ? 'bg-blue-500' :
                                'bg-slate-400'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                student.documents_status === 'approved' ? 'text-green-700' :
                                student.documents_status === 'rejected' ? 'text-red-700' :
                                student.documents_status === 'pending' ? 'text-yellow-700' :
                                student.documents_status === 'analyzing' ? 'text-blue-700' :
                                'text-slate-600'
                              }`}>
                                {student.documents_status === 'approved' ? 'Approved' :
                                 student.documents_status === 'rejected' ? 'Rejected' :
                                 student.documents_status === 'pending' ? 'Pending' :
                                 student.documents_status === 'analyzing' ? 'Analyzing' :
                                 student.documents_status || 'Not Started'}
                              </span>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Enrollment Status</dt>
                          <dd className="mt-1">
                            {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-700">Enrolled</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm font-medium text-yellow-700">Pending Acceptance</span>
                              </div>
                            )}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Scholarship Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Scholarship Details
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                        <dd className="text-lg font-semibold text-slate-900">{scholarship.title}</dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Annual Value</dt>
                        <dd className="text-2xl font-bold text-[#05294E]">
                          ${Number(scholarship.annual_value_with_scholarship ?? 0).toLocaleString()}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Description</dt>
                        <dd className="text-base text-slate-700 leading-relaxed">{scholarship.description}</dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exemplo de exibição condicional do botão do I-20 Control Fee */}
              {application.acceptance_letter_status === 'approved' && (
                <div className="mt-6">
                  {/* Aqui vai o botão do I-20 Control Fee, se já não estiver em outro lugar */}
                  {/* <ButtonI20ControlFee ... /> */}
                </div>
              )}

              {/* Student Documents Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Student Documents
                  </h2>
                  <p className="text-slate-200 text-sm mt-1">Review each document and approve or request changes</p>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {DOCUMENTS_INFO.map((doc, index) => {
                      const d = latestDocByType(doc.key);
                      const status = d?.status || 'not_submitted';
                      
                      return (
                        <div key={doc.key}>
                                                     <div className="bg-white p-4">
                             <div className="flex items-start space-x-4">
                               <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                 <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                 </svg>
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center space-x-3 mb-1">
                                   <p className="font-medium text-slate-900">{doc.label}</p>
                                   <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                     status === 'approved' ? 'bg-green-100 text-green-800' :
                                     status === 'changes_requested' ? 'bg-red-100 text-red-800' :
                                     status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                                     'bg-slate-100 text-slate-700'
                                   }`}>
                                     {status === 'approved' ? 'Approved' :
                                      status === 'changes_requested' ? 'Changes Requested' :
                                      status === 'under_review' ? 'Under Review' :
                                      d?.file_url ? 'Submitted' : 'Not Submitted'}
                                   </span>
                                 </div>
                                 <p className="text-sm text-slate-600">{doc.description}</p>
                                 {d?.file_url && (
                                   <p className="text-xs text-slate-400 mt-1">
                                     Uploaded: {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : new Date().toLocaleDateString()}
                                   </p>
                                 )}
                                 
                                 {/* Botões posicionados abaixo das informações */}
                                 <div className="flex items-center space-x-2 mt-3">
                                   {/* Botões de ação para documentos Under Review */}
                                   {d?.file_url && status !== 'approved' && (
                                     <div className="flex items-center space-x-2 mr-3">
                                       <button
                                         onClick={() => d && approveDoc(d.type)}
                                         disabled={updating === d.type}
                                         className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                       >
                                         Approve
                                       </button>
                                       <button
                                         onClick={() => {
                                           if (d) {
                                             setPendingRejectType(d.type);
                                             setShowReasonModal(true);
                                           }
                                         }}
                                         disabled={updating === d.type}
                                         className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                       >
                                         Reject
                                       </button>
                                     </div>
                                   )}
                                   
                                                                       <button 
                                      onClick={() => handleViewDocument(d)}
                                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      View Document
                                    </button>
                                    <button 
                                      onClick={() => handleDownloadDocument(d)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      Download
                                    </button>
                                 </div>
                               </div>
                             </div>
                           </div>
                          {index < DOCUMENTS_INFO.length - 1 && (
                            <div className="border-t border-slate-200"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>


            </div>

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-4">
              {/* Quick Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Application Summary</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Submitted</span>
                    <span className="text-sm text-slate-900">
                      {new Date((application as any).created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>


                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Application submitted</p>
                        <p className="text-xs text-slate-500">{new Date((application as any).created_at || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {(application as any).updated_at !== (application as any).created_at && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">Last updated</p>
                          <p className="text-xs text-slate-500">{new Date((application as any).updated_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[
                      { label: 'Documents', tab: 'documents', icon: FileText }
                    ].map((action) => (
                      <button
                        key={action.tab}
                        onClick={() => setActiveTab(action.tab as any)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <action.icon className="w-5 h-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">{action.label}</span>
                        </div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}
      {/* {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <MessageCircle className="w-6 h-6 mr-3" />
              Communication Center
            </h2>
            <p className="text-slate-200 text-sm mt-1">Chat with {student.full_name}</p>
          </div>
          <div className="p-6">
            <div className="flex-1 flex flex-col">
              <ApplicationChat
                messages={chat.messages}
                onSend={chat.sendMessage as any}
                loading={chat.loading}
                isSending={chat.isSending}
                error={chat.error}
                currentUserId={user?.id || ''}
                messageContainerClassName="gap-6 py-4"
              />
            </div>
          </div>
        </div>
      )} */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-6 text-white h-6 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Document Management</h2>
                    <p className="text-slate-200 text-sm mt-1">Request and manage student documents</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* New Request Button */}
              <div className="flex justify-end mb-6">
                <button 
                  onClick={() => setShowNewRequestModal(true)}
                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 flex items-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Request</span>
                </button>
              </div>

              {/* Student Uploads Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-8">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                  <h4 className="font-semibold text-slate-900 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Document Requests
                  </h4>
                </div>
                
                <div className="p-6">
                  {/* University Document Requests */}
                  <div className="mb-6">
                    {documentRequests.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-slate-600 font-medium">No document requests yet</p>
                        <p className="text-sm text-slate-500 mt-1">Create your first request using the button above</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documentRequests.map((request) => (
                          <div key={request.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h6 className="font-semibold text-slate-900">{request.title}</h6>
                                    <p className="text-sm text-slate-600">{request.description}</p>
                                    {request.due_date && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        Due: {new Date(request.due_date).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Student Upload Status */}
                                {request.uploads && request.uploads.length > 0 ? (
                                  <div className="ml-13 mt-3">
                                    <div className="flex items-center space-x-3">
                                      <span className="text-sm text-slate-600">Student response:</span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${

                                        request.uploads[0].status === 'approved' ? 'bg-green-100 text-green-800' :
                                        request.uploads[0].status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {request.uploads[0].status === 'approved' ? 'Approved' :
                                         request.uploads[0].status === 'rejected' ? 'Rejected' :
                                         'Under Review'}
                                      </span>
                                      <button 
                                        onClick={() => handleViewUpload(request.uploads[0])}
                                        className="text-[#05294E] hover:text-[#041f38] text-sm font-medium hover:underline"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="ml-13 mt-3">
                                    <span className="text-sm text-slate-500 italic">No response from student yet</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  request.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                  request.status === 'closed' ? 'bg-slate-100 text-slate-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {request.status === 'open' ? 'Open' :
                                   request.status === 'closed' ? 'Closed' :
                                   request.status}
                                </span>
                                
                                {request.attachment_url && (
                                  <button 
                                    onClick={() => handleDownloadTemplate(request.attachment_url)}
                                    className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    Template
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Student Uploads */}
                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-slate-800 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Student Responses to Document Requests
                      </h5>
                      <button
                        onClick={() => {
                          console.log('Refresh manual dos documentos');
                          fetchStudentDocuments();
                        }}
                        className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                    </div>
                    {studentDocuments.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-3xl">
                        <p className="text-slate-500">No responses from student yet</p>
                        <p className="text-sm text-slate-400 mt-1">Documents will appear here once the student responds to your document requests</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentDocuments.map((doc) => (
                          <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4 flex-1">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900">{doc.filename || 'Document'}</p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      doc.is_global ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {doc.request_type || 'Individual Request'}
                                    </span>
                                    <span className="text-sm text-slate-500">
                                      Response to: <span className="font-medium text-slate-700">{doc.request_title || 'Unknown Request'}</span>
                                    </span>
                                  </div>
                                  {doc.request_description && (
                                    <p className="text-xs text-slate-400 mt-1">{doc.request_description}</p>
                                  )}
                                  <p className="text-xs text-slate-400 mt-1">
                                    Uploaded: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Unknown date'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3 ml-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {doc.status === 'approved' ? 'Approved' :
                                   doc.status === 'rejected' ? 'Rejected' :
                                   'Under Review'}
                                </span>
                                
                                {/* Botões de ação para documentos Under Review */}
                                {doc.status === 'under_review' && (
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleApproveDocument(doc.id)}
                                      className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setPendingRejectDocumentId(doc.id);
                                        setShowRejectDocumentModal(true);
                                      }}
                                      className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                
                                <button 
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                  Download
                                </button>
                                <button 
                                  onClick={() => handleViewDocument(doc)}
                                  className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Acceptance Letter Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">Acceptance Letter</h4>
                      <p className="text-blue-100 text-sm">Upload to automatically enroll the student</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="bg-white rounded-3xl p-6 mb-6">
                    <p className="text-slate-700 mb-6 leading-relaxed">
                      Please upload the student's acceptance letter and any other required documents, such as the I-20 Control Fee receipt.
                    </p>
                    
                    {acceptanceLetterUploaded ? (
                      <div className="text-center py-8 bg-green-50 border-2 border-green-200 rounded-3xl">
                        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h5 className="font-semibold text-green-900 mb-2">Acceptance Letter Uploaded Successfully!</h5>
                        <p className="text-green-700 text-sm">The student has been enrolled and notified.</p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-blue-300 rounded-3xl p-6 bg-blue-50">
                        <div className="text-center">
                          <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <h5 className="font-semibold text-blue-900 mb-2">Select Acceptance Letter</h5>
                          <p className="text-blue-700 text-sm mb-4">Drag and drop or click to browse files</p>
                          
                          {acceptanceLetterFile ? (
                            <div className="mb-4">
                              <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg px-4 py-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-blue-800 font-medium">{acceptanceLetterFile.name}</span>
                              </div>
                            </div>
                          ) : null}
                          
                          <div className="flex flex-col items-center space-y-4">
                            <div className="file-input-wrapper">
                              <label className={`bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center justify-center min-w-[140px] ${
                                isFileSelecting ? 'opacity-50 cursor-not-allowed' : ''
                              }`}>
                                {isFileSelecting ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                )}
                                <span>{isFileSelecting ? 'Selecting...' : (acceptanceLetterFile ? 'Change File' : 'Choose File')}</span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={handleAcceptanceLetterFileSelect}
                                  disabled={uploadingAcceptanceLetter || isFileSelecting}
                                  key={acceptanceLetterFile ? 'change' : 'initial'} // Força re-render do input
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!acceptanceLetterUploaded && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleProcessAcceptanceLetter}
                        disabled={!acceptanceLetterFile || uploadingAcceptanceLetter}
                        className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingAcceptanceLetter ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Process Acceptance</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>


      {/* Modals */}
      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Modal para justificar solicitação de mudanças */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Request Changes</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for requesting changes to this document. This will help the student understand what needs to be fixed.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setRejectReason('');
                  setPendingRejectType(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectType) {
                    requestChangesDoc(pendingRejectType, rejectReason);
                    setShowReasonModal(false);
                    setRejectReason('');
                    setPendingRejectType(null);
                  }
                }}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para recusar aluno na bolsa */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Student Application</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this student's application. This information will be shared with the student.
            </p>
            <textarea
              value={rejectStudentReason}
              onChange={(e) => setRejectStudentReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectStudentModal(false);
                  setRejectStudentReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
                              <button
                  onClick={rejectStudent}
                  disabled={!rejectStudentReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                >
                  Reject Application
                </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequestModal && application && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-4 border border-slate-200">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Document Request</h3>
            <p className="text-sm text-slate-600 mb-6 text-center">
              Request a new document from {application.user_profiles.full_name}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  placeholder="e.g., Additional Reference Letter"
                  value={newDocumentRequest.title}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base min-h-[80px] resize-vertical"
                  placeholder="Describe what document you need and any specific requirements..."
                  value={newDocumentRequest.description}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  type="date"
                  value={newDocumentRequest.due_date}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Template/Attachment (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" />
                    </svg>
                    <span>{newDocumentRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => setNewDocumentRequest(prev => ({ 
                        ...prev, 
                        attachment: e.target.files ? e.target.files[0] : null 
                      }))}
                      disabled={creatingDocumentRequest}
                    />
                  </label>
                  {newDocumentRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">
                      {newDocumentRequest.attachment.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition disabled:opacity-50"
                onClick={() => {
                  setShowNewRequestModal(false);
                  setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
                }}
                disabled={creatingDocumentRequest}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-[#05294E] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#041f38] transition disabled:opacity-50 flex items-center justify-center"
                onClick={handleCreateDocumentRequest}
                disabled={creatingDocumentRequest || !newDocumentRequest.title.trim()}
              >
                {creatingDocumentRequest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para rejeitar documento */}
      {showRejectDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Document</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this document. This information will be shared with the student.
            </p>
            <textarea
              value={rejectDocumentReason}
              onChange={(e) => setRejectDocumentReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectDocumentModal(false);
                  setRejectDocumentReason('');
                  setPendingRejectDocumentId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectDocumentId) {
                    handleRejectDocument(pendingRejectDocumentId, rejectDocumentReason);
                    setShowRejectDocumentModal(false);
                    setRejectDocumentReason('');
                    setPendingRejectDocumentId(null);
                  }
                }}
                disabled={!rejectDocumentReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Reject Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetails;