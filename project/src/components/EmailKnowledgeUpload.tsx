import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

// Função para gerar o final_prompt baseado na transcrição
const generateFinalPrompt = (webhookResult: any): string => {
  if (!webhookResult || !webhookResult.description) {
    return '';
  }
  
  // Extrair informações da transcrição
  const title = webhookResult.title || '';
  const courses = webhookResult.courses || [];
  
  // Gerar prompt baseado na transcrição
  const knowledgeBase = courses.map((course: string, index: number) => 
    `## ${title || `Documento ${index + 1}`}\n\n${course}`
  ).join('\n\n---\n\n');
  
  return `You are a helpful email assistant for university admissions. Use the knowledge base to answer questions about admissions, scholarships, and university processes.

<knowledge-base>
${knowledgeBase}
</knowledge-base>

IMPORTANT: Use the information from the knowledge base above to answer student questions. If the information is not in the knowledge base, respond generally and suggest that the student contact the university directly for specific information.`;
};

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

  const uploadPendingFiles = async (universityId: string) => {
    if (pendingFiles.length === 0) return [];
    
    setUploading(true);
    setError(null);
    
    try {
      const uploadedDocs: EmailKnowledgeDocument[] = [];
      
      for (const file of pendingFiles) {
        // Uploading file
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${universityId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('email-knowledge-documents')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('email-knowledge-documents')
          .getPublicUrl(filePath);
        
        if (!publicUrl) {
          throw new Error('Uploaded file is not accessible');
        }
        
        // Insert into database
        let docData: EmailKnowledgeDocument;
        let insertError: any;
        
        // Determinar se é agente Microsoft ou Gmail
        const hasValidAgentId = agentId && agentId !== null && agentId.trim() !== '' && agentId !== 'null' && agentId !== 'undefined';
        const isMicrosoftAgent = hasValidAgentId;
        
        if (isCreating) {
          // Durante a criação, salvar documento na tabela email_knowledge_documents
          // com agent_id temporário que será atualizado após criação do agente
          console.log('📝 [EmailKnowledgeUpload] Salvando documento durante criação do agente');
          
          const result = await supabase
            .from('email_knowledge_documents')
            .insert({
              university_id: universityId,
              agent_id: null, // Será atualizado após criação do agente
              document_name: file.name,
              file_url: publicUrl,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by_user_id: user?.id,
              transcription_status: 'pending'
            })
            .select()
            .single();
          docData = result.data;
          insertError = result.error;
        } else if (isMicrosoftAgent) {
          // Sistema Microsoft: usar email_knowledge_documents (CORRETO)
          const result = await supabase
            .from('email_knowledge_documents')
            .insert({
              university_id: universityId,
              agent_id: agentId, // Microsoft tem agent_id específico
              document_name: file.name,
              file_url: publicUrl,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by_user_id: user?.id
            })
            .select()
            .single();
          docData = result.data;
          insertError = result.error;
        } else {
          // Sistema Gmail: usar ai_agent_knowledge_documents (CORRETO)
          if (!hasValidAgentId) {
            throw new Error('ID do agente inválido. Não é possível fazer upload de documentos.');
          }
          
          const result = await supabase
            .from('ai_agent_knowledge_documents')
            .insert({
              ai_configuration_id: agentId,
              document_name: file.name,
              file_url: publicUrl,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by_user_id: user?.id
            })
            .select()
            .single();
          docData = result.data;
          insertError = result.error;
        }
        
        if (insertError) {
          console.error('Erro ao inserir documento:', insertError);
          throw insertError;
        }
        uploadedDocs.push(docData);
        
        // Send webhook for transcription directly to n8n
        try {
          console.log('🔄 [EmailKnowledgeUpload] Enviando webhook para transcrição:', {
            document_id: docData.id,
            document_name: file.name,
            file_url: publicUrl,
            mime_type: file.type,
            agent_id: agentId
          });
          
          const webhookPayload = {
            user_id: 'system', // System user for email agents
            agent_id: agentId || 'default', // Use 'default' if agent_id is null
            document_id: docData.id, // ID do documento salvo no banco
            file_name: file.name,
            file_type: file.type,
            file_url: publicUrl
          };
          
          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/docs-matriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
          });
          
          if (!webhookResponse.ok) {
            console.error('❌ [EmailKnowledgeUpload] Webhook failed:', webhookResponse.status, webhookResponse.statusText);
          } else {
            const webhookResult = await webhookResponse.json();
            console.log('✅ [EmailKnowledgeUpload] Webhook enviado para transcrição:', webhookResult);
            
            // Processar resposta do n8n e salvar na tabela correta
            if (webhookResult) {
              try {
                console.log('🔄 [EmailKnowledgeUpload] Processando resposta do n8n:', webhookResult);
                
                // Determinar se é agente Microsoft ou Gmail
                // Para agentes Microsoft, sempre usar email_knowledge_documents
                // Para agentes Gmail, usar ai_agent_knowledge_documents
                const isMicrosoftAgent = true; // Sempre Microsoft para este componente
                
                if (isMicrosoftAgent) {
                  // Sistema Microsoft: atualizar ai_configurations
                  console.log('🔄 [EmailKnowledgeUpload] Atualizando ai_configurations para agente Microsoft');
                  console.log('📊 [EmailKnowledgeUpload] Webhook_result recebido e processado');
                  
                  if (agentId) {
                    // Se temos agentId, atualizar diretamente
                    console.log('🔄 [EmailKnowledgeUpload] Salvando diretamente no ai_configurations');
                    
                    const finalPrompt = generateFinalPrompt(webhookResult);
                    
                    const { error: updateError } = await supabase
                      .from('ai_configurations')
                      .update({
                        webhook_status: 'processed',
                        webhook_result: webhookResult,
                        final_prompt: finalPrompt,
                        is_active: true
                      })
                      .eq('id', agentId);
                    
                    if (updateError) {
                      console.error('❌ [EmailKnowledgeUpload] ERRO ao atualizar ai_configurations:', updateError);
                      console.error('❌ [EmailKnowledgeUpload] ERRO details:', JSON.stringify(updateError, null, 2));
                    } else {
                      console.log('✅ [EmailKnowledgeUpload] ai_configurations atualizado com sucesso');
                      console.log('✅ [EmailKnowledgeUpload] WEBHOOK_RESULT SALVO DIRETAMENTE!');
                      
                      // Verificar se foi realmente salvo
                      const { data: verifyData, error: verifyError } = await supabase
                        .from('ai_configurations')
                        .select('webhook_result, final_prompt, webhook_status')
                        .eq('id', agentId)
                        .single();
                      
                      if (verifyError) {
                        console.error('❌ [EmailKnowledgeUpload] ERRO ao verificar salvamento:', verifyError);
                      } else {
                        console.log('✅ [EmailKnowledgeUpload] VERIFICAÇÃO PÓS-SALVAMENTO:');
                        console.log('✅ [EmailKnowledgeUpload] - webhook_status:', verifyData.webhook_status);
                        console.log('✅ [EmailKnowledgeUpload] - webhook_result exists:', !!verifyData.webhook_result);
                        console.log('✅ [EmailKnowledgeUpload] - webhook_result length:', JSON.stringify(verifyData.webhook_result || {}).length);
                        console.log('✅ [EmailKnowledgeUpload] - final_prompt exists:', !!verifyData.final_prompt);
                        console.log('✅ [EmailKnowledgeUpload] - final_prompt length:', verifyData.final_prompt?.length || 0);
                      }
                    }
                  } else {
                    // Se não temos agentId, salvar transcrição no documento para processar depois
                    console.log('🔄 [EmailKnowledgeUpload] Salvando transcrição no documento (agentId não disponível)');
                    console.log('📊 [EmailKnowledgeUpload] Salvando transcrição no documento');
                    
                    const { error: updateDocError } = await supabase
                      .from('email_knowledge_documents')
                      .update({
                        transcription: JSON.stringify(webhookResult),
                        transcription_status: 'completed',
                        transcription_processed_at: new Date().toISOString()
                      })
                      .eq('id', docData.id);
                    
                    if (updateDocError) {
                      console.error('❌ [EmailKnowledgeUpload] ERRO ao salvar transcrição no documento:', updateDocError);
                      console.error('❌ [EmailKnowledgeUpload] ERRO details:', JSON.stringify(updateDocError, null, 2));
                    } else {
                      console.log('✅ [EmailKnowledgeUpload] Transcrição salva no documento para processamento posterior');
                      console.log('✅ [EmailKnowledgeUpload] TRANSCRIÇÃO SALVA NO EMAIL_KNOWLEDGE_DOCUMENTS!');
                      
                      // Verificar se foi realmente salvo
                      const { error: verifyDocError } = await supabase
                        .from('email_knowledge_documents')
                        .select('transcription, transcription_status, transcription_processed_at')
                        .eq('id', docData.id)
                        .single();
                      
                      if (verifyDocError) {
                        console.error('❌ [EmailKnowledgeUpload] ERRO ao verificar salvamento no documento:', verifyDocError);
                      } else {
                        console.log('✅ [EmailKnowledgeUpload] Transcrição salva e verificada com sucesso');
                      }
                    }
                  }
                } else {
                  // Sistema Gmail: atualizar ai_agent_knowledge_documents
                  console.log('🔄 [EmailKnowledgeUpload] Atualizando ai_agent_knowledge_documents para agente Gmail');
                  
                  const { error: updateError } = await supabase
                    .from('ai_agent_knowledge_documents')
                    .update({
                      transcription: webhookResult.description || '',
                      transcription_status: 'completed',
                      transcription_processed_at: new Date().toISOString(),
                      webhook_result: webhookResult
                    })
                    .eq('ai_configuration_id', agentId);
                  
                  if (updateError) {
                    console.error('❌ [EmailKnowledgeUpload] Erro ao atualizar ai_agent_knowledge_documents:', updateError);
                  } else {
                    console.log('✅ [EmailKnowledgeUpload] ai_agent_knowledge_documents atualizado com sucesso');
                  }
                }
              } catch (error) {
                console.error('❌ [EmailKnowledgeUpload] Erro ao processar resposta do n8n:', error);
              }
            }
          }
        } catch (webhookError) {
          console.error('❌ [EmailKnowledgeUpload] Erro ao enviar webhook para transcrição:', webhookError);
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
  };

  useImperativeHandle(ref, () => ({
    uploadPendingFiles: uploadPendingFiles
  }));

  // Função para converter arquivo para base64 (removida - não utilizada)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Files dropped
    
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
          onClick={async () => {
            try {
              await uploadPendingFiles(universityId);
            } catch (error) {
              console.error('❌ Upload error:', error);
            }
          }}
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
