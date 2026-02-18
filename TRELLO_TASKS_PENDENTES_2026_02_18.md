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

### [FIX] Mudança de Nome: Taxa de Processo Seletivo
**Descrição:**
Finalizar a padronização visual em todos os idiomas.
- **Ação:** Revisar componentes que ainda usam o termo "Taxa de Seleção" (Selection Fee) e substituir por "Taxa de Processo Seletivo" (Selection Process Fee) para manter a consistência com o jurídico.
- **Arquivos:** `pt.json`, `en.json`, `es.json`.
