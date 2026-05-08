# Relatório de Sessão — Matricula USA MVP
**Data:** 07/05/2026  
**Branch:** `fix-kanbans`

---

## 1. Kanban — Cores por Ator

### Problema
As colunas do Kanban não diferenciavam visualmente quem é responsável pela ação em cada etapa (aluno, admin ou ambos).

### Solução
- Adicionado campo `actor: 'student' | 'admin' | 'both'` à interface `ApplicationFlowStage` em `src/utils/applicationFlowStages.ts`
- Cada stage recebeu seu `actor`:
  - `student`: selection_fee, apply, bdp_collection, start_admission, application_fee, placement_fee, reinstatement_fee, university_docs, i20_fee
  - `admin`: review, docs_approval, send_docs_to_university, receive_acceptance_letter, send_acceptance_letter, sevis_transfer, visa_approval, enrollment
  - `both`: student_sends_letter
- **`src/components/AdminDashboard/KanbanColumn.tsx`**: header das colunas agora muda de cor conforme o ator:
  - `student` → fundo branco `bg-white`
  - `admin` → azul `bg-blue-50 border-blue-200`
  - `both` → roxo `bg-purple-50 border-purple-200`
  - `dropped` → vermelho `bg-red-50`

---

## 2. Kanban — Legenda de Cores

### Problema
Sem referência visual para o admin entender o significado das cores.

### Solução
- **`src/components/AdminDashboard/StudentApplicationsKanbanView.tsx`**: adicionada legenda ao lado do botão de refresh com quadradinhos coloridos: Student / Admin / Both
- Coluna "Registered" recebeu `actor: 'student'`, coluna "Dropped" recebeu `actor: 'admin'`

---

## 3. Kanban — Ocultar Filtros

### Problema
Filtros "Show only students who used BLACK coupon" e "Show Current Students Scholarship" poluíam a interface.

### Solução
- **`src/components/AdminDashboard/StudentApplicationsView.tsx`**: checkboxes comentados com `{/* */}`

---

## 4. Kanban — Ocultar Tag de Quantidade de Aplicações

### Problema
A tag com total de aplicações do aluno aparecia em todas as etapas, inclusive nas finais onde não faz sentido.

### Solução
- **`src/components/AdminDashboard/StudentCard.tsx`**: tag `total_applications` ocultada a partir do stage `application_fee` em diante (lista de stages excluídos hardcoded na condição)

---

## 5. Aprovação de Documentos no Modal (Admin)

### Problema
Admin precisava fechar o visualizador de documento, voltar à lista e clicar Approve/Reject separadamente. Após aprovar, a página recarregava com `window.location.reload()`.

### Solução
- **`src/components/DocumentViewerModal.tsx`**: adicionados props opcionais `uploadId`, `uploadStatus`, `onApprove`, `onReject`, `isApproving`, `isRejecting`
  - `canApproveReject` computed: só mostra botões se status for `under_review` ou `pending`
  - Botão **Approve** (verde) no header do modal
  - Botão **Reject** (vermelho) abre textarea inline para motivo → "Confirm Reject"
  - Após ação: fecha modal automaticamente
- **`src/hooks/useDocumentRequestHandlers.ts`**: adicionado 6º parâmetro `onSuccess?: () => void`
  - `handleApproveDocumentRequest`: substituiu `window.location.reload()` por `onSuccess?.()`
  - `handleRejectDocumentRequest`: idem
- **`src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`**:
  - Estados `previewUploadId` e `previewUploadStatus` adicionados
  - `handleOnViewDocument` salva `doc.id` e `doc.status`
  - `DocumentViewerModal` recebe `uploadId`, `uploadStatus`, `onApprove`, `onReject`
  - `onSuccess` chama `studentDetailsQuery.refetch()`

---

## 6. Fix — Redirect Após Pagamento i539_cos_package (Stripe)

### Problema
Após pagar o pacote i539 via Stripe, o aluno era redirecionado para `/student/onboarding?step=completed&fee_type=i539_cos_package`, caindo em tela em branco (switch sem case `completed`).

### Causa
`orderedSteps` contém `'completed'` após `'my_applications'`. Após confirmação do pagamento, o código avançava para `nextStep = 'completed'` que não tinha handler.

### Solução
- **`src/pages/StudentOnboarding/StudentOnboarding.tsx`**: adicionado early return no bloco de verificação Stripe para package fees (`ds160_package` e `i539_cos_package`): permanece em `my_applications` sem avançar.

---

## 7. Upload de Documentos — Auto-upload com Send All (Iterações)

### Histórico de decisões
1. **Tentativa 1**: botão "Send All" fixo no rodapé — selecionava todos os arquivos e enviava de uma vez
2. **Tentativa 2**: auto-upload ao selecionar arquivo — rejeitado pelo usuário pois o aluno poderia sair da página
3. **Decisão final**: auto-upload implementado + upload resumível via TUS

### Send All (implementado e depois evoluído para TUS)
- **`src/components/DocumentRequestsCard.tsx`**:
  - `handleSendUpload` passou a aceitar `fileOverride?: File`
  - INSERT em `document_request_uploads` usa `.select('id').single()` para capturar o ID
  - Substituído `fetchRequests()` pós-upload por **optimistic state update** (evita 4 queries e flash na tela)
  - Transfer Form: `handleStudentUploadTransferForm` também aceita `fileOverride?: File`
  - `onChange` do input dispara upload direto (auto-upload)

---

## 8. Upload Resumível — TUS Protocol

### Problema
Uploads one-shot falham silenciosamente no mobile quando o aluno sai da página ou o app vai para background. Uploads lentos sem feedback de progresso.

### Solução
- **Instalado**: `tus-js-client` + `@types/tus-js-client`
- **Criado `src/hooks/useResumableUpload.ts`**:
  - Upload via protocolo TUS (chunked, `chunkSize: 6MB`)
  - `retryDelays: [0, 3s, 5s, 10s, 20s]` — retry automático com backoff
  - Fingerprint em `localStorage` → se o aluno sair e voltar, upload retoma do ponto exato
  - `onBeforeRequest`: token OAuth renovado em cada chunk (cobre sessões longas)
  - `beforeunload`: aviso no browser ao tentar fechar durante upload ativo
  - `visibilitychange`: retoma automaticamente quando app volta ao foreground no mobile
- **`src/components/DocumentRequestsCard.tsx`**:
  - As 2 chamadas `supabase.storage.upload()` substituídas por `startUpload(key, file, filePath)`
  - Label mostra `XX%` durante upload
  - Progress bar slim (1px verde) abaixo do label durante upload
  - Endpoint TUS: `${VITE_SUPABASE_URL}/storage/v1/upload/resumable`

---

## 9. Fix — Botões Approve/Reject não apareciam no Modal

### Causa
`GlobalDocumentRequestsSection.tsx` passava ao `onViewDocument` apenas `{ file_url, filename }` — sem `id` e `status`. Com isso, `canApproveReject` era sempre `false`.

### Solução
- **`src/components/AdminDashboard/StudentDetails/GlobalDocumentRequestsSection.tsx`**: spread `...studentUpload` no objeto passado ao `onViewDocument`, incluindo `id` e `status`

---

## 10. Fix — Status não atualizava após Approve/Reject

### Causa 1 — Reject não chamava onSuccess
`handleRejectDocumentRequest` tinha `// window.location.reload()` comentado mas nunca chamava `onSuccess?.()`.

### Causa 2 — documentRequests é state separado
`onSuccess` chamava `studentDetailsQuery.refetch()`, mas `documentRequests` é um `useState` separado — não derivado da query do estudante. O refetch não atualizava a lista de documentos.

### Causa 3 — Scroll para o topo
O `studentDetailsQuery.refetch()` causava re-render completo da página, resetando o scroll.

### Soluções
- **`src/hooks/useDocumentRequestHandlers.ts`**:
  - `handleRejectDocumentRequest`: adicionado `onSuccess?.()` e `onSuccess` nas deps do `useCallback`
  - Ambos os handlers (approve + reject): **optimistic update** no `documentRequests` state — apenas o upload afetado é mutado via `.map()`, sem re-fetch completo
- **`src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`**: removido `studentDetailsQuery.refetch()` do `onSuccess` (desnecessário após optimistic update)

---

## 11. Fix — Notificação in-app falhava com 400

### Causa
`uploaded_by` em `document_request_uploads` armazena `user_profiles.id`, mas a query buscava com `.eq('user_id', uploadData.uploaded_by)` — campo errado. `finalStudentId` ficava `null` → Edge Function retornava `400: student_id is required`.

### Solução
- **`src/hooks/useDocumentRequestHandlers.ts`**:
  - Corrigido para `.eq('id', uploadData.uploaded_by)`
  - `finalStudentId` usa diretamente `uploadData.uploaded_by` como fallback (sem 2ª query desnecessária)
  - Aplicado em `handleApproveDocumentRequest` e `handleRejectDocumentRequest`

---

## 12. Scroll — Retorno ao Documento Aprovado

### Problema
Após fechar o modal de aprovação, a página voltava ao topo. Admin precisava rolar manualmente até o documento que acabou de aprovar.

### Causa
Ao fechar o modal, o browser movia o foco para `document.body` (comportamento padrão quando um modal fecha sem gestão de foco), causando scroll ao topo.

### Solução
- Adicionado `data-upload-id={upload.id}` nos cards de upload em:
  - `src/components/AdminDashboard/StudentDetails/GlobalDocumentRequestsSection.tsx`
  - `src/components/EnhancedStudentTracking/DocumentsView.tsx`
- **`src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`** — `onClose` do modal:
  - Captura `previewUploadId` antes de limpar o state
  - Após 50ms: `document.querySelector('[data-upload-id="..."]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })`
  - Admin é levado suavemente de volta ao documento exato que aprovou/rejeitou

---

## 13. Validação de Senha — Suporte a Senhas Apple/Safari

### Problema
O iCloud Keychain sugeria senhas como `micpaC-texty8-gyczad` (com hífens), mas a validação do frontend rejeitava com "apenas letras, números e @#$! são permitidos".

### Causa
Regex restritiva: `/^[A-Za-z0-9@#$!]+$/` em `Auth.tsx` e `SellerRegistration.tsx`.

### Solução
- Regex substituída por `/[\x00-\x1F\x7F]/` — rejeita apenas caracteres de controle, permite qualquer imprimível (hífens, pontos, underscores, etc.)
- Adicionado limite máximo de **20 caracteres** para novas senhas (Apple gera exatamente 20)
- `maxLength={20}` nos inputs de senha e confirmar senha do formulário de registro
- Login **não afetado** — usuários com senhas antigas continuam entrando normalmente
- Arquivos alterados: `src/pages/Auth.tsx`, `src/pages/SellerRegistration.tsx`
- `QuickRegistration.tsx` já não tinha restrição de caracteres

---

## Arquivos Modificados (Resumo)

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/utils/applicationFlowStages.ts` | Campo `actor` adicionado a todos os stages |
| `src/components/AdminDashboard/KanbanColumn.tsx` | Cores de header por ator |
| `src/components/AdminDashboard/StudentApplicationsKanbanView.tsx` | Legenda de cores |
| `src/components/AdminDashboard/StudentApplicationsView.tsx` | Filtros comentados |
| `src/components/AdminDashboard/StudentCard.tsx` | Tag de aplicações ocultada após start_admission |
| `src/components/DocumentViewerModal.tsx` | Botões Approve/Reject no modal |
| `src/components/DocumentRequestsCard.tsx` | Auto-upload, TUS, optimistic update |
| `src/components/AdminDashboard/StudentDetails/GlobalDocumentRequestsSection.tsx` | Fix spread do upload + data-upload-id |
| `src/components/EnhancedStudentTracking/DocumentsView.tsx` | data-upload-id nos cards |
| `src/hooks/useDocumentRequestHandlers.ts` | onSuccess, optimistic update, fix uploaded_by |
| `src/hooks/useResumableUpload.ts` | **Novo** — hook TUS resumable upload |
| `src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx` | previewUploadId, scroll restore, onClose |
| `src/pages/StudentOnboarding/StudentOnboarding.tsx` | Fix redirect i539_cos_package |
| `src/pages/Auth.tsx` | Validação de senha, maxLength 20 |
| `src/pages/SellerRegistration.tsx` | Validação de senha, maxLength 20 |
| `package.json` | Adicionado `tus-js-client` |
