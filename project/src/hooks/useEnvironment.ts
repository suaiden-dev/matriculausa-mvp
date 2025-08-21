export const useEnvironment = () => {
  const isProduction = window.location.hostname === 'matriculausa.com';
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('dev') ||
                       window.location.hostname.includes('staging');
  
  return { isProduction, isDevelopment };
};
