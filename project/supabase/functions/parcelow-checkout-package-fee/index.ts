// @ts-nocheck
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

    const { amount, fee_type, metadata } = await req.json();

    console.log("[parcelow-checkout-package-fee] 📥 Payload recebido:", {
      amount,
      fee_type,
      metadata,
    });
    
    if (fee_type !== 'ds160_package' && fee_type !== 'i539_cos_package') {
       return corsResponse({ error: "fee_type inválido" }, 400);
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

    // Valor original fixo ($1800)
    const finalAmount = amount || 1800;

    // Buscar perfil do usuário para obter CPF
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, cpf_document, phone")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return corsResponse({ error: "User profile not found" }, 404);
    }

    if (!profile.cpf_document) {
      return corsResponse({
        error: "document_number_required",
        message: "CPF is required for Parcelow payment",
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
        description: fee_type === 'ds160_package' ? "Payment for DS160 Package" : "Payment for I539 COS Package",
        quantity: 1,
        amount: amountInCents,
      }],
      client: {
        name: profile.full_name,
        email: profile.email,
        cpf: profile.cpf_document.replace(/\D/g, ""),
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
        fee_type: fee_type,
        timestamp: Date.now().toString(),
        ...(metadata || {}),
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

    if (parcelowOrder.success === false && parcelowOrder.message) {
      return corsResponse({
        error: "parcelow_order_rejected",
        message: String(parcelowOrder.message),
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
