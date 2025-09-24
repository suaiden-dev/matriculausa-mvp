import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Upload, FileText, X, CheckCircle, AlertCircle, Clock, Trash2 } from 'lucide-react';

export interface UniversityKnowledgeDocument {
  id: string;
  university_id: string;
  document_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  transcription_status: 'pending' | 'processing' | 'completed' | 'error';
  transcription_text?: string;
  webhook_result?: any;
  uploaded_by_user_id: string;
  created_at: string;
  updated_at: string;
}

interface UniversityKnowledgeUploadProps {
  universityId: string;
  onDocumentsChange?: (documents: UniversityKnowledgeDocument[]) => void;
  onPendingFilesChange?: (files: File[]) => void;
  existingDocuments?: UniversityKnowledgeDocument[];
  isCreating?: boolean;
}

export interface UniversityKnowledgeUploadRef {
  uploadPendingFiles: (universityId: string) => Promise<UniversityKnowledgeDocument[]>;
}

const UniversityKnowledgeUpload = forwardRef<UniversityKnowledgeUploadRef, UniversityKnowledgeUploadProps>(({
  universityId,
  onDocumentsChange,
  onPendingFilesChange,
  existingDocuments = [],
  isCreating = false
}, ref) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UniversityKnowledgeDocument[]>(existingDocuments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useImperativeHandle(ref, () => ({
    uploadPendingFiles: async (universityId: string) => {
      if (pendingFiles.length === 0) return [];
      
      setUploading(true);
      setError(null);
      
      try {
        const uploadedDocs: UniversityKnowledgeDocument[] = [];
        
        for (const file of pendingFiles) {
          console.log('🔄 Uploading file:', file.name);
          
          // Upload to storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `university-knowledge/${universityId}/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('university-knowledge')
            .upload(filePath, file);
          
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('university-knowledge')
            .getPublicUrl(filePath);
          
          // Insert into database
          const { data: docData, error: insertError } = await supabase
            .from('university_knowledge_documents')
            .insert({
              university_id: universityId,
              document_name: file.name,
              file_url: publicUrl,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by_user_id: user?.id
            })
            .select()
            .single();
          
          if (insertError) throw insertError;
          
          console.log('✅ Documento salvo no banco com ID:', docData.id);
          uploadedDocs.push(docData);
          
          // Send webhook for transcription
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            
            const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
            
            console.log('🔄 Enviando webhook para transcrição:', docData.id);
            
            const webhookResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/transcribe-university-document`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                document_id: docData.id,
                document_name: file.name,
                file_url: publicUrl,
                mime_type: file.type
              }),
            });
            
            const webhookResult = await webhookResponse.json();
            console.log('✅ Webhook enviado para transcrição:', webhookResult);
          } catch (webhookError) {
            console.error('❌ Erro ao enviar webhook para transcrição:', webhookError);
            // Não falhar o processo se o webhook falhar
          }
        }
        
        const newDocuments = [...documents, ...uploadedDocs];
        setDocuments(newDocuments);
        onDocumentsChange?.(newDocuments);
        setPendingFiles([]);
        onPendingFilesChange?.([]);
        
        console.log('✅ Todos os documentos enviados com sucesso');
        return uploadedDocs;
      } catch (err: any) {
        console.error('❌ Upload error:', err);
        setError(err.message || 'Failed to upload documents');
        return [];
      } finally {
        setUploading(false);
      }
    }
  }));

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
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

    if (isCreating) {
      // Se está criando, apenas adiciona aos arquivos pendentes
      setPendingFiles(prev => [...prev, ...acceptedFiles]);
      onPendingFilesChange?.([...pendingFiles, ...acceptedFiles]);
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
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/upload-university-knowledge`, {
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
  }, [user, universityId, documents, onDocumentsChange, isCreating, pendingFiles, onPendingFilesChange]);

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('university_knowledge_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      onDocumentsChange?.(documents.filter(doc => doc.id !== documentId));
      
      console.log('✅ Document deleted successfully');
    } catch (err: any) {
      console.error('❌ Delete error:', err);
      setError(err.message || 'Failed to delete document');
    }
  };

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: true
  });

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={uploading} />
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? 'Solte os arquivos aqui...'
            : 'Arraste arquivos aqui ou clique para selecionar'
          }
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF, DOC, DOCX, TXT, CSV, XLS, XLSX (máx. 10MB por arquivo)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Uploading Status */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex">
            <Clock className="w-4 h-4 text-blue-400 mt-0.5 mr-2" />
            <p className="text-sm text-blue-600">Enviando documentos...</p>
          </div>
        </div>
      )}

      {/* Pending Files (when creating) */}
      {isCreating && pendingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Arquivos pendentes:</h4>
          {pendingFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">{file.name}</span>
              </div>
              <button
                onClick={() => {
                  const newPendingFiles = pendingFiles.filter((_, i) => i !== index);
                  setPendingFiles(newPendingFiles);
                  onPendingFilesChange?.(newPendingFiles);
                }}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Documentos da base de conhecimento:</h4>
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.document_name}</p>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(doc.transcription_status)}
                    <span className="text-xs text-gray-500">{getStatusText(doc.transcription_status)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteDocument(doc.id)}
                className="text-red-400 hover:text-red-600 p-1"
                title="Deletar documento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

UniversityKnowledgeUpload.displayName = 'UniversityKnowledgeUpload';

export default UniversityKnowledgeUpload;
