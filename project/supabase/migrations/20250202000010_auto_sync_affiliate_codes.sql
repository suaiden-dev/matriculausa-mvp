/*
  Auto-sync affiliate_codes to Stripe on insert using pg_net → Edge Function
*/

-- Enable pg_net extension (HTTP client for Postgres)
create extension if not exists pg_net;

-- Settings table to store Edge Function URL and auth key (service role or function secret)
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Placeholders (update these values in prod)
insert into public.system_settings(key, value) values
  ('edge_sync_url', 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-affiliate-codes')
  on conflict (key) do nothing;
insert into public.system_settings(key, value) values
  ('edge_sync_key', '<SET_SERVICE_ROLE_OR_FUNCTION_KEY>')
  on conflict (key) do nothing;

-- Helper to read setting
create or replace function public.get_setting(key_text text)
returns text as $$
  select value from public.system_settings where key = key_text limit 1;
$$ language sql stable;

-- Function to POST to Edge Function
create or replace function public.sync_affiliate_code_http(code_text text)
returns void as $$
declare
  url text;
  key text;
  res jsonb;
begin
  url := public.get_setting('edge_sync_url');
  key := public.get_setting('edge_sync_key');
  if url is null or key is null then
    raise notice 'sync skipped: missing edge_sync_url or edge_sync_key';
    return;
  end if;

  select net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '|| key
    ),
    body := jsonb_build_object('code', code_text)
  ) into res;

  raise notice 'sync result: %', res;
end;
$$ language plpgsql security definer;

-- Trigger to auto-sync on insert of active affiliate_codes
create or replace function public.on_affiliate_code_insert_sync()
returns trigger as $$
begin
  if new.is_active is true then
    perform public.sync_affiliate_code_http(new.code);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_affiliate_code_auto_sync
  after insert on public.affiliate_codes
  for each row execute function public.on_affiliate_code_insert_sync();

-- Advisory note
do $$ begin raise notice 'Auto-sync for affiliate_codes installed. Update system_settings.edge_sync_url and edge_sync_key.'; end $$;
