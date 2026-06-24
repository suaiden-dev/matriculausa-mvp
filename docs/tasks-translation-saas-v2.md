# Tasks — Translation SaaS v2
**Referência:** `docs/spec-translation-saas-v2.md`

---

## FASE 1 — Banco de Dados (Migrations)

> **Verificação feita em 2026-06-17 via MCP Supabase.**
> Colunas marcadas com ✅ já existem no banco — não criar novamente.

### TASK-T01 — `rejection_reason` em `document_request_uploads`
- Coluna `rejection_reason TEXT DEFAULT NULL`
- Valores esperados: `'needs_translation'` | `'wrong_document'` | `'expired'` | `'other'`
- **Status:** `[x] Já existe no banco` ✅

### TASK-T02 — `needs_translation` em `document_request_uploads`
- Coluna `needs_translation BOOLEAN DEFAULT NULL`
- **Status:** `[x] Já existe no banco` ✅

### TASK-T03 — `source` em `document_request_uploads`
- Coluna `source TEXT DEFAULT NULL`
- Valores: `'student_upload'` | `'admin_upload'` | `'translation_resubmit'`
- **Status:** `[x] Concluído` ✅ — migration `20260617000004_translation_saas_v2_columns.sql`

### TASK-T04 — `translation_order_id` em `document_request_uploads`
- Coluna `translation_order_id UUID REFERENCES translation_orders(id)`
- Usada para rastrear qual order gerou o resubmit automático
- **Status:** `[x] Concluído` ✅ — migration `20260617000004_translation_saas_v2_columns.sql`

### TASK-T05 — Novos campos em `translation_orders`
- `upload_id UUID` — ✅ já existia
- `document_request_id UUID` — ✅ já existia
- `payment_status`, `alpha_project_number`, `alpha_project_status`, `translation_status`, `certified_files`, `certified_at` — ✅ todos já existiam
- `document_request_upload_id UUID` — ✅ criado
- `rejection_origin BOOLEAN DEFAULT FALSE` — ✅ criado
- `resubmit_upload_id UUID` — ✅ criado
- `resubmitted_at TIMESTAMPTZ` — ✅ criado
- **Status:** `[x] Concluído` ✅ — migration `20260617000004_translation_saas_v2_columns.sql`

### TASK-T06 — `translation_disclaimer_accepted` em `user_profiles`
- Coluna `translation_disclaimer_accepted BOOLEAN DEFAULT FALSE`
- Salva preferência do aluno de não mostrar o disclaimer novamente
- **Status:** `[x] Concluído` ✅ — migration `20260617000004_translation_saas_v2_columns.sql`

> **Migration aplicada:** `20260617000004_translation_saas_v2_columns.sql` — 7 colunas + 2 índices criados em 2026-06-17.

---

## FASE 2 — Admin: Rejeição com "Precisa de Tradução"

### TASK-T07 — Botão "Precisa de Tradução" em `GlobalDocumentRequestsSection.tsx`
- Arquivo: `project/src/components/AdminDashboard/StudentDetails/GlobalDocumentRequestsSection.tsx`
- Adicionar nova opção de rejeição ao lado do botão "Rejeitar" existente
- Ao clicar: salvar `status = 'rejected'`, `rejection_reason = 'needs_translation'`, `needs_translation = true`
- Visual: botão âmbar separado do botão de rejeição comum
- **Status:** `[x] Concluído` ✅

### TASK-T08 — Botão "Precisa de Tradução" em `DocumentsView.tsx`
- Arquivo: `project/src/components/EnhancedStudentTracking/DocumentsView.tsx`
- Mesma lógica da TASK-T07
- **Status:** `[x] Concluído` ✅

### TASK-T09 — `needs_translation=true` em `useDocumentRequestHandlers.ts`
- Arquivo: `project/src/hooks/useDocumentRequestHandlers.ts`
- Campo `needs_translation: reason === 'needs_translation' ? true : null` adicionado ao UPDATE
- **Status:** `[x] Concluído` ✅

---

## FASE 3 — Aluno: Página de Translations

### TASK-T10 — Banner de documento pendente no topo
- Arquivo: `project/src/pages/StudentDashboard/Translations.tsx`
- Buscar uploads do aluno com `rejection_reason = 'needs_translation'` sem order vinculada
- Exibir card/banner destacado no topo da página com:
  - Nome do arquivo
  - Request de origem
  - Data da rejeição
  - Botão "Contratar Tradução"
- **Status:** `[x] Concluído` ✅

### TASK-T11 — Arquivo pré-carregado (sem novo upload)
- Quando o aluno clica em "Contratar Tradução" vindo do banner:
  - Abrir `TranslationQuoteModal` com o arquivo já carregado do storage
  - Não exibir campo de upload — arquivo já está no Supabase Storage
  - Passar `preloadedFile: { url, name, uploadId }` como prop para o modal
- **Status:** `[x] Concluído` ✅

### TASK-T12 — Vínculo ao upload de origem salvo na order
- Arquivo: `project/src/components/TranslationQuoteModal.tsx`
- `document_request_upload_id` e `rejection_origin` adicionados ao insert
- Passados via props `documentRequestUploadId` e `rejectionOrigin`
- **Status:** `[x] Concluído` ✅

### TASK-T13 — Disclaimer antes do pagamento
- Arquivo: `project/src/components/TranslationQuoteModal.tsx`
- Step interno `'disclaimer'` adicionado ao modal
- Checkbox "Não mostrar novamente" → callback `onDisclaimerAccepted(dontShowAgain)`
- Se `disclaimerAccepted = true` (padrão): pula o step e vai direto para o submit
- **Status:** `[x] Concluído` ✅

### TASK-T14 — Botão "+ Nova Tradução" (fluxo avulso)
- Arquivo: `project/src/pages/StudentDashboard/Translations.tsx`
- Botão no header abre file input → seleciona arquivo → abre `TranslationQuoteModal`
- Modal em standalone mode: exibe file picker interno + faz upload ao confirmar
- **Status:** `[x] Concluído` ✅

### TASK-T15 — i18n para novos textos da página de Translations PT/EN/ES
- Banner de documento pendente
- Disclaimer
- Labels do fluxo avulso (newTranslation, selectFile, noFileSelected)
- **Status:** `[x] Concluído` ✅

---

## FASE 4 — Backend: Resubmit Automático

### TASK-T16 — `sync-alpha-status`: detectar vínculo e executar resubmit
- Arquivo: `supabase/functions/sync-alpha-status/index.ts`
- Query agora inclui `document_request_upload_id`, `document_request_id`, `resubmit_upload_id`, `original_filename`
- Ao detectar `certifiedFiles` disponíveis e `!order.certified_at`:
  - Salva `certified_files`, `certified_at`, `certified_file_url`
  - Se `document_request_upload_id` preenchido e `resubmit_upload_id IS NULL` → chama `performResubmit()`
- **Status:** `[x] Concluído` ✅

### TASK-T17 — Lógica de resubmit automático
- Função `performResubmit()` no `sync-alpha-status`:
  1. Download do `certifiedFiles[0].url` via `fetch()`
  2. Upload para `document-attachments` bucket em `translations/resubmit/{user_id}/`
  3. Insert em `document_request_uploads`: `status='pending'`, `source='translation_resubmit'`, `translation_order_id=order.id`
  4. Atualiza `translation_orders`: `resubmit_upload_id`, `resubmitted_at`
- Guard de idempotência: só executa se `!order.resubmit_upload_id`
- **Status:** `[x] Concluído` ✅

### TASK-T18 — Notificações pós-resubmit
- Função `sendResubmitNotifications()` no `sync-alpha-status`:
  - `student_notifications`: `type='translation_resubmit'`, `link='/student/dashboard/translations'`, `idempotency_key` único
  - `admin_notifications`: `type='translation_resubmit'`, `is_read=false`
- **Status:** `[x] Concluído` ✅

---

## FASE 5 — Admin: Visualização do Estado de Tradução

### TASK-T19 — Badge "Resubmetido" no painel admin
- Arquivos: `GlobalDocumentRequestsSection.tsx` e `DocumentsView.tsx`
- `GlobalDocumentRequestsSection.tsx`: nova função `getSourceBadge(upload)` — se `source = 'translation_resubmit'` → badge esmeralda "Translated & Resubmitted"; chamada em ambos os grupos de uploads
- `DocumentsView.tsx`: badge inline na linha do filename, após o badge "Admin"
- **Status:** `[x] Concluído` ✅

---

## FASE 6 — Testes

### TASK-T20 — Teste: fluxo completo com vínculo
- Admin rejeita documento com "Precisa de Tradução"
- Aluno vê banner na página Translations com arquivo pré-carregado
- Aluno contrata com vínculo ao request
- Simular entrega da Alpha (atualizar `translation_status` manualmente no DB)
- Verificar resubmit automático: novo upload aparece na fila do admin
- Verificar badges corretos em cada estado
- **Status:** `[ ] Pendente`

### TASK-T21 — Teste: fluxo avulso (sem vínculo)
- Aluno abre "+ Nova Tradução" sem vir de rejeição
- Faz upload, paga, acompanha status
- Recebe arquivo para download quando pronto
- Sem resubmit automático
- **Status:** `[ ] Pendente`

### TASK-T22 — Teste: disclaimer
- Primeira vez: disclaimer aparece antes do pagamento
- Marcar "Não mostrar novamente" → campo salvo em `user_profiles`
- Segunda contratação: disclaimer não aparece
- **Status:** `[ ] Pendente`

### TASK-T23 — Teste: i18n PT/EN/ES
- Trocar idioma no dashboard do aluno
- Verificar todos os novos textos (banner, disclaimer, seletor de vínculo, badges)
- **Status:** `[ ] Pendente`

---

## Ordem de Execução Sugerida

```
FASE 1 (T01–T02 já feitos, T03–T06 pendentes) → migration única com 7 colunas novas
FASE 2 (T07–T09) → admin pode rejeitar com o motivo correto
FASE 3 (T10–T15) → aluno vê e contrata na página de Translations
FASE 4 (T16–T18) → resubmit automático quando Alpha entrega
FASE 5 (T19)     → visualização do estado no admin
FASE 6 (T20–T23) → testes end-to-end
```

---

## Dependências Externas

| Dependência | Responsável | Status |
|---|---|---|
| Alpha API — chave de produção configurada | Suaiden / Admin | `[ ]` |
| `ALPHA_API_KEY` em Supabase Vault | Dev | `[ ]` |
| Edge Function `send-to-alpha` funcionando | Dev | `[x]` existe |
| Edge Function `sync-alpha-status` funcionando | Dev | `[x]` existe |
| Sistema de notificações ao aluno | Dev | `[x]` existe |
