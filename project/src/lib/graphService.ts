import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import rateLimiter from './rateLimiter';

class GraphService {
  private graphClient: Client;
  private accessToken: string;
  private refreshToken: string;
  private configId: string;

  constructor(accessToken: string, refreshToken?: string, configId?: string) {
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => {
        // Verificar se token está expirado e tentar renovar
        const validToken = await this.ensureValidToken();
        return validToken;
      },
    };

    this.graphClient = Client.initWithMiddleware({ authProvider });
    this.accessToken = accessToken;
    this.refreshToken = refreshToken || '';
    this.configId = configId || '';
  }

  // Método para garantir que o token seja válido
  private async ensureValidToken(): Promise<string> {
    try {
      // Primeiro, tentar usar o token atual
      const testResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        return this.accessToken;
      }

      // Se token expirado, tentar renovar
      if (this.refreshToken && this.configId) {
        // Token expired, trying to renew
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          this.accessToken = newToken;
          return newToken;
        }
      }

      // Se não conseguiu renovar, apenas logar o erro sem desativar a conta
      
      throw new Error('Token inválido - conta precisa ser reconectada');
    } catch (error) {
      console.error('Error verifying/renewing token:', error);
      throw error;
    }
  }

  // Método para marcar conta como desconectada
  private async markAccountAsDisconnected(): Promise<void> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { error } = await supabase
        .from('email_configurations')
        .update({
          is_active: false
        })
        .eq('id', this.configId);

      if (error) {
        console.error('Error marking account as disconnected:', error);
      }
    } catch (error) {
      console.error('Error marking account as disconnected:', error);
    }
  }

  // Método para renovar o token usando refresh token
  private async refreshAccessToken(): Promise<string | null> {
    try {
        // Renewing token via refresh token
      
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_AZURE_CLIENT_ID,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
          scope: 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error renewing token:', response.status, response.statusText);
        console.error('Error details:', errorText);
        return null;
      }

      const data = await response.json();
        // Token renewed successfully
      
      // Atualizar token no banco de dados
      await this.updateTokenInDatabase(data.access_token, data.refresh_token);
      
      return data.access_token;
    } catch (error) {
      console.error('Error renewing token:', error);
      return null;
    }
  }

  // Método para atualizar token no banco de dados
  private async updateTokenInDatabase(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { error } = await supabase
        .from('email_configurations')
        .update({
          oauth_access_token: accessToken,
          oauth_refresh_token: refreshToken,
          oauth_token_expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hora
        })
        .eq('id', this.configId);

      if (error) {
        console.error('Error updating token in database:', error);
      }
    } catch (error) {
      console.error('Error updating token in database:', error);
    }
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
      // Listing email folders
      
      const folders = await this.graphClient
        .api('/me/mailFolders')
        .get();
      
      return folders;
    } catch (error) {
      console.error('Error getting mail folders:', error);
      throw error;
    }
  }

  async getEmailsFromFolder(folderId: string, top: number = 10) {
    try {
      
      const emails = await this.graphClient
        .api(`/me/mailFolders/${folderId}/messages`)
        .top(top)
        .select('id,subject,from,receivedDateTime,isRead,bodyPreview,body')
        .orderby('receivedDateTime desc')
        .get();

      return emails;
    } catch (error) {
      console.error(`Error getting emails from folder ${folderId}:`, error);
      throw error;
    }
  }

  async getEmails(top: number = 10, skip: number = 0, sinceTimestamp?: Date) {
    try {
      
      // Primeiro, listar as pastas para debug
      await this.getMailFolders();
      
      
      // Construir filtro de data se fornecido
      let filterQuery = '';
      if (sinceTimestamp) {
        const isoDate = sinceTimestamp.toISOString();
        filterQuery = `receivedDateTime ge ${isoDate}`;
      }
      
      // Buscar emails com filtro opcional
      let query = this.graphClient
        .api('/me/messages')
        .top(top)
        .skip(skip)
        .select('id,subject,from,receivedDateTime,isRead,bodyPreview,body')
        .orderby('receivedDateTime desc');
      
      if (filterQuery) {
        query = query.filter(filterQuery);
      }
      
      const allEmails = await query.get();

      
      // Filtrar apenas os não lidos no código
      const unreadEmails = allEmails.value?.filter((email: any) => !email.isRead) || [];
      
      // Se não há emails não lidos, retornar todos os emails
      if (unreadEmails.length === 0) {
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
      
      // Consulta para todos os emails (lidos e não lidos)
      const emails = await this.graphClient
        .api('/me/messages')
        .top(top)
        .skip(skip)
        .select('id,subject,from,receivedDateTime,isRead,bodyPreview,body')
        .orderby('receivedDateTime desc')
        .get();

      
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
