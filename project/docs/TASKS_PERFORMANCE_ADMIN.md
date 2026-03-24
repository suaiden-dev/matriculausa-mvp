# 📋 Tasks — Performance Admin Dashboard
**Projeto:** MatriculaUSA MVP  
**Épico:** Otimização de Performance — Admin Dashboard  
**Data de criação:** 2026-03-24  
**Referência técnica:** `docs/ANALISE_PERFORMANCE_ADMIN_DASHBOARD.md`

---

## 🗂️ Organização para o Trello

> Sugestão de Board: **"Performance Admin Dashboard"**  
> Listas: `📥 Backlog` → `🔄 Em progresso` → `✅ Concluído`  
> Labels sugeridas: 🔴 `Crítico` · 🟠 `Alto` · 🟡 `Médio` · ⚡ `Quick Win` · 💳 `Payment` · 🚀 `Lazy Loading`

---

## ⚡ FASE 1 — Quick Wins (estimativa: 30–60 min)

---

### TASK-01 · Remover query duplicada `get_admin_users_data`
- **Label:** 🔴 Crítico · ⚡ Quick Win
- **Arquivo:** `src/pages/AdminDashboard/index.tsx`
- **Problema:** A RPC `get_admin_users_data` é chamada 2 vezes (linhas 220 e 234), dobrando o tempo de uma query sem motivo
- **O que fazer:**
  - [ ] Remover a primeira chamada (linha 220) que busca só emails
  - [ ] Usar o resultado da segunda chamada (linha 234) para extrair os emails também
  - [ ] Validar que os emails continuam sendo populados corretamente nas universidades
- **Ganho estimado:** −800ms por carregamento

---

### TASK-02 · Paralelizar as 8 queries sequenciais de `loadAdminData()`
- **Label:** 🔴 Crítico · ⚡ Quick Win
- **Arquivo:** `src/pages/AdminDashboard/index.tsx`
- **Problema:** Todas as queries rodam em sequência com `await` individual. Total: ~6s esperando o banco
- **O que fazer:**
  - [ ] Agrupar queries independentes em um único `Promise.all()`
  - [ ] Separar as queries que dependem de resultado anterior (ex: user_cart depende de scholarship IDs)
  - [ ] Manter tratamento de erros independente por query
  - [ ] Testar que todos os dados chegam corretamente após refatoração
- **Ganho estimado:** −3 a −5s por carregamento

---

### TASK-03 · Remover `console.log` de debug do `Overview.tsx`
- **Label:** 🟡 Médio · ⚡ Quick Win
- **Arquivo:** `src/pages/AdminDashboard/Overview.tsx`
- **Problema:** 5+ `console.log` dentro de `useMemo` e `useEffect` executam em todo re-render
- **O que fazer:**
  - [x] Remover todos os `console.log` com prefixo `🔍 [Overview]`
  - [x] Verificar se algum é necessário para debug — se sim, substituir por `console.debug`
- **Ganho estimado:** −0.2s + melhora de clareza no console

---

### DEBUG-01 · Investigar sumiço de dados e erro de DOM no `AffiliateManagement.tsx` (Fase 1 pós-otimização)
- **Label:** 🔴 Crítico · ⚡ Quick Win
- **Arquivo:** `src/pages/AdminDashboard/AffiliateManagement.tsx`
- **Problema:** Após otimizações da Fase 1, dados de afiliados sumiram e há erro de DOM (hydration mismatch)
- **O que fazer:**
  - [ ] Debugar o componente `AffiliateManagement` para identificar a causa do sumiço dos dados
  - [ ] Investigar o erro de DOM (hydration mismatch) e corrigi-lo
  - [ ] Validar que os dados de afiliados são carregados corretamente
- **Ganho estimado:** Estabilidade do dashboard

---

### TASK-04 · Remover debug log e memoizar `shouldFilter()` no `paymentsLoaderOptimized.ts`
- **Label:** 🔴 Crítico · ⚡ Quick Win
- **Arquivo:** `src/pages/AdminDashboard/PaymentManagement/data/loaders/paymentsLoaderOptimized.ts`
- **Problema:** `shouldFilter()` é chamada 3 vezes durante o carregamento, cada uma serializando `window.location` inteiro no console
- **O que fazer:**
  - [x] Remover o `console.log` com `windowLocation: window.location` (linha 33-41)
  - [x] Converter `shouldFilter()` de função para constante calculada uma vez no módulo:
    ```ts
    const IS_FILTERED_ENV = typeof window !== 'undefined' && (
      window.location.hostname.includes('matriculausa.com') ||
      window.location.hostname.includes('staging-matriculausa')
    );
    ```
  - [ ] Substituir todas as chamadas de `shouldFilter()` por `IS_FILTERED_ENV`
- **Ganho estimado:** −0.5s + remoção de overhead de serialização

---

### TASK-05 · Remover todos os `console.log` do `paymentConverter.ts`
- **Label:** 🟠 Alto · ⚡ Quick Win
- **Arquivo:** `src/utils/paymentConverter.ts`
- **Problema:** `console.log` dentro de loops `for` — com 100+ usuários × múltiplos pagamentos = centenas de logs por carregamento
- **O que fazer:**
  - [x] Remover todos os `console.log` dentro dos loops `for` em `getGrossPaidAmounts` e `getRealPaidAmounts`
  - [x] Remover `console.log` de mapeamento de cupons (`getDisplayAmounts`)
  - [ ] Manter apenas `console.error` e `console.warn` que são relevantes para produção
- **Ganho estimado:** −0.5s+ (cresce com o número de usuários)

---

## 🚀 FASE 2 — Lazy Loading (estimativa: 1–2h)

---

### TASK-06 · Lazy loading de todas as páginas principais no `App.tsx`
- **Label:** 🔴 Crítico · 🚀 Lazy Loading
- **Arquivo:** `src/App.tsx`
- **Problema:** Import estático de todas as páginas = bundle de ~12.5 MB carrega tudo junto na inicialização
- **O que fazer:**
  - [x] TASK-06: Implementar code-splitting via React.lazy no App.tsx para todas as rotas primárias.
    - [x] Criar LoadingScreen.tsx
    - [x] Aplicar lazy loading no App.tsx (Dashboards/Auth)
    - [x] Aplicar lazy loading granular no Admin Dashboard
    - [x] Verificar carregamento de chunks e UX
- [x] **TASK-07: Otimização do Overview Admin (Consolidação de Dados)**
    - [x] Centralizar buscas de dados no component pai (AdminDashboard)
    - [x] Implementar filtros de e-mail de teste no nível do servidor (RPC/SQL)
    - [x] Remover lógica redundante de busca e filtragem no Overview.tsx
    - [x] Estabilizar logs do SupabaseChannelManager
view.tsx

todas as rotas após a mudança
- **Ganho estimado:** −3 a −8s no primeiro carregamento

---

### TASK-07 · Lazy loading dos módulos pesados do Admin Dashboard
- **Label:** 🟠 Alto · 🚀 Lazy Loading
- **Arquivo:** `src/pages/AdminDashboard/index.tsx`
- **Problema:** Apenas `PaymentManagement` usa lazy loading. Os outros módulos pesados carregam junto
- **O que fazer:**
  - [ ] Converter para `lazy()`: `AffiliateManagement` (99 KB)
  - [ ] Converter para `lazy()`: `MatriculaRewardsAdmin` (94 KB)
  - [ ] Converter para `lazy()`: `NewsletterManagement` (68 KB)
  - [ ] Converter para `lazy()`: `TermsManagement` (45 KB)
  - [ ] Converter para `lazy()`: `CouponManagement` (39 KB)
  - [ ] Converter para `lazy()`: `AdminStudentDetailsRefactored` (166 KB)
  - [ ] Criar skeletons de loading para cada seção (ou usar um genérico)
  - [ ] Testar acesso a cada rota após mudança
- **Ganho estimado:** −1 a −2s no carregamento inicial do dashboard

---

## 🔔 FASE 3 — Consolidar Notificações (estimativa: 1h)

---

### TASK-08 · Limpeza Global de Logs e Warnings
- **Label:** 🟠 Alto · ⚡ Quick Win
- **Problema:** Excesso de logs de depuração no console e warnings do React Router v7.
- **O que fazer:**
  - [x] Limpar logs do `useReferralCodeCapture.ts`
  - [x] Limpar logs do `Layout.tsx`
  - [x] Limpar logs do `AdminDashboard/index.tsx`
  - [x] Silenciar canais Supabase no `supabaseChannelManager.ts`
  - [x] Configurar future flags do React Router no `App.tsx`
- **Ganho estimado:** Console limpo e performance de renderização estável.

---

### TASK-09 · Mover notificações do Layout para Context (evitar refetch por navegação)
- **Label:** 🟠 Alto
- **Arquivo:** `src/pages/AdminDashboard/AdminDashboardLayout.tsx` + novo Context
- **Problema:** `useAdminStudentChatNotifications` executa suas queries toda vez que o layout é remontado (a cada navegação interna)
- **O que fazer:**
  - [ ] Verificar se o hook está remontando a cada troca de rota
  - [ ] Se sim: mover o hook para um Context de nível superior que persiste entre rotas
  - [ ] Ou: adicionar `staleTime` alto + `refetchOnMount: false` para usar cache entre navegações
  - [ ] Testar que notificações novas ainda chegam via realtime (Supabase channel)
- **Ganho estimado:** −1 a −2s por navegação entre páginas

---

## 💳 FASE 4 — Otimizar Payment Management (estimativa: 2–3h)

---

### TASK-10 · Criar `getGrossPaidAmountsBatch()` para eliminar N+1
- **Label:** 🔴 Crítico · 💳 Payment
- **Arquivo:** `src/utils/paymentConverter.ts`
- **Problema:** `getGrossPaidAmounts` é chamada individualmente para cada usuário → 100+ queries ao banco
- **O que fazer:**
  - [ ] Criar função `getGrossPaidAmountsBatch(userIds: string[], feeTypes: string[])` que:
    - Faz 1 única query com `.in('user_id', userIds)`
    - Retorna `Map<userId, Record<feeType, amount>>`
  - [ ] A lógica de transformação (gross_amount_usd, parcelow_status, etc.) deve ser aplicada em memória
  - [ ] Exportar a nova função de `paymentConverter.ts`
- **Ganho estimado:** Reduz de ~100 queries para 1 query

---

### TASK-11 · Atualizar `usePaymentsQuery` para usar o batch
- **Label:** 🔴 Crítico · 💳 Payment
- **Arquivo:** `src/pages/AdminDashboard/PaymentManagement/hooks/usePaymentQueries.ts`
- **Problema:** O loop de batches chama `getGrossPaidAmounts` individualmente
- **O que fazer:**
  - [ ] Substituir o loop de batches por uma única chamada a `getGrossPaidAmountsBatch(uniqueUserIds, [...])`
  - [ ] Remover a lógica de `batchSize`, `batches`, `batchPromises` (simplifica o código)
  - [ ] Validar que os valores de pagamento continuam corretos após a mudança
  - [ ] Comparar resultado com a versão antiga em dev
- **Ganho estimado:** −5 a −20s no carregamento do Payment Management

---

### TASK-12 · Paralelizar queries em `paymentsLoaderOptimized.ts`
- **Label:** 🟠 Alto · 💳 Payment
- **Arquivo:** `src/pages/AdminDashboard/PaymentManagement/data/loaders/paymentsLoaderOptimized.ts`
- **Problema:** Queries de `scholarship_applications`, `zelle_payments` e `user_profiles` são independentes mas rodam em sequência
- **O que fazer:**
  - [ ] Agrupar as 3 queries iniciais em `Promise.all()`
  - [ ] Ajustar a query de `userProfiles` (para zelle) para rodar paralelamente à de applications
  - [ ] Manter a query de `overrides` e `systemTypes` em Promise.all após ter os userIds
  - [ ] Testar que os dados continuam completos e corretos
- **Ganho estimado:** −2 a −4s no carregamento

---

### TASK-13 · Eliminar queries redundantes no `zelleLoader.ts`
- **Label:** 🟠 Alto · 💳 Payment
- **Arquivo:** `src/pages/AdminDashboard/PaymentManagement/data/loaders/zelleLoader.ts`
- **Problema:** Em produção, faz 4 queries sendo que as queries 3 e 4 buscam dados já carregados nas queries 1 e 2
- **O que fazer:**
  - [ ] Identificar quais `user_ids` e `emails` de `@uorak.com` existem nos dados já carregados (query 2)
  - [ ] Calcular `finalCount` subtraindo os `@uorak.com` usando arrays já em memória
  - [ ] Remover por completo as queries 3 e 4
  - [ ] Testar em dev e simular ambiente de produção (forçar `IS_FILTERED_ENV = true`)
- **Ganho estimado:** −1 a −2s em produção

---

## 🧹 FASE 5 — Limpeza Final (estimativa: 15–30 min)

---

### TASK-14 · Verificar e deletar `AdminStudentDetails.tsx` (arquivo legacy 326 KB)
- **Label:** 🟡 Médio
- **Arquivo:** `src/pages/AdminDashboard/AdminStudentDetails.tsx`
- **Problema:** Arquivo legacy de 326 KB. A versão em uso é `AdminStudentDetails.refactored.tsx`. O antigo pode estar no bundle
- **O que fazer:**
  - [ ] Buscar no projeto inteiro por imports de `AdminStudentDetails` (sem `.refactored`)
  - [ ] Se nenhum import ativo encontrado, deletar o arquivo
  - [ ] Verificar se o build continua funcionando após remoção
- **Ganho estimado:** −326 KB do bundle JS

---

### TASK-15 · Remover arquivo temporário `QuickRegistration.tsx.tmp`
- **Label:** 🟡 Médio
- **Arquivo:** `src/pages/QuickRegistration.tsx.tmp`
- **Problema:** Arquivo `.tmp` de 71 KB que provavelmente está sendo incluído no bundle ou causando confusão
- **O que fazer:**
  - [ ] Confirmar que o arquivo não é necessário
  - [ ] Deletar `QuickRegistration.tsx.tmp`
- **Ganho estimado:** Limpeza do repositório

---

## 📊 Estimativas de Ganho por Fase

| Fase | Tasks | Ganho estimado | Complexidade |
|---|---|---|---|
| **Fase 1** — Quick Wins | TASK-01 a 05 | **−3 a −6s** | ⭐ Fácil |
| **Fase 2** — Lazy Loading | TASK-06 e 07 | **−4 a −10s no 1º load** | ⭐⭐ Médio |
| **Fase 3** — Notificações | TASK-08 e 09 | **−1 a −4s por navegação** | ⭐⭐ Médio |
| **Fase 4** — Payment Batch | TASK-10 a 13 | **−8 a −25s** | ⭐⭐⭐ Difícil |
| **Fase 5** — Limpeza | TASK-14 e 15 | Qualidade de código | ⭐ Fácil |

---

## 🏷️ Sugestão de Labels para o Trello

| Label | Cor | Uso |
|---|---|---|
| `🔴 Crítico` | Vermelho | Impacto direto no tempo de carregamento |
| `🟠 Alto` | Laranja | Impacto significativo mas não bloqueante |
| `🟡 Médio` | Amarelo | Melhoria de qualidade/manutenção |
| `⚡ Quick Win` | Verde | Pode ser feito em < 30 minutos |
| `💳 Payment` | Azul | Específico do Payment Management |
| `🚀 Lazy Loading` | Roxo | Relacionado a code splitting |
| `🧹 Limpeza` | Cinza | Remoção de código/arquivos desnecessários |
