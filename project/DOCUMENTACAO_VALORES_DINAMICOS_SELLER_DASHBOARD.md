# 📚 Documentação: Sistema de Valores Dinâmicos no Dashboard do Seller

## 🎯 Visão Geral

O sistema implementa valores dinâmicos de taxas baseados em pacotes de bolsas de estudo, permitindo que diferentes estudantes paguem valores diferentes conforme seu pacote atribuído, e que o dashboard do seller reflita corretamente esses valores dinâmicos.

## 🏗️ Arquitetura do Sistema

### 1. **Função Principal do Banco de Dados**

#### `get_user_package_fees(user_id_param uuid)`
**Arquivo:** `project/supabase/migrations/20250120000001_create_scholarship_packages.sql`

```sql
CREATE OR REPLACE FUNCTION get_user_package_fees(user_id_param uuid)
RETURNS TABLE (
  selection_process_fee numeric,
  i20_control_fee numeric,
  scholarship_fee numeric,
  total_paid numeric,
  scholarship_amount numeric,
  package_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.selection_process_fee,
    sp.i20_control_fee,
    sp.scholarship_fee,
    sp.total_paid,
    sp.scholarship_amount,
    sp.name as package_name
  FROM user_profiles up
  JOIN scholarship_packages sp ON up.scholarship_package_id = sp.id
  WHERE up.user_id = user_id_param
  AND sp.is_active = true;
END;
$$ LANGUAGE plpgsql;
```

**Função:** Busca as taxas específicas do pacote de bolsa do usuário
**Retorna:** Valores dinâmicos das taxas + nome do pacote
**Uso:** Chamada via RPC em todos os componentes do dashboard

### 2. **Função de Performance do Seller**

#### `get_seller_individual_performance(seller_referral_code_param text)`
**Arquivo:** `project/supabase/migrations/20250201000002_create_seller_individual_performance.sql`

```sql
CREATE OR REPLACE FUNCTION get_seller_individual_performance(seller_referral_code_param text)
RETURNS TABLE (
  total_students bigint,
  total_revenue numeric,  -- ← VALOR DINÂMICO AQUI
  monthly_students bigint,
  conversion_rate numeric,
  monthly_data jsonb,
  ranking_position bigint,
  monthly_goals jsonb,
  achievements jsonb
) AS $$
```

**Função:** Calcula métricas de performance do seller
**Valor Dinâmico:** `total_revenue` é calculado somando `payment_amount` da tabela `affiliate_referrals`
**Fonte:** Valores reais pagos pelos estudantes (dinâmicos)

## 🔧 Hooks e Componentes Frontend

### 1. **Hook Principal: `useDynamicFees`**

**Arquivo:** `project/src/hooks/useDynamicFees.ts`

```typescript
export const useDynamicFees = () => {
  const { userProfile } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [feeLoading, setFeeLoading] = useState(true);

  // Busca pacotes disponíveis
  const loadPackages = async () => {
    const { data, error } = await supabase
      .from('scholarship_packages')
      .select('*')
      .eq('is_active', true);
  };

  // Busca taxas do pacote do usuário
  const loadUserPackageFees = async () => {
    if (!userProfile?.id) return;
    
    const { data: packageFees, error } = await supabase.rpc('get_user_package_fees', {
      user_id_param: userProfile.id
    });
  };

  return {
    selectionProcessFee: hasSellerPackage ? packageFees.selection_process_fee : '$350.00',
    scholarshipFee: hasSellerPackage ? packageFees.scholarship_fee : '$550.00',
    i20ControlFee: hasSellerPackage ? packageFees.i20_control_fee : '$900.00',
    hasSellerPackage: !!packageFees,
    packageName: packageFees?.package_name
  };
};
```

**Função:** Fornece valores dinâmicos baseados no pacote do usuário logado
**Uso:** Componentes que precisam mostrar valores para o usuário atual

### 2. **Hook de Configuração: `useFeeConfig`**

**Arquivo:** `project/src/hooks/useFeeConfig.ts`

```typescript
export const useFeeConfig = (userId?: string) => {
  const [feeConfigs, setFeeConfigs] = useState<FeeConfigs>({
    selection_process_fee: 350,
    application_fee_default: 350,
    scholarship_fee: 550,
    i20_control_fee: 900
  });

  const getFeeAmount = (feeType: string): number => {
    return feeConfigs[feeType as keyof FeeConfigs] || 0;
  };

  const formatFeeAmount = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${numAmount.toFixed(2)}`;
  };

  return { getFeeAmount, formatFeeAmount, feeConfigs };
};
```

**Função:** Fornece valores padrão e formatação de valores
**Uso:** Fallback quando não há pacote dinâmico

## 📊 Implementação nos Componentes do Dashboard

### 1. **Dashboard Principal (`SellerDashboard/index.tsx`)**

```typescript
const loadSellerData = async () => {
  // Busca performance do seller
  const { data: performanceData, error: performanceError } = await supabase.rpc(
    'get_seller_individual_performance', 
    { seller_referral_code_param: seller.referral_code }
  );

  // performanceData.total_revenue já contém valores dinâmicos
  // porque vem da tabela affiliate_referrals com payment_amount correto
  setTotalRevenue(Number(performanceData[0]?.total_revenue || 0));
};
```

**Fonte dos Valores:** RPC `get_seller_individual_performance` que soma `payment_amount` da `affiliate_referrals`

### 2. **Lista de Estudantes (`MyStudents.tsx`)**

```typescript
// Estado para armazenar taxas de cada estudante
const [studentPackageFees, setStudentPackageFees] = useState<{[key: string]: any}>({});

// Função para buscar taxas de um estudante específico
const loadStudentPackageFees = async (studentUserId: string) => {
  const { data: packageFees, error } = await supabase.rpc('get_user_package_fees', {
    user_id_param: studentUserId
  });
  
  setStudentPackageFees(prev => ({
    ...prev,
    [studentUserId]: packageFees[0]
  }));
};

// Cálculo do total pago com valores dinâmicos
const calculateStudentTotalPaid = (student: Student): number => {
  const packageFees = studentPackageFees[student.id];
  
  if (student.has_paid_selection_process_fee) {
    total += packageFees ? packageFees.selection_process_fee : getFeeAmount('selection_process');
  }
  // ... outras taxas
};
```

**Fonte dos Valores:** RPC `get_user_package_fees` para cada estudante individual

### 3. **Detalhes do Estudante (`StudentDetails.tsx`)**

```typescript
// Função para buscar taxas do estudante sendo visualizado
const loadStudentPackageFees = useCallback(async (studentUserId: string) => {
  const { data: packageFees, error } = await supabase.rpc('get_user_package_fees', {
    user_id_param: studentUserId
  });
  
  setStudentPackageFees(packageFees[0]);
}, []);

// Renderização com valores dinâmicos
{studentPackageFees ? formatFeeAmount(studentPackageFees.selection_process_fee) : formatFeeAmount(getFeeAmount('selection_process'))}
```

**Fonte dos Valores:** RPC `get_user_package_fees` para o estudante específico

## 💳 Sistema de Pagamentos

### 1. **Aprovação de Pagamentos Zelle (`PaymentManagement.tsx`)**

```typescript
const approveZellePayment = async (payment: ZellePayment) => {
  // Buscar valor dinâmico correto baseado no pacote do usuário
  let correctAmount = payment.amount; // Valor padrão

  const { data: userPackageFees, error: packageError } = await supabase.rpc('get_user_package_fees', {
    user_id_param: payment.user_id
  });

  if (!packageError && userPackageFees && userPackageFees.length > 0) {
    const packageFees = userPackageFees[0];
    correctAmount = packageFees.selection_process_fee; // Valor dinâmico
  }

  // Registrar no faturamento com valor correto
  await supabase.rpc('register_payment_billing', {
    user_id_param: payment.user_id,
    fee_type_param: 'selection_process',
    amount_param: correctAmount, // ← VALOR DINÂMICO AQUI
    payment_session_id_param: `zelle_${payment.id}`,
    payment_method_param: 'zelle'
  });
};
```

**Função:** Garante que o faturamento seja registrado com valores dinâmicos corretos

### 2. **Função de Registro de Faturamento**

**Arquivo:** `project/supabase/migrations/20250131000005_fix_register_payment_billing_for_sellers.sql`

```sql
CREATE OR REPLACE FUNCTION register_payment_billing(
  user_id_param uuid,
  fee_type_param text,
  amount_param numeric,  -- ← VALOR DINÂMICO RECEBIDO
  payment_session_id_param text DEFAULT NULL,
  payment_method_param text DEFAULT 'manual'
)
RETURNS void AS $$
BEGIN
  -- Registra na tabela affiliate_referrals com o valor correto
  INSERT INTO affiliate_referrals (
    referrer_id,
    referred_id,
    affiliate_code,
    payment_amount,  -- ← VALOR DINÂMICO ARMAZENADO
    credits_earned,
    status,
    payment_session_id,
    completed_at
  ) VALUES (
    referrer_id_found,
    user_id_param,
    affiliate_code_found,
    amount_param,  -- ← VALOR DINÂMICO
    -- ... outros campos
  );
END;
$$ LANGUAGE plpgsql;
```

## 🔄 Fluxo Completo de Valores Dinâmicos

### 1. **Fluxo de Pagamento:**
```
Estudante com Pacote → Pagamento → Aprovação Admin → Registro Faturamento → Dashboard Seller
```

### 2. **Fluxo de Exibição:**
```
Dashboard Seller → RPC get_seller_individual_performance → Soma affiliate_referrals.payment_amount → Total Revenue Dinâmico
```

### 3. **Fluxo de Detalhes:**
```
Lista Estudantes → RPC get_user_package_fees (para cada estudante) → Valores Específicos → Cálculo Total Dinâmico
```

## 📋 Tabelas Envolvidas

### 1. **`scholarship_packages`**
- Armazena pacotes de bolsas com valores específicos
- Campos: `selection_process_fee`, `scholarship_fee`, `i20_control_fee`

### 2. **`user_profiles`**
- Liga usuários aos pacotes via `scholarship_package_id`
- Campo: `scholarship_package_id`

### 3. **`affiliate_referrals`**
- Armazena pagamentos reais com valores dinâmicos
- Campo: `payment_amount` (valor real pago)

### 4. **`sellers`**
- Dados dos vendedores
- Campo: `referral_code`

## 🎯 Resultado Final

O sistema garante que:

1. **Estudantes com pacote** pagam valores específicos do pacote
2. **Estudantes sem pacote** pagam valores padrão
3. **Dashboard do seller** mostra receita total baseada nos valores reais pagos
4. **Comissões** são calculadas corretamente
5. **Transparência** total nos valores exibidos

**Tudo funciona de forma dinâmica e escalável!** 🚀

## 🔧 Correções Implementadas - Admin de Afiliados

### Problema Identificado
O dashboard de admin de afiliados estava usando valores hardcoded (600, 850, 1450) ao invés de valores dinâmicos dos pacotes de bolsas.

### Funções Corrigidas

#### 1. **`get_admin_analytics_fixed`** ✅
**Arquivo:** `project/supabase/migrations/20250201000003_fix_admin_analytics_dynamic_fees.sql`

**Antes:**
```sql
-- Valores hardcoded
CASE
  WHEN up.has_paid_selection_process_fee = true AND up.is_scholarship_fee_paid = true THEN 1450.00
  WHEN up.has_paid_selection_process_fee = true THEN 600.00
  WHEN up.is_scholarship_fee_paid = true THEN 850.00
  ELSE 0.00
END
```

**Depois:**
```sql
-- Valores dinâmicos com fallback
CASE
  -- First try to get from affiliate_referrals (most accurate)
  WHEN ar.payment_amount IS NOT NULL THEN ar.payment_amount
  -- Fallback to package-based calculation
  WHEN up.scholarship_package_id IS NOT NULL THEN
    CASE
      WHEN up.has_paid_selection_process_fee = true AND up.is_scholarship_fee_paid = true THEN 
        sp.selection_process_fee + sp.scholarship_fee
      WHEN up.has_paid_selection_process_fee = true THEN sp.selection_process_fee
      WHEN up.is_scholarship_fee_paid = true THEN sp.scholarship_fee
      ELSE 0.00
    END
  -- Final fallback to default values
  ELSE
    CASE
      WHEN up.has_paid_selection_process_fee = true AND up.is_scholarship_fee_paid = true THEN 1450.00
      WHEN up.has_paid_selection_process_fee = true THEN 600.00
      WHEN up.is_scholarship_fee_paid = true THEN 850.00
      ELSE 0.00
    END
END
```

#### 2. **`get_admin_sellers_analytics_fixed`** ✅
**Arquivo:** `project/supabase/migrations/20250201000004_fix_admin_sellers_analytics_dynamic_fees.sql`

**Mesma lógica aplicada** para cálculo de receita total e média por vendedor.

#### 3. **`get_admin_students_analytics`** ✅
**Arquivo:** `project/supabase/migrations/20250201000005_create_admin_students_analytics_dynamic_fees.sql`

**Função criada** com valores dinâmicos para listagem de estudantes.

### Resultado das Correções

1. **Dashboard Admin de Afiliados** agora mostra valores corretos baseados nos pacotes
2. **Receita Total** calculada com valores dinâmicos dos pacotes
3. **Métricas por Vendedor** refletem valores reais pagos pelos estudantes
4. **Lista de Estudantes** mostra valores corretos baseados no pacote de cada um
5. **Fallback Inteligente**: Se não há pacote, usa valores padrão; se há pacote, usa valores específicos

### Prioridade de Valores

1. **`affiliate_referrals.payment_amount`** - Mais preciso (valor real pago)
2. **Valores do pacote** - Baseado no `scholarship_package_id` do estudante
3. **Valores padrão** - Fallback para estudantes sem pacote

### 🔧 Correções Técnicas Aplicadas

#### Problemas Identificados e Resolvidos:

1. **Função `get_admin_seller_status_stats` não existia** ✅
   - **Solução**: Criada função que usa `is_active` ao invés de `status` (coluna inexistente)

2. **Ambiguidade de colunas na função `get_admin_analytics_fixed`** ✅
   - **Problema**: Conflito entre nomes de colunas e variáveis PL/pgSQL
   - **Solução**: Reescrita da função com abordagem simplificada usando variáveis DECLARE

3. **Tipo de dados incompatível em `get_admin_students_analytics`** ✅
   - **Problema**: `varchar` vs `text` type mismatch
   - **Solução**: Adicionado cast explícito `::text` para todos os campos de texto

4. **Estrutura da tabela `sellers` diferente do esperado** ✅
   - **Problema**: Função esperava coluna `status` que não existe
   - **Solução**: Adaptada para usar apenas `is_active` (coluna existente)

#### Status Final das Funções:

- ✅ `get_admin_analytics_fixed` - **FUNCIONANDO**
- ✅ `get_admin_sellers_analytics_fixed` - **FUNCIONANDO**  
- ✅ `get_admin_students_analytics` - **FUNCIONANDO**
- ✅ `get_admin_seller_status_stats` - **FUNCIONANDO**

## 📁 Arquivos Principais

### Frontend
- `project/src/hooks/useDynamicFees.ts` - Hook principal para valores dinâmicos
- `project/src/hooks/useFeeConfig.ts` - Hook para valores padrão
- `project/src/pages/SellerDashboard/index.tsx` - Dashboard principal
- `project/src/pages/SellerDashboard/MyStudents.tsx` - Lista de estudantes
- `project/src/pages/SellerDashboard/StudentDetails.tsx` - Detalhes do estudante
- `project/src/pages/AdminDashboard/PaymentManagement.tsx` - Aprovação de pagamentos
- `project/src/pages/AffiliateAdminDashboard/index.tsx` - Dashboard admin de afiliados

### Backend
- `project/supabase/migrations/20250120000001_create_scholarship_packages.sql` - Função `get_user_package_fees`
- `project/supabase/migrations/20250201000002_create_seller_individual_performance.sql` - Função `get_seller_individual_performance`
- `project/supabase/migrations/20250131000005_fix_register_payment_billing_for_sellers.sql` - Função `register_payment_billing`
- `project/supabase/migrations/20250201000003_fix_admin_analytics_dynamic_fees.sql` - Função `get_admin_analytics_fixed` (CORRIGIDA)
- `project/supabase/migrations/20250201000004_fix_admin_sellers_analytics_dynamic_fees.sql` - Função `get_admin_sellers_analytics_fixed` (CORRIGIDA)
- `project/supabase/migrations/20250201000005_create_admin_students_analytics_dynamic_fees.sql` - Função `get_admin_students_analytics` (CRIADA)

### Edge Functions
- `project/supabase/functions/stripe-checkout-selection-process-fee/index.ts`
- `project/supabase/functions/stripe-checkout-scholarship-fee/index.ts`
- `project/supabase/functions/stripe-checkout-i20-control-fee/index.ts`
- `project/supabase/functions/stripe-checkout-application-fee/index.ts`

## 🔍 Como Usar

### Para Desenvolvedores

1. **Para mostrar valores dinâmicos em um componente:**
```typescript
import { useDynamicFees } from '../hooks/useDynamicFees';

const { selectionProcessFee, scholarshipFee, i20ControlFee, hasSellerPackage } = useDynamicFees();
```

2. **Para buscar valores de um estudante específico:**
```typescript
const { data: packageFees } = await supabase.rpc('get_user_package_fees', {
  user_id_param: studentUserId
});
```

3. **Para registrar pagamento com valor dinâmico:**
```typescript
await supabase.rpc('register_payment_billing', {
  user_id_param: userId,
  fee_type_param: 'selection_process',
  amount_param: dynamicAmount, // Valor do pacote
  payment_session_id_param: sessionId,
  payment_method_param: 'stripe'
});
```

### Para Administradores

1. **Criar novo pacote:** Adicionar na tabela `scholarship_packages`
2. **Atribuir pacote:** Atualizar `user_profiles.scholarship_package_id`
3. **Verificar valores:** Usar RPC `get_user_package_fees` para testar

---

**Documentação criada em:** Janeiro 2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e Funcionando
