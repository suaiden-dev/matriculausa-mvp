import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import EmailKnowledgeUpload, { EmailKnowledgeDocument, EmailKnowledgeUploadRef } from '../../components/EmailKnowledgeUpload';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, Trash2, RefreshCw } from 'lucide-react';

interface EmailKnowledgeManagementProps {
  universityId: string;
}

const EmailKnowledgeManagement: React.FC<EmailKnowledgeManagementProps> = ({ universityId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<EmailKnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<EmailKnowledgeUploadRef>(null);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_knowledge_documents')
        .select('*')
        .eq('university_id', universityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle document upload
  const handleUpload = async () => {
    if (!uploadRef.current) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const uploadedDocs = await uploadRef.current.uploadPendingFiles(universityId);
      if (uploadedDocs.length > 0) {
        setDocuments(prev => [...uploadedDocs, ...prev]);
        // Update prompt with new knowledge
        await updateEmailPrompt();
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Update email prompt with knowledge
  const updateEmailPrompt = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-email-prompt-with-knowledge`, {
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
      console.log('✅ Email prompt updated:', result);
    } catch (error) {
      console.error('❌ Error updating email prompt:', error);
    }
  };

  // Delete document
  const deleteDocument = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    
    try {
      const { error } = await supabase
        .from('email_knowledge_documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      await updateEmailPrompt();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message);
    }
  };

  // Refresh documents
  const refreshDocuments = async () => {
    await fetchDocuments();
  };

  useEffect(() => {
    fetchDocuments();
  }, [universityId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Transcrito';
      case 'processing':
        return 'Processando';
      case 'error':
        return 'Erro';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
        <span className="text-gray-600">Carregando documentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Base de Conhecimento para Emails</h2>
          <p className="text-gray-600 mt-1">
            Gerencie documentos que serão usados pela IA para responder emails
          </p>
        </div>
        <button
          onClick={refreshDocuments}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Upload Component */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Adicionar Documentos</h3>
        <EmailKnowledgeUpload
          ref={uploadRef}
          universityId={universityId}
          onDocumentsChange={setDocuments}
          existingDocuments={documents}
        />
        
        {/* Upload Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Enviar Documentos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Documentos ({documents.length})
          </h3>
        </div>
        
        {documents.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum documento encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              Adicione documentos para enriquecer a base de conhecimento da IA
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div key={doc.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(doc.transcription_status)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{doc.document_name}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500 mr-2">
                          {formatFileSize(doc.file_size)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(doc.transcription_status)}`}>
                          {getStatusText(doc.transcription_status)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {doc.transcription_status === 'completed' && (
                      <button
                        onClick={() => updateEmailPrompt()}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Atualizar IA
                      </button>
                    )}
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Transcription Preview */}
                {doc.transcription && doc.transcription_status === 'completed' && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">Prévia da transcrição:</p>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {doc.transcription.substring(0, 200)}...
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Como funciona:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Faça upload de documentos (PDF, DOC, DOCX, TXT) com informações da universidade</li>
          <li>• Os documentos serão automaticamente transcritos e integrados à IA</li>
          <li>• A IA usará essas informações para responder emails de forma mais precisa</li>
          <li>• Documentos são processados em segundo plano - aguarde a transcrição</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailKnowledgeManagement;
