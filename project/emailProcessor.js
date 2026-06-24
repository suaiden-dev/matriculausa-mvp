// Versão JavaScript simplificada do EmailProcessor para o servidor
import { GraphService } from './graphService.js';
import { AIService } from './aiService.js';

export class EmailProcessor {
  constructor(accessToken, aiApiKey, userId = null, userEmail = null) {
    this.graphService = new GraphService(accessToken);
    this.aiService = new AIService(aiApiKey ? 'gemini' : 'mock', aiApiKey);
    this.processedEmails = new Map();
    this.userId = userId;
    this.userEmail = userEmail;
    console.log('🔍 EmailProcessor - Constructor - userId recebido:', userId);
    console.log('🔍 EmailProcessor - Constructor - userEmail recebido:', userEmail);
  }

  async processNewEmails() {
    console.log('EmailProcessor - Iniciando processamento de novos emails...');
    
    try {
      // Buscar emails não lidos
      const emails = await this.graphService.getEmails(20);
      const newEmails = emails.value || [];
      
      console.log(`EmailProcessor - Encontrados ${newEmails.length} emails para processar`);
      
      // Se não há emails, retornar array vazio
      if (newEmails.length === 0) {
        console.log('EmailProcessor - Nenhum email encontrado, retornando array vazio');
        return [];
      }

      // Buscar emails já processados do banco de dados
      const processedEmailsFromDB = await this.getProcessedEmailsFromDB();
      const processedMessageIds = new Set(processedEmailsFromDB.map(pe => pe.microsoft_message_id));
      console.log(`EmailProcessor - Emails já processados no banco: ${processedMessageIds.size}`);
      
      // Filtrar apenas emails não processados
      const unprocessedEmails = newEmails.filter(email => !processedMessageIds.has(email.id));
      console.log(`EmailProcessor - Emails novos para processar: ${unprocessedEmails.length}`);
      
      const processedEmails = [];
      
      // Filtrar emails de sistema primeiro
      const systemEmails = [];
      const validEmails = [];
      
      for (const email of unprocessedEmails) {
        // Verificar se já foi processado na memória (dupla verificação)
        if (this.processedEmails.has(email.id)) {
          console.log(`EmailProcessor - Email ${email.id} já foi processado na memória, pulando...`);
          continue;
        }

        // Filtrar emails de sistema (noreply, no-reply, etc.)
        if (this.isSystemEmail(email)) {
          console.log(`EmailProcessor - Email de sistema detectado, pulando: ${email.subject}`);
          systemEmails.push(email);
        } else {
          validEmails.push(email);
        }
      }
      
      // Processar emails de sistema
      for (const email of systemEmails) {
        this.processedEmails.set(email.id, {
          id: email.id,
          subject: email.subject || 'Sem assunto',
          from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido',
          analysis: { shouldReply: false, priority: 'low', category: 'system', confidence: 1.0 },
          processedAt: new Date(),
          status: 'processed'
        });
        
        // Salvar no banco como processado
        await this.saveProcessedEmailToDB(email, { 
          analysis: { shouldReply: false, priority: 'low', category: 'system', confidence: 1.0 }, 
          response: null 
        }, 'processed');
      }
      
      // Processar emails válidos em lotes
      if (validEmails.length > 0) {
        console.log(`\n📦 EmailProcessor - Processando ${validEmails.length} emails em lotes...`);
        
                // Agrupar emails em lotes de 1 (máxima segurança)
                const batchSize = 1;
                const batches = [];
                for (let i = 0; i < validEmails.length; i += batchSize) {
                  batches.push(validEmails.slice(i, i + batchSize));
                }
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(`\n📦 EmailProcessor - Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} emails)`);
          
          try {
            // Processar lote com IA
            const batchResults = await this.aiService.processBatch(batch, this.userId);
            
            for (let i = 0; i < batch.length; i++) {
              const email = batch[i];
              const result = batchResults[i] || { analysis: { shouldReply: false }, response: null };
              
              console.log(`\n📧 PROCESSANDO EMAIL ${i + 1}/${batch.length}:`);
              console.log(`   📝 Assunto: ${email.subject}`);
              console.log(`   📧 ID: ${email.id}`);
              console.log(`   👤 De: ${email.from?.emailAddress?.address}`);
              console.log(`   📄 Body Preview: ${email.bodyPreview}`);
              console.log(`   📄 Body Content: ${email.body?.content || 'N/A'}`);
              console.log(`   📄 Body Type: ${email.body?.contentType || 'N/A'}`);
              
              const processedEmail = {
                id: email.id,
                subject: email.subject || 'Sem assunto',
                from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido',
                analysis: result.analysis,
                response: result.response,
                processedAt: new Date(),
                status: 'processed'
              };

              // Marcar como processado ANTES de tentar enviar resposta
              this.processedEmails.set(email.id, processedEmail);
              processedEmails.push(processedEmail);

              // Salvar no banco de dados
              await this.saveProcessedEmailToDB(email, result, 'processed');

              // Se deve responder, enviar resposta
              if (result.analysis.shouldReply && result.response) {
                try {
                  await this.sendReply(email, result.response);
                  console.log(`EmailProcessor - Resposta enviada para: ${email.subject}`);
                  
                  // Atualizar status para 'replied' no banco
                  await this.saveProcessedEmailToDB(email, result, 'replied');
                } catch (replyError) {
                  console.error(`EmailProcessor - Erro ao enviar resposta para ${email.subject}:`, replyError);
                  
                  // Verificar se é erro de permissão
                  if (replyError.statusCode === 403 || replyError.code === 'ErrorAccessDenied') {
                    console.error('🚨 EmailProcessor - ERRO DE PERMISSÃO: Token não tem permissão Mail.Send');
                    console.error('🔧 EmailProcessor - SOLUÇÃO: Faça logout e login novamente para obter as permissões corretas');
                    console.error('📋 EmailProcessor - Permissões necessárias: User.Read, Mail.Read, Mail.Send, offline_access');
                  }
                  
                  // Atualizar status para 'error' no banco
                  await this.saveProcessedEmailToDB(email, result, 'error', replyError.message);
                }
              }
            }
            
                    // Aguardar 5 minutos entre lotes (MUITO CONSERVADOR - EVITA SPAM)
                    if (batchIndex < batches.length - 1) {
                      console.log(`⏰ EmailProcessor - Aguardando 5 minutos antes do próximo lote (CONFIGURAÇÃO CONSERVADORA - EVITA SPAM)...`);
                      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutos
                    }
            
          } catch (error) {
            console.error(`EmailProcessor - Erro ao processar lote ${batchIndex + 1}:`, error);
            
            // Processar emails individualmente em caso de erro no lote
            for (const email of batch) {
              try {
                const result = await this.aiService.processEmail(email, this.userId);
                
                const processedEmail = {
                  id: email.id,
                  subject: email.subject || 'Sem assunto',
                  from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido',
                  analysis: result.analysis,
                  response: result.response,
                  processedAt: new Date(),
                  status: 'processed'
                };

                this.processedEmails.set(email.id, processedEmail);
                processedEmails.push(processedEmail);
                await this.saveProcessedEmailToDB(email, result, 'processed');
                
                if (result.analysis.shouldReply && result.response) {
                  await this.sendReply(email, result.response);
                  await this.saveProcessedEmailToDB(email, result, 'replied');
                }
              } catch (individualError) {
                console.error(`EmailProcessor - Erro ao processar email individual ${email.id}:`, individualError);
              }
            }
          }
        }
      }

      console.log(`EmailProcessor - Processamento concluído. ${processedEmails.length} emails processados`);
      return processedEmails;
      
    } catch (error) {
      console.error('EmailProcessor - Erro no processamento:', error);
      throw error;
    }
  }

  async sendReply(originalEmail, response) {
    try {
      const replyMessage = {
        message: {
          toRecipients: [
            {
              emailAddress: {
                address: originalEmail.from?.emailAddress?.address
              }
            }
          ],
          subject: `Re: ${originalEmail.subject}`,
          body: {
            contentType: 'text',
            content: response
          }
        }
      };

      await this.graphService.sendReply(originalEmail.id, replyMessage);
      
      // Marcar email original como lido
      await this.graphService.markEmailAsRead(originalEmail.id);
      
    } catch (error) {
      console.error('EmailProcessor - Erro ao enviar resposta:', error);
      
      // Verificar se é erro de permissão
      if (error.statusCode === 403 || error.code === 'ErrorAccessDenied') {
        console.error('🚨 EmailProcessor - ERRO DE PERMISSÃO: Token não tem permissão Mail.Send');
        console.error('🔧 EmailProcessor - SOLUÇÃO: Faça logout e login novamente para obter as permissões corretas');
        console.error('📋 EmailProcessor - Permissões necessárias: User.Read, Mail.Read, Mail.Send, offline_access');
      }
      
      throw error;
    }
  }

  async getProcessedEmails() {
    return Array.from(this.processedEmails.values());
  }

  async getEmailStats() {
    const emails = Array.from(this.processedEmails.values());
    
    return {
      total: emails.length,
      processed: emails.filter(e => e.status === 'processed').length,
      errors: emails.filter(e => e.status === 'error').length,
      replied: emails.filter(e => e.response).length
    };
  }

  clearProcessedEmails() {
    this.processedEmails.clear();
  }

  async getProcessedEmailsFromDB() {
    try {
      // Fazer requisição para a Edge Function para buscar emails processados
      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_processed_emails',
          user_id: this.userId
        })
      });

      if (!response.ok) {
        console.error('Erro ao buscar emails processados:', response.status);
        return [];
      }

      const data = await response.json();
      return data.processed_emails || [];
    } catch (error) {
      console.error('Erro ao buscar emails processados do banco:', error);
      return [];
    }
  }

  isSystemEmail(email) {
    const fromAddress = email.from?.emailAddress?.address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';
    
    // NÃO considerar como sistema se for o próprio usuário
    const isOwnEmail = fromAddress === this.userEmail?.toLowerCase();
    
    // Se for email do próprio usuário, verificar se é resposta da IA
    if (isOwnEmail) {
      // Padrões que indicam que é resposta da própria IA
      const aiResponsePatterns = [
        're: re:',
        're: re: re:',
        're: re: re: re:',
        're: re: re: re: re:',
        're: re: re: re: re: re:'
      ];
      
      const isAiResponse = aiResponsePatterns.some(pattern => 
        subject.includes(pattern)
      );
      
      if (isAiResponse) {
        console.log(`EmailProcessor - Resposta da própria IA detectada, pulando: ${subject}`);
        return true; // Pular emails que são respostas da própria IA
      }
      
      console.log(`EmailProcessor - Email do próprio usuário (não é resposta da IA): ${fromAddress} - ${subject}`);
      return false; // Processar emails do próprio usuário que não são respostas da IA
    }
    
    // Lista de padrões de emails de sistema
    const systemPatterns = [
      'noreply',
      'no-reply',
      'donotreply',
      'do-not-reply',
      'account-security-noreply',
      'postmaster',
      'mailer-daemon',
      'bounce',
      'notification',
      'alerts',
      'system',
      'automated',
      'robot',
      'bot'
    ];
    
    // Verificar se o endereço contém padrões de sistema
    const isSystemAddress = systemPatterns.some(pattern => 
      fromAddress.includes(pattern)
    );
    
    // Verificar se o assunto indica email de sistema
    const systemSubjects = [
      'undeliverable',
      'delivery status',
      'mail delivery',
      'bounce',
      'notification',
      'alert',
      'security',
      'account',
      'verification',
      'welcome',
      'confirmation'
    ];
    
    const isSystemSubject = systemSubjects.some(pattern => 
      subject.includes(pattern)
    );
    
    // Verificar domínios conhecidos de sistema
    const systemDomains = [
      'accountprotection.microsoft.com',
      'microsoft.com',
      'office365.com',
      'azure.com'
    ];
    
    const isSystemDomain = systemDomains.some(domain => 
      fromAddress.endsWith(`@${domain}`)
    );
    
    const isSystem = isSystemAddress || isSystemSubject || isSystemDomain;
    
    if (isSystem) {
      console.log(`EmailProcessor - Email de sistema detectado: ${fromAddress} - ${subject}`);
    }
    
    return isSystem;
  }

  async saveProcessedEmailToDB(email, result, status, errorMessage = null) {
    try {
      console.log(`\n🔍 SALVANDO EMAIL NO BANCO:`);
      console.log(`   📧 ID: ${email.id}`);
      console.log(`   📝 Assunto: ${email.subject}`);
      console.log(`   📊 Status: ${status}`);
      console.log(`   📄 Original Content: ${email.body?.content || email.bodyPreview || 'N/A'}`);
      console.log(`   📄 Response Text: ${result.response || 'N/A'}`);
      
      // Buscar email do usuário da configuração
      const emailAddress = await this.getUserEmailFromConfig();
      console.log(`   👤 Email do usuário: ${emailAddress}`);
      
      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save_processed_email',
          microsoft_message_id: email.id,
          user_id: this.userId,
          connection_email: emailAddress,
          subject: email.subject,
          from_email: email.from?.emailAddress?.address,
          status: status,
          analysis: result.analysis,
          response_text: result.response,
          original_email_content: email.body?.content || email.bodyPreview || 'Conteúdo não disponível',
          error_message: errorMessage
        })
      });

      if (!response.ok) {
        console.log(`   ❌ ERRO: ${response.status}`);
        const errorText = await response.text();
        console.log(`   ❌ Detalhes: ${errorText}`);
      } else {
        const responseData = await response.json();
        console.log(`   ✅ SUCESSO: Email salvo no banco!`);
        console.log(`   ✅ Resposta: ${JSON.stringify(responseData)}`);
      }
    } catch (error) {
      console.error('Erro ao salvar email processado no banco:', error);
    }
  }

  async getUserEmailFromConfig() {
    try {
      console.log(`   🔍 Buscando email do usuário...`);
      console.log(`   🔍 this.userId:`, this.userId);
      
      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_user_email',
          user_id: this.userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Email obtido: ${data.email_address}`);
        return data.email_address || `microsoft-user-${this.userId}`;
      } else {
        console.log(`   ❌ Erro: ${response.status}`);
        const errorText = await response.text();
        console.log(`   ❌ Detalhes: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    
    console.log(`   ⚠️ Usando email padrão: microsoft-user-${this.userId}`);
    return `microsoft-user-${this.userId}`;
  }
}

export default EmailProcessor;
