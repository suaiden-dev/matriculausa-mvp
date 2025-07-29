# Comandos de Deploy - Atualizados

## Edge Functions que precisam ser deployadas

### 1. **send-to-ngrok-endpoint** (ATUALIZADA - URGENTE)
```bash
supabase functions deploy send-to-ngrok-endpoint
```
**Mudanças:**
- ✅ Adicionado header `apikey` obrigatório
- ✅ Formato de dados atualizado para corresponder ao endpoint
- ✅ Lógica melhorada para client_id/user_id
- ✅ Logs detalhados adicionados

### 2. **process-inbox-email** (ATUALIZADA)
```bash
supabase functions deploy process-inbox-email
```
**Mudanças:**
- ✅ Logs detalhados adicionados para debug
- ✅ Notificação n8n integrada

### 3. **notify-n8n-new-email** (NOVA)
```bash
supabase functions deploy notify-n8n-new-email
```
**Funcionalidade:**
- ✅ Envia notificações para n8n quando emails chegam

## Ordem de Deploy Recomendada

```bash
# 1. Deploy da função ngrok (MAIS IMPORTANTE AGORA)
supabase functions deploy send-to-ngrok-endpoint

# 2. Deploy da função n8n
supabase functions deploy notify-n8n-new-email

# 3. Deploy da função de processamento de email
supabase functions deploy process-inbox-email
```

## Teste Após Deploy

1. **Acesse**: `School Dashboard` → `AI Settings`
2. **Role até o final** da página
3. **Clique em**: `🚀 Testar Endpoint Ngrok`
4. **Verifique**: Se os dados chegam no endpoint ngrok

## Logs para Verificar

```bash
# Ver logs da função ngrok (MAIS IMPORTANTE)
supabase functions logs send-to-ngrok-endpoint --follow

# Ver logs da função de processamento
supabase functions logs process-inbox-email --follow

# Ver logs da função n8n
supabase functions logs notify-n8n-new-email --follow
```

## Formato Esperado no Ngrok

Após o deploy, o endpoint ngrok deve receber:

```json
{
  "from": "victuribdev@gmail.com",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "content": "Teste manual via botão - Matrícula USA",
  "subject": "Teste Manual Endpoint",
  "client_id": "c517248f-1711-4b5d-bf35-7cb5673ff8a5",
  "user_id": "c517248f-1711-4b5d-bf35-7cb5673ff8a5",
  "source": "matricula-usa"
}
```

Com headers:
```
Content-Type: application/json
apikey: dGZvZVNVQUlERU4yMDI1Y2VtZUd1aWxoZXJtZQ==01983e6f-48be-7f83-bcca-df30867edaf6
User-Agent: MatriculaUSA/1.0
```

## Mudanças Recentes

### Frontend (TestNgrokEndpoint.tsx)
- ✅ Busca email real do usuário na tabela `user_profiles`
- ✅ Usa user_id real como client_id
- ✅ Tudo dinâmico baseado no usuário logado

### Backend (send-to-ngrok-endpoint)
- ✅ Lógica melhorada para client_id/user_id
- ✅ Logs detalhados para debug
- ✅ Headers corretos incluindo apikey

## Troubleshooting

### Erro "Missing parameters"
- Verificar se todos os campos obrigatórios estão sendo enviados
- Verificar se o formato dos dados está correto
- Verificar se o apikey está sendo enviado corretamente

### Erro "400 Bad Request"
- Verificar logs detalhados da função
- Verificar se o endpoint ngrok está esperando os parâmetros corretos
- Verificar se o formato JSON está válido 

# Comandos de Deploy

## Supabase Edge Functions

### Deploy process-new-emails (v2.0 - com logs detalhados)
```bash
supabase functions deploy process-new-emails
```

### Deploy setup-gmail-watch (nova função)
```bash
supabase functions deploy setup-gmail-watch
```

### Deploy check-unread-emails (atualizada)
```bash
supabase functions deploy check-unread-emails
```

## Google Cloud Setup

### 1. Ativar APIs necessárias
```bash
gcloud services enable gmail.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. Criar tópico Pub/Sub
```bash
gcloud pubsub topics create gmail-notifications
gcloud pubsub subscriptions create gmail-notifications-sub --topic=gmail-notifications
```

### 3. Configurar permissões
```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
    --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
    --role="roles/pubsub.publisher"
```

### 4. Deploy Cloud Function
```bash
cd project/cloud-functions/gmail-webhook
gcloud functions deploy gmail-webhook \
    --runtime nodejs18 \
    --trigger-topic gmail-notifications \
    --entry-point handleGmailNotification \
    --source . \
    --allow-unauthenticated \
    --env-vars-file env.yaml
```

## Migrações do Banco

### Criar tabela processed_emails
```bash
supabase db push
```

### Criar tabela email_processing_initialized
```bash
supabase db push
```

## Variáveis de Ambiente

### Google Cloud Function (.env.yaml)
```yaml
GMAIL_ACCESS_TOKEN: "YOUR_GMAIL_ACCESS_TOKEN_HERE"
N8N_WEBHOOK_URL: "https://nwh.suaiden.com/webhook/47d6d50c-46d1-4b34-9405-de321686dcbc"
PROJECT_ID: "YOUR_GOOGLE_CLOUD_PROJECT_ID"
```

### Supabase Edge Functions
```bash
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
supabase secrets set GOOGLE_CLOUD_PROJECT_ID=your_project_id
```

## Teste das Funções

### Testar process-new-emails
```bash
curl -X POST "https://fitpynguasqqutuhzifx.supabase.co/functions/v1/process-new-emails" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: sb_publishable_sMBxCkaxDBmwiUeTzAFrag_AetAyvJs" \
  -H "Content-Type: application/json" \
  -d '{"targetEmail": "victuribdev@gmail.com", "maxResults": 10}'
```

### Testar setup-gmail-watch
```bash
curl -X POST "https://fitpynguasqqutuhzifx.supabase.co/functions/v1/setup-gmail-watch" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: sb_publishable_sMBxCkaxDBmwiUeTzAFrag_AetAyvJs" \
  -H "Content-Type: application/json" \
  -d '{"targetEmail": "victuribdev@gmail.com"}'
```

## Ordem de Deploy

1. **Deploy das migrações do banco**
2. **Configurar variáveis de ambiente do Supabase**
3. **Deploy das Edge Functions do Supabase**
4. **Configurar Google Cloud (APIs, Pub/Sub, permissões)**
5. **Deploy da Cloud Function**
6. **Configurar watch do Gmail via setup-gmail-watch**
7. **Testar integração completa** 