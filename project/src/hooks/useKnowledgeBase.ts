import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  KnowledgeDocument, 
  AIConfiguration,
  fetchKnowledgeDocuments,
  processKnowledgeBaseUpdate,
  generateWhatsAppPromptWithKnowledge
} from '../utils/whatsappPromptGenerator';

export interface UseKnowledgeBaseReturn {
  documents: KnowledgeDocument[];
  loading: boolean;
  error: string | null;
  refreshDocuments: () => Promise<void>;
  updatePromptWithKnowledge: () => Promise<boolean>;
  getDocumentStatus: (documentId: string) => 'pending' | 'processing' | 'completed' | 'error';
  getCompletedDocumentsCount: () => number;
  getPendingDocumentsCount: () => number;
}

export function useKnowledgeBase(aiConfigId: string | null): UseKnowledgeBaseReturn {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar documentos de conhecimento
  const fetchDocuments = useCallback(async () => {
    if (!aiConfigId) return;

    setLoading(true);
    setError(null);

    try {
      const docs = await fetchKnowledgeDocuments(aiConfigId);
      setDocuments(docs);
    } catch (err) {
      console.error('Erro ao buscar documentos:', err);
      setError('Erro ao carregar documentos de conhecimento');
    } finally {
      setLoading(false);
    }
  }, [aiConfigId]);

  // Atualizar documentos
  const refreshDocuments = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  // Atualizar prompt com base de conhecimento
  const updatePromptWithKnowledge = useCallback(async (): Promise<boolean> => {
    if (!aiConfigId) {
      setError('ID da configuração de AI não fornecido');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await processKnowledgeBaseUpdate(aiConfigId);
      if (success) {
        // Recarregar documentos após atualização
        await fetchDocuments();
      } else {
        setError('Erro ao atualizar prompt com base de conhecimento');
      }
      return success;
    } catch (err) {
      console.error('Erro ao atualizar prompt:', err);
      setError('Erro ao atualizar prompt com base de conhecimento');
      return false;
    } finally {
      setLoading(false);
    }
  }, [aiConfigId, fetchDocuments]);

  // Obter status de um documento
  const getDocumentStatus = useCallback((documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    return doc?.transcription_status || 'pending';
  }, [documents]);

  // Contar documentos completados
  const getCompletedDocumentsCount = useCallback(() => {
    return documents.filter(doc => doc.transcription_status === 'completed').length;
  }, [documents]);

  // Contar documentos pendentes
  const getPendingDocumentsCount = useCallback(() => {
    return documents.filter(doc => 
      doc.transcription_status === 'pending' || 
      doc.transcription_status === 'processing'
    ).length;
  }, [documents]);

  // Carregar documentos quando aiConfigId mudar
  useEffect(() => {
    if (aiConfigId) {
      fetchDocuments();
    }
  }, [aiConfigId, fetchDocuments]);

  // Configurar real-time subscription para atualizações
  useEffect(() => {
    if (!aiConfigId) return;

    const subscription = supabase
      .channel(`knowledge-documents-${aiConfigId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_agent_knowledge_documents',
          filter: `ai_configuration_id=eq.${aiConfigId}`
        },
        (payload) => {
          console.log('Mudança detectada em documentos de conhecimento:', payload);
          
          // Atualizar documentos em tempo real
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchDocuments();
          } else if (payload.eventType === 'DELETE') {
            setDocuments(prev => prev.filter(doc => doc.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [aiConfigId, fetchDocuments]);

  return {
    documents,
    loading,
    error,
    refreshDocuments,
    updatePromptWithKnowledge,
    getDocumentStatus,
    getCompletedDocumentsCount,
    getPendingDocumentsCount
  };
}

// Hook adicional para monitorar transcrições
export function useTranscriptionMonitor(aiConfigId: string | null) {
  const [transcriptionStatus, setTranscriptionStatus] = useState<{
    pending: number;
    processing: number;
    completed: number;
    error: number;
  }>({
    pending: 0,
    processing: 0,
    completed: 0,
    error: 0
  });

  const updateStatus = useCallback(async () => {
    if (!aiConfigId) return;

    try {
      const { data, error } = await supabase
        .from('ai_agent_knowledge_documents')
        .select('transcription_status')
        .eq('ai_configuration_id', aiConfigId);

      if (error) {
        console.error('Erro ao buscar status de transcrições:', error);
        return;
      }

      const status = {
        pending: data?.filter(d => d.transcription_status === 'pending').length || 0,
        processing: data?.filter(d => d.transcription_status === 'processing').length || 0,
        completed: data?.filter(d => d.transcription_status === 'completed').length || 0,
        error: data?.filter(d => d.transcription_status === 'error').length || 0
      };

      setTranscriptionStatus(status);
    } catch (err) {
      console.error('Erro ao atualizar status de transcrições:', err);
    }
  }, [aiConfigId]);

  useEffect(() => {
    updateStatus();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(updateStatus, 30000);
    
    return () => clearInterval(interval);
  }, [aiConfigId, updateStatus]);

  return transcriptionStatus;
}

// Hook para gerenciar atualizações automáticas
export function useAutoUpdateKnowledge(aiConfigId: string | null) {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const triggerUpdate = useCallback(async () => {
    if (!aiConfigId) return false;

    try {
      const success = await processKnowledgeBaseUpdate(aiConfigId);
      if (success) {
        setLastUpdate(new Date());
      }
      return success;
    } catch (error) {
      console.error('Erro na atualização automática:', error);
      return false;
    }
  }, [aiConfigId]);

  // Atualização automática quando documentos são completados
  useEffect(() => {
    if (!autoUpdateEnabled || !aiConfigId) return;

    const checkAndUpdate = async () => {
      try {
        const { data } = await supabase
          .from('ai_agent_knowledge_documents')
          .select('transcription_status')
          .eq('ai_configuration_id', aiConfigId)
          .eq('transcription_status', 'completed');

        if (data && data.length > 0) {
          await triggerUpdate();
        }
      } catch (error) {
        console.error('Erro ao verificar documentos completados:', error);
      }
    };

    // Verificar a cada 60 segundos
    const interval = setInterval(checkAndUpdate, 60000);
    
    return () => clearInterval(interval);
  }, [autoUpdateEnabled, aiConfigId, triggerUpdate]);

  return {
    autoUpdateEnabled,
    setAutoUpdateEnabled,
    lastUpdate,
    triggerUpdate
  };
} 