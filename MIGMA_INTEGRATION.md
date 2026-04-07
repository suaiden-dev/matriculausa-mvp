# Integração Matricula USA ↔ Migma — Documentação Técnica

> **Objetivo:** Permitir que a Migma ofereça a jornada completa do aluno (processo seletivo, pagamentos, documentos) com sua própria marca, enquanto toda a operação de pós-venda (processamento de documentos, contato com universidades, cartas de aceite) continue sendo feita pela equipe do Matricula USA através do admin dashboard existente.

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Princípio de Funcionamento](#2-princípio-de-funcionamento)
3. [Tabelas Compartilhadas vs. Separadas](#3-tabelas-compartilhadas-vs-separadas)
4. [Step 1 — Adicionar coluna `source` nas tabelas principais](#step-1--adicionar-coluna-source-nas-tabelas-principais)
5. [Step 2 — Criar Role JWT para a Migma](#step-2--criar-role-jwt-para-a-migma)
6. [Step 3 — Criar RLS Policies](#step-3--criar-rls-policies)
7. [Step 4 — Configurar Service Key da Migma](#step-4--configurar-service-key-da-migma)
8. [Step 5 — Edge Functions para Eventos Críticos](#step-5--edge-functions-para-eventos-críticos)
9. [Step 6 — Como a Migma se conecta ao Supabase](#step-6--como-a-migma-se-conecta-ao-supabase)
10. [Step 7 — Ajustes no Admin Dashboard do Matricula USA](#step-7--ajustes-no-admin-dashboard-do-matricula-usa)
11. [Step 8 — Fluxo Completo end-to-end](#step-8--fluxo-completo-end-to-end)
12. [Step 9 — Variáveis de Ambiente](#step-9--variáveis-de-ambiente)
13. [Step 10 — Checklist de Deploy](#step-10--checklist-de-deploy)

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│         MIGMA               │        │       MATRICULA USA           │
│  (front-end white-label)    │        │   (admin dashboard)           │
│                             │        │                               │
│  - Checkout / Pagamentos    │        │  - Aprovação de documentos    │
│  - Processo seletivo        │        │  - Contato com universidades  │
│  - Upload de documentos     │        │  - Upload carta de aceite     │
│  - Escolha de bolsas        │        │  - Aprovação de aplicações    │
│  - CRM de vendedores        │        │  - Gestão de bolsas           │
└──────────┬──────────────────┘        └──────────────┬───────────────┘
           │                                          │
           │         MESMO SUPABASE                   │
           └──────────────┬───────────────────────────┘
                          │
             ┌────────────▼────────────┐
             │   Supabase (Matricula   │
             │        USA)             │
             │                         │
             │  user_profiles          │
             │  scholarship_applic...  │
             │  student_documents      │
             │  individual_fee_pay...  │
             │  document_requests      │
             │  scholarships (R/O)     │
             │  universities (R/O)     │
             │  ...                    │
             └─────────────────────────┘
```

**Decisão arquitetural:** A Migma **não terá um banco separado** para os dados do aluno. Ela se conecta diretamente ao Supabase do Matricula USA usando credenciais restritas + Row Level Security (RLS). Isso elimina sincronização, duplicação de dados e inconsistências.

---

## 2. Princípio de Funcionamento

| Quem | O que faz | Como acessa o banco |
|------|-----------|---------------------|
| **Aluno na Migma** | Cria conta, paga, envia docs, escolhe bolsas | Supabase Client com `MIGMA_ANON_KEY` |
| **Admin Matricula USA** | Aprova docs, contata universidade, envia carta | Supabase Client com `SERVICE_ROLE_KEY` |
| **Admin Migma** | Vê status dos próprios alunos, CRM de vendedores | Supabase Client com `MIGMA_ANON_KEY` |

**Regra de ouro:** O campo `source` em todas as tabelas principais identifica a origem do registro. A RLS garante que cada sistema só veja o que deve ver.

---

## 3. Tabelas Compartilhadas vs. Separadas

### Compartilhadas (Migma lê e escreve, Matricula USA lê e escreve)

| Tabela | O que contém | Acesso Migma | Acesso MatriculaUSA |
|--------|-------------|--------------|---------------------|
| `user_profiles` | Dados do aluno | Cria/lê/atualiza (source='migma') | Lê/atualiza todos |
| `scholarship_applications` | Candidaturas às bolsas | Cria/lê (source='migma') | Lê/aprova/rejeita todos |
| `student_documents` | Documentos enviados pelo aluno | Cria/lê (source='migma') | Lê/aprova/rejeita todos |
| `document_requests` | Documentos solicitados pela uni | Lê (source='migma') | Cria/gerencia todos |
| `document_request_uploads` | Uploads p/ solicitações | Cria (source='migma') | Lê/aprova todos |
| `individual_fee_payments` | Histórico de pagamentos | Cria/lê (source='migma') | Lê todos |
| `admin_student_conversations` | Chat admin ↔ aluno | Lê (source='migma') | Cria/lê todos |
| `admin_student_messages` | Mensagens do chat | Cria/lê (source='migma') | Cria/lê todos |
| `student_notifications` | Notificações pro aluno | Lê (source='migma') | Cria todos |
| `legal_documents` | Contratos gerados | Lê (source='migma') | Cria/lê todos |

### Read-only para a Migma

| Tabela | O que contém |
|--------|-------------|
| `scholarships` | Lista de bolsas disponíveis |
| `universities` | Dados das universidades |
| `scholarship_packages` | Pacotes de taxas |
| `university_fee_configurations` | Configuração de valores |
| `application_terms` | Termos de uso |

### Exclusivas do Matricula USA (Migma não acessa)

| Tabela | Motivo |
|--------|--------|
| `email_configurations` | Configuração interna de email |
| `affiliate_admins` / `sellers` | Sistema de afiliados próprio |
| `stripe_connect_transfers` | Repasses financeiros internos |
| `university_balance_accounts` | Saldo interno das universidades |
| `admin_logs` | Logs internos de administração |
| `ai_agents` / `ai_email_agents` | Agentes de IA internos |

---

## Step 1 — Adicionar coluna `source` nas tabelas principais

Execute no **SQL Editor do Supabase** (Matricula USA):

```sql
-- ============================================================
-- MIGRATION: add_source_column_for_migma_integration
-- ============================================================

-- 1. user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'matriculausa'
    CHECK (source IN ('matriculausa', 'migma')),
  ADD COLUMN IF NOT EXISTS migma_seller_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS migma_agent_id TEXT DEFAULT NULL;

-- Index para queries filtradas por source
CREATE INDEX IF NOT EXISTS idx_user_profiles_source
  ON user_profiles (source);

-- 2. scholarship_applications
ALTER TABLE scholarship_applications
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'matriculausa'
    CHECK (source IN ('matriculausa', 'migma'));

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_source
  ON scholarship_applications (source);

-- 3. student_documents
ALTER TABLE student_documents
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'matriculausa'
    CHECK (source IN ('matriculausa', 'migma'));

-- 4. individual_fee_payments
ALTER TABLE individual_fee_payments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'matriculausa'
    CHECK (source IN ('matriculausa', 'migma'));

-- 5. document_request_uploads
ALTER TABLE document_request_uploads
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'matriculausa'
    CHECK (source IN ('matriculausa', 'migma'));

-- 6. legal_documents
ALTER TABLE legal_documents
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'matriculausa'
    CHECK (source IN ('matriculausa', 'migma'));

-- ============================================================
-- Confirmar
SELECT 'Migration aplicada com sucesso' AS status;
```

---

## Step 2 — Criar Role JWT para a Migma

O Supabase usa claims JWT para identificar quem está fazendo a requisição. Vamos adicionar um claim `app` que identifica se a chamada vem da Migma ou do Matricula USA.

### 2.1 Criar função para adicionar o claim no token

```sql
-- Função que injeta o claim 'app' no JWT ao autenticar
CREATE OR REPLACE FUNCTION auth.add_app_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se o usuário tem o campo source no perfil
  -- e adiciona no raw_app_meta_data para ficar disponível no JWT
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || 
    jsonb_build_object(
      'app', COALESCE(
        (SELECT source FROM user_profiles WHERE user_id = NEW.id LIMIT 1),
        'matriculausa'
      )
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;
```

### 2.2 Criar uma custom claim via hook de autenticação

No **Dashboard Supabase → Authentication → Hooks**, configure o hook `custom_access_token` apontando para uma Edge Function que injeta o claim:

```typescript
// supabase/functions/custom-access-token/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface WebhookPayload {
  user_id: string
  claims: Record<string, unknown>
}

Deno.serve(async (req: Request) => {
  const payload: WebhookPayload = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Busca o source do usuário
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('source, migma_seller_id')
    .eq('user_id', payload.user_id)
    .single()

  // Injeta os claims customizados no JWT
  const claims = {
    ...payload.claims,
    app: profile?.source ?? 'matriculausa',
    migma_seller_id: profile?.migma_seller_id ?? null,
  }

  return Response.json(claims)
})
```

Deploy:
```bash
supabase functions deploy custom-access-token
```

---

## Step 3 — Criar RLS Policies

Execute no **SQL Editor** após o Step 1:

```sql
-- ============================================================
-- RLS POLICIES — user_profiles
-- ============================================================

-- Habilitar RLS (se ainda não estiver)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Migma: só vê alunos com source='migma'
CREATE POLICY "migma_select_own_students"
  ON user_profiles FOR SELECT
  USING (
    source = 'migma'
    AND (auth.jwt() ->> 'app') = 'migma'
  );

-- Migma: só insere alunos com source='migma'
CREATE POLICY "migma_insert_students"
  ON user_profiles FOR INSERT
  WITH CHECK (
    source = 'migma'
    AND (auth.jwt() ->> 'app') = 'migma'
  );

-- Migma: só atualiza os próprios alunos
CREATE POLICY "migma_update_own_students"
  ON user_profiles FOR UPDATE
  USING (
    source = 'migma'
    AND (auth.jwt() ->> 'app') = 'migma'
  );

-- Admin Matricula USA: vê e gerencia todos
CREATE POLICY "admin_full_access_user_profiles"
  ON user_profiles FOR ALL
  USING (
    (auth.jwt() ->> 'app') = 'matriculausa'
    AND (auth.jwt() ->> 'is_admin') = 'true'
  );

-- Aluno: vê apenas o próprio perfil (qualquer app)
CREATE POLICY "student_sees_own_profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "student_updates_own_profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES — scholarship_applications
-- ============================================================

ALTER TABLE scholarship_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migma_select_own_applications"
  ON scholarship_applications FOR SELECT
  USING (
    source = 'migma'
    AND (auth.jwt() ->> 'app') = 'migma'
  );

CREATE POLICY "migma_insert_applications"
  ON scholarship_applications FOR INSERT
  WITH CHECK (
    source = 'migma'
    AND (auth.jwt() ->> 'app') = 'migma'
  );

CREATE POLICY "admin_full_access_applications"
  ON scholarship_applications FOR ALL
  USING (
    (auth.jwt() ->> 'app') = 'matriculausa'
    AND (auth.jwt() ->> 'is_admin') = 'true'
  );

CREATE POLICY "student_sees_own_applications"
  ON scholarship_applications FOR SELECT
  USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES — student_documents
-- ============================================================

ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migma_manage_own_documents"
  ON student_documents FOR ALL
  USING (
    source = 'migma'
    AND (auth.jwt() ->> 'app') = 'migma'
  );

CREATE POLICY "admin_full_access_documents"
  ON student_documents FOR ALL
  USING (
    (auth.jwt() ->> 'app') = 'matriculausa'
    AND (auth.jwt() ->> 'is_admin') = 'true'
  );

CREATE POLICY "student_manages_own_documents"
  ON student_documents FOR ALL
  USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES — scholarships (read-only para Migma)
-- ============================================================

ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migma_read_scholarships"
  ON scholarships FOR SELECT
  USING (
    (auth.jwt() ->> 'app') = 'migma'
    OR (auth.jwt() ->> 'app') = 'matriculausa'
  );

-- Somente admin do MatriculaUSA pode criar/editar bolsas
CREATE POLICY "admin_manage_scholarships"
  ON scholarships FOR ALL
  USING (
    (auth.jwt() ->> 'app') = 'matriculausa'
    AND (auth.jwt() ->> 'is_admin') = 'true'
  );


-- ============================================================
-- RLS POLICIES — individual_fee_payments
-- ============================================================

ALTER TABLE individual_fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migma_select_own_payments"
  ON individual_fee_payments FOR SELECT
  USING (
    source = 'migma'
    AND (auth.jwt() ->> 'app') = 'migma'
  );

CREATE POLICY "migma_insert_payments"
  ON individual_fee_payments FOR INSERT
  WITH CHECK (
    source = 'migma'
    AND (auth.jwt() ->> 'app') = 'migma'
  );

CREATE POLICY "admin_full_access_payments"
  ON individual_fee_payments FOR ALL
  USING (
    (auth.jwt() ->> 'app') = 'matriculausa'
    AND (auth.jwt() ->> 'is_admin') = 'true'
  );

CREATE POLICY "student_sees_own_payments"
  ON individual_fee_payments FOR SELECT
  USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES — document_requests (Migma só lê)
-- ============================================================

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migma_read_own_document_requests"
  ON document_requests FOR SELECT
  USING (
    -- O document_request tem o user_id do aluno
    user_id IN (
      SELECT user_id FROM user_profiles WHERE source = 'migma'
    )
    AND (auth.jwt() ->> 'app') = 'migma'
  );

CREATE POLICY "admin_manage_document_requests"
  ON document_requests FOR ALL
  USING (
    (auth.jwt() ->> 'app') = 'matriculausa'
    AND (auth.jwt() ->> 'is_admin') = 'true'
  );

CREATE POLICY "student_reads_own_document_requests"
  ON document_requests FOR SELECT
  USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES — admin_student_conversations e messages
-- ============================================================

ALTER TABLE admin_student_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_student_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migma_read_own_conversations"
  ON admin_student_conversations FOR SELECT
  USING (
    student_id IN (
      SELECT user_id FROM user_profiles WHERE source = 'migma'
    )
    AND (auth.jwt() ->> 'app') = 'migma'
  );

CREATE POLICY "admin_manage_conversations"
  ON admin_student_conversations FOR ALL
  USING (
    (auth.jwt() ->> 'app') = 'matriculausa'
    AND (auth.jwt() ->> 'is_admin') = 'true'
  );

CREATE POLICY "student_reads_own_conversations"
  ON admin_student_conversations FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "student_sends_messages"
  ON admin_student_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "student_reads_own_messages"
  ON admin_student_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM admin_student_conversations WHERE student_id = auth.uid()
    )
  );


-- ============================================================
-- Confirmar
SELECT 'RLS Policies criadas com sucesso' AS status;
```

---

## Step 4 — Configurar Service Key da Migma

A Migma **não recebe a `service_role` key** do Matricula USA. Em vez disso, usamos a `anon key` pública com JWT + RLS.

### 4.1 No projeto Matricula USA — gerar a chave

A `anon key` já existe no Supabase (Dashboard → Settings → API). Esta é a chave que a Migma vai usar. O controle de acesso é feito **exclusivamente pela RLS + claim `app` no JWT**.

### 4.2 Guardar os segredos de forma segura

**No projeto da Migma (.env):**
```env
# Supabase do Matricula USA (banco compartilhado)
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # anon key do Matricula USA

# Identificador do app (injeta no JWT custom claim)
NEXT_PUBLIC_APP_IDENTIFIER=migma
```

> **Atenção:** A `anon key` é segura de expor no front-end PORQUE a RLS garante que chamadas com o claim `app=migma` só acessam dados da Migma. O aluno da Migma nunca conseguirá ver dados de outro aluno.

---

## Step 5 — Edge Functions para Eventos Críticos

Edge Functions são usadas para operações que precisam de lógica de negócio, service role (permissão total), ou integração com serviços externos.

### 5.1 Criar aluno na Migma + registrar no Matricula USA

```typescript
// supabase/functions/migma-create-student/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface CreateStudentPayload {
  email: string
  full_name: string
  phone: string
  country: string
  migma_seller_id: string
  migma_agent_id?: string
}

Deno.serve(async (req: Request) => {
  // Validar que a requisição vem da Migma
  const migmaKey = req.headers.get('x-migma-api-key')
  if (migmaKey !== Deno.env.get('MIGMA_SECRET_KEY')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateStudentPayload = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Criar conta no auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: body.email,
    email_confirm: true,
    app_metadata: { app: 'migma' },  // claim que entra no JWT
  })

  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 })
  }

  // 2. Criar perfil com source='migma'
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: authUser.user.id,
      email: body.email,
      full_name: body.full_name,
      phone: body.phone,
      country: body.country,
      source: 'migma',                         // ← identifica origem
      migma_seller_id: body.migma_seller_id,   // ← qual vendedor da Migma
      migma_agent_id: body.migma_agent_id,
    })
    .select()
    .single()

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  return Response.json({
    success: true,
    user_id: authUser.user.id,
    profile,
  })
})
```

### 5.2 Notificar Matricula USA quando aluno paga placement fee

```typescript
// supabase/functions/migma-payment-completed/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const migmaKey = req.headers.get('x-migma-api-key')
  if (migmaKey !== Deno.env.get('MIGMA_SECRET_KEY')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user_id, fee_type, amount, payment_intent_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Registrar o pagamento no banco compartilhado
  await supabase.from('individual_fee_payments').insert({
    user_id,
    fee_type,           // 'selection_process' | 'enrollment' | 'placement'
    amount,
    payment_intent_id,
    source: 'migma',
    payment_date: new Date().toISOString(),
  })

  // Atualizar status do aluno no user_profiles
  const updateFields: Record<string, boolean> = {}
  if (fee_type === 'selection_process') updateFields.has_paid_selection_process_fee = true
  if (fee_type === 'enrollment') updateFields.is_application_fee_paid = true
  if (fee_type === 'placement') updateFields.has_paid_college_enrollment_fee = true

  await supabase
    .from('user_profiles')
    .update(updateFields)
    .eq('user_id', user_id)

  // Criar notificação para o admin do Matricula USA
  await supabase.from('admin_notifications').insert({
    title: `[MIGMA] Pagamento recebido — ${fee_type}`,
    message: `Aluno ${user_id} da Migma completou pagamento de ${fee_type} (USD ${amount})`,
    type: 'payment',
    source: 'migma',
  })

  return Response.json({ success: true })
})
```

### 5.3 Buscar status do aluno (Migma consulta progresso)

```typescript
// supabase/functions/migma-get-student-status/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const migmaKey = req.headers.get('x-migma-api-key')
  if (migmaKey !== Deno.env.get('MIGMA_SECRET_KEY')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const user_id = url.searchParams.get('user_id')

  if (!user_id) {
    return Response.json({ error: 'user_id obrigatório' }, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Busca apenas alunos da Migma
  const { data: profile } = await supabase
    .from('user_profiles')
    .select(`
      user_id, full_name, email, status,
      has_paid_selection_process_fee,
      is_application_fee_paid,
      has_paid_college_enrollment_fee,
      has_paid_i20_control_fee,
      documents_status,
      selected_scholarship_id
    `)
    .eq('user_id', user_id)
    .eq('source', 'migma')   // ← garante que é aluno da Migma
    .single()

  if (!profile) {
    return Response.json({ error: 'Aluno não encontrado' }, { status: 404 })
  }

  // Busca aplicações
  const { data: applications } = await supabase
    .from('scholarship_applications')
    .select('id, scholarship_id, status, created_at')
    .eq('user_id', user_id)

  // Busca documentos pendentes
  const { data: pendingDocs } = await supabase
    .from('document_requests')
    .select('id, document_name, status, required')
    .eq('user_id', user_id)
    .neq('status', 'approved')

  return Response.json({
    profile,
    applications,
    pending_documents: pendingDocs,
  })
})
```

### Deploy de todas as Edge Functions

```bash
supabase functions deploy custom-access-token
supabase functions deploy migma-create-student
supabase functions deploy migma-payment-completed
supabase functions deploy migma-get-student-status
```

### Configurar os segredos nas Edge Functions

```bash
# Chave secreta compartilhada entre Migma e Matricula USA
supabase secrets set MIGMA_SECRET_KEY=gere-uma-chave-aleatoria-aqui

# Para verificar:
supabase secrets list
```

---

## Step 6 — Como a Migma se conecta ao Supabase

### 6.1 Configuração do cliente Supabase na Migma

```typescript
// No projeto da Migma: lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,   // URL do Supabase do Matricula USA
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // anon key do Matricula USA
)
```

### 6.2 Autenticação do aluno na Migma

```typescript
// O aluno faz login — o JWT gerado já vai ter o claim app='migma'
// porque o custom-access-token hook injeta isso automaticamente

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'joao@email.com',
  password: '...',
})

// A partir daqui, todas as queries respeitam as RLS policies
// e o aluno SÓ VÊ seus próprios dados com source='migma'
```

### 6.3 Query de bolsas disponíveis (read-only)

```typescript
// Migma lê bolsas diretamente do banco compartilhado
const { data: scholarships } = await supabase
  .from('scholarships')
  .select('id, name, university_id, description, value, deadline')
  .eq('is_active', true)
  .order('created_at', { ascending: false })
```

### 6.4 Submeter aplicação de bolsa

```typescript
// Quando o aluno da Migma seleciona bolsas
async function applyForScholarship(scholarshipId: string, userId: string) {
  const { data, error } = await supabase
    .from('scholarship_applications')
    .insert({
      user_id: userId,
      scholarship_id: scholarshipId,
      source: 'migma',     // ← obrigatório
      status: 'pending',
      applied_at: new Date().toISOString(),
    })

  return { data, error }
}
```

### 6.5 Upload de documento pelo aluno na Migma

```typescript
// Upload para o storage bucket compartilhado
async function uploadDocument(file: File, userId: string, docType: string) {
  const fileName = `migma/${userId}/${docType}_${Date.now()}.${file.name.split('.').pop()}`

  // 1. Upload do arquivo
  const { data: storageData, error: storageError } = await supabase.storage
    .from('student-documents')
    .upload(fileName, file, { upsert: false })

  if (storageError) throw storageError

  // 2. Registrar na tabela student_documents
  const { data, error } = await supabase
    .from('student_documents')
    .insert({
      user_id: userId,
      document_type: docType,
      file_path: storageData.path,
      status: 'pending_review',
      source: 'migma',   // ← obrigatório
      uploaded_at: new Date().toISOString(),
    })

  return { data, error }
}
```

---

## Step 7 — Ajustes no Admin Dashboard do Matricula USA

### 7.1 Filtro de origem na listagem de alunos

Adicionar filtro no admin para visualizar por source:

```typescript
// No admin do Matricula USA — filtrar por origem
async function getStudents(filter?: 'all' | 'matriculausa' | 'migma') {
  let query = supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (filter && filter !== 'all') {
    query = query.eq('source', filter)
  }

  return query
}
```

### 7.2 Badge visual no admin para identificar aluno da Migma

```tsx
// Componente de badge na listagem de alunos
function SourceBadge({ source }: { source: 'matriculausa' | 'migma' }) {
  if (source === 'migma') {
    return (
      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
        Migma
      </span>
    )
  }
  return (
    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
      Matricula USA
    </span>
  )
}
```

### 7.3 Aprovação de documentos (sem mudança de lógica)

O admin do Matricula USA aprova documentos normalmente. A única diferença é que documentos com `source='migma'` são visíveis com o badge. O aluno vê a atualização no site da Migma automaticamente.

```typescript
// Aprovar documento — funciona igual para ambos os sources
async function approveDocument(documentId: string, adminNotes?: string) {
  const { data, error } = await supabase
    .from('student_documents')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes,
    })
    .eq('id', documentId)

  return { data, error }
}
```

### 7.4 Upload de carta de aceite pelo admin

```typescript
// Admin faz upload da carta de aceite para aluno da Migma
async function uploadAcceptanceLetter(
  userId: string,
  file: File
) {
  const fileName = `acceptance-letters/${userId}_${Date.now()}.pdf`

  const { data: storageData } = await supabase.storage
    .from('legal-documents')
    .upload(fileName, file)

  // Registra o documento e notifica o aluno
  await supabase.from('legal_documents').insert({
    user_id: userId,
    document_type: 'acceptance_letter',
    file_path: storageData!.path,
    status: 'available',
    source: 'migma',  // mantém rastreabilidade
  })

  // Cria notificação para o aluno (aparece no site da Migma)
  await supabase.from('student_notifications').insert({
    user_id: userId,
    title: 'Sua carta de aceite está disponível!',
    message: 'Acesse seu portal para visualizar e continuar o processo.',
    type: 'acceptance_letter',
    is_read: false,
  })
}
```

---

## Step 8 — Fluxo Completo end-to-end

```
ALUNO (site da Migma)                  MATRICULA USA ADMIN
─────────────────────                  ──────────────────────────────

1. Cria conta na Migma
   → Edge Fn: migma-create-student
   → user criado no auth com app='migma'
   → user_profiles inserido com source='migma'

2. Paga taxa do processo seletivo ($350)
   → Stripe no front-end da Migma
   → Edge Fn: migma-payment-completed
   → individual_fee_payments inserido (source='migma')
   → user_profiles.has_paid_selection_process_fee = true
                                       ← admin vê notificação "[MIGMA] Pagamento recebido"

3. Envia foto com documento
   → upload no storage 'student-documents'
   → student_documents inserido (source='migma')
                                       ← admin vê o documento na listagem

4. Preenche questionário processo seletivo
   → campos em user_profiles atualizados

5. Escolhe até 4 bolsas
   → scholarship_applications inserido (source='migma', status='pending')
                                       ← admin vê as aplicações
                                       ← admin aprova/rejeita cada bolsa
                                       → scholarship_applications.status = 'approved'/'rejected'

6. Aluno vê resultado (site da Migma)
   → query em scholarship_applications (RLS filtra só os dela)
   → Confirma bolsa aprovada
   → scholarship_applications.is_confirmed = true

7. Paga taxa de matrícula
   → Edge Fn: migma-payment-completed (fee_type='enrollment')
   → user_profiles.is_application_fee_paid = true

8. Paga placement fee
   → Edge Fn: migma-payment-completed (fee_type='placement')
   → user_profiles.has_paid_college_enrollment_fee = true
                                       ← admin vê que aluno está pronto para pós-venda

9. Admin solicita documentos adicionais
   → document_requests inserido (user_id do aluno)
   ← aluno vê solicitação (RLS libera leitura)
   ← aluno faz upload → document_request_uploads inserido
                                       ← admin aprova/rejeita cada documento

10. Admin envia documentos para universidade (fora do sistema, por email/portal)

11. Admin faz upload da carta de aceite
    → legal_documents inserido (source='migma')
    → student_notifications inserido
    ← aluno vê notificação no site da Migma
    ← aluno paga taxa para liberar carta

12. Aluno recebe carta de aceite + I-20
    → legal_documents.status = 'released'
    ← aluno baixa via document-proxy Edge Function (autenticado)
```

---

## Step 9 — Variáveis de Ambiente

### No projeto Matricula USA (`.env`)

```env
# Já existentes — sem mudança
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # nunca exposta no front-end

# Novas — para a integração com Migma
MIGMA_SECRET_KEY=gere-com-openssl-rand-hex-32
```

### No projeto Migma (`.env`)

```env
# Aponta para o Supabase do Matricula USA
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # anon key do Matricula USA

# Chave para chamar as Edge Functions
MIGMA_API_KEY=a-mesma-MIGMA_SECRET_KEY-definida-acima

# Stripe (próprio da Migma ou compartilhado?)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Configurar segredos nas Edge Functions

```bash
# Execute no terminal do projeto Matricula USA
supabase secrets set MIGMA_SECRET_KEY=sua-chave-aqui
```

---

## Step 10 — Checklist de Deploy

### Banco de dados

- [ ] Executar migration do Step 1 (coluna `source`) em produção
- [ ] Verificar que registros existentes têm `source='matriculausa'` (DEFAULT garante isso)
- [ ] Executar RLS policies do Step 3 em produção
- [ ] Confirmar que RLS está habilitada em todas as tabelas listadas

### Edge Functions

- [ ] Deploy da `custom-access-token` e configurar no Dashboard → Auth → Hooks
- [ ] Deploy da `migma-create-student`
- [ ] Deploy da `migma-payment-completed`
- [ ] Deploy da `migma-get-student-status`
- [ ] Configurar `MIGMA_SECRET_KEY` via `supabase secrets set`

### Migma (projeto deles)

- [ ] Configurar `.env` com a URL e anon key do Supabase do Matricula USA
- [ ] Testar criação de aluno via Edge Function
- [ ] Testar upload de documento (storage bucket)
- [ ] Testar query de bolsas disponíveis
- [ ] Confirmar que o JWT do aluno tem o claim `app=migma`
- [ ] Confirmar que aluno da Migma **NÃO CONSEGUE** ver alunos do Matricula USA

### Admin Dashboard (Matricula USA)

- [ ] Adicionar filtro por `source` na listagem de alunos
- [ ] Adicionar badge visual "Migma" / "Matricula USA"
- [ ] Testar aprovação de documentos de aluno da Migma
- [ ] Testar upload de carta de aceite para aluno da Migma
- [ ] Confirmar que notificação chega no site da Migma

### Testes de segurança

- [ ] Aluno da Migma não consegue ver alunos do Matricula USA
- [ ] Aluno da Migma não consegue ver dados de outro aluno da Migma
- [ ] Admin Migma não consegue acessar tabelas restritas (affiliate, stripe_connect, etc.)
- [ ] Chamada sem `x-migma-api-key` retorna 401 nas Edge Functions
- [ ] `source` não pode ser alterado depois de criado (adicionar policy de UPDATE)

---

## Observações Finais

### Sobre pagamentos

Os pagamentos são processados pelo Stripe/Zelle da **Migma** (conta deles). O Matricula USA só precisa saber **que o pagamento foi feito**, não gerencia o dinheiro. Isso é feito via Edge Function `migma-payment-completed` que registra o evento no banco compartilhado.

### Sobre o aluno "não saber" que é Matricula USA

- O aluno acessa o site da Migma
- O Supabase URL fica no `.env` da Migma (não visível ao usuário final)
- Emails e notificações são enviados com branding da Migma
- A única "exposição" possível é via DevTools (Network tab) — aceitável para B2B

### Sobre escalabilidade

Quando surgir um terceiro parceiro (além da Migma), basta:
1. Adicionar `'novo-parceiro'` no `CHECK` da coluna `source`
2. Criar RLS policies para o novo parceiro
3. Gerar uma `NOVO_PARCEIRO_SECRET_KEY` nas Edge Functions

### Sobre WhatsApp (mencionado na reunião)

As notificações via WhatsApp devem ser disparadas **pelas Edge Functions** nos momentos-chave (pagamento confirmado, documento aprovado, carta de aceite disponível). O número de WhatsApp usado deve pertencer à Migma para manter o white-label.

---

*Documento criado em: 2026-04-07*  
*Versão: 1.0*  
*Projeto: Matricula USA MVP — Integração Migma*
