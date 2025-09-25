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
        console.log('✅ Token ainda válido');
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

      // Se não conseguiu renovar, marcar conta como desconectada
      console.log('❌ Token inválido e não foi possível renovar, marcando conta como desconectada');
      await this.markAccountAsDisconnected();
      
      throw new Error('Token inválido - conta precisa ser reconectada');
    } catch (error) {
      console.error('❌ Erro ao verificar/renovar token:', error);
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
        console.error('❌ Erro ao marcar conta como desconectada:', error);
      } else {
        // Account marked as disconnected
      }
    } catch (error) {
      console.error('❌ Erro ao marcar conta como desconectada:', error);
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
        console.error('❌ Erro ao renovar token:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
        // Token renewed successfully
      
      // Atualizar token no banco de dados
      await this.updateTokenInDatabase(data.access_token, data.refresh_token);
      
      return data.access_token;
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
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
        console.error('❌ Erro ao atualizar token no banco:', error);
      } else {
        console.log('✅ Token atualizado no banco de dados');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar token no banco:', error);
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
