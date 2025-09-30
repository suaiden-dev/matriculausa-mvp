// Configuração centralizada para autenticação Microsoft
// Resolve o problema AADSTS90023 e múltiplas instâncias

export interface MicrosoftAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  tenantId?: string;
  scopes: string[];
}

export const getMicrosoftAuthConfig = (): MicrosoftAuthConfig => {
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_AZURE_CLIENT_SECRET;
  const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI || `${window.location.origin}/microsoft-email`;
  const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'common';
  
  if (!clientId) {
    throw new Error('VITE_AZURE_CLIENT_ID is required');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    tenantId,
    scopes: [
      'User.Read',
      'Mail.Read',
      'Mail.ReadWrite', 
      'Mail.Send',
      'offline_access'
    ]
  };
};

// Determinar se deve usar fluxo Web App ou SPA
export const shouldUseWebAppFlow = (): boolean => {
  const clientSecret = import.meta.env.VITE_AZURE_CLIENT_SECRET;
  return !!clientSecret;
};

// Configuração MSAL otimizada para evitar AADSTS90023
export const getOptimizedMsalConfig = () => {
  const config = getMicrosoftAuthConfig();
  
  return {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: config.redirectUri,
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: false,
      knownAuthorities: [`https://login.microsoftonline.com/${config.tenantId}`],
    },
    cache: {
      cacheLocation: 'localStorage' as const,
      storeAuthStateInCookie: true,
      secureCookies: false,
    },
    system: {
      windowHashTimeout: 60000,
      iframeHashTimeout: 6000,
      loadFrameTimeout: 0,
      loggerOptions: {
        loggerCallback: (level: number, message: string, containsPii: boolean) => {
          if (containsPii) return;
          
          switch (level) {
            case 0: // Error
              console.error(`MSAL Error: ${message}`);
              break;
            case 1: // Warning
              console.warn(`MSAL Warning: ${message}`);
              break;
            case 2: // Info
              console.info(`MSAL Info: ${message}`);
              break;
            case 3: // Verbose
              console.log(`MSAL Verbose: ${message}`);
              break;
          }
        },
        piiLoggingEnabled: false
      }
    }
  };
};

// Função para detectar e resolver problemas de autenticação
export const diagnoseAuthIssues = (): string[] => {
  const issues: string[] = [];
  const config = getMicrosoftAuthConfig();
  
  if (!config.clientId) {
    issues.push('VITE_AZURE_CLIENT_ID não configurado');
  }
  
  if (!config.clientSecret && shouldUseWebAppFlow()) {
    issues.push('VITE_AZURE_CLIENT_SECRET não configurado para fluxo Web App');
  }
  
  if (config.clientSecret && !shouldUseWebAppFlow()) {
    issues.push('VITE_AZURE_CLIENT_SECRET configurado mas fluxo SPA detectado');
  }
  
  return issues;
};

// Função para limpar instâncias MSAL duplicadas
export const clearMsalInstances = () => {
  // Limpar instâncias MSAL do localStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('msal') || key.includes('azure')) {
      localStorage.removeItem(key);
    }
  });
  
  // Limpar instância global
  if ((window as any).msalInstance) {
    delete (window as any).msalInstance;
  }
};
