import React from 'react';
import { 
  FileText, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download,
  Trash2,
  Eye,
  Settings,
  Zap
} from 'lucide-react';
import { useKnowledgeBase, useTranscriptionMonitor, useAutoUpdateKnowledge } from '../hooks/useKnowledgeBase';
import { KnowledgeDocument } from '../utils/whatsappPromptGenerator';
import { mergeWebhookResultWithPrompt } from '../utils/whatsappPromptGenerator';

interface WhatsAppKnowledgeManagementProps {
  aiConfigurationId: string;
  onPromptUpdated?: (newPrompt: string) => void;
  showNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function WhatsAppKnowledgeManagement({ 
  aiConfigurationId, 
  onPromptUpdated,
  showNotification
}: WhatsAppKnowledgeManagementProps) {
  const {
    documents,
    loading,
    error,
    refreshDocuments,
    updatePromptWithKnowledge,
    getDocumentStatus,
    getCompletedDocumentsCount,
    getPendingDocumentsCount
  } = useKnowledgeBase(aiConfigurationId);

  const transcriptionStatus = useTranscriptionMonitor(aiConfigurationId);
  const { autoUpdateEnabled, setAutoUpdateEnabled, lastUpdate, triggerUpdate } = useAutoUpdateKnowledge(aiConfigurationId);

  const handleRefresh = async () => {
    await refreshDocuments();
           showNotification?.('success', 'Documents updated!');
  };

  const handleUpdatePrompt = async () => {
    try {
      const success = await updatePromptWithKnowledge();
      if (success) {
        showNotification?.('success', 'Prompt atualizado com sucesso!');
        onPromptUpdated?.('Prompt updated with knowledge base');
      } else {
        showNotification?.('error', 'Erro ao atualizar prompt');
      }
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
      showNotification?.('error', 'Erro ao atualizar prompt');
    }
  };

  // NOVA FUNÇÃO: Testar merge com webhook_result
  const handleMergeWebhookResult = async () => {
    try {
      const success = await mergeWebhookResultWithPrompt(aiConfigurationId);
      if (success) {
        showNotification?.('success', 'Merge com webhook_result realizado com sucesso!');
        onPromptUpdated?.('Prompt atualizado com webhook_result');
      } else {
        showNotification?.('error', 'Erro ao fazer merge com webhook_result');
      }
    } catch (error) {
      console.error('Erro ao fazer merge:', error);
      showNotification?.('error', 'Erro ao fazer merge com webhook_result');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
                             <h2 className="text-xl font-bold text-gray-900">
                 Knowledge Base
               </h2>
               <p className="text-sm text-gray-600 mt-1">
                 Manage the documents that feed your agent's intelligence
               </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                                 <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                 Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{documents.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="ml-3">
                                     <p className="text-sm font-medium text-green-900">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{getCompletedDocumentsCount()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div className="ml-3">
                                     <p className="text-sm font-medium text-yellow-900">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{getPendingDocumentsCount()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div className="ml-3">
                                     <p className="text-sm font-medium text-red-900">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{transcriptionStatus.error}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div className="ml-3">
                                     <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleUpdatePrompt}
              disabled={loading || getCompletedDocumentsCount() === 0}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 mr-2" />
                             Update Prompt
            </button>

            {/* NOVO BOTÃO: Testar merge com webhook_result */}
            <button
              onClick={handleMergeWebhookResult}
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Merge Webhook Result
            </button>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto-update"
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-update" className="ml-2 text-sm text-gray-700">
                                 Auto update
              </label>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
                         <h3 className="text-lg font-medium text-gray-900">Documents</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
                                 <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                                 <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                 <p className="mt-1 text-sm text-gray-500">
                   Upload documents to start building the knowledge base.
                 </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.document_name}</p>
                        <p className="text-xs text-gray-500">
                          Status: {getDocumentStatus(doc.id)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getDocumentStatus(doc.id) === 'completed' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                                                     Completed
                        </span>
                      )}
                      
                      {getDocumentStatus(doc.id) === 'processing' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                                                     Processing
                        </span>
                      )}
                      
                      {getDocumentStatus(doc.id) === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <Clock className="w-3 h-3 mr-1" />
                                                     Pending
                        </span>
                      )}
                      
                      {getDocumentStatus(doc.id) === 'error' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                                                     Error
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last Update Info */}
          {lastUpdate && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                                 Last update: {lastUpdate.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 