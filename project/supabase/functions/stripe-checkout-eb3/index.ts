// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'MatriculaUSA EB-3 Integration',
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

    const { success_url, cancel_url, metadata = {}, email, name } = await req.json();
    
    // Para EB-3, permitir pagamento sem autenticação obrigatória
    let user = null;
    let userProfile = null;
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && authUser) {
        user = authUser;
        
        // Busca o perfil do usuário se autenticado
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, user_id, first_name, last_name, email')
          .eq('user_id', user.id)
          .single();

        if (!profileError && profileData) {
          userProfile = profileData;
        }
      }
    }

    console.log('[stripe-checkout-eb3] Received payload:', { success_url, cancel_url, metadata, email, name });

    // Metadata da sessão
    const sessionMetadata = {
      payment_type: 'eb3_pre_candidatura',
      service: 'Pré Candidatura Vagas EB3',
      ...(user && { student_id: user.id }),
      ...(userProfile && { user_profile_id: userProfile.id }),
      ...(email && { customer_email: email }),
      ...(name && { customer_name: name }),
      ...metadata,
    };

    // Cria a sessão de checkout do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      ...(user && { client_reference_id: user.id }),
      customer_email: user?.email || email,
      line_items: [
        {
          price: 'price_1S8lZcKdCh3y3bmYEIffe1Hy', // Preço fixo para EB-3
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${req.headers.get('origin')}/eb3-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/eb3-jobs`,
      metadata: sessionMetadata,
      // Configurações específicas para EB-3
      payment_intent_data: {
        description: 'Pré Candidatura Vagas EB3 - MatriculaUSA',
        metadata: sessionMetadata,
      },
      // Permite promo codes se necessário
      allow_promotion_codes: true,
    });

    console.log('[stripe-checkout-eb3] Created Stripe session:', {
      session_id: session.id,
      metadata: session.metadata,
    });

    return corsResponse({ 
      session_url: session.url,
      session_id: session.id 
    }, 200);
  } catch (error) {
    console.error('[stripe-checkout-eb3] Error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
