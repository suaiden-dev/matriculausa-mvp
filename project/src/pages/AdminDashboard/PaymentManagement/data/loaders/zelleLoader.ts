import { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentRecord } from '../types';

export type ZelleLoadResult = { records: PaymentRecord[]; count: number };

export async function loadZellePaymentsLoader(
  supabase: SupabaseClient,
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<ZelleLoadResult> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const query = supabase
    .from('zelle_payments')
    .select('*', { count: 'exact' })
    .gt('amount', 0)
    .order('created_at', { ascending: false })
    .range(from, to);
  const { data: zellePaymentsData, error: zelleError, count } = signal
    ? await query.abortSignal(signal)
    : await query;
  if (zelleError) throw zelleError;

  let records: PaymentRecord[] = [];
  if (zellePaymentsData && zellePaymentsData.length > 0) {
    const userIds = zellePaymentsData.map((p: any) => p.user_id).filter(Boolean);
    const { data: userProfiles, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email, university_id')
      .in('user_id', userIds);
    if (usersError) throw usersError;

    for (const zellePayment of zellePaymentsData) {
      const student = userProfiles?.find((p) => p.user_id === zellePayment.user_id);
      const studentName = student?.full_name && student.full_name !== student?.email
        ? student.full_name
        : student?.email || 'Unknown User';

      records.push({
        id: zellePayment.id,
        student_id: student?.id || zellePayment.student_profile_id || '',
        user_id: zellePayment.user_id,
        student_name: studentName,
        student_email: student?.email || 'Email not available',
        university_id: student?.university_id || '',
        university_name: 'N/A',
        fee_type: (zellePayment.fee_type || 'selection_process') as PaymentRecord['fee_type'],
        fee_type_global: zellePayment.fee_type_global,
        amount: parseFloat(zellePayment.amount) || 0,
        status: 'pending',
        scholarships_ids: zellePayment.scholarships_ids || undefined,
        payment_date: zellePayment.created_at,
        created_at: zellePayment.created_at,
        payment_method: 'zelle',
        payment_proof_url: zellePayment.screenshot_url,
        admin_notes: zellePayment.admin_notes,
        zelle_status: zellePayment.status as any,
        reviewed_by: zellePayment.admin_approved_by,
        reviewed_at: zellePayment.admin_approved_at,
      });
    }
  }

  return { records, count: count || 0 };
}


