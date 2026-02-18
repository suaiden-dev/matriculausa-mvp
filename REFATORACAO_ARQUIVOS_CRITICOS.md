# Tarefas de Refatoração - Arquivos Críticos

Identificamos os arquivos que excedem 1.500 linhas de código e necessitam de refatoração para garantir a manutenibilidade e escalabilidade do sistema.

---

### [REFACTOR] Admin Dashboard - Detalhes do Aluno
**Arquivo:** `AdminStudentDetails.tsx` (~6.500 linhas)
**Status:** Crítico
**Ação:**
- Extrair sub-componentes (Tabs de Documentos, Financeiro, Histórico).
- Criar hooks customizados para a lógica de busca e atualização de documentos.
- Isolar modais de edição em arquivos separados.

---

### [REFACTOR] School Dashboard - WhatsApp Connection
**Arquivo:** `WhatsAppConnection.tsx` (~4.370 linhas)
**Status:** Crítico
**Ação:**
- Separar lógica de integração com a API de mensagens.
- Extrair componentes de chat, lista de contatos e configurações em arquivos distintos.

---

### [REFACTOR] School Dashboard - Gestão de Alunos e Pagamentos
**Arquivos:** 
- `StudentDetails.tsx` (3.086 linhas)
- `SelectionProcess.tsx` (2.737 linhas)
- `PaymentManagement.tsx` (2.728 linhas)
**Ação:**
- Criar um diretório de componentes compartilhados para o Dashboard da Escola.
- Unificar tipos e interfaces em arquivo central.

---

### [REFACTOR] Componentes de UI e Modais
**Arquivos:**
- `DocumentRequestsCard.tsx` (2.918 linhas)
- `StudentApplicationsView.tsx` (2.375 linhas)
- `ScholarshipBrowser.tsx` (2.200 linhas)
**Ação:**
- Quebrar os grandes cards de UI em componentes atômicos.
- Mover lógica de filtragem complexa (Search/Filters) para hooks especializados.

---

### [REFACTOR] Student & Seller Dashboards
**Arquivos:**
- `MyApplications.tsx` (2.089 linhas)
- `SellerDashboard/StudentDetails.tsx` (2.459 linhas)
- `ApplicationChatPage.tsx` (1.804 linhas)
**Ação:**
- Simplificar as páginas separando a visualização da lógica de estado.
