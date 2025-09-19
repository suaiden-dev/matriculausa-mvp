import GraphService from './graphService';

interface ProcessedEmail {
  id: string;
  subject: string;
  from: string;
  analysis: any;
  response?: string;
  processedAt: Date;
  status: 'pending' | 'processed' | 'error';
}

export class EmailProcessor {
  private graphService: GraphService;
  private processedEmails: Map<string, ProcessedEmail> = new Map();

  constructor(accessToken: string, aiApiKey?: string) {
    this.graphService = new GraphService(accessToken);
  }

  async processNewEmails(sinceTimestamp?: Date): Promise<ProcessedEmail[]> {
    console.log('EmailProcessor - Iniciando processamento de novos emails...');
    console.log(`EmailProcessor - Buscando emails desde: ${sinceTimestamp?.toISOString() || 'início'}`);
    
    try {
      // Buscar emails não lidos com filtro de timestamp se fornecido
      const emails = await this.graphService.getEmails(20, sinceTimestamp);
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
      
      const processedEmails: ProcessedEmail[] = [];
      
      for (const email of unprocessedEmails) {
        try {
          // Verificar se já foi processado na memória (dupla verificação)
          if (this.processedEmails.has(email.id)) {
            console.log(`EmailProcessor - Email ${email.id} já foi processado na memória, pulando...`);
            continue;
          }

          // Filtrar emails de sistema (noreply, no-reply, etc.)
          if (this.isSystemEmail(email)) {
            console.log(`EmailProcessor - Email de sistema detectado, pulando: ${email.subject}`);
            continue;
          }

          console.log(`EmailProcessor - Processando email: ${email.subject}`);
          
          // Processar com IA usando Edge Function
          const result = await this.processEmailWithAI(email);
          
          const processedEmail: ProcessedEmail = {
            id: email.id,
            subject: email.subject || 'Sem assunto',
            from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido',
            analysis: result.analysis,
            response: result.response,
            processedAt: new Date(),
            status: 'processed'
          };

          // Se deve responder, enviar resposta
          if (result.analysis.shouldReply && result.response) {
            await this.sendReply(email, result.response);
            console.log(`EmailProcessor - Resposta enviada para: ${email.subject}`);
          }

          // Marcar como processado
          this.processedEmails.set(email.id, processedEmail);
          processedEmails.push(processedEmail);
          
        } catch (error) {
          console.error(`EmailProcessor - Erro ao processar email ${email.id}:`, error);
          
          const errorEmail: ProcessedEmail = {
            id: email.id,
            subject: email.subject || 'Sem assunto',
            from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido',
            analysis: { shouldReply: false, priority: 'low', category: 'general', confidence: 0 },
            processedAt: new Date(),
            status: 'error'
          };
          
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

  private async sendReply(originalEmail: any, response: string): Promise<void> {
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
      throw error;
    }
  }

  async getProcessedEmails(): Promise<ProcessedEmail[]> {
    return Array.from(this.processedEmails.values());
  }

  async getEmailStats(): Promise<{
    total: number;
    processed: number;
    errors: number;
    replied: number;
  }> {
    const emails = Array.from(this.processedEmails.values());
    
    return {
      total: emails.length,
      processed: emails.filter(e => e.status === 'processed').length,
      errors: emails.filter(e => e.status === 'error').length,
      replied: emails.filter(e => e.response).length
    };
  }

  clearProcessedEmails(): void {
    this.processedEmails.clear();
  }

  async getProcessedEmailsFromDB(): Promise<{microsoft_message_id: string, status: string, processed_at: string}[]> {
    try {
      // Fazer requisição para a Edge Function para buscar emails processados
      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_processed_emails',
          user_id: 'current_user' // Será substituído pelo userId real quando disponível
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

  private async processEmailWithAI(email: any): Promise<{ analysis: any; response?: string }> {
    try {
      console.log('EmailProcessor - Chamando Edge Function para processar email com IA');
      
      // Obter usuário atual para enviar user_id
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: {
            id: email.id,
            subject: email.subject,
            from: email.from?.emailAddress?.address,
            bodyPreview: email.bodyPreview,
            body: email.body?.content || email.bodyPreview
          },
          user_id: user?.id // Incluir user_id para buscar prompt da universidade
        })
      });

      if (!response.ok) {
        throw new Error(`Edge Function error: ${response.status}`);
      }

      const data = await response.json();
      
      // A Edge Function retorna o resultado processado
      if (data.result && data.result.analysis) {
        return {
          analysis: data.result.analysis,
          response: data.result.response
        };
      }
      
      // Fallback se não retornar resultado esperado
      return {
        analysis: {
          shouldReply: false,
          priority: 'low',
          category: 'general',
          confidence: 0.5
        }
      };

    } catch (error) {
      console.error('EmailProcessor - Erro ao processar com IA:', error);
      
      // Fallback simples em caso de erro
      const shouldReply = email.subject?.toLowerCase().includes('pergunta') || 
                         email.subject?.toLowerCase().includes('question') ||
                         email.bodyPreview?.toLowerCase().includes('?');

      return {
        analysis: {
          shouldReply,
          priority: shouldReply ? 'medium' : 'low',
          category: 'general',
          confidence: 0.6
        },
        response: shouldReply ? 
          `Olá!\n\nObrigado pelo seu email. Recebemos sua pergunta e nossa equipe está analisando para fornecer uma resposta detalhada em breve.\n\nSe precisar de informações sobre documentos, pagamentos ou bolsas de estudo, posso ajudar!\n\nAtenciosamente,\nEquipe Matrícula USA` : 
          null
      };
    }
  }

  private isSystemEmail(email: any): boolean {
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
