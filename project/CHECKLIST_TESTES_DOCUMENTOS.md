# Checklist de Testes — Fluxo de Documentos (Passport Only)

> Execute com o usuário de teste `stiliyan8277@uorak.com`.  
> Marque ✅ passou / ❌ falhou / ⚠️ comportamento inesperado.

---

## BLOCO 1 — Onboarding Step 3 (Upload de Documento)

### 1.1 — Formulário exibe apenas Passport

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 1 | Abrir onboarding Step 3 como aluno novo | Aparece **apenas** o campo Passport. Não aparecem campos de Diploma nem Bank Statement | |
| 2 | Inspecionar a tela | Nenhuma menção a "High School Diploma" ou "Proof of Funds" como campo de upload obrigatório | |

### 1.2 — Validação do botão de submit

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 3 | Não selecionar nenhum arquivo e tentar submeter | Botão "Upload Documents" está **desabilitado** | |
| 4 | Selecionar apenas o arquivo de Passport | Botão fica **habilitado** | |

### 1.3 — Overlay durante upload

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 5 | Clicar em Upload com Passport selecionado | Aparece overlay de upload (spinner simples Loader2) | |
| 6 | Após o upload concluir | Aparece overlay de análise com **animação de lupa** + mensagem "Analisando..." | |
| 7 | Overlay desaparece | Aluno vê a tela de revisão de aplicações (locked state) | |

### 1.4 — Estado pós-upload no banco

> Verificar via Supabase MCP após submissão.

| # | O que verificar | Resultado esperado | Status |
|---|-----------------|--------------------|----|
| 8 | `user_profiles.documents_uploaded` | `true` | |
| 9 | `user_profiles.documents_status` | `under_review` | |
| 10 | `student_documents` — tipos inseridos | Apenas **1 linha** com `type = 'passport'` | |
| 11 | `scholarship_applications.documents` JSONB | Array com **apenas** `{type: "passport", ...}`. Sem diploma nem funds_proof | |

---

## BLOCO 2 — Re-upload de Passport

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 12 | Na locked view, clicar em "Re-upload Passport" | Formulário de upload aparece novamente (isLocked = false) | |
| 13 | Fazer upload de um novo passport | Novo registro em `student_documents`. JSONB atualizado com histórico preservado | |
| 14 | Após re-upload | Volta para locked view automaticamente | |

---

## BLOCO 3 — Admin Platform — Aprovação de Documentos

> Logar como admin platform e abrir o student detail de `stiliyan8277@uorak.com`.

### 3.1 — StudentDocumentsCard

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 15 | Abrir student detail | Card "Documents" mostra apenas **Passport**. Sem campos de Diploma/Funds Proof | |
| 16 | Passport com status `under_review` | Botão "Approve" e "Reject" visíveis para o documento | |
| 17 | Clicar em Approve no Passport | Status muda para `approved` | |

### 3.2 — Application Approval

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 18 | Com passport `approved`, verificar seção "Application Approval" | Mensagem: "All documents are approved. You can now approve this application." | |
| 19 | Botão "Approve Application" | **Habilitado** (não está mais bloqueado por falta de diploma/funds_proof) | |
| 20 | Clicar em "Approve Application" | Aplicação muda para status `approved` | |
| 21 | Com passport ainda `under_review` | Botão "Approve Application" **desabilitado** + mensagem "All documents must be approved" | |

---

## BLOCO 4 — School Admin — Aprovação

> Logar como admin da universidade (Caroline ou Oikos).

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 22 | Abrir student detail no painel da universidade | Docs exibem apenas Passport | |
| 23 | Clicar em Approve Application com passport approved | **Sem confirmation dialog** de diploma/funds_proof. Aprovação segue normalmente | |
| 24 | Clicar em Approve Application com passport `under_review` | Aparece confirm: "Passport is not yet approved. Do you want to approve anyway?" | |

---

## BLOCO 5 — Global Document Requests (Diploma + Bank Statement)

> No student dashboard do aluno.

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 25 | Abrir student dashboard após upload do passport | Card "Document Requests" exibe: "High School Diploma" e "Bank Statement / Proof of Funds" | |
| 26 | Esses dois docs aparecem para universidades Caroline E Oikos | Sim — `university_id = NULL` (global) cobre todas | |
| 27 | Fazer upload do High School Diploma via Document Requests | Upload bem-sucedido, status muda para "under_review" | |

---

## BLOCO 6 — Kanban (Admin)

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 28 | Abrir Kanban de aplicações | Coluna "Passport Collection" (não mais "BDP Collection") | |
| 29 | Hover no tooltip da coluna | Exibe "Pending: Passport upload" | |
| 30 | Aluno com passport uploaded aparece no Kanban | Avança da coluna Passport Collection para a próxima | |

---

## BLOCO 7 — Backward Compat (Alunos Históricos)

> Usar um aluno antigo que tem diploma e funds_proof no JSONB.

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 31 | Abrir student detail de aluno histórico | Card Documents mostra Passport + Diploma + Funds Proof (dados históricos visíveis) | |
| 32 | Botões Approve/Reject disponíveis para diploma e funds_proof históricos | Sim — whitelist mantida para backward compat | |
| 33 | canApprove para aluno histórico com os 3 aprovados | Botão "Approve Application" habilitado | |

---

## BLOCO 8 — AdminScholarshipSelection

| # | Ação | Resultado esperado | Status |
|---|------|--------------------|--------|
| 34 | Admin abre seção "Submit required documents" de uma aplicação | Aparece **apenas** o campo de Passport para upload | |
| 35 | Sem campos de Diploma ou Funds Proof | Confirmado | |

---

## Resultado Final

| Bloco | Passou | Falhou | Observações |
|-------|--------|--------|-------------|
| 1 — Onboarding Upload | /7 | /7 | |
| 2 — Re-upload | /3 | /3 | |
| 3 — Admin Approval | /7 | /7 | |
| 4 — School Admin | /3 | /3 | |
| 5 — Global Doc Requests | /3 | /3 | |
| 6 — Kanban | /3 | /3 | |
| 7 — Backward Compat | /3 | /3 | |
| 8 — AdminScholarshipSelection | /2 | /2 | |
| **Total** | **/31** | **/31** | |
