/**
 * Configuração centralizada para Parcelow
 */

import { detectEnvironment, type EnvironmentInfo } from './shared/environment-detector.ts';

export interface ParcelowConfig {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  environment: EnvironmentInfo;
}

/**
 * Obtém a configuração da Parcelow baseada no ambiente detectado
 * @param req - Request object para detectar o ambiente
 */
export function getParcelowConfig(req: Request): ParcelowConfig {
  const envInfo = detectEnvironment(req);
  
  // Use sandbox for both local development and staging environment
  const isStaging = envInfo.isTest || envInfo.isStaging;
  
  const clientId = isStaging 
    ? Deno.env.get('PARCELOW_CLIENT_ID_STAGING') || '' 
    : Deno.env.get('PARCELOW_CLIENT_ID_PRODUCTION') || '';
    
  const clientSecret = isStaging 
    ? Deno.env.get('PARCELOW_CLIENT_SECRET_STAGING') || '' 
    : Deno.env.get('PARCELOW_CLIENT_SECRET_PRODUCTION') || '';
    
  const apiBaseUrl = isStaging 
    ? 'https://sandbox-2.parcelow.com.br' 
    : 'https://app.parcelow.com.br';

  console.log(`✅ Parcelow config loaded for ${envInfo.environment} environment (Staging: ${isStaging})`);

  return {
    clientId,
    clientSecret,
    apiBaseUrl,
    environment: envInfo
  };
}
