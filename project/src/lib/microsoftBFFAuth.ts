/**
 * Microsoft BFF (Backend for Frontend) Authentication
 * 
 * Esta biblioteca implementa o fluxo OAuth 2.0 usando Edge Functions
 * para obter refresh tokens de longa duração (90 dias) em vez de
 * depender do MSAL.js que não retorna refresh tokens confiáveis.
 */

/**
 * Função helper para obter o redirect URI de forma segura
 */
function getRedirectUri(): string {
  if (import.meta.env.VITE_AZURE_REDIRECT_URI) {
    return import.meta.env.VITE_AZURE_REDIRECT_URI;
  }
  
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/microsoft-email`;
  }
  
  // Fallback para desenvolvimento
  return 'http://localhost:5173/microsoft-email';
}

interface MicrosoftAuthConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

interface MicrosoftAuthUrlParams {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
  responseType: string;
  responseMode: string;
  state?: string;
  prompt?: string;
}

/**
 * Configuração padrão para Microsoft BFF Auth
 */
export const microsoftBFFConfig: MicrosoftAuthConfig = {
  clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
  tenantId: 'common', // FORÇAR TENANT COMMON para contas pessoais
  redirectUri: getRedirectUri(),
  scopes: [
    'User.Read',
    'Mail.Read', 
    'Mail.ReadWrite',
    'Mail.Send',
    'offline_access'
  ]
};

/**
 * Gera URL de autorização Microsoft para fluxo BFF
 */
export function generateMicrosoftAuthUrl(params?: Partial<MicrosoftAuthUrlParams>): string {
  const config = {
    ...microsoftBFFConfig,
    ...params
  };

  const baseUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`;
  
  const urlParams = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code', // FORÇAR FLUXO DE CÓDIGO PARA OBTER REFRESH TOKEN
    response_mode: 'query', // Usar query em vez de fragment
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    prompt: 'consent', // FORÇAR CONSENTIMENTO PARA OBTER REFRESH TOKEN
    state: params?.state || generateRandomState(),
    nonce: generateRandomNonce()
  });

  const authUrl = `${baseUrl}?${urlParams.toString()}`;
  
  console.log('🔗 URL de autorização Microsoft BFF gerada:', {
    baseUrl,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    responseType: 'code',
    responseMode: 'query'
  });

  return authUrl;
}

/**
 * Abre popup para autorização Microsoft usando BFF
 */
export function openMicrosoftAuthPopup(): Promise<{ success: boolean; email?: string; error?: string }> {
  return new Promise((resolve) => {
    const authUrl = generateMicrosoftAuthUrl();
    
    console.log('🚀 Abrindo popup Microsoft BFF...');
    
    // Configurar popup
    const popup = window.open(
      authUrl,
      'microsoft-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      console.error('❌ Falha ao abrir popup - bloqueado pelo navegador');
      resolve({ success: false, error: 'Popup bloqueado pelo navegador' });
      return;
    }

    // Listener para mensagens do popup
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'MICROSOFT_AUTH_SUCCESS') {
        console.log('✅ Autorização Microsoft BFF bem-sucedida:', event.data.email);
        window.removeEventListener('message', messageListener);
        popup.close();
        resolve({ success: true, email: event.data.email });
      } else if (event.data.type === 'MICROSOFT_AUTH_ERROR') {
        console.error('❌ Erro na autorização Microsoft BFF:', event.data.error);
        window.removeEventListener('message', messageListener);
        popup.close();
        resolve({ success: false, error: event.data.error });
      }
    };

    window.addEventListener('message', messageListener);

    // Verificar se popup foi fechado manualmente
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        console.log('⚠️ Popup fechado pelo usuário');
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
        resolve({ success: false, error: 'Popup fechado pelo usuário' });
      }
    }, 1000);

    // Timeout para evitar popup infinito
    setTimeout(() => {
      if (!popup.closed) {
        console.log('⏰ Timeout do popup Microsoft BFF');
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', messageListener);
        resolve({ success: false, error: 'Timeout da autorização' });
      }
    }, 300000); // 5 minutos
  });
}

/**
 * Redireciona para autorização Microsoft usando BFF (sem popup)
 */
export function redirectToMicrosoftAuth(): void {
  const authUrl = generateMicrosoftAuthUrl();
  
  console.log('🔄 Redirecionando para autorização Microsoft BFF...');
  window.location.href = authUrl;
}

/**
 * Gera state aleatório para segurança
 */
function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera nonce aleatório para segurança
 */
function generateRandomNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica se o ambiente está configurado corretamente para BFF
 */
export function validateBFFEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!microsoftBFFConfig.clientId) {
    errors.push('VITE_AZURE_CLIENT_ID não configurado');
  }
  
  if (!microsoftBFFConfig.tenantId) {
    errors.push('VITE_AZURE_TENANT_ID não configurado');
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuração BFF inválida:', errors);
  } else {
    console.log('✅ Configuração BFF válida');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Hook para usar Microsoft BFF Auth em componentes React
 */
export function useMicrosoftBFFAuth() {
  const validateEnvironment = () => validateBFFEnvironment();
  
  const connectWithPopup = () => openMicrosoftAuthPopup();
  
  const connectWithRedirect = () => redirectToMicrosoftAuth();
  
  return {
    validateEnvironment,
    connectWithPopup,
    connectWithRedirect,
    config: microsoftBFFConfig
  };
}
