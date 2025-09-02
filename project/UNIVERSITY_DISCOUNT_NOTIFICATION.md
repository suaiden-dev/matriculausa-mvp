# Sistema de Notificação para Universidades - Resgate de Descontos

## Visão Geral

Este sistema notifica automaticamente as universidades quando um aluno resgata um desconto de tuition através da Matrícula Coin Store. A notificação é enviada via webhook n8n seguindo o padrão estabelecido do sistema.

## Como Funciona

### Fluxo Completo

1. **Aluno resgata desconto** → `redeem_tuition_discount()` é chamada
2. **Créditos são deduzidos** → Saldo do usuário é atualizado
3. **Resgate é registrado** → Nova entrada em `tuition_redemptions`
4. **Conta da universidade é atualizada** → `university_rewards_account` é modificada
5. **NOTIFICAÇÃO É ENVIADA** → Webhook n8n para processamento de email
6. **Universidade recebe notificação** → Email processado pelo n8n

### Componentes do Sistema

#### 1. Serviço: `TuitionRewardsService`
- **Localização**: `project/src/services/TuitionRewardsService.ts`
- **Função**: Gerencia resgates e envia notificação via webhook n8n
- **Método**: `redeemTuitionDiscount()` + `notifyUniversityOfRedemption()`
- **Webhook**: Envia diretamente para `https://nwh.suaiden.com/webhook/notfmatriculausa`

#### 2. Função do Banco: `redeem_tuition_discount`
- **Localização**: `project/supabase/migrations/20250202000000_create_tuition_rewards_system.sql`
- **Função**: Processa o resgate no banco de dados
- **Nota**: A notificação é enviada via webhook n8n após o resgate

## Configuração

### Webhook n8n

O sistema usa o webhook padrão do n8n:
- **URL**: `https://nwh.suaiden.com/webhook/notfmatriculausa`
- **Método**: POST
- **Content-Type**: application/json

### Variáveis de Ambiente Necessárias

```bash
# Supabase (apenas para buscar dados)
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### Deploy

Não é necessário deploy de Edge Functions. O sistema funciona diretamente no frontend.

## Uso

### Chamada Automática

A notificação é enviada automaticamente quando:

```typescript
// No frontend, ao resgatar um desconto
const result = await TuitionRewardsService.redeemTuitionDiscount(
  userId,
  universityId,
  discountId
);

// A notificação é enviada automaticamente após o sucesso
// Não é necessário fazer nada adicional
```

### Chamada Manual (se necessário)

```typescript
// Enviar webhook n8n diretamente
const n8nPayload = {
  tipo_notf: "Resgate de desconto de tuition",
  email_aluno: "aluno@email.com",
  nome_aluno: "Nome do Aluno",
  email_universidade: "admissions@universidade.edu",
  o_que_enviar: "O aluno Nome do Aluno resgatou um desconto de tuition de $500 para a universidade Nome da Universidade. O desconto foi pago com 1000 Matricula Coins.",
  payment_id: "uuid-do-resgate",
  fee_type: "tuition_discount_redemption",
  amount: 500,
  approved_by: "Matricula Rewards System"
};

const response = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(n8nPayload),
});
```

## Estrutura do Payload

### Payload do Webhook n8n

```json
{
  "tipo_notf": "Resgate de desconto de tuition",
  "email_aluno": "aluno@email.com",
  "nome_aluno": "Nome do Aluno",
  "email_universidade": "admissions@universidade.edu",
  "o_que_enviar": "Mensagem descritiva do resgate",
  "payment_id": "uuid-do-resgate",
  "fee_type": "tuition_discount_redemption",
  "amount": 500,
  "approved_by": "Matricula Rewards System"
}
```

### Campos do Payload
- **tipo_notf**: Tipo da notificação
- **email_aluno**: Email do aluno que resgatou
- **nome_aluno**: Nome completo do aluno
- **email_universidade**: Email da universidade (se disponível)
- **o_que_enviar**: Mensagem descritiva do que aconteceu
- **payment_id**: ID único do resgate
- **fee_type**: Tipo da taxa (sempre "tuition_discount_redemption")
- **amount**: Valor do desconto em dólares
- **approved_by**: Sistema que processou o resgate

## Tratamento de Erros

### Fallbacks Implementados

1. **Email da Universidade**: Se não fornecido, busca no banco de dados
2. **Dados do Aluno**: Se não encontrados, usa valores padrão
3. **Falha na Notificação**: Não falha o resgate, apenas registra warning
4. **Webhook n8n**: Usa o endpoint padrão do sistema

### Logs e Monitoramento

- Logs detalhados em cada etapa
- Status de sucesso/erro para cada webhook
- Rastreamento do payload enviado
- Métricas de envio via n8n

## Testes

### Teste Local

```bash
# Testar o webhook n8n diretamente
curl -X POST https://nwh.suaiden.com/webhook/notfmatriculausa \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_notf": "Resgate de desconto de tuition",
    "email_aluno": "teste@email.com",
    "nome_aluno": "Aluno Teste",
    "email_universidade": "admissions@universidade.edu",
    "o_que_enviar": "Teste de resgate de desconto",
    "payment_id": "test-uuid",
    "fee_type": "tuition_discount_redemption",
    "amount": 500,
    "approved_by": "Teste"
  }'
```

### Teste de Produção

O sistema funciona automaticamente quando um aluno resgata um desconto. Verifique os logs do navegador para acompanhar o envio do webhook.

## Manutenção

### Monitoramento

- Verificar logs do navegador para webhooks enviados
- Monitorar taxa de sucesso das notificações via n8n
- Verificar status do webhook n8n

### Atualizações

- Manter dependências atualizadas
- Revisar payload do webhook periodicamente
- Atualizar URL do webhook se necessário

## Troubleshooting

### Problemas Comuns

1. **Webhook não enviado**: Verificar conectividade com n8n
2. **Erro de CORS**: Verificar configuração de origem
3. **Dados faltando**: Verificar payload enviado
4. **Falha no n8n**: Verificar status do webhook

### Soluções

1. **Verificar logs**: Logs do navegador durante o resgate
2. **Testar webhook**: Usar curl para testar diretamente
3. **Validar payload**: Confirmar dados enviados
4. **Revisar configuração**: Verificar URL do webhook

## Próximos Passos

### Melhorias Futuras

1. **Templates personalizados** por universidade no n8n
2. **Notificações em lote** para múltiplos resgates
3. **Confirmação de leitura** via webhook de retorno
4. **Relatórios de notificações** enviadas
5. **Integração com outros sistemas** via n8n

### Expansão

1. **Outros tipos de notificação** (pagamentos, documentos, etc.) via n8n
2. **Múltiplos idiomas** para universidades internacionais
3. **Preferências de notificação** configuráveis no n8n
4. **Histórico de notificações** enviadas via n8n
