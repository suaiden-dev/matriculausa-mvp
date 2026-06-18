// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function corsResponse(body: object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(null, 204);

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ error: 'No authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return corsResponse({ error: 'Invalid token' }, 401);

    // ── Parse body ────────────────────────────────────────────────────────
    const { translation_order_id, success_url, cancel_url } = await req.json();

    if (!translation_order_id) {
      return corsResponse({ error: 'Missing translation_order_id' }, 400);
    }
    if (!success_url || !cancel_url) {
      return corsResponse({ error: 'Missing success_url or cancel_url' }, 400);
    }

    // ── Fetch translation order (must belong to this user) ────────────────
    const { data: order, error: orderError } = await supabase
      .from('translation_orders')
      .select('id, user_id, original_filename, document_type, total_price, payment_status, source_language, target_language')
      .eq('id', translation_order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return corsResponse({ error: 'Translation order not found or access denied' }, 404);
    }

    if (order.payment_status === 'paid') {
      return corsResponse({ error: 'Order already paid' }, 400);
    }

    // ── Stripe setup ──────────────────────────────────────────────────────
    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, {
      appInfo: { name: 'MatriculaUSA Integration', version: '1.0.0' },
    });

    console.log(`[stripe-checkout-translation] Using Stripe in ${config.environment.environment} mode`);
    console.log(`[stripe-checkout-translation] Order ${order.id} — $${order.total_price} — ${order.document_type}`);

    const DOC_TYPE_LABELS: Record<string, string> = {
      certified:      'Tradução Certificada',
      notarized:      'Tradução Juramentada',
      bank_statement: 'Extrato Bancário',
    };
    const docLabel = DOC_TYPE_LABELS[order.document_type] || order.document_type;

    // Use same fee formula as calculateCardAmountWithFees (stripe-fee-calculator.ts):
    // Stripe card rate: 3.9% + $0.30 (covers international cards)
    // Formula: grossAmount = (netAmount + 0.30) / (1 - 0.039)
    const baseAmount = order.total_price; // USD net amount
    const STRIPE_RATE = 0.039;
    const STRIPE_FIXED = 0.30;
    const grossAmount = Math.round(((baseAmount + STRIPE_FIXED) / (1 - STRIPE_RATE)) * 100); // cents

    // ── Create Checkout Session ───────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tradução — ${docLabel}`,
              description: order.original_filename
                ? `Arquivo: ${order.original_filename} | ${order.source_language} → ${order.target_language}`
                : `${order.source_language} → ${order.target_language}`,
            },
            unit_amount: grossAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: {
        project: 'matricula_usa',
        fee_type: 'translation_fee',
        translation_order_id: order.id,
        user_id: user.id,
        base_amount: baseAmount.toString(),
        gross_amount: (grossAmount / 100).toString(),
      },
    });

    console.log(`[stripe-checkout-translation] Session created: ${session.id}`);

    return corsResponse({ session_url: session.url }, 200);

  } catch (err: any) {
    console.error('[stripe-checkout-translation] Unexpected error:', err);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
