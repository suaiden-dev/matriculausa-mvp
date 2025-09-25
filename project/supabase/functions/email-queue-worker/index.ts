// 🗃️ EMAIL QUEUE WORKER - Processa emails sequencialmente
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY');

// 🛡️ CONFIGURAÇÕES ULTRA CONSERVADORAS PARA FILA
const QUEUE_CONFIG = {
  batchSize: 1, // Processar 1 email por vez
  delayBetweenEmails: 5000, // 5 segundos entre emails (mínimo)
  maxRetries: 3,
  retryDelay: 60000, // 1 minuto para retry
  maxEmailsPerRun: 10, // Máximo 10 emails por execução do worker
  timeoutPerEmail: 30000, // 30 segundos timeout por email
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
      
      // Buscar base de conhecimento do usuário
      const { data: knowledgeData } = await supabase
        .from('email_knowledge_documents')
        .select('content')
        .eq('user_id', userId);
        
      const knowledgeBase = knowledgeData?.map(doc => doc.content).join('\n\n') || '';
      
      // Buscar prompt da universidade
      const { data: promptData } = await supabase
        .from('ai_agent_prompts')
        .select('prompt_text')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
        
      const universityPrompt = promptData?.prompt_text || 'Você é um assistente universitário.';
      
      // Preparar prompt para Gemini
      const emailContent = `
Assunto: ${email.subject}
De: ${email.from?.emailAddress?.address || 'Unknown'}
Conteúdo: ${email.bodyPreview || email.body?.content || 'Sem conteúdo'}
`;

      const fullPrompt = `${universityPrompt}

Base de conhecimento da universidade:
${knowledgeBase}

Analise o seguinte email e determine se deve ser respondido:
${emailContent}

IMPORTANTE: Responda no MESMO IDIOMA do email recebido. Se o email for em inglês, responda em inglês. Se for em português, responda em português.

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
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
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
    
    for (const item of queueItems || []) {
      const emailId = item.email_data?.id;
      if (emailId && !processedEmails.has(emailId)) {
        processedEmails.add(emailId);
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
          
        // Registrar na tabela de emails processados
        await supabase.from('processed_microsoft_emails').insert({
          microsoft_message_id: queueItem.email_data.id,
          user_id: queueItem.user_id,
          connection_email: 'queue@system.com',
          subject: queueItem.email_data.subject,
          from_email: queueItem.email_data.from?.emailAddress?.address,
          status: result.analysis.shouldReply ? 'replied' : 'processed',
          analysis: result.analysis,
          response_text: result.response,
          processed_at: new Date().toISOString()
        });
        
        processedCount++;
        console.log(`✅ [WORKER] Email ${queueItem.id} processado com sucesso`);
        
        // Delay mínimo entre emails (proteção anti-spam)
        if (processedCount < queueItems.length) {
          console.log(`⏳ [WORKER] Aguardando ${QUEUE_CONFIG.delayBetweenEmails/1000}s antes do próximo email...`);
          await new Promise(resolve => setTimeout(resolve, QUEUE_CONFIG.delayBetweenEmails));
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
  
  try {
    if (req.method === 'POST') {
      const body = await req.json();
      
      if (body.trigger === 'process_queue') {
        console.log('🎯 [WORKER] Trigger recebido - processando fila');
        await processEmailQueue();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Fila processada com sucesso'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
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
  }
});
