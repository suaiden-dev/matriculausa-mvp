import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
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
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    const { success_url, cancel_url, mode, metadata } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    // Price ID fixo para I-20 Control Fee
    const price_id = 'price_1RbSjQKdCh3y3bmYQdmGvtpk';

    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'i20_control_fee',
      ...metadata,
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: mode || 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: sessionMetadata,
    });

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('Checkout error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
}); 