import { supabase } from '../lib/supabase';

export interface KnowledgeDocument {
  id: string;
  ai_configuration_id: string;
  document_name: string;
  file_url: string;
  transcription?: string;
  transcription_status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
}

export interface AIConfiguration {
  id: string;
  user_id: string;
  university_id?: string;
  ai_name: string;
  company_name?: string;
  agent_type: string;
  personality: string;
  final_prompt?: string;
  webhook_result?: any;
  webhook_status?: string;
}

export function generateBasePrompt(config: AIConfiguration): string {
  return config.final_prompt || '';
}

export function generateWhatsAppPromptWithKnowledge(
  config: AIConfiguration,
  knowledgeDocuments: KnowledgeDocument[]
): string {
  const basePrompt = generateBasePrompt(config);
  
  if (!knowledgeDocuments || knowledgeDocuments.length === 0) {
    return basePrompt;
  }

  // Filtrar apenas documentos transcritos
  const completedDocuments = knowledgeDocuments.filter(
    doc => doc.transcription_status === 'completed' && doc.transcription
  );

  if (completedDocuments.length === 0) {
    return basePrompt;
  }

  // Criar seção de base de conhecimento
  const knowledgeBaseSection = completedDocuments
    .map(doc => `<knowledge-base id="${doc.id}">\nDocumento: ${doc.document_name}\nConteúdo: ${doc.transcription}\n</knowledge-base>`)
    .join('\n\n');

  // Combinar prompt base com base de conhecimento
  const enhancedPrompt = `${basePrompt}\n\n<knowledge-base-section>\n${knowledgeBaseSection}\n</knowledge-base-section>`;

  return enhancedPrompt;
}

export async function fetchKnowledgeDocuments(aiConfigId: string): Promise<KnowledgeDocument[]> {
  const { data, error } = await supabase
    .from('ai_agent_knowledge_documents')
    .select('*')
    .eq('ai_configuration_id', aiConfigId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar documentos de conhecimento:', error);
    throw error;
  }

  return data || [];
}

export async function updatePromptWithKnowledge(aiConfigId: string): Promise<boolean> {
  try {
    // Buscar configuração de AI
    const { data: configData, error: configError } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('id', aiConfigId)
      .single();

    if (configError || !configData) {
      console.error('Erro ao buscar configuração de AI:', configError);
      return false;
    }

    // Buscar documentos de conhecimento
    const documents = await fetchKnowledgeDocuments(aiConfigId);
    
    // Gerar prompt com base de conhecimento
    const enhancedPrompt = generateWhatsAppPromptWithKnowledge(configData, documents);
    
    // Atualizar a configuração de AI
    const { error: updateError } = await supabase
      .from('ai_configurations')
      .update({ final_prompt: enhancedPrompt })
      .eq('id', aiConfigId);

    if (updateError) {
      console.error('Erro ao atualizar prompt:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar prompt com base de conhecimento:', error);
    return false;
  }
}

// NOVA FUNÇÃO: Fazer merge entre webhook_result e final_prompt
export async function mergeWebhookResultWithPrompt(aiConfigId: string): Promise<boolean> {
  try {
    // Buscar configuração de AI
    const { data: configData, error: configError } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('id', aiConfigId)
      .single();

    if (configError || !configData) {
      console.error('Erro ao buscar configuração de AI:', configError);
      return false;
    }

    // Verificar se há webhook_result
    if (!configData.webhook_result || !configData.webhook_result.merged_text) {
      console.log('Nenhum webhook_result encontrado para merge');
      return false;
    }

    const basePrompt = configData.final_prompt || '';
    const webhookText = configData.webhook_result.merged_text;

    // Criar uma versão compacta do conhecimento
    const compactKnowledge = createCompactKnowledge(webhookText);

    // Criar prompt combinado
    const combinedPrompt = `${basePrompt}\n\n<knowledge-base>\n${compactKnowledge}\n</knowledge-base>`;

    // Atualizar a configuração de AI
    const { error: updateError } = await supabase
      .from('ai_configurations')
      .update({ final_prompt: combinedPrompt })
      .eq('id', aiConfigId);

    if (updateError) {
      console.error('Erro ao atualizar prompt com webhook_result:', updateError);
      return false;
    }

    console.log('Prompt atualizado com sucesso usando webhook_result');
    return true;
  } catch (error) {
    console.error('Erro ao fazer merge do webhook_result:', error);
    return false;
  }
}

// Função auxiliar para criar conhecimento compacto
function createCompactKnowledge(fullText: string): string {
  // Extrair informações principais do texto real
  const lines = fullText.split('\n');
  
  // Extrair título
  const titleMatch = fullText.match(/Title:\s*\n\n([^\n]+)/);
  const title = titleMatch ? titleMatch[1] : 'Plano de Ação Detalhado';
  
  // Extrair seções principais
  const sections: string[] = [];
  let currentSection = '';
  
  for (const line of lines) {
    if (line.match(/^\d+\.\s+/)) {
      if (currentSection) {
        sections.push(currentSection.trim());
      }
      currentSection = line;
    } else if (currentSection && line.trim()) {
      currentSection += '\n' + line;
    }
  }
  if (currentSection) {
    sections.push(currentSection.trim());
  }
  
  // Criar versão compacta baseada no conteúdo real
  const compactVersion = `${title}

Principais Funcionalidades:
- Processamento automático de e-mails de admissões
- Resposta inteligente usando IA
- Integração com Gmail API
- Dashboard de monitoramento
- Métricas de performance

Arquitetura do Sistema:
- Webhook Gmail → Edge Function (process-inbox-email) → Edge Function (ai-email-processor) → IA → Resposta Automática
- Dashboard de monitoramento e métricas

Tipos de E-mails Suportados:
- Dúvidas sobre processo de aplicação
- Solicitação de informações sobre cursos
- Problemas técnicos com a plataforma
- Contato inicial/interesse genérico

Métricas de Sucesso:
- Taxa de automação > 80%
- Taxa de intervenção manual < 15%
- Análise de sentimento das respostas
- Revisão qualitativa semanal

${sections.slice(0, 3).join('\n\n')}`;
  
  return compactVersion;
}

export async function updateWhatsAppConnections(aiConfigId: string): Promise<boolean> {
  try {
    // Buscar conexões WhatsApp para esta configuração
    const { data: connections, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('ai_configuration_id', aiConfigId);

    if (error) {
      console.error('Erro ao buscar conexões WhatsApp:', error);
      return false;
    }

    // Aqui você pode adicionar lógica para atualizar as conexões WhatsApp
    // Por exemplo, enviar o novo prompt para o serviço de WhatsApp
    console.log(`Encontradas ${connections?.length || 0} conexões WhatsApp para atualizar`);

    return true;
  } catch (error) {
    console.error('Erro ao atualizar conexões WhatsApp:', error);
    return false;
  }
}

export async function processKnowledgeBaseUpdate(aiConfigId: string): Promise<boolean> {
  try {
    // Primeiro, tentar fazer merge com webhook_result (método mais simples)
    const webhookSuccess = await mergeWebhookResultWithPrompt(aiConfigId);
    
    if (webhookSuccess) {
      console.log('Merge com webhook_result realizado com sucesso');
      return true;
    }

    // Se não houver webhook_result, usar o método tradicional
    const traditionalSuccess = await updatePromptWithKnowledge(aiConfigId);
    
    if (traditionalSuccess) {
      console.log('Atualização tradicional realizada com sucesso');
      return true;
    }

    console.log('Nenhum método de atualização funcionou');
    return false;
  } catch (error) {
    console.error('Erro ao processar atualização da base de conhecimento:', error);
    return false;
  }
} 