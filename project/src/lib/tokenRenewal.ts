import { supabase } from './supabase';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user_id: string;
  email: string;
}

export class TokenRenewalService {
  private static instance: TokenRenewalService;
  
  static getInstance(): TokenRenewalService {
    if (!TokenRenewalService.instance) {
      TokenRenewalService.instance = new TokenRenewalService();
    }
    return TokenRenewalService.instance;
  }

  /**
   * Renovar token usando refresh token do banco de dados
   */
  async renewToken(userId: string, email: string): Promise<TokenData | null> {
    try {
      console.log('🔄 Tentando renovar token para:', email);
      
      // Buscar dados atuais do banco
      const { data: config, error: fetchError } = await supabase
        .from('email_configurations')
        .select('oauth_access_token, oauth_refresh_token, oauth_token_expires_at')
        .eq('user_id', userId)
        .eq('email_address', email)
        .eq('provider_type', 'microsoft')
        .eq('is_active', true)
        .single();

      if (fetchError || !config) {
        console.error('❌ Configuração não encontrada:', fetchError);
        return null;
      }

      // Verificar se refresh token está vazio ou não existe
      if (!config.oauth_refresh_token || config.oauth_refresh_token.trim() === '') {
        console.log('⚠️ Refresh token vazio ou não encontrado - usando MSAL para renovação silenciosa');
        // Fallback: usar MSAL para renovação
        return await this.renewTokenViaMSAL(userId, email);
      }

      // Verificar se token ainda é válido
      const expiresAt = new Date(config.oauth_token_expires_at);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      if (timeUntilExpiry > 300000) { // 5 minutos
        console.log('✅ Token ainda válido por', Math.floor(timeUntilExpiry / 60000), 'minutos');
        
        // RENOVAÇÃO PROATIVA: Se o token expira em menos de 30 minutos, renovar preventivamente
        if (timeUntilExpiry < 1800000) { // 30 minutos
          console.log('🔄 Token expira em breve, renovando preventivamente...');
          // Renovar em background sem bloquear
          this.renewTokenViaMSAL(userId, email).catch(error => {
            console.log('⚠️ Renovação preventiva falhou (não crítico):', error.message);
          });
        }
        
        return {
          access_token: config.oauth_access_token,
          refresh_token: config.oauth_refresh_token,
          expires_at: config.oauth_token_expires_at,
          user_id: userId,
          email: email
        };
      }

      console.log('🔄 Token expirado, renovando...');

      // Renovar token usando refresh token
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
      
      const params = new URLSearchParams({
        client_id: clientId,
        scope: 'https://graph.microsoft.com/.default',
        refresh_token: config.oauth_refresh_token,
        grant_type: 'refresh_token'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erro ao renovar token:', data);
        return null;
      }

      console.log('✅ Token renovado com sucesso');

      // Atualizar banco com novos tokens
      const newExpiresAt = new Date(Date.now() + (data.expires_in * 1000));
      const { error: updateError } = await supabase
        .from('email_configurations')
        .update({
          oauth_access_token: data.access_token,
          oauth_refresh_token: data.refresh_token || config.oauth_refresh_token,
          oauth_token_expires_at: newExpiresAt.toISOString()
        })
        .eq('user_id', userId)
        .eq('email_address', email)
        .eq('provider_type', 'microsoft');

      if (updateError) {
        console.error('❌ Erro ao atualizar token no banco:', updateError);
        return null;
      }

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || config.oauth_refresh_token,
        expires_at: newExpiresAt.toISOString(),
        user_id: userId,
        email: email
      };

    } catch (error) {
      console.error('❌ Erro na renovação de token:', error);
      return null;
    }
  }

  /**
   * Renovar token usando MSAL (fallback quando não há refresh token)
   */
  async renewTokenViaMSAL(userId: string, email: string): Promise<TokenData | null> {
    try {
      console.log('🔄 Tentando renovação via MSAL...');
      
      // Importar MSAL dinamicamente
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const { msalConfig } = await import('../lib/msalConfig');
      
      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        console.error('❌ Nenhuma conta MSAL encontrada');
        return null;
      }
      
      // Tentar renovação silenciosa com fallback
      let response;
      try {
        response = await msalInstance.acquireTokenSilent({
          scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
          account: accounts[0],
          forceRefresh: false
        });
      } catch (silentError: any) {
        console.log('⚠️ Token silencioso falhou, tentando com forceRefresh...');
        try {
          response = await msalInstance.acquireTokenSilent({
            scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
            account: accounts[0],
            forceRefresh: true
          });
        } catch (forceRefreshError: any) {
          console.error('❌ Renovação silenciosa falhou:', forceRefreshError);
          
          // Se a renovação falhou, verificar se é erro de sessão expirada
          if (forceRefreshError.errorCode === 'user_cancelled' || 
              forceRefreshError.errorCode === 'consent_required' ||
              forceRefreshError.message?.includes('interaction_required')) {
            console.log('⚠️ Sessão expirada - usuário precisará fazer login novamente');
            // Aqui você pode implementar uma notificação para o usuário
            // Por exemplo, mostrar um modal ou toast
          }
          
          return null;
        }
      }
      
      console.log('✅ Token renovado via MSAL');
      
      // Atualizar banco com novo token (evitando undefined em expiresOn)
      const expiresOn = (response as any)?.expiresOn;
      const newExpiresAt = new Date(Date.now() + (expiresOn?.getTime() - Date.now() || 3600000));
      const { error: updateError } = await supabase
        .from('email_configurations')
        .update({
          oauth_access_token: response.accessToken,
          oauth_token_expires_at: newExpiresAt.toISOString()
        })
        .eq('user_id', userId)
        .eq('email_address', email)
        .eq('provider_type', 'microsoft');

      if (updateError) {
        console.error('❌ Erro ao atualizar token no banco:', updateError);
        return null;
      }

      return {
        access_token: response.accessToken,
        refresh_token: (response as any).refreshToken || '',
        expires_at: newExpiresAt.toISOString(),
        user_id: userId,
        email: email
      };

    } catch (error) {
      console.error('❌ Erro na renovação via MSAL:', error);
      return null;
    }
  }

  /**
   * Obter token válido (renovar se necessário)
   */
  async getValidToken(userId: string, email: string): Promise<string | null> {
    const tokenData = await this.renewToken(userId, email);
    return tokenData?.access_token || null;
  }
}

export default TokenRenewalService;
