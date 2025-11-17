import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type ValidateRequest = {
  coupon_code?: string;
  fee_type?: string;
  purchase_amount?: number;
};

type ValidateResponse =
  | {
      success: true;
      coupon_id: string;
      coupon_code: string;
      discount_type: string;
      discount_value: number;
      discount_amount: number;
      original_amount: number;
      final_amount: number;
      stripe_coupon_id: string | null;
    }
  | {
      success: false;
      error: string;
    };

const allowedFeeTypes = new Set([
  'selection_process',
  'application_fee',
  'enrollment_fee',
  'scholarship_fee',
  'i20_control',
]);

function corsResponse(body: ValidateResponse | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ success: false, error: 'Método não suportado' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return corsResponse({ success: false, error: 'Usuário não autenticado' }, 200);
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userResult, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userResult?.user) {
      console.error('[validate-promotional-coupon] Auth error:', authError);
      return corsResponse({ success: false, error: 'Token inválido' }, 200);
    }

    const body: ValidateRequest = await req.json();
    const couponCode = String(body.coupon_code ?? '').trim().toUpperCase();
    const feeType = String(body.fee_type ?? '').trim();
    const purchaseAmount = Number(body.purchase_amount ?? 0);

    if (!couponCode) {
      return corsResponse({ success: false, error: 'Informe o código do cupom' }, 200);
    }

    if (!feeType || !allowedFeeTypes.has(feeType)) {
      return corsResponse({ success: false, error: 'Tipo de taxa inválido' }, 200);
    }

    if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
      return corsResponse({ success: false, error: 'Valor da compra inválido' }, 200);
    }

    console.log('[validate-promotional-coupon] Validating', {
      couponCode,
      feeType,
      purchaseAmount,
      userId: userResult.user.id,
    });

    const { data: validationResult, error: validationError } = await supabase.rpc(
      'validate_promotional_coupon',
      {
        user_id_param: userResult.user.id,
        coupon_code_param: couponCode,
        fee_type_param: feeType,
        purchase_amount_param: purchaseAmount,
      },
    );

    if (validationError) {
      console.error('[validate-promotional-coupon] RPC error:', validationError);
      return corsResponse({ success: false, error: 'Erro ao validar cupom' }, 200);
    }

    const result = validationResult as ValidateResponse;
    if (!result?.success) {
      return corsResponse(
        { success: false, error: (result as { error?: string }).error ?? 'Cupom inválido' },
        200,
      );
    }

    return corsResponse(result, 200);
  } catch (error) {
    console.error('[validate-promotional-coupon] Unexpected error:', error);
    return corsResponse({ success: false, error: 'Não foi possível validar o cupom' }, 200);
  }
});


