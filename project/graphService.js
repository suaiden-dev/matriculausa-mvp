// Versão JavaScript simplificada do GraphService para o servidor
import { Client } from '@microsoft/microsoft-graph-client';

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
      const folders = await this.graphClient
        .api('/me/mailFolders')
        .get();
      
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
      const allEmails = await this.graphClient
        .api('/me/messages')
        .top(top)
        .skip(skip)
        .select('id,subject,from,receivedDateTime,isRead,bodyPreview')
        .orderby('receivedDateTime desc')
        .get();

      console.log('GraphService - Total de emails na pasta principal:', allEmails.value?.length || 0);
      
      // Filtrar apenas os não lidos no código
      const unreadEmails = allEmails.value?.filter((email) => !email.isRead) || [];
      console.log('GraphService - Emails não lidos após filtro:', unreadEmails.length);
      
      // Se não há emails não lidos, retornar todos os emails
      if (unreadEmails.length === 0) {
        console.log('GraphService - Nenhum email não lido encontrado, retornando todos os emails');
        return allEmails;
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
      await this.graphClient
        .api(`/me/messages/${emailId}`)
        .patch({ isRead: true });

      return true;
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  }

  async sendReply(emailId, replyMessage) {
    try {
      await this.graphClient
        .api(`/me/messages/${emailId}/reply`)
        .post(replyMessage);

      return true;
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  }

  async sendEmail(emailMessage) {
    try {
      await this.graphClient
        .api('/me/sendMail')
        .post(emailMessage);

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

export default GraphService;
