// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';
// @ts-ignore
declare const Deno: any;

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ error: 'No authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return corsResponse({ error: 'Invalid token' }, 401);

    const { translation_order_ids, success_url, cancel_url } = await req.json();

    if (!Array.isArray(translation_order_ids) || translation_order_ids.length === 0) {
      return corsResponse({ error: 'translation_order_ids must be a non-empty array' }, 400);
    }
    if (!success_url || !cancel_url) {
      return corsResponse({ error: 'Missing success_url or cancel_url' }, 400);
    }

    // Fetch all orders — must all belong to this user and be unpaid
    const { data: orders, error: ordersError } = await supabase
      .from('translation_orders')
      .select('id, user_id, original_filename, document_type, total_price, payment_status')
      .in('id', translation_order_ids)
      .eq('user_id', user.id);

    if (ordersError || !orders || orders.length !== translation_order_ids.length) {
      return corsResponse({ error: 'One or more translation orders not found or access denied' }, 404);
    }

    const alreadyPaid = orders.find(o => o.payment_status === 'paid');
    if (alreadyPaid) {
      return corsResponse({ error: `Order ${alreadyPaid.id} is already paid` }, 400);
    }

    const baseAmount = orders.reduce((sum, o) => sum + Number(o.total_price), 0);

    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, {
      appInfo: { name: 'MatriculaUSA Integration', version: '1.0.0' },
    });

    const STRIPE_RATE = 0.039;
    const STRIPE_FIXED = 0.30;
    const grossAmount = Math.round(((baseAmount + STRIPE_FIXED) / (1 - STRIPE_RATE)) * 100); // cents

    const docCount = orders.length;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tradução — ${docCount} ${docCount === 1 ? 'documento' : 'documentos'}`,
              description: orders.map(o => o.original_filename || o.document_type).join(', '),
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
        fee_type: 'translation_batch',
        translation_order_ids: translation_order_ids.join(','),
        user_id: user.id,
        base_amount: baseAmount.toString(),
        gross_amount: (grossAmount / 100).toString(),
      },
    });

    console.log(`[stripe-checkout-translation-batch] Session ${session.id} for ${docCount} orders — $${(grossAmount / 100).toFixed(2)}`);

    return corsResponse({ session_url: session.url }, 200);

  } catch (err: any) {
    console.error('[stripe-checkout-translation-batch] Error:', err);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
