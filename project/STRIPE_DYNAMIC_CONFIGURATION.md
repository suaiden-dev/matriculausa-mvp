# 🔧 Configuração Dinâmica do Stripe - Modo Teste e Produção

## 🎯 Visão Geral

O sistema MatriculaUSA implementa uma configuração dinâmica do Stripe que detecta automaticamente o ambiente (teste, staging ou produção) e utiliza as chaves corretas sem necessidade de configuração manual. Esta abordagem garante que:

- **Produção** (`matriculausa.com`) → Sempre usa chaves de produção (`sk_live_*`, `pk_live_*`)
- **Staging** (`staging-matriculausa.netlify.app`) → Sempre usa chaves de staging (`sk_test_*`, `pk_test_*`)
- **Teste/Desenvolvimento** (localhost, etc.) → Sempre usa chaves de teste (`sk_test_*`, `pk_test_*`)

## 🏗️ Arquitetura da Solução

### 1. Sistema de Detecção de Ambiente

O sistema utiliza o arquivo `environment-detector.ts` para detectar automaticamente o ambiente baseado nos headers da requisição:

```typescript
// project/supabase/functions/shared/environment-detector.ts
export function detectEnvironment(req: Request): EnvironmentInfo {
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const host = req.headers.get('host') || '';
  
  // Detectar produção: se qualquer header contém matriculausa.com
  const isProduction = 
    referer.includes('matriculausa.com') ||
    origin.includes('matriculausa.com') ||
    host.includes('matriculausa.com');
    
  // Detectar staging: se qualquer header contém staging-matriculausa.netlify.app
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
```

### 2. Configuração Dinâmica de Variáveis

O sistema mapeia automaticamente as variáveis de ambiente baseadas no ambiente detectado:

```typescript
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

  return config;
}
```

### 3. Configuração Centralizada do Stripe

O arquivo `stripe-config.ts` centraliza toda a configuração:

```typescript
// project/supabase/functions/stripe-config.ts
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
```

## 📋 Configuração no Supabase Dashboard

### Variáveis de Ambiente por Ambiente

#### Para Produção (sufixo `_PROD`):
```bash
STRIPE_SECRET_KEY_PROD=sk_live_...
STRIPE_WEBHOOK_SECRET_PROD=whsec_...
STRIPE_PUBLISHABLE_KEY_PROD=pk_live_...
STRIPE_CONNECT_CLIENT_ID_PROD=ca_...
```

#### Para Staging (sufixo `_STAGING`):
```bash
STRIPE_SECRET_KEY_STAGING=sk_test_...
STRIPE_WEBHOOK_SECRET_STAGING=whsec_...
STRIPE_PUBLISHABLE_KEY_STAGING=pk_test_...
STRIPE_CONNECT_CLIENT_ID_STAGING=ca_...
```

#### Para Teste/Desenvolvimento (sufixo `_TEST`):
```bash
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
STRIPE_CONNECT_CLIENT_ID_TEST=ca_...
```

#### Variáveis Globais (opcionais):
```bash
STRIPE_API_BASE_URL=https://api.stripe.com
STRIPE_CONNECT_API_BASE_URL=https://connect.stripe.com
STRIPE_CONNECT_DEFAULT_REDIRECT_URI=https://matriculausa.com/dashboard
```

## 🔄 Como as Edge Functions Utilizam a Configuração

### Exemplo de Implementação

Todas as Edge Functions do Stripe seguem o mesmo padrão:

```typescript
// project/supabase/functions/stripe-checkout-selection-process-fee/index.ts
Deno.serve(async (req) => {
  try {
    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    
    // Criar instância do Stripe com a chave correta para o ambiente
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2025-07-30.preview',
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0',
      },
    });

    console.log(`🔧 Using Stripe in ${config.environment.environment} mode`);

    // Resto da lógica da função...
  } catch (error) {
    console.error('Error:', error);
    return corsResponse({ error: error.message }, 500);
  }
});
```

### Edge Functions que Utilizam a Configuração Dinâmica

1. **stripe-checkout-selection-process-fee** - Processo de seleção completo
2. **stripe-checkout-application-fee** - Taxa de aplicação
3. **stripe-checkout-i20-control-fee** - Taxa de controle I-20
4. **stripe-checkout-scholarship-fee** - Taxa de bolsas
5. **stripe-checkout-eb3** - Processo EB-3
6. **stripe-webhook** - Webhooks do Stripe
7. **initiate-stripe-connect** - Inicialização do Stripe Connect
8. **verify-stripe-session-*** - Verificação de sessões

## 🎨 Configuração no Frontend

### Produtos e Preços Dinâmicos

O frontend também possui configuração dinâmica para produtos e preços:

```typescript
// project/src/stripe-config.ts
const isProd = true; // Força uso das chaves de produção

export const STRIPE_PRODUCTS = {
  controlFee: isProd
    ? {
        productId: 'prod_SZ3ma6T2b0o702', // Produção
        priceId: import.meta.env.VITE_STRIPE_CONTROL_FEE_PRICE_ID,
        name: 'Control Fee',
        description: 'Fee for I-20 control and document validation',
        mode: 'payment',
      }
    : {
        productId: 'prod_SWVk1e4mFkUJ2Z', // Teste
        priceId: import.meta.env.VITE_STRIPE_CONTROL_FEE_PRICE_ID,
        name: 'Control Fee',
        description: 'Fee for I-20 control and document validation',
        mode: 'payment',
      },
  // ... outros produtos
};
```

## 🔍 Logs de Debug

O sistema inclui logs detalhados para facilitar o debug:

### Logs de Detecção de Ambiente:
```
🔍 Environment Detection: {
  referer: "https://matriculausa.com/checkout",
  origin: "https://matriculausa.com",
  host: "matriculausa.com",
  userAgent: "Mozilla/5.0..."
}
🎯 Environment detected: PRODUCTION
```

### Logs de Configuração do Stripe:
```
🔑 Stripe Config (production): {
  secretKey: "sk_live_51ABC123...",
  webhookSecret: "whsec_1234567890...",
  publishableKey: "pk_live_51ABC123...",
  connectClientId: "ca_ABC1234567890..."
}
✅ Stripe config loaded for production environment
```

### Logs de Uso nas Edge Functions:
```
🔧 Using Stripe in production mode
```

## 🛡️ Validação e Segurança

### Validação de Variáveis de Ambiente

O sistema valida automaticamente se todas as variáveis necessárias estão configuradas:

```typescript
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

  return errors;
}
```

### Mascaramento de Chaves nos Logs

As chaves sensíveis são mascaradas nos logs para segurança:

```typescript
console.log(`🔑 Stripe Config (${envInfo.environment}):`, {
  secretKey: config.secretKey ? `${config.secretKey.substring(0, 20)}...` : '❌ Missing',
  webhookSecret: config.webhookSecret ? `${config.webhookSecret.substring(0, 20)}...` : '❌ Missing',
  publishableKey: config.publishableKey ? `${config.publishableKey.substring(0, 20)}...` : '❌ Missing',
  connectClientId: config.connectClientId ? `${config.connectClientId.substring(0, 20)}...` : '❌ Missing'
});
```

## 🚀 Benefícios da Implementação

### 1. **Automatização Completa**
- Não há necessidade de configuração manual por ambiente
- Detecção automática baseada na URL de origem
- Troca automática de chaves conforme o ambiente

### 2. **Segurança Aprimorada**
- Chaves de produção nunca são expostas em ambientes de teste
- Validação automática de configuração
- Logs mascarados para proteção de dados sensíveis

### 3. **Manutenibilidade**
- Configuração centralizada em um local
- Fácil adição de novos ambientes
- Logs detalhados para debug

### 4. **Escalabilidade**
- Suporte a múltiplos ambientes (teste, staging, produção)
- Fácil extensão para novos ambientes
- Configuração flexível por ambiente

## 🔧 Como Adicionar um Novo Ambiente

Para adicionar um novo ambiente (ex: `development`):

1. **Atualizar o detector de ambiente:**
```typescript
const isDevelopment = 
  referer.includes('dev-matriculausa.netlify.app') ||
  origin.includes('dev-matriculausa.netlify.app') ||
  host.includes('dev-matriculausa.netlify.app');
```

2. **Adicionar variáveis no Supabase Dashboard:**
```bash
STRIPE_SECRET_KEY_DEV=sk_test_...
STRIPE_WEBHOOK_SECRET_DEV=whsec_...
STRIPE_PUBLISHABLE_KEY_DEV=pk_test_...
STRIPE_CONNECT_CLIENT_ID_DEV=ca_...
```

3. **Atualizar a lógica de mapeamento:**
```typescript
if (envInfo.isDevelopment) {
  suffix = 'DEV';
}
```

## 📊 Monitoramento e Debug

### Verificação de Ambiente Atual

Para verificar qual ambiente está sendo detectado, consulte os logs das Edge Functions:

```bash
# Logs de uma requisição de produção
🔍 Environment Detection: {
  referer: "https://matriculausa.com/checkout",
  origin: "https://matriculausa.com"
}
🎯 Environment detected: PRODUCTION
✅ Stripe config loaded for production environment
🔧 Using Stripe in production mode
```

### Troubleshooting

**Problema:** Chaves de teste sendo usadas em produção
**Solução:** Verificar se as variáveis `STRIPE_SECRET_KEY_PROD` estão configuradas no Supabase Dashboard

**Problema:** Erro de configuração do Stripe
**Solução:** Verificar logs de validação para identificar variáveis faltantes

**Problema:** Ambiente não detectado corretamente
**Solução:** Verificar headers `referer`, `origin` e `host` nos logs de detecção

## 🎯 Conclusão

A implementação da configuração dinâmica do Stripe no MatriculaUSA garante que:

- ✅ **Produção** sempre usa chaves de produção (`sk_live_*`)
- ✅ **Staging** sempre usa chaves de staging (`sk_test_*`)
- ✅ **Desenvolvimento** sempre usa chaves de teste (`sk_test_*`)
- ✅ **Detecção automática** baseada na URL de origem
- ✅ **Validação automática** de configuração
- ✅ **Logs detalhados** para debug e monitoramento
- ✅ **Segurança aprimorada** com mascaramento de chaves
- ✅ **Manutenibilidade** com configuração centralizada

Esta solução elimina completamente a possibilidade de usar chaves incorretas em ambientes inadequados, garantindo a segurança e confiabilidade do sistema de pagamentos.
