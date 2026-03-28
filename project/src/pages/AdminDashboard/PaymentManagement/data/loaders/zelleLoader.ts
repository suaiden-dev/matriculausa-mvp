import { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentRecord } from '../types';

export type ZelleLoadResult = { records: PaymentRecord[]; count: number };

export async function loadZellePaymentsLoader(
  supabase: SupabaseClient,
  signal?: AbortSignal
): Promise<ZelleLoadResult> {
  // Detectar ambiente para aplicar filtro de @uorak.com apenas em produção
  // ✅ Filtro aplicado no servidor: em produção, exclui @uorak.com; em localhost, mostra tudo
  const isDevelopment = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('dev')
  );

  // ✅ BUSCAR TODOS OS REGISTROS: Sem paginação, buscar todos os pagamentos Zelle
  const query = supabase
    .from('zelle_payments')
    .select('*')
    .gt('amount', 0)
    .order('created_at', { ascending: false });
  const { data: zellePaymentsData, error: zelleError } = signal
    ? await query.abortSignal(signal)
    : await query;
  if (zelleError) throw zelleError;

  let records: PaymentRecord[] = [];

  // Processar registros e aplicar filtro
  if (zellePaymentsData.length > 0) {
    const userIds = zellePaymentsData.map((p: any) => p.user_id).filter(Boolean);
    const { data: userProfiles, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email, university_id')
      .in('user_id', userIds);
    if (usersError) throw usersError;

    // Processar e filtrar registros
    for (const zellePayment of zellePaymentsData) {
      const student = userProfiles?.find((p) => p.user_id === zellePayment.user_id);
      
      // ✅ FILTRO NO SERVIDOR: Excluir @uorak.com apenas em produção
      if (!isDevelopment && student?.email?.toLowerCase().includes('@uorak.com')) {
        continue; // Pular este pagamento em produção
      }
      
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
        metadata: zellePayment.metadata || null, // Incluir metadata para cupom promocional
      });
    }
  }

  // ✅ CONTAGEM PRECISA: Como buscamos todos os registros e filtramos em memória, 
  // o records.length já representa o count correto pós-filtro.
  const finalCount = records.length;
  
  return { records, count: finalCount };
}


