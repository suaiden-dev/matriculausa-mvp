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

    // ✅ CORREÇÃO: Passar email_param para evitar ambiguidade entre as duas versões da função
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_and_apply_referral_code', {
        user_id_param: user.id,
        affiliate_code_param: normalized,
        email_param: user.email || null
      });

    if (validationError) {
      console.error('[validate-referral-code] Database error:', JSON.stringify(validationError, null, 2));
      // Se o erro contém uma mensagem, usar ela; caso contrário, usar mensagem genérica
      const errorMessage = validationError.message || validationError.details || 'Erro ao validar código';
      return corsResponse({ success: false, error: errorMessage }, 200);
    }

    // Se validationResult é null ou undefined, pode ser um erro silencioso
    if (!validationResult) {
      console.error('[validate-referral-code] No result returned from RPC function');
      return corsResponse({ success: false, error: 'Erro ao validar código - nenhum resultado retornado' }, 200);
    }

    const result = validationResult as any;
    console.log('[validate-referral-code] RPC result:', JSON.stringify(result, null, 2));
    
    if (!result?.success) {
      const errorMessage = result?.error || 'Código inválido';
      console.error('[validate-referral-code] Validation failed:', errorMessage);
      return corsResponse({ success: false, error: errorMessage }, 200);
    }

    // O desconto depende do role do referenciador (veja migrate role_aware_affiliate_discount):
    // role='student' → $50, role='affiliate' → $0. O valor é gravado em used_referral_codes pelo RPC.
    console.log('[validate-referral-code] ✅ Código validado e indicação registrada:', normalized, '| discount_amount:', result.discount_amount);

    return corsResponse({ success: true, discount_amount: result.discount_amount ?? 0 });
  } catch (error) {
    console.error('validate-referral-code error:', error);
    return corsResponse({ success: false, error: 'Failed to validate code' }, 200);
  }
});
