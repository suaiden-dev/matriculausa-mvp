import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useFeeConfig } from '../../../../hooks/useFeeConfig';
import { loadFinancialData } from '../data/loaders/financialDataLoader';
import { transformFinancialData } from '../utils/transformFinancialData';
import { calculateRevenueData, calculateFinalMetrics } from '../utils/calculateMetrics';
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
  StripeMetrics
} from '../data/types';

export function useFinancialAnalytics() {
  console.log('🚀 [useFinancialAnalytics] Hook iniciado');
  
  const { user } = useAuth();
  const { getFeeAmount } = useFeeConfig();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  console.log('🚀 [useFinancialAnalytics] User:', user?.email, 'Role:', user?.role);
  
  // Refs para rastrear se já foi carregado e valores anteriores dos filtros
  const hasLoadedRef = useRef(false);
  const previousUserRef = useRef<string | null>(null);
  const previousFiltersRef = useRef<{
    timeFilter: TimeFilter;
    customDateFrom: string;
    customDateTo: string;
    showCustomDate: boolean;
  } | null>(null);
  
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
    affiliatePayouts: 0
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

  // Filtros de período
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  const loadData = useCallback(async () => {
    try {
      console.log('🚀 [useFinancialAnalytics] loadData iniciado');
      setLoading(true);

      const currentRange = getDateRange(timeFilter, customDateFrom, customDateTo, showCustomDate);
      console.log('🚀 [useFinancialAnalytics] DateRange:', currentRange);
      
      // Load affiliates in parallel
      const [loadedData, affiliatesData] = await Promise.all([
        loadFinancialData(currentRange),
        loadAffiliatesLoader(supabase)
      ]);
      
      setAffiliates(affiliatesData || []);

      // Transformar dados
      const processedData = await transformFinancialData({
        ...loadedData,
        currentRange,
        getFeeAmount
      });

      // Calcular revenueData
      const calculatedRevenueData = calculateRevenueData(
        processedData.paymentRecords,
        currentRange
      );

      // Calcular métricas finais
      const finalMetrics = calculateFinalMetrics(
        processedData,
        calculatedRevenueData,
        loadedData.universityRequests,
        loadedData.affiliateRequests,
        loadedData.allStudents
      );

      // ✅ CORREÇÃO: Usar paymentRecords de transformFinancialData (mesma lógica do PaymentManagement)
      // Isso garante que temos exatamente os mesmos registros que o PaymentManagement mostra
      // paymentRecords já está filtrado e deduplicado corretamente
      const paymentRecords = processedData.paymentRecords || [];
      
      // Buscar dados de individual_fee_payments apenas para informações adicionais (coupons, overrides, etc.)
      const individualFeePaymentsMap = new Map();
      (loadedData.individualFeePayments || []).forEach((payment: any) => {
        const key = `${payment.user_id}_${payment.fee_type}`;
        if (!individualFeePaymentsMap.has(key)) {
          individualFeePaymentsMap.set(key, payment);
        }
      });
      
      // Transformar paymentRecords em transactions (formato esperado pela tabela)
      const transactionsWithNames = paymentRecords.map((record: any) => {
        const student = loadedData.allStudents.find((s: any) => 
          s.user_id === record.student_id || s.id === record.student_id
        );
        
        // Buscar dados adicionais de individual_fee_payments se disponível
        const feeTypeKey = record.fee_type === 'selection_process' ? 'selection_process' :
                          record.fee_type === 'application' ? 'application' :
                          record.fee_type === 'scholarship' ? 'scholarship' :
                          record.fee_type === 'i20_control_fee' ? 'i20_control' : record.fee_type;
        const individualPayment = student?.user_id 
          ? individualFeePaymentsMap.get(`${student.user_id}_${feeTypeKey}`)
          : null;
        
        // Calcular standard_amount (valor padrão da taxa)
        let standardAmount = 0;
        const feeType = record.fee_type;
        const systemType = student?.system_type || 'legacy';
        const dependents = Number(student?.dependents) || 0;

        if (feeType === 'selection_process') {
          if (systemType === 'simplified') {
            standardAmount = 350;
          } else {
            standardAmount = 400 + (dependents * 150);
          }
        } else if (feeType === 'scholarship') {
          if (systemType === 'simplified') {
            standardAmount = 550;
          } else {
            standardAmount = 900;
          }
        } else if (feeType === 'i20_control_fee') {
          standardAmount = 900;
        } else if (feeType === 'application') {
          standardAmount = 350 + (dependents * 100);
        }

        // Se não encontrou valor padrão, usar o amount do record (já em centavos, converter para dólares)
        if (standardAmount === 0) {
          standardAmount = (record.amount || 0) / 100;
        }

        return {
          id: record.id,
          user_id: student?.user_id || record.student_id,
          fee_type: record.fee_type,
          amount: (record.amount || 0) / 100, // Converter de centavos para dólares
          gross_amount_usd: (record.amount || 0) / 100,
          fee_amount_usd: 0, // Será calculado se necessário
          payment_date: record.payment_date || record.created_at,
          payment_method: record.payment_method || 'manual',
          payment_intent_id: individualPayment?.payment_intent_id || null,
          student_name: record.student_name || student?.full_name || 'Unknown Student',
          student_email: record.student_email || student?.email || null,
          seller_referral_code: record.seller_referral_code || student?.seller_referral_code || null,
          standard_amount: standardAmount,
          // Include override and coupon information from individual payment if available
          override_selection_process: individualPayment?.override_selection_process || null,
          override_application: individualPayment?.override_application || null,
          override_scholarship: individualPayment?.override_scholarship || null,
          override_i20: individualPayment?.override_i20 || null,
          coupon_code: individualPayment?.coupon_code || null,
          coupon_name: individualPayment?.coupon_name || null,
          discount_amount: individualPayment?.discount_amount || null,
          original_amount: individualPayment?.original_amount || null,
          discount_type: individualPayment?.discount_type || null,
          discount_value: individualPayment?.discount_value || null
        };
      });

      // Calcular métricas do Stripe (apenas Stripe)
      const stripePayments = transactionsWithNames.filter((p: any) => p.payment_method === 'stripe');
      const stripeMetricsCalculated = stripePayments.reduce((acc: any, payment: any) => {
        // FILTRO RÍGIDO: Apenas transações DEPOIS de 20/11/2025
        // O usuário pediu especificamente para ver apenas dados recentes nesta seção
        if (new Date(payment.payment_date) <= new Date('2025-11-20')) {
          return acc;
        }

        const amount = Number(payment.amount) || 0;
        const gross = payment.gross_amount_usd ? Number(payment.gross_amount_usd) : amount;
        const fees = gross - amount;

        return {
          netIncome: acc.netIncome + amount,
          stripeFees: acc.stripeFees + fees,
          grossValue: acc.grossValue + gross,
          totalTransactions: acc.totalTransactions + 1
        };
      }, {
        netIncome: 0,
        stripeFees: 0,
        grossValue: 0,
        totalTransactions: 0
      });

      // Atualizar estados
      setMetrics(finalMetrics);
      setStripeMetrics(stripeMetricsCalculated);
      setRevenueData(calculatedRevenueData);
      setPaymentMethodData(processedData.paymentMethodData);
      setFeeTypeData(processedData.feeTypeData);
      setTransactions(transactionsWithNames);

      console.log('✅ Financial data processed successfully');
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeFilter, customDateFrom, customDateTo, showCustomDate, getFeeAmount]);

  useEffect(() => {
    console.log('🚀 [useFinancialAnalytics] useEffect executado', {
      hasUser: !!user,
      userRole: user?.role,
      isAdmin: user?.role === 'admin'
    });
    
    if (!user || user.role !== 'admin') {
      console.log('🚀 [useFinancialAnalytics] Retornando - usuário não é admin');
      return;
    }

    // Verificar se o usuário mudou
    const currentUserId = user.id || user.email || null;
    const userChanged = previousUserRef.current !== currentUserId;

    // Verificar se os filtros realmente mudaram
    const currentFilters = {
      timeFilter,
      customDateFrom,
      customDateTo,
      showCustomDate
    };

    const previousFilters = previousFiltersRef.current;
    const filtersChanged = !previousFilters || 
      previousFilters.timeFilter !== currentFilters.timeFilter ||
      previousFilters.customDateFrom !== currentFilters.customDateFrom ||
      previousFilters.customDateTo !== currentFilters.customDateTo ||
      previousFilters.showCustomDate !== currentFilters.showCustomDate;

    // Só carregar se:
    // 1. Ainda não foi carregado inicialmente, OU
    // 2. O usuário mudou, OU
    // 3. Os filtros realmente mudaram
    if (!hasLoadedRef.current || userChanged || filtersChanged) {
      hasLoadedRef.current = true;
      previousUserRef.current = currentUserId;
      previousFiltersRef.current = currentFilters;
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeFilter, customDateFrom, customDateTo, showCustomDate]);

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
    handleRefresh,
    handleExport,
    handleTimeFilterChange,
    handleCustomDateToggle,
    setCustomDateFrom,
    setCustomDateTo,
    affiliates
  };
}

