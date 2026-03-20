/**
 * Busca o valor líquido (net) em USD diretamente da API do Stripe
 */
export async function getUSDAmountFromStripe(
  stripe: any,
  paymentIntentId: string,
  fallbackAmount: number,
  currency: string
): Promise<{ amount: number; gross_amount_usd: number | null; fee_amount_usd: number | null }> {
  if (!paymentIntentId) {
    return { amount: fallbackAmount, gross_amount_usd: null, fee_amount_usd: null };
  }

  try {
    console.log(`[Stripe API] Buscando valor líquido em USD para PIX: ${paymentIntentId}`);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });

    const charge = paymentIntent.latest_charge;
    if (charge && typeof charge !== "string") {
      let bt = charge.balance_transaction;
      
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
        
        console.log(`[Stripe API] Sucesso! Valor líquido convertido: $${netAmount} USD (Bruto: $${grossAmount}, Taxas: $${feeAmount})`);
        return {
          amount: netAmount,
          gross_amount_usd: grossAmount,
          fee_amount_usd: feeAmount,
        };
      }
    }
  } catch (err) {
    console.error(`[Stripe API] Erro ao buscar valor USD para ${paymentIntentId}:`, err);
  }

  return { amount: fallbackAmount, gross_amount_usd: null, fee_amount_usd: null };
}

// Função auxiliar para determinar moeda e símbolo baseado na session do Stripe
export function getCurrencyInfo(session: any) {
  const currency = session.currency?.toLowerCase() || "usd";
  const isPix = session.payment_method_types?.includes("pix") ||
    session.metadata?.payment_method === "pix";

  if (currency === "brl" || isPix) {
    return {
      currency: "BRL",
      symbol: "R$",
      code: "brl",
    };
  }

  return {
    currency: "USD",
    symbol: "$",
    code: "usd",
  };
}

// Função auxiliar para formatar valor com moeda
export function formatAmountWithCurrency(amount: number, session: any) {
  const currencyInfo = getCurrencyInfo(session);
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
}

/**
 * Busca dados do usuário (nome e email)
 */
export async function getUserData(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase.from("user_profiles").select(
      "full_name, email",
    ).eq("user_id", userId).single();
    if (error) {
      console.error("[getUserData] Erro ao buscar dados do usuário:", error);
      return {
        email: "",
        name: "Usuário",
      };
    }
    return {
      email: data.email || "",
      name: data.full_name || "Usuário",
    };
  } catch (error) {
    console.error("[getUserData] Erro inesperado:", error);
    return {
      email: "",
      name: "Usuário",
    };
  }
}
