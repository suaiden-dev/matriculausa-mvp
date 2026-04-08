# Fix: Supabase Staging Branch — Missing Base Schema

## Contexto

O projeto Matricula USA usa Supabase Branching para staging. A branch `seller-dashboard`
roda todas as migrations do zero em um banco vazio. O problema é que as tabelas principais
(`scholarships`, `user_profiles`, `universities`, etc.) foram criadas diretamente no
Supabase Dashboard — sem migration — e por isso **não existem** no banco de staging.

Erro atual nos logs:
```
Applying migration 20250121000000_add_is_highlighted_to_scholarships.sql...
ERROR: relation "scholarships" does not exist (SQLSTATE 42P01)
```

---

## O que você precisa fazer

Criar um arquivo de migration baseline que capture o schema completo do banco de produção
**antes** das migrations existentes.

---

## Passo a Passo

### Passo 1 — Conectar ao projeto de PRODUÇÃO

O projeto de produção (main) tem a referência: **`fitpynguasqqutuhzifx`**

Use o MCP do Supabase para conectar a este projeto.

---

### Passo 2 — Fazer dump do schema atual

Execute o seguinte SQL no banco de produção para listar todas as tabelas públicas existentes
(para confirmar o que precisa ser capturado):

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

---

### Passo 3 — Criar a migration baseline

Crie o arquivo:

**Caminho:** `supabase/migrations/20230101000000_initial_schema.sql`

> ⚠️ O timestamp `20230101000000` é proposital — deve ser o **mais antigo** de todos
> para garantir que rode ANTES de qualquer outra migration existente.
> A migration mais antiga atual é `20240917000001`, então qualquer data antes de 2024 serve.

O conteúdo deste arquivo deve ser o dump do schema público de produção, gerado via:

```bash
# Se tiver acesso ao CLI do Supabase conectado ao projeto de produção:
supabase db dump --linked --schema public -f supabase/migrations/20230101000000_initial_schema.sql
```

**OU**, se estiver usando apenas o MCP, monte o SQL manualmente consultando:

```sql
-- Obter DDL de todas as tabelas
SELECT 
  'CREATE TABLE IF NOT EXISTS ' || table_name || ' (...);' 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

E use a ferramenta de introspection do MCP para gerar os `CREATE TABLE` de cada tabela.

---

### Passo 4 — O arquivo deve conter (no mínimo)

As seguintes tabelas **precisam** existir antes das migrations incrementais:

| Tabela | Motivo |
|--------|--------|
| `scholarships` | Referenciada em `20250121000000_add_is_highlighted_to_scholarships.sql` |
| `universities` | Provavelmente referenciada por `scholarships` (FK) |
| `user_profiles` | Referenciada em quase todas as migrations |
| `scholarship_applications` | Referenciada em migrations de pagamento |
| `individual_fee_payments` | Referenciada em RPCs |
| `student_documents` | Referenciada em migrations de documentos |
| `document_requests` | Referenciada em migrations |
| `admin_notifications` | Usada pelas Edge Functions da Migma |
| `student_notifications` | Usada pelas Edge Functions da Migma |
| `affiliate_admins` | Referenciada em migrations de afiliados |
| `seller_students` | Referenciada em migrations |
| `legal_documents` | Referenciada em `20250122000100` |

Além das tabelas, o dump deve incluir:
- Tipos enumerados (`CREATE TYPE`) se houver
- Funções (`CREATE OR REPLACE FUNCTION`) que as migrations posteriores dependem
- Triggers base
- Políticas RLS base

---

### Passo 5 — Garantir idempotência

O arquivo deve usar `CREATE TABLE IF NOT EXISTS` (não `CREATE TABLE`) para que, caso
rode no banco de produção que já tem as tabelas, não dê erro.

Da mesma forma, usar `CREATE OR REPLACE FUNCTION` para funções.

Exemplo de cabeçalho seguro:
```sql
-- Migration: Initial Schema Baseline
-- Criada em: 2026-04-08
-- Motivo: Capturar schema base para funcionar com Supabase Branching (staging)
-- Todas as declarações usam IF NOT EXISTS para ser segura em produção

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
```

---

### Passo 6 — Commit e push para a branch correta

Após criar o arquivo, faça commit na branch `developers-paulo` e depois
mescle/push para a branch `seller-dashboard` no Git:

```bash
git add supabase/migrations/20230101000000_initial_schema.sql
git commit -m "fix: add initial schema baseline migration for Supabase staging branch"
git push origin developers-paulo

# Depois mesclar developers-paulo → seller-dashboard (ou fazer push direto)
git checkout seller-dashboard
git merge developers-paulo
git push origin seller-dashboard
```

O push para `seller-dashboard` vai triggerar automaticamente o workflow de staging
do Supabase, que vai rodar todas as migrations novamente do zero.

---

### Passo 7 — Validar nos logs

Após o push, verificar nos logs do Supabase Branching que todas as migrations
passaram sem erro, na ordem:

```
Applying migration 20230101000000_initial_schema.sql...       ✅
Applying migration 20240917000001_create_email_management_tables.sql... ✅
Applying migration 20250121000000_add_is_highlighted_to_scholarships.sql... ✅
...
```

---

## Referências

- Projeto de produção (main): `fitpynguasqqutuhzifx`
- Projeto de staging: `slmojcqxgdzvspiiojwc`
- Branch Git que aciona o staging: `seller-dashboard`
- Pasta de migrations: `supabase/migrations/`
- Migration mais antiga atual: `20240917000001_create_email_management_tables.sql`
- Nova migration a criar: `20230101000000_initial_schema.sql`
