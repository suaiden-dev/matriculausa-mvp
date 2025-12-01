import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface StudentRecord {
  user_id: string;
}

export const useDocumentRequestHandlers = (
  student: StudentRecord | null,
  userId?: string,
  setDocumentRequests?: (requests: any[]) => void
) => {
  const [uploadingDocumentRequest, setUploadingDocumentRequest] = useState<Record<string, boolean>>({});
  const [approvingDocumentRequest, setApprovingDocumentRequest] = useState<Record<string, boolean>>({});
  const [rejectingDocumentRequest, setRejectingDocumentRequest] = useState<Record<string, boolean>>({});
  const [deletingDocumentRequest, setDeletingDocumentRequest] = useState<Record<string, boolean>>({});

  // Handler para upload de documento em resposta a um request
  const handleUploadDocumentRequest = useCallback(async (requestId: string, file: File) => {
    if (!student) return;
    
    setUploadingDocumentRequest(prev => ({ ...prev, [requestId]: true }));
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${student.user_id}/${requestId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath);

      if (!publicUrl) throw new Error('Uploaded file is not accessible');

      // Save upload record
      const { error: recordError } = await supabase
        .from('document_request_uploads')
        .insert({
          document_request_id: requestId,
          file_url: publicUrl,
          uploaded_by: userId,
          status: 'under_review',
          uploaded_at: new Date().toISOString()
        });

      if (recordError) throw recordError;

      alert('Document uploaded successfully!');
      
      // Reload document requests if callback provided
      if (setDocumentRequests) {
        // ✅ OTIMIZAÇÃO: Selecionar apenas campos necessários
        const fields = 'id,title,description,due_date,is_global,university_id,scholarship_application_id,created_at,updated_at,template_url,attachment_url';
        const { data } = await supabase
          .from('document_requests')
          .select(fields)
          .eq('user_id', student.user_id)
          .order('created_at', { ascending: false });

        if (data) setDocumentRequests(data);
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document: ' + error.message);
    } finally {
      setUploadingDocumentRequest(prev => ({ ...prev, [requestId]: false }));
    }
  }, [student, userId, setDocumentRequests]);

  // Handler para aprovar documento
  const handleApproveDocumentRequest = useCallback(async (uploadId: string) => {
    setApprovingDocumentRequest(prev => ({ ...prev, [uploadId]: true }));
    try {
      // Buscar informações do upload antes de atualizar
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`
          id,
          document_request_id,
          file_url,
          uploaded_by,
          document_requests!inner(
            title,
            scholarship_application_id
          )
        `)
        .eq('id', uploadId)
        .maybeSingle();

      // Buscar dados do aluno através do uploaded_by (user_id) ou scholarship_application
      let studentProfile: { user_id?: string; email?: string; full_name?: string } | null = null;
      if (uploadData) {
        // Tentar buscar pelo uploaded_by primeiro
        if (uploadData.uploaded_by) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_id, email, full_name')
            .eq('user_id', uploadData.uploaded_by)
            .maybeSingle();
          
          if (profile) {
            studentProfile = profile;
          }
        }

        // Se não encontrou, tentar buscar pela aplicação
        if (!studentProfile && uploadData.document_requests?.scholarship_application_id) {
          const { data: appData } = await supabase
            .from('scholarship_applications')
            .select('student_id, user_profiles!inner(user_id, email, full_name)')
            .eq('id', uploadData.document_requests.scholarship_application_id)
            .maybeSingle();

          if (appData?.user_profiles) {
            const profile = Array.isArray(appData.user_profiles) 
              ? appData.user_profiles[0] 
              : appData.user_profiles;
            studentProfile = profile;
          }
        }
      }

      if (fetchError) {
        console.error('Error fetching upload data:', fetchError);
      }

      const { error } = await supabase
        .from('document_request_uploads')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', uploadId);

      if (error) throw error;

      // ✅ ENVIAR NOTIFICAÇÕES PARA O ALUNO
      if (studentProfile?.email && studentProfile?.user_id) {
        console.log('📤 [handleApproveDocumentRequest] Enviando notificações de aprovação para o aluno...');
        
        try {
          const documentTitle = uploadData?.document_requests?.title || 'Document';
          const fileName = uploadData?.file_url?.split('/').pop() || 'document';

          // 1. ENVIAR EMAIL VIA WEBHOOK (mesmo padrão do Student Documents)
          const approvalPayload = {
            tipo_notf: "Documento aprovado",
            email_aluno: studentProfile.email,
            nome_aluno: studentProfile.full_name || 'Student',
            email_universidade: '', // Admin não tem email_universidade, mas mantém o campo para consistência
            document_type: 'Document Request', // ✅ CORREÇÃO: Adicionar tipo de documento
            document_title: documentTitle, // ✅ CORREÇÃO: Adicionar título do documento (título do request)
            request_title: documentTitle, // ✅ CORREÇÃO: Adicionar título do request para referência
            o_que_enviar: `Congratulations! Your document <strong>${fileName}</strong> for the request <strong>${documentTitle}</strong> has been approved.`
          };

          console.log('📤 [handleApproveDocumentRequest] Payload de aprovação:', approvalPayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(approvalPayload),
          });

          if (webhookResponse.ok) {
            console.log('✅ [handleApproveDocumentRequest] Email de aprovação enviado com sucesso!');
          } else {
            console.warn('⚠️ [handleApproveDocumentRequest] Erro ao enviar email de aprovação:', webhookResponse.status);
          }
        } catch (webhookError) {
          console.error('❌ [handleApproveDocumentRequest] Erro ao enviar webhook de aprovação:', webhookError);
        }

        // 2. ENVIAR NOTIFICAÇÃO IN-APP PARA O ALUNO (SINO)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          if (accessToken && studentProfile.user_id) {
            const documentTitle = uploadData.document_requests.title || 'Document';
            const fileName = uploadData.file_url?.split('/').pop() || 'document';

            const notificationPayload = {
              user_id: studentProfile.user_id,
              title: 'Document Approved',
              message: `Your document ${fileName} was approved for request ${documentTitle}.`,
              link: '/student/dashboard/applications',
            };
            
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ [handleApproveDocumentRequest] Erro ao criar notificação:', response.status, errorText);
            } else {
              await response.json();
              console.log('✅ [handleApproveDocumentRequest] Notificação in-app enviada com sucesso!');
            }
          }
        } catch (notificationError) {
          console.error('❌ [handleApproveDocumentRequest] Erro ao enviar notificação in-app:', notificationError);
        }
      }

      alert('Document approved!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error approving document:', error);
      alert('Failed to approve document: ' + error.message);
    } finally {
      setApprovingDocumentRequest(prev => ({ ...prev, [uploadId]: false }));
    }
  }, [userId]);

  // Handler para rejeitar documento
  const handleRejectDocumentRequest = useCallback(async (uploadId: string, reason: string) => {
    setRejectingDocumentRequest(prev => ({ ...prev, [uploadId]: true }));
    try {
      // Buscar informações do upload antes de atualizar
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`
          id,
          document_request_id,
          file_url,
          document_requests!inner(
            title,
            scholarship_application_id,
            scholarship_applications!inner(
              student_id,
              user_profiles!inner(
                user_id,
                email,
                full_name
              )
            )
          )
        `)
        .eq('id', uploadId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching upload data:', fetchError);
      }

      const { error } = await supabase
        .from('document_request_uploads')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          rejection_reason: reason
        })
        .eq('id', uploadId);

      if (error) throw error;

      // ✅ ENVIAR NOTIFICAÇÕES PARA O ALUNO
      if (studentProfile?.email && studentProfile?.user_id) {
        console.log('📤 [handleRejectDocumentRequest] Enviando notificações de rejeição para o aluno...');
        
        try {
          const documentTitle = uploadData?.document_requests?.title || 'Document';
          const fileName = uploadData?.file_url?.split('/').pop() || 'document';

          // 1. ENVIAR EMAIL VIA WEBHOOK (mesmo padrão do Student Documents)
          const rejectionPayload = {
            tipo_notf: "Changes Requested",
            email_aluno: studentProfile.email,
            nome_aluno: studentProfile.full_name || 'Student',
            email_universidade: '', // Admin não tem email_universidade, mas mantém o campo para consistência
            document_type: 'Document Request', // ✅ CORREÇÃO: Adicionar tipo de documento
            document_title: documentTitle, // ✅ CORREÇÃO: Adicionar título do documento (título do request)
            request_title: documentTitle, // ✅ CORREÇÃO: Adicionar título do request para referência
            o_que_enviar: `Your document <strong>${fileName}</strong> for the request <strong>${documentTitle}</strong> has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          console.log('📤 [handleRejectDocumentRequest] Payload de rejeição:', rejectionPayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(rejectionPayload),
          });

          if (webhookResponse.ok) {
            console.log('✅ [handleRejectDocumentRequest] Email de rejeição enviado com sucesso!');
          } else {
            console.warn('⚠️ [handleRejectDocumentRequest] Erro ao enviar email de rejeição:', webhookResponse.status);
          }
        } catch (webhookError) {
          console.error('❌ [handleRejectDocumentRequest] Erro ao enviar webhook de rejeição:', webhookError);
        }

        // 2. ENVIAR NOTIFICAÇÃO IN-APP PARA O ALUNO (SINO)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          if (accessToken && studentProfile.user_id) {
            const documentTitle = uploadData.document_requests.title || 'Document';

            const notificationPayload = {
              user_id: studentProfile.user_id,
              title: 'Document Rejected',
              message: `Your document for request ${documentTitle} has been rejected. Reason: ${reason}. Please review and upload a corrected version.`,
              link: '/student/dashboard/applications',
            };
            
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ [handleRejectDocumentRequest] Erro ao criar notificação:', response.status, errorText);
            } else {
              await response.json();
              console.log('✅ [handleRejectDocumentRequest] Notificação in-app enviada com sucesso!');
            }
          }
        } catch (notificationError) {
          console.error('❌ [handleRejectDocumentRequest] Erro ao enviar notificação in-app:', notificationError);
        }
      }

      alert('Document rejected!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error rejecting document:', error);
      alert('Failed to reject document: ' + error.message);
    } finally {
      setRejectingDocumentRequest(prev => ({ ...prev, [uploadId]: false }));
    }
  }, [userId]);

  // Handler para fazer download de documento
  const handleDownloadDocument = useCallback((doc: { file_url: string; filename?: string }) => {
    const link = document.createElement('a');
    link.href = doc.file_url;
    // Extrair filename da URL se não fornecido
    const filename = doc.filename || doc.file_url.split('/').pop() || 'document.pdf';
    link.download = filename;
    link.click();
  }, []);

  // Handler para editar template
  const handleEditTemplate = useCallback((requestId: string) => {
    // Implementation would go here - placeholder for future functionality
  }, []);

  // Handler para deletar document request
  const handleDeleteDocumentRequest = useCallback(async (requestId: string) => {
    if (!window.confirm('Delete this document request?') || !student) return;
    
    setDeletingDocumentRequest(prev => ({ ...prev, [requestId]: true }));
    try {
      // First delete all uploads
      const { error: deleteUploadsError } = await supabase
        .from('document_request_uploads')
        .delete()
        .eq('document_request_id', requestId);

      if (deleteUploadsError) throw deleteUploadsError;

      // Then delete the request
      const { error: deleteRequestError } = await supabase
        .from('document_requests')
        .delete()
        .eq('id', requestId);

      if (deleteRequestError) throw deleteRequestError;

      alert('Document request deleted successfully!');
      
      // Reload document requests if callback provided
      if (setDocumentRequests) {
        // ✅ OTIMIZAÇÃO: Selecionar apenas campos necessários
        const fields = 'id,title,description,due_date,is_global,university_id,scholarship_application_id,created_at,updated_at,template_url,attachment_url';
        const { data } = await supabase
          .from('document_requests')
          .select(fields)
          .eq('user_id', student.user_id)
          .order('created_at', { ascending: false });

        if (data) setDocumentRequests(data);
      }
    } catch (error: any) {
      console.error('Error deleting document request:', error);
      alert('Failed to delete document request: ' + error.message);
    } finally {
      setDeletingDocumentRequest(prev => ({ ...prev, [requestId]: false }));
    }
  }, [student, setDocumentRequests]);

  return {
    uploadingDocumentRequest,
    approvingDocumentRequest,
    rejectingDocumentRequest,
    deletingDocumentRequest,
    handleUploadDocumentRequest,
    handleApproveDocumentRequest,
    handleRejectDocumentRequest,
    handleDownloadDocument,
    handleEditTemplate,
    handleDeleteDocumentRequest
  };
};

