import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { filenameFromUrl } from '../lib/urlUtils';

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
  const [migmaTransferFormUrl, setMigmaTransferFormUrl] = useState<string | null>(null);
  const [migmaTransferFormStatus, setMigmaTransferFormStatus] = useState<string | null>(null);

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

  // Carregar transfer form uploads e migma transfer form
  useEffect(() => {
    const fetchTransferData = async () => {
      if (student?.student_process_type !== 'transfer') {
        setTransferFormUploads([]);
        setMigmaTransferFormUrl(null);
        return;
      }

      const transferApp = getTransferApplication();
      if (!transferApp?.id) {
        setTransferFormUploads([]);
        return;
      }

      // 1. Buscar uploads manuais (MatriculaUSA)
      const { data: uploads } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', transferApp.id)
        .order('uploaded_at', { ascending: false });

      if (uploads) {
        setTransferFormUploads(uploads);
      }

      // 2. Buscar formulário vindo do Migma (incluindo status da decisão)
      const { data: migmaData } = await supabase
        .from('migma_packages')
        .select('transfer_form_filled_url, transfer_form_status')
        .eq('student_user_id', student?.user_id)
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (migmaData?.transfer_form_filled_url) {
        setMigmaTransferFormUrl(migmaData.transfer_form_filled_url);
        setMigmaTransferFormStatus(migmaData.transfer_form_status ?? null);
      } else if (student?.user_id) {
        // Fallback: tentar buscar por email se user_id falhar (comum em migrações)
        const studentEmail = (student as any).student_email || (student as any).email;
        if (studentEmail) {
          const { data: migmaDataByEmail } = await supabase
            .from('migma_packages')
            .select('transfer_form_filled_url, transfer_form_status')
            .eq('student_email', studentEmail)
            .order('received_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (migmaDataByEmail?.transfer_form_filled_url) {
            setMigmaTransferFormUrl(migmaDataByEmail.transfer_form_filled_url);
            setMigmaTransferFormStatus(migmaDataByEmail.transfer_form_status ?? null);
          }
        }
      }
    };

    fetchTransferData();
  }, [student?.student_process_type, student?.all_applications, student?.user_id, getTransferApplication]);

  // Handler para upload de Transfer Form
  const handleUploadTransferForm = useCallback(async () => {
    if (!isPlatformAdmin || !student || !transferFormFile) return;
    
    try {
      setUploadingTransferForm(true);
      const transferApp = getTransferApplication();
      if (!transferApp) return;
      
      if (transferApp.transfer_form_url) {
        try {
          const oldPath = filenameFromUrl(transferApp.transfer_form_url);
          if (oldPath) {
            await supabase.storage
              .from('document-attachments')
              .remove([`transfer-forms/${oldPath}`]);
          }
        } catch (deleteError) {
          console.warn('Could not delete old transfer form:', deleteError);
        }
      }
      
      const sanitized = sanitizeFileName(transferFormFile.name);
      const storagePath = `${student.user_id}/transfer-forms/${Date.now()}_${sanitized}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(storagePath, transferFormFile, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
      const { data: signedData, error: signedError } = await supabase.storage
        .from('document-attachments')
        .createSignedUrl(uploadData?.path || storagePath, TEN_YEARS);
      if (signedError) throw signedError;
      const publicUrl = signedData.signedUrl;
      
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          transfer_form_url: publicUrl,
          transfer_form_status: 'sent',
          transfer_form_sent_at: new Date().toISOString()
        })
        .eq('id', transferApp.id);
        
      if (updateError) throw updateError;

      // Notify Migma so the student can see the transfer form in their dashboard
      try {
        const MIGMA_FUNCTIONS_URL = (import.meta as any).env.VITE_MIGMA_FUNCTIONS_URL as string;
        const MIGMA_SECRET = (import.meta as any).env.VITE_MIGMA_WEBHOOK_SECRET as string;
        const MIGMA_ANON_KEY = (import.meta as any).env.VITE_MIGMA_SUPABASE_ANON_KEY as string;

        const { data: studentProfile } = await supabase
          .from('user_profiles').select('email').eq('user_id', student.user_id).maybeSingle();

        if (MIGMA_FUNCTIONS_URL && MIGMA_SECRET && studentProfile?.email) {
          await fetch(`${MIGMA_FUNCTIONS_URL}/receive-matriculausa-letter`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${MIGMA_ANON_KEY || ''}`,
              'x-migma-webhook-secret': MIGMA_SECRET,
            },
            body: JSON.stringify({
              student_email: studentProfile.email,
              transfer_form_url: publicUrl,
            }),
          });
        }
      } catch (webhookErr) {
        console.warn('Could not notify Migma of transfer form URL (non-fatal):', webhookErr);
      }

      if (logAction && userId) {
        await logAction('transfer_form_upload', `Transfer form uploaded`, userId, 'admin', { file_name: transferFormFile.name });
      }

      window.location.reload();
    } catch (error) {
      console.error('Error uploading transfer form:', error);
    } finally {
      setUploadingTransferForm(false);
    }
  }, [isPlatformAdmin, student, transferFormFile, getTransferApplication, logAction, userId]);

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
      
      if (logAction && userId) {
        await logAction('transfer_form_approval', `Transfer form approved`, userId, 'admin', { upload_id: uploadId });
      }

      // Notificações para o aluno (reutilizando lógica simplificada sem alertas)
      try {
        const { data: profile } = await supabase.from('user_profiles').select('id, email, full_name').eq('user_id', student?.user_id).maybeSingle();
        if (profile) {
           // Enviar e-mail via webhook (exemplo simplificado)
           await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_notf: "Documento aprovado",
              email_aluno: profile.email,
              nome_aluno: profile.full_name || 'Student',
              document_type: 'Transfer Form'
            }),
          });

          // Notificação In-App
          await supabase.from('student_notifications').insert([{
            student_id: profile.id,
            title: 'Transfer Form Approved',
            message: 'Your Transfer Form has been approved.',
            created_at: new Date().toISOString()
          }]);
        }
      } catch (e) { console.error('Error sending notifications:', e); }
      
      window.location.reload();
    } catch (error) {
      console.error('Error approving transfer form:', error);
    }
  }, [userId, logAction, student]);

  // Handler para rejeitar upload de Transfer Form
  const handleRejectTransferFormUpload = useCallback(async (uploadId: string, reason: string) => {
    try {
      if (uploadId !== 'migma') {
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
      }
      
      if (logAction && userId) {
        await logAction('transfer_form_rejection', `Transfer form rejected: ${reason}`, userId, 'admin', { upload_id: uploadId, reason });
      }
      
      // Notificações para o aluno
      try {
        const { data: profile } = await supabase.from('user_profiles').select('id, email, full_name').eq('user_id', student?.user_id).maybeSingle();
        if (profile) {
           await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_notf: "Changes Requested",
              email_aluno: profile.email,
              nome_aluno: profile.full_name || 'Student',
              document_type: 'Transfer Form',
              o_que_enviar: `Reason: ${reason}`
            }),
          });

          await supabase.from('student_notifications').insert([{
            student_id: profile.id,
            title: 'Transfer Form Rejected',
            message: `Your Transfer Form has been rejected. Reason: ${reason}`,
            created_at: new Date().toISOString()
          }]);
        }
      } catch (e) { console.error('Error sending notifications:', e); }
      
      window.location.reload();
    } catch (error) {
      console.error('Error rejecting transfer form:', error);
    }
  }, [userId, logAction, student]);

  // Handler para aprovar formulário enviado pelo aluno (via Migma)
  const handleApproveMigmaTransferForm = useCallback(async () => {
    try {
      const MIGMA_FUNCTIONS_URL = (import.meta as any).env.VITE_MIGMA_FUNCTIONS_URL as string;
      const MIGMA_SECRET = (import.meta as any).env.VITE_MIGMA_WEBHOOK_SECRET as string;
      const MIGMA_ANON_KEY = (import.meta as any).env.VITE_MIGMA_SUPABASE_ANON_KEY as string;

      const { data: studentProfile } = await supabase
        .from('user_profiles').select('email').eq('user_id', student?.user_id || '').maybeSingle();

      if (MIGMA_FUNCTIONS_URL && MIGMA_SECRET && studentProfile?.email) {
        await fetch(`${MIGMA_FUNCTIONS_URL}/receive-matriculausa-letter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MIGMA_ANON_KEY || ''}`,
            'x-migma-webhook-secret': MIGMA_SECRET,
          },
          body: JSON.stringify({
            student_email: studentProfile.email,
            transfer_form_admin_status: 'approved',
          }),
        });
      }

      await supabase
        .from('migma_packages')
        .update({ transfer_form_status: 'approved' })
        .eq('student_user_id', student?.user_id || '');

      window.location.reload();
    } catch (error) {
      console.error('Error approving migma transfer form:', error);
    }
  }, [student]);

  // Handler para rejeitar formulário enviado pelo aluno (via Migma)
  const handleRejectMigmaTransferForm = useCallback(async (reason: string) => {
    try {
      const MIGMA_FUNCTIONS_URL = (import.meta as any).env.VITE_MIGMA_FUNCTIONS_URL as string;
      const MIGMA_SECRET = (import.meta as any).env.VITE_MIGMA_WEBHOOK_SECRET as string;
      const MIGMA_ANON_KEY = (import.meta as any).env.VITE_MIGMA_SUPABASE_ANON_KEY as string;

      const { data: studentProfile } = await supabase
        .from('user_profiles').select('email').eq('user_id', student?.user_id || '').maybeSingle();

      if (MIGMA_FUNCTIONS_URL && MIGMA_SECRET && studentProfile?.email) {
        await fetch(`${MIGMA_FUNCTIONS_URL}/receive-matriculausa-letter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MIGMA_ANON_KEY || ''}`,
            'x-migma-webhook-secret': MIGMA_SECRET,
          },
          body: JSON.stringify({
            student_email: studentProfile.email,
            transfer_form_admin_status: 'rejected',
            transfer_form_rejection_reason: reason,
          }),
        });
      }

      await supabase
        .from('migma_packages')
        .update({ transfer_form_status: 'rejected' })
        .eq('student_user_id', student?.user_id || '');

      window.location.reload();
    } catch (error) {
      console.error('Error rejecting migma transfer form:', error);
    }
  }, [student]);

  return {
    transferFormFile,
    setTransferFormFile,
    uploadingTransferForm,
    transferFormUploads,
    getTransferApplication,
    handleUploadTransferForm,
    handleApproveTransferFormUpload,
    handleRejectTransferFormUpload,
    migmaTransferFormUrl,
    migmaTransferFormStatus,
    handleApproveMigmaTransferForm,
    handleRejectMigmaTransferForm,
  };
};
