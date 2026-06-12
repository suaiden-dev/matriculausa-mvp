import { SupabaseClient } from '@supabase/supabase-js';
import { recordIndividualFeePayment, FeeType } from './paymentRecorder';

export type FreeFeeType =
  | 'application_fee'
  | 'placement_fee'
  | 'reinstatement_package'
  | 'i20_control_fee'
  | 'ds160_package'
  | 'i539_cos_package';

interface ApplyFreePaymentParams {
  supabase: SupabaseClient;
  feeType: FreeFeeType;
  userId: string;
  applicationId?: string;
  couponCode?: string;
  amount: number;
  onSuccess?: () => void;
}

const feeTypeToRecorderType: Record<FreeFeeType, FeeType> = {
  application_fee: 'application',
  placement_fee: 'placement',
  reinstatement_package: 'reinstatement_fee',
  i20_control_fee: 'i20_control',
  ds160_package: 'ds160_package',
  i539_cos_package: 'i539_cos_package',
};

const feeTypeToProfileColumn: Record<FreeFeeType, string> = {
  application_fee: 'is_application_fee_paid',
  placement_fee: 'is_placement_fee_paid',
  reinstatement_package: 'has_paid_reinstatement_package',
  i20_control_fee: 'has_paid_i20_control_fee',
  ds160_package: 'has_paid_ds160_package',
  i539_cos_package: 'has_paid_i539_cos_package',
};

// Columns on user_profiles that store the payment method for each fee type.
// application_fee uses scholarship_applications.application_fee_payment_method instead.
const feeTypeToPaymentMethodColumn: Partial<Record<FreeFeeType, string>> = {
  placement_fee: 'placement_fee_payment_method',
  reinstatement_package: 'reinstatement_package_payment_method',
  i20_control_fee: 'i20_control_fee_payment_method',
  ds160_package: 'ds160_package_payment_method',
  i539_cos_package: 'i539_cos_package_payment_method',
};

export async function applyFreePayment(params: ApplyFreePaymentParams): Promise<{ error: any }> {
  const { supabase, feeType, userId, applicationId, couponCode, amount, onSuccess } = params;

  try {
    const profileColumn = feeTypeToProfileColumn[feeType];
    const paymentMethodColumn = feeTypeToPaymentMethodColumn[feeType];

    const profileUpdate: Record<string, any> = {
      [profileColumn]: true,
      updated_at: new Date().toISOString(),
    };
    if (paymentMethodColumn) profileUpdate[paymentMethodColumn] = 'coupon';

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileUpdate)
      .eq('user_id', userId);

    if (profileError) throw profileError;

    if (feeType === 'application_fee' && applicationId) {
      await supabase
        .from('scholarship_applications')
        .update({ is_application_fee_paid: true, application_fee_payment_method: 'coupon' })
        .eq('id', applicationId);
    }

    await supabase.rpc('log_student_action', {
      p_student_id: userId,
      p_action_type: 'fee_payment',
      p_action_description: `${feeType.replace(/_/g, ' ')} paid via 100% coupon`,
      p_performed_by: userId,
      p_performed_by_type: 'student',
      p_metadata: {
        fee_type: feeType,
        payment_method: 'coupon',
        amount_waived: amount,
        coupon_code: couponCode || null,
      },
    });

    await recordIndividualFeePayment(supabase, {
      userId,
      feeType: feeTypeToRecorderType[feeType],
      amount: 0,
      paymentDate: new Date().toISOString(),
      paymentMethod: 'coupon',
    });

    onSuccess?.();
    return { error: null };
  } catch (err: any) {
    console.error(`[applyFreePayment] Error for ${feeType}:`, err);
    return { error: err };
  }
}
