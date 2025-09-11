-- Affiliate Payment Requests table
create table if not exists public.affiliate_payment_requests (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  amount_usd numeric(10,2) not null check (amount_usd > 0),
  payout_method text not null check (payout_method in ('zelle','bank_transfer','stripe')),
  payout_details jsonb,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected','cancelled')),
  admin_notes text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_by uuid references auth.users(id),
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz default now()
);

alter table public.affiliate_payment_requests enable row level security;

-- Policies
create policy "affiliates can view their own requests" on public.affiliate_payment_requests
  for select to authenticated
  using (auth.uid() = referrer_user_id);

create policy "affiliates can insert their own requests" on public.affiliate_payment_requests
  for insert to authenticated
  with check (auth.uid() = referrer_user_id);

create policy "affiliates can cancel their pending requests" on public.affiliate_payment_requests
  for update to authenticated
  using (auth.uid() = referrer_user_id and status = 'pending')
  with check (auth.uid() = referrer_user_id);

-- Helpful indexes
create index if not exists idx_aff_payreq_referrer on public.affiliate_payment_requests(referrer_user_id);
create index if not exists idx_aff_payreq_status on public.affiliate_payment_requests(status);
create index if not exists idx_aff_payreq_created_at on public.affiliate_payment_requests(created_at);


