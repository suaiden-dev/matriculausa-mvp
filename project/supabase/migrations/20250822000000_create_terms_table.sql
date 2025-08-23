create table if not exists public.affiliate_terms (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Adiciona permissões RLS (Row Level Security)
alter table public.affiliate_terms enable row level security;

-- Política para permitir apenas administradores de afiliados (affiliate_admin) ver e gerenciar termos
create policy "Enable read access for affiliate admins"
  on public.affiliate_terms
  for select
  using (
    auth.uid() in (
      select user_id from public.users
      where role = 'affiliate_admin'
    )
  );

create policy "Enable insert access for affiliate admins"
  on public.affiliate_terms
  for insert
  with check (
    auth.uid() in (
      select user_id from public.users
      where role = 'affiliate_admin'
    )
  );

create policy "Enable update access for affiliate admins"
  on public.affiliate_terms
  for update
  using (
    auth.uid() in (
      select user_id from public.users
      where role = 'affiliate_admin'
    )
  );

create policy "Enable delete access for affiliate admins"
  on public.affiliate_terms
  for delete
  using (
    auth.uid() in (
      select user_id from public.users
      where role = 'affiliate_admin'
    )
  );
