# 🧪 Testes de Validação — Performance Admin Dashboard
**Referência de tasks:** `docs/TASKS_PERFORMANCE_ADMIN.md`  
**Data de criação:** 2026-03-24

---

## 🛠️ Automação de Benchmarks (Console JS)

Para não precisar anotar tudo manualmente, criei um script que faz isso por você.

**Como usar:**
1. Abra o arquivo [perf-monitor.js](file:///c:/Users/victurib/Matricula%20USA/matriculausa-mvp/project/docs/perf-monitor.js) e copie todo o código.
2. No Chrome, abra o **F12** na página do admin.
3. Vá na aba **Console**, cole o código e dê **Enter**.
4. **Recarregue a página** (F5).
5. Após o carregamento, o script imprimirá uma **tabela resumida** com o LCP e o número exato de queries ao Supabase.

---

> **Como usar o checklist:** Após implementar cada task, execute o checklist correspondente.  
> ✅ = OK · ❌ = Quebrou (descrever o que falhou) · ⏭️ = Não aplicável

---

## ⚡ FASE 1 — Quick Wins

---

### ✅ TASK-01 · Remover query duplicada `get_admin_users_data`

**Antes de começar:**
- [ ] Anotar quantas queries aparecem na aba Network do DevTools ao carregar `/admin/dashboard`
- [ ] Anotar o tempo total de carregamento (F12 → Performance → LCP)

**Testes funcionais:**
- [ ] O Admin Dashboard carrega sem erros no console
- [ ] A lista de usuários é exibida corretamente em `/admin/dashboard`
- [ ] Os e-mails das universidades aparecem corretamente no painel
- [ ] A contagem de alunos (totais) está correta
- [ ] Nenhuma chamada para `get_admin_users_data` aparece duplicada na aba Network

**Validação de performance:**
- [ ] A aba Network mostra **1 chamada** para `get_admin_users_data` (antes eram 2)
- [ ] O tempo de carregamento reduziu pelo menos **~800ms**

---

### ✅ TASK-02 · Paralelizar as 8 queries sequenciais

**Antes de começar:**
- [ ] Anotar o tempo total de `loadAdminData` via `console.time` ou DevTools Network waterfall
- [ ] Tirar screenshot do waterfall das queries no DevTools

**Testes funcionais:**
- [ ] O Admin Dashboard carrega sem erros no console
- [ ] Universidades listadas corretamente
- [ ] Alunos (user_profiles) listados corretamente
- [ ] Bolsas (scholarships) listadas corretamente
- [ ] Aplicações (scholarship_applications) listadas corretamente
- [ ] Carrinho de usuários aparece corretamente (se aplicável na UI)
- [ ] Contagens e stats do dashboard estão corretas
- [ ] Filtros e busca de alunos funcionam normalmente

**Validação de performance:**
- [ ] No DevTools Network, as queries rodam **em paralelo** (waterfall mostrando requests lado a lado, não em cascata)
- [ ] Tempo de `loadAdminData` reduziu de ~6s para ~1-2s
- [ ] Nenhum dado está `undefined` ou `null` inesperadamente

---

### ✅ TASK-03 · Remover `console.log` de debug do `Overview.tsx`

**Testes funcionais:**
- [ ] O Overview (página inicial do admin) exibe os cards de estatísticas corretamente
- [ ] Gráficos e métricas estão carregando normalmente
- [ ] Filtros de data no Overview funcionam
- [ ] Sem erros JavaScript no console

**Validação:**
- [ ] Console do browser está limpo de mensagens `🔍 [Overview]` durante navegação
- [ ] Abrir React DevTools Profiler e verificar que re-renders do Overview não causam logs no console

---

### ✅ TASK-04 · Memoizar `shouldFilter()` no `paymentsLoaderOptimized.ts`

**Testes funcionais — ambiente dev (localhost):**
- [ ] Payment Management carrega sem erros
- [ ] Todos os pagamentos aparecem (inclusive `@uorak.com` — em dev deve mostrar tudo)
- [ ] A constante `IS_FILTERED_ENV` está `false` em localhost (verificar via DevTools)

**Testes funcionais — simular produção:**
- [ ] Temporariamente forçar `IS_FILTERED_ENV = true` no código
- [ ] Verificar que pagamentos de `@uorak.com` **não aparecem**
- [ ] Reverter a mudança temporária

**Validação:**
- [ ] Console não exibe mais `🔍 [PaymentManagement] shouldFilter debug:` repetidamente
- [ ] A função/constante é calculada **uma única vez** (não a cada render)

---

### ✅ TASK-05 · Remover `console.log` do `paymentConverter.ts`

**Testes funcionais:**
- [ ] Payment Management → aba **Payments** exibe valores corretos para todos os tipos de fee:
  - [ ] Selection Process Fee
  - [ ] Application Fee
  - [ ] Scholarship Fee
  - [ ] I-20 Control Fee
  - [ ] Placement Fee
  - [ ] DS-160 Package
  - [ ] I-539 COS Package
- [ ] Valores de pagamentos Zelle estão corretos
- [ ] Valores de pagamentos Stripe estão corretos
- [ ] Pagamentos Parcelow com `status = 'paid'` aparecem normalmente
- [ ] Pagamentos Parcelow com `status != 'paid'` **não aparecem**

**Validação:**
- [ ] Console do browser está limpo de mensagens `[paymentConverter]`
- [ ] Nenhum valor de pagamento mudou em relação ao estado anterior

---

## 🚀 FASE 2 — Lazy Loading

---

### ✅ TASK-06 · Lazy loading de todas as páginas no `App.tsx`

**Testes de navegação (testar cada rota):**
- [ ] `/` → página inicial carrega
- [ ] `/login` ou `/auth` → tela de login carrega
- [ ] `/admin/dashboard` → Admin Dashboard carrega (com spinner durante carregamento)
- [ ] `/student/dashboard` → Student Dashboard carrega
- [ ] `/affiliate/dashboard` → Affiliate Dashboard carrega
- [ ] `/seller/dashboard` → Seller Dashboard carrega
- [ ] `/school/dashboard` → School Dashboard carrega (se aplicável)
- [ ] `/scholarships` → página de bolsas carrega
- [ ] `/universities` → página de universidades carrega
- [ ] `/quick-registration` → formulário de registro rápido carrega

**Testes de UX:**
- [ ] Um spinner/skeleton/loading aparece enquanto o chunk está sendo baixado (primeira visita)
- [ ] Na segunda visita à mesma rota, carrega instantaneamente (chunk em cache)
- [ ] Nenhuma rota retorna tela branca vazia
- [ ] Sem erros `ChunkLoadError` no console

**Validação de performance:**
- [ ] DevTools Network → aba JS: ao acessar `/admin/dashboard`, chunks de StudentDashboard/SellerDashboard **não são baixados**
- [ ] Bundle inicial (primeiro carregamento) reduziu visivelmente em MB

---

### ✅ TASK-07 · Lazy loading dos módulos pesados do Admin Dashboard

**Testes de sub-navegação do admin (testar cada módulo):**
- [ ] `/admin/dashboard` → Overview carrega normalmente
- [ ] `/admin/dashboard/users` ou equivalente → User Management carrega
- [ ] `/admin/dashboard/affiliates` → Affiliate Management carrega (com spinner)
- [ ] `/admin/dashboard/rewards` → MatriculaRewards Admin carrega
- [ ] `/admin/dashboard/newsletter` → Newsletter Management carrega
- [ ] `/admin/dashboard/terms` → Terms Management carrega
- [ ] `/admin/dashboard/coupons` → Coupon Management carrega
- [ ] Acesso a detalhe de aluno → AdminStudentDetails carrega

**Testes de UX:**
- [ ] Spinner ou skeleton aparece ao navegar para módulo não carregado
- [ ] Sem tela branca em nenhum módulo
- [ ] Após a primeira visita, navegação de volta ao módulo é instantânea

**Validação de performance:**
- [ ] Carregar `/admin/dashboard` e verificar no DevTools que `AffiliateManagement`, `MatriculaRewardsAdmin`, etc. **não são baixados** imediatamente
- [ ] Apenas ao navegar para cada módulo o chunk correspondente é baixado

---

## 🔔 FASE 3 — Consolidar Notificações

---

### ✅ TASK-08 · Remover `useUnreadMessagesCount` redundante

**Testes funcionais:**
- [ ] Badge de mensagens não lidas aparece no menu lateral/superior
- [ ] O número no badge está correto (verificar no banco o count real)
- [ ] Ao receber uma nova mensagem, o badge atualiza (aguardar alguns segundos ou simular envio)
- [ ] Navegar entre páginas do admin: o badge de notificações permanece consistente
- [ ] Sem erros no console relacionados a `useUnreadMessagesCount`

**Validação:**
- [ ] DevTools Network: após navegar entre páginas, o número de requisições à tabela de notificações **reduziu**
- [ ] Apenas **1 hook** de notificação está ativo no React DevTools

---

### ✅ TASK-09 · Mover notificações para Context (evitar refetch por navegação)

**Testes funcionais:**
- [ ] Badge de mensagens não lidas aparece ao entrar no dashboard
- [ ] Navegar entre 5 páginas diferentes do admin sem atualizar o browser
- [ ] O badge continua mostrando o valor correto após cada navegação
- [ ] Enviar uma mensagem de teste via Student → verificar se o badge do admin atualiza via realtime
- [ ] Marcar notificações como lidas → verificar se o badge reseta

**Validação de performance:**
- [ ] DevTools Network: navegar entre páginas **não dispara** novas requisições de notificação a cada troca de rota
- [ ] Apenas o canal Realtime do Supabase atualiza o count quando há nova mensagem

---

## 💳 FASE 4 — Otimizar Payment Management

---

### ✅ TASK-10 · Criar `getGrossPaidAmountsBatch()`

**Testes unitários (se possível — testar a função isolada):**
- [ ] Chamar `getGrossPaidAmountsBatch(['userId1', 'userId2'], ['selection_process', 'scholarship'])` e verificar:
  - [ ] Retorna um `Map` com entradas para cada userId
  - [ ] Cada entrada tem os fee_types corretos como chaves
  - [ ] Os valores correspondem a `gross_amount_usd` quando disponível, senão `amount`
  - [ ] Pagamentos Parcelow com `status != 'paid'` são ignorados

**Testes de integração:**
- [ ] Comparar resultados de `getGrossPaidAmountsBatch([userId])` com `getGrossPaidAmounts(userId)` para o mesmo usuário
- [ ] Os valores devem ser **idênticos**

---

### ✅ TASK-11 · Atualizar `usePaymentsQuery` para usar o batch

**Antes de começar:**
- [ ] Anotar os valores atuais de 3-5 pagamentos específicos (aluno, fee_type, valor)

**Testes funcionais:**
- [ ] Payment Management → aba **Payments** carrega sem erros
- [ ] Comparar os valores dos 3-5 pagamentos anotados → devem ser **idênticos**
- [ ] Filtrar por universidade específica → valores corretos
- [ ] Filtrar por tipo de fee → valores corretos
- [ ] Filtrar por método de pagamento (Stripe, Zelle, Parcelow) → valores corretos
- [ ] Exportar CSV → verificar que os valores exportados estão corretos

**Validação de performance:**
- [ ] DevTools Network: ao carregar Payment Management, verificar que existem **MUITO MENOS** requisições à tabela `individual_fee_payments`
  - Antes: ~N requisições (uma por usuário)
  - Depois: **1 requisição** com `.in('user_id', [...])`
- [ ] Tempo de carregamento do Payment Management reduziu significativamente

---

### ✅ TASK-12 · Paralelizar queries em `paymentsLoaderOptimized.ts`

**Antes de começar:**
- [ ] Anotar o tempo atual de carregamento do Payment Management (aba Payments)

**Testes funcionais:**
- [ ] Aba **Payments** exibe todos os pagamentos corretamente
- [ ] Alunos com pagamentos via Zelle aparecem na listagem
- [ ] Alunos com pagamentos via Stripe aparecem na listagem
- [ ] Alunos com aplicações aparecem corretamente
- [ ] Stats (total revenue, total payments) estão corretas
- [ ] Nenhum aluno duplicado na listagem
- [ ] Nenhum aluno desapareceu da listagem

**Validação de performance:**
- [ ] DevTools Network: o waterfall mostra as queries de `scholarship_applications`, `zelle_payments` e `user_profiles` rodando **em paralelo** (lado a lado)
- [ ] Tempo total de carregamento do loader reduziu

---

### ✅ TASK-13 · Eliminar queries redundantes no `zelleLoader.ts`

**Testes funcionais:**
- [ ] Payment Management → aba **Zelle Payments** carrega sem erros
- [ ] A contagem de pagamentos Zelle exibida está correta (verificar no banco: `SELECT count(*) FROM zelle_payments WHERE amount > 0`)
- [ ] Os pagamentos Zelle listados estão corretos
- [ ] Em dev (localhost): pagamentos de `@uorak.com` **aparecem**
- [ ] Simular produção (`IS_FILTERED_ENV = true`): pagamentos de `@uorak.com` **não aparecem**
- [ ] A contagem ajustada (excluindo `@uorak.com`) está correta em "modo produção"
- [ ] Paginação dos Zelle payments funciona corretamente

**Validação de performance (em produção):**
- [ ] Verificar no Supabase logs que a tabela `zelle_payments` é consultada **2 vezes** (antes eram 4)

---

## 🧹 FASE 5 — Limpeza Final

---

### ✅ TASK-14 · Deletar `AdminStudentDetails.tsx` (legacy)

**Antes de começar:**
- [ ] Buscar no projeto inteiro por: `import.*AdminStudentDetails` (sem `.refactored`)
- [ ] Confirmar que **nenhum arquivo** importa o legacy

**Testes após deletar:**
- [ ] `npm run build` ou `npm run dev` → sem erros de módulo não encontrado
- [ ] Acessar detalhe de qualquer aluno no admin → carrega normalmente (usando a versão `.refactored`)
- [ ] Todas as funcionalidades de detalhe do aluno funcionam:
  - [ ] Dados pessoais do aluno
  - [ ] Aplicações do aluno
  - [ ] Chat/mensagens
  - [ ] Documents
  - [ ] Status de pagamentos

---

### ✅ TASK-15 · Remover `QuickRegistration.tsx.tmp`

**Testes após deletar:**
- [ ] `npm run build` ou `npm run dev` → sem erros
- [ ] Rota de Quick Registration funciona normalmente
- [ ] Formulário de registro rápido carrega e submete corretamente

---

## 🔥 Teste de Regressão Geral (Executar ao Final de Cada Fase)

Após concluir **cada fase completa**, executar este checklist de smoke test:

### Admin Dashboard Geral
- [ ] Login como admin → redireciona para o dashboard
- [ ] Overview carrega com dados reais
- [ ] Menu lateral funciona (todas as opções navegam corretamente)
- [ ] Badge de notificações aparece e tem valor correto
- [ ] Notificações em tempo real chegam (realtime)

### Gerenciamento de Alunos
- [ ] Lista de alunos carrega
- [ ] Busca de aluno por nome/email funciona
- [ ] Clicar em aluno → abre detalhe corretamente
- [ ] Chat com aluno funciona
- [ ] Status de pagamento do aluno está correto

### Payment Management
- [ ] Aba **Payments** → lista corretamente, valores corretos
- [ ] Aba **Zelle Payments** → lista e count corretos
- [ ] Aba **University Requests** → lista corretamente
- [ ] Aba **Affiliate Requests** → lista corretamente
- [ ] Aprovar/rejeitar um pagamento Zelle (teste e reverter se necessário)
- [ ] Exportar CSV funciona

### Outros Módulos
- [ ] Affiliate Management carrega
- [ ] Coupon Management carrega
- [ ] Newsletter Management carrega

---

## 📏 Benchmarks de Performance

Registrar esses valores **antes** de começar e **após cada fase**:

| Ponto de medição | Antes | Após Fase 1 | Após Fase 2 | Após Fase 4 |
|---|---|---|---|---|
| TTI / LCP Admin Dashboard (1ª visita) | **6.08s** | ___s | ___s | ___s |
| TTI Admin Dashboard (2ª visita) | ___s | ___s | ___s | ___s |
| TTI Payment Management (1ª visita) | ___s | ___s | ___s | ___s |
| TTI Payment Management (2ª visita) | ___s | ___s | ___s | ___s |
| Nº de requests ao abrir /admin/dashboard | **618** | ___ | ___ | ___ |
| Bundle JS transferido no 1º load | **12.5 MB** | ___MB | ___MB | ___MB |

> **Como medir TTI:** F12 → Performance → gravar → navegar para a página → parar → verificar "Time to Interactive"  
> **Como medir requests:** F12 → Network → limpar → navegar para a página → contar requests concluídos  
> **Como medir bundle:** F12 → Network → filtrar por JS → ver coluna "Transferred"
