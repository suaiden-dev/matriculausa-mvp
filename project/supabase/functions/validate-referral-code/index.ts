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
  if (status === 204) return new Response(null, { status, headers });
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

    // Criar/garantir o cupom genérico no Stripe (id: MATR_<code>) e Promotion Code visível (o próprio código)
    try {
      const couponId = result.stripe_coupon_id; // MATR_<CODE>
      const discountAmount = result.discount_amount;

      // Recupera ou cria cupom
      let coupon;
      try { coupon = await stripe.coupons.retrieve(couponId); } catch { coupon = null; }
      if (!coupon) {
        coupon = await stripe.coupons.create({
          id: couponId,
          amount_off: discountAmount * 100,
          currency: 'usd',
          duration: 'once',
          name: `Matricula Rewards - ${normalized}`,
          metadata: { affiliate_code: normalized, user_id: user.id, referrer_id: result.referrer_id }
        });
      }

      // Promotion Code com o mesmo texto do código
      const promoList = await stripe.promotionCodes.list({ code: normalized, limit: 1 });
      if (!promoList.data.length) {
        await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: normalized,
          active: true,
          metadata: { affiliate_code: normalized }
        });
      }

      console.log('[validate-referral-code] ✅ Coupon & Promotion Code ok:', couponId, normalized);
    } catch (stripeError: any) {
      console.error('[validate-referral-code] Stripe error:', stripeError?.message || stripeError);
      // continua retornando success para não travar a UX; o desconto já fica associado ao usuário
    }

    return corsResponse({ success: true });
  } catch (error) {
    console.error('validate-referral-code error:', error);
    return corsResponse({ success: false, error: 'Failed to validate code' }, 200);
  }
});
