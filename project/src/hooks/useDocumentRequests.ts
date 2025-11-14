import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface NewDocumentRequest {
  title: string;
  description: string;
  due_date: string;
  attachment: File | null;
}

interface StudentRecord {
  user_id: string;
  all_applications?: any[];
}

export const useDocumentRequests = (
  student: StudentRecord | null,
  userId?: string,
  setDocumentRequests?: (requests: any[]) => void
) => {
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [creatingDocumentRequest, setCreatingDocumentRequest] = useState(false);
  const [newDocumentRequest, setNewDocumentRequest] = useState<NewDocumentRequest>({
    title: '',
    description: '',
    due_date: '',
    attachment: null
  });

  // Função utilitária para sanitizar nome de arquivo
  const sanitizeFileName = (fileName: string): string => {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  };

  // Abrir modal
  const openNewRequestModal = useCallback(() => {
    setShowNewRequestModal(true);
  }, []);

  // Fechar modal e limpar formulário
  const closeNewRequestModal = useCallback(() => {
    setShowNewRequestModal(false);
    setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
  }, []);

  // Atualizar campos do formulário
  const updateNewDocumentRequest = useCallback((updates: Partial<NewDocumentRequest>) => {
    setNewDocumentRequest(prev => ({ ...prev, ...updates }));
  }, []);

  // Handler para criar novo Document Request
  const handleCreateDocumentRequest = useCallback(async () => {
    if (!student) return;
    try {
      setCreatingDocumentRequest(true);

      // Selecionar uma aplicação alvo (prioriza com acceptance letter, senão primeira)
      const apps = student.all_applications || [];
      const targetApp = apps.find((a: any) => !!a.acceptance_letter_url) || apps[0];
      if (!targetApp) {
        alert('No application found for this student.');
        return;
      }

      // Identificar university_id
      let university_id: string | undefined = undefined;
      if (targetApp?.scholarships) {
        const scholarship = Array.isArray(targetApp.scholarships) ? targetApp.scholarships[0] : targetApp.scholarships;
        university_id = scholarship?.university_id;
      }

      // Upload do anexo (opcional)
      let attachment_url: string | null = null;
      if (newDocumentRequest.attachment) {
        const sanitized = sanitizeFileName(newDocumentRequest.attachment.name);
        const storagePath = `individual/${Date.now()}_${sanitized}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('document-attachments')
          .upload(storagePath, newDocumentRequest.attachment);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('document-attachments')
          .getPublicUrl(uploadData?.path || storagePath);
        attachment_url = publicUrl;
      }

      // Chamar Edge Function para criar request
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Sessão inválida. Faça login novamente.');

      const payload = {
        title: newDocumentRequest.title,
        description: newDocumentRequest.description,
        due_date: newDocumentRequest.due_date || null,
        attachment_url,
        university_id,
        is_global: false,
        status: 'open',
        created_by: userId || '',
        scholarship_application_id: targetApp.id
      };

      const FUNCTIONS_URL = (import.meta as any).env.VITE_SUPABASE_FUNCTIONS_URL as string;
      const resp = await fetch(`${FUNCTIONS_URL}/create-document-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      let result: any = {};
      try { result = await resp.json(); } catch { /* noop */ }
      if (!resp.ok || !result?.success) throw new Error(result?.error || 'Failed to create request');

      // Recarregar lista - buscar document requests novamente
      if (setDocumentRequests) {
        const applicationIds = (student.all_applications || []).map((app: any) => app.id).filter(Boolean);
        
        if (applicationIds.length > 0) {
          // ✅ OTIMIZAÇÃO: Selecionar apenas campos necessários
          const fields = 'id,title,description,due_date,is_global,university_id,scholarship_application_id,created_at,updated_at,template_url,attachment_url';
          
          const [specificResult, globalResult] = await Promise.all([
            supabase
              .from('document_requests')
              .select(fields)
              .in('scholarship_application_id', applicationIds)
              .order('created_at', { ascending: false }),
            
            (() => {
              const universityIds = (student.all_applications || [])
                .map((app: any) => app.scholarships?.university_id || app.university_id)
                .filter(Boolean);
              const uniqueUniversityIds = [...new Set(universityIds)];
              
              if (uniqueUniversityIds.length === 0) {
                return Promise.resolve({ data: [] });
              }
              
              return supabase
                .from('document_requests')
                .select(fields)
                .eq('is_global', true)
                .in('university_id', uniqueUniversityIds)
                .order('created_at', { ascending: false });
            })()
          ]);

          const allRequests = [
            ...(specificResult.data || []),
            ...(globalResult.data || [])
          ];

          // Remover duplicatas
          const uniqueRequests = Array.from(
            new Map(allRequests.map(req => [req.id, req])).values()
          );

          setDocumentRequests(uniqueRequests);
        }
      }
      
      // Limpar formulário e fechar modal
      closeNewRequestModal();
      alert('Document request created successfully!');
    } catch (err: any) {
      console.error('Error creating document request:', err);
      alert(`Failed to create document request: ${err?.message || 'Unknown error'}`);
    } finally {
      setCreatingDocumentRequest(false);
    }
  }, [student, newDocumentRequest, userId, setDocumentRequests, closeNewRequestModal]);

  return {
    showNewRequestModal,
    creatingDocumentRequest,
    newDocumentRequest,
    openNewRequestModal,
    closeNewRequestModal,
    updateNewDocumentRequest,
    handleCreateDocumentRequest
  };
};

