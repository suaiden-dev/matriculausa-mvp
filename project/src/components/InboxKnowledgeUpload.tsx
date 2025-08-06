import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Trash2, AlertCircle, BookOpen, Sparkles, Edit, RotateCcw, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface KnowledgeDocument {
  id: string;
  university_id: string;
  document_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  transcription_status: string;
  transcription?: string;
  uploaded_by_user_id: string;
  created_at: string;
  updated_at: string;
}

interface InboxKnowledgeUploadProps {
  universityId: string;
  onDocumentsChange?: (documents: KnowledgeDocument[]) => void;
  existingDocuments?: KnowledgeDocument[];
}

const InboxKnowledgeUpload: React.FC<InboxKnowledgeUploadProps> = ({
  universityId,
  onDocumentsChange,
  existingDocuments = []
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(existingDocuments);
  const [loading, setLoading] = useState(false);
  
  // Estados para prompts de email
  const [isEditingEmailPrompt, setIsEditingEmailPrompt] = useState(false);
  const [originalEmailPrompt, setOriginalEmailPrompt] = useState('');
  const [editingEmailPrompt, setEditingEmailPrompt] = useState('');
  const [emailPrompt, setEmailPrompt] = useState('');
  const [emailPromptLoading, setEmailPromptLoading] = useState(false);

  // Buscar documentos existentes ao montar o componente
  useEffect(() => {
    fetchDocuments();
    fetchEmailPrompt();
  }, [universityId]);

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: docs, error } = await supabase
        .from('inbox_knowledge_documents')
        .select('*')
        .eq('university_id', universityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      setDocuments(docs || []);
      onDocumentsChange?.(docs || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailPrompt = async () => {
    if (!user || !universityId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: promptData, error } = await supabase
        .from('inbox_email_prompts')
        .select('*')
        .eq('university_id', universityId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching email prompt:', error);
        return;
      }

      if (promptData) {
        setEmailPrompt(promptData.prompt || '');
        setOriginalEmailPrompt(promptData.prompt || '');
      }
    } catch (error) {
      console.error('Error fetching email prompt:', error);
    }
  };

  const saveEmailPrompt = async (prompt: string) => {
    if (!user || !universityId) return;

    setEmailPromptLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { error } = await supabase
        .from('inbox_email_prompts')
        .upsert({
          university_id: universityId,
          prompt: prompt,
          updated_by_user_id: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'university_id'
        });

      if (error) {
        throw error;
      }

      setEmailPrompt(prompt);
      setOriginalEmailPrompt(prompt);
      return true;
    } catch (error) {
      console.error('Error saving email prompt:', error);
      return false;
    } finally {
      setEmailPromptLoading(false);
    }
  };

  const handleStartEditingEmailPrompt = () => {
    setOriginalEmailPrompt(emailPrompt);
    setEditingEmailPrompt(emailPrompt);
    setIsEditingEmailPrompt(true);
  };

  const handleCancelEditingEmailPrompt = () => {
    setIsEditingEmailPrompt(false);
    setEditingEmailPrompt('');
    setOriginalEmailPrompt('');
  };

  const handleConfirmEditingEmailPrompt = async () => {
    try {
      const success = await saveEmailPrompt(editingEmailPrompt);
      
      if (success) {
        // Mostrar notificação de sucesso (você pode implementar um sistema de notificação)
        console.log('Email prompt updated successfully!');
      } else {
        throw new Error('Failed to update email prompt');
      }

      setIsEditingEmailPrompt(false);
      setEditingEmailPrompt('');
      setOriginalEmailPrompt('');
    } catch (error) {
      console.error('Error updating email prompt:', error);
    }
  };

  const handleResetEmailPrompt = async () => {
    try {
      const success = await saveEmailPrompt('');
      
      if (success) {
        console.log('Email prompt reset successfully!');
      } else {
        throw new Error('Failed to reset email prompt');
      }
    } catch (error) {
      console.error('Error resetting email prompt:', error);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover o prefixo "data:application/pdf;base64," e pegar apenas o base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';

      for (const file of acceptedFiles) {
        console.log('🔄 Uploading file:', file.name);

        // Converter arquivo para base64
        const fileContent = await fileToBase64(file);

        // Upload via Edge Function
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/upload-inbox-knowledge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            university_id: universityId,
            document_name: file.name,
            file_content: fileContent,
            mime_type: file.type
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        console.log('✅ File uploaded successfully:', result.document);
        
        // Adicionar documento à lista
        setDocuments(prev => [result.document, ...prev]);
        onDocumentsChange?.([result.document, ...documents]);
      }

      console.log('✅ All files uploaded successfully');
    } catch (err: any) {
      console.error('❌ Upload error:', err);
      setError(err.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  }, [user, universityId, documents, onDocumentsChange]);

  const handleDeleteDocument = async (documentId: string) => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Deletar do banco de dados
      const { error: dbError } = await supabase
        .from('inbox_knowledge_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      // Remover da lista local
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      onDocumentsChange?.(documents.filter(doc => doc.id !== documentId));

      console.log('✅ Document deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    disabled: uploading
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                 <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Knowledge Base</h3>
      </div>

      {/* Email Processing Prompts */}
      <div className="bg-white p-6 rounded-xl border-2 border-[#05294E]/20 shadow-lg shadow-[#05294E]/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#05294E] rounded-full"></div>
            <label className="text-sm font-semibold text-gray-800">
              Email Processing Prompts (Optional)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartEditingEmailPrompt}
              disabled={isEditingEmailPrompt}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-[#05294E]/10 text-[#05294E] rounded-lg hover:bg-[#05294E]/20 transition-colors disabled:opacity-50"
              title="Edit email processing prompts"
              aria-label="Edit email processing prompts"
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleResetEmailPrompt}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              title="Reset email processing prompts"
              aria-label="Reset email processing prompts"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {isEditingEmailPrompt ? (
            <div className="space-y-3">
              <textarea
                value={editingEmailPrompt}
                onChange={(e) => setEditingEmailPrompt(e.target.value)}
                placeholder="e.g. When processing emails, always identify the student's main concern and provide specific guidance. Be proactive in offering solutions..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors resize-none"
                rows={8}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmEditingEmailPrompt}
                  disabled={emailPromptLoading}
                  className="px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#05294E]/90 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {emailPromptLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditingEmailPrompt}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <textarea
              value={emailPrompt}
              onChange={(e) => setEmailPrompt(e.target.value)}
              placeholder="e.g. When processing emails, always identify the student's main concern and provide specific guidance. Be proactive in offering solutions..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors resize-none"
              rows={8}
            />
          )}
          <p className="text-xs text-gray-500">
            Add specific instructions for how emails should be processed and analyzed. These prompts will guide the AI in understanding and responding to email content.
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input {...getInputProps()} />
        <Upload className={`mx-auto h-12 w-12 ${uploading ? 'text-gray-400' : 'text-gray-400'}`} />
        <p className="mt-2 text-sm text-gray-600">
          {uploading 
            ? 'Uploading files...' 
            : isDragActive 
              ? 'Drop files here...' 
              : 'Drag documents or click to select'
          }
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Accepted formats: PDF, DOC, DOCX, TXT
        </p>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Documents</h4>
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.document_name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteDocument(doc.id)}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Delete document"
                aria-label="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxKnowledgeUpload; 