-- Create table to store AI Agent configuration linked to an email configuration
-- Safeguard: wrap in transaction
begin;

-- Table: ai_email_agents
create table if not exists public.ai_email_agents (
  id uuid primary key default gen_random_uuid(),
  email_configuration_id uuid not null references public.email_configurations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ai_name text not null,
  agent_type text,
  personality text,
  custom_prompt text,
  has_documents boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_email_agents_unique_email_config unique(email_configuration_id)
);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ai_email_agents_set_updated_at on public.ai_email_agents;
create trigger trg_ai_email_agents_set_updated_at
before update on public.ai_email_agents
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.ai_email_agents enable row level security;

-- Policies
drop policy if exists "ai_email_agents_select_own" on public.ai_email_agents;
create policy "ai_email_agents_select_own"
on public.ai_email_agents for select
using (user_id = auth.uid());

drop policy if exists "ai_email_agents_insert_own" on public.ai_email_agents;
create policy "ai_email_agents_insert_own"
on public.ai_email_agents for insert
with check (
  user_id = auth.uid()
  and exists(
    select 1 from public.email_configurations ec
    where ec.id = ai_email_agents.email_configuration_id
      and ec.user_id = auth.uid()
  )
);

drop policy if exists "ai_email_agents_update_own" on public.ai_email_agents;
create policy "ai_email_agents_update_own"
on public.ai_email_agents for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "ai_email_agents_delete_own" on public.ai_email_agents;
create policy "ai_email_agents_delete_own"
on public.ai_email_agents for delete
using (user_id = auth.uid());

commit;


