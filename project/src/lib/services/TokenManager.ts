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
   * Renova o token usando MSAL ou Web App flow
   */
  async renewToken(): Promise<TokenResult | null> {
    console.log('🔄 Attempting token renewal...');
    
    try {
      // Priorizar fluxo SPA (MSAL)
      const msalResult = await this.tryMSALRenewal();
      if (msalResult) return msalResult;

      // Fallback para Web App flow se MSAL falhar
      const webAppResult = await this.tryWebAppRenewal();
      if (webAppResult) return webAppResult;

      console.error('❌ All token renewal methods failed');
      return null;
    } catch (error) {
      console.error('❌ Error during token renewal:', error);
      return null;
    }
  }

  /**
   * Tenta renovar token via MSAL (SPA flow)
   */
  private async tryMSALRenewal(): Promise<TokenResult | null> {
    try {
      console.log('🔄 Trying MSAL renewal...');
      const msalManager = MSALAccountManager.getInstance();
      const msalInstance = await msalManager.getMSALInstance();
      const accounts = msalInstance.getAllAccounts();

      if (accounts.length === 0) {
        console.log('❌ No MSAL accounts found');
        return null;
      }

      let targetAccount = accounts[0];
      if (accounts.length > 1 && this.configId) {
        const accountFromConfig = accounts.find(acc => 
          acc.homeAccountId === this.configId || 
          acc.localAccountId === this.configId || 
          acc.username === this.configId
        );
        if (accountFromConfig) {
          targetAccount = accountFromConfig;
        }
      }

      const config = getMicrosoftAuthConfig();
      const response = await msalInstance.acquireTokenSilent({
        scopes: config.scopes,
        account: targetAccount,
        forceRefresh: true
      });

      console.log('✅ Token renewed successfully via MSAL');
      return { 
        accessToken: response.accessToken, 
        refreshToken: this.refreshToken // MSAL não retorna refreshToken, usar o atual
      };
    } catch (error) {
      console.error('❌ MSAL renewal failed:', error);
      return null;
    }
  }

  /**
   * Tenta renovar token via Web App flow
   */
  private async tryWebAppRenewal(): Promise<TokenResult | null> {
    try {
      const useWebAppFlow = shouldUseWebAppFlow();
      const config = getMicrosoftAuthConfig();

      if (!useWebAppFlow || !config.clientSecret || !this.refreshToken) {
        console.log('❌ Web App flow not available or refresh token missing');
        return null;
      }

      console.log('🔄 Trying Web App flow renewal...');
      
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
          scope: config.scopes.join(' ')
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Web App flow renewal failed:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('✅ Token renewed successfully via Web App flow');
      return { 
        accessToken: data.access_token, 
        refreshToken: data.refresh_token 
      };
    } catch (error) {
      console.error('❌ Web App flow renewal failed:', error);
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
   * Marca conta como desconectada
   */
  async markAccountAsDisconnected(): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_configurations')
        .update({
          oauth_access_token: null,
          oauth_refresh_token: null
        })
        .eq('id', this.configId);

      if (error) {
        console.error('❌ Error marking account as disconnected:', error);
      } else {
        console.log('✅ Account marked as disconnected and tokens cleared');
        window.dispatchEvent(new CustomEvent('microsoft-connection-updated'));
      }
    } catch (error) {
      console.error('❌ Error marking account as disconnected:', error);
    }
  }
}