# 🏗️ **ARQUITETURA DO SISTEMA DE AGÊNCIAS**

## 📊 **DIAGRAMA DE ESTRUTURA**

```
┌─────────────────────────────────────────────────────────────────┐
│                        SISTEMA DE AGÊNCIAS                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ADMIN MAIN    │    │   AGENCY ADMIN  │    │  AGENCY SELLER  │
│                 │    │                 │    │                 │
│ • Cria agências │    │ • Gerencia      │    │ • Referencia    │
│ • Supervisiona  │    │   sellers       │    │   estudantes    │
│ • Acesso total  │    │ • Analytics     │    │ • Código único  │
│                 │    │ • Comissões     │    │ • Comissões     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BANCO DE DADOS                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    agencies     │    │ agency_sellers  │    │agency_student_  │
│                 │    │                 │    │   referrals     │
│ • id            │    │ • id            │    │ • id            │
│ • user_id       │    │ • agency_id     │    │ • agency_seller │
│ • name          │    │ • user_id       │    │   _id           │
│ • email         │    │ • name          │    │ • student_id    │
│ • phone         │    │ • email         │    │ • referral_code │
│ • address       │    │ • referral_code │    │ • commission    │
│ • is_active     │    │ • commission    │    │ • status        │
│ • created_by    │    │ • is_active     │    │ • created_at    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TABELAS EXISTENTES                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  user_profiles  │    │    payments     │    │  scholarships   │
│                 │    │                 │    │                 │
│ • student data  │    │ • payment data  │    │ • scholarship   │
│ • referral_code │    │ • amounts       │    │   data          │
│ • seller_ref    │    │ • status        │    │ • fees          │
│ • agency_ref    │    │ • timestamps    │    │ • requirements  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 **FLUXO DE DADOS**

### **1. Criação de Agência**
```
Admin Main → Cria Agency → Define Agency Admin → Agency Dashboard
```

### **2. Gerenciamento de Sellers**
```
Agency Admin → Adiciona Seller → Gera Código → Seller Ativo
```

### **3. Processo de Referência**
```
Student → Usa Código → Sistema Tracking → Commission Calculation
```

### **4. Sistema de Comissões**
```
Payment → Commission Calculation → Agency Report → Seller Payment
```

## 🎯 **COMPONENTES FRONTEND**

### **Agency Dashboard Structure**
```
AgencyDashboard/
├── AgencyDashboardLayout.tsx
├── AgencyOverview.tsx
├── AgencySellerManagement.tsx
├── AgencyStudentTracking.tsx
├── AgencyAnalytics.tsx
├── AgencySettings.tsx
└── components/
    ├── AgencySellerCard.tsx
    ├── AgencyStudentCard.tsx
    ├── AgencyCommissionReport.tsx
    └── AgencyReferralCodeGenerator.tsx
```

## 🔐 **SISTEMA DE PERMISSÕES**

### **Hierarquia de Acesso**
```
Admin Main (Level 0)
├── Full System Access
├── Create/Delete Agencies
└── Global Analytics

Agency Admin (Level 1)
├── Agency Dashboard Access
├── Manage Agency Sellers
├── View Agency Analytics
└── Agency Settings

Agency Seller (Level 2)
├── View Own Referrals
├── Generate Referral Codes
├── View Own Commissions
└── Limited Analytics

Student (Level 3)
├── Use Referral Codes
├── View Own Progress
└── Basic Dashboard
```

## 📊 **ANALYTICS E RELATÓRIOS**

### **Métricas por Nível**

#### **Admin Main**
- Total de Agências
- Agências Ativas/Inativas
- Receita Total do Sistema
- Performance Global

#### **Agency Admin**
- Sellers da Agência
- Estudantes Referenciados
- Receita da Agência
- Comissões Pagas

#### **Agency Seller**
- Próprias Referências
- Comissões Ganhas
- Performance Individual
- Códigos Mais Usados

## 🚀 **ROADMAP DE IMPLEMENTAÇÃO**

### **Fase 1: Fundação (2-3 semanas)**
- [ ] Criar tabelas do banco de dados
- [ ] Implementar RLS policies
- [ ] Criar funções básicas de banco
- [ ] Setup inicial do frontend

### **Fase 2: Dashboard Básico (2-3 semanas)**
- [ ] AgencyDashboardLayout
- [ ] AgencyOverview component
- [ ] Navegação básica
- [ ] Autenticação e permissões

### **Fase 3: Gerenciamento de Sellers (3-4 semanas)**
- [ ] AgencySellerManagement
- [ ] CRUD operations
- [ ] Sistema de códigos de referência
- [ ] Validação e testes

### **Fase 4: Tracking e Analytics (3-4 semanas)**
- [ ] AgencyStudentTracking
- [ ] AgencyAnalytics
- [ ] Relatórios básicos
- [ ] Dashboard de métricas

### **Fase 5: Sistema de Comissões (2-3 semanas)**
- [ ] Cálculo automático
- [ ] Relatórios de pagamentos
- [ ] Sistema de notificações
- [ ] Integração com pagamentos

### **Fase 6: Polimento e Otimização (2-3 semanas)**
- [ ] Testes completos
- [ ] Otimização de performance
- [ ] Documentação
- [ ] Deploy e monitoramento

## 💡 **VANTAGENS DA ARQUITETURA**

### **Escalabilidade**
- Cada agência é independente
- Fácil adição de novas agências
- Sistema modular e flexível

### **Segurança**
- Isolamento completo entre agências
- RLS policies rigorosas
- Controle granular de permissões

### **Manutenibilidade**
- Reutilização de código existente
- Estrutura familiar para desenvolvedores
- Documentação clara

### **Performance**
- Queries otimizadas
- Índices apropriados
- Cache estratégico

## 🔧 **CONSIDERAÇÕES TÉCNICAS**

### **Banco de Dados**
- Índices em foreign keys
- Constraints de integridade
- Triggers para cálculos automáticos
- Views para relatórios complexos

### **Frontend**
- Componentes reutilizáveis
- Estado global gerenciado
- Roteamento protegido
- Responsive design

### **Backend**
- APIs RESTful
- Validação de dados
- Rate limiting
- Logging e monitoramento

---

*Esta arquitetura fornece uma base sólida para o sistema de agências, aproveitando a experiência do sistema de afiliados existente.*
