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
