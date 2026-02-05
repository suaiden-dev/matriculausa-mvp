// Configuração dinâmica baseada no ambiente
export const config = {
  // Detectar se está em desenvolvimento ou produção
  isDevelopment: () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('localhost');
  },

  isProduction: () => {
    return window.location.hostname === 'matriculausa.com' ||
           window.location.hostname.includes('matriculausa.com');
  },

  isStaging: () => {
    return window.location.hostname === 'staging-matriculausa.netlify.app' ||
           window.location.hostname.includes('staging-matriculausa.netlify.app');
  },

  /** Parcelow agora disponível em todos os ambientes (Homologado) */
  showParcelowPaymentMethod: () => {
    return true;
  },

  // URLs dinâmicas baseadas no ambiente
  getFrontendUrl: () => {
    if (config.isDevelopment()) {
      return window.location.origin; // Usar URL atual em desenvolvimento
    } else if (config.isProduction()) {
      return 'https://matriculausa.com';
    } else if (config.isStaging()) {
      return 'https://staging-matriculausa.netlify.app';
    }
    // Fallback para outros ambientes
    return window.location.origin;
  },

  getSupabaseUrl: () => {
    return import.meta.env.VITE_SUPABASE_URL;
  },

  // URL de redirecionamento OAuth dinâmica
  getOAuthRedirectUrl: () => {
    const supabaseUrl = config.getSupabaseUrl();
    return `${supabaseUrl}/functions/v1/google-oauth-callback`;
  },

  // Log da configuração atual
  logCurrentConfig: () => {
    console.log('🔧 Configuração atual:', {
      hostname: window.location.hostname,
      isDevelopment: config.isDevelopment(),
      isProduction: config.isProduction(),
      isStaging: config.isStaging(),
      frontendUrl: config.getFrontendUrl(),
      supabaseUrl: config.getSupabaseUrl(),
      oauthRedirectUrl: config.getOAuthRedirectUrl()
    });
  }
};

export default config; 