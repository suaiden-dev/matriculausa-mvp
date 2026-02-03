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

const PRODUCTION_ORIGIN = 'https://matriculausa.com';
const STAGING_ORIGIN = 'https://staging-matriculausa.netlify.app';
const LOCALHOST_ORIGIN = 'http://localhost:5173';

/**
 * Retorna o origin base para URLs de callback/redirect (Parcelow, etc.).
 * Garante que requisições vindas de matriculausa.com ou staging nunca redirecionem para localhost.
 * Usa referer e origin da requisição para detectar o host de origem.
 */
export function getRedirectOrigin(req: Request): string {
  const referer = req.headers.get('referer') || '';
  const originHeader = req.headers.get('origin') || '';

  // Staging primeiro: se qualquer header indicar staging, usar staging
  if (
    referer.includes('staging-matriculausa.netlify.app') ||
    originHeader.includes('staging-matriculausa.netlify.app')
  ) {
    return STAGING_ORIGIN;
  }

  // Produção: matriculausa.com (não staging)
  if (
    referer.includes('matriculausa.com') ||
    originHeader.includes('matriculausa.com')
  ) {
    return PRODUCTION_ORIGIN;
  }

  // Se o header Origin for uma URL válida (ex.: localhost), usar
  if (originHeader && (originHeader.startsWith('http://') || originHeader.startsWith('https://'))) {
    try {
      const u = new URL(originHeader);
      return u.origin;
    } catch {
      // ignorar
    }
  }

  // Fallback para dev local
  return LOCALHOST_ORIGIN;
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
 * Obtém todos os webhook secrets disponíveis para tentativa de verificação
 * Útil para webhooks do Stripe que não enviam headers de ambiente
 */
export function getAllWebhookSecrets(): { env: Environment; secret: string }[] {
  const secrets = [];
  
  const prodSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD');
  const stagingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_STAGING');
  const testSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');
  
  if (prodSecret) secrets.push({ env: 'production' as Environment, secret: prodSecret });
  if (stagingSecret) secrets.push({ env: 'staging' as Environment, secret: stagingSecret });
  if (testSecret) secrets.push({ env: 'test' as Environment, secret: testSecret });
  
  console.log(`[webhook-secrets] Encontrados ${secrets.length} webhook secrets disponíveis:`, 
    secrets.map(s => `${s.env}: ${s.secret.substring(0, 20)}...`));
  
  return secrets;
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
