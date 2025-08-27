# 🗄️ **Estrutura do Banco de Dados - Sellers e Admins**

## ⚠️ **PROBLEMA IDENTIFICADO: Estrutura Confusa e Duplicada**

O banco de dados tem uma estrutura **MUITO CONFUSA** e **DUPLICADA** em relação aos sellers e admins. Existem **MÚLTIPLAS formas** de definir roles e relacionamentos, causando inconsistências e confusão.

---

## 🔍 **ANÁLISE DA CONFUSÃO**

### **1. Múltiplas Tabelas para o Mesmo Conceito**

#### **❌ PROBLEMA: Tabelas Duplicadas**
```sql
-- TABELA 1: affiliate_admins (criada em 20250201000001)
CREATE TABLE affiliate_admins (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  email text,
  name text,
  -- ...
);

-- TABELA 2: sellers (criada em 20250122000000)
CREATE TABLE sellers (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  affiliate_admin_id uuid REFERENCES affiliate_admins(id), -- REFERENCIA TABELA 1
  -- ...
);
```

#### **❌ PROBLEMA: Campos Duplicados**
```sql
-- user_profiles tem role
-- auth.users tem raw_user_meta_data->>'role'
-- affiliate_admins tem user_id
-- sellers tem user_id + affiliate_admin_id
```

### **2. Múltiplas Formas de Definir Roles**

#### **❌ PROBLEMA: Roles em Múltiplos Lugares**
```sql
-- FORMA 1: user_profiles.role
SELECT role FROM user_profiles WHERE user_id = auth.uid();

-- FORMA 2: auth.users.raw_user_meta_data->>'role'
SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid();

-- FORMA 3: Verificação direta na tabela affiliate_admins
SELECT 1 FROM affiliate_admins WHERE user_id = auth.uid();
```

---

## 🏗️ **ESTRUTURA ATUAL (CONFUSA)**

### **Hierarquia de Relacionamentos:**
```
auth.users (usuário base)
    ↓
user_profiles (perfil com role)
    ↓
affiliate_admins (se role = 'affiliate_admin')
    ↓
sellers (referenciam affiliate_admin_id)
    ↓
user_profiles (com seller_referral_code)
```

### **Tabelas Principais:**

#### **1. `auth.users`**
- **Propósito**: Usuário base do Supabase
- **Campos**: `id`, `email`, `raw_user_meta_data` (JSON com role)
- **Problema**: Role definido em JSON, difícil de consultar

#### **2. `user_profiles`**
- **Propósito**: Perfil estendido do usuário
- **Campos**: `user_id`, `full_name`, `role`, `seller_referral_code`
- **Problema**: Role duplicado com auth.users

#### **3. `affiliate_admins`**
- **Propósito**: Administradores afiliados
- **Campos**: `id`, `user_id`, `email`, `name`
- **Problema**: Dados duplicados com user_profiles

#### **4. `sellers`**
- **Propósito**: Vendedores sob affiliate admins
- **Campos**: `id`, `user_id`, `affiliate_admin_id`, `referral_code`
- **Problema**: Relacionamento circular e confuso

---

## 🚨 **PROBLEMAS IDENTIFICADOS**

### **1. Inconsistência de Dados**
```sql
-- Exemplo: Um usuário pode ter role diferente em tabelas diferentes
SELECT 
  up.role as profile_role,
  au.raw_user_meta_data->>'role' as auth_role,
  CASE WHEN aa.id IS NOT NULL THEN 'affiliate_admin' ELSE 'not_admin' END as table_role
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
LEFT JOIN affiliate_admins aa ON up.user_id = aa.user_id
WHERE up.user_id = 'some-uuid';
```

### **2. Relacionamentos Circulares**
```sql
-- user_profiles -> sellers -> affiliate_admins -> user_profiles
-- Isso cria loops infinitos e consultas complexas
```

### **3. Dados Duplicados**
```sql
-- Mesmo email em múltiplas tabelas
-- Mesmo nome em múltiplas tabelas
-- Mesmo user_id em múltiplas tabelas
```

### **4. Políticas RLS Confusas**
```sql
-- Múltiplas políticas para o mesmo acesso
-- Verificações de role em múltiplos lugares
-- Políticas que não funcionam consistentemente
```

---

## 🛠️ **SOLUÇÕES IMPLEMENTADAS (TEMPORÁRIAS)**

### **1. Função `get_affiliate_admin_id_from_user_id`**
```sql
-- Tenta resolver a confusão verificando múltiplas tabelas
CREATE OR REPLACE FUNCTION get_affiliate_admin_id_from_user_id(user_id_param uuid)
RETURNS uuid AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Tenta 1: affiliate_admins
  SELECT id INTO admin_id FROM affiliate_admins WHERE user_id = user_id_param;
  
  -- Tenta 2: user_profiles com role
  IF admin_id IS NULL THEN
    SELECT aa.id INTO admin_id 
    FROM user_profiles up 
    JOIN affiliate_admins aa ON up.user_id = aa.user_id
    WHERE up.user_id = user_id_param AND up.role = 'affiliate_admin';
  END IF;
  
  -- Tenta 3: auth.users com metadata
  IF admin_id IS NULL THEN
    SELECT aa.id INTO admin_id 
    FROM auth.users au 
    JOIN affiliate_admins aa ON au.id = aa.user_id
    WHERE au.id = user_id_param AND au.raw_user_meta_data->>'role' = 'affiliate_admin';
  END IF;
  
  RETURN admin_id;
END;
$$ LANGUAGE plpgsql;
```

### **2. Funções de Verificação Múltipla**
```sql
-- Verifica role em múltiplos lugares
CREATE OR REPLACE FUNCTION is_affiliate_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_id_param AND role = 'affiliate_admin'
  ) OR EXISTS (
    SELECT 1 FROM affiliate_admins 
    WHERE user_id = user_id_param
  ) OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id_param AND raw_user_meta_data->>'role' = 'affiliate_admin'
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 **COMO RESOLVER SE ACONTECER NOVAMENTE**

### **1. Identificar o Problema**
```sql
-- Verificar onde está o role do usuário
SELECT 
  up.user_id,
  up.role as profile_role,
  au.raw_user_meta_data->>'role' as auth_role,
  CASE WHEN aa.id IS NOT NULL THEN 'affiliate_admin' ELSE 'not_admin' END as table_role
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
LEFT JOIN affiliate_admins aa ON up.user_id = aa.user_id
WHERE up.email = 'email@exemplo.com';
```

### **2. Verificar Relacionamentos**
```sql
-- Verificar se o seller está ligado ao admin correto
SELECT 
  s.name as seller_name,
  s.referral_code,
  aa.name as admin_name,
  up.role as user_role
FROM sellers s
JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
JOIN user_profiles up ON s.user_id = up.user_id
WHERE s.referral_code = 'SELLER_ABC123';
```

### **3. Usar Funções de Resolução**
```sql
-- Usar função que resolve a confusão
SELECT * FROM get_affiliate_admin_id_from_user_id('uuid-do-usuario');
SELECT is_affiliate_admin('uuid-do-usuario');
```

---

## 📋 **RECOMENDAÇÕES PARA REFATORAÇÃO**

### **1. Simplificar a Estrutura**
```sql
-- MANTER APENAS:
-- 1. auth.users (usuário base)
-- 2. user_profiles (perfil com role único)
-- 3. sellers (referenciam user_profiles.role)

-- REMOVER:
-- 1. affiliate_admins (duplicado)
-- 2. Campos role duplicados
-- 3. Relacionamentos circulares
```

### **2. Padronizar Roles**
```sql
-- Usar ENUM para roles
CREATE TYPE user_role AS ENUM ('student', 'seller', 'affiliate_admin', 'admin');

-- Aplicar em user_profiles.role
ALTER TABLE user_profiles ALTER COLUMN role TYPE user_role;
```

### **3. Simplificar Relacionamentos**
```sql
-- sellers referenciam diretamente user_profiles
CREATE TABLE sellers (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(user_id),
  referral_code text UNIQUE,
  -- remover affiliate_admin_id
);
```

---

## 🎯 **RESUMO DA CONFUSÃO**

### **O que está acontecendo:**
1. **Múltiplas tabelas** para o mesmo conceito
2. **Roles definidos em múltiplos lugares**
3. **Relacionamentos circulares** e confusos
4. **Dados duplicados** entre tabelas
5. **Políticas RLS inconsistentes**

### **Por que está confuso:**
1. **Evolução incremental** sem refatoração
2. **Múltiplas migrações** criando estruturas paralelas
3. **Falta de padronização** de roles e relacionamentos
4. **Soluções temporárias** que se tornaram permanentes

### **Como resolver temporariamente:**
1. **Usar as funções de resolução** já criadas
2. **Verificar dados em múltiplas tabelas**
3. **Aplicar correções específicas** para cada problema
4. **Documentar cada solução** para referência futura

---

## 📝 **ARQUIVOS RELACIONADOS**

- `project/DASHBOARD_FEES_FIX_DOCUMENTATION.md` - Solução para fees
- `project/supabase/migrations/20250122000000_create_sellers_table.sql`
- `project/supabase/migrations/20250201000001_add_seller_referral_code_to_user_profiles.sql`
- `project/supabase/migrations/20250123000002_create_affiliate_admin_functions.sql`

**Status**: ⚠️ **ESTRUTURA CONFUSA - NECESSITA REFATORAÇÃO**
**Prioridade**: 🔴 **ALTA - Causa problemas constantes**
**Solução**: 🚧 **TEMPORÁRIA - Funções de resolução implementadas**
