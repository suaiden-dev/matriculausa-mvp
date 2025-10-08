export const useEnvironment = () => {
  const isProduction = window.location.hostname === 'matriculausa.com' ||
                       window.location.hostname.includes('matriculausa.com');
  const isStaging = window.location.hostname === 'staging-matriculausa.netlify.app' ||
                    window.location.hostname.includes('staging-matriculausa.netlify.app');
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost') ||
                       window.location.hostname.includes('dev');
  
  return { isProduction, isStaging, isDevelopment };
};
