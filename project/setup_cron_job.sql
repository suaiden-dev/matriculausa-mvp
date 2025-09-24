-- 🔧 CONFIGURAÇÃO DO CRON JOB PARA PROCESSAMENTO AUTOMÁTICO DE EMAILS
-- Execute este SQL no painel do Supabase → SQL Editor

-- 1. Habilitar extensão pg_cron (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Habilitar extensão pg_net (para chamadas HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Verificar se as extensões estão funcionando
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- 4. Criar função para chamar a Edge Function
CREATE OR REPLACE FUNCTION trigger_email_processing()
RETURNS void AS $$
BEGIN
  -- Log da execução
  RAISE NOTICE 'Cron job executado em: %', NOW();
  
  -- Chamar a Edge Function via HTTP
  PERFORM net.http_post(
    url := 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  
  RAISE NOTICE 'Edge Function chamada com sucesso';
END;
$$ LANGUAGE plpgsql;

-- 5. Remover job existente (se houver)
SELECT cron.unschedule('email-processing');

-- 6. Configurar cron job para executar a cada 30 segundos (para testes)
SELECT cron.schedule(
  'email-processing',
  '*/30 * * * * *', -- A cada 30 segundos
  'SELECT trigger_email_processing();'
);

-- 7. Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'email-processing';

-- 8. Testar a função manualmente
SELECT trigger_email_processing();

-- 9. Verificar logs do cron (se disponível)
SELECT * FROM cron.job_run_details WHERE jobname = 'email-processing' ORDER BY start_time DESC LIMIT 5;

-- 10. Para PRODUÇÃO, alterar para 5 minutos:
-- SELECT cron.alter_job(5, schedule => '*/5 * * * *');

-- 📋 INSTRUÇÕES:
-- 1. Execute este SQL no painel do Supabase → SQL Editor
-- 2. Verifique se não há erros
-- 3. Teste manualmente com: SELECT trigger_email_processing();
-- 4. Monitore os logs para confirmar funcionamento
-- 5. Para produção, altere o schedule para '*/5 * * * *' (5 minutos)
