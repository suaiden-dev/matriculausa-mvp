import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface KnowledgeDocument {
  id: string;
  document_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface AIAgentKnowledgeUploadProps {
  aiConfigurationId: string; // backward compat: foreign id value
  onDocumentsChange: (documents: KnowledgeDocument[]) => void;
  onPendingFilesChange?: (files: File[]) => void;
  existingDocuments?: KnowledgeDocument[];
  isCreating?: boolean;
  // Optional overrides to support other targets (e.g., email agents)
  foreignTable?: string; // default: 'ai_agent_knowledge_documents'
  foreignKey?: string;   // default: 'ai_configuration_id'
}

const AIAgentKnowledgeUpload = forwardRef<{ uploadPendingFiles: (aiConfigId: string) => Promise<KnowledgeDocument[]> }, AIAgentKnowledgeUploadProps>(({ 
  aiConfigurationId,
  onDocumentsChange,
  onPendingFilesChange,
  existingDocuments = [],
  isCreating = false,
  foreignTable = 'ai_agent_knowledge_documents',
  foreignKey = 'ai_configuration_id'
}, ref) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(existingDocuments);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const uploadPendingFiles = async (aiConfigId: string): Promise<KnowledgeDocument[]> => {
    console.log('🔍 DEBUG: uploadPendingFiles called with aiConfigId:', aiConfigId);
    console.log('🔍 DEBUG: pendingFiles.length:', pendingFiles.length);
    console.log('🔍 DEBUG: pendingFiles:', pendingFiles);
    
    if (pendingFiles.length === 0) {
      console.log('⚠️ DEBUG: No pending files to upload');
      return [];
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const uploadedDocs: KnowledgeDocument[] = [];
      
      // Processar cada arquivo individualmente
      for (const file of pendingFiles) {
        console.log('🔄 Processando documento pendente individual:', file.name);
        
        // Sanitize filename
        const sanitizedFileName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        const userFolderName = generateUserFolderName(user!.email || 'unknown');
        const filePath = `${userFolderName}/${aiConfigId}/${sanitizedFileName}`;
        
        // Upload to storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('ai-agent-knowledge')
          .upload(filePath, file, { 
            upsert: true,
            cacheControl: '3600'
          });

        if (storageError) {
          console.error('Storage error details:', {
            message: storageError.message
          });
          throw storageError;
        }

        if (!storageData?.path) {
          throw new Error('Failed to upload file to storage');
        }

        const fileUrl = supabase.storage.from('ai-agent-knowledge').getPublicUrl(storageData.path).data.publicUrl;

        // Insert into database
        const { data: docData, error: insertError } = await supabase
          .from(foreignTable)
          .insert({
            [foreignKey]: aiConfigId,
            document_name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by_user_id: user!.id
          })
          .select()
          .single();

        if (insertError) throw insertError;

        console.log('✅ Documento pendente salvo no banco com ID:', docData.id);
        uploadedDocs.push(docData);

        // Atualizar prompt (apenas para agentes padrão)
        if (foreignTable === 'ai_agent_knowledge_documents') {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
            const updateResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-prompt-with-knowledge`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                ai_configuration_id: aiConfigId
              }),
            });
            const updateResult = await updateResponse.json();
            console.log('✅ Prompt atualizado para documento pendente:', docData.id, updateResult);
          } catch (updateError) {
            console.error('❌ Erro ao atualizar prompt para documento pendente:', docData.id, updateError);
          }
        }
      }

      // Clear pending files after successful upload
      console.log('✅ DEBUG: Clearing pending files after successful upload');
      setPendingFiles([]);
      onPendingFilesChange?.([]);
      
      console.log('✅ Todos os documentos pendentes processados individualmente:', uploadedDocs.length);
      console.log('✅ DEBUG: uploadPendingFiles completed successfully, returning:', uploadedDocs);
      return uploadedDocs;
    } catch (err: any) {
      console.error('Error uploading pending files:', err);
      setError(err.message || 'Failed to upload documents');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Processa múltiplos documentos individualmente com IDs únicos
   */
  const processMultipleDocuments = async (files: File[]): Promise<KnowledgeDocument[]> => {
    const processedDocs: KnowledgeDocument[] = [];
    
    console.log('🔄 Iniciando processamento de múltiplos documentos:', files.length);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`🔄 Processando documento ${i + 1}/${files.length}:`, file.name);
      
      try {
        // Sanitize filename
        const sanitizedFileName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        const userFolderName = generateUserFolderName(user!.email || 'unknown');
        const filePath = `${userFolderName}/${aiConfigurationId}/${sanitizedFileName}`;
        
        // Upload to storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('ai-agent-knowledge')
          .upload(filePath, file, { 
            upsert: true,
            cacheControl: '3600'
          });

        if (storageError) {
          console.error('Storage error for file:', file.name, storageError);
          continue; // Pular este arquivo e continuar com o próximo
        }

        if (!storageData?.path) {
          console.error('Failed to upload file:', file.name);
          continue;
        }

        const fileUrl = supabase.storage.from('ai-agent-knowledge').getPublicUrl(storageData.path).data.publicUrl;

        // Insert into database
        const { data: docData, error: insertError } = await supabase
          .from('ai_agent_knowledge_documents')
          .insert({
            ai_configuration_id: aiConfigurationId,
            document_name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by_user_id: user!.id
          })
          .select()
          .single();

        if (insertError) {
          console.error('Database error for file:', file.name, insertError);
          continue;
        }

        console.log('✅ Documento processado com ID único:', docData.id);
        processedDocs.push(docData);

        // Atualizar prompt individualmente para este documento
        await updatePromptForDocument(docData.id);
        
      } catch (error) {
        console.error('❌ Erro ao processar documento:', file.name, error);
        // Continuar com o próximo documento
      }
    }
    
    console.log('✅ Processamento concluído. Documentos processados:', processedDocs.length);
    return processedDocs;
  };

  /**
   * Atualiza o prompt para um documento específico
   */
  const updatePromptForDocument = async (documentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      
      console.log('🔄 Atualizando prompt para documento específico:', documentId);
      
      const updateResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-prompt-with-knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ai_configuration_id: aiConfigurationId
        }),
      });
      
      const updateResult = await updateResponse.json();
      console.log('✅ Prompt atualizado para documento:', documentId, updateResult);
    } catch (updateError) {
      console.error('❌ Erro ao atualizar prompt para documento:', documentId, updateError);
    }
  };

  useImperativeHandle(ref, () => ({
    uploadPendingFiles
  }));

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('🔍 DEBUG: onDrop called with files:', acceptedFiles);
    
    if (!user) {
      setError('User not authenticated');
      return;
    }

    console.log('🔍 DEBUG: User authenticated:', user.id);
    console.log('🔍 DEBUG: isCreating:', isCreating);
    console.log('🔍 DEBUG: aiConfigurationId:', aiConfigurationId);
    console.log('🔍 DEBUG: current pendingFiles:', pendingFiles);

    // Se estamos criando um novo AI agent, armazenar arquivos temporariamente
    if (isCreating) {
      const newPendingFiles = [...pendingFiles, ...acceptedFiles];
      console.log('✅ DEBUG: Adding files to pendingFiles:', newPendingFiles);
      setPendingFiles(newPendingFiles);
      onPendingFilesChange?.(newPendingFiles);
      console.log('✅ DEBUG: onPendingFilesChange called with:', newPendingFiles);
      return;
    }

    // Se não temos aiConfigurationId, não podemos salvar
    if (!aiConfigurationId) {
      setError('Please create the AI agent first before uploading documents.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadedDocs: KnowledgeDocument[] = [];

      // Processar cada arquivo individualmente
      for (const file of acceptedFiles) {
        console.log('🔄 Processando documento individual:', file.name);
        
        // Sanitize filename
        const sanitizedFileName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        const userFolderName = generateUserFolderName(user.email || 'unknown');
        const filePath = `${userFolderName}/${aiConfigurationId}/${sanitizedFileName}`;
        
        // Upload to storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('ai-agent-knowledge')
          .upload(filePath, file, { 
            upsert: true,
            cacheControl: '3600'
          });

        if (storageError) {
          console.error('Storage error details:', {
            message: storageError.message
          });
          throw storageError;
        }

        if (!storageData?.path) {
          throw new Error('Failed to upload file to storage');
        }

        // Construir URL manualmente para evitar problemas
        const fileUrl = supabase.storage.from('ai-agent-knowledge').getPublicUrl(storageData.path).data.publicUrl;

        console.log('Generated file URL:', fileUrl);

        // Testar se o arquivo está acessível
        try {
          const response = await fetch(fileUrl, { method: 'HEAD' });
          console.log('File accessibility test:', response.status, response.ok);
          if (!response.ok) {
            throw new Error(`File not accessible: ${response.status}`);
          }
        } catch (error) {
          console.error('File accessibility error:', error);
          throw new Error('Uploaded file is not accessible');
        }

        // Insert into database
        const { data: docData, error: insertError } = await supabase
          .from(foreignTable)
          .insert({
            [foreignKey]: aiConfigurationId,
            document_name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by_user_id: user.id
          })
          .select()
          .single();

        if (insertError) throw insertError;

        console.log('✅ Documento salvo no banco com ID:', docData.id);
        uploadedDocs.push(docData);

        // Atualizar prompt apenas para agentes padrão
        if (foreignTable === 'ai_agent_knowledge_documents') {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
            const updateResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-prompt-with-knowledge`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                ai_configuration_id: aiConfigurationId
              }),
            });
            const updateResult = await updateResponse.json();
            console.log('✅ Prompt atualizado para documento:', docData.id, updateResult);
          } catch (updateError) {
            console.error('❌ Erro ao atualizar prompt para documento:', docData.id, updateError);
          }
        }
    }

      const newDocuments = [...documents, ...uploadedDocs];
      setDocuments(newDocuments);
      onDocumentsChange(newDocuments);

      console.log('✅ Todos os documentos processados individualmente:', uploadedDocs.length);
    } catch (err: any) {
      console.error('Error uploading documents:', err);
      setError(err.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  }, [user, aiConfigurationId, documents, onDocumentsChange, isCreating, pendingFiles, onPendingFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    multiple: true,
    disabled: uploading
  });

  const handleDeletePendingFile = (index: number) => {
    const newPendingFiles = pendingFiles.filter((_, i) => i !== index);
    setPendingFiles(newPendingFiles);
    onPendingFilesChange?.(newPendingFiles);
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Se é um documento temporário, apenas remover da lista
      if (documentId.startsWith('temp_')) {
        const newDocuments = documents.filter(doc => doc.id !== documentId);
        setDocuments(newDocuments);
        onDocumentsChange(newDocuments);
        return;
      }

      // Se é um documento real, deletar do banco
      const { error } = await supabase
        .from(foreignTable)
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      // Remover documento da base de conhecimento
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
        
        if (foreignTable === 'ai_agent_knowledge_documents') {
          await fetch(`${SUPABASE_FUNCTIONS_URL}/remove-document-from-knowledge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              ai_configuration_id: aiConfigurationId,
              document_id: documentId
            }),
          });
        }
        
        console.log('✅ Documento removido da base de conhecimento');
      } catch (removeError) {
        console.error('Erro ao remover documento da base de conhecimento:', removeError);
        // Não falhar o processo se a remoção da base de conhecimento falhar
      }

      const newDocuments = documents.filter(doc => doc.id !== documentId);
      setDocuments(newDocuments);
      onDocumentsChange(newDocuments);
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função para gerar nome de pasta legível baseado no email do usuário
  const generateUserFolderName = (userEmail: string) => {
    // Remove caracteres especiais e espaços, mantém apenas letras, números e pontos
    const sanitizedEmail = userEmail
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return sanitizedEmail;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : isCreating
            ? 'border-blue-200 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        {uploading ? (
          <div className="text-slate-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Uploading documents...
          </div>
        ) : isDragActive ? (
          <p className="text-blue-600 font-medium">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-slate-600 font-medium mb-1">Upload Knowledge Base Documents</p>
            <p className="text-slate-500 text-sm">
              {isCreating 
                ? "Select documents now - they will be uploaded when you create the AI agent"
                : "Drag & drop files here, or click to select files"
              }
            </p>
            <p className="text-slate-400 text-xs mt-2">
              Supported: PDF, DOC, DOCX, TXT, XLS, XLSX, CSV
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
            title="Close error message"
            aria-label="Close error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900">Pending Documents</h4>
          <div className="space-y-2">
            {pendingFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <File className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {formatFileSize(file.size)} • Pending upload
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePendingFile(index)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove pending file"
                  aria-label="Remove pending file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900">Uploaded Documents</h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <File className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{doc.document_name}</p>
                    <p className="text-sm text-slate-500">
                      {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete document"
                  aria-label="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Knowledge Base Documents</h4>
            <p className="text-blue-700 text-sm">
              Upload documents that will be used as knowledge base for your AI agent. 
              These documents will help the AI provide more accurate and contextual responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AIAgentKnowledgeUpload; 