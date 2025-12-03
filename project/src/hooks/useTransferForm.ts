import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface StudentRecord {
  user_id: string;
  student_process_type?: string | null;
  all_applications?: any[];
}

export const useTransferForm = (
  student: StudentRecord | null,
  isPlatformAdmin: boolean,
  userId?: string,
  adminEmail?: string // Email do admin para incluir nas notificações
) => {
  const [transferFormFile, setTransferFormFile] = useState<File | null>(null);
  const [uploadingTransferForm, setUploadingTransferForm] = useState(false);
  const [transferFormUploads, setTransferFormUploads] = useState<any[]>([]);

  // Função utilitária para sanitizar nome de arquivo
  const sanitizeFileName = (fileName: string): string => {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  };

  // Função para encontrar aplicação transfer
  const getTransferApplication = useCallback(() => {
    const transferApps = student?.all_applications?.filter((app: any) => 
      app.student_process_type === 'transfer'
    ) || [];
    
    // Priorizar aplicação com application fee paga
    return transferApps.find((app: any) => app.is_application_fee_paid) || transferApps[0];
  }, [student]);

  // Carregar transfer form uploads quando for transfer student
  useEffect(() => {
    const fetchTransferFormUploads = async () => {
      if (student?.student_process_type !== 'transfer') {
        setTransferFormUploads([]);
        return;
      }

      const transferApp = getTransferApplication();
      if (!transferApp?.id) {
        setTransferFormUploads([]);
        return;
      }

      const { data: uploads } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', transferApp.id)
        .order('uploaded_at', { ascending: false });

      if (uploads) {
        setTransferFormUploads(uploads);
      }
    };

    fetchTransferFormUploads();
  }, [student?.student_process_type, student?.all_applications, getTransferApplication]);

  // Handler para upload de Transfer Form
  const handleUploadTransferForm = useCallback(async () => {
    if (!isPlatformAdmin || !student || !transferFormFile) return;
    
    try {
      setUploadingTransferForm(true);
      
      // Encontrar aplicação do aluno transfer
      const transferApp = getTransferApplication();
      
      if (!transferApp) {
        alert('No transfer application found for this student');
        return;
      }
      
      // Se já existe um formulário, deletar o arquivo anterior
      if (transferApp.transfer_form_url) {
        try {
          const oldPath = transferApp.transfer_form_url.split('/').pop();
          if (oldPath) {
            await supabase.storage
              .from('document-attachments')
              .remove([`transfer-forms/${oldPath}`]);
          }
        } catch (deleteError) {
          console.warn('Could not delete old transfer form:', deleteError);
        }
      }
      
      // Sanitizar nome do arquivo
      const sanitized = sanitizeFileName(transferFormFile.name);
      const storagePath = `transfer-forms/${Date.now()}_${sanitized}`;
      
      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(storagePath, transferFormFile, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData?.path || storagePath);
      
      // Atualizar a aplicação com o formulário de transferência
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          transfer_form_url: publicUrl,
          transfer_form_status: 'sent',
          transfer_form_sent_at: new Date().toISOString()
        })
        .eq('id', transferApp.id);
        
      if (updateError) throw updateError;

      // ✅ ENVIAR NOTIFICAÇÕES PARA O ALUNO (quando admin envia template do Transfer Form)
      console.log('📤 [Transfer Form Template] Enviando notificações para o aluno sobre envio do template...');
      
      try {
        // Buscar dados do aluno
        const { data: studentProfile } = await supabase
          .from('user_profiles')
          .select('email, full_name, user_id')
          .eq('user_id', student?.user_id || '')
          .maybeSingle();

        if (studentProfile?.email && studentProfile?.user_id) {
          // Buscar dados da aplicação (bolsa e universidade) para incluir na mensagem
          const { data: applicationData } = await supabase
            .from('scholarship_applications')
            .select(`
              id,
              scholarships!inner(
                title,
                universities!inner(
                  name
                )
              )
            `)
            .eq('id', transferApp.id)
            .maybeSingle();

          const scholarship = Array.isArray(applicationData?.scholarships) 
            ? applicationData.scholarships[0] 
            : applicationData?.scholarships;
          const university = Array.isArray(scholarship?.universities)
            ? scholarship.universities[0]
            : scholarship?.universities;

          const scholarshipTitle = scholarship?.title || 'Scholarship';
          const universityName = university?.name || 'University';

          // 1. ENVIAR EMAIL VIA WEBHOOK
          const templatePayload = {
            tipo_notf: "Novo documento solicitado", // Reutilizando tipo existente de Document Request
            email_aluno: studentProfile.email,
            nome_aluno: studentProfile.full_name || 'Student',
            email_universidade: adminEmail || '',
            document_type: 'Transfer Form',
            document_title: 'Transfer Form',
            o_que_enviar: `The Transfer Form template has been sent to you for the scholarship <strong>${scholarshipTitle}</strong> at <strong>${universityName}</strong>. Please download, fill out, and upload the completed form in your dashboard.`
          };

          console.log('📤 [Transfer Form Template] Payload de envio:', templatePayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(templatePayload),
          });

          if (webhookResponse.ok) {
            console.log('✅ [Transfer Form Template] Email enviado com sucesso!');
          } else {
            console.warn('⚠️ [Transfer Form Template] Erro ao enviar email:', webhookResponse.status);
          }
        }

        // 2. ENVIAR NOTIFICAÇÃO IN-APP PARA O ALUNO (SINO)
        if (student?.user_id) {
          console.log('📤 [Transfer Form Template] Enviando notificação in-app para o aluno...');
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            
            if (accessToken) {
              const notificationPayload = {
                user_id: student.user_id,
                title: 'Transfer Form Template Sent',
                message: 'The Transfer Form template has been sent to you. Please download, fill out, and upload the completed form.',
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
                console.error('❌ [Transfer Form Template] Erro ao criar notificação:', response.status, errorText);
              } else {
                await response.json();
                console.log('✅ [Transfer Form Template] Notificação in-app enviada com sucesso!');
              }
            }
          } catch (notificationError) {
            console.error('❌ [Transfer Form Template] Erro ao enviar notificação in-app:', notificationError);
          }
        }
      } catch (notifyError) {
        console.error('❌ [Transfer Form Template] Erro ao enviar notificações:', notifyError);
        // Não falhar o processo se a notificação falhar
      }
      
      alert('Transfer form uploaded successfully!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error uploading transfer form:', error);
      alert('Failed to upload transfer form: ' + error.message);
    } finally {
      setUploadingTransferForm(false);
    }
  }, [isPlatformAdmin, student, transferFormFile, getTransferApplication]);

  // Handler para aprovar upload de Transfer Form
  const handleApproveTransferFormUpload = useCallback(async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', uploadId);
      
      if (error) throw error;
      
      // Recarregar uploads
      const transferApp = getTransferApplication();
      
      if (transferApp) {
        const { data: newUploads } = await supabase
          .from('transfer_form_uploads')
          .select('*')
          .eq('application_id', transferApp.id)
          .order('uploaded_at', { ascending: false });
        
        if (newUploads) {
          setTransferFormUploads(newUploads);
        }
      }

      // ✅ ENVIAR NOTIFICAÇÕES PARA O ALUNO
      console.log('📤 [Transfer Form] Enviando notificações de aprovação para o aluno...');
      
      try {
        // Buscar dados do aluno - usar user_id do student
        const { data: studentProfile } = await supabase
          .from('user_profiles')
          .select('email, full_name, user_id')
          .eq('user_id', student?.user_id || '')
          .maybeSingle();

        if (studentProfile?.email && studentProfile?.user_id) {
          // 1. ENVIAR EMAIL VIA WEBHOOK (reutilizando tipo existente - mesmo padrão do Student Documents)
          const approvalPayload = {
            tipo_notf: "Documento aprovado",
            email_aluno: studentProfile.email,
            nome_aluno: studentProfile.full_name || 'Student',
            email_universidade: adminEmail || '', // Email do admin (mesmo padrão do handleConfirmReject)
            document_type: 'Transfer Form', // ✅ CORREÇÃO: Adicionar tipo de documento para o template identificar corretamente
            document_title: 'Transfer Form', // ✅ CORREÇÃO: Adicionar título do documento
            o_que_enviar: `Congratulations! Your Transfer Form has been approved. You can now proceed with the next steps of your application.`
          };

          console.log('📤 [Transfer Form] Payload de aprovação:', approvalPayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(approvalPayload),
          });

          if (webhookResponse.ok) {
            console.log('✅ [Transfer Form] Email de aprovação enviado com sucesso!');
          } else {
            console.warn('⚠️ [Transfer Form] Erro ao enviar email de aprovação:', webhookResponse.status);
          }
        }

        // 2. ENVIAR NOTIFICAÇÃO IN-APP PARA O ALUNO (SINO)
        if (student?.user_id) {
          console.log('📤 [Transfer Form] Enviando notificação in-app para o aluno...');
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            
            if (accessToken) {
              const notificationPayload = {
                user_id: student.user_id,
                title: 'Transfer Form Approved',
                message: 'Your Transfer Form has been approved. You can now proceed with the next steps of your application.',
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
                console.error('❌ [Transfer Form] Erro ao criar notificação:', response.status, errorText);
              } else {
                await response.json();
                console.log('✅ [Transfer Form] Notificação in-app enviada com sucesso!');
              }
            }
          } catch (notificationError) {
            console.error('❌ [Transfer Form] Erro ao enviar notificação in-app:', notificationError);
          }
        }
      } catch (webhookError) {
        console.error('❌ [Transfer Form] Erro ao enviar notificações:', webhookError);
        // Não falhar o processo se as notificações falharem
      }
      
      alert('Transfer form approved successfully!');
    } catch (error: any) {
      console.error('Error approving transfer form:', error);
      alert('Error approving transfer form: ' + error.message);
    }
  }, [userId, getTransferApplication, student]);

  // Handler para rejeitar upload de Transfer Form
  const handleRejectTransferFormUpload = useCallback(async (uploadId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', uploadId);
      
      if (error) throw error;
      
      // Recarregar uploads
      const transferApp = getTransferApplication();
      
      if (transferApp) {
        const { data: newUploads } = await supabase
          .from('transfer_form_uploads')
          .select('*')
          .eq('application_id', transferApp.id)
          .order('uploaded_at', { ascending: false });
        
        if (newUploads) {
          setTransferFormUploads(newUploads);
        }
      }

      // ✅ ENVIAR NOTIFICAÇÕES PARA O ALUNO
      console.log('📤 [Transfer Form] Enviando notificações de rejeição para o aluno...');
      
      try {
        // Buscar dados do aluno - usar user_id do student
        const { data: studentProfile } = await supabase
          .from('user_profiles')
          .select('email, full_name, user_id')
          .eq('user_id', student?.user_id || '')
          .maybeSingle();

        if (studentProfile?.email && studentProfile?.user_id) {
          // 1. ENVIAR EMAIL VIA WEBHOOK (mesmo padrão do Student Documents)
          const rejectionPayload = {
            tipo_notf: "Changes Requested",
            email_aluno: studentProfile.email,
            nome_aluno: studentProfile.full_name || 'Student',
            email_universidade: adminEmail || '', // Email do admin (mesmo padrão do handleConfirmReject)
            document_type: 'Transfer Form', // ✅ CORREÇÃO: Adicionar tipo de documento para o template identificar corretamente
            document_title: 'Transfer Form', // ✅ CORREÇÃO: Adicionar título do documento
            o_que_enviar: `Your Transfer Form has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          console.log('📤 [Transfer Form] Payload de rejeição:', rejectionPayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(rejectionPayload),
          });

          if (webhookResponse.ok) {
            console.log('✅ [Transfer Form] Email de rejeição enviado com sucesso!');
          } else {
            console.warn('⚠️ [Transfer Form] Erro ao enviar email de rejeição:', webhookResponse.status);
          }
        }

        // 2. ENVIAR NOTIFICAÇÃO IN-APP PARA O ALUNO (SINO)
        if (student?.user_id) {
          console.log('📤 [Transfer Form] Enviando notificação in-app para o aluno...');
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            
            if (accessToken) {
              const notificationPayload = {
                user_id: student.user_id,
                title: 'Transfer Form Rejected',
                message: `Your Transfer Form has been rejected. Reason: ${reason}. Please review and upload a corrected version.`,
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
                console.error('❌ [Transfer Form] Erro ao criar notificação:', response.status, errorText);
              } else {
                await response.json();
                console.log('✅ [Transfer Form] Notificação in-app enviada com sucesso!');
              }
            }
          } catch (notificationError) {
            console.error('❌ [Transfer Form] Erro ao enviar notificação in-app:', notificationError);
          }
        }
      } catch (webhookError) {
        console.error('❌ [Transfer Form] Erro ao enviar notificações:', webhookError);
        // Não falhar o processo se as notificações falharem
      }
      
      alert('Transfer form rejected successfully!');
    } catch (error: any) {
      console.error('Error rejecting transfer form:', error);
      alert('Error rejecting transfer form: ' + error.message);
    }
  }, [userId, getTransferApplication, student]);

  return {
    transferFormFile,
    setTransferFormFile,
    uploadingTransferForm,
    transferFormUploads,
    getTransferApplication,
    handleUploadTransferForm,
    handleApproveTransferFormUpload,
    handleRejectTransferFormUpload
  };
};

