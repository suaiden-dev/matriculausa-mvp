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
    console.log("[parcelow-checkout-scholarship-fee] 🚀 Iniciando função");

    if (req.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const config = getParcelowConfig(req);

    if (!config.clientId || !config.clientSecret) {
      console.error(
        "[parcelow-checkout-scholarship-fee] ❌ Credenciais Parcelow não configuradas",
      );
      return corsResponse({ error: "Parcelow configuration error" }, 500);
    }

    const { amount, metadata, scholarships_ids, promotional_coupon, cpf: bodyCpf } = await req
      .json();

    console.log("[parcelow-checkout-scholarship-fee] 📥 Payload recebido:", {
      amount,
      metadata,
      scholarships_ids,
      promotional_coupon,
      hasBodyCpf: !!bodyCpf,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(
        "[parcelow-checkout-scholarship-fee] ❌ Header de autorização não encontrado",
      );
      return corsResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      console.error(
        "[parcelow-checkout-scholarship-fee] ❌ Erro de autenticação:",
        authError,
      );
      return corsResponse({ error: "Invalid token" }, 401);
    }

    console.log(
      "[parcelow-checkout-scholarship-fee] ✅ Usuário autenticado:",
      user.id,
    );

    // Buscar taxas do pacote do usuário PRIMEIRO
    type UserPackageFees = {
      package_name: string;
      selection_process_fee: number;
      scholarship_fee: number;
      i20_control_fee: number;
    };
    let userPackageFees: UserPackageFees | null = null;
    try {
      const { data: packageData, error: packageError } = await supabase
        .rpc("get_user_package_fees", {
          user_id_param: user.id,
        });

      if (!packageError && packageData && packageData.length > 0) {
        userPackageFees = packageData[0];
        console.log(
          "[parcelow-checkout-scholarship-fee] ✅ Taxas do pacote encontradas:",
          userPackageFees,
        );
      }
    } catch (err) {
      console.error(
        "[parcelow-checkout-scholarship-fee] ❌ Erro ao buscar taxas do pacote:",
        err,
      );
    }

    // Determinar valor original para validação do cupom
    const originalAmountForCouponValidation = metadata?.original_amount
      ? parseFloat(metadata.original_amount.toString())
      : (userPackageFees?.scholarship_fee === 400
        ? 900
        : (userPackageFees?.scholarship_fee || 900));

    console.log(
      "[parcelow-checkout-scholarship-fee] 💰 Valor original para validação do cupom:",
      originalAmountForCouponValidation,
    );

    // Verificar se há cupom promocional
    let promotionalCouponData: any = null;
    let finalAmount = amount;

    if (promotional_coupon && promotional_coupon.trim()) {
      try {
        const normalizedCoupon = promotional_coupon.trim().toUpperCase();
        console.log(
          "[parcelow-checkout-scholarship-fee] 🎟️ Validando cupom promocional:",
          normalizedCoupon,
        );

        const { data: couponValidation, error: couponError } = await supabase
          .rpc("validate_promotional_coupon", {
            user_id_param: user.id,
            coupon_code_param: normalizedCoupon,
            fee_type_param: "scholarship_fee",
            purchase_amount_param: originalAmountForCouponValidation,
          });

        if (couponError) {
          console.error(
            "[parcelow-checkout-scholarship-fee] ❌ Erro ao validar cupom promocional:",
            couponError,
          );
        } else if (couponValidation && couponValidation.success) {
          promotionalCouponData = couponValidation;
          finalAmount = couponValidation.final_amount;
          console.log(
            "[parcelow-checkout-scholarship-fee] ✅ Cupom promocional válido! Novo valor:",
            finalAmount,
          );
        }
      } catch (error) {
        console.error(
          "[parcelow-checkout-scholarship-fee] ❌ Erro ao verificar cupom promocional:",
          error,
        );
      }
    }

    // Se não veio amount, usar valor do pacote ou padrão
    if (!finalAmount || finalAmount <= 0) {
      if (userPackageFees?.scholarship_fee) {
        finalAmount = userPackageFees.scholarship_fee === 400
          ? 900
          : userPackageFees.scholarship_fee;
      } else {
        finalAmount = 900; // Valor padrão
      }
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
        "[parcelow-checkout-scholarship-fee] ❌ Erro ao buscar perfil:",
        profileError,
      );
      return corsResponse({ error: "User profile not found" }, 404);
    }

    // Definir CPF final (Body > Profile)
    const rawCpf = bodyCpf || profile.cpf_document;
    const finalCpf = rawCpf ? String(rawCpf).replace(/\D/g, "") : null;

    console.log("[parcelow-checkout-scholarship-fee] 📄 Verificação de documento:", {
      profileCpf: !!profile.cpf_document,
      bodyCpf: !!bodyCpf,
      finalCpfLength: finalCpf?.length || 0,
    });

    if (!finalCpf || finalCpf.length < 11) {
      console.error(
        "[parcelow-checkout-scholarship-fee] ❌ CPF não encontrado no perfil nem no body",
      );
      return corsResponse({
        error: "document_number_required",
        message: "CPF is required for Parcelow payment (neither found in profile nor request body)",
      }, 400);
    }

    // Obter token de acesso
    const accessToken = await getParcelowAccessToken(config);

    // Normalizar scholarships_ids para string (comma-separated)
    const normalizedScholarshipsIds = Array.isArray(scholarships_ids)
      ? scholarships_ids.join(",")
      : (scholarships_ids || undefined);

    // Gerar ID de referência único (MUITO curto para evitar truncamento pela Parcelow)
    // Usar uma string aleatória curta de 6 caracteres
    const reference = `sf_${Math.random().toString(36).substring(2, 8)}`; // sf = scholarship_fee (total 9 chars)

    // URLs de redirect dinâmicas conforme ambiente (matriculausa.com, staging ou localhost)
    const origin = getRedirectOrigin(req);
    console.log(
      "[parcelow-checkout-scholarship-fee] 🔗 Origin determinado:",
      origin,
    );

    // URLs de redirect após pagamento Parcelow
    // Apontar para o onboarding, próximo passo após a taxa de bolsa
    const redirectSuccess =
      `${origin}/student/onboarding?step=my_applications&payment=success&ref=${
        encodeURIComponent(reference)
      }&pm=p`;
    const redirectFailed =
      `${origin}/student/onboarding?step=scholarship_fee&payment=cancelled&ref=${
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
        description: "Payment for Scholarship Fee",
        quantity: 1,
        amount: amountInCents, // em centavos (USD cents)
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
        fee_type: "scholarship_fee",
        timestamp: Date.now().toString(),
        ...(normalizedScholarshipsIds
          ? { scholarships_ids: normalizedScholarshipsIds }
          : {}),
        ...(userPackageFees
          ? {
            user_has_package: "true",
            package_name: userPackageFees.package_name,
          }
          : { user_has_package: "false" }),
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

    console.log(
      "[parcelow-checkout-scholarship-fee] 🛒 Criando pedido na Parcelow...",
    );
    console.log(
      "[parcelow-checkout-scholarship-fee] 🔍 Order Payload:",
      JSON.stringify(orderPayload, null, 2),
    );

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
      console.error(
        "[parcelow-checkout-scholarship-fee] ❌ Erro ao criar pedido na Parcelow:",
        error,
      );
      return corsResponse({
        error: "Failed to create Parcelow order",
        details: error,
      }, 500);
    }

    const parcelowOrder = await orderResponse.json();
    console.log(
      "[parcelow-checkout-scholarship-fee] ✅ Pedido criado na Parcelow",
    );
    console.log(
      "[parcelow-checkout-scholarship-fee] 🔍 Parcelow Order Response:",
      JSON.stringify(parcelowOrder, null, 2),
    );

    // A resposta da Parcelow pode ter diferentes formatos, vamos extrair os dados corretamente
    const orderId = parcelowOrder.data?.order_id || parcelowOrder.order_id ||
      parcelowOrder.id;
    const checkoutUrl = parcelowOrder.data?.url_checkout ||
      parcelowOrder.checkout_url || parcelowOrder.url;

    if (!orderId || !checkoutUrl) {
      console.error(
        "[parcelow-checkout-scholarship-fee] ❌ Resposta da Parcelow não contém order_id ou checkout_url:",
        parcelowOrder,
      );
      return corsResponse({
        error: "Invalid Parcelow response",
        details: "Missing order_id or checkout_url in response",
        response: parcelowOrder,
      }, 500);
    }

    console.log("[parcelow-checkout-scholarship-fee] ✅ Order ID:", orderId);
    console.log(
      "[parcelow-checkout-scholarship-fee] ✅ Checkout URL:",
      checkoutUrl,
    );

    // Registrar no banco de dados
    const { error: insertError } = await supabase.rpc(
      "insert_individual_fee_payment",
      {
        p_user_id: user.id,
        p_fee_type: "scholarship_fee",
        p_amount: finalAmount,
        p_payment_date: new Date().toISOString(),
        p_payment_method: "parcelow",
        p_parcelow_order_id: String(orderId),
        p_parcelow_checkout_url: checkoutUrl,
        p_parcelow_reference: reference, // Salvar reference para buscar no webhook
        p_gross_amount_usd: finalAmount,
        p_fee_amount_usd: null,
      },
    );

    if (insertError) {
      console.error(
        "[parcelow-checkout-scholarship-fee] ❌ Erro ao registrar pagamento:",
        insertError,
      );
    } else {
      console.log(
        "[parcelow-checkout-scholarship-fee] ✅ Pagamento registrado com sucesso!",
      );
    }

    // Log action
    try {
      await supabase.rpc("log_student_action", {
        p_student_id: profile.id,
        p_action_type: "checkout_session_created",
        p_action_description:
          `Parcelow checkout session created for scholarship_fee (${orderId})`,
        p_performed_by: user.id,
        p_performed_by_type: "student",
        p_metadata: {
          fee_type: "scholarship_fee",
          payment_method: "parcelow",
          order_id: orderId,
          amount: finalAmount,
          scholarships_ids: normalizedScholarshipsIds,
          package_name: userPackageFees?.package_name || null,
        },
      });
    } catch (logError) {
      console.error("Failed to log checkout creation:", logError);
    }

    return corsResponse({ checkout_url: checkoutUrl }, 200);
  } catch (error: any) {
    console.error(
      "[parcelow-checkout-scholarship-fee] ❌ Erro geral na função:",
      error,
    );
    return corsResponse({
      error: "Internal server error",
      details: error.message,
    }, 500);
  }
});
