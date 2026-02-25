import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getParcelowConfig } from "../shared/parcelow/config.ts";
import { getRedirectOrigin } from "../shared/environment-detector.ts";
import { getParcelowAccessToken } from "../shared/parcelow/auth.ts";

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

Deno.serve(async (req) => {
  try {
    console.log("[parcelow-checkout-selection-process] 🚀 Iniciando função");

    if (req.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const config = getParcelowConfig(req);

    if (!config.clientId || !config.clientSecret) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ Credenciais Parcelow não configuradas",
      );
      return corsResponse({ error: "Parcelow configuration error" }, 500);
    }

    const { amount, metadata, promotional_coupon } = await req.json();

    console.log("[parcelow-checkout-selection-process] 📥 Payload recebido:", {
      amount,
      metadata,
      promotional_coupon,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ Header de autorização não encontrado",
      );
      return corsResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ Erro de autenticação:",
        authError,
      );
      return corsResponse({ error: "Invalid token" }, 401);
    }

    console.log(
      "[parcelow-checkout-selection-process] ✅ Usuário autenticado:",
      user.id,
    );

    // Verificar se há cupom promocional ANTES de buscar desconto ativo
    let promotionalCouponData: any = null;
    let finalAmount = amount;

    if (promotional_coupon && promotional_coupon.trim()) {
      try {
        const normalizedCoupon = promotional_coupon.trim().toUpperCase();
        console.log(
          "[parcelow-checkout-selection-process] 🎟️ Validando cupom promocional:",
          normalizedCoupon,
        );

        const { data: couponValidation, error: couponError } = await supabase
          .rpc("validate_promotional_coupon", {
            user_id_param: user.id,
            coupon_code_param: normalizedCoupon,
            fee_type_param: "selection_process",
            purchase_amount_param: amount || 0,
          });

        if (couponError) {
          console.error(
            "[parcelow-checkout-selection-process] ❌ Erro ao validar cupom promocional:",
            couponError,
          );
        } else if (couponValidation && couponValidation.success) {
          promotionalCouponData = couponValidation;
          finalAmount = couponValidation.final_amount;
          console.log(
            "[parcelow-checkout-selection-process] ✅ Cupom promocional válido! Novo valor:",
            finalAmount,
          );
        } else {
          console.log(
            "[parcelow-checkout-selection-process] ⚠️ Cupom promocional inválido",
          );
        }
      } catch (error) {
        console.error(
          "[parcelow-checkout-selection-process] ❌ Erro ao verificar cupom promocional:",
          error,
        );
      }
    }

    // Buscar perfil do usuário para obter CPF
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, cpf_document, phone")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ Erro ao buscar perfil:",
        profileError,
      );
      return corsResponse({ error: "User profile not found" }, 404);
    }

    if (!profile.cpf_document) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ CPF é obrigatório para pagamento via Parcelow",
      );
      return corsResponse({
        error: "document_number_required",
        message: "CPF is required for Parcelow payment",
      }, 400);
    }

    // Obter token de acesso
    const accessToken = await getParcelowAccessToken(config);

    // Gerar ID de referência único (MUITO curto para evitar truncamento pela Parcelow)
    // Usar uma string aleatória curta de 6 caracteres
    const reference = `sp_${Math.random().toString(36).substring(2, 8)}`; // sp = selection_process (total 9 chars)

    // URLs de redirect dinâmicas conforme ambiente (matriculausa.com, staging ou localhost)
    const origin = getRedirectOrigin(req);
    console.log(
      "[parcelow-checkout-selection-process] 🔗 Origin determinado:",
      origin,
    );

    // URLs de redirect após pagamento Parcelow
    // Apontar para o onboarding, igual ao comportamento do Stripe
    const redirectSuccess =
      `${origin}/student/onboarding?step=scholarship_selection&payment=success&ref=${
        encodeURIComponent(reference)
      }&pm=p`;
    const redirectFailed =
      `${origin}/student/onboarding?step=selection_fee&payment=cancelled&ref=${
        encodeURIComponent(reference)
      }&pm=p`;

    // URL do webhook
    const webhookUrl = `${
      Deno.env.get("SUPABASE_URL")
    }/functions/v1/parcelow-webhook`;

    // Preparar dados do pedido no formato esperado pela API Parcelow
    // IMPORTANTE: A API Parcelow espera o valor em CENTAVOS (USD cents)
    const amountInCents = Math.round(finalAmount * 100);

    const orderPayload = {
      reference: reference,
      items: [{
        reference: reference,
        description: "Payment for Selection Process Fee",
        quantity: 1,
        amount: amountInCents, // em centavos (USD cents)
      }],
      client: {
        name: profile.full_name,
        email: profile.email,
        cpf: profile.cpf_document.replace(/\D/g, ""), // apenas números
        phone: profile.phone || "",
      },
      redirect: {
        success: redirectSuccess,
        failed: redirectFailed,
      },
      notify_url: webhookUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: user.id,
        fee_type: "selection_process",
        reference: reference,
        timestamp: Date.now().toString(), // Salvar timestamp para buscar depois
        ...(metadata || {}),
        ...(promotionalCouponData
          ? {
            promotional_coupon: promotionalCouponData.coupon_code,
            original_amount: amount.toString(),
            discount_amount: promotionalCouponData.discount_amount.toString(),
            final_amount: finalAmount.toString(),
          }
          : {}),
      },
    };

    console.log(
      "[parcelow-checkout-selection-process] 🛒 Criando pedido na Parcelow...",
    );
    console.log("[parcelow-checkout-selection-process] 🔍 Config:", {
      apiBaseUrl: config.apiBaseUrl,
      environment: config.environment,
      hasToken: !!accessToken,
    });
    console.log(
      "[parcelow-checkout-selection-process] 🔍 Order Payload:",
      JSON.stringify(orderPayload, null, 2),
    );

    const orderUrl = `${config.apiBaseUrl}/api/orders`;
    console.log("[parcelow-checkout-selection-process] 🔍 Calling:", orderUrl);

    const orderResponse = await fetch(orderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    console.log(
      "[parcelow-checkout-selection-process] 📡 Response Status:",
      orderResponse.status,
    );
    console.log(
      "[parcelow-checkout-selection-process] 📡 Response Headers:",
      Object.fromEntries(orderResponse.headers.entries()),
    );

    // Obter o texto da resposta primeiro para debug
    const responseText = await orderResponse.text();
    console.log(
      "[parcelow-checkout-selection-process] 📡 Response Body (first 500 chars):",
      responseText.substring(0, 500),
    );

    if (!orderResponse.ok) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ Erro ao criar pedido na Parcelow:",
        responseText,
      );
      return corsResponse({
        error: "Failed to create Parcelow order",
        details: responseText,
      }, 500);
    }

    // Tentar fazer parse do JSON
    let parcelowOrder;
    try {
      parcelowOrder = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ Erro ao fazer parse do JSON da resposta:",
        parseError,
      );
      console.error(
        "[parcelow-checkout-selection-process] ❌ Response text:",
        responseText,
      );
      return corsResponse({
        error: "Invalid JSON response from Parcelow",
        details:
          "Received HTML instead of JSON. The API endpoint might be incorrect or the service is down.",
        responsePreview: responseText.substring(0, 200),
      }, 500);
    }
    console.log(
      "[parcelow-checkout-selection-process] ✅ Pedido criado na Parcelow",
    );
    console.log(
      "[parcelow-checkout-selection-process] 🔍 Parcelow Order Response:",
      JSON.stringify(parcelowOrder, null, 2),
    );

    // A resposta da Parcelow pode ter diferentes formatos, vamos extrair os dados corretamente
    const orderId = parcelowOrder.data?.order_id || parcelowOrder.order_id ||
      parcelowOrder.id;
    const checkoutUrl = parcelowOrder.data?.url_checkout ||
      parcelowOrder.checkout_url || parcelowOrder.url;

    if (!orderId || !checkoutUrl) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ Resposta da Parcelow não contém order_id ou checkout_url:",
        parcelowOrder,
      );
      return corsResponse({
        error: "Invalid Parcelow response",
        details: "Missing order_id or checkout_url in response",
        response: parcelowOrder,
      }, 500);
    }

    console.log("[parcelow-checkout-selection-process] ✅ Order ID:", orderId);
    console.log(
      "[parcelow-checkout-selection-process] ✅ Checkout URL:",
      checkoutUrl,
    );

    // Registrar no banco de dados (individual_fee_payments)
    const { data: insertResult, error: insertError } = await supabase.rpc(
      "insert_individual_fee_payment",
      {
        p_user_id: user.id,
        p_fee_type: "selection_process",
        p_amount: finalAmount,
        p_payment_date: new Date().toISOString(),
        p_payment_method: "parcelow",
        p_parcelow_order_id: String(orderId),
        p_parcelow_checkout_url: checkoutUrl,
        p_parcelow_reference: reference, // Salvar reference para buscar no webhook
      },
    );

    if (insertError) {
      console.error(
        "[parcelow-checkout-selection-process] ❌ Erro ao registrar pagamento:",
        insertError,
      );
    } else {
      console.log(
        "[parcelow-checkout-selection-process] ✅ Pagamento registrado com sucesso!",
      );
    }

    // Log action
    try {
      await supabase.rpc("log_student_action", {
        p_student_id: profile.id,
        p_action_type: "checkout_session_created",
        p_action_description:
          `Parcelow checkout session created for selection_process (${orderId})`,
        p_performed_by: user.id,
        p_performed_by_type: "student",
        p_metadata: {
          fee_type: "selection_process",
          payment_method: "parcelow",
          order_id: orderId,
          amount: finalAmount,
          ...(promotionalCouponData
            ? {
              promotional_coupon: promotionalCouponData.coupon_code,
              discount_applied: true,
            }
            : {}),
        },
      });
    } catch (logError) {
      console.error("Failed to log checkout creation:", logError);
    }

    return corsResponse({ checkout_url: checkoutUrl }, 200);
  } catch (error: any) {
    console.error(
      "[parcelow-checkout-selection-process] ❌ Erro geral na função:",
      error,
    );
    return corsResponse({
      error: "Internal server error",
      details: error.message,
    }, 500);
  }
});
