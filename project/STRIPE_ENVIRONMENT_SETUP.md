# 🔧 Configuração de Ambiente Automática do Stripe

## 🎯 Visão Geral

O sistema agora detecta automaticamente o ambiente e usa as chaves corretas do Stripe:
- **Produção** (`matriculausa.com`) → Sempre usa chaves de produção
- **Staging** (`staging-matriculausa.netlify.app`) → Sempre usa chaves de staging
- **Teste/Desenvolvimento** (localhost, etc.) → Sempre usa chaves de teste

## 📋 Configuração no Supabase Dashboard

### 1. Acessar o Supabase Dashboard
- Vá para [supabase.com](https://supabase.com)
- Acesse seu projeto
- Vá para **Settings** → **Edge Functions**

### 2. Configurar as Variáveis de Ambiente

Adicione as seguintes variáveis no Supabase Dashboard:

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

### 3. Variáveis Globais (opcionais)
```bash
STRIPE_API_BASE_URL=https://api.stripe.com
STRIPE_CONNECT_API_BASE_URL=https://connect.stripe.com
STRIPE_CONNECT_DEFAULT_REDIRECT_URI=https://matriculausa.com/dashboard
```

## 🔍 Como Funciona a Detecção

### Lógica de Detecção:
1. **Produção**: Se `referer` ou `origin` contém `matriculausa.com`
2. **Staging**: Se `referer` ou `origin` contém `staging-matriculausa.netlify.app`
3. **Teste**: Qualquer outro caso (localhost, desenvolvimento, etc.)

### Logs de Debug:

#### Produção:
```
🔍 Environment Detection: {
  referer: "https://matriculausa.com/checkout",
  origin: "https://matriculausa.com",
  host: "fitpynguasqqutuhzifx.supabase.co"
}
🎯 Environment detected: PRODUCTION
🔑 Stripe Config (production): {
  secretKey: "sk_live_...",
  webhookSecret: "whsec_...",
  publishableKey: "pk_live_...",
  connectClientId: "ca_..."
}
✅ Stripe config loaded for production environment
```

#### Staging:
```
🔍 Environment Detection: {
  referer: "https://staging-matriculausa.netlify.app/checkout",
  origin: "https://staging-matriculausa.netlify.app",
  host: "fitpynguasqqutuhzifx.supabase.co"
}
🎯 Environment detected: STAGING
🔑 Stripe Config (staging): {
  secretKey: "sk_test_...",
  webhookSecret: "whsec_...",
  publishableKey: "pk_test_...",
  connectClientId: "ca_..."
}
✅ Stripe config loaded for staging environment
```

## 🚀 Edge Functions Atualizadas

As seguintes Edge Functions foram atualizadas para usar o novo sistema:

- ✅ `stripe-webhook`
- ✅ `stripe-checkout`
- ✅ `stripe-checkout-application-fee`
- ✅ `stripe-checkout-scholarship-fee`
- ✅ `stripe-checkout-i20-control-fee`
- ✅ `stripe-checkout-selection-process-fee`
- ✅ `verify-stripe-session`
- ✅ `initiate-stripe-connect`

## 🔧 Configuração dos Webhooks no Stripe

### Para Produção:
- **URL**: `https://fitpynguasqqutuhzifx.supabase.co/functions/v1/stripe-webhook`
- **Secret**: Use o valor de `STRIPE_WEBHOOK_SECRET_PROD`

### Para Staging:
- **URL**: `https://fitpynguasqqutuhzifx.supabase.co/functions/v1/stripe-webhook`
- **Secret**: Use o valor de `STRIPE_WEBHOOK_SECRET_STAGING`

### Para Teste:
- **URL**: `https://fitpynguasqqutuhzifx.supabase.co/functions/v1/stripe-webhook`
- **Secret**: Use o valor de `STRIPE_WEBHOOK_SECRET_TEST`

## ✅ Benefícios

1. **Zero configuração manual** - Detecta ambiente automaticamente
2. **Chaves corretas sempre** - Produção sempre usa chaves de produção
3. **Logs informativos** - Fácil debug e monitoramento
4. **Segurança** - Não há risco de usar chaves de teste em produção
5. **Flexibilidade** - Fácil adicionar novos ambientes

## 🐛 Troubleshooting

### Problema: "STRIPE_SECRET_KEY_PROD is required for production environment"
**Solução**: Verifique se as variáveis com sufixo `_PROD` estão configuradas no Supabase

### Problema: "STRIPE_SECRET_KEY_STAGING is required for staging environment"
**Solução**: Verifique se as variáveis com sufixo `_STAGING` estão configuradas no Supabase

### Problema: "STRIPE_SECRET_KEY_TEST is required for test environment"
**Solução**: Verifique se as variáveis com sufixo `_TEST` estão configuradas no Supabase

### Problema: Webhook signature verification failed
**Solução**: Verifique se o webhook secret correto está configurado no Stripe Dashboard

### Problema: Ambiente não detectado corretamente
**Solução**: Verifique os logs para confirmar qual ambiente está sendo detectado
