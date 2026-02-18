# Relatório Técnico: Questionário de Alinhamento (Pré-Matrícula)

**Data de Atualização:** 18 de Fevereiro de 2026
**Status:** Implementado e Estável

---

## 1. Visão Geral

O **Questionário de Alinhamento** (também referido como *Selection Survey* ou *Processo Seletivo*) é uma etapa obrigatória para estudantes que pagaram a taxa de inscrição. Seu objetivo é avaliar o perfil e conhecimento do aluno para garantir que ele esteja apto a prosseguir com o processo de matrícula internacional.

O sistema bloqueia o acesso às demais funcionalidades da plataforma até que o estudante obtenha uma pontuação mínima de **80%** neste questionário.

---

## 2. Arquitetura e Componentes

A implementação está distribuída nos seguintes arquivos principais:

### Frontend
*   **`src/pages/StudentDashboard/ProcessoSeletivo.tsx`**: Controlador principal. Gerencia o estado do formulário, navegação entre seções, validação, persistência local e envio para o backend.
*   **`src/components/form/ResultsPage.tsx`**: Componente de exibição de resultados. Mostra a pontuação final, mensagens de feedback (aprovação/reprovação) e traduz dinamicamente o perfil do usuário.
*   **`src/data/formQuestions.ts`**: Define a estrutura das perguntas, seções e a lógica de cálculo de pontuação.
*   **`src/components/form/QuestionField.tsx`**: Renderiza cada tipo de pergunta (texto, rádio, data, etc.) de forma dinâmica.
*   **`src/pages/StudentDashboard/StudentDashboardLayout.tsx`**: Implementa o bloqueio de navegação (Guard) para usuários que ainda não passaram no questionário.

### Backend (Supabase)
*   **Tabela `submissions`**: Armazena o histórico completo das tentativas, incluindo respostas detalhadas (JSON), pontuação e status de aprovação.
*   **Tabela `user_profiles`**: Possui a flag `selection_survey_passed` (boolean) que controla o acesso global às funcionalidades.

---

## 3. Lógica de Negócio

### Estrutura do Questionário
O questionário é composto por **50 questões** divididas em **5 seções** (A a E):
*   **Seção A (1-10):** Dados Pessoais e Perfil.
*   **Seção B (11-20):** Histórico Acadêmico.
*   **Seção C (21-30):** Experiência Profissional.
*   **Seção D (31-40):** Objetivos e Preferências.
*   **Seção E (41-50):** Conhecimentos Específicos e Redação.

### Sistema de Pontuação (`calculateScore`)
*   Apenas questões marcadas com `scored: true` contam para a nota.
*   Cada questão tem o mesmo peso.
*   Para pontuar, a resposta do usuário deve coincidir com a opção marcada como `correct: true`.
*   **Critério de Aprovação:** `percentage >= 80`.

### Regras de Validação Especiais
*   **Condicionais:** Algumas perguntas só aparecem com base na resposta anterior (ex: Q12 só aparece se Q11 = "Sim").
*   **Lógica da Pergunta 4:** Se o usuário responde "Sim" (está nos EUA), o sistema valida campos ocultos/internos (-4 e -41) relacionados ao visto e validade.

---

## 4. Persistência e Experiência do Usuário (UX)

Para garantir uma experiência robusta e prevenir perda de dados, implementamos um sistema de persistência em camadas:

1.  **Salvamento Automático (Rascunho):**
    *   Todas as respostas (`survey_answers`) e a seção atual (`survey_current_section`) são salvas no `localStorage` a cada alteração.
    *   Isso permite que o usuário feche o navegador e retome exatamente de onde parou.

2.  **Resistência a Refresh na Tela de Resultados:**
    *   Um problema comum em SPAs (Single Page Applications) é a perda de estado volátil ao recarregar a página (ex: ao trocar de idioma).
    *   **Solução:** Implementamos a persistência da flag `survey_submitted` no `localStorage`.
    *   Se a página for recarregada, o sistema identifica que o questionário foi finalizado e restaura a `ResultsPage` com as respostas salvas, em vez de reiniciar o formulário.

3.  **Ciclo de Vida do Rascunho:**
    *   As respostas **NÃO** são apagadas imediatamente após a submissão. Elas são mantidas para permitir a visualização do resultado.
    *   A limpeza (`clearDraft`) ocorre apenas quando o usuário clica em "Ir para o Dashboard" ou "Sair", garantindo que o próximo acesso seja um formulário limpo.

---

## 5. Controle de Acesso e Segurança

O arquivo `StudentDashboardLayout.tsx` atua como um "porteiro" para a aplicação:

*   **Verificação:** Monitora as flags `selection_process_fee_paid` e `selection_survey_passed` do perfil do usuário.
*   **Regra de Bloqueio:** Se (`pago` E `!passou`), o usuário entra em **Modo Restrito**.
*   **Comportamento no Modo Restrito:**
    *   Redirecionamento forçado para `/student/dashboard/selection-survey`.
    *   Menu lateral ocultar todas as opções exceto: Perfil, Chat de Suporte e o link (pulsante) para o Questionário.
    *   Isso impede que o usuário acesse bolsas ou candidaturas sem estar aprovado.

---

## 6. Internacionalização (i18n)

O sistema suporta totalmente **Português (pt)**, **Inglês (en)** e **Espanhol (es)**.

*   Todas as perguntas, opções e textos de interface usam chaves de tradução (ex: `selectionSurvey.questions.1.text`).
*   **Melhoria Recente:** Adicionadas chaves faltantes na tela de resultados (`of` -> "de", `summary` -> "Resumo da Candidatura") para garantir que nenhum texto fique em inglês/hardcoded ao mudar o idioma.
*   **Dados Dinâmicos:** A exibição do "Perfil" na tela de resultados traduz o valor salvo no banco (chave técnica) para o rótulo legível no idioma atual.

---

## 7. Próximos Passos Sugeridos

1.  **Analytics:** Monitorar em qual seção os usuários mais desistem (drop-off rate).
2.  **Feedback Granular:** Exibir quais categorias de perguntas o usuário errou mais (ex: foi bem em Inglês mas mal em Matemática).
3.  **Admin:** Criar visualização para administradores verem as respostas detalhadas de um aluno específico.
