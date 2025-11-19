import { supabase } from '../../../../../lib/supabase';
import type { DateRange, LoadedFinancialData } from '../types';
import { getPreviousPeriodRange } from '../../utils/dateRange';

/**
 * Verifica se está em produção ou staging
 */
function shouldFilter(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const href = window.location.href;
  
  // Verificações mais robustas
  const isProduction = hostname === 'matriculausa.com' || 
                       hostname.includes('matriculausa.com') ||
                       href.includes('matriculausa.com');
  
  const isStaging = hostname === 'staging-matriculausa.netlify.app' || 
                    hostname.includes('staging-matriculausa.netlify.app') ||
                    hostname.includes('staging-matriculausa') ||
                    href.includes('staging-matriculausa.netlify.app') ||
                    href.includes('staging-matriculausa');
  
  const result = isProduction || isStaging;
  
  // Debug temporário
  console.log('🔍 [FinancialAnalytics] shouldFilter debug:', {
    hostname,
    href,
    isProduction,
    isStaging,
    result,
    windowLocation: window.location
  });
  
  return result;
}

/**
 * Verifica se deve excluir estudante com email @uorak.com
 */
function shouldExcludeStudent(email: string | null | undefined): boolean {
  if (!shouldFilter()) return false; // Em localhost, não excluir
  if (!email) return false; // Se não tem email, não excluir
  return email.toLowerCase().includes('@uorak.com');
}

/**
 * Busca aplicações de bolsas (período atual)
 */
async function loadApplications(): Promise<any[]> {
  const { data, error } = await supabase
    .from('scholarship_applications')
    .select(`
      *,
      user_profiles!student_id (
        id,
        user_id,
        full_name,
        email,
        has_paid_selection_process_fee,
        is_application_fee_paid,
        is_scholarship_fee_paid,
        has_paid_i20_control_fee,
        scholarship_package_id,
        dependents,
        created_at,
        selection_process_fee_payment_method,
        i20_control_fee_payment_method
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
    // Removido filtro de período para igualar Payment Management

  if (error) throw error;
  return data || [];
}

/**
 * Busca aplicações de bolsas (período anterior)
 */
async function loadApplicationsPrev(prevRange: DateRange): Promise<any[]> {
  const { data, error } = await supabase
    .from('scholarship_applications')
    .select(`
      *,
      user_profiles!student_id (
        id,
        user_id,
        has_paid_selection_process_fee,
        is_application_fee_paid,
        is_scholarship_fee_paid,
        has_paid_i20_control_fee,
        scholarship_package_id,
        dependents,
        created_at
      ),
      scholarships (
        id,
        universities (id)
      )
    `)
    .gte('created_at', prevRange.start.toISOString())
    .lte('created_at', prevRange.end.toISOString());

  if (error) throw error;
  return data || [];
}

/**
 * Busca pagamentos Zelle (período atual) com user_profiles
 */
async function loadZellePayments(_currentRange: DateRange): Promise<any[]> {
  const { data: zellePaymentsRaw, error } = await supabase
    .from('zelle_payments')
    .select('*')
    .eq('status', 'approved');
    // Removido filtro de período para igualar Payment Management

  if (error) throw error;
  
  // Carregar user_profiles para os pagamentos Zelle (igual ao PaymentManagement)
  let zellePayments: any[] = [];
  if (zellePaymentsRaw && zellePaymentsRaw.length > 0) {
    const userIds = zellePaymentsRaw.map((p) => p.user_id).filter(Boolean);
    const { data: userProfiles, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email, has_paid_selection_process_fee, is_application_fee_paid, is_scholarship_fee_paid, has_paid_i20_control_fee, selection_process_fee_payment_method, i20_control_fee_payment_method, scholarship_package_id, dependents, seller_referral_code')
      .in('user_id', userIds);
    
    if (usersError) {
      console.error('Error loading user profiles for Zelle payments:', usersError);
      zellePayments = zellePaymentsRaw;
    } else {
      zellePayments = zellePaymentsRaw.map((payment) => ({
        ...payment,
        user_profiles: userProfiles?.find((profile) => profile.user_id === payment.user_id),
      }));
    }
  }
  
  return zellePayments;
}

/**
 * Busca pagamentos Zelle (período anterior) - apenas dados básicos para comparação
 */
async function loadZellePaymentsPrev(prevRange: DateRange): Promise<any[]> {
  const { data, error } = await supabase
    .from('zelle_payments')
    .select('*')
    .gte('created_at', prevRange.start.toISOString())
    .lte('created_at', prevRange.end.toISOString());

  if (error) throw error;
  return data || [];
}

/**
 * Busca todos os estudantes registrados
 */
async function loadAllStudents(): Promise<any[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('role', 'student');
  
  if (error) throw error;
  return data || [];
}

/**
 * Busca usuários Stripe que pagaram mas não têm aplicação
 */
async function loadStripeUsers(applications: any[]): Promise<any[]> {
  const { data, error } = await supabase
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
      scholarship_package_id,
      dependents,
      created_at,
      selection_process_fee_payment_method,
      i20_control_fee_payment_method
    `)
    .eq('role', 'student')
    .or('has_paid_selection_process_fee.eq.true,is_application_fee_paid.eq.true,is_scholarship_fee_paid.eq.true,has_paid_i20_control_fee.eq.true');
    // Removido filtro de período para igualar Payment Management
  
  if (error) throw error;

  // Filtrar apenas usuários que NÃO têm aplicação (igual ao Payment Management)
  const applicationUserIds = applications?.map(app => app.user_profiles?.user_id).filter(Boolean) || [];
  return (data || []).filter((user: any) => !applicationUserIds.includes(user.user_id));
}

/**
 * Busca overrides de taxas para todos os usuários
 */
async function loadFeeOverrides(userIds: string[]): Promise<{ [key: string]: any }> {
  if (userIds.length === 0) return {};

  const overrideEntries = await Promise.allSettled(
    userIds.map(async (userId) => {
      const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: userId });
      return { userId, data: error ? null : data };
    })
  );
  
  return overrideEntries.reduce((acc: { [key: string]: any }, res) => {
    if (res.status === 'fulfilled') {
      const { userId, data } = res.value;
      if (data) {
        acc[userId] = {
          selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
          application_fee: data.application_fee != null ? Number(data.application_fee) : undefined,
          scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
          i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
        };
      }
    }
    return acc;
  }, {});
}

/**
 * Busca system_type de todos os usuários
 */
async function loadUserSystemTypes(userIds: string[]): Promise<Map<string, string>> {
  const userSystemTypesMap = new Map<string, string>();
  
  if (userIds.length === 0) return userSystemTypesMap;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, system_type')
    .in('user_id', userIds);

  if (error) {
    console.warn('⚠️ Erro ao buscar system_type:', error);
  } else {
    data?.forEach(st => {
      userSystemTypesMap.set(st.user_id, st.system_type || 'legacy');
    });
  }

  return userSystemTypesMap;
}

/**
 * Busca valores reais de pagamento da tabela affiliate_referrals
 */
async function loadRealPaymentAmounts(userIds: string[]): Promise<Map<string, number>> {
  const realPaymentAmounts = new Map<string, number>();
  
  if (userIds.length === 0) return realPaymentAmounts;

  const batchSize = 50;
  let allAffiliateReferrals: any[] = [];
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    
    const { data: batchData, error: batchError } = await supabase
      .from('affiliate_referrals')
      .select('referred_id, payment_amount')
      .in('referred_id', batch);

    if (batchError) {
      console.warn(`⚠️ Erro ao buscar lote ${Math.floor(i/batchSize) + 1}:`, batchError);
    } else {
      if (batchData) {
        allAffiliateReferrals = allAffiliateReferrals.concat(batchData);
      }
    }
  }

  allAffiliateReferrals?.forEach(ar => {
    realPaymentAmounts.set(ar.referred_id, ar.payment_amount);
  });

  return realPaymentAmounts;
}

/**
 * Busca requisições de pagamento universitário
 */
async function loadUniversityRequests(currentRange: DateRange): Promise<any[]> {
  // Primeiro tenta payout, depois payment
  const tryPayout = await supabase
    .from('university_payout_requests')
    .select('*')
    .gte('created_at', currentRange.start.toISOString())
    .lte('created_at', currentRange.end.toISOString());
    
  if (!tryPayout.error) {
    return tryPayout.data || [];
  }
  
  const tryPayment = await supabase
    .from('university_payment_requests')
    .select('*')
    .gte('created_at', currentRange.start.toISOString())
    .lte('created_at', currentRange.end.toISOString());
    
  return tryPayment.data || [];
}

/**
 * Busca requisições de afiliados
 */
async function loadAffiliateRequests(currentRange: DateRange): Promise<any[]> {
  // ✅ USAR A MESMA RPC DO PAYMENT MANAGEMENT
  // O Payment Management usa RPC get_all_affiliate_payment_requests que retorna todos os requests
  let data: any[] = [];
  let error: any = null;
  
  try {
    const result = await supabase.rpc('get_all_affiliate_payment_requests');
    data = result.data || [];
    error = result.error;
  } catch (err) {
    // Fallback: se a RPC não existir, usar query direta
    console.warn('⚠️ [FinancialAnalytics] RPC get_all_affiliate_payment_requests não disponível, usando query direta');
    const result = await supabase
      .from('affiliate_payment_requests')
      .select('*')
      .order('created_at', { ascending: false });
    data = result.data || [];
    error = result.error;
  }

  if (error) {
    console.error('❌ [FinancialAnalytics] Erro ao carregar affiliate requests:', error);
    throw error;
  }
  
  console.log('🔍 [FinancialAnalytics] Affiliate Requests carregados (antes do filtro):', {
    total: data?.length || 0,
    date_range: {
      start: currentRange.start.toISOString(),
      end: currentRange.end.toISOString()
    },
    requests: (data || []).map(req => ({
      id: req.id,
      status: req.status,
      amount_usd: req.amount_usd,
      paid_at: req.paid_at,
      created_at: req.created_at
    }))
  });
  
  // Filtrar por data de pagamento (paid_at) quando status é 'paid', senão usar created_at
  const filtered = (data || []).filter(req => {
    if (req.status === 'paid' && req.paid_at) {
      const paidAt = new Date(req.paid_at);
      const inRange = paidAt >= currentRange.start && paidAt <= currentRange.end;
      if (!inRange) {
        console.log(`⚠️ [FinancialAnalytics] Affiliate request ${req.id} (paid) fora do período: paid_at=${req.paid_at}, range=${currentRange.start.toISOString()} a ${currentRange.end.toISOString()}`);
      }
      return inRange;
    } else {
      // Para outros status, usar created_at
      const createdAt = new Date(req.created_at);
      const inRange = createdAt >= currentRange.start && createdAt <= currentRange.end;
      if (!inRange && req.status === 'paid') {
        console.log(`⚠️ [FinancialAnalytics] Affiliate request ${req.id} (paid sem paid_at) fora do período: created_at=${req.created_at}, range=${currentRange.start.toISOString()} a ${currentRange.end.toISOString()}`);
      }
      return inRange;
    }
  });
  
  console.log('✅ [FinancialAnalytics] Affiliate Requests após filtro:', {
    total: filtered.length,
    paid_count: filtered.filter(req => req.status === 'paid').length
  });
  
  return filtered;
}

/**
 * Carrega todos os dados financeiros necessários
 */
export async function loadFinancialData(
  currentRange: DateRange
): Promise<LoadedFinancialData> {
  console.log('🚀 [FinancialAnalytics] loadFinancialData iniciado');
  
  // Calcular período anterior
  const prevRange = getPreviousPeriodRange(currentRange);

  // Carregar dados em paralelo quando possível
  const [applicationsRaw, zellePaymentsRaw, allStudentsRaw] = await Promise.all([
    loadApplications(),
    loadZellePayments(currentRange),
    loadAllStudents()
  ]);

  // Filtrar dados em produção/staging: excluir usuários com email @uorak.com
  const filterActive = shouldFilter();
  console.log('🔍 [FinancialAnalytics] Filtro ativo:', filterActive);
  console.log('🔍 [FinancialAnalytics] Dados antes do filtro:', {
    applications: applicationsRaw.length,
    zellePayments: zellePaymentsRaw.length,
    allStudents: allStudentsRaw.length
  });
  
  const applications = filterActive
    ? applicationsRaw.filter((app: any) => !shouldExcludeStudent(app.user_profiles?.email))
    : applicationsRaw;

  const zellePayments = filterActive
    ? zellePaymentsRaw.filter((payment: any) => !shouldExcludeStudent(payment.user_profiles?.email))
    : zellePaymentsRaw;

  const allStudents = filterActive
    ? allStudentsRaw.filter((student: any) => !shouldExcludeStudent(student.email))
    : allStudentsRaw;
    
  console.log('🔍 [FinancialAnalytics] Dados depois do filtro:', {
    applications: applications.length,
    zellePayments: zellePayments.length,
    allStudents: allStudents.length
  });

  // Carregar dados do período anterior
  const [applicationsPrevRaw, zellePaymentsPrevRaw] = await Promise.all([
    loadApplicationsPrev(prevRange),
    loadZellePaymentsPrev(prevRange)
  ]);

  // Filtrar dados do período anterior também
  const applicationsPrev = shouldFilter()
    ? applicationsPrevRaw.filter((app: any) => !shouldExcludeStudent(app.user_profiles?.email))
    : applicationsPrevRaw;

  const zellePaymentsPrev = zellePaymentsPrevRaw; // Zelle payments do período anterior não têm user_profiles carregado

  // Carregar usuários Stripe (depende de applications já filtradas)
  const stripeUsersRaw = await loadStripeUsers(applications);
  
  // Filtrar stripeUsers também
  const stripeUsers = shouldFilter()
    ? stripeUsersRaw.filter((user: any) => !shouldExcludeStudent(user.email))
    : stripeUsersRaw;

  // Coletar todos os user_ids únicos
  const allUserIds = [
    ...(applications?.map(app => app.user_profiles?.user_id).filter(Boolean) || []),
    ...(zellePayments?.map(payment => payment.user_id).filter(Boolean) || []),
    ...(stripeUsers?.map(user => user.user_id).filter(Boolean) || [])
  ];
  const uniqueUserIds = [...new Set(allUserIds)];

  // Carregar dados relacionados aos usuários em paralelo
  const [overridesMap, userSystemTypesMap, realPaymentAmounts] = await Promise.all([
    loadFeeOverrides(uniqueUserIds),
    loadUserSystemTypes(uniqueUserIds),
    loadRealPaymentAmounts(uniqueUserIds)
  ]);

  // Carregar requisições de pagamento
  const [universityRequests, affiliateRequests] = await Promise.all([
    loadUniversityRequests(currentRange),
    loadAffiliateRequests(currentRange)
  ]);

  return {
    applications,
    zellePayments,
    universityRequests,
    affiliateRequests,
    applicationsPrev,
    zellePaymentsPrev,
    allStudents,
    stripeUsers,
    overridesMap,
    userSystemTypesMap,
    realPaymentAmounts
  };
}

