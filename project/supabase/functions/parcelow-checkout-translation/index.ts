import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { getParcelowConfig } from "../shared/parcelow/config.ts";
import { getRedirectOrigin } from "../shared/environment-detector.ts";
import { getParcelowAccessToken } from "../shared/parcelow/auth.ts";

// @ts-ignore: Deno is provided by the Supabase runtime
declare const Deno: any;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function corsResponse(body: any, status = 200) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
    "Content-Type": "application/json",
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  try {
    console.log("[parcelow-checkout-translation] 🚀 Iniciando função");

    if (req.method === "OPTIONS") return corsResponse(null, 204);

    const config = getParcelowConfig(req);

    if (!config.clientId || !config.clientSecret) {
      console.error("[parcelow-checkout-translation] ❌ Credenciais Parcelow não configuradas");
      return corsResponse({ error: "Parcelow configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return corsResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[parcelow-checkout-translation] ❌ Erro de autenticação:", authError);
      return corsResponse({ error: "Invalid token" }, 401);
    }

    const { translation_order_id, amount } = await req.json();

    if (!translation_order_id) {
      return corsResponse({ error: "translation_order_id is required" }, 400);
    }

    if (!amount || parseFloat(amount) <= 0) {
      return corsResponse({ error: "amount is required" }, 400);
    }

    const finalAmount = parseFloat(amount);

    console.log("[parcelow-checkout-translation] 📥 Payload:", { translation_order_id, amount: finalAmount });

    // Validar que a translation_order pertence ao usuário
    const { data: order, error: orderError } = await supabase
      .from("translation_orders")
      .select("id, user_id, payment_status")
      .eq("id", translation_order_id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      console.error("[parcelow-checkout-translation] ❌ Pedido não encontrado:", orderError);
      return corsResponse({ error: "Translation order not found" }, 404);
    }

    if (order.payment_status === "paid") {
      return corsResponse({ error: "Order already paid" }, 400);
    }

    // Buscar perfil para CPF e dados do cliente
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("full_name, email, cpf_document, phone")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[parcelow-checkout-translation] ❌ Perfil não encontrado:", profileError);
      return corsResponse({ error: "User profile not found" }, 404);
    }

    const rawCpf = profile.cpf_document;
    const finalCpf = rawCpf ? String(rawCpf).replace(/\D/g, "") : null;

    if (!finalCpf || finalCpf.length < 11) {
      console.error("[parcelow-checkout-translation] ❌ CPF não encontrado no perfil");
      return corsResponse({
        error: "document_number_required",
        message: "CPF is required for Parcelow payment. Please update your profile with a valid CPF.",
      }, 400);
    }

    const accessToken = await getParcelowAccessToken(config);

    const reference = `translation_${Date.now()}`;
    const origin = getRedirectOrigin(req);

    const redirectSuccess = `${origin}/student/dashboard/translations?payment=success&order=${translation_order_id}`;
    const redirectFailed = `${origin}/student/dashboard/translations?payment=cancelled`;

    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/parcelow-webhook`;

    const amountInCents = Math.round(finalAmount * 100);

    const orderPayload = {
      reference,
      items: [{
        reference,
        description: "Payment for Document Translation",
        quantity: 1,
        amount: amountInCents,
      }],
      client: {
        name: profile.full_name,
        email: (() => {
          const email = profile.email;
          const isSandbox = config.apiBaseUrl.includes("sandbox");
          if (isSandbox && email) {
            const [userPart, domainPart] = email.split("@");
            return `${userPart}+${Date.now()}@${domainPart}`;
          }
          return email;
        })(),
        cpf: finalCpf,
        phone: (profile.phone || "").replace(/\D/g, ""),
        is_diferent_card_address: 0,
        address_street: "",
        address_number: 0,
        address_neighborhood: "",
        address_city: "",
        address_state: "",
        cep: "",
        address_complement: "",
        card_address_cep: "",
        card_address_street: "",
        card_address_number: 0,
        card_address_neighborhood: "",
        card_address_city: "",
        card_address_state: "",
        card_address_complement: "",
      },
      redirect: {
        success: redirectSuccess,
        failed: redirectFailed,
      },
      notify_url: webhookUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: user.id,
        fee_type: "translation",
        translation_order_id,
        timestamp: Date.now().toString(),
      },
    };

    console.log("[parcelow-checkout-translation] 🛒 Criando pedido na Parcelow...");

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
      console.error("[parcelow-checkout-translation] ❌ Erro ao criar pedido:", errorText);
      return corsResponse({ error: "Failed to create Parcelow order", details: errorText }, 500);
    }

    const parcelowOrder = await orderResponse.json();

    if (parcelowOrder.success === false) {
      console.error("[parcelow-checkout-translation] ❌ Parcelow retornou erro:", parcelowOrder.message);
      return corsResponse({
        error: "parcelow_api_error",
        message: parcelowOrder.message || "Erro desconhecido na API da Parcelow",
        response: parcelowOrder,
      }, 400);
    }

    const checkoutUrl = parcelowOrder.data?.url_checkout || parcelowOrder.checkout_url || parcelowOrder.url;
    const orderId = parcelowOrder.data?.order_id || parcelowOrder.order_id || parcelowOrder.id;

    if (!checkoutUrl) {
      console.error("[parcelow-checkout-translation] ❌ checkout_url não retornado pela Parcelow");
      return corsResponse({ error: "Invalid Parcelow response" }, 500);
    }

    console.log("[parcelow-checkout-translation] ✅ Pedido criado:", orderId);

    return corsResponse({ checkout_url: checkoutUrl }, 200);
  } catch (error: any) {
    console.error("[parcelow-checkout-translation] ❌ Erro geral:", error);
    return corsResponse({ error: "Internal server error", details: error.message }, 500);
  }
});
