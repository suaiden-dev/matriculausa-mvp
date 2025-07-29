# Integração com n8n - Notificações de Emails

## Visão Geral

O sistema agora envia notificações automáticas para o n8n sempre que chegar um novo email para uma universidade. Isso permite criar workflows automatizados no n8n para:

- Notificações em tempo real
- Relatórios automáticos
- Integrações com outros sistemas
- Alertas para casos especiais

## Como Funciona

### Fluxo de Notificação

1. **Email chega** → Gmail webhook → `process-inbox-email`
2. **Email processado** → Registra conversa no banco
3. **Notificação enviada** → `notify-n8n-new-email` → n8n webhook
4. **n8n recebe dados** → Pode executar workflows automáticos

### Dados Enviados para n8n

```json
{
  "event": "new_email_received",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "conversation_id": "uuid-da-conversa",
  "university": {
    "id": "uuid-da-universidade",
    "name": "Nome da Universidade"
  },
  "email": {
    "message_id": "gmail-message-id",
    "from": "estudante@email.com",
    "to": "admissions@universidade.com",
    "subject": "Pergunta sobre documentos",
    "body_preview": "Olá, gostaria de saber quais documentos...",
    "has_attachments": true,
    "attachments_count": 2,
    "thread_id": "gmail-thread-id"
  },
  "processing": {
    "ai_enabled": true,
    "status": "processing"
  }
}
```

## Configuração

### 1. Variável de Ambiente

Configure a variável de ambiente no Supabase:

```bash
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/email-notifications
```

### 2. Deploy das Edge Functions

```bash
# Deploy da função principal
supabase functions deploy process-inbox-email

# Deploy da função de notificação
supabase functions deploy notify-n8n-new-email
```

### 3. Configurar Webhook no n8n

1. Crie um novo workflow no n8n
2. Adicione um nó "Webhook"
3. Configure o webhook para receber POST requests
4. Copie a URL do webhook
5. Configure a variável `N8N_WEBHOOK_URL` no Supabase

## Casos de Uso no n8n

### 1. Notificação em Tempo Real

```javascript
// Workflow: Notificar equipe sobre novo email
if ($input.all()[0].json.processing.ai_enabled) {
  // Email será processado pela IA
  return {
    message: `Novo email recebido - IA ativada`,
    university: $input.all()[0].json.university.name,
    subject: $input.all()[0].json.email.subject
  };
} else {
  // Email precisa de revisão manual
  return {
    message: `⚠️ Email precisa de revisão manual`,
    university: $input.all()[0].json.university.name,
    subject: $input.all()[0].json.email.subject
  };
}
```

### 2. Relatório Diário

```javascript
// Workflow: Relatório diário de emails
const emails = $input.all();
const summary = {
  total_emails: emails.length,
  ai_processed: emails.filter(e => e.json.processing.ai_enabled).length,
  manual_review: emails.filter(e => !e.json.processing.ai_enabled).length,
  universities: [...new Set(emails.map(e => e.json.university.name))]
};
```

### 3. Integração com Slack

```javascript
// Workflow: Notificar Slack sobre emails urgentes
const email = $input.all()[0].json;
const urgentKeywords = ['urgente', 'problema', 'erro', 'legal'];

if (urgentKeywords.some(keyword => 
  email.email.subject.toLowerCase().includes(keyword) ||
  email.email.body_preview.toLowerCase().includes(keyword)
)) {
  return {
    channel: "#urgent-emails",
    text: `🚨 Email urgente recebido!\nUniversidade: ${email.university.name}\nAssunto: ${email.email.subject}`
  };
}
```

### 4. Integração com CRM

```javascript
// Workflow: Criar ticket no CRM
const email = $input.all()[0].json;

return {
  ticket: {
    title: `Email: ${email.email.subject}`,
    description: email.email.body_preview,
    customer_email: email.email.from,
    university: email.university.name,
    priority: email.processing.ai_enabled ? "normal" : "high"
  }
};
```

## Status de Processamento

### Status Possíveis

- **`processing`**: Email será processado pela IA
- **`manual_review_needed`**: Email precisa de revisão manual (IA desabilitada)

### Triggers para Intervenção Manual

Emails contendo estas palavras são marcados para revisão manual:
- "urgente"
- "problema" 
- "erro"
- "reclamação"
- "legal"
- "advogado"

## Monitoramento

### Logs das Edge Functions

```bash
# Ver logs da função principal
supabase functions logs process-inbox-email

# Ver logs da função de notificação
supabase functions logs notify-n8n-new-email
```

### Verificar Status no Banco

```sql
-- Ver conversas registradas
SELECT 
  id,
  sender_email,
  email_subject,
  status,
  received_at,
  responded_at
FROM ai_email_conversations 
ORDER BY received_at DESC 
LIMIT 10;
```

## Troubleshooting

### Problema: Notificações não chegam no n8n

1. Verificar se `N8N_WEBHOOK_URL` está configurada
2. Verificar logs da função `notify-n8n-new-email`
3. Testar webhook do n8n manualmente
4. Verificar se o n8n está acessível

### Problema: Dados incorretos

1. Verificar formato dos dados enviados
2. Verificar se a universidade foi identificada corretamente
3. Verificar se a conversa foi registrada no banco

### Problema: Webhook não responde

1. Verificar se o n8n está rodando
2. Verificar se o webhook está ativo
3. Verificar logs do n8n
4. Testar conectividade de rede

## Próximos Passos

1. **Configurar webhook no n8n**
2. **Criar workflows de notificação**
3. **Testar com emails reais**
4. **Monitorar logs e performance**
5. **Ajustar configurações conforme necessário** 