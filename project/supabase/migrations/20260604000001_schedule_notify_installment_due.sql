-- ============================================================
-- Migration: Schedule daily installment due notifications
-- Created: 2026-06-04
--
-- Agenda a Edge Function notify-installment-due para rodar
-- diariamente às 09:00 UTC via pg_cron + pg_net.
--
-- Usa public.system_settings para ler a service_role_key,
-- seguindo o padrão já adotado no projeto.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove job anterior se existir (idempotente)
SELECT cron.unschedule('notify-installment-due-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'notify-installment-due-daily'
);

-- Agenda execução diária à meia-noite (00:00 UTC)
SELECT cron.schedule(
  'notify-installment-due-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url        := 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/notify-installment-due',
    headers    := jsonb_build_object(
                    'Content-Type',  'application/json',
                    'Authorization', 'Bearer ' || COALESCE(
                      (SELECT value FROM public.system_settings WHERE key = 'service_role_key' LIMIT 1),
                      ''
                    )
                  ),
    body       := '{}'::jsonb
  ) AS request_id;
  $$
);
