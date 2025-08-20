/**
 * Configuração centralizada para URLs e configurações do Stripe
 * Este arquivo centraliza todas as configurações relacionadas ao Stripe
 * para facilitar manutenção e configuração por ambiente
 */

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
}

/**
 * Obtém a configuração do Stripe a partir das variáveis de ambiente
 * Com fallbacks para valores padrão de desenvolvimento
 */
export function getStripeConfig(): StripeConfig {
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
    webhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET')
  }

  // Validações básicas
  if (!config.secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required')
  }

  if (!config.connectClientId) {
    throw new Error('STRIPE_CONNECT_CLIENT_ID is required for Stripe Connect functionality')
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
export function getEnvironmentConfig(environment: keyof typeof environmentConfigs) {
  return environmentConfigs[environment]
}
