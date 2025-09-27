import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
// Configuração do Microsoft Graph
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');
const MICROSOFT_TENANT_ID = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 🚨 MODO CONSERVADOR: Instância global do AIService para manter contadores
let globalAIService = null;
// Função para obter token usando Client Credentials (funciona 24/7)
async function getClientCredentialsToken() {
  try {
    console.log('🔄 Obtendo token usando Client Credentials...');
    const response = await fetch(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default'
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Client credentials error: ${errorData.error_description || errorData.error}`);
    }
    const tokenData = await response.json();
    console.log('✅ Token Client Credentials obtido com sucesso');
    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in
    };
  } catch (error) {
    console.error('❌ Erro ao obter token Client Credentials:', error);
    throw error;
  }
}
// Função para renovar token usando refresh token
async function refreshAccessToken(refreshToken) {
  try {
    console.log('🔄 Renovando access token...');
    // Verificar se é um refresh token válido
    if (!refreshToken || refreshToken === 'mock_refresh_token' || refreshToken === 'msal_token' || refreshToken.trim() === '') {
      console.log('⚠️ Refresh token inválido ou vazio, tentando Client Credentials...');
      // Fallback para Client Credentials
      return await getClientCredentialsToken();
    }
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: MICROSOFT_CLIENT_ID,
        scope: 'https://graph.microsoft.com/.default'
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao renovar token:', errorData);
      console.log('🔄 Tentando fallback para Client Credentials...');
      // Fallback para Client Credentials
      return await getClientCredentialsToken();
    }
    const data = await response.json();
    console.log('✅ Token renovado com sucesso');
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in
    };
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error);
    throw error;
  }
}
class MicrosoftGraphService {
  accessToken;
  constructor(accessToken){
    this.accessToken = accessToken;
  }
  async getEmails(sinceTimestamp) {
    try {
      console.log('GraphService - Buscando emails...');
      let filterQuery = '';
      if (sinceTimestamp) {
        const isoDate = sinceTimestamp.toISOString();
        filterQuery = `receivedDateTime ge ${isoDate}`;
      }
      const response = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }
      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error getting emails:', error);
      throw error;
    }
  }
  async sendReply(emailId, replyText, originalEmail) {
    try {
      console.log(`GraphService - Enviando resposta para email ${emailId}...`);
      // Extrair o remetente do email original
      const senderEmail = originalEmail.from?.emailAddress?.address || 'unknown@example.com';
      const replyData = {
        message: {
          subject: `Re: ${originalEmail.subject || 'Email'}`,
          body: {
            contentType: 'Text',
            content: replyText
          },
          toRecipients: [
            {
              emailAddress: {
                address: senderEmail
              }
            }
          ]
        }
      };
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}/reply`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(replyData)
      });
      if (!response.ok) {
        throw new Error(`Reply error: ${response.status}`);
      }
      console.log('GraphService - Resposta enviada com sucesso');
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  }
}
class AIService {
  apiKey;
  lastApiCall = 0;
  batchQueue = [];
  batchSize = 0; // DESABILITAR processamento em lote
  batchTimeout = 300000;
  emailCounts = new Map();
  lastEmailSent = 0;
  minIntervalBetweenEmails = 360000; // 🚨 6 minutos entre emails (era 5min)
  lastBatchProcessed = 0;
  dailyEmailCount = 0;
  rpm = 15; // 🛡️ ULTRA CONSERVADOR: 15 RPM (máximo seguro Microsoft)
  rpd = 300; // 🛡️ ULTRA CONSERVADOR: 300 emails/dia (muito seguro)
  maxEmailsPerHour = 15; // 🛡️ ULTRA CONSERVADOR: 15 emails/hora
  maxEmailsPerDay = 200; // 🛡️ ULTRA CONSERVADOR: 200 emails/dia
  burstLimit = 1; // 🛡️ ULTRA CONSERVADOR: Apenas 1 email por vez
  burstWindowMs = 4 * 60 * 1000; // 🛡️ Janela de 4 minutos para burst
  lastBurstTime = 0;
  burstCount = 0;
  
  // 🛡️ NOVAS PROTEÇÕES ULTRA CONSERVADORAS
  minDelayBetweenEmails = 3000; // 🛡️ Delay mínimo OBRIGATÓRIO: 3 segundos
  maxEmailsPerMinute = 5; // 🛡️ ULTRA SEGURO: Máximo 5 emails por minuto
  emergencyBrakeLimit = 3; // 🛡️ Se 3+ emails em 30s = PARAR TUDO
  minIntervalBetweenEmails = 240000; // 🛡️ 4 minutos entre emails (ultra seguro)
  
  constructor(apiKey){
    this.apiKey = apiKey;
  }
  async processEmail(email, userId) {
    try {
      console.log(`AIService - Processando email individual: ${email.subject}`);
      
      // Processar email individualmente (sem lote)
      return await this.processIndividualEmail(email, userId);
    } catch (error) {
      console.error('Error processing email:', error);
      const analysis = this.simpleEmailAnalysis(email);
      console.log('AIService - Retornando análise simples (erro):', analysis);
      return analysis;
    }
  }
  
  async processIndividualEmail(email, userId) {
    try {
      console.log(`AIService - Analisando email: ${email.subject} (${email.from?.emailAddress?.address})`);
      
  // 🚨 MODO CONSERVADOR: Verificar proteção anti-burst
  const now = Date.now();
  const burstCheck = this.checkBurstProtection(now);
  if (!burstCheck.allowed) {
    console.log(`🚨 AIService - Bloqueado por proteção anti-burst: ${burstCheck.reason}`);
    return this.simpleEmailAnalysis(email);
  }
  
  // 🚨 MODO CONSERVADOR: Verificar controles de segurança
  const safetyCheck = this.checkSafetyLimits(now);
  if (!safetyCheck.allowed) {
    console.log(`🚨 AIService - Bloqueado por segurança: ${safetyCheck.reason}`);
    return this.simpleEmailAnalysis(email);
  }
  
  // 🛡️ PROTEÇÃO DE EMERGÊNCIA: Bloqueio imediato se padrão suspeito
  const emergencyCheck = await this.checkEmergencyBrake(userId, now);
  if (!emergencyCheck.allowed) {
    console.log(`🚨 EMERGÊNCIA - Sistema bloqueado: ${emergencyCheck.reason}`);
    return {
      analysis: {
        shouldReply: false,
        priority: 'low',
        category: 'spam',
        confidence: 0.99,
        reason: `EMERGÊNCIA: ${emergencyCheck.reason}`
      },
      response: null
    };
  }

  // 🚨 MODO ULTRA CONSERVADOR: Verificação anti-spam via banco de dados
  const antiSpamCheck = await this.checkDatabaseRateLimits(userId, now);
  if (!antiSpamCheck.allowed) {
    console.log(`🚨 AIService - BLOQUEADO por anti-spam: ${antiSpamCheck.reason}`);
    return {
      analysis: {
        shouldReply: false,
        priority: 'low',
        category: 'spam',
        confidence: 0.9,
        reason: `Bloqueado por proteção anti-spam: ${antiSpamCheck.reason}`
      },
      response: null
    };
  }
      
      // Verificar rate limit da API
      if (this.lastApiCall && now - this.lastApiCall < (60000 / this.rpm)) {
        const waitTime = (60000 / this.rpm) - (now - this.lastApiCall);
        console.log(`AIService - Rate limit: aguardando ${Math.ceil(waitTime / 1000)}s antes de processar (baseado em ${this.rpm} RPM)`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
      
      if (!this.apiKey) {
        console.log('GEMINI_API_KEY não configurada, usando análise simples');
        return this.simpleEmailAnalysis(email);
      }
      
      // Buscar prompt personalizado da universidade
      let universityPrompt = null;
      if (userId) {
        try {
          const { data: promptData } = await supabase
            .from('email_prompts')
            .select('prompt')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();
          
          if (promptData?.prompt) {
            universityPrompt = promptData.prompt;
            console.log('✅ Prompt encontrado para universidade:', universityPrompt.substring(0, 50) + '...');
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar prompt da universidade:', error.message);
        }
      }
      
      // Buscar base de conhecimento de emails
      let emailKnowledge = '';
      if (userId) {
        try {
          const { data: knowledgeData } = await supabase
            .from('email_knowledge_documents')
            .select('content')
            .eq('user_id', userId)
            .eq('is_active', true);
          
          if (knowledgeData && knowledgeData.length > 0) {
            emailKnowledge = knowledgeData.map(doc => doc.content).join('\n\n');
            console.log(`📚 Base de conhecimento encontrada: ${knowledgeData.length} documentos para emails`);
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar base de conhecimento de emails:', error.message);
        }
      }
      
      // Criar prompt para email individual
      const basePrompt = universityPrompt || `
        Você é um assistente de IA especializado em ajudar estudantes brasileiros com o processo de admissão em universidades dos Estados Unidos através da MatriculaUSA.
        
        Analise o email recebido e determine:
        1. Se deve responder (shouldReply: true/false)
        2. Prioridade (high/medium/low)
        3. Categoria (scholarship/application/documents/payment/general)
        4. Confiança (0.0-1.0)
        5. Resposta apropriada (se shouldReply for true)
        
        Base de conhecimento: ${emailKnowledge}
        
        Email para análise:
        Assunto: ${email.subject}
        De: ${email.from?.emailAddress?.address}
        Conteúdo: ${email.bodyPreview || 'Nenhum conteúdo disponível'}
      `;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: basePrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });
      
      this.lastApiCall = Date.now();
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log('AIService - Rate limit atingido, usando análise simples');
          return this.simpleEmailAnalysis(email);
        }
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      let responseText = data.candidates[0].content.parts[0].text;
      
      console.log('🔍 Resposta bruta do Gemini:', JSON.stringify(responseText));
      console.log('🔍 Tamanho da resposta:', responseText.length);
      
      // Limpar markdown se presente
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        console.log('🔍 Após remover markdown:', JSON.stringify(responseText));
      }
      
      // Sanitizar JSON
      responseText = this.sanitizeGeminiJSON(responseText);
      console.log('🔍 Após sanitização:', JSON.stringify(responseText));
      
      let analysis;
      try {
        analysis = JSON.parse(responseText);
        // Se for array, pegar o primeiro item
        if (Array.isArray(analysis)) {
          analysis = analysis[0];
        }
      } catch (parseError) {
        console.error('Erro ao fazer parse do JSON do Gemini:', parseError);
        console.error('JSON problemático:', responseText);
        return this.simpleEmailAnalysis(email);
      }
      
      // Aplicar controles de segurança
      if (this.shouldReplyToEmail(email, analysis)) {
        // 🚨 MODO CONSERVADOR: Atualizar contadores de segurança
        this.updateIndividualEmailCounts();
        
        return {
          analysis: {
            shouldReply: analysis.shouldReply || false,
            priority: analysis.priority || 'medium',
            category: analysis.category || 'general',
            confidence: analysis.confidence || 0.5
          },
          response: analysis.response || null
        };
      } else {
        return {
          analysis: {
            shouldReply: false,
            priority: 'low',
            category: 'general',
            confidence: 0.9,
            reason: 'Filtrado por controles de segurança'
          },
          response: null
        };
      }
      
    } catch (error) {
      console.error('Error processing individual email:', error);
      return this.simpleEmailAnalysis(email);
    }
  }
  
  // 🚨 MODO CONSERVADOR: Proteção anti-burst
  checkBurstProtection(now) {
    // Reset burst count se passou da janela
    if (now - this.lastBurstTime > this.burstWindowMs) {
      this.burstCount = 0;
      this.lastBurstTime = now;
    }
    
    // Verificar se excedeu limite de burst
    if (this.burstCount >= this.burstLimit) {
      const remainingTime = Math.ceil((this.burstWindowMs - (now - this.lastBurstTime)) / 1000);
      return {
        allowed: false,
        reason: `Limite de burst atingido: ${this.burstLimit} emails em ${this.burstWindowMs/60000}min. Aguarde ${remainingTime}s`
      };
    }
    
    // Incrementar contador de burst
    this.burstCount++;
    
    return { allowed: true };
  }
  
  async processBatch() {
    if (this.batchQueue.length === 0) {
      return;
    }
    try {
      console.log(`AIService - Processando lote de ${this.batchQueue.length} emails`);
      // Verificar controles de segurança
      const now = Date.now();
      const canProcess = this.checkSafetyLimits(now);
      if (!canProcess.allowed) {
        console.log(`AIService - Bloqueado por segurança: ${canProcess.reason}`);
        return this.processBatchWithSimpleAnalysis();
      }
      // Verificar rate limit da API (baseado no RPM oficial)
      const minIntervalMs = 60 / this.rpm * 1000;
      if (this.lastApiCall && now - this.lastApiCall < minIntervalMs) {
        const waitTime = minIntervalMs - (now - this.lastApiCall);
        console.log(`AIService - Rate limit: aguardando ${Math.ceil(waitTime / 1000)}s antes de processar lote (baseado em ${this.rpm} RPM)`);
        await new Promise((resolve)=>setTimeout(resolve, waitTime));
      }
      if (!this.apiKey) {
        console.log('GEMINI_API_KEY não configurada, usando lógica simples para lote');
        return this.processBatchWithSimpleAnalysis();
      }
      // Buscar prompt personalizado da universidade (usar o primeiro userId do lote)
      const firstUserId = this.batchQueue[0]?.userId;
      let universityPrompt = null;
      if (firstUserId) {
        universityPrompt = await this.getUniversityPrompt(firstUserId);
        // Integrar base de conhecimento de emails
        const knowledgeBase = await this.getEmailKnowledgeBase(firstUserId);
        if (knowledgeBase) {
          universityPrompt = `${universityPrompt}\n\n<knowledge-base>\n${knowledgeBase}\n</knowledge-base>\n\nIMPORTANTE: Use as informações da base de conhecimento acima para responder às perguntas dos estudantes. Se a informação não estiver na base de conhecimento, responda de forma geral e sugira que o estudante entre em contato diretamente com a universidade para informações específicas.`;
        }
      }
      // Usar prompt personalizado ou genérico
      const basePrompt = universityPrompt || `
        Você é um assistente virtual especializado em admissões universitárias da Matrícula USA. Analise estes emails e gere respostas personalizadas e profissionais.
      `;
      // Criar prompt para processar múltiplos emails
      const batchPrompt = this.createBatchPrompt(basePrompt, this.batchQueue);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: batchPrompt
                }
              ]
            }
          ]
        })
      });
      // Atualizar timestamp da última chamada
      this.lastApiCall = Date.now();
      if (!response.ok) {
        if (response.status === 429) {
          console.log('AIService - Rate limit atingido, usando análise simples para lote');
          return this.processBatchWithSimpleAnalysis();
        }
        throw new Error(`Gemini API error: ${response.status}`);
      }
      const data = await response.json();
      // Extrair texto da resposta do Gemini
      let responseText = data.candidates[0].content.parts[0].text;
      
      // Log da resposta bruta do Gemini para debug
      console.log('🔍 Resposta bruta do Gemini:', JSON.stringify(responseText));
      console.log('🔍 Tamanho da resposta:', responseText.length);
      
      // Limpar markdown se presente
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        console.log('🔍 Após remover markdown:', JSON.stringify(responseText));
      }
      
      // Sanitizar JSON do Gemini de forma mais robusta
      responseText = this.sanitizeGeminiJSON(responseText);
      console.log('🔍 Após sanitização:', JSON.stringify(responseText));
      
      let batchResults;
      try {
        batchResults = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao fazer parse do JSON do Gemini:', parseError);
        console.error('JSON problemático (primeiros 500 chars):', responseText.substring(0, 500));
        console.error('JSON problemático (últimos 500 chars):', responseText.substring(Math.max(0, responseText.length - 500)));
        console.error('Tamanho total do JSON:', responseText.length);
        
        // Mostrar caracteres ao redor da posição do erro se disponível
        const errorMatch = parseError.message.match(/position (\d+)/);
        if (errorMatch) {
          const errorPos = parseInt(errorMatch[1]);
          const start = Math.max(0, errorPos - 20);
          const end = Math.min(responseText.length, errorPos + 20);
          console.error('Contexto do erro (posição', errorPos, '):', responseText.substring(start, end));
          console.error('Caractere problemático:', responseText[errorPos], '(código:', responseText.charCodeAt(errorPos), ')');
        }
        
        // Tentar múltiplas estratégias de correção
        let fixedJson = null;
        
        // Estratégia 1: Extrair JSON usando regex
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          try {
            const cleanedJson = this.cleanJsonString(jsonMatch[0]);
            batchResults = JSON.parse(cleanedJson);
            console.log('✅ JSON recuperado com sucesso usando regex');
            fixedJson = batchResults;
          } catch (secondError) {
            console.error('❌ Falha na segunda tentativa de parse:', secondError);
          }
        }
        
        // Estratégia 2: Tentar corrigir aspas problemáticas especificamente
        if (!fixedJson) {
          try {
            let correctedJson = responseText;
            
            // Corrigir aspas duplas dentro de strings de forma mais específica
            correctedJson = correctedJson.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, (match, p1, p2, p3) => {
              if (p2.includes('"') && !p2.includes('\\"')) {
                return `"${p1}${p2.replace(/"/g, '\\"')}${p3}":`;
              }
              return match;
            });
            
            // Corrigir aspas duplas em valores de string
            correctedJson = correctedJson.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, (match, p1, p2, p3) => {
              if (p2.includes('"') && !p2.includes('\\"')) {
                return `"${p1}${p2.replace(/"/g, '\\"')}${p3}":`;
              }
              return match;
            });
            
            batchResults = JSON.parse(correctedJson);
            console.log('✅ JSON corrigido com sucesso usando correção de aspas');
            fixedJson = batchResults;
          } catch (thirdError) {
            console.error('❌ Falha na terceira tentativa de parse:', thirdError);
          }
        }
        
        // Estratégia 3: Fallback para análise simples
        if (!fixedJson) {
          console.error('❌ Nenhum JSON válido encontrado na resposta, usando análise simples');
          return this.processBatchWithSimpleAnalysis();
        }
      }
      // Atualizar contadores de segurança
      this.updateEmailCounts();
      // Processar resultados do lote
      const processedResults = [];
      for(let i = 0; i < this.batchQueue.length; i++){
        const emailData = this.batchQueue[i];
        const result = Array.isArray(batchResults) ? batchResults[i] : batchResults; // Fallback se não houver resultado específico
        // Aplicar controles adicionais de segurança
        const shouldReply = this.shouldReplyToEmail(emailData.email, result);
        processedResults.push({
          email: emailData.email,
          result: {
            analysis: {
              shouldReply: shouldReply,
              priority: result?.priority || 'medium',
              category: result?.category || 'general',
              confidence: result?.confidence || 0.8
            },
            response: shouldReply ? result?.response || 'Resposta processada em lote' : null
          }
        });
      }
      // Limpar fila após processamento
      this.batchQueue = [];
      return processedResults;
    } catch (error) {
      console.error('Error processing batch with AI:', error);
      return this.processBatchWithSimpleAnalysis();
    }
  }
  createBatchPrompt(basePrompt, batchQueue) {
    const emailsText = batchQueue.map((item, index)=>`
EMAIL ${index + 1}:
- Assunto: ${item.email.subject}
- Remetente: ${item.email.from?.emailAddress?.address}
- Conteúdo: ${item.email.bodyPreview}
`).join('\n');
    return `${basePrompt}

PROCESSAR ESTES EMAILS EM LOTE:
${emailsText}

INSTRUÇÕES:
- Responda APENAS em JSON válido
- Para cada email, forneça uma resposta personalizada
- Use tom profissional adequado para email
- SEMPRE responda no mesmo idioma do email original

FORMATO JSON DE RESPOSTA:
[
  {
    "shouldReply": boolean,
    "priority": "high|medium|low", 
    "category": "application|documents|payment|scholarship|admission|general",
    "confidence": 0.0-1.0,
    "response": "Resposta personalizada para o email 1"
  },
  {
    "shouldReply": boolean,
    "priority": "high|medium|low", 
    "category": "application|documents|payment|scholarship|admission|general",
    "confidence": 0.0-1.0,
    "response": "Resposta personalizada para o email 2"
  }
  // ... para cada email no lote
]`;
  }
  processBatchWithSimpleAnalysis() {
    const results = [];
    for (const item of this.batchQueue){
      results.push({
        email: item.email,
        result: this.simpleEmailAnalysis(item.email)
      });
    }
    this.batchQueue = [];
    return results;
  }
  checkSafetyLimits(now) {
    // Verificar limite diário (baseado no RPD oficial)
    const dayKey = Math.floor(now / (24 * 60 * 60 * 1000));
    const dailyCount = this.emailCounts.get('daily') || {
      count: 0,
      lastReset: dayKey
    };
    if (dailyCount.lastReset !== dayKey) {
      dailyCount.count = 0;
      dailyCount.lastReset = dayKey;
    }
    if (dailyCount.count >= this.maxEmailsPerDay) {
      return {
        allowed: false,
        reason: `Limite diário de ${this.maxEmailsPerDay} emails atingido (baseado em ${this.rpd} RPD da API Gemini)`
      };
    }
    // Verificar intervalo mínimo entre emails (baseado no RPM oficial)
    const minIntervalMs = 60 / this.rpm * 1000; // Converte RPM para milissegundos
    if (this.lastEmailSent && now - this.lastEmailSent < minIntervalMs) {
      const remainingTime = Math.ceil((minIntervalMs - (now - this.lastEmailSent)) / 1000);
      return {
        allowed: false,
        reason: `Intervalo mínimo de ${60 / this.rpm}s não respeitado (baseado em ${this.rpm} RPM). Aguarde ${remainingTime}s`
      };
    }
    // Verificar limite de emails por hora (baseado no RPM)
    const hourKey = Math.floor(now / (60 * 60 * 1000));
    const currentCount = this.emailCounts.get('hourly') || {
      count: 0,
      lastReset: hourKey
    };
    if (currentCount.lastReset !== hourKey) {
      currentCount.count = 0;
      currentCount.lastReset = hourKey;
    }
    const maxHourly = Math.floor(this.rpm * 60 * 0.8); // 80% do limite teórico por hora
    if (currentCount.count >= maxHourly) {
      return {
        allowed: false,
        reason: `Limite de ${maxHourly} emails por hora atingido (baseado em ${this.rpm} RPM)`
      };
    }
    // Verificar intervalo mínimo entre lotes (baseado no RPM)
    if (this.lastBatchProcessed && now - this.lastBatchProcessed < this.batchTimeout) {
      const remainingTime = Math.ceil((this.batchTimeout - (now - this.lastBatchProcessed)) / 1000);
      return {
        allowed: false,
        reason: `Intervalo mínimo de ${this.batchTimeout / 1000}s entre lotes não respeitado. Aguarde ${remainingTime}s`
      };
    }
    // Verificar se há muitos emails do mesmo remetente
    const senderCounts = new Map();
    for (const item of this.batchQueue){
      const sender = item.email.from?.emailAddress?.address || 'unknown';
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
    }
    for (const [sender, count] of senderCounts){
      if (count > 1) {
        return {
          allowed: false,
          reason: `Máximo 1 email por remetente por lote. Remetente: ${sender}`
        };
      }
    }
    return {
      allowed: true
    };
  }
  updateEmailCounts() {
    const now = Date.now();
    const hourKey = Math.floor(now / (60 * 60 * 1000));
    const dayKey = Math.floor(now / (24 * 60 * 60 * 1000));
    // Atualizar contador por hora
    const currentCount = this.emailCounts.get('hourly') || {
      count: 0,
      lastReset: hourKey
    };
    if (currentCount.lastReset !== hourKey) {
      currentCount.count = 0;
      currentCount.lastReset = hourKey;
    }
    currentCount.count += this.batchQueue.length;
    this.emailCounts.set('hourly', currentCount);
    // Atualizar contador por dia
    const dailyCount = this.emailCounts.get('daily') || {
      count: 0,
      lastReset: dayKey
    };
    if (dailyCount.lastReset !== dayKey) {
      dailyCount.count = 0;
      dailyCount.lastReset = dayKey;
    }
    dailyCount.count += this.batchQueue.length;
    this.emailCounts.set('daily', dailyCount);
    this.lastEmailSent = now;
    this.lastBatchProcessed = now;
  }
  
  // 🚨 MODO CONSERVADOR: Atualizar contadores para processamento individual
  updateIndividualEmailCounts() {
    const now = Date.now();
    const hourKey = Math.floor(now / (60 * 60 * 1000));
    const dayKey = Math.floor(now / (24 * 60 * 60 * 1000));
    
    // Atualizar contador por hora
    const currentCount = this.emailCounts.get('hourly') || {
      count: 0,
      lastReset: hourKey
    };
    if (currentCount.lastReset !== hourKey) {
      currentCount.count = 0;
      currentCount.lastReset = hourKey;
    }
    currentCount.count += 1; // Processamento individual = 1 email
    this.emailCounts.set('hourly', currentCount);
    
    // Atualizar contador por dia
    const dailyCount = this.emailCounts.get('daily') || {
      count: 0,
      lastReset: dayKey
    };
    if (dailyCount.lastReset !== dayKey) {
      dailyCount.count = 0;
      dailyCount.lastReset = dayKey;
    }
    dailyCount.count += 1; // Processamento individual = 1 email
    this.emailCounts.set('daily', dailyCount);
    
    this.lastEmailSent = now;
  }
  
  // 🛡️ PROTEÇÃO DE EMERGÊNCIA: Freio de emergência ultra rápido
  async checkEmergencyBrake(userId, now) {
    try {
      console.log(`🚨 [EMERGÊNCIA] Verificando padrões suspeitos para usuário: ${userId}`);
      
      const thirtySecondsAgo = now - (30 * 1000);
      const oneMinuteAgo = now - (60 * 1000);
      
      // Buscar emails processados nos últimos 30 segundos
      const { data: recentEmails, error } = await supabase
        .from('processed_microsoft_emails')
        .select('processed_at, status')
        .eq('user_id', userId)
        .gte('processed_at', new Date(thirtySecondsAgo).toISOString())
        .order('processed_at', { ascending: false });
      
      if (error) {
        console.error('🚨 [EMERGÊNCIA] Erro ao verificar emails recentes:', error);
        return { allowed: true }; // Permitir se houver erro
      }
      
      const emailsLast30s = recentEmails?.length || 0;
      const emailsLast60s = recentEmails?.filter(e => 
        new Date(e.processed_at).getTime() >= oneMinuteAgo
      ).length || 0;
      
      console.log(`🚨 [EMERGÊNCIA] Emails processados: ${emailsLast30s} em 30s, ${emailsLast60s} em 60s`);
      
      // 🛡️ FREIO DE EMERGÊNCIA 1: Mais de 3 emails em 30 segundos
      if (emailsLast30s >= this.emergencyBrakeLimit) {
        return {
          allowed: false,
          reason: `PADRÃO SUSPEITO: ${emailsLast30s} emails em 30 segundos (limite: ${this.emergencyBrakeLimit})`
        };
      }
      
      // 🛡️ FREIO DE EMERGÊNCIA 2: Mais de 5 emails em 1 minuto
      if (emailsLast60s >= this.maxEmailsPerMinute) {
        return {
          allowed: false,
          reason: `VELOCIDADE SUSPEITA: ${emailsLast60s} emails em 1 minuto (limite: ${this.maxEmailsPerMinute})`
        };
      }
      
      // 🛡️ DELAY OBRIGATÓRIO: Sempre esperar 3 segundos entre emails
      if (recentEmails && recentEmails.length > 0) {
        const lastEmailTime = new Date(recentEmails[0].processed_at).getTime();
        const timeSinceLastEmail = now - lastEmailTime;
        
        if (timeSinceLastEmail < this.minDelayBetweenEmails) {
          const waitTime = Math.ceil((this.minDelayBetweenEmails - timeSinceLastEmail) / 1000);
          return {
            allowed: false,
            reason: `DELAY OBRIGATÓRIO: Aguarde ${waitTime}s (mínimo 3s entre emails)`
          };
        }
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.error('🚨 [EMERGÊNCIA] Erro crítico:', error);
      return { allowed: true }; // Permitir se houver erro crítico
    }
  }

  // 🚨 MODO ULTRA CONSERVADOR: Verificação anti-spam robusta via banco
  async checkDatabaseRateLimits(userId, now) {
    try {
      console.log(`🛡️ [ANTI-SPAM] Verificando limites para usuário: ${userId}`);
      
      const hourKey = Math.floor(now / (60 * 60 * 1000));
      const dayKey = Math.floor(now / (24 * 60 * 60 * 1000));
      const fiveMinKey = Math.floor(now / (5 * 60 * 1000));
      
      // Buscar ou criar registro do usuário
      let { data: limits, error } = await supabase
        .from('email_rate_limits')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Usuário não existe, criar registro
        console.log('🛡️ [ANTI-SPAM] Criando novo registro para usuário');
        const { data: newRecord, error: insertError } = await supabase
          .from('email_rate_limits')
          .insert({
            user_id: userId,
            hourly_count: 1,
            hourly_reset: hourKey,
            daily_count: 1,
            daily_reset: dayKey,
            last_email_sent: now,
            burst_count: 1,
            burst_reset: fiveMinKey
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('🛡️ [ANTI-SPAM] Erro ao criar registro:', insertError);
          return { allowed: true }; // Permitir se houver erro
        }
        
        return { allowed: true };
      }
      
      if (error) {
        console.error('🛡️ [ANTI-SPAM] Erro ao buscar limites:', error);
        return { allowed: true }; // Permitir se houver erro
      }
      
      // 🚨 VERIFICAÇÃO 1: Burst Protection (2 emails em 5 minutos)
      const burstLimit = 2;
      if (limits.burst_reset === fiveMinKey && limits.burst_count >= burstLimit) {
        return {
          allowed: false,
          reason: `Burst limit: ${limits.burst_count}/${burstLimit} emails em 5min`
        };
      }
      
      // 🚨 VERIFICAÇÃO 2: Limite por hora (8 emails/hora)
      if (limits.hourly_reset === hourKey && limits.hourly_count >= this.maxEmailsPerHour) {
        return {
          allowed: false,
          reason: `Limite horário: ${limits.hourly_count}/${this.maxEmailsPerHour} emails/hora`
        };
      }
      
      // 🚨 VERIFICAÇÃO 3: Limite diário (30 emails/dia)
      if (limits.daily_reset === dayKey && limits.daily_count >= this.maxEmailsPerDay) {
        return {
          allowed: false,
          reason: `Limite diário: ${limits.daily_count}/${this.maxEmailsPerDay} emails/dia`
        };
      }
      
      // 🚨 VERIFICAÇÃO 4: Intervalo mínimo (6 minutos entre emails)
      const minInterval = 6 * 60 * 1000; // 6 minutos
      if (limits.last_email_sent && (now - limits.last_email_sent) < minInterval) {
        const remainingTime = Math.ceil((minInterval - (now - limits.last_email_sent)) / 1000);
        return {
          allowed: false,
          reason: `Intervalo mínimo: aguarde ${remainingTime}s (6min entre emails)`
        };
      }
      
      // ✅ PASSOU EM TODAS AS VERIFICAÇÕES - ATUALIZAR CONTADORES
      const updateData = {
        // Resetar contadores se mudou a janela de tempo
        hourly_count: limits.hourly_reset === hourKey ? limits.hourly_count + 1 : 1,
        hourly_reset: hourKey,
        daily_count: limits.daily_reset === dayKey ? limits.daily_count + 1 : 1,
        daily_reset: dayKey,
        burst_count: limits.burst_reset === fiveMinKey ? limits.burst_count + 1 : 1,
        burst_reset: fiveMinKey,
        last_email_sent: now,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('email_rate_limits')
        .update(updateData)
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('🛡️ [ANTI-SPAM] Erro ao atualizar contadores:', updateError);
        return { allowed: true }; // Permitir se houver erro na atualização
      }
      
      console.log(`🛡️ [ANTI-SPAM] ✅ PERMITIDO - Contadores atualizados: burst=${updateData.burst_count}/2, hora=${updateData.hourly_count}/${this.maxEmailsPerHour}, dia=${updateData.daily_count}/${this.maxEmailsPerDay}`);
      return { allowed: true };
      
    } catch (error) {
      console.error('🛡️ [ANTI-SPAM] Erro crítico:', error);
      return { allowed: true }; // Permitir se houver erro crítico
    }
  }
  shouldReplyToEmail(email, result) {
    // Verificar se a IA recomendou não responder
    if (!result.shouldReply) {
      return false;
    }
    // Verificar se é email de sistema
    const fromAddress = email.from?.emailAddress?.address?.toLowerCase() || '';
    const systemPatterns = [
      'noreply',
      'no-reply',
      'donotreply',
      'do-not-reply',
      'postmaster',
      'mailer-daemon'
    ];
    const isSystemEmail = systemPatterns.some((pattern)=>fromAddress.includes(pattern));
    if (isSystemEmail) {
      console.log(`AIService - Email de sistema detectado, não respondendo: ${fromAddress}`);
      return false;
    }
    // Verificar se é resposta da própria IA (evitar loops)
    const subject = email.subject?.toLowerCase() || '';
    const aiResponsePatterns = [
      're: re:',
      're: re: re:',
      're: re: re: re:',
      're: re: re: re: re:',
      'fwd:',
      'fwd: fwd:',
      'fwd: fwd: fwd:'
    ];
    const isAiResponse = aiResponsePatterns.some((pattern)=>subject.includes(pattern));
    if (isAiResponse) {
      console.log(`AIService - Possível resposta da IA detectada, não respondendo: ${subject}`);
      return false;
    }
    
    // Verificar se o remetente é o próprio sistema (evitar auto-resposta)
    const systemEmails = [
      'vaynezada2025@outlook.com',
      'antoniocruzgomes880@gmail.com',
      'dev01@suaiden.com'
    ];
    const isFromSystem = systemEmails.some(systemEmail => 
      fromAddress.toLowerCase().includes(systemEmail.toLowerCase())
    );
    if (isFromSystem) {
      console.log(`🚫 AIService - Email do próprio sistema detectado, não respondendo: ${fromAddress}`);
      return false;
    }
    
    // Verificar se é uma resposta da IA (contém "Re: Re:" múltiplas vezes)
    const rePattern = /^(re:\s*){2,}/i;
    if (rePattern.test(subject)) {
      console.log(`🚫 AIService - Possível resposta da IA detectada (múltiplos Re:), não respondendo: ${subject}`);
      return false;
    }
    // Verificar confiança mínima
    if (result.confidence && result.confidence < 0.3) {
      console.log(`AIService - Confiança muito baixa (${result.confidence}), não respondendo`);
      return false;
    }
    return true;
  }
  /**
   * Busca o prompt personalizado da universidade do usuário
   */ async getUniversityPrompt(userId) {
    try {
      console.log(`Buscando prompt da universidade para usuário: ${userId}`);
      // Buscar university_id do usuário
      const { data: userProfile, error: profileError } = await supabase.from('user_profiles').select('university_id').eq('user_id', userId).single();
      if (profileError || !userProfile?.university_id) {
        console.log('Usuário não tem universidade associada ou perfil não encontrado');
        return null;
      }
      // Buscar configuração IA da universidade
      const { data: aiConfig, error: configError } = await supabase.from('ai_configurations').select('final_prompt, ai_name, company_name').eq('university_id', userProfile.university_id).eq('is_active', true).single();
      if (configError || !aiConfig?.final_prompt) {
        console.log('Universidade não tem agente IA configurado');
        return null;
      }
      console.log(`✅ Prompt encontrado para universidade: ${aiConfig.company_name}`);
      return aiConfig.final_prompt;
    } catch (error) {
      console.error('Erro ao buscar prompt da universidade:', error);
      return null;
    }
  }
  /**
   * Busca a base de conhecimento de emails da universidade
   */ async getEmailKnowledgeBase(userId) {
    try {
      console.log(`Buscando base de conhecimento de emails para usuário: ${userId}`);
      // Buscar university_id do usuário
      const { data: userProfile, error: profileError } = await supabase.from('user_profiles').select('university_id').eq('user_id', userId).single();
      if (profileError || !userProfile?.university_id) {
        console.log('Usuário não tem universidade associada ou perfil não encontrado');
        return null;
      }
      // Buscar documentos de conhecimento de emails transcritos
      const { data: knowledgeDocs, error: docsError } = await supabase
        .from('email_knowledge_documents')
        .select('transcription, document_name')
        .eq('university_id', userProfile.university_id)
        .eq('transcription_status', 'completed')
        .not('transcription', 'is', null);
      
      if (docsError || !knowledgeDocs || knowledgeDocs.length === 0) {
        console.log('Nenhum documento de conhecimento encontrado para a universidade');
        return null;
      }
      
      // Gerar conteúdo da base de conhecimento
      const knowledgeContent = knowledgeDocs
        .map(doc => `## ${doc.document_name}\n\n${doc.transcription}`)
        .join('\n\n---\n\n');
      
      console.log(`📚 Base de conhecimento encontrada: ${knowledgeDocs.length} documentos para universidade ${userProfile.university_id}`);
      
      return knowledgeContent;
    } catch (error) {
      console.error('Erro ao buscar base de conhecimento de emails:', error);
      return null;
    }
  }
  /**
   * Adapta o prompt do WhatsApp para contexto de email
   */ adaptPromptForEmail(whatsappPrompt, email) {
    try {
      // Adicionar contexto de email ao prompt
      const emailContext = `

<email-context>
Este é um email recebido que precisa de resposta. Adapte seu comportamento para comunicação por email:

EMAIL RECEBIDO:
- Assunto: ${email.subject}
- Remetente: ${email.from?.emailAddress?.address}
- Conteúdo: ${email.bodyPreview}

INSTRUÇÕES PARA EMAIL:
- Responda APENAS em JSON válido
- Use tom profissional adequado para email
- Seja específico e útil na resposta
- Inclua informações relevantes quando apropriado
- SEMPRE responda no mesmo idioma do email original
- Adapte as instruções do WhatsApp para contexto de email (não limite a duas frases, seja mais detalhado)

FORMATO JSON DE RESPOSTA:
{
  "shouldReply": boolean,
  "priority": "high|medium|low", 
  "category": "application|documents|payment|scholarship|admission|general",
  "confidence": 0.0-1.0,
  "response": "Resposta personalizada e útil em português ou inglês conforme o email original"
}
</email-context>`;
      // Combinar prompt original com contexto de email
      return whatsappPrompt + emailContext;
    } catch (error) {
      console.error('Erro ao adaptar prompt para email:', error);
      return whatsappPrompt; // Retornar prompt original em caso de erro
    }
  }
  simpleEmailAnalysis(email) {
    const startTime = Date.now();
    console.log(`AIService - Analisando email: ${email.subject} (${email.from?.emailAddress?.address})`);
    
    // Fallback para análise simples - mais inclusivo
    const subject = email.subject?.toLowerCase() || '';
    const content = email.bodyPreview?.toLowerCase() || '';
    const fromAddress = email.from?.emailAddress?.address?.toLowerCase() || '';
    
    // Detectar tipo de email
    let category = 'general';
    let shouldReply = true; // Por padrão, responder a todos os emails
    let response = null;
    
    // Verificação melhorada de emails de sistema (não responder)
    const systemPatterns = [
      'noreply', 'no-reply', 'donotreply', 'do-not-reply',
      'postmaster', 'mailer-daemon', 'automated', 'system',
      'notifications@', 'alerts@', 'support@', 'help@'
    ];
    
    // Domínios de sistema específicos (mais restritivo)
    const systemDomains = [
      'cursor.com', 'cursor.sh', 'link.com', 'github.com', 'google.com'
    ];
    
    // Detectar emails de boas-vindas, verificação, etc.
    const welcomePatterns = [
      'welcome', 'bem-vindo', 'verify', 'verifique', 'confirmation',
      'activate', 'activation', 'setup', 'getting started',
      'bem-vindo à sua nova conta', 'verify your email'
    ];
    
    // Verificar padrões de sistema no endereço ou assunto
    const isSystemEmail = systemPatterns.some((pattern) => 
      fromAddress.includes(pattern) || subject.includes(pattern)
    );
    
    // Verificar domínios de sistema (mais restritivo)
    const isSystemDomain = systemDomains.some((domain) => 
      fromAddress.includes(domain)
    );
    
    // Verificar emails de boas-vindas, verificação, etc.
    const isWelcomeEmail = welcomePatterns.some((pattern) => 
      subject.includes(pattern) || content.includes(pattern)
    );
    if (isSystemEmail || isSystemDomain || isWelcomeEmail) {
      const processingTime = Date.now() - startTime;
      console.log(`AIService - Email de sistema detectado em ${processingTime}ms: ${fromAddress} - ${subject}`);
      
      shouldReply = false;
      return {
        analysis: {
          shouldReply: false,
          priority: 'low',
          category: 'system',
          confidence: 0.95,
          reason: `Email de sistema detectado: ${isSystemEmail ? 'padrão de sistema' : 'email de boas-vindas'}`
        },
        response: null
      };
    }
    // Detectar categoria específica
    if (subject.includes('pergunta') || subject.includes('question') || content.includes('?')) {
      category = 'question';
      response = `Olá!\n\nObrigado pelo seu email. Recebemos sua pergunta e nossa equipe está analisando para fornecer uma resposta detalhada em breve.\n\nSe precisar de informações sobre documentos, pagamentos ou bolsas de estudo, posso ajudar!\n\nAtenciosamente,\nEquipe Matrícula USA`;
    } else if (subject.includes('document') || subject.includes('documento')) {
      category = 'documents';
      response = `Olá!\n\nObrigado pelo seu email sobre documentos. Para fazer upload de documentos, acesse sua conta no portal da Matrícula USA na seção "Documentos".\n\nSe precisar de ajuda, nossa equipe está disponível!\n\nAtenciosamente,\nEquipe Matrícula USA`;
    } else if (subject.includes('payment') || subject.includes('pagamento')) {
      category = 'payment';
      response = `Olá!\n\nObrigado pelo seu email sobre pagamento. Você pode fazer pagamentos através do portal da Matrícula USA na seção "Pagamentos".\n\nSe tiver problemas, entre em contato conosco!\n\nAtenciosamente,\nEquipe Matrícula USA`;
    } else if (subject.includes('application') || subject.includes('aplicação') || subject.includes('aplicacao')) {
      category = 'application';
      response = `Olá!\n\nObrigado pelo seu interesse em estudar nos Estados Unidos! Recebemos seu email sobre aplicação e nossa equipe está pronta para te ajudar com todo o processo.\n\nPara começar, acesse o portal da Matrícula USA e complete seu perfil. Se tiver dúvidas específicas, não hesite em nos contatar!\n\nAtenciosamente,\nEquipe Matrícula USA`;
    } else if (subject.includes('scholarship') || subject.includes('bolsa') || subject.includes('financiamento')) {
      category = 'scholarship';
      response = `Olá!\n\nObrigado pelo seu email sobre bolsas de estudo! Temos várias opções de financiamento disponíveis para estudantes brasileiros.\n\nAcesse nossa seção de bolsas no portal da Matrícula USA para ver as oportunidades disponíveis. Nossa equipe pode te ajudar a encontrar a melhor opção!\n\nAtenciosamente,\nEquipe Matrícula USA`;
    } else {
      // Resposta genérica para qualquer outro email
      category = 'general';
      // Detectar se é uma saudação simples
      if (subject.includes('oi') || subject.includes('olá') || subject.includes('hello') || content.includes('oi') || content.includes('olá') || content.includes('hello') || content.includes('como está') || content.includes('como vai') || content.includes('tudo bem')) {
        response = `Olá!\n\nObrigado pelo seu contato! Estamos muito bem e prontos para te ajudar com seu processo de admissão universitária nos Estados Unidos.\n\nSe você tem interesse em estudar nos EUA, posso te ajudar com:\n- Escolha de universidades\n- Processo de aplicação\n- Documentos necessários\n- Bolsas de estudo\n- Preparação para testes\n\nComo posso te ajudar hoje?\n\nAtenciosamente,\nEquipe Matrícula USA`;
      } else {
        response = `Olá!\n\nObrigado pelo seu contato com a Matrícula USA! Recebemos seu email e nossa equipe está pronta para te ajudar com seu processo de admissão universitária nos Estados Unidos.\n\nSe você tem dúvidas sobre:\n- Processo de aplicação\n- Documentos necessários\n- Bolsas de estudo\n- Pagamentos\n- Escolha de universidades\n\nNão hesite em nos contatar! Estamos aqui para te ajudar em cada etapa do processo.\n\nAtenciosamente,\nEquipe Matrícula USA`;
      }
    }
    return {
      analysis: {
        shouldReply,
        priority: shouldReply ? 'medium' : 'low',
        category,
        confidence: 0.7
      },
      response
    };
  }

  // Método para sanitizar JSON do Gemini
  sanitizeGeminiJSON(jsonString) {
    // Remover markdown se presente
    let cleaned = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Remover caracteres de controle problemáticos
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Garantir que seja um array válido
    if (!cleaned.startsWith('[')) {
      cleaned = '[' + cleaned;
    }
    if (!cleaned.endsWith(']')) {
      cleaned = cleaned + ']';
    }
    
    // Corrigir aspas duplas problemáticas dentro de strings de forma mais robusta
    // Usar uma abordagem mais específica para o problema identificado nos logs
    cleaned = this.fixJsonQuotes(cleaned);
    
    // Escapar quebras de linha em strings
    cleaned = cleaned.replace(/(?<=")[^"]*\n[^"]*(?=")/g, (match) => {
      return match.replace(/\n/g, '\\n');
    });
    
    return cleaned;
  }

  // Método específico para corrigir aspas duplas em JSON
  fixJsonQuotes(jsonString) {
    let fixed = jsonString;
    
    // Corrigir aspas duplas dentro de valores de string
    // Padrão: "response": "texto com "aspas" problemáticas"
    fixed = fixed.replace(/"response":\s*"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
      if (p2.includes('"') && !p2.includes('\\"')) {
        return `"response": "${p1}${p2.replace(/"/g, '\\"')}${p3}"`;
      }
      return match;
    });
    
    // Corrigir aspas duplas em outros campos de string
    fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)":\s*"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3, p4, p5, p6) => {
      let result = match;
      if (p2.includes('"') && !p2.includes('\\"')) {
        result = result.replace(p2, p2.replace(/"/g, '\\"'));
      }
      if (p5.includes('"') && !p5.includes('\\"')) {
        result = result.replace(p5, p5.replace(/"/g, '\\"'));
      }
      return result;
    });
    
    return fixed;
  }

  // 🚨 MODO CONSERVADOR: Delays balanceados para evitar spam e timeout
  calculateHumanDelay(analysis) {
    const { category, priority, confidence } = analysis;
    
    // 🛡️ ULTRA CONSERVADOR: Base delay ultra seguro (em SEGUNDOS)
    let baseDelay = 25; // 25 segundos base (ultra seguro)
    
    switch (category) {
      case 'application':
        baseDelay = 30; // 30 segundos (ultra seguro)
        break;
      case 'documents':
        baseDelay = 28; // 28 segundos
        break;
      case 'payment':
        baseDelay = 20; // 20 segundos (urgente mas seguro)
        break;
      case 'scholarship':
        baseDelay = 30; // 30 segundos (ultra seguro)
        break;
      case 'admission':
        baseDelay = 28; // 28 segundos
        break;
      case 'general':
        baseDelay = 22; // 22 segundos
        break;
      default:
        baseDelay = 25; // 25 segundos (padrão ultra seguro)
    }
    
    // 🛡️ RANDOMIZAÇÃO HUMANA: Adicionar variação aleatória
    const humanVariation = (Math.random() - 0.5) * 0.4; // ±20% variação
    baseDelay = baseDelay * (1 + humanVariation);
    
    // 🛡️ MICRO-DELAYS ALEATÓRIOS: Simular hesitação humana
    const microDelay = Math.random() * 3; // 0-3 segundos extras aleatórios
    baseDelay += microDelay;
    
    // Verificar pausa noturna (22h às 6h)
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 22 || hour < 6) {
      console.log('🌙 Pausa noturna ativa - não enviando emails');
      return -1; // Sinal para não enviar
    }
    
    // Verificar pausa de domingo
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) { // Domingo
      console.log('📅 Pausa de domingo ativa - não enviando emails');
      return -1; // Sinal para não enviar
    }
    
    // Ajustar por prioridade (mais conservador)
    if (priority === 'high') {
      baseDelay *= 0.8; // 20% mais rápido (era 30%)
    } else if (priority === 'low') {
      baseDelay *= 1.5; // 50% mais lento (era 30%)
    }
    
    // 🛡️ Ajustar por confiança (ultra conservador)
    if (confidence < 0.8) {
      baseDelay *= 1.2; // 20% mais tempo se baixa confiança
    }
    
    // 🛡️ ULTRA CONSERVADOR: Garantir delay mínimo ultra seguro
    const finalDelay = Math.max(20, baseDelay); // Mínimo 20 segundos SEMPRE
    const cappedDelay = Math.min(finalDelay, 30); // Máximo 30 segundos (Edge Function)
    
    console.log(`🛡️ Delay calculado: ${Math.round(cappedDelay)}s (categoria: ${category})`);
    return Math.round(cappedDelay); // Arredondar para segundos inteiros
  }

  // Método para limpar string JSON específica
  cleanJsonString(jsonString) {
    // Remover caracteres de controle
    let cleaned = jsonString.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Corrigir aspas mal escapadas de forma mais robusta
    // Primeiro, identificar e corrigir strings que contêm aspas não escapadas
    cleaned = cleaned.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, (match, p1, p2, p3) => {
      // Se encontrou aspas não escapadas dentro de uma string, escapar
      if (p2.includes('"') && !p2.includes('\\"')) {
        return `"${p1}${p2.replace(/"/g, '\\"')}${p3}":`;
      }
      return match;
    });
    
    // Corrigir aspas duplas dentro de valores de string
    cleaned = cleaned.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, (match, p1, p2, p3) => {
      if (p2.includes('"') && !p2.includes('\\"')) {
        return `"${p1}${p2.replace(/"/g, '\\"')}${p3}":`;
      }
      return match;
    });
    
    // Corrigir quebras de linha em strings
    cleaned = cleaned.replace(/(?<=")[^"]*\n[^"]*(?=")/g, (match) => {
      return match.replace(/\n/g, '\\n');
    });
    
    return cleaned;
  }
}
async function processUserEmails(config) {
  const startTime = Date.now();
  try {
    // Validar se user_id existe
    if (!config.userId) {
      throw new Error('user_id é obrigatório para processar emails');
    }
    console.log(`Processando emails para usuário: ${config.userId}`);
    if (!config.isActive) {
      console.log('Processamento desativado para este usuário');
      return;
    }
    // Renovar token se necessário
    let accessToken = config.accessToken;
    let refreshToken = config.refreshToken;
    try {
      // Tentar usar o token atual primeiro
      const testService = new MicrosoftGraphService(accessToken);
      await testService.getEmails();
      console.log('✅ Token atual ainda válido');
    } catch (error) {
      console.log('🔄 Token expirado, tentando renovar...');
      try {
        const newTokens = await refreshAccessToken(refreshToken);
        accessToken = newTokens.access_token;
        refreshToken = newTokens.refresh_token || refreshToken;
        // Atualizar tokens no banco
        await supabase.from('email_configurations').update({
          oauth_access_token: accessToken,
          oauth_refresh_token: refreshToken,
          updated_at: new Date().toISOString()
        }).eq('user_id', config.userId).eq('provider_type', 'microsoft');
        console.log('✅ Tokens renovados e salvos no banco');
      } catch (refreshError) {
        console.error('❌ Não foi possível renovar token:', refreshError.message);
        console.log('🔄 Tentando fallback para Client Credentials...');
        try {
          // Tentar Client Credentials como último recurso
          const clientCredentialsToken = await getClientCredentialsToken();
          accessToken = clientCredentialsToken.access_token;
          console.log('✅ Token Client Credentials obtido como fallback');
        } catch (clientError) {
          console.error('❌ Client Credentials também falhou:', clientError.message);
          // Desativar processamento para este usuário
          await supabase.from('email_configurations').update({
            is_active: false,
            updated_at: new Date().toISOString()
          }).eq('user_id', config.userId).eq('provider_type', 'microsoft');
          throw new Error(`Token expirado e não foi possível renovar. Processamento desativado para usuário ${config.userId}. Usuário precisa fazer login novamente.`);
        }
      }
    }
    const graphService = new MicrosoftGraphService(accessToken);
    
    // 🚨 MODO CONSERVADOR: Usar instância global do AIService
    if (!globalAIService) {
      globalAIService = new AIService(GEMINI_API_KEY);
      console.log('🔄 Criando nova instância global do AIService');
    }
    const aiService = globalAIService;
    // Buscar emails desde a última verificação
    const sinceTimestamp = config.lastProcessedEmailId ? new Date(Date.now() - 5 * 60 * 1000) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24 horas
    const emails = await graphService.getEmails(sinceTimestamp);
    console.log(`Encontrados ${emails.length} emails para processar`);
    // Buscar email da configuração de processamento
    const connectionEmail = config.emailAddress || `microsoft-user-${config.userId}`;
    console.log(`Email Microsoft conectado: ${connectionEmail}`);
    // Buscar emails já processados para este usuário
    const { data: processedEmails, error: processedError } = await supabase.from('processed_microsoft_emails').select('microsoft_message_id').eq('user_id', config.userId).eq('connection_email', connectionEmail);
    if (processedError) {
      console.error('Erro ao buscar emails processados:', processedError);
      throw processedError;
    }
    const processedMessageIds = new Set(processedEmails.map((pe)=>pe.microsoft_message_id));
    console.log(`Emails já processados: ${processedMessageIds.size}`);
    
    // Filtrar apenas emails não processados com log detalhado
    const newEmails = emails.filter((email)=>{
      const isAlreadyProcessed = processedMessageIds.has(email.id);
      if (isAlreadyProcessed) {
        console.log(`⏭️ Email já processado, pulando: ${email.subject} (${email.id})`);
        return false;
      }
      
      // 🚫 FILTRO DE SEGURANÇA: Não responder aos próprios emails
      const isFromOwnAI = email.from?.emailAddress?.address === connectionEmail;
      if (isFromOwnAI) {
        console.log(`🚫 Email da própria IA, pulando: ${email.subject} (${email.from?.emailAddress?.address})`);
        return false;
      }
      
      // 🚫 FILTRO: Não responder a emails com "Re:" que vêm da própria conta
      const isAutoReply = email.subject.toLowerCase().includes('re:') && 
                         email.from?.emailAddress?.address === connectionEmail;
      if (isAutoReply) {
        console.log(`🚫 Resposta automática, pulando: ${email.subject} (${email.from?.emailAddress?.address})`);
        return false;
      }
      
      // 🚫 FILTRO: Verificar se contém assinatura da IA
      const emailBody = email.body?.content || '';
      const hasAISignature = emailBody.includes('Equipe Matrícula USA') || 
                           emailBody.includes('Matrícula USA') ||
                           emailBody.includes('Atenciosamente');
      if (hasAISignature) {
        console.log(`🚫 Email com assinatura da IA, pulando: ${email.subject}`);
        return false;
      }
      
      // 🚫 FILTRO: Não processar emails com muitos "Re:" (loop infinito)
      const reCount = (email.subject.match(/re:/gi) || []).length;
      if (reCount > 3) {
        console.log(`🚫 Email com muitos "Re:" (${reCount}), pulando: ${email.subject}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`Emails novos para processar: ${newEmails.length}`);
    console.log(`DEBUG: Lista de emails encontrados:`, emails.map((e)=>({
        id: e.id,
        subject: e.subject,
        from: e.from?.emailAddress?.address
      })));
    console.log(`DEBUG: Emails já processados:`, Array.from(processedMessageIds));
    
    // 🕐 COOLDOWN: Verificar se passou tempo suficiente desde o último processamento
    const lastProcessed = await supabase
      .from('processed_microsoft_emails')
      .select('processed_at')
      .eq('user_id', config.userId)
      .order('processed_at', { ascending: false })
      .limit(1);
    
    if (lastProcessed.data && lastProcessed.data.length > 0) {
      const lastProcessedTime = new Date(lastProcessed.data[0].processed_at).getTime();
      const timeSinceLastProcess = Date.now() - lastProcessedTime;
      const cooldownTime = 5 * 60 * 1000; // 5 minutos
      
      if (timeSinceLastProcess < cooldownTime) {
        console.log(`⏳ Cooldown ativo, aguardando ${Math.floor((cooldownTime - timeSinceLastProcess) / 1000)}s antes de processar`);
        return {
          success: true,
          message: 'Cooldown ativo, processamento pausado',
          processedCount: 0,
          repliedCount: 0
        };
      }
    }
    let processedCount = 0;
    let repliedCount = 0;
    for (const email of newEmails){
      try {
        const emailStartTime = Date.now();
        console.log(`📧 Adicionando email à fila: ${email.subject} (${email.from?.emailAddress?.address})`);
        
        // 🗃️ ADICIONAR À FILA ao invés de processar diretamente
        const { data: queueItem, error: queueError } = await supabase
          .from('email_queue')
          .insert({
            user_id: config.userId,
            email_data: email,
            status: 'pending',
            priority: 3, // Prioridade alta para emails reais
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (queueError) {
          console.error('❌ Erro ao adicionar email à fila:', queueError);
          continue; // Pular este email e continuar com o próximo
        }
        
        console.log(`✅ Email real adicionado à fila com ID: ${queueItem.id}`);
        processedCount++;
        
        // 🚀 Trigger do worker para processar a fila (assíncrono)
        console.log('🚀 [POLLING] Chamando Email Queue Worker...');
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-queue-worker`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ trigger: 'process_queue' })
        })
        .then(response => {
          if (response.ok) {
            console.log('✅ [POLLING] Email Queue Worker chamado com sucesso');
          } else {
            console.error('❌ [POLLING] Erro ao chamar Email Queue Worker:', response.status, response.statusText);
          }
        })
        .catch(error => {
          console.error('❌ [POLLING] Erro ao chamar Email Queue Worker:', error);
        });
        
        
        // Atualizar último email processado (manter para compatibilidade)
        await supabase.from('email_configurations').update({
          last_processed_email_id: email.id
        }).eq('user_id', config.userId).eq('provider_type', 'microsoft');
      } catch (error) {
        console.error(`Erro ao processar email ${email.id}:`, error);
        // ❌ NÃO SALVAR EMAILS COM ERRO - Deixar para o worker processar
        console.log(`⚠️ Email ${email.id} com erro será reprocessado pelo worker`);
      }
    }
    // Atualizar contadores totais se houve processamento
    if (processedCount > 0 || repliedCount > 0) {
      // Buscar contadores atuais
      const { data: currentData } = await supabase.from('email_configurations').select('total_processed, total_replied').eq('user_id', config.userId).eq('provider_type', 'microsoft').single();
      const currentProcessed = currentData?.total_processed || 0;
      const currentReplied = currentData?.total_replied || 0;
      // Atualizar contadores
      await supabase.from('email_configurations').update({
        total_processed: currentProcessed + processedCount,
        total_replied: currentReplied + repliedCount,
        last_processing_date: new Date().toISOString()
      }).eq('user_id', config.userId).eq('provider_type', 'microsoft');
    }
    const totalProcessingTime = Date.now() - startTime;
    // 🚨 MODO CONSERVADOR: Métricas detalhadas de segurança
    const emailsPerMinute = Math.floor(processedCount/(totalProcessingTime/1000)*60);
    const emailsPerHour = emailsPerMinute * 60;
    const avgDelayPerEmail = processedCount > 0 ? Math.floor(totalProcessingTime/processedCount/1000) : 0;
    
    console.log(`✅ Processamento concluído: ${processedCount} emails processados, ${repliedCount} respostas enviadas`);
    console.log(`⏱️ Tempo total de processamento: ${Math.floor(totalProcessingTime/1000)}s`);
    console.log(`📊 Performance: ${emailsPerMinute} emails/min (${emailsPerHour} emails/hora projetado)`);
    console.log(`⚡ Delay médio por email: ${avgDelayPerEmail}s`);
    console.log(`🛡️ Taxa de resposta: ${processedCount > 0 ? Math.round((repliedCount/processedCount)*100) : 0}%`);
    console.log(`🚨 Status de segurança: ${emailsPerHour > 30 ? '⚠️ ALTO RISCO' : emailsPerHour > 15 ? '⚠️ MÉDIO RISCO' : '✅ BAIXO RISCO'}`);
    
    return {
      processedCount,
      repliedCount,
      lastProcessedEmailId: emails[0]?.id || config.lastProcessedEmailId,
      processingTimeMs: totalProcessingTime
    };
  } catch (error) {
    console.error('Erro no processamento de emails:', error);
    throw error;
  }
}
Deno.serve(async (req)=>{
  try {
    console.log('Edge Function iniciada - Microsoft Email Polling');
    // Verificar se é uma requisição de processamento de email individual
    if (req.method === 'POST') {
      const body = await req.json();
      if (body.email) {
        console.log('📧 Adicionando email à fila:', body.email.subject);
        
        try {
          // 🗃️ SISTEMA DE FILA: Adicionar email à fila ao invés de processar imediatamente
          const { data: queueItem, error: queueError } = await supabase
            .from('email_queue')
            .insert({
              user_id: body.user_id,
              email_data: body.email,
              status: 'pending',
              priority: 5, // Prioridade normal
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (queueError) {
            console.error('❌ Erro ao adicionar email à fila:', queueError);
            return new Response(JSON.stringify({
              success: false,
              error: 'Erro ao adicionar email à fila'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          console.log(`✅ Email adicionado à fila com ID: ${queueItem.id}`);
          
          // 🚀 Trigger do worker para processar a fila (assíncrono)
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-queue-worker`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trigger: 'process_queue' })
          }).catch(error => console.log('Worker trigger error (não crítico):', error));
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Email adicionado à fila de processamento',
            queue_id: queueItem.id,
            status: 'queued',
            analysis: {
              shouldReply: true, // Assumir que vai responder (será determinado pelo worker)
              category: 'queued',
              confidence: 1.0,
              reason: 'Email adicionado à fila de processamento'
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('❌ Erro no sistema de fila:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      // Processar ações específicas
      if (body.action) {
        console.log('🎯 Processando ação:', body.action);
        if (body.action === 'process_user_emails' && body.user_id) {
          // Buscar configuração do usuário específico
          const { data: config, error } = await supabase.from('email_configurations').select('*').eq('user_id', body.user_id).eq('provider_type', 'microsoft').eq('is_active', true).maybeSingle();
          if (error || !config) {
            return new Response(JSON.stringify({
              error: 'Configuração não encontrada ou inativa',
              message: error?.message || 'Usuário não tem configuração ativa'
            }), {
              status: 404,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          // Usar token fornecido se disponível
          if (body.access_token) {
            config.access_token = body.access_token;
          }
          const result = await processUserEmails(config);
          return new Response(JSON.stringify({
            success: true,
            message: 'Processamento concluído',
            result: {
              userId: config.user_id,
              ...result
            }
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        if (body.action === 'test_ai' && body.user_id) {
          // Teste da IA
          // 🚨 MODO CONSERVADOR: Usar instância global do AIService
          if (!globalAIService) {
            globalAIService = new AIService(GEMINI_API_KEY);
            console.log('🔄 Criando nova instância global do AIService para teste');
          }
          const aiService = globalAIService;
          const testEmail = {
            subject: 'Teste da IA',
            body: 'Este é um email de teste para verificar se a IA está funcionando.',
            from: {
              emailAddress: {
                address: 'test@example.com'
              }
            }
          };
          const result = await aiService.processEmail(testEmail, body.user_id);
          return new Response(JSON.stringify({
            success: true,
            message: 'Teste da IA concluído',
            analysis: result.analysis,
            response: result.response
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        if (body.action === 'get_processed_emails' && body.user_id) {
          // Buscar emails processados para o usuário
          const { data: processedEmails, error } = await supabase.from('processed_microsoft_emails').select('microsoft_message_id, status, processed_at').eq('user_id', body.user_id).order('processed_at', {
            ascending: false
          }).limit(1000); // Limitar para performance
          if (error) {
            throw new Error(`Erro ao buscar emails processados: ${error.message}`);
          }
          return new Response(JSON.stringify({
            success: true,
            processed_emails: processedEmails || []
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        if (body.action === 'process_batch' && body.emails && body.user_id) {
          // Processar lote de emails
          // 🚨 MODO CONSERVADOR: Usar instância global do AIService
          if (!globalAIService) {
            globalAIService = new AIService(GEMINI_API_KEY);
            console.log('🔄 Criando nova instância global do AIService para processamento em lote');
          }
          const aiService = globalAIService;
          const results = [];
          for (const emailData of body.emails){
            try {
              const result = await aiService.processEmail(emailData, body.user_id);
              results.push({
                analysis: result.analysis,
                response: result.response
              });
            } catch (error) {
              console.error(`Erro ao processar email ${emailData.id}:`, error);
              results.push({
                analysis: {
                  shouldReply: false,
                  priority: 'low',
                  category: 'general',
                  confidence: 0
                },
                response: null
              });
            }
          }
          return new Response(JSON.stringify({
            success: true,
            message: `Lote de ${body.emails.length} emails processado`,
            results: results
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        if (body.action === 'save_processed_email') {
          // Validar parâmetros obrigatórios
          if (!body.user_id) {
            throw new Error('user_id é obrigatório para salvar email processado');
          }
          if (!body.microsoft_message_id) {
            throw new Error('microsoft_message_id é obrigatório para salvar email processado');
          }
          console.log('🔍 DEBUG save_processed_email - user_id:', body.user_id);
          console.log('🔍 DEBUG save_processed_email - microsoft_message_id:', body.microsoft_message_id);
          console.log('🔍 DEBUG save_processed_email - connection_email:', body.connection_email);
          // Salvar email processado no banco
          const { data, error } = await supabase.from('processed_microsoft_emails').upsert({
            microsoft_message_id: body.microsoft_message_id,
            user_id: body.user_id,
            connection_email: body.connection_email,
            subject: body.subject,
            from_email: body.from_email,
            status: body.status,
            analysis: body.analysis,
            response_text: body.response_text,
            original_email_content: body.original_email_content,
            error_message: body.error_message,
            processed_at: new Date().toISOString()
          }, {
            onConflict: 'microsoft_message_id,user_id,connection_email'
          });
          if (error) {
            throw new Error(`Erro ao salvar email processado: ${error.message}`);
          }
          return new Response(JSON.stringify({
            success: true,
            message: 'Email processado salvo com sucesso'
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      }
      // Endpoints para integração com servidor local
      if (body.action === 'get_user_email' && body.user_id) {
        console.log('🔍 DEBUG get_user_email - body.user_id:', body.user_id);
        // Buscar email do usuário da configuração
        const { data: config, error } = await supabase.from('email_configurations').select('email_address').eq('user_id', body.user_id).eq('provider_type', 'microsoft').eq('is_active', true).limit(1).maybeSingle();
        if (error) {
          throw new Error(`Erro ao buscar email do usuário: ${error.message}`);
        }
        return new Response(JSON.stringify({
          success: true,
          email_address: config?.email_address || `microsoft-user-${body.user_id}`
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // Buscar configurações de usuários ativos
    const { data: configs, error } = await supabase.from('email_configurations').select('*').eq('provider_type', 'microsoft').eq('is_active', true);
    if (error) {
      throw new Error(`Erro ao buscar configurações: ${error.message}`);
    }
    if (!configs || configs.length === 0) {
      console.log('Nenhuma configuração ativa encontrada');
      return new Response(JSON.stringify({
        message: 'Nenhuma configuração ativa'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Processando ${configs.length} usuários ativos`);
    // Debug: verificar se há configurações com user_id undefined
    configs.forEach((config, index)=>{
      console.log(`Config ${index}: user_id=${config.user_id}, is_active=${config.is_active}`);
      if (!config.user_id) {
        console.error(`❌ Configuração ${index} tem user_id undefined/null:`, config);
      }
    });
    const results = [];
    for (const config of configs){
      try {
        // Pular configurações com user_id inválido
        if (!config.user_id) {
          console.error(`❌ Pulando configuração com user_id inválido:`, config);
          results.push({
            userId: config.user_id,
            error: 'user_id inválido ou ausente'
          });
          continue;
        }
        // Mapear campos do banco para a interface
        const mappedConfig = {
          userId: config.user_id,
          accessToken: config.oauth_access_token,
          refreshToken: config.oauth_refresh_token,
          isActive: config.is_active,
          emailAddress: config.email_address,
          lastProcessedEmailId: config.last_processed_email_id
        };
        const result = await processUserEmails(mappedConfig);
        results.push({
          userId: config.user_id,
          ...result
        });
      } catch (error) {
        console.error(`Erro ao processar usuário ${config.user_id}:`, error);
        results.push({
          userId: config.user_id,
          error: error.message
        });
      }
    }
    return new Response(JSON.stringify({
      message: 'Processamento concluído',
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erro na Edge Function:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
