import { supabase } from '../../../../../lib/supabase';
import type { DateRange, LoadedFinancialData } from '../types';
import { getPreviousPeriodRange } from '../../utils/dateRange';
import { getPaymentDatesForUsersLoaderOptimized } from '@/pages/AdminDashboard/PaymentManagement/data/loaders/paymentDatesLoaderOptimized';

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
        i20_control_fee_payment_method,
        placement_fee_payment_method,
        is_placement_fee_paid,
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
      .select('id, user_id, full_name, email, has_paid_selection_process_fee, is_application_fee_paid, is_scholarship_fee_paid, has_paid_i20_control_fee, is_placement_fee_paid, selection_process_fee_payment_method, i20_control_fee_payment_method, placement_fee_payment_method, scholarship_package_id, dependents, seller_referral_code')
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
    .select('id, user_id, email, full_name, dependents, system_type, seller_referral_code')
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
      i20_control_fee_payment_method,
      placement_fee_payment_method,
      is_placement_fee_paid,
      seller_referral_code
    `)
    .eq('role', 'student')
    .or('has_paid_selection_process_fee.eq.true,is_application_fee_paid.eq.true,is_scholarship_fee_paid.eq.true,has_paid_i20_control_fee.eq.true,is_placement_fee_paid.eq.true');
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
          placement_fee: data.placement_fee != null ? Number(data.placement_fee) : undefined,
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
 * Busca pagamentos da tabela individual_fee_payments (Stripe e outros)
 */
async function loadIndividualFeePayments(): Promise<any[]> {
  // First, get the payments - REMOVIDO filtro de data para garantir match com histórico dos alunos
  const { data: payments, error: paymentsError } = await supabase
    .from('individual_fee_payments')
    .select('id, user_id, fee_type, amount, gross_amount_usd, fee_amount_usd, payment_date, payment_method, payment_intent_id, parcelow_status')
    .order('payment_date', { ascending: false });

  if (paymentsError) {
    console.error('❌ [FinancialAnalytics] Erro ao carregar pagamentos individuais:', paymentsError);
    return [];
  }

  if (!payments || payments.length === 0) {
    return [];
  }

  // Get unique user IDs from payments
  const userIds = [...new Set(payments.map(p => p.user_id))];

  // Fetch user profiles for payment methods (selection_process and i20_control)
  const { data: userProfiles } = await supabase
    .from('user_profiles')
    .select('user_id, selection_process_fee_payment_method, i20_control_fee_payment_method, placement_fee_payment_method')
    .in('user_id', userIds);

  // Fetch scholarship applications for payment methods (application_fee and scholarship_fee)
  // First, get student profile IDs from user IDs
  const { data: studentProfiles } = await supabase
    .from('user_profiles')
    .select('id, user_id')
    .in('user_id', userIds);
  
  const studentProfileIds = studentProfiles?.map(sp => sp.id) || [];
  
  // Fetch scholarship applications with payment methods
  // For application_fee: get the one where is_application_fee_paid = true
  // For scholarship_fee: get the one where is_scholarship_fee_paid = true
  const { data: scholarshipApplications } = studentProfileIds.length > 0
    ? await supabase
        .from('scholarship_applications')
        .select('student_id, application_fee_payment_method, scholarship_fee_payment_method, is_application_fee_paid, is_scholarship_fee_paid, created_at')
        .in('student_id', studentProfileIds)
        .order('created_at', { ascending: false })
    : { data: null };

  // Create lookup maps
  const userProfilesMap = new Map(
    (userProfiles || []).map(up => [up.user_id, up])
  );
  
  // Create separate maps for application_fee and scholarship_fee
  // For application_fee: use the application where is_application_fee_paid = true
  // For scholarship_fee: use the application where is_scholarship_fee_paid = true
  const applicationFeeMap = new Map<string, any>();
  const scholarshipFeeMap = new Map<string, any>();
  
  (scholarshipApplications || []).forEach(sa => {
    // For application_fee: prioritize the one where payment was made
    if (sa.is_application_fee_paid) {
      if (!applicationFeeMap.has(sa.student_id)) {
        applicationFeeMap.set(sa.student_id, sa);
      } else {
        // If multiple paid, prefer the one with payment_method filled or most recent
        const existing = applicationFeeMap.get(sa.student_id);
        if (sa.application_fee_payment_method && !existing?.application_fee_payment_method) {
          applicationFeeMap.set(sa.student_id, sa);
        } else if (!existing?.application_fee_payment_method && !sa.application_fee_payment_method) {
          // Both don't have payment_method, keep the most recent (already ordered)
          if (new Date(sa.created_at) > new Date(existing.created_at)) {
            applicationFeeMap.set(sa.student_id, sa);
          }
        }
      }
    }
    
    // For scholarship_fee: prioritize the one where payment was made
    if (sa.is_scholarship_fee_paid) {
      if (!scholarshipFeeMap.has(sa.student_id)) {
        scholarshipFeeMap.set(sa.student_id, sa);
      } else {
        // If multiple paid, prefer the one with payment_method filled or most recent
        const existing = scholarshipFeeMap.get(sa.student_id);
        if (sa.scholarship_fee_payment_method && !existing?.scholarship_fee_payment_method) {
          scholarshipFeeMap.set(sa.student_id, sa);
        } else if (!existing?.scholarship_fee_payment_method && !sa.scholarship_fee_payment_method) {
          // Both don't have payment_method, keep the most recent (already ordered)
          if (new Date(sa.created_at) > new Date(existing.created_at)) {
            scholarshipFeeMap.set(sa.student_id, sa);
          }
        }
      }
    }
  });

  // Fetch overrides for these users
  const { data: overrides } = await supabase
    .from('user_fee_overrides')
    .select('user_id, selection_process_fee, application_fee, scholarship_fee, i20_control_fee, placement_fee')
    .in('user_id', userIds);

  // Fetch coupon usage for these users and date range
  const { data: couponUsages } = await supabase
    .from('promotional_coupon_usage')
    .select(`
      user_id,
      fee_type,
      coupon_code,
      discount_amount,
      original_amount,
      coupon_id,
      applied_at
    `)
    .in('user_id', userIds)
    .eq('status', 'applied');

  // Fetch coupon details if we have any coupon usages
  let coupons: any[] = [];
  if (couponUsages && couponUsages.length > 0) {
    const couponIds = [...new Set(couponUsages.map(cu => cu.coupon_id).filter(Boolean))];
    if (couponIds.length > 0) {
      const { data: couponsData } = await supabase
        .from('promotional_coupons')
        .select('id, code, name, discount_type, discount_value')
        .in('id', couponIds);
      coupons = couponsData || [];
    }
  }

  // Create lookup maps
  const overridesMap = new Map(
    (overrides || []).map(o => [o.user_id, o])
  );

  const couponsMap = new Map(
    coupons.map(c => [c.id, c])
  );

  // Transform and merge data
  const transformedData = payments.map(payment => {
    const override = overridesMap.get(payment.user_id);
    
    // Find matching coupon usage for this payment
    const couponUsage = (couponUsages || []).find(cu => 
      cu.user_id === payment.user_id && 
      cu.fee_type === payment.fee_type &&
      new Date(cu.applied_at).getTime() <= new Date(payment.payment_date).getTime()
    );
    
    const coupon = couponUsage?.coupon_id ? couponsMap.get(couponUsage.coupon_id) : null;
    
    // Get payment method from correct source based on fee type
    // Always fetch from the correct table, regardless of what's in individual_fee_payments
    let paymentMethod = 'manual';
    const userProfile = userProfilesMap.get(payment.user_id);
    
    if (payment.fee_type === 'selection_process' || payment.fee_type === 'selection_process_fee') {
      paymentMethod = userProfile?.selection_process_fee_payment_method || 'manual';
    } else if (payment.fee_type === 'i20_control' || payment.fee_type === 'i20_control_fee') {
      paymentMethod = userProfile?.i20_control_fee_payment_method || 'manual';
    } else if (payment.fee_type === 'application' || payment.fee_type === 'application_fee') {
      // Find student profile ID (id) for this user_id
      const studentProfile = studentProfiles?.find(sp => sp.user_id === payment.user_id);
      if (studentProfile) {
        // Use the application where is_application_fee_paid = true
        const scholarshipApp = applicationFeeMap.get(studentProfile.id);
        paymentMethod = scholarshipApp?.application_fee_payment_method || 'manual';
      }
    } else if (payment.fee_type === 'scholarship' || payment.fee_type === 'scholarship_fee') {
      // Find student profile ID (id) for this user_id
      const studentProfile = studentProfiles?.find(sp => sp.user_id === payment.user_id);
      if (studentProfile) {
        // Use the application where is_scholarship_fee_paid = true
        const scholarshipApp = scholarshipFeeMap.get(studentProfile.id);
        paymentMethod = scholarshipApp?.scholarship_fee_payment_method || 'manual';
      }
    } else if (payment.fee_type === 'placement' || payment.fee_type === 'placement_fee') {
      paymentMethod = userProfile?.placement_fee_payment_method || 'manual';
    } else {
      // Fallback to payment_method from individual_fee_payments if fee_type doesn't match
      paymentMethod = payment.payment_method || 'manual';
    }
    
    return {
      ...payment,
      payment_method: paymentMethod,
      override_selection_process: override?.selection_process_fee || null,
      override_application: override?.application_fee || null,
      override_scholarship: override?.scholarship_fee || null,
      override_i20: override?.i20_control_fee || null,
      override_placement: override?.placement_fee || null,
      coupon_code: couponUsage?.coupon_code || null,
      coupon_name: coupon?.name || null,
      discount_amount: couponUsage?.discount_amount || null,
      original_amount: couponUsage?.original_amount || null,
      discount_type: coupon?.discount_type || null,
      discount_value: coupon?.discount_value || null
    };
  });

  return transformedData;
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
  const [applicationsRaw, zellePaymentsRaw, allStudentsRaw, individualFeePayments] = await Promise.all([
    loadApplications(),
    loadZellePayments(currentRange),
    loadAllStudents(),
    loadIndividualFeePayments()
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
    ...(applications?.map((app: any) => app.user_profiles?.user_id).filter(Boolean) || []),
    ...(zellePayments?.map((payment: any) => payment.user_id).filter(Boolean) || []),
    ...(stripeUsers?.map((user: any) => user.user_id).filter(Boolean) || [])
  ];
  const uniqueUserIds = [...new Set(allUserIds)];

  // Carregar dados relacionados aos usuários em paralelo
  const [overridesMap, userSystemTypesMap] = await Promise.all([
    loadFeeOverrides(uniqueUserIds),
    loadUserSystemTypes(uniqueUserIds)
  ]);
  
  // ✅ CORREÇÃO: Gerar realPaymentAmounts a partir de individualFeePayments carregados
  // Isso evita N chamadas extras ao banco e garante que o Transformer use exatamente os mesmos dados
  const realPaymentAmounts = new Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number; placement?: number }>();
  
  // Como individualFeePayments já vem ordenado por payment_date DESC, o primeiro de cada tipo é o mais recente
  individualFeePayments.forEach((payment: any) => {
    // Ignorar pagamentos Parcelow que não estão com status 'paid'
    if (payment.payment_method === 'parcelow' && payment.parcelow_status && payment.parcelow_status !== 'paid') return;
    
    // Valor bruto (gross)
    const amountUSD = payment.gross_amount_usd 
      ? Number(payment.gross_amount_usd) 
      : Number(payment.amount);
      
    const userId = payment.user_id;
    if (!realPaymentAmounts.has(userId)) {
      realPaymentAmounts.set(userId, {});
    }
    
    const userAmounts = realPaymentAmounts.get(userId)!;
    
    // Normalizar fee_type
    const feeTypeKey = payment.fee_type === 'selection_process' || payment.fee_type === 'selection_process_fee' ? 'selection_process' :
                      payment.fee_type === 'scholarship' || payment.fee_type === 'scholarship_fee' ? 'scholarship' :
                      payment.fee_type === 'i20_control' || payment.fee_type === 'i20_control_fee' ? 'i20_control' :
                      payment.fee_type === 'application' || payment.fee_type === 'application_fee' ? 'application' : 
                      payment.fee_type === 'placement' || payment.fee_type === 'placement_fee' ? 'placement' : null;

    if (feeTypeKey && (userAmounts as any)[feeTypeKey] === undefined) {
      (userAmounts as any)[feeTypeKey] = amountUSD;
      if (import.meta.env.DEV && userId === '35ebf05b-2981-4721-9c0f-2bc5f5f02537') {
         console.log(`[DEBUG-LOAD] ✅ Atribuído realPaymentAmount para Ágnis: ${feeTypeKey} = ${amountUSD}`);
      }
    }
  });

  // Carregar requisições de pagamento
  const [universityRequests, affiliateRequests] = await Promise.all([
    loadUniversityRequests(currentRange),
    loadAffiliateRequests(currentRange)
  ]);

  // ✅ CORREÇÃO: Carregar datas reais de pagamento (mesma lógica do PaymentManagement)
  const individualPaymentDates = await getPaymentDatesForUsersLoaderOptimized(supabase, uniqueUserIds);

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
    realPaymentAmounts, // Agora contém valores reais pagos via getGrossPaidAmounts
    individualFeePayments,
    individualPaymentDates // ✅ NOVO: Datas reais de pagamento
  };
}

