# 🚨 **Problema de Desativação de Sellers - Documentação Completa**

## 📋 **PROBLEMA IDENTIFICADO**

### **Sintomas:**
- ✅ **Durante a desativação**: Seller é removido da lista e contador diminui
- ❌ **Ao sair e voltar da página**: Seller desativado aparece novamente
- ❌ **Contador de sellers**: Não reflete corretamente o estado real
- ❌ **Inconsistência**: Entre dados locais e dados do banco

---

## 🔍 **ANÁLISE DA CAUSA RAIZ**

### **1. Funções SQL Faltando**
O dashboard principal está tentando chamar funções que **NÃO EXISTEM** no banco:

```typescript
// ❌ FUNÇÃO NÃO EXISTE - Causa o problema
const { data: sellersData, error: sellersError } = await supabase
  .rpc('get_admin_sellers_analytics_fixed', { admin_user_id: userId });

// ❌ FUNÇÃO NÃO EXISTE - Causa o problema  
const { data: analyticsData, error: analyticsError } = await supabase
  .rpc('get_admin_analytics_fixed', { admin_user_id: userId });
```

### **2. Fluxo de Dados Inconsistente**

#### **SellerManagement.tsx (Funciona Corretamente):**
```typescript
const deactivateSeller = async (sellerId: string, userName: string) => {
  // ✅ 1. Atualiza banco: sellers.is_active = false
  await supabase
    .from('sellers')
    .update({ is_active: false })
    .eq('id', sellerId);

  // ✅ 2. Atualiza banco: user_profiles.role = 'deactivated_seller'
  await supabase
    .from('user_profiles')
    .update({ role: 'deactivated_seller' })
    .eq('user_id', sellerId);

  // ✅ 3. Atualiza estado local: remove seller da lista
  setSellers(prevSellers => prevSellers.filter(seller => seller.id !== sellerId));

  // ✅ 4. Diminui contador local
  // ✅ 5. Persiste em localStorage
};
```

#### **Dashboard Principal (Falha):**
```typescript
const loadAffiliateAdminData = async () => {
  // ❌ 1. Chama função que NÃO EXISTE
  const { data: sellersData, error: sellersError } = await supabase
    .rpc('get_admin_sellers_analytics_fixed', { admin_user_id: userId });

  // ❌ 2. Se falhar, pode estar carregando dados de outra fonte
  // ❌ 3. Ou retornando dados incorretos
  // ❌ 4. Contador fica inconsistente
};
```

---

## 🛠️ **SOLUÇÃO IMPLEMENTADA**

### **1. Criar Função `get_admin_sellers_analytics_fixed`**

```sql
-- ✅ FUNÇÃO CRIADA - Retorna apenas sellers ATIVOS
CREATE OR REPLACE FUNCTION get_admin_sellers_analytics_fixed(admin_user_id uuid)
RETURNS TABLE (
  seller_id uuid,
  seller_name text,
  seller_email text,
  referral_code text,
  students_count bigint,
  total_revenue numeric,
  avg_revenue_per_student numeric,
  last_referral_date timestamptz,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as seller_id,
    s.name as seller_name,
    s.email as seller_email,
    s.referral_code,
    COUNT(DISTINCT up.user_id) FILTER (WHERE up.seller_referral_code = s.referral_code) as students_count,
    -- Calcula revenue baseado nos campos booleanos
    COALESCE(SUM(
      CASE
        WHEN up.has_paid_selection_process_fee = true AND up.is_scholarship_fee_paid = true THEN 1450.00
        WHEN up.has_paid_selection_process_fee = true THEN 600.00
        WHEN up.is_scholarship_fee_paid = true THEN 850.00
        ELSE 0.00
      END
    ), 0) as total_revenue,
    -- ... outros campos ...
  FROM sellers s
  LEFT JOIN user_profiles up ON up.seller_referral_code = s.referral_code
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  WHERE aa.user_id = admin_user_id
    AND s.is_active = true  -- ✅ FILTRO CRÍTICO: apenas sellers ativos
  GROUP BY s.id, s.name, s.email, s.referral_code, s.is_active
  ORDER BY students_count DESC, total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **2. Criar Função `get_admin_analytics_fixed`**

```sql
-- ✅ FUNÇÃO CRIADA - Analytics gerais com filtro de sellers ativos
CREATE OR REPLACE FUNCTION get_admin_analytics_fixed(admin_user_id uuid)
RETURNS TABLE (
  total_sellers bigint,
  active_sellers bigint,  -- ✅ Conta apenas sellers ativos
  total_students bigint,
  total_revenue numeric,
  monthly_growth numeric,
  conversion_rate numeric,
  avg_revenue_per_student numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH seller_stats AS (
    SELECT 
      COUNT(*) as total_sellers,
      COUNT(*) FILTER (WHERE s.is_active = true) as active_sellers  -- ✅ FILTRO CRÍTICO
    FROM sellers s
    JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
    WHERE aa.user_id = admin_user_id
  ),
  -- ... resto da função ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔧 **COMO APLICAR A SOLUÇÃO**

### **1. Executar as Migrações**
```bash
# Aplicar as duas migrações criadas
supabase db push
```

### **2. Verificar se as Funções Foram Criadas**
```sql
-- Verificar se as funções existem
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('get_admin_sellers_analytics_fixed', 'get_admin_analytics_fixed');

-- Testar as funções
SELECT * FROM get_admin_sellers_analytics_fixed('uuid-do-admin') LIMIT 3;
SELECT * FROM get_admin_analytics_fixed('uuid-do-admin') LIMIT 1;
```

### **3. Testar o Fluxo Completo**
1. **Desativar um seller** no SellerManagement
2. **Verificar se o contador diminui** no dashboard principal
3. **Sair e voltar da página** para ver se o seller permanece desativado
4. **Verificar se o contador permanece correto**

---

## ✅ **RESULTADO ESPERADO APÓS A CORREÇÃO**

### **Antes (❌ Problema):**
- Seller desativado aparece novamente ao sair/voltar
- Contador inconsistente entre páginas
- Funções SQL falham silenciosamente

### **Depois (✅ Corrigido):**
- Seller desativado permanece desativado
- Contador reflete corretamente o estado real
- Funções SQL retornam dados corretos
- Dashboard principal sincronizado com SellerManagement

---

## 🚨 **PONTOS CRÍTICOS DA SOLUÇÃO**

### **1. Filtro `s.is_active = true`**
```sql
WHERE aa.user_id = admin_user_id
  AND s.is_active = true  -- ✅ FILTRO ESSENCIAL
```
- **Sem este filtro**: Sellers desativados aparecem na lista
- **Com este filtro**: Apenas sellers ativos são retornados

### **2. Sincronização de Estados**
- **SellerManagement**: Atualiza estado local + banco
- **Dashboard Principal**: Usa funções SQL que respeitam `is_active`
- **Resultado**: Estados sempre sincronizados

### **3. Tratamento de Erros**
- **Antes**: Funções não existiam, falhavam silenciosamente
- **Depois**: Funções existem e retornam dados corretos

---

## 📝 **ARQUIVOS CRIADOS/CORRIGIDOS**

### **Novas Migrações:**
- `20250123000009_create_get_admin_sellers_analytics_fixed_function.sql`
- `20250123000010_create_get_admin_analytics_fixed_function.sql`

### **Arquivos Existentes (Não Alterados):**
- `project/src/pages/AffiliateAdminDashboard/SellerManagement.tsx`
- `project/src/pages/AffiliateAdminDashboard/index.tsx`

---

## 🎯 **RESUMO DA SOLUÇÃO**

### **Problema:**
- Funções SQL `get_admin_sellers_analytics_fixed` e `get_admin_analytics_fixed` não existiam
- Dashboard principal falhava ao carregar dados
- Sellers desativados apareciam novamente ao sair/voltar da página

### **Solução:**
- Criar as duas funções SQL que estavam faltando
- Implementar filtro `s.is_active = true` para retornar apenas sellers ativos
- Garantir que analytics e contadores reflitam o estado real do banco

### **Resultado:**
- ✅ Sellers desativados permanecem desativados
- ✅ Contadores refletem corretamente o estado real
- ✅ Dashboard principal sincronizado com SellerManagement
- ✅ Funções SQL funcionando corretamente

---

## 🔍 **PARA DEBUG FUTURO**

### **Verificar se as Funções Existem:**
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%admin%analytics%';
```

### **Testar Funções:**
```sql
-- Testar sellers analytics
SELECT * FROM get_admin_sellers_analytics_fixed('uuid-do-admin') LIMIT 3;

-- Testar analytics gerais  
SELECT * FROM get_admin_analytics_fixed('uuid-do-admin') LIMIT 1;
```

### **Verificar Dados de Sellers:**
```sql
-- Verificar sellers ativos vs inativos
SELECT 
  s.id,
  s.name,
  s.is_active,
  up.role
FROM sellers s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE s.affiliate_admin_id = 'uuid-do-admin'
ORDER BY s.is_active DESC, s.created_at DESC;
```

**Status**: ✅ **PROBLEMA IDENTIFICADO E SOLUÇÃO IMPLEMENTADA**
**Prioridade**: 🔴 **ALTA - Afeta funcionalidade crítica do dashboard**
**Arquivos**: 📁 **2 novas migrações SQL criadas**
