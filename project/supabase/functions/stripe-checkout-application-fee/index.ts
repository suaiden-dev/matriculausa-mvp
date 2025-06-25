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

    // Monta o metadata mínimo
    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'application_fee',
      ...metadata,
    };

    // Garantir que existe registro em scholarship_applications
    let applicationId = metadata?.selected_scholarship_id;
    if (applicationId) {
      // Verifica se já existe aplicação para o aluno e bolsa
      const { data: existing, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', user.id)
        .eq('scholarship_id', applicationId)
        .maybeSingle();
      if (fetchError) {
        console.error('[stripe-checkout-application-fee] Erro ao buscar aplicação:', fetchError);
      }
      if (!existing) {
        // Cria nova aplicação
        const { data: created, error: insertError } = await supabase
          .from('scholarship_applications')
          .insert({
            student_id: user.id,
            scholarship_id: applicationId,
            status: 'pending',
            applied_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (insertError) {
          console.error('[stripe-checkout-application-fee] Erro ao criar aplicação:', insertError);
        } else {
          console.log('[stripe-checkout-application-fee] Aplicação criada:', created);
        }
      } else {
        console.log('[stripe-checkout-application-fee] Aplicação já existe:', existing);
      }
    } else {
      console.warn('[stripe-checkout-application-fee] selected_scholarship_id não informado no metadata.');
    }

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