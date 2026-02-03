/**
 * Configuração centralizada para Parcelow
 */

import { detectEnvironment, type EnvironmentInfo } from '../environment-detector.ts';

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
  
  // Determinar se usa Staging ou Production
  const isStaging = envInfo.isTest || envInfo.environment === 'test';
  
  const clientId = isStaging 
    ? '214' 
    : Deno.env.get('PARCELOW_CLIENT_ID_PRODUCTION') || '';
    
  const clientSecret = isStaging 
    ? 'Y6CMlgYmRM1HV33ripL84FoqJBNUw8bMfuKVCuG5' 
    : Deno.env.get('PARCELOW_CLIENT_SECRET_PRODUCTION') || '';
    
  const apiBaseUrl = isStaging 
    ? 'https://sandbox-2.parcelow.com.br' 
    : 'https://app.parcelow.com';

  console.log(`✅ Parcelow config loaded for ${envInfo.environment} environment (Staging: ${isStaging})`);

  return {
    clientId,
    clientSecret,
    apiBaseUrl,
    environment: envInfo
  };
}
