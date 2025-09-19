// Versão JavaScript simplificada do GraphService para o servidor
import { Client } from '@microsoft/microsoft-graph-client';

export class GraphService {
  constructor(accessToken) {
    // Create a custom auth provider that properly handles Microsoft access tokens
    const authProvider = {
      getAccessToken: async () => {
        // Return the access token without any validation
        // Microsoft Graph SDK will handle the token properly
        console.log('🔑 GraphService: Providing access token to Microsoft Graph SDK');
        return accessToken;
      },
    };

    // Initialize client with proper configuration for Microsoft access tokens
    this.graphClient = Client.initWithMiddleware({ 
      authProvider,
      // Add additional configuration to handle non-JWT tokens
      middleware: []
    });
    
    // Store token for direct HTTP calls if needed
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
