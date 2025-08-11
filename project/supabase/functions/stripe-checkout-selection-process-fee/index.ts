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

    console.log('[stripe-checkout-selection-process-fee] Received payload:', { price_id, success_url, cancel_url, mode, metadata });

    // Monta o metadata mínimo
    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'selection_process',
      origem: 'site',
      ...metadata,
    };

    // NOVO: Verificar se usuário tem desconto ativo
    let activeDiscount = null;
    try {
      console.log('[stripe-checkout-selection-process-fee] 🎯 VERIFICANDO DESCONTO PARA USUÁRIO');
      console.log('[stripe-checkout-selection-process-fee] User ID:', user.id);
      console.log('[stripe-checkout-selection-process-fee] User Email:', user.email);
      
      const { data: discountData, error: discountError } = await supabase
        .rpc('get_user_active_discount', {
          user_id_param: user.id
        });

      console.log('[stripe-checkout-selection-process-fee] 📊 Resultado da consulta de desconto:');
      console.log('[stripe-checkout-selection-process-fee] Data:', discountData);
      console.log('[stripe-checkout-selection-process-fee] Error:', discountError);

      if (discountError) {
        console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao buscar desconto:', discountError);
      } else if (discountData && discountData.has_discount) {
        activeDiscount = discountData;
        console.log('[stripe-checkout-selection-process-fee] ✅ Desconto ativo encontrado!');
        console.log('[stripe-checkout-selection-process-fee] Coupon ID:', activeDiscount.stripe_coupon_id);
        console.log('[stripe-checkout-selection-process-fee] Discount Amount:', activeDiscount.discount_amount);
        console.log('[stripe-checkout-selection-process-fee] Affiliate Code:', activeDiscount.affiliate_code);
      } else {
        console.log('[stripe-checkout-selection-process-fee] ⚠️ Nenhum desconto ativo encontrado para o usuário');
      }
    } catch (error) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao verificar desconto:', error);
    }

    // Configuração da sessão Stripe
    const sessionConfig: any = {
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
      // NOVO: Exibir campo de promoção no Checkout Stripe
      allow_promotion_codes: true,
    };

    // Aplica desconto se houver (além do campo manual de promoção)
    if (activeDiscount && activeDiscount.stripe_coupon_id) {
      console.log('[stripe-checkout-selection-process-fee] 🎯 APLICANDO DESCONTO');
      console.log('[stripe-checkout-selection-process-fee] Coupon ID:', activeDiscount.stripe_coupon_id);
      console.log('[stripe-checkout-selection-process-fee] Discount Amount:', activeDiscount.discount_amount);
      
      sessionConfig.discounts = [{ coupon: activeDiscount.stripe_coupon_id }];
      
      sessionMetadata.referral_discount = true;
      sessionMetadata.affiliate_code = activeDiscount.affiliate_code;
      sessionMetadata.referrer_id = activeDiscount.referrer_id;
      sessionMetadata.discount_amount = activeDiscount.discount_amount;
      
      console.log('[stripe-checkout-selection-process-fee] ✅ Desconto aplicado na sessão!');
    } else {
      console.log('[stripe-checkout-selection-process-fee] ⚠️ Nenhum desconto para aplicar');
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('[stripe-checkout-selection-process-fee] Created Stripe session with metadata:', session.metadata);

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('Checkout error:', error);
    return corsResponse({ error: 'Failed to create checkout session' }, 500);
  }
}); 