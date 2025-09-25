import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Trash2,
  BookOpen,
  Brain,
  Settings
} from 'lucide-react';
import UniversityKnowledgeUpload, { UniversityKnowledgeDocument } from './UniversityKnowledgeUpload';

interface UniversityKnowledgeManagementProps {
  universityId: string;
  onKnowledgeUpdated?: (message: string) => void;
  showNotification?: (type: 'success' | 'error', message: string) => void;
}

export default function UniversityKnowledgeManagement({ 
  universityId, 
  onKnowledgeUpdated,
  showNotification
}: UniversityKnowledgeManagementProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UniversityKnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Buscar documentos da universidade
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('university_knowledge_documents')
        .select('*')
        .eq('university_id', universityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar documentos:', err);
      setError(err.message || 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar prompt com base de conhecimento
  const updatePromptWithKnowledge = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-university-knowledge-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          university_id: universityId
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar prompt');
      }
      
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar prompt:', err);
      return false;
    }
  };

  // Deletar documento
  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('university_knowledge_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      showNotification?.('success', 'Documento deletado com sucesso!');
      
      // Atualizar prompt após deletar
      await updatePromptWithKnowledge();
      onKnowledgeUpdated?.('Documento removido da base de conhecimento');
    } catch (err: any) {
      console.error('Erro ao deletar documento:', err);
      showNotification?.('error', err.message || 'Erro ao deletar documento');
    }
  };

  // Atualizar documentos
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
    showNotification?.('success', 'Documentos atualizados!');
  };

  // Atualizar prompt
  const handleUpdatePrompt = async () => {
    try {
      const success = await updatePromptWithKnowledge();
      if (success) {
        showNotification?.('success', 'Prompt atualizado com sucesso!');
        onKnowledgeUpdated?.('Base de conhecimento atualizada');
      } else {
        showNotification?.('error', 'Erro ao atualizar prompt');
      }
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
      showNotification?.('error', 'Erro ao atualizar prompt');
    }
  };

  // Monitorar transcrições em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('university-knowledge-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'university_knowledge_documents',
          filter: `university_id=eq.${universityId}`
        },
        (payload) => {
          console.log('Mudança detectada na base de conhecimento:', payload);
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [universityId]);

  // Carregar documentos inicialmente
  useEffect(() => {
    fetchDocuments();
  }, [universityId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Transcrição completa';
      case 'processing':
        return 'Processando...';
      case 'error':
        return 'Erro na transcrição';
      default:
        return 'Pendente';
    }
  };

  const completedDocuments = documents.filter(doc => doc.transcription_status === 'completed');
  const pendingDocuments = documents.filter(doc => doc.transcription_status === 'pending' || doc.transcription_status === 'processing');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Base de Conhecimento</h3>
              <p className="text-sm text-gray-600">
                Gerencie os documentos que a IA de emails usará para responder aos estudantes
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            <button
              onClick={handleUpdatePrompt}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Settings className="w-4 h-4" />
              <span>Atualizar IA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total de Documentos</p>
              <p className="text-2xl font-semibold text-gray-900">{documents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Processados</p>
              <p className="text-2xl font-semibold text-gray-900">{completedDocuments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingDocuments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Component */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Adicionar Documentos</h4>
        <UniversityKnowledgeUpload
          universityId={universityId}
          onDocumentsChange={(newDocs) => {
            setDocuments(prev => [...newDocs, ...prev]);
            showNotification?.('success', 'Documentos adicionados com sucesso!');
            onKnowledgeUpdated?.('Novos documentos adicionados à base de conhecimento');
          }}
          existingDocuments={documents}
        />
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar documentos</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum documento encontrado</h3>
          <p className="text-gray-600">
            Adicione documentos para criar uma base de conhecimento para a IA de emails
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Documentos da Base de Conhecimento</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div key={doc.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{doc.document_name}</h5>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(doc.transcription_status)}
                          <span className="text-xs text-gray-500">{getStatusText(doc.transcription_status)}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-400 hover:text-red-600 p-2"
                    title="Deletar documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Show transcription preview if completed */}
                {doc.transcription_status === 'completed' && doc.transcription_text && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">Preview da transcrição:</p>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {doc.transcription_text.substring(0, 200)}...
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
