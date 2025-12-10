-- 🧪 CONFIGURAÇÃO DO CRON JOB DO NEWSLETTER PARA TESTES
-- Execute este SQL no painel do Supabase → SQL Editor
-- ⚠️ ATENÇÃO: Este é para TESTES. Use apenas em desenvolvimento!

-- 1. Verificar o cron job atual
SELECT 
  jobid,
  schedule,
  command,
  jobname,
  active
FROM cron.job
WHERE jobname = 'newsletter-campaigns';

-- 2. Atualizar o horário para executar a cada 1 minuto (para testes)
-- Formato: minuto hora dia mês dia-da-semana
-- '*/1 * * * *' = a cada 1 minuto
SELECT cron.alter_job(
  14,  -- jobid do newsletter-campaigns (verificar se está correto)
  schedule => '*/1 * * * *'  -- A cada 1 minuto (para testes)
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

-- 📋 OUTRAS OPÇÕES DE FREQUÊNCIA PARA TESTES:
-- '*/1 * * * *'  - A cada 1 minuto
-- '*/2 * * * *'  - A cada 2 minutos
-- '*/5 * * * *'  - A cada 5 minutos
-- '*/10 * * * *' - A cada 10 minutos
-- '0 * * * *'    - A cada hora (no minuto 0)
-- '0 20 * * *'   - Uma vez por dia às 20h UTC (PRODUÇÃO)

-- ⚠️ IMPORTANTE:
-- Após os testes, volte para o horário de produção:
-- SELECT cron.alter_job(14, schedule => '0 20 * * *');



