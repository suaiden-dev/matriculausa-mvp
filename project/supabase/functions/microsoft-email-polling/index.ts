import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Configuração do Microsoft Graph
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');

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

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processEmail(email: any) {
    try {
      console.log(`AIService - Processando email: ${email.subject}`);
      
      if (!this.apiKey) {
        console.log('GEMINI_API_KEY não configurada, usando lógica simples');
        return this.simpleEmailAnalysis(email);
      }

      // Usar Gemini API para análise real
      const prompt = `
        Você é um assistente virtual especializado em admissões universitárias da Matrícula USA. Analise este email e gere uma resposta personalizada e profissional.
        
        EMAIL RECEBIDO:
        Assunto: ${email.subject}
        Remetente: ${email.from?.emailAddress?.address}
        Conteúdo: ${email.bodyPreview}
        
        INSTRUÇÕES:
        - Responda APENAS em JSON válido
        - Seja específico e útil na resposta
        - Use tom profissional mas amigável
        - Inclua informações relevantes sobre o processo de admissão quando apropriado
        - Se for uma pergunta sobre documentos, oriente sobre upload
        - Se for sobre pagamento, explique o processo
        - Se for sobre bolsas, explique os requisitos
        - SEMPRE responda no mesmo idioma do email original
        
        FORMATO JSON:
        {
          "shouldReply": boolean,
          "priority": "high|medium|low",
          "category": "application|documents|payment|scholarship|admission|general",
          "confidence": 0.0-1.0,
          "response": "Resposta personalizada e útil em português ou inglês conforme o email original"
        }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      
      return {
        analysis: {
          shouldReply: result.shouldReply,
          priority: result.priority,
          category: result.category,
          confidence: result.confidence
        },
        response: result.response
      };

    } catch (error) {
      console.error('Error processing email with AI:', error);
      return this.simpleEmailAnalysis(email);
    }
  }

  private simpleEmailAnalysis(email: any) {
    // Fallback para análise simples
    const subject = email.subject?.toLowerCase() || '';
    const content = email.bodyPreview?.toLowerCase() || '';
    
    // Detectar tipo de email
    let category = 'general';
    let shouldReply = false;
    let response = null;
    
    if (subject.includes('pergunta') || subject.includes('question') || content.includes('?')) {
      category = 'question';
      shouldReply = true;
      response = `Olá!\n\nObrigado pelo seu email. Recebemos sua pergunta e nossa equipe está analisando para fornecer uma resposta detalhada em breve.\n\nSe precisar de informações sobre documentos, pagamentos ou bolsas de estudo, posso ajudar!\n\nAtenciosamente,\nEquipe Matrícula USA`;
    } else if (subject.includes('document') || subject.includes('documento')) {
      category = 'documents';
      shouldReply = true;
      response = `Olá!\n\nObrigado pelo seu email sobre documentos. Para fazer upload de documentos, acesse sua conta no portal da Matrícula USA na seção "Documentos".\n\nSe precisar de ajuda, nossa equipe está disponível!\n\nAtenciosamente,\nEquipe Matrícula USA`;
    } else if (subject.includes('payment') || subject.includes('pagamento')) {
      category = 'payment';
      shouldReply = true;
      response = `Olá!\n\nObrigado pelo seu email sobre pagamento. Você pode fazer pagamentos através do portal da Matrícula USA na seção "Pagamentos".\n\nSe tiver problemas, entre em contato conosco!\n\nAtenciosamente,\nEquipe Matrícula USA`;
    }

    return {
      analysis: {
        shouldReply,
        priority: shouldReply ? 'medium' : 'low',
        category,
        confidence: 0.6
      },
      response
    };
  }
}

async function processUserEmails(config: EmailProcessingConfig) {
  try {
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

    let processedCount = 0;
    let repliedCount = 0;

    for (const email of emails) {
      try {
        // Verificar se já foi processado
        if (email.id === config.lastProcessedEmailId) {
          continue;
        }

        // Processar com IA
        const result = await aiService.processEmail(email);
        
        if (result.analysis.shouldReply && result.response) {
          await graphService.sendReply(email.id, result.response, email);
          repliedCount++;
          console.log(`Resposta enviada para: ${email.subject}`);
        }

        processedCount++;
        
        // Atualizar último email processado
        await supabase
          .from('email_processing_configs')
          .update({ lastProcessedEmailId: email.id })
          .eq('user_id', config.userId);

      } catch (error) {
        console.error(`Erro ao processar email ${email.id}:`, error);
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
        const result = await aiService.processEmail(body.email);
        
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
          
          const result = await aiService.processEmail(testEmail);
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Teste da IA concluído',
            result: result
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
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

    const results = [];
    for (const config of configs) {
      try {
        const result = await processUserEmails(config);
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