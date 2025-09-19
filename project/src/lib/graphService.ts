import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import rateLimiter from './rateLimiter';

class GraphService {
  private graphClient: Client;
  private accessToken: string;

  constructor(accessToken: string) {
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => {
        return accessToken;
      },
    };

    this.graphClient = Client.initWithMiddleware({ authProvider });
    // Store token for direct HTTP calls
    this.accessToken = accessToken;
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
        folders.value.forEach((folder: any) => {
          console.log(`- ${folder.displayName} (${folder.id}): ${folder.totalItemCount || 0} emails`);
        });
      }
      return folders;
    } catch (error) {
      console.error('Error getting mail folders:', error);
      throw error;
    }
  }

  async getEmailsFromFolder(folderId: string, top: number = 10) {
    try {
      console.log(`GraphService - Buscando emails da pasta ${folderId}...`);
      
      const emails = await rateLimiter.executeRequest(async () => {
        return await this.graphClient
          .api(`/me/mailFolders/${folderId}/messages`)
          .top(top)
          .select('id,subject,from,receivedDateTime,isRead,bodyPreview')
          .orderby('receivedDateTime desc')
          .get();
      });

      console.log(`GraphService - Emails da pasta ${folderId}:`, emails.value?.length || 0);
      return emails;
    } catch (error) {
      console.error(`Error getting emails from folder ${folderId}:`, error);
      throw error;
    }
  }

  async getEmails(top: number = 10, skip: number = 0, sinceTimestamp?: Date) {
    try {
      console.log('GraphService - Analisando estrutura de emails...');
      console.log(`GraphService - Buscando emails desde: ${sinceTimestamp?.toISOString() || 'início'}`);
      
      // Primeiro, listar as pastas para debug
      await this.getMailFolders();
      
      console.log('GraphService - Buscando emails da pasta principal...');
      
      // Construir filtro de data se fornecido
      let filterQuery = '';
      if (sinceTimestamp) {
        const isoDate = sinceTimestamp.toISOString();
        filterQuery = `receivedDateTime ge ${isoDate}`;
        console.log(`GraphService - Aplicando filtro de data: ${filterQuery}`);
      }
      
      // Buscar emails com filtro opcional
      const allEmails = await rateLimiter.executeRequest(async () => {
        let query = this.graphClient
          .api('/me/messages')
          .top(top)
          .skip(skip)
          .select('id,subject,from,receivedDateTime,isRead,bodyPreview')
          .orderby('receivedDateTime desc');
        
        if (filterQuery) {
          query = query.filter(filterQuery);
        }
        
        return await query.get();
      });

      console.log('GraphService - Total de emails encontrados:', allEmails.value?.length || 0);
      
      // Filtrar apenas os não lidos no código
      const unreadEmails = allEmails.value?.filter((email: any) => !email.isRead) || [];
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

  async getAllEmails(top: number = 10, skip: number = 0) {
    try {
      console.log('GraphService - Buscando todos os emails com top:', top, 'skip:', skip);
      
      // Consulta para todos os emails (lidos e não lidos)
      const emails = await this.graphClient
        .api('/me/messages')
        .top(top)
        .skip(skip)
        .select('id,subject,from,receivedDateTime,isRead,bodyPreview')
        .orderby('receivedDateTime desc')
        .get();

      console.log('GraphService - Total de emails encontrados:', emails.value?.length || 0);
      
      return emails;
    } catch (error) {
      console.error('Error getting all emails:', error);
      throw error;
    }
  }

  async getEmailById(emailId: string) {
    try {
      const email = await this.graphClient
        .api(`/me/messages/${emailId}`)
        .select('id,subject,from,toRecipients,receivedDateTime,isRead,body')
        .get();

      return email;
    } catch (error) {
      console.error('Error getting email by ID:', error);
      throw error;
    }
  }

  async markEmailAsRead(emailId: string) {
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

  async sendReply(emailId: string, replyMessage: any) {
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

  async sendEmail(emailMessage: any) {
    try {
      console.log('📧 GraphService: Sending email via Microsoft Graph API...');
      console.log('📧 Email message:', JSON.stringify(emailMessage, null, 2));
      
      // Use direct fetch to avoid JWT validation issues with the SDK
      const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailMessage)
      });

      console.log('📧 Graph API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📧 Graph API Error response:', errorText);
        
        // Try to parse error details
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch (e) {
          errorDetails = { error: { message: errorText } };
        }
        
        throw new Error(`Microsoft Graph API error (${response.status}): ${errorDetails.error?.message || errorText}`);
      }

      console.log('✅ Email sent successfully via Microsoft Graph API');
      return true;
    } catch (error) {
      console.error('❌ Error sending email via Graph API:', error);
      throw error;
    }
  }
}

export default GraphService;
