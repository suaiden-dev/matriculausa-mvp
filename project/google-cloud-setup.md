# Google Cloud Pub/Sub + Cloud Functions Setup

## Configuração para Webhooks Automáticos do Gmail

### 1. Ativar APIs Necessárias

```bash
# Ativar Gmail API
gcloud services enable gmail.googleapis.com

# Ativar Pub/Sub API
gcloud services enable pubsub.googleapis.com

# Ativar Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com

# Ativar Cloud Build API (necessário para deploy)
gcloud services enable cloudbuild.googleapis.com
```

### 2. Criar Tópico Pub/Sub

```bash
# Criar tópico para notificações do Gmail
gcloud pubsub topics create gmail-notifications

# Criar subscription (opcional, para debug)
gcloud pubsub subscriptions create gmail-notifications-sub --topic=gmail-notifications
```

### 3. Configurar Permissões

```bash
# Dar permissão para o Gmail publicar no tópico
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
    --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
    --role="roles/pubsub.publisher"
```

### 4. Deploy da Cloud Function

```bash
# Deploy da função webhook
gcloud functions deploy gmail-webhook \
    --runtime nodejs18 \
    --trigger-topic gmail-notifications \
    --entry-point handleGmailNotification \
    --source ./cloud-functions/gmail-webhook \
    --allow-unauthenticated
```

### 5. Configurar Watch no Gmail

```bash
# Configurar watch para todas as contas Gmail
curl -X POST "https://gmail.googleapis.com/gmail/v1/users/me/watch" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "topicName": "projects/YOUR_PROJECT_ID/topics/gmail-notifications",
        "labelIds": ["INBOX", "UNREAD"]
    }'
```

## Estrutura de Arquivos

```
project/
├── cloud-functions/
│   └── gmail-webhook/
│       ├── index.js
│       ├── package.json
│       └── .env.yaml
└── google-cloud-setup.md
``` 