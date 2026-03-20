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
    console.log("[parcelow-checkout-placement-fee] 🚀 Iniciando função");

    if (req.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const config = getParcelowConfig(req);

    if (!config.clientId || !config.clientSecret) {
      console.error(
        "[parcelow-checkout-placement-fee] ❌ Credenciais Parcelow não configuradas",
      );
      return corsResponse({ error: "Parcelow configuration error" }, 500);
    }

    const { amount, metadata, promotional_coupon, cpf: bodyCpf } = await req.json();

    console.log("[parcelow-checkout-placement-fee] 📥 Payload recebido:", {
      amount,
      metadata,
      promotional_coupon,
      hasBodyCpf: !!bodyCpf,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(
        "[parcelow-checkout-placement-fee] ❌ Header de autorização não encontrado",
      );
      return corsResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(
        "[parcelow-checkout-placement-fee] ❌ Erro de autenticação:",
        authError,
      );
      return corsResponse({ error: "Invalid token" }, 401);
    }

    console.log("[parcelow-checkout-placement-fee] ✅ Usuário autenticado:", user.id);

    // Determinar valor original para validação do cupom
    const originalAmountForCouponValidation = metadata?.amount
      ? parseFloat(metadata.amount.toString())
      : parseFloat(amount.toString());

    console.log(
      "[parcelow-checkout-placement-fee] 💰 Valor original para validação do cupom:",
      originalAmountForCouponValidation,
    );

    // Verificar se há cupom promocional
    let promotionalCouponData: any = null;
    let finalAmount = amount;

    if (promotional_coupon && promotional_coupon.trim()) {
      try {
        const normalizedCoupon = promotional_coupon.trim().toUpperCase();
        console.log(
          "[parcelow-checkout-placement-fee] 🎟️ Validando cupom promocional:",
          normalizedCoupon,
        );

        const { data: couponValidation, error: couponError } = await supabase
          .rpc("validate_promotional_coupon", {
            user_id_param: user.id,
            coupon_code_param: normalizedCoupon,
            fee_type_param: "placement_fee",
            purchase_amount_param: originalAmountForCouponValidation,
          });

        if (couponError) {
          console.error(
            "[parcelow-checkout-placement-fee] ❌ Erro ao validar cupom promocional:",
            couponError,
          );
        } else if (couponValidation && couponValidation.success) {
          promotionalCouponData = couponValidation;
          finalAmount = couponValidation.final_amount;
          console.log(
            "[parcelow-checkout-placement-fee] ✅ Cupom promocional válido! Novo valor:",
            finalAmount,
          );
        }
      } catch (error) {
        console.error(
          "[parcelow-checkout-placement-fee] ❌ Erro ao verificar cupom promocional:",
          error,
        );
      }
    }

    // Se não veio amount, não podemos prosseguir para Placement Fee
    if (!finalAmount || finalAmount <= 0) {
        console.error("[parcelow-checkout-placement-fee] ❌ Valor inválido para placement fee");
        return corsResponse({ error: "amount is required for placement fee" }, 400);
    }

    // Garantir valor mínimo
    const minAmount = 0.50;
    if (finalAmount < minAmount) {
      finalAmount = minAmount;
    }

    // Buscar perfil do usuário para obter CPF
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, cpf_document, phone")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[parcelow-checkout-placement-fee] ❌ Erro ao buscar perfil:",
        profileError,
      );
      return corsResponse({ error: "User profile not found" }, 404);
    }

    // Definir CPF final (Body > Profile)
    const rawCpf = bodyCpf || profile.cpf_document;
    const finalCpf = rawCpf ? String(rawCpf).replace(/\D/g, "") : null;

    console.log("[parcelow-checkout-placement-fee] 📄 Verificação de documento:", {
      profileCpf: !!profile.cpf_document,
      bodyCpf: !!bodyCpf,
      finalCpfLength: finalCpf?.length || 0,
    });

    if (!finalCpf || finalCpf.length < 11) {
      console.error(
        "[parcelow-checkout-placement-fee] ❌ CPF não encontrado no perfil nem no body",
      );
      return corsResponse({
        error: "document_number_required",
        message: "CPF is required for Parcelow payment (neither found in profile nor request body)",
      }, 400);
    }

    // Obter token de acesso
    const accessToken = await getParcelowAccessToken(config);

    // Gerar ID de referência único
    const reference = `pf_${Math.random().toString(36).substring(2, 8)}`;

    const origin = getRedirectOrigin(req);
    console.log("[parcelow-checkout-placement-fee] 🔗 Origin determinado:", origin);

    // URLs de redirect após pagamento Parcelow
    const redirectSuccess = `${origin}/student/onboarding?step=my_applications&payment=success&ref=${encodeURIComponent(reference)}&pm=p`;
    const redirectFailed = `${origin}/student/onboarding?step=placement_fee&payment=cancelled&ref=${encodeURIComponent(reference)}&pm=p`;

    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/parcelow-webhook`;

    const amountInCents = Math.round(finalAmount * 100);

    const orderPayload = {
      reference: reference,
      items: [{
        reference: reference,
        description: "Payment for Placement Fee",
        quantity: 1,
        amount: amountInCents,
      }],
      client: {
        name: profile.full_name,
        email: profile.email,
        cpf: finalCpf,
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
        fee_type: "placement_fee",
        timestamp: Date.now().toString(),
        ...(metadata || {}),
        ...(promotionalCouponData
          ? {
            promotional_coupon: promotionalCouponData.coupon_code,
            original_amount: originalAmountForCouponValidation.toString(),
            discount_amount: promotionalCouponData.discount_amount.toString(),
            final_amount: finalAmount.toString(),
          }
          : {}),
      },
    };

    console.log("[parcelow-checkout-placement-fee] 🛒 Criando pedido na Parcelow...");

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
      const error = await orderResponse.text();
      console.error("[parcelow-checkout-placement-fee] ❌ Erro ao criar pedido na Parcelow:", error);
      return corsResponse({ error: "Failed to create Parcelow order", details: error }, 500);
    }

    const parcelowOrder = await orderResponse.json();
    console.log("[parcelow-checkout-placement-fee] ✅ Pedido criado na Parcelow");

    const orderId = parcelowOrder.data?.order_id || parcelowOrder.order_id || parcelowOrder.id;
    const checkoutUrl = parcelowOrder.data?.url_checkout || parcelowOrder.checkout_url || parcelowOrder.url;

    if (!orderId || !checkoutUrl) {
      console.error("[parcelow-checkout-placement-fee] ❌ Resposta da Parcelow não contém order_id ou checkout_url");
      return corsResponse({ error: "Invalid Parcelow response" }, 500);
    }

    // Registrar no banco de dados
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

    if (insertError) {
      console.error("[parcelow-checkout-placement-fee] ❌ Erro ao registrar pagamento:", insertError);
    }

    // Log action
    try {
      await supabase.rpc("log_student_action", {
        p_student_id: profile.id,
        p_action_type: "checkout_session_created",
        p_action_description: `Parcelow checkout session created for placement_fee (${orderId})`,
        p_performed_by: user.id,
        p_performed_by_type: "student",
        p_metadata: {
          fee_type: "placement_fee",
          payment_method: "parcelow",
          order_id: orderId,
          amount: finalAmount,
        },
      });
    } catch (logError) {
      console.error("Failed to log checkout creation:", logError);
    }

    return corsResponse({ checkout_url: checkoutUrl }, 200);
  } catch (error: any) {
    console.error("[parcelow-checkout-placement-fee] ❌ Erro geral:", error);
    return corsResponse({ error: "Internal server error", details: error.message }, 500);
  }
});
