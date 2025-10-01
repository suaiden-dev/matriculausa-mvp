/**
 * Utilitários para MSAL baseados na solução do Stack Overflow
 * para resolver erro AADSTS90023: Cross-origin token redemption
 */

/**
 * Limpa headers Origin que podem causar erro AADSTS90023
 * Baseado na solução do Stack Overflow
 */
export const clearOriginHeaders = (): void => {
  // Interceptar requisições fetch para remover headers Origin
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Se for uma requisição para Microsoft Graph ou Azure AD
    const url = typeof input === 'string' ? input : input.toString();
    
    if (url.includes('graph.microsoft.com') || url.includes('login.microsoftonline.com')) {
      // Remover headers Origin que causam erro AADSTS90023
      if (init?.headers) {
        const headers = new Headers(init.headers);
        headers.delete('Origin');
        headers.delete('origin');
        init.headers = headers;
      }
    }
    
    return originalFetch(input, init);
  };
};

/**
 * Configuração MSAL otimizada para evitar erro AADSTS90023
 */
export const getOptimizedMsalConfig = () => {
  return {
    auth: {
      clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      // Evitar headers Origin problemáticos
      navigateToLoginRequestUrl: false,
      // Configurações para SPA
      system: {
        allowNativeBroker: false,
        loggerOptions: {
          level: 'Error',
          loggerCallback: (level: string, message: string) => {
            if (level === 'Error') {
              console.error('MSAL Error:', message);
            }
          }
        }
      }
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false
    }
  };
};

/**
 * Verifica se o erro é AADSTS90023 e sugere solução
 */
export const handleAADSTS90023Error = (error: any): boolean => {
  if (error?.errorCode === 'AADSTS90023' || 
      error?.message?.includes('Cross-origin token redemption') ||
      error?.message?.includes('AADSTS90023')) {
    
    console.error('🚨 Erro AADSTS90023 detectado!');
    console.error('💡 Solução: Aplicação deve usar apenas MSAL (SPA flow)');
    console.error('🔧 Verifique se a aplicação está registrada como SPA no Azure AD');
    
    return true;
  }
  return false;
};

/**
 * Limpa instâncias MSAL duplicadas que podem causar conflitos
 */
export const clearMsalInstances = (): void => {
  // Limpar instâncias globais
  if ((window as any).msalInstance) {
    try {
      (window as any).msalInstance.clearCache();
    } catch (error) {
      console.warn('⚠️ Erro ao limpar cache MSAL:', error);
    }
  }
  
  // Limpar localStorage relacionado ao MSAL
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('msal') || key.includes('azure'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('⚠️ Erro ao limpar localStorage:', key, error);
    }
  });
};
