import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useFeeConfig } from '../../../../hooks/useFeeConfig';
import { loadFinancialData } from '../data/loaders/financialDataLoader';
import { transformFinancialData } from '../utils/transformFinancialData';
import { calculateRevenueData, calculateFinalMetrics, calculatePaymentMethodData, calculateFeeTypeData, calculateARPU, calculateFunnelData, calculateUniversityRevenue, calculateAffiliateSalesData } from '../utils/calculateMetrics';
import { getDateRange } from '../utils/dateRange';
import { exportFinancialDataToCSV } from '../data/services/exportService';
import { loadAffiliatesLoader } from '../../PaymentManagement/data/loaders/referencesLoader';
import { supabase } from '../../../../lib/supabase';
import type { 
  FinancialMetrics, 
  RevenueData, 
  PaymentMethodData, 
  FeeTypeData, 
  TimeFilter,
  StripeMetrics,
  UniversityRevenueData,
  FunnelStepData,
  AffiliateSalesData
} from '../data/types';

export function useFinancialAnalytics() {
  
  const { user } = useAuth();
  const { getFeeAmount } = useFeeConfig();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  
  // Refs para rastrear se já foi carregado e valores anteriores dos filtros
  const hasLoadedRef = useRef(false);
  const previousUserRef = useRef<string | null>(null);
  const previousFiltersRef = useRef<{
    timeFilter: TimeFilter;
    customDateFrom: string;
    customDateTo: string;
    showCustomDate: boolean;
    filterFeeType: string[];
    filterPaymentMethod: string[];
    filterValueMin: string;
    filterValueMax: string;
    filterAffiliate: string[];
  } | null>(null);
  
  // Cache para dados brutos do backend (evita refetch ao mudar filtros locais)
  const rawLoadedDataRef = useRef<any>(null);
  const rawProcessedDataRef = useRef<any>(null);
  
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    conversionRate: 0,
    averageTransactionValue: 0,
    totalStudents: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    completedAffiliatePayouts: 0,
    completedUniversityPayouts: 0,
    universityPayouts: 0,
    affiliatePayouts: 0,
    newUsers: 0,
    newUsersGrowth: 0
  });

  const [stripeMetrics, setStripeMetrics] = useState<StripeMetrics>({
    netIncome: 0,
    stripeFees: 0,
    grossValue: 0,
    totalTransactions: 0
  });

  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [feeTypeData, setFeeTypeData] = useState<FeeTypeData[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [availableFeeTypes, setAvailableFeeTypes] = useState<string[]>([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>([]);
  const [arpu, setArpu] = useState<number>(0);
  const [funnelData, setFunnelData] = useState<FunnelStepData[]>([]);
  const [universityRevenueData, setUniversityRevenueData] = useState<UniversityRevenueData[]>([]);
  const [affiliateSalesData, setAffiliateSalesData] = useState<AffiliateSalesData[]>([]);

  // Filtros de período
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [filterFeeType, setFilterFeeType] = useState<string[]>([]);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string[]>([]);
  const [filterValueMin, setFilterValueMin] = useState<string>('');
  const [filterValueMax, setFilterValueMax] = useState<string>('');
  const [filterAffiliate, setFilterAffiliate] = useState<string[]>([]);

  // Função separada para aplicar filtros locais sem ativar o spinner de loading global
  const applyFilters = useCallback(() => {
    if (!rawLoadedDataRef.current || !rawProcessedDataRef.current) return;

    const loadedData = rawLoadedDataRef.current;
    const processedData = rawProcessedDataRef.current;
    const currentRange = getDateRange(timeFilter, customDateFrom, customDateTo, showCustomDate);

    // 1. Definir os registros de pagamento base e mapas
    const paymentRecords = processedData.paymentRecords || [];
    const individualFeePaymentsList = loadedData.individualFeePayments || [];
    const individualFeePaymentsMap = new Map();
    const individualFeePaymentsByIntentId = new Map();
    
    individualFeePaymentsList.forEach((payment: any) => {
      const normalizedFeeType = payment.fee_type?.replace('_fee', '') || payment.fee_type;
      const key1 = `${payment.user_id}_${normalizedFeeType}`;
      const key2 = `${payment.user_id}_${payment.fee_type}`;
      if (!individualFeePaymentsMap.has(key1)) individualFeePaymentsMap.set(key1, payment);
      if (!individualFeePaymentsMap.has(key2)) individualFeePaymentsMap.set(key2, payment);
      if (payment.payment_intent_id) individualFeePaymentsByIntentId.set(payment.payment_intent_id, payment);
    });

    // 2. Aplicar Filtro de Data Primeiro (Base para opções de filtro e alguns charts)
    const { start, end } = currentRange;
    const filteredRecordsByDate = paymentRecords.filter((record: any) => {
      const paymentDate = new Date(record.payment_date || record.created_at || Date.now());
      return paymentDate >= start && paymentDate <= end;
    });

    // 3. Aplicar Filtros de Categoria, Método, Valor, etc. sobre os registros já filtrados por DATA
    let locallyFilteredRecords = filteredRecordsByDate;
    if (filterFeeType.length > 0) {
      // Normalizar o fee_type do registro para comparar com o canonical selecionado
      const FEE_CANONICAL_FILTER: Record<string, string> = {
        selection_process_fee: 'selection_process',
        application_fee: 'application',
        scholarship_fee: 'scholarship',
        i20_control: 'i20_control_fee',
        // ds160_package e i539_package são categorias separadas — não normalizar
        placement_fee: 'placement',
        reinstatement: 'reinstatement_fee',
        reinstatement_package: 'reinstatement_fee',
      };
      locallyFilteredRecords = locallyFilteredRecords.filter((record: any) => {
        const canonical = FEE_CANONICAL_FILTER[record.fee_type] ?? record.fee_type;
        return filterFeeType.includes(canonical);
      });

    }
    if (filterPaymentMethod.length > 0) {
      locallyFilteredRecords = locallyFilteredRecords.filter((record: any) => filterPaymentMethod.includes(record.payment_method));
    }
    if (filterValueMin) {
      const min = parseFloat(filterValueMin);
      if (!isNaN(min)) locallyFilteredRecords = locallyFilteredRecords.filter((record: any) => (record.amount / 100) >= min);
    }
    if (filterValueMax) {
      const max = parseFloat(filterValueMax);
      if (!isNaN(max)) locallyFilteredRecords = locallyFilteredRecords.filter((record: any) => (record.amount / 100) <= max);
    }
    if (filterAffiliate.length > 0) {
      locallyFilteredRecords = locallyFilteredRecords.filter((record: any) => {
        const sellerCode = record.seller_referral_code;
        if (!sellerCode) return false;
        const affiliate = affiliates.find(a => a.referral_code === sellerCode);
        return affiliate && filterAffiliate.includes(affiliate.id);
      });
    }

    const filteredRecordsForMetrics = locallyFilteredRecords; // Usado para tabela e charts específicos

    // 4. Recalcular métricas e dados de gráfico
    // finalMetrics recebe locallyFilteredRecords para poder calcular crescimento comparando períodos
    const finalMetrics = calculateFinalMetrics(
      { ...processedData, paymentRecords: locallyFilteredRecords },
      processedData.universityRequests || loadedData.universityRequests || [], // Priorizar Requests filtrados do range pelo loader
      processedData.affiliateRequests || loadedData.affiliateRequests || [],
      loadedData.allStudents,
      currentRange
    );

    // Todos os gráficos e métricas usam locallyFilteredRecords (pós todos os filtros aplicados)
    // Isso garante que o dashboard reaja como Power BI: todos os visuais se atualizam juntos
    const calculatedRevenueData = calculateRevenueData(locallyFilteredRecords, currentRange, loadedData.allStudents);
    const calculatedPaymentMethodData = calculatePaymentMethodData(locallyFilteredRecords);
    const calculatedFeeTypeData = calculateFeeTypeData(locallyFilteredRecords);

    // 4. Preparar transações para a tabela
    const transactionsWithNames = filteredRecordsForMetrics.map((record: any) => {
      const student = loadedData.allStudents.find((s: any) => s.user_id === record.student_id || s.id === record.student_id);
      const userId = student?.user_id || record.student_id || record.user_id;
      let individualPayment = null;
      
      if (userId) {
        const normalizedRecordFeeType = record.fee_type === 'selection_process' ? 'selection_process' :
                                       record.fee_type === 'application' ? 'application' :
                                       record.fee_type === 'scholarship' ? 'scholarship' :
                                       record.fee_type === 'i20_control_fee' ? 'i20_control' : 
                                       record.fee_type === 'reinstatement_fee' ? 'reinstatement_fee' : record.fee_type;
        
        if (record.payment_intent_id) individualPayment = individualFeePaymentsByIntentId.get(record.payment_intent_id);
        if (!individualPayment) {
          const key1 = `${userId}_${normalizedRecordFeeType}`;
          const key2 = `${userId}_${record.fee_type}`;
          individualPayment = individualFeePaymentsMap.get(key1) || individualFeePaymentsMap.get(key2);
        }
      }
      
      const standardAmount = calculateStandardAmount(record.fee_type, student?.system_type, Number(student?.dependents) || 0, (record.amount || 0) / 100);

      // Buscar overrides e cupons diretamente do cache de dados brutos
      const overridesMap = loadedData.overridesMap || {};
      const userOverride = overridesMap[userId] || {};
      
      // Buscar couponUsage nos dados brutos para as tags e info de Cupom
      const couponUsage = (loadedData.individualFeePayments || []).find((p: any) => 
        p.user_id === userId && p.fee_type === record.fee_type && p.coupon_code
      );

      // Calcular valores reais (Líquido, Bruto e Taxa)
      const netAmount = (record.amount || 0) / 100;
      let grossAmount = netAmount;
      let feeAmount = 0;
      
      // Buscar dados de pagamento individual carregados anteriormente no loop para compor Bruto/Taxa
      if (individualPayment) {
        if (individualPayment.gross_amount_usd != null) grossAmount = Number(individualPayment.gross_amount_usd);
        if (individualPayment.fee_amount_usd != null) feeAmount = Number(individualPayment.fee_amount_usd);
        else if (individualPayment.gross_amount_usd != null) feeAmount = Math.max(0, Number(individualPayment.gross_amount_usd) - netAmount);
      }

      return {
        ...record,
        amount: netAmount,
        gross_amount_usd: grossAmount,
        fee_amount_usd: feeAmount,
        student_name: record.student_name || student?.full_name || 'Unknown Student',
        student_email: record.student_email || student?.email || null,
        standard_amount: standardAmount,
        // Tags de Override: priorizar individualPayment (loader já faz o join correto), fallback para overridesMap
        override_selection_process: individualPayment?.override_selection_process ?? userOverride.selection_process_fee ?? null,
        override_application: individualPayment?.override_application ?? userOverride.application_fee ?? null,
        override_scholarship: individualPayment?.override_scholarship ?? userOverride.scholarship_fee ?? null,
        override_i20: individualPayment?.override_i20 ?? userOverride.i20_control_fee ?? null,
        override_placement: individualPayment?.override_placement ?? userOverride.placement_fee ?? record.override_placement ?? null,
        // Info de Cupom: priorizar individualPayment (loader faz join com promotional_coupon_usage)
        coupon_code: individualPayment?.coupon_code ?? couponUsage?.coupon_code ?? null,
        coupon_name: individualPayment?.coupon_name ?? couponUsage?.coupon_name ?? null,
        discount_amount: individualPayment?.discount_amount ?? couponUsage?.discount_amount ?? null
      };
    });function calculateStandardAmount(feeType: string, systemType: string, dependents: number, amount: number) {
  if (feeType === 'selection_process') return systemType === 'simplified' ? 350 : 400 + (dependents * 150);
  if (feeType === 'scholarship') return systemType === 'simplified' ? 550 : 900;
  if (feeType === 'i20_control_fee') return 900;
  if (feeType === 'application') return 350 + (dependents * 100);
  if (feeType === 'placement') return amount;
  if (feeType === 'reinstatement_fee') return 500;
  return amount;
}

    const stripePayments = transactionsWithNames.filter((p: any) => p.payment_method === 'stripe');
    const stripeMetricsCalculated = stripePayments.reduce((acc: any, p: any) => {
      if (new Date(p.payment_date) <= new Date('2025-11-20')) return acc;
      const amount = Number(p.amount) || 0;
      const gross = p.gross_amount_usd ? Number(p.gross_amount_usd) : amount;
      return {
        netIncome: acc.netIncome + amount,
        stripeFees: acc.stripeFees + (gross - amount),
        grossValue: acc.grossValue + gross,
        totalTransactions: acc.totalTransactions + 1
      };
    }, { netIncome: 0, stripeFees: 0, grossValue: 0, totalTransactions: 0 });

    setMetrics(finalMetrics);
    setStripeMetrics(stripeMetricsCalculated);
    setRevenueData(calculatedRevenueData);
    setPaymentMethodData(calculatedPaymentMethodData);
    setFeeTypeData(calculatedFeeTypeData);
    // 5. Atualizar Opções Disponíveis para Filtros
    // Usa TODOS os registros do período carregado (sem filtros adicionais) para que
    // todas as categorias apareçam no dropdown independente do período selecionado.
    // Normaliza variantes (ex: reinstatement_package → reinstatement_fee) para evitar duplicatas.
    const FEE_CANONICAL: Record<string, string> = {
      selection_process_fee: 'selection_process',
      application_fee: 'application',
      scholarship_fee: 'scholarship',
      i20_control: 'i20_control_fee',
      // ds160_package e i539_package são categorias separadas — não normalizar
      placement_fee: 'placement',
      reinstatement: 'reinstatement_fee',
      reinstatement_package: 'reinstatement_fee',
    };
    const canonicalTypes = new Set(
      paymentRecords.map((t: any) => FEE_CANONICAL[t.fee_type] ?? t.fee_type).filter(Boolean)
    );
    setAvailableFeeTypes(Array.from(canonicalTypes).sort() as string[]);

    const methods = new Set(paymentRecords.map((t: any) => t.payment_method).filter(Boolean));
    setAvailablePaymentMethods(Array.from(methods).sort() as string[]);


    // 6. Novos visuais (reagem aos filtros como Power BI)
    setArpu(calculateARPU(locallyFilteredRecords, loadedData.allStudents, currentRange));
    setFunnelData(calculateFunnelData(loadedData.allStudents, locallyFilteredRecords));
    setUniversityRevenueData(calculateUniversityRevenue(transactionsWithNames));
    setAffiliateSalesData(calculateAffiliateSalesData(locallyFilteredRecords, affiliates));

    setTransactions(transactionsWithNames);
    console.log('✅ Filters applied locally (Instant)');
  }, [timeFilter, customDateFrom, customDateTo, showCustomDate, filterFeeType, filterPaymentMethod, filterValueMin, filterValueMax, filterAffiliate, affiliates]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentRange = getDateRange(timeFilter, customDateFrom, customDateTo, showCustomDate);
      
      const [loadedData, affiliatesData] = await Promise.all([
        loadFinancialData(currentRange),
        loadAffiliatesLoader(supabase)
      ]);
      
      setAffiliates(affiliatesData || []);

      const processedData = await transformFinancialData({
        ...loadedData,
        currentRange,
        individualPaymentDates: loadedData.individualPaymentDates,
        getFeeAmount
      });

      // Salvar no cache para filtragem instantânea
      rawLoadedDataRef.current = loadedData;
      rawProcessedDataRef.current = processedData;

      applyFilters();
      console.log('✅ Remote data loaded and initial filters applied');
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeFilter, customDateFrom, customDateTo, showCustomDate, getFeeAmount, applyFilters]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    // Verificar se o usuário mudou
    const currentUserId = user.id || user.email || null;
    const userChanged = previousUserRef.current !== currentUserId;

    // Verificar se os filtros realmente mudaram
    const currentFilters = {
      timeFilter,
      customDateFrom,
      customDateTo,
      showCustomDate,
      filterFeeType,
      filterPaymentMethod,
      filterValueMin,
      filterValueMax,
      filterAffiliate
    };

    const previousFilters = previousFiltersRef.current;

    // Verificar se métricas de tempo ou usuário mudaram (exigem novo fetch)
    const timeFiltersChanged = !previousFilters || 
      previousFilters.timeFilter !== currentFilters.timeFilter ||
      previousFilters.customDateFrom !== currentFilters.customDateFrom ||
      previousFilters.customDateTo !== currentFilters.customDateTo ||
      previousFilters.showCustomDate !== currentFilters.showCustomDate;

    // Verificar se filtros locais mudaram (podem ser aplicados instantaneamente)
    const localFiltersChanged = previousFilters && (
      JSON.stringify(previousFilters.filterFeeType) !== JSON.stringify(currentFilters.filterFeeType) ||
      JSON.stringify(previousFilters.filterPaymentMethod) !== JSON.stringify(currentFilters.filterPaymentMethod) ||
      previousFilters.filterValueMin !== currentFilters.filterValueMin ||
      previousFilters.filterValueMax !== currentFilters.filterValueMax ||
      JSON.stringify(previousFilters.filterAffiliate) !== JSON.stringify(currentFilters.filterAffiliate)
    );

    if (!hasLoadedRef.current || userChanged || timeFiltersChanged) {
      hasLoadedRef.current = true;
      previousUserRef.current = currentUserId;
      previousFiltersRef.current = currentFilters;
      loadData();
    } else if (localFiltersChanged) {
      previousFiltersRef.current = currentFilters;
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeFilter, customDateFrom, customDateTo, showCustomDate, filterFeeType, filterPaymentMethod, filterValueMin, filterValueMax, filterAffiliate, loadData, applyFilters]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const handleExport = useCallback(() => {
    exportFinancialDataToCSV(metrics);
  }, [metrics]);

  const handleTimeFilterChange = useCallback((filter: TimeFilter) => {
    setTimeFilter(filter);
    setShowCustomDate(false);
  }, []);

  const handleCustomDateToggle = useCallback(() => {
    setShowCustomDate(prev => !prev);
  }, []);

  const toggleFeeType = useCallback((feeType: string) => {
    setFilterFeeType(prev =>
      prev.includes(feeType)
        ? prev.filter(t => t !== feeType)
        : [...prev, feeType]
    );
  }, []);

  const clearFeeType = useCallback(() => {
    setFilterFeeType([]);
  }, []);

  const togglePaymentMethod = useCallback((method: string) => {
    setFilterPaymentMethod(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  }, []);

  const clearPaymentMethod = useCallback(() => {
    setFilterPaymentMethod([]);
  }, []);

  const toggleAffiliate = useCallback((affiliateId: string) => {
    setFilterAffiliate(prev =>
      prev.includes(affiliateId)
        ? prev.filter(id => id !== affiliateId)
        : [...prev, affiliateId]
    );
  }, []);

  const clearAffiliate = useCallback(() => {
    setFilterAffiliate([]);
  }, []);

  return {
    loading,
    refreshing,
    metrics,
    stripeMetrics,
    revenueData,
    paymentMethodData,
    feeTypeData,
    transactions,
    timeFilter,
    showCustomDate,
    customDateFrom,
    customDateTo,
    filterFeeType,
    filterPaymentMethod,
    filterValueMin,
    filterValueMax,
    filterAffiliate,
    handleRefresh,
    handleExport,
    handleTimeFilterChange,
    handleCustomDateToggle,
    setCustomDateFrom,
    setCustomDateTo,
    toggleFeeType,
    clearFeeType,
    togglePaymentMethod,
    clearPaymentMethod,
    toggleAffiliate,
    clearAffiliate,
    setFilterValueMin,
    setFilterValueMax,
    affiliates,
    availableFeeTypes,
    availablePaymentMethods,
    arpu,
    funnelData,
    universityRevenueData,
    affiliateSalesData
  };
}

