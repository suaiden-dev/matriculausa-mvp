/**
 * Configuração centralizada para URLs e configurações do Stripe
 * Este arquivo centraliza todas as configurações relacionadas ao Stripe
 * para facilitar manutenção e configuração por ambiente
 */

import { detectEnvironment, getStripeEnvironmentVariables, validateStripeEnvironmentVariables, type EnvironmentInfo } from './shared/environment-detector.ts';

export interface StripeConfig {
  // URLs base das APIs
  apiBaseUrl: string
  connectApiBaseUrl: string
  
  // Configurações OAuth
  connectClientId: string
  defaultRedirectUri?: string
  
  // Chaves de API
  secretKey: string
  publishableKey?: string
  
  // Webhook
  webhookSecret?: string
  
  // Informações do ambiente
  environment: EnvironmentInfo
}

/**
 * Obtém a configuração do Stripe baseada no ambiente detectado automaticamente
 * @param req - Request object para detectar o ambiente
 */
export function getStripeConfig(req: Request): StripeConfig {
  // Detectar ambiente automaticamente
  const envInfo = detectEnvironment(req);
  
  // Obter variáveis de ambiente baseadas no ambiente detectado
  const envVars = getStripeEnvironmentVariables(envInfo);
  
  // Validar se as variáveis estão configuradas
  const validationErrors = validateStripeEnvironmentVariables(envVars, envInfo);
  if (validationErrors.length > 0) {
    throw new Error(`Stripe configuration errors: ${validationErrors.join(', ')}`);
  }

  const config: StripeConfig = {
    // URLs base - configuráveis por ambiente
    apiBaseUrl: Deno.env.get('STRIPE_API_BASE_URL') || 'https://api.stripe.com',
    connectApiBaseUrl: Deno.env.get('STRIPE_CONNECT_API_BASE_URL') || 'https://connect.stripe.com',
    
    // Client ID obrigatório para Stripe Connect
    connectClientId: envVars.connectClientId,
    
    // Redirect URI opcional (fallback)
    defaultRedirectUri: Deno.env.get('STRIPE_CONNECT_DEFAULT_REDIRECT_URI'),
    
    // Chaves de API baseadas no ambiente
    secretKey: envVars.secretKey,
    publishableKey: envVars.publishableKey,
    
    // Webhook secret baseado no ambiente
    webhookSecret: envVars.webhookSecret,
    
    // Informações do ambiente
    environment: envInfo
  }

  console.log(`✅ Stripe config loaded for ${envInfo.environment} environment`);

  return config
}

/**
 * Função de compatibilidade para código existente
 * @deprecated Use getStripeConfig(req) instead
 */
export function getStripeConfigLegacy(): StripeConfig {
  console.warn('⚠️ Using legacy getStripeConfig() - consider updating to getStripeConfig(req) for environment detection');
  
  const config: StripeConfig = {
    // URLs base - configuráveis por ambiente
    apiBaseUrl: Deno.env.get('STRIPE_API_BASE_URL') || 'https://api.stripe.com',
    connectApiBaseUrl: Deno.env.get('STRIPE_CONNECT_API_BASE_URL') || 'https://connect.stripe.com',
    
    // Client ID obrigatório para Stripe Connect
    connectClientId: Deno.env.get('STRIPE_CONNECT_CLIENT_ID') || '',
    
    // Redirect URI opcional (fallback)
    defaultRedirectUri: Deno.env.get('STRIPE_CONNECT_DEFAULT_REDIRECT_URI'),
    
    // Chaves de API
    secretKey: Deno.env.get('STRIPE_SECRET_KEY') || '',
    publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
    
    // Webhook secret
    webhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET'),
    
    // Ambiente padrão (teste)
    environment: {
      environment: 'test',
      isProduction: false,
      isTest: true
    }
  }

  // Validações básicas
  if (!config.secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required')
  }

  // Connect Client ID é opcional para algumas funções
  if (!config.connectClientId) {
    console.warn('⚠️ STRIPE_CONNECT_CLIENT_ID not configured - Stripe Connect features may not work')
  }

  return config
}

/**
 * Constrói URLs completas para diferentes endpoints do Stripe
 */
export function buildStripeUrls(config: StripeConfig) {
  return {
    // API principal do Stripe
    accounts: (accountId: string) => `${config.apiBaseUrl}/v1/accounts/${accountId}`,
    transfers: () => `${config.apiBaseUrl}/v1/transfers`,
    paymentIntents: (paymentIntentId: string) => `${config.apiBaseUrl}/v1/payment_intents/${paymentIntentId}`,
    sessions: (sessionId: string) => `${config.apiBaseUrl}/v1/checkout/sessions/${sessionId}`,
    
    // API do Stripe Connect
    connectOAuth: () => `${config.connectApiBaseUrl}/oauth/authorize`,
    connectToken: () => `${config.connectApiBaseUrl}/oauth/token`,
    
    // Webhooks
    webhookEndpoint: (projectUrl: string) => `${projectUrl}/functions/v1/stripe-webhook`
  }
}

/**
 * Configurações específicas para diferentes ambientes
 */
export const environmentConfigs = {
  development: {
    apiBaseUrl: 'https://api.stripe.com',
    connectApiBaseUrl: 'https://connect.stripe.com'
  },
  staging: {
    apiBaseUrl: 'https://api.stripe.com',
    connectApiBaseUrl: 'https://connect.stripe.com'
  },
  production: {
    apiBaseUrl: 'https://api.stripe.com',
    connectApiBaseUrl: 'https://connect.stripe.com'
  }
}

/**
 * Obtém configuração específica para um ambiente
 */
export function getEnvironmentConfig(env: keyof typeof environmentConfigs) {
  return environmentConfigs[env]
}

/**
 * Valida se a configuração está completa para Stripe Connect
 */
export function validateStripeConnectConfig(config: StripeConfig): string[] {
  const errors: string[] = []
  
  if (!config.connectClientId) {
    console.warn('⚠️ STRIPE_CONNECT_CLIENT_ID not configured - Stripe Connect features may not work')
  }
  
  if (!config.apiBaseUrl) {
    errors.push('STRIPE_API_BASE_URL is required')
  }
  
  if (!config.connectApiBaseUrl) {
    errors.push('STRIPE_CONNECT_API_BASE_URL is required')
  }
  
  return errors
}
