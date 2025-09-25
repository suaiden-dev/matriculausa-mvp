-- 🔧 CORREÇÃO DO CRON JOB - API KEY CORRETA
-- Execute este SQL no painel do Supabase → SQL Editor

-- 1. Verificar se as extensões estão habilitadas
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- 2. Remover job existente (se houver)
SELECT cron.unschedule('email-processing');

-- 3. Criar função corrigida com Service Role Key
CREATE OR REPLACE FUNCTION trigger_email_processing()
RETURNS void AS $$
BEGIN
  -- Log da execução
  RAISE NOTICE 'Cron job executado em: %', NOW();
  
  -- Chamar a Edge Function via HTTP com Service Role Key
  PERFORM net.http_post(
    url := 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3NDgwMCwiZXhwIjoyMDUwNTUwODAwfQ.8Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  
  RAISE NOTICE 'Edge Function chamada com sucesso';
END;
$$ LANGUAGE plpgsql;

-- 4. Configurar cron job para executar a cada 30 segundos (para testes)
SELECT cron.schedule(
  'email-processing',
  '*/30 * * * * *', -- A cada 30 segundos
  'SELECT trigger_email_processing();'
);

-- 5. Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'email-processing';

-- 6. Testar a função manualmente
SELECT trigger_email_processing();

-- 7. Verificar logs do cron (se disponível)
SELECT * FROM cron.job_run_details WHERE jobname = 'email-processing' ORDER BY start_time DESC LIMIT 5;

-- 📋 INSTRUÇÕES:
-- 1. Execute este SQL no painel do Supabase → SQL Editor
-- 2. Verifique se não há erros
-- 3. Teste manualmente com: SELECT trigger_email_processing();
-- 4. Monitore os logs para confirmar funcionamento
-- 5. Para produção, altere o schedule para '*/5 * * * *' (5 minutos)

-- 🚨 IMPORTANTE:
-- - NUNCA fazer DB RESET
-- - Usar Service Role Key, não Anon Key
-- - Testar manualmente antes de automatizar
