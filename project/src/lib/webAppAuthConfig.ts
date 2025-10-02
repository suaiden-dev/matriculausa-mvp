/**
 * Configuração APENAS para Web App flow (não SPA)
 * Compatível com aplicações registradas como "Web" no Azure AD
 */

export interface WebAppAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string;
  scopes: string[];
}

export const getWebAppAuthConfig = (): WebAppAuthConfig => {
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_AZURE_CLIENT_SECRET;
  const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI || `${window.location.origin}/microsoft-email`;
  const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'common';
  
  if (!clientId) {
    throw new Error('VITE_AZURE_CLIENT_ID is required for Web App flow');
  }
  
  if (!clientSecret) {
    throw new Error('VITE_AZURE_CLIENT_SECRET is required for Web App flow');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    tenantId,
    scopes: [
      'https://graph.microsoft.com/.default' // Scope correto para Web App
    ]
  };
};

/**
 * Gera URL de autorização para Web App flow
 */
export const generateWebAppAuthUrl = (): string => {
  const config = getWebAppAuthConfig();
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    response_mode: 'query',
    state: 'web-app-flow'
  });

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
};

/**
 * Troca código de autorização por tokens (Web App flow)
 */
export const exchangeCodeForTokens = async (code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> => {
  const config = getWebAppAuthConfig();
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' ')
  });

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
  }

  return await response.json();
};

/**
 * Renova token usando refresh token (Web App flow)
 */
export const refreshWebAppToken = async (refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> => {
  const config = getWebAppAuthConfig();
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: config.scopes.join(' ')
  });

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
  }

  return await response.json();
};

/**
 * Verifica se a configuração está correta para Web App flow
 */
export const validateWebAppConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!import.meta.env.VITE_AZURE_CLIENT_ID) {
    errors.push('VITE_AZURE_CLIENT_ID não configurado');
  }
  
  if (!import.meta.env.VITE_AZURE_CLIENT_SECRET) {
    errors.push('VITE_AZURE_CLIENT_SECRET não configurado (obrigatório para Web App flow)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
