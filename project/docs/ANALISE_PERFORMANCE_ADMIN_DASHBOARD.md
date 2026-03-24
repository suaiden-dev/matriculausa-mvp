# 🚀 Análise de Performance — Admin Dashboard
**Data:** 2026-03-24  
**Autor:** Diagnóstico técnico via profiler (Chrome DevTools)  
**Ambiente analisado:** localhost:5173/admin/dashboard

---

## 📊 Sintomas Observados

| Métrica | Valor medido |
|---|---|
| LCP (Largest Contentful Paint) | **6.21s** (em dev local) |
| Tempo total de thread | **6.858ms** |
| Scripting | 801ms |
| Sistema | 983ms |
| Bundle size (localhost) | **12.561 kB** |
| Tempo real em produção | **6 a 25 segundos** |

---

## 🔴 Problemas Críticos — Dashboard Geral

---

### 1. Bundle Gigante Sem Lazy Loading (`App.tsx`)

**Arquivo:** `src/App.tsx`

O `App.tsx` faz **import estático** de praticamente TODAS as páginas do sistema. Quando um admin abre `/admin/dashboard`, o browser precisa baixar e executar o JS de **todas** as outras rotas — StudentDashboard, SchoolDashboard, SellerDashboard, Auth, Scholarships, etc.

**Arquivos pesados sendo carregados desnecessariamente:**

| Arquivo | Tamanho |
|---|---|
| `AdminStudentDetails.tsx` (legacy) | **326 KB** |
| `AdminStudentDetails.refactored.tsx` | **166 KB** |
| `DocumentRequestsCard.tsx` | **152 KB** |
| `AffiliateManagement.tsx` | **99 KB** |
| `MatriculaRewardsAdmin.tsx` | **94 KB** |
| `QuickRegistration.tsx` | **81 KB** |
| `Scholarships.tsx` | **81 KB** |
| `NewsletterManagement.tsx` | **68 KB** |
| `ZelleCheckoutPage.tsx` | **66 KB** |
| `PreCheckoutModal.tsx` | **64 KB** |
| `ForStudents.tsx` | **61 KB** |
| `Auth.tsx` | **60 KB** |

**Total estimado de JS desnecessário:** ~1.5 MB+ que o browser precisa parsear antes de mostrar qualquer coisa.

**Solução:** Converter todos os imports para `React.lazy()` + `Suspense`:

```ts
// ❌ Antes (estático — carrega tudo junto):
import AdminDashboard from './pages/AdminDashboard/index';
import StudentDashboard from './pages/StudentDashboard/index';

// ✅ Depois (lazy — carrega só quando a rota é visitada):
const AdminDashboard = lazy(() => import('./pages/AdminDashboard/index'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard/index'));
```

---

### 2. 8 Queries Sequenciais (N+1) em `loadAdminData()` (`index.tsx`)

**Arquivo:** `src/pages/AdminDashboard/index.tsx`

As queries nunca são paralelas — cada `await` espera a anterior terminar antes de começar:

```
1. await universities.select('*')                    → ~800ms
2. await user_profiles.select(...)                   → ~800ms
3. await rpc('get_admin_users_data')                 → ~800ms
4. await rpc('get_admin_users_data')  ← DUPLICADO!  → ~800ms ← BUG
5. await scholarships.select(...)                    → ~800ms
6. await scholarship_applications.select(...)        → ~800ms
7. await user_cart.select(...)                       → ~800ms
8. await scholarship_applications.select(...) again  → ~800ms
```

> **Bug confirmado:** `get_admin_users_data` é chamada **2 vezes** (linhas 220 e 234) — a mesma RPC duplicada dobra o tempo sem motivo.

**Com ~800ms de latência por query: 8 × 800ms = ~6.4 segundos só esperando o banco.**

**Solução:** Paralelizar com `Promise.all` e remover a query duplicada:

```ts
const [universitiesResult, profilesResult, usersResult, scholarshipsResult, applicationsResult] =
  await Promise.all([
    supabase.from('universities').select('*').order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('user_id, full_name, phone, status'),
    supabase.rpc('get_admin_users_data'),  // ← apenas UMA vez
    supabase.from('scholarships').select('*, universities!inner(name)').order('created_at', { ascending: false }),
    supabase.from('scholarship_applications').select('*, scholarships!inner(title, amount, universities!inner(name))').order('created_at', { ascending: false }),
  ]);
// Redução: de ~6.4s sequencial → ~1s paralelo
```

---

### 3. Triple-Fetch de Notificações no Layout (`AdminDashboardLayout.tsx`)

**Arquivo:** `src/pages/AdminDashboard/AdminDashboardLayout.tsx`

O layout instancia **3 hooks de notificação simultâneos** que fazem queries ao banco **a cada navegação entre páginas do dashboard**:

```ts
const { unreadCount: serverUnreadCount } = useAdminStudentChatNotifications();
// ↑ faz 2 queries: rpc('get_unread_admin_student_chat_notifications') + admin_notifications.select()

const { unreadCount: contextUnreadCount, updateUnreadCount } = useUnreadMessages();
// ↑ apenas contexto React — OK

const { unreadCount: messagesFallbackUnreadCount } = useUnreadMessagesCount();
// ↑ faz mais 1 query — fallback desnecessário
```

O `useAdminStudentChatNotifications` já retorna o `unreadCount`. O `useUnreadMessagesCount` é um fallback redundante.

**Solução:** Remover o terceiro hook e simplificar:

```ts
// Remover:
// const { unreadCount: messagesFallbackUnreadCount } = useUnreadMessagesCount();

// Simplificar:
const displayUnreadCount = contextUnreadCount || serverUnreadCount;
```

---

### 4. Overview Faz Queries Independentes e Duplicadas (`Overview.tsx`)

**Arquivo:** `src/pages/AdminDashboard/Overview.tsx`

O componente `Overview` ignora os dados já carregados pelo `index.tsx` e faz suas próprias queries:

- `UniversityPaymentRequestService.listAllPaymentRequests()`
- `AffiliatePaymentRequestService.listAllPaymentRequests()`
- `supabase.from('zelle_payments').select('*')` + `supabase.from('user_profiles')` para filtrar
- `supabase.rpc('get_unread_admin_student_chat_notifications')` ← **mesma RPC que o hook de notificações já chamou (3ª vez que essa query executa)**

**Adicionalmente**, existem `console.log` dentro de `useMemo` que executam em todo re-render:

```ts
console.log('🔍 [Overview] shouldFilter debug:', { hostname, href, ... });
console.log('🔍 [Overview] Filtrando usuários:', { total: users.length });
// ... mais 3 console.logs similares
```

---

### 5. Módulos Pesados Sem Lazy Loading no Dashboard (`AdminDashboard/index.tsx`)

**Arquivo:** `src/pages/AdminDashboard/index.tsx`

Apenas `PaymentManagement` usa lazy loading. Todos os outros módulos pesados são imports estáticos:

```ts
// ❌ Todos carregam no boot:
import AffiliateManagement from './AffiliateManagement';        // 99 KB
import MatriculaRewardsAdmin from './MatriculaRewardsAdmin';   // 94 KB
import NewsletterManagement from './NewsletterManagement';     // 68 KB
import TermsManagement from './TermsManagement';               // 45 KB
import UserManagement from './UserManagement';                 // 46 KB
import CouponManagement from './CouponManagement';             // 39 KB
import AdminStudentDetailsRefactored from './AdminStudentDetails.refactored'; // 166 KB
```

---

### 6. Arquivo Legacy de 326 KB no Bundle

**Arquivo:** `src/pages/AdminDashboard/AdminStudentDetails.tsx`

O arquivo legacy `AdminStudentDetails.tsx` (326 KB) existe mas a versão em uso é `AdminStudentDetails.refactored.tsx`. O arquivo antigo pode estar sendo incluído no bundle se algum import ainda apontar para ele. Verificar e deletar.

---

## 💳 Problemas Específicos — Payment Management

**Esta página tem problemas adicionais e exclusivos que a tornam ainda mais lenta.**

---

### PM-1. N+1 por Usuário: `getGrossPaidAmounts` em Loop (CRÍTICO)

**Arquivo:** `src/pages/AdminDashboard/PaymentManagement/hooks/usePaymentQueries.ts`

O `usePaymentsQuery` divide usuários em batches de 10 e chama `getGrossPaidAmounts(userId, [...])` **individualmente para cada usuário**:

```ts
// Para CADA usuário, uma query separada ao banco:
const amounts = await getGrossPaidAmounts(userId, ['selection_process', 'scholarship', ...]);
// Internamente faz: supabase.from('individual_fee_payments').eq('user_id', userId)
```

**Com 100 usuários = 100 queries à tabela `individual_fee_payments`.**

**Solução:** Criar `getGrossPaidAmountsBatch(userIds[])` que substitui N queries por 1:

```ts
async function getGrossPaidAmountsBatch(
  userIds: string[],
  feeTypes: string[]
): Promise<Map<string, Record<string, number>>> {
  const { data } = await supabase
    .from('individual_fee_payments')
    .select('user_id, fee_type, amount, gross_amount_usd, payment_method, parcelow_status')
    .in('user_id', userIds)   // ← UMA query para TODOS os usuários
    .in('fee_type', feeTypes)
    .order('payment_date', { ascending: false });

  // Agrupar resultados por user_id em memória (sem mais queries ao banco)
  const result = new Map<string, Record<string, number>>();
  for (const payment of data || []) {
    if (!result.has(payment.user_id)) result.set(payment.user_id, {});
    // ... lógica de transformação
  }
  return result;
}
```

---

### PM-2. Queries Sequenciais em `paymentsLoaderOptimized.ts` (CRÍTICO)

**Arquivo:** `src/pages/AdminDashboard/PaymentManagement/data/loaders/paymentsLoaderOptimized.ts`

Apesar do nome "Optimized", as queries principais ainda são sequenciais:

```ts
// ❌ Sequencial (atual):
const { data: applications } = await supabase.from('scholarship_applications').select(...);
const { data: zellePaymentsRaw } = await supabase.from('zelle_payments').select('*');
const { data: userProfiles } = await supabase.from('user_profiles').select(...);
const { data: stripeUsersRaw } = await supabase.from('user_profiles').select(...);

// ✅ Paralelo (solução):
const [applicationsResult, zelleResult, stripeResult] = await Promise.all([
  supabase.from('scholarship_applications').select(...),
  supabase.from('zelle_payments').select('*').eq('status', 'approved'),
  supabase.from('user_profiles').select(...).or('has_paid_selection_process_fee.eq.true,...'),
]);
```

Além disso, `shouldFilter()` tem um `console.log` com `window.location` inteiro sendo serializado a cada chamada (chamada 3 vezes durante o carregamento):

```ts
// ❌ Remover:
console.log('🔍 [PaymentManagement] shouldFilter debug:', {
  windowLocation: window.location  // serializa o objeto Location inteiro!
});

// ✅ Memoizar como constante no módulo:
const IS_FILTERED_ENV = typeof window !== 'undefined' && (
  window.location.hostname.includes('matriculausa.com') ||
  window.location.hostname.includes('staging-matriculausa')
);
```

---

### PM-3. 4 Queries Redundantes no `zelleLoader.ts` (Produção)

**Arquivo:** `src/pages/AdminDashboard/PaymentManagement/data/loaders/zelleLoader.ts`

Em produção, o loader faz 4 queries sendo que as últimas 2 são completamente desnecessárias:

```ts
// Query 1: busca pagamentos Zelle ✅ necessária
const { data: zellePaymentsData } = await supabase.from('zelle_payments').select('*')...

// Query 2: busca profiles para filtrar emails ✅ necessária
const { data: userProfiles } = await supabase.from('user_profiles').select(...)...

// Query 3: busca zelle_payments DE NOVO só pra contar ❌ redundante
const { data: allZelleUserIds } = await supabase.from('zelle_payments').select('user_id')...

// Query 4: busca user_profiles DE NOVO só pra contar @uorak.com ❌ redundante
const { data: allUserProfiles } = await supabase.from('user_profiles').select('user_id, email')...
```

**Solução:** Calcular `finalCount` usando os dados já presentes em memória das queries 1 e 2.

---

### PM-4. `console.log` em Cada Iteração de `paymentConverter.ts`

**Arquivo:** `src/utils/paymentConverter.ts` (779 linhas)

As funções `getGrossPaidAmounts` e `getRealPaidAmounts` têm `console.log` dentro de loops `for`:

```ts
for (const payment of payments || []) {
  console.log(`[paymentConverter] ✅ Valor pago para ${feeTypeKey}: ${amountUSD}...`);
  console.log(`[paymentConverter] ✅ Pagamento ANTES de 19/11/2025: usando gross_amount_usd...`);
  // + mais 5-10 console.logs dentro do mesmo loop
}
```

Com 100+ usuários × múltiplos pagamentos = **centenas de console.logs** serializando strings a cada carregamento.

**Solução:** Remover todos os `console.log` de produção. Usar `console.debug` se necessário (desabilitado por padrão no Chrome).

---

### PM-5. `useUniversitiesQuery` e `useAffiliatesQuery` Sempre Ativos

**Arquivo:** `src/pages/AdminDashboard/PaymentManagement.tsx` (linhas 217-218)

```ts
// Estes hooks NÃO têm `enabled = false` — carregam SEMPRE ao montar:
const universitiesQuery = useUniversitiesQuery();   // executa imediatamente
const affiliatesQuery = useAffiliatesQuery();       // executa imediatamente
```

O `loadAffiliatesLoader` faz **4 queries em cadeia**:
1. `user_profiles` (affiliate_admins)
2. `affiliate_admins` (batch)
3. `sellers` (por affiliate_admin_id)
4. `sellers` (por email, fallback)

Na primeira visita, mesmo antes do usuário abrir qualquer filtro, essas 4 queries já estão executando.

---

## 📋 Plano de Ação Completo (Priorizado)

### Fase 1 — Quick Wins (30-60 min) ⚡

| # | Ação | Arquivo | Ganho estimado |
|---|---|---|---|
| 1.1 | Remover query duplicada `get_admin_users_data` | `index.tsx` linha 220 | -800ms |
| 1.2 | Paralelizar as 8 queries com `Promise.all` | `index.tsx` `loadAdminData()` | **-3 a -5s** |
| 1.3 | Remover todos `console.log` do `Overview.tsx` | `Overview.tsx` | -0.2s |
| 1.4 | Remover debug log e memoizar `shouldFilter()` | `paymentsLoaderOptimized.ts` | -0.5s |
| 1.5 | Remover todos `console.log` do `paymentConverter.ts` | `paymentConverter.ts` | -0.5s+ |

### Fase 2 — Lazy Loading (1-2h) 🚀

| # | Ação | Arquivo | Ganho estimado |
|---|---|---|---|
| 2.1 | Lazy load de todas as páginas principais | `App.tsx` | **-3 a -8s no 1º load** |
| 2.2 | Lazy load dos módulos pesados do admin | `AdminDashboard/index.tsx` | -1 a -2s |

```ts
// App.tsx — converter para lazy:
const AdminDashboard = lazy(() => import('./pages/AdminDashboard/index'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard/index'));
const AffiliateAdminDashboard = lazy(() => import('./pages/AffiliateAdminDashboard/index'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard/index'));
const ScholarshipPage = lazy(() => import('./pages/Scholarships'));
const Auth = lazy(() => import('./pages/Auth'));
const ForStudents = lazy(() => import('./pages/ForStudents'));
const QuickRegistration = lazy(() => import('./pages/QuickRegistration'));
// ... e demais páginas pesadas

// AdminDashboard/index.tsx — converter para lazy:
const AffiliateManagement = lazy(() => import('./AffiliateManagement'));
const MatriculaRewardsAdmin = lazy(() => import('./MatriculaRewardsAdmin'));
const NewsletterManagement = lazy(() => import('./NewsletterManagement'));
const TermsManagement = lazy(() => import('./TermsManagement'));
const CouponManagement = lazy(() => import('./CouponManagement'));
const AdminStudentDetailsRefactored = lazy(() => import('./AdminStudentDetails.refactored'));
```

### Fase 3 — Consolidar Notificações (1h) 🔔

| # | Ação | Arquivo | Ganho estimado |
|---|---|---|---|
| 3.1 | Remover `useUnreadMessagesCount` do layout | `AdminDashboardLayout.tsx` | -1 query por navegação |
| 3.2 | Simplificar lógica do `displayUnreadCount` | `AdminDashboardLayout.tsx` | - |

### Fase 4 — Payment Management Batch (2-3h) 💳

| # | Ação | Arquivo | Ganho estimado |
|---|---|---|---|
| 4.1 | Criar `getGrossPaidAmountsBatch()` | `paymentConverter.ts` | **-N queries → 1 query** |
| 4.2 | Atualizar `usePaymentsQuery` para usar batch | `usePaymentQueries.ts` | **-5 a -20s** |
| 4.3 | Paralelizar `paymentsLoaderOptimized.ts` | `paymentsLoaderOptimized.ts` | -2 a -4s |
| 4.4 | Eliminar queries redundantes no `zelleLoader` | `zelleLoader.ts` | -1 a -2s (prod) |

### Fase 5 — Limpeza Final (30 min) 🧹

| # | Ação | Arquivo |
|---|---|---|
| 5.1 | Verificar e deletar `AdminStudentDetails.tsx` (326 KB legacy) | `AdminStudentDetails.tsx` |
| 5.2 | Verificar se `QuickRegistration.tsx.tmp` pode ser removido | `QuickRegistration.tsx.tmp` |

---

## 🎯 Resultado Esperado

| Métrica | Antes | Depois |
|---|---|---|
| Primeiro carregamento TTI | **6 a 25s** | **< 2s** |
| Navegação entre páginas do admin | **3 a 8s** | **< 0.5s** |
| Payment Management — 1ª abertura | **8 a 30s** | **< 3s** |
| Payment Management — 2ª abertura (cache) | **3 a 5s** | **< 0.5s** |
| Bundle JS transferido | **~12.5 MB** | **~2 a 3 MB** |
| Queries no carregamento do dashboard | **8 sequenciais** | **5 paralelas** |
| Queries no Payment Management | **~100+ (N+1)** | **~8 paralelas** |
| Hooks de notificação no layout | **3 hooks (2 com queries)** | **1 hook** |

---

## 🗂️ Arquivos Afetados (Resumo)

| Arquivo | Tipo de Problema |
|---|---|
| `src/App.tsx` | Sem lazy loading para páginas pesadas |
| `src/pages/AdminDashboard/index.tsx` | 8 queries sequenciais + query duplicada + sem lazy loading interno |
| `src/pages/AdminDashboard/AdminDashboardLayout.tsx` | 3 hooks de notificação (2 com queries no banco) |
| `src/pages/AdminDashboard/Overview.tsx` | Queries independentes + RPC duplicada + console.logs em useMemo |
| `src/pages/AdminDashboard/PaymentManagement.tsx` | useUniversitiesQuery/useAffiliatesQuery sempre ativos |
| `src/pages/AdminDashboard/PaymentManagement/hooks/usePaymentQueries.ts` | N+1 por usuário (getGrossPaidAmounts em loop) |
| `src/pages/AdminDashboard/PaymentManagement/data/loaders/paymentsLoaderOptimized.ts` | Queries sequenciais + shouldFilter() com console.log |
| `src/pages/AdminDashboard/PaymentManagement/data/loaders/zelleLoader.ts` | 4 queries (2 redundantes em produção) |
| `src/utils/paymentConverter.ts` | console.log em cada iteração de loop (centenas por carregamento) |
