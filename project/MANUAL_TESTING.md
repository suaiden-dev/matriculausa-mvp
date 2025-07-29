# Testes Manuais - Documentação

## Componentes de Teste

### 1. TestNgrokEndpoint

**Localização:** `src/components/TestNgrokEndpoint.tsx`

**Funcionalidade:**
- Carrega emails reais da caixa de entrada (`ai_email_conversations`)
- Permite selecionar um email específico para teste
- Usa dados autênticos do email selecionado
- Envia para o endpoint ngrok com informações reais

**Como usar:**
1. Acesse: `School Dashboard` → `AI Settings`
2. Role até o final da página
3. Selecione um email da caixa de entrada no dropdown
4. Clique em: `🚀 Testar Endpoint Ngrok`

**Dados enviados:**
```json
{
  "from": "remetente@exemplo.com", // Email real que chegou na caixa
  "timestamp": "2025-01-27T10:30:00.000Z", // Timestamp real do email
  "content": "Conteúdo real do email...", // Corpo real do email
  "subject": "Assunto real do email", // Assunto real do email
  "client_id": "c517248f-1711-4b5d-bf35-7cb5673ff8a5" // User ID real
}
```

**Headers enviados:**
```
Content-Type: application/json
apikey: dGZvZVNVQUlERU4yMDI1Y2VtZUd1aWxoZXJtZQ==01983e6f-48be-7f83-bcca-df30867edaf6
User-Agent: MatriculaUSA/1.0
```

**Logs esperados:**
- Console: `🧪 TestNgrokEndpoint: Starting test...`
- Console: `📧 Email selecionado: {...}`
- Console: `🧪 TestNgrokEndpoint: Sending test data: {...}`
- Console: `✅ TestNgrokEndpoint: Success response: {...}`

### 2. TestEmailProcessing

**Localização:** `src/components/TestEmailProcessing.tsx`

**Funcionalidade:**
- Simula um webhook do Gmail
- Testa o processamento completo de email
- Verifica identificação da universidade
- Testa notificação para n8n

**Como usar:**
1. Acesse: `School Dashboard` → `AI Settings`
2. Role até o final da página
3. Clique em: `📧 Testar Processamento de Email`

**Dados simulados:**
```json
{
  "message": {
    "data": "base64_encoded_email_data",
    "messageId": "msg_timestamp",
    "publishTime": "2025-01-27T10:30:00.000Z"
  },
  "subscription": "test_subscription"
}
```

## Troubleshooting

### TestNgrokEndpoint

**Problema:** "Nenhum email encontrado na caixa de entrada"
- **Solução:** Verifique se há emails na tabela `ai_email_conversations`
- **Solução:** Clique em "🔄 Recarregar emails"

**Problema:** "Selecione um email para testar"
- **Solução:** Selecione um email no dropdown antes de testar

**Problema:** Erro 400 "Missing parameters"
- **Solução:** Verifique se todos os campos obrigatórios estão sendo enviados
- **Solução:** Verifique se o apikey está correto

### TestEmailProcessing

**Problema:** Erro de autenticação
- **Solução:** Verifique se o usuário está logado
- **Solução:** Verifique se as permissões estão corretas

**Problema:** Erro de identificação da universidade
- **Solução:** Verifique se o domínio do email está cadastrado na tabela `universities`
- **Solução:** Verifique se a coluna `contact` está preenchida corretamente

## Logs para Debug

### Console do Navegador
```javascript
// TestNgrokEndpoint
🧪 TestNgrokEndpoint: Starting test...
📧 Email selecionado: {...}
🧪 TestNgrokEndpoint: Sending test data: {...}
✅ TestNgrokEndpoint: Success response: {...}

// TestEmailProcessing
📧 TestEmailProcessing: Starting email processing test...
📧 TestEmailProcessing: Mock webhook data: {...}
✅ TestEmailProcessing: Success response: {...}
```

### Logs da Edge Function
```bash
# Ver logs da função ngrok
supabase functions logs send-to-ngrok-endpoint --follow

# Ver logs da função de processamento
supabase functions logs process-inbox-email --follow
```

## Dicas

1. **Sempre abra o console do navegador (F12)** para ver logs detalhados
2. **Use emails reais** para testes mais precisos
3. **Verifique os logs da Edge Function** se houver problemas
4. **Recarregue os emails** se não aparecerem na lista
5. **Teste com diferentes tipos de email** para cobrir cenários variados 