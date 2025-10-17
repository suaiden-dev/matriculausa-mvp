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
      fee_type: params.feeType,
      payment_method: params.paymentMethod,
      amount: params.amount
    });

    const { data, error } = await supabase.rpc('insert_individual_fee_payment', {
      p_user_id: params.userId,
      p_fee_type: params.feeType,
      p_amount: params.amount,
      p_payment_date: params.paymentDate,
      p_payment_method: params.paymentMethod,
      p_payment_intent_id: params.paymentIntentId || null,
      p_stripe_charge_id: params.stripeChargeId || null,
      p_zelle_payment_id: params.zellePaymentId || null
    });

    if (error) {
      console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', error);
      return { success: false, error: error.message };
    }

    console.log('[Individual Fee Payment] Fee recorded successfully');
    return { success: true, paymentId: data?.payment_id };
  } catch (error: any) {
    console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', error);
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

