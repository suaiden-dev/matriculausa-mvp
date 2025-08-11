import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceKey);
const stripe = new Stripe(stripeSecret);

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  } as const;
  if (status === 204) return new Response(null, { status, headers });
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
}

async function ensureCouponAndPromo(code: string, discountAmount = 50) {
  const normalized = code.trim().toUpperCase();
  const couponId = `MATR_${normalized}`;

  // Coupon
  let coupon;
  try { coupon = await stripe.coupons.retrieve(couponId); } catch { coupon = null; }
  if (!coupon) {
    coupon = await stripe.coupons.create({
      id: couponId,
      amount_off: discountAmount * 100,
      currency: 'usd',
      duration: 'once',
      name: `Matricula Rewards - ${normalized}`,
      metadata: { affiliate_code: normalized }
    });
  }

  // Promotion Code (visible code that users type)
  const promoList = await stripe.promotionCodes.list({ code: normalized, limit: 1 });
  if (!promoList.data.length) {
    await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: normalized,
      active: true,
      metadata: { affiliate_code: normalized }
    });
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);

    const body = (await req.json().catch(() => ({}))) as { code?: string };

    if (body.code) {
      await ensureCouponAndPromo(body.code);
      return corsResponse({ success: true, synced: 1 });
    }

    const { data, error } = await supabase
      .from('affiliate_codes')
      .select('code, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('[sync-affiliate-codes] DB error:', error);
      return corsResponse({ success: false, error: 'DB error' }, 500);
    }

    let count = 0;
    for (const row of data ?? []) {
      try {
        await ensureCouponAndPromo(row.code);
        count += 1;
      } catch (e) {
        console.error('[sync-affiliate-codes] Failed for', row.code, e);
      }
    }

    return corsResponse({ success: true, synced: count });
  } catch (e) {
    console.error('[sync-affiliate-codes] Error:', e);
    return corsResponse({ success: false, error: 'Unexpected error' }, 500);
  }
});
