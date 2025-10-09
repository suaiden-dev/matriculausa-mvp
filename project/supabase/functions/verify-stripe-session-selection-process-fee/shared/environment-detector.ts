/**
 * Sistema de detecção de ambiente para Edge Functions
 * Detecta automaticamente se está em produção ou teste baseado na requisição
 */

export type Environment = 'production' | 'staging' | 'test';

export interface EnvironmentInfo {
  environment: Environment;
  isProduction: boolean;
  isStaging: boolean;
  isTest: boolean;
  referer?: string;
  origin?: string;
  host?: string;
}

/**
 * Detecta o ambiente baseado nos headers da requisição
 */
export function detectEnvironment(req: Request): EnvironmentInfo {
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const host = req.headers.get('host') || '';
  
  // Log para debug
  console.log('🔍 Environment Detection:', {
    referer,
    origin,
    host,
    userAgent: req.headers.get('user-agent')?.substring(0, 50) + '...'
  });

  // Detectar produção: se qualquer header contém matriculausa.com
  // Detectar staging: se qualquer header contém staging-matriculausa.netlify.app
  const isProduction = 
    referer.includes('matriculausa.com') ||
    origin.includes('matriculausa.com') ||
    host.includes('matriculausa.com');
    
  const isStaging = 
    referer.includes('staging-matriculausa.netlify.app') ||
    origin.includes('staging-matriculausa.netlify.app') ||
    host.includes('staging-matriculausa.netlify.app');

  // Determinar ambiente: produção > staging > teste
  let environment: Environment;
  if (isProduction) {
    environment = 'production';
  } else if (isStaging) {
    environment = 'staging';
  } else {
    environment = 'test';
  }

  console.log(`🎯 Environment detected: ${environment.toUpperCase()}`);

  return {
    environment,
    isProduction,
    isStaging,
    isTest: !isProduction && !isStaging,
    referer,
    origin,
    host
  };
}

/**
 * Obtém as variáveis de ambiente do Stripe baseadas no ambiente detectado
 */
export function getStripeEnvironmentVariables(envInfo: EnvironmentInfo) {
  let suffix: string;
  if (envInfo.isProduction) {
    suffix = 'PROD';
  } else if (envInfo.isStaging) {
    suffix = 'STAGING';
  } else {
    suffix = 'TEST';
  }
  
  const config = {
    secretKey: Deno.env.get(`STRIPE_SECRET_KEY_${suffix}`) || '',
    webhookSecret: Deno.env.get(`STRIPE_WEBHOOK_SECRET_${suffix}`) || '',
    publishableKey: Deno.env.get(`STRIPE_PUBLISHABLE_KEY_${suffix}`) || '',
    connectClientId: Deno.env.get(`STRIPE_CONNECT_CLIENT_ID_${suffix}`) || ''
  };

  // Log das chaves (mascaradas para segurança)
  console.log(`🔑 Stripe Config (${envInfo.environment}):`, {
    secretKey: config.secretKey ? `${config.secretKey.substring(0, 20)}...` : '❌ Missing',
    webhookSecret: config.webhookSecret ? `${config.webhookSecret.substring(0, 20)}...` : '❌ Missing',
    publishableKey: config.publishableKey ? `${config.publishableKey.substring(0, 20)}...` : '❌ Missing',
    connectClientId: config.connectClientId ? `${config.connectClientId.substring(0, 20)}...` : '❌ Missing'
  });

  return config;
}

/**
 * Valida se as variáveis de ambiente estão configuradas corretamente
 */
export function validateStripeEnvironmentVariables(config: ReturnType<typeof getStripeEnvironmentVariables>, envInfo: EnvironmentInfo): string[] {
  const errors: string[] = [];
  let suffix: string;
  if (envInfo.isProduction) {
    suffix = 'PROD';
  } else if (envInfo.isStaging) {
    suffix = 'STAGING';
  } else {
    suffix = 'TEST';
  }

  if (!config.secretKey) {
    errors.push(`STRIPE_SECRET_KEY_${suffix} is required for ${envInfo.environment} environment`);
  }

  if (!config.webhookSecret) {
    errors.push(`STRIPE_WEBHOOK_SECRET_${suffix} is required for ${envInfo.environment} environment`);
  }

  // Connect Client ID é opcional para algumas funções
  if (!config.connectClientId) {
    console.warn(`⚠️ STRIPE_CONNECT_CLIENT_ID_${suffix} not configured for ${envInfo.environment} environment - some features may not work`);
  }

  return errors;
}
