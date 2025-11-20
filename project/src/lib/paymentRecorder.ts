import { SupabaseClient } from '@supabase/supabase-js';

export type FeeType = 'selection_process' | 'application' | 'scholarship' | 'i20_control';
export type PaymentMethod = 'stripe' | 'zelle' | 'manual';

export interface RecordPaymentParams {
  userId: string;
  feeType: FeeType;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentIntentId?: string | null;
  stripeChargeId?: string | null;
  zellePaymentId?: string | null;
  grossAmountUsd?: number | null;
  feeAmountUsd?: number | null;
}

/**
 * Registra um pagamento individual na tabela individual_fee_payments
 * Usa try/catch para não quebrar fluxos existentes se a tabela não existir
 */
export async function recordIndividualFeePayment(
  supabase: SupabaseClient,
  params: RecordPaymentParams
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    console.log('[Individual Fee Payment] Recording fee payment:', {
      user_id: params.userId,
      fee_type: params.feeType,
      payment_method: params.paymentMethod,
      amount: params.amount,
      payment_date: params.paymentDate,
      gross_amount_usd: params.grossAmountUsd,
      fee_amount_usd: params.feeAmountUsd
    });

    const { data, error } = await supabase.rpc('insert_individual_fee_payment', {
      p_user_id: params.userId,
      p_fee_type: params.feeType,
      p_amount: params.amount,
      p_payment_date: params.paymentDate,
      p_payment_method: params.paymentMethod,
      p_payment_intent_id: params.paymentIntentId || null,
      p_stripe_charge_id: params.stripeChargeId || null,
      p_zelle_payment_id: params.zellePaymentId || null,
      p_gross_amount_usd: params.grossAmountUsd || null,
      p_fee_amount_usd: params.feeAmountUsd || null
    });

    if (error) {
      console.error('[Individual Fee Payment] ❌ ERROR: Could not record fee payment:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fee_type: params.feeType,
        user_id: params.userId
      });
      return { success: false, error: error.message };
    }

    // A função RPC retorna TABLE, então pode ser um array ou um objeto único
    // Verificar se é array e pegar o primeiro elemento se necessário
    const result = Array.isArray(data) ? data[0] : data;
    
    console.log('[Individual Fee Payment] ✅ Fee recorded successfully:', {
      payment_id: result?.payment_id,
      record_id: result?.id,
      fee_type: params.feeType,
      raw_data: data
    });
    return { success: true, paymentId: result?.payment_id || result?.id };
  } catch (error: any) {
    console.error('[Individual Fee Payment] ❌ EXCEPTION: Failed to record individual fee payment:', {
      error: error.message,
      stack: error.stack,
      fee_type: params.feeType,
      user_id: params.userId
    });
    return { success: false, error: error.message };
  }
}

/**
 * Obtém a data de pagamento de uma taxa específica
 * Tenta a nova tabela primeiro, depois faz fallback para dados antigos
 */
export async function getIndividualPaymentDate(
  supabase: SupabaseClient,
  userId: string,
  feeType: FeeType,
  paymentMethod?: PaymentMethod
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_individual_payment_date', {
      p_user_id: userId,
      p_fee_type: feeType,
      p_payment_method: paymentMethod || null
    });

    if (error) {
      console.warn('[Payment Date] Error fetching payment date:', error);
      return null;
    }

    return data || null;
  } catch (error: any) {
    console.warn('[Payment Date] Error:', error);
    return null;
  }
}

