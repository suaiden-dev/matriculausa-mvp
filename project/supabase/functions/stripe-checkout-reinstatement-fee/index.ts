// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getStripeConfig } from "../stripe-config.ts";
import {
  calculateCardAmountWithFees,
  calculatePIXAmountWithFees,
} from "../utils/stripe-fee-calculator.ts";
import { notifyCheckoutInitiated } from "../utils/checkout-notifier.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);

    // Criar instância do Stripe com a chave correta para o ambiente
    const stripe = new Stripe(config.secretKey, {
      appInfo: {
        name: "MatriculaUSA Integration",
        version: "1.0.0",
      },
    });

    console.log(`🔧 Using Stripe in ${config.environment.environment} mode for Reinstatement`);

    const {
      success_url,
      cancel_url,
      amount: bodyAmount,
      metadata,
      payment_method,
    } = await req.json();
    
    const fee_type = 'reinstatement_package';
    const BASE_AMOUNT = 500; // Valor base da Reinstatement Fee

    // Priorizar metadata.final_amount (valor com desconto do cupom calculado no frontend)
    // Caso contrário, uses o amount do body, ou o valor base como fallback
    const hasFinalAmountFromMetadata = metadata?.final_amount && !isNaN(parseFloat(metadata.final_amount));
    const amount = hasFinalAmountFromMetadata
      ? parseFloat(metadata.final_amount)
      : (bodyAmount || BASE_AMOUNT);

    console.log("[stripe-checkout-reinstatement-fee] 💰 Valor para cobrança:", {
      fromMetadata: hasFinalAmountFromMetadata,
      amount,
      bodyAmount,
    });

    const mode = "payment";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return corsResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      return corsResponse({ error: "Invalid token" }, 401);
    }

    // Lógica para PIX (conversão USD -> BRL)
    let exchangeRate = 1;
    if (payment_method === "pix") {
      const frontendExchangeRate = metadata?.exchange_rate
        ? parseFloat(metadata.exchange_rate)
        : null;

      if (frontendExchangeRate && frontendExchangeRate > 0) {
        exchangeRate = frontendExchangeRate;
      } else {
        try {
          const response = await fetch(
            "https://api.exchangerate-api.com/v4/latest/USD",
          );
          if (response.ok) {
            const data = await response.json();
            const baseRate = parseFloat(data.rates.BRL);
            exchangeRate = baseRate * 1.04; // 4% de margem
          } else {
            exchangeRate = 5.6;
          }
        } catch (apiError) {
          console.error("[stripe-checkout-reinstatement-fee] ❌ Erro na API de câmbio:", apiError);
          exchangeRate = 5.6; 
        }
      }
    }

    // Metadata para rastreamento
    const sessionMetadata: any = {
      project: "matricula_usa",
      ...metadata,
      student_id: user.id,
      fee_type: fee_type,
      payment_method: payment_method || "stripe",
      ...(payment_method === "pix"
        ? { exchange_rate: exchangeRate.toString() }
        : {}),
    };

    // Configuração da sessão Stripe
    let sessionConfig: any = {
      payment_method_types: payment_method === "pix" ? ["pix"] : ["card"],
      client_reference_id: user.id,
      customer_email: user.email,
      mode,
      success_url: payment_method === "pix"
        ? `${success_url}&pix_payment=true`
        : success_url,
      cancel_url,
      metadata: sessionMetadata,
    };

    let grossAmountInCents: number;
    if (payment_method === "pix") {
      grossAmountInCents = calculatePIXAmountWithFees(
        amount,
        exchangeRate,
      );
    } else {
      grossAmountInCents = calculateCardAmountWithFees(amount);
    }

    sessionMetadata.base_amount = BASE_AMOUNT.toString();
    sessionMetadata.gross_amount = (grossAmountInCents / 100).toString();
    sessionMetadata.fee_amount = ((grossAmountInCents / 100) - amount).toString();
    sessionMetadata.markup_enabled = "true";

    sessionConfig.line_items = [
      {
        price_data: {
          currency: payment_method === "pix" ? "brl" : "usd",
          product_data: {
            name: "Reinstatement Fee",
            description: "Processing fee for F-1 Visa Reinstatement",
          },
          unit_amount: grossAmountInCents,
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Log da ação + notifier de checkout abandonado
    try {
      const { data: userProfile } = await supabase.from("user_profiles").select(
        "id, full_name, email, phone",
      ).eq("user_id", user.id).single();
      
      if (userProfile) {
        await supabase.rpc("log_student_action", {
          p_student_id: userProfile.id,
          p_action_type: "checkout_session_created",
          p_action_description:
            `Stripe checkout session created for Reinstatement Fee (${session.id})`,
          p_performed_by: user.id,
          p_performed_by_type: "student",
          p_metadata: {
            fee_type: fee_type,
            payment_method: "stripe",
            session_id: session.id,
            amount: amount,
          },
        });

        // === RECUPERAÇÃO DE CHECKOUT ABANDONADO ===
        notifyCheckoutInitiated({
          fee_type: fee_type,
          payment_method: "stripe",
          student_id: user.id,
          student_name: userProfile.full_name ?? null,
          student_email: userProfile.email ?? user.email ?? null,
          student_phone: userProfile.phone ?? null,
          checkout_url: session.url,
        }).catch((err) => console.warn("[stripe-checkout-reinstatement-fee] Notifier error (ignorado):", err));
        // ==========================================
      }
    } catch (logErr) {
      console.error("Failed to log checkout session creation:", logErr);
    }

    return corsResponse({ session_url: session.url }, 200);
  } catch (error: any) {
    console.error("Checkout error:", error);
    return corsResponse({ 
      error: "Internal server error",
      details: error.message,
    }, 500);
  }
});
