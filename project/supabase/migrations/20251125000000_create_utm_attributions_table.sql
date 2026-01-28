-- Cria tabela dedicada para armazenar atribuições de marketing UTM
-- Especificamente para tracking de links da Brant Immigration
create table if not exists public.utm_attributions (
  -- Chave primária
  id uuid primary key default uuid_generate_v4(),
  
  -- Relacionamento com usuário (pode ser NULL se usuário for deletado)
  user_id uuid references auth.users(id) on delete set null,
  
  -- Email do usuário (redundante mas útil para queries sem JOIN)
  email text,
  
  -- Parâmetros UTM padrão
  utm_source text,      -- Origem (ex: brant, google, facebook)
  utm_medium text,      -- Meio (ex: cpc, email, social, organic)
  utm_campaign text,    -- Campanha (ex: summer_sale, black_friday)
  utm_term text,        -- Termo de busca (opcional)
  utm_content text,     -- Conteúdo específico (opcional)
  
  -- Dados de navegação
  landing_page text,        -- Primeira página visitada com UTM
  last_touch_page text,    -- Última página visitada
  referrer text,           -- URL de referência (document.referrer)
  
  -- Timestamps
  captured_at timestamptz default timezone('utc', now()), -- Quando UTMs foram capturados
  created_at timestamptz default timezone('utc', now())  -- Quando registro foi criado
);

-- Comentário na tabela
comment on table public.utm_attributions is 'Armazena dados de atribuição UTM para tracking de marketing, especialmente para links da Brant Immigration';

-- Comentários nas colunas
comment on column public.utm_attributions.user_id is 'ID do usuário que registrou com este UTM';
comment on column public.utm_attributions.email is 'Email do usuário (redundante para facilitar queries)';
comment on column public.utm_attributions.utm_source is 'Origem do tráfego (ex: brant, google, facebook)';
comment on column public.utm_attributions.utm_medium is 'Meio de marketing (ex: cpc, email, social)';
comment on column public.utm_attributions.utm_campaign is 'Nome da campanha de marketing';
comment on column public.utm_attributions.utm_term is 'Termo de busca pago (opcional)';
comment on column public.utm_attributions.utm_content is 'Variação de conteúdo do anúncio (opcional)';
comment on column public.utm_attributions.landing_page is 'Primeira página visitada com UTMs';
comment on column public.utm_attributions.last_touch_page is 'Última página visitada antes do registro';
comment on column public.utm_attributions.referrer is 'URL de onde o usuário veio (document.referrer)';
comment on column public.utm_attributions.captured_at is 'Quando os parâmetros UTM foram capturados';
comment on column public.utm_attributions.created_at is 'Quando o registro foi criado no banco';

-- Índices para otimizar consultas
create index if not exists utm_attributions_user_id_idx 
  on public.utm_attributions (user_id);

create index if not exists utm_attributions_email_idx 
  on public.utm_attributions (lower(email)); -- Case-insensitive

-- Índices adicionais para análises
create index if not exists utm_attributions_source_medium_idx 
  on public.utm_attributions (utm_source, utm_medium);

create index if not exists utm_attributions_campaign_idx 
  on public.utm_attributions (utm_campaign);

create index if not exists utm_attributions_captured_at_idx 
  on public.utm_attributions (captured_at);

create index if not exists utm_attributions_created_at_idx 
  on public.utm_attributions (created_at);

-- Habilitar Row Level Security (RLS)
alter table public.utm_attributions enable row level security;

-- Políticas RLS: Admins podem ver tudo
create policy "Admins can view all UTM attributions"
  on public.utm_attributions
  for select
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.user_id = auth.uid()
      and user_profiles.role in ('admin', 'affiliate_admin')
    )
  );

-- Políticas RLS: Usuários podem ver suas próprias atribuições
create policy "Users can view their own UTM attributions"
  on public.utm_attributions
  for select
  using (user_id = auth.uid());

-- Políticas RLS: Sistema pode inserir (sem autenticação, para registros)
create policy "System can insert UTM attributions"
  on public.utm_attributions
  for insert
  with check (true);

-- Políticas RLS: Admins podem atualizar
create policy "Admins can update UTM attributions"
  on public.utm_attributions
  for update
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.user_id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

-- Políticas RLS: Admins podem deletar
create policy "Admins can delete UTM attributions"
  on public.utm_attributions
  for delete
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.user_id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

