# Relatório de Desenvolvimento — 28/05/2026

---

## 1. Alteração Cadastral e Resolução do Erro de Login (Victor de Oliveira Campos)

### Problema
O usuário Victor de Oliveira Campos (`user_id: 7f97afe0-89f3-42af-92c8-d2db47bb0d41`) solicitou a alteração do seu e-mail de `josandrarecovered@gmail.com` para `vdcampos03@gmail.com` e telefone para `+18134748373`.
Após uma primeira tentativa de atualização no banco, o usuário não conseguia logar, deparando-se com a mensagem **"Login Failed: Invalid email or password"**.

### Causa Raiz
A tabela de identidades de autenticação do Supabase (`auth.identities`) armazena os dados do provedor de login em um campo JSONB chamado `identity_data`. A primeira query falhou ao tentar atualizar a coluna gerada `email` diretamente. Como o e-mail no objeto JSONB continuava como o antigo, o Supabase Auth não encontrava o usuário ao tentar efetuar o login com o novo e-mail.

### Solução Aplicada
Executamos uma transação SQL corretiva diretamente via MCP no Postgres do Supabase para atualizar todas as referências:

- **`auth.identities`**: Atualizado o objeto JSONB `identity_data` com o novo e-mail (`vdcampos03@gmail.com`), telefone (`+18134748373`) e configurado `email_verified: true` (forçando a atualização da coluna gerada `email`).
- **`auth.users`**: Sincronizado o e-mail, telefone e o JSONB de metadados do usuário (`raw_user_meta_data`).
- **`public.user_profiles`**: Atualizado o e-mail e telefone públicos.

**Status:** Resolvido e validado. Login liberado para o novo e-mail e telefone utilizando a mesma senha original.

---

## 2. Correção de Loops de Erro e Travamento de Página (Crash Loops)

### Problemas no Dashboard do Estudante (`ApplicationChatPage.tsx`)
Ao acessar a página de chat da aplicação (`/student/dashboard/application/:applicationId/chat`), a tela entrava em um estado de recarregamento infinito ("piscando" continuamente).

### Causas Identificadas
1. **Erro de Tradução (`i18n`):** O código tentava ler `i18n.language`, mas a instância `i18n` não havia sido desestruturada do hook `useTranslation`. Isso gerava um erro de execução do React.
2. **Coluna Inexistente na Query:** A query de busca do prazo da taxa de matrícula (`fetchScholarshipFeeDeadline`) tentava selecionar `is_placement_fee_paid` da tabela `scholarship_applications`, mas essa coluna pertence à tabela `user_profiles`. O banco retornava erro `400 Bad Request`.
3. **Comportamento Recursivo do Error Boundary:** O `GlobalErrorBoundary.tsx` capturava o erro da página de chat, mas continuava tentando renderizar os componentes filhos (`this.props.children`). Como os filhos estavam quebrados, causava um crash infinito no React que forçava HMR (Hot Module Replacement) e recarregamento da aba inteira do navegador.

### Soluções Aplicadas

#### A. Estabilização do `GlobalErrorBoundary.tsx`
- Modificado o método `render()` para interromper a renderização dos componentes filhos quebrados quando um erro for detectado (`this.state.hasError === true`).
- Desenvolvido um layout premium com **Glassmorphism**, fundo gradiente HSL escuro e micro-animação para avisar do erro.
- Adicionados botões funcionais para recarregar a página ou voltar ao painel inicial.
- Adicionado um console colapsável mono-espaçado exibindo os detalhes técnicos do erro para auxiliar em depurações futuras.

#### B. Correções na Página de Chat (`ApplicationChatPage.tsx`)
- **Tradução:** Desestruturada a variável `i18n` corretamente:
  ```typescript
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  ```
- **Query Otimizada:** Removida a requisição SQL desnecessária ao banco de dados para buscar a taxa. O sistema agora lê a informação diretamente do estado global do perfil (`userProfile` do hook `useAuth`), eliminando a chamada de rede defeituosa.

---

## 3. Implementação de Guarda de Redirecionamento (Onboarding Guard)

### Problema
Estudantes que não concluíram o preenchimento de suas informações básicas e questionários (onboarding pendente) podiam acessar diretamente links internos do chat e do dashboard, resultando em dados incompletos ou erros de interface.

### Solução Aplicada
- Adicionada uma proteção (guard) no ciclo de vida (`useEffect`) do `ApplicationChatPage.tsx`:
  ```typescript
  if (userProfile && userProfile.onboarding_completed === false) {
    navigate('/student/onboarding');
    return;
  }
  ```
- **Comportamento:** Agora, qualquer estudante com perfil ativo cuja coluna `onboarding_completed` seja falsa é automaticamente redirecionado com segurança para a página `/student/onboarding`.

---

## 4. Fix — Banner "Ação Necessária: Documentos Pendentes" aparecendo indevidamente

### Problema
O banner "Ação Necessária: Documentos Pendentes" continuava aparecendo no dashboard do aluno mesmo quando todos os documentos estavam aprovados. Identificado no caso da aluna **Vitoria Spindula** na **Universidade Teste 3**.

### Root Cause (2 problemas)
1. **Requests com `status = 'closed'`** eram contados como pendentes — o `hasPendingUploads` useMemo não filtrava requests fechados.
2. **Filtro `applicable_student_types` não funcionava** — os campos `is_global`, `applicable_student_types`, `applicable_scholarship_levels` e `hidden_for_students` **não eram buscados** na query do Supabase (faltavam no `.select()`), então as condições de filtragem sempre retornavam `false`.

### Correções

**Arquivo:** `src/pages/StudentOnboarding/components/UniversityDocumentsStep.tsx`

- **Query select expandida:**
  ```ts
  // Antes:
  .select('id, title, status, document_request_uploads(status, uploaded_by)')
  // Depois:
  .select('id, title, status, is_global, applicable_student_types, applicable_scholarship_levels, hidden_for_students, document_request_uploads(status, uploaded_by)')
  ```

- **Filtros adicionados no `hasPendingUploads` useMemo:**
  ```ts
  documentRequests.forEach(req => {
      if ((req.status || '').toLowerCase() === 'closed') return;  // Ignora fechados
      if (req.is_global && Array.isArray(req.applicable_student_types) && ...) {
          if (!types.includes('all') && !types.includes(studentProcessType)) return;  // Ignora tipos não aplicáveis
      }
      // ... lógica existente
  });
  ```

- Adicionado `studentProcessType` como dependência do useMemo.

---

## 5. Fix — Global Document Requests — High School Diploma não aparecendo para Universidade Teste 3

### Problema
O documento "High School Diploma" (Global Document Request) não aparecia para alunos da Universidade Teste 3 com nível de bolsa `doctorate`.

### Root Cause
O campo `applicable_scholarship_levels` do registro estava configurado apenas para `["undergraduate"]`, excluindo alunos de `doctorate`.

### Correção
**Via MCP Supabase (SQL direto):**
```sql
UPDATE document_requests
SET applicable_scholarship_levels = ARRAY['undergraduate','graduate','doctorate']
WHERE id = '7f111465-b3da-46fd-bfcf-152e025deeb0';
```

---

## 6. Fix — MyApplications — Botão "Continuar Aplicação" para alunos enrolled

### Problema
Alunos com status `enrolled` ainda viam o botão "Continuar Aplicação" no card da aplicação.

### Correção

**Arquivo:** `src/pages/StudentDashboard/MyApplications.tsx`

- O `actionLabel` agora é condicional:
  ```tsx
  actionLabel={application.status === 'enrolled' ? 'Aplicação Finalizada' : 'Continuar Aplicação'}
  ```

- Adicionalmente, o botão "Começar Processo" (estado vazio) agora detecta se o aluno já iniciou o onboarding e redireciona para o step correto:
  ```tsx
  const savedStep = userProfile?.onboarding_current_step;
  const hasStarted = !!(userProfile?.has_paid_selection_process_fee || (savedStep && savedStep !== 'selection_fee'));
  const onboardingUrl = (hasStarted && savedStep) ? `/student/onboarding?step=${savedStep}` : '/student/onboarding';
  // Botão: "Continuar Processo" (se started) ou "Começar Processo" (se não)
  ```

- Cards de aplicações aprovadas foram refatorados para usar o componente reutilizável `ScholarshipCardFull`, reduzindo ~230 linhas de código duplicado.

---

## 7. Kanban — Detecção de fluxo antigo (3 docs) vs novo (1 doc)

### Problema
No Kanban do admin, alunos do fluxo antigo precisavam enviar 3 documentos básicos (passport + diploma + funds_proof), mas o sistema contava apenas 1 (passport) como obrigatório para todos.

### Correção

**Arquivo:** `src/components/AdminDashboard/hooks/useStudentApplicationsQueries.ts`

```ts
// Detecção: se o aluno tem diploma ou funds_proof no JSONB → fluxo antigo
const allDocTypes = (lockedApplication?.documents || []).map((d: any) => d.type?.toLowerCase()).filter(Boolean);
const isOldFlow = allDocTypes.includes('diploma') || allDocTypes.includes('funds_proof');
const requiredBasicTypes = isOldFlow ? ['passport', 'diploma', 'funds_proof'] : ['passport'];
let basicDocsRequired = requiredBasicTypes.length;
```

Agora o Kanban mostra corretamente "3/3 docs" para alunos do fluxo antigo e "1/1 docs" para o novo.

---

## 8. StudentDocumentsCard — Informações de uploader e datas

### Problema
No card de documentos do admin, não havia indicação de **quem** enviou cada documento (student vs admin) nem **quando** exatamente.

### Correções

**Arquivo:** `src/components/AdminDashboard/StudentDetails/StudentDocumentsCard.tsx`

#### 8.1 — Hook `useDocumentUploaderMap` (novo)
**Arquivo:** `src/hooks/useDocumentUploaderMap.ts`

- Consulta `student_action_logs` onde `action_type = 'document_upload'`
- Constrói mapa `file_url → { by_type, by_name }` retroativamente
- Admin uploads são sempre logados com `metadata.file_url` → se URL está no mapa, é admin
- URLs não encontradas → inferidas como upload do aluno

#### 8.2 — Inferência de data via filename
```ts
const inferUploadDate = (url: string | undefined): string | undefined => {
  const match = filename.match(/_(\d{13})_/);  // Ex: "passport_1778604646049_name.pdf"
  if (match) return new Date(parseInt(match[1], 10)).toISOString();
  return undefined;
};
```

#### 8.3 — Linha de descrição dinâmica
```tsx
// "Uploaded by admin (Romeu Chimenti Neto) · May 26, 2026, 2:32 PM"
// ou "Submitted by Vitoria Spindula · May 12, 2026, 3:42 PM"
```

#### 8.4 — Admin uploads agora gravam uploader no JSONB
**Arquivo:** `src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`

Quando admin faz upload de documento, o entry agora inclui:
```ts
uploaded_by_type: 'admin',
uploaded_by_name: userProfile?.full_name || user?.email || 'Admin'
```

---

## 9. DocumentHistoryAccordion — Labels de data e informações de uploader

### Problema
O acordeão de histórico de documentos mostrava apenas uma data sem label, causando confusão: era a data de envio ou de rejeição?

### Correções

**Arquivo:** `src/components/DocumentHistoryAccordion.tsx`

- Interface `DocumentUpload` expandida com `rejected_at`, `approved_at`, `uploaded_by_name`, `uploaded_by_type`
- Datas agora exibem **labels separados**:
  ```tsx
  <span>Enviado: {formatDate(upload.uploaded_at)}</span>
  {upload.rejected_at && <span className="text-red-400">Rejeitado: {formatDate(upload.rejected_at)}</span>}
  {upload.approved_at && <span className="text-green-500">Aprovado: {formatDate(upload.approved_at)}</span>}
  ```
- Nome do uploader exibido no histórico (Student/Admin/University: Nome)

---

## 10. Fix — History entries perdendo `rejected_at` e `rejection_reason` ao reenviar

### Problema
Quando um aluno reenviava um documento, a entry antiga movida para o histórico perdia os campos `rejected_at` e `rejection_reason` — impossibilitando mostrar quando/por que foi rejeitado.

### Root Cause
No `DocumentsUploadStep.tsx`, o destructuring:
```ts
const { history: prevHistory = [], rejected_at: _ra, rejection_reason: _rr, ...oldDoc } = d;
```
Removia `rejected_at` e `rejection_reason` do objeto que era salvo no histórico.

### Correção

**Arquivo:** `src/pages/StudentOnboarding/components/DocumentsUploadStep.tsx`

```ts
// ANTES (bug): stripped rejected_at/rejection_reason do history entry
const { history: prevHistory = [], rejected_at: _ra, rejection_reason: _rr, ...oldDoc } = d;
history: [...prevHistory, { ...oldDoc, saved_at: now }]

// DEPOIS (fix): preserva todos os campos na history entry, doc novo é limpo
const { history: prevHistory = [], ...oldDocFull } = d;
const historyEntry = { ...oldDocFull, saved_at: now };
return { type, url: publicUrl, status: 'under_review', uploaded_at: now,
         uploaded_by_type: 'student', uploaded_by_name: ...,
         history: [...prevHistory, historyEntry] };
```

Aplicado nos **3 locais** de criação de doc entry no arquivo (linhas ~244, ~280, ~386).

---

## 11. Hook `useDocumentRejectionTimestamps` — Recuperação retroativa de datas de rejeição

### Problema
Entries de histórico antigas (antes do fix #10) não têm `rejected_at`. Os dados foram perdidos no JSONB, mas os timestamps existem nos `student_action_logs`.

### Solução

**Arquivo:** `src/hooks/useDocumentRejectionTimestamps.ts` (novo)

- Consulta `student_action_logs` onde `action_type = 'document_rejection'`
- Constrói mapa `docType → RejectionLogEntry[]` ordenado por `created_at` ASC
- Função `getRejectionForEntry(docType, uploadedAt, nextUploadAt)`:
  - Filtra logs que caem na janela temporal `(uploadedAt, nextUploadAt)`
  - Retorna o **último** log da janela (decisão final antes do reenvio)

**Integração no `StudentDocumentsCard.tsx`:**

```ts
// Para cada history entry sem rejected_at:
if (h.status === 'rejected' && !rejAt) {
  const fallbackRej = getRejectionForEntry(doc.type, uploadedAt, nextUploadAt);
  if (fallbackRej) {
    rejAt = fallbackRej.created_at;
    if (!rejReason) rejReason = fallbackRej.rejection_reason || null;
  }
}
```

**Nota:** Este é um fallback heurístico por correlação temporal. Funciona bem quando há 1 rejeição por ciclo de upload. Pode ser impreciso se o admin rejeitou múltiplas vezes o mesmo arquivo (ex: 3 rejeições em 4 minutos no May 12 para Vitoria) — nesses casos, usa a última rejeição da janela.

---

## 12. Auditoria — Installment Plans (criar/cancelar)

**Arquivo:** `src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`

### Criação de plano
- `created_by` agora é salvo na tabela `fee_installment_plans`
- Log de ação `installment_plan_created` com metadata: `fee_type`, `plan_id`, `total_amount`, `total_installments`, `installment_amounts`, `performed_by_role`

### Cancelamento de plano
- `cancelled_by` e `cancelled_at` agora são salvos na tabela
- Log de ação `installment_plan_cancelled` com metadata: `fee_type`, `plan_id`, parcelas pagas/total, valor pago

### Migration

**Arquivo:** `supabase/migrations/20260528000001_add_installment_audit_columns.sql`
```sql
ALTER TABLE fee_installment_plans
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
```

---

## 13. Validação Geral do Projeto

Após a execução de todas as correções de código, foram rodados os testes de compilação:
- **TypeScript Check:** Executado `npx tsc --noEmit --skipLibCheck` (concluído sem erros).
- **Build de Produção:** Executado `npm run dev` / `npm run build` (concluído com sucesso, sem quebras ou avisos de importações).

---

## Resumo de Arquivos Alterados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `GlobalErrorBoundary.tsx` | Fix | Interromper renderização de filhos quebrados + layout de erro premium |
| `ApplicationChatPage.tsx` | Fix | Crash loop i18n + query inexistente + onboarding guard |
| `UniversityDocumentsStep.tsx` | Fix | Banner pendentes + query select expandida |
| `MyApplications.tsx` | Fix/Refactor | Botão enrolled + redirect onboarding + ScholarshipCardFull |
| `useStudentApplicationsQueries.ts` | Fix | Kanban old/new flow detection |
| `StudentDocumentsCard.tsx` | Feature | Uploader info, datas, histórico com fallback retroativo |
| `DocumentHistoryAccordion.tsx` | Feature | Labels de data (Enviado/Rejeitado/Aprovado), uploader name |
| `DocumentsUploadStep.tsx` | Fix | Preservar rejected_at/rejection_reason no histórico + uploaded_by_type |
| `AdminStudentDetails.refactored.tsx` | Feature | Admin upload tracking, installment audit logs |
| `useDocumentUploaderMap.ts` | Novo | Hook para identificar quem fez upload |
| `useDocumentRejectionTimestamps.ts` | Novo | Hook para recuperar datas de rejeição retroativamente |
| `20260528000001_add_installment_audit_columns.sql` | Migration | Colunas de auditoria em fee_installment_plans |
