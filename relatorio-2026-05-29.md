# Relatório de Atividades — 29/05/2026

## Resumo do Dia

Trabalho focado em 3 frentes: **document requests** (fix-fee), **merge de branches** (tasks-admin), **correção de duplicatas no Financial Analytics** (fix-fee), e **investigação de dados de aluna** (Amanda Sandoval via Supabase MCP).

---

## Branch: fix-fee (5 commits + 4 PRs mergeadas)

### Commit 1: `ad8d89cb` — 16:08
**feat: standardize document request upload flow, scholarship-level filtering, and selected_application_id support**

10 arquivos modificados (+439 / -246):

- **DocumentRequestsCard.tsx** — Unificou o fluxo de upload individual para usar o mesmo staging+submit dos global requests
- **UniversityDocumentsStep.tsx** — Filtro de global document requests por `applicable_scholarship_levels` do aluno + troca de `alert()` por `toast`
- **TransferFormSection.tsx** — Transfer form só aparece quando admin enviou o template; seção "Student Uploads" movida para fora do bloco condicional
- **GlobalDocumentRequestsSection.tsx** — Null safety fixes no `groupUploadsBySubmission`
- **PendingGlobalDocumentsOverview.tsx** — Melhorias na visualização de documentos pendentes
- **useDocumentRequests.ts / useStudentDetails.ts / useStudentDetailsQueries.ts** — Priorização de `selected_application_id` para document requests individuais
- **documentUploadUtils.ts** — Ajustes no fluxo de upload

**PR #691** mergeada para main via PR #691 (16:11)

---

### Commit 2: `dce00a26` — 17:33
**tasks feitas**

4 arquivos modificados (+234 / -301):

- **MyApplications.tsx** — Refatoração do componente de aplicações do aluno
- **UniversityDocumentsStep.tsx** — Filtro para ocultar global document requests de alunos não aprovados (status != `approved`/`enrolled`)
- **applicationStore.ts** — Remoção da notificação prematura de "Confirmação de interesse do aluno" no `addToCart` (universidade recebia notificação quando aluno apenas adicionava bolsa ao carrinho)

**PRs #692 e #693** mergeadas para main (17:33)

---

### Commit 3: `b79075b5` — 20:09
**fix: prevent duplicate payment records in Financial Analytics for students with multiple applications**

1 arquivo modificado (+5):

- **transformFinancialData.ts** — Adicionado guard check no `globalFeesProcessed` dentro de `processApplications`. O problema: alunos com múltiplas scholarship_applications (ex: Fabiano Landim com **87 apps**) geravam registros duplicados/triplicados para cada taxa paga. O guard verifica se aquele fee type já foi processado para o aluno antes de criar novo record.

**Resultado:** Transações caíram de ~437 para ~286 (eliminação de ~151 duplicatas)

**PR #694** mergeada para main (20:10)

---

### Commit 4: `e564060b` — 20:57
**feat: add "All" pagination option to Financial Transactions table**

1 arquivo modificado (+2 / -1):

- **FinancialTransactionsTable.tsx** — Adicionado `<option value={9999}>All</option>` no dropdown de paginação + guard para não gerar linhas vazias quando "All" está selecionado (`itemsPerPage <= 100`)

**PR #695** mergeada para main (20:59)

---

## Branch: tasks-admin (1 merge commit + stash)

### Commit: `926dba0f` — 19:27
**Merge branch 'main' into tasks-admin**

- Resolveu conflitos de merge mantendo o Auth.tsx da main (versão estável)
- Auth.tsx da tasks-admin tinha um bloco `finalDependents` + mudanças de formatação que causavam problemas; revertido para versão da main onde "tudo funciona perfeitamente"

### Stash criado: `stash@{0}` — 20:07
- Mudanças em andamento na tasks-admin foram stashadas para que o fix de Financial Analytics fosse feito na branch fix-fee (que vai direto para main)

---

## Investigação via Supabase MCP: Amanda Sandoval

### Problema identificado
Aluna tinha dados inconsistentes de installment plan e pagamentos duplicados no Financial Analytics.

### Ações realizadas no banco:

1. **Corrigido `fee_installment_plans`:**
   - `installments_paid`: 2 → **1** (estava double-counted por race condition entre Stripe webhook e admin frontend)
   - `amount_paid`: $976.74 → **$488.37** (valor real de 1 parcela)

2. **Corrigido `user_profiles.placement_fee_pending_balance`:**
   - $473.26 → **$961.63** ($1450 total - $488.37 pago = $961.63 pendente)

### Race condition identificada (não corrigida ainda):
- Stripe webhook (`stripe-webhook/index.ts:1420` → `recordInstallmentPayment()`) E admin frontend (`AdminStudentDetails.refactored.tsx:1784`) **ambos incrementam** `installments_paid`
- Quando admin confirma pagamento que já foi processado pelo webhook, duplica a contagem

### Installment plan com `created_by = NULL`:
- Plano de 3x criado sem registro de quem criou (sem audit trail)
- Provavelmente criado por admin com `user?.id` undefined no momento da criação

---

## Análise de Duplicatas — Financial Analytics

### Root cause
`processApplications()` em `transformFinancialData.ts` iterava sobre TODAS as `scholarship_applications` de cada aluno e criava payment records para cada uma. O `globalFeesProcessed` era escrito mas **nunca lido como filtro**.

### Fix aplicado
Adicionado check no início do loop:
```typescript
const globalKey = cfg.key === "application" ? "application_fee" : ...;
if ((globalFeesProcessed[student.user_id] as any)?.[globalKey]) return;
```

### Validação pós-fix via DB
- As 3 etapas de processamento são mutuamente exclusivas (Apps → Zelle → Stripe)
- `globalFeesProcessed` impede reprocessamento para alunos com múltiplas apps
- Únicas "duplicatas" legítimas são parcelas (installments) de placement fee

### Maiores causadores de duplicatas:
| Aluno | Applications | Duplicatas geradas |
|-------|-------------|-------------------|
| Fabiano Landim Soares | 87 | ~340+ |
| Igor Gomes Evaristo | 5 | ~16 |
| Nataly Perini | 4 | ~12 |
| + vários com 4 apps | 4 cada | ~12 cada |

---

## PRs Mergeadas Hoje

| PR | Título | Branch | Hora |
|----|--------|--------|------|
| #691 | Document request standardization | fix-fee → main | 16:11 |
| #692 | Tasks feitas (notificação + filtro) | fix-fee → main | 17:33 |
| #693 | (merge) | fix-fee → main | 17:33 |
| #694 | Fix duplicate payment records | fix-fee → main | 20:10 |
| #695 | Add "All" pagination option | fix-fee → main | 20:59 |

---

## Pendências para próximos dias

1. **Race condition de installment** — Stripe webhook + admin frontend ambos incrementam `installments_paid`
2. **Audit trail de installment plans** — Planos com `created_by = NULL`
3. **tasks-admin** — Stash pendente (`stash@{0}`), build-breaking bug em `FinancialOverview.tsx`, rota `/agency/login` faltando, checklist de refatoração de agency
4. **Zelle gap no Financial Analytics** — Alunos com Zelle payment + flags extras em `user_profiles` que não estão no Zelle são ignorados pelo `processStripeUsers` (comportamento pré-existente)
