// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getParcelowConfig } from "../shared/parcelow/config.ts";
import { getRedirectOrigin } from "../shared/environment-detector.ts";
import { getParcelowAccessToken } from "../shared/parcelow/auth.ts";
import { notifyCheckoutInitiated } from "../utils/checkout-notifier.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function corsResponse(body: any, status = 200) {
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
    console.warn("[parcelow-checkout-package-fee] Could not fetch active installment plan:", error.message);
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
    console.log("[parcelow-checkout-package-fee] 🚀 Iniciando função");

    if (req.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const config = getParcelowConfig(req);

    if (!config.clientId || !config.clientSecret) {
      console.error(
        "[parcelow-checkout-package-fee] ❌ Credenciais Parcelow não configuradas",
      );
      return corsResponse({ error: "Parcelow configuration error" }, 500);
    }

    const { amount, fee_type, metadata, cpf: bodyCpf, promotional_coupon, payer_info } = await req.json();

    console.log("[parcelow-checkout-package-fee] 📥 Payload recebido:", {
      amount,
      fee_type,
      metadata,
      hasBodyCpf: !!bodyCpf,
      hasPromotionalCoupon: !!promotional_coupon,
    });
    
    const validFeeTypes = ['ds160_package', 'i539_cos_package', 'reinstatement_package'];
    if (!validFeeTypes.includes(fee_type)) {
       return corsResponse({ error: `fee_type inválido para esta função. Use um de: ${validFeeTypes.join(', ')}.` }, 400);
    }

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

    // Priorizar metadata.final_amount (valor com desconto de cupom calculado no frontend)
    // Isso evita o bug de duplo desconto onde o cupom seria aplicado duas vezes
    const hasFinalAmountFromMetadata = metadata?.final_amount && !isNaN(parseFloat(metadata.final_amount));
    const requestedAmount = hasFinalAmountFromMetadata
      ? parseFloat(metadata.final_amount)
      : (amount || 1800);
    const {
      finalAmount,
      plan: activeInstallmentPlan,
      installmentNumber,
      totalInstallments,
    } = await resolveCheckoutAmount(user.id, fee_type, requestedAmount);

    console.log("[parcelow-checkout-package-fee] 💰 Valor final:", {
      fromMetadata: hasFinalAmountFromMetadata,
      requestedAmount,
      finalAmount,
      activeInstallmentPlanId: activeInstallmentPlan?.id,
      installmentNumber,
      totalInstallments,
      originalAmount: amount,
    });

    // Buscar perfil do usuário para obter CPF
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, cpf_document, phone")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return corsResponse({ error: "User profile not found" }, 404);
    }

    // Definir CPF final (Body > Profile > PayerInfo)
    const rawCpf = bodyCpf || profile.cpf_document || payer_info?.cpf;
    const finalCpf = rawCpf ? String(rawCpf).replace(/\D/g, "") : null;

    console.log("[parcelow-checkout-package-fee] 📄 Verificação de documento:", {
      profileCpf: !!profile.cpf_document,
      bodyCpf: !!bodyCpf,
      payerInfoCpf: !!payer_info?.cpf,
      finalCpfLength: finalCpf?.length || 0,
    });

    if (!finalCpf || finalCpf.length < 11) {
      console.error(
        "[parcelow-checkout-package-fee] ❌ CPF não encontrado no perfil nem no body",
      );
      return corsResponse({
        error: "document_number_required",
        message: "CPF is required for Parcelow payment (neither found in profile nor request body)",
      }, 400);
    }

    // Obter token de acesso
    const accessToken = await getParcelowAccessToken(config);

    // Gerar ID de referência único
    const reference = `${fee_type === 'ds160_package' ? 'ds16' : 'i539'}_${Math.random().toString(36).substring(2, 8)}`; 

    // URLs de redirect
    const origin = getRedirectOrigin(req);
    const redirectSuccess =
      `${origin}/student/onboarding?step=my_applications&payment=success&ref=${
        encodeURIComponent(reference)
      }&pm=p&fee_type=${fee_type}`;
    const redirectFailed =
      `${origin}/student/onboarding?step=my_applications&payment=cancelled&ref=${
        encodeURIComponent(reference)
      }&pm=p`;

    const webhookUrl = `${
      Deno.env.get("SUPABASE_URL")
    }/functions/v1/parcelow-webhook`;

    const amountInCents = Math.round(finalAmount * 100);

    const orderPayload = {
      reference: reference,
      items: [{
        reference: reference,
        description: fee_type === 'ds160_package' ? "Payment for DS160 Package" : fee_type === 'reinstatement_package' ? "Payment for Visa Reinstatement Package" : "Payment for I539 COS Package",
        quantity: 1,
        amount: amountInCents,
      }],
      client: {
        name: payer_info?.name || profile.full_name,
        email: (() => {
          const email = payer_info?.email || profile.email;
          const isSandbox = config.apiBaseUrl.includes("sandbox");
          if (isSandbox && email) {
            const [userPart, domainPart] = email.split("@");
            const dirtyEmail = `${userPart}+${Date.now()}@${domainPart}`;
            console.log(`[parcelow-checkout-package-fee] 🧪 Sandbox detected. Using dirty email bypass: ${dirtyEmail}`);
            return dirtyEmail;
          }
          return email;
        })(),
        cpf: (payer_info?.cpf || finalCpf || "").replace(/\D/g, ""),
        phone: (payer_info?.phone || profile.phone || "").replace(/\D/g, ""),
        // Campos de endereço para Cartão de Terceiro
        is_diferent_card_address: payer_info ? 1 : 0,
        address_street: payer_info?.address_street || "",
        address_number: parseInt(payer_info?.address_number || "0") || 0,
        address_neighborhood: payer_info?.address_neighborhood || "",
        address_city: payer_info?.address_city || "",
        address_state: (payer_info?.address_state || "").substring(0, 2).toUpperCase(),
        cep: (payer_info?.postal_code || "").replace(/\D/g, ""),
        address_complement: payer_info?.address_complement || "",
        // Mapeamento explícito para campos card_address_* caso a API exija (redundância de segurança)
        card_address_cep: (payer_info?.postal_code || "").replace(/\D/g, ""),
        card_address_street: payer_info?.address_street || "",
        card_address_number: parseInt(payer_info?.address_number || "0") || 0,
        card_address_neighborhood: payer_info?.address_neighborhood || "",
        card_address_city: payer_info?.address_city || "",
        card_address_state: (payer_info?.address_state || "").substring(0, 2).toUpperCase(),
        card_address_complement: payer_info?.address_complement || "",
      },
      redirect: {
        success: redirectSuccess,
        failed: redirectFailed,
      },
      notify_url: webhookUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: user.id,
        fee_type: fee_type,
        timestamp: Date.now().toString(),
        ...(metadata || {}),
        final_amount: finalAmount.toString(),
        ...(activeInstallmentPlan && {
          is_installment: "true",
          installment_plan_id: activeInstallmentPlan.id,
          installment_number: String(installmentNumber),
          total_installments: String(totalInstallments),
        }),
      },
    };

    const orderResponse = await fetch(`${config.apiBaseUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      return corsResponse({
        error: "Failed to create Parcelow order",
        details: errorText,
      }, 500);
    }

    const parcelowOrder = await orderResponse.json();

    if (parcelowOrder.success === false) {
      console.error(
        "[parcelow-checkout-package-fee] ❌ Parcelow retornou erro de negócio:",
        parcelowOrder.message,
      );
      return corsResponse({
        error: "parcelow_api_error",
        message: parcelowOrder.message || "Erro desconhecido na API da Parcelow",
        response: parcelowOrder,
      }, 400);
    }

    const orderId = parcelowOrder.data?.order_id || parcelowOrder.order_id || parcelowOrder.id;
    const checkoutUrl = parcelowOrder.data?.url_checkout || parcelowOrder.checkout_url || parcelowOrder.url;

    // Registrar no banco de dados
    console.log("[parcelow-checkout-package-fee] 📝 Registrando no banco...");
    const { error: insertError } = await supabase.rpc(
      "insert_individual_fee_payment",
      {
        p_user_id: user.id,
        p_fee_type: fee_type,
        p_amount: finalAmount,
        p_payment_date: new Date().toISOString(),
        p_payment_method: "parcelow",
        p_parcelow_order_id: String(orderId),
        p_parcelow_checkout_url: checkoutUrl,
        p_parcelow_reference: reference,
        p_gross_amount_usd: finalAmount,
        p_fee_amount_usd: null,
      },
    );
    
    if (insertError) {
      console.error("[parcelow-checkout-package-fee] ❌ Erro no insert_individual_fee_payment:", insertError);
    } else {
      console.log("[parcelow-checkout-package-fee] ✅ Registro concluído");
    }

    // Log action
    try {
      await supabase.rpc("log_student_action", {
        p_student_id: profile.id,
        p_action_type: "checkout_session_created",
        p_action_description:
          `Parcelow checkout session created for ${fee_type} (${orderId})`,
        p_performed_by: user.id,
        p_performed_by_type: "student",
        p_metadata: {
          fee_type: fee_type,
          payment_method: "parcelow",
          order_id: orderId,
          amount: finalAmount,
        },
      });
    } catch (logError) {
      console.error("Failed to log checkout creation:", logError);
    }

    // === RECUPERAÇÃO DE CHECKOUT ABANDONADO ===
    notifyCheckoutInitiated({
      fee_type: fee_type,
      payment_method: "parcelow",
      student_id: user.id,
      student_name: profile.full_name ?? null,
      student_email: profile.email ?? null,
      student_phone: profile.phone ?? null,
      checkout_url: checkoutUrl,
    }).catch((err) => console.warn("[parcelow-checkout-package-fee] Notifier error (ignorado):", err));
    // ==========================================

    console.log("[parcelow-checkout-package-fee] ✅ Sucesso! Retornando checkoutUrl");
    return corsResponse({ checkout_url: checkoutUrl }, 200);
  } catch (error: any) {
    console.error("[parcelow-checkout-package-fee] ❌ Erro geral:", error);
    return corsResponse({
      error: "Internal server error",
      details: error.message,
      stack: error.stack
    }, 500);
  }
});
