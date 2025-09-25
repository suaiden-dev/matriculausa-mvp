# 🔄 Configuração do Cron Job para Refresh de Tokens Microsoft

## 📋 Visão Geral

Esta Edge Function (`microsoft-token-refresh`) foi criada para executar automaticamente o refresh de tokens Microsoft via cron job, garantindo que o sistema de emails funcione 24/7 sem intervenção manual.

## ⚙️ Configuração do Cron Job

### 1. **Frequência Recomendada**
- **Execução**: A cada 30 minutos
- **Horário**: 24/7 (sempre ativo)
- **Timezone**: UTC

### 2. **Configuração no Supabase Dashboard**

1. Acesse o **Supabase Dashboard**
2. Vá para **Database** → **Cron Jobs**
3. Clique em **"New Cron Job"**
4. Configure:

```sql
-- Nome do Job
Name: microsoft-token-refresh

-- Schedule (a cada 30 minutos)
Schedule: */30 * * * *

-- SQL para executar a Edge Function
SELECT cron.schedule(
  'microsoft-token-refresh',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/microsoft-token-refresh',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 3. **Configuração Manual via SQL**

Execute este SQL no **SQL Editor** do Supabase:

```sql
-- Criar o cron job
SELECT cron.schedule(
  'microsoft-token-refresh',
  '*/30 * * * *', -- A cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/microsoft-token-refresh',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'microsoft-token-refresh';

-- Para remover o job (se necessário)
-- SELECT cron.unschedule('microsoft-token-refresh');
```

## 🔧 Variáveis de Ambiente Necessárias

Certifique-se de que estas variáveis estão configuradas no Supabase:

```bash
# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 Monitoramento

### 1. **Logs da Edge Function**
- Acesse **Edge Functions** → **microsoft-token-refresh**
- Visualize os logs em tempo real
- Monitore erros e sucessos

### 2. **Métricas do Cron Job**
```sql
-- Verificar execuções do cron job
SELECT * FROM cron.job_run_details 
WHERE jobname = 'microsoft-token-refresh' 
ORDER BY start_time DESC 
LIMIT 10;
```

### 3. **Status das Conexões**
```sql
-- Verificar status das conexões Microsoft
SELECT 
  email_address,
  is_active,
  oauth_token_expires_at,
  updated_at
FROM email_configurations 
WHERE provider_type = 'microsoft'
ORDER BY updated_at DESC;
```

## 🚨 Troubleshooting

### **Problema: Cron job não executa**
1. Verificar se a extensão `pg_cron` está habilitada
2. Verificar se as variáveis de ambiente estão corretas
3. Verificar se a Edge Function está deployada

### **Problema: Tokens não são renovados**
1. Verificar se os refresh tokens estão válidos no banco
2. Verificar logs da Edge Function
3. Verificar se as credenciais Microsoft estão corretas

### **Problema: Muitas falhas de refresh**
1. Verificar se as contas Microsoft não foram revogadas
2. Verificar se os usuários não fizeram logout
3. Considerar aumentar a frequência do cron job

## 📈 Otimizações

### **1. Frequência Adaptativa**
- **Alta atividade**: A cada 15 minutos
- **Baixa atividade**: A cada 1 hora
- **Monitoramento**: Ajustar baseado nos logs

### **2. Notificações**
Configure alertas para:
- Falhas consecutivas de refresh
- Contas marcadas como desconectadas
- Erros de autenticação Microsoft

### **3. Backup de Tokens**
- Considerar backup dos refresh tokens
- Implementar rotação de credenciais
- Monitorar expiração de refresh tokens

## ✅ Checklist de Implementação

- [ ] Edge Function `microsoft-token-refresh` deployada
- [ ] Variáveis de ambiente configuradas
- [ ] Cron job criado e ativo
- [ ] Teste manual executado com sucesso
- [ ] Monitoramento configurado
- [ ] Alertas configurados (opcional)
- [ ] Documentação atualizada

## 🧪 Teste Manual

Para testar a função manualmente:

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/microsoft-token-refresh?test=true' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

## 📝 Notas Importantes

1. **Segurança**: O cron job usa a Service Role Key, que tem acesso total ao banco
2. **Rate Limiting**: A função inclui pausas entre requisições para evitar rate limiting
3. **Fallback**: Se refresh falhar, a conta é marcada como inativa automaticamente
4. **Logs**: Todos os processos são logados para monitoramento
5. **Escalabilidade**: A função processa todas as conexões ativas automaticamente
