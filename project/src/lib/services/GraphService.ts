import { Client, AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { TokenManager } from './TokenManager';
import { withRetries } from '../utils/retryUtils';
import { GraphEmail, GraphMailFolder, GraphUser, GraphResponse } from '../types/graphTypes';

/**
 * Serviço para comunicação com Microsoft Graph API
 * Refatorado seguindo princípios de Clean Code
 */
export class GraphService {
  private graphClient: Client;
  private tokenManager: TokenManager;

  constructor(accessToken: string, refreshToken: string = '', configId: string = '') {
    this.tokenManager = new TokenManager(accessToken, refreshToken, configId);
    
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => {
        try {
          const validToken = await this.getValidToken();
          return validToken;
        } catch (error) {
          console.error('Error getting access token:', error);
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.log('🔄 Network error detected, attempting to reconnect...');
            await this.tokenManager.markAccountAsDisconnected();
          }
          throw error;
        }
      },
    };

    this.graphClient = Client.initWithMiddleware({ authProvider });
  }

  /**
   * Obtém um token válido, renovando se necessário
   */
  private async getValidToken(): Promise<string> {
    try {
      if (!this.tokenManager.accessToken) {
        throw new Error('No access token available');
      }

      // Verificar se token atual é válido
      const isValid = await this.tokenManager.isTokenValid();
      if (isValid) {
        return this.tokenManager.accessToken;
      }

      // Tentar renovar token
      const tokenResult = await this.tokenManager.renewToken();
      if (tokenResult) {
        // Atualizar tokens no banco
        await this.tokenManager.updateTokensInDatabase(
          tokenResult.accessToken, 
          tokenResult.refreshToken || ''
        );
        
        // Atualizar referência local
        this.tokenManager.accessToken = tokenResult.accessToken;
        this.tokenManager.refreshToken = tokenResult.refreshToken || '';
        
        return tokenResult.accessToken;
      }

      // Se chegou aqui, token inválido e renovação falhou
      console.log('🔄 Token expired and refresh failed, marking account as disconnected');
      await this.tokenManager.markAccountAsDisconnected();
      throw new Error('Token inválido - conta precisa ser reconectada');
    } catch (error) {
      console.error('❌ Error getting valid token:', error);
      throw error;
    }
  }

  /**
   * Obtém perfil do usuário
   */
  async getUserProfile(): Promise<GraphUser> {
    return withRetries(async () => {
      const user = await this.graphClient.api('/me').get();
      return user as GraphUser;
    });
  }

  /**
   * Obtém pastas de email
   */
  async getMailFolders(): Promise<GraphResponse<GraphMailFolder>> {
    return withRetries(async () => {
      const folders = await this.graphClient.api('/me/mailFolders').get();
      return folders as GraphResponse<GraphMailFolder>;
    });
  }

  /**
   * Obtém emails de uma pasta específica
   */
  async getEmailsFromFolder(folderId: string, top: number = 10): Promise<GraphResponse<GraphEmail>> {
    return withRetries(async () => {
      const emails = await this.graphClient
        .api(`/me/mailFolders/${folderId}/messages`)
        .top(top)
        .select('id,subject,from,receivedDateTime,isRead,bodyPreview,body')
        .orderby('receivedDateTime desc')
        .get();
      return emails as GraphResponse<GraphEmail>;
    });
  }

  /**
   * Obtém email específico por ID
   */
  async getEmailById(emailId: string): Promise<GraphEmail> {
    return withRetries(async () => {
      const email = await this.graphClient
        .api(`/me/messages/${emailId}`)
        .select('id,subject,from,receivedDateTime,isRead,bodyPreview,body,toRecipients,ccRecipients,bccRecipients')
        .get();
      return email as GraphEmail;
    });
  }

  /**
   * Marca email como lido
   */
  async markEmailAsRead(emailId: string): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api(`/me/messages/${emailId}`)
        .patch({ isRead: true });
    });
  }

  /**
   * Marca email como não lido
   */
  async markEmailAsUnread(emailId: string): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api(`/me/messages/${emailId}`)
        .patch({ isRead: false });
    });
  }

  /**
   * Marca email como favorito
   */
  async markEmailAsStarred(emailId: string): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api(`/me/messages/${emailId}`)
        .patch({ isRead: true });
    });
  }

  /**
   * Remove email dos favoritos
   */
  async markEmailAsUnstarred(emailId: string): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api(`/me/messages/${emailId}`)
        .patch({ isRead: false });
    });
  }

  /**
   * Move email para pasta específica
   */
  async moveEmailToFolder(emailId: string, folderId: string): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api(`/me/messages/${emailId}/move`)
        .post({ destinationId: folderId });
    });
  }

  /**
   * Exclui email
   */
  async deleteEmail(emailId: string): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api(`/me/messages/${emailId}`)
        .delete();
    });
  }

  /**
   * Envia email
   */
  async sendEmail(email: {
    toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
    subject: string;
    body: { contentType: string; content: string };
    ccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
    bccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
  }): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api('/me/sendMail')
        .post({
          message: {
            ...email,
            from: { emailAddress: { address: this.tokenManager.accessToken } }
          }
        });
    });
  }

  /**
   * Responde a um email
   */
  async replyToEmail(emailId: string, reply: {
    message: {
      toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
      body: { contentType: string; content: string };
    };
  }): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api(`/me/messages/${emailId}/reply`)
        .post(reply);
    });
  }

  /**
   * Encaminha email
   */
  async forwardEmail(emailId: string, forward: {
    message: {
      toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
      body: { contentType: string; content: string };
    };
  }): Promise<void> {
    return withRetries(async () => {
      await this.graphClient
        .api(`/me/messages/${emailId}/forward`)
        .post(forward);
    });
  }
}