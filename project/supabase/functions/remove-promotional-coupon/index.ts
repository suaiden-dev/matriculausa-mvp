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

    const { coupon_code, fee_type } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ success: false, error: 'No authorization header' }, 200);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return corsResponse({ success: false, error: 'Invalid token' }, 200);

    const normalizedCode = String(coupon_code || '').trim().toUpperCase();
    console.log('[remove-promotional-coupon] Removendo cupom:', normalizedCode, 'para user:', user.id, 'fee_type:', fee_type);
    
    if (!normalizedCode) return corsResponse({ success: false, error: 'Código do cupom é obrigatório' }, 200);
    if (!fee_type) return corsResponse({ success: false, error: 'Tipo de taxa é obrigatório' }, 200);

    // Normalizar fee_type
    const normalizedFeeType = fee_type === 'i20_control_fee' ? 'i20_control' : fee_type;

    // Buscar e deletar apenas registros de validação (não pagamentos confirmados)
    // Deletar registros onde payment_id começa com "validation_" ou metadata.is_validation === true
    const { data: recordsToDelete, error: findError } = await supabase
      .from('promotional_coupon_usage')
      .select('id, payment_id, metadata')
      .eq('user_id', user.id)
      .eq('coupon_code', normalizedCode)
      .eq('fee_type', normalizedFeeType);
    
    if (findError) {
      console.error('[remove-promotional-coupon] Erro ao buscar registros:', findError);
      return corsResponse({ success: false, error: 'Erro ao buscar registros' }, 200);
    }
    
    // Filtrar apenas registros de validação (não pagamentos confirmados)
    const validationRecords = (recordsToDelete || []).filter(record => {
      const isValidationPayment = record.payment_id?.startsWith('validation_');
      const isValidationMetadata = record.metadata?.is_validation === true;
      return isValidationPayment || isValidationMetadata;
    });

    if (!validationRecords || validationRecords.length === 0) {
      console.log('[remove-promotional-coupon] Nenhum registro de validação encontrado para remover');
      return corsResponse({ success: true, message: 'Nenhum registro encontrado' });
    }

    // Deletar os registros encontrados
    const idsToDelete = validationRecords.map(r => r.id);
    const { error: deleteError } = await supabase
      .from('promotional_coupon_usage')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('[remove-promotional-coupon] Erro ao deletar registros:', deleteError);
      return corsResponse({ success: false, error: 'Erro ao remover cupom do banco' }, 200);
    }

    console.log('[remove-promotional-coupon] ✅ Cupom removido com sucesso! Registros deletados:', idsToDelete.length);
    return corsResponse({ success: true, message: 'Cupom removido com sucesso', deletedCount: idsToDelete.length });
  } catch (error) {
    console.error('remove-promotional-coupon error:', error);
    return corsResponse({ success: false, error: 'Failed to remove coupon' }, 200);
  }
});

