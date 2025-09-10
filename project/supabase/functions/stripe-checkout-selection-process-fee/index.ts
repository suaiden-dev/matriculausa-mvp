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
    console.log('[stripe-checkout-selection-process-fee] 🚀 Iniciando função');
    
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Verificar se as variáveis de ambiente estão configuradas
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      console.error('[stripe-checkout-selection-process-fee] ❌ STRIPE_SECRET_KEY não configurada');
      return corsResponse({ error: 'Stripe configuration error' }, 500);
    }

    if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Variáveis do Supabase não configuradas');
      return corsResponse({ error: 'Supabase configuration error' }, 500);
    }

    console.log('[stripe-checkout-selection-process-fee] ✅ Variáveis de ambiente verificadas');

    const { price_id, success_url, cancel_url, mode, metadata } = await req.json();
    
    console.log('[stripe-checkout-selection-process-fee] 📥 Payload recebido:', { price_id, success_url, cancel_url, mode, metadata });
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Header de autorização não encontrado');
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[stripe-checkout-selection-process-fee] 🔑 Token extraído, verificando usuário...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Erro de autenticação:', authError);
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[stripe-checkout-selection-process-fee] ✅ Usuário autenticado:', user.id);

    // Monta o metadata mínimo
    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'selection_process',
      origem: 'site',
      ...metadata,
    };

    console.log('[stripe-checkout-selection-process-fee] �� Metadata da sessão:', sessionMetadata);

    // Verificar se usuário tem desconto ativo
    let activeDiscount = null;
    try {
      console.log('[stripe-checkout-selection-process-fee] �� VERIFICANDO DESCONTO PARA USUÁRIO');
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
    };

    console.log('[stripe-checkout-selection-process-fee] ⚙️ Configuração da sessão Stripe:', sessionConfig);

    // Aplica desconto se houver
    if (activeDiscount && activeDiscount.stripe_coupon_id) {
      console.log('[stripe-checkout-selection-process-fee] �� APLICANDO DESCONTO');
      console.log('[stripe-checkout-selection-process-fee] Coupon ID:', activeDiscount.stripe_coupon_id);
      console.log('[stripe-checkout-selection-process-fee] Discount Amount:', activeDiscount.discount_amount);
      
      // Verificar se o cupom existe no Stripe antes de usar
      let couponExists = false;
      try {
        await stripe.coupons.retrieve(activeDiscount.stripe_coupon_id);
        couponExists = true;
        console.log('[stripe-checkout-selection-process-fee] ✅ Cupom existe no Stripe');
      } catch (couponError: any) {
        console.log('[stripe-checkout-selection-process-fee] ⚠️ Cupom não existe no Stripe:', couponError.message);
        
        // Se o cupom não existe, criar um novo
        try {
          console.log('[stripe-checkout-selection-process-fee] 🔧 Criando novo cupom no Stripe...');
          const newCoupon = await stripe.coupons.create({
            id: activeDiscount.stripe_coupon_id,
            amount_off: activeDiscount.discount_amount * 100,
            currency: 'usd',
            duration: 'once',
            name: `Matricula Rewards - ${activeDiscount.affiliate_code}`,
            metadata: { 
              affiliate_code: activeDiscount.affiliate_code, 
              user_id: user.id, 
              referrer_id: activeDiscount.referrer_id 
            }
          });
          
          console.log('[stripe-checkout-selection-process-fee] ✅ Novo cupom criado:', newCoupon.id);
          couponExists = true;
        } catch (createError: any) {
          console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao criar cupom:', createError.message);
          // Se não conseguir criar o cupom, continua sem desconto
        }
      }
      
      if (couponExists) {
        sessionConfig.discounts = [{ coupon: activeDiscount.stripe_coupon_id }];
        // Remove allow_promotion_codes quando há desconto aplicado
        delete sessionConfig.allow_promotion_codes;
        
        sessionMetadata.referral_discount = true;
        sessionMetadata.affiliate_code = activeDiscount.affiliate_code;
        sessionMetadata.referrer_id = activeDiscount.referrer_id;
        sessionMetadata.discount_amount = activeDiscount.discount_amount;
        
        console.log('[stripe-checkout-selection-process-fee] ✅ Desconto aplicado na sessão!');
        console.log('[stripe-checkout-selection-process-fee] 📋 Metadata atualizada:', sessionMetadata);
      } else {
        console.log('[stripe-checkout-selection-process-fee] ⚠️ Não foi possível aplicar desconto - cupom não disponível');
      }
    } else {
      console.log('[stripe-checkout-selection-process-fee] ⚠️ Nenhum desconto para aplicar');
      // Códigos promocionais removidos - não permitir entrada manual de cupons
    }

    console.log('[stripe-checkout-selection-process-fee] 🚀 Criando sessão do Stripe...');
    
    try {
      const session = await stripe.checkout.sessions.create(sessionConfig);
      console.log('[stripe-checkout-selection-process-fee] ✅ Sessão Stripe criada com sucesso!');
      console.log('[stripe-checkout-selection-process-fee] Session ID:', session.id);
      console.log('[stripe-checkout-selection-process-fee] Session URL:', session.url);
      console.log('[stripe-checkout-selection-process-fee] Metadata da sessão:', session.metadata);

      return corsResponse({ session_url: session.url }, 200);
    } catch (stripeError: any) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao criar sessão Stripe:', stripeError);
      console.error('[stripe-checkout-selection-process-fee] Stripe Error Type:', stripeError.type);
      console.error('[stripe-checkout-selection-process-fee] Stripe Error Message:', stripeError.message);
      console.error('[stripe-checkout-selection-process-fee] Stripe Error Code:', stripeError.code);
      
      return corsResponse({ 
        error: 'Failed to create Stripe checkout session',
        details: stripeError.message,
        code: stripeError.code 
      }, 500);
    }

  } catch (error: any) {
    console.error('[stripe-checkout-selection-process-fee] ❌ Erro geral na função:', error);
    console.error('[stripe-checkout-selection-process-fee] Error Stack:', error.stack);
    console.error('[stripe-checkout-selection-process-fee] Error Message:', error.message);
    
    return corsResponse({ 
      error: 'Internal server error',
      details: error.message 
    }, 500);
  }
});