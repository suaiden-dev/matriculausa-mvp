import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (status === 204) return corsResponse(null, 204);
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);

    const { affiliate_code } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ success: false, error: 'No authorization header' }, 200);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return corsResponse({ success: false, error: 'Invalid token' }, 200);

    const normalized = String(affiliate_code || '').trim().toUpperCase();
    console.log('[validate-referral-code] Validating code:', normalized, 'for user:', user.id);
    if (!normalized) return corsResponse({ success: false, error: 'Código de referência é obrigatório' }, 200);

    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_and_apply_referral_code', {
        user_id_param: user.id,
        affiliate_code_param: normalized
      });

    if (validationError) {
      console.error('[validate-referral-code] Database error:', validationError);
      return corsResponse({ success: false, error: 'Erro ao validar código' }, 200);
    }

    const result = validationResult as any;
    if (!result?.success) {
      return corsResponse({ success: false, error: result?.error || 'Código inválido' }, 200);
    }

    // Criar cupom no Stripe com ID válido
    try {
      const discountAmount = result.discount_amount;
      const couponName = `Matricula Rewards - ${normalized}`;
      
      // Criar cupom no Stripe (Stripe gera o ID automaticamente)
      const coupon = await stripe.coupons.create({
        amount_off: discountAmount * 100,
        currency: 'usd',
        duration: 'once',
        name: couponName,
        metadata: { 
          affiliate_code: normalized, 
          user_id: user.id, 
          referrer_id: result.referrer_id 
        }
      });

      // Atualizar o registro na base de dados com o ID real do cupom
      const { error: updateError } = await supabase
        .from('used_referral_codes')
        .update({ 
          stripe_coupon_id: coupon.id,
          status: 'applied'
        })
        .eq('user_id', user.id)
        .eq('affiliate_code', normalized);

      if (updateError) {
        console.error('[validate-referral-code] Error updating coupon ID:', updateError);
      }

      // Criar Promotion Code com o próprio código de referência
      try {
        await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: normalized,
          active: true,
          metadata: { affiliate_code: normalized }
        });
      } catch (promoError: any) {
        // Se já existe, não é problema
        if (promoError.code !== 'resource_already_exists') {
          console.error('[validate-referral-code] Promotion code error:', promoError);
        }
      }

      console.log('[validate-referral-code] ✅ Coupon created successfully:', coupon.id, 'for code:', normalized);
    } catch (stripeError: any) {
      console.error('[validate-referral-code] Stripe error:', stripeError?.message || stripeError);
      // Continua retornando success para não travar a UX
    }

    return corsResponse({ success: true });
  } catch (error) {
    console.error('validate-referral-code error:', error);
    return corsResponse({ success: false, error: 'Failed to validate code' }, 200);
  }
});
