/**
 * Versão OTIMIZADA dos loaders de payments
 * 
 * Corrige problemas N+1:
 * - get_user_fee_overrides: batch query em vez de individual
 * - payment dates: batch query em vez de loop sequencial
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verifica se está em produção ou staging
 */
/**
 * Valor pré-calculado para evitar acesso repetido ao window.location dentro de loops
 */
const IS_PROD_OR_STAGING = ((): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const href = window.location.href;
  
  const isProduction = hostname === 'matriculausa.com' || 
                       hostname.includes('matriculausa.com') ||
                       href.includes('matriculausa.com');
  
  const isStaging = hostname === 'staging-matriculausa.netlify.app' || 
                    hostname.includes('staging-matriculausa.netlify.app') ||
                    hostname.includes('staging-matriculausa') ||
                    href.includes('staging-matriculausa.netlify.app') ||
                    href.includes('staging-matriculausa');
  
  return isProduction || isStaging;
})();

/**
 * Verifica se deve excluir estudante com email @uorak.com
 */
function shouldExcludeStudent(email: string | null | undefined): boolean {
  if (!IS_PROD_OR_STAGING) return false; // Em localhost, não excluir
  if (!email) return false; // Se não tem email, não excluir
  return email.toLowerCase().includes('@uorak.com');
}

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
  console.log('🚀 [PaymentManagement] loadPaymentsBaseDataOptimized iniciado');
  console.time('[payments] baseDataOptimized');
  try {
    // BLOCO 1: Queries iniciais independentes que podem rodar em paralelo
    const [appsRes, zelleRes, stripeRes] = await Promise.all([
      // 1. Scholarship Applications
      supabase.from('scholarship_applications').select(`
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
          seller_referral_code,
          placement_fee_flow,
          is_placement_fee_paid,
          placement_fee_payment_method,
          has_paid_ds160_package,
          has_paid_i539_cos_package,
          has_paid_reinstatement_package,
          ds160_package_payment_method,
          i539_cos_package_payment_method,
          reinstatement_package_payment_method
        ),
        scholarships (
          id,
          title,
          amount,
          application_fee_amount,
          placement_fee_amount,
          field_of_study,
          universities (
            id,
            name
          )
        )
      `),
      // 2. Zelle Payments Approved
      supabase.from('zelle_payments').select('*').eq('status', 'approved'),
      // 3. User Profiles for "Stripe/Others" (who paid something)
      supabase.from('user_profiles').select(`
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
        seller_referral_code,
        placement_fee_flow,
        is_placement_fee_paid,
        placement_fee_payment_method,
        has_paid_ds160_package,
        has_paid_i539_cos_package,
        has_paid_reinstatement_package,
        ds160_package_payment_method,
        i539_cos_package_payment_method,
        reinstatement_package_payment_method
      `).or('has_paid_selection_process_fee.eq.true,is_application_fee_paid.eq.true,is_scholarship_fee_paid.eq.true,has_paid_i20_control_fee.eq.true,is_placement_fee_paid.eq.true,has_paid_ds160_package.eq.true,has_paid_i539_cos_package.eq.true,has_paid_reinstatement_package.eq.true')
    ]);

    if (appsRes.error) throw appsRes.error;
    const applications = appsRes.data || [];
    const zellePaymentsRaw = zelleRes.data || [];
    const stripeUsersRaw = stripeRes.data || [];

    if (zelleRes.error) console.error('Error loading Zelle payments:', zelleRes.error);
    if (stripeRes.error) console.error('Error loading Stripe users:', stripeRes.error);

    // Processamento e filtragem pós-Bloco 1
    const filteredApplications = IS_PROD_OR_STAGING
      ? applications.filter((app: any) => !shouldExcludeStudent(app.user_profiles?.email))
      : applications;

    const applicationUserIdsSet = new Set(filteredApplications.map((app: any) => app.user_profiles?.user_id).filter(Boolean));
    
    // Filtrar stripe users que já possuem aplicação para evitar duplicatas na lista
    let stripeUsers = stripeUsersRaw.filter((user: any) => !applicationUserIdsSet.has(user.user_id));
    if (IS_PROD_OR_STAGING) {
      stripeUsers = stripeUsers.filter((user: any) => !shouldExcludeStudent(user.email));
    }

    // Coletar userIds para o Bloco 2
    const zelleUserIds = [...new Set(zellePaymentsRaw.map(p => p.user_id).filter(Boolean))];
    const uniqueUserIdsForMetas = [...new Set([
      ...Array.from(applicationUserIdsSet) as string[],
      ...zelleUserIds as string[],
      ...stripeUsers.map((user: any) => user.user_id).filter(Boolean) as string[]
    ])];

    // BLOCO 2: Queries de enriquecimento (dependentes dos dados do Bloco 1)
    const [zelleProfilesRes, overridesMap, systemTypesRes] = await Promise.all([
      // 4. Profiles para pagamentos Zelle
      zelleUserIds.length > 0 
        ? supabase.from('user_profiles').select('id, user_id, full_name, email, has_paid_selection_process_fee, is_application_fee_paid, is_scholarship_fee_paid, has_paid_i20_control_fee, selection_process_fee_payment_method, i20_control_fee_payment_method, scholarship_package_id, dependents, seller_referral_code, placement_fee_flow, is_placement_fee_paid, placement_fee_payment_method, has_paid_ds160_package, has_paid_i539_cos_package, has_paid_reinstatement_package, ds160_package_payment_method, i539_cos_package_payment_method, reinstatement_package_payment_method').in('user_id', zelleUserIds)
        : Promise.resolve({ data: [], error: null }),
      // 5. Overrides em batch
      getOverridesBatch(supabase, uniqueUserIdsForMetas),
      // 6. System Types
      uniqueUserIdsForMetas.length > 0
        ? supabase.from('user_profiles').select('user_id, system_type').in('user_id', uniqueUserIdsForMetas)
        : Promise.resolve({ data: [], error: null })
    ]);

    // Enriquecer Zelle Payments e aplicar filtro final
    let zellePayments = zellePaymentsRaw.map(payment => ({
      ...payment,
      user_profiles: zelleProfilesRes.data?.find(p => p.user_id === payment.user_id)
    }));

    if (IS_PROD_OR_STAGING) {
      zellePayments = zellePayments.filter(p => !shouldExcludeStudent(p.user_profiles?.email));
    }

    // Mapear System Types
    const userSystemTypesMap = new Map<string, string>();
    systemTypesRes.data?.forEach(st => {
      userSystemTypesMap.set(st.user_id, st.system_type || 'legacy');
    });

    return { 
      applications: filteredApplications, 
      zellePayments, 
      stripeUsers, 
      overridesMap: overridesMap || {}, 
      userSystemTypesMap 
    };
  } finally {
    console.timeEnd('[payments] baseDataOptimized');
  }
}

