import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import Stripe from "npm:stripe@17.7.0";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

// @ts-ignore
declare const Deno: any;
import { getStripeConfig } from "../stripe-config.ts";
import {
  getAllWebhookSecrets,
  getStripeEnvironmentVariables,
} from "../shared/environment-detector.ts";
import { getStripeBalanceTransaction } from "../shared/stripe-utils.ts";

// Configurações do MailerSend (REMOVIDAS - usando apenas webhook n8n)
const supportEmail = Deno.env.get("SUPPORT_EMAIL") ||
  "support@matriculausa.com";
if (!supportEmail) {
  throw new Error("Missing required environment variable: SUPPORT_EMAIL");
}
// Configurações adicionais para templates de email
const companyName = Deno.env.get("COMPANY_NAME") || "Matrícula USA";
const companyWebsite = Deno.env.get("COMPANY_WEBSITE") ||
  "https://matriculausa.com/";
const companyLogo = Deno.env.get("COMPANY_LOGO") ||
  "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") as string,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string,
);


// Function to send term acceptance notification with PDF after successful payment
async function sendTermAcceptanceNotificationAfterPayment(userId: string, feeType: string) {
  console.log("[NOTIFICAÇÃO] Notificação de aceitação de termos simplificada.");
}
// Função para buscar dados do usuário
async function getUserData(userId: string) {
  try {
    const { data, error } = await supabase.from("user_profiles").select(
      "full_name, email",
    ).eq("user_id", userId).single();
    if (error) {
      console.error("[getUserData] Erro ao buscar dados do usuário:", error);
      return {
        email: "",
        name: "Usuário",
      };
    }
    return {
      email: data.email || "",
      name: data.full_name || "Usuário",
    };
  } catch (error) {
    console.error("[getUserData] Erro inesperado:", error);
    return {
      email: "",
      name: "Usuário",
    };
  }
}
// Função para verificar assinatura Stripe (IMPLEMENTAÇÃO MANUAL CORRETA)
async function verifyStripeSignature(
  body: string,
  signature: string | null,
  secret: string,
) {
  try {
    if (!signature) {
      console.error("[stripe-webhook] Assinatura Stripe ausente!");
      return false;
    }
    // Step 1: Extract timestamp and signatures from header
    const elements = signature.split(",");
    let timestamp = "";
    let v1Signature = "";
    for (const element of elements) {
      const [prefix, value] = element.trim().split("=");
      console.log(
        `[stripe-webhook] Parsing element: "${element}" -> prefix: "${prefix}", value: "${
          value?.substring(0, 10)
        }..."`,
      );
      if (prefix === "t") {
        timestamp = value;
      } else if (prefix === "v1") {
        v1Signature = value;
      }
    }

    console.log(
      `[stripe-webhook] Extracted timestamp: ${timestamp}, v1Signature: ${
        v1Signature ? "Present" : "Missing"
      }`,
    );

    if (!timestamp || !v1Signature) {
      console.error(
        "[stripe-webhook] Formato de assinatura inválido ou incompleto:",
        signature,
      );
      return false;
    }
    // Step 2: Create signed_payload string
    const signedPayload = `${timestamp}.${body}`;
    // Step 3: Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      [
        "sign",
      ],
    );
    const signedData = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload),
    );
    const expectedSignature = Array.from(new Uint8Array(signedData)).map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    // Step 4: Compare signatures (constant-time comparison)
    const isValid = expectedSignature === v1Signature;
    if (!isValid) {
      console.error("[stripe-webhook] Assinatura Stripe inválida!");
      console.error(
        "[stripe-webhook] Secret (last 4 chars):",
        secret.substring(secret.length - 4),
      );
      console.error(
        "[stripe-webhook] Body (first 50 chars):",
        body.substring(0, 50),
      );
      console.error(
        "[stripe-webhook] Signed Payload (first 50 chars):",
        signedPayload.substring(0, 50),
      );
      console.error("[stripe-webhook] HMAC Esperado:", expectedSignature);
      console.error("[stripe-webhook] HMAC Recebido:", v1Signature);
    } else {
      console.log(
        `[stripe-webhook] Assinatura Stripe verificada com sucesso usando secret: ...${
          secret.substring(secret.length - 4)
        }`,
      );
    }
    return isValid;
  } catch (err: any) {
    console.error(
      "[stripe-webhook] Erro crítico ao verificar assinatura Stripe:",
      err,
    );
    return false;
  }
}
// Função principal do webhook
Deno.serve(async (req: Request) => {
  try {
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();

    // Tentar verificar com todos os webhook secrets disponíveis
    const allSecrets = getAllWebhookSecrets();
    let validConfig = null;
    let isValid = false;

    console.log(
      `[stripe-webhook] Tentando verificar assinatura com ${allSecrets.length} secrets disponíveis...`,
    );

    for (const { env, secret } of allSecrets) {
      isValid = await verifyStripeSignature(body, sig, secret);
      if (isValid) {
        console.log(
          `✅ Assinatura verificada com sucesso usando ambiente: ${env}`,
        );
        validConfig = { environment: env, secret };
        break;
      }
    }

    if (!isValid || !validConfig) {
      console.error(
        "❌ Webhook signature verification failed with all available secrets",
      );
      return new Response(
        JSON.stringify({
          error: "Webhook signature verification failed.",
        }),
        {
          status: 400,
        },
      );
    }

    // Obter configuração completa do Stripe para o ambiente correto
    const envInfo = {
      environment: validConfig.environment,
      isProduction: validConfig.environment === "production",
      isStaging: validConfig.environment === "staging",
      isTest: validConfig.environment === "test",
    };

    const stripeVars = getStripeEnvironmentVariables(envInfo);
    const stripe = new Stripe(stripeVars.secretKey, {
      appInfo: {
        name: "MatriculaUSA Integration",
        version: "1.0.0",
      },
    });

    console.log(`🔧 Using Stripe in ${validConfig.environment} mode`);
    // Parse o evento manualmente
    let event;
    try {
      event = JSON.parse(body);
    } catch (err: any) {
      console.error("[stripe-webhook] Erro ao fazer parse do body:", err);
      return new Response(
        JSON.stringify({
          error: "Invalid JSON.",
        }),
        {
          status: 400,
        },
      );
    }
    // Log detalhado do evento
    console.log("[stripe-webhook] 🔍 Evento recebido:", event.type);
    console.log("[stripe-webhook] 🔍 Event ID:", event.id);
    console.log(
      "[stripe-webhook] 🔍 Event data keys:",
      Object.keys(event.data || {}),
    );

    // --- TRAVA DE SEGURANÇA ---
    // Verifica se o evento pertence a este projeto.
    // Se for do 'aplikei' ou estiver vazio, o evento é ignorado com sucesso.
    const stripeObject = event.data?.object;
    const metadata = stripeObject?.metadata;

    if (
      event.type.startsWith("checkout.session.") ||
      event.type.startsWith("payment_intent.")
    ) {
      if (!metadata || metadata.project !== "matricula_usa") {
        console.log(
          `[IGNORADO] Evento de outro projeto ou sem identificação (Projeto: ${
            metadata?.project || "N/A"
          })`,
        );
        return new Response(JSON.stringify({ received: true, ignored: true }), {
          status: 200,
        });
      }
    }
    // --------------------------

    // Processar eventos de checkout para cartões e PIX
    if (event.type === "checkout.session.completed") {
      console.log("[stripe-webhook] Processando checkout.session.completed...");
      return await handleCheckoutSessionCompleted(event.data.object, stripe);
    } else if (event.type === "checkout.session.async_payment_succeeded") {
      console.log(
        "[stripe-webhook] Processando checkout.session.async_payment_succeeded (PIX)...",
      );
      console.log("[PIX] 🎉 PIX pago com sucesso!");
      console.log("[PIX] 🆔 Session ID:", event.data.object.id);
      console.log("[PIX] 💰 Valor pago:", event.data.object.amount_total);
      console.log("[PIX] 💱 Moeda:", event.data.object.currency);
      console.log("[PIX] 🔗 Success URL:", event.data.object.success_url);
      console.log("[PIX] 📊 Payment Status:", event.data.object.payment_status);
      console.log("[PIX] 📊 Session Status:", event.data.object.status);
      return await handleCheckoutSessionCompleted(event.data.object, stripe);
    } else if (event.type === "checkout.session.async_payment_failed") {
      console.log(
        "[stripe-webhook] Processando checkout.session.async_payment_failed (PIX falhou)...",
      );
      return await handleCheckoutSessionFailed(event.data.object);
    } else if (event.type === "payment_intent.succeeded") {
      console.log("[stripe-webhook] Processando payment_intent.succeeded...");

      // Para PIX e Cartão como fallback, payment_intent.succeeded pode ser usado
      const paymentIntent = event.data.object;
      console.log("[stripe-webhook] Payment Intent details:", {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount_received: paymentIntent.amount_received,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        payment_method_types: paymentIntent.payment_method_types,
      });

      if (
        paymentIntent.status === "succeeded" &&
        paymentIntent.amount_received > 0
      ) {
        console.log(
          `[stripe-webhook] 🎉 Pagamento confirmado via payment_intent.succeeded! (Métodos: ${
            paymentIntent.payment_method_types?.join(", ")
          })`,
        );

        // Buscar a sessão de checkout correspondente para processar o pagamento
        try {
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: paymentIntent.id,
            limit: 1,
          });

          if (sessions.data.length > 0) {
            const session = sessions.data[0];
            console.log("[stripe-webhook] 🔗 Sessão encontrada:", session.id);

            // Verificar se esta sessão já foi processada para evitar duplicação
            const { data: existingLog } = await supabase
              .from("student_action_logs")
              .select("id")
              .eq("action_type", "checkout_session_processed")
              .eq("metadata->>session_id", session.id)
              .single();

            if (existingLog) {
              console.log(
                `[DUPLICAÇÃO] Session ${session.id} já foi processada anteriormente, ignorando payment_intent.succeeded.`,
              );
              return new Response(
                JSON.stringify({
                  received: true,
                  message: "Session already processed",
                }),
                { status: 200 },
              );
            }

            console.log(
              "[stripe-webhook] Processando pagamento através da sessão encontrada...",
            );
            return await handleCheckoutSessionCompleted(session, stripe);
          } else {
            console.log(
              "[stripe-webhook] ⚠️ Nenhuma sessão encontrada para o Payment Intent:",
              paymentIntent.id,
            );
            return new Response(
              JSON.stringify({
                received: true,
                message: "Payment Intent processado mas sessão não encontrada",
              }),
              { status: 200 },
            );
          }
        } catch (stripeError: any) {
          console.error(
            "[stripe-webhook] Erro ao buscar sessão via Payment Intent:",
            stripeError,
          );
          return new Response(
            JSON.stringify({
              received: true,
              message:
                `Erro ao processar payment_intent.succeeded: ${stripeError.message}`,
            }),
            { status: 200 },
          );
        }
      } else {
        console.log(
          "[stripe-webhook] Ignorando payment_intent.succeeded (não foi pago com sucesso)",
        );
        return new Response(
          JSON.stringify({
            received: true,
            message: "payment_intent.succeeded ignorado (não pago)",
          }),
          { status: 200 },
        );
      }
    } else {
      console.log(`[stripe-webhook] Evento não suportado: ${event.type}`);
      return new Response(
        JSON.stringify({
          received: true,
          message: `Evento não suportado: ${event.type}`,
        }),
        {
          status: 200,
        },
      );
    }
  } catch (err: any) {
    console.error("[stripe-webhook] Erro inesperado no handler:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error.",
      }),
      {
        status: 500,
      },
    );
  }
});
// Função para processar falhas de PIX
// Função auxiliar para determinar moeda e símbolo baseado na session do Stripe
function getCurrencyInfo(session: any) {
  const currency = session.currency?.toLowerCase() || "usd";
  const isPix = session.payment_method_types?.includes("pix") ||
    session.metadata?.payment_method === "pix";

  // Se for PIX ou currency for BRL, usar Real
  if (currency === "brl" || isPix) {
    return {
      currency: "BRL",
      symbol: "R$",
      code: "brl",
    };
  }

  // Caso contrário, usar Dólar
  return {
    currency: "USD",
    symbol: "$",
    code: "usd",
  };
}

// Função auxiliar para formatar valor com moeda
function formatAmountWithCurrency(amount: number, session: any) {
  const currencyInfo = getCurrencyInfo(session);
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
}

async function handleCheckoutSessionFailed(session: any) {
  console.log(
    "[stripe-webhook] handleCheckoutSessionFailed called with session:",
    JSON.stringify(session, null, 2),
  );
  const metadata = session.metadata || {};
  const userId = metadata?.user_id || metadata?.student_id;
  console.log("[stripe-webhook] PIX payment failed for user:", userId);
  // Log da falha do pagamento
  if (userId) {
    try {
      const { data: userProfile } = await supabase.from("user_profiles").select(
        "id",
      ).eq("user_id", userId).single();
      if (userProfile) {
        await supabase.rpc("log_student_action", {
          p_student_id: userProfile.id,
          p_action_type: "pix_payment_failed",
          p_action_description: `PIX payment failed for session ${session.id}`,
          p_performed_by: userId,
          p_performed_by_type: "student", // ✅ CORREÇÃO: Falha de pagamento do estudante, não do admin
          p_metadata: {
            session_id: session.id,
            payment_method: "pix",
            fee_type: metadata.fee_type,
          },
        });
      }
    } catch (logError: any) {
      console.error(
        "[stripe-webhook] Failed to log PIX payment failure:",
        logError,
      );
    }
  }
  return new Response(
    JSON.stringify({
      received: true,
      message: "PIX payment failure processed",
    }),
    {
      status: 200,
    },
  );
}
// Função para processar checkout.session.completed
async function handleCheckoutSessionCompleted(session: any, stripe: any) {
  console.log(
    "[DEBUG 1] 🚀 handleCheckoutSessionCompleted iniciado",
    { sessionId: session.id, payment_status: session.payment_status },
  );
  const stripeData = session;
  console.log(
    "[DEBUG 2] Metadata capturado:",
    JSON.stringify(stripeData.metadata, null, 2),
  );

  // ✅ VERIFICAÇÃO CRÍTICA: Só processar se o pagamento foi realmente realizado
  if (session.payment_status !== "paid") {
    // Para PIX, verificar se o pagamento foi realmente realizado consultando o Stripe
    const isPixPayment = session.payment_method_types?.includes("pix") ||
      session.metadata?.payment_method === "pix";

    if (isPixPayment && session.payment_intent) {
      console.log(
        `[stripe-webhook] 🔍 PIX detectado com payment_status: ${session.payment_status}, verificando status real no Stripe...`,
      );

      try {
        // Consultar o Payment Intent diretamente no Stripe para verificar o status real
        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent,
        );
        console.log(`[stripe-webhook] 📊 Payment Intent status:`, {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount_received: paymentIntent.amount_received,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });

        // Se o Payment Intent está pago, processar mesmo com payment_status unpaid
        if (
          paymentIntent.status === "succeeded" &&
          paymentIntent.amount_received > 0
        ) {
          console.log(
            `[stripe-webhook] ✅ PIX realmente pago! Payment Intent status: ${paymentIntent.status}, amount_received: ${paymentIntent.amount_received}`,
          );
          // Continuar com o processamento
        } else {
          console.log(
            `[stripe-webhook] ❌ PIX não foi pago. Payment Intent status: ${paymentIntent.status}`,
          );
          return new Response(
            JSON.stringify({
              received: true,
              message:
                `PIX payment not completed (Payment Intent status: ${paymentIntent.status})`,
            }),
            {
              status: 200,
            },
          );
        }
      } catch (stripeError: any) {
        console.error(
          `[stripe-webhook] Erro ao consultar Payment Intent:`,
          stripeError,
        );
        return new Response(
          JSON.stringify({
            received: true,
            message: `Error checking payment status: ${stripeError.message}`,
          }),
          {
            status: 200,
          },
        );
      }
    } else {
      console.log(
        `[stripe-webhook] ⚠️ Pagamento não foi realizado (payment_status: ${session.payment_status}), ignorando processamento`,
      );
      console.log(`[stripe-webhook] 📊 Detalhes da sessão:`, {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        payment_method_types: session.payment_method_types,
        payment_intent: session.payment_intent,
        metadata: session.metadata,
      });
      return new Response(
        JSON.stringify({
          received: true,
          message: `Payment not completed (status: ${session.payment_status})`,
        }),
        {
          status: 200,
        },
      );
    }
  }

  // Verificar se já foi processado para evitar duplicação
  const sessionId = session.id;
  const process_tag = crypto.randomUUID(); // Definir aqui para estar no escopo de toda a função

  const { data: existingLog } = await supabase
    .from("student_action_logs")
    .select("id")
    .eq("action_type", "checkout_session_processed")
    .eq("metadata->>session_id", sessionId)
    .single();

  if (existingLog) {
    console.log(
      "[stripe-webhook] Session já foi processada, ignorando duplicação:",
      sessionId,
    );
    return new Response(
      JSON.stringify({
        received: true,
        message: "Session already processed",
      }),
      {
        status: 200,
      },
    );
  }

  // Criar log ANTES de processar para evitar duplicação em chamadas simultâneas
  const metadata = stripeData.metadata || {};
  const userId = metadata?.user_id || metadata?.student_id;
  if (userId) {
    try {
      const { data: userProfile } = await supabase.from("user_profiles").select(
        "id",
      ).eq("user_id", userId).single();
      if (userProfile) {
        const { error: logError } = await supabase.rpc("log_student_action", {
          p_student_id: userProfile.id,
          p_action_type: "checkout_session_processed",
          p_action_description:
            `Checkout session processing started: ${sessionId}`,
          p_performed_by: userId,
          p_performed_by_type: "student",
          p_metadata: {
            session_id: sessionId,
            payment_method: metadata?.payment_method || "stripe",
            fee_type: metadata.fee_type,
            processing_started: true,
            process_tag: process_tag,
          },
        });

        if (logError) {
          console.error("[DUPLICAÇÃO] Erro ao criar log:", logError);
          // Se falhar ao criar log, verificar novamente se já existe (race condition)
          const { data: recheckLog } = await supabase
            .from("student_action_logs")
            .select("id")
            .eq("action_type", "checkout_session_processed")
            .eq("metadata->>session_id", sessionId)
            .single();

          if (recheckLog) {
            console.log(
              `[DUPLICAÇÃO] Session ${sessionId} já está sendo processada, retornando sucesso.`,
            );
            return new Response(
              JSON.stringify({
                received: true,
                message: "Session already being processed",
              }),
              {
                status: 200,
              },
            );
          }
        } else {
          // Log criado com sucesso. Agora vamos verificar se somos o "vencedor" da race condition.
          const { data: allLogs } = await supabase
            .from("student_action_logs")
            .select("id, metadata, created_at")
            .eq("action_type", "checkout_session_processed")
            .eq("metadata->>session_id", sessionId)
            .order("created_at", { ascending: true });

          if (allLogs && allLogs.length > 1) {
            // Se houver múltiplos logs, verificar se algum já foi marcado como concluído
            const alreadyCompleted = allLogs.some((l: any) =>
              l.metadata?.processing_completed === true
            );
            if (alreadyCompleted) {
              console.log(
                `[DUPLICAÇÃO] Session ${sessionId} já foi processada anteriormente e concluída.`,
              );
              return new Response(
                JSON.stringify({ received: true, status: "already_completed" }),
                { status: 200 },
              );
            }

            // Eleger o vencedor: aquele cujo process_tag coincide com o log mais antigo
            const oldestLog = allLogs[0];
            if (oldestLog.metadata?.process_tag !== process_tag) {
              console.log(
                `[DUPLICAÇÃO] Race condition detectada para session ${sessionId}. Este processo (tag: ${process_tag}) perdeu para o log ${oldestLog.id} (tag: ${oldestLog.metadata?.process_tag}). Abortando.`,
              );
              return new Response(
                JSON.stringify({ received: true, status: "duplicate_lost" }),
                { status: 200 },
              );
            }
            console.log(
              `[DUPLICAÇÃO] Race condition detectada, mas este processo (tag: ${process_tag}) é o vencedor. Continuando...`,
            );
          } else {
            console.log(
              `[DUPLICAÇÃO] Log de processamento criado (único). Tag: ${process_tag}`,
            );
          }
        }
      }
    } catch (logError) {
      console.error(
        "[DUPLICAÇÃO] Erro ao criar log de processamento:",
        logError,
      );
      const { data: fallbackCheck } = await supabase
        .from("student_action_logs")
        .select("id")
        .eq("action_type", "checkout_session_processed")
        .eq("metadata->>session_id", sessionId)
        .limit(1);

      if (fallbackCheck && fallbackCheck.length > 0) {
        return new Response(
          JSON.stringify({ received: true, status: "fallback_duplicate" }),
          { status: 200 },
        );
      }
    }
  }

  // Só processa envio de e-mail para checkout.session.completed
  console.log("[stripe-webhook] Evento checkout.session.completed recebido!");
  const { mode, payment_status } = stripeData;
  const amount_total = stripeData.amount_total;
  const sessionData = stripeData;
  // Obter dados do usuário para o e-mail
  // userId já foi declarado acima
  let userData = {
    email: "",
    name: "Usuário",
  };
  if (userId) {
    userData = await getUserData(userId);
    console.log("[stripe-webhook] userData extraído para e-mail:", userData);
  } else {
    console.warn(
      "[stripe-webhook] Nenhum userId encontrado no metadata para envio de e-mail.",
    );
  }
  // Fallback: extrair e-mail e nome do evento Stripe se não encontrar no banco
  if (!userData.email) {
    userData.email = sessionData.customer_email ||
      sessionData.customer_details?.email || "";
    if (userData.email) {
      console.log(
        "[stripe-webhook] E-mail extraído do evento Stripe:",
        userData.email,
      );
    } else {
      console.warn(
        "[stripe-webhook] Nenhum e-mail encontrado nem no banco nem no evento Stripe.",
      );
    }
  }
  if (!userData.name || userData.name === "Usuário") {
    userData.name = sessionData.customer_details?.name || "Usuário";
    if (userData.name && userData.name !== "Usuário") {
      console.log(
        "[stripe-webhook] Nome extraído do evento Stripe:",
        userData.name,
      );
    }
  }
  // Referenciar corretamente o metadado de origem
  const paymentOrigin = metadata?.origin || "site";
  console.log(
    "[stripe-webhook] Metadado de origem do pagamento:",
    paymentOrigin,
  );
  // Log antes do envio de e-mail
  // REMOVIDO: Envio via MailerSend para evitar duplicação com webhook n8n
  console.log(
    "[stripe-webhook] Notificação de pagamento será enviada apenas via webhook n8n para evitar duplicação",
  );
  // Processar diferentes tipos de pagamento
  const feeTypeFromMetadata = metadata?.fee_type;
  let paymentType = metadata?.payment_type || feeTypeFromMetadata;

  console.log(`[stripe-webhook] Initial paymentType: ${paymentType}, feeType: ${feeTypeFromMetadata}`);
  console.log(`[stripe-webhook] Metadata keys: ${Object.keys(metadata || {})}`);

  // Lógica de fallback para evitar que 'stripe_processing' bloqueie o processamento
  if (paymentType === "stripe_processing") {
    if (metadata?.application_id) {
      paymentType = "application_fee";
    } else if (metadata?.scholarships_ids) {
      paymentType = "scholarship_fee";
    } else if (
      metadata?.fee_type === "i20_control_fee" ||
      metadata?.fee_type_original === "i20_control_fee"
    ) {
      paymentType = "i20_control_fee";
    } else {
      // Se não tem outros IDs, provavelmente é selection_process (taxa inicial)
      paymentType = "selection_process";
    }
  }

  if (paymentType === "application_fee") {
    // userId já foi declarado acima, usar o valor do metadata se necessário
    const finalUserId = metadata.user_id || metadata.student_id || userId;
    const applicationId = metadata.application_id;
    const applicationFeeAmount = metadata.application_fee_amount || "350.00";
    const universityId = metadata.university_id;
    const feeType = metadata.fee_type || "application_fee";
    const paymentMethod = metadata?.payment_method || "stripe"; // Usar método do metadata

    console.log(
      `[stripe-webhook] Processing application_fee for user: ${finalUserId}, application: ${applicationId}, payment method: ${paymentMethod}`,
    );

    if (finalUserId && applicationId) {
      // Buscar o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: userProfileError } = await supabase
        .from("user_profiles").select("id, user_id").eq("user_id", finalUserId)
        .single();
      if (userProfileError || !userProfile) {
        console.error(
          "[stripe-webhook] User profile not found:",
          userProfileError,
        );
      } else {
        console.log(
          `[stripe-webhook] User profile found: ${userProfile.id} for auth user: ${finalUserId}`,
        );

        // Buscar o status atual da aplicação para preservar 'approved' se já estiver
        const { data: currentApp, error: fetchError } = await supabase.from(
          "scholarship_applications",
        ).select("status, scholarship_id, student_process_type").eq(
          "id",
          applicationId,
        ).eq("student_id", userProfile.id).single();

        const updateData: any = {
          is_application_fee_paid: true,
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          application_fee_payment_method: metadata?.payment_method || "stripe",
          updated_at: new Date().toISOString(),
        };

        // Só alterar status se não estiver 'approved' (universidade já aprovou)
        if (!currentApp || currentApp.status !== "approved") {
          updateData.status = "under_review";
          console.log(
            `[stripe-webhook] Application status set to 'under_review' for user ${finalUserId}, application ${applicationId}.`,
          );
        } else {
          console.log(
            `[stripe-webhook] Preserving 'approved' status for user ${finalUserId}, application ${applicationId} (university already approved).`,
          );
        }

        // Se student_process_type não existe na aplicação, tentar obter dos metadados da sessão
        if (
          !currentApp?.student_process_type &&
          session.metadata?.student_process_type
        ) {
          updateData.student_process_type =
            session.metadata.student_process_type;
          console.log(
            "[stripe-webhook] Adding student_process_type from session metadata:",
            session.metadata.student_process_type,
          );
        }

        const { error: appError } = await supabase.from(
          "scholarship_applications",
        ).update(updateData).eq("id", applicationId).eq(
          "student_id",
          userProfile.id,
        );
        if (appError) {
          console.error(
            "[stripe-webhook] Error updating application status:",
            appError,
          );
        } else {
          console.log(
            "[stripe-webhook] Application fee payment processed successfully for user:",
            finalUserId,
          );
        }

        // Buscar documentos do user_profiles e vincular à application
        const { data: userProfileDocs, error: userProfileError } =
          await supabase.from("user_profiles").select("documents").eq(
            "user_id",
            finalUserId,
          ).single();
        if (userProfileError) {
          console.error(
            "[stripe-webhook] Failed to fetch user profile documents:",
            userProfileError,
          );
        } else if (userProfileDocs?.documents) {
          const documents = Array.isArray(userProfileDocs.documents)
            ? userProfileDocs.documents
            : [];
          let formattedDocuments = documents;
          // Se for array de strings (URLs), converter para array de objetos completos
          if (documents.length > 0 && typeof documents[0] === "string") {
            const docTypes = ["passport", "diploma", "funds_proof"];
            formattedDocuments = documents.map((url: string, idx: number) => ({
              type: docTypes[idx] || `doc${idx + 1}`,
              url,
              uploaded_at: new Date().toISOString(),
            }));
          }
          if (formattedDocuments.length > 0) {
            const { error: docUpdateError } = await supabase.from(
              "scholarship_applications",
            ).update({
              documents: formattedDocuments,
            }).eq("id", applicationId).eq("student_id", userProfile.id);
            if (docUpdateError) {
              console.error(
                "[stripe-webhook] Failed to update application documents:",
                docUpdateError,
              );
            } else {
              console.log("[stripe-webhook] Application documents updated");
            }
          }
        }
      }

      // Atualizar também o perfil do usuário para manter consistência
      const { error: profileUpdateError } = await supabase.from("user_profiles")
        .update({
          is_application_fee_paid: true,
          application_fee_paid_at: new Date().toISOString(),
          application_fee_payment_method: metadata?.payment_method || "stripe",
          last_payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", finalUserId);
      if (profileUpdateError) {
        console.error(
          "[stripe-webhook] Error updating user profile:",
          profileUpdateError,
        );
      } else {
        console.log(
          "[stripe-webhook] User profile updated - application fee paid",
        );
      }

      // --- REGISTRO DE INDIVIDUAL_FEE_PAYMENTS (RE-ADICIONADO FALLBACK) ---
      console.log(
        "[Individual Fee Payment] Registrando individual_fee_payments para application_fee via webhook",
      );
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || "USD";
        const paymentIntentId = session.payment_intent as string || "";

        const stripeInfo = await getStripeBalanceTransaction(
          stripe,
          paymentIntentId,
          paymentAmountRaw,
          currency
        );

        const { error: insertError } = await supabase.rpc("insert_individual_fee_payment", {
          p_user_id: finalUserId,
          p_fee_type: "application",
          p_amount: stripeInfo.amount,
          p_payment_date: paymentDate,
          p_payment_method: metadata?.payment_method || "stripe",
          p_payment_intent_id: paymentIntentId,
          p_stripe_charge_id: null,
          p_zelle_payment_id: null,
          p_gross_amount_usd: stripeInfo.gross_amount_usd,
          p_fee_amount_usd: stripeInfo.fee_amount_usd,
        });
        
        if (insertError) {
          console.error("[stripe-webhook] Error inserting application payment record:", insertError);
        } else {
          console.log("[stripe-webhook] application payment record inserted successfully.");
        }
      } catch (recordError) {
        console.error("[stripe-webhook] Exception recording application payment:", recordError);
      }

      // Limpar carrinho
      const { error: cartError } = await supabase.from("user_cart").delete().eq(
        "user_id",
        finalUserId,
      );
      if (cartError) {
        console.error("[stripe-webhook] Failed to clear user_cart:", cartError);
      } else {
        console.log("[stripe-webhook] User cart cleared");
      }

      // --- NOTIFICAÇÕES REMOVIDAS ---
      // Todas as notificações (PIX e cartão) são enviadas via verify-stripe-session-application-fee
      // para evitar duplicação e centralizar a lógica de notificações
      console.log(
        "[NOTIFICAÇÃO] Notificações de application_fee serão enviadas via verify-stripe-session-application-fee",
      );

      // Log dos valores processados
      console.log("Application fee payment processed:", {
        userId: finalUserId,
        applicationId,
        applicationFeeAmount,
        universityId,
      });
    }
  }
  if (paymentType === "scholarship_fee") {
    const userId = metadata?.user_id || metadata?.student_id;
    const scholarshipsIds = metadata?.scholarships_ids;
    const paymentIntentId = sessionData.payment_intent;

    if (userId) {
      // 1. Buscar o perfil do usuário
      const { data: userProfile, error: userProfileError } = await supabase
        .from("user_profiles").select(
          "id, user_id, full_name, email, phone, seller_referral_code",
        ).eq("user_id", userId)
        .single();

      if (userProfileError || !userProfile) {
        console.error(
          "[stripe-webhook] User profile not found:",
          userProfileError,
        );
      } else {
        // 2. Atualizar scholarship_applications
        if (scholarshipsIds) {
          const scholarshipIdsArray = scholarshipsIds.split(",").map((
            id: string,
          ) => id.trim());
          const { error: appError } = await supabase.from(
            "scholarship_applications",
          ).update({
            is_scholarship_fee_paid: true,
            scholarship_fee_payment_method: metadata?.payment_method ||
              "stripe",
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("student_id", userProfile.id).in(
            "scholarship_id",
            scholarshipIdsArray,
          );

          if (appError) {
            console.error(
              "[stripe-webhook] Error updating scholarship_applications:",
              appError,
            );
          }
        }

        // 3. Atualizar perfil do usuário
        await supabase.from("user_profiles").update({
          is_scholarship_fee_paid: true,
          scholarship_fee_paid_at: new Date().toISOString(),
          scholarship_fee_payment_method: metadata?.payment_method || "stripe",
          last_payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);

        // 4. Registrar em individual_fee_payments (sempre em USD)
        try {
          const amountTotal = session.amount_total
            ? session.amount_total / 100
            : 0;
          const currency = session.currency?.toUpperCase() || "USD";
          const paymentIntentId = session.payment_intent as string || "";
          
          let paymentAmount = amountTotal;
          let grossAmountUsd: number | null = null;
          let feeAmountUsd: number | null = null;

          // Buscar valor real convertido (Líquido/Bruto/Taxas) no Stripe BalanceTransaction
          const stripeInfo = await getStripeBalanceTransaction(
            stripe,
            paymentIntentId,
            amountTotal,
            currency
          );
          paymentAmount = stripeInfo.amount;
          grossAmountUsd = stripeInfo.gross_amount_usd;
          feeAmountUsd = stripeInfo.fee_amount_usd;

          if (!grossAmountUsd && metadata?.exchange_rate) {
            const exchangeRate = parseFloat(metadata.exchange_rate);
            if (exchangeRate > 0) paymentAmount = amountTotal / exchangeRate;
          }

          await supabase.rpc("insert_individual_fee_payment", {
            p_user_id: userId,
            p_fee_type: "scholarship",
            p_amount: paymentAmount,
            p_payment_date: new Date().toISOString(),
            p_payment_method: "stripe",
            p_payment_intent_id: paymentIntentId,
            p_stripe_charge_id: null,
            p_zelle_payment_id: null,
            p_gross_amount_usd: grossAmountUsd,
            p_fee_amount_usd: feeAmountUsd,
          });
        } catch (recordError) {
          // Error logged silently or handled if needed
        }

        // 5. Registrar faturamento (affiliate_referrals)
        try {
          const { data: usedCode } = await supabase.from("used_referral_codes")
            .select("referrer_id, affiliate_code").eq("user_id", userId)
            .single();

          if (usedCode) {
            const baseAmount = metadata.base_amount
              ? Number(metadata.base_amount)
              : (session.amount_total ? session.amount_total / 100 : 0);
            await supabase.from("affiliate_referrals").upsert({
              referrer_id: usedCode.referrer_id,
              referred_id: userId,
              affiliate_code: usedCode.affiliate_code,
              payment_amount: baseAmount,
              status: "completed",
              payment_session_id: session.id,
              completed_at: new Date().toISOString(),
            }, { onConflict: "referred_id" });
          }
        } catch (billingError) {
          console.error("[FATURAMENTO] Erro:", billingError);
        }

        // 6. Registrar em scholarship_fee_payments
        if (scholarshipsIds && paymentIntentId) {
          const scholarshipIdsArray = scholarshipsIds.split(",").map((
            id: string,
          ) => id.trim());
          for (const scholarshipId of scholarshipIdsArray) {
            await supabase.from("scholarship_fee_payments").insert({
              user_id: userId,
              scholarship_id: scholarshipId,
              amount: session.amount_total
                ? (session.amount_total / 100 / scholarshipIdsArray.length)
                : 0,
              payment_date: new Date().toISOString(),
              payment_method: "stripe",
              payment_intent_id: paymentIntentId as string,
              currency: session.currency?.toUpperCase() || "USD",
            });
          }
        }

        // 7. Notificações (PIX only)
        const isPixPayment = session.payment_method_types?.includes("pix") ||
          metadata?.payment_method === "pix";
        if (isPixPayment) {
          try {
            const scholarshipsArray = scholarshipsIds
              ? scholarshipsIds.split(",").map((s: string) => s.trim())
              : [];
            const { data: adminProfile } = await supabase.from("user_profiles")
              .select("phone").eq("email", "admin@matriculausa.com").single();
            const adminPhone = adminProfile?.phone || "";

            for (const scholarshipId of scholarshipsArray) {
              const { data: scholarship } = await supabase.from("scholarships")
                .select("title, university_id").eq("id", scholarshipId)
                .single();
              const { data: universidade } = await supabase.from("universities")
                .select("name").eq("id", scholarship?.university_id).single();

              if (scholarship && universidade) {
                const currencyInfo = getCurrencyInfo(session);
                const amountValue = session.amount_total
                  ? (session.amount_total / 100 / scholarshipsArray.length)
                  : 0;
                const formattedAmount = formatAmountWithCurrency(
                  amountValue,
                  session,
                );

                // Notificação Aluno
                await fetch(
                  "https://nwh.suaiden.com/webhook/notfmatriculausa",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      tipo_notf: "Pagamento de taxa de bolsa confirmado",
                      email_aluno: userProfile.email,
                      nome_aluno: userProfile.full_name,
                      phone_aluno: userProfile.phone || "",
                      nome_bolsa: scholarship.title,
                      nome_universidade: universidade.name,
                      o_que_enviar:
                        `Parabéns! Você pagou a taxa de bolsa para "${scholarship.title}" da universidade ${universidade.name} e foi aprovado.`,
                      amount: amountValue,
                      currency: currencyInfo.currency,
                      formatted_amount: formattedAmount,
                      notification_target: "student",
                    }),
                  },
                );

                // Notificação Seller
                if (userProfile.seller_referral_code) {
                  const { data: sellerData } = await supabase.from(
                    "affiliate_users",
                  ).select("name, email, user_id").eq(
                    "referral_code",
                    userProfile.seller_referral_code,
                  ).single();
                  if (sellerData) {
                    await fetch(
                      "https://nwh.suaiden.com/webhook/notfmatriculausa",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          tipo_notf:
                            "Pagamento Stripe de scholarship fee confirmado",
                          email_seller: sellerData.email,
                          nome_seller: sellerData.name,
                          email_aluno: userProfile.email,
                          nome_aluno: userProfile.full_name,
                          nome_bolsa: scholarship.title,
                          nome_universidade: universidade.name,
                          o_que_enviar:
                            `O aluno ${userProfile.full_name} pagou a scholarship fee.`,
                          amount: amountValue,
                          notification_target: "seller",
                        }),
                      },
                    );
                  }
                }
              }
            }

            // Notificação Admin
            const adminAmount = session.amount_total
              ? session.amount_total / 100
              : 0;
            await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tipo_notf:
                  "Pagamento Stripe de scholarship fee confirmado - Admin",
                email_admin: "admin@matriculausa.com",
                nome_aluno: userProfile.full_name,
                email_aluno: userProfile.email,
                o_que_enviar:
                  `Pagamento de scholarship fee de ${userProfile.full_name} processado.`,
                amount: adminAmount,
                formatted_amount: formatAmountWithCurrency(
                  adminAmount,
                  session,
                ),
                notification_target: "admin",
              }),
            });
          } catch (notifErr) {
            console.error("[NOTIFICAÇÃO] Erro:", notifErr);
          }
        }
      }
    }
  }
  if (paymentType === "i20_control_fee") {
    const userId = metadata?.user_id || metadata?.student_id;

    if (userId) {
      // Buscar o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: userProfileError } = await supabase
        .from("user_profiles").select("id, user_id").eq("user_id", userId)
        .single();
      if (userProfileError || !userProfile) {
        console.error(
          "[stripe-webhook] User profile not found:",
          userProfileError,
        );
      } else {
        console.log(
          `[stripe-webhook] User profile found: ${userProfile.id} for auth user: ${userId}`,
        );

        // Atualizar scholarship_applications para marcar I20 control fee como pago
        console.log(
          "[stripe-webhook] I20 control fee payment processed for user:",
          userId,
        );

        // Atualizar também o perfil do usuário para manter consistência
        const i20PaymentMethod = metadata?.payment_method || "stripe";
        const { error: profileUpdateError } = await supabase.from(
          "user_profiles",
        ).update({
          has_paid_i20_control_fee: true,
          i20_paid_at: new Date().toISOString(),
          i20_control_fee_payment_intent_id: sessionData.payment_intent,
          i20_control_fee_payment_method: i20PaymentMethod,
          last_payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        if (profileUpdateError) {
          console.error(
            "[stripe-webhook] Error updating user profile for I20 control fee:",
            profileUpdateError,
          );
        } else {
          console.log(
            "I20 control fee payment processed successfully for user:",
            userId,
          );
        }

        // Registrar pagamento na tabela individual_fee_payments
        try {
          const paymentDate = new Date().toISOString();
          const paymentAmountRaw = session.amount_total
            ? session.amount_total / 100
            : 0;
          const currency = session.currency?.toUpperCase() || "USD";
          const paymentIntentId = session.payment_intent as string || "";

          // Buscar valor real convertido (Líquido/Bruto/Taxas) no Stripe BalanceTransaction
          let paymentAmount = paymentAmountRaw;
          let grossAmountUsd: number | null = null;
          let feeAmountUsd: number | null = null;

          const stripeInfo = await getStripeBalanceTransaction(
            stripe,
            paymentIntentId,
            paymentAmountRaw,
            currency
          );
          paymentAmount = stripeInfo.amount;
          grossAmountUsd = stripeInfo.gross_amount_usd;
          feeAmountUsd = stripeInfo.fee_amount_usd;

          if (!grossAmountUsd && session.metadata?.exchange_rate) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) paymentAmount = paymentAmountRaw / exchangeRate;
          }

          const { error: insertError } = await supabase.rpc(
            "insert_individual_fee_payment",
            {
              p_user_id: userId,
              p_fee_type: "i20_control",
              p_amount: paymentAmount, // Sempre em USD
              p_payment_date: paymentDate,
              p_payment_method: "stripe",
              p_payment_intent_id: paymentIntentId,
              p_stripe_charge_id: null,
              p_zelle_payment_id: null,
              p_gross_amount_usd: grossAmountUsd,
              p_fee_amount_usd: feeAmountUsd,
            },
          );

          if (insertError) {
            console.warn(
              "[Individual Fee Payment] Warning: Could not record fee payment:",
              insertError,
            );
          }
        } catch (recordError) {
          console.error("[Individual Fee Payment] Error recording payment:", recordError);
        }
      }
    }
  }
  if (paymentType === "placement_fee") {
    const userId = metadata?.user_id || metadata?.student_id;
    if (userId) {
      const placementPaymentMethod = metadata?.payment_method || "stripe";
      const { error } = await supabase.from("user_profiles").update({
        is_placement_fee_paid: true,
        placement_fee_paid_at: new Date().toISOString(),
        placement_fee_payment_method: placementPaymentMethod,
        last_payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      
      if (error) {
        console.error("[stripe-webhook] Error updating placement fee status:", error);
      } else {
        console.log(
          "[stripe-webhook] Placement fee payment processed successfully for user:",
          userId,
        );
      }

      // Registrar pagamento na tabela individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total
          ? session.amount_total / 100
          : 0;
        const currency = session.currency?.toUpperCase() || "USD";
        const paymentIntentId = session.payment_intent as string || "";

        // Buscar valores reais de net/gross/fee no Stripe BalanceTransaction
        const stripeInfo = await getStripeBalanceTransaction(
          stripe,
          paymentIntentId,
          paymentAmountRaw,
          currency
        );
        let paymentAmount = stripeInfo.amount;
        const grossAmountUsd = stripeInfo.gross_amount_usd;
        const feeAmountUsd = stripeInfo.fee_amount_usd;

        // Fallback de conversão BRL→USD se BT não retornou
        if (!grossAmountUsd && session.metadata?.exchange_rate) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) paymentAmount = paymentAmountRaw / exchangeRate;
        }

        const { error: insertError } = await supabase.rpc(
          "insert_individual_fee_payment",
          {
            p_user_id: userId,
            p_fee_type: "placement",
            p_amount: paymentAmount,
            p_payment_date: paymentDate,
            p_payment_method: "stripe",
            p_payment_intent_id: paymentIntentId,
            p_stripe_charge_id: null,
            p_zelle_payment_id: null,
            p_gross_amount_usd: grossAmountUsd,
            p_fee_amount_usd: feeAmountUsd,
          },
        );

        if (insertError) {
          console.warn("[stripe-webhook] [Individual Fee Payment] Warning: Could not record placement fee payment:", insertError);
        }
      } catch (recordError) {
        console.error("[stripe-webhook] [Individual Fee Payment] Error recording placement payment:", recordError);
      }
    }
  }
  if (paymentType === "selection_process") {
    const userId = metadata?.user_id || metadata?.student_id;
    if (userId) {
      const selectionPaymentMethod = metadata?.payment_method || "stripe";
      const { error } = await supabase.from("user_profiles").update({
        has_paid_selection_process_fee: true,
        selection_process_paid_at: new Date().toISOString(),
        selection_process_fee_payment_method: selectionPaymentMethod,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      if (error) {
        console.error("Error updating selection process fee status:", error);
      } else {
        console.log(
          "Selection process fee payment processed successfully for user:",
          userId,
        );
      }

      // Registrar pagamento na tabela individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total
          ? session.amount_total / 100
          : 0;
        const currency = session.currency?.toUpperCase() || "USD";
        const paymentIntentId = session.payment_intent as string || "";

        let paymentAmount = paymentAmountRaw;
        let grossAmountUsd: number | null = null;
        let feeAmountUsd: number | null = null;

        // Buscar valor real convertido (Líquido/Bruto/Taxas) no Stripe BalanceTransaction
        const stripeInfo = await getStripeBalanceTransaction(
          stripe,
          paymentIntentId,
          paymentAmountRaw,
          currency
        );
        paymentAmount = stripeInfo.amount;
        grossAmountUsd = stripeInfo.gross_amount_usd;
        feeAmountUsd = stripeInfo.fee_amount_usd;

        if (!grossAmountUsd && session.metadata?.exchange_rate) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) paymentAmount = paymentAmountRaw / exchangeRate;
        }

        const { error: insertError } = await supabase.rpc(
          "insert_individual_fee_payment",
          {
            p_user_id: userId,
            p_fee_type: "selection_process",
            p_amount: paymentAmount, // Sempre em USD
            p_payment_date: paymentDate,
            p_payment_method: "stripe",
            p_payment_intent_id: paymentIntentId,
            p_stripe_charge_id: null,
            p_zelle_payment_id: null,
            p_gross_amount_usd: grossAmountUsd,
            p_fee_amount_usd: feeAmountUsd,
          },
        );

        if (insertError) {
          // Error handled silently
        }
      } catch (recordError) {
        // Error handled
      }

      // --- MATRICULA REWARDS - TRACKING DE STATUS ---
      try {
        // Buscar se o usuário usou algum código de referência
        const { data: usedCode, error: codeError } = await supabase.from(
          "used_referral_codes",
        ).select("referrer_id, affiliate_code").eq("user_id", userId).single();
        
        if (!codeError && usedCode) {
          // ✅ NOVO: Atualizar status ao invés de creditar coins
          try {
            await supabase.rpc("update_referral_status", {
              p_referred_user_id: userId,
              p_new_status: "selection_process_paid",
              p_timestamp: new Date().toISOString(),
            });

            // --- NOTIFICAÇÃO DE PROGRESSO PARA O ALUNO (PADRINHO) ---
            try {
              // Buscar dados do padrinho (referrer)
              const { data: referrerProfile } = await supabase
                .from("user_profiles")
                .select("full_name, email")
                .eq("user_id", usedCode.referrer_id)
                .single();

              // Buscar dados do aluno indicado (referred)
              const { data: referredProfile } = await supabase
                .from("user_profiles")
                .select("full_name, email")
                .eq("user_id", userId)
                .single();

              if (referrerProfile?.email) {
                const progressPayload = {
                  tipo_notf: "Progresso de Indicacao - Selection Process Fee Pago",
                  email_aluno: referrerProfile.email,
                  nome_aluno: referrerProfile.full_name || "Aluno",
                  referred_student_name: referredProfile?.full_name || "Seu amigo",
                  referred_student_email: referredProfile?.email || "",
                  payment_method: "Stripe",
                  fee_type: "Selection Process Fee",
                  o_que_enviar: `Good news! Your friend ${
                    referredProfile?.full_name || "someone"
                  } has paid the Selection Process Fee. You'll receive 180 MatriculaCoins when they complete the I20 payment!`,
                };

                await fetch(
                  "https://nwh.suaiden.com/webhook/notfmatriculausa",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "User-Agent": "PostmanRuntime/7.36.3",
                    },
                    body: JSON.stringify(progressPayload),
                  },
                );
              }
            } catch (progressNotifError) {
              console.error(
                "[MATRICULA REWARDS] Erro ao enviar notificação de progresso:",
                progressNotifError,
              );
            }
          } catch (statusError) {
            console.error(
              "[MATRICULA REWARDS] Erro ao atualizar status:",
              statusError,
            );
          }
        }
      } catch (rewardsError) {
        console.error(
          "[MATRICULA REWARDS] Erro ao processar Matricula Rewards:",
          rewardsError,
        );
      }
      // --- FIM MATRICULA REWARDS ---
    }
  }

  if (paymentType === "ds160_package" || paymentType === "i539_cos_package" || paymentType === "reinstatement_package") {
    const finalUserId = metadata?.user_id || metadata?.student_id || metadata?.client_reference_id || session.client_reference_id;
    
    if (finalUserId) {
      console.log(`[stripe-webhook] Processing ${paymentType} for user: ${finalUserId}`);
      const paymentMethod = metadata?.payment_method || "stripe";
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (paymentType === "ds160_package") {
        updateData.has_paid_ds160_package = true;
        updateData.ds160_package_payment_method = paymentMethod;
      } else if (paymentType === "i539_cos_package") {
        updateData.has_paid_i539_cos_package = true;
        updateData.i539_cos_package_payment_method = paymentMethod;
      } else if (paymentType === "reinstatement_package") {
        updateData.has_paid_reinstatement_package = true;
        updateData.reinstatement_package_payment_method = paymentMethod;
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("user_id", finalUserId);

      if (profileError) {
        console.error(`[stripe-webhook] Error updating profile for ${paymentType}:`, profileError);
      } else {
        console.log(`[stripe-webhook] ${paymentType} profile updated successfully for user:`, finalUserId);
      }

      // Registrar pagamento na individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || "USD";
        const paymentIntentId = session.payment_intent as string || "";

        const stripeInfo = await getStripeBalanceTransaction(
          stripe,
          paymentIntentId,
          paymentAmountRaw,
          currency
        );

        const { error: insertError } = await supabase.rpc("insert_individual_fee_payment", {
          p_user_id: finalUserId,
          p_fee_type: paymentType,
          p_amount: stripeInfo.amount,
          p_payment_date: paymentDate,
          p_payment_method: "stripe",
          p_payment_intent_id: paymentIntentId,
          p_stripe_charge_id: null,
          p_zelle_payment_id: null,
          p_gross_amount_usd: stripeInfo.gross_amount_usd,
          p_fee_amount_usd: stripeInfo.fee_amount_usd,
        });
        
        if (insertError) console.error(`[stripe-webhook] Error inserting payment record for ${paymentType}:`, insertError);
        else console.log(`[stripe-webhook] ${paymentType} payment record inserted successfully.`);
      } catch (recordError) {
        console.error(`[stripe-webhook] Exception recording ${paymentType} payment:`, recordError);
      }

      // Log da ação do estudante
      try {
        const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('user_id', finalUserId).single();
        if (userProfile) {
          await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `${paymentType} payment verified via Stripe`,
            p_performed_by: finalUserId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: paymentType,
              payment_method: paymentMethod,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              session_id: sessionId,
              payment_intent_id: session.payment_intent as string || ""
            }
          });
        }
      } catch (logErr) {
        console.error('[stripe-webhook] Log error:', logErr);
      }
    } else {
      console.error(`[stripe-webhook] No userId found for ${paymentType} processing.`);
    }
  }
  // BLOCO DUPLICADO REMOVIDO - i20_control_fee já é processado nas linhas 1528-1615
  // Este bloco estava causando duplicação de créditos de MatriculaCoins (trigger executado 2x)

  // Marcar o processamento como concluído no log (para evitar que race conditions futuras o ignorem)
  try {
    const { data: winnerLogs } = await supabase
      .from("student_action_logs")
      .select("id, metadata")
      .eq("action_type", "checkout_session_processed")
      .eq("metadata->>session_id", sessionId)
      .eq("metadata->>process_tag", process_tag)
      .limit(1);

    if (winnerLogs && winnerLogs.length > 0) {
      await supabase.from("student_action_logs").update({
        metadata: {
          ...winnerLogs[0].metadata,
          processing_completed: true,
          completed_at: new Date().toISOString(),
        },
      }).eq("id", winnerLogs[0].id);
      console.log(
        `[stripe-webhook] ✅ Webhook processado com sucesso para session ${sessionId}.`,
      );
    }
  } catch (finalLogError) {
    console.error(
      "[stripe-webhook] Erro ao marcar log como concluído:",
      finalLogError,
    );
  }

  return new Response(
    JSON.stringify({ received: true, status: "success", tag: process_tag }),
    { status: 200 },
  );
}
