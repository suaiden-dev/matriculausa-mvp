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
  adminEmail?: string, // Email do admin para incluir nas notificações
  logAction?: (actionType: string, actionDescription: string, performedBy: string, performedByType: 'student' | 'admin' | 'university', metadata?: any) => Promise<any>
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
    console.log('🚀 [Transfer Form] handleUploadTransferForm iniciado', {
      isPlatformAdmin,
      student: student?.user_id,
      transferFormFile: transferFormFile?.name,
      userId,
      adminEmail
    });
    
    if (!isPlatformAdmin || !student || !transferFormFile) {
      console.log('❌ [Transfer Form] Pré-condições falharam:', {
        isPlatformAdmin,
        hasStudent: !!student,
        hasFile: !!transferFormFile
      });
      return;
    }
    
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

      // Log da ação
      if (logAction && userId) {
        try {
          await logAction(
            'transfer_form_upload',
            `Transfer form uploaded by platform admin`,
            userId,
            'admin',
            {
              application_id: transferApp.id,
              student_id: student?.user_id || '',
              file_name: transferFormFile.name,
              uploaded_by: adminEmail || 'Platform Admin',
              uploaded_at: new Date().toISOString()
            }
          );
          console.log('✅ [handleUploadTransferForm] Ação logada com sucesso');
        } catch (logError) {
          console.error('⚠️ [handleUploadTransferForm] Erro ao logar ação (não crítico):', logError);
        }
      }

      // Determinar se é um novo envio ou substituição
      const isReplacement = !!transferApp.transfer_form_url;
      
      // ✅ ENVIAR NOTIFICAÇÕES PARA O ALUNO (sempre que admin envia/substitui Transfer Form)
      console.log(`📤 [Transfer Form] Enviando notificações para o aluno sobre ${isReplacement ? 'substituição' : 'envio'} do formulário...`);
      
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
            tipo_notf: isReplacement ? "Documento atualizado" : "Novo documento solicitado",
            email_aluno: studentProfile.email,
            nome_aluno: studentProfile.full_name || 'Student',
            email_universidade: adminEmail || '',
            document_type: 'Transfer Form',
            document_title: 'Transfer Form',
            o_que_enviar: isReplacement 
              ? `The Transfer Form has been updated for the scholarship <strong>${scholarshipTitle}</strong> at <strong>${universityName}</strong>. Please download the new version, fill it out, and upload the completed form in your dashboard.`
              : `The Transfer Form template has been sent to you for the scholarship <strong>${scholarshipTitle}</strong> at <strong>${universityName}</strong>. Please download, fill out, and upload the completed form in your dashboard.`
          };

          console.log(`📤 [Transfer Form] Payload de ${isReplacement ? 'atualização' : 'envio'}:`, templatePayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(templatePayload),
          });

          if (webhookResponse.ok) {
            console.log(`✅ [Transfer Form] Email de ${isReplacement ? 'atualização' : 'envio'} enviado com sucesso!`);
          } else {
            console.warn(`⚠️ [Transfer Form] Erro ao enviar email de ${isReplacement ? 'atualização' : 'envio'}:`, webhookResponse.status);
          }
        }

        // 2. ENVIAR NOTIFICAÇÃO IN-APP PARA O ALUNO (SINO)
        if (student?.user_id) {
          console.log(`📤 [Transfer Form] Enviando notificação in-app para o aluno sobre ${isReplacement ? 'atualização' : 'disponibilidade'}...`, {
            studentUserId: student.user_id,
            transferAppId: transferApp.id,
            isReplacement
          });
          
          try {
            // Buscar o user_profiles.id correto (que é referenciado por student_notifications.student_id)
            console.log('🔍 [Transfer Form] Buscando user_profiles.id para student_id:', student.user_id);
            
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('id, user_id')
                .eq('user_id', student.user_id)
                .single();
              
              console.log('📋 [Transfer Form] Resultado da busca do profile:', {
                data: profileData,
                error: profileError,
                hasError: !!profileError,
                hasData: !!profileData
              });
                
              if (profileError) {
                console.error('❌ [Transfer Form] Erro ao buscar profile:', profileError);
                console.error('❌ [Transfer Form] Detalhes do erro do profile:', {
                  code: profileError.code,
                  message: profileError.message,
                  details: profileError.details
                });
                return;
              }
              
              if (!profileData) {
                console.error('❌ [Transfer Form] Profile não encontrado para user_id:', student.user_id);
                return;
              }
            
            console.log('✅ [Transfer Form] Profile encontrado:', {
              profileId: profileData.id,
              userId: profileData.user_id
            });
            
            const notificationData = {
              student_id: profileData.id, // student_notifications.student_id referencia user_profiles.id
              title: isReplacement ? 'Transfer Form Updated' : 'Transfer Form Available',
              message: isReplacement 
                ? `The Transfer Form has been updated for your scholarship application. Please download the new version, fill it out, and upload the completed form.`
                : `The Transfer Form has been uploaded for your scholarship application. Please download, fill out, and upload the completed form.`,
              link: `/student/dashboard/application/${transferApp.id}/chat?tab=documents`, // Deep link para a aplicação específica
              created_at: new Date().toISOString()
            };
            
            console.log('📝 [Transfer Form] Payload da notificação:', notificationData);

            try {
              console.log('🔄 [Transfer Form] Iniciando inserção na tabela student_notifications...');
              console.log('🔧 [Transfer Form] Verificando cliente Supabase:', {
                supabaseExists: !!supabase,
                supabaseFrom: typeof supabase?.from
              });
              
              console.log('🔄 [Transfer Form] Executando inserção...');
              const insertResult = await supabase
                .from('student_notifications')
                .insert([notificationData])
                .select('*');
              
              console.log('📋 [Transfer Form] Raw result:', insertResult);
              const { data, error: notifInsertError } = insertResult;

              console.log('📋 [Transfer Form] Resultado da inserção:', {
                data: data,
                error: notifInsertError,
                hasError: !!notifInsertError,
                hasData: !!data,
                dataLength: data?.length || 0
              });

              if (notifInsertError) {
                console.error(`❌ [Transfer Form] Erro ao criar notificação de ${isReplacement ? 'atualização' : 'disponibilidade'}:`, notifInsertError);
                console.error('❌ [Transfer Form] Detalhes do erro:', {
                  code: notifInsertError.code,
                  message: notifInsertError.message,
                  details: notifInsertError.details,
                  hint: notifInsertError.hint,
                  payload: notificationData
                });
                console.error('❌ [Transfer Form] Insert error stringified:', JSON.stringify(notifInsertError, null, 2));
              } else {
                console.log(`✅ [Transfer Form] Notificação in-app de ${isReplacement ? 'atualização' : 'disponibilidade'} criada com sucesso!`, data);
              }
            } catch (insertException) {
              console.error('💥 [Transfer Form] Exceção durante inserção:', insertException);
              console.error('💥 [Transfer Form] Stack trace:', insertException.stack);
              console.error('💥 [Transfer Form] Exception tipo:', typeof insertException);
              console.error('💥 [Transfer Form] Exception toString:', insertException.toString());
            }
            } catch (profileException) {
              console.error('💥 [Transfer Form] Exceção durante busca do profile:', profileException);
              console.error('💥 [Transfer Form] Stack trace:', profileException.stack);
            }
          } catch (notificationError) {
            console.error(`❌ [Transfer Form] Erro ao enviar notificação in-app de ${isReplacement ? 'atualização' : 'disponibilidade'}:`, notificationError);
            console.error('❌ [Transfer Form] Stack trace completo:', notificationError.stack);
          }
        } else {
          console.warn('⚠️ [Transfer Form] student.user_id não encontrado, pulando notificação in-app');
        }
      } catch (notifyError) {
        console.error(`❌ [Transfer Form] Erro ao enviar notificações de ${isReplacement ? 'atualização' : 'disponibilidade'}:`, notifyError);
        // Não falhar o processo se a notificação falhar
      }
      
      window.location.reload();
    } catch (error: any) {
      console.error('Error uploading transfer form:', error);
      alert('Failed to upload transfer form: ' + error.message);
    } finally {
      setUploadingTransferForm(false);
    }
  }, [isPlatformAdmin, student, transferFormFile, getTransferApplication, logAction, userId, adminEmail]);

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
      
      // Log da ação
      if (logAction && userId) {
        try {
          await logAction(
            'transfer_form_approval',
            `Transfer form upload approved by platform admin`,
            userId,
            'admin',
            {
              upload_id: uploadId,
              student_id: student?.user_id || '',
              approved_by: adminEmail || 'Platform Admin',
              approved_at: new Date().toISOString()
            }
          );
          console.log('✅ [handleApproveTransferFormUpload] Ação logada com sucesso');
        } catch (logError) {
          console.error('⚠️ [handleApproveTransferFormUpload] Erro ao logar ação (não crítico):', logError);
        }
      }
      
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
            // Buscar o user_profiles.id correto
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, user_id')
              .eq('user_id', student.user_id)
              .single();
              
            if (profileError) {
              console.error('❌ [Transfer Form Approval] Erro ao buscar profile:', profileError);
              return;
            }
            
            const transferApp = getTransferApplication();
            const notificationData = {
              student_id: profileData.id, // student_notifications.student_id referencia user_profiles.id
              title: 'Transfer Form Approved',
              message: `Your Transfer Form has been approved. You can now proceed with the next steps of your application.`,
              link: `/student/dashboard/application/${transferApp?.id || ''}/chat?tab=documents`, // Deep link para a aplicação específica
              created_at: new Date().toISOString()
            };

            const { data: insertResult, error: notifInsertError } = await supabase
              .from('student_notifications')
              .insert([notificationData])
              .select('*');

            if (notifInsertError) {
              console.error('❌ [Transfer Form Approval] Erro ao criar notificação:', notifInsertError);
            } else {
              console.log('✅ [Transfer Form Approval] Notificação in-app criada com sucesso!', insertResult);
            }
          } catch (notificationError) {
            console.error('❌ [Transfer Form Approval] Erro ao enviar notificação in-app:', notificationError);
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
  }, [userId, getTransferApplication, student, logAction, adminEmail]);

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
      
      // Log da ação
      if (logAction && userId) {
        try {
          await logAction(
            'transfer_form_rejection',
            `Transfer form upload rejected by platform admin: ${reason}`,
            userId,
            'admin',
            {
              upload_id: uploadId,
              student_id: student?.user_id || '',
              rejection_reason: reason,
              rejected_by: adminEmail || 'Platform Admin',
              rejected_at: new Date().toISOString()
            }
          );
          console.log('✅ [handleRejectTransferFormUpload] Ação logada com sucesso');
        } catch (logError) {
          console.error('⚠️ [handleRejectTransferFormUpload] Erro ao logar ação (não crítico):', logError);
        }
      }
      
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
            // Buscar o user_profiles.id correto
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, user_id')
              .eq('user_id', student.user_id)
              .single();
              
            if (profileError) {
              console.error('❌ [Transfer Form Rejection] Erro ao buscar profile:', profileError);
              return;
            }
            
            const transferApp = getTransferApplication();
            const notificationData = {
              student_id: profileData.id, // student_notifications.student_id referencia user_profiles.id
              title: 'Transfer Form Rejected',
              message: `Your Transfer Form has been rejected. Reason: ${reason}. Please review and upload a corrected version.`,
              link: `/student/dashboard/application/${transferApp?.id || ''}/chat?tab=documents`, // Deep link para a aplicação específica
              created_at: new Date().toISOString()
            };

            const { data: insertResult, error: notifInsertError } = await supabase
              .from('student_notifications')
              .insert([notificationData])
              .select('*');

            if (notifInsertError) {
              console.error('❌ [Transfer Form Rejection] Erro ao criar notificação:', notifInsertError);
            } else {
              console.log('✅ [Transfer Form Rejection] Notificação in-app criada com sucesso!', insertResult);
            }
          } catch (notificationError) {
            console.error('❌ [Transfer Form Rejection] Erro ao enviar notificação in-app:', notificationError);
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
  }, [userId, getTransferApplication, student, logAction, adminEmail]);

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

