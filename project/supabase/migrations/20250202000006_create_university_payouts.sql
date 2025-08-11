/*
  Sistema de Payouts para Universidades (Matricula Rewards)
  - 1 coin = 1 USD, sem taxas
  - Universidade cria solicitação (pending) com método de pagamento e detalhes
  - Admin aprova, marca como pago ou rejeita
  - Universidade pode cancelar enquanto pending
  - Geração de invoice interna automaticamente
*/

-- Extensões necessárias
create extension if not exists pgcrypto;

-- Tabela de solicitações de payout
create table if not exists public.university_payout_requests (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade not null,
  requested_by uuid references auth.users(id) on delete set null,
  amount_coins integer not null check (amount_coins > 0),
  amount_usd numeric(12,2) not null,
  payout_method text not null check (payout_method in ('zelle','bank_transfer','stripe')), -- extensível
  payout_details_preview jsonb, -- campos não sensíveis para exibição
  payout_details_encrypted bytea, -- dados sensíveis (opcionalmente criptografado)
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected','cancelled')),
  admin_notes text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de invoices
create table if not exists public.payout_invoices (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid references public.university_payout_requests(id) on delete cascade not null,
  invoice_number text not null,
  issued_at timestamptz default now(),
  due_at timestamptz,
  total_usd numeric(12,2) not null,
  status text not null default 'issued' check (status in ('issued','voided')),
  created_at timestamptz default now()
);

-- Sequência para invoice_number
create sequence if not exists public.payout_invoice_seq;

-- Índices
create index if not exists idx_payout_requests_university on public.university_payout_requests(university_id);
create index if not exists idx_payout_requests_status on public.university_payout_requests(status);
create index if not exists idx_payout_invoices_request on public.payout_invoices(payout_request_id);

-- Ajuste na conta da universidade para refletir reservas/débitos
alter table public.university_rewards_account
  add column if not exists last_payout_at timestamptz,
  add column if not exists total_payouts integer default 0;

-- Trigger updated_at
create or replace function public.update_updated_at_column() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_payout_requests_updated
  before update on public.university_payout_requests
  for each row execute function public.update_updated_at_column();

-- RLS
alter table public.university_payout_requests enable row level security;
alter table public.payout_invoices enable row level security;

-- Função utilitária para tentar criptografar detalhes (opcional)
create or replace function public._encrypt_payout_details(details jsonb)
returns bytea as $$
declare
  k text := current_setting('app.encryption_key', true);
begin
  if k is null then
    return null; -- sem chave configurada
  end if;
  return pgp_sym_encrypt(coalesce(details::text, ''), k, 'compress-algo=1');
end;
$$ language plpgsql stable;

-- RPC: Universidade solicita payout
create or replace function public.request_university_payout(
  university_id_param uuid,
  user_id_param uuid,
  amount_coins_param integer,
  payout_method_param text,
  payout_details_param jsonb
) returns json as $$
declare
  acc record;
  req_id uuid;
  inv_id uuid;
  inv_number text;
  encrypted bytea;
  usd_amount numeric(12,2);
begin
  -- validar universidade aprovada e pertencer ao usuário
  if not exists (
    select 1 from public.universities u 
    where u.id = university_id_param and u.is_approved = true and u.user_id = user_id_param
  ) then
    raise exception 'University not found or access denied';
  end if;

  if amount_coins_param <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  usd_amount := amount_coins_param; -- 1 coin = 1 USD

  select * into acc from public.university_rewards_account where university_id = university_id_param;
  if acc is null then
    raise exception 'Rewards account not found for university';
  end if;

  if coalesce(acc.balance_coins,0) < amount_coins_param then
    raise exception 'Insufficient balance_coins for payout';
  end if;

  encrypted := public._encrypt_payout_details(payout_details_param);

  insert into public.university_payout_requests(
    university_id, requested_by, amount_coins, amount_usd, payout_method, 
    payout_details_preview, payout_details_encrypted, status
  ) values (
    university_id_param, user_id_param, amount_coins_param, usd_amount, payout_method_param,
    payout_details_param - 'account_number' - 'routing_number' - 'iban' - 'swift' - 'stripe_secret' - 'zelle_email' - 'zelle_phone',
    encrypted,
    'pending'
  ) returning id into req_id;

  -- gerar invoice
  inv_number := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.payout_invoice_seq')::text, 5, '0');
  insert into public.payout_invoices(payout_request_id, invoice_number, total_usd)
  values (req_id, inv_number, usd_amount) returning id into inv_id;

  -- debitar saldo (reserva efetiva)
  update public.university_rewards_account
    set balance_coins = balance_coins - amount_coins_param,
        total_payouts = total_payouts + 1,
        last_payout_at = now(),
        updated_at = now()
  where university_id = university_id_param;

  return json_build_object(
    'request_id', req_id,
    'invoice_number', inv_number,
    'status', 'pending'
  );
end;
$$ language plpgsql;

-- RPC: Universidade cancela enquanto pending
create or replace function public.cancel_university_payout(
  request_id_param uuid,
  user_id_param uuid
) returns boolean as $$
declare
  req record;
begin
  select * into req from public.university_payout_requests where id = request_id_param;
  if req is null then
    raise exception 'Payout request not found';
  end if;

  -- garantir dono
  if not exists (
    select 1 from public.universities u where u.id = req.university_id and u.user_id = user_id_param
  ) then
    raise exception 'Access denied';
  end if;

  if req.status <> 'pending' then
    raise exception 'Only pending requests can be cancelled';
  end if;

  update public.university_payout_requests
    set status = 'cancelled', cancelled_by = user_id_param, cancelled_at = now()
  where id = request_id_param;

  -- devolver saldo
  update public.university_rewards_account
    set balance_coins = balance_coins + req.amount_coins,
        updated_at = now()
  where university_id = req.university_id;

  return true;
end;
$$ language plpgsql;

-- RPCs Admin
create or replace function public.admin_approve_payout(request_id_param uuid, admin_id_param uuid)
returns boolean as $$
declare
  req record;
begin
  select * into req from public.university_payout_requests where id = request_id_param;
  if req is null then
    raise exception 'Payout request not found';
  end if;
  if req.status <> 'pending' then
    raise exception 'Only pending requests can be approved';
  end if;

  update public.university_payout_requests
    set status = 'approved', approved_by = admin_id_param, approved_at = now()
  where id = request_id_param;
  return true;
end;
$$ language plpgsql;

create or replace function public.admin_mark_payout_paid(request_id_param uuid, admin_id_param uuid, tx_reference text)
returns boolean as $$
declare
  req record;
begin
  select * into req from public.university_payout_requests where id = request_id_param;
  if req is null then
    raise exception 'Payout request not found';
  end if;
  if req.status <> 'approved' then
    raise exception 'Only approved requests can be marked as paid';
  end if;

  update public.university_payout_requests
    set status = 'paid', paid_by = admin_id_param, paid_at = now(), admin_notes = coalesce(admin_notes,'') || case when tx_reference is not null then ('\nTX: '||tx_reference) else '' end
  where id = request_id_param;
  return true;
end;
$$ language plpgsql;

create or replace function public.admin_reject_payout(request_id_param uuid, admin_id_param uuid, reason text)
returns boolean as $$
declare
  req record;
begin
  select * into req from public.university_payout_requests where id = request_id_param;
  if req is null then
    raise exception 'Payout request not found';
  end if;
  if req.status <> 'pending' then
    raise exception 'Only pending requests can be rejected';
  end if;

  update public.university_payout_requests
    set status = 'rejected', approved_by = admin_id_param, approved_at = now(), admin_notes = reason
  where id = request_id_param;

  -- devolver saldo
  update public.university_rewards_account
    set balance_coins = balance_coins + req.amount_coins,
        updated_at = now()
  where university_id = req.university_id;

  return true;
end;
$$ language plpgsql;

-- Políticas RLS
-- Universidade vê/insere suas próprias solicitações
create policy if not exists "University manages own payout requests"
  on public.university_payout_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.universities u 
      where u.id = university_payout_requests.university_id and u.user_id = auth.uid()
    )
  );

create policy if not exists "University can insert payout requests"
  on public.university_payout_requests
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.universities u 
      where u.id = university_payout_requests.university_id and u.user_id = auth.uid()
    )
  );

create policy if not exists "University can cancel pending payout"
  on public.university_payout_requests
  for update
  to authenticated
  using (
    status = 'pending' and exists (
      select 1 from public.universities u 
      where u.id = university_payout_requests.university_id and u.user_id = auth.uid()
    )
  )
  with check (
    status in ('pending','cancelled')
  );

-- Admin pode ver e gerenciar tudo (reutiliza função is_admin())
create policy if not exists "Admin can view payout requests"
  on public.university_payout_requests
  for select
  to authenticated
  using (is_admin());

create policy if not exists "Admin can update payout requests"
  on public.university_payout_requests
  for update
  to authenticated
  using (is_admin())
  with check (true);

-- Invoices: universidade vê somente as suas; admin vê todas
create policy if not exists "University views own payout invoices"
  on public.payout_invoices
  for select
  to authenticated
  using (
    exists (
      select 1 from public.university_payout_requests r
      join public.universities u on u.id = r.university_id
      where r.id = payout_invoices.payout_request_id and u.user_id = auth.uid()
    )
  );

create policy if not exists "Admin views payout invoices"
  on public.payout_invoices
  for select
  to authenticated
  using (is_admin());

-- Aviso
do $$ begin raise notice 'University payouts schema created.'; end $$;
