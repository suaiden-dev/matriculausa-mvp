# Refatoração do Stripe Connect - Remoção de URLs Hardcoded

## **🎯 Objetivo da Refatoração**

Remover todas as URLs hardcoded do código e centralizar a configuração em variáveis de ambiente configuráveis, tornando o sistema mais profissional, flexível e fácil de manter.

## **✅ O que foi implementado:**

### **1. Arquivo de Configuração Centralizado**
- **`stripe-config.ts`** - Configuração centralizada para todas as URLs e configurações do Stripe
- **Validação automática** de configuração obrigatória
- **Fallbacks inteligentes** para valores padrão
- **Interface TypeScript** para type safety

### **2. Variáveis de Ambiente Configuráveis**
```bash
# Obrigatórias
STRIPE_CONNECT_CLIENT_ID=ca_... # Seu Client ID do Stripe Connect

# Opcionais (com valores padrão)
STRIPE_API_BASE_URL=https://api.stripe.com
STRIPE_CONNECT_API_BASE_URL=https://connect.stripe.com
STRIPE_CONNECT_DEFAULT_REDIRECT_URI=https://seu-dominio.com/auth/stripe-connect/callback
```

### **3. Funções Refatoradas**
- **`initiate-stripe-connect`** - Usa configuração centralizada
- **`refresh-stripe-connect-status`** - Usa configuração centralizada
- **URLs construídas dinamicamente** baseadas na configuração

### **4. Builder de URLs**
```typescript
const stripeUrls = buildStripeUrls(stripeConfig)

// URLs são construídas dinamicamente
stripeUrls.accounts(accountId)        // → https://api.stripe.com/v1/accounts/{id}
stripeUrls.connectOAuth()             // → https://connect.stripe.com/oauth/authorize
stripeUrls.webhookEndpoint(projectUrl) // → {projectUrl}/functions/v1/stripe-webhook
```

## **🔧 Como usar a nova configuração:**

### **1. Configuração Básica (mínima):**
```bash
# Apenas o essencial
supabase secrets set STRIPE_CONNECT_CLIENT_ID=ca_1234567890abcdef
```

### **2. Configuração Completa:**
```bash
# Todas as variáveis configuráveis
supabase secrets set STRIPE_CONNECT_CLIENT_ID=ca_1234567890abcdef
supabase secrets set STRIPE_API_BASE_URL=https://api.stripe.com
supabase secrets set STRIPE_CONNECT_API_BASE_URL=https://connect.stripe.com
supabase secrets set STRIPE_CONNECT_DEFAULT_REDIRECT_URI=https://seu-dominio.com/auth/stripe-connect/callback
```

### **3. Valores Padrão:**
Se não configurar as URLs, o sistema usa automaticamente:
- `STRIPE_API_BASE_URL` → `https://api.stripe.com`
- `STRIPE_CONNECT_API_BASE_URL` → `https://connect.stripe.com`

## **🚀 Vantagens da Nova Abordagem:**

### **✅ Flexibilidade:**
- **Ambientes diferentes** podem usar URLs diferentes
- **Testes** podem usar endpoints de sandbox
- **Mudanças futuras** sem modificar código

### **✅ Manutenibilidade:**
- **Configuração centralizada** em um arquivo
- **Validação automática** de configuração
- **Fácil debugging** de problemas de configuração

### **✅ Profissionalismo:**
- **Padrão de mercado** para configuração
- **Type safety** com TypeScript
- **Documentação clara** de todas as opções

### **✅ Segurança:**
- **URLs sensíveis** não ficam expostas no código
- **Configuração por ambiente** mais segura
- **Valores padrão** para desenvolvimento

## **📁 Arquivos Modificados:**

### **1. Novos Arquivos:**
- `supabase/functions/stripe-config.ts` - Configuração centralizada
- `env.example` - Exemplo de configuração
- `STRIPE_CONNECT_REFACTORING.md` - Esta documentação

### **2. Arquivos Refatorados:**
- `supabase/functions/initiate-stripe-connect/index.ts`
- `supabase/functions/refresh-stripe-connect-status/index.ts`

### **3. Arquivos Atualizados:**
- `STRIPE_CONNECT_ENV_SETUP.md` - Documentação atualizada

## **🧪 Como testar:**

### **1. Configurar variáveis:**
```bash
# Configurar apenas o essencial
supabase secrets set STRIPE_CONNECT_CLIENT_ID=ca_1234567890abcdef
```

### **2. Testar função de inicialização:**
```bash
curl -X POST "https://seu-projeto.supabase.co/functions/v1/initiate-stripe-connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"university_id": "UUID", "return_url": "https://seu-dominio.com/callback"}'
```

### **3. Verificar logs:**
```bash
supabase functions logs initiate-stripe-connect
```

## **🔍 Validação da Configuração:**

### **1. Validação Automática:**
```typescript
const config = getStripeConfig() // Valida automaticamente
const errors = validateStripeConnectConfig(config) // Retorna erros se houver
```

### **2. Validação Manual:**
```bash
# Verificar se as variáveis estão configuradas
supabase secrets list | grep STRIPE
```

## **📋 Checklist de Migração:**

- [ ] **Configurar** `STRIPE_CONNECT_CLIENT_ID`
- [ ] **Opcional:** Configurar URLs customizadas
- [ ] **Testar** função `initiate-stripe-connect`
- [ ] **Testar** função `refresh-stripe-connect-status`
- [ ] **Verificar** logs das funções
- [ ] **Validar** fluxo OAuth completo

## **💡 Próximos Passos:**

### **1. Aplicar a outras funções:**
- `process-stripe-connect-transfer`
- `stripe-webhook`
- Outras funções que usam URLs do Stripe

### **2. Adicionar validação de ambiente:**
- Detectar ambiente automaticamente
- Usar configurações específicas por ambiente
- Validação mais rigorosa em produção

### **3. Monitoramento:**
- Logs de configuração carregada
- Alertas para configuração incorreta
- Métricas de uso das APIs

## **🎉 Resultado Final:**

**O Stripe Connect agora está completamente configurável via variáveis de ambiente, sem URLs hardcoded, seguindo as melhores práticas de desenvolvimento profissional!** 🚀
