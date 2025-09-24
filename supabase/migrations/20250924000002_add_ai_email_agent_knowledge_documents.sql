begin;

create table if not exists public.ai_email_agent_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  ai_email_agent_id uuid not null references public.ai_email_agents(id) on delete cascade,
  document_name text not null,
  file_url text not null,
  file_size bigint not null,
  mime_type text not null,
  uploaded_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ai_email_agent_knowledge_documents_set_updated_at on public.ai_email_agent_knowledge_documents;
create trigger trg_ai_email_agent_knowledge_documents_set_updated_at
before update on public.ai_email_agent_knowledge_documents
for each row execute function public.set_updated_at();

alter table public.ai_email_agent_knowledge_documents enable row level security;

drop policy if exists "email_agent_docs_select_own" on public.ai_email_agent_knowledge_documents;
create policy "email_agent_docs_select_own"
on public.ai_email_agent_knowledge_documents for select
using (
  uploaded_by_user_id = auth.uid() or
  exists(
    select 1 from public.ai_email_agents a
    where a.id = ai_email_agent_knowledge_documents.ai_email_agent_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "email_agent_docs_insert_own" on public.ai_email_agent_knowledge_documents;
create policy "email_agent_docs_insert_own"
on public.ai_email_agent_knowledge_documents for insert
with check (
  uploaded_by_user_id = auth.uid() and
  exists(
    select 1 from public.ai_email_agents a
    where a.id = ai_email_agent_knowledge_documents.ai_email_agent_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "email_agent_docs_update_own" on public.ai_email_agent_knowledge_documents;
create policy "email_agent_docs_update_own"
on public.ai_email_agent_knowledge_documents for update
using (uploaded_by_user_id = auth.uid())
with check (uploaded_by_user_id = auth.uid());

drop policy if exists "email_agent_docs_delete_own" on public.ai_email_agent_knowledge_documents;
create policy "email_agent_docs_delete_own"
on public.ai_email_agent_knowledge_documents for delete
using (
  uploaded_by_user_id = auth.uid() or
  exists(
    select 1 from public.ai_email_agents a
    where a.id = ai_email_agent_knowledge_documents.ai_email_agent_id
      and a.user_id = auth.uid()
  )
);

commit;


