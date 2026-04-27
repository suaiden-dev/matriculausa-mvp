import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { PaymentRecord } from '../../AdminDashboard/PaymentManagement/data/types';

export function useStudentPaymentsQuery(studentUserId: string, profileId: string) {
  return useQuery({
    queryKey: ['student-payments', studentUserId, profileId],
    queryFn: async (): Promise<PaymentRecord[]> => {
      // 1. Buscar aplicações do estudante
      const { data: apps, error: appsError } = await supabase
        .from('scholarship_applications')
        .select(`
          id,
          student_id,
          scholarship_id,
          status,
          applied_at,
          is_application_fee_paid,
          is_scholarship_fee_paid,
          application_fee_payment_method,
          scholarship_fee_payment_method,
          payment_status,
          created_at,
          user_profiles!student_id (
            id,
            user_id,
            full_name,
            email,
            has_paid_selection_process_fee,
            has_paid_i20_control_fee,
            selection_process_fee_payment_method,
            i20_control_fee_payment_method,
            placement_fee_flow,
            is_placement_fee_paid,
            placement_fee_payment_method,
            has_paid_ds160_package,
            has_paid_i539_cos_package,
            has_paid_reinstatement_package
          ),
          scholarships (
            id,
            title,
            amount,
            application_fee_amount,
            universities (
              id,
              name
            )
          )
        `)
        .eq('student_id', profileId);

      if (appsError) throw appsError;

      // 2. Buscar pagamentos Zelle aprovados
      const { data: zellePayments, error: zelleError } = await supabase
        .from('zelle_payments')
        .select('*')
        .eq('user_id', studentUserId)
        .eq('status', 'approved');

      if (zelleError) console.error('Error fetching zelle payments:', zelleError);

      // 3. Buscar overrides de taxas para este usuário
      const { data: overrides } = await supabase.rpc('get_user_fee_overrides', { target_user_id: studentUserId });
      const userOverrides = overrides ? {
        selection_process: overrides.selection_process_fee != null ? Number(overrides.selection_process_fee) * 100 : null,
        application: overrides.application_fee != null ? Number(overrides.application_fee) * 100 : null,
        scholarship: overrides.scholarship_fee != null ? Number(overrides.scholarship_fee) * 100 : null,
        i20_control: overrides.i20_control_fee != null ? Number(overrides.i20_control_fee) * 100 : null,
      } : null;

      const records: PaymentRecord[] = [];
      const student = apps?.[0]?.user_profiles as any || null;
      
      // Se não tem apps mas tem zelle, precisamos do profile separadamente
      let fallbackProfile = student;
      if (!fallbackProfile) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', profileId)
          .single();
        fallbackProfile = profile;
      }

      const profile = fallbackProfile as any;
      if (!profile) return [];

      const systemType = profile.system_type || 'legacy';
      const defaultSelectionFee = systemType === 'simplified' ? 35000 : 40000;
      const defaultI20Fee = 90000;
      const defaultScholarshipFee = systemType === 'simplified' ? 55000 : 90000;

      // Mapear Zelle Payments primeiro (são registros explícitos)
      (zellePayments || []).forEach(zp => {
        records.push({
          id: zp.id,
          student_id: profile.id,
          user_id: zp.user_id,
          student_name: profile.full_name || 'N/A',
          student_email: profile.email || 'N/A',
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'N/A',
          fee_type: zp.fee_type === 'selection_process_fee' ? 'selection_process' : 
                    zp.fee_type === 'application_fee' ? 'application' :
                    zp.fee_type === 'scholarship_fee' ? 'scholarship' : zp.fee_type,
          amount: Math.round(parseFloat(zp.amount) * 100),
          status: 'paid',
          payment_date: zp.admin_approved_at || zp.created_at,
          created_at: zp.created_at,
          payment_method: 'zelle',
          payment_proof_url: zp.screenshot_url,
          admin_notes: zp.admin_notes,
          zelle_status: 'approved'
        } as PaymentRecord);
      });

      // Mapear flags de scholarship_applications (que não foram via Zelle)
      (apps as any[] || []).forEach(app => {
        const scholarship = Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships;
        const university = scholarship?.universities ? (Array.isArray(scholarship.universities) ? scholarship.universities[0] : scholarship.universities) : null;

        // Application Fee
        if (app.is_application_fee_paid && app.application_fee_payment_method !== 'zelle') {
           let amount = userOverrides?.application || (scholarship?.application_fee_amount ? Number(scholarship.application_fee_amount) * 100 : 35000);
           // Se o valor do scholarship for gigante (centavos?), ajustar
           if (amount > 1000000) amount = amount / 100; 

           records.push({
             id: `${app.id}-app-fee`,
             student_id: profile.id,
             student_name: profile.full_name || 'N/A',
             student_email: profile.email || 'N/A',
             university_id: university?.id || 'N/A',
             university_name: university?.name || 'N/A',
             scholarship_id: scholarship?.id,
             scholarship_title: scholarship?.title,
             fee_type: 'application',
             amount,
             status: 'paid',
             payment_date: app.created_at,
             created_at: app.created_at,
             payment_method: app.application_fee_payment_method || 'manual'
           } as PaymentRecord);
        }

        // Scholarship Fee
        if (app.is_scholarship_fee_paid && app.scholarship_fee_payment_method !== 'zelle') {
           const amount = userOverrides?.scholarship || defaultScholarshipFee;
           records.push({
             id: `${app.id}-sch-fee`,
             student_id: profile.id,
             student_name: profile.full_name || 'N/A',
             student_email: profile.email || 'N/A',
             university_id: university?.id || 'N/A',
             university_name: university?.name || 'N/A',
             scholarship_id: scholarship?.id,
             scholarship_title: scholarship?.title,
             fee_type: 'scholarship',
             amount,
             status: 'paid',
             payment_date: app.created_at,
             created_at: app.created_at,
             payment_method: app.scholarship_fee_payment_method || 'manual'
           } as PaymentRecord);
        }
      });

      // Global Fees do Profile (se não forem Zelle)
      if (profile.has_paid_selection_process_fee && !records.some(r => r.fee_type === 'selection_process')) {
        records.push({
          id: `${profile.id}-selection`,
          student_id: profile.id,
          student_name: profile.full_name || 'N/A',
          student_email: profile.email || 'N/A',
          university_id: 'N/A',
          university_name: 'N/A',
          fee_type: 'selection_process',
          amount: userOverrides?.selection_process || defaultSelectionFee,
          status: 'paid',
          payment_date: profile.created_at,
          created_at: profile.created_at,
          payment_method: profile.selection_process_fee_payment_method || 'manual'
        } as PaymentRecord);
      }

      if (profile.has_paid_i20_control_fee && !records.some(r => r.fee_type === 'i20_control_fee')) {
        records.push({
          id: `${profile.id}-i20`,
          student_id: profile.id,
          student_name: profile.full_name || 'N/A',
          student_email: profile.email || 'N/A',
          university_id: 'N/A',
          university_name: 'N/A',
          fee_type: 'i20_control_fee',
          amount: userOverrides?.i20_control || defaultI20Fee,
          status: 'paid',
          payment_date: profile.created_at,
          created_at: profile.created_at,
          payment_method: profile.i20_control_fee_payment_method || 'manual'
        } as PaymentRecord);
      }

      // Ordenar por data decrescente
      return records.sort((a, b) => new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime());
    },
    enabled: !!studentUserId && !!profileId,
  });
}
