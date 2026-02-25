# Tarefas de Refatoração - Arquivos Críticos

Identificamos os arquivos que excedem 1.500 linhas de código e necessitam de refatoração para garantir a manutenibilidade e escalabilidade do sistema.

---

### 🔥 Arquivos Prioritários

| Arquivo | Linhas | Severidade | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| `pt.json` / `en.json` | 4000+ | **CRÍTICO** | Dividir em namespaces (`student.json`, `admin.json`, etc). |
| `AdminStudentDetails.tsx` | 6596 | **OBSOLETO** | Deletar arquivo (já migrado para a versão refatorada). |
| `AdminStudentDetails.refactored.tsx` | 3114 | **ALTA** | Extrair lógica financeira para `utils` e quebrar em sub-componentes. |
| `WhatsAppConnection.tsx` | 4370 | **CRÍTICO** | Separar lógica de API de UI e quebrar em componentes de chat. |
| `StudentDetails.tsx` (School) | 3086 | **ALTA** | Extrair seções de documentos e histórico. |
| `DocumentRequestsCard.tsx` | 2918 | **ALTA** | Componentizar os tipos de requests. |
| `SelectionProcess.tsx` | 2737 | **ALTA** | Mover lógica de workflow para um hook customizado. |
| `PaymentManagement.tsx` | 2728 | **ALTA** | Isolar tabelas e filtros. |

---

### [REFACTOR] Admin Dashboard - Detalhes do Aluno
**Ações Planejadas:**
- Deletar o arquivo `AdminStudentDetails.tsx` original.
- Renomear `AdminStudentDetails.refactored.tsx` para `AdminStudentDetails.tsx`.
- Extrair sub-componentes (Tabs de Documentos, Financeiro, Histórico).
- Criar hooks customizados para a lógica de busca e atualização de documentos.
- Isolar modais de edição em arquivos separados.

---

### [REFACTOR] School Dashboard - WhatsApp Connection
**Ação:**
- Separar lógica de integração com a API de mensagens.
- Extrair componentes de chat, lista de contatos e configurações em arquivos distintos.

---

### [REFACTOR] Gestão de Alunos e Pagamentos
**Ação:**
- Criar um diretório de componentes compartilhados para o Dashboard da Escola.
- Unificar tipos e interfaces em arquivo central.

---

### [REFACTOR] Componentes de UI e Modais
**Ação:**
- Quebrar os grandes cards de UI em componentes atômicos.
- Mover lógica de filtragem complexa (Search/Filters) para hooks especializados.

---

### [REFACTOR] Student & Seller Dashboards
**Ação:**
- Simplificar as páginas separando a visualização da lógica de estado.
- Sincronizar padrões de UI entre os diferentes Dashboards.
