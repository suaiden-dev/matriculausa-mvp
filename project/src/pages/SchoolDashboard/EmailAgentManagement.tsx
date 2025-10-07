import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  BookOpen,
  Mail,
  CheckCircle,
  Loader2,
  X,
  Save,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import EmailKnowledgeUpload from '../../components/EmailKnowledgeUpload';

// Interfaces e tipos
interface WebhookResult {
  title?: string;
  description?: string;
  courses?: string[];
}

interface KnowledgeDocument {
  id: string;
  document_name: string;
  file_url: string;
  transcription?: string;
  transcription_status: 'pending' | 'completed' | 'failed';
  created_at: string;
  agent_id?: string;
  university_id: string;
}

interface EmailAgent {
  id: string;
  ai_name: string;
  company_name: string;
  personality: string;
  sector: string;
  agent_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  knowledge_documents_count: number;
}

interface EmailAgentManagementProps {
  activeEmailConfig?: {
    id: string;
    email_address: string;
  };
}

interface FormData {
  ai_name: string;
  company_name: string;
  agent_type: string;
  personality: string;
  custom_prompt: string;
}

// Constantes
const WEBHOOK_URL = process.env.REACT_APP_WEBHOOK_URL || 'https://nwh.suaiden.com/webhook/docs-matriculausa';
const DOCUMENT_TIMEOUT_MINUTES = 30;

// Opções de configuração
const personalityOptions = [
  { value: "Friendly", label: "Friendly", description: "Warm and welcoming approach" },
  { value: "Professional", label: "Professional", description: "Formal and reliable" },
  { value: "Helpful", label: "Helpful", description: "Always ready to assist" },
  { value: "Enthusiastic", label: "Enthusiastic", description: "Energetic and positive" },
  { value: "Patient", label: "Patient", description: "Calm and understanding" },
  { value: "Expert", label: "Expert", description: "Knowledgeable and authoritative" }
];

const agentTypeOptions = [
  "Admissions",
  "Registrar's Office", 
  "Finance",
  "Student Services",
  "Academic Affairs",
  "International Students",
  "Scholarships",
  "Housing",
  "Career Services",
  "Library Services"
];

// Funções utilitárias
const generateFinalPrompt = (webhookResults: WebhookResult[]): string => {
  if (!webhookResults || webhookResults.length === 0) {
    return '';
  }
  
  const combinedKnowledge = webhookResults.map((result, index) => {
    const courses = result.courses || [];
    return courses.map((course: string) => 
      `## Documento ${index + 1}\n\n${course}`
    ).join('\n\n');
  }).join('\n\n---\n\n');
  
  return `You are a helpful email assistant for university admissions. Use the knowledge base to answer questions about admissions, scholarships, and university processes.

<knowledge-base>
${combinedKnowledge}
</knowledge-base>

IMPORTANT: Use the information from the knowledge base above to answer student questions. If the information is not in the knowledge base, respond generally and suggest that the student contact the university directly for specific information.`;
};

const processWebhook = async (doc: KnowledgeDocument, agentId: string): Promise<WebhookResult> => {
  try {
    const webhookPayload = {
      user_id: 'system',
      agent_id: agentId,
      document_id: doc.id,
      file_name: doc.document_name,
      file_type: 'application/pdf',
      file_url: doc.file_url
    };
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });
    
    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed for ${doc.document_name}: ${webhookResponse.status}`);
    }
    
    return await webhookResponse.json();
  } catch (error) {
    console.error(`Failed to process webhook for ${doc.document_name}:`, error);
    throw error;
  }
};

// Hook para gerenciar agentes
const useEmailAgents = (activeEmailConfig?: { id: string; email_address: string }, universityId?: string) => {
  const [agents, setAgents] = useState<EmailAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      
      if (activeEmailConfig?.id && activeEmailConfig.email_address?.includes('@gmail.com')) {
        // GMAIL: Buscar agentes da tabela ai_email_agents
        console.log('🔍 [EmailAgentManagement] Carregando agentes Gmail:', activeEmailConfig.email_address);
        
        const { data, error } = await supabase
          .from('ai_email_agents')
          .select(`
            id,
            ai_name,
            personality,
            agent_type,
            is_active,
            created_at,
            updated_at
          `)
          .eq('email_configuration_id', activeEmailConfig.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Buscar contagem de documentos para cada agente
        const agentsWithCount = await Promise.all(
          data?.map(async (agent) => {
            const { count } = await supabase
              .from('email_knowledge_documents')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agent.id);
            
            return {
              ...agent,
              company_name: activeEmailConfig.email_address,
              sector: 'Education',
              knowledge_documents_count: count || 0
            };
          }) || []
        );

        setAgents(agentsWithCount);
        console.log('✅ [EmailAgentManagement] Agentes Gmail carregados:', agentsWithCount.length);
      } else if (universityId && activeEmailConfig?.id) {
        // MICROSOFT: Buscar agentes da tabela ai_configurations
        console.log('🔍 [EmailAgentManagement] Carregando agentes Microsoft para universidade:', universityId);
        console.log('🔍 [EmailAgentManagement] activeEmailConfig:', activeEmailConfig);
        
        const { data, error } = await supabase
          .from('microsoft_ai_agents')
          .select(`
            id,
            ai_name,
            company_name,
            personality,
            sector,
            agent_type,
            is_active,
            knowledge_documents,
            final_prompt,
            created_at,
            updated_at
          `)
          .eq('university_id', universityId)
          .eq('email_configuration_id', activeEmailConfig.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // ✅ SIMPLIFICADO: Contar documentos do array JSONB knowledge_documents
        const agentsWithCount = data?.map((agent) => {
          const docs = (agent.knowledge_documents as any[]) || [];
          return {
            ...agent,
            knowledge_documents_count: docs.length
          };
        }) || [];

        setAgents(agentsWithCount);
        console.log('✅ [EmailAgentManagement] Agentes Microsoft carregados:', agentsWithCount.length);
        console.log('✅ [EmailAgentManagement] Agentes encontrados:', agentsWithCount);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  }, [activeEmailConfig?.id, activeEmailConfig?.email_address, universityId]);

  useEffect(() => {
    if (universityId || activeEmailConfig?.id) {
      fetchAgents();
    }
  }, [fetchAgents]);

  return { agents, loading, fetchAgents };
};

// Hook para operações de agentes
const useAgentOperations = (activeEmailConfig?: { id: string; email_address: string }, universityId?: string) => {

  // Determinar qual tabela usar
  const getTableName = () => {
    // Para Microsoft (quando há universityId), usar microsoft_ai_agents
    if (universityId) {
      return 'microsoft_ai_agents';
    }
    // Para Gmail, usar ai_email_agents
    return 'ai_email_agents';
  };

  // Criar agente
  const createAgent = async (agentData: any): Promise<EmailAgent> => {
    const tableName = getTableName();
    const { data: agent, error } = await supabase
      .from(tableName)
      .insert(agentData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create agent: ${error.message}`);
    return agent;
  };

  // Atualizar agente
  const updateAgent = async (agentId: string, updateData: any) => {
    const tableName = getTableName();
    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', agentId);

    if (error) throw error;
  };

  // Toggle agente
  const toggleAgent = async (agentId: string, currentStatus: boolean) => {
    const tableName = getTableName();
    const { error } = await supabase
      .from(tableName)
      .update({ is_active: !currentStatus })
      .eq('id', agentId);

    if (error) throw error;
  };

  // Deletar agente
  const deleteAgent = async (agentId: string) => {
    const tableName = getTableName();
    console.log('🗑️ [deleteAgent] Using table:', tableName, 'for agent:', agentId);
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', agentId);

    if (error) {
      console.error('❌ [deleteAgent] Error:', error);
      throw error;
    }
    
    console.log('✅ [deleteAgent] Agent deleted from table:', tableName);
  };

  // Verificar agente existente (apenas para Microsoft)
  const checkExistingAgent = async (): Promise<boolean> => {
    if (!activeEmailConfig?.id && universityId) {
      const { data: existingAgent, error } = await supabase
        .from('ai_configurations')
        .select('id, ai_name')
        .eq('university_id', universityId)
        .single();
              
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error checking existing agent: ${error.message}`);
      }

      if (existingAgent) {
        alert(`❌ LIMITE ATINGIDO: Já existe um agente para esta universidade: "${existingAgent.ai_name}".\n\n📋 REGRAS:\n• Apenas 1 agente por universidade\n• Use a opção "Editar Agente" para modificar o existente\n• Esta restrição garante melhor organização`);
        return true;
      }
    }
    return false;
  };

  return {
    createAgent,
    updateAgent,
    toggleAgent,
    deleteAgent,
    checkExistingAgent
  };
};

// Hook para processamento de documentos
const useDocumentProcessing = () => {
  // Processar documentos pendentes
  const processPendingDocuments = async (agentId: string, universityId: string): Promise<WebhookResult[]> => {
    const { data: pendingDocs, error } = await supabase
      .from('email_knowledge_documents')
      .select('id, document_name, file_url, transcription, transcription_status, created_at')
      .eq('university_id', universityId)
      .is('agent_id', null)
      .gte('created_at', new Date(Date.now() - DOCUMENT_TIMEOUT_MINUTES * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!pendingDocs || pendingDocs.length === 0) {
      return [];
    }

    // Associar documentos ao agente
    const { error: updateError } = await supabase
      .from('email_knowledge_documents')
      .update({ agent_id: agentId })
      .in('id', pendingDocs.map(doc => doc.id));

    if (updateError) throw updateError;

    // 🔗 VINCULAR DOCUMENTOS AO AGENTE ESPECÍFICO
    // Copiar documentos para ai_agent_knowledge_documents se for Microsoft
    if (!activeEmailConfig?.id) { // Microsoft (ai_configurations)
      try {
        for (const doc of pendingDocs) {
          const { error: copyError } = await supabase
            .from('ai_agent_knowledge_documents')
            .insert({
              ai_configuration_id: agentId,
              document_name: doc.document_name,
              file_url: doc.file_url || '',
              file_size: 0, // Tamanho não disponível na tabela origem
              mime_type: 'application/pdf', // Assumindo PDF
              uploaded_by_user_id: user?.id || 'system',
              transcription: doc.transcription,
              transcription_status: doc.transcription_status,
              transcription_processed_at: doc.transcription_status === 'completed' ? new Date().toISOString() : null
            });

          if (copyError) {
            console.error(`Error copying document ${doc.document_name} to agent:`, copyError);
          } else {
            console.log(`✅ Document ${doc.document_name} linked to agent ${agentId}`);
          }
        }
      } catch (error) {
        console.error('Error linking documents to agent:', error);
      }
    }

    const webhookResults: WebhookResult[] = [];
            
    for (const doc of pendingDocs) {
      try {
        if (doc.transcription && doc.transcription_status === 'completed') {
          const transcriptionData = JSON.parse(doc.transcription);
          webhookResults.push(transcriptionData);
        } else {
          const result = await processWebhook(doc as KnowledgeDocument, agentId);
          webhookResults.push(result);
        }
      } catch (error) {
        console.error(`Error processing document ${doc.document_name}:`, error);
      }
    }

    return webhookResults;
  };

  return { processPendingDocuments };
};

export default function EmailAgentManagement({ activeEmailConfig }: EmailAgentManagementProps) {
  const { user } = useAuth();
  const { university } = useUniversity();
  
  // Estados do formulário
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<EmailAgent | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [customInstructionsExpanded, setCustomInstructionsExpanded] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [creationStep, setCreationStep] = useState<1 | 2>(1); // 1: Criar Agente, 2: Base de Conhecimento
  const [createdAgent, setCreatedAgent] = useState<EmailAgent | null>(null); // Agente criado na etapa 1
  const uploadRef = useRef<{ 
    uploadPendingFiles: (agentId: string) => Promise<any[]>;
    updateDocumentsAgentId: (agentId: string) => Promise<void>;
    sendAgentWebhook: (agentId: string) => Promise<void>;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    ai_name: '',
    company_name: university?.name || 'University',
    agent_type: '',
    personality: '',
    custom_prompt: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  // Atualizar company_name quando university for carregada
  useEffect(() => {
    console.log('🔍 [EmailAgentManagement] University data:', university);
    if (university?.name) {
      console.log('✅ [EmailAgentManagement] Setting company_name to:', university.name);
      setFormData(prev => ({
        ...prev,
        company_name: university.name
      }));
    } else {
      console.log('⚠️ [EmailAgentManagement] No university name available');
    }
  }, [university?.name]);

  // Hooks customizados
  const { agents, loading, fetchAgents } = useEmailAgents(activeEmailConfig, university?.id);
  const { createAgent, updateAgent, toggleAgent, deleteAgent, checkExistingAgent } = useAgentOperations(activeEmailConfig, university?.id);
  const { processPendingDocuments } = useDocumentProcessing();

  // 🎯 GERAR PROMPT AUTOMÁTICO (como WhatsApp Connect)
  const generateCustomPrompt = useCallback((aiName: string, companyName: string, personality: string, agentType: string): string => {
    if (!aiName || !companyName || !personality || !agentType) {
      return '';
    }

    return `You are ${aiName}, an AI assistant specialized in ${agentType.toLowerCase()} at ${companyName}.

PERSONALITY: ${personality}
UNIVERSITY: ${companyName}
AGENT NAME: ${aiName}
DEPARTMENT: ${agentType}

IMPORTANT INSTRUCTIONS:
- Always use your real name: ${aiName}
- Always use the university name: ${companyName}
- Be ${personality.toLowerCase()} in your responses
- Provide specific information about programs, scholarships, and admission processes
- Mention MatriculaUSA when relevant to help international students
- Be helpful and professional
- If you don't know something specific, be honest but offer alternatives

SIGNATURE EXAMPLE:
Best regards,
${aiName}
${agentType} Department - ${companyName}`;
  }, []);

  // Handlers
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    if (field === 'ai_name' && value.length > 100) {
      alert('Agent name cannot exceed 100 characters.');
      return;
    }
    
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // 🎯 GERAR PROMPT AUTOMÁTICO quando campos essenciais são preenchidos
    if (field === 'ai_name' || field === 'company_name' || field === 'personality' || field === 'agent_type') {
      const autoPrompt = generateCustomPrompt(
        newFormData.ai_name,
        newFormData.company_name,
        newFormData.personality,
        newFormData.agent_type
      );
      
      // Só atualizar se o campo custom_prompt estiver vazio (não sobrescrever se usuário já editou)
      if (!formData.custom_prompt && autoPrompt) {
        setFormData(prev => ({ ...prev, custom_prompt: autoPrompt }));
      }
    }
  }, [formData, generateCustomPrompt]);

  const handleSmoothTransition = useCallback((showForm: boolean) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowCreateForm(showForm);
      setIsTransitioning(false);
    }, 150);
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert("You must be logged in to create an agent.");
      return;
    }

    if (!formData.ai_name || !formData.company_name || !formData.agent_type || !formData.personality) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setFormLoading(true);
      
      // Verificar agente existente (apenas para Microsoft)
      if (await checkExistingAgent()) {
        return;
      }

      // Determinar qual tabela usar baseado na lógica correta
      const tableName = university?.id ? 'microsoft_ai_agents' : 'ai_email_agents';
      console.log('🔍 [EmailAgentManagement] Creating agent for table:', tableName);
      
      const agentData = tableName === 'ai_email_agents' ? {
        // GMAIL: Dados para ai_email_agents
        user_id: user.id,
        email_configuration_id: activeEmailConfig?.id,
        ai_name: formData.ai_name,
        agent_type: formData.agent_type,
        personality: formData.personality,
        custom_prompt: formData.custom_prompt,
        is_active: true,
      } : {
        // MICROSOFT: Dados para microsoft_ai_agents
        user_id: user.id,
        university_id: university?.id,
        email_configuration_id: activeEmailConfig?.id,
        ai_name: formData.ai_name,
        company_name: formData.company_name,
        agent_type: formData.agent_type || 'email',
        personality: formData.personality,
        sector: 'Education',
        custom_prompt: formData.custom_prompt,
        final_prompt: formData.custom_prompt || generateCustomPrompt(
          formData.ai_name,
          formData.company_name,
          formData.personality,
          formData.agent_type
        ),
        is_active: false,
      };

      console.log('🔍 [EmailAgentManagement] Agent data to create:', agentData);
      const agent = await createAgent(agentData);
      console.log('✅ [EmailAgentManagement] Agent created:', agent.id);
      
      // Salvar agente criado e avançar para etapa 2
      setCreatedAgent(agent);
      setCreationStep(2);
      
    } catch (error) {
      console.error('Error creating agent:', error);
      alert(`Error creating agent: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setFormLoading(false);
    }
  };
  
  // Nova função para finalizar criação com base de conhecimento
  const handleFinishAgentCreation = async () => {
    if (!createdAgent) return;
    
    try {
      setFormLoading(true);
      
      console.log('✅ [EmailAgentManagement] Finalizando criação do agente...');
      
      // 🚀 Enviar webhook ÚNICO para n8n processar todos os documentos
      if (uploadRef.current) {
        console.log('📤 [EmailAgentManagement] Enviando webhook para processar documentos...');
        await uploadRef.current.sendAgentWebhook(createdAgent.id);
      }
      
      await fetchAgents();
      setShowCreateForm(false);
      setCreationStep(1);
      setCreatedAgent(null);
      setFormData({
        ai_name: '',
        company_name: university?.name || '',
        agent_type: '',
        personality: '',
        custom_prompt: ''
      });
      setPendingFiles([]);
      handleSmoothTransition(false);
      
      alert('✅ Agent created successfully with knowledge base!');
    } catch (error) {
      console.error('Error finishing agent creation:', error);
      alert(`Error finishing agent creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 [EmailAgentManagement] handleUpdateAgent called');

    if (!editingAgent) {
      console.error('❌ [EmailAgentManagement] No editingAgent');
      alert("No agent selected for editing.");
      return;
    }

    // Validação mais específica
    console.log('🔍 [EmailAgentManagement] Form data for validation:', formData);
    const missingFields = [];
    if (!formData.ai_name?.trim()) missingFields.push('AI Name');
    if (!formData.company_name?.trim()) missingFields.push('Company Name');
    if (!formData.agent_type?.trim()) missingFields.push('Agent Type');
    if (!formData.personality?.trim()) missingFields.push('Personality');
    
    console.log('🔍 [EmailAgentManagement] Missing fields:', missingFields);
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setFormLoading(true);
      console.log('⏳ [EmailAgentManagement] Starting update...');
      
      const updateData = activeEmailConfig?.id && activeEmailConfig.email_address?.includes('@gmail.com') ? {
        // GMAIL: Atualizar apenas colunas da ai_email_agents
        ai_name: formData.ai_name,
        agent_type: formData.agent_type,
        personality: formData.personality,
        custom_prompt: formData.custom_prompt,
        updated_at: new Date().toISOString()
      } : {
        // MICROSOFT: Atualizar colunas da microsoft_ai_agents
        ai_name: formData.ai_name,
        company_name: formData.company_name,
        agent_type: formData.agent_type,
        personality: formData.personality,
        final_prompt: formData.custom_prompt, // Salvar em final_prompt
        updated_at: new Date().toISOString()
      };

      console.log('📦 [EmailAgentManagement] Update data:', updateData);
      console.log('🔑 [EmailAgentManagement] Agent ID:', editingAgent.id);

      await updateAgent(editingAgent.id, updateData);

      console.log('✅ [EmailAgentManagement] Agent updated successfully');
      
      // 🔄 Processar documentos pendentes após update (se houver)
      if (uploadRef.current?.sendAgentWebhook) {
        console.log('🔄 [EmailAgentManagement] Processando documentos pendentes...');
        try {
          await uploadRef.current.sendAgentWebhook(editingAgent.id);
          console.log('✅ [EmailAgentManagement] Documentos pendentes processados');
        } catch (webhookError) {
          console.error('⚠️ [EmailAgentManagement] Erro ao processar documentos:', webhookError);
          // Não bloquear o update por erro no webhook
        }
      }
      
      alert('✅ Agent updated successfully!');
      await fetchAgents();
      setEditingAgent(null);
      setFormData({
        ai_name: '',
        company_name: university?.name || '',
        agent_type: '',
        personality: '',
        custom_prompt: ''
      });
      handleSmoothTransition(false);
    } catch (error) {
      console.error('❌ [EmailAgentManagement] Error updating agent:', error);
      alert(`Error updating agent: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleAgent = async (agentId: string, currentStatus: boolean) => {
    try {
      setActionLoading(agentId);
      await toggleAgent(agentId, currentStatus);
      await fetchAgents();
    } catch (error) {
      console.error('Error toggling agent:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🗑️ [EmailAgentManagement] Deleting agent:', agentId);
      console.log('🗑️ [EmailAgentManagement] University ID:', university?.id);
      console.log('🗑️ [EmailAgentManagement] Active email config:', activeEmailConfig);
      
      setActionLoading(agentId);
      await deleteAgent(agentId);
      console.log('✅ [EmailAgentManagement] Agent deleted successfully');
      await fetchAgents();
    } catch (error) {
      console.error('❌ [EmailAgentManagement] Error deleting agent:', error);
      alert(`Error deleting agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Email AI Agents
            {activeEmailConfig && (
              <span className="text-sm font-normal text-gray-500">
                (Email: {activeEmailConfig.email_address})
              </span>
            )}
            {!activeEmailConfig && university && (
              <span className="text-sm font-normal text-gray-500">
                (Microsoft: {university.name})
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage AI agents for automated email processing
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative overflow-hidden">
        {isTransitioning && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-[#05294E]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">Loading...</span>
            </div>
          </div>
        )}

        {!showCreateForm ? (
          /* Agents List */
          <div className="space-y-4">
            {agents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No email AI agents created
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first AI agent to start processing emails automatically
                </p>
                <button
                  onClick={() => handleSmoothTransition(true)}
                  className="bg-[#05294E] hover:bg-[#05294E]/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Agent
                </button>
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Bot className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {agent.ai_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {agent.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Pause className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{agent.personality}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {agent.knowledge_documents_count} documents
                        </span>
                        <span>Created {new Date(agent.created_at).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAgent(agent.id, agent.is_active)}
                        disabled={actionLoading === agent.id}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          agent.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50`}
                      >
                        {actionLoading === agent.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : agent.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setEditingAgent(agent);
                          setFormData({
                            ai_name: agent.ai_name,
                            company_name: agent.company_name,
                            agent_type: agent.agent_type || 'email', // Valor padrão se não existir
                            personality: agent.personality,
                            // 🔧 Buscar final_prompt ao invés de custom_prompt
                            custom_prompt: (agent as any).final_prompt || (agent as any).custom_prompt || ""
                          });
                          // 📂 Expandir custom instructions se houver prompt
                          if ((agent as any).final_prompt || (agent as any).custom_prompt) {
                            setCustomInstructionsExpanded(true);
                          }
                          handleSmoothTransition(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Agent"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        disabled={actionLoading === agent.id}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Create/Edit Form */
          <div className={`relative p-4 sm:p-6 bg-gray-50 rounded-xl transition-all duration-300 ease-in-out transform ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}>
            {/* Botão X no canto superior direito */}
            <button
              onClick={() => {
                setEditingAgent(null);
                setFormData({
                  ai_name: "",
                  company_name: university?.name || "",
                  agent_type: "",
                  personality: "",
                  custom_prompt: ""
                });
                handleSmoothTransition(false);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 z-10"
              title="Close form"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent} className="space-y-4 sm:space-y-6">
              {/* Grid responsivo para campos principais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Agent Name */}
                <div className="w-full">
                  <label htmlFor="ai_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name *
                  </label>
                  <input
                    id="ai_name"
                    type="text"
                    value={formData.ai_name}
                    onChange={(e) => handleInputChange("ai_name", e.target.value)}
                    placeholder="e.g. Maria Assistant"
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors text-base"
                    required
                  />
                </div>

                {/* Agent Type */}
                <div className="w-full">
                  <label htmlFor="agent_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Type *
                  </label>
                  <select
                    id="agent_type"
                    value={formData.agent_type}
                    onChange={(e) => handleInputChange("agent_type", e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors text-base"
                    required
                  >
                    <option value="">Select agent type</option>
                    {agentTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Personality */}
                <div className="w-full">
                  <label htmlFor="personality" className="block text-sm font-medium text-gray-700 mb-2">
                    Personality *
                  </label>
                  <select
                    id="personality"
                    value={formData.personality}
                    onChange={(e) => handleInputChange("personality", e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors text-base"
                    required
                  >
                    <option value="">Select personality</option>
                    {personalityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Instructions - Collapsible */}
              <div className="bg-white p-4 sm:p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Custom Instructions (Optional)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomInstructionsExpanded(!customInstructionsExpanded)}
                      className="flex items-center gap-1 px-3 py-2 sm:py-1 text-sm bg-[#05294E]/10 text-[#05294E] rounded-lg hover:bg-[#05294E]/20 transition-colors"
                    >
                      {customInstructionsExpanded ? (
                        <>
                          <X className="w-3 h-3" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          Expand
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {customInstructionsExpanded && (
                  <div className="space-y-3">
                    {/* 🎯 INDICADOR DE PROMPT AUTOMÁTICO */}
                    {formData.custom_prompt && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-700 font-medium">
                          ✨ Custom prompt generated automatically
                        </span>
                      </div>
                    )}
                    
                    <textarea
                      id="custom_prompt"
                      value={formData.custom_prompt}
                      onChange={(e) => handleInputChange("custom_prompt", e.target.value)}
                      placeholder="e.g. Always respond succinctly and politely. Be proactive in offering help..."
                      className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors resize-none text-base"
                      rows={6}
                    />
                    <p className="text-xs text-gray-500">
                      💡 <strong>Tip:</strong> The prompt was automatically generated based on the agent data. You can edit it as needed.
                    </p>
                  </div>
                )}
              </div>

              {/* Knowledge Base Documents - Apenas na Etapa 2 ou ao Editar */}
              {(creationStep === 2 || editingAgent) && (
                <div className="bg-white p-4 sm:p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-[#05294E]" />
                    <label className="text-sm font-medium text-gray-700">
                      {creationStep === 2 ? 'Add Knowledge Base Documents' : 'Knowledge Base Documents (Optional)'}
                    </label>
                  </div>
                  {creationStep === 2 && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">
                        ✅ Agent "{createdAgent?.ai_name}" created successfully! Now add documents to build the knowledge base.
                      </p>
                    </div>
                  )}
                  <EmailKnowledgeUpload
                    ref={uploadRef}
                    universityId={university?.id || ""}
                    agentId={createdAgent?.id || editingAgent?.id || undefined}
                    systemType="microsoft"
                    onDocumentsChange={(documents: any[]) => {
                      console.log('Documents uploaded:', documents);
                    }}
                    onPendingFilesChange={(files: File[]) => {
                      setPendingFiles(files);
                    }}
                    // 📂 Passar documentos existentes do JSONB knowledge_documents
                    existingDocuments={editingAgent ? ((editingAgent as any).knowledge_documents || []) : []}
                    isCreating={!editingAgent?.id && creationStep === 2}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Upload documents that will be used as knowledge base for your AI agent.
                  </p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3">
                {creationStep === 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreationStep(1);
                      setCreatedAgent(null);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  type={(creationStep === 1 && !editingAgent) || editingAgent ? "submit" : "button"}
                  onClick={creationStep === 2 && !editingAgent ? handleFinishAgentCreation : undefined}
                  disabled={formLoading}
                  className="flex-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {creationStep === 2 ? 'Processing Documents...' : editingAgent ? 'Updating Agent...' : 'Creating Agent...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {creationStep === 2 ? 'Finish & Activate Agent' : editingAgent ? 'Update Agent' : 'Next: Add Knowledge Base'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}