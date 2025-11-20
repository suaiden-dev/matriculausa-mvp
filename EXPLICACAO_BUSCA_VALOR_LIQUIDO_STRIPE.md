# 📋 Explicação: Busca do Valor Líquido do Stripe para Pagamentos PIX

## 🎯 Como Funciona

### 1. **Detecção Automática de Ambiente**

A edge function `verify-stripe-session-selection-process-fee` detecta automaticamente o ambiente através dos **headers da requisição**:

```typescript
// Detecção baseada em:
- referer (header HTTP)
- origin (header HTTP)  
- host (header HTTP)

// Ambientes detectados:
✅ PRODUÇÃO: se contém "matriculausa.com"
✅ STAGING: se contém "staging-matriculausa.netlify.app"
✅ TEST/LOCALHOST: qualquer outro caso (localhost:5173, etc)
```

### 2. **Lógica de Controle da Busca do Valor Líquido**

Na edge function `verify-stripe-session-selection-process-fee`, existe esta lógica (linhas ~448-452):

```typescript
// 1. Verifica variável de ambiente ENABLE_STRIPE_NET_AMOUNT_FETCH
const enableNetAmountFetchEnv = Deno.env.get('ENABLE_STRIPE_NET_AMOUNT_FETCH');

// 2. Decisão em 3 níveis:
const shouldFetchNetAmount = 
  enableNetAmountFetchEnv === 'true'   // ✅ Se definido como 'true', SEMPRE busca
    ? true 
    : enableNetAmountFetchEnv === 'false'  // ❌ Se definido como 'false', SEMPRE desativa
      ? false 
      : !config.environment.isProduction;  // 🔄 Se não definido, usa detecção automática
                                           //    - PRODUÇÃO: não busca (usa exchange_rate)
                                           //    - TEST/STAGING: busca do Stripe
```

### 3. **Comportamento por Ambiente**

| Ambiente | Variável ENABLE_STRIPE_NET_AMOUNT_FETCH | Busca Valor Líquido? | O que acontece? |
|----------|------------------------------------------|----------------------|-----------------|
| **Localhost** (localhost:5173) | Não definida | ✅ **SIM** (detecção automática) | Busca `balance_transaction.net` do Stripe |
| **Staging** | Não definida | ✅ **SIM** (detecção automática) | Busca `balance_transaction.net` do Stripe |
| **Produção** | Não definida | ❌ **NÃO** (detecção automática) | Usa `exchange_rate` do metadata da sessão |
| **Qualquer** | `true` | ✅ **SIM** (força ativação) | Busca `balance_transaction.net` do Stripe |
| **Qualquer** | `false` | ❌ **NÃO** (força desativação) | Usa `exchange_rate` do metadata da sessão |

### 4. **O que é buscado quando ativado?**

Quando `shouldFetchNetAmount = true`, o sistema:

1. Busca o `PaymentIntent` com `latest_charge.balance_transaction` expandido
2. Extrai o `balance_transaction.net` (valor líquido em USD)
3. Este valor já considera:
   - ✅ Taxas do Stripe
   - ✅ Conversão de moeda (BRL → USD)
   - ✅ O valor real que a empresa recebe

### 5. **Fallback Seguro**

Se a busca do Stripe falhar ou estiver desativada:

- Usa `exchange_rate` do `metadata` da sessão Stripe
- Garante que o valor sempre seja registrado
- Evita erros em produção

## 🔧 Como Ativar em Produção

### **Opção 1: Ativar via Variável de Ambiente (Recomendado)**

1. Acesse o **Supabase Dashboard**
2. Vá em **Project Settings** → **Edge Functions** → **Secrets**
3. Adicione uma nova variável:
   - **Nome**: `ENABLE_STRIPE_NET_AMOUNT_FETCH`
   - **Valor**: `true`
4. Faça o deploy das edge functions novamente (ou aguarde alguns minutos para a variável ser propagada)

### **Opção 2: Manter Desativado em Produção (Padrão)**

Se você **não** adicionar a variável `ENABLE_STRIPE_NET_AMOUNT_FETCH`, o sistema continuará:
- ✅ Buscando valor líquido em **localhost/staging** (para testes)
- ❌ **NÃO** buscando em **produção** (usa `exchange_rate` do metadata)

## 📍 Onde Está Implementado

A lógica está presente na edge function:

- ✅ `verify-stripe-session-selection-process-fee/index.ts` (linhas 446-530)

## 🔍 Logs para Debug

Quando a edge function roda, você verá nos logs:

```
✅ Buscando valor líquido do Stripe (ambiente: test)
[Individual Fee Payment] Valor líquido recebido do Stripe (após taxas e conversão): 350.50 USD
[Individual Fee Payment] Valor bruto: 400.00 USD, Taxas: 49.50 USD
```

Ou quando desativado:

```
⚠️ Busca de valor líquido DESATIVADA (ambiente: production), usando exchange_rate do metadata
[Individual Fee Payment] Usando exchange_rate do metadata: 2000.00 BRL / 5.50 = 363.64 USD
```

## ⚠️ Importante

- A variável `ENABLE_STRIPE_NET_AMOUNT_FETCH` é **opcional**
- Se não existir, o sistema usa detecção automática (seguro para produção)
- Se existir e for `true`, **força busca** em todos os ambientes
- Se existir e for `false`, **força desativação** em todos os ambientes
- Em produção, por padrão, usa `exchange_rate` do metadata (não faz chamada extra ao Stripe)

## 🎯 Resumo Simples

**Atualmente:**
- Localhost: ✅ Busca valor líquido do Stripe (para você testar)
- Staging: ✅ Busca valor líquido do Stripe (para você testar)
- Produção: ❌ Usa `exchange_rate` do metadata (proteção automática)

**Para ativar em produção:**
- Adicione `ENABLE_STRIPE_NET_AMOUNT_FETCH=true` no Supabase Secrets

## 💡 Por que essa proteção?

1. **Evita chamadas extras à API do Stripe em produção** (economiza recursos)
2. **Permite testar a funcionalidade** em test/staging antes de ativar
3. **Fallback seguro** sempre disponível (exchange_rate do metadata)
4. **Controle explícito** quando necessário via variável de ambiente

