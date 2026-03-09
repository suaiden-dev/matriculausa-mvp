// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function detectEnvironment(req: Request) {
  const referer = req.headers.get("referer") || "";
  const origin = req.headers.get("origin") || "";
  const isProduction = referer.includes("matriculausa.com") || origin.includes("matriculausa.com");
  const isStaging = referer.includes("staging-matriculausa.netlify.app") || origin.includes("staging-matriculausa.netlify.app");
  return { isProduction, isStaging, isTest: !isProduction && !isStaging, environment: isProduction ? "production" : isStaging ? "staging" : "test" };
}

function getStripeKey(req: Request): string {
  const env = detectEnvironment(req);
  const suffix = env.isProduction ? "PROD" : env.isStaging ? "STAGING" : "TEST";
  return Deno.env.get(`STRIPE_SECRET_KEY_${suffix}`) || Deno.env.get("STRIPE_SECRET_KEY") || "";
}

function calculateCardAmountWithFees(netAmount: number): number {
  const STRIPE_PERCENTAGE = 0.039;
  const STRIPE_FIXED_FEE = 0.30;
  const grossAmount = (netAmount + STRIPE_FIXED_FEE) / (1 - STRIPE_PERCENTAGE);
  return Math.round(Math.round(grossAmount * 100) / 100 * 100);
}

function calculatePIXAmountWithFees(netAmountUSD: number, exchangeRate: number): number {
  const STRIPE_PIX_TOTAL_PERCENTAGE = 0.0119 + 0.006;
  const netAmountBRL = netAmountUSD * exchangeRate;
  const grossAmountBRL = netAmountBRL / (1 - STRIPE_PIX_TOTAL_PERCENTAGE);
  return Math.round(Math.round(grossAmountBRL * 100) / 100 * 100);
}

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req) => {
  try {
    console.log("[stripe-checkout-placement-fee] 🚀 Function invoked");

    if (req.method === "OPTIONS") return corsResponse(null, 204);

    const secretKey = getStripeKey(req);
    const env = detectEnvironment(req);
    const stripe = new Stripe(secretKey, { appInfo: { name: "MatriculaUSA Integration", version: "1.0.0" } });
    console.log(`🔧 Using Stripe in ${env.environment} mode`);

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return corsResponse({ error: "Invalid JSON in request body" }, 400);
    }

    const { price_id, success_url, cancel_url, mode, metadata, amount, payment_method } = requestBody;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsResponse({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return corsResponse({ error: "Invalid token" }, 401);

    console.log("[stripe-checkout-placement-fee] ✅ User authenticated:", user.id);

    const sessionMetadata: any = {
      project: "matricula_usa",
      ...metadata,
      student_id: user.id,
      fee_type: "placement_fee",
      payment_method: payment_method || "stripe",
    };

    // Lógica PIX
    let exchangeRate = 1;
    if (payment_method === "pix") {
      const frontendExchangeRate = metadata?.exchange_rate ? parseFloat(metadata.exchange_rate) : null;
      if (frontendExchangeRate && frontendExchangeRate > 0) {
        exchangeRate = frontendExchangeRate;
      } else {
        try {
          const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
          if (response.ok) {
            const data = await response.json();
            exchangeRate = parseFloat(data.rates.BRL) * 1.04;
          } else throw new Error("API falhou");
        } catch {
          exchangeRate = 5.6;
        }
      }
      console.log("[stripe-checkout-placement-fee] 💱 Exchange rate:", exchangeRate);
    }

    let sessionConfig: any = {
      payment_method_types: payment_method === "pix" ? ["pix"] : ["card"],
      client_reference_id: user.id,
      customer_email: user.email,
      mode: mode || "payment",
      success_url: payment_method === "pix" ? `${success_url}&pix_payment=true` : success_url,
      cancel_url: cancel_url,
      metadata: {
        ...sessionMetadata,
        ...(payment_method === "pix" ? { payment_method: "pix", exchange_rate: exchangeRate.toString() } : {}),
      },
    };

    const minAmount = 0.50;
    const explicitAmount = Number(metadata?.amount ?? amount);
    console.log("[stripe-checkout-placement-fee] 💰 Amount a cobrar:", explicitAmount);

    if (!Number.isNaN(explicitAmount) && explicitAmount > 0) {
      const finalAmount = explicitAmount < minAmount ? minAmount : explicitAmount;
      const grossAmountInCents = payment_method === "pix"
        ? calculatePIXAmountWithFees(finalAmount, exchangeRate)
        : calculateCardAmountWithFees(finalAmount);

      sessionConfig.metadata.base_amount = finalAmount.toString();
      sessionConfig.metadata.gross_amount = (grossAmountInCents / 100).toString();
      sessionConfig.metadata.fee_amount = ((grossAmountInCents / 100) - finalAmount).toString();
      sessionConfig.metadata.markup_enabled = "true";

      sessionConfig.line_items = [{
        price_data: {
          currency: payment_method === "pix" ? "brl" : "usd",
          product_data: {
            name: "Placement Fee",
            description: "Placement fee based on scholarship annual tuition value",
          },
          unit_amount: grossAmountInCents,
        },
        quantity: 1,
      }];

      console.log("[stripe-checkout-placement-fee] 💰 Valor base:", finalAmount);
      console.log("[stripe-checkout-placement-fee] 💰 Valor cobrado:", grossAmountInCents / 100);
    } else if (price_id) {
      sessionConfig.line_items = [{ price: price_id, quantity: 1 }];
    } else {
      return corsResponse({ error: "Amount or price_id is required" }, 400);
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log("[stripe-checkout-placement-fee] ✅ Sessão criada:", session.id);

    // Log da ação
    try {
      const { data: userProfile } = await supabase.from("user_profiles").select("id").eq("user_id", user.id).single();
      if (userProfile) {
        await supabase.rpc("log_student_action", {
          p_student_id: userProfile.id,
          p_action_type: "checkout_session_created",
          p_action_description: `Stripe checkout session created for Placement Fee (${session.id})`,
          p_performed_by: user.id,
          p_performed_by_type: "student",
          p_metadata: { fee_type: "placement_fee", payment_method: "stripe", session_id: session.id, amount: explicitAmount },
        });
      }
    } catch (logError) {
      console.error("[stripe-checkout-placement-fee] Failed to log:", logError);
    }

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error("[stripe-checkout-placement-fee] ❌ Checkout error:", error);
    return corsResponse({ error: "Internal server error", details: error.message, timestamp: new Date().toISOString() }, 500);
  }
});
