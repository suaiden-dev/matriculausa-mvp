import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DollarSign,
  TrendingUp, 
  CreditCard,
  Plus,
  Download, 
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  XCircle,
  Eye,
  Award
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import FinancialOverview from './FinancialOverview';
import { AffiliatePaymentRequestService } from '../../services/AffiliatePaymentRequestService';
import { getRealPaidAmounts } from '../../utils/paymentConverter';

const PaymentManagement: React.FC = () => {
  const { user } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'financial-overview' | 'payment-requests' | 'commission-history'>('financial-overview');
  
  // Payment request modal state
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentRequestAmount, setPaymentRequestAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<'zelle' | 'bank_transfer' | 'stripe'>('zelle');
  const [payoutDetails, setPayoutDetails] = useState<Record<string, any>>({});
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Affiliate credits and balance state
  const [affiliateBalance, setAffiliateBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  // Removed UI usage; retain internal state only if needed elsewhere
  // const [pendingCredits, setPendingCredits] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Affiliate payment requests state
  const [affiliatePaymentRequests, setAffiliatePaymentRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  // Flags para evitar requisições redundantes/concorrentes
  const hasLoadedBalanceForUser = useRef<string | null>(null);
  const hasLoadedRequestsForUser = useRef<string | null>(null);
  const isLoadingBalanceRef = useRef(false);
  const isLoadingRequestsRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forceReloadToken, setForceReloadToken] = useState(0);

  // definido após os loaders; placeholder aqui para declaração
  let handleRefresh: () => Promise<void>;

  // Load affiliate revenue/balance usando lógica ajustada com overrides (mesmo padrão do Overview/Analytics/FinancialOverview)
  const loadAffiliateBalance = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    if (isLoadingBalanceRef.current) return;
    if (hasLoadedBalanceForUser.current === uid) return;

    try {
      isLoadingBalanceRef.current = true;
      setLoadingBalance(true);

      // ✅ CORREÇÃO: Usar a mesma lógica do FinancialOverview que funciona corretamente
      // 1. Descobrir affiliate_admin_id
      const { data: aaList, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', uid)
        .limit(1);
      if (aaErr || !aaList || aaList.length === 0) {
        hasLoadedBalanceForUser.current = uid;
        setAffiliateBalance(0);
        setTotalEarned(0);
        return;
      }
      const affiliateAdminId = aaList[0].id;

      // 2. Buscar sellers vinculados a este affiliate admin (mesma lógica do super admin)
      const { data: sellers, error: sellersErr } = await supabase
        .from('sellers')
        .select('referral_code')
        .eq('affiliate_admin_id', affiliateAdminId);
      
      if (sellersErr || !sellers || sellers.length === 0) {
        hasLoadedBalanceForUser.current = uid;
        setAffiliateBalance(0);
        setTotalEarned(0);
        return;
      }

      // ✅ CORREÇÃO: Buscar diretamente de user_profiles (mesma lógica do super admin)
      // Isso não filtra por sellers ativos, igual ao super admin
      const sellerCodes = sellers.map((s: any) => s.referral_code);
      const { data: userProfilesData, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          seller_referral_code,
          has_paid_selection_process_fee,
          has_paid_i20_control_fee,
          system_type,
          dependents,
          selection_process_fee_payment_method,
          i20_control_fee_payment_method,
          scholarship_applications (
            id,
            is_scholarship_fee_paid,
            scholarship_fee_payment_method
          )
        `)
        .in('seller_referral_code', sellerCodes)
        .eq('role', 'student');
      
      if (userProfilesError || !userProfilesData) {
        console.error('❌ [PAYMENT] Erro ao buscar perfis:', userProfilesError);
        hasLoadedBalanceForUser.current = uid;
        setAffiliateBalance(0);
        setTotalEarned(0);
        return;
      }

      console.group('🔍 [PaymentManagement] Dados Iniciais');
      console.log('userId:', uid);
      console.log('affiliateAdminId:', affiliateAdminId);
      console.log('sellers count:', sellers.length);
      console.log('sellerCodes:', sellerCodes);
      console.log('userProfilesData count:', userProfilesData.length);
      console.log('sample profile:', userProfilesData[0]);
      console.groupEnd();

      // Transformar para o formato esperado (similar ao que a RPC retornava)
      const profiles = userProfilesData.map((profile: any) => ({
        user_id: profile.user_id,
        profile_id: profile.id,
        has_paid_selection_process_fee: profile.has_paid_selection_process_fee,
        has_paid_i20_control_fee: profile.has_paid_i20_control_fee,
        is_scholarship_fee_paid: profile.scholarship_applications?.some((app: any) => app.is_scholarship_fee_paid) || false,
        dependents: profile.dependents,
        system_type: profile.system_type,
        seller_referral_code: profile.seller_referral_code
      }));

      // Criar mapa de payment_methods por profile_id (já temos os dados de userProfilesData)
      const paymentMethodsMap: Record<string, any> = {};
      (userProfilesData || []).forEach((p: any) => {
        paymentMethodsMap[p.id] = {
          selection_process: p.selection_process_fee_payment_method,
          i20_control: p.i20_control_fee_payment_method,
          scholarship: Array.isArray(p.scholarship_applications) 
            ? p.scholarship_applications.map((a: any) => ({
                is_paid: a.is_scholarship_fee_paid,
                method: a.scholarship_fee_payment_method
              }))
            : []
        };
      });

      // 3. Preparar overrides por user_id
      const uniqueUserIds = Array.from(new Set((profiles || []).map((p: any) => p.user_id).filter(Boolean)));
      const overrideEntries = await Promise.allSettled(uniqueUserIds.map(async (uidParam) => {
        const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: uidParam });
        return [uidParam, error ? null : data];
      }));
      const overridesMap: Record<string, any> = overrideEntries.reduce((acc: Record<string, any>, res) => {
        if (res.status === 'fulfilled') {
          const arr = res.value;
          const uidParam = arr[0];
          const data = arr[1];
          if (data) acc[uidParam] = {
            selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
            scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
            i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
          };
        }
        return acc;
      }, {});

      // 4. Buscar valores reais pagos de individual_fee_payments
      // Buscar valores pagos para todos os estudantes de uma vez
      const realPaidAmountsMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {};
      
      // Buscar valores pagos para cada estudante
      await Promise.all(profiles.map(async (p: any) => {
        if (!p.user_id) return;
        
        try {
          const amounts = await getRealPaidAmounts(p.user_id, ['selection_process', 'scholarship', 'i20_control']);
          realPaidAmountsMap[p.user_id] = {
            selection_process: amounts.selection_process,
            scholarship: amounts.scholarship,
            i20_control: amounts.i20_control
          };
        } catch (error) {
          console.error(`[PaymentManagement] Erro ao buscar valores pagos para user_id ${p.user_id}:`, error);
        }
      }));

      // 5. Calcular total usando valores reais pagos, com fallback para cálculo fixo se não houver registro
      const totalRevenueBreakdown: Array<{profile_id: string, selection: number, scholarship: number, i20: number, total: number}> = [];
      const totalRevenue = (profiles || []).reduce((sum: number, p: any) => {
        const deps = Number(p?.dependents || 0);
        const ov = overridesMap[p?.user_id] || {};
        const realPaid = realPaidAmountsMap[p?.user_id] || {};

        // Selection Process - usar valor real pago se disponível, senão calcular
        let selPaid = 0;
        if (p?.has_paid_selection_process_fee) {
          if (realPaid.selection_process !== undefined) {
            // Usar valor real pago (já com desconto e convertido se PIX)
            selPaid = realPaid.selection_process;
          } else {
            // Fallback: cálculo fixo para dados antigos sem registro
            const baseSelectionFee = p?.system_type === 'simplified' ? 350 : 400;
            const sel = ov.selection_process_fee != null
              ? Number(ov.selection_process_fee)
              // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
              // Dependentes só afetam Application Fee ($100 por dependente)
              : (p?.system_type === 'simplified' ? baseSelectionFee : baseSelectionFee + (deps * 150));
            selPaid = sel || 0;
          }
        }

        // Scholarship Fee - usar valor real pago se disponível, senão calcular
        let schPaid = 0;
        if (p?.is_scholarship_fee_paid) {
          if (realPaid.scholarship !== undefined) {
            // Usar valor real pago (já com desconto e convertido se PIX)
            schPaid = realPaid.scholarship;
          } else {
            // Fallback: cálculo fixo para dados antigos sem registro
            const baseScholarshipFee = p?.system_type === 'simplified' ? 550 : 900;
            const schol = ov.scholarship_fee != null
              ? Number(ov.scholarship_fee)
              : baseScholarshipFee;
            schPaid = schol || 0;
          }
        }

        // I-20 Control Fee - usar valor real pago se disponível, senão calcular
        let i20Paid = 0;
        if (p?.is_scholarship_fee_paid && p?.has_paid_i20_control_fee) {
          if (realPaid.i20_control !== undefined) {
            // Usar valor real pago (já com desconto e convertido se PIX)
            i20Paid = realPaid.i20_control;
          } else {
            // Fallback: cálculo fixo para dados antigos sem registro
            const baseI20Fee = 900; // Sempre 900 para ambos os sistemas
            const i20 = ov.i20_control_fee != null
              ? Number(ov.i20_control_fee)
              : baseI20Fee;
            i20Paid = i20 || 0;
          }
        }

        const studentTotal = selPaid + schPaid + i20Paid;
        if (studentTotal > 0) {
          totalRevenueBreakdown.push({
            profile_id: p.profile_id,
            selection: selPaid,
            scholarship: schPaid,
            i20: i20Paid,
            total: studentTotal
          });
        }

        return sum + studentTotal;
      }, 0);

      console.group('🔍 [PaymentManagement] Total Revenue Calculation');
      console.log('Total Revenue:', totalRevenue);
      console.log('Students with revenue:', totalRevenueBreakdown.length);
      console.log('Breakdown by student:', totalRevenueBreakdown.slice(0, 10)); // Primeiros 10
      console.log('Total students:', profiles.length);
      console.groupEnd();

      // 6. Buscar valores de pagamentos manuais de individual_fee_payments
      const manualPaidAmountsMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {};
      
      // Buscar apenas pagamentos manuais para cada estudante
      await Promise.all(profiles.map(async (p: any) => {
        if (!p.user_id) return;
        
        try {
          const { data: manualPayments, error } = await supabase
            .from('individual_fee_payments')
            .select('fee_type, amount')
            .eq('user_id', p.user_id)
            .eq('payment_method', 'manual')
            .in('fee_type', ['selection_process', 'scholarship', 'i20_control']);
          
          if (error) {
            console.error(`[PaymentManagement] Erro ao buscar pagamentos manuais para user_id ${p.user_id}:`, error);
            return;
          }
          
          const amounts: { selection_process?: number; scholarship?: number; i20_control?: number } = {};
          manualPayments?.forEach((payment: any) => {
            const amount = Number(payment.amount);
            if (payment.fee_type === 'selection_process') {
              amounts.selection_process = amount;
            } else if (payment.fee_type === 'scholarship') {
              amounts.scholarship = amount;
            } else if (payment.fee_type === 'i20_control') {
              amounts.i20_control = amount;
            }
          });
          
          if (Object.keys(amounts).length > 0) {
            manualPaidAmountsMap[p.user_id] = amounts;
          }
        } catch (error) {
          console.error(`[PaymentManagement] Exceção ao buscar pagamentos manuais para user_id ${p.user_id}:`, error);
        }
      }));

      // 7. Calcular receita manual usando valores reais pagos, com fallback para cálculo fixo
      const manualRevenueBreakdown: Array<{profile_id: string, selection: number, scholarship: number, i20: number, total: number}> = [];
      const manualRevenue = (profiles || []).reduce((sum: number, p: any) => {
        const deps = Number(p?.dependents || 0);
        const ov = overridesMap[p?.user_id] || {};
        const methods = paymentMethodsMap[p?.profile_id] || {};
        const manualPaid = manualPaidAmountsMap[p?.user_id] || {};
        
        // Selection Process manual - usar valor real pago se disponível, senão calcular
        let selManual = 0;
        if (p?.has_paid_selection_process_fee && methods.selection_process === 'manual') {
          if (manualPaid.selection_process !== undefined) {
            selManual = manualPaid.selection_process;
          } else {
            // Fallback: cálculo fixo para dados antigos sem registro
            const baseSelectionFee = p?.system_type === 'simplified' ? 350 : 400;
            const sel = ov.selection_process_fee != null
              ? Number(ov.selection_process_fee)
              // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
              // Dependentes só afetam Application Fee ($100 por dependente)
              : (p?.system_type === 'simplified' ? baseSelectionFee : baseSelectionFee + (deps * 150));
            selManual = sel || 0;
          }
        }

        // Scholarship manual - usar valor real pago se disponível, senão calcular
        let schManual = 0;
        const hasScholarshipPaidManual = Array.isArray(methods.scholarship)
          ? methods.scholarship.some((a: any) => !!a?.is_paid && a?.method === 'manual')
          : false;
        if (hasScholarshipPaidManual) {
          if (manualPaid.scholarship !== undefined) {
            schManual = manualPaid.scholarship;
          } else {
            // Fallback: cálculo fixo para dados antigos sem registro
            const baseScholarshipFee = p?.system_type === 'simplified' ? 550 : 900;
            const schol = ov.scholarship_fee != null
              ? Number(ov.scholarship_fee)
              : baseScholarshipFee;
            schManual = schol || 0;
          }
        }

        // I-20 Control manual - usar valor real pago se disponível, senão calcular
        let i20Manual = 0;
        if (p?.is_scholarship_fee_paid && p?.has_paid_i20_control_fee && methods.i20_control === 'manual') {
          if (manualPaid.i20_control !== undefined) {
            i20Manual = manualPaid.i20_control;
          } else {
            // Fallback: cálculo fixo para dados antigos sem registro
            const baseI20Fee = 900; // Sempre 900 para ambos os sistemas
            const i20 = ov.i20_control_fee != null
              ? Number(ov.i20_control_fee)
              : baseI20Fee;
            i20Manual = i20 || 0;
          }
        }

        const studentManualTotal = selManual + schManual + i20Manual;
        if (studentManualTotal > 0) {
          manualRevenueBreakdown.push({
            profile_id: p.profile_id,
            selection: selManual,
            scholarship: schManual,
            i20: i20Manual,
            total: studentManualTotal
          });
        }

        return sum + studentManualTotal;
      }, 0);

      console.group('🔍 [PaymentManagement] Manual Revenue Calculation');
      console.log('Manual Revenue (Outside Payments):', manualRevenue);
      console.log('Students with manual payments:', manualRevenueBreakdown.length);
      console.log('Breakdown by student:', manualRevenueBreakdown);
      console.groupEnd();

      // 2) Requests do afiliado para calcular Available Balance
      const affiliateRequests = await AffiliatePaymentRequestService.listAffiliatePaymentRequests(uid);
      
      console.group('🔍 [PaymentManagement] Payment Requests');
      console.log('Total requests:', affiliateRequests.length);
      console.log('Requests by status:', {
        paid: affiliateRequests.filter((r: any) => r.status === 'paid').length,
        approved: affiliateRequests.filter((r: any) => r.status === 'approved').length,
        pending: affiliateRequests.filter((r: any) => r.status === 'pending').length,
        rejected: affiliateRequests.filter((r: any) => r.status === 'rejected').length
      });
      console.log('All requests:', affiliateRequests.map((r: any) => ({
        id: r.id,
        amount: r.amount_usd,
        status: r.status,
        created_at: r.created_at
      })));
      console.groupEnd();

      const totalPaidOut = affiliateRequests
        .filter((r: any) => r.status === 'paid')
        .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
      const totalApproved = affiliateRequests
        .filter((r: any) => r.status === 'approved')
        .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
      const totalPending = affiliateRequests
        .filter((r: any) => r.status === 'pending')
        .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);

      const availableBalance = Math.max(0, (totalRevenue - manualRevenue) - totalPaidOut - totalApproved - totalPending);

      console.group('🔍 [PaymentManagement] Available Balance Final Calculation');
      console.log('Total Revenue:', totalRevenue);
      console.log('Manual Revenue (Outside):', manualRevenue);
      console.log('Net Revenue (Total - Manual):', totalRevenue - manualRevenue);
      console.log('Payment Requests:', {
        paid: totalPaidOut,
        approved: totalApproved,
        pending: totalPending,
        total: totalPaidOut + totalApproved + totalPending
      });
      console.log('Available Balance:', availableBalance);
      console.log('Formula: (', totalRevenue, '-', manualRevenue, ') - (', totalPaidOut, '+', totalApproved, '+', totalPending, ') =', availableBalance);
      console.groupEnd();
      setAffiliateBalance(availableBalance); // Available Balance
      setTotalEarned(totalRevenue); // Total Revenue
      // keep pending credits disabled in UI for now
      hasLoadedBalanceForUser.current = uid;
    } catch (error: any) {
      console.error('Error loading affiliate balance:', error);
    } finally {
      setLoadingBalance(false);
      isLoadingBalanceRef.current = false;
    }
  }, [user?.id]);

  // Load affiliate payment requests (memoizado)
  const loadAffiliatePaymentRequests = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    if (isLoadingRequestsRef.current) return;

    try {
      isLoadingRequestsRef.current = true;
      setLoadingRequests(true);
      const requests = await AffiliatePaymentRequestService.listAffiliatePaymentRequests(uid);
      
      console.group('🔍 [PaymentManagement] Payment Requests Loader');
      console.log('userId:', uid);
      console.log('Total requests fetched:', requests.length);
      console.log('Requests by status:', {
        paid: requests.filter((r: any) => r.status === 'paid').length,
        approved: requests.filter((r: any) => r.status === 'approved').length,
        pending: requests.filter((r: any) => r.status === 'pending').length,
        rejected: requests.filter((r: any) => r.status === 'rejected').length
      });
      console.log('All requests:', requests.map((r: any) => ({
        id: r.id,
        amount: r.amount_usd,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at
      })));
      console.groupEnd();
      
      setAffiliatePaymentRequests(requests);
      hasLoadedRequestsForUser.current = null; // disable cache to always refresh on demand
    } catch (error: any) {
      console.error('❌ [PaymentManagement] Error loading affiliate payment requests:', error);
    } finally {
      setLoadingRequests(false);
      isLoadingRequestsRef.current = false;
    }
  }, [user?.id]);

  // Definir handleRefresh após as dependências existirem
  handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    if (refreshing) return;
    try {
      setRefreshing(true);
      hasLoadedBalanceForUser.current = null;
      hasLoadedRequestsForUser.current = null;
      // força reload do FinancialOverview via token
      setForceReloadToken((t) => t + 1);
      await Promise.all([loadAffiliateBalance(), loadAffiliatePaymentRequests()]);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refreshing, loadAffiliateBalance, loadAffiliatePaymentRequests]);

  // Validate payment amount
  const validatePaymentAmount = (amount: number) => {
    const availableBalance = affiliateBalance;
    if (amount > availableBalance) {
      setInputError(`Insufficient balance. You have ${formatCurrency(availableBalance)} available.`);
      return false;
    } else if (amount <= 0) {
      setInputError('Amount must be greater than 0');
      return false;
    } else {
      setInputError(null);
      return true;
    }
  };

  // Check if payment amount is valid
  const isPaymentAmountValid = () => {
    return paymentRequestAmount > 0 && paymentRequestAmount <= affiliateBalance;
  };

  // Check if payout details are valid based on method
  const isPayoutDetailsValid = () => {
    if (payoutMethod === 'bank_transfer') {
      return payoutDetails.bank_name && 
             payoutDetails.account_name && 
             payoutDetails.routing_number && 
             payoutDetails.account_number;
    }
    if (payoutMethod === 'zelle') {
      return (payoutDetails.zelle_email || payoutDetails.zelle_phone) && 
             !(payoutDetails.zelle_email && payoutDetails.zelle_phone);
    }
    if (payoutMethod === 'stripe') {
      return payoutDetails.stripe_email;
    }
    return true;
  };

  // Handle submit payment request
  const handleSubmitPaymentRequest = async () => {
    if (!user?.id) return;
    
    // Validations
    if (!isPaymentAmountValid()) {
      setError('Please enter a valid amount within your available balance');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (!isPayoutDetailsValid()) {
      setError('Please fill in all required payment details');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      setSubmittingPayout(true);
      const created = await AffiliatePaymentRequestService.createPaymentRequest({
        referrerUserId: user.id,
        amountUsd: paymentRequestAmount,
        payoutMethod,
        payoutDetails
      });
      setShowPaymentRequestModal(false);
      setPaymentRequestAmount(0);
      setPayoutDetails({});
      // Atualiza a lista imediatamente sem depender apenas do polling
      setAffiliatePaymentRequests((prev) => [created, ...prev]);
      await loadAffiliateBalance();
      setSuccessMessage('Payment request submitted successfully! It will be reviewed by our admin team.');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (e: any) {
      setError(e.message || 'Failed to submit payment request');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSubmittingPayout(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Load inicial e polling controlado pela aba ativa
  useEffect(() => {
    if (!user?.id) return;
    // Sempre força reload inicial, sem cache
    hasLoadedBalanceForUser.current = null;
    hasLoadedRequestsForUser.current = null;
    loadAffiliateBalance();
    loadAffiliatePaymentRequests();

    // Habilita polling apenas quando a aba de payment-requests estiver ativa (reduzido para 5 minutos)
    let interval: number | undefined;
    if (activeTab === 'payment-requests') {
      interval = window.setInterval(() => {
        // polling mais espaçado para reduzir carga; realtime cobre mudanças rápidas
        hasLoadedRequestsForUser.current = null; // força refresh no polling
        loadAffiliatePaymentRequests();
      }, 300000); // Reduzido de 60s para 5 minutos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user?.id, activeTab, loadAffiliateBalance, loadAffiliatePaymentRequests]);

  // Recarregar ao trocar para a aba de payment-requests para garantir dados atualizados
  useEffect(() => {
    if (!user?.id) return;
    if (activeTab === 'payment-requests') {
      // Força reload completo ao entrar na aba
      hasLoadedBalanceForUser.current = null;
      hasLoadedRequestsForUser.current = null;
      loadAffiliateBalance();
      loadAffiliatePaymentRequests();
    }
  }, [activeTab]);

  // Realtime updates for affiliate payment requests status changes
  useEffect(() => {
    if (!user?.id || activeTab !== 'payment-requests') return;
    
    const channel = supabase
      .channel('affiliate_requests_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'affiliate_payment_requests',
        filter: `referrer_user_id=eq.${user.id}`
      }, () => {
        // Reload requests when status changes (admin approval/rejection/payment)
        loadAffiliatePaymentRequests();
        loadAffiliateBalance();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [user?.id, activeTab, loadAffiliatePaymentRequests, loadAffiliateBalance]);

  return (
    <div className="min-h-screen">
      {/* Header + Tabs Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Payment Management
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Monitor and manage your affiliate commission earnings and payment requests.
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Track your referral commissions and request payouts from your available balance.
                </p>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8">
                <nav className="flex space-x-8 overflow-x-auto" role="tablist">
                  <button
                    onClick={() => setActiveTab('financial-overview')}
                    className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'financial-overview' 
                        ? 'border-[#05294E] text-[#05294E]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    type="button"
                    aria-selected={activeTab === 'financial-overview'}
                    role="tab"
                  >
                    <TrendingUp className={`w-5 h-5 mr-2 transition-colors ${
                      activeTab === 'financial-overview' ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    Financial Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('payment-requests')}
                    className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'payment-requests' 
                        ? 'border-[#05294E] text-[#05294E]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    type="button"
                    aria-selected={activeTab === 'payment-requests'}
                    role="tab"
                  >
                    <CreditCard className={`w-5 h-5 mr-2 transition-colors ${
                      activeTab === 'payment-requests' ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    Payment Requests
                  </button>
                </nav>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {activeTab === 'financial-overview' ? 'Financial Overview' : 
                       activeTab === 'payment-requests' ? 'Affiliate Payment Requests' : 
                       'Commission Transaction History'}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {activeTab === 'financial-overview' 
                        ? 'Comprehensive financial analytics, trends, and performance metrics'
                        : activeTab === 'payment-requests'
                        ? 'Request payouts from your available balance and track request status'
                        : 'View detailed commission earnings and transaction history'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing || loadingBalance || loadingRequests}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      {refreshing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh
                    </button>
                    {activeTab === 'payment-requests' && (
                      <button
                        onClick={() => setShowPaymentRequestModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#05294E] hover:bg-[#05294E]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Request Payment
                      </button>
                    )}
                    <button
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-all duration-200 ease-in-out"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      
      {/* Financial Overview Tab */}
      {activeTab === 'financial-overview' && (
        <FinancialOverview userId={user?.id} forceReloadToken={forceReloadToken} />
      )}

      {/* Payment Requests Tab */}
      {activeTab === 'payment-requests' && (
        <div className="space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Balance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Available Balance</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingBalance ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                    ) : (
                      formatCurrency(affiliateBalance)
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingBalance ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                    ) : (
                      formatCurrency(totalEarned)
                    )}
                  </p>
                  <p className="text-xs text-slate-500">All paid fees (excl. application fee)</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Pending Requests</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingRequests ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-8 rounded"></div>
                    ) : (
                      affiliatePaymentRequests.filter(r => r.status === 'pending').length
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Awaiting approval</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Payment Requests</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingRequests ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-8 rounded"></div>
                    ) : (
                      affiliatePaymentRequests.length
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Total submitted</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Requests List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900">Payment Requests</h3>
                <p className="text-sm text-slate-600">Your submitted payment requests and their status</p>
              </div>
            </div>

            {loadingRequests ? (
              <div className="p-6 animate-pulse">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-5 w-32 bg-slate-200 rounded mb-2"></div>
                            <div className="h-4 w-48 bg-slate-200 rounded mb-1"></div>
                            <div className="h-3 w-24 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="h-6 w-20 bg-slate-200 rounded"></div>
                          <div className="h-8 w-24 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : affiliatePaymentRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment requests yet</h3>
                <p className="text-gray-500">Submit your first payment request to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {affiliatePaymentRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Payment Request #{String(req.id).slice(0,8)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">{formatCurrency(Number(req.amount_usd) || 0)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap capitalize text-sm text-gray-900">{String(req.payout_method || '').replace('_',' ')}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            req.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            req.status === 'paid' ? 'bg-green-100 text-green-800' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>{req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(req.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="space-x-2">
                            <button 
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowRequestDetails(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </button>
                            {req.status === 'pending' && (
                              <button
                                onClick={async () => {
                                  if (!user?.id) return;
                                  if (window.confirm(`Cancel this payment request of ${formatCurrency(Number(req.amount_usd)||0)}?`)) {
                                    try {
                                      await AffiliatePaymentRequestService.cancelPaymentRequest(req.id, user.id);
                                      // reload list and balance
                                      hasLoadedRequestsForUser.current = null;
                                      hasLoadedBalanceForUser.current = null;
                                      await Promise.all([loadAffiliatePaymentRequests(), loadAffiliateBalance()]);
                                      setSuccessMessage('Payment request cancelled successfully.');
                                      setTimeout(() => setSuccessMessage(null), 5000);
                                    } catch (e: any) {
                                      setError(e.message || 'Failed to cancel payment request');
                                      setTimeout(() => setError(null), 5000);
                                    }
                                  }
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 bg-green-500 text-white">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 bg-red-500 text-white">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Payment Request Details Modal */}
      {showRequestDetails && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Payment Request Details</h3>
                <button 
                  onClick={() => setShowRequestDetails(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Request Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Request Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-lg font-semibold">Payment Request #{String(selectedRequest.id).slice(0,8)}</p>
                    <p className="text-gray-600">Created: {formatDate(selectedRequest.created_at)}</p>
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">{formatCurrency(Number(selectedRequest.amount_usd) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-semibold capitalize">{String(selectedRequest.payout_method || '').replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedRequest.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        selectedRequest.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        selectedRequest.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedRequest.status?.charAt(0).toUpperCase() + selectedRequest.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedRequest.payout_details ? (
                      <div className="space-y-2">
                        {Object.entries(selectedRequest.payout_details as Record<string, any>).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{String(key).replace('_', ' ')}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <CreditCard className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-500">No payment details available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedRequest.admin_notes}</p>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Request Timeline</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Request Submitted</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedRequest.created_at)}</p>
                      </div>
                    </div>
                    
                    {selectedRequest.approved_at && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Request Approved</p>
                          <p className="text-xs text-gray-500">{formatDate(selectedRequest.approved_at)}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedRequest.paid_at && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Payment Completed</p>
                          <p className="text-xs text-gray-500">{formatDate(selectedRequest.paid_at)}</p>
                          {selectedRequest.payment_reference && (
                            <p className="text-xs text-gray-500">Reference: {selectedRequest.payment_reference}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Request Modal */}
      {showPaymentRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Request Payment</h3>
              <button 
                onClick={() => setShowPaymentRequestModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {inputError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{inputError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={Number.isNaN(paymentRequestAmount) ? '' : String(paymentRequestAmount)}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                    const next = onlyDigits === '' ? 0 : parseInt(onlyDigits, 10);
                    setPaymentRequestAmount(next);
                    validatePaymentAmount(next);
                  }}
                  onBlur={() => {
                    const max = affiliateBalance;
                    if (paymentRequestAmount > max) {
                      setPaymentRequestAmount(max);
                      validatePaymentAmount(max);
                    }
                  }}
                  placeholder="Enter amount in USD"
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 ${
                    inputError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {formatCurrency(affiliateBalance)} • Requested: {formatCurrency(paymentRequestAmount)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                <select value={payoutMethod} onChange={(e)=> setPayoutMethod(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="zelle">Zelle</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              {payoutMethod === 'zelle' && (
                <div className="grid grid-cols-1 gap-3">
                  <input 
                    placeholder="Zelle email *" 
                    type='email'
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.zelle_email && !payoutDetails.zelle_phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_email: e.target.value, zelle_phone: ''})}
                  />
                  <input 
                    placeholder="Zelle phone *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.zelle_email && !payoutDetails.zelle_phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_phone: e.target.value, zelle_email: ''})}
                  />
                  <input 
                    placeholder="Account holder name (optional)" 
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}
                  />
                </div>
              )}
              {payoutMethod === 'bank_transfer' && (
                <div className="grid grid-cols-1 gap-3">
                  <input 
                    placeholder="Bank name *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.bank_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, bank_name: e.target.value})}
                  />
                  <input 
                    placeholder="Account holder name *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.account_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}
                  />
                  <input 
                    placeholder="Routing number *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.routing_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, routing_number: e.target.value})}
                  />
                  <input 
                    placeholder="Account number *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.account_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, account_number: e.target.value})}
                  />
                  <input 
                    placeholder="SWIFT / IBAN (optional)" 
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e)=> setPayoutDetails({...payoutDetails, swift: e.target.value, iban: e.target.value})}
                  />
                </div>
              )}
              {payoutMethod === 'stripe' && (
                <div className="grid grid-cols-1 gap-3">
                  <input placeholder="Stripe email *" className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    !payoutDetails.stripe_email ? 'border-red-300' : 'border-gray-300'
                  }`} onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_email: e.target.value})}/>
                  <input placeholder="Stripe account id (optional)" className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_account_id: e.target.value})}/>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={()=> setShowPaymentRequestModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button 
                  onClick={handleSubmitPaymentRequest} 
                  disabled={submittingPayout || !isPaymentAmountValid() || !isPayoutDetailsValid()} 
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    isPaymentAmountValid() && isPayoutDetailsValid()
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  } disabled:opacity-60`}
                  title={!isPaymentAmountValid() ? 'Please enter a valid amount within your available balance' : 
                         !isPayoutDetailsValid() ? 'Please fill in all required payment details' : 'Submit payment request'}
                >
                  {submittingPayout ? 'Submitting...' : 'Submit request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
