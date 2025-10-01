import { supabase } from '../supabase';
import { getMicrosoftAuthConfig, shouldUseWebAppFlow } from '../microsoftAuthConfig';
import { MSALAccountManager } from '../msalAccountManager';

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
}

export class TokenManager {
  public accessToken: string;
  public refreshToken: string;
  private configId: string;

  constructor(accessToken: string, refreshToken: string = '', configId: string = '') {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.configId = configId;
  }

  /**
   * Verifica se o token atual é válido
   */
  async isTokenValid(): Promise<boolean> {
    if (!this.accessToken) return false;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const testResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return testResponse.ok;
    } catch (error) {
      console.warn('⚠️ Token validation failed:', error);
      return false;
    }
  }

  /**
   * Renova o token usando APENAS Web App flow (com client_secret)
   * Sem MSAL/SPA - Apenas Web App flow
   */
  async renewToken(): Promise<TokenResult | null> {
    console.log('🔄 Attempting token renewal...');
    
    try {
      // USAR APENAS WEB APP FLOW - Sem MSAL/SPA
      console.log('🔄 Using Web App flow for token renewal...');
      const refreshResult = await this.tryRefreshTokenRenewal();
      if (refreshResult) {
        console.log('✅ Token renewed via Web App flow');
        return refreshResult;
      }

      console.log('❌ Web App flow failed');
      console.log('💡 User will need to reconnect manually');
      return null;
    } catch (error) {
      console.error('❌ Error during token renewal:', error);
      return null;
    }
  }

  /**
   * Tenta renovar token via Refresh Token (Web App flow)
   * Mais confiável para aplicações Web com client_secret
   */
  private async tryRefreshTokenRenewal(): Promise<TokenResult | null> {
    try {
      console.log('🔄 Trying refresh token renewal...');
      
      if (!this.refreshToken) {
        console.log('❌ No refresh token available');
        return null;
      }

      const clientSecret = import.meta.env.VITE_AZURE_CLIENT_SECRET;
      if (!clientSecret) {
        console.log('❌ No client secret available for refresh token renewal');
        return null;
      }

      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      const params = new URLSearchParams({
        client_id: import.meta.env.VITE_AZURE_CLIENT_ID,
        client_secret: clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
        scope: 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Refresh token renewal failed:', errorData);
        return null;
      }

      const tokenData = await response.json();
      console.log('✅ Token renewed successfully via refresh token');
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || this.refreshToken
      };
    } catch (error) {
      console.error('❌ Refresh token renewal failed:', error);
      return null;
    }
  }



  /**
   * Atualiza tokens no banco de dados
   */
  async updateTokensInDatabase(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_configurations')
        .update({
          oauth_access_token: accessToken,
          oauth_refresh_token: refreshToken,
          oauth_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
          updated_at: new Date().toISOString()
        })
        .eq('id', this.configId);

      if (error) {
        console.error('❌ Error updating tokens in database:', error);
        throw error;
      }
      console.log('✅ Tokens updated in database');
    } catch (error) {
      console.error('❌ Error updating tokens in database:', error);
      throw error;
    }
  }

  /**
   * Marca conta como desconectada e limpa tokens
   */
  async markAccountAsDisconnected(): Promise<void> {
    try {
      console.log('🔄 Marking account as disconnected and clearing tokens...');
      
      // Limpar tokens e marcar como inativa
      const { error } = await supabase
        .from('email_configurations')
        .update({
          is_active: false,
          oauth_access_token: '', // Limpar access token
          oauth_refresh_token: '', // Limpar refresh token
          oauth_token_expires_at: new Date(0).toISOString() // Marcar como expirado
        })
        .eq('id', this.configId);

      if (error) {
        console.error('❌ Error marking account as disconnected:', error);
      } else {
        console.log('✅ Account marked as disconnected and tokens cleared');
        
        // Limpar instância MSAL global
        if ((window as any).msalInstance) {
          try {
            await (window as any).msalInstance.clearCache();
            console.log('✅ MSAL cache cleared');
          } catch (msalError) {
            console.warn('⚠️ Error clearing MSAL cache:', msalError);
          }
        }
        
        // Limpar localStorage relacionado ao MSAL
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('msal') || key.includes('azure')) {
            localStorage.removeItem(key);
          }
        });
        console.log('✅ MSAL localStorage cleared');
        
        window.dispatchEvent(new CustomEvent('microsoft-connection-updated'));
      }
    } catch (error) {
      console.error('❌ Error marking account as disconnected:', error);
    }
  }
}