# Relatório de Desenvolvimento — 04/06/2026

## Resumo Geral

Sessão focada em três frentes principais:
1. Refatoração do dashboard do seller (renomeação, visual, dados)
2. Novo componente compartilhado de progresso do aluno (`StudentStepProgress`)
3. Padronização do tracker de progresso em todos os dashboards (seller e agency)

---

## 1. Seller Dashboard — Renomeações e Limpeza Visual

### `src/pages/SellerDashboard/SellerDashboardLayout.tsx`
- Item de menu `'My Students'` renomeado para `'Sales'`

### `src/pages/SellerDashboard/Overview.tsx`
- Label `Total Revenue` → `Sales Volume`
- Label `revenue` → `sales`
- Quick action "View Students" → `Sales`
- Seção "Ranking by revenue" → `Ranking by sales`
- **Motivo:** o valor mostrado representa volume de vendas gerado, não ganho/comissão do seller

---

## 2. Novo Componente Compartilhado — `StudentStepProgress`

### `src/components/StudentStepProgress.tsx` *(arquivo novo)*

Componente de tracker de progresso com 6 etapas condensadas, usando círculos conectados por linhas (sem cores, só preto/cinza).

**Etapas mapeadas:**
| Etapa | Stages incluídas |
|-------|-----------------|
| Selection | `selection_fee` |
| Applying | `apply`, `bdp_collection`, `review`, `start_admission` |
| Fees | `application_fee`, `placement_fee`, `scholarship_fee`, `reinstatement_fee` |
| Sending Docs | `university_docs`, `docs_approval`, `send_docs_to_university` |
| Processing | `receive_acceptance_letter`, `send_acceptance_letter`, `student_sends_letter`, `sevis_transfer`, `i20_fee`, `visa_approval` |
| Admitted | `enrollment` |

**Estados visuais:**
- `completed` → círculo preto preenchido + checkmark branco
- `current` → círculo branco com borda preta + ponto preto central
- `pending` → círculo branco com borda cinza

**Conector entre etapas:**
- Preto se a etapa anterior foi completada
- Cinza se pendente

**Exports:**
- `default StudentStepProgress` — componente React
- `buildStudentRecord(student)` — adapter que normaliza qualquer shape de student para o formato esperado por `getStepStatus()`

---

## 3. Seller Dashboard — Página `MyStudents` (Sales)

### `src/pages/SellerDashboard/MyStudents.tsx`
- Importa `StudentStepProgress` e `buildStudentRecord` do componente compartilhado
- Tabela com colunas: **Student | Progress | Registration | Sales Volume**
- Coluna Progress usa `<StudentStepProgress student={student} />`
- Stats: Total Students + Sales Volume cards
- Removido: `onViewStudent`, navegação de detalhe, seções expansíveis

### `src/pages/SellerDashboard/index.tsx`
- Expandido o select de `user_profiles` para incluir todos os campos necessários pelo `getStepStatus()`:
  - `is_scholarship_fee_paid`, `has_paid_i20_control_fee`, `has_paid_ds160_package`
  - `has_paid_i539_cos_package`, `has_paid_reinstatement_package`
  - `placement_fee_flow`, `student_process_type`, `visa_transfer_active`
  - `sevis_transfer_completed`, `visa_approved`, `has_sent_docs_to_university`
  - `has_submitted_form`, `selected_scholarship_id`, `documents_uploaded`
- Expandido o select de `scholarship_applications` para incluir:
  - `status`, `is_scholarship_fee_paid`, `acceptance_letter_url`
  - `transfer_form_status`, `student_process_type`, `selected_scholarship_id`
- Merge do student agora passa `total_applications`, `application_status`, `is_scholarship_fee_paid`, `acceptance_letter_url`, `transfer_form_status`, `student_process_type`, `selected_scholarship_id`
- Removido `onViewStudent` prop da chamada `<MyStudents>`

---

## 4. Agency Dashboard — Overview

### `src/pages/AgencyDashboard/Overview.tsx`
- Importa `StudentStepProgress`
- Coluna "Paid Steps" substituída por coluna **Progress** com `<StudentStepProgress student={student} />`
- Adicionado helper `hasActiveCommissions(rules)`:
  ```typescript
  const hasActiveCommissions = (rules: any) => {
    if (!rules) return false;
    return Object.values(rules).some((r: any) => r?.enabled !== false && r?.value > 0);
  };
  ```
- Coluna **Commission** condicional: só aparece se a agência tiver taxas de comissão ativas configuradas
  ```typescript
  const showCommission = hasActiveCommissions(commissionRules);
  // <th> e <td> de commission só renderizam se showCommission === true
  ```

---

## 5. Seller Dashboard Overview — Ranking com Progress Tracker

### `src/pages/SellerDashboard/Overview.tsx`
- Importa `StudentStepProgress`
- Adicionado `<StudentStepProgress student={student} />` nos cards do ranking (top 3 e posições 4-6)
- Antes: apenas nome, email e valor; agora também mostra o tracker de progresso

---

## 6. EnhancedStudentTracking — SellersList

### `src/components/EnhancedStudentTracking/SellersList.tsx`
- Importa `StudentStepProgress`
- Removido: função `renderProgressStepper` (renderizava pills `Reg. / Sel. / App. / Plac. / Com.` com texto de status dinâmico "Selection Process Fee paid. Awaiting...")
- Substituído por: `<StudentStepProgress student={student} />`
- Removida desestruturação de `pendente` (não mais usada após remoção do stepper antigo)
- `disponivel` mantido (ainda usado na célula Commission)

---

## 7. Redirecionamentos — "Quero ser parceiro"

### `src/components/Footer.tsx`
- Link "Torne-se um Parceiro" na seção Explore
- **Antes:** `to="/schools"`
- **Depois:** `to="/agency"`

### `src/pages/AgencyLogin/index.tsx`
- Botão "Quero ser parceiro" no hero da página `/agencias`
- **Antes:** `<motion.button onClick={scrollToForm}>` — scrollava para o formulário na mesma página
- **Depois:** `<Link to="/agency">` — navega para a landing page de parceiros

---

## Arquivos Modificados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/components/StudentStepProgress.tsx` | Criado |
| `src/pages/SellerDashboard/SellerDashboardLayout.tsx` | Renomeação de menu |
| `src/pages/SellerDashboard/MyStudents.tsx` | Refatoração completa |
| `src/pages/SellerDashboard/index.tsx` | Expansão de queries |
| `src/pages/SellerDashboard/Overview.tsx` | Labels + StudentStepProgress |
| `src/pages/AgencyDashboard/Overview.tsx` | StudentStepProgress + Commission condicional |
| `src/components/EnhancedStudentTracking/SellersList.tsx` | Substituição do stepper antigo |
| `src/components/Footer.tsx` | Redirect parceiro |
| `src/pages/AgencyLogin/index.tsx` | Redirect parceiro |

---

## Decisões Técnicas

- **Sem comissão no seller dashboard:** sellers não têm sistema de comissão na plataforma — o valor exibido é "Sales Volume" (volume de vendas gerado), não ganho pessoal
- **Componente compartilhado:** `StudentStepProgress` evita duplicação entre seller Sales, seller Overview, agency Overview e EnhancedStudentTracking
- **Commission condicional:** agências sem taxas configuradas não veem coluna Commission no Overview — layout genérico
- **`buildStudentRecord`:** adapter exportado junto com o componente para normalizar diferentes shapes de dados (agency vs seller vs EnhancedStudentTracking usam objetos ligeiramente diferentes)
- **6 etapas condensadas vs 19 stages do kanban:** as 19 stages do `APPLICATION_FLOW_STAGES` são agrupadas em 6 macro-etapas para visualização compacta inline
