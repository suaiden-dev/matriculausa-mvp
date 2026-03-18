// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getStripeConfig } from "../stripe-config.ts";
import {
  calculateCardAmountWithFees,
  calculatePIXAmountWithFees,
} from "../utils/stripe-fee-calculator.ts";

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

    console.log(`🔧 Using Stripe in ${config.environment.environment} mode`);

    const {
      success_url,
      cancel_url,
      fee_type,
      amount,
      metadata,
      payment_method,
    } = await req.json();
    
    // fee_type must be either 'ds160_package' or 'i539_cos_package'
    if (fee_type !== 'ds160_package' && fee_type !== 'i539_cos_package') {
      return corsResponse({ error: "fee_type inválido para esta função. Use ds160_package ou i539_cos_package." }, 400);
    }

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

    // Determinar valor original
    // O valor para esses pacotes é de $1800 conforme definido no frontend
    const originalAmount = amount || 1800;
    console.log(
      `[stripe-checkout-package-fee] 💰 Valor original (${fee_type}):`,
      originalAmount,
    );

    // Lógica para PIX (conversão USD -> BRL)
    let exchangeRate = 1;
    if (payment_method === "pix") {
      // Priorizar taxa de câmbio enviada pelo frontend (se disponível) para garantir consistência
      const frontendExchangeRate = metadata?.exchange_rate
        ? parseFloat(metadata.exchange_rate)
        : null;

      if (frontendExchangeRate && frontendExchangeRate > 0) {
        exchangeRate = frontendExchangeRate;
        console.log(
          "[stripe-checkout-package-fee] 💱 Usando taxa de câmbio do frontend:",
          exchangeRate,
        );
      } else {
        try {
          console.log(
            "[stripe-checkout-package-fee] 💱 Obtendo taxa de câmbio com margem comercial...",
          );
          const response = await fetch(
            "https://api.exchangerate-api.com/v4/latest/USD",
          );
          if (response.ok) {
            const data = await response.json();
            const baseRate = parseFloat(data.rates.BRL);
            exchangeRate = baseRate * 1.04; // 4% de margem
          } else {
            exchangeRate = 5.6; // Taxa de fallback
          }
        } catch (apiError) {
          console.error("[stripe-checkout-package-fee] ❌ Erro na API de câmbio:", apiError);
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

    // Garantir valor mínimo
    const minAmount = 0.50;
    let finalAmount = originalAmount;
    if (finalAmount < minAmount) {
      finalAmount = minAmount;
    }

    // Sempre aplicar markup de taxas do Stripe
    let grossAmountInCents: number;
    if (payment_method === "pix") {
      grossAmountInCents = calculatePIXAmountWithFees(
        finalAmount,
        exchangeRate,
      );
    } else {
      grossAmountInCents = calculateCardAmountWithFees(finalAmount);
    }

    // Adicionar valores base e gross ao metadata
    sessionMetadata.base_amount = finalAmount.toString();
    sessionMetadata.gross_amount = (grossAmountInCents / 100).toString();
    sessionMetadata.fee_amount = ((grossAmountInCents / 100) - finalAmount).toString();
    sessionMetadata.markup_enabled = "true";

    sessionConfig.line_items = [
      {
        price_data: {
          currency: payment_method === "pix" ? "brl" : "usd",
          product_data: {
            name: fee_type === 'ds160_package' ? "DS160 Package" : "I539 COS Package",
            description: fee_type === 'ds160_package' ? "Application and handling for DS160 form" : "Handling and guidance for I539 Change of Status form",
          },
          unit_amount: grossAmountInCents,
        },
        unit_amount: grossAmountInCents,
      },
    ];

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Log the checkout session creation
    try {
      const { data: userProfile } = await supabase.from("user_profiles").select(
        "id, full_name",
      ).eq("user_id", user.id).single();
      
      if (userProfile) {
        const { error: logError } = await supabase.rpc("log_student_action", {
          p_student_id: userProfile.id,
          p_action_type: "checkout_session_created",
          p_action_description:
            `Stripe checkout session created for ${fee_type} (${session.id})`,
          p_performed_by: user.id,
          p_performed_by_type: "student",
          p_metadata: {
            fee_type: fee_type,
            payment_method: "stripe",
            session_id: session.id,
            amount: finalAmount || null,
          },
        });
        
        if (logError) {
          console.error("Failed to log checkout session creation (RPC):", logError);
        }
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
      stack: error.stack
    }, 500);
  }
});
