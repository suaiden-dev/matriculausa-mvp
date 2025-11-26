import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useFeeConfig } from '../../../../hooks/useFeeConfig';
import { loadFinancialData } from '../data/loaders/financialDataLoader';
import { transformFinancialData } from '../utils/transformFinancialData';
import { calculateRevenueData, calculateFinalMetrics } from '../utils/calculateMetrics';
import { getDateRange } from '../utils/dateRange';
import { exportFinancialDataToCSV } from '../data/services/exportService';
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
      
      // Carregar dados
      console.log('🚀 [useFinancialAnalytics] Chamando loadFinancialData...');
      const loadedData = await loadFinancialData(currentRange);
      console.log('🚀 [useFinancialAnalytics] loadFinancialData retornou:', {
        applications: loadedData.applications?.length,
        zellePayments: loadedData.zellePayments?.length,
        allStudents: loadedData.allStudents?.length
      });

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

      // Processar pagamentos individuais e adicionar nomes e valores padrão
      const individualFeePayments = loadedData.individualFeePayments || [];
      const transactionsWithNames = individualFeePayments.map((payment: any) => {
        const student = loadedData.allStudents.find((s: any) => s.id === payment.user_id || s.user_id === payment.user_id);
        
        // Calcular valor padrão da taxa (Standard Fee Value)
        let standardAmount = 0;
        const feeType = payment.fee_type;
        const systemType = student?.system_type || 'legacy';
        const dependents = Number(student?.dependents) || 0;

        // Normalizar feeType para comparação (substituir espaços por underscores)
        const normalizedFeeType = feeType?.toLowerCase().trim().replace(/ /g, '_');

        if (normalizedFeeType === 'selection_process' || normalizedFeeType === 'selection_process_fee') {
          if (systemType === 'simplified') {
            standardAmount = 350;
          } else {
            // Legacy: 400 + (150 * dependents)
            standardAmount = 400 + (dependents * 150);
          }
        } else if (normalizedFeeType === 'scholarship' || normalizedFeeType === 'scholarship_fee') {
          if (systemType === 'simplified') {
            standardAmount = 550;
          } else {
            standardAmount = 900;
          }
        } else if (normalizedFeeType === 'i20_control' || normalizedFeeType === 'i20_control_fee' || normalizedFeeType === 'i-20_control_fee') {
          standardAmount = 900;
        } else if (normalizedFeeType === 'application' || normalizedFeeType === 'application_fee') {
          // Base 350 + (100 * dependents)
          standardAmount = 350 + (dependents * 100);
        }

        // Fallback: Se não encontrou valor padrão, usar o valor pago (amount)
        // Isso garante que nunca fique zerado
        if (standardAmount === 0) {
           standardAmount = Number(payment.amount) || 0;
           
           // Debug apenas se realmente falhar tudo
           if (standardAmount === 0) {
             console.log('⚠️ [FinancialAnalytics] Standard Amount AND Amount are 0 for:', {
               id: payment.id,
               feeType,
               normalizedFeeType
             });
           }
        }

        return {
          ...payment,
          student_name: student?.full_name || 'Unknown Student',
          standard_amount: standardAmount,
          // Include override and coupon information
          override_selection_process: payment.override_selection_process,
          override_application: payment.override_application,
          override_scholarship: payment.override_scholarship,
          override_i20: payment.override_i20,
          coupon_code: payment.coupon_code,
          coupon_name: payment.coupon_name,
          discount_amount: payment.discount_amount,
          original_amount: payment.original_amount,
          discount_type: payment.discount_type,
          discount_value: payment.discount_value
        };
      });

      // Debug dos primeiros itens
      console.log('🔍 [FinancialAnalytics] Transactions processed:', transactionsWithNames.slice(0, 3).map((t: any) => ({
        id: t.id,
        fee_type: t.fee_type,
        standard_amount: t.standard_amount
      })));

      // Calcular métricas do Stripe (apenas Stripe)
      const stripePayments = individualFeePayments.filter((p: any) => p.payment_method === 'stripe');
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
    setCustomDateTo
  };
}

