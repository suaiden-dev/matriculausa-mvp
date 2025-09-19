import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Configuração do Microsoft Graph
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');
const MICROSOFT_TENANT_ID = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmailProcessingConfig {
  userId: string;
  accessToken: string;
  refreshToken: string;
  lastProcessedEmailId?: string;
  isActive: boolean;
  emailAddress?: string;
}

// Função para obter token usando Client Credentials (funciona 24/7)
async function getClientCredentialsToken(): Promise<{ access_token: string; expires_in: number }> {
  try {
    console.log('🔄 Obtendo token usando Client Credentials...');
    
    const response = await fetch(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  try {
    console.log('🔄 Renovando access token...');
    
    // Verificar se é um refresh token válido
    if (!refreshToken || refreshToken === 'mock_refresh_token') {
      throw new Error('Refresh token inválido ou mock. Usuário precisa fazer login novamente.');
    }
    
    // Se é um token MSAL, não precisa renovar (MSAL gerencia automaticamente)
    if (refreshToken === 'msal_token') {
      throw new Error('MSAL_TOKEN_PLACEHOLDER'); // Indica que é token MSAL
    }
    
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
      throw new Error(`Erro ao renovar token: ${response.status} - ${errorData.error_description || errorData.error}`);
    }

    const data = await response.json();
    console.log('✅ Token renovado com sucesso');
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Manter o refresh token se não vier novo
      expires_in: data.expires_in
    };
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error);
    throw error;
  }
}

class MicrosoftGraphService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getEmails(sinceTimestamp?: Date) {
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
          'Content-Type': 'application/json',
        },
        method: 'GET',
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

  async sendReply(emailId: string, replyText: string, originalEmail: any) {
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
          'Content-Type': 'application/json',
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
          private apiKey: string;
          private lastApiCall: number = 0;
          private batchQueue: any[] = [];
          private batchSize: number = 1; // 1 email por lote (baseado nos limites reais)
          private batchTimeout: number = 300000; // 5 minutos entre lotes - EVITA SPAM E SOBRECARGA
          private emailCounts: Map<string, { count: number; lastReset: number }> = new Map();
          private lastEmailSent: number = 0;
          private maxEmailsPerHour: number = 12; // Máximo 12 emails por hora (1 a cada 5 minutos) - MUITO CONSERVADOR
          private minIntervalBetweenEmails: number = 300000; // 5 minutos entre emails - EVITA SPAM
          private lastBatchProcessed: number = 0;
          private dailyEmailCount: number = 0;
          private maxEmailsPerDay: number = 50; // Máximo 50 emails por dia - MUITO CONSERVADOR PARA EVITAR SPAM
          private rpm: number = 15; // Requests por minuto (Gemini 2.0 Flash Experimental - nível gratuito)
          private rpd: number = 1500; // Requests por dia (Gemini 2.0 Flash Experimental - nível gratuito)

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processEmail(email: any, userId?: string) {
    try {
      console.log(`AIService - Adicionando email ao lote: ${email.subject}`);
      
      // Adicionar email à fila de lotes
      this.batchQueue.push({ email, userId, timestamp: Date.now() });
      
      // Se a fila atingiu o tamanho do lote, processar imediatamente
      if (this.batchQueue.length >= this.batchSize) {
        return await this.processBatch();
      }
      
      // Se é o primeiro email da fila, agendar processamento após timeout
      if (this.batchQueue.length === 1) {
        setTimeout(() => this.processBatch(), this.batchTimeout);
      }
      
      // Retornar análise simples imediatamente para não bloquear
      return this.simpleEmailAnalysis(email);
      
    } catch (error) {
      console.error('Error processing email:', error);
      return this.simpleEmailAnalysis(email);
    }
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
              const minIntervalMs = (60 / this.rpm) * 1000;
              if (this.lastApiCall && (now - this.lastApiCall) < minIntervalMs) {
                const waitTime = minIntervalMs - (now - this.lastApiCall);
                console.log(`AIService - Rate limit: aguardando ${Math.ceil(waitTime/1000)}s antes de processar lote (baseado em ${this.rpm} RPM)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
      
      if (!this.apiKey) {
        console.log('GEMINI_API_KEY não configurada, usando lógica simples para lote');
        return this.processBatchWithSimpleAnalysis();
      }

      // Buscar prompt personalizado da universidade (usar o primeiro userId do lote)
      const firstUserId = this.batchQueue[0]?.userId;
      let universityPrompt: string | null = null;
      if (firstUserId) {
        universityPrompt = await this.getUniversityPrompt(firstUserId);
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: batchPrompt
            }]
          }]
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
      
      // Limpar markdown se presente
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      }
      
      const batchResults = JSON.parse(responseText);
      
      // Atualizar contadores de segurança
      this.updateEmailCounts();
      
      // Processar resultados do lote
      const processedResults: any[] = [];
      for (let i = 0; i < this.batchQueue.length; i++) {
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
            response: shouldReply ? (result?.response || 'Resposta processada em lote') : null
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

  createBatchPrompt(basePrompt: string, batchQueue: any[]): string {
    const emailsText = batchQueue.map((item, index) => `
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
    const results: any[] = [];
    for (const item of this.batchQueue) {
      results.push({
        email: item.email,
        result: this.simpleEmailAnalysis(item.email)
      });
    }
    this.batchQueue = [];
    return results;
  }

          checkSafetyLimits(now: number): { allowed: boolean; reason?: string } {
            // Verificar limite diário (baseado no RPD oficial)
            const dayKey = Math.floor(now / (24 * 60 * 60 * 1000));
            const dailyCount = this.emailCounts.get('daily') || { count: 0, lastReset: dayKey };
            
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
            const minIntervalMs = (60 / this.rpm) * 1000; // Converte RPM para milissegundos
            if (this.lastEmailSent && (now - this.lastEmailSent) < minIntervalMs) {
              const remainingTime = Math.ceil((minIntervalMs - (now - this.lastEmailSent)) / 1000);
              return { 
                allowed: false, 
                reason: `Intervalo mínimo de ${60/this.rpm}s não respeitado (baseado em ${this.rpm} RPM). Aguarde ${remainingTime}s` 
              };
            }

            // Verificar limite de emails por hora (baseado no RPM)
            const hourKey = Math.floor(now / (60 * 60 * 1000));
            const currentCount = this.emailCounts.get('hourly') || { count: 0, lastReset: hourKey };
            
            if (currentCount.lastReset !== hourKey) {
              currentCount.count = 0;
              currentCount.lastReset = hourKey;
            }

            const maxHourly = Math.floor((this.rpm * 60) * 0.8); // 80% do limite teórico por hora
            if (currentCount.count >= maxHourly) {
              return { 
                allowed: false, 
                reason: `Limite de ${maxHourly} emails por hora atingido (baseado em ${this.rpm} RPM)` 
              };
            }

            // Verificar intervalo mínimo entre lotes (baseado no RPM)
            if (this.lastBatchProcessed && (now - this.lastBatchProcessed) < this.batchTimeout) {
              const remainingTime = Math.ceil((this.batchTimeout - (now - this.lastBatchProcessed)) / 1000);
              return { 
                allowed: false, 
                reason: `Intervalo mínimo de ${this.batchTimeout/1000}s entre lotes não respeitado. Aguarde ${remainingTime}s` 
              };
            }

            // Verificar se há muitos emails do mesmo remetente
            const senderCounts = new Map<string, number>();
            for (const item of this.batchQueue) {
              const sender = item.email.from?.emailAddress?.address || 'unknown';
              senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
            }

            for (const [sender, count] of senderCounts) {
              if (count > 1) {
                return { 
                  allowed: false, 
                  reason: `Máximo 1 email por remetente por lote. Remetente: ${sender}` 
                };
              }
            }

            return { allowed: true };
          }

  updateEmailCounts() {
    const now = Date.now();
    const hourKey = Math.floor(now / (60 * 60 * 1000));
    const dayKey = Math.floor(now / (24 * 60 * 60 * 1000));
    
    // Atualizar contador por hora
    const currentCount = this.emailCounts.get('hourly') || { count: 0, lastReset: hourKey };
    if (currentCount.lastReset !== hourKey) {
      currentCount.count = 0;
      currentCount.lastReset = hourKey;
    }
    currentCount.count += this.batchQueue.length;
    this.emailCounts.set('hourly', currentCount);
    
    // Atualizar contador por dia
    const dailyCount = this.emailCounts.get('daily') || { count: 0, lastReset: dayKey };
    if (dailyCount.lastReset !== dayKey) {
      dailyCount.count = 0;
      dailyCount.lastReset = dayKey;
    }
    dailyCount.count += this.batchQueue.length;
    this.emailCounts.set('daily', dailyCount);
    
    this.lastEmailSent = now;
    this.lastBatchProcessed = now;
  }

  shouldReplyToEmail(email: any, result: any): boolean {
    // Verificar se a IA recomendou não responder
    if (!result.shouldReply) {
      return false;
    }

    // Verificar se é email de sistema
    const fromAddress = email.from?.emailAddress?.address?.toLowerCase() || '';
    const systemPatterns = ['noreply', 'no-reply', 'donotreply', 'do-not-reply', 'postmaster', 'mailer-daemon'];
    const isSystemEmail = systemPatterns.some(pattern => fromAddress.includes(pattern));
    
    if (isSystemEmail) {
      console.log(`AIService - Email de sistema detectado, não respondendo: ${fromAddress}`);
      return false;
    }

    // Verificar se é resposta da própria IA (evitar loops)
    const subject = email.subject?.toLowerCase() || '';
    const aiResponsePatterns = [
      're: re:', 're: re: re:', 're: re: re: re:', 're: re: re: re: re:',
      'fwd:', 'fwd: fwd:', 'fwd: fwd: fwd:'
    ];
    
    const isAiResponse = aiResponsePatterns.some(pattern => subject.includes(pattern));
    if (isAiResponse) {
      console.log(`AIService - Possível resposta da IA detectada, não respondendo: ${subject}`);
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
   */
  async getUniversityPrompt(userId: string): Promise<string | null> {
    try {
      console.log(`Buscando prompt da universidade para usuário: ${userId}`);
      
      // Buscar university_id do usuário
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('university_id')
        .eq('user_id', userId)
        .single();

      if (profileError || !userProfile?.university_id) {
        console.log('Usuário não tem universidade associada ou perfil não encontrado');
        return null;
      }

      // Buscar configuração IA da universidade
      const { data: aiConfig, error: configError } = await supabase
        .from('ai_configurations')
        .select('final_prompt, ai_name, company_name')
        .eq('university_id', userProfile.university_id)
        .eq('is_active', true)
        .single();

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
   * Adapta o prompt do WhatsApp para contexto de email
   */
  adaptPromptForEmail(whatsappPrompt: string, email: any): string {
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

  private simpleEmailAnalysis(email: any) {
    // Fallback para análise simples - mais inclusivo
    const subject = email.subject?.toLowerCase() || '';
    const content = email.bodyPreview?.toLowerCase() || '';
    const fromAddress = email.from?.emailAddress?.address?.toLowerCase() || '';
    
    // Detectar tipo de email
    let category = 'general';
    let shouldReply = true; // Por padrão, responder a todos os emails
    let response: string | null = null;
    
    // Verificar se é email de sistema (não responder)
    const systemPatterns = ['noreply', 'no-reply', 'donotreply', 'do-not-reply', 'postmaster', 'mailer-daemon'];
    const isSystemEmail = systemPatterns.some(pattern => fromAddress.includes(pattern));
    
    if (isSystemEmail) {
      shouldReply = false;
      return {
        analysis: {
          shouldReply: false,
          priority: 'low',
          category: 'system',
          confidence: 0.9
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
      if (subject.includes('oi') || subject.includes('olá') || subject.includes('hello') || 
          content.includes('oi') || content.includes('olá') || content.includes('hello') ||
          content.includes('como está') || content.includes('como vai') || content.includes('tudo bem')) {
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
}

async function processUserEmails(config: EmailProcessingConfig) {
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
        refreshToken = newTokens.refresh_token;
        
        // Atualizar tokens no banco
        await supabase
          .from('email_processing_configs')
          .update({ 
            access_token: accessToken,
            refresh_token: refreshToken,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', config.userId);
        
        console.log('✅ Tokens renovados e salvos no banco');
      } catch (refreshError) {
        console.error('❌ Não foi possível renovar token:', refreshError.message);
        
        // Se é token MSAL, não desativar (MSAL gerencia automaticamente)
        if (refreshError.message === 'MSAL_TOKEN_PLACEHOLDER') {
          console.log('ℹ️ Token MSAL detectado. MSAL gerencia tokens automaticamente.');
          throw new Error('MSAL_TOKEN_EXPIRED'); // Indica que token MSAL expirou
        }
        
        // Desativar processamento para este usuário
        await supabase
          .from('email_processing_configs')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', config.userId);
        
        throw new Error(`Token expirado e não foi possível renovar. Processamento desativado para usuário ${config.userId}. Usuário precisa fazer login novamente.`);
      }
    }

    const graphService = new MicrosoftGraphService(accessToken);
    const aiService = new AIService(GEMINI_API_KEY);

    // Buscar emails desde a última verificação
    const sinceTimestamp = config.lastProcessedEmailId ? 
      new Date(Date.now() - 5 * 60 * 1000) : // Últimos 5 minutos
      new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24 horas

    const emails = await graphService.getEmails(sinceTimestamp);
    console.log(`Encontrados ${emails.length} emails para processar`);

    // Buscar email da configuração de processamento
    const connectionEmail = config.emailAddress || `microsoft-user-${config.userId}`;
    console.log(`Email Microsoft conectado: ${connectionEmail}`);

    // Buscar emails já processados para este usuário
    const { data: processedEmails, error: processedError } = await supabase
      .from('processed_microsoft_emails')
      .select('microsoft_message_id')
      .eq('user_id', config.userId)
      .eq('connection_email', connectionEmail);

    if (processedError) {
      console.error('Erro ao buscar emails processados:', processedError);
      throw processedError;
    }

    const processedMessageIds = new Set(processedEmails.map(pe => pe.microsoft_message_id));
    console.log(`Emails já processados: ${processedMessageIds.size}`);

    // Filtrar apenas emails não processados
    const newEmails = emails.filter(email => !processedMessageIds.has(email.id));
    console.log(`Emails novos para processar: ${newEmails.length}`);
    console.log(`DEBUG: Lista de emails encontrados:`, emails.map(e => ({ id: e.id, subject: e.subject, from: e.from?.emailAddress?.address })));
    console.log(`DEBUG: Emails já processados:`, Array.from(processedMessageIds));

    let processedCount = 0;
    let repliedCount = 0;

    for (const email of newEmails) {
      try {

        // Processar com IA
        const result = await aiService.processEmail(email, config.userId);
        
        // Verificar se o resultado é de um lote ou individual
        if (Array.isArray(result)) {
          // Resultado de lote - processar cada item
          for (const batchItem of result) {
            const emailData = batchItem.email;
            const aiResult = batchItem.result;
            
            let status = 'processed';
            if (aiResult.analysis.shouldReply && aiResult.response) {
              await graphService.sendReply(emailData.id, aiResult.response, emailData);
              repliedCount++;
              status = 'replied';
              console.log(`Resposta enviada para: ${emailData.subject}`);
            }

            // Registrar email como processado na tabela de controle
            await supabase
              .from('processed_microsoft_emails')
              .insert({
                microsoft_message_id: emailData.id,
                user_id: config.userId,
                connection_email: connectionEmail,
                subject: emailData.subject,
                from_email: emailData.from?.emailAddress?.address,
                status: status,
                analysis: aiResult.analysis,
                response_text: aiResult.response,
                processed_at: new Date().toISOString()
              });
          }
        } else {
          // Resultado individual - processar normalmente
          let status = 'processed';
          if (result.analysis.shouldReply && result.response) {
            await graphService.sendReply(email.id, result.response, email);
            repliedCount++;
            status = 'replied';
            console.log(`Resposta enviada para: ${email.subject}`);
          }

          // Registrar email como processado na tabela de controle
          await supabase
            .from('processed_microsoft_emails')
            .insert({
              microsoft_message_id: email.id,
              user_id: config.userId,
              connection_email: connectionEmail,
              subject: email.subject,
              from_email: email.from?.emailAddress?.address,
              status: status,
              analysis: result.analysis,
              response_text: result.response,
              processed_at: new Date().toISOString()
            });
        }

        processedCount++;
        
        // Atualizar último email processado (manter para compatibilidade)
        await supabase
          .from('email_processing_configs')
          .update({ lastProcessedEmailId: email.id })
          .eq('user_id', config.userId);

      } catch (error) {
        console.error(`Erro ao processar email ${email.id}:`, error);
        
        // Registrar email como erro na tabela de controle
        await supabase
          .from('processed_microsoft_emails')
          .insert({
            microsoft_message_id: email.id,
            user_id: config.userId,
            connection_email: connectionEmail,
            subject: email.subject,
            from_email: email.from?.emailAddress?.address,
            status: 'error',
            error_message: error.message,
            processed_at: new Date().toISOString()
          });
      }
    }

    // Atualizar contadores totais se houve processamento
    if (processedCount > 0 || repliedCount > 0) {
      // Buscar contadores atuais
      const { data: currentData } = await supabase
        .from('email_processing_configs')
        .select('total_processed, total_replied')
        .eq('user_id', config.userId)
        .single();

      const currentProcessed = currentData?.total_processed || 0;
      const currentReplied = currentData?.total_replied || 0;

      // Atualizar contadores
      await supabase
        .from('email_processing_configs')
        .update({ 
          total_processed: currentProcessed + processedCount,
          total_replied: currentReplied + repliedCount,
          last_processing_date: new Date().toISOString()
        })
        .eq('user_id', config.userId);
    }

    console.log(`Processamento concluído: ${processedCount} emails processados, ${repliedCount} respostas enviadas`);
    
    return {
      processedCount,
      repliedCount,
      lastProcessedEmailId: emails[0]?.id || config.lastProcessedEmailId
    };

  } catch (error) {
    console.error('Erro no processamento de emails:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  try {
    console.log('Edge Function iniciada - Microsoft Email Polling');

    // Verificar se é uma requisição de processamento de email individual
    if (req.method === 'POST') {
      const body = await req.json();
      
      if (body.email) {
        console.log('📧 Processando email individual:', body.email.subject);
        
        const aiService = new AIService(GEMINI_API_KEY);
        const result = await aiService.processEmail(body.email, body.user_id);
        
        return new Response(JSON.stringify({
          success: true,
          result: result
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Processar ações específicas
      if (body.action) {
        console.log('🎯 Processando ação:', body.action);
        
        if (body.action === 'process_user_emails' && body.user_id) {
          // Buscar configuração do usuário específico
          const { data: config, error } = await supabase
            .from('email_processing_configs')
            .select('*')
            .eq('user_id', body.user_id)
            .eq('is_active', true)
            .maybeSingle();
            
          if (error || !config) {
            return new Response(JSON.stringify({
              error: 'Configuração não encontrada ou inativa',
              message: error?.message || 'Usuário não tem configuração ativa'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
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
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (body.action === 'test_ai' && body.user_id) {
          // Teste da IA
          const aiService = new AIService(GEMINI_API_KEY);
          const testEmail = {
            subject: 'Teste da IA',
            body: 'Este é um email de teste para verificar se a IA está funcionando.',
            from: { emailAddress: { address: 'test@example.com' } }
          };
          
          const result = await aiService.processEmail(testEmail, body.user_id);
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Teste da IA concluído',
            result: result
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (body.action === 'get_processed_emails' && body.user_id) {
          // Buscar emails processados para o usuário
          const { data: processedEmails, error } = await supabase
            .from('processed_microsoft_emails')
            .select('microsoft_message_id, status, processed_at')
            .eq('user_id', body.user_id)
            .order('processed_at', { ascending: false })
            .limit(1000); // Limitar para performance

          if (error) {
            throw new Error(`Erro ao buscar emails processados: ${error.message}`);
          }

          return new Response(JSON.stringify({
            success: true,
            processed_emails: processedEmails || []
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (body.action === 'process_batch' && body.emails && body.user_id) {
          // Processar lote de emails
          const aiService = new AIService(GEMINI_API_KEY);
          const results = [];
          
          for (const emailData of body.emails) {
            try {
              const result = await aiService.processEmail(emailData, body.user_id);
              results.push({
                analysis: result.analysis,
                response: result.response
              });
            } catch (error) {
              console.error(`Erro ao processar email ${emailData.id}:`, error);
              results.push({
                analysis: { shouldReply: false, priority: 'low', category: 'general', confidence: 0 },
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
            headers: { 'Content-Type': 'application/json' }
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
          const { data, error } = await supabase
            .from('processed_microsoft_emails')
            .upsert({
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
            headers: { 'Content-Type': 'application/json' }
          });
        }

      }

      // Endpoints para integração com servidor local

      if (body.action === 'get_user_email' && body.user_id) {
        console.log('🔍 DEBUG get_user_email - body.user_id:', body.user_id);
        
        // Buscar email do usuário da configuração
        const { data: config, error } = await supabase
          .from('email_processing_configs')
          .select('email_address')
          .eq('user_id', body.user_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(`Erro ao buscar email do usuário: ${error.message}`);
        }

        return new Response(JSON.stringify({
          success: true,
          email_address: config?.email_address || `microsoft-user-${body.user_id}`
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Buscar configurações de usuários ativos
    const { data: configs, error } = await supabase
      .from('email_processing_configs')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Erro ao buscar configurações: ${error.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('Nenhuma configuração ativa encontrada');
      return new Response(JSON.stringify({ message: 'Nenhuma configuração ativa' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processando ${configs.length} usuários ativos`);
    
    // Debug: verificar se há configurações com user_id undefined
    configs.forEach((config, index) => {
      console.log(`Config ${index}: user_id=${config.user_id}, is_active=${config.is_active}`);
      if (!config.user_id) {
        console.error(`❌ Configuração ${index} tem user_id undefined/null:`, config);
      }
    });

    const results: any[] = [];
    for (const config of configs) {
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
        const mappedConfig: EmailProcessingConfig = {
          userId: config.user_id,
          accessToken: config.access_token,
          refreshToken: config.refresh_token,
          isActive: config.is_active,
          emailAddress: config.email_address,
          lastProcessedEmailId: config.last_processed_email_id
        };
        
        const result = await processUserEmails(mappedConfig);
        results.push({
          userId: config.user_id,
          ...result
        });
      } catch (error: any) {
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
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na Edge Function:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});