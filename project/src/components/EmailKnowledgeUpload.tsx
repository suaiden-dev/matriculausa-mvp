import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

export interface EmailKnowledgeDocument {
  id: string;
  document_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  transcription?: string;
  transcription_status: 'pending' | 'processing' | 'completed' | 'error';
  transcription_processed_at?: string;
  created_at: string;
  updated_at: string;
}

interface EmailKnowledgeUploadProps {
  universityId: string;
  agentId?: string;
  onDocumentsChange?: (documents: EmailKnowledgeDocument[]) => void;
  onPendingFilesChange?: (files: File[]) => void;
  existingDocuments?: EmailKnowledgeDocument[];
  isCreating?: boolean;
}

export interface EmailKnowledgeUploadRef {
  uploadPendingFiles: (universityId: string) => Promise<EmailKnowledgeDocument[]>;
}

const EmailKnowledgeUpload = forwardRef<EmailKnowledgeUploadRef, EmailKnowledgeUploadProps>(({
  universityId,
  agentId,
  onDocumentsChange,
  onPendingFilesChange,
  existingDocuments = [],
  isCreating = false
}, ref) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<EmailKnowledgeDocument[]>(existingDocuments);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    uploadPendingFiles: async (universityId: string) => {
      if (pendingFiles.length === 0) return [];
      
      setUploading(true);
      setError(null);
      
      try {
        const uploadedDocs: EmailKnowledgeDocument[] = [];
        
        for (const file of pendingFiles) {
          console.log(`📤 Uploading file: ${file.name}`);
          
          // Upload file to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${universityId}/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('email-knowledge-documents')
            .upload(filePath, file);
          
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('email-knowledge-documents')
            .getPublicUrl(filePath);
          
          if (!publicUrl) {
            throw new Error('Uploaded file is not accessible');
          }
          
          // Insert into database
          const { data: docData, error: insertError } = await supabase
            .from('email_knowledge_documents')
            .insert({
              university_id: universityId,
              agent_id: agentId || null, // Handle empty string or undefined
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
            
            const webhookResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/transcribe-email-document`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                document_id: docData.id,
                document_name: file.name,
                file_url: publicUrl,
                mime_type: file.type,
                agent_id: agentId || null // Handle empty string or undefined
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

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('📁 Files dropped:', acceptedFiles.map(f => f.name));
    
    // Validate file types
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const invalidFiles = acceptedFiles.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setError(`Tipos de arquivo não suportados: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    // Validate file sizes (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = acceptedFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setError(`Arquivos muito grandes (máximo 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    setError(null);
    setPendingFiles(prev => [...prev, ...acceptedFiles]);
    onPendingFilesChange?.(acceptedFiles);
  }, [onPendingFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  });

  const removePendingFile = (index: number) => {
    const newPendingFiles = pendingFiles.filter((_, i) => i !== index);
    setPendingFiles(newPendingFiles);
    onPendingFilesChange?.(newPendingFiles);
  };

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos aqui ou clique para selecionar'}
        </p>
        <p className="text-sm text-gray-500">
          Suporta PDF, DOC, DOCX, TXT (máximo 10MB cada)
        </p>
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

      {/* Pending Files */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-700">Arquivos Pendentes</h3>
          {pendingFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
              </div>
              <button
                onClick={() => removePendingFile(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Existing Documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-700">Documentos de Conhecimento</h3>
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center">
                {getStatusIcon(doc.transcription_status)}
                <span className="text-sm font-medium text-gray-700 ml-2">{doc.document_name}</span>
                <span className="text-xs text-gray-500 ml-2">({formatFileSize(doc.file_size)})</span>
                <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                  doc.transcription_status === 'completed' ? 'bg-green-100 text-green-800' :
                  doc.transcription_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  doc.transcription_status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {doc.transcription_status === 'completed' ? 'Transcrito' :
                   doc.transcription_status === 'processing' ? 'Processando' :
                   doc.transcription_status === 'error' ? 'Erro' : 'Pendente'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(doc.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {pendingFiles.length > 0 && !uploading && (
        <button
          onClick={() => ref?.current?.uploadPendingFiles(universityId)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Enviar {pendingFiles.length} arquivo(s)
        </button>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
          <span className="text-blue-600">Enviando arquivos...</span>
        </div>
      )}
    </div>
  );
});

EmailKnowledgeUpload.displayName = 'EmailKnowledgeUpload';

export default EmailKnowledgeUpload;
