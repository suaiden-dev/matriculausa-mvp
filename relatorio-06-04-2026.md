# Relatório de Desenvolvimento — 06/04/2026

## Feature: Placement Fee Installment Flow (Continuação)

---

## Contexto

Alunos com Placement Fee alto (ex: $1.700) precisam pagar em parcelas. O fluxo correto é:

1. Admin habilita parcelamento no Student Details antes do aluno pagar
2. Aluno vê 50% no checkout (apenas Zelle)
3. Admin aprova → 1ª parcela registrada, Kanban desbloqueado, documentos bloqueados
4. Aluno paga 2ª parcela → Admin aprova → documentos liberados

---

## Correções e Melhorias Realizadas

---

### 1. Fix: Parcelow e Stripe mostrando 50% indevidamente

**Arquivo:** `project/src/pages/StudentOnboarding/components/PlacementFeeStep.tsx`

**Problema:** Após implementar o parcelamento, Parcelow e Stripe também exibiam e cobravam 50% do valor — mas o parcelamento só faz sentido no Zelle (fluxo manual com revisão do admin).

**Fix:**
- `processCheckout` (Stripe/Parcelow): voltou a usar `fullAmount` (valor completo)
- `cardAmount` e `pixInfo`: calculados com `baseAmount` (valor completo)
- Parcelow display: `formatFeeAmount(baseAmount)` em vez de `effectiveAmount`
- Zelle display e `ZelleCheckout`: continuam usando `effectiveAmount` (50% quando installment habilitado)

**Resultado:** Apenas o Zelle mostra e cobra 50% quando installment está ativo.

---

### 2. Fix: Toggle "Enable Installment" não atualizava após clicar

**Arquivos:**
- `project/src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`
- `project/src/hooks/useStudentDetailsQueries.ts`
- `project/src/hooks/useStudentDetails.ts`

**Problema:** Após clicar em "Enable Installment", o botão não mudava para "Installment: ON" porque:
1. Os handlers usavam `queryKey: ['student', profileId]` em vez de `queryKeys.students.details(profileId)`
2. Os campos `placement_fee_installment_enabled`, `placement_fee_pending_balance`, `placement_fee_due_date`, `placement_fee_installment_number` não estavam sendo buscados na query de detalhes
3. Os campos não faziam parte do objeto `formatted` retornado pela query
4. O tipo `StudentRecord` em `useStudentDetails.ts` não tinha os 4 campos

**Fix:**
- Corrigidos os `queryClient.invalidateQueries` para usar `queryKeys.students.details(profileId)`
- Adicionados os 4 campos na select do complemento de RPC (`extraProfile`)
- Adicionados os 4 campos na select do fallback direto ao banco
- Adicionados os 4 campos no objeto `formatted` retornado
- Adicionados os 4 campos opcionais na interface `StudentRecord` de `useStudentDetails.ts`

---

### 3. UX: Toggle de parcelamento redesenhado

**Arquivo:** `project/src/components/AdminDashboard/StudentDetails/PaymentStatusCard.tsx`

**Mudança:** O botão "Enable Installment / Installment: ON" foi substituído por um **toggle switch** estilo iOS:
- OFF: bolinha à esquerda, fundo cinza, label "OFF"
- ON: bolinha à direita, fundo âmbar, label "ON"
- Label "Installment (50%)" ao lado para contexto

---

### 4. Fix: Modal Zelle com lógica de botões corrigida

**Arquivo:** `project/src/components/ZellePaymentReviewModal.tsx`

**Problemas:**
- Ordem errada: Reject aparecia antes de Approve
- Texto do card "Approve as 1st Installment" muito longo
- Quando installment habilitado, apareciam dois botões de aprovação ("Approve Payment" E "Approve as 1st Installment") causando confusão

**Fix:**
- Adicionada prop `studentPlacementFeeInstallmentEnabled` ao modal
- Computado `isFirstInstallmentScenario = fee_type=placement_fee AND installmentEnabled AND installmentNumber=0`
- Quando `isFirstInstallmentScenario`: mostra apenas "Approve as 1st Installment" + "Reject" (ordem: approve à esquerda, reject à direita)
- Quando não: mostra apenas "Approve Payment" + "Reject"
- Texto reduzido: "Student unlocked — 2nd installment required to release documents."

**Arquivo:** `project/src/pages/AdminDashboard/PaymentManagement.tsx`

- Adicionado estado `selectedStudentInstallmentEnabled`
- `useEffect` de abertura do modal agora busca também `placement_fee_installment_enabled` além de `placement_fee_installment_number`
- Passa `studentPlacementFeeInstallmentEnabled` para o modal

---

### 5. Feature: Step "2ª Parcela" nos Próximos Passos do aluno

**Arquivo:** `project/src/pages/StudentOnboarding/components/UniversityDocumentsStep.tsx`

**Problema:** O aluno não sabia onde pagar a 2ª parcela — não havia nenhuma indicação visual na tela principal.

**Implementação:**
- Adicionado `import { ZelleCheckout }` 
- Adicionadas variáveis `placementFeePendingBalance` e `hasPlacementInstallmentPending` lidas de `userProfile`
- Adicionado tipo `'placement_installment'` ao `activeTab`
- Adicionado step condicional no `sidebarSteps` quando `hasPlacementInstallmentPending`:
  ```
  id: 'placement_installment'
  title: '2ª Parcela do Placement Fee — $X'
  status: 'AÇÃO NECESSÁRIA'
  variant: 'warning'
  ```
- O step aparece como "atual" (destacado em azul) quando há saldo pendente
- Adicionada tab `placement_installment` que renderiza:
  - Banner âmbar explicativo
  - `ZelleCheckout` com `amount={placementFeePendingBalance}`, `metadata={{ installment_number: 2 }}`, `ignoreApprovedState={true}`

---

### 6. Fix: ZelleCheckout da 2ª parcela mostrava "PAGAMENTO APROVADO" imediatamente

**Arquivo:** `project/src/components/ZelleCheckout.tsx`

**Problema:** O `ZelleCheckout` da 2ª parcela exibia "PAGAMENTO APROVADO" ao abrir porque:
1. `sessionStorage` guardava `step = 'success'` da aprovação da 1ª parcela
2. `usePaymentBlocked` retornava `approvedPayment` com `fee_type = 'placement_fee'` (da 1ª parcela)
3. `determinePaymentState` retornava `step: 'success'` ao encontrar esse `approvedPayment`
4. O `useEffect` inicial disparava `onSuccess()` ao detectar `blockedApprovedPayment`

**Fix:** Adicionada prop `ignoreApprovedState?: boolean` que bloqueia os 3 caminhos:
1. **sessionStorage**: não carrega step salvo se `ignoreApprovedState=true`
2. **`determinePaymentState`**: não retorna `success` para `approvedPayment` existente
3. **`useEffect` inicial**: não dispara ao detectar `blockedApprovedPayment`

Prop passada como `ignoreApprovedState={true}` no checkout da 2ª parcela em `UniversityDocumentsStep`.

---

### 7. UX: PaymentStatusCard reflete estado parcial

**Arquivo:** `project/src/components/AdminDashboard/StudentDetails/PaymentStatusCard.tsx`

**Mudança:** Quando `is_placement_fee_paid=true` mas `placement_fee_pending_balance > 0`:
- Badge **âmbar**: "1ª Parcela Paga" com ícone `AlertCircle`
- Pill: "2ª parcela pendente: $X"
- Quando `pending_balance=0`: badge verde "Paid" normal

Adicionado import de `AlertCircle` ao arquivo.

---

### 8. UX: Lista de alunos reflete estado parcial

**Arquivo:** `project/src/components/AdminDashboard/StudentApplicationsView.tsx`

**Mudanças:**
- `getStepStatus` para `placement_fee`: retorna `'partial'` quando `is_placement_fee_paid=true AND pending_balance > 0`
- Dot de progresso: cor `bg-amber-400` para status `'partial'`

---

## Arquivos de Migração SQL Necessários

> **IMPORTANTE:** Executar no projeto **matriculausa** (não migma-inc)

### Já criados anteriormente (verificar se foram executados):

**`supabase-placement-fee-installment.md`**
```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS placement_fee_pending_balance NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placement_fee_due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS placement_fee_installment_number SMALLINT DEFAULT 0;
```

**`supabase-placement-fee-installment-enabled.md`**
```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS placement_fee_installment_enabled BOOLEAN DEFAULT FALSE;
```

---

## Resumo de Todos os Arquivos Modificados Hoje

| Arquivo | O que mudou |
|---|---|
| `PlacementFeeStep.tsx` | Stripe/Parcelow voltam a usar valor cheio; só Zelle usa 50% |
| `AdminStudentDetails.refactored.tsx` | Fix queryKey do invalidateQueries; handlers de enable/disable |
| `useStudentDetailsQueries.ts` | Busca e mapeia 4 campos de installment no objeto formatted |
| `useStudentDetails.ts` | Interface `StudentRecord` com 4 campos opcionais de installment |
| `PaymentStatusCard.tsx` | Toggle switch ON/OFF; badge "1ª Parcela Paga" quando partial |
| `ZellePaymentReviewModal.tsx` | Prop `installmentEnabled`; lógica de botões mutuamente exclusiva; ordem correta |
| `PaymentManagement.tsx` | Busca e passa `installmentEnabled` para o modal |
| `UniversityDocumentsStep.tsx` | Step "2ª Parcela" + tab com ZelleCheckout para pagar |
| `ZelleCheckout.tsx` | Prop `ignoreApprovedState` bloqueia 3 caminhos de falso "aprovado" |
| `StudentApplicationsView.tsx` | Status `partial` + cor âmbar no dot de progresso |

---

## Fluxo Completo Final

```
Admin → Student Details → Placement Fee → toggle ON (installmentEnabled=true)
  ↓
Aluno → Onboarding → PlacementFeeStep → vê $850 (50%) só no Zelle
  ↓
Aluno → paga via Zelle → upload comprovante
  ↓
Admin → PaymentManagement → abre review → modal mostra SÓ "Approve as 1st Installment"
  ↓
Admin → clica → approvePartialZelleFlow:
  - is_placement_fee_paid = true (desbloqueia Kanban)
  - placement_fee_pending_balance = $850
  - placement_fee_installment_number = 1
  - placement_fee_due_date = +30 dias
  ↓
Kanban → StudentCard → badge vermelho "Debt: $850"
Lista → dot âmbar (status partial)
StudentDetails → "1ª Parcela Paga" + pill "2ª parcela pendente: $850"
  ↓
Aluno → tenta baixar Carta de Aceite → BLOQUEADO (pending_balance > 0)
Aluno → "Próximos Passos" → vê step "2ª Parcela do Placement Fee — $850" destacado
Aluno → clica → abre ZelleCheckout (ignoreApprovedState=true, começa do zero)
  ↓
Admin → aprova 2ª parcela → approveSecondInstallmentFlow:
  - placement_fee_pending_balance = 0
  - placement_fee_installment_number = 2
  - placement_fee_due_date = null
  ↓
Carta de Aceite desbloqueada ✅
Badge "Debt" some do Kanban ✅
Dot volta para verde na lista ✅
```
