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
      
      // Criar map de individual_fee_payments para buscar gross_amount_usd e fee_amount_usd
      // Criar múltiplas chaves para facilitar busca, incluindo payment_intent_id quando disponível
      const individualFeePaymentsMap = new Map();
      const individualFeePaymentsByIntentId = new Map();
      const individualFeePaymentsList = loadedData.individualFeePayments || [];
      
      individualFeePaymentsList.forEach((payment: any) => {
        // Normalizar fee_type para diferentes formatos
        const normalizedFeeType = payment.fee_type?.replace('_fee', '') || payment.fee_type;
        const key1 = `${payment.user_id}_${normalizedFeeType}`;
        const key2 = `${payment.user_id}_${payment.fee_type}`;
        
        // Armazenar com múltiplas chaves para facilitar busca
        if (!individualFeePaymentsMap.has(key1)) {
          individualFeePaymentsMap.set(key1, payment);
        }
        if (!individualFeePaymentsMap.has(key2)) {
          individualFeePaymentsMap.set(key2, payment);
        }
        
        // Também indexar por payment_intent_id se disponível (match mais preciso)
        if (payment.payment_intent_id) {
          individualFeePaymentsByIntentId.set(payment.payment_intent_id, payment);
        }
      });
      
      // Filtrar paymentRecords para remover pagamentos 'manual'
      const filteredPaymentRecords = paymentRecords.filter((record: any) => 
        record.payment_method && record.payment_method !== 'manual'
      );
      
      // Transformar paymentRecords em transactions (formato esperado pela tabela)
      const transactionsWithNames = filteredPaymentRecords.map((record: any) => {
        const student = loadedData.allStudents.find((s: any) => 
          s.user_id === record.student_id || s.id === record.student_id
        );
        
        // Buscar dados de individual_fee_payments para gross_amount_usd e fee_amount_usd
        const feeTypeKey = record.fee_type === 'selection_process' ? 'selection_process' :
                          record.fee_type === 'application' ? 'application' :
                          record.fee_type === 'scholarship' ? 'scholarship' :
                          record.fee_type === 'i20_control_fee' ? 'i20_control' : record.fee_type;
        
        // Buscar user_id do record (pode estar em student_id ou user_id)
        const userId = student?.user_id || record.student_id || record.user_id;
        let individualPayment = null;
        
        if (userId) {
          // Normalizar fee_type para match
          const normalizedRecordFeeType = record.fee_type === 'selection_process' ? 'selection_process' :
                                         record.fee_type === 'application' ? 'application' :
                                         record.fee_type === 'scholarship' ? 'scholarship' :
                                         record.fee_type === 'i20_control_fee' ? 'i20_control' : record.fee_type;
          
          // Buscar todos os pagamentos deste usuário com fee_type correspondente
          const allPayments = individualFeePaymentsList.filter((p: any) => {
            // Match por user_id
            if (p.user_id !== userId) return false;
            
            // Normalizar fee_type do payment
            const normalizedPaymentFeeType = p.fee_type?.replace('_fee', '') || p.fee_type;
            
            // Match por fee_type normalizado (várias variações)
            const feeTypeMatch = 
              normalizedPaymentFeeType === normalizedRecordFeeType ||
              p.fee_type === record.fee_type ||
              p.fee_type === `${normalizedRecordFeeType}_fee` ||
              (p.fee_type === 'selection_process_fee' && normalizedRecordFeeType === 'selection_process') ||
              (p.fee_type === 'application_fee' && normalizedRecordFeeType === 'application') ||
              (p.fee_type === 'scholarship_fee' && normalizedRecordFeeType === 'scholarship') ||
              (p.fee_type === 'i20_control_fee' && normalizedRecordFeeType === 'i20_control');
            
            return feeTypeMatch;
          });
          
          if (allPayments.length > 0) {
            // Se houver múltiplos, escolher o mais próximo da data do record
            const recordDateStr = record.payment_date || record.created_at;
            const recordDate = recordDateStr ? new Date(recordDateStr).getTime() : 0;
            
            if (recordDate > 0) {
              individualPayment = allPayments.reduce((closest, current) => {
                const currentDate = new Date(current.payment_date).getTime();
                const closestDate = new Date(closest.payment_date).getTime();
                const currentDiff = Math.abs(currentDate - recordDate);
                const closestDiff = Math.abs(closestDate - recordDate);
                return currentDiff < closestDiff ? current : closest;
              });
            } else {
              // Se não temos data no record, usar o primeiro match que tenha gross_amount_usd
              individualPayment = allPayments.find((p: any) => p.gross_amount_usd != null) || allPayments[0];
            }
          }
          
          // Se ainda não encontrou, tentar match por payment_intent_id se disponível
          if (!individualPayment && record.payment_intent_id) {
            individualPayment = individualFeePaymentsByIntentId.get(record.payment_intent_id);
          }
          
          // DEBUG TEMPORÁRIO - remover depois
          if (record.payment_method === 'stripe' && !individualPayment) {
            const userPayments = individualFeePaymentsList.filter((p: any) => p.user_id === userId);
            const recordDateStr = record.payment_date || record.created_at;
            console.log('[DEBUG] Stripe payment sem match:', {
              userId,
              recordFeeType: record.fee_type,
              normalizedFeeType: normalizedRecordFeeType,
              recordDate: recordDateStr,
              userPaymentsCount: userPayments.length,
              userPaymentsFeeTypes: userPayments.map((p: any) => p.fee_type),
              allPaymentsCount: allPayments.length
            });
          }
        }
        
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

        // Calcular gross_amount_usd e fee_amount_usd
        // Prioridade: individual_fee_payments > realPaymentAmounts (para Stripe) > valores padrão
        const netAmount = (record.amount || 0) / 100; // Converter de centavos para dólares
        let grossAmount = netAmount;
        let feeAmount = 0;
        
        // Se temos valores em individual_fee_payments, usar esses (já estão em dólares)
        if (individualPayment) {
          if (individualPayment.gross_amount_usd !== null && individualPayment.gross_amount_usd !== undefined) {
            grossAmount = Number(individualPayment.gross_amount_usd); // Já está em dólares
          }
          if (individualPayment.fee_amount_usd !== null && individualPayment.fee_amount_usd !== undefined) {
            feeAmount = Number(individualPayment.fee_amount_usd); // Já está em dólares
          } else if (individualPayment.gross_amount_usd !== null && individualPayment.gross_amount_usd !== undefined) {
            // Se não temos fee_amount_usd mas temos gross_amount_usd, calcular a diferença
            const gross = Number(individualPayment.gross_amount_usd);
            feeAmount = Math.max(0, gross - netAmount);
          }
        } else if (record.payment_method === 'stripe' && loadedData.realPaymentAmounts) {
          // Para Stripe, usar realPaymentAmounts (mesma lógica do PaymentManagement)
          const realPaid = loadedData.realPaymentAmounts.get(userId);
          if (realPaid) {
            const realPaidAmount = realPaid[feeTypeKey as keyof typeof realPaid];
            if (realPaidAmount && realPaidAmount > 0) {
              grossAmount = realPaidAmount;
              feeAmount = Math.max(0, realPaidAmount - netAmount);
            }
          }
        }

        return {
          id: record.id,
          user_id: student?.user_id || record.student_id,
          fee_type: record.fee_type,
          amount: netAmount, // Já convertido de centavos para dólares (valor líquido)
          gross_amount_usd: grossAmount,
          fee_amount_usd: feeAmount,
          payment_date: record.payment_date || record.created_at,
          payment_method: record.payment_method || 'manual',
          payment_intent_id: individualPayment?.payment_intent_id || record.payment_intent_id || null,
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

