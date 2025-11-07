import type { DateRange, FinancialMetrics, RevenueData, ProcessedFinancialData } from '../data/types';

/**
 * Calcula revenueData (buckets por dia) baseado nos payment records
 */
export function calculateRevenueData(
  paymentRecords: any[],
  currentRange: DateRange
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

  Object.entries(dayBuckets).forEach(([date, vals]) => {
    revenueData.push({ date, revenue: vals.revenue, payments: vals.payments, students: vals.students });
  });
  revenueData.sort((a, b) => a.date.localeCompare(b.date));

  console.log('📅 Revenue Data:', revenueData);
  console.log('💵 Total Revenue from Records:', paidRecords.reduce((sum, p) => sum + p.amount, 0));
  console.log('🔢 Total Payments from Records:', paidRecords.length);

  return revenueData;
}

/**
 * Calcula métricas financeiras finais
 */
export function calculateFinalMetrics(
  processedData: ProcessedFinancialData,
  revenueData: RevenueData[],
  universityRequests: any[],
  affiliateRequests: any[],
  allStudents: any[]
): FinancialMetrics {
  const paidRecords = processedData.paymentRecords.filter(p => p.status === 'paid');
  const totalPayments = processedData.paymentRecords.length;
  const paidPayments = paidRecords.length;
  const pendingPayments = totalPayments - paidPayments;
  const totalRevenue = processedData.metrics.totalRevenue;
  
  const conversionRate = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;
  const averageTransactionValue = paidPayments > 0 ? totalRevenue / paidPayments : 0;
  
  // Calcular crescimento comparando com período anterior (simplificado)
  const revenueGrowth = 0; // Simplificado por agora

  // Contar payouts
  const pendingPayouts = universityRequests.filter(req => req.status === 'pending' || req.status === 'approved').length +
                        affiliateRequests.filter(req => req.status === 'pending' || req.status === 'approved').length;
  const completedPayouts = universityRequests.filter(req => req.status === 'paid').length +
                           affiliateRequests.filter(req => req.status === 'paid').length;
  const completedAffiliatePayouts = affiliateRequests.filter(req => req.status === 'paid').length;
  const completedUniversityPayouts = universityRequests.filter(req => req.status === 'paid').length;

  // 🔍 DEBUG: Verificar affiliate requests
  console.log('🔍 [FinancialAnalytics] Affiliate Requests Debug:', {
    total_requests: affiliateRequests.length,
    requests_with_status_paid: affiliateRequests.filter(req => req.status === 'paid').length,
    all_requests: affiliateRequests.map(req => ({
      id: req.id,
      status: req.status,
      amount_usd: req.amount_usd,
      amount: req.amount,
      paid_at: req.paid_at,
      created_at: req.created_at
    }))
  });

  // Payouts aprovados/completados (status 'paid') - apenas os que o admin aprovou
  const universityPayouts = universityRequests
    .filter(req => req.status === 'paid')
    .reduce((sum, req) => sum + (req.amount || 0), 0);
  
  // ✅ CORREÇÃO: Usar amount_usd (campo correto da tabela affiliate_payment_requests)
  const paidAffiliateRequests = affiliateRequests.filter(req => req.status === 'paid');
  const affiliatePayouts = paidAffiliateRequests.reduce((sum, req) => {
    // amount_usd está em dólares, converter para centavos
    const amountUsd = req.amount_usd || 0;
    const amountInCents = Math.round(amountUsd * 100);
    console.log(`💰 [FinancialAnalytics] Affiliate Request ${req.id}: amount_usd=${amountUsd}, amount_in_cents=${amountInCents}`);
    return sum + amountInCents;
  }, 0);
  
  console.log('💰 [FinancialAnalytics] Affiliate Payouts Calculated:', {
    paid_requests_count: paidAffiliateRequests.length,
    total_cents: affiliatePayouts,
    total_dollars: (affiliatePayouts / 100).toFixed(2)
  });

  return {
    totalRevenue,
    monthlyRevenue: totalRevenue, // Para o período selecionado
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
    affiliatePayouts
  };
}

