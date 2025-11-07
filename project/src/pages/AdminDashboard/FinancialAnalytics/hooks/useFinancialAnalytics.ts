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
  TimeFilter 
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

  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [feeTypeData, setFeeTypeData] = useState<FeeTypeData[]>([]);

  // Filtros de período
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const currentRange = getDateRange(timeFilter, customDateFrom, customDateTo, showCustomDate);
      
      // Carregar dados
      const loadedData = await loadFinancialData(currentRange);

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

      // Atualizar estados
      setMetrics(finalMetrics);
      setRevenueData(calculatedRevenueData);
      setPaymentMethodData(processedData.paymentMethodData);
      setFeeTypeData(processedData.feeTypeData);

      console.log('✅ Financial data processed successfully');
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeFilter, customDateFrom, customDateTo, showCustomDate, getFeeAmount]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
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
    revenueData,
    paymentMethodData,
    feeTypeData,
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

