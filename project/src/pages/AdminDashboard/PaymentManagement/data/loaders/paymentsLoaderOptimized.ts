/**
 * Versão OTIMIZADA dos loaders de payments
 * 
 * Corrige problemas N+1:
 * - get_user_fee_overrides: batch query em vez de individual
 * - payment dates: batch query em vez de loop sequencial
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface PaymentsBaseData {
  applications: any[];
  zellePayments: any[];
  stripeUsers: any[];
  overridesMap: { [key: string]: any };
  userSystemTypesMap: Map<string, string>;
}

/**
 * Versão otimizada: busca overrides em batch usando RPC batch
 * Reduz N requisições (uma por usuário) para 1 requisição batch
 */
async function getOverridesBatch(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<{ [key: string]: any }> {
  if (userIds.length === 0) return {};

  // Usar RPC batch - sempre, nunca fallback individual
  const { batchGetFeeOverrides } = await import('../../../../../lib/batchRequestUtils');
  
  try {
    return await batchGetFeeOverrides(supabase, userIds);
  } catch (err) {
    console.error('❌ [paymentsLoader] Erro fatal ao buscar overrides em batch:', err);
    // Retorna objeto vazio em caso de erro crítico
    // NÃO faz fallback individual para evitar N+1
    return {};
  }
}

export async function loadPaymentsBaseDataOptimized(supabase: SupabaseClient): Promise<PaymentsBaseData> {
  console.time('[payments] baseDataOptimized');
  try {
    const { data: applications, error: appsError } = await supabase
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
          is_application_fee_paid,
          is_scholarship_fee_paid,
          has_paid_i20_control_fee,
          selection_process_fee_payment_method,
          i20_control_fee_payment_method,
          scholarship_package_id,
          dependents,
          seller_referral_code
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
      `);
    if (appsError) throw appsError;

    const { data: zellePaymentsRaw, error: zelleError } = await supabase
      .from('zelle_payments')
      .select('*')
      .eq('status', 'approved');
    if (zelleError) {
      console.error('Error loading Zelle payments:', zelleError);
    }

    let zellePayments: any[] = [];
    if (zellePaymentsRaw && zellePaymentsRaw.length > 0) {
      const userIds = zellePaymentsRaw.map((p) => p.user_id);
      const { data: userProfiles, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, email, has_paid_selection_process_fee, is_application_fee_paid, is_scholarship_fee_paid, has_paid_i20_control_fee, selection_process_fee_payment_method, i20_control_fee_payment_method, scholarship_package_id, dependents, seller_referral_code')
        .in('user_id', userIds);
      if (usersError) {
        console.error('Error loading user profiles for Zelle payments:', usersError);
      } else {
        zellePayments = zellePaymentsRaw.map((payment) => ({
          ...payment,
          user_profiles: userProfiles?.find((profile) => profile.user_id === payment.user_id),
        }));
      }
    }

    const { data: stripeUsersRaw, error: stripeError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        user_id,
        full_name,
        email,
        has_paid_selection_process_fee,
        is_application_fee_paid,
        is_scholarship_fee_paid,
        has_paid_i20_control_fee,
        selection_process_fee_payment_method,
        i20_control_fee_payment_method,
        scholarship_package_id,
        dependents,
        created_at,
        seller_referral_code
      `)
      .or('has_paid_selection_process_fee.eq.true,is_application_fee_paid.eq.true,is_scholarship_fee_paid.eq.true,has_paid_i20_control_fee.eq.true');
    if (stripeError) {
      console.error('Error loading Stripe users:', stripeError);
    }

    let stripeUsers: any[] = [];
    if (stripeUsersRaw && stripeUsersRaw.length > 0) {
      const applicationUserIds = applications?.map((app: any) => app.user_profiles?.user_id).filter(Boolean) || [];
      stripeUsers = stripeUsersRaw.filter((user: any) => !applicationUserIds.includes(user.user_id));
    }

    const allUserIds = [
      ...(applications?.map((app: any) => app.user_profiles?.user_id).filter(Boolean) || []),
      ...(zellePayments?.map((payment: any) => payment.user_profiles?.user_id).filter(Boolean) || []),
      ...(stripeUsers?.map((user: any) => user.user_id).filter(Boolean) || []),
    ];
    const uniqueUserIds = [...new Set(allUserIds)];

    // OTIMIZAÇÃO: Buscar overrides em batch
    const overridesMap = await getOverridesBatch(supabase, uniqueUserIds);

    const userSystemTypesMap = new Map<string, string>();
    if (uniqueUserIds.length > 0) {
      // Buscar system_type em batch (já otimizado)
      const { data: systemTypes, error: systemTypesError } = await supabase
        .from('user_profiles')
        .select('user_id, system_type')
        .in('user_id', uniqueUserIds);
      if (!systemTypesError) {
        systemTypes?.forEach((st) => {
          userSystemTypesMap.set(st.user_id, st.system_type || 'legacy');
        });
      } else {
        console.warn('⚠️ [DEBUG] Erro ao buscar system_type:', systemTypesError);
      }
    }

    return { applications: applications || [], zellePayments, stripeUsers, overridesMap, userSystemTypesMap };
  } finally {
    console.timeEnd('[payments] baseDataOptimized');
  }
}

