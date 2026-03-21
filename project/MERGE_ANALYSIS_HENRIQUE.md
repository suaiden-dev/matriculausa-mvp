# Análise Completa de Merge: Branch `tasks-henrique` -> `developers`

Este documento consolida em profundidade as diferenças e o escopo de trabalho mapeado na branch `tasks-henrique`. Ele foi projetado para atuar como o nosso guia passo-a-passo (playbook) no momento do merge, garantindo que o trabalho de internacionalização, notificações e refatoração de onboarding do Henrique coexistam com nossas complexas integrações de fluxo de pagamento (Placement Fee, Zelle, Parcelow, PIX) feitas na branch `developers`.

---

## 🏗️ 1. Arquitetura das Branches e Conflitos de Contexto

Nós temos dois focos principais que estão em colisão nos mesmos componentes de front-end, mas que conceitualmente fazem coisas diferentes.

### No nosso lado (`developers`):
*   **Foco Principal:** Fluxo de Retenção e Pagamentos Complexos (A super funcionalidade de "Placement Fee").
*   **Avanços Injetados:** 
    *   Sistemas de **Webhooks e Edge Functions** robustos, com verificação via polling a cada 3s para pagamentos PIX/Cartão pendentes.
    *   Métodos estendidos: Zelle e PIX (via Stripe ou manual) e Parcelow, com captadores embutidos (pedindo CPF inline no Parcelow).
    *   Controle contábil na raiz `transformPayments.ts`, lendo arrays customizados para determinar se taxas foram pagas com sucesso.
    *   Máscaras e tratamentos pesados de "se o usuário está no fluxo novo ou antigo de pagamento".

### No lado do Henrique (`tasks-henrique`):
*   **Foco Principal:** UX Geral do Estudante, Internacionalização (i18n) e Central de Notificações.
*   **Avanços Injetados:**
    *   **Internacionalização Completa:** Adição do hook `useTranslation()` (`t('...')`) por todos os cantos do Dashboard e Onboarding do estudante.
    *   **Navbar e Notificações:** Implementação da barra superior de notificações com design customizado (`NotificationsModal`, etc).
    *   **Refatoração Visual:** Componentes como `ApplicationFeeStep`, `DocumentsUploadStep`, `ProcessTypeStep`, `ScholarshipFeeStep`, e `IdentityVerificationStep` foram reescritos não logicamente no back-end, mas no front-end, mudando nomes de botões, headers e textos fixos para as chaves JSON do `i18n`.

---

## 🚨 2. Zonas de Conflito Crítico (Onde vai "quebrar" no git merge)

### A. `project/src/pages/StudentOnboarding/StudentOnboarding.tsx`
*   **O que o Henrique fez:** Adicionou a chamada e lógica visual das Modais de Notificações (`useSmartPollingNotifications`, `NotificationsModal`), e incluiu botões e idioma (`LanguageSelector`) na barra de topo. Refatorou os nomes (`label`) do `visualSteps` para `t('...')` do `i18n`.
*   **O que fizemos:** Colocamos toda a lógica de `useEffect` mastodôntica que faz loop pelas rotas Pós-Pagamento e redireciona caso a Placement Fee esteja pendente.
*   **Resolução de Merge Mista:** 
    1. Manter a importação dos componentes do Henrique de `Notifications` e `LanguageSelector`.
    2. Juntar os Hooks do React (deixar o `useSmartPollingNotifications` convivendo com os nossos timeouts de pagamento).
    3. Fazer o merge minucioso de como o `const visualSteps` e o `const getOrderedSteps` montam os nossos fluxos condicionais (`isNewFlowUser`).

### B. `project/src/pages/StudentOnboarding/hooks/useOnboardingProgress.tsx`
*   **O que o Henrique fez:** Como ele não possui a estrutura do `PlacementFeeStep` em sua branch, a versão dele não salva nem acessa chaves atreladas à nossa lógica de fluxo contábil de pagamento novo (`isNewFlowUser`).
*   **O que fizemos:** Implementamos um bypass condicional e armazenamento avançado via `localStorage` e overrides.
*   **Resolução de Merge Mista:** Precisaremos priorizar **totalmente** a nossa versão atual do `useOnboardingProgress.tsx`, apenas verificando se o Henrique tirou alguma dependência antiga. É quase certo aceitar a *nossa* (Current Change) logicamente inteira para não quebrar a máquina de estados.

### C. Componentes de Taxas e Passos de Onboarding
* `project/src/pages/StudentOnboarding/components/ScholarshipFeeStep.tsx`
* `project/src/pages/StudentOnboarding/components/PaymentStep.tsx`
*   **O que o Henrique fez:** Ele traduziu textos como `Pagar com Cartão` para `t('buttons.payWithCard')`. As opções de pagamento continuam baseadas no Stripe padrão legado em sua branch.
*   **O que fizemos:** Nós incluímos *literalmente* o `ZelleCheckout.tsx`, `ParcelowIcon`, calculadoras de IOF, e verificações profundas (`hasZellePendingPlacementFee`).
*   **Resolução de Merge Mista:** Em cada um desses arquivos, teremos que aceitar as duas modificações! Onde nosso arquivo tem botões de Pixel/Parcelow/Zelle com textos em PT-BR *hardcoded*, deveremos substituir usando o hook `useTranslation()` que ele importou, mas **com a nossa mecânica de clicks e funções de checkout ilesas**.

---

## 🛠️ 3. Onde o Merge Seráfico Acontecerá (Zonas Neutras)

Estes arquivos/pastas foram manipulados quase que exclusivamente por apenas uma das partes, portanto o Git deve conseguir anexá-los sem causar danificação sistêmica (fast-forward nas views isoladas).

*   **Páginas de Dashboard Admin e Fluxos Nossos:**
    *   `project/src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`
    *   `project/src/pages/AdminDashboard/PaymentManagement/utils/transformPayments.ts`
    *   *Esses arquivos estão super salvos sob nossa custódia contábil.*

*   **Arquivos puros de Internacionalização (Henrique):**
    *   `project/src/components/LanguageSelector.tsx`
    *   `project/src/locales/*` (arquivos JSON de tradução criados).
    *   *Esta estrutura vai incorporar limpa no projeto.*

*   **Dashboards Frontais (Henrique):**
    *   `project/src/pages/StudentDashboard/Overview.tsx`
    *   Pequenos ajustes cosméticos dele nos layouts e cartões de status da aplicação onde usou o `i18n`.

---

## 📑 4. O Check-list Pós-Merge (Plano de Voo)

Assim que batermos no botão de "Merge", passaremos pelo seguinte checklist antes de considerarmos o sistema funcional (e antes do NPM Build):

1.  [ ] **Garantir a importação do i18n:** Fazer checagem de ponta-a-ponta se o arquivo `i18n.ts` que ele configurou está batendo certinho com a injeção do contexto global nas camadas que o roteador de onboarding atinge.
2.  [ ] **Injetar Zelle/Parcelow/PIX Modificado:** Garantir que o `ZelleCheckout` e os timeouts da branch `developers` não desapareceram dos componentes refatorados visualmente no `StudentOnboarding`.
3.  [ ] **Cálculos de Taxas Restritos:** O arquivo `useFeeConfig.ts` e `placementFeeCalculator.ts` não devem ser modificados ou deletados acidentalmente via conflito.
4.  [ ] **Limpar Erros de Lint de Tradução (`t()` missing):** Assegurar que os botões novos que nós criamos ganhem tags de tradução (ex: `<button>{t('zellePayment')}</button>` em vez de `"Confirmar Zelle"`) para entrar no padrão do Henrique.
5.  [ ] **Testar Build Base (`npm run build:netlify`):** Validar se as flags de Cross-Env que salvamos hoje estão segurando a versão mesclada.

---

> _Esta análise de escopo fornece tudo o que precisamos para não ficar às cegas quando trouxermos a `tasks-henrique` para a frente de batalha._
