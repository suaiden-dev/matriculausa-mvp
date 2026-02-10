import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { generateUUID } from '../utils/uuid';

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
  systemType?: 'gmail' | 'microsoft' | 'whatsapp'; // Tipo de sistema para diferenciar onde salvar webhook_result
}

export interface EmailKnowledgeUploadRef {
  uploadPendingFiles: (agentId: string) => Promise<EmailKnowledgeDocument[]>;
}

const EmailKnowledgeUpload = forwardRef<EmailKnowledgeUploadRef, EmailKnowledgeUploadProps>(
  function EmailKnowledgeUpload({
    universityId,
    agentId,
    onDocumentsChange,
    onPendingFilesChange,
    existingDocuments = [],
    isCreating = false,
    systemType
  }, ref) {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<EmailKnowledgeDocument[]>(existingDocuments);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ✅ SIMPLIFICADO: Determinar apenas qual tabela de agentes usar
    // Documentos são armazenados DENTRO do agente (knowledge_documents JSONB)
    const getAgentTable = () => {
      if (systemType === 'gmail') return 'ai_email_agents';
      if (systemType === 'microsoft' || universityId) return 'microsoft_ai_agents';
      return 'ai_configurations'; // WhatsApp
    };

    const uploadPendingFiles = async (uploadAgentId: string) => {
      console.log('🚀 [EmailKnowledgeUpload] uploadPendingFiles CALLED');
      console.log('🔍 [EmailKnowledgeUpload] uploadAgentId:', uploadAgentId);
      console.log('🔍 [EmailKnowledgeUpload] universityId (prop):', universityId);
      console.log('🔍 [EmailKnowledgeUpload] agentId (prop):', agentId);
      console.log('🔍 [EmailKnowledgeUpload] systemType:', systemType);
      console.log('🔍 [EmailKnowledgeUpload] Call stack:', new Error().stack);
      
      if (pendingFiles.length === 0) return [];
      
      setUploading(true);
      setError(null);
      
      const agentTable = getAgentTable();
      console.log('🔍 [EmailKnowledgeUpload] Using agent table:', agentTable);
      
      try {
        const uploadedDocs: EmailKnowledgeDocument[] = [];
        
        for (const file of pendingFiles) {
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
          
          // ✅ SIMPLIFICADO: Criar objeto de documento para adicionar ao array JSONB
          const docData: EmailKnowledgeDocument = {
            id: generateUUID(),
            document_name: file.name,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type,
            transcription_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('📄 [EmailKnowledgeUpload] Documento criado:', docData);
          
          // ✅ SIMPLIFICADO: Buscar documentos existentes do agente e adicionar o novo
          console.log('🔍 [EmailKnowledgeUpload] Buscando agente:', uploadAgentId, 'na tabela:', agentTable);
          
          const { data: agentData, error: fetchError } = await supabase
            .from(agentTable)
            .select('knowledge_documents')
            .eq('id', uploadAgentId)
            .maybeSingle();
          
          if (fetchError) {
            console.error('❌ Erro ao buscar agente:', fetchError);
            throw fetchError;
          }
          
          if (!agentData) {
            console.error('❌ Agente não encontrado:', uploadAgentId);
            throw new Error(`Agente ${uploadAgentId} não encontrado na tabela ${agentTable}`);
          }
          
          const existingDocs = (agentData?.knowledge_documents as EmailKnowledgeDocument[]) || [];
          const updatedDocs = [...existingDocs, docData];
          
          // Atualizar o array de documentos no agente
          const { error: updateError } = await supabase
            .from(agentTable)
            .update({
              knowledge_documents: updatedDocs
            })
            .eq('id', uploadAgentId);
          
          if (updateError) {
            console.error('❌ Erro ao atualizar documentos do agente:', updateError);
            throw updateError;
          }
          
          uploadedDocs.push(docData);
          console.log('✅ [EmailKnowledgeUpload] Documento salvo:', file.name);
          
          // ✅ SIMPLIFICADO: Não enviar webhook aqui - será enviado uma vez após todos os uploads
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

    // Função para enviar webhook para CADA documento não processado
    const sendAgentWebhook = async (agentId: string) => {
      try {
        console.log('🔄 [EmailKnowledgeUpload] Processando documentos para transcrição...');
        
        const agentTableName = getAgentTable();
        
        // Buscar documentos do agente
        const { data: agentData } = await supabase
          .from(agentTableName)
          .select('knowledge_documents, webhook_result')
          .eq('id', agentId)
          .maybeSingle();
        
        const docs = (agentData?.knowledge_documents as EmailKnowledgeDocument[]) || [];
        
        if (docs.length === 0) {
          console.log('⚠️ [EmailKnowledgeUpload] Sem documentos para processar');
          return;
        }
        
        // 📝 Filtrar apenas documentos com status 'pending' (não processados)
        const pendingDocs = docs.filter(doc => doc.transcription_status === 'pending');
        
        if (pendingDocs.length === 0) {
          console.log('✅ [EmailKnowledgeUpload] Todos os documentos já foram processados');
          return;
        }
        
        console.log(`📄 [EmailKnowledgeUpload] ${pendingDocs.length} documento(s) pendente(s) para processar`);
        
        // 🔄 Processar cada documento pendente
        const allWebhookResults: any[] = [];
        const updatedDocs = [...docs]; // Cópia para atualizar
        
        for (const doc of pendingDocs) {
          const docIndex = docs.findIndex(d => d.id === doc.id);
          
          const webhookPayload = {
            user_id: 'system',
            agent_id: agentId,
            document_id: doc.id,
            file_name: doc.document_name,
            file_type: doc.mime_type,
            file_url: doc.file_url
          };
          
          console.log(`📤 [EmailKnowledgeUpload] Enviando webhook para: ${doc.document_name}`);
          
          // Timeout de 30 segundos por documento
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/docs-matriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookPayload),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (webhookResponse.ok) {
              const webhookResult = await webhookResponse.json();
              console.log(`✅ [EmailKnowledgeUpload] Webhook processado para: ${doc.document_name}`);
              
              // Atualizar documento específico com o resultado
              updatedDocs[docIndex] = {
                ...updatedDocs[docIndex],
                transcription_status: 'completed' as const,
                transcription_processed_at: new Date().toISOString(),
                transcription: webhookResult.description || webhookResult.transcription || ''
              };
              
              allWebhookResults.push(webhookResult);
            } else {
              console.warn(`⚠️ [EmailKnowledgeUpload] Webhook falhou para ${doc.document_name}: ${webhookResponse.status}`);
              updatedDocs[docIndex] = {
                ...updatedDocs[docIndex],
                transcription_status: 'error' as const
              };
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.warn(`⏱️ [EmailKnowledgeUpload] Timeout para: ${doc.document_name}`);
            } else {
              console.error(`❌ [EmailKnowledgeUpload] Erro no webhook para ${doc.document_name}:`, fetchError);
            }
            // Manter como pending em caso de erro
          }
        }
        
        // 📦 Combinar todos os resultados em um único webhook_result
        const existingWebhookResult = agentData?.webhook_result || {};
        const combinedWebhookResult = {
          ...existingWebhookResult,
          documents: [
            ...(existingWebhookResult.documents || []),
            ...allWebhookResults
          ],
          last_processed: new Date().toISOString(),
          total_documents: docs.length
        };
        
        // Atualizar agente com documentos atualizados E webhook_result combinado
        await supabase
          .from(agentTableName)
          .update({
            webhook_status: 'processed',
            webhook_result: combinedWebhookResult,
            knowledge_documents: updatedDocs,
            is_active: true
          })
          .eq('id', agentId);
          
        console.log(`✅ [EmailKnowledgeUpload] ${allWebhookResults.length} documento(s) processado(s) com sucesso`);
      } catch (error) {
        console.error('❌ [EmailKnowledgeUpload] Erro ao enviar webhook:', error);
      }
    };
    
    // ✅ REMOVIDO: Não precisamos mais dessa função pois documentos são salvos diretamente no agente
    const updateDocumentsAgentId = async (_agentId: string) => {
      console.log('ℹ️ [EmailKnowledgeUpload] Função updateDocumentsAgentId não é mais necessária');
    };

    useImperativeHandle(ref, () => ({
      uploadPendingFiles: uploadPendingFiles,
      updateDocumentsAgentId: updateDocumentsAgentId,
      sendAgentWebhook: sendAgentWebhook
    }));

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
      const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const invalidFiles = acceptedFiles.filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        setError(`Tipos de arquivo não suportados: ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
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
        {pendingFiles.length > 0 && !uploading && agentId && (
          <button
            onClick={async () => {
              try {
                console.log('🔘 [EmailKnowledgeUpload] Upload button clicked with agentId:', agentId);
                await uploadPendingFiles(agentId);
              } catch (error) {
                console.error('❌ Upload error:', error);
              }
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enviar {pendingFiles.length} arquivo(s)
          </button>
        )}
        
        {/* Warning se não tiver agentId */}
        {pendingFiles.length > 0 && !uploading && !agentId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700 text-sm">
              ⚠️ Crie o agente primeiro antes de fazer upload de documentos
            </p>
          </div>
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
  }
);

EmailKnowledgeUpload.displayName = 'EmailKnowledgeUpload';

export default EmailKnowledgeUpload;