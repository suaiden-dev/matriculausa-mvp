/**
 * Utilitário para limpar cache Microsoft e resolver problemas de bloqueio local
 * 
 * Uso: Importar e chamar clearMicrosoftCache() quando necessário
 */

export const clearMicrosoftCache = (): void => {
  try {
    console.log('🧹 Iniciando limpeza do cache Microsoft...');
    
    // 1. Limpar localStorage
    const localStorageKeys = Object.keys(localStorage);
    const microsoftKeys = localStorageKeys.filter(key => 
      key.toLowerCase().includes('microsoft') ||
      key.toLowerCase().includes('msal') ||
      key.toLowerCase().includes('azure') ||
      key.toLowerCase().includes('oauth') ||
      key.toLowerCase().includes('auth')
    );
    
    microsoftKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removido do localStorage: ${key}`);
    });
    
    // 2. Limpar sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    const microsoftSessionKeys = sessionStorageKeys.filter(key => 
      key.toLowerCase().includes('microsoft') ||
      key.toLowerCase().includes('msal') ||
      key.toLowerCase().includes('azure') ||
      key.toLowerCase().includes('oauth') ||
      key.toLowerCase().includes('auth')
    );
    
    microsoftSessionKeys.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`🗑️ Removido do sessionStorage: ${key}`);
    });
    
    // 3. Limpar cookies Microsoft
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      if (cookieName.toLowerCase().includes('microsoft') ||
          cookieName.toLowerCase().includes('msal') ||
          cookieName.toLowerCase().includes('azure') ||
          cookieName.toLowerCase().includes('oauth') ||
          cookieName.toLowerCase().includes('auth')) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.microsoft.com;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.login.microsoftonline.com;`;
        console.log(`🗑️ Removido cookie: ${cookieName}`);
      }
    });
    
    // 4. Limpar cache do MSAL se existir
    if ((window as any).msalInstance) {
      try {
        (window as any).msalInstance.clearCache();
        console.log('🗑️ Cache MSAL limpo');
      } catch (error) {
        console.log('⚠️ Erro ao limpar cache MSAL:', error);
      }
    }
    
    // 5. Limpar dados específicos do nosso app
    const appKeys = [
      'active_microsoft_connection',
      'sb-fitpynguasqqutuhzifx-auth-token',
      'cached_user',
      'cached_user_profile'
    ];
    
    appKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      console.log(`🗑️ Removido dado do app: ${key}`);
    });
    
    console.log('✅ Limpeza do cache Microsoft concluída!');
    console.log('🔄 Recarregue a página para aplicar as mudanças');
    
    // 6. Mostrar instruções para o usuário
    alert(`
🧹 Cache Microsoft limpo com sucesso!

Próximos passos:
1. Recarregue a página (F5)
2. Tente fazer login novamente
3. Se ainda não funcionar, use modo incógnito

Se o problema persistir:
- Teste em outro navegador
- Teste em outro dispositivo
- Teste em rede diferente
    `);
    
  } catch (error) {
    console.error('❌ Erro durante limpeza do cache:', error);
    alert('Erro durante limpeza do cache. Tente limpar manualmente o navegador.');
  }
};

/**
 * Verificar se há problemas de cache Microsoft
 */
export const checkMicrosoftCacheIssues = (): boolean => {
  try {
    const localStorageKeys = Object.keys(localStorage);
    const sessionStorageKeys = Object.keys(sessionStorage);
    const cookies = document.cookie;
    
    const microsoftKeys = [...localStorageKeys, ...sessionStorageKeys].filter(key => 
      key.toLowerCase().includes('microsoft') ||
      key.toLowerCase().includes('msal') ||
      key.toLowerCase().includes('azure')
    );
    
    const hasMicrosoftCookies = cookies.toLowerCase().includes('microsoft') ||
                               cookies.toLowerCase().includes('msal') ||
                               cookies.toLowerCase().includes('azure');
    
    console.log('🔍 Verificação de cache Microsoft:');
    console.log(`- Chaves Microsoft no localStorage/sessionStorage: ${microsoftKeys.length}`);
    console.log(`- Cookies Microsoft: ${hasMicrosoftCookies ? 'Sim' : 'Não'}`);
    
    return microsoftKeys.length > 0 || hasMicrosoftCookies;
    
  } catch (error) {
    console.error('❌ Erro ao verificar cache:', error);
    return false;
  }
};

/**
 * Forçar limpeza completa e recarregamento
 */
export const forceClearAndReload = (): void => {
  clearMicrosoftCache();
  
  // Aguardar um pouco e recarregar
  setTimeout(() => {
    window.location.reload();
  }, 1000);
};
