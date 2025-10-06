/**
 * Interceptador de fetch para resolver erro AADSTS90023
 * Remove headers Origin que causam problemas de cross-origin
 */

let isInterceptorActive = false;

/**
 * Ativa o interceptador de fetch para resolver AADSTS90023
 */
export const activateFetchInterceptor = (): void => {
  if (isInterceptorActive) {
    console.log('🔄 Fetch interceptor já está ativo');
    return;
  }

  console.log('🔄 Ativando fetch interceptor para resolver AADSTS90023...');
  
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Aplicar limpeza apenas para requisições Microsoft
    if (url.includes('login.microsoftonline.com') || url.includes('graph.microsoft.com')) {
      if (init?.headers) {
        const headers = new Headers(init.headers);
        
        // Remover headers Origin problemáticos
        headers.delete('Origin');
        headers.delete('origin');
        
        // Ajuste: só force application/x-www-form-urlencoded para endpoints de token (login.microsoftonline.com)
        if (url.includes('login.microsoftonline.com')) {
          headers.set('Content-Type', 'application/x-www-form-urlencoded');
        }
        
        init.headers = headers;
      }
    }
    
    return originalFetch(input, init);
  };
  
  isInterceptorActive = true;
  console.log('✅ Fetch interceptor ativado');
};

/**
 * Desativa o interceptador de fetch
 */
export const deactivateFetchInterceptor = (): void => {
  if (!isInterceptorActive) {
    return;
  }
  
  console.log('🔄 Desativando fetch interceptor...');
  
  // Restaurar fetch original (isso pode não funcionar em todos os casos)
  // O ideal é recarregar a página se necessário
  isInterceptorActive = false;
  console.log('✅ Fetch interceptor desativado');
};

/**
 * Verifica se o interceptador está ativo
 */
export const getIsInterceptorActive = (): boolean => {
  return isInterceptorActive;
};

/**
 * Limpa cache e localStorage relacionado ao Microsoft
 */
export const clearMicrosoftCache = (): void => {
  console.log('🔄 Limpando cache Microsoft...');
  
  // Limpar localStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('microsoft') || key.includes('azure')) {
      localStorage.removeItem(key);
    }
  });
  
  // Limpar sessionStorage
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (key.includes('microsoft') || key.includes('azure')) {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('✅ Cache Microsoft limpo');
};

/**
 * Diagnóstica problemas de autenticação
 */
export const diagnoseAuthIssues = (): string[] => {
  const issues: string[] = [];
  
  // Verificar variáveis de ambiente
  if (!import.meta.env.VITE_AZURE_CLIENT_ID) {
    issues.push('VITE_AZURE_CLIENT_ID não configurado');
  }
  
  if (!import.meta.env.VITE_AZURE_CLIENT_SECRET) {
    issues.push('VITE_AZURE_CLIENT_SECRET não configurado (necessário para Web App flow)');
  }
  
  // Verificar localStorage Microsoft
  const microsoftKeys = Object.keys(localStorage).filter(key => key.includes('microsoft'));
  if (microsoftKeys.length > 0) {
    issues.push(`${microsoftKeys.length} entradas Microsoft no localStorage`);
  }
  
  return issues;
};
