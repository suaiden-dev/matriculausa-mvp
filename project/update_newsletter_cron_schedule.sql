-- 🔄 ATUALIZAÇÃO DO HORÁRIO DO CRON JOB DO NEWSLETTER
-- Data: 08/12/2025
-- Alteração: Horário de execução mudado de 9h UTC para 20h UTC (17h no Brasil - GMT-3)

-- 1. Verificar o cron job atual
SELECT 
  jobid,
  schedule,
  command,
  jobname,
  active
FROM cron.job
WHERE jobname = 'newsletter-campaigns';

-- 2. Atualizar o horário para 17h no Brasil (20h UTC)
-- Brasil está em GMT-3 (America/Sao_Paulo), então:
-- 17h BR = 20h UTC
SELECT cron.alter_job(
  14,  -- jobid do newsletter-campaigns
  schedule => '0 20 * * *'  -- 20h UTC = 17h no Brasil (GMT-3)
);

-- 3. Verificar se a atualização foi aplicada
SELECT 
  jobid,
  schedule,
  command,
  jobname,
  active
FROM cron.job
WHERE jobname = 'newsletter-campaigns';

-- 📋 INFORMAÇÕES:
-- - Cron job: newsletter-campaigns
-- - Job ID: 14
-- - Horário anterior: 0 9 * * * (9h UTC = 6h no Brasil)
-- - Horário novo: 0 20 * * * (20h UTC = 17h no Brasil)
-- - Função executada: trigger_newsletter_campaigns()
-- - Edge Function: process-newsletter-campaigns

-- ⚠️ NOTA:
-- O Supabase usa UTC para todos os cron jobs. Para converter:
-- - Horário no Brasil (GMT-3): subtrair 3 horas do UTC
-- - Exemplo: 20h UTC = 17h no Brasil




