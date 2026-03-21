import { supabase } from './supabase';



/**
 * Serviço melhorado de renovação de tokens baseado na documentação oficial do Microsoft
 * 
 * Baseado na documentação oficial Microsoft Identity Platform:
 * - Refresh tokens são vinculados ao usuário + cliente (não a recursos específicos)
 * - Duração: 24h para SPAs, 90 dias para outros cenários
 * - Refresh tokens se renovam automaticamente a cada uso
 * - MSAL gerencia refresh tokens internamente por segurança
 * - Usar acquireTokenSilent é a forma recomendada
 * - Escopo 'offline_access' é essencial para refresh tokens
 * - Tokens são criptografados e devem ser armazenados com segurança
 */
export class ImprovedTokenRenewalService {
  private static instance: ImprovedTokenRenewalService;
  
  static getInstance(): ImprovedTokenRenewalService {
    if (!ImprovedTokenRenewalService.instance) {
      ImprovedTokenRenewalService.instance = new ImprovedTokenRenewalService();
    }
    return ImprovedTokenRenewalService.instance;
  }

  /**
   * Obter token válido usando MSAL (método recomendado pela documentação)
   */
  async getValidToken(userId: string, email: string): Promise<string | null> {
    try {
      console.log('🔄 Obtendo token válido via MSAL para:', email);
      
      // Importar MSAL dinamicamente apenas quando necessário
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const { msalConfig } = await import('../lib/msalConfig');
      
      // Verificar se já existe instância MSAL
      const existingInstance = (window as any).msalInstance;
      let msalInstance;
      
      if (existingInstance) {
        console.log('🔄 Reutilizando instância MSAL existente');
        msalInstance = existingInstance;
      } else {
        console.log('🆕 Criando nova instância MSAL');
        msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();
        (window as any).msalInstance = msalInstance;
      }
      
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        console.error('❌ Nenhuma conta MSAL encontrada');
        return null;
      }
      
      // Encontrar conta correspondente ao email
      const account = accounts.find((acc: any) => acc.username === email);
      if (!account) {
        console.error('❌ Conta não encontrada para email:', email);
        return null;
      }
      
      // Usar acquireTokenSilent (método recomendado pela documentação)
      console.log('🔄 Tentando acquireTokenSilent...');
      const response = await msalInstance.acquireTokenSilent({
        scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
        account: account,
        forceRefresh: false
      });
      
      console.log('✅ Token obtido via acquireTokenSilent');
      
      // Atualizar banco com novo token se necessário
      await this.updateTokenInDatabase(userId, email, response.accessToken, response.expiresOn);
      
      return response.accessToken;
      
    } catch (error: any) {
      console.error('❌ Erro ao obter token via MSAL:', error);
      
      // Se acquireTokenSilent falhar, tentar renovação via refresh token do banco
      if (error.errorCode === 'interaction_required' || 
          error.errorCode === 'consent_required' ||
          error.message?.includes('interaction_required')) {
        console.log('🔄 acquireTokenSilent falhou, tentando renovação via refresh token...');
        return await this.renewTokenViaRefreshToken(userId, email);
      }
      
      return null;
    }
  }

  /**
   * Renovar token usando refresh token do banco (fallback)
   */
  private async renewTokenViaRefreshToken(userId: string, email: string): Promise<string | null> {
    try {
      console.log('🔄 Tentando renovação via refresh token do banco...');
      
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

      // Verificar se refresh token está vazio
      if (!config.oauth_refresh_token || config.oauth_refresh_token.trim() === '') {
        console.log('⚠️ Refresh token vazio - usuário precisará fazer login novamente');
        return null;
      }

      // Verificar se token ainda é válido
      const expiresAt = new Date(config.oauth_token_expires_at);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      if (timeUntilExpiry > 300000) { // 5 minutos
        console.log('✅ Token ainda válido por', Math.floor(timeUntilExpiry / 60000), 'minutos');
        return config.oauth_access_token;
      }

      console.log('🔄 Token expirado, renovando via refresh token...');

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

      console.log('✅ Token renovado com sucesso via refresh token');

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

      return data.access_token;

    } catch (error) {
      console.error('❌ Erro na renovação via refresh token:', error);
      return null;
    }
  }

  /**
   * Atualizar token no banco de dados
   */
  private async updateTokenInDatabase(
    userId: string, 
    email: string, 
    accessToken: string, 
    expiresOn: Date | null
  ): Promise<void> {
    try {
      const expiresAt = expiresOn ? expiresOn.toISOString() : new Date(Date.now() + 3600000).toISOString();
      
      const { error } = await supabase
        .from('email_configurations')
        .update({
          oauth_access_token: accessToken,
          oauth_token_expires_at: expiresAt
        })
        .eq('user_id', userId)
        .eq('email_address', email)
        .eq('provider_type', 'microsoft');

      if (error) {
        console.error('❌ Erro ao atualizar token no banco:', error);
      } else {
        console.log('✅ Token atualizado no banco de dados');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar token no banco:', error);
    }
  }

  /**
   * Verificar se token está próximo do vencimento e renovar preventivamente
   * Baseado na documentação: SPAs têm refresh tokens de 24h, outros cenários 90 dias
   */
  async checkAndRenewToken(userId: string, email: string): Promise<string | null> {
    try {
      // Buscar dados atuais do banco
      const { data: config, error: fetchError } = await supabase
        .from('email_configurations')
        .select('oauth_access_token, oauth_token_expires_at, oauth_refresh_token')
        .eq('user_id', userId)
        .eq('email_address', email)
        .eq('provider_type', 'microsoft')
        .eq('is_active', true)
        .single();

      if (fetchError || !config) {
        console.error('❌ Configuração não encontrada:', fetchError);
        return null;
      }

      const expiresAt = new Date(config.oauth_token_expires_at);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      // Verificar se refresh token está vazio (pode ter sido revogado)
      if (!config.oauth_refresh_token || config.oauth_refresh_token.trim() === '') {
        console.log('⚠️ Refresh token vazio - pode ter sido revogado, forçando reautenticação');
        return null;
      }
      
      // Se token expira em menos de 30 minutos, renovar preventivamente
      if (timeUntilExpiry < 1800000) { // 30 minutos
        console.log('🔄 Token expira em breve, renovando preventivamente...');
        return await this.getValidToken(userId, email);
      }
      
      // Token ainda válido
      return config.oauth_access_token;
      
    } catch (error) {
      console.error('❌ Erro ao verificar token:', error);
      return null;
    }
  }

  /**
   * Detectar se refresh token foi revogado e tratar graciosamente
   * Baseado na documentação: Revogação pode acontecer por mudança de senha, ações do usuário/admin
   */
  async handleTokenRevocation(userId: string, email: string): Promise<boolean> {
    try {
      console.log('🔄 Verificando se refresh token foi revogado...');
      
      // Tentar usar o refresh token para detectar revogação
      const renewalService = ImprovedTokenRenewalService.getInstance();
      const token = await renewalService.getValidToken(userId, email);
      
      if (!token) {
        console.log('⚠️ Refresh token pode ter sido revogado - usuário precisa reautenticar');
        
        // Limpar tokens inválidos do banco mas manter conta ativa
        await supabase
          .from('email_configurations')
          .update({
            oauth_access_token: '',
            oauth_refresh_token: ''
            // Removido: is_active: false
          })
          .eq('user_id', userId)
          .eq('email_address', email)
          .eq('provider_type', 'microsoft');
        
        return true; // Token foi revogado
      }
      
      return false; // Token ainda válido
      
    } catch (error) {
      console.error('❌ Erro ao verificar revogação:', error);
      return false;
    }
  }
}

export default ImprovedTokenRenewalService;
