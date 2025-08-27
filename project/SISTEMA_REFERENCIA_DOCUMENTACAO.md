# 📚 Sistema de Referência - Matricula Rewards - Documentação Completa

## 🎯 Visão Geral

O sistema de referência Matricula Rewards permite que usuários indiquem outros estudantes e ganhem créditos em troca. Cada indicação bem-sucedida gera 50 créditos Matricula Coins para o referenciador.

## 🔄 Fluxo Completo do Sistema

### 1. **Criação do Código de Referência**
```
Usuário A → Cria código único (ex: MATR5969) → affiliate_codes
```

### 2. **Captura do Código na URL**
```
Usuário B acessa: http://localhost:5173?ref=MATR5969
useReferralCodeCapture → Salva no localStorage como 'pending_affiliate_code'
```

### 3. **Registro do Usuário**
```
Durante o registro → useAuth detecta o código no localStorage
Processa automaticamente → Chama validate_and_apply_referral_code
```

### 4. **Validação e Aplicação**
```
validate_and_apply_referral_code:
├── Valida se o código existe e está ativo
├── Verifica se não é auto-indicação
├── Verifica se usuário já usou algum código
├── Cria registro em used_referral_codes
├── Chama process_affiliate_referral
└── Retorna sucesso com desconto aplicado
```

### 5. **Processamento da Indicação**
```
process_affiliate_referral:
├── Cria registro em affiliate_referrals
├── Adiciona créditos ao referenciador
├── Registra transação em matriculacoin_transactions
└── Atualiza estatísticas do código
```

## 🗄️ Estrutura das Tabelas

### **affiliate_codes** - Códigos de Indicação
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `user_id` | uuid | ID do usuário que possui o código |
| `code` | text | Código único (ex: MATR5969) |
| `is_active` | boolean | Se o código está ativo |
| `total_referrals` | integer | Total de indicações realizadas |
| `total_earnings` | numeric | Total de créditos ganhos |

### **used_referral_codes** - Descontos Aplicados
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `user_id` | uuid | ID do usuário que usou o código |
| `affiliate_code` | text | Código usado |
| `referrer_id` | uuid | ID do referenciador |
| `discount_amount` | numeric | Valor do desconto (USD) |
| `stripe_coupon_id` | text | ID do cupom Stripe |
| `status` | text | Status: pending/applied/expired/cancelled |
| `applied_at` | timestamptz | Quando foi aplicado |
| `expires_at` | timestamptz | Quando expira (30 dias) |

### **affiliate_referrals** - Indicações Realizadas
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `referrer_id` | uuid | ID do referenciador |
| `referred_id` | uuid | ID do usuário indicado |
| `affiliate_code` | text | Código usado |
| `payment_amount` | numeric | Valor do pagamento |
| `credits_earned` | numeric | Créditos ganhos (50) |
| `status` | text | Status: pending/completed/cancelled |

### **matriculacoin_credits** - Saldo de Créditos
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `user_id` | uuid | ID do usuário |
| `balance` | numeric | Saldo atual |
| `total_earned` | numeric | Total ganho |
| `total_spent` | numeric | Total gasto |

### **matriculacoin_transactions** - Histórico de Transações
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `user_id` | uuid | ID do usuário |
| `type` | text | Tipo: earned/spent/expired/refunded |
| `amount` | numeric | Quantidade de créditos |
| `description` | text | Descrição da transação |
| `reference_type` | text | Tipo: referral/tuition_redemption |

## 🔧 Funções Principais

### **validate_and_apply_referral_code(user_id, affiliate_code)**
- **Propósito**: Valida e aplica um código de referência
- **Retorna**: JSON com status e detalhes do desconto
- **Ações**:
  - Valida o código
  - Aplica desconto automático
  - Cria registros necessários
  - Processa a indicação

### **process_affiliate_referral(affiliate_code, referred_user_id, payment_amount, payment_session_id)**
- **Propósito**: Processa uma indicação completa
- **Retorna**: boolean (sucesso/falha)
- **Ações**:
  - Cria registro de indicação
  - Adiciona créditos ao referenciador
  - Registra transação
  - Atualiza estatísticas

### **get_user_active_discount(user_id)**
- **Propósito**: Retorna desconto ativo do usuário
- **Retorna**: JSON com detalhes do desconto
- **Uso**: Verificar se usuário tem desconto válido

## 📱 Frontend - Hooks e Componentes

### **useReferralCodeCapture**
- **Propósito**: Captura códigos de referência da URL
- **Localização**: `src/hooks/useReferralCodeCapture.ts`
- **Funcionamento**:
  - Detecta parâmetro `?ref=CODE` na URL
  - Salva no localStorage automaticamente
  - Distingue entre códigos Matricula Rewards e Seller

### **useAuth**
- **Propósito**: Gerencia autenticação e processa códigos
- **Localização**: `src/hooks/useAuth.tsx`
- **Funcionamento**:
  - Detecta códigos no localStorage durante registro
  - Processa automaticamente via `validate_and_apply_referral_code`
  - Integra com o fluxo de registro

### **useReferralCode**
- **Propósito**: Gerencia validação e uso de códigos
- **Localização**: `src/hooks/useReferralCode.ts`
- **Funcionamento**:
  - Valida códigos via edge function
  - Gerencia estado dos descontos
  - Aplica códigos da URL automaticamente

## 🚀 Edge Functions

### **validate-referral-code**
- **Endpoint**: `/functions/v1/validate-referral-code`
- **Propósito**: Valida códigos via frontend
- **Funcionamento**:
  - Recebe código do frontend
  - Chama `validate_and_apply_referral_code`
  - Cria cupons Stripe
  - Retorna resultado da validação

### **process-registration-coupon**
- **Endpoint**: `/functions/v1/process-registration-coupon`
- **Propósito**: Processa cupons durante registro
- **Funcionamento**:
  - Valida códigos de afiliado
  - Aplica descontos automaticamente
  - Integra com sistema de pagamentos

## 🔍 Debug e Troubleshooting

### **Verificar se código foi capturado:**
```javascript
// No console do navegador
localStorage.getItem('pending_affiliate_code')
```

### **Verificar se código foi processado:**
```sql
-- No banco de dados
SELECT * FROM used_referral_codes WHERE user_id = 'USER_ID';
SELECT * FROM affiliate_referrals WHERE referred_id = 'USER_ID';
```

### **Verificar créditos do referenciador:**
```sql
-- No banco de dados
SELECT * FROM matriculacoin_credits WHERE user_id = 'REFERRER_ID';
SELECT * FROM matriculacoin_transactions WHERE user_id = 'REFERRER_ID' AND type = 'earned';
```

## ⚠️ Problemas Comuns e Soluções

### **1. Código não é processado automaticamente**
- **Causa**: Inconsistência na nomenclatura do localStorage
- **Solução**: Verificar se está usando `pending_affiliate_code` consistentemente

### **2. Desconto não é aplicado**
- **Causa**: Função `validate_and_apply_referral_code` falha
- **Solução**: Verificar logs da edge function e validar dados

### **3. Créditos não são adicionados**
- **Causa**: Função `process_affiliate_referral` falha
- **Solução**: Verificar se todas as tabelas têm as colunas necessárias

### **4. Código não é capturado da URL**
- **Causa**: Hook `useReferralCodeCapture` não está sendo usado
- **Solução**: Verificar se está importado e usado no App.tsx

## 📊 Monitoramento e Métricas

### **Indicadores de Performance:**
- Total de códigos criados
- Taxa de conversão de códigos
- Créditos distribuídos
- Descontos aplicados

### **Logs Importantes:**
- Criação de códigos
- Validação de códigos
- Aplicação de descontos
- Processamento de indicações
- Adição de créditos

## 🔮 Próximos Passos e Melhorias

### **Curto Prazo:**
1. ✅ Corrigir inconsistência na nomenclatura
2. ✅ Adicionar comentários explicativos
3. ✅ Documentar sistema completo

### **Médio Prazo:**
1. Implementar dashboard de analytics
2. Adicionar notificações automáticas
3. Melhorar sistema de cupons Stripe

### **Longo Prazo:**
1. Sistema de gamificação
2. Níveis de afiliados
3. Comissões por pagamentos
4. Integração com redes sociais

---

## 📞 Suporte

Para dúvidas ou problemas com o sistema de referência:
1. Verificar logs do console do navegador
2. Verificar logs das edge functions
3. Consultar esta documentação
4. Verificar estrutura das tabelas no banco

**Última atualização**: 27/08/2025
**Versão**: 1.0.0
**Status**: ✅ Funcionando
