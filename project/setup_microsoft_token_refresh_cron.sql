-- 🔄 CONFIGURAÇÃO DO CRON JOB PARA REFRESH AUTOMÁTICO DE TOKENS MICROSOFT
-- Execute este SQL no painel do Supabase → SQL Editor

-- 1. Verificar se as extensões estão habilitadas
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- 2. Remover job existente (se houver)
SELECT cron.unschedule('microsoft-token-refresh');

-- 3. Criar função para chamar a Edge Function de refresh de tokens
CREATE OR REPLACE FUNCTION trigger_microsoft_token_refresh()
RETURNS void AS $$
BEGIN
  -- Log da execução
  RAISE NOTICE 'Cron job de refresh de tokens executado em: %', NOW();
  
  -- Chamar a Edge Function via HTTP
  PERFORM net.http_post(
    url := 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-token-refresh',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3NDgwMCwiZXhwIjoyMDUwNTUwODAwfQ.8Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  
  RAISE NOTICE 'Edge Function de refresh de tokens chamada com sucesso';
END;
$$ LANGUAGE plpgsql;

-- 4. Configurar cron job para executar a cada 30 minutos
SELECT cron.schedule(
  'microsoft-token-refresh',
  '*/30 * * * *', -- A cada 30 minutos
  'SELECT trigger_microsoft_token_refresh();'
);

-- 5. Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'microsoft-token-refresh';

-- 6. Testar a função manualmente
SELECT trigger_microsoft_token_refresh();

-- 7. Verificar logs do cron (se disponível)
SELECT * FROM cron.job_run_details WHERE jobname = 'microsoft-token-refresh' ORDER BY start_time DESC LIMIT 5;

-- 8. Verificar status das conexões Microsoft
SELECT 
  email_address,
  is_active,
  oauth_token_expires_at,
  updated_at,
  CASE 
    WHEN oauth_token_expires_at::timestamp < NOW() THEN 'EXPIRADO'
    WHEN oauth_token_expires_at::timestamp < NOW() + INTERVAL '5 minutes' THEN 'PRÓXIMO DO VENCIMENTO'
    ELSE 'VÁLIDO'
  END as token_status
FROM email_configurations 
WHERE provider_type = 'microsoft'
ORDER BY updated_at DESC;

-- 📋 INSTRUÇÕES:
-- 1. Execute este SQL no painel do Supabase → SQL Editor
-- 2. Verifique se não há erros
-- 3. Teste manualmente com: SELECT trigger_microsoft_token_refresh();
-- 4. Monitore os logs para confirmar funcionamento
-- 5. O job executará automaticamente a cada 30 minutos

-- 🚨 IMPORTANTE:
-- - Este cron job é independente do processamento de emails
-- - Foca especificamente no refresh de tokens Microsoft
-- - Executa 24/7 para manter tokens sempre válidos
-- - Marca contas como inativas se refresh falhar

-- 📊 MONITORAMENTO:
-- Para verificar se está funcionando:
-- 1. SELECT * FROM cron.job WHERE jobname = 'microsoft-token-refresh';
-- 2. SELECT * FROM cron.job_run_details WHERE jobname = 'microsoft-token-refresh' ORDER BY start_time DESC LIMIT 10;
-- 3. Verificar logs da Edge Function no dashboard
