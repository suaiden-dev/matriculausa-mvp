import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Application, UserProfile, Scholarship } from '../types';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & {
    selection_survey_passed?: boolean;
    selected_application_id?: string | null;
  };
  scholarships: Scholarship;
}

interface UseSchoolAcceptanceLetterParams {
  application: ApplicationDetails | null;
  applicationId: string | undefined;
  setApplication: React.Dispatch<React.SetStateAction<ApplicationDetails | null>>;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  fetchStudentDocuments: () => Promise<void>;
  fetchApplicationDetails: () => Promise<void>;
  fetchDocumentRequests: () => Promise<void>;
  fetchTransferForm: () => Promise<void>;
  fetchTransferFormUploads: () => Promise<void>;
  transferForm: any;
  setTransferForm: React.Dispatch<React.SetStateAction<any>>;
}

export const useSchoolAcceptanceLetter = (params: UseSchoolAcceptanceLetterParams) => {
  const {
    application,
    applicationId,
    setApplication,
    setPreviewUrl,
    fetchStudentDocuments,
    fetchApplicationDetails,
    fetchDocumentRequests,
    fetchTransferForm,
    fetchTransferFormUploads,
    transferForm,
    setTransferForm,
  } = params;

  const { user } = useAuth();

  const [acceptanceLetterFile, setAcceptanceLetterFile] = useState<File | null>(null);
  const [uploadingAcceptanceLetter, setUploadingAcceptanceLetter] = useState(false);
  const [acceptanceLetterUploaded, setAcceptanceLetterUploaded] = useState(false);
  const [replacingAcceptanceLetter, setReplacingAcceptanceLetter] = useState(false);
  const [replaceAcceptanceLetterFile, setReplaceAcceptanceLetterFile] = useState<File | null>(null);

  const [isFileSelecting, setIsFileSelecting] = useState(false);

  const [selectedTransferFormFile, setSelectedTransferFormFile] = useState<File | null>(null);
  const [uploadingTransferForm, setUploadingTransferForm] = useState(false);

  const [newDocumentRequest, setNewDocumentRequest] = useState({
    title: '',
    description: '',
    due_date: '',
    attachment: null as File | null
  });
  const [creatingDocumentRequest, setCreatingDocumentRequest] = useState(false);

  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  // Inicializar estado da Acceptance Letter baseado na aplicação
  useEffect(() => {
    if (application) {
      const shouldBeUploaded = !!(application.acceptance_letter_url &&
        application.acceptance_letter_status &&
        application.acceptance_letter_status !== 'pending');
      setAcceptanceLetterUploaded(shouldBeUploaded);
    }
  }, [application]);

  // Limpar erros quando o arquivo for alterado
  useEffect(() => {
    if (acceptanceLetterFile) {
      clearFileSelectionError();
    }
  }, [acceptanceLetterFile]);

  // Função para limpar erros de seleção de arquivo
  const clearFileSelectionError = () => {
    // Função removida - não há mais fileSelectionError
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
              toast.error('File size must be less than 10MB');
              return;
            }

            // Validar tipo de arquivo
            const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!allowedTypes.includes(fileExtension)) {
              toast.error('Please select a valid file type: PDF, DOC, DOCX, JPG, JPEG, or PNG');
              return;
            }

            setAcceptanceLetterFile(file);
            setAcceptanceLetterUploaded(false);

            // Limpar o input para permitir selecionar o mesmo arquivo novamente
            event.target.value = '';
          }
        } catch (error) {
          console.error('Error processing file selection:', error);
          toast.error('Error processing file. Please try again.');
        } finally {
          setIsFileSelecting(false);
        }
      }, 100);

    } catch (error) {
      console.error('Error selecting file:', error);
      toast.error('Error selecting file. Please try again.');
      setIsFileSelecting(false);
    }
  };

  // Função para sanitizar nomes de arquivos (remover acentos, espaços e caracteres especiais)
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos (acentos)
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Substituir caracteres especiais por underscore
      .replace(/_+/g, '_') // Remover underscores múltiplos
      .replace(/^_|_$/g, ''); // Remover underscores do início e fim
  };

  // Função para processar a carta de aceite
  const handleProcessAcceptanceLetter = async () => {
    if (!application || !acceptanceLetterFile) {
      toast.error('Please select a file first.');
      return;
    }

    setUploadingAcceptanceLetter(true);
    try {
      // Sanitizar o nome do arquivo e gerar chave segura
      const sanitizedFileName = sanitizeFileName(acceptanceLetterFile.name);
      const timestamp = Date.now();
      const fileName = `acceptance_letters/${timestamp}_${sanitizedFileName}`;

      // Upload do arquivo original
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, acceptanceLetterFile);

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Obter a URL pública do arquivo original
      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData.path);

      // Gerar preview via Edge Function no backend (seguro e confiável)
      let previewUrl: string | null = null;
      if (acceptanceLetterFile.type === 'application/pdf') {
        console.log('[StudentDetails] Requesting backend preview generation...');
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const res = await supabase.functions.invoke('generate-document-preview', {
          body: {
            storagePath: uploadData.path,
            applicationId: application.id,
            documentType: 'acceptance_letter',
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (res.error) {
          console.error('[StudentDetails] Preview generation failed:', res.error);
        } else {
          previewUrl = res.data?.previewUrl ?? null;
          console.log('[StudentDetails] Preview generated:', previewUrl);
        }
      }

      // Atualizar a aplicação com a URL da carta de aceite e o preview
      const updateData = {
        acceptance_letter_url: publicUrl,
        acceptance_letter_preview_url: previewUrl,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      };

      console.log('=== ATUALIZANDO APLICAÇÃO COM STATUS ENROLLED ===');
      console.log('Application ID:', application.id);
      console.log('Update data:', updateData);

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update(updateData)
        .eq('id', application.id);

      if (updateError) {
        console.error('Erro ao atualizar aplicação:', updateError);
        throw new Error('Failed to update application: ' + updateError.message);
      }

      console.log('Aplicação atualizada com sucesso!');

      // Atualizar o estado local da aplicação
      setApplication(prev => prev ? ({
        ...prev,
        acceptance_letter_url: publicUrl,
        acceptance_letter_preview_url: previewUrl,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      } as any) : prev);

      // Atualizar o estado local da carta de aceite
      setAcceptanceLetterUploaded(true);

      // Atualizar o perfil do usuário com documents_status e status geral
      console.log('=== ATUALIZANDO PERFIL DO USUÁRIO ===');
      console.log('User ID:', application.user_profiles.user_id);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          documents_status: 'approved',
          status: 'active'
        })
        .eq('user_id', application.user_profiles.user_id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      } else {
        console.log('Perfil do usuário atualizado com sucesso!');
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

          // Segundo webhook: Notificar sobre I-20 Control Fee disponível
          try {
            const i20ControlFeePayload = {
              tipo_notf: "I-20 Control Fee Disponível",
              email_aluno: userData.email,
              nome_aluno: application.user_profiles.full_name,
              email_universidade: user?.email,
              o_que_enviar: `Great news! Your I-20 Control Fee is now available for payment. This fee is required for the issuance of your I-20 document, essential for your F-1 visa. You have 10 days to complete this payment. Please check your dashboard to proceed.`
            };

            console.log('Enviando webhook I-20 Control Fee...');
            console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
            console.log('I-20 Control Fee payload:', i20ControlFeePayload);

            const i20WebhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(i20ControlFeePayload),
            });

            console.log('I-20 Control Fee webhook response status:', i20WebhookResponse.status);
            console.log('I-20 Control Fee webhook response ok:', i20WebhookResponse.ok);

            if (!i20WebhookResponse.ok) {
              const i20WebhookErrorText = await i20WebhookResponse.text();
              console.error('I-20 Control Fee webhook error:', i20WebhookErrorText);
            } else {
              console.log('I-20 Control Fee webhook enviado com sucesso');
            }
          } catch (i20WebhookError) {
            console.error('Erro ao enviar webhook I-20 Control Fee:', i20WebhookError);
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

      // Recarregar apenas os documentos do aluno
      await fetchStudentDocuments();

      // Recarregar os dados da aplicação para garantir sincronização
      console.log('=== RECARREGANDO DADOS DA APLICAÇÃO ===');
      await fetchApplicationDetails();

      // Log: envio de acceptance letter pela universidade
      try {
        const studentProfileId = application?.user_profiles?.id;
        const performedBy = user?.id;
        if (studentProfileId && performedBy) {
          // Enriquecer metadados com IP público (melhor esforço)
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              const j = await res.json();
              clientIp = j?.ip;
            }
          } catch (_) { /* ignore */ }

          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'acceptance_letter_sent',
            p_action_description: 'University sent acceptance letter',
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: {
              application_id: application.id,
              acceptance_letter_url: publicUrl,
              ip: clientIp
            }
          });
        }
      } catch (logErr) {
        console.error('Failed to log acceptance letter sent (university):', logErr);
      }
    } catch (error: any) {
      console.error('Error processing acceptance letter:', error);
      toast.error(`Failed to process acceptance letter: ${error.message}`);
    } finally {
      setUploadingAcceptanceLetter(false);
    }
  };

  const handleReplaceAcceptanceLetter = async () => {
    if (!application || !replaceAcceptanceLetterFile) return;

    setReplacingAcceptanceLetter(true);
    try {
      const sanitizedFileName = sanitizeFileName(replaceAcceptanceLetterFile.name);
      const timestamp = Date.now();
      const fileName = `acceptance_letters/${timestamp}_${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, replaceAcceptanceLetterFile);

      if (uploadError) throw new Error('Failed to upload file: ' + uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData.path);

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          acceptance_letter_url: publicUrl,
          acceptance_letter_status: 'approved',
          acceptance_letter_sent_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (updateError) throw new Error('Failed to update application: ' + updateError.message);

      setApplication(prev => prev ? ({
        ...prev,
        acceptance_letter_url: publicUrl,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
      } as any) : prev);

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
            p_action_type: 'acceptance_letter_replaced',
            p_action_description: 'University replaced acceptance letter',
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: { application_id: application.id, acceptance_letter_url: publicUrl, ip: clientIp }
          });
        }
      } catch (logErr) {
        console.error('Failed to log acceptance letter replaced:', logErr);
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (accessToken) {
          await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({
              user_id: application.user_profiles.user_id,
              title: 'Acceptance letter updated',
              message: 'Your acceptance letter has been updated. Check your dashboard for details.',
              type: 'acceptance_letter_sent',
              link: '/student/dashboard',
            }),
          });
        }
      } catch { /* ignore notify errors */ }

      setReplaceAcceptanceLetterFile(null);
      await fetchStudentDocuments();
      toast.success('Acceptance letter replaced successfully!');
    } catch (error: any) {
      console.error('Error replacing acceptance letter:', error);
      toast.error(`Failed to replace acceptance letter: ${error.message}`);
    } finally {
      setReplacingAcceptanceLetter(false);
    }
  };

  const handleViewAcceptanceLetter = () => {
    if (application?.acceptance_letter_url) {
      setPreviewUrl(application.acceptance_letter_url);
    }
  };

  const handleDownloadAcceptanceLetter = async () => {
    if (!application?.acceptance_letter_url) return;
    try {
      const response = await fetch(application.acceptance_letter_url);
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = application.acceptance_letter_url.split('/').pop() || 'acceptance_letter.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading acceptance letter:', err);
      toast.error(`Failed to download: ${err.message}`);
    }
  };

  // Função para upload do Transfer Form pela universidade
  const handleUploadTransferForm = async (file: File) => {
    if (!application || !file) return;

    setUploadingTransferForm(true);
    try {
      // Se já existe um transfer form, deletar o arquivo antigo do storage
      if (transferForm?.transfer_form_url) {
        const oldUrl = transferForm.transfer_form_url;
        const oldFileName = oldUrl.split('/document-attachments/')[1];
        if (oldFileName) {
          await supabase.storage
            .from('document-attachments')
            .remove([decodeURIComponent(oldFileName)]);
        }
      }

      // Sanitizar nome do arquivo
      const sanitizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const fileName = `transfer-forms/${Date.now()}_${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData.path);

      // Atualizar aplicação
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          transfer_form_url: publicUrl,
          transfer_form_status: 'sent',
          transfer_form_sent_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (updateError) {
        throw new Error('Failed to update application: ' + updateError.message);
      }

      // Atualizar estado local
      setTransferForm((prev: any) => ({
        ...prev,
        transfer_form_url: publicUrl,
        transfer_form_status: 'sent',
        transfer_form_sent_at: new Date().toISOString()
      }));

      // Recarregar dados
      await fetchTransferForm();
      setSelectedTransferFormFile(null);

      toast.success('Transfer form template uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading transfer form:', error);
      toast.error(`Failed to upload transfer form: ${error.message}`);
    } finally {
      setUploadingTransferForm(false);
    }
  };

  // Função para aprovar upload do Transfer Form do aluno
  const handleApproveTransferFormUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', uploadId);

      if (error) {
        throw new Error('Failed to approve transfer form: ' + error.message);
      }

      // Atualizar também a aplicação associada
      if (application?.id) {
        const { error: appError } = await supabase
          .from('scholarship_applications')
          .update({
            transfer_form_status: 'approved'
          })
          .eq('id', application.id);

        if (appError) {
          console.error('Failed to update application transfer form status:', appError);
        } else {
          setApplication((prev: any) => prev ? ({
            ...prev,
            transfer_form_status: 'approved'
          }) : prev);
        }
      }

      // Recarregar uploads
      await fetchTransferFormUploads();

      toast.success('Transfer form approved successfully!');
    } catch (error: any) {
      console.error('Error approving transfer form:', error);
      toast.error(`Failed to approve transfer form: ${error.message}`);
    }
  };

  // Função para rejeitar upload do Transfer Form do aluno
  const handleRejectTransferFormUpload = async (uploadId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', uploadId);

      if (error) {
        throw new Error('Failed to reject transfer form: ' + error.message);
      }

      // Atualizar também a aplicação associada
      if (application?.id) {
        const { error: appError } = await supabase
          .from('scholarship_applications')
          .update({
            transfer_form_status: 'returned' // 'returned' indica que retornou para correções no fluxo
          })
          .eq('id', application.id);

        if (appError) {
          console.error('Failed to update application transfer form status:', appError);
        } else {
          setApplication((prev: any) => prev ? ({
            ...prev,
            transfer_form_status: 'returned'
          }) : prev);
        }
      }

      // Recarregar uploads
      await fetchTransferFormUploads();

      toast.success('Transfer form rejected successfully!');
    } catch (error: any) {
      console.error('Error rejecting transfer form:', error);
      toast.error(`Failed to reject transfer form: ${error.message}`);
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
                  link: `/student/dashboard/application/${applicationId}/chat?tab=documents`,
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

    } catch (err: any) {
      console.error("Error creating document request:", err);
      toast.error(`Failed to create document request: ${err.message}`);
    } finally {
      setCreatingDocumentRequest(false);
    }
  };

  return {
    acceptanceLetterFile, setAcceptanceLetterFile,
    uploadingAcceptanceLetter,
    acceptanceLetterUploaded, setAcceptanceLetterUploaded,
    replacingAcceptanceLetter,
    replaceAcceptanceLetterFile, setReplaceAcceptanceLetterFile,
    isFileSelecting,
    selectedTransferFormFile, setSelectedTransferFormFile,
    uploadingTransferForm,
    newDocumentRequest, setNewDocumentRequest,
    creatingDocumentRequest,
    showNewRequestModal, setShowNewRequestModal,
    clearFileSelectionError,
    handleAcceptanceLetterFileSelect,
    handleProcessAcceptanceLetter,
    handleReplaceAcceptanceLetter,
    handleViewAcceptanceLetter,
    handleDownloadAcceptanceLetter,
    handleCreateDocumentRequest,
    handleUploadTransferForm,
    handleApproveTransferFormUpload,
    handleRejectTransferFormUpload,
  };
};
