import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import type { StudentRecord } from './useStudentDetails';

/**
 * Hook para buscar dados principais do estudante
 * Usa RPC consolidada quando disponível, fallback para query manual
 */
export function useStudentDetailsQuery(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.students.details(profileId),
    enabled: !!profileId,
    queryFn: async (): Promise<StudentRecord> => {
      if (!profileId) throw new Error('Profile ID is required');

      // Try RPC first for better performance
      let s: any = null;
      let useRpc = true;

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_admin_student_full_details',
          { target_profile_id: profileId }
        );

        if (!rpcError && rpcData) {
          s = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
          if (s && s.id) {
            console.log('✅ [PERFORMANCE] Using consolidated RPC for student data');
          } else {
            console.warn('⚠️ [PERFORMANCE] RPC returned invalid data, using fallback');
            useRpc = false;
            s = null;
          }
        } else {
          console.warn('⚠️ [PERFORMANCE] RPC failed, using fallback:', rpcError);
          useRpc = false;
        }
      } catch (rpcError) {
        console.warn('⚠️ [PERFORMANCE] RPC not available, using fallback:', rpcError);
        useRpc = false;
      }

      // Fallback to original query if RPC fails
      if (!useRpc || !s) {
        const { data, error: queryError } = await supabase
          .from('user_profiles')
          .select(`
            id,
            user_id,
            full_name,
            email,
            phone,
            country,
            field_of_interest,
            academic_level,
            gpa,
            english_proficiency,
            status,
            avatar_url,
            dependents,
            desired_scholarship_range,
            created_at,
            has_paid_selection_process_fee,
            has_paid_i20_control_fee,
            selection_process_fee_payment_method,
            i20_control_fee_payment_method,
            role,
            seller_referral_code,
            admin_notes,
            scholarship_applications (
              id,
              scholarship_id,
              status,
              applied_at,
              is_application_fee_paid,
              is_scholarship_fee_paid,
              application_fee_payment_method,
              scholarship_fee_payment_method,
              acceptance_letter_status,
              acceptance_letter_url,
              acceptance_letter_sent_at,
              acceptance_letter_signed_at,
              acceptance_letter_approved_at,
              transfer_form_url,
              transfer_form_status,
              transfer_form_sent_at,
              student_process_type,
              payment_status,
              reviewed_at,
              reviewed_by,
              documents,
              scholarships (
                title,
                university_id,
                field_of_study,
                annual_value_with_scholarship,
                application_fee_amount,
                universities (
                  name
                )
              )
            )
          `)
          .eq('id', profileId)
          .single();

        if (queryError) throw queryError;
        s = data;
      }

      if (!s) {
        throw new Error('Failed to load student data');
      }

      // Format the student record
      const applications = s.scholarship_applications || [];
      const approvedApp = applications.find((app: any) => app.status === 'approved');
      const mainApp = approvedApp || applications[0] || {};

      const formatted: StudentRecord = {
        student_id: s.id,
        user_id: s.user_id,
        student_name: s.full_name,
        student_email: s.email,
        phone: s.phone,
        country: s.country,
        field_of_interest: s.field_of_interest,
        academic_level: s.academic_level,
        gpa: s.gpa,
        english_proficiency: s.english_proficiency,
        status: s.status,
        avatar_url: s.avatar_url,
        dependents: s.dependents,
        desired_scholarship_range: s.desired_scholarship_range,
        student_created_at: s.created_at,
        has_paid_selection_process_fee: s.has_paid_selection_process_fee,
        has_paid_i20_control_fee: s.has_paid_i20_control_fee,
        selection_process_fee_payment_method: s.selection_process_fee_payment_method,
        i20_control_fee_payment_method: s.i20_control_fee_payment_method,
        seller_referral_code: s.seller_referral_code,
        application_id: mainApp.id || null,
        scholarship_id: mainApp.scholarship_id || null,
        application_status: mainApp.status || null,
        applied_at: mainApp.applied_at || null,
        is_application_fee_paid: mainApp.is_application_fee_paid || false,
        is_scholarship_fee_paid: mainApp.is_scholarship_fee_paid || false,
        application_fee_payment_method: mainApp.application_fee_payment_method || null,
        scholarship_fee_payment_method: mainApp.scholarship_fee_payment_method || null,
        acceptance_letter_status: mainApp.acceptance_letter_status || null,
        student_process_type: mainApp.student_process_type || null,
        payment_status: mainApp.payment_status || null,
        reviewed_at: mainApp.reviewed_at || null,
        reviewed_by: mainApp.reviewed_by || null,
        scholarship_name: mainApp.scholarships?.title || null,
        scholarship_title: mainApp.scholarships?.title || null,
        university_name: mainApp.scholarships?.universities?.name || null,
        total_applications: applications.length,
        is_locked: applications.some((app: any) => app.status === 'approved'),
        all_applications: applications,
        admin_notes: s.admin_notes,
      };

      return formatted;
    },
    staleTime: 30 * 1000, // 30 segundos - dados podem mudar frequentemente
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar dados secundários do estudante
 * (term acceptances, referral info, individual fee payments)
 */
export function useStudentSecondaryDataQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.students.secondaryData(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      // Tentar usar RPC consolidado
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_admin_student_secondary_data',
        { target_user_id: userId }
      );

      if (!rpcError && rpcData) {
        const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
        // A RPC retorna real_paid_amounts já mapeado como objeto JSON
        // Converter para formato de array para compatibilidade com o fallback
        const realPaidAmounts = parsed.real_paid_amounts || {};
        const individualFeePayments = Object.entries(realPaidAmounts).map(([fee_type, amount]) => ({
          fee_type,
          amount: typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0
        }));
        
        return {
          termAcceptances: parsed.term_acceptances || [],
          referralInfo: parsed.referral_info || null,
          individualFeePayments,
        };
      }

      // Fallback: carregar manualmente
      const [termAcceptancesResult, paymentsResult] = await Promise.all([
        supabase
          .from('comprehensive_term_acceptance')
          .select(`
            *,
            user_profiles!comprehensive_term_acceptance_user_id_fkey (
              email,
              full_name
            ),
            application_terms!comprehensive_term_acceptance_term_id_fkey (
              title,
              content
            )
          `)
          .eq('user_id', userId)
          .order('accepted_at', { ascending: false }),
        supabase
          .from('individual_fee_payments')
          .select('fee_type, amount')
          .eq('user_id', userId),
      ]);

      const termAcceptances = (termAcceptancesResult.data || []).map((acc: any) => ({
        ...acc,
        user_email: acc.user_profiles?.email || null,
        user_full_name: acc.user_profiles?.full_name || null,
        term_title: acc.application_terms?.title || 'Term',
        term_content: acc.application_terms?.content || '',
      }));

      const individualFeePayments = paymentsResult.data || [];

      return {
        termAcceptances,
        referralInfo: null, // Será carregado separadamente se necessário
        individualFeePayments,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos - dados secundários mudam menos frequentemente
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar pagamentos Zelle pendentes do estudante
 */
export function usePendingZellePaymentsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.students.pendingZellePayments(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('zelle_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // 30 segundos - status de pagamento pode mudar
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

