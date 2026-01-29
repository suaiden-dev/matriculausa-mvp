# Correção: Duplicação de MatriculaCoins no Pagamento I20

## Problema Identificado

Quando um aluno indicado pagava a I20 Control Fee, o aluno indicador recebia **540 MatriculaCoins** em vez de **180 MatriculaCoins**.

### Causa Raiz

Existiam **4 fontes** creditando MatriculaCoins simultaneamente:

1. **`stripe-webhook/index.ts` (linha 1557)** - Atualiza `has_paid_i20_control_fee = true` → dispara trigger
2. **`stripe-webhook/index.ts` (linha 1757)** - **CÓDIGO DUPLICADO** que atualiza `has_paid_i20_control_fee = true` novamente → dispara trigger novamente  
3. **`verify-stripe-session-i20-control-fee/index.ts` (linhas 793-804)** - Credita 180 coins **manualmente** via RPC
4. **`approve-zelle-payment-automatic/index.ts` (linhas 420-426)** - Credita 180 coins **manualmente** via RPC (para pagamentos Zelle)

### Evidência

Transações encontradas no banco de dados para o usuário Alexandre Brito (analiza4460@uorak.com):

```
ID: 472dc4c4-2353-4b86-949b-10bcc5d539c1
Amount: 180.00
Description: "Referral reward: I20 Control Fee paid by Conta de Teste Rewards"
Created: 2026-01-29 19:09:23.137895+00

ID: e8483d93-1f67-495f-8a0d-a2e5fbc2f164
Amount: 180.00
Description: "Referral reward: I20 Control Fee paid by Conta de Teste Rewards"
Created: 2026-01-29 19:09:22.233138+00

ID: f0de7805-6331-47c2-bea4-1b859ef035dd
Amount: 180.00
Description: "Referral reward: I20 Control Fee paid by Conta de Teste Rewards"
Created: 2026-01-29 19:09:19.66341+00
```

**Total: 3 × 180 = 540 MatriculaCoins**

## Solução Implementada

### 1. Removido Código Duplicado no `stripe-webhook/index.ts`

**Arquivo**: `supabase/functions/stripe-webhook/index.ts`
**Linhas removidas**: 1751-1801

O bloco duplicado que processava `i20_control_fee` foi removido, pois já existia outro bloco nas linhas 1528-1615 fazendo o mesmo trabalho.

### 2. Removida Lógica Manual de Crédito em `verify-stripe-session-i20-control-fee/index.ts`

**Arquivo**: `supabase/functions/verify-stripe-session-i20-control-fee/index.ts`
**Linhas modificadas**: 770-871

A lógica manual de crédito de MatriculaCoins foi removida. Agora a Edge Function apenas:
- Envia notificação de recompensa para o padrinho
- Não credita coins (isso é feito pelo trigger)
- Não atualiza status do referral (isso é feito pelo trigger)

### 3. Removida Lógica Manual de Crédito em `approve-zelle-payment-automatic/index.ts`

**Arquivo**: `supabase/functions/approve-zelle-payment-automatic/index.ts`
**Linhas modificadas**: 397-490

A lógica manual de crédito de MatriculaCoins para pagamentos Zelle foi removida. Agora a Edge Function apenas:
- Envia notificação de recompensa para o padrinho
- Não credita coins (isso é feito pelo trigger)
- Não atualiza status do referral (isso é feito pelo trigger)

### 4. Trigger do Banco de Dados (Mantido)

**Arquivo**: `supabase/migrations/20260129000002_trigger_i20_rewards.sql`

O trigger `handle_i20_payment_rewards()` continua sendo a **única fonte de verdade** para:
1. Creditar 180 MatriculaCoins quando `has_paid_i20_control_fee` muda para `true`
2. Atualizar status do referral para `'i20_paid'`

## Arquitetura Final

```
Pagamento I20 (Stripe/Zelle)
    ↓
stripe-webhook OU verify-stripe-session-i20-control-fee
    ↓
UPDATE user_profiles SET has_paid_i20_control_fee = true
    ↓
TRIGGER: handle_i20_payment_rewards()
    ↓
1. Credita 180 MatriculaCoins (via add_coins_to_user_matricula)
2. Atualiza status para 'i20_paid' (via update_referral_status)
    ↓
verify-stripe-session-i20-control-fee
    ↓
Envia notificação de recompensa para o padrinho
```

## Benefícios da Solução

1. **Centralização**: Toda a lógica de crédito está no trigger do banco de dados
2. **Consistência**: Funciona para TODOS os métodos de pagamento (Stripe, Zelle automático, Zelle manual)
3. **Sem Duplicação**: Apenas uma fonte credita coins, independente de quantas Edge Functions atualizem o campo
4. **Manutenibilidade**: Mais fácil de manter e debugar

## Próximos Passos

1. ✅ Testar o fluxo completo com um novo pagamento I20
2. ✅ Verificar que apenas 180 coins são creditados
3. ✅ Confirmar que a notificação é enviada corretamente
4. ⚠️ Considerar adicionar um mecanismo de idempotência no trigger para evitar duplicações em caso de múltiplos UPDATEs simultâneos

## Data da Correção

**2026-01-29**
