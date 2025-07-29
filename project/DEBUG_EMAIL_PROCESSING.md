# Debug do Processamento de Emails

## Problema
Email chegou na conta conectada mas não foi processado pela Edge Function `process-inbox-email`.

## Logs Adicionados

### 📧 Logs Detalhados na `process-inbox-email`

#### 1. **Recebimento do Webhook**
```
📧 process-inbox-email: ===== WEBHOOK RECEIVED =====
📧 process-inbox-email: Request method: POST
📧 process-inbox-email: Request URL: [URL]
📧 process-inbox-email: Request headers: [HEADERS]
📧 process-inbox-email: Request body type: object
📧 process-inbox-email: Request body keys: [KEYS]
📧 process-inbox-email: Full request body: [JSON]
```

#### 2. **Decodificação do Webhook**
```
🔍 decodeWebhookData: Starting decode process
🔍 decodeWebhookData: Input data length: [LENGTH]
🔍 decodeWebhookData: Input data preview: [PREVIEW]
🔍 decodeWebhookData: Attempting base64 decode...
🔍 decodeWebhookData: Base64 decoded successfully
🔍 decodeWebhookData: Decoded data length: [LENGTH]
🔍 decodeWebhookData: Decoded data preview: [PREVIEW]
🔍 decodeWebhookData: Attempting JSON parse...
🔍 decodeWebhookData: JSON parsed successfully
🔍 decodeWebhookData: Parsed data type: object
🔍 decodeWebhookData: Parsed data keys: [KEYS]
```

#### 3. **Verificação do Formato**
```
📧 process-inbox-email: Checking if this is a Gmail Push Notification...
📧 process-inbox-email: Has message property: true/false
📧 process-inbox-email: Has message.data property: true/false
📧 process-inbox-email: This is a Gmail Push Notification, decoding data...
```

#### 4. **Notificação para n8n**
```
📤 sendNotificationToN8n: ===== STARTING N8N NOTIFICATION =====
📤 sendNotificationToN8n: Conversation ID: [ID]
📤 sendNotificationToN8n: University ID: [ID]
📤 sendNotificationToN8n: University Name: [NAME]
📤 sendNotificationToN8n: AI Enabled: true/false
📤 sendNotificationToN8n: Email Message ID: [ID]
📤 sendNotificationToN8n: Email From: [EMAIL]
📤 sendNotificationToN8n: Email To: [EMAIL]
📤 sendNotificationToN8n: Email Subject: [SUBJECT]
📤 sendNotificationToN8n: Email Body Length: [LENGTH]
📤 sendNotificationToN8n: Has Attachments: true/false
📤 sendNotificationToN8n: Notify URL: [URL]
📤 sendNotificationToN8n: Preparing to send notification data: [JSON]
📤 sendNotificationToN8n: Response status: [STATUS]
📤 sendNotificationToN8n: Response status text: [TEXT]
📤 sendNotificationToN8n: Response headers: [HEADERS]
```

#### 5. **Conclusão**
```
✅ process-inbox-email: Email processing initiated successfully
✅ process-inbox-email: Conversation ID: [ID]
✅ process-inbox-email: University: [NAME]
✅ process-inbox-email: ===== PROCESSING COMPLETE =====
```

#### 6. **Erros**
```
❌ process-inbox-email: ===== ERROR OCCURRED =====
❌ process-inbox-email: Error type: [TYPE]
❌ process-inbox-email: Error message: [MESSAGE]
❌ process-inbox-email: Error stack: [STACK]
❌ process-inbox-email: Full error object: [JSON]
```

## Como Verificar os Logs

### 1. **Deploy da Função Atualizada**
```bash
supabase functions deploy process-inbox-email
```

### 2. **Ver Logs em Tempo Real**
```bash
# Ver logs da função
supabase functions logs process-inbox-email --follow

# Ou ver logs específicos
supabase functions logs process-inbox-email | grep "process-inbox-email"
```

### 3. **Filtrar Logs Importantes**
```bash
# Ver apenas logs de webhook recebido
supabase functions logs process-inbox-email | grep "WEBHOOK RECEIVED"

# Ver logs de decodificação
supabase functions logs process-inbox-email | grep "decodeWebhookData"

# Ver logs de notificação n8n
supabase functions logs process-inbox-email | grep "sendNotificationToN8n"

# Ver logs de erro
supabase functions logs process-inbox-email | grep "ERROR OCCURRED"
```

## Possíveis Problemas

### 1. **Webhook Não Está Chegando**
- Verificar se o webhook do Gmail está configurado corretamente
- Verificar se a URL da Edge Function está correta
- Verificar se o Gmail está enviando notificações

### 2. **Formato do Webhook Incorreto**
- Verificar se o webhook tem a estrutura `message.data`
- Verificar se os dados estão em base64
- Verificar se o JSON está válido

### 3. **Dados do Email Faltando**
- Verificar se `messageId`, `from`, `to` estão presentes
- Verificar se o domínio do email está correto
- Verificar se a universidade existe no banco

### 4. **Problema na Notificação n8n**
- Verificar se a Edge Function `notify-n8n-new-email` existe
- Verificar se as variáveis de ambiente estão configuradas
- Verificar se o endpoint n8n está acessível

## Teste Manual

### 1. **Enviar Email de Teste**
Envie um email para a conta conectada e verifique os logs.

### 2. **Verificar Logs Imediatamente**
```bash
supabase functions logs process-inbox-email --follow
```

### 3. **Procurar por Logs Específicos**
```bash
# Ver se o webhook chegou
grep "WEBHOOK RECEIVED" logs.txt

# Ver se foi decodificado
grep "JSON parsed successfully" logs.txt

# Ver se a notificação foi enviada
grep "Notification sent to n8n successfully" logs.txt
```

## Próximos Passos

1. **Deploy da função com logs**
2. **Enviar email de teste**
3. **Verificar logs em tempo real**
4. **Identificar onde o processo para**
5. **Corrigir o problema específico**

## Comandos Úteis

```bash
# Deploy da função
supabase functions deploy process-inbox-email

# Ver logs em tempo real
supabase functions logs process-inbox-email --follow

# Ver logs das últimas 24h
supabase functions logs process-inbox-email --since 24h

# Ver logs de uma função específica
supabase functions logs notify-n8n-new-email

# Limpar logs (se necessário)
supabase functions logs process-inbox-email --clear
``` 