export const useEnvironment = () => {
  const hostname = window.location.hostname;
  const href = window.location.href;
  
  
  // Verificações mais robustas
  const isProduction = hostname === 'matriculausa.com' ||
                       hostname.includes('matriculausa.com') ||
                       href.includes('matriculausa.com');
  
  const isStaging = hostname === 'staging-matriculausa.netlify.app' ||
                    hostname.includes('staging-matriculausa.netlify.app') ||
                    hostname.includes('staging-matriculausa') ||
                    href.includes('staging-matriculausa.netlify.app') ||
                    href.includes('staging-matriculausa');
  
  const isDevelopment = hostname === 'localhost' || 
                       hostname === '127.0.0.1' ||
                       hostname.includes('localhost') ||
                       hostname.includes('dev');
  
  
  return { isProduction, isStaging, isDevelopment };
};
