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
    console.log("[parcelow-checkout-application-fee] 🚀 Iniciando função");

    if (req.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const config = getParcelowConfig(req);

    if (!config.clientId || !config.clientSecret) {
      console.error(
        "[parcelow-checkout-application-fee] ❌ Credenciais Parcelow não configuradas",
      );
      return corsResponse({ error: "Parcelow configuration error" }, 500);
    }

    const { metadata } = await req.json();

    console.log("[parcelow-checkout-application-fee] 📥 Payload recebido:", {
      metadata,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(
        "[parcelow-checkout-application-fee] ❌ Header de autorização não encontrado",
      );
      return corsResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      console.error(
        "[parcelow-checkout-application-fee] ❌ Erro de autenticação:",
        authError,
      );
      return corsResponse({ error: "Invalid token" }, 401);
    }

    console.log(
      "[parcelow-checkout-application-fee] ✅ Usuário autenticado:",
      user.id,
    );

    // Buscar perfil do usuário para obter CPF e dependentes
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        "id, user_id, full_name, email, cpf_document, phone, system_type, dependents",
      )
      .eq("user_id", user.id)
      .single();

    if (profileError || !userProfile) {
      console.error(
        "[parcelow-checkout-application-fee] ❌ Erro ao buscar perfil:",
        profileError,
      );
      return corsResponse({ error: "User profile not found" }, 404);
    }

    if (!userProfile.cpf_document) {
      console.error(
        "[parcelow-checkout-application-fee] ❌ CPF é obrigatório para pagamento via Parcelow",
      );
      return corsResponse({
        error: "document_number_required",
        message: "CPF is required for Parcelow payment",
      }, 400);
    }

    // Verificar se application_id foi fornecido
    let applicationId = metadata?.application_id;
    if (!applicationId) {
      return corsResponse(
        { error: "Application ID is required in metadata" },
        400,
      );
    }

    // Verifica se a aplicação existe e pertence ao usuário
    let { data: application, error: appError } = await supabase
      .from("scholarship_applications")
      .select("id, student_id, scholarship_id, student_process_type")
      .eq("id", applicationId)
      .eq("student_id", userProfile.id)
      .single();

    // Se a aplicação não existe, tenta criar uma nova
    if (appError || !application) {
      console.log(
        "[parcelow-checkout-application-fee] Application not found, attempting to create new one",
      );

      const scholarshipId = metadata?.selected_scholarship_id ||
        metadata?.scholarship_id;
      if (!scholarshipId) {
        console.error(
          "[parcelow-checkout-application-fee] No scholarship_id in metadata to create application",
        );
        return corsResponse({
          error:
            "Application not found and scholarship_id missing to create new one",
        }, 404);
      }

      const applicationData: any = {
        student_id: userProfile.id,
        scholarship_id: scholarshipId,
        status: "pending",
        applied_at: new Date().toISOString(),
      };

      if (metadata?.student_process_type) {
        applicationData.student_process_type = metadata.student_process_type;
      }

      const { data: newApp, error: insertError } = await supabase
        .from("scholarship_applications")
        .insert(applicationData)
        .select("id, student_id, scholarship_id, student_process_type")
        .single();

      if (insertError || !newApp) {
        console.error(
          "[parcelow-checkout-application-fee] Error creating application:",
          insertError,
        );
        return corsResponse({ error: "Failed to create application" }, 500);
      }

      application = newApp;
      applicationId = newApp.id;
      console.log(
        "[parcelow-checkout-application-fee] New application created:",
        application.id,
      );
    } else {
      console.log(
        "[parcelow-checkout-application-fee] Application verified:",
        application.id,
      );

      // Se a aplicação existe mas não tem student_process_type, atualiza se disponível
      if (!application.student_process_type && metadata?.student_process_type) {
        await supabase
          .from("scholarship_applications")
          .update({ student_process_type: metadata.student_process_type })
          .eq("id", application.id);
      }
    }

    // Buscar valor da taxa da bolsa (application_fee_amount)
    let applicationFeeAmount = 350.00; // Valor padrão

    // Verificar se veio final_amount no metadata (com desconto já aplicado)
    const hasFinalAmountFromMetadata = metadata?.final_amount &&
      !isNaN(parseFloat(metadata.final_amount));
    const finalAmountFromMetadata = hasFinalAmountFromMetadata
      ? parseFloat(metadata.final_amount)
      : null;

    if (finalAmountFromMetadata) {
      applicationFeeAmount = finalAmountFromMetadata;
      console.log(
        "[parcelow-checkout-application-fee] ✅ Usando valor com desconto do metadata:",
        applicationFeeAmount,
      );
    } else {
      // Buscar dados da bolsa
      if (application.scholarship_id) {
        const { data: scholarshipData, error: scholarshipError } =
          await supabase
            .from("scholarships")
            .select("id, university_id, application_fee_amount")
            .eq("id", application.scholarship_id)
            .single();

        if (!scholarshipError && scholarshipData) {
          applicationFeeAmount = scholarshipData.application_fee_amount ||
            350.00;
          console.log(
            "[parcelow-checkout-application-fee] Valor da bolsa:",
            applicationFeeAmount,
          );
        }
      }

      // Adicionar custo por dependente
      const dependents = Number(userProfile.dependents) || 0;

      if (dependents > 0) {
        const dependentsCost = dependents * 100; // $100 por dependente
        applicationFeeAmount += dependentsCost;
        console.log(
          `[parcelow-checkout-application-fee] ✅ Adicionado $${dependentsCost} por ${dependents} dependente(s). Novo valor: $${applicationFeeAmount}`,
        );
      }
    }

    // Garantir valor mínimo de $0.50 USD
    const minAmount = 0.50;
    if (applicationFeeAmount < minAmount) {
      applicationFeeAmount = minAmount;
    }

    // Obter token de acesso
    const accessToken = await getParcelowAccessToken(config);

    // Gerar ID de referência único (MUITO curto para evitar truncamento pela Parcelow)
    // Usar uma string aleatória curta de 6 caracteres
    const reference = `ap_${Math.random().toString(36).substring(2, 8)}`; // ap = application_fee (total 9 chars)

    // URLs de redirect dinâmicas conforme ambiente (matriculausa.com, staging ou localhost)
    const origin = getRedirectOrigin(req);
    console.log(
      "[parcelow-checkout-application-fee] 🔗 Origin determinado:",
      origin,
    );

    // URLs de redirect após pagamento Parcelow
    // Apontar para o onboarding, próximo passo após a taxa de matrícula
    const redirectSuccess =
      `${origin}/student/onboarding?step=scholarship_fee&payment=success&ref=${
        encodeURIComponent(reference)
      }&pm=p`;
    const redirectFailed =
      `${origin}/student/onboarding?step=payment&payment=cancelled&ref=${
        encodeURIComponent(reference)
      }&pm=p`;

    // URL do webhook
    const webhookUrl = `${
      Deno.env.get("SUPABASE_URL")
    }/functions/v1/parcelow-webhook`;

    // Preparar dados do pedido no formato esperado pela API Parcelow
    // IMPORTANTE: A API Parcelow espera o valor em CENTAVOS (USD cents)
    const amountInCents = Math.round(applicationFeeAmount * 100);

    const orderPayload = {
      reference: reference,
      items: [{
        reference: reference,
        description: "Payment for Application Fee",
        quantity: 1,
        amount: amountInCents, // em centavos (USD cents)
      }],
      client: {
        name: userProfile.full_name,
        email: userProfile.email,
        cpf: userProfile.cpf_document.replace(/\D/g, ""), // apenas números
        phone: userProfile.phone || "",
      },
      redirect: {
        success: redirectSuccess,
        failed: redirectFailed,
      },
      notify_url: webhookUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: user.id,
        fee_type: "application_fee",
        application_id: applicationId,
        scholarship_id: application.scholarship_id,
        student_process_type: application.student_process_type || null,
        application_fee_amount: applicationFeeAmount.toString(),
        timestamp: Date.now().toString(),
        ...(metadata || {}),
      },
    };

    console.log(
      "[parcelow-checkout-application-fee] 🛒 Criando pedido na Parcelow...",
    );
    console.log(
      "[parcelow-checkout-application-fee] 🔍 Order Payload:",
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
        "[parcelow-checkout-application-fee] ❌ Erro ao criar pedido na Parcelow:",
        error,
      );
      return corsResponse({
        error: "Failed to create Parcelow order",
        details: error,
      }, 500);
    }

    const parcelowOrder = await orderResponse.json();
    console.log(
      "[parcelow-checkout-application-fee] ✅ Pedido criado na Parcelow",
    );
    console.log(
      "[parcelow-checkout-application-fee] 🔍 Parcelow Order Response:",
      JSON.stringify(parcelowOrder, null, 2),
    );

    // A resposta da Parcelow pode ter diferentes formatos, vamos extrair os dados corretamente
    const orderId = parcelowOrder.data?.order_id || parcelowOrder.order_id ||
      parcelowOrder.id;
    const checkoutUrl = parcelowOrder.data?.url_checkout ||
      parcelowOrder.checkout_url || parcelowOrder.url;

    if (!orderId || !checkoutUrl) {
      console.error(
        "[parcelow-checkout-application-fee] ❌ Resposta da Parcelow não contém order_id ou checkout_url:",
        parcelowOrder,
      );
      return corsResponse({
        error: "Invalid Parcelow response",
        details: "Missing order_id or checkout_url in response",
        response: parcelowOrder,
      }, 500);
    }

    console.log("[parcelow-checkout-application-fee] ✅ Order ID:", orderId);
    console.log(
      "[parcelow-checkout-application-fee] ✅ Checkout URL:",
      checkoutUrl,
    );

    // Registrar no banco de dados
    const { error: insertError } = await supabase.rpc(
      "insert_individual_fee_payment",
      {
        p_user_id: user.id,
        p_fee_type: "application_fee",
        p_amount: applicationFeeAmount,
        p_payment_date: new Date().toISOString(),
        p_payment_method: "parcelow",
        p_parcelow_order_id: String(orderId),
        p_parcelow_checkout_url: checkoutUrl,
        p_parcelow_reference: reference,
      },
    );

    if (insertError) {
      console.error(
        "[parcelow-checkout-application-fee] ❌ Erro ao registrar pagamento:",
        insertError,
      );
    } else {
      console.log(
        "[parcelow-checkout-application-fee] ✅ Pagamento registrado com sucesso!",
      );
    }

    // Log action
    try {
      await supabase.rpc("log_student_action", {
        p_student_id: userProfile.id,
        p_action_type: "checkout_session_created",
        p_action_description:
          `Parcelow checkout session created for application_fee (${orderId})`,
        p_performed_by: user.id,
        p_performed_by_type: "student",
        p_metadata: {
          fee_type: "application_fee",
          payment_method: "parcelow",
          order_id: orderId,
          amount: applicationFeeAmount,
          application_id: applicationId,
          scholarship_id: application.scholarship_id,
        },
      });
    } catch (logError) {
      console.error("Failed to log checkout creation:", logError);
    }

    return corsResponse({ checkout_url: checkoutUrl }, 200);
  } catch (error: any) {
    console.error(
      "[parcelow-checkout-application-fee] ❌ Erro geral na função:",
      error,
    );
    return corsResponse({
      error: "Internal server error",
      details: error.message,
    }, 500);
  }
});
