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
alter table user_terms_acceptance enable row level security;

-- Políticas de segurança
create policy "Users can read their own term acceptances"
  on user_terms_acceptance for select
  using (auth.uid() = user_id);

create policy "Users can insert their own term acceptances"
  on user_terms_acceptance for insert
  with check (auth.uid() = user_id);

-- Function para verificar se um usuário aceitou todos os termos ativos de um seller
create or replace function check_user_terms_acceptance(p_user_id uuid, p_seller_code text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_total_active_terms bigint;
  v_accepted_terms bigint;
begin
  -- Conta quantos termos ativos existem para o seller
  select count(*)
  into v_total_active_terms
  from affiliate_terms at
  inner join seller_referrals sr on true
  where sr.code = p_seller_code
  and at.status = true;

  -- Conta quantos desses termos o usuário aceitou
  select count(*)
  into v_accepted_terms
  from user_terms_acceptance uta
  inner join affiliate_terms at on uta.term_id = at.id
  inner join seller_referrals sr on true
  where sr.code = p_seller_code
  and at.status = true
  and uta.user_id = p_user_id;

  -- Retorna true se o usuário aceitou todos os termos ativos
  return v_total_active_terms = v_accepted_terms;
end;
$$;
