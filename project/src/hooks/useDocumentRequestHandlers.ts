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
      const fileName = `${student.user_id}/${requestId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('document-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('document-uploads')
        .getPublicUrl(fileName);

      // Save upload record
      const { error: recordError } = await supabase
        .from('document_request_uploads')
        .insert({
          document_request_id: requestId,
          file_url: publicUrl,
          filename: file.name,
          uploaded_by: userId,
          status: 'pending'
        });

      if (recordError) throw recordError;

      alert('Document uploaded successfully!');
      
      // Reload document requests if callback provided
      if (setDocumentRequests) {
        const { data } = await supabase
          .from('document_requests')
          .select('*')
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
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userId
        })
        .eq('id', uploadId);

      if (error) throw error;

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
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: userId,
          rejection_reason: reason
        })
        .eq('id', uploadId);

      if (error) throw error;

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
  const handleDownloadDocument = useCallback((doc: { file_url: string; filename: string }) => {
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = doc.filename;
    link.click();
  }, []);

  // Handler para editar template
  const handleEditTemplate = useCallback((requestId: string) => {
    console.log('Edit template for request:', requestId);
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
        const { data } = await supabase
          .from('document_requests')
          .select('*')
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

