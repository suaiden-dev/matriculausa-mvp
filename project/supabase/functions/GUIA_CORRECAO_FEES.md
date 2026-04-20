# Guia de Correção — `gross_amount_usd` e `fee_amount_usd` nulos

## Contexto do Problema

A tabela `individual_fee_payments` tem 3 colunas financeiras:

| Coluna | Significado |
|---|---|
| `amount` | Valor **líquido** recebido (net — após descontar a taxa da Stripe) |
| `gross_amount_usd` | Valor **bruto** cobrado ao aluno (o que saiu do cartão dele) |
| `fee_amount_usd` | Taxa descontada pelo gateway (Stripe cobrou isso) |

**O problema:** Quando a Stripe dispara o webhook ou o frontend chama a `verify-stripe-session-*`, em muitos casos o `balance_transaction` (documento interno da Stripe com os valores reais) ainda não foi gerado. A função falha silenciosamente e salva:
- `amount` = valor bruto do checkout (ERRADO — deveria ser o net)
- `gross_amount_usd` = NULL
- `fee_amount_usd` = NULL

Isso quebra os cálculos do dashboard de Financial Analytics.

**Registros afetados confirmados:**
- 9 registros stripe `selection_process` com nulos
- 2 registros stripe `placement` com nulos
- 7 registros parcelow com nulos (problema diferente)

---

## TASK 1.1 — Criar `supabase/functions/shared/stripe-utils.ts`

**Por que fazer primeiro:** todas as demais tasks dependem desta.

### Arquivo a criar

**Caminho:** `supabase/functions/shared/stripe-utils.ts`

**Conteúdo completo:**

```typescript
// @ts-ignore
declare const Deno: any;

/**
 * Resultado da busca do BalanceTransaction da Stripe.
 * - amount: valor líquido (net) em USD — o que foi depositado na conta
 * - gross_amount_usd: valor bruto cobrado ao aluno
 * - fee_amount_usd: taxa descontada pela Stripe
 *
 * Quando a busca falha (race condition ou erro), gross e fee são null
 * e amount recebe o fallbackAmount (valor bruto do checkout).
 */
export interface StripeBalanceResult {
  amount: number;
  gross_amount_usd: number | null;
  fee_amount_usd: number | null;
}

/**
 * Busca os valores reais de net/gross/fee no BalanceTransaction da Stripe.
 *
 * Implementa retry de 1 tentativa com delay de 1.5s para resolver
 * race conditions comuns: o webhook chega antes do BT ser gerado.
 *
 * @param stripe     Cliente Stripe já instanciado
 * @param paymentIntentId  ID do PaymentIntent (ex: pi_3TDSimKdCh3y3bmY0DPMV3lT)
 * @param fallbackAmount   Valor bruto do checkout (session.amount_total / 100)
 * @param currency         Moeda da sessão (ex: "USD", "BRL")
 */
export async function getStripeBalanceTransaction(
  stripe: any,
  paymentIntentId: string,
  fallbackAmount: number,
  currency: string,
): Promise<StripeBalanceResult> {
  if (!paymentIntentId) {
    return { amount: fallbackAmount, gross_amount_usd: null, fee_amount_usd: null };
  }

  // Tenta buscar o BT — com 1 retry após 1.5s se não encontrar
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (attempt === 2) {
        console.log(`[stripe-utils] ⏳ Retry após 1.5s para ${paymentIntentId}...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      console.log(`[stripe-utils] 🔍 Buscando BalanceTransaction (tentativa ${attempt}) para: ${paymentIntentId}`);

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.balance_transaction"],
      });

      const charge = paymentIntent.latest_charge;
      if (!charge || typeof charge === "string") {
        console.warn(`[stripe-utils] ⚠️ Charge não encontrado para ${paymentIntentId}`);
        continue;
      }

      let bt = charge.balance_transaction;

      // Se não veio expandido, buscar explicitamente pelo source
      if (!bt || typeof bt === "string") {
        const bts = await stripe.balanceTransactions.list({
          source: charge.id,
          limit: 1,
        });
        if (bts.data.length > 0) {
          bt = bts.data[0];
        }
      }

      if (bt && typeof bt !== "string" && bt.currency === "usd") {
        const netAmount = bt.net / 100;
        const grossAmount = bt.amount / 100;
        const feeAmount = bt.fee / 100;

        console.log(
          `[stripe-utils] ✅ Sucesso! Net=$${netAmount} Gross=$${grossAmount} Fee=$${feeAmount} USD`,
        );
        return {
          amount: netAmount,
          gross_amount_usd: grossAmount,
          fee_amount_usd: feeAmount,
        };
      }

      console.warn(`[stripe-utils] ⚠️ BT em USD não encontrado para ${paymentIntentId} (tentativa ${attempt})`);
    } catch (err: any) {
      console.error(`[stripe-utils] ❌ Erro na tentativa ${attempt} para ${paymentIntentId}:`, err?.message);
    }
  }

  // Fallback: BT não disponível após retry
  // Atenção: neste caso, amount = valor bruto do checkout (não é o net real)
  console.warn(`[stripe-utils] ⚠️ Fallback aplicado para ${paymentIntentId} — gross/fee serão NULL`);
  return { amount: fallbackAmount, gross_amount_usd: null, fee_amount_usd: null };
}
```

**Como testar localmente:** Não tem lógica para testar isolada — valide via Task 2.1.

---

## TASK 2.1 — Substituir `getUSDAmountFromStripe` no stripe-webhook

**Arquivo:** `supabase/functions/stripe-webhook/index.ts`

### Passo 1 — Adicionar o import no topo do arquivo

Após as linhas de import existentes (linhas 1–13), adicionar:

```typescript
import { getStripeBalanceTransaction } from "../shared/stripe-utils.ts";
```

Ficará assim:
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import Stripe from "npm:stripe@17.7.0";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

// @ts-ignore
declare const Deno: any;
import { getStripeConfig } from "../stripe-config.ts";
import {
  getAllWebhookSecrets,
  getStripeEnvironmentVariables,
} from "../shared/environment-detector.ts";
import { getStripeBalanceTransaction } from "../shared/stripe-utils.ts"; // ← ADICIONAR
```

### Passo 2 — Remover a função local `getUSDAmountFromStripe`

Localizar e **deletar completamente** o trecho entre as linhas 37–87:

```typescript
// ❌ DELETAR TUDO ISSO (linhas 37–87):
async function getUSDAmountFromStripe(
  stripe: any,
  paymentIntentId: string,
  fallbackAmount: number,
  currency: string
): Promise<{ amount: number; gross_amount_usd: number | null; fee_amount_usd: number | null }> {
  if (!paymentIntentId) {
    return { amount: fallbackAmount, gross_amount_usd: null, fee_amount_usd: null };
  }
  // ... resto da função ...
}
```

### Passo 3 — Substituir todas as chamadas

Buscar no arquivo por `getUSDAmountFromStripe` (há 5 ocorrências) e substituir cada uma por `getStripeBalanceTransaction`.

Exemplo de como ficará:
```typescript
// ANTES:
const stripeInfo = await getUSDAmountFromStripe(stripe, paymentIntentId, paymentAmountRaw, currency);

// DEPOIS:
const stripeInfo = await getStripeBalanceTransaction(stripe, paymentIntentId, paymentAmountRaw, currency);
```

As 5 ocorrências estão aproximadamente nas linhas:
- ~1020 (bloco `application_fee`)
- ~1144 (bloco `scholarship_fee`)
- ~1398 (bloco `i20_control_fee`)
- ~1535 (bloco `selection_process`)
- ~1693 (bloco `ds160/i539/reinstatement_package`)

**Verificação:** Após a troca, rodar busca por `getUSDAmountFromStripe` no arquivo — deve retornar zero resultados.

---

## TASK 2.2 — Corrigir bloco `placement_fee` no stripe-webhook

**Arquivo:** `supabase/functions/stripe-webhook/index.ts`

**Localizar o bloco** (aproximadamente linhas 1462–1500) onde aparece `p_fee_type: "placement"`:

```typescript
// ❌ CÓDIGO ATUAL (sem busca de BT):
const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
const currency = session.currency?.toUpperCase() || "USD";
const paymentIntentId = session.payment_intent as string || "";

let paymentAmount = paymentAmountRaw;
if (currency === "BRL" && session.metadata?.exchange_rate) {
  const exchangeRate = parseFloat(session.metadata.exchange_rate);
  if (exchangeRate > 0) {
    paymentAmount = paymentAmountRaw / exchangeRate;
  }
}

const { error: insertError } = await supabase.rpc(
  "insert_individual_fee_payment",
  {
    p_user_id: userId,
    p_fee_type: "placement",
    p_amount: paymentAmount,
    p_payment_date: paymentDate,
    p_payment_method: "stripe",
    p_payment_intent_id: paymentIntentId,
    p_stripe_charge_id: null,
    p_zelle_payment_id: null,
  },
);
```

**Substituir por:**

```typescript
// ✅ CÓDIGO CORRIGIDO (com busca de BT via utilitário):
const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
const currency = session.currency?.toUpperCase() || "USD";
const paymentIntentId = session.payment_intent as string || "";

// Buscar valores reais de net/gross/fee no Stripe BalanceTransaction
const stripeInfo = await getStripeBalanceTransaction(
  stripe,
  paymentIntentId,
  paymentAmountRaw,
  currency
);
let paymentAmount = stripeInfo.amount;
const grossAmountUsd = stripeInfo.gross_amount_usd;
const feeAmountUsd = stripeInfo.fee_amount_usd;

// Fallback de conversão BRL→USD se BT não retornou
if (!grossAmountUsd && session.metadata?.exchange_rate) {
  const exchangeRate = parseFloat(session.metadata.exchange_rate);
  if (exchangeRate > 0) paymentAmount = paymentAmountRaw / exchangeRate;
}

const { error: insertError } = await supabase.rpc(
  "insert_individual_fee_payment",
  {
    p_user_id: userId,
    p_fee_type: "placement",
    p_amount: paymentAmount,
    p_payment_date: paymentDate,
    p_payment_method: "stripe",
    p_payment_intent_id: paymentIntentId,
    p_stripe_charge_id: null,
    p_zelle_payment_id: null,
    p_gross_amount_usd: grossAmountUsd,
    p_fee_amount_usd: feeAmountUsd,
  },
);
```

---

## TASK 3.1 — Corrigir `verify-stripe-session-placement-fee`

**Arquivo:** `supabase/functions/verify-stripe-session-placement-fee/index.ts`

### Passo 1 — Adicionar import do Stripe e do utilitário

No topo do arquivo, **já existe** `import Stripe from 'npm:stripe@17.7.0'`. Verificar se existe — se não, adicionar junto com:

```typescript
import Stripe from 'npm:stripe@17.7.0';
import { getStripeBalanceTransaction } from '../shared/stripe-utils.ts';
```

### Passo 2 — Localizar o bloco de insert (linhas 74–87)

**Código atual:**
```typescript
// Registrar pagamento
const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
const amountPaid = session.amount_total / 100;

await supabase.rpc('insert_individual_fee_payment', {
  p_user_id: userId,
  p_fee_type: 'placement',
  p_amount: amountPaid,
  p_payment_date: new Date().toISOString(),
  p_payment_method: 'stripe',
  p_payment_intent_id: paymentIntentId,
  p_stripe_charge_id: null,
  p_zelle_payment_id: null
});
```

**Substituir por:**
```typescript
// Registrar pagamento com net/gross/fee reais do Stripe
const paymentIntentId = typeof session.payment_intent === 'string'
  ? session.payment_intent
  : session.payment_intent?.id;
const amountRaw = session.amount_total / 100;
const currency = session.currency?.toUpperCase() || 'USD';

const stripeInfo = await getStripeBalanceTransaction(stripe, paymentIntentId || '', amountRaw, currency);

await supabase.rpc('insert_individual_fee_payment', {
  p_user_id: userId,
  p_fee_type: 'placement',
  p_amount: stripeInfo.amount,
  p_payment_date: new Date().toISOString(),
  p_payment_method: 'stripe',
  p_payment_intent_id: paymentIntentId,
  p_stripe_charge_id: null,
  p_zelle_payment_id: null,
  p_gross_amount_usd: stripeInfo.gross_amount_usd,
  p_fee_amount_usd: stripeInfo.fee_amount_usd,
});
```

**Atenção:** O `stripe` client já está instanciado no início da função como:
```typescript
const stripe = new Stripe(config.secretKey, { apiVersion: '2024-04-10' });
```
Basta usar ele.

---

## TASK 3.2 — Corrigir `verify-stripe-session-reinstatement-fee`

**Arquivo:** `supabase/functions/verify-stripe-session-reinstatement-fee/index.ts`

**Exatamente idêntico à Task 3.1.** O arquivo tem estrutura igual ao `placement-fee`. Repetir os mesmos passos:

1. Adicionar import do utilitário no topo
2. Localizar o insert nas linhas 75–87 (praticamente idêntico ao placement)
3. Substituir pelo mesmo padrão com `getStripeBalanceTransaction`
4. Mudar `p_fee_type` para `'reinstatement_package'` (já está correto no arquivo original)

---

## TASK 4.1 — Adicionar `gross_amount_usd` nos checkouts Parcelow

**Por que é diferente:** O Parcelow não tem `balance_transaction`. O insert acontece no momento da **criação do checkout** (não do pagamento). O `finalAmount` é o valor que o aluno *vai* pagar — portanto este é o `gross`.

**Arquivos a editar (6 no total):**

| Arquivo | Variável a usar como gross |
|---|---|
| `parcelow-checkout-selection-process/index.ts` | `finalAmount` |
| `parcelow-checkout-placement-fee/index.ts` | `finalAmount` |
| `parcelow-checkout-application-fee/index.ts` | `finalAmount` (verificar nome) |
| `parcelow-checkout-i20-control-fee/index.ts` | `finalAmount` (verificar nome) |
| `parcelow-checkout-scholarship-fee/index.ts` | `finalAmount` (verificar nome) |
| `parcelow-checkout-reinstatement-fee/index.ts` | `finalAmount` (verificar nome) |

**Em cada arquivo**, localizar o `.rpc("insert_individual_fee_payment", {...})` e adicionar os dois campos:

```typescript
// ❌ ANTES (exemplo do placement-fee, linhas 294–306):
const { error: insertError } = await supabase.rpc(
  "insert_individual_fee_payment",
  {
    p_user_id: user.id,
    p_fee_type: "placement_fee",
    p_amount: finalAmount,
    p_payment_date: new Date().toISOString(),
    p_payment_method: "parcelow",
    p_parcelow_order_id: String(orderId),
    p_parcelow_checkout_url: checkoutUrl,
    p_parcelow_reference: reference,
  },
);

// ✅ DEPOIS — adicionar os dois campos:
const { error: insertError } = await supabase.rpc(
  "insert_individual_fee_payment",
  {
    p_user_id: user.id,
    p_fee_type: "placement_fee",
    p_amount: finalAmount,
    p_payment_date: new Date().toISOString(),
    p_payment_method: "parcelow",
    p_parcelow_order_id: String(orderId),
    p_parcelow_checkout_url: checkoutUrl,
    p_parcelow_reference: reference,
    p_gross_amount_usd: finalAmount, // ← ADICIONAR: gross = o que o aluno pagará
    p_fee_amount_usd: null,          // ← ADICIONAR: taxa não conhecida no checkout
  },
);
```

**Repetir para os 6 arquivos.** O padrão é o mesmo em todos — só muda o nome da variável de amount.

---

## TASK 5.1 — Backfill dos registros Stripe com nulos

**⚠️ Executar apenas após fazer deploy das Tasks 1.1, 2.1, 2.2, 3.1, 3.2.**

### Pré-validação (executar antes de criar a function)

```sql
-- Ver exatamente quais registros serão corrigidos
SELECT id, fee_type, amount, payment_intent_id, payment_date
FROM individual_fee_payments
WHERE payment_method = 'stripe'
  AND gross_amount_usd IS NULL
  AND payment_intent_id IS NOT NULL
ORDER BY payment_date;
```

Deve retornar ~11 registros.

### Criar Edge Function temporária

**Arquivo a criar:** `supabase/functions/backfill-stripe-fees/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import Stripe from "npm:stripe@17.7.0";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getStripeBalanceTransaction } from "../shared/stripe-utils.ts";

// @ts-ignore
declare const Deno: any;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Usar a chave de produção diretamente (backfill é operação admin)
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_PROD") ?? "", {});

Deno.serve(async (req: Request) => {
  // Proteção básica — só aceitar requests com o service role key no header
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  console.log("[backfill-stripe-fees] 🚀 Iniciando backfill...");

  // Buscar todos os registros stripe com gross nulo e payment_intent_id preenchido
  const { data: records, error: fetchError } = await supabase
    .from("individual_fee_payments")
    .select("id, fee_type, amount, payment_intent_id, payment_date")
    .eq("payment_method", "stripe")
    .is("gross_amount_usd", null)
    .not("payment_intent_id", "is", null);

  if (fetchError || !records) {
    return new Response(JSON.stringify({ error: fetchError?.message }), { status: 500 });
  }

  console.log(`[backfill-stripe-fees] 📋 Encontrados ${records.length} registros para corrigir`);

  const results = [];

  for (const record of records) {
    try {
      const stripeInfo = await getStripeBalanceTransaction(
        stripe,
        record.payment_intent_id,
        parseFloat(record.amount),
        "USD",
      );

      if (stripeInfo.gross_amount_usd !== null) {
        const { error: updateError } = await supabase
          .from("individual_fee_payments")
          .update({
            amount: stripeInfo.amount,
            gross_amount_usd: stripeInfo.gross_amount_usd,
            fee_amount_usd: stripeInfo.fee_amount_usd,
          })
          .eq("id", record.id);

        if (updateError) {
          results.push({ id: record.id, status: "error", error: updateError.message });
        } else {
          results.push({
            id: record.id,
            status: "updated",
            fee_type: record.fee_type,
            old_amount: record.amount,
            new_amount: stripeInfo.amount,
            gross: stripeInfo.gross_amount_usd,
            fee: stripeInfo.fee_amount_usd,
          });
        }
      } else {
        results.push({ id: record.id, status: "bt_not_found", payment_intent_id: record.payment_intent_id });
      }
    } catch (err: any) {
      results.push({ id: record.id, status: "exception", error: err?.message });
    }
  }

  console.log("[backfill-stripe-fees] ✅ Backfill concluído:", results);

  return new Response(JSON.stringify({ processed: records.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Como executar o backfill

Após fazer deploy da function:

```bash
curl -X POST \
  https://fitpynguasqqutuhzifx.supabase.co/functions/v1/backfill-stripe-fees \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY"
```

Verificar a resposta JSON — todos os registros devem ter `status: "updated"`.

### Validação pós-backfill

```sql
-- Verificar se ainda há nulos no stripe
SELECT COUNT(*) as nulos_restantes
FROM individual_fee_payments
WHERE payment_method = 'stripe'
  AND gross_amount_usd IS NULL;
-- Resultado esperado: 0
```

### Limpeza (após confirmar)

Deletar o arquivo `supabase/functions/backfill-stripe-fees/index.ts` — é uma function temporária.

---

## TASK 5.2 — Backfill dos registros Parcelow nulos

**⚠️ Confirmar a lista de registros antes de executar. NÃO executar sem aprovação explícita.**

### Pré-validação

```sql
-- Ver exatamente o que será alterado
SELECT id, fee_type, amount, payment_date
FROM individual_fee_payments
WHERE payment_method = 'parcelow'
  AND gross_amount_usd IS NULL;
```

Deve retornar ~7 registros com amounts como: 200.00, 400.00, 350.00, 2100.00, 800.00, 400.00, 550.00.

### Executar o UPDATE

Após aprovação:

```sql
UPDATE individual_fee_payments
SET gross_amount_usd = amount
WHERE payment_method = 'parcelow'
  AND gross_amount_usd IS NULL;
```

**Nota:** Para Parcelow, `fee_amount_usd` permanece NULL intencionalmente — a taxa do Parcelow não é retornada na criação do checkout e eles não têm um webhook de baixo nível como a Stripe para recuperar.

### Validação pós-update

```sql
SELECT COUNT(*) as nulos_restantes
FROM individual_fee_payments
WHERE payment_method = 'parcelow'
  AND gross_amount_usd IS NULL;
-- Resultado esperado: 0
```

---

## Ordem de Deploy

```
1. Criar shared/stripe-utils.ts (Task 1.1) — sem deploy, só criar o arquivo
2. Editar stripe-webhook/index.ts (Tasks 2.1 + 2.2 juntas) → deploy
3. Editar verify-stripe-session-placement-fee/index.ts (Task 3.1) → deploy
4. Editar verify-stripe-session-reinstatement-fee/index.ts (Task 3.2) → deploy
5. Editar todos os parcelow-checkout-* (Task 4.1) → deploy todos
6. Criar + deploy backfill-stripe-fees → executar → validar → deletar (Task 5.1)
7. Executar SQL do Parcelow após aprovação (Task 5.2)
```

> As Tasks 2.x, 3.x e 4.x podem ser feitas em paralelo por pessoas diferentes
> pois editam arquivos distintos. A única dependência é a Task 1.1 estar criada
> antes de qualquer deploy das Tasks 2.x e 3.x.

---

## Verificação Final

Após todas as tasks concluídas, rodar no banco:

```sql
-- Visão geral: nenhum stripe deve ter nulos após o backfill
SELECT 
  payment_method,
  fee_type,
  COUNT(*) as total,
  COUNT(gross_amount_usd) as com_gross,
  COUNT(*) - COUNT(gross_amount_usd) as nulos_gross
FROM individual_fee_payments
WHERE payment_method IN ('stripe', 'parcelow')
GROUP BY payment_method, fee_type
ORDER BY payment_method, fee_type;
```

**Resultado esperado:** coluna `nulos_gross` = 0 para todos os tipos stripe e parcelow.
