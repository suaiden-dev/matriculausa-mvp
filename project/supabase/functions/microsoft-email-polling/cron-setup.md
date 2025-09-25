# Configuração do Cron Job para Processamento Automático de Emails

## 1. Configurar Cron Job no Supabase

Para que a Edge Function execute automaticamente a cada 30 segundos, você precisa configurar um cron job no Supabase.

### Opção A: Usando pg_cron (Recomendado)

```sql
-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar função para chamar a Edge Function
CREATE OR REPLACE FUNCTION trigger_email_processing()
RETURNS void AS $$
BEGIN
  -- Chamar a Edge Function via HTTP
  PERFORM net.http_post(
    url := 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- Configurar cron job para executar a cada 30 segundos
SELECT cron.schedule(
  'email-processing',
  '*/30 * * * * *', -- A cada 30 segundos
  'SELECT trigger_email_processing();'
);
```

### Opção B: Usando Supabase Edge Functions + Webhooks

1. **Configurar webhook no Microsoft Graph** para notificações em tempo real
2. **Criar Edge Function** que recebe webhooks
3. **Processar emails** imediatamente quando notificado

## 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no painel do Supabase:

```
MICROSOFT_CLIENT_ID=seu_client_id
MICROSOFT_CLIENT_SECRET=seu_client_secret
MICROSOFT_TENANT_ID=seu_tenant_id
GEMINI_API_KEY=sua_gemini_api_key
```

## 3. Testar a Edge Function

```bash
# Testar localmente
curl -X POST https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 4. Monitorar Logs

```bash
# Ver logs da Edge Function
supabase functions logs microsoft-email-polling
```

## 5. Ativar/Desativar Processamento

```sql
-- Ativar processamento para um usuário
UPDATE email_processing_configs 
SET is_active = true 
WHERE user_id = 'user-uuid';

-- Desativar processamento para um usuário
UPDATE email_processing_configs 
SET is_active = false 
WHERE user_id = 'user-uuid';
```

## 6. Configuração de Usuário

Para que um usuário tenha processamento automático, ele precisa:

1. **Fazer login** no sistema
2. **Autorizar Microsoft Graph** (já implementado)
3. **Salvar tokens** na tabela `email_processing_configs`

```typescript
// Exemplo de como salvar configuração do usuário
const { data, error } = await supabase
  .from('email_processing_configs')
  .upsert({
    user_id: user.id,
    access_token: microsoftAccessToken,
    refresh_token: microsoftRefreshToken,
    is_active: true
  });
```

## 7. Benefícios da Solução

✅ **Funciona 24/7** - Não precisa do site aberto
✅ **Escalável** - Processa múltiplos usuários
✅ **Confiável** - Roda no servidor Supabase
✅ **Eficiente** - Usa cron job otimizado
✅ **Monitorável** - Logs e métricas disponíveis
