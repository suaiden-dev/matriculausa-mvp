# Relatório Completo de Desenvolvimento — Matrícula USA
## Todos os Trabalhos Realizados com Claude (Abril 2026)

---

## Índice

1. [02/04/2026 — Utilitários de pagamento e componentes do dashboard](#02042026)
2. [03/04/2026 — Feature "Assigned To" e suporte ao time](#03042026)
3. [06/04/2026 — Placement Fee Installment Flow (parte 1 — fluxo do aluno)](#06042026)
4. [07/04/2026 — Placement Fee Installment Flow (parte 2 — admin + seller)](#07042026)
5. [07/04/2026 — Sessão Final: Automação via Trigger e Links de Vendedores](#07042026_final)

---

<a name="02042026"></a>
## 02/04/2026

### Contexto
Sessão de setup e expansão dos dashboards. Criação de utilitários de conversão de pagamento, expansão dos componentes do dashboard e melhorias no registro de alunos e ferramentas de afiliado.

### O que foi feito

#### Utilitários de pagamento (`paymentConverter.ts`)
- Criação/expansão do utilitário `getDisplayAmounts()` para converter dados brutos do Supabase em valores exibíveis nos dashboards
- Mapeamento de `fee_type` → valor pago real via `individual_fee_payments`
- Lógica de fallback para fees não registradas

#### Expansão de componentes de dashboard
- Expansão dos componentes do Admin Dashboard para suportar mais fluxos de pagamento
- Melhorias no painel do vendedor (Seller Dashboard)

#### Registro de aluno e ferramentas de afiliado
- Melhorias no fluxo de novo registro de aluno (`SellerStudentRegistration`)
- Expansão das ferramentas de afiliado (`AffiliateTools`)

---

<a name="03042026"></a>
## 03/04/2026

### Contexto
Solicitação para criar funcionalidade de "Assigned To" (Atribuído a) no painel administrativo, permitindo que Raíssa, Romeu e Luiz gerenciem apenas os alunos sob sua responsabilidade.

### O que foi feito

#### 1. Banco de dados — Supabase

**`supabase-assigned-to.md`:**
- Adicionada coluna `assigned_to_admin_id UUID` (nullable, FK → `user_profiles.id`) na tabela `user_profiles`
- Índice `idx_user_profiles_assigned_to_admin_id` para performance
- RLS policy "Admins can assign responsible admin to students"

**`supabase-assigned-to-restrict.md`:**
- Policy anterior dropada, nova policy restrita:
  - **USING**: só permite UPDATE se o aluno está sem responsável OU atribuído ao próprio admin logado
  - **WITH CHECK**: só permite salvar `NULL` (remover) ou o próprio `id` do admin

**Roles confirmadas:**
- Rayssa Tenório → `role = 'admin'` ✅
- Romeu Chimenti Neto → `role = 'admin'` ✅
- Luiz Eduardo Miola → `role = 'admin'` ✅

#### 2. Hook de dados — `useStudentApplicationsQueries.ts`

- Interface `StudentRecord` ampliada com `assigned_to_admin_id` e `assigned_to_admin_name`
- `useStudentsQuery`: query com join `assigned_admin:user_profiles!assigned_to_admin_id(id, full_name)`
- `useFilterDataQuery`: busca de admins internos (`role = 'admin'`) retornados como `internalAdmins`
- `useAssignAdminMutation` (novo): mutation `UPDATE user_profiles SET assigned_to_admin_id` com invalidação automática do cache React Query

#### 3. Cadeia de props Kanban

`StudentApplicationsView` → `StudentApplicationsKanbanView` → `KanbanColumn` → `StudentCard`

Cada componente recebe e repassa `internalAdmins`.

#### 4. StudentCard — `StudentCard.tsx`

Dropdown "Atribuir responsável" no rodapé de cada card:

| Estado | Visual |
|--------|--------|
| Sem atribuição | Borda tracejada cinza + "Atribuir responsável" |
| Atribuído ao próprio admin | Fundo índigo + nome + seta (pode remover) |
| Atribuído a outro admin | Fundo cinza + nome sem seta (read-only) |

- Fecha automaticamente ao clicar fora (`mousedown` listener)
- Restrições de permissão aplicadas via `useAuth`

#### 5. `StudentApplicationsView.tsx`

- Novo estado `assignedAdminFilter` com opções: Todos / Sem atribuição / Raíssa / Romeu / Luiz
- Lógica de filtro por `assigned_to_admin_id`
- Persistido no `localStorage` junto com demais filtros
- Nova coluna "Atribuído" na view de tabela com `<select>` inline por linha

#### 6. `CompletedApplicationsView.tsx`

- Mesmo filtro "Atribuído" implementado
- Persistência no `localStorage` (`admin_completed_filters`)

#### Regras de negócio

| Regra | Frontend | Banco (RLS) |
|-------|----------|-------------|
| Admin pode atribuir aluno sem responsável | ✅ | ✅ |
| Admin pode remover atribuição própria | ✅ | ✅ |
| Admin NÃO pode atribuir a outro admin | ✅ | ✅ |
| Admin NÃO pode alterar atribuição de outro | ✅ | ✅ |
| Filtro por responsável (principal + concluídos) | ✅ | — |
| Persistência no localStorage | ✅ | — |

#### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase-assigned-to.md` | **Criado** — migration SQL + RLS |
| `supabase-assigned-to-restrict.md` | **Criado** — RLS restrita |
| `hooks/useStudentApplicationsQueries.ts` | Query + mutation + tipos |
| `StudentApplicationsView.tsx` | Filtro + coluna "Atribuído" |
| `CompletedApplicationsView.tsx` | Filtro "Atribuído" |
| `StudentCard.tsx` | Dropdown de atribuição |
| `KanbanColumn.tsx` | Prop internalAdmins |
| `StudentApplicationsKanbanView.tsx` | Prop internalAdmins |

#### Outros projetos do dia

**Lush America:**
- Adicionadas informações sobre ATA (Authorization to Test) na home do site

**Migma Inc:**
- Reunião com Arthur apresentando funcionalidades de Head of Sales
- Suporte ao time de pós-vendas

---

<a name="06042026"></a>
## 06/04/2026

### Contexto
Implementação completa do fluxo de parcelamento da Placement Fee (50%+50%). Alunos com fee alto (ex: $1.700) precisam pagar em parcelas, com aprovação manual do admin entre as parcelas.

### Fluxo implementado

```
Admin → habilita installment no Student Details
  ↓
Aluno → PlacementFeeStep → vê 50% apenas no Zelle
  ↓
Aluno → paga via Zelle → envia comprovante
  ↓
Admin → PaymentManagement → modal "Approve as 1st Installment"
  ↓
Banco: is_placement_fee_paid=true, pending_balance=$X, installment_number=1
  ↓
Kanban: badge "Debt: $X" | Lista: dot âmbar | Details: "1ª Parcela Paga"
  ↓
Aluno → documentos BLOQUEADOS até 2ª parcela
Aluno → "Próximos Passos" → step "2ª Parcela" → ZelleCheckout
  ↓
Admin → aprova 2ª parcela → pending_balance=0, installment_number=2
  ↓
Carta de Aceite desbloqueada ✅
```

### Correções e implementações

#### 1. Fix: Parcelow e Stripe mostrando 50% indevidamente
**`PlacementFeeStep.tsx`**
- `processCheckout` (Stripe/Parcelow): voltou a usar `fullAmount`
- Zelle: continua usando `effectiveAmount` (50% quando installment ativo)

#### 2. Fix: Toggle "Enable Installment" não atualizava
**`AdminStudentDetails.refactored.tsx` + `useStudentDetailsQueries.ts` + `useStudentDetails.ts`**
- Corrigido `queryClient.invalidateQueries` para usar `queryKeys.students.details(profileId)`
- Adicionados 4 campos na query: `placement_fee_installment_enabled`, `placement_fee_pending_balance`, `placement_fee_due_date`, `placement_fee_installment_number`
- Adicionados no objeto `formatted` e na interface `StudentRecord`

#### 3. UX: Toggle switch redesenhado
**`PaymentStatusCard.tsx`**
- Botão "Enable Installment" → toggle switch estilo iOS
- OFF: bolinha esquerda, fundo cinza | ON: bolinha direita, fundo âmbar
- Label "Installment (50%)" ao lado

#### 4. Fix: Modal Zelle com lógica de botões corrigida
**`ZellePaymentReviewModal.tsx`**
- Prop `studentPlacementFeeInstallmentEnabled` adicionada
- `isFirstInstallmentScenario = fee_type=placement_fee AND installmentEnabled AND installmentNumber=0`
- Quando primeiro installment: apenas "Approve as 1st Installment" + "Reject"
- Quando não: apenas "Approve Payment" + "Reject"

**`PaymentManagement.tsx`**
- Busca `placement_fee_installment_enabled` ao abrir o modal

#### 5. Feature: Step "2ª Parcela" nos Próximos Passos do aluno
**`UniversityDocumentsStep.tsx`**
- Step condicional `placement_installment` quando `hasPlacementInstallmentPending`
- Renderiza `ZelleCheckout` com `amount={placementFeePendingBalance}`, `metadata={{ installment_number: 2 }}`, `ignoreApprovedState={true}`

#### 6. Fix: ZelleCheckout da 2ª parcela mostrava "PAGAMENTO APROVADO" imediatamente
**`ZelleCheckout.tsx`**
- Prop `ignoreApprovedState?: boolean` bloqueia 3 caminhos de falso "aprovado":
  1. sessionStorage: não carrega step salvo
  2. `determinePaymentState`: não retorna `success` para `approvedPayment` existente
  3. `useEffect` inicial: não dispara ao detectar `blockedApprovedPayment`

#### 7. UX: PaymentStatusCard reflete estado parcial
**`PaymentStatusCard.tsx`**
- `is_placement_fee_paid=true` + `pending_balance > 0` → badge âmbar "1ª Parcela Paga"
- `pending_balance=0` → badge verde "Paid"

#### 8. UX: Lista de alunos com status parcial
**`StudentApplicationsView.tsx`**
- `getStepStatus` para `placement_fee`: retorna `'partial'` quando pago parcialmente
- Dot de progresso: `bg-amber-400` para status `'partial'`

#### Migrations SQL necessárias

```sql
-- supabase-placement-fee-installment.md
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS placement_fee_pending_balance NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placement_fee_due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS placement_fee_installment_number SMALLINT DEFAULT 0;

-- supabase-placement-fee-installment-enabled.md
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS placement_fee_installment_enabled BOOLEAN DEFAULT FALSE;
```

#### Arquivos modificados

| Arquivo | O que mudou |
|---------|-------------|
| `PlacementFeeStep.tsx` | Stripe/Parcelow voltam ao valor cheio; só Zelle usa 50% |
| `AdminStudentDetails.refactored.tsx` | Fix queryKey; handlers enable/disable |
| `useStudentDetailsQueries.ts` | 4 campos de installment no objeto formatted |
| `useStudentDetails.ts` | Interface `StudentRecord` com 4 campos opcionais |
| `PaymentStatusCard.tsx` | Toggle switch ON/OFF; badge "1ª Parcela Paga" |
| `ZellePaymentReviewModal.tsx` | Prop installmentEnabled; botões mutuamente exclusivos |
| `PaymentManagement.tsx` | Busca e passa `installmentEnabled` para o modal |
| `UniversityDocumentsStep.tsx` | Step "2ª Parcela" + ZelleCheckout |
| `ZelleCheckout.tsx` | Prop `ignoreApprovedState` |
| `StudentApplicationsView.tsx` | Status `partial` + cor âmbar |

---

<a name="07042026"></a>
## 07/04/2026

### Contexto
Quatro frentes de trabalho simultâneas:
1. Filtros de scholarship na aba admin (equivalente ao step 3 do aluno)
2. Correção do fluxo "Mark as Paid" com installment no admin
3. Correção completa do PaymentStatusCard no seller dashboard
4. Correção de todos os valores de taxas em `getDisplayAmounts`

---

### 1. Admin Scholarship Selection — Filtros e badges

**`project/src/components/AdminDashboard/AdminScholarshipSelection.tsx`**

#### Problema
O admin precisava clicar em "View Details" em cada bolsa para ver informações básicas. Não havia filtros equivalentes ao step 3 do onboarding do aluno.

#### Implementação

**4 novos estados de filtro:**
```typescript
const [filterLevel, setFilterLevel] = useState('');
const [filterFieldOfStudy, setFilterFieldOfStudy] = useState('');
const [filterDeliveryMode, setFilterDeliveryMode] = useState('');
const [filterWorkPermission, setFilterWorkPermission] = useState('');
```

**Dados carregados dinamicamente no `loadData`:**
- `distinctLevels` — valores únicos de `level`
- `distinctFields` — valores únicos de `field_of_study`
- `distinctDeliveryModes` — valores únicos de `delivery_mode`
- `distinctWorkPermissions` — valores únicos extraídos do array `work_permissions`

**Filtros Supabase aplicados:**
- `level`, `field_of_study`, `delivery_mode`: `.eq()`
- `work_permissions` (array): `.contains([filterWorkPermission])`

**Badges inline em cada card de bolsa:**
- Roxo: nível (Graduate / Undergraduate)
- Âmbar: área de estudo (field_of_study)
- Azul-céu: modalidade (delivery_mode)

**Botão "Clear" e `loadData`** atualizados para incluir os 4 novos filtros.

---

### 2. Fix: "Mark as Paid" com Installment — Admin

**Problema:** Ao clicar em "Mark as Paid" com installment habilitado:
1. O modal abria com o valor **completo** (deveria ser 50%)
2. Ao confirmar a 1ª parcela, marcava como **100% pago** (sem pending_balance)
3. Ao confirmar a 2ª parcela, o amount calculado era `currentBalance / 2` em vez de `currentBalance`

#### Fix 1: `AdminStudentDetails.refactored.tsx`

**`handleMarkAsPaid`** — valor inicial do modal:
```typescript
// Antes: sempre abria com o valor cheio
// Depois: quando installment habilitado e 1ª parcela, abre com 50%
const isInstallmentFirst = profile.placement_fee_installment_enabled && currentBalance === 0;
const initialAmount = isInstallmentFirst ? totalFee / 2 : currentBalance || totalFee;
```

**`handleMarkAsPaid`** — segunda parcela:
```typescript
// Antes: currentBalance / 2 (ERRADO)
// Depois: currentBalance (valor restante completo)
amount = currentBalance;
```

**`handleConfirmPayment`** — calcula `placementFeePendingBalance` antes de chamar `markFeeAsPaid`:
```typescript
let placementFeePendingBalance: number | undefined;
if (feeType === 'placement' && profile.placement_fee_installment_enabled) {
  if (currentBalance === 0) {
    // 1ª parcela: pending = valor pago agora
    placementFeePendingBalance = finalPaymentAmount;
  } else {
    // 2ª parcela: zera o saldo
    placementFeePendingBalance = 0;
  }
}
```

#### Fix 2: `useAdminStudentActions.ts`

Adicionado parâmetro opcional `placementFeePendingBalance?: number` ao `markFeeAsPaid`:

```typescript
const markFeeAsPaid = useCallback(async (
  userId: string,
  feeType: string,
  paymentMethod: string,
  applicationId?: string,
  placementFeePendingBalance?: number
) => {
  if (feeType === 'placement' && profile?.placement_fee_installment_enabled) {
    updateData['is_placement_fee_paid'] = true;
    if (placementFeePendingBalance !== undefined) {
      updateData['placement_fee_pending_balance'] = placementFeePendingBalance;
    }
  } else {
    updateData[fieldName] = true;
    if (feeType === 'placement') updateData['placement_fee_pending_balance'] = 0;
  }
});
```

---

### 3. Fix: `getDisplayAmounts` — Valores incorretos em todos os dashboards

**`project/src/utils/paymentConverter.ts`**

#### Problema 1: `placement` ausente do mapa de fees reais

No loop de normalização de `fee_type`, o tipo `"placement"` nunca foi adicionado ao `realPaidMap`. Resultado: `getDisplayAmounts` sempre retornava `null` para placement fee, mesmo quando pago.

**Fix:**
```typescript
// Adicionado ao mapa de normalização:
case 'placement':
case 'placement_fee':
  realPaidMap['placement'] = payment.amount;
  break;
```

#### Problema 2: Selection Process Fee retornando $416.55 (bruto Stripe)

`realPaidMap.selection_process` estava na cadeia de prioridade, retornando o valor bruto cobrado pelo Stripe ($416.55) em vez do valor esperado ($400).

**Fix:** Removido `realPaidMap.selection_process` da cadeia de prioridade do Selection Process Fee — usa apenas o valor hardcoded/override.

#### Problema 3: Application Fee hardcoded $100 ignorava pagamentos reais

`getDisplayAmounts` usava valor hardcoded de $100 para Application Fee sem consultar `individual_fee_payments`.

**Fix:**
```typescript
// Antes: sempre $100
applicationFee: overrides?.application_fee ?? 100

// Depois: usa valor real do pagamento se disponível
applicationFee: realPaidMap.application ?? overrides?.application_fee ?? 100
```

#### Problema 4: Placement Fee $250 (valor de lookup errado)

`placement_fee_amount` não estava sendo selecionado na query de `allApplications` em `useStudentDetails.ts`. Resultado: `getPlacementFee(annual_value, null)` usava a tabela de lookup e retornava $250 para anuidade de ~$8.000 (deveria ser $900+).

**Fix em `useStudentDetails.ts`** (em 2 lugares):
```typescript
scholarships (
  id, title, field_of_study,
  annual_value_with_scholarship,
  application_fee_amount,
  scholarship_fee_amount,
  placement_fee_amount,   ← adicionado
  universities (id, name)
)
```

---

### 4. Fix: PaymentStatusCard — Seller Dashboard

**`project/src/pages/SellerDashboard/StudentDetails.tsx`**

#### Problema 1: `placement_fee_flow` sempre false

`placement_fee_flow` era lido de `hookScholarshipApplication` (linha da tabela `scholarship_applications`), que não tem esse campo. O campo existe em `user_profiles`.

#### Problema 2: `is_placement_fee_paid` mostrando "Not Paid" no seller quando admin via "1/2 Paid"

`is_placement_fee_paid` vinha do RPC `get_student_detailed_info`, que não retorna esse campo com consistência.

#### Fix: Estado separado para campos de `user_profiles`

```typescript
const [profilePaymentFields, setProfilePaymentFields] = useState<{
  placement_fee_flow: boolean;
  placement_fee_pending_balance: number;
  placement_fee_installment_enabled: boolean;
  is_placement_fee_paid: boolean;
}>({
  placement_fee_flow: false,
  placement_fee_pending_balance: 0,
  placement_fee_installment_enabled: false,
  is_placement_fee_paid: false,
});

useEffect(() => {
  if (!studentId) return;
  supabase
    .from('user_profiles')
    .select('placement_fee_flow, placement_fee_pending_balance, placement_fee_installment_enabled, is_placement_fee_paid')
    .eq('user_id', studentId)
    .maybeSingle()
    .then(({ data }) => {
      if (data) setProfilePaymentFields({ ...data });
    });
}, [studentId]);
```

`PaymentStatusCard` agora recebe:
```typescript
<PaymentStatusCard
  student={{
    ...studentInfo,
    placement_fee_flow: profilePaymentFields.placement_fee_flow,
    is_placement_fee_paid: profilePaymentFields.is_placement_fee_paid,
    placement_fee_pending_balance: profilePaymentFields.placement_fee_pending_balance,
    placement_fee_installment_enabled: profilePaymentFields.placement_fee_installment_enabled,
    all_applications: hookAllApplications || [],
    placement_fee_amount: 0,
  }}
/>
```

**`project/src/components/AdminDashboard/StudentDetails/PaymentStatusCard.tsx`**

#### Reescrita da exibição do valor da Placement Fee

Helper `calcTotalFee()`:
```typescript
const calcTotalFee = (): number | null => {
  // 1. Verifica override manual do admin
  if (currentOverrides?.placement_fee != null) return Number(currentOverrides.placement_fee);
  
  // 2. Busca scholarship da aplicação enrolled/approved
  const apps = student.all_applications || [];
  const app = apps.find(a => a.status === 'enrolled')
    || apps.find(a => a.status === 'approved')
    || apps[0];
  const sch = app?.scholarships ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships) : null;
  
  // 3. Calcula via getPlacementFee com placement_fee_amount customizado
  if (sch?.annual_value_with_scholarship) {
    const customAmt = sch.placement_fee_amount ? Number(sch.placement_fee_amount) : null;
    return getPlacementFee(Number(sch.annual_value_with_scholarship), customAmt);
  }
  return null;
};
```

Lógica de exibição:
- **Parcialmente pago** (`is_placement_fee_paid=true` + `pending_balance > 0`): mostra `paid + pendingBalance` como total
- **Totalmente pago**: mostra `realPaidAmounts.placement`
- **Não pago**: mostra `calcTotalFee()`

Labels em inglês: "1/2 Paid", "2nd installment pending: $X"

---

### 5. Arquivo de Queries SQL — `PLACEMENT_FEE_INSTALLMENT_QUERIES.md`

Criado para facilitar debugging via Supabase MCP:
- Verificar colunas existentes em `user_profiles`
- Adicionar `placement_fee_pending_balance` e `placement_fee_installment_enabled`
- Verificar estado atual de um aluno específico
- Simular confirmação de 1ª e 2ª parcela
- Verificar registros em `individual_fee_payments`
- Resetar estado para testar do zero

---

### Arquivos modificados em 07/04/2026

| Arquivo | O que mudou |
|---------|-------------|
| `AdminScholarshipSelection.tsx` | 4 novos filtros + badges nas bolsas |
| `AdminStudentDetails.refactored.tsx` | Modal abre com 50%; segunda parcela usa valor completo; `placementFeePendingBalance` calculado e passado |
| `useAdminStudentActions.ts` | Parâmetro `placementFeePendingBalance`; lógica de installment no UPDATE |
| `paymentConverter.ts` | `placement` no realPaidMap; remove selection_process da prioridade; usa realPaid para application |
| `useStudentDetails.ts` | `placement_fee_amount` adicionado em 2 queries de allApplications |
| `PaymentStatusCard.tsx` | `calcTotalFee()` helper; lógica de valor por estado; labels em inglês |
| `SellerDashboard/StudentDetails.tsx` | Estado `profilePaymentFields`; query direta a `user_profiles`; passa campos corretos ao PaymentStatusCard |
| `PLACEMENT_FEE_INSTALLMENT_QUERIES.md` | **Criado** — queries de debug |

---

## Resumo Geral por Categoria

### Banco de dados / Migrations

| Migration | Data | Descrição |
|-----------|------|-----------|
| `supabase-assigned-to.md` | 03/04 | Coluna `assigned_to_admin_id` + RLS |
| `supabase-assigned-to-restrict.md` | 03/04 | RLS restrita por admin |
| `supabase-placement-fee-installment.md` | 06/04 | 3 colunas de installment |
| `supabase-placement-fee-installment-enabled.md` | 06/04 | Coluna `placement_fee_installment_enabled` |

### Features implementadas

| Feature | Data |
|---------|------|
| Atribuição de responsável (Assigned To) no Kanban e tabela | 03/04 |
| Filtro por responsável em StudentApplicationsView | 03/04 |
| Filtro por responsável em CompletedApplicationsView | 03/04 |
| Toggle installment (switch estilo iOS) | 06/04 |
| Zelle mostra 50%; Stripe/Parcelow mostram 100% | 06/04 |
| Modal "Approve as 1st Installment" vs "Approve Payment" | 06/04 |
| Step "2ª Parcela" nos Próximos Passos do aluno | 06/04 |
| Badge âmbar "1ª Parcela Paga" no PaymentStatusCard | 06/04 |
| Dot âmbar na lista de alunos (status partial) | 06/04 |
| Filtros de scholarship no admin (level, field, delivery, work_permission) | 07/04 |
| Badges inline nas bolsas do admin (roxo, âmbar, azul) | 07/04 |

### Correções de bugs

| Bug | Data | Arquivo |
|-----|------|---------|
| Toggle installment não atualizava visualmente | 06/04 | `useStudentDetailsQueries.ts` + queryKey |
| ZelleCheckout da 2ª parcela mostrava "APROVADO" | 06/04 | `ZelleCheckout.tsx` — prop `ignoreApprovedState` |
| Modal Zelle mostrava 2 botões de aprovação | 06/04 | `ZellePaymentReviewModal.tsx` |
| 1ª parcela marcada como 100% pago (sem pending_balance) | 07/04 | `AdminStudentDetails.refactored.tsx` + `useAdminStudentActions.ts` |
| 2ª parcela calculada como `currentBalance / 2` | 07/04 | `AdminStudentDetails.refactored.tsx` |
| Selection Process Fee mostrando $416.55 (bruto Stripe) | 07/04 | `paymentConverter.ts` |
| Application Fee ignorando pagamento real (hardcoded $100) | 07/04 | `paymentConverter.ts` |
| Placement Fee mostrando $250 (lookup sem `placement_fee_amount`) | 07/04 | `useStudentDetails.ts` |
| `placement` ausente do `realPaidMap` | 07/04 | `paymentConverter.ts` |
| `placement_fee_flow` sempre false no seller dashboard | 07/04 | `SellerDashboard/StudentDetails.tsx` |
| `is_placement_fee_paid` divergente entre admin e seller | 07/04 | `SellerDashboard/StudentDetails.tsx` |

---

## Branch

`seller-dashboard` (trabalhos de 07/04/2026)
`developers-paulo` (trabalhos anteriores)
