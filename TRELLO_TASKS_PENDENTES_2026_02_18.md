# Novas Tarefas para Trello - Pendentes (18 de Fevereiro de 2026)

Estas tarefas representam as funcionalidades que ainda precisam ser implementadas para completar o ciclo de atualizações planejado.

---

### [FEAT] Notificação e Recadastramento de Termos de Uso
**Descrição:**
Implementar o fluxo de "Re-aceite" para usuários que já aceitaram versões anteriores do contrato.
- **Trigger:** Identificar usuários cujo `terms_accepted_at` é anterior à última atualização do contrato.
- **Popup:** Ao logar, usuários afetados devem ver um popup bloqueante pedindo a leitura e aceite das novas cláusulas.
- **Email:** Disparo automático de e-mail informando sobre a atualização das políticas de privacidade e termos.

---

### [FEAT] Questionário Pós-Pagamento (Taxa de Processo Seletivo)
**Descrição:**
Criação de etapa de coleta de dados após a confirmação do pagamento.
- **Redirecionamento:** Após o sucesso no checkout, o aluno deve ser levado a um questionário específico.
- **Campos:** Definir perguntas estratégicas para o processo seletivo (ex: objetivos acadêmicos, disponibilidade, etc).
- **Backend:** Salvar as respostas em uma nova tabela ou campo `selection_survey_data` no perfil do usuário.

---

### [FEAT] Workflow: Implementação da Etapa de Processo Seletivo
**Descrição:**
Expandir o fluxo de aplicação para incluir a nova fase formal de seleção.
- **Status:** Adicionar o status `selection_process` à máquina de estados das aplicações.
- **UI Aluno:** Mostrar progresso visual na timeline do dashboard do estudante.
- **UI Admin:** Criar filtros específicos para visualizar candidatos que estão nesta etapa.

---

### [RULE] Bloqueio de Aprovação de Bolsa (Validação de Documentos)
**Descrição:**
Implementar regra de integridade no Dashboard do Admin para garantir conformidade documental.
- **Lógica:** O botão de "Aprovar Bolsa" (Approve Scholarship) deve ficar desabilitado/protegido se houver qualquer documento obrigatório que não esteja com o status `approved`.
- **Feedback:** Exibir um tooltip ou aviso explicando que a aprovação depende da validação prévia de todos os documentos anexados.

---

### [TEXT/UI] Atualização de Suporte Personalizado
**Descrição:**
Alterar frase institucional para foco no processo de matrícula.
- **De:** "receba suporte personalizado durante toda sua jornada para estudar nos EUA."
- **Para:** "receba suporte personalizado durante toda o seu processo de matricula"
- **Locais:** `pt.json` e arquivos de tradução relacionados.

---

### [FIX] Atualização da Regra e Nome da Taxa de Seleção
**Descrição:**
Ajustar nomenclatura e política de reembolso para maior transparência.
- **De:** "Pague Taxa de Seleção ($400.00). Desbloqueie todas as bolsas. Esta taxa é final e não reembolsável."
- **Para:** "Pague Taxa de processo seletivo ($400.00). Desbloqueie todas as bolsas. Esta taxa é final e você será reembolsado caso não seja aceito em nenhuma universidade."
- **Locais:** `pt.json` e componentes de checkout/dashboard.

---

### [BRANDING] Atualização de Ano de Copyright
**Descrição:**
Atualizar o ano base da plataforma no rodapé e comunicações.
- **De:** "2024 Matrícula USA. Todos os direitos reservados."
- **Para:** "2026 Matrícula USA. Todos os direitos reservados."
- **Locais:** `Footer`, `pt.json`, `en.json`, `es.json`.

---

### [REFACTOR/I18N] Divisibilidade e Otimização de Traduções
**Descrição:**
Os arquivos de tradução (`pt.json`, etc) excederam 4.000 linhas, causando lentidão no VS Code e riscos de conflito.
- **Ação:** Dividir o arquivo monolítico em namespaces menores (ex: `admin.json`, `student.json`, `school.json`, `common.json`).
- **Benefício:** Melhora a performance de carregamento e evita erros de sintaxe JSON em arquivos gigantes.

---

### [REFACTOR] Limpeza de Código Legado (Admin)
**Descrição:**
Remover arquivos mortos e padronizar a nova arquitetura.
- **Ação:** Deletar `AdminStudentDetails.tsx` (legado de 6.5k linhas) e renomear `AdminStudentDetails.refactored.tsx` (novo de 3.5k linhas) para ser o arquivo principal.
- **Ação:** Quebrar o novo arquivo em sub-componentes e hooks utilitários conforme `REFATORACAO_ARQUIVOS_CRITICOS.md`.
