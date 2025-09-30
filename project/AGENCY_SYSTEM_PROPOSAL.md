# 🏢 **PROPOSTA: SISTEMA DE AGÊNCIAS**
## Baseado no Sistema de Afiliados Existente

---

## 📋 **VISÃO GERAL**

Este documento propõe a criação de um sistema de agências baseado na estrutura existente do sistema de afiliados. O sistema permitirá que agências gerenciem seus próprios vendedores e estudantes, similar ao que os affiliate admins fazem atualmente.

---

## 🏗️ **ESTRUTURA PROPOSTA**

### **1. Tabelas Principais**

#### **`agencies`** (Nova tabela)
```sql
CREATE TABLE agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address jsonb,
  website text,
  description text,
  is_active boolean DEFAULT true,
  created_by_admin_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### **`agency_sellers`** (Nova tabela)
```sql
CREATE TABLE agency_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  territory text,
  referral_code text UNIQUE,
  commission_rate numeric DEFAULT 0.10,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### **`agency_student_referrals`** (Nova tabela)
```sql
CREATE TABLE agency_student_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_seller_id uuid REFERENCES agency_sellers(id),
  student_id uuid REFERENCES user_profiles(id),
  agency_referral_code text,
  referral_date timestamptz DEFAULT now(),
  student_status text DEFAULT 'registered',
  commission_earned numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### **`agency_commission_payments`** (Nova tabela)
```sql
CREATE TABLE agency_commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_seller_id uuid REFERENCES agency_sellers(id),
  payment_id uuid REFERENCES payments(id),
  student_id uuid REFERENCES user_profiles(id),
  fee_type text,
  amount_paid numeric,
  agency_commission numeric,
  payment_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 🎯 **FUNCIONALIDADES PROPOSTAS**

### **1. Dashboard da Agência**
- **Overview**: Estatísticas gerais da agência
- **Gerenciamento de Sellers**: Adicionar, editar, ativar/desativar sellers
- **Tracking de Estudantes**: Acompanhar estudantes referenciados
- **Analytics**: Relatórios de performance e comissões
- **Configurações**: Perfil da agência e configurações

### **2. Sistema de Códigos de Referência**
- Códigos únicos para cada seller da agência
- Formato: `AGENCY_[AGENCY_ID]_[SELLER_CODE]`
- Validação automática de códigos
- Tracking de uso dos códigos

### **3. Sistema de Comissões**
- Comissões baseadas em pagamentos de estudantes
- Taxa de comissão configurável por seller
- Relatórios de comissões
- Sistema de pagamentos para sellers

### **4. Analytics e Relatórios**
- Performance por seller
- Receita total da agência
- Estudantes ativos/inativos
- Relatórios mensais/anuais

---

## 🔄 **FLUXO DE TRABALHO**

### **1. Criação de Agência**
1. Admin principal cria uma agência
2. Define um usuário como responsável pela agência
3. Agência recebe acesso ao dashboard

### **2. Gerenciamento de Sellers**
1. Agência adiciona sellers
2. Sellers recebem códigos de referência únicos
3. Sellers podem referenciar estudantes
4. Sistema tracking automático

### **3. Processo de Referência**
1. Estudante usa código de referência da agência
2. Sistema associa estudante ao seller
3. Tracking de pagamentos e comissões
4. Relatórios automáticos

---

## 📱 **COMPONENTES FRONTEND**

### **1. AgencyDashboard**
```typescript
// Estrutura similar ao AffiliateAdminDashboard
- AgencyDashboardLayout
- AgencyOverview
- AgencySellerManagement
- AgencyStudentTracking
- AgencyAnalytics
- AgencySettings
```

### **2. Rotas Propostas**
```
/agency/dashboard - Dashboard principal
/agency/dashboard/sellers - Gerenciamento de sellers
/agency/dashboard/students - Tracking de estudantes
/agency/dashboard/analytics - Analytics e relatórios
/agency/dashboard/settings - Configurações
```

---

## 🔐 **SISTEMA DE PERMISSÕES**

### **Roles Propostos**
- `admin` - Acesso total ao sistema
- `agency_admin` - Administrador da agência
- `agency_seller` - Vendedor da agência
- `student` - Estudante (existente)

### **RLS Policies**
- Agências só veem seus próprios dados
- Sellers só veem dados de sua agência
- Isolamento completo entre agências

---

## 🚀 **PLANO DE IMPLEMENTAÇÃO**

### **Fase 1: Estrutura Base**
1. Criar tabelas do sistema de agências
2. Implementar RLS policies
3. Criar funções de banco de dados

### **Fase 2: Dashboard da Agência**
1. Criar AgencyDashboardLayout
2. Implementar AgencyOverview
3. Sistema de navegação

### **Fase 3: Gerenciamento de Sellers**
1. AgencySellerManagement component
2. CRUD operations para sellers
3. Sistema de códigos de referência

### **Fase 4: Tracking e Analytics**
1. AgencyStudentTracking
2. AgencyAnalytics
3. Sistema de relatórios

### **Fase 5: Sistema de Comissões**
1. Cálculo automático de comissões
2. Relatórios de pagamentos
3. Sistema de notificações

---

## 💡 **VANTAGENS DO SISTEMA**

### **Para Agências**
- Controle total sobre seus sellers
- Analytics detalhados
- Sistema de comissões transparente
- Interface dedicada e personalizada

### **Para o Sistema**
- Escalabilidade horizontal
- Isolamento de dados
- Reutilização de código existente
- Manutenção simplificada

### **Para Estudantes**
- Experiência consistente
- Códigos de referência claros
- Tracking transparente

---

## 🔧 **CONSIDERAÇÕES TÉCNICAS**

### **Reutilização de Código**
- Baseado na estrutura existente de affiliate admins
- Componentes similares com adaptações
- Mesma arquitetura de banco de dados

### **Segurança**
- RLS policies rigorosas
- Isolamento completo entre agências
- Validação de permissões em todas as operações

### **Performance**
- Índices otimizados
- Queries eficientes
- Cache de dados quando necessário

---

## 📊 **MÉTRICAS DE SUCESSO**

- Número de agências ativas
- Sellers por agência
- Estudantes referenciados
- Receita gerada por agência
- Taxa de conversão de referências

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Aprovação da Proposta**: Revisar e aprovar a estrutura
2. **Definição de Prioridades**: Escolher quais funcionalidades implementar primeiro
3. **Cronograma**: Definir prazos para cada fase
4. **Recursos**: Alocar desenvolvedores e recursos necessários
5. **Testes**: Plano de testes e validação

---

*Este documento serve como base para discussão e refinamento da proposta do sistema de agências.*
