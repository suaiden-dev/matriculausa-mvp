# Relatório de Desenvolvimento — 26/05/2026

---

## 1. Deploy de Edge Functions

### `stripe-checkout-eb3`
- Deployada via MCP Supabase
- Alteração: `allow_promotion_codes: false` — remove aplicação automática de cupons Stripe para desconto de referral

### `stripe-checkout-selection-process-fee`
- Deployada via CLI pelo usuário
- Alteração: remove aplicação automática de cupons Stripe para desconto de referral no fluxo de Selection Process Fee

---

## 2. Investigação — Desconto $50 Andre Svenson

- Verificado via MCP que o desconto de $50 estava ativo para Andre Svenson (`andresvenson11@gmail.com`)
- Causa: Viviane Souza de Moura é aluna no programa Rewards — desconto legítimo
- **Conclusão:** $50 correto, sem ação necessária

---

## 3. Fix — Tipo de Referral no Admin Dashboard

### Problema
Admin mostrava "Affiliate Program Referral" para Viviane (aluna com código de Rewards), e "Student Referral (Rewards)" para Romeu Chimenti Neto (afiliado com código prefixo MATR).

### Root Cause
- Frontend: `fetchAffiliateProgramReferral` não verificava o role do dono do código
- SQL: `get_admin_student_secondary_data` usava prefixo `^MATR` para identificar Rewards — errado para afiliados com código MATR

### Fixes aplicados

**`AdminStudentDetails.refactored.tsx`**
- `fetchAffiliateProgramReferral` agora verifica `profile?.role === 'student'` — se for aluno, redireciona para `matriculaRewardsInfo` em vez de `affiliateProgramReferral`

**Migration SQL — `fix_admin_student_secondary_data_referral_role_check`**
- Substituído check de prefixo `MATR` por join em `user_profiles` verificando `role = 'student'`
- Corrige tanto a seção de affiliate program quanto a de matricula rewards

---

## 4. Fix — Badge de Installments no PaymentStatusCard

### Problema
Badge "Nx installments" não aparecia para alunos com plano de parcelamento `status = 'completed'`.

### Root Cause
`useEffect` em `AdminStudentDetails` buscava planos com `.eq('status', 'active')` — excluía planos já concluídos.

### Fix
`.in('status', ['active', 'completed'])` — agora busca ambos os status.

**Arquivo:** `AdminStudentDetails.refactored.tsx`

---

## 5. Fix — JSON inválido em `es/dashboard.json`

### Problema
Build Netlify falhando com erro: `invalid JSON syntax` na linha 931 do arquivo `es/dashboard.json`.

### Root Cause
Duas vírgulas consecutivas `},` `},` antes da chave `"details"`.

### Fix
Removida a vírgula extra. Todos os 3 locales (en, es, pt) validados com `JSON.parse`.

---

## 6. Limpeza — Pagamentos duplicados gurjinder728@uorak.com

- Aluno tinha 5 rows em `individual_fee_payments` para 3 parcelas
- Identificadas 2 rows órfãs (sem `installment_plan_id`)
- Deletadas via SQL para corrigir histórico de pagamentos

---

## 7. SQL — Desvincular avigail133@uorak.com do Rewards

Queries fornecidas para remover vínculo de teste entre aluna uorak e Viviane Souza de Moura:

```sql
DELETE FROM used_referral_codes WHERE id = '33f18568-1d64-4fd0-90dd-b3146fad6f72';
DELETE FROM affiliate_referrals WHERE id = '5a87ceb1-1966-4559-85fa-7d1c87c18f6e';
```

---

## 8. Análise e ocultação — Seção "Application Fee Configuration" no Edit Scholarship

### Análise
Seção continha campos duplicados (`application_fee_amount`, `scholarship_fee_amount`) já presentes em "Financial Details", além de `scholarship_type` e `visaassistance` não utilizados em nenhum fluxo ativo de pagamento.

### Ação
Seção inteira comentada em `AdminScholarshipEdit.tsx` — campos preservados em comentário JSX para restauração futura se necessário.

---

## 9. Filtro MIGMA — Student Application Tracking

Adicionado filtro de **Source** no painel de filtros do Application Tracking (kanban + table).

**Opções:** All Sources / MIGMA / Direct

**Arquivo:** `StudentApplicationsView.tsx`
- State `sourceFilter`
- `matchesSource` na lógica de filtro
- Persistência em localStorage
- "Clear All Filters" inclui reset do source

---

## 10. Análise completa da integração MIGMA

Mapeamento bidirecional da integração entre Matricula USA e MIGMA:

| Direção | Trigger | Função |
|---|---|---|
| MIGMA → MatriculaUSA | Admin MIGMA aprova bolsa | `sync-to-matriculausa` |
| MIGMA → MatriculaUSA | Pagamento Parcelow/Zelle | `migma-approve-application-fee` + `parcelow-webhook` |
| MatriculaUSA → MIGMA | Acceptance letter / Transfer form | `receive-matriculausa-letter` |
| MIGMA → MatriculaUSA | Consulta status | `migma-get-student-status` (read-only) |

**Campo identificador:** `source = 'migma'` em todas as tabelas relevantes (`user_profiles`, `scholarship_applications`, `student_documents`, `individual_fee_payments`, etc.)

**Campos extras em `user_profiles`:** `migma_seller_id`, `migma_agent_id`

---

## 11. Ocultar alunos MIGMA sem Application Fee paga

### Regra implementada
Alunos MIGMA com `is_application_fee_paid = false` são ocultados **absolutamente** do Application Tracking — kanban, table, todos os filtros, sem exceção.

**Arquivo:** `StudentApplicationsView.tsx`

```typescript
// Ocultar alunos MIGMA que ainda não pagaram a application fee
if (student.source === 'migma' && !student.is_application_fee_paid) {
  return false;
}
```

**Motivo:** Alunos MIGMA só são trabalho real para o time da Matricula USA após pagamento da application fee. Placement fee e demais taxas são gerenciadas no sistema da MIGMA.

---

## 12. Remover tag de Debt para alunos MIGMA

### Problema
Alunos MIGMA exibiam tag vermelha "Debt: $X" no kanban mesmo sendo taxas gerenciadas pela MIGMA.

### Fix
`StudentCard.tsx` — `totalDebt` retorna `0` imediatamente para `source === 'migma'`.

```typescript
if ((student as any).source === 'migma') return 0;
```

---

---

## 13. feat/sync-trigger-matricula — Mover sync MIGMA para pagamento da Application Fee

### Objetivo
Mover o momento em que o aluno da Migma é inserido no MatriculaUSA, de **aprovação da bolsa** para **pagamento da application fee**.

### Problema resolvido
Alunos aprovados pela MIGMA mas que nunca pagavam criavam "ghost accounts" no MatriculaUSA — contas vazias sem utilidade para o time.

### Decisões de design

| Decisão | Solução |
|---|---|
| **Ghost accounts** | Sync só ocorre no pagamento — sem aprovação sem pagamento |
| **Double insert** | Check de `matricula_user_id` — se já preenchido, skip |
| **Rollback sem redeploy** | Env var `SYNC_ON_PAYMENT` no Supabase Dashboard |
| **Error handling** | Sync falha silenciosamente via `console.warn` — pagamento nunca bloqueado |

### 4 caminhos de pagamento cobertos
- Parcelow single
- Parcelow split
- Stripe
- Zelle

### Novo arquivo
**`supabase/functions/shared/sync-helpers.ts`**
- `ensureSyncedToMatriculaUSA()` — check idempotência + elegibilidade + disparo do sync
- `resolveInstitutionApplicationId()` — resolve ID para path legacy

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/admin/ScholarshipApprovalTab.tsx` | Removido bloco do sync na aprovação (linhas 570-576) |
| `supabase/functions/parcelow-webhook/index.ts` | Sync adicionado em 3 paths (padrão V11, fallback legacy, split) |
| `supabase/functions/matriculausa-stripe-webhook/index.ts` | Sync adicionado antes do `syncApplicationFeeToMatriculaUSA` com re-fetch do profile |
| `supabase/functions/migma-approve-application-fee/index.ts` | Step 1.7 (sync) + Step 2.5 (marcar payment no MatriculaUSA) + `syncApplicationFeeToMatriculaUSA` inline |

### Deploys realizados

```
parcelow-webhook                  --no-verify-jwt  ✅
matriculausa-stripe-webhook       --no-verify-jwt  ✅
migma-approve-application-fee     --no-verify-jwt  ✅
sync-to-matriculausa              --no-verify-jwt  ✅
```

### Bugs encontrados e corrigidos durante testes

**Bug 1 — JWT inválido em chamadas server-to-server**
`supabase.functions.invoke()` dentro de edge function passava JWT malformado.
Fix: substituído por `fetch()` direto com `Authorization: Bearer <service_role_key>`.

**Bug 2 — `sync-to-matriculausa` sem `--no-verify-jwt`**
Function rejeitava chamadas server-to-server com `UNAUTHORIZED_INVALID_JWT_FORMAT`.
Fix: redeploy com `--no-verify-jwt`.

### Rollback

**Imediato (sem redeploy):**
Supabase Dashboard → Settings → Edge Functions → Environment Variables → remover `SYNC_ON_PAYMENT`

**Completo:** git revert dos arquivos modificados + remover env var

### Validação em produção

Aluno `ting7387@uorak.com` — Caroline University
- Pagamento via Stripe: **US$ 350,00** ✅
- Sync disparado no pagamento ✅
- `matricula_user_id` setado no Migma ✅
- `is_application_fee_paid = true` no MatriculaUSA ✅

---

## Arquivos modificados (consolidado)

| Arquivo | Mudança |
|---|---|
| `supabase/functions/stripe-checkout-eb3/index.ts` | Deploy — `allow_promotion_codes: false` |
| `supabase/functions/stripe-checkout-selection-process-fee/index.ts` | Deploy — remove cupom automático |
| `supabase/functions/shared/sync-helpers.ts` | **Novo** — helpers de sync MIGMA reutilizáveis |
| `supabase/functions/parcelow-webhook/index.ts` | Sync no pagamento (3 paths) |
| `supabase/functions/matriculausa-stripe-webhook/index.ts` | Sync no pagamento Stripe |
| `supabase/functions/migma-approve-application-fee/index.ts` | Sync + marcar payment no MatriculaUSA |
| `supabase/functions/sync-to-matriculausa/index.ts` | Redeploy com `--no-verify-jwt` |
| `src/pages/admin/ScholarshipApprovalTab.tsx` | Removido sync da aprovação |
| `src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx` | Fix referral role + installment plan status |
| `src/components/AdminDashboard/StudentDetails/PaymentStatusCard.tsx` | Badge installments para planos completed |
| `src/i18n/locales/es/dashboard.json` | Fix JSON inválido |
| `src/pages/AdminDashboard/AdminScholarshipEdit.tsx` | Seção Application Fee Configuration comentada |
| `src/components/AdminDashboard/StudentApplicationsView.tsx` | Filtro Source (MIGMA) + ocultamento MIGMA sem app fee |
| `src/components/AdminDashboard/StudentCard.tsx` | Remove tag Debt para alunos MIGMA |
| Migration SQL | Fix referral role check (`get_admin_student_secondary_data`) |
