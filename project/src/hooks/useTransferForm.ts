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
  userId?: string
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
      
      alert('Transfer form approved successfully!');
    } catch (error: any) {
      console.error('Error approving transfer form:', error);
      alert('Error approving transfer form: ' + error.message);
    }
  }, [userId, getTransferApplication]);

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
      
      alert('Transfer form rejected successfully!');
    } catch (error: any) {
      console.error('Error rejecting transfer form:', error);
      alert('Error rejecting transfer form: ' + error.message);
    }
  }, [userId, getTransferApplication]);

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

