// Versão JavaScript simplificada do GraphService para o servidor
import { Client } from '@microsoft/microsoft-graph-client';

// Rate limiter simples
class RateLimiter {
  constructor(maxRequestsPerMinute = 60, maxConcurrentRequests = 3) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.maxConcurrentRequests = maxConcurrentRequests;
    this.requestQueue = [];
    this.activeRequests = 0;
    this.requestTimes = [];
  }

  async executeRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);

    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 60000 - (now - oldestRequest);
      setTimeout(() => this.processQueue(), waitTime);
      return;
    }

    const { requestFn, resolve, reject } = this.requestQueue.shift();
    this.activeRequests++;
    this.requestTimes.push(now);

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }
}

const rateLimiter = new RateLimiter(60, 3);

export class GraphService {
  constructor(accessToken) {
    const authProvider = {
      getAccessToken: async () => {
        return accessToken;
      },
    };

    this.graphClient = Client.initWithMiddleware({ authProvider });
  }

  async getUserProfile() {
    try {
      const user = await this.graphClient.api('/me').get();
      return user;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async getMailFolders() {
    try {
      console.log('GraphService - Listando pastas de email...');
      const folders = await rateLimiter.executeRequest(async () => {
        return await this.graphClient
          .api('/me/mailFolders')
          .get();
      });
      
      console.log('GraphService - Pastas encontradas:', folders);
      if (folders.value) {
        folders.value.forEach((folder) => {
          console.log(`- ${folder.displayName} (${folder.id}): ${folder.totalItemCount || 0} emails`);
        });
      }
      return folders;
    } catch (error) {
      console.error('Error getting mail folders:', error);
      throw error;
    }
  }

  async getEmails(top = 10, skip = 0) {
    try {
      console.log('GraphService - Analisando estrutura de emails...');
      
      // Primeiro, listar as pastas para debug
      await this.getMailFolders();
      
      console.log('GraphService - Buscando todos os emails da pasta principal...');
      
      // Buscar todos os emails da pasta principal
      const allEmails = await rateLimiter.executeRequest(async () => {
        return await this.graphClient
          .api('/me/messages')
          .top(top)
          .skip(skip)
          .select('id,subject,from,receivedDateTime,isRead,bodyPreview,body')
          .orderby('receivedDateTime desc')
          .get();
      });

      console.log('GraphService - Total de emails na pasta principal:', allEmails.value?.length || 0);
      
      // Filtrar apenas os não lidos no código
      const unreadEmails = allEmails.value?.filter((email) => !email.isRead) || [];
      console.log('GraphService - Emails não lidos após filtro:', unreadEmails.length);
      
      // Se não há emails não lidos, retornar array vazio
      if (unreadEmails.length === 0) {
        console.log('GraphService - Nenhum email não lido encontrado, retornando array vazio');
        return { value: [] };
      }
      
      // Retornar apenas os não lidos
      return {
        ...allEmails,
        value: unreadEmails
      };
    } catch (error) {
      console.error('Error getting emails:', error);
      throw error;
    }
  }

  async markEmailAsRead(emailId) {
    try {
      await rateLimiter.executeRequest(async () => {
        return await this.graphClient
          .api(`/me/messages/${emailId}`)
          .patch({ isRead: true });
      });

      return true;
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  }

  async sendReply(emailId, replyMessage) {
    try {
      await rateLimiter.executeRequest(async () => {
        return await this.graphClient
          .api(`/me/messages/${emailId}/reply`)
          .post(replyMessage);
      });

      return true;
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  }

  async sendEmail(emailMessage) {
    try {
      await rateLimiter.executeRequest(async () => {
        return await this.graphClient
          .api('/me/sendMail')
          .post(emailMessage);
      });

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

export default GraphService;
