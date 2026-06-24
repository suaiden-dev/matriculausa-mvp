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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") return corsResponse(null, 204);

    const config = getParcelowConfig(req);
    if (!config.clientId || !config.clientSecret) {
      return corsResponse({ error: "Parcelow configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsResponse({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return corsResponse({ error: "Invalid token" }, 401);

    const { translation_order_ids, amount } = await req.json();

    if (!Array.isArray(translation_order_ids) || translation_order_ids.length === 0) {
      return corsResponse({ error: "translation_order_ids must be a non-empty array" }, 400);
    }
    if (!amount || parseFloat(amount) <= 0) {
      return corsResponse({ error: "amount is required" }, 400);
    }

    // Validate all orders belong to this user
    const { data: orders, error: ordersError } = await supabase
      .from("translation_orders")
      .select("id, user_id, payment_status")
      .in("id", translation_order_ids)
      .eq("user_id", user.id);

    if (ordersError || !orders || orders.length !== translation_order_ids.length) {
      return corsResponse({ error: "One or more translation orders not found or access denied" }, 404);
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("full_name, email, cpf_document, phone")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return corsResponse({ error: "User profile not found" }, 404);
    }

    const finalCpf = profile.cpf_document ? String(profile.cpf_document).replace(/\D/g, "") : null;
    if (!finalCpf || finalCpf.length < 11) {
      return corsResponse({
        error: "document_number_required",
        message: "CPF is required for Parcelow payment. Please update your profile with a valid CPF.",
      }, 400);
    }

    const accessToken = await getParcelowAccessToken(config);
    const finalAmount = parseFloat(amount);
    const reference = `translation_batch_${Date.now()}`;
    const origin = getRedirectOrigin(req);
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/parcelow-webhook`;

    const orderPayload = {
      reference,
      items: [{
        reference,
        description: `Tradução de ${translation_order_ids.length} ${translation_order_ids.length === 1 ? 'documento' : 'documentos'}`,
        quantity: 1,
        amount: Math.round(finalAmount * 100),
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
        success: `${origin}/student/dashboard/translations?payment=success`,
        failed: `${origin}/student/dashboard/translations?payment=cancelled`,
      },
      notify_url: webhookUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: user.id,
        fee_type: "translation_batch",
        translation_order_ids: translation_order_ids.join(","),
        timestamp: Date.now().toString(),
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
      console.error("[parcelow-checkout-translation-batch] Error:", errorText);
      return corsResponse({ error: "Failed to create Parcelow order", details: errorText }, 500);
    }

    const parcelowOrder = await orderResponse.json();

    if (parcelowOrder.success === false) {
      return corsResponse({
        error: "parcelow_api_error",
        message: parcelowOrder.message || "Erro desconhecido na API da Parcelow",
      }, 400);
    }

    const checkoutUrl = parcelowOrder.data?.url_checkout || parcelowOrder.checkout_url || parcelowOrder.url;
    if (!checkoutUrl) {
      return corsResponse({ error: "Invalid Parcelow response" }, 500);
    }

    console.log(`[parcelow-checkout-translation-batch] Order created for ${translation_order_ids.length} orders`);
    return corsResponse({ checkout_url: checkoutUrl }, 200);

  } catch (error: any) {
    console.error("[parcelow-checkout-translation-batch] Error:", error);
    return corsResponse({ error: "Internal server error", details: error.message }, 500);
  }
});
