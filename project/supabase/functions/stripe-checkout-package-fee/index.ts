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

function computeInstallmentAmounts(total: number, n: number): number[] {
  const base = Math.floor((total / n) * 100) / 100;
  const amounts = Array(n).fill(base);
  amounts[n - 1] = Math.round((total - base * (n - 1)) * 100) / 100;
  return amounts;
}

async function resolveCheckoutAmount(userId: string, feeType: string, requestedAmount: number) {
  if (feeType !== "ds160_package" && feeType !== "i539_cos_package") {
    return { finalAmount: requestedAmount, plan: null, installmentNumber: null, totalInstallments: null };
  }

  const { data: plan, error } = await supabase
    .from("fee_installment_plans")
    .select("id, total_amount, total_installments, installments_paid, amount_paid, status")
    .eq("user_id", userId)
    .eq("fee_type", feeType)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.warn("[stripe-checkout-package-fee] Could not fetch active installment plan:", error.message);
  }

  if (!plan || Number(plan.installments_paid) >= Number(plan.total_installments)) {
    return { finalAmount: requestedAmount, plan: null, installmentNumber: null, totalInstallments: null };
  }

  const installmentNumber = Number(plan.installments_paid) + 1;
  const totalInstallments = Number(plan.total_installments);
  const finalAmount = computeInstallmentAmounts(Number(plan.total_amount), totalInstallments)[installmentNumber - 1];

  return { finalAmount, plan, installmentNumber, totalInstallments };
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
    
    // fee_type must be either 'ds160_package', 'i539_cos_package' or 'reinstatement_package'
    const validFeeTypes = ['ds160_package', 'i539_cos_package', 'reinstatement_package'];
    if (!validFeeTypes.includes(fee_type)) {
      return corsResponse({ error: `fee_type inválido para esta função. Use um de: ${validFeeTypes.join(', ')}.` }, 400);
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
        } catch (apiError: unknown) {
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

    // Garantir valor mínimo e considerar cupom promocional via metadata.final_amount
    const minAmount = 0.50;
    
    // Priorizar metadata.final_amount (valor com desconto de cupom calculado no frontend)
    // Isso evita o bug de duplo desconto onde o cupom seria aplicado duas vezes
    const hasFinalAmountFromMetadata = metadata?.final_amount && !isNaN(parseFloat(metadata.final_amount));
    const requestedAmount = hasFinalAmountFromMetadata
      ? parseFloat(metadata.final_amount)
      : originalAmount;
    const {
      finalAmount: resolvedFinalAmount,
      plan: activeInstallmentPlan,
      installmentNumber,
      totalInstallments,
    } = await resolveCheckoutAmount(user.id, fee_type, requestedAmount);
    let finalAmount = resolvedFinalAmount;

    console.log("[stripe-checkout-package-fee] 💰 Valor base para cálculo:", {
      fromMetadata: hasFinalAmountFromMetadata,
      requestedAmount,
      finalAmount,
      activeInstallmentPlanId: activeInstallmentPlan?.id,
      installmentNumber,
      totalInstallments,
      originalAmount,
    });

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
    sessionMetadata.final_amount = finalAmount.toString();
    sessionMetadata.base_amount = finalAmount.toString();
    sessionMetadata.gross_amount = (grossAmountInCents / 100).toString();
    sessionMetadata.fee_amount = ((grossAmountInCents / 100) - finalAmount).toString();
    sessionMetadata.markup_enabled = "true";
    if (activeInstallmentPlan) {
      sessionMetadata.is_installment = "true";
      sessionMetadata.installment_plan_id = activeInstallmentPlan.id;
      sessionMetadata.installment_number = String(installmentNumber);
      sessionMetadata.total_installments = String(totalInstallments);
    }

    sessionConfig.line_items = [
      {
        price_data: {
          currency: payment_method === "pix" ? "brl" : "usd",
          product_data: {
            name: fee_type === 'ds160_package' ? "DS160 Package" : fee_type === 'reinstatement_package' ? "Visa Reinstatement Package" : "I539 COS Package",
            description: fee_type === 'ds160_package' ? "Application and handling for DS160 form" : fee_type === 'reinstatement_package' ? "Special handling for Visa Reinstatement process" : "Handling and guidance for I539 Change of Status form",
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

        // === RECUPERAÇÃO DE CHECKOUT ABANDONADO ===
        notifyCheckoutInitiated({
          fee_type: fee_type,
          payment_method: "stripe",
          student_id: user.id,
          student_name: userProfile.full_name ?? null,
          student_email: userProfile.email ?? user.email ?? null,
          student_phone: userProfile.phone ?? null,
          checkout_url: session.url,
        }).catch((err: unknown) => console.warn("[stripe-checkout-package-fee] Notifier error (ignorado):", err));
        // ==========================================
      }
    } catch (logErr: unknown) {
      console.error("Failed to log checkout session creation:", logErr);
    }

    return corsResponse({ session_url: session.url }, 200);
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    return corsResponse({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});
