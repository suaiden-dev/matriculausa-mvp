# Plano de Debug Completo - Available Balance

## Objetivo

Criar um sistema de debug completo para identificar exatamente onde e como os cálculos de Available Balance estão divergindo entre:
- Financial Overview ($11,950)
- Payment Requests ($13,250 na imagem, mas controle mostra $11,450)
- Cálculo SQL correto ($11,851)

## Estratégia de Debug

### 1. Adicionar Logs Detalhados no Código

#### 1.1 FinancialOverview.tsx

Adicionar logs em pontos críticos:

```typescript
// Após calcular totalRevenue
console.group('🔍 [FinancialOverview] Total Revenue Calculation');
console.log('Profiles count:', profiles.length);
console.log('Total Revenue:', totalRevenue);
console.log('Breakdown por estudante:', profiles.map(p => ({
  profile_id: p.profile_id,
  selection: /* cálculo */,
  scholarship: /* cálculo */,
  i20: /* cálculo */,
  total: /* soma */
})));
console.groupEnd();

// Após calcular manualRevenue
console.group('🔍 [FinancialOverview] Manual Revenue Calculation');
console.log('Manual Revenue:', manualRevenue);
console.log('Breakdown manual por estudante:', /* detalhado */);
console.groupEnd();

// Após calcular payment requests
console.group('🔍 [FinancialOverview] Payment Requests');
console.log('Total Paid Out:', totalPaidOut);
console.log('Total Approved:', totalApproved);
console.log('Total Pending:', totalPending);
console.log('All Requests:', affiliateRequests);
console.groupEnd();

// Cálculo final
console.group('🔍 [FinancialOverview] Available Balance Final');
console.log('Total Revenue:', totalRevenue);
console.log('Manual Revenue:', manualRevenue);
console.log('Net Revenue (Total - Manual):', totalRevenue - manualRevenue);
console.log('Payment Requests Total:', totalPaidOut + totalApproved + totalPending);
console.log('Available Balance:', availableBalance);
console.log('Formula: (', totalRevenue, '-', manualRevenue, ') - (', totalPaidOut, '+', totalApproved, '+', totalPending, ') =', availableBalance);
console.groupEnd();
```

#### 1.2 PaymentManagement.tsx

Adicionar logs idênticos para comparação lado a lado:

```typescript
// Mesmos logs do FinancialOverview, mas com prefixo [PaymentManagement]
console.group('🔍 [PaymentManagement] Total Revenue Calculation');
// ... mesma estrutura
console.groupEnd();
```

### 2. Criar Função de Debug Centralizada

Criar um arquivo `debugAffiliateBalance.ts`:

```typescript
interface DebugAffiliateBalanceParams {
  userId: string;
  source: 'FinancialOverview' | 'PaymentManagement';
}

interface DebugResult {
  profiles: any[];
  totalRevenue: number;
  manualRevenue: number;
  paymentRequests: {
    totalPaidOut: number;
    totalApproved: number;
    totalPending: number;
    allRequests: any[];
  };
  availableBalance: number;
  breakdown: {
    byStudent: Array<{
      profile_id: string;
      full_name: string;
      email: string;
      selection_revenue: number;
      scholarship_revenue: number;
      i20_revenue: number;
      total_revenue: number;
      selection_manual: number;
      scholarship_manual: number;
      i20_manual: number;
      total_manual: number;
    }>;
    summary: {
      total_students: number;
      students_with_payments: number;
      total_revenue: number;
      total_manual: number;
    };
  };
}

export async function debugAffiliateBalance(
  params: DebugAffiliateBalanceParams
): Promise<DebugResult> {
  // Implementar lógica completa de cálculo com logs detalhados
  // Retornar objeto estruturado com todos os dados
}
```

### 3. Queries SQL de Verificação

#### 3.1 Query para Comparar Estudante por Estudante

```sql
-- Comparar cálculo de receita por estudante
WITH affiliate_admin_info AS (
  SELECT aa.id as affiliate_admin_id, aa.user_id
  FROM affiliate_admins aa
  WHERE aa.user_id = '6a3c5c04-fc94-4938-bdc2-c14c9ff8459c'
),
profiles AS (
  SELECT 
    p.profile_id,
    p.user_id,
    up.full_name,
    up.email,
    p.has_paid_selection_process_fee,
    p.has_paid_i20_control_fee,
    p.is_scholarship_fee_paid,
    p.dependents,
    p.system_type,
    up.selection_process_fee_payment_method,
    up.i20_control_fee_payment_method
  FROM affiliate_admin_info aai
  CROSS JOIN LATERAL get_affiliate_admin_profiles_with_fees(aai.user_id) p
  JOIN user_profiles up ON up.id = p.profile_id
),
-- ... resto da query com breakdown detalhado
SELECT 
  full_name,
  email,
  -- Receita total
  selection_revenue,
  scholarship_revenue,
  i20_revenue,
  total_revenue,
  -- Receita manual
  selection_manual,
  scholarship_manual,
  i20_manual,
  total_manual,
  -- Flags de debug
  has_paid_selection_process_fee,
  has_paid_i20_control_fee,
  is_scholarship_fee_paid,
  selection_process_fee_payment_method,
  i20_control_fee_payment_method,
  system_type
FROM /* ... */
ORDER BY total_revenue DESC;
```

#### 3.2 Query para Verificar Payment Methods

```sql
-- Verificar todos os payment_methods para identificar inconsistências
SELECT 
  up.full_name,
  up.email,
  up.selection_process_fee_payment_method,
  up.i20_control_fee_payment_method,
  sa.scholarship_fee_payment_method,
  sa.is_scholarship_fee_paid,
  up.system_type
FROM user_profiles up
LEFT JOIN scholarship_applications sa ON sa.student_id = up.id
WHERE up.seller_referral_code IN (
  SELECT referral_code FROM sellers 
  WHERE affiliate_admin_id = '525e4fba-5743-49c0-8ab8-f0dba284bc7a'
)
AND up.role = 'student'
AND (
  up.has_paid_selection_process_fee = true
  OR up.has_paid_i20_control_fee = true
  OR sa.is_scholarship_fee_paid = true
)
ORDER BY up.full_name;
```

### 4. Componente de Debug Visual

Criar um componente React para exibir os dados de debug:

```typescript
// DebugAffiliateBalance.tsx
interface DebugAffiliateBalanceProps {
  userId: string;
}

export const DebugAffiliateBalance: React.FC<DebugAffiliateBalanceProps> = ({ userId }) => {
  const [debugData, setDebugData] = useState<DebugResult | null>(null);
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    // Carregar dados de debug
    // Comparar FinancialOverview vs PaymentManagement
  }, [userId]);

  return (
    <div className="debug-panel">
      <h2>Debug: Available Balance</h2>
      
      {/* Tabs para diferentes visualizações */}
      <Tabs>
        <Tab label="Resumo">
          {/* Valores finais lado a lado */}
        </Tab>
        <Tab label="Por Estudante">
          {/* Tabela detalhada estudante por estudante */}
        </Tab>
        <Tab label="Payment Requests">
          {/* Lista de payment requests */}
        </Tab>
        <Tab label="Comparação">
          {/* Comparação lado a lado FinancialOverview vs PaymentManagement */}
        </Tab>
      </Tabs>
    </div>
  );
};
```

### 5. Checklist de Verificação

#### 5.1 Verificação de Dados de Entrada

- [ ] Quantos estudantes estão sendo retornados pela RPC?
- [ ] Quantos estudantes estão sendo retornados pela query direta?
- [ ] Todos os estudantes têm `seller_referral_code` válido?
- [ ] Todos os sellers estão ativos?

#### 5.2 Verificação de Flags de Pagamento

Para cada estudante com pagamentos:
- [ ] `has_paid_selection_process_fee` está correto?
- [ ] `has_paid_i20_control_fee` está correto?
- [ ] `is_scholarship_fee_paid` está correto? (verificar RPC vs scholarship_applications)
- [ ] `system_type` está correto?

#### 5.3 Verificação de Payment Methods

Para cada estudante:
- [ ] `selection_process_fee_payment_method` está preenchido corretamente?
- [ ] `i20_control_fee_payment_method` está preenchido corretamente?
- [ ] `scholarship_fee_payment_method` na tabela `scholarship_applications` está correto?
- [ ] Há algum `null` onde deveria ser `'manual'`?

#### 5.4 Verificação de Overrides

Para cada estudante:
- [ ] Há overrides? Se sim, quais valores?
- [ ] Os overrides estão sendo aplicados corretamente?
- [ ] Os overrides estão sendo considerados no cálculo de receita manual?

#### 5.5 Verificação de Cálculos

Para cada estudante:
- [ ] Selection Process Fee está sendo calculado corretamente?
  - Base fee (350/400) + dependents (150 cada)
  - Com override quando aplicável
- [ ] Scholarship Fee está sendo calculado corretamente?
  - Base fee (550/900)
  - Com override quando aplicável
- [ ] I-20 Control Fee está sendo calculado corretamente?
  - Sempre 900
  - Só conta se scholarship foi pago
  - Com override quando aplicável

#### 5.6 Verificação de Payment Requests

- [ ] Quantos payment requests existem?
- [ ] Quais são os status de cada request?
- [ ] Os valores estão corretos?
- [ ] Estão sendo somados corretamente (paid + approved + pending)?

### 6. Script de Comparação Automática

Criar script que compara os dois cálculos:

```typescript
// compareCalculations.ts
async function compareCalculations(userId: string) {
  const financialOverview = await calculateFinancialOverview(userId);
  const paymentManagement = await calculatePaymentManagement(userId);
  
  const differences = {
    totalRevenue: financialOverview.totalRevenue - paymentManagement.totalRevenue,
    manualRevenue: financialOverview.manualRevenue - paymentManagement.manualRevenue,
    availableBalance: financialOverview.availableBalance - paymentManagement.availableBalance,
    students: {
      financialOverview: financialOverview.profiles.length,
      paymentManagement: paymentManagement.profiles.length,
      difference: financialOverview.profiles.length - paymentManagement.profiles.length
    }
  };
  
  // Comparar estudante por estudante
  const studentDifferences = compareStudents(
    financialOverview.breakdown.byStudent,
    paymentManagement.breakdown.byStudent
  );
  
  return {
    differences,
    studentDifferences,
    financialOverview,
    paymentManagement
  };
}
```

### 7. Dashboard de Debug (Opcional)

Criar uma página de debug acessível apenas em desenvolvimento:

```typescript
// pages/Debug/AffiliateBalanceDebug.tsx
export const AffiliateBalanceDebug: React.FC = () => {
  const { user } = useAuth();
  const [debugData, setDebugData] = useState<any>(null);
  
  // Carregar dados de debug
  // Exibir em formato visual comparativo
  
  return (
    <div>
      <h1>Debug: Affiliate Balance</h1>
      {/* Componentes de visualização */}
    </div>
  );
};
```

### 8. Passos de Execução

1. **Adicionar logs no código**
   - Adicionar logs detalhados em FinancialOverview.tsx
   - Adicionar logs detalhados em PaymentManagement.tsx
   - Criar função de debug centralizada

2. **Executar com acesso à conta**
   - Abrir Financial Overview
   - Abrir Payment Requests
   - Capturar logs do console
   - Comparar valores lado a lado

3. **Executar queries SQL**
   - Executar query de breakdown por estudante
   - Executar query de payment methods
   - Comparar com logs do código

4. **Identificar divergências**
   - Comparar estudante por estudante
   - Identificar onde os cálculos divergem
   - Documentar cada divergência encontrada

5. **Corrigir problemas identificados**
   - Corrigir RPC (verificar scholarship_applications para legacy)
   - Corrigir dados (i20_control_fee_payment_method do Thamara)
   - Recalcular e verificar

### 9. Template de Relatório de Debug

```markdown
# Relatório de Debug - Available Balance

## Data: [DATA]
## Usuário: [EMAIL]

### Valores Encontrados
- Financial Overview: $[VALOR]
- Payment Requests: $[VALOR]
- Cálculo SQL: $[VALOR]

### Divergências Identificadas

#### 1. [NOME DO ESTUDANTE]
- **Problema**: [DESCRIÇÃO]
- **Causa**: [CAUSA]
- **Impacto**: $[VALOR]

#### 2. [OUTRO PROBLEMA]
- ...

### Resumo
- Total de divergências: [NÚMERO]
- Impacto total: $[VALOR]
- Status: [RESOLVIDO/PENDENTE]
```

### 10. Ferramentas Úteis

1. **Browser DevTools**
   - Console para logs
   - Network tab para verificar requests
   - Application tab para verificar cache

2. **Supabase Dashboard**
   - SQL Editor para queries
   - Table Editor para verificar dados
   - Logs para verificar erros

3. **VS Code**
   - Breakpoints no código
   - Debug console
   - Extensions úteis

## Próximos Passos

1. Aguardar acesso à conta
2. Adicionar logs detalhados no código
3. Executar debug completo
4. Documentar todas as divergências
5. Corrigir problemas identificados
6. Validar correções

