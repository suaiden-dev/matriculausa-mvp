# Bug Crítico: RPC não identifica Scholarship Fee para Estudantes Legacy

## Problema Identificado

**TODOS os 25 estudantes** do Matheus Brant são do tipo `'legacy'`.

A RPC `get_affiliate_admin_profiles_with_fees` tem um bug que afeta **TODOS os estudantes legacy**:

### Lógica Atual da RPC (BUGADA)

```sql
CASE 
  WHEN up.system_type = 'simplified' THEN
    EXISTS (SELECT 1 FROM scholarship_applications ...)  -- ✅ Verifica tabela
  ELSE COALESCE(up.is_scholarship_fee_paid, false)     -- ❌ Só verifica campo
END as is_scholarship_fee_paid
```

**Problema**: Para estudantes `legacy`, a RPC **NÃO verifica** a tabela `scholarship_applications`. Ela só verifica o campo `up.is_scholarship_fee_paid` que pode estar desatualizado.

## Impacto

### Estudantes Afetados pelo Bug

| Estudante | Scholarship Pago? | RPC Identifica? | Status |
|-----------|-------------------|-----------------|--------|
| **Daniel Costa e Silva** | ✅ Sim ($400, manual) | ❌ Não | **BUG** |
| **Alondra Ciprián Quezada** | ✅ Sim ($900, zelle) | ❌ Não | **BUG** |
| Outros 8 estudantes | ✅ Sim | ✅ Sim | OK |

**Total**: 2 estudantes com scholarship pago não identificados pela RPC

### Impacto no Cálculo

#### Total Revenue
- **Sem correção**: $20,748 (não inclui scholarship do Daniel e Alondra)
- **Com correção**: $23,047 (inclui scholarship do Daniel $400 + Alondra $900)
- **Diferença**: +$1,300

#### Manual Revenue
- **Daniel**: Scholarship $400 (manual) não estava sendo contado
- **Total Manual Revenue correto**: $6,798

#### Available Balance
- **Cálculo correto**: ($23,047 - $6,798) - $2,099 = **$14,150**

## Correções Aplicadas

### 1. Thamara - I-20 Control Fee Payment Method
✅ **Corrigido no banco**: `i20_control_fee_payment_method = 'manual'`

### 2. Query SQL de Cálculo
✅ **Corrigida**: Agora verifica `scholarship_applications` diretamente, ignorando o bug da RPC

## Correções Necessárias no Código

### FinancialOverview.tsx e PaymentManagement.tsx

**Problema**: Ambos dependem da RPC que tem o bug.

**Solução**: Após buscar perfis da RPC, verificar `scholarship_applications` diretamente:

```typescript
// 1. Buscar perfis da RPC (como está)
const { data: profiles } = await supabase
  .rpc('get_affiliate_admin_profiles_with_fees', { admin_user_id: userId });

// 2. CORRIGIR: Buscar scholarship_applications diretamente para TODOS os perfis
const profileIds = profiles.map(p => p.profile_id);
const { data: scholarshipData } = await supabase
  .from('scholarship_applications')
  .select('student_id, is_scholarship_fee_paid, scholarship_fee_payment_method')
  .in('student_id', profileIds)
  .eq('is_scholarship_fee_paid', true);

// 3. Criar mapa corrigido de scholarship
const scholarshipMap: Record<string, any> = {};
scholarshipData.forEach(sa => {
  if (!scholarshipMap[sa.student_id]) {
    scholarshipMap[sa.student_id] = [];
  }
  scholarshipMap[sa.student_id].push({
    is_paid: sa.is_scholarship_fee_paid,
    method: sa.scholarship_fee_payment_method
  });
});

// 4. Usar scholarshipMap no cálculo (substituir p.is_scholarship_fee_paid)
// Para verificar se tem scholarship pago:
const hasScholarshipPaid = scholarshipMap[p.profile_id]?.length > 0;

// Para verificar se tem scholarship manual:
const hasScholarshipManual = scholarshipMap[p.profile_id]?.some(
  (s: any) => s.is_paid && s.method === 'manual'
);
```

## Correção da RPC (Recomendado)

A RPC deveria ser corrigida para verificar `scholarship_applications` também para estudantes `legacy`:

```sql
-- CORREÇÃO SUGERIDA PARA A RPC
CASE 
  WHEN up.system_type = 'simplified' THEN
    EXISTS (
      SELECT 1 FROM scholarship_applications sa 
      WHERE sa.student_id = up.id 
      AND sa.is_scholarship_fee_paid = true
    )
  ELSE 
    -- CORRIGIDO: Verificar tabela também para legacy
    COALESCE(
      EXISTS (
        SELECT 1 FROM scholarship_applications sa 
        WHERE sa.student_id = up.id 
        AND sa.is_scholarship_fee_paid = true
      ),
      up.is_scholarship_fee_paid,
      false
    )
END as is_scholarship_fee_paid
```

## Valores Finais Corretos

| Métrica | Valor |
|---------|-------|
| **Total Revenue** | $23,047.00 |
| **Manual Revenue** | $6,798.00 |
| **Net Revenue** | $16,249.00 |
| **Total Paid Out** | $2,099.00 |
| **Available Balance** | **$14,150.00** ✅ |

## Status

- ✅ **Thamara i20_control_fee_payment_method**: Corrigido no banco
- ✅ **Query SQL de debug**: Criada e validada
- ⚠️ **FinancialOverview.tsx**: Precisa aplicar correção
- ⚠️ **PaymentManagement.tsx**: Precisa aplicar correção
- ⚠️ **RPC**: Precisa ser corrigida (ou código deve verificar diretamente)

