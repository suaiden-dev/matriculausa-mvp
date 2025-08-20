# Configuração de Variáveis de Ambiente para Stripe Connect

## **Variáveis Necessárias no Supabase**

### **1. Variáveis Principais do Stripe (já configuradas)**
```bash
# Chave secreta do Stripe (já configurada)
STRIPE_SECRET_KEY=sk_test_... ou sk_live_...

# Chave pública do Stripe (já configurada)
STRIPE_PUBLISHABLE_KEY=pk_test_... ou pk_live_...

# Webhook secret para validação (já configurado)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **2. Variáveis para Stripe Connect (NOVAS)**
```bash
# Client ID do Stripe Connect (obtido no dashboard do Stripe)
STRIPE_CONNECT_CLIENT_ID=ca_...

# URL base da API do Stripe Connect (configurável)
STRIPE_CONNECT_API_BASE_URL=https://connect.stripe.com

# URL base da API principal do Stripe (configurável)
STRIPE_API_BASE_URL=https://api.stripe.com

# URL de redirecionamento padrão para OAuth (opcional)
STRIPE_CONNECT_DEFAULT_REDIRECT_URI=https://seu-dominio.com/auth/stripe-connect/callback
```

### **3. Variáveis de Ambiente no Supabase**

#### **Via Dashboard do Supabase:**
1. Acesse o projeto no dashboard do Supabase
2. Vá para **Settings** → **Edge Functions**
3. Clique em **Environment Variables**
4. Adicione as variáveis acima

#### **Via CLI do Supabase:**
```bash
# Configurar variáveis de ambiente
supabase secrets set STRIPE_CONNECT_CLIENT_ID=ca_...
supabase secrets set STRIPE_CONNECT_API_BASE_URL=https://connect.stripe.com
supabase secrets set STRIPE_API_BASE_URL=https://api.stripe.com
supabase secrets set STRIPE_CONNECT_DEFAULT_REDIRECT_URI=https://seu-dominio.com/auth/stripe-connect/callback
```

## **Configuração no Dashboard do Stripe**

### **1. Habilitar Stripe Connect**
1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com)
2. Vá para **Connect** → **Settings**
3. Habilite **Connect accounts**

### **2. Configurar OAuth**
1. Em **Connect** → **Settings** → **Integration**
2. Configure **OAuth settings**:
   - **Redirect URI**: `https://seu-dominio.com/auth/stripe-connect/callback`
   - **Client ID**: Copie o valor para `STRIPE_CONNECT_CLIENT_ID`

### **3. Configurar Webhooks**
1. Em **Developers** → **Webhooks**
2. Adicione endpoint para eventos Connect:
   - **URL**: `https://seu-projeto.supabase.co/functions/v1/stripe-webhook`
   - **Eventos**: `account.updated`, `transfer.created`, `transfer.failed`

## **Vantagens da Nova Abordagem**

### **✅ URLs Configuráveis:**
- **Ambientes diferentes** (dev, staging, prod) podem usar URLs diferentes
- **Testes** podem usar endpoints de sandbox
- **Flexibilidade** para mudanças futuras

### **✅ Manutenibilidade:**
- **Centralização** de todas as URLs em variáveis de ambiente
- **Fácil atualização** sem modificar código
- **Padrão profissional** de configuração

### **✅ Segurança:**
- **URLs sensíveis** não ficam expostas no código
- **Configuração por ambiente** mais segura
- **Valores padrão** para desenvolvimento

## **Testes e Validação**

### **1. Testar OAuth Flow**
```bash
# Testar redirecionamento OAuth
curl -X GET "https://seu-projeto.supabase.co/functions/v1/initiate-stripe-connect?university_id=UUID"
```

### **2. Testar Transferências**
```bash
# Testar transferência automática
curl -X POST "https://seu-projeto.supabase.co/functions/v1/process-stripe-connect-transfer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "session_id": "test_session",
    "payment_intent_id": "test_pi",
    "amount": 5000,
    "university_id": "UUID",
    "application_id": "UUID"
  }'
```

### **3. Testar Notificações**
```bash
# Testar envio de notificação
curl -X POST "https://seu-projeto.supabase.co/functions/v1/notify-university-stripe-connect-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "university_id": "UUID",
    "student_name": "Teste",
    "student_email": "teste@email.com",
    "scholarship_title": "Bolsa Teste",
    "amount": 5000,
    "transfer_id": "tr_test",
    "application_id": "UUID"
  }'
```

## **Monitoramento e Logs**

### **1. Verificar Logs das Edge Functions**
```bash
# Logs da função de transferência
supabase functions logs process-stripe-connect-transfer

# Logs da função de notificação
supabase functions logs notify-university-stripe-connect-payment
```

### **2. Verificar Logs do Stripe**
- Dashboard do Stripe → **Connect** → **Logs**
- Dashboard do Stripe → **Developers** → **Logs**

## **Troubleshooting**

### **Erro: "Connect account not found"**
- Verificar se `STRIPE_CONNECT_CLIENT_ID` está correto
- Verificar se a conta Connect foi criada corretamente

### **Erro: "Invalid redirect URI"**
- Verificar se `STRIPE_CONNECT_DEFAULT_REDIRECT_URI` está configurado no Stripe
- Verificar se a URL está exatamente igual

### **Erro: "Transfer failed"**
- Verificar se a conta Connect está ativa
- Verificar se há saldo suficiente na conta
- Verificar logs do Stripe para detalhes do erro

### **Erro: "API URL not configured"**
- Verificar se `STRIPE_CONNECT_API_BASE_URL` está configurado
- Verificar se `STRIPE_API_BASE_URL` está configurado

## **Próximos Passos**

1. ✅ Configurar variáveis de ambiente
2. ✅ Testar OAuth flow
3. ✅ Testar transferências automáticas
4. ✅ Testar notificações
5. ✅ Validar fluxo completo em produção
6. ✅ Monitorar performance e erros
