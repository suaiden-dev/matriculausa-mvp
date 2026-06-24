-- Agenda sync-alpha-status a cada 10 minutos via pg_cron + net extension.
-- Requer as extensões pg_cron e pg_net habilitadas no projeto Supabase.

SELECT cron.schedule(
  'sync-alpha-status-every-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/sync-alpha-status',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  current_setting('app.cron_secret', true)
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
