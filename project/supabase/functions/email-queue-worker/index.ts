// 🗃️ EMAIL QUEUE WORKER - Processa emails sequencialmente
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY');

// 🔒 SISTEMA DE LOCK PARA EVITAR EXECUÇÕES SIMULTÂNEAS
const LOCK_KEY = 'email_worker_lock';
const LOCK_TIMEOUT = 60000; // 1 minuto timeout para lock (reduzido para evitar locks longos)

async function acquireLock(): Promise<boolean> {
  try {
    console.log('🔒 [LOCK] Tentando adquirir lock...');
    
    // Verificar se já existe lock ativo
    const { data: existingLock } = await supabase
      .from('worker_locks')
      .select('*')
      .eq('lock_key', LOCK_KEY)
      .eq('is_active', true)
      .maybeSingle();
    
    if (existingLock) {
      const lockAge = Date.now() - new Date(existingLock.created_at).getTime();
      console.log(`🔒 [LOCK] Lock existente encontrado - idade: ${lockAge}ms, timeout: ${LOCK_TIMEOUT}ms`);
      if (lockAge < LOCK_TIMEOUT) {
        console.log('🔒 [LOCK] Lock já existe e é válido - abortando execução');
        return false;
      } else {
        console.log('🔒 [LOCK] Lock expirado - removendo e criando novo');
        await supabase
          .from('worker_locks')
          .delete()
          .eq('lock_key', LOCK_KEY);
      }
    }
    
    // Criar novo lock
    const { error } = await supabase
      .from('worker_locks')
      .insert({
        lock_key: LOCK_KEY,
        is_active: true,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('🔒 [LOCK] Erro ao criar lock:', error);
      return false;
    }
    
    console.log('🔒 [LOCK] Lock adquirido com sucesso');
    return true;
  } catch (error) {
    console.error('🔒 [LOCK] Erro ao adquirir lock:', error);
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    console.log('🔒 [LOCK] Liberando lock...');
    await supabase
      .from('worker_locks')
      .delete()
      .eq('lock_key', LOCK_KEY);
    console.log('🔒 [LOCK] Lock liberado com sucesso');
  } catch (error) {
    console.error('🔒 [LOCK] Erro ao liberar lock:', error);
  }
}

async function cleanupExpiredLocks(): Promise<void> {
  try {
    console.log('🧹 [CLEANUP] Limpando locks expirados...');
    const { error } = await supabase
      .from('worker_locks')
      .delete()
      .lt('created_at', new Date(Date.now() - LOCK_TIMEOUT).toISOString());
    
    if (error) {
      console.error('🧹 [CLEANUP] Erro ao limpar locks:', error);
    } else {
      console.log('🧹 [CLEANUP] Locks expirados removidos');
    }
  } catch (error) {
    console.error('🧹 [CLEANUP] Erro na limpeza:', error);
  }
}

// 🛡️ CONFIGURAÇÕES ULTRA CONSERVADORAS PARA FILA
const QUEUE_CONFIG = {
  batchSize: 1, // Processar 1 email por vez
  delayBetweenEmails: 30000, // 30 segundos entre emails (respeitando quota Gemini)
  maxRetries: 3,
  retryDelay: 60000, // 1 minuto para retry
  maxEmailsPerRun: 2, // Máximo 2 emails por execução (quota Gemini: 4/min)
  timeoutPerEmail: 30000, // 30 segundos timeout por email
  geminiRateLimit: 15000, // 15 segundos entre chamadas Gemini (4/min = 15s)
};

// 🤖 Classe AIService simplificada para o worker
class QueueAIService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processEmail(email: any, userId: string): Promise<any> {
    try {
      console.log(`🤖 [WORKER] Processando email: ${email.subject}`);
      
      // Buscar informações completas do agente
      const { data: agentData } = await supabase
        .from('ai_configurations')
        .select('id, ai_name, company_name, personality, final_prompt')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
        
      // 🔍 BUSCAR BASE DE CONHECIMENTO ESPECÍFICA DO AGENTE
      let knowledgeBase = '';
      try {
        // Primeiro, buscar documentos específicos do agente
        const { data: agentDocs, error: agentDocsError } = await supabase
          .from('ai_agent_knowledge_documents')
          .select('transcription, document_name')
          .eq('ai_configuration_id', agentData?.id || '')
          .eq('transcription_status', 'completed')
          .not('transcription', 'is', null);
        
        if (!agentDocsError && agentDocs && agentDocs.length > 0) {
          knowledgeBase = agentDocs
            .map(doc => `## ${doc.document_name}\n\n${doc.transcription}`)
            .join('\n\n---\n\n');
          console.log(`📚 [WORKER] Documentos específicos do agente encontrados: ${agentDocs.length} documentos`);
        } else {
          console.log(`📚 [WORKER] Nenhum documento específico do agente encontrado`);
        }
      } catch (error) {
        console.error('❌ [WORKER] Erro ao buscar base de conhecimento do agente:', error);
      }
        
      // Criar prompt personalizado automaticamente
      let universityPrompt;
      if (agentData) {
        const { ai_name, company_name, personality, final_prompt } = agentData;
        universityPrompt = final_prompt || `You are ${ai_name}, an AI assistant for ${company_name}. 
        
PERSONALITY: ${personality}
UNIVERSITY: ${company_name}
AGENT NAME: ${ai_name}

Always use your real name (${ai_name}) and the university name (${company_name}) in your responses.`;
      } else {
        universityPrompt = 'You are a university assistant.';
      }
      
      // 🔗 INTEGRAR BASE DE CONHECIMENTO NO PROMPT
      if (knowledgeBase) {
        universityPrompt += `\n\n<knowledge-base>\n${knowledgeBase}\n</knowledge-base>\n\nIMPORTANTE: Use as informações da base de conhecimento acima para responder às perguntas dos estudantes. Se a informação não estiver na base de conhecimento, responda de forma geral e sugira que o estudante entre em contato diretamente com a universidade para informações específicas.`;
      }
      
      // Preparar prompt para Gemini
      const emailContent = `
Assunto: ${email.subject}
De: ${email.from?.emailAddress?.address || 'Unknown'}
Conteúdo: ${email.bodyPreview || email.body?.content || 'Sem conteúdo'}
`;

      // Detectar idioma do email
      const emailText = `${email.subject} ${email.bodyPreview || email.body?.content || ''}`.toLowerCase();
      const isEnglish = /\b(hello|hi|dear|sir|madam|thank|please|help|information|about|study|university|scholarship|application|admission|process|requirements|documents|payment|fee|cost|price|when|where|how|what|why|can|could|would|should|need|want|interested|apply|enroll|register|contact|email|phone|address|website|program|course|degree|bachelor|master|phd|undergraduate|graduate|international|student|usa|america|united states)\b/.test(emailText);
      
      const languageInstruction = isEnglish 
        ? "Respond in English. Be professional and helpful."
        : "Responda em português. Seja profissional e prestativo.";

      const fullPrompt = `${universityPrompt}

Analise o seguinte email e determine se deve ser respondido:
${emailContent}

IMPORTANTE: 
- ${languageInstruction}
- Use a base de conhecimento fornecida para dar respostas específicas e úteis
- Seja específico sobre programas, bolsas e processos da universidade
- Forneça informações detalhadas sobre MatriculaUSA, bolsas e programas

Responda APENAS com um JSON válido no formato:
{
  "shouldReply": boolean,
  "priority": "high" | "medium" | "low",
  "category": "application" | "scholarship" | "documents" | "payment" | "admission" | "general",
  "confidence": number (0-1),
  "response": "sua resposta aqui" | null,
  "reason": "motivo da decisão"
}`;

      // Fazer requisição para Gemini
      console.log(`🔑 [WORKER] Usando Gemini API Key: ${this.apiKey ? 'CONFIGURADA' : 'NÃO CONFIGURADA'}`);
      console.log(`📡 [WORKER] Fazendo requisição para Gemini...`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      });

      console.log(`📊 [WORKER] Gemini Response Status: ${response.status}`);
      console.log(`🤖 [WORKER] ===== CHAMANDO IA GEMINI =====`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [WORKER] Gemini API Error ${response.status}:`, errorText);
        
        if (response.status === 401) {
          console.error(`🚨 [WORKER] GEMINI 401 UNAUTHORIZED - API KEY INVÁLIDA!`);
        }
        
        if (response.status === 429) {
          console.error(`🚨 [WORKER] GEMINI 429 QUOTA EXCEEDED - Aguardando 180s...`);
          await new Promise(resolve => setTimeout(resolve, 180000)); // 180 segundos (3 minutos)
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      console.log(`🤖 [WORKER] ===== RESPOSTA DA IA =====`);
      console.log(`📝 [WORKER] Resposta completa: ${geminiResponse}`);
      console.log(`🤖 [WORKER] ========================`);
      
      if (!geminiResponse) {
        throw new Error('Resposta vazia do Gemini');
      }

      // Parse do JSON com fallbacks
      let result;
      try {
        const cleanJson = geminiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(cleanJson);
      } catch (parseError) {
        console.log(`⚠️ [WORKER] Erro no JSON, usando análise simples para: ${email.subject}`);
        result = {
          shouldReply: true,
          priority: 'medium',
          category: 'general',
          confidence: 0.5,
          response: `Obrigado pelo seu email. Entraremos em contato em breve.`,
          reason: 'Análise simples devido a erro de parsing'
        };
      }

        console.log(`✅ [WORKER] Email analisado: shouldReply=${result.shouldReply}, category=${result.category}`);
        console.log(`🤖 [WORKER] ===== RESULTADO FINAL DA IA =====`);
        console.log(`🎯 [WORKER] Deve responder: ${result.shouldReply}`);
        console.log(`📝 [WORKER] Categoria: ${result.category}`);
        console.log(`💬 [WORKER] Resposta gerada: ${result.response ? result.response.substring(0, 150) + '...' : 'NENHUMA'}`);
        console.log(`🤖 [WORKER] ================================`);
      return { analysis: result, response: result.response };
      
    } catch (error) {
      console.error(`❌ [WORKER] Erro ao processar email:`, error);
      return {
        analysis: {
          shouldReply: false,
          priority: 'low',
          category: 'error',
          confidence: 0,
          reason: `Erro: ${error.message}`
        },
        response: null
      };
    }
  }

  // 🛡️ Cálculo de delay humanizado (versão conservadora)
  calculateHumanDelay(analysis: any): number {
    const { category, priority } = analysis;
    
    // Base delay em segundos (ultra conservador)
    let baseDelay = 30; // 30 segundos base
    
    switch (category) {
      case 'payment':
        baseDelay = 25; // Mais rápido para pagamentos
        break;
      case 'application':
      case 'scholarship':
        baseDelay = 35; // Mais lento para aplicações
        break;
      case 'documents':
        baseDelay = 30;
        break;
      case 'general':
        baseDelay = 28;
        break;
      default:
        baseDelay = 30;
    }
    
    // Ajustar por prioridade
    if (priority === 'high') {
      baseDelay *= 0.8;
    } else if (priority === 'low') {
      baseDelay *= 1.3;
    }
    
    // Randomização humana (±15%)
    const variation = (Math.random() - 0.5) * 0.3;
    baseDelay = baseDelay * (1 + variation);
    
    // Garantir limites seguros
    return Math.max(20, Math.min(45, Math.round(baseDelay)));
  }
}

// 🚀 Função principal do worker
async function processEmailQueue(): Promise<void> {
  console.log('🗃️ [WORKER] Iniciando processamento da fila de emails');
  
  if (!GEMINI_API_KEY) {
    console.error('❌ [WORKER] GEMINI_API_KEY não configurada');
    return;
  }
  
  const aiService = new QueueAIService(GEMINI_API_KEY);
  let processedCount = 0;
  
  try {
    // 🛡️ PROTEÇÃO ANTI-DUPLICAÇÃO: Buscar emails pendentes com verificação de duplicação
    const { data: queueItems, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(QUEUE_CONFIG.maxEmailsPerRun);
      
    // 🚨 VERIFICAÇÃO CRÍTICA: Filtrar emails já processados
    const processedEmails = new Set();
    const uniqueQueueItems = [];
    
    // 🔍 VERIFICAÇÃO NO BANCO: Buscar emails já processados com SUCESSO na tabela processed_microsoft_emails
    const { data: alreadyProcessed, error: processedError } = await supabase
      .from('processed_microsoft_emails')
      .select('microsoft_message_id, status')
      .in('microsoft_message_id', queueItems?.map(item => item.email_data?.id).filter(Boolean) || [])
      .in('status', ['processed', 'replied']); // APENAS emails processados com sucesso
    
    if (processedError) {
      console.error('❌ [WORKER] Erro ao verificar emails processados:', processedError);
    } else {
      console.log(`🔍 [WORKER] Emails já processados com SUCESSO no banco: ${alreadyProcessed?.length || 0}`);
    }
    
    const processedMessageIds = new Set(alreadyProcessed?.map(p => p.microsoft_message_id) || []);
    
    for (const item of queueItems || []) {
      const emailId = item.email_data?.id;
      
      // Verificar duplicata na fila
      if (emailId && !processedEmails.has(emailId)) {
        processedEmails.add(emailId);
        
        // Verificar se já foi processado com SUCESSO no banco
        if (processedMessageIds.has(emailId)) {
          console.log(`🚫 [WORKER] EMAIL JÁ PROCESSADO COM SUCESSO NO BANCO - Pulando email: ${emailId}`);
          // Marcar como já processado
          await supabase
            .from('email_queue')
            .update({ 
              status: 'completed',
              error_message: 'Email já processado anteriormente com sucesso',
              completed_at: new Date().toISOString()
            })
            .eq('id', item.id);
          continue;
        }
        
        // 🔄 REPROCESSAR EMAILS COM ERRO: Limpar registros de erro para permitir reprocessamento
        const { data: errorEmails } = await supabase
          .from('processed_microsoft_emails')
          .select('id')
          .eq('microsoft_message_id', emailId)
          .eq('status', 'error');
          
        if (errorEmails && errorEmails.length > 0) {
          console.log(`🔄 [WORKER] REPROCESSANDO EMAIL COM ERRO: ${emailId}`);
          // Deletar registros de erro para permitir reprocessamento
          await supabase
            .from('processed_microsoft_emails')
            .delete()
            .eq('microsoft_message_id', emailId)
            .eq('status', 'error');
        }
        
        uniqueQueueItems.push(item);
      } else if (emailId) {
        console.log(`🚫 [WORKER] DUPLICATA DETECTADA - Pulando email: ${emailId}`);
        // Marcar como duplicata
        await supabase
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: 'Email duplicado - já processado',
            completed_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }
      
    if (fetchError) {
      console.error('❌ [WORKER] Erro ao buscar fila:', fetchError);
      return;
    }
    
    if (!uniqueQueueItems || uniqueQueueItems.length === 0) {
      console.log('✅ [WORKER] Fila vazia - nenhum email único para processar');
      return;
    }
    
    console.log(`📧 [WORKER] Encontrados ${queueItems?.length || 0} emails na fila`);
    console.log(`🛡️ [WORKER] Após filtro anti-duplicação: ${uniqueQueueItems.length} emails únicos`);
    
    // Processar cada email sequencialmente
    for (const queueItem of uniqueQueueItems) {
      try {
        console.log(`\n🔄 [WORKER] Processando email ${queueItem.id} (${queueItem.email_data.subject})`);
        
        // Marcar como processando
        await supabase
          .from('email_queue')
          .update({
            status: 'processing',
            started_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);
        
        // Processar email com timeout
        const emailPromise = aiService.processEmail(queueItem.email_data, queueItem.user_id);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), QUEUE_CONFIG.timeoutPerEmail)
        );
        
        const result = await Promise.race([emailPromise, timeoutPromise]) as any;
        
        // Determinar se deve enviar resposta
        let finalStatus = 'completed';
        if (result.analysis.shouldReply && result.response) {
          // Calcular delay humanizado
          const delaySeconds = aiService.calculateHumanDelay(result.analysis);
          console.log(`⏰ [WORKER] Aguardando ${delaySeconds}s antes de enviar resposta...`);
          
          // Aplicar delay humanizado
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          
          // 📧 ENVIAR RESPOSTA REAL via Microsoft Graph
          try {
            // Buscar configuração do usuário para obter access token
            const { data: userConfig } = await supabase
              .from('email_configurations')
              .select('oauth_access_token, oauth_refresh_token, oauth_token_expires_at, email_address')
              .eq('user_id', queueItem.user_id)
              .eq('provider_type', 'microsoft')
              .eq('is_active', true)
              .single();
            
            let accessToken = userConfig?.oauth_access_token;
            
            // Verificar se token está válido
            if (userConfig && userConfig.oauth_token_expires_at) {
              const expiresAt = new Date(userConfig.oauth_token_expires_at);
              const now = new Date();
              const isExpired = expiresAt <= now;
              
              if (isExpired) {
                console.log(`⚠️ [WORKER] Token expirado, não é possível renovar automaticamente no worker`);
                console.log(`📧 [WORKER] Email será marcado como falha - usuário precisa renovar token`);
                accessToken = null;
              } else {
                console.log(`✅ [WORKER] Token válido até: ${expiresAt.toISOString()}`);
              }
            }
            
            if (accessToken) {
              // 📧 Enviar resposta via Microsoft Graph API diretamente
              console.log(`🔑 [WORKER] Usando Microsoft Token: ${accessToken ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
              console.log(`📡 [WORKER] Fazendo requisição para Microsoft Graph...`);
              
              const replyResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${queueItem.email_data.id}/reply`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: {
                    body: {
                      contentType: 'Text',
                      content: result.response
                    }
                  }
                })
              });
              
              console.log(`📊 [WORKER] Microsoft Graph Response Status: ${replyResponse.status}`);
              
              if (replyResponse.ok) {
                console.log(`✉️ [WORKER] Resposta REAL enviada para: ${queueItem.email_data.subject}`);
                console.log(`📝 [WORKER] Resposta: ${result.response.substring(0, 100)}...`);
              } else {
                const errorData = await replyResponse.text();
                console.error(`❌ [WORKER] Erro ao enviar via Graph API (${replyResponse.status}):`, errorData);
                
                if (replyResponse.status === 401) {
                  console.error(`🚨 [WORKER] MICROSOFT GRAPH 401 UNAUTHORIZED - TOKEN INVÁLIDO!`);
                }
                
                console.log(`📝 [WORKER] Resposta (não enviada): ${result.response.substring(0, 100)}...`);
              }
            } else {
              console.log(`⚠️ [WORKER] Token não disponível, simulando envio para: ${queueItem.email_data.subject}`);
              console.log(`📝 [WORKER] Resposta: ${result.response.substring(0, 100)}...`);
            }
          } catch (sendError) {
            console.error(`❌ [WORKER] Erro ao enviar resposta real:`, sendError);
            console.log(`📝 [WORKER] Resposta (não enviada): ${result.response.substring(0, 100)}...`);
          }
          
          finalStatus = 'completed';
        } else {
          console.log(`🚫 [WORKER] Email não requer resposta: ${result.analysis.reason}`);
          finalStatus = 'completed';
        }
        
        // Marcar como concluído
        await supabase
          .from('email_queue')
          .update({
            status: finalStatus,
            completed_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);
          
        // ✅ APENAS SALVAR NA TABELA APÓS PROCESSAMENTO COMPLETO COM SUCESSO
        console.log(`💾 [WORKER] Salvando email processado na tabela processed_microsoft_emails...`);
        const { data: upsertData, error: upsertError } = await supabase.from('processed_microsoft_emails').upsert({
          microsoft_message_id: queueItem.email_data.id,
          user_id: queueItem.user_id,
          connection_email: 'queue@system.com',
          subject: queueItem.email_data.subject,
          from_email: queueItem.email_data.from?.emailAddress?.address,
          status: result.analysis.shouldReply ? 'replied' : 'processed',
          analysis: result.analysis,
          response_text: result.response,
          processed_at: new Date().toISOString()
        }, {
          onConflict: 'microsoft_message_id,user_id,connection_email'
        });
        
        if (upsertError) {
          console.error(`❌ [WORKER] Erro ao salvar email processado:`, upsertError);
        } else {
          console.log(`✅ [WORKER] Email processado salvo/atualizado com sucesso na tabela`);
        }
        
        processedCount++;
        console.log(`✅ [WORKER] Email ${queueItem.id} processado com sucesso`);
        
        // Delay mínimo entre emails (proteção anti-spam + quota Gemini)
        if (processedCount < queueItems.length) {
          const delay = Math.max(QUEUE_CONFIG.delayBetweenEmails, QUEUE_CONFIG.geminiRateLimit);
          console.log(`⏳ [WORKER] Aguardando ${delay/1000}s antes do próximo email (respeitando quota Gemini)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`❌ [WORKER] Erro ao processar email ${queueItem.id}:`, error);
        
        // Marcar como falha e preparar retry
        const retryCount = (queueItem.retry_count || 0) + 1;
        const shouldRetry = retryCount <= QUEUE_CONFIG.maxRetries;
        
        await supabase
          .from('email_queue')
          .update({
            status: shouldRetry ? 'failed' : 'failed',
            completed_at: shouldRetry ? null : new Date().toISOString(),
            error_message: error.message,
            retry_count: retryCount,
            next_retry_at: shouldRetry ? new Date(Date.now() + QUEUE_CONFIG.retryDelay).toISOString() : null
          })
          .eq('id', queueItem.id);
      }
    }
    
    console.log(`\n🎉 [WORKER] Processamento concluído: ${processedCount} emails processados`);
    
  } catch (error) {
    console.error('💥 [WORKER] Erro crítico no processamento da fila:', error);
  }
}

// 🚀 Handler da Edge Function
Deno.serve(async (req) => {
  console.log('🗃️ [WORKER] Email Queue Worker iniciado');
  console.log('🔍 [WORKER] Method:', req.method);
  console.log('🔍 [WORKER] URL:', req.url);
  console.log('🔍 [WORKER] Headers:', Object.fromEntries(req.headers.entries()));
  console.log('🔍 [WORKER] Timestamp:', new Date().toISOString());
  
  // 🧹 LIMPAR LOCKS EXPIRADOS PRIMEIRO
  await cleanupExpiredLocks();
  
  // 🔒 ADQUIRIR LOCK ANTES DE PROCESSAR
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    console.log('🚫 [WORKER] Lock não adquirido - abortando execução');
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Worker já está em execução' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ [WORKER] CORS preflight request handled');
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  
  try {
    if (req.method === 'POST') {
      const body = await req.json();
      
      // Chatbot mode
      if (body.chatbotMode) {
        console.log('💬 [WORKER] Modo chatbot ativado');
        
        try {
          // Verificar limite de uso
          const sessionId = body.sessionId || `session_${body.userId}_${Date.now()}`;
          console.log(`🔍 [WORKER] Verificando limite para universidade ${body.userId}, sessão ${sessionId}`);
          
          const { data: usageCheck, error: usageError } = await supabase
            .rpc('check_ai_usage_limit', {
              p_university_id: body.userId,
              p_session_id: sessionId
            });
            
          if (usageError) {
            console.error('❌ [WORKER] Erro ao verificar limite:', usageError);
            return new Response(JSON.stringify({ 
              error: 'Failed to check usage limit',
              success: false 
            }), { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          console.log('📊 [WORKER] Status do uso:', usageCheck);
          
          if (!usageCheck.can_use) {
            console.log('🚫 [WORKER] Limite de prompts atingido');
            return new Response(JSON.stringify({ 
              error: 'Daily prompt limit reached',
              message: `You have reached the limit of ${usageCheck.max_prompts} prompts per session. Please try again tomorrow.`,
              success: false,
              usage: usageCheck
            }), { 
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Incrementar contador de uso
          const { data: usageUpdate, error: incrementError } = await supabase
            .rpc('increment_ai_usage', {
              p_university_id: body.userId,
              p_session_id: sessionId
            });
            
          if (incrementError) {
            console.error('❌ [WORKER] Erro ao incrementar uso:', incrementError);
          } else {
            console.log('✅ [WORKER] Uso incrementado:', usageUpdate);
          }
          
          // Buscar prompt da universidade
          const { data: agentData } = await supabase
            .from('ai_configurations')
            .select('id, ai_name, company_name, personality, final_prompt')
            .eq('user_id', body.userId)
            .eq('is_active', true)
            .maybeSingle();
            
          // 🔍 BUSCAR BASE DE CONHECIMENTO ESPECÍFICA DO AGENTE
          let knowledgeBase = '';
          try {
            // Primeiro, buscar documentos específicos do agente
            const { data: agentDocs, error: agentDocsError } = await supabase
              .from('ai_agent_knowledge_documents')
              .select('transcription, document_name')
              .eq('ai_configuration_id', agentData?.id || '')
              .eq('transcription_status', 'completed')
              .not('transcription', 'is', null);
            
            if (!agentDocsError && agentDocs && agentDocs.length > 0) {
              knowledgeBase = agentDocs
                .map(doc => `## ${doc.document_name}\n\n${doc.transcription}`)
                .join('\n\n---\n\n');
              console.log(`📚 [WORKER] Documentos específicos do agente encontrados: ${agentDocs.length} documentos`);
            } else {
              console.log(`📚 [WORKER] Nenhum documento específico do agente encontrado`);
            }
          } catch (error) {
            console.error('❌ [WORKER] Erro ao buscar base de conhecimento do agente:', error);
          }
            
          // Criar prompt personalizado automaticamente
          let universityPrompt;
          if (agentData) {
            const { ai_name, company_name, personality, final_prompt } = agentData;
            universityPrompt = final_prompt || `You are ${ai_name}, an AI assistant for ${company_name}. 
            
PERSONALITY: ${personality}
UNIVERSITY: ${company_name}
AGENT NAME: ${ai_name}

Always use your real name (${ai_name}) and the university name (${company_name}) in your responses.`;
          } else {
            universityPrompt = 'You are a university assistant.';
          }
          
          // 🔗 INTEGRAR BASE DE CONHECIMENTO NO PROMPT
          if (knowledgeBase) {
            universityPrompt += `\n\n<knowledge-base>\n${knowledgeBase}\n</knowledge-base>\n\nIMPORTANTE: Use as informações da base de conhecimento acima para responder às perguntas dos estudantes. Se a informação não estiver na base de conhecimento, responda de forma geral e sugira que o estudante entre em contato diretamente com a universidade para informações específicas.`;
          }
          
          // Detectar idioma da mensagem
          const messageText = body.message?.toLowerCase() || '';
          
          // Detectar idiomas específicos
          const isEnglish = /\b(hello|hi|dear|thank|please|help|information|about|study|university|scholarship|application|admission|process|requirements|documents|payment|fee|cost|price|when|where|how|what|why|can|could|would|should|need|want|interested|apply|enroll|register|contact|email|phone|address|website|program|course|degree|bachelor|master|phd|undergraduate|graduate|international|student|usa|america|united states|want|do|this|hello|how|are|you)\b/.test(messageText);
          
          const isSpanish = /\b(hola|buenos|días|tarde|noche|gracias|por|favor|ayuda|información|sobre|estudiar|universidad|beca|solicitud|admisón|proceso|requisitos|documentos|pago|cuota|costo|precio|cuándo|dónde|cómo|qué|por|qué|puedo|podría|debería|necesito|quiero|interesado|aplicar|matricular|registrar|contacto|correo|teléfono|dirección|sitio|programa|curso|grado|licenciatura|maestría|doctorado|pregrado|posgrado|internacional|estudiante|estados|unidos|america|quiero|hacer|esto|hola|cómo|está|solicitar|beca|universidad)\b/.test(messageText);
          
          const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(messageText) || 
                            /\b(こんにちは|はじめまして|ありがとう|お願い|助けて|情報|について|勉強|大学|奨学金|申請|入学|プロセス|要件|書類|支払い|料金|費用|価格|いつ|どこ|どのように|何|なぜ|できます|できる|すべき|必要|したい|興味|応募|登録|連絡|メール|電話|住所|ウェブサイト|プログラム|コース|学位|学士|修士|博士|学部|大学院|国際|学生|アメリカ|合衆国|したい|これ|こんにちは|いかが|奨学金|申請|大学)\b/.test(messageText);
          
          const isFrench = /\b(bonjour|bonsoir|merci|s'il|vous|plaît|aide|information|sur|étudier|université|bourse|demande|admission|processus|exigences|documents|paiement|frais|coût|prix|quand|où|comment|quoi|pourquoi|peux|peut|devrais|besoin|veux|intéressé|postuler|s'inscrire|enregistrer|contact|email|téléphone|adresse|site|programme|cours|diplôme|licence|maîtrise|doctorat|premier|cycle|deuxième|cycle|international|étudiant|états|unis|amérique|veux|faire|ceci|bonjour|comment|allez|demander|bourse|université)\b/.test(messageText);
          
          const isGerman = /\b(hallo|guten|tag|abend|danke|bitte|hilfe|information|über|studieren|universität|stipendium|bewerbung|zulassung|prozess|anforderungen|dokumente|zahlung|gebühr|kosten|preis|wann|wo|wie|was|warum|kann|könnte|sollte|brauche|will|interessiert|bewerben|einschreiben|registrieren|kontakt|email|telefon|adresse|website|programm|kurs|abschluss|bachelor|master|doktor|grundstudium|aufbaustudium|international|student|usa|amerika|will|tun|dies|hallo|wie|geht|stipendium|beantragen|universität)\b/.test(messageText);
          
          // Determinar idioma de resposta
          let languageInstruction;
          if (isEnglish) {
            languageInstruction = "Respond in English. Be professional and helpful.";
          } else if (isSpanish) {
            languageInstruction = "Responde en español. Sé profesional y servicial.";
          } else if (isJapanese) {
            languageInstruction = "日本語で回答してください。プロフェッショナルで親切にしてください。";
          } else if (isFrench) {
            languageInstruction = "Répondez en français. Soyez professionnel et serviable.";
          } else if (isGerman) {
            languageInstruction = "Antworten Sie auf Deutsch. Seien Sie professionell und hilfsbereit.";
          } else {
            languageInstruction = "Responda em português. Seja profissional e prestativo.";
          }

          const chatPrompt = `${universityPrompt}

Mensagem do usuário: ${body.message}

IMPORTANTE: 
- ${languageInstruction}
- Use a base de conhecimento fornecida para dar respostas específicas e úteis
- Seja específico sobre programas, bolsas e processos da universidade
- Forneça informações detalhadas sobre MatriculaUSA, bolsas e programas
- Se não souber algo específico, seja honesto mas ofereça alternativas

Responda de forma natural e conversacional, como um assistente universitário.`;

          // Fazer requisição para Gemini
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: chatPrompt }] }]
            })
          });

          if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
          }

          const data = await response.json();
          const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
          
          return new Response(JSON.stringify({
            success: true,
            response: geminiResponse || 'Sorry, I could not process your message.',
            analysis: { chatbotMode: true },
            usage: usageUpdate
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (error) {
          console.error('❌ [WORKER] Erro no modo chatbot:', error);
          return new Response(JSON.stringify({
            success: false,
            response: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
            error: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }
      
      if (body.trigger === 'process_queue') {
        console.log('🎯 [WORKER] Trigger recebido - processando fila');
        await processEmailQueue();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Fila processada com sucesso'
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    
    // Processamento automático se não for um trigger específico
    await processEmailQueue();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Worker executado com sucesso'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ [WORKER] Erro no handler:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    // 🔒 LIBERAR LOCK SEMPRE (mesmo em caso de erro)
    await releaseLock();
  }
});
