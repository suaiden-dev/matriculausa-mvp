# Relatório Técnico — Sessão 2026-05-06

## 1. MatriculaRewards — Alteração de Coins (180 → 100)

### Arquivos alterados
- `src/hooks/useAuth.tsx` → `credits_earned: 100`
- `src/pages/MatriculaRewardsLanding.tsx` → `friends * 100`
- `src/pages/StudentDashboard/MatriculaRewards.tsx` → `(+100)`
- 5 edge functions → textos de notificação: "180 MatriculaCoins" → "100 MatriculaCoins"

### Observação
Alteração não retroativa — alunos que já ganharam 180 coins não são afetados.

---

## 2. Cupom Promocional — Fix de Constraint no Banco

### Problema
Check constraint `promotional_coupons_discount_type_check` rejeitava o valor `'fixed'` (frontend enviava `'fixed'`, banco esperava `'fixed_amount'`).

### Solução
```sql
-- Constraint antiga já havia sido dropada pelo usuário
ALTER TABLE promotional_coupons
ADD CONSTRAINT promotional_coupons_discount_type_check
CHECK (discount_type IN ('percentage', 'fixed'));
```

---

## 3. Desconto Afiliado TFOE — $50 → $300

### Arquivo alterado
`src/pages/QuickRegistration.tsx`

### Lógica implementada
```tsx
const discountAmount = targetCode === 'TFOE' ? 300 : 50;
```

Escopo restrito: apenas código TFOE na página de QuickRegistration. Demais códigos (incluindo MatriculaRewards) mantêm $50.

---

## 4. Kanban Admin — Reestruturação Completa

### Arquivos principais
- `src/utils/applicationFlowStages.ts`
- `src/components/AdminDashboard/StudentApplicationsKanbanView.tsx`
- `src/components/AdminDashboard/KanbanColumn.tsx`
- `src/components/AdminDashboard/StudentCard.tsx`
- `src/components/AdminDashboard/hooks/useStudentApplicationsQueries.ts`

---

### 4.1 Coluna "Registered" (nova — primeira coluna)

**Lógica:** alunos que se cadastraram mas ainda não pagaram a Selection Process Fee.

```ts
const registeredStudents = students.filter(s =>
  !s.is_dropped &&
  !s.has_paid_selection_process_fee &&
  s.status !== 'enrolled' &&
  s.source !== 'migma'
);
```

Ícone: `UserPlus`. Coluna especial fora do `APPLICATION_FLOW_STAGES`.

---

### 4.2 Coluna "Selection Process Payment"

**Renomeada** de "Selection Fee" para "Selection Process Payment".

**Tags adicionadas ao StudentCard** (visíveis apenas nessa coluna via prop `showSelectionTags`):
- Photo upload → campo `user_profiles.identity_photo_path`
- Form submission → campo `user_profiles.selection_survey_passed`

**Lógica de conclusão do stage:**
```ts
case 'selection_fee':
  if (!student.has_paid_selection_process_fee && !isMigma) return 'pending';
  return student.has_submitted_form ? 'completed' : 'in_progress';
```

O aluno permanece nessa coluna até enviar o formulário (foto é pré-requisito do formulário).

**Campos adicionados ao select da query:**
```ts
identity_photo_path,
selection_survey_passed,
documents_uploaded,
selected_scholarship_id,
```

---

### 4.3 Coluna "Choosing Scholarship" (renomeada de "Application")

**Stage key:** `apply`

**Lógica:** aluno selecionou pelo menos uma bolsa, mas ainda não enviou os 3 documentos principais.

```ts
case 'apply':
  return student.total_applications > 0 ? 'completed' : 'pending';
```

---

### 4.4 Coluna "BDP Collection" (nova)

**BDP = Bank Statement, Diploma & Passport**

**Posição:** após "Choosing Scholarship", antes de "Scholarship Eligibility".

```ts
case 'bdp_collection':
  return student.documents_uploaded ? 'completed' : 'pending';
```

Descrição: `'Pending: Bank Statement, Diploma & Passport upload'`

---

### 4.5 Coluna "Scholarship Eligibility" (renomeada de "Review")

**Stage key:** `review`

Admin revisa e aprova documentos iniciais e bolsas selecionadas. Aluno sai quando `application_status === 'approved'` ou `'enrolled'`.

---

### 4.6 Coluna "Start Admission" (nova)

Aluno com bolsa aprovada precisa selecionar qual bolsa deseja prosseguir.

```ts
case 'start_admission':
  if (student.is_application_fee_paid) return 'completed';
  return student.selected_scholarship_id ? 'completed' : 'pending';
```

**Campo usado:** `user_profiles.selected_scholarship_id` (já existia no banco).

---

### 4.7 Coluna "Awaiting Application Fee" (renomeada de "Application Fee")

Aluno selecionou a bolsa e está pendente do pagamento da Application Fee.

```ts
case 'application_fee':
  return student.is_application_fee_paid ? 'completed' : 'pending';
```

---

### 4.8 Coluna "Awaiting Placement Fee" (renomeada de "Placement Fee")

Exclusiva para alunos com `placement_fee_flow = true`.

```ts
case 'placement_fee':
  if (!student.placement_fee_flow) return 'skipped';
  return (student.is_placement_fee_paid || isMigma) ? 'completed' : 'pending';
```

---

### 4.9 Coluna "Awaiting Reinstatement Fee" (nova)

**Exclusiva para:** alunos transfer com visto inativo (`student_process_type === 'transfer'` + `visa_transfer_active === false`).

```ts
case 'reinstatement_fee':
  if (student.student_process_type !== 'transfer' || student.visa_transfer_active !== false) return 'skipped';
  return student.has_paid_reinstatement_package ? 'completed' : 'pending';
```

---

### 4.10 Distribuição do Kanban — Mudança de Lógica

**Antes:** aluno era colocado no **último stage completado** (milestone).

**Depois:** aluno é colocado no **primeiro stage não completado** (current stage).

```ts
// Find first visible non-completed stage (current stage)
for (const stageDef of visibleStages) {
  const stepStatus = getStepStatus(student, stageDef.key);
  if (stepStatus === 'skipped') continue;
  if (stepStatus !== 'completed') {
    stageMap.get(stageDef.key)!.push(student);
    placed = true;
    break;
  }
}
```

---

## 5. Stages Planejados — Próxima Implementação

Mapeamento técnico dos cards futuros (C = ação do cliente, A = ação do admin):

| # | Nome do Card | Tipo | Campo existente | Campo novo necessário |
|---|-------------|------|-----------------|----------------------|
| 1 | Cliente Envia Docs Universidade | C | `document_requests` + `document_request_uploads` | `has_submitted_university_docs BOOLEAN` |
| 2 | Aprovação/Reprovação de Documentos | A | `document_request_uploads.status` | — |
| 3 | Envia Docs para Faculdade | A | — | `has_sent_docs_to_university BOOLEAN` |
| 4 | Recebe Carta de Aceite | A | `acceptance_letter_status` | — |
| 5 | Envio Carta de Aceite ao Aluno | A | `acceptance_letter_status = 'sent'` | — |
| 6 | Aluno Envia Carta p/ Inst. Atual | C | `transfer_form_status` (transfer only) | — |
| 7 | Aguardando Transferência SEVIS | A | — | `sevis_transfer_completed BOOLEAN` |
| 8 | Aguardando I-20 Control Fee | C | `has_paid_i20_control_fee` | — |
| 9 | Aguardando Aprovação de Visto | C | — | `visa_approved BOOLEAN` |
| 10 | Finalizado — Admitted | — | `status = 'enrolled'` | — |

### Migration pendente (segura — apenas ADD COLUMN com DEFAULT FALSE)
```sql
ALTER TABLE user_profiles
ADD COLUMN has_submitted_university_docs BOOLEAN DEFAULT FALSE,
ADD COLUMN has_sent_docs_to_university BOOLEAN DEFAULT FALSE,
ADD COLUMN sevis_transfer_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN visa_approved BOOLEAN DEFAULT FALSE;
```

---

## 6. Ordem Final das Colunas do Kanban

```
Registered
→ Selection Process Payment
→ Choosing Scholarship
→ BDP Collection
→ Scholarship Eligibility
→ Start Admission
→ Awaiting Application Fee
→ Awaiting Placement Fee
→ Awaiting Reinstatement Fee (transfer c/ visto inativo only)
→ [Cliente Envia Docs Universidade]
→ [Aprovação/Reprovação de Documentos]
→ [Envia Docs para Faculdade]
→ [Recebe Carta de Aceite]
→ [Envio Carta de Aceite ao Aluno]
→ [Aluno Envia Carta p/ Inst. Atual] (transfer only)
→ [Aguardando SEVIS] (transfer only)
→ [Aguardando I-20 Control Fee]
→ [Aguardando Aprovação de Visto]
→ Finalizado — Admitted
→ Dropped
```

*Itens entre colchetes = planejados, ainda não implementados.*
