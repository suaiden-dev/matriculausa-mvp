# 🔍 Request Tracker - Análise de Performance

## O que foi implementado

Foi criado um sistema de rastreamento de requisições para identificar e analisar problemas de performance na página Payment Management.

## Como usar

1. **Ativar o Tracker:**
   - Abra a página Payment Management (`/admin/dashboard/payments`)
   - No painel flutuante no canto inferior direito, marque a checkbox "Ativar"
   - O tracker começará a mapear todas as requisições Supabase

2. **Visualizar Relatório em Tempo Real:**
   - O painel mostra estatísticas atualizadas a cada segundo:
     - Total de requisições
     - Tempo total
     - Requisições por operação (select, rpc, etc.)
     - Requisições por tabela
     - Requisições por função RPC
     - Padrões N+1 detectados automaticamente
     - Top 20 requisições mais lentas (>200ms)

3. **Exportar Relatório:**
   - Clique no botão "Exportar" para baixar um relatório JSON completo
   - O relatório inclui todas as requisições com timestamps e durações

4. **Limpar Dados:**
   - Clique em "Limpar" para reiniciar o tracker e começar uma nova sessão

## Padrões N+1 Identificados

O tracker detecta automaticamente:
- Muitas chamadas individuais para a mesma função RPC (ex: `get_user_fee_overrides`)
- Muitas chamadas individuais para a mesma tabela sem batch
- Requisições que levam mais de 200ms

## Problemas Principais Identificados

### 1. `get_user_fee_overrides` - N+1 Query
**Problema:** Chamadas individuais para cada userId (linha 120-125 de `paymentsLoader.ts`)
- Se há 500 usuários = 500 requisições individuais

**Solução:** Implementada versão otimizada em `paymentsLoaderOptimized.ts` que:
- Tenta buscar diretamente da tabela `fee_overrides` com `IN` query
- Se não existir, usa chunks paralelos em vez de sequencial

### 2. `getPaymentDatesForUsers` - N+1 Query Massivo
**Problema:** Loop sequencial fazendo 4 chamadas por usuário (linha 13-22 de `paymentDatesLoader.ts`)
- Se há 500 usuários = 2000 requisições (500 * 4)

**Solução:** Implementada versão otimizada em `paymentDatesLoaderOptimized.ts` que:
- Busca todas as datas em uma única query com `IN` na tabela `individual_fee_payments`
- Reduz de 2000 requisições para apenas 1 query batch

## Como Aplicar as Otimizações

Para usar as versões otimizadas, substitua os imports em `PaymentManagement.tsx`:

```typescript
// ANTES:
import { loadPaymentsBaseData } from './PaymentManagement/data/loaders/paymentsLoader';
import { getPaymentDatesForUsersLoader } from './PaymentManagement/data/loaders/paymentDatesLoader';

// DEPOIS:
import { loadPaymentsBaseDataOptimized } from './PaymentManagement/data/loaders/paymentsLoaderOptimized';
import { getPaymentDatesForUsersLoaderOptimized } from './PaymentManagement/data/loaders/paymentDatesLoaderOptimized';
```

E substitua as chamadas:
```typescript
// ANTES:
const { ... } = await loadPaymentsBaseData(supabase);
const dates = await getPaymentDatesForUsers(userIds);

// DEPOIS:
const { ... } = await loadPaymentsBaseDataOptimized(supabase);
const dates = await getPaymentDatesForUsersLoaderOptimized(supabase, userIds);
```

## Verificação no Console do Navegador

Você também pode acessar o tracker diretamente no console:

```javascript
// Habilitar
window.requestTracker.enable();

// Ver relatório
window.requestTracker.getReport();

// Exportar
window.requestTracker.exportReport();

// Limpar
window.requestTracker.clear();

// Desabilitar
window.requestTracker.disable();
```

## Próximos Passos

1. **Testar as versões otimizadas** e comparar o número de requisições
2. **Criar funções RPC batch no banco** se ainda não existirem:
   - `get_user_fee_overrides_batch(user_ids[])`
   - `get_payment_dates_batch(user_ids[])`
3. **Implementar cache** para dados que não mudam frequentemente
4. **Lazy loading** para dados não críticos

