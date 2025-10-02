import { supabase } from '../supabase';
import { refreshWebAppToken } from '../webAppAuthConfig';

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
   * SEM MSAL/SPA - Apenas Web App flow
   */
  async renewToken(): Promise<TokenResult | null> {
    console.log('🔄 Attempting token renewal via Web App flow...');
    
    try {
      const refreshResult = await this.tryRefreshTokenRenewal();
      if (refreshResult) {
        console.log('✅ Token renewed via Web App flow');
        return refreshResult;
      }

      console.log('❌ Web App flow failed - user needs to reconnect');
      return null;
    } catch (error) {
      console.error('❌ Error during token renewal:', error);
      return null;
    }
  }

  /**
   * Tenta renovar token via Refresh Token (Web App flow)
   * Usa configuração centralizada para Web App
   */
  private async tryRefreshTokenRenewal(): Promise<TokenResult | null> {
    try {
      console.log('🔄 Trying refresh token renewal via Web App flow...');
      
      if (!this.refreshToken) {
        console.log('❌ No refresh token available');
        return null;
      }

      // Usar função centralizada para Web App flow
      const tokenData = await refreshWebAppToken(this.refreshToken);
      console.log('✅ Token renewed successfully via Web App flow');
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || this.refreshToken
      };
    } catch (error) {
      console.error('❌ Refresh token renewal failed:', error);
      
      // Verificar se é erro AADSTS90023
      if (error instanceof Error && error.message.includes('AADSTS90023')) {
        console.error('🚨 Erro AADSTS90023 detectado!');
        console.error('💡 Solução: Verificar configuração Azure AD - aplicação deve ser registrada como Web App');
        console.error('🔧 Verifique se não há URLs duplicadas entre Web e SPA no Azure AD Portal');
      }
      
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
        
        // Limpar localStorage relacionado ao Microsoft
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('microsoft') || key.includes('azure')) {
            localStorage.removeItem(key);
          }
        });
        console.log('✅ Microsoft localStorage cleared');
        
        window.dispatchEvent(new CustomEvent('microsoft-connection-updated'));
      }
    } catch (error) {
      console.error('❌ Error marking account as disconnected:', error);
    }
  }
}