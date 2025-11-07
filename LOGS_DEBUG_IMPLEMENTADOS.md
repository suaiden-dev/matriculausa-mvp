# Logs de Debug Implementados

## ✅ Logs Adicionados

Foram adicionados logs detalhados em todas as páginas de pagamento do Affiliate Admin Dashboard para facilitar o debug e investigação de discrepâncias.

## 📋 Páginas com Logs

### 1. FinancialOverview.tsx

#### Logs Implementados:

1. **Dados Iniciais** (`🔍 [FinancialOverview] Dados Iniciais`)
   - userId
   - affiliateAdminId
   - sellers count
   - profiles count (RPC)
   - sample profile

2. **Total Revenue Calculation** (`🔍 [FinancialOverview] Total Revenue Calculation`)
   - Total Revenue
   - Students with revenue
   - Breakdown by student (primeiros 10)
   - Total students

3. **Manual Revenue Calculation** (`🔍 [FinancialOverview] Manual Revenue Calculation`)
   - Manual Revenue (Outside Payments)
   - Students with manual payments
   - Breakdown by student (todos)

4. **Payment Requests** (`🔍 [FinancialOverview] Payment Requests`)
   - Total requests
   - Requests by status (paid, approved, pending, rejected)
   - Total Paid Out
   - Total Approved
   - Total Pending
   - All requests (com id, amount, status, created_at)

5. **Available Balance Final Calculation** (`🔍 [FinancialOverview] Available Balance Final Calculation`)
   - Total Revenue
   - Manual Revenue (Outside)
   - Net Revenue (Total - Manual)
   - Payment Requests Total
   - Available Balance
   - Formula completa

### 2. PaymentManagement.tsx

#### Logs Implementados:

1. **Dados Iniciais** (`🔍 [PaymentManagement] Dados Iniciais`)
   - userId
   - affiliateAdminId
   - sellers count
   - sellerCodes
   - userProfilesData count
   - sample profile

2. **Total Revenue Calculation** (`🔍 [PaymentManagement] Total Revenue Calculation`)
   - Total Revenue
   - Students with revenue
   - Breakdown by student (primeiros 10)
   - Total students

3. **Manual Revenue Calculation** (`🔍 [PaymentManagement] Manual Revenue Calculation`)
   - Manual Revenue (Outside Payments)
   - Students with manual payments
   - Breakdown by student (todos)

4. **Payment Requests** (`🔍 [PaymentManagement] Payment Requests`)
   - Total requests
   - Requests by status (paid, approved, pending, rejected)
   - All requests (com id, amount, status, created_at)

5. **Available Balance Final Calculation** (`🔍 [PaymentManagement] Available Balance Final Calculation`)
   - Total Revenue
   - Manual Revenue (Outside)
   - Net Revenue (Total - Manual)
   - Payment Requests (paid, approved, pending, total)
   - Available Balance
   - Formula completa

6. **Payment Requests Loader** (`🔍 [PaymentManagement] Payment Requests Loader`)
   - userId
   - Total requests fetched
   - Requests by status
   - All requests (com id, amount, status, created_at, updated_at)

## 🎯 Como Usar os Logs

### No Console do Navegador

1. Abra o DevTools (F12)
2. Vá para a aba "Console"
3. Filtre por `[FinancialOverview]` ou `[PaymentManagement]`
4. Expanda os grupos de logs para ver detalhes

### Estrutura dos Logs

Os logs estão organizados em grupos usando `console.group()` para facilitar a navegação:

```
🔍 [FinancialOverview] Dados Iniciais
  ├─ userId: ...
  ├─ affiliateAdminId: ...
  └─ ...

🔍 [FinancialOverview] Total Revenue Calculation
  ├─ Total Revenue: $23,047.00
  ├─ Students with revenue: 25
  └─ Breakdown by student: [...]
```

## 📊 Informações Capturadas

### Breakdown por Estudante

Cada cálculo de revenue inclui um breakdown detalhado por estudante:

```typescript
{
  profile_id: string,
  selection: number,    // Selection Process Fee
  scholarship: number,  // Scholarship Fee
  i20: number,         // I-20 Control Fee
  total: number        // Total do estudante
}
```

### Payment Requests

Todos os payment requests são logados com:
- ID
- Amount (USD)
- Status
- Created At
- Updated At (quando disponível)

## 🔍 Debug de Discrepâncias

Com esses logs, é possível:

1. **Verificar Total Revenue**: Comparar o breakdown por estudante entre FinancialOverview e PaymentManagement
2. **Verificar Manual Revenue**: Identificar quais estudantes têm pagamentos "outside" e seus valores
3. **Verificar Payment Requests**: Confirmar quais requests estão sendo contados e seus status
4. **Verificar Available Balance**: Ver a fórmula completa e identificar onde pode haver diferenças

## 📝 Exemplo de Uso

### Para debugar uma discrepância:

1. Abra ambas as páginas (FinancialOverview e PaymentManagement)
2. Abra o Console do navegador
3. Compare os logs:
   - `[FinancialOverview] Total Revenue Calculation` vs `[PaymentManagement] Total Revenue Calculation`
   - `[FinancialOverview] Manual Revenue Calculation` vs `[PaymentManagement] Manual Revenue Calculation`
   - `[FinancialOverview] Available Balance Final Calculation` vs `[PaymentManagement] Available Balance Final Calculation`

### Identificar diferenças:

- Se o Total Revenue for diferente, compare os breakdowns por estudante
- Se o Manual Revenue for diferente, compare os breakdowns de pagamentos outside
- Se o Available Balance for diferente, compare as fórmulas e os payment requests

## ✅ Status

- ✅ Logs implementados em FinancialOverview.tsx
- ✅ Logs implementados em PaymentManagement.tsx
- ✅ Logs organizados em grupos para facilitar navegação
- ✅ Breakdown detalhado por estudante
- ✅ Informações completas de payment requests
- ✅ Fórmulas de cálculo logadas
- ✅ Sem erros de lint

## 🎯 Próximos Passos

Quando houver uma discrepância:

1. Abrir o Console do navegador
2. Filtrar pelos logs relevantes
3. Comparar os valores entre as páginas
4. Identificar onde está a diferença usando os breakdowns
5. Corrigir o problema identificado

