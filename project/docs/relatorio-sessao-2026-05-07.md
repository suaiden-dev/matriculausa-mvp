# Relatório Técnico — Sessão 2026-05-07

## Tema: Novos Stages do Kanban — Design & Especificação

---

## 1. Contexto

Sessão focada em mapear os novos stages do Kanban de aplicações antes de qualquer implementação.
Objetivo: definir lógica de queries, transições, campos novos e interações do admin.

---

## 2. Campos Novos no Banco

Todos em `scholarship_applications` (por processo, não por aluno):

```sql
ALTER TABLE scholarship_applications
ADD COLUMN has_sent_docs_to_university BOOLEAN DEFAULT FALSE,
ADD COLUMN sevis_transfer_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN visa_approved BOOLEAN DEFAULT FALSE;
```

**Nenhum campo novo em `user_profiles`.**
**`transfer_form_status`** ganha novo valor possível: `'returned'` (sem migration — só lógica).

---

## 3. Stages Novos — Especificação Completa

### Ordem final das colunas do Kanban

```
Registered
→ Selection Process Payment
→ Choosing Scholarship
→ BDP Collection
→ Scholarship Eligibility
→ Start Admission
→ Awaiting Application Fee
→ Awaiting Placement Fee
→ Awaiting Reinstatement Fee        (transfer c/ visto inativo only)
→ [1] Aguardando Docs Universidade  (novo)
→ [2] Aprovação de Documentos       (novo)
→ [3] Envia Docs para Faculdade     (novo)
→ [4] Recebe Carta de Aceite        (novo)
→ [5] Envio Carta de Aceite ao Aluno(novo)
→ [6] Aluno Envia Carta p/ Inst. Atual (transfer + transfer/reinstatement only)
→ [7] Aguardando SEVIS              (transfer + transfer/reinstatement only)
→ Aguardando I-20 Control Fee       (Initial, Transfer/Reinstatement, COS)
→ [8] Aguardando Aprovação de Visto (Initial, Transfer/Reinstatement, COS)
→ Finalizado — Admitted
→ Dropped
```

---

### Stage 1 — Aguardando Docs Universidade
**Quem age:** Cliente (aluno)
**O que é:** Aluno faz upload dos documentos da universidade dentro da plataforma (My Application).
**Process types:** Todos (initial, transfer, change_of_status)

**Fonte de dados:** `document_requests` (global) + `document_request_uploads`

**Filtro de docs obrigatórios:**
```sql
WHERE dr.is_global = true
  AND dr.university_id = <university_id da scholarship do aluno>
  AND (
    dr.applicable_student_types @> ARRAY['all']
    OR dr.applicable_student_types @> ARRAY[student_process_type]
  )
```

**Lógica de status:**
| Situação | Status |
|---|---|
| Algum doc obrigatório sem upload | `pending` |
| Algum doc com upload `rejected` e sem re-envio | `pending` (volta pro aluno) |
| Todos os docs têm upload (qualquer status) | `completed` |

**Tags no card do Kanban:**
- `X doc(s) pendente(s)` — sem upload ainda
- `X doc(s) recusado(s)` — rejected sem re-upload
- `X doc(s) em revisão` — under_review

**Campos usados:** `document_request_uploads.status` (`under_review`, `approved`, `rejected`)

---

### Stage 2 — Aprovação de Documentos
**Quem age:** Admin
**O que é:** Admin revisa os uploads do aluno e aprova ou rejeita cada documento.
**Process types:** Todos

**Lógica de status:**
| Situação | Status |
|---|---|
| Algum upload `under_review` | `in_progress` |
| Algum upload `rejected` (aguarda re-upload do aluno) | `rejected` → aluno volta ao Stage 1 |
| Todos `approved` | `completed` |

**Tags no card:**
- `X em revisão`
- `X recusado(s)`
- `X aprovado(s) / Y total`

**Interação admin:** Já existe na plataforma (review de document_request_uploads).

---

### Stage 3 — Envia Docs para Faculdade
**Quem age:** Admin
**O que é:** Admin confirma manualmente que enviou os documentos aprovados para a faculdade.
**Process types:** Todos

**Lógica de status:**
| Situação | Status |
|---|---|
| `has_sent_docs_to_university = false` | `pending` |
| `has_sent_docs_to_university = true` | `completed` |

**Interação admin:** Botão no card do Kanban — "Marcar como enviado".
**Campo:** `scholarship_applications.has_sent_docs_to_university BOOLEAN`

---

### Stage 4 — Recebe Carta de Aceite
**Quem age:** Admin
**O que é:** Universidade envia carta de aceite por email pro admin. Admin faz upload na plataforma.
**Process types:** Todos

**Lógica de status:**
| Situação | Status |
|---|---|
| `acceptance_letter_url IS NULL` | `pending` |
| `acceptance_letter_url IS NOT NULL` | `completed` |

**Interação admin:** Upload do arquivo na plataforma (já existe o campo, verificar se UI já permite).
**Campos:** `scholarship_applications.acceptance_letter_url` (já existe)

---

### Stage 5 — Envio Carta de Aceite ao Aluno
**Quem age:** Admin
**O que é:** Admin envia a carta de aceite para o aluno dentro da plataforma.
**Process types:** Todos

**Lógica de status:**
| Situação | Status |
|---|---|
| `acceptance_letter_url IS NOT NULL AND acceptance_letter_status = 'pending'` | `pending` |
| `acceptance_letter_status = 'sent'` | `completed` |

**Interação admin:** Ação já existe na plataforma (verificar se o botão de envio já está implementado).
**Campos:** `scholarship_applications.acceptance_letter_status` (valores: `pending`, `sent`)

---

### Stage 6 — Aluno Envia Carta p/ Instituição Atual
**Quem age:** Admin (envia form) → Aluno (devolve preenchido)
**O que é:** 
  1. Admin envia transfer form pro aluno
  2. Aluno leva pra escola atual, que preenche e devolve
  3. Aluno faz upload do form preenchido na plataforma
**Process types:** transfer, transfer/reinstatement only

**Lógica de status:**
| Situação | Status |
|---|---|
| `transfer_form_status IS NULL` | `pending` |
| `transfer_form_status = 'sent'` | `in_progress` (admin enviou, aguardando aluno) |
| `transfer_form_status = 'returned'` | `completed` (aluno fez upload de volta) |

**Novo valor de status:** `'returned'` — sem migration, apenas lógica no código.
**Campos:** `scholarship_applications.transfer_form_status` (valores: `null`, `sent`, `returned`)

---

### Stage 7 — Aguardando Transferência SEVIS
**Quem age:** Admin (marca manualmente)
**O que é:** Processo ocorre fora da plataforma. Admin confirma quando SEVIS foi transferido.
**Process types:** transfer, transfer/reinstatement only

**Lógica de status:**
| Situação | Status |
|---|---|
| `sevis_transfer_completed = false` | `pending` |
| `sevis_transfer_completed = true` | `completed` |

**Interação admin:** Botão no card do Kanban — "Marcar SEVIS como transferido".
**Campo:** `scholarship_applications.sevis_transfer_completed BOOLEAN` (novo)

---

### Stage 8 — Aguardando Aprovação de Visto
**Quem age:** Admin (marca manualmente)
**O que é:** Processo ocorre fora da plataforma. Aluno envia documentação ao advogado (Aplikei). Admin confirma quando visto foi aprovado.
**Process types:** Initial, Transfer/Reinstatement, COS

**Lógica de status:**
| Situação | Status |
|---|---|
| `visa_approved = false` | `pending` |
| `visa_approved = true` | `completed` |

**Interação admin:** Botão no card do Kanban — "Marcar visto como aprovado".
**Campo:** `scholarship_applications.visa_approved BOOLEAN` (novo)

**Obs:** Aluno deve enviar documentação para o advogado (Aplikei) fora da plataforma.

---

### Stage Final — Finalizado (Admitted)
**Campo:** `scholarship_applications.status = 'enrolled'` (já existe)
**Nenhuma mudança necessária.**

---

## 4. Dados Necessários na Query do Kanban

Para cada aluno, a query precisa retornar:

```ts
// Campos existentes já usados
acceptance_letter_url: string | null
acceptance_letter_status: string | null
transfer_form_status: string | null

// Campos novos
has_sent_docs_to_university: boolean
sevis_transfer_completed: boolean
visa_approved: boolean

// Agregações de document_request_uploads (calculadas na query)
docs_total_required: number
docs_total_uploaded: number
docs_total_approved: number
docs_total_rejected: number
docs_total_under_review: number
```

---

## 5. Interações do Admin no Kanban (Botões)

| Stage | Ação | Campo alterado |
|---|---|---|
| Stage 3 | "Marcar como enviado" | `has_sent_docs_to_university = true` |
| Stage 7 | "Marcar SEVIS como transferido" | `sevis_transfer_completed = true` |
| Stage 8 | "Marcar visto como aprovado" | `visa_approved = true` |

Stages 4 e 5 já têm UI existente (upload + envio de carta de aceite).
Stage 6 já tem UI existente (envio de transfer form).

---

## 6. Próximos Passos

1. [ ] Rodar migration (3 novos campos em `scholarship_applications`)
2. [ ] Atualizar `applicationFlowStages.ts` — novos stage keys + lógica
3. [ ] Atualizar `StudentRecord` interface — novos campos
4. [ ] Atualizar `getStepStatus()` — lógica dos novos stages
5. [ ] Atualizar query em `useStudentApplicationsQueries.ts` — incluir agregações de docs + novos campos
6. [ ] Atualizar `StudentCard.tsx` — tags de documentos
7. [ ] Adicionar botões de ação admin no card (stages 3, 7, 8)
