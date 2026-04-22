/**
 * Configuração centralizada para Parcelow
 */

import { detectEnvironment, type EnvironmentInfo } from '../environment-detector.ts';

// @ts-ignore: Deno is provided by the Supabase runtime
declare const Deno: any;

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
  
  // Tentar obter do ambiente primeiro
  const envClientId = Deno.env.get('PARCELOW_CLIENT_ID_PRODUCTION');
  const envClientSecret = Deno.env.get('PARCELOW_CLIENT_SECRET_PRODUCTION');
  const stagingClientId = Deno.env.get('PARCELOW_CLIENT_ID_STAGING') || '214';
  const stagingClientSecret = Deno.env.get('PARCELOW_CLIENT_SECRET_STAGING') || 'Y6CMlgYmRM1HV33ripL84FoqJBNUw8bMfuKVCuG5';

  let clientId = '';
  let clientSecret = '';
  let apiBaseUrl = '';

  if (isStaging) {
    clientId = stagingClientId;
    clientSecret = stagingClientSecret;
    apiBaseUrl = 'https://sandbox-2.parcelow.com.br';
  } else {
    // Se for produção, PRIORIZAR as variáveis de ambiente PROD
    // Se não existirem, e houver chaves de STAGING no ENV, usar como fallback
    // Se nada existir, usar o hardcoded 214 (MIGMA) como última instância
    clientId = envClientId || Deno.env.get('PARCELOW_CLIENT_ID_STAGING') || '214';
    clientSecret = envClientSecret || Deno.env.get('PARCELOW_CLIENT_SECRET_STAGING') || 'Y6CMlgYmRM1HV33ripL84FoqJBNUw8bMfuKVCuG5';
    
    // Se o clientId for 214, provavelmente estamos em sandbox mesmo em "produção"
    apiBaseUrl = (clientId === '214') 
      ? 'https://sandbox-2.parcelow.com.br' 
      : 'https://app.parcelow.com.br';
  }

  console.log(`✅ Parcelow config loaded for ${envInfo.environment} environment`);
  console.log(`🔍 Client ID: ${clientId} (${clientId === '214' ? 'SANDBOX/MIGMA' : 'PRODUCTION'})`);

  return {
    clientId,
    clientSecret,
    apiBaseUrl,
    environment: envInfo
  };
}
