import type { DateRange, FinancialMetrics, RevenueData, ProcessedFinancialData, PaymentMethodData, FeeTypeData, UniversityRevenueData, FunnelStepData, CouponImpactData, PaidVsPendingData, AffiliateSalesData, CohortRetentionData } from '../data/types';

/**
 * Calcula revenueData (buckets por dia) baseado nos payment records
 */
export function calculateRevenueData(
  paymentRecords: any[],
  currentRange: DateRange,
  allStudents: any[] = []
): RevenueData[] {
  const revenueData: RevenueData[] = [];
  const { start, end } = currentRange;
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const dayBuckets: Record<string, { revenue: number; payments: number; students: number }> = {};

  // Inicializa buckets por dia
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime());
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dayBuckets[key] = { revenue: 0, payments: 0, students: 0 };
  }

  // Processar registros de pagamento para buckets por data
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');
  paidRecords.forEach(record => {
    const createdAt = new Date(record.payment_date || record.created_at || Date.now());
    const key = createdAt.toISOString().split('T')[0];
    
    if (dayBuckets[key]) {
      dayBuckets[key].revenue += record.amount;
      dayBuckets[key].payments += 1;
    } else if (createdAt >= start && createdAt <= end) {
      dayBuckets[key] = { revenue: record.amount, payments: 1, students: 0 };
    }
  });

  // Processar novos estudantes para buckets por data
  allStudents.forEach(student => {
    const createdAt = new Date(student.created_at);
    const key = createdAt.toISOString().split('T')[0];
    
    if (dayBuckets[key]) {
      dayBuckets[key].students += 1;
    }
  });

  Object.entries(dayBuckets).forEach(([date, vals]) => {
    revenueData.push({ date, revenue: vals.revenue, payments: vals.payments, students: vals.students });
  });
  revenueData.sort((a, b) => a.date.localeCompare(b.date));

  return revenueData;
}

/**
 * Calcula métricas financeiras finais
 */
export function calculateFinalMetrics(
  processedData: ProcessedFinancialData,
  universityRequests: any[],
  affiliateRequests: any[],
  allStudents: any[],
  currentRange: DateRange
): FinancialMetrics {
  const allRecords = processedData.paymentRecords;
  const { start, end } = currentRange;

  // Filtrar registros do período atual
  const currentPeriodRecords = allRecords.filter(r => {
    const d = new Date(r.payment_date || r.created_at || Date.now());
    return d >= start && d <= end;
  });

  const paidRecords = allRecords.filter(p => p.status === 'paid'); 
  const currentPeriodPaidRecords = currentPeriodRecords.filter(p => p.status === 'paid');

  const totalPayments = currentPeriodRecords.length;
  const paidPayments = currentPeriodPaidRecords.length;
  const pendingPayments = totalPayments - paidPayments;
  
  const totalRevenue = currentPeriodPaidRecords.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const conversionRate = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;
  const averageTransactionValue = paidPayments > 0 ? totalRevenue / paidPayments : 0;
  
  // Calcular crescimento comparando com período anterior
  const prevDuration = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - prevDuration);
  const prevEnd = new Date(end.getTime() - prevDuration);

  const prevPaidRecords = paidRecords.filter(p => {
    const paymentDate = new Date(p.payment_date || p.created_at || Date.now());
    return paymentDate >= prevStart && paymentDate <= prevEnd;
  });
  
  const prevTotalRevenue = prevPaidRecords.reduce((sum, p) => sum + (p.amount || 0), 0);
  const revenueGrowth = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

  // Filtrar requisições pelo range atual
  const filteredUniRequests = universityRequests.filter(req => {
    const d = new Date(req.status === 'paid' && req.paid_at ? req.paid_at : req.created_at);
    return d >= start && d <= end;
  });

  const filteredAffRequests = affiliateRequests.filter(req => {
    const d = new Date(req.status === 'paid' && req.paid_at ? req.paid_at : req.created_at);
    return d >= start && d <= end;
  });

  // Contar payouts
  const pendingPayouts = filteredUniRequests.filter(req => req.status === 'pending' || req.status === 'approved').length +
                        filteredAffRequests.filter(req => req.status === 'pending' || req.status === 'approved').length;
  const completedPayouts = filteredUniRequests.filter(req => req.status === 'paid').length +
                           filteredAffRequests.filter(req => req.status === 'paid').length;
  const completedAffiliatePayouts = filteredAffRequests.filter(req => req.status === 'paid').length;
  const completedUniversityPayouts = filteredUniRequests.filter(req => req.status === 'paid').length;

  // Payouts aprovados/completados (status 'paid')
  const universityPayouts = filteredUniRequests
    .filter(req => req.status === 'paid')
    .reduce((sum, req) => sum + (req.amount || 0), 0);

  // ✅ CORREÇÃO: Usar amount_usd (campo correto da tabela affiliate_payment_requests)
  const paidAffiliateRequests = filteredAffRequests.filter(req => req.status === 'paid');
  const affiliatePayouts = paidAffiliateRequests.reduce((sum, req) => {
    const amountUsd = req.amount_usd || 0;
    return sum + Math.round(amountUsd * 100);
  }, 0);

  // Calcular novos estudantes no período
  const newUsers = allStudents.filter(student => {
    const createdAt = new Date(student.created_at);
    return createdAt >= start && createdAt <= end;
  }).length;

  const prevNewUsers = allStudents.filter(student => {
    const createdAt = new Date(student.created_at);
    return createdAt >= prevStart && createdAt <= prevEnd;
  }).length;

  const newUsersGrowth = prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers) * 100 : 0;
  
  // Calcular quantos pagaram o processo seletivo (Selection Process)
  const selectionProcessTypes = ['selection_process', 'selection_process_fee'];
  
  const currentSelectionPaidCount = new Set(
    currentPeriodPaidRecords
      .filter(r => selectionProcessTypes.includes(r.fee_type))
      .map(r => r.student_id || r.user_id)
  ).size;

  const prevSelectionPaidCount = new Set(
    prevPaidRecords
      .filter(r => selectionProcessTypes.includes(r.fee_type))
      .map(r => r.student_id || r.user_id)
  ).size;

  const selectionProcessGrowth = prevSelectionPaidCount > 0 
    ? ((currentSelectionPaidCount - prevSelectionPaidCount) / prevSelectionPaidCount) * 100 
    : 0;

  // ✅ CORREÇÃO: Já calculado no início da função
  const calculatedTotalRevenue = totalRevenue;

  return {
    totalRevenue: calculatedTotalRevenue,
    monthlyRevenue: calculatedTotalRevenue, // Para o período selecionado
    revenueGrowth,
    totalPayments,
    paidPayments,
    pendingPayments,
    conversionRate,
    averageTransactionValue,
    totalStudents: allStudents.length,
    pendingPayouts,
    completedPayouts,
    completedAffiliatePayouts,
    completedUniversityPayouts,
    universityPayouts,
    affiliatePayouts,
    newUsers,
    newUsersGrowth,
    selectionProcessPaidCount: currentSelectionPaidCount,
    selectionProcessGrowth,
    selectionConversionRate: newUsers > 0 ? (currentSelectionPaidCount / newUsers) * 100 : 0
  };
}

/**
 * Calcula distribuição por método de pagamento (para gráficos de pizza)
 */
export function calculatePaymentMethodData(paymentRecords: any[]): PaymentMethodData[] {
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');
  const totalRevenue = paidRecords.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const methods: Record<string, { count: number; revenue: number }> = {};
  
  paidRecords.forEach(record => {
    const rawMethod = record.payment_method || 'manual';
    const method = rawMethod === 'manual' ? 'Outside Payments' : rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1);
    
    if (!methods[method]) {
      methods[method] = { count: 0, revenue: 0 };
    }
    methods[method].count += 1;
    methods[method].revenue += (record.amount || 0);
  });
  
  return Object.entries(methods).map(([method, data]) => ({
    method,
    count: data.count,
    revenue: data.revenue,
    percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Calcula distribuição por tipo de taxa (para gráficos de pizza)
 */
export function calculateFeeTypeData(paymentRecords: any[]): FeeTypeData[] {
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');
  const totalRevenue = paidRecords.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const types: Record<string, { count: number; revenue: number }> = {};
  
  paidRecords.forEach(record => {
    const type = record.fee_type;
    if (!types[type]) {
      types[type] = { count: 0, revenue: 0 };
    }
    types[type].count += 1;
    types[type].revenue += (record.amount || 0);
  });
  
  return Object.entries(types).map(([feeType, data]) => ({
    feeType,
    count: data.count,
    revenue: data.revenue,
    percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Calcula o ARPU (receita media por aluno QUE PAGOU o processo seletivo no periodo)
 */
export function calculateARPU(totalRevenue: number, selectionProcessPaidCount: number): number {
  return selectionProcessPaidCount > 0 ? totalRevenue / selectionProcessPaidCount : 0;
}

/**
 * Calcula o funil de conversao por etapa de taxa
 */
export function calculateFunnelData(allStudents: any[], paymentRecords: any[]): FunnelStepData[] {
  const total = allStudents.length;
  if (total === 0) return [];

  const paidFeeTypes = new Map<string, Set<string>>();
  paymentRecords.filter(p => p.status === 'paid').forEach(p => {
    const userId = p.student_id || p.user_id;
    // Normalizar variantes de fee_type para chaves canônicas
    const raw = p.fee_type || '';
    let canonical = raw;
    if (raw === 'selection_process_fee') canonical = 'selection_process';
    if (raw === 'application_fee') canonical = 'application';
    if (raw === 'scholarship_fee') canonical = 'scholarship';
    if (raw === 'i20_control') canonical = 'i20_control_fee';
    // ds160_package e i539_package permanecem separados (não normalizar)
    if (raw === 'placement_fee') canonical = 'placement';
    if (raw === 'reinstatement' || raw === 'reinstatement_package') canonical = 'reinstatement_fee';

    if (!paidFeeTypes.has(canonical)) paidFeeTypes.set(canonical, new Set());
    paidFeeTypes.get(canonical)!.add(userId);
  });

  const stages = [
    { key: 'selection_process', label: 'Selection Process' },
    { key: 'application', label: 'Application Fee' },
    { key: 'i20_control_fee', label: 'I-20 Control Fee' },
    { key: 'ds160_package', label: 'DS-160 Package' },
    { key: 'i539_package', label: 'I-539 Package' },
    { key: 'scholarship', label: 'Scholarship Fee' },
    { key: 'placement', label: 'Placement Fee' },
    { key: 'reinstatement_fee', label: 'Reinstatement Fee' },
  ];

  return stages.map(stage => {
    const count = paidFeeTypes.get(stage.key)?.size || 0;
    return { stage: stage.label, count, percentage: (count / total) * 100 };
  });
}

/**
 * Calcula receita agrupada por universidade
 */
export function calculateUniversityRevenue(paymentRecords: any[]): UniversityRevenueData[] {
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');
  const uniMap = new Map<string, { revenue: number; count: number }>();

  paidRecords.forEach(record => {
    const name = record.university_name || 'Unknown';
    if (!uniMap.has(name)) uniMap.set(name, { revenue: 0, count: 0 });
    const entry = uniMap.get(name)!;
    entry.revenue += record.amount || 0;
    entry.count += 1;
  });

  return Array.from(uniMap.entries())
    .map(([universityName, data]) => ({ universityName, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Calcula o impacto de cupons: transacoes com e sem desconto
 */
export function calculateCouponImpact(paymentRecords: any[]): CouponImpactData {
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');
  const withCoupon = paidRecords.filter(p => p.coupon_code);
  const withoutCoupon = paidRecords.filter(p => !p.coupon_code);
  const totalDiscountCents = withCoupon.reduce((sum, p) => sum + ((p.discount_amount || 0) * 100), 0);

  return {
    withCoupon: withCoupon.reduce((sum, p) => sum + (p.amount || 0), 0),
    withoutCoupon: withoutCoupon.reduce((sum, p) => sum + (p.amount || 0), 0),
    totalDiscountCents: Math.round(totalDiscountCents),
    couponCount: withCoupon.length,
    nonCouponCount: withoutCoupon.length,
  };
}

/**
 * Calcula pagamentos pagos vs pendentes por categoria de taxa
 */
export function calculatePaidVsPending(paymentRecords: any[]): PaidVsPendingData[] {
  const feeLabels: Record<string, string> = {
    selection_process: 'Selection Process',
    selection_process_fee: 'Selection Process',
    application: 'Application',
    application_fee: 'Application',
    scholarship: 'Scholarship',
    scholarship_fee: 'Scholarship',
    i20_control: 'I-20 Control',
    i20_control_fee: 'I-20 Control',
    ds160_package: 'DS-160 Package',
    i539_package: 'I-539 Package',
    placement: 'Placement',
    placement_fee: 'Placement',
    reinstatement: 'Reinstatement',
    reinstatement_fee: 'Reinstatement',
    reinstatement_package: 'Reinstatement',
  };

  const map = new Map<string, { paid: number; pending: number; paidRevenue: number }>();

  paymentRecords.forEach(record => {
    const raw = record.fee_type || 'other';
    const label = feeLabels[raw] || raw;
    if (!map.has(label)) map.set(label, { paid: 0, pending: 0, paidRevenue: 0 });
    const entry = map.get(label)!;
    if (record.status === 'paid') {
      entry.paid += 1;
      entry.paidRevenue += record.amount || 0;
    } else {
      entry.pending += 1;
    }
  });

  return Array.from(map.entries())
    .map(([feeType, data]) => ({ feeType, ...data }))
    .sort((a, b) => b.paid - a.paid);
}

/**
 * Calcula a quantidade de vendas por afiliado
 */
export function calculateAffiliateSalesData(paymentRecords: any[], affiliates: any[]): AffiliateSalesData[] {
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');
  const affiliateSalesMap = new Map<string, { count: number; code: string; revenue: number }>();

  paidRecords.forEach(record => {
    const sellerCode = record.seller_referral_code;
    if (sellerCode) {
      let sellerName = `Código: ${sellerCode}`;
      
      // Procurar o nome correto no array de afiliados e seus vendedores internos
      for (const affiliate of affiliates) {
        if (affiliate.referral_code === sellerCode) {
          sellerName = affiliate.name;
          break;
        }
        
        if (affiliate.sellers && Array.isArray(affiliate.sellers)) {
          const matchingSeller = affiliate.sellers.find((s: any) => s.referral_code === sellerCode);
          if (matchingSeller && matchingSeller.name) {
            sellerName = matchingSeller.name;
            break;
          }
        }
      }
      
      const currentData = affiliateSalesMap.get(sellerName) || { count: 0, code: sellerCode, revenue: 0 };
      currentData.count += 1;
      currentData.revenue += record.amount || 0;
      affiliateSalesMap.set(sellerName, currentData);
    }
  });

  return Array.from(affiliateSalesMap.entries())
    .map(([affiliateName, data]) => ({ 
      affiliateName, 
      sellerCode: data.code,
      salesCount: data.count,
      totalRevenueCents: data.revenue
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
    .slice(0, 10);
}
/**
 * Calcula a retenção por cohort mensal.
 * Cohort = mês em que o aluno pagou o processo seletivo.
 * Fluxo atual: selection_process → application → ds160_package | i539_package → placement
 * Legado: i20_control_fee, scholarship, reinstatement_fee (mantidos para cohorts históricos)
 */
export function calculateCohortRetention(paymentRecords: any[]): CohortRetentionData[] {
  const paidRecords = paymentRecords.filter(p => p.status === 'paid');

  // Normalização de fee_type para chaves canônicas
  const normalize = (raw: string): string => {
    if (raw === 'selection_process_fee') return 'selection_process';
    if (raw === 'application_fee')       return 'application';
    if (raw === 'scholarship_fee')       return 'scholarship';
    if (raw === 'i20_control')           return 'i20_control_fee';
    if (raw === 'placement_fee')         return 'placement';
    if (raw === 'reinstatement' || raw === 'reinstatement_package') return 'reinstatement_fee';
    return raw; // ds160_package, i539_package passam sem alteração
  };

  // Mapa: userId → { feeTypes pagos, mês do selection_process }
  const userPayments = new Map<string, { feeTypes: Set<string>; selectionMonth: string | null }>();

  paidRecords.forEach(record => {
    const userId = record.student_id || record.user_id;
    if (!userId) return;
    const feeType = normalize(record.fee_type || '');

    if (!userPayments.has(userId)) {
      userPayments.set(userId, { feeTypes: new Set(), selectionMonth: null });
    }
    const entry = userPayments.get(userId)!;
    entry.feeTypes.add(feeType);

    if (feeType === 'selection_process') {
      const paymentDate = new Date(record.payment_date || record.created_at || Date.now());
      const month = paymentDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      entry.selectionMonth = month;
    }
  });

  type CohortEntry = {
    size: number;
    application: number;
    ds160_package: number;
    i539_package: number;
    placement: number;
    i20_control: number;
    scholarship: number;
    reinstatement: number;
    date: Date;
  };

  const cohortMap = new Map<string, CohortEntry>();

  userPayments.forEach(({ feeTypes, selectionMonth }) => {
    if (!selectionMonth) return;

    if (!cohortMap.has(selectionMonth)) {
      const parts = selectionMonth.split(' ');
      const monthIdx: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
      const date = new Date(parseInt(parts[1]), monthIdx[parts[0]] ?? 0, 1);
      cohortMap.set(selectionMonth, { size: 0, application: 0, ds160_package: 0, i539_package: 0, placement: 0, i20_control: 0, scholarship: 0, reinstatement: 0, date });
    }

    const cohort = cohortMap.get(selectionMonth)!;
    cohort.size += 1;
    if (feeTypes.has('application'))      cohort.application += 1;
    if (feeTypes.has('ds160_package'))    cohort.ds160_package += 1;
    if (feeTypes.has('i539_package'))     cohort.i539_package += 1;
    if (feeTypes.has('placement'))        cohort.placement += 1;
    if (feeTypes.has('i20_control_fee'))  cohort.i20_control += 1;
    if (feeTypes.has('scholarship'))      cohort.scholarship += 1;
    if (feeTypes.has('reinstatement_fee')) cohort.reinstatement += 1;
  });

  return Array.from(cohortMap.entries())
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    .slice(-12)
    .map(([cohortMonth, data]) => ({
      cohortMonth,
      cohortSize: data.size,
      application: data.application,
      ds160_package: data.ds160_package,
      i539_package: data.i539_package,
      placement: data.placement,
      i20_control: data.i20_control,
      scholarship: data.scholarship,
      reinstatement: data.reinstatement,
    }));
}
