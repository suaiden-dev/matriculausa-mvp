import { useMsal } from '@azure/msal-react';

/**
 * Utility hook for MSAL debugging and cache management
 */
export const useMsalUtils = () => {
  const { instance } = useMsal();

  const clearCache = async () => {
    try {
      // Clear session storage
      sessionStorage.clear();
      
      // Clear any redirect state
      sessionStorage.removeItem('msalRedirectOrigin');
      
      // Clear localStorage as well (in case it's used)
      localStorage.removeItem('msal.interaction.status');
      localStorage.removeItem('msal.account.keys');
      
      console.log('MSAL cache cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing MSAL cache:', error);
      return false;
    }
  };

  const getDebugInfo = () => {
    const accounts = instance.getAllAccounts();
    const config = instance.getConfiguration();
    
    return {
      accounts: accounts.length,
      clientId: config.auth.clientId,
      redirectUri: config.auth.redirectUri,
      authority: config.auth.authority,
      cacheLocation: config.cache.cacheLocation,
      activeAccount: instance.getActiveAccount()?.username || 'None'
    };
  };

  const logoutAll = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: clear cache manually
      clearCache();
      window.location.reload();
    }
  };

  return {
    clearCache,
    getDebugInfo,
    logoutAll
  };
};

export default useMsalUtils;