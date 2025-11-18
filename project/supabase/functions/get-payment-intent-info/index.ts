import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    
    // Criar instância do Stripe com a chave correta para o ambiente
    const stripe = new Stripe(config.secretKey, {
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0',
      },
    });

    console.log(`🔧 Using Stripe in ${config.environment.environment} mode`);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    const { payment_intent_id } = await req.json();
    
    if (!payment_intent_id) {
      return corsResponse({ error: 'payment_intent_id is required' }, 400);
    }

    console.log(`[get-payment-intent-info] Buscando Payment Intent: ${payment_intent_id}`);

    try {
      // Buscar Payment Intent do Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
      // Verificar se é PIX
      const isPIX = paymentIntent.currency === 'brl' || paymentIntent.payment_method_types?.includes('pix');
      
      // Buscar Checkout Session para obter exchange_rate e base_amount do metadata
      let exchangeRate: number | null = null;
      let baseAmount: number | null = null;
      let sessionId: string | null = null;
      
      // Tentar buscar via metadata do Payment Intent primeiro
      if (paymentIntent.metadata?.exchange_rate) {
        exchangeRate = parseFloat(paymentIntent.metadata.exchange_rate);
      }
      if (paymentIntent.metadata?.base_amount) {
        baseAmount = parseFloat(paymentIntent.metadata.base_amount);
      }
      if (paymentIntent.metadata?.session_id) {
        sessionId = paymentIntent.metadata.session_id;
      }
      
      // Se não estiver no Payment Intent, buscar Checkout Session
      if (!exchangeRate || !baseAmount) {
        // Buscar sessão via Payment Intent
        try {
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: paymentIntent.id,
            limit: 1
          });
          
          if (sessions.data.length > 0) {
            const session = sessions.data[0];
            sessionId = session.id;
            
            if (session.metadata?.exchange_rate && !exchangeRate) {
              exchangeRate = parseFloat(session.metadata.exchange_rate);
            }
            if (session.metadata?.base_amount && !baseAmount) {
              baseAmount = parseFloat(session.metadata.base_amount);
            }
          }
        } catch (sessionError) {
          console.warn(`[get-payment-intent-info] Erro ao buscar Checkout Session:`, sessionError);
        }
      }

      return corsResponse({
        success: true,
        currency: paymentIntent.currency,
        isPIX: isPIX,
        exchange_rate: exchangeRate,
        base_amount: baseAmount,
        payment_method_types: paymentIntent.payment_method_types,
      }, 200);
    } catch (stripeError: any) {
      console.error(`[get-payment-intent-info] Erro ao buscar Payment Intent:`, stripeError);
      return corsResponse({ 
        error: 'Failed to retrieve payment intent',
        details: stripeError.message 
      }, 500);
    }
  } catch (error: any) {
    console.error(`[get-payment-intent-info] Erro geral:`, error);
    return corsResponse({ 
      error: 'An unexpected error occurred',
      details: error.message 
    }, 500);
  }
});

