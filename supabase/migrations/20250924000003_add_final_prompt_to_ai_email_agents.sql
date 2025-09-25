begin;

alter table public.ai_email_agents
  add column if not exists final_prompt text,
  add column if not exists webhook_status text,
  add column if not exists webhook_result jsonb,
  add column if not exists webhook_processed_at timestamptz;

commit;


