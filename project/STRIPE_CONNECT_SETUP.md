# Configuração do Stripe Connect

## Variáveis de Ambiente Necessárias

Para que o Stripe Connect funcione, você precisa configurar as seguintes variáveis de ambiente no Supabase:

### 1. No Dashboard do Supabase (Settings > API > Environment Variables):

```bash
# Chave secreta do Stripe (já deve existir)
STRIPE_SECRET_KEY=sk_test_... ou sk_live_...

# Client ID do Stripe Connect (NOVO)
STRIPE_CONNECT_CLIENT_ID=ca_...
```

### 2. Como Obter o STRIPE_CONNECT_CLIENT_ID:

1. Acesse [https://dashboard.stripe.com/connect/accounts](https://dashboard.stripe.com/connect/accounts)
2. Clique em "Get started" ou "Create account"
3. Preencha as informações da sua empresa
4. Após criar a conta, vá em "Settings" > "Integration"
5. Copie o "Client ID" (começa com `ca_`)

### 3. Configuração do Stripe Connect:

1. **Redirect URIs**: Adicione a URL de callback:
   ```
   https://seu-projeto.supabase.co/functions/v1/process-stripe-connect-callback
   ```

2. **Webhook Endpoints**: Configure para receber eventos de:
   - `account.updated`
   - `payout.paid`
   - `transfer.created`

## Fluxo de Funcionamento

### 1. Universidade Conecta Conta:
- Acessa dashboard da universidade
- Clica em "Stripe Connect" no menu lateral
- Clica em "Conectar com Stripe"
- É redirecionada para o Stripe para autorização
- Após autorizar, retorna para nosso sistema

### 2. Processamento de Pagamentos:
- Quando um estudante paga application fee
- Sistema verifica se universidade tem Stripe Connect
- Se SIM: faz transferência automática para conta da universidade
- Se NÃO: usa sistema atual (pagamento para nossa conta)

### 3. Segurança:
- OAuth direto com Stripe (universidade é dona da conta)
- State parameter para prevenir CSRF
- Tokens expiram automaticamente
- Acesso apenas via dashboard da universidade

## Testando

### 1. Modo de Teste:
- Use `STRIPE_SECRET_KEY` com `sk_test_...`
- Use conta de teste do Stripe Connect
- Pagamentos não geram dinheiro real

### 2. Modo de Produção:
- Use `STRIPE_SECRET_KEY` com `sk_live_...`
- Use conta real do Stripe Connect
- Pagamentos geram dinheiro real

## Próximos Passos

1. ✅ **Fase 1**: Setup das contas Stripe Connect (IMPLEMENTADO)
2. 🔄 **Fase 2**: Transferências automáticas (PRÓXIMO)
3. 📋 **Fase 3**: Dashboard para universidades (FUTURO)

## Troubleshooting

### Erro: "Client ID not found"
- Verifique se `STRIPE_CONNECT_CLIENT_ID` está configurado
- Confirme se o Client ID está correto

### Erro: "Invalid redirect URI"
- Verifique se a URL de callback está configurada no Stripe
- Confirme se a URL está exatamente igual

### Erro: "State parameter invalid"
- O estado expirou (10 minutos)
- Tente conectar novamente

### Erro: "Account requirements not met"
- A universidade precisa completar o setup no Stripe
- Verificar documentos pendentes no dashboard do Stripe
