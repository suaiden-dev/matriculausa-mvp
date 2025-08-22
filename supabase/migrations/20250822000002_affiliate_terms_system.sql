-- Drop tables if they exist
drop table if exists user_terms_acceptance;
drop table if exists affiliate_terms;

-- Criar tabela para os termos
create table affiliate_terms (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  status boolean default true,
  version integer default 1,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Criar tabela para aceitação dos termos pelos usuários
create table user_terms_acceptance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  term_id uuid references affiliate_terms(id) not null,
  accepted_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  constraint user_terms_acceptance_unique unique (user_id, term_id)
);

-- Criar índices para melhor performance
create index idx_user_terms_acceptance_user_id on user_terms_acceptance(user_id);
create index idx_user_terms_acceptance_term_id on user_terms_acceptance(term_id);

-- Adicionar RLS (Row Level Security)
alter table affiliate_terms enable row level security;
alter table user_terms_acceptance enable row level security;

-- Remover políticas existentes
drop policy if exists "Affiliate admin can manage terms" on affiliate_terms;
drop policy if exists "Everyone can view active terms" on affiliate_terms;

-- Criar novas políticas para affiliate_terms
create policy "Affiliate admin can manage terms"
  on affiliate_terms
  for all
  using ((auth.jwt()->'user_metadata'->>'role')::text = 'affiliate_admin');

create policy "Everyone can view active terms"
  on affiliate_terms
  for select
  using (true);

-- Políticas para user_terms_acceptance
create policy "Users can read their own term acceptances"
  on user_terms_acceptance
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own term acceptances"
  on user_terms_acceptance
  for insert
  with check (auth.uid() = user_id);

-- Função para verificar se um usuário aceitou todos os termos ativos
drop function if exists check_user_terms_acceptance(uuid);
drop function if exists get_user_unaccepted_terms(uuid);

create or replace function check_user_terms_acceptance(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_total_active_terms bigint;
  v_accepted_terms bigint;
  v_is_referred_user boolean;
begin
  -- Verifica se o usuário se cadastrou usando código de seller
  select exists (
    select 1
    from user_profiles
    where id = p_user_id
    and seller_referral_code is not null
    and seller_referral_code != ''
  ) into v_is_referred_user;

  -- Se não for usuário referenciado, não precisa aceitar termos
  if not v_is_referred_user then
    return true;
  end if;

  -- Conta quantos termos ativos existem
  select count(*)
  into v_total_active_terms
  from affiliate_terms
  where status = true;

  -- Conta quantos termos ativos o usuário aceitou
  select count(*)
  into v_accepted_terms
  from user_terms_acceptance uta
  inner join affiliate_terms at on uta.term_id = at.id
  where at.status = true
  and uta.user_id = p_user_id;

  -- Retorna true se o usuário aceitou todos os termos ativos
  return v_total_active_terms = v_accepted_terms;
end;
$$;
