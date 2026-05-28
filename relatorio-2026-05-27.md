# Relatório de Alterações — 27/05/2026

---

## 1. Renomear "Direct" → "MatriculaUSA" no filtro Source

**Arquivo:** `project/src/components/AdminDashboard/StudentApplicationsView.tsx` (linha ~1060)

**O que foi feito:** O label da opção `value="direct"` no dropdown de filtro de Source foi renomeado de "Direct" para "MatriculaUSA". A lógica de filtragem (`sourceFilter === 'direct'`) permanece inalterada.

---

## 2. Amanda Sandoval — Bolsa "Doctor of Business Administration Scholarship"

**Via MCP Supabase (DB direto)**

**O que foi feito:**
- A bolsa havia sido rejeitada com a mensagem "student is ineligible" em sessão anterior.
- Atualizado `scholarship_applications.status` de `rejected` → `approved` (id: `22196478-61d5-4ffa-ad7b-bb6d7603fd43`), notes zerado.
- Atualizado `user_profiles.selected_scholarship_id` para o id da bolsa (`4c97b92d-e8ec-4b03-9fb9-43d57321f403`), indicando que Amanda selecionou essa bolsa.

---

## 3. Investigação e limpeza de pagamentos duplicados — Izabella Jadjesky

### Contexto
O Payment Management exibia pagamentos duplicados/triplicados/quadruplicados para Izabella (`izabellajad@gmail.com`, `user_id: 00261224-6090-48a9-9bf5-dd5b84217255`):
- Application Fee: 4 linhas de $350 (Installment 1/4 a 4/4)
- Selection Process Fee: 4 linhas de $400 (Installment 1/4 a 4/4)
- Placement Fee: 3 linhas ($2.200 + $1.100 + $1.076,07) (Installment 1/3 a 3/3)

### Causa raiz
A função `createPaymentRecordsForFee` em `transformPayments.ts` exibe todos os registros de `individual_fee_payments` de um mesmo tipo como "installments". Havia múltiplos registros por tipo no banco (cada um com `parcelow_order_id` diferente), criados por sessões de checkout repetidas sem verificação de idempotência.

### Limpeza no banco (MCP Supabase)

**Application Fee** — mantido apenas o primeiro registro (11/05, order 583171):
- Deletados: `e6c19a26`, `31fa9ac8`, `31756f56`

**Selection Process Fee** — mantido apenas o primeiro registro (04/05, order 581173):
- Deletados: `c927ed9d`, `350a65f0`, `7d80964b`

**Placement Fee** — Izabella pagou apenas 1 parcela de $1.100 via Stripe:
- Deletados: `51357394` ($2.200 Parcelow) e `67c15c94` ($1.100 Parcelow) — ambos incorretos
- Mantido: `58323a3b` (Stripe) — valor corrigido de $1.076,07 → $1.100,00
- `installment_plan_id` do registro anterior (`a1268c03`) foi nulificado e o plano deletado
- Criado novo `fee_installment_plans` (id: `0c7ad8cc`): placement_fee, 2 parcelas, 1 paga ($1.100), status `active`
- Registro `58323a3b` linkado ao novo plano

### Estado final da Izabella
| Taxa | Valor | Método | Parcela |
|---|---|---|---|
| Selection Process Fee | $400,00 | Parcelow | 1 linha |
| Application Fee | $350,00 | Parcelow | 1 linha |
| Placement Fee | $1.100,00 | Stripe | Installment (1/2) |

---

## 4. Fix no transformPayments — installment label com 1 parcela paga de N

**Arquivo:** `project/src/pages/AdminDashboard/PaymentManagement/utils/transformPayments.ts` (bloco Placement Fee, ~linha 395)

**Problema:** Quando havia apenas 1 registro em `individual_fee_payments` para placement, o código entrava no path "single payment" e não exibia o label de installment — mesmo que o `fee_installment_plans` indicasse `total_installments > 1`.

**Fix:** A condição foi alterada de:
```ts
if (installmentRows.length > 1) {
```
para:
```ts
const planTotal = placementInstallmentPlans?.get(student.user_id) ?? installmentRows.length;
if (installmentRows.length > 1 || (installmentRows.length === 1 && planTotal > 1)) {
```

Agora, mesmo com 1 parcela paga, se o plano tiver `total_installments = 2`, o registro aparece como **Installment (1/2)**.

---

---

# Relatório de Sessão — Fluxo Zelle Migma (2026-05-27)

## Contexto

Continuação da sessão anterior (`feat/sync-trigger-matricula`). O branch foi revertido para `main` na sessão anterior. Foco: investigar e corrigir o fluxo de aprovação manual de Zelle para alunos Migma que pagam a Application Fee.

---

## 1. Investigação: Por que o pagamento Zelle não marcava como pago

### Problema identificado
Quando um admin do MatriculaUSA aprova manualmente um pagamento Zelle de um aluno Migma, nada acontecia no sistema Migma:
- `institution_applications.is_application_fee_paid` continuava `false`
- `user_profiles.is_application_fee_paid` continuava `false`
- `application_fee_zelle_pending.status` continuava `pending_verification`
- Aluno ficava preso na tela "Comprovante enviado" indefinidamente

### Causa raiz
A função `approveZellePayment` em `PaymentManagement.tsx` chamava `approveZelleFlow` (`zelleOrchestrator.ts`), mas **nenhum callback era feito para a Migma** após a aprovação. A Edge Function `migma-approve-application-fee` nunca era invocada.

---

## 2. Mapeamento do Fluxo Completo

### Como o comprovante chega ao MatriculaUSA

**Arquivo:** `src/pages/StudentOnboarding/components/PaymentStep.tsx` (Migma)

Ao enviar comprovante, o frontend Migma faz duas operações:
1. Insert em `application_fee_zelle_pending` (DB Migma) com `status = 'pending_verification'`
2. POST para `migma-external-zelle-insert` (Edge Function MatriculaUSA) que cria registro em `zelle_payments` com `metadata: { source: 'migma', migma_application_id, migma_profile_id, migma_user_id }`

### Como a aprovação deveria funcionar

```
Admin aprova no MatriculaUSA
  → approveZelleStatusService → zelle_payments.status = 'approved'
  → approveZelleFlow
      → atualiza scholarship_applications / user_profiles no MatriculaUSA
      → detecta metadata.source === 'migma'
      → POST migma-approve-application-fee
          → institution_applications.is_application_fee_paid = true  (Migma)
          → user_profiles.is_application_fee_paid = true             (Migma)
          → application_fee_zelle_pending.status = 'approved'        (Migma)
          → migma-notify → notificação ao aluno
```

---

## 3. Correções Implementadas

### 3.1 Adicionado callback Migma em `zelleOrchestrator.ts`

**Arquivo:** `src/pages/AdminDashboard/PaymentManagement/data/services/zelleOrchestrator.ts` (MatriculaUSA)

**Aprovação** — após computar `adminName`:
```typescript
if (payment.fee_type === "application_fee" && payment.metadata?.source === 'migma') {
  const migmaFunctionsUrl = import.meta.env.VITE_MIGMA_FUNCTIONS_URL;
  const migmaWebhookSecret = import.meta.env.VITE_MIGMA_WEBHOOK_SECRET;
  // POST para migma-approve-application-fee com action: 'approved'
}
```

**Rejeição** — dentro de `rejectZelleFlow`:
```typescript
if (payment.fee_type === "application_fee" && payment.metadata?.source === 'migma') {
  // POST para migma-approve-application-fee com action: 'rejected'
}
```

### 3.2 Adicionado fallback por email no update de `user_profiles`

**Problema:** Alunos Migma podem não ter `auth.users` no MatriculaUSA → `user_id` em `zelle_payments` pode ser NULL → `.eq("user_id", ...)` atualiza 0 rows silenciosamente.

**Fix:**
```typescript
const { data: updatedProfiles } = await supabase
  .from("user_profiles")
  .update({ is_application_fee_paid: true })
  .eq("user_id", payment.user_id)
  .select("id");

// Fallback por email se user_id não encontrou perfil
if ((!updatedProfiles || updatedProfiles.length === 0) && payment.student_email) {
  await supabase
    .from("user_profiles")
    .update({ is_application_fee_paid: true })
    .eq("email", payment.student_email);
}
```

---

## 4. Bug Recorrente — Linter Quebra a Condição

### Problema crítico identificado
O linter reverte sistematicamente a condição correta:

```typescript
// ✅ Correto
if (payment.fee_type === "application_fee" && payment.metadata?.source === 'migma')

// ❌ O linter altera para isso automaticamente
if (payment.fee_type === "application_fee_migma" && payment.metadata?.source === 'migma')
```

Isso faz o bloco nunca executar. O bug aconteceu **3 vezes durante a sessão**.

### Ação necessária
- Verificar se há regra de lint/eslint/prettier fazendo essa substituição
- Ou adicionar comentário `// eslint-disable-next-line` na linha da condição
- **Antes de cada teste, confirmar manualmente que a condição está `"application_fee"` e não `"application_fee_migma"`**

---

## 5. Documentação Criada

### `docs/zelle-application-fee-migma-flow.md`
Documentação completa da arquitetura do fluxo Zelle para alunos Migma, incluindo diagrama ASCII, tabela de variáveis de ambiente e tabela de bugs identificados.

---

## 6. Queries SQL Utilizadas na Sessão

### Timer bypass (pular 24h de análise)
```sql
UPDATE institution_applications
SET selection_survey_completed_at = now() - INTERVAL '25 hours'
WHERE profile_id = (SELECT id FROM user_profiles WHERE email = 'napoleon5875@uorak.com');
```

### Marcar Placement Fee como paga
```sql
UPDATE institution_applications SET status = 'payment_confirmed'
WHERE profile_id = (SELECT id FROM user_profiles WHERE email = 'napoleon5875@uorak.com');

UPDATE user_profiles SET is_placement_fee_paid = true
WHERE email = 'napoleon5875@uorak.com';
```

### Reset completo para reteste de Application Fee Zelle
```sql
-- Migma DB
DELETE FROM application_fee_zelle_pending
WHERE profile_id = (SELECT id FROM user_profiles WHERE email = 'napoleon5875@uorak.com');

UPDATE user_profiles SET is_application_fee_paid = false WHERE email = 'napoleon5875@uorak.com';
UPDATE institution_applications SET is_application_fee_paid = false, application_fee_payment_method = NULL
WHERE profile_id = (SELECT id FROM user_profiles WHERE email = 'napoleon5875@uorak.com');

-- MatriculaUSA DB
DELETE FROM zelle_payments
WHERE fee_type = 'application_fee'
  AND status IN ('pending_verification', 'approved')
  AND metadata->>'migma_student_email' = 'napoleon5875@uorak.com';
```

---

## 7. Estado ao Final da Sessão

| Item | Status |
|---|---|
| Callback Migma adicionado em `zelleOrchestrator.ts` | ✅ Implementado |
| Fallback por email no update de `user_profiles` | ✅ Implementado |
| Linter revertendo condição para `application_fee_migma` | ⚠️ Bug recorrente, não resolvido |
| Teste end-to-end funcionando | ❌ Não confirmado — linter interfere antes do teste |
| `migma-external-zelle-insert` versionado no repo | ❌ Só existe deployado no Supabase |

## 8. Próximos Passos

1. Investigar o linter — descobrir qual regra muda `"application_fee"` para `"application_fee_migma"`
2. Trazer `migma-external-zelle-insert` para o repo
3. Teste end-to-end com napoleon5875@uorak.com após garantir que o linter não interferiu
4. Verificar logs no browser ao aprovar — confirmar `✅ [zelleOrchestrator] Migma callback enviado com sucesso`

---

## Arquivos Modificados

| Arquivo | Projeto | Modificação |
|---|---|---|
| `src/pages/AdminDashboard/PaymentManagement/data/services/zelleOrchestrator.ts` | MatriculaUSA | Callback Migma (approve + reject) + fallback email |
| `docs/zelle-application-fee-migma-flow.md` | Migma | Documentação criada |

---

---

# Relatório de Atividades — Sistema Autenticador / Limpeza de Dados (2026-05-27)

## 1. Investigação e Fix — Payment Status "N/A" para Documentos do Autenticador

**Componente:** `src/pages/AdminDashboard/DocumentsTable.tsx`

### Problema
Documentos enviados pelo autenticador (Luiz Eduardo) apareciam com `payment_status = N/A` após commit `0677b74` que mudou `|| 'completed'` para `|| null`.

### Fix
Adicionada detecção de `isAuthenticator`:
```typescript
payment_status: paymentInfo?.status || (isAuthenticator ? 'authenticator_service' : null),
```
Badge renderiza como **Paid** (verde) para `authenticator_service`.

---

## 2. Investigação — Documentos "completed" sem Authenticator (Maria)

2 documentos da Maria tinham `status = completed` com `authenticated_by = null` e `authentication_date = created_at` — inseridos diretamente como completed pelo n8n, nunca passaram pelo fluxo de autenticação.

---

## 3. Limpeza de Dados — Maria (maria.carvalho15@icloud.com)

**Pagamento duplicado:** Deletado `bcc42658` — comprovante Zelle submetido duas vezes em 97ms de diferença.

**Registros duplicados em `documents_to_be_verified`:**
- Deletado `6ce815cc` — `tempimageavxqdn_KTVOYS.jpg` completed/sem auth
- Deletado `d603c4c9` — `comprovante_endereco_PPJVQB.pdf` sem `original_document_id`
- Revertido `tempimage3snaud_12ML7G.jpg` de `completed` → `pending`

**Estado final da Maria:**
| Documento | Status |
|---|---|
| `tempimageavxqdn_KTVOYS.jpg` | pending — aguardando autenticador |
| `tempimage3snaud_12ML7G.jpg` | pending — aguardando autenticador |
| `comprovante_endereco_PPJVQB.pdf` | completed ✅ |
| `tempimage71w2rg_J6YXEJ.jpg` | completed ✅ |

---

## 4. Limpeza — Gustavo Sales De Barros (gustavosalesbarros2001@gmail.com)

Deletados em cascata: 9 documentos + registros relacionados em `payments`, `documents_to_be_verified`, `translated_documents`, `action_logs`.

---

## 5. Limpeza — Documentos term_acceptance e Amanda Historico

**Deletados de `documents_to_be_verified`:**
- `term_acceptance_daniel_costa_e_silva_2026_05_14_Y11GUF.pdf`
- `term_acceptance_elarbi2470_uorak_com_2026_05_14_OPA27W.pdf`
- `term_acceptance_elarbi2470_uorak_com_2026_05_14_FH0OFV.pdf`

**Deletados (Amanda Historico — GuilhermeReis):**
- `dbe8a9c2` da tabela `documents`
- `598dcab9`, `f1e17fa0`, `d612d3c6` da tabela `documents_to_be_verified`

---

## 6. Fix — Document Viewer Modal no Dashboard do Aluno

**Componentes:** `src/pages/CustomerDashboard/DocumentDetailsModal.tsx` e `src/components/DocumentViewerModal.tsx`

### Problema
Modal ficava em loading infinito para JPGs. O n8n gera PDFs mas salva o filename original (`.jpg`). A função `getViewFilename` extraía extensão do blob URL (sem extensão) → resultado `.blob` → `DocumentViewerModal` não reconhecia → renderizava `null`.

### Fix
1. `getViewFilename` usa a URL **original** (antes do `getValidFileUrl`) para extrair extensão real
2. `DocumentViewerModal` ganhou fallback `<iframe>` para tipos desconhecidos

---

## 7. Fix — LanguageSelector removido do AdminLayout

`src/components/AdminLayout.tsx` — import e uso do `LanguageSelector` comentados (sem internacionalização implementada).

---

## 8. Fix — QuickActions no Dashboard do Aluno

`src/pages/CustomerDashboard/QuickActions.tsx`:
- Removido item "Contact Support" (sem funcionalidade implementada)
- Layout alterado de grid 2 colunas para lista vertical (3 itens)

---

## 9. Limpeza — Contatos de Teste (Antônio Cruz Gomes)

Deletados 4 registros da tabela `contacts` de `antoniocruzgomes880@gmail.com`, `antoniocruzgomes880@hotmail.com` e `antoniocruzgomes940@gmail.com`.

---

## 10. Limpeza — Saque de Afiliado de Teste (Gilson Felipe)

Deletado `65f52e95` da tabela `affiliate_withdrawal_requests` ($1.00, Zelle, completed).

> **Nota:** O primeiro DELETE falhou pois usou `profiles.id` — a tabela usa `affiliates.id`.

---

## 11. Investigação — Documentos da Melissa Escobar

3 documentos com `status = processing` e sem registro em `documents_to_be_verified`. Sem `action_logs`. O n8n nunca foi acionado — provável causa: filename com prefixo de pasta impediu o webhook. **Pendente:** Luiz Eduardo precisa refazer o upload.

---

## 12. Análise — Sistema de Detecção de Ambiente Stripe

**Arquivos:** `supabase/functions/shared/environment-detector.ts` e `stripe-env-mapper.ts`

Detecta **produção** se origin contém `lushamerica.com`, `thefutureofenglish.com` ou `tfoe-mvp.netlify.app`. Detecta **test** em qualquer outro caso.

| Ambiente | Secret Key | Webhook Secret |
|---|---|---|
| Produção | `STRIPE_SECRET_KEY_PROD` | `STRIPE_WEBHOOK_SECRET_PROD` |
| Test | `STRIPE_SECRET_KEY_TEST` | `STRIPE_WEBHOOK_SECRET_TEST` |

**Problema:** `.env` só tem `STRIPE_SECRET_KEY = sk_live_...` sem `STRIPE_SECRET_KEY_TEST`. Em localhost o sistema usa `isTest = true` mas não encontra a chave → Stripe falha. **Pendente:** configurar `sk_test_...` para desenvolvimento local.

---

## 13. Limpeza — Documentos de Teste 70EZHZ

Deletados em cascata: `5aa8c098`, `8d2564d9`, `5beb2715` da tabela `documents` + `f6ac0670`, `5ba3df51` de `documents_to_be_verified`.

---

## Arquivos Modificados

| Arquivo | Modificação |
|---|---|
| `src/components/AdminLayout.tsx` | LanguageSelector removido |
| `src/components/DocumentViewerModal.tsx` | Fallback iframe para tipos desconhecidos |
| `src/pages/AdminDashboard/DocumentsTable.tsx` | Badge authenticator_service |
| `src/pages/CustomerDashboard/DocumentDetailsModal.tsx` | Fix extensão de arquivo |
| `src/pages/CustomerDashboard/QuickActions.tsx` | Removido Contact Support |
