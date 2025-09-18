// Versão JavaScript simplificada do EmailProcessor para o servidor
import { GraphService } from './graphService.js';
import { AIService } from './aiService.js';

export class EmailProcessor {
  constructor(accessToken, aiApiKey) {
    this.graphService = new GraphService(accessToken);
    this.aiService = new AIService(aiApiKey ? 'gemini' : 'mock', aiApiKey);
    this.processedEmails = new Map();
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
      
      const processedEmails = [];
      
      for (const email of newEmails) {
        try {
          // Verificar se já foi processado
          if (this.processedEmails.has(email.id)) {
            console.log(`EmailProcessor - Email ${email.id} já foi processado, pulando...`);
            continue;
          }

          // Filtrar emails de sistema (noreply, no-reply, etc.)
          if (this.isSystemEmail(email)) {
            console.log(`EmailProcessor - Email de sistema detectado, pulando: ${email.subject}`);
            // Marcar como processado mesmo sendo de sistema
            this.processedEmails.set(email.id, {
              id: email.id,
              subject: email.subject || 'Sem assunto',
              from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido',
              analysis: { shouldReply: false, priority: 'low', category: 'system', confidence: 1.0 },
              processedAt: new Date(),
              status: 'processed'
            });
            continue;
          }

          console.log(`EmailProcessor - Processando email: ${email.subject}`);
          
          // Processar com IA
          const result = await this.aiService.processEmail(email);
          
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

          // Se deve responder, enviar resposta
          if (result.analysis.shouldReply && result.response) {
            try {
              await this.sendReply(email, result.response);
              console.log(`EmailProcessor - Resposta enviada para: ${email.subject}`);
            } catch (replyError) {
              console.error(`EmailProcessor - Erro ao enviar resposta para ${email.subject}:`, replyError);
              // Não re-throw o erro, pois já marcamos como processado
            }
          }
          
        } catch (error) {
          console.error(`EmailProcessor - Erro ao processar email ${email.id}:`, error);
          
          const errorEmail = {
            id: email.id,
            subject: email.subject || 'Sem assunto',
            from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido',
            analysis: { shouldReply: false, priority: 'low', category: 'general', confidence: 0 },
            processedAt: new Date(),
            status: 'error'
          };
          
          // Marcar como processado mesmo com erro
          this.processedEmails.set(email.id, errorEmail);
          processedEmails.push(errorEmail);
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

  isSystemEmail(email) {
    const fromAddress = email.from?.emailAddress?.address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';
    
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
      'outlook.com',
      'hotmail.com',
      'live.com',
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
}

export default EmailProcessor;
