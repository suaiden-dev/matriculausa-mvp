import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

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
    if (req.method === 'OPTIONS') return corsResponse(null, 204);

    const { coupon_code, fee_type, original_amount, discount_amount, final_amount } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ success: false, error: 'No authorization header' }, 200);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return corsResponse({ success: false, error: 'Invalid token' }, 200);

    const normalizedCode = String(coupon_code || '').trim().toUpperCase();
    console.log('[record-promotional-coupon-validation] Registrando validação do cupom:', normalizedCode, 'para user:', user.id, 'fee_type:', fee_type);
    
    if (!normalizedCode) return corsResponse({ success: false, error: 'Código do cupom é obrigatório' }, 200);
    if (!fee_type) return corsResponse({ success: false, error: 'Tipo de taxa é obrigatório' }, 200);
    if (!original_amount || !discount_amount || !final_amount) {
      return corsResponse({ success: false, error: 'Valores de desconto são obrigatórios' }, 200);
    }

    // Normalizar fee_type
    const normalizedFeeType = fee_type === 'i20_control_fee' ? 'i20_control' : fee_type;

    // Registrar uso do cupom (validação pré-pagamento)
    // Usar 'stripe' como payment_method temporário, será atualizado quando o pagamento for confirmado
    const { error: insertError } = await supabase
      .from('promotional_coupon_usage')
      .insert({
        user_id: user.id,
        coupon_code: normalizedCode,
        fee_type: normalizedFeeType,
        payment_id: `validation_${Date.now()}_${user.id}`, // ID temporário para validação
        payment_method: 'stripe', // Valor temporário, será atualizado quando o pagamento for confirmado
        original_amount: parseFloat(original_amount.toString()),
        discount_amount: parseFloat(discount_amount.toString()),
        final_amount: parseFloat(final_amount.toString()),
        metadata: {
          is_validation: true, // Flag para indicar que é uma validação pré-pagamento
          validated_at: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error('[record-promotional-coupon-validation] Erro ao registrar validação:', insertError);
      return corsResponse({ success: false, error: 'Erro ao registrar validação do cupom' }, 200);
    }

    console.log('[record-promotional-coupon-validation] ✅ Validação do cupom registrada com sucesso!');
    return corsResponse({ success: true, message: 'Validação registrada com sucesso' });
  } catch (error) {
    console.error('record-promotional-coupon-validation error:', error);
    return corsResponse({ success: false, error: 'Failed to record coupon validation' }, 200);
  }
});

