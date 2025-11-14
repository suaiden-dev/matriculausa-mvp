# RELATÓRIO DO PROJETO MATRICULAUSA

Data: 06/11/2025

## 1. TAREFAS PENDENTES / EM ANÁLISE

### 1.1 University Payment Requests – Pagamento Direto pela Administração

**Status:** Pendente de implementação

**Descrição:** Na aba de University Payment Requests, a Administração deve poder pagar a universidade sem ter um payment request criado pela universidade.

**Análise Técnica:**
- Sistema atual requer que a universidade crie um payment request antes do admin poder aprovar/pagar
- Necessário criar funcionalidade para admin criar payment request diretamente e marcá-lo como pago em um único fluxo
- Arquivos relacionados: `PaymentManagement.tsx`, `UniversityPaymentRequestService.ts`, `CreateUniversityPaymentModal.tsx`

**Arquivos a serem modificados:**
- `src/pages/AdminDashboard/PaymentManagement/components/UniversityRequests.tsx`
- `src/services/UniversityPaymentRequestService.ts`
- `src/pages/AdminDashboard/PaymentManagement/components/Modals/CreateUniversityPaymentModal.tsx`
- `supabase/migrations/` (se necessário ajustar RPC functions)

---

### 1.2 University Financial Management – Correção de Valores de Application Fee

**Status:** Pendente de correção

**Descrição:** Corrigir valores das applications fee dentro de `admindashboard/universities/financial`.

**Análise Técnica:**
- Página `UniversityFinancialManagement.tsx` utiliza hook `useUniversityFinancialData`
- Possível problema na lógica de cálculo ou agregação de application fees
- Verificar queries SQL e transformação de dados em `hooks/useUniversityFinancialData.ts`

**Arquivos a serem verificados:**
- `src/pages/AdminDashboard/UniversityFinancialManagement.tsx`
- `src/hooks/useUniversityFinancialData.ts`
- `src/pages/AdminDashboard/FinancialAnalytics/utils/transformFinancialData.ts`
- Queries relacionadas em migrations ou RPC functions

---

### 1.3 University Financial Management – Status de Pagamento Incorreto

**Status:** Pendente de correção

**Descrição:** Dentro da página `admindashboard/universities/financial`, não aparecem os valores de alguns clientes que pagaram mas lá marca como unpaid.

**Análise Técnica:**
- Problema de sincronização entre status de pagamento e exibição de valores
- Possível inconsistência entre tabelas `applications`, `stripe_payments`, `zelle_payments` e `payment_records`
- Verificar lógica de determinação de status "paid" vs "unpaid"

**Arquivos a serem verificados:**
- `src/hooks/useUniversityFinancialData.ts`
- `src/pages/AdminDashboard/UniversityFinancialManagement.tsx`
- Queries SQL que determinam status de pagamento
- Lógica de agregação de `paidApplicationsCount` e `totalRevenue`

---

### 1.4 Filtro Global de Dados de Teste para Admin

**Status:** Pendente de implementação

**Descrição:** Criar um filtro para não exibir dados de teste para o admin geral em nenhuma das páginas.

**Análise Técnica:**
- Sistema já possui filtros parciais em algumas páginas (ex: `StudentApplicationsView.tsx`, `AffiliateManagement.tsx`, `FinancialAnalytics`)
- Filtro atual baseado em email contendo "@uorak.com" ou "uorak"
- Necessário criar solução centralizada e aplicável a todas as páginas do admin dashboard
- Considerar criar hook ou utility function reutilizável

**Arquivos a serem modificados:**
- Criar: `src/hooks/useTestDataFilter.ts` ou `src/utils/testDataFilter.ts`
- Modificar todas as páginas do admin dashboard:
  - `src/pages/AdminDashboard.tsx`
  - `src/pages/AdminDashboard/PaymentManagement.tsx`
  - `src/pages/AdminDashboard/UniversityManagement.tsx`
  - `src/pages/AdminDashboard/UniversityFinancialManagement.tsx`
  - `src/pages/AdminDashboard/FinancialAnalytics/`
  - `src/pages/AdminDashboard/AffiliateManagement.tsx`
  - `src/pages/AdminDashboard/MatriculaRewardsAdmin.tsx`
  - `src/components/AdminDashboard/StudentApplicationsView.tsx`
  - Outras páginas do admin dashboard

**Estratégia sugerida:**
- Criar hook `useTestDataFilter()` que retorna função `shouldExcludeUser(email: string): boolean`
- Utilizar variável de ambiente ou configuração para determinar se filtro está ativo
- Aplicar filtro em todas as queries e transformações de dados

---

### 1.5 Stripe Payment – Animações de Sucesso e Falha

**Status:** Pendente de implementação

**Descrição:** Adição de animação no sucesso e na falha do pagamento via Stripe.

**Análise Técnica:**
- Sistema já possui componente `TransactionAnimation` em `SelectionProcessFeeSuccess.tsx`
- Necessário aplicar animações similares em outras páginas de sucesso/falha de pagamento Stripe
- Verificar todas as rotas de sucesso/falha de pagamento

**Arquivos a serem modificados:**
- `src/pages/CheckoutSuccess.tsx` (página genérica de sucesso)
- `src/pages/StudentDashboard/ApplicationFeeSuccess.tsx`
- `src/pages/StudentDashboard/I20ControlFeeSuccess.tsx`
- `src/pages/SuccessPage.tsx` (se ainda em uso)
- Criar componente reutilizável: `src/components/PaymentAnimation.tsx` (baseado em `TransactionAnimation`)

**Componente de referência:**
- `src/pages/StudentDashboard/SelectionProcessFeeSuccess.tsx` (linhas 8-308)

---

## 2. OBSERVAÇÕES TÉCNICAS

### 2.1 Estrutura de Payment Requests

Sistema utiliza `university_payout_requests` com campo `request_type` para diferenciar entre:
- `university_payment`: Pagamentos criados pela universidade
- Outros tipos (se houver)

Para implementar pagamento direto pelo admin, pode-se:
- Criar payment request com status `approved` diretamente
- Ou criar fluxo que cria e marca como pago em sequência

### 2.2 Filtros de Dados de Teste

Filtros atuais são inconsistentes:
- Algumas páginas verificam `isProductionHost` via `window.location.origin`
- Outras utilizam hook `useEnvironment()` com `isDevelopment`
- Algumas verificam email contendo "uorak", outras "@uorak.com"

**Recomendação:** Padronizar usando hook centralizado que verifica:
- Ambiente (dev/staging/prod)
- Email do usuário (padrão: excluir se contém "@uorak.com" ou "uorak")
- Configuração via variável de ambiente

### 2.3 Cálculo de Application Fees

Sistema processa application fees através de:
- `transformFinancialData.ts`: Processa applications e cria payment records
- `useUniversityFinancialData.ts`: Agrega dados por universidade
- Possível problema na lógica de `processApplications()` que determina valores de fees

### 2.4 Status de Pagamento

Status de pagamento pode ser determinado por:
- `stripe_payments` (status = 'succeeded')
- `zelle_payments` (status = 'approved')
- `payment_records` (status = 'paid')
- Verificar sincronização entre essas tabelas

---

## 3. PRIORIZAÇÃO SUGERIDA

1. **Alta Prioridade:**
   - 1.2 Correção de valores de Application Fee
   - 1.3 Status de pagamento incorreto

2. **Média Prioridade:**
   - 1.1 Pagamento direto pela administração
   - 1.4 Filtro global de dados de teste

3. **Baixa Prioridade:**
   - 1.5 Animações de sucesso/falha (melhoria de UX)

---

## 4. DEPENDÊNCIAS ENTRE TAREFAS

- **1.4 (Filtro Global)** pode afetar resultados de **1.2** e **1.3** se dados de teste estiverem interferindo nos cálculos
- **1.1 (Pagamento Direto)** pode requerer ajustes em queries relacionadas a **1.2** e **1.3**
- **1.5 (Animações)** é independente das outras tarefas

---

## 5. ARQUIVOS PRINCIPAIS DO SISTEMA

### Payment Management
- `src/pages/AdminDashboard/PaymentManagement.tsx`
- `src/services/UniversityPaymentRequestService.ts`
- `src/services/AffiliatePaymentRequestService.ts`

### University Financial
- `src/pages/AdminDashboard/UniversityFinancialManagement.tsx`
- `src/hooks/useUniversityFinancialData.ts`
- `src/pages/AdminDashboard/FinancialAnalytics/`

### Payment Success Pages
- `src/pages/StudentDashboard/SelectionProcessFeeSuccess.tsx`
- `src/pages/StudentDashboard/ApplicationFeeSuccess.tsx`
- `src/pages/StudentDashboard/I20ControlFeeSuccess.tsx`
- `src/pages/CheckoutSuccess.tsx`

### Data Filtering
- `src/hooks/useEnvironment.ts`
- `src/components/AdminDashboard/StudentApplicationsView.tsx` (exemplo de filtro)
- `src/pages/AdminDashboard/FinancialAnalytics/data/loaders/financialDataLoader.ts` (exemplo de filtro)






