# Stripe Webhook Function

Esta função processa webhooks do Stripe e envia emails de confirmação via MailerSend.

## Variáveis de Ambiente Obrigatórias

### Stripe
- `STRIPE_SECRET_KEY` - Chave secreta da API do Stripe
- `STRIPE_WEBHOOK_SECRET` - Chave secreta para verificação de assinatura do webhook

### MailerSend
- `MAILERSEND_API_KEY` - Chave da API do MailerSend para envio de emails

## Variáveis de Ambiente Opcionais (com fallbacks)

### Configurações da Empresa
- `FROM_EMAIL` - Email do remetente (padrão: support@matriculausa.com)
- `FROM_NAME` - Nome do remetente (padrão: Matrícula USA)
- `COMPANY_NAME` - Nome da empresa (padrão: Matrícula USA)
- `COMPANY_WEBSITE` - Website da empresa (padrão: https://matriculausa.com/)
- `COMPANY_LOGO` - URL do logo da empresa
- `SUPPORT_EMAIL` - Email de suporte (padrão: support@matriculausa.com)

### Configurações do MailerSend
- `MAILERSEND_URL` - URL da API do MailerSend (padrão: https://api.mailersend.com/v1/email)

## Exemplo de Configuração

```bash
# Variáveis obrigatórias
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAILERSEND_API_KEY=mlsn.abc123...

# Variáveis opcionais (personalizar conforme necessário)
FROM_EMAIL=noreply@minhaempresa.com
FROM_NAME=Minha Empresa
COMPANY_NAME=Minha Empresa
COMPANY_WEBSITE=https://minhaempresa.com/
COMPANY_LOGO=https://minhaempresa.com/logo.png
SUPPORT_EMAIL=suporte@minhaempresa.com
MAILERSEND_URL=https://api.mailersend.com/v1/email
```

## Funcionalidades

- Processa eventos de pagamento do Stripe
- Envia emails de confirmação para diferentes tipos de pagamento
- Suporte para múltiplos tipos de taxa (application_fee, scholarship_fee, i20_control_fee, etc.)
- Templates de email configuráveis via variáveis de ambiente
- Validação de assinatura do webhook para segurança
