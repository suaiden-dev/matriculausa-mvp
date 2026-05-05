# Relatório Técnico — 04/05/2026

## Contexto

Report recebido via suporte: aluna Barbara Sens (COS student, placement fee flow) não conseguia visualizar o passo "Control Fee" (I-539) como pagável no dashboard. Adicionalmente, campo de I-20 não aparecia na seção de documentos.

---

## Bug 1 — Control Fee (I-539) bloqueado no dashboard da aluna

### Sintoma
Passo "CONTROL FEE" aparecia como "LIBERAÇÃO EM ANDAMENTO" (desabilitado) mesmo a carta de aceite já tendo sido enviada pelo admin.

### Diagnóstico

Executadas queries diagnósticas no Supabase Dashboard:

```sql
-- Encontrar a aluna
SELECT up.id, up.user_id, up.full_name, up.student_process_type,
       up.placement_fee_flow, up.has_paid_i20_control_fee,
       up.selected_application_id
FROM user_profiles up
WHERE up.full_name ILIKE '%barbara%';

-- Ver todas as aplicações
SELECT sa.id, sa.status, sa.student_process_type,
       sa.acceptance_letter_url, sa.acceptance_letter_status
FROM scholarship_applications sa
JOIN user_profiles up ON sa.student_id = up.id
WHERE up.full_name ILIKE '%barbara%';
```

**Resultado:**

| Campo | Valor |
|---|---|
| `user_id` | `d97c6bed-92bc-4baa-922f-a0a29d63186f` |
| `student_process_type` | `change_of_status` ✓ |
| `placement_fee_flow` | `true` |
| `selected_application_id` | `12912f52-f9ad-49ef-879e-662b99c42210` ← **errado** |

A aluna tinha 5 aplicações. A carta de aceite estava na aplicação `09ffd73a` (status: `enrolled`, `acceptance_letter_url` preenchida), mas o `selected_application_id` apontava para `12912f52` (status: `approved`, `acceptance_letter_url = null`).

### Causa Raiz

Em `UniversityDocumentsStep.tsx`, o dashboard busca a aplicação via `selected_application_id`:

```typescript
// UniversityDocumentsStep.tsx:376
if (selectedId) {
    query = query.eq('id', selectedId); // buscava a aplicação errada
}
```

A variável `isAcceptanceReady` ficava `false` porque `acceptance_letter_url` retornava `null`:

```typescript
const isAcceptanceReady = !!applicationDetails?.acceptance_letter_url || applicationDetails?.status === 'enrolled';
// false → aba I-539 fica disabled
```

### Correção (SQL)

```sql
UPDATE user_profiles
SET selected_application_id = '09ffd73a-e3c8-47be-b6d9-c4ad74fea6f5'
WHERE user_id = 'd97c6bed-92bc-4baa-922f-a0a29d63186f';
```

---

## Feature — Campo de upload de I-20 para alunos COS

### Motivação

Alunos Change of Status precisam receber o I-20 emitido pela universidade através da plataforma, de forma análoga ao Transfer Form enviado para alunos transfer. Não existia campo dedicado para isso.

### Arquitetura implementada

Seguindo exatamente o padrão do `TransferFormSection` / `useTransferForm`.

---

### Arquivo 1 — Migration

**`project/supabase/migrations/20260504000000_add_cos_i20_document_fields.sql`**

```sql
ALTER TABLE scholarship_applications
  ADD COLUMN IF NOT EXISTS i20_document_url TEXT,
  ADD COLUMN IF NOT EXISTS i20_document_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS i20_document_sent_at TIMESTAMPTZ;
```

Campos adicionados à tabela `scholarship_applications`:

| Coluna | Tipo | Default |
|---|---|---|
| `i20_document_url` | `TEXT` | `null` |
| `i20_document_status` | `TEXT` | `'pending'` |
| `i20_document_sent_at` | `TIMESTAMPTZ` | `null` |

---

### Arquivo 2 — Componente Admin

**`project/src/components/AdminDashboard/StudentDetails/CosI20Section.tsx`**

Componente React exibido na aba de documentos do admin quando `student_process_type === 'change_of_status'`.

**Funcionalidades:**
- Admin seleciona arquivo PDF do I-20
- Upload para Supabase Storage em `{user_id}/i20-documents/{timestamp}_{filename}` no bucket `document-attachments`
- Atualiza `scholarship_applications` com `i20_document_url`, `i20_document_status = 'sent'`, `i20_document_sent_at`
- Exibe arquivo já enviado com botões View / Download / Replace
- Busca a aplicação COS correta priorizando: `enrolled` > tem URL > `application_fee_paid` > primeira

**Lógica de seleção de aplicação:**
```typescript
const getCosApplication = () => {
    const apps = student?.all_applications?.filter(app =>
        app.student_process_type === 'change_of_status'
    ) || [];
    return apps.find(app => app.status === 'enrolled')
        || apps.find(app => app.i20_document_url)
        || apps.find(app => app.is_application_fee_paid)
        || apps[0];
};
```

---

### Arquivo 3 — Admin StudentDetails

**`project/src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`**

Adicionado import e renderização condicional:

```tsx
import { CosI20Section } from '../../components/AdminDashboard/StudentDetails/CosI20Section';

// Na aba de documentos, acima do TransferFormSection:
{student?.student_process_type === 'change_of_status' && (
    <CosI20Section
        student={student}
        isPlatformAdmin={isPlatformAdmin}
        onRefresh={() => studentDetailsQuery.refetch()}
        handleViewDocument={handleOnViewDocument}
        handleDownloadDocument={handleDownloadDocument}
    />
)}
```

---

### Arquivo 4 — Dashboard do Aluno

**`project/src/pages/StudentOnboarding/components/UniversityDocumentsStep.tsx`**

**Adições:**

1. Novo tipo de tab: `'i20_document'`

2. Flags de visibilidade:
```typescript
const showI20DocumentTab = studentProcessType === 'change_of_status';
const i20DocumentAvailable = !!applicationDetails?.i20_document_url;
```

3. Novo step na sidebar (exibido apenas para COS):
```typescript
...(showI20DocumentTab ? [{
    id: 'i20_document',
    title: 'I-20 Document',
    status: i20DocumentAvailable ? 'documentAvailable' : 'inProgress',
    variant: i20DocumentAvailable ? 'success' : 'info',
    disabled: !i20DocumentAvailable
}] : []),
```

4. Novo tab content: card de download quando disponível, mensagem "Pending" enquanto aguarda.

---

## Resumo de arquivos alterados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `migrations/20260504000000_add_cos_i20_document_fields.sql` | Novo | Colunas I-20 em `scholarship_applications` |
| `components/AdminDashboard/StudentDetails/CosI20Section.tsx` | Novo | Seção admin para upload do I-20 |
| `pages/AdminDashboard/AdminStudentDetails.refactored.tsx` | Modificado | Import + render `CosI20Section` |
| `pages/StudentOnboarding/components/UniversityDocumentsStep.tsx` | Modificado | Step + tab I-20 para COS students |

---

## Pendências

- [ ] Rodar migration no Supabase Dashboard
- [ ] Fix de `selected_application_id` da Barbara Sens (SQL acima)
- [ ] Avaliar adicionar `CosI20Section` nas outras páginas admin que usam `TransferFormSection` (`SellerDashboard`, `SchoolDashboard`, `AffiliateAdminDashboard`)
- [ ] Avaliar notificação in-app/email ao aluno quando admin faz upload do I-20 (padrão do transfer form)
