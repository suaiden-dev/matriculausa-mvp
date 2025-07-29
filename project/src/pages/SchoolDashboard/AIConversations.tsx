import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface AIConversation {
  id: string;
  message_id: string;
  conversation_id: string;
  university_id: string;
  sender_email: string;
  received_at: string;
  email_subject: string;
  email_body: string;
  email_html_body: string;
  ai_response_body: string;
  ai_response_html: string;
  responded_at: string;
  status: 'received' | 'processing' | 'answered' | 'error' | 'manual_intervention_needed' | 'skipped';
  error_details: string;
  processing_time_ms: number;
  confidence_score: number;
  thread_id: string;
  attachments: any;
  university: {
    name: string;
  };
}

const AIConversations: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<AIConversation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'answered' | 'error' | 'manual_intervention_needed'>('all');

  useEffect(() => {
    loadConversations();
  }, [user, filter]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('ai_email_conversations')
        .select(`
          *,
          university:universities(name)
        `)
        .order('received_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'manual_intervention_needed':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'answered':
        return 'Respondido';
      case 'processing':
        return 'Processando';
      case 'error':
        return 'Erro';
      case 'manual_intervention_needed':
        return 'Intervenção Manual';
      case 'received':
        return 'Recebido';
      case 'skipped':
        return 'Ignorado';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const openConversationModal = (conversation: AIConversation) => {
    setSelectedConversation(conversation);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Conversas IA</h1>
        <p className="text-gray-600">Visualize todas as conversas processadas pela Inteligência Artificial.</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md font-medium ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todas ({conversations.length})
        </button>
        <button
          onClick={() => setFilter('answered')}
          className={`px-4 py-2 rounded-md font-medium ${
            filter === 'answered' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Respondidas ({conversations.filter(c => c.status === 'answered').length})
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`px-4 py-2 rounded-md font-medium ${
            filter === 'error' 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Erros ({conversations.filter(c => c.status === 'error').length})
        </button>
        <button
          onClick={() => setFilter('manual_intervention_needed')}
          className={`px-4 py-2 rounded-md font-medium ${
            filter === 'manual_intervention_needed' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Intervenção Manual ({conversations.filter(c => c.status === 'manual_intervention_needed').length})
        </button>
      </div>

      {/* Lista de Conversas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remetente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assunto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tempo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confiança
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conversations.map((conversation) => (
                <tr key={conversation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(conversation.received_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{conversation.sender_email}</div>
                      <div className="text-gray-500">{conversation.university?.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      <div className="font-medium">{conversation.email_subject}</div>
                      <div className="text-gray-500">{truncateText(conversation.email_body, 80)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(conversation.status)}`}>
                      {getStatusLabel(conversation.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {conversation.processing_time_ms ? `${conversation.processing_time_ms}ms` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {conversation.confidence_score ? `${(conversation.confidence_score * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openConversationModal(conversation)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {conversations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma conversa encontrada.</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showModal && selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detalhes da Conversa</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedConversation.status)}`}>
                    {getStatusLabel(selectedConversation.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Universidade</label>
                  <p className="text-sm text-gray-900">{selectedConversation.university?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remetente</label>
                  <p className="text-sm text-gray-900">{selectedConversation.sender_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recebido em</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedConversation.received_at)}</p>
                </div>
                {selectedConversation.responded_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Respondido em</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedConversation.responded_at)}</p>
                  </div>
                )}
                {selectedConversation.processing_time_ms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tempo de Processamento</label>
                    <p className="text-sm text-gray-900">{selectedConversation.processing_time_ms}ms</p>
                  </div>
                )}
              </div>

              {/* Email Original */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Email Original</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-2">
                    <strong>Assunto:</strong> {selectedConversation.email_subject}
                  </div>
                  <div className="mb-2">
                    <strong>Conteúdo:</strong>
                  </div>
                  <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                    {selectedConversation.email_body}
                  </div>
                </div>
              </div>

              {/* Resposta da IA */}
              {selectedConversation.ai_response_body && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Resposta da IA</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                      {selectedConversation.ai_response_body}
                    </div>
                    {selectedConversation.confidence_score && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Confiança:</strong> {(selectedConversation.confidence_score * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Erro (se houver) */}
              {selectedConversation.error_details && (
                <div>
                  <h4 className="text-md font-semibold text-red-900 mb-2">Erro</h4>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="bg-white p-3 rounded border text-sm text-red-700">
                      {selectedConversation.error_details}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConversations; 