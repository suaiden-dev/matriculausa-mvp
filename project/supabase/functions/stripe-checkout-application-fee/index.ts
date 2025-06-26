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

    const { price_id, success_url, cancel_url, mode, metadata } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[stripe-checkout-application-fee] Received payload:', { price_id, success_url, cancel_url, mode, metadata });

    // Verifica se application_id foi fornecido
    const applicationId = metadata?.application_id;
    if (!applicationId) {
      return corsResponse({ error: 'Application ID is required in metadata' }, 400);
    }

    // Verifica se a aplicação existe e pertence ao usuário
    const { data: application, error: appError } = await supabase
      .from('scholarship_applications')
      .select('id, student_id')
      .eq('id', applicationId)
      .eq('student_id', user.id)
      .single();

    if (appError || !application) {
      console.error('[stripe-checkout-application-fee] Application not found:', appError);
      return corsResponse({ error: 'Application not found or access denied' }, 404);
    }

    console.log('[stripe-checkout-application-fee] Application verified:', application.id);

    // Monta o metadata para o Stripe
    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'application_fee',
      application_id: applicationId,
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

    console.log('[stripe-checkout-application-fee] Created Stripe session with metadata:', session.metadata);

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('Checkout error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
}); 