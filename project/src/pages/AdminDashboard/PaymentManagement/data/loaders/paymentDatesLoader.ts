import { SupabaseClient } from '@supabase/supabase-js';
import { getIndividualPaymentDate } from '../../../../../lib/paymentRecorder';

export type FeeTypeKey = 'selection_process' | 'application' | 'scholarship' | 'i20_control';

export async function getPaymentDatesForUsersLoader(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, Map<FeeTypeKey, string>>> {
  const paymentDates = new Map<string, Map<FeeTypeKey, string>>();
  const feeTypes: FeeTypeKey[] = ['selection_process', 'application', 'scholarship', 'i20_control'];

  for (const userId of userIds) {
    const userPaymentDates = new Map<FeeTypeKey, string>();
    for (const feeType of feeTypes) {
      try {
        const paymentDate = await getIndividualPaymentDate(supabase, userId, feeType);
        if (paymentDate) userPaymentDates.set(feeType, paymentDate);
      } catch (_) {
        // silencioso por decisão do projeto: logs removidos
      }
    }
    if (userPaymentDates.size > 0) paymentDates.set(userId, userPaymentDates);
  }
  return paymentDates;
}


