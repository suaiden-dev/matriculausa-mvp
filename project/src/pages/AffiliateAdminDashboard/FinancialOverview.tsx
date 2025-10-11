import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Loader2,
  BarChart3,
  PieChart,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AffiliatePaymentRequestService } from '../../services/AffiliatePaymentRequestService';


// Declare Chart.js types
declare global {
  interface Window {
    Chart: any;
  }
}

interface FinancialOverviewProps {
  userId?: string;
  forceReloadToken?: number;
}

interface FinancialStats {
  totalCredits: number;
  totalEarned: number;
  totalReferrals: number;
  activeReferrals: number;
  completedReferrals: number;
  last7DaysRevenue: number;
  pendingCredits: number;
  averageCommissionPerReferral: number;
  manualRevenue: number;
}

interface FinancialAnalytics {
  dailyRevenue: Array<{date: string, amount: number}>;
  monthlyRevenue: Array<{month: string, amount: number}>;
  referralTrends: {
    totalReferrals: number;
    completedReferrals: number;
    conversionRate: number;
    averageCommission: number;
  };
  paymentMethodBreakdown: {
    credits: number;
    pending: number;
    completed: number;
  };
  recentActivity: Array<{date: string, type: string, amount: number, description: string}>;
}

interface CalculatedMetrics {
  revenueGrowth: number;
  conversionTarget: number;
  monthlyAverage: number;
  bestMonth: string;
  totalReferrals: number;
}

const FinancialOverview: React.FC<FinancialOverviewProps> = ({ userId, forceReloadToken }) => {

  
  // Financial statistics state
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    totalCredits: 0,
    totalEarned: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    completedReferrals: 0,
    last7DaysRevenue: 0,
    pendingCredits: 0,
    averageCommissionPerReferral: 0,
    manualRevenue: 0
  });

  // Detailed financial analytics state
  const [financialAnalytics, setFinancialAnalytics] = useState<FinancialAnalytics>({
    dailyRevenue: [],
    monthlyRevenue: [],
    referralTrends: {
      totalReferrals: 0,
      completedReferrals: 0,
      conversionRate: 0,
      averageCommission: 0
    },
    paymentMethodBreakdown: {
      credits: 0,
      pending: 0,
      completed: 0
    },
    recentActivity: []
  });

  // Revenue chart filter state
  const [revenueChartType, setRevenueChartType] = useState<'daily' | 'monthly'>('daily');
  const [revenueChartPeriod, setRevenueChartPeriod] = useState<number>(7);
  
  // Chart refs for Chart.js
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const referralStatusChartRef = useRef<HTMLCanvasElement>(null);
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  
  // Chart instances
  const [revenueChart, setRevenueChart] = useState<any>(null);
  const [referralStatusChart, setReferralStatusChart] = useState<any>(null);
  const [trendChart, setTrendChart] = useState<any>(null);
  
  // Calculated metrics state
  const [calculatedMetrics, setCalculatedMetrics] = useState<CalculatedMetrics>({
    revenueGrowth: 0,
    conversionTarget: 0,
    monthlyAverage: 0,
    bestMonth: '',
    totalReferrals: 0
  });

  const [loading, setLoading] = useState(false);
  // Memoização e TTL
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const lastFetchAtRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);
  const TTL_MS = 60_000; // 60s

  // Load Chart.js dynamically
  useEffect(() => {
    const loadChartJS = async () => {
      if (typeof window !== 'undefined' && !window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.async = true;
        document.head.appendChild(script);
        
        script.onload = () => {
          console.log('Chart.js loaded successfully');
        };
      }
    };
    
    loadChartJS();
  }, []);

  // Load affiliate financial data (memoizado + TTL)
  const loadAffiliateFinancialData = useCallback(async () => {
    if (!userId) return;
    // evita concorrência e excesso
    if (isLoadingRef.current) return;
    // força refetch quando muda userId
    const userChanged = lastUserIdRef.current !== userId;
    const now = Date.now();
    const ttlValid = now - lastFetchAtRef.current < TTL_MS;
    if (!userChanged && ttlValid) {
      return; // TTL ainda válido, não recarrega
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Usar lógica ajustada com overrides (mesmo padrão do Overview/Analytics/PaymentManagement)
      // 1. Descobrir affiliate_admin_id
      const { data: aaList, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      if (aaErr || !aaList || aaList.length === 0) {
        console.error('No affiliate admin found for user:', userId);
        return;
      }
      const affiliateAdminId = aaList[0].id;

      // 2. Buscar sellers vinculados a este affiliate admin
      const { data: sellers, error: sellersErr } = await supabase
        .from('sellers')
        .select('referral_code')
        .eq('affiliate_admin_id', affiliateAdminId);
      
      if (sellersErr || !sellers || sellers.length === 0) {
        console.error('No sellers found for affiliate admin:', affiliateAdminId);
        return;
      }
      
      const referralCodes = sellers.map(s => s.referral_code);
      
      // ✅ CORREÇÃO: Buscar perfis usando RPC centralizada que verifica TODAS as aplicações
      const { data: profiles, error: profilesErr } = await supabase
        .rpc('get_affiliate_admin_profiles_with_fees', { admin_user_id: currentUserId });
      if (profilesErr || !profiles) {
        console.error('Error fetching student profiles:', profilesErr);
        return;
      }

      // 4. Preparar overrides por user_id
      const uniqueUserIds = Array.from(new Set((profiles || []).map((p) => p.user_id).filter(Boolean)));
      const overrideEntries = await Promise.allSettled(uniqueUserIds.map(async (uid) => {
        const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: uid });
        return [uid, error ? null : data];
      }));
      const overridesMap: Record<string, any> = overrideEntries.reduce((acc: Record<string, any>, res) => {
        if (res.status === 'fulfilled') {
          const arr = res.value;
          const uid = arr[0];
          const data = arr[1];
          if (data) acc[uid] = {
            selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
            scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
            i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
          };
        }
        return acc;
      }, {});

      // 5. Calcular total ajustado considerando dependentes quando não houver override
      const totalRevenue = (profiles || []).reduce((sum, p) => {
        const deps = Number(p?.dependents || 0);
        const ov = overridesMap[p?.user_id] || {};

        // Selection Process
        let selPaid = 0;
        if (p?.has_paid_selection_process_fee) {
          // Usar valor baseado no system_type do aluno (350 para simplified, 400 para legacy)
          const baseSelDefault = p?.system_type === 'simplified' ? 350 : 400;
          const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
          selPaid = ov.selection_process_fee != null ? baseSel : baseSel + (deps * 150);
        }

        // Scholarship Fee (sem dependentes)
        // ✅ CORREÇÃO: Usar diretamente a flag já calculada pela RPC
        const hasAnyScholarshipPaid = p?.is_scholarship_fee_paid || false;
        // Usar valor baseado no system_type do aluno (550 para simplified, 900 para legacy)
        const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
        const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
        const schPaid = hasAnyScholarshipPaid ? schBase : 0;

        // I-20 Control (sem dependentes)
        // I-20 Control Fee - sempre 900 para ambos os sistemas
        const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
        const i20Paid = (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) ? i20Base : 0;

        return sum + selPaid + schPaid + i20Paid;
      }, 0);

      // 5.1 Calcular receita manual (pagamentos por fora)
      const manualRevenue = (profiles || []).reduce((sum, p) => {
        const deps = Number(p?.dependents || 0);
        const ov = overridesMap[p?.user_id] || {};

        // Selection Process manual
        let selManual = 0;
        const isSelManual = !!p?.has_paid_selection_process_fee && p?.selection_process_fee_payment_method === 'manual';
        if (isSelManual) {
          // Usar valor baseado no system_type do aluno (350 para simplified, 400 para legacy)
          const baseSelDefault = p?.system_type === 'simplified' ? 350 : 400;
          const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
          selManual = ov.selection_process_fee != null ? baseSel : baseSel + (deps * 150);
        }

        // Scholarship manual (se qualquer application estiver paga via manual)
        // ✅ CORREÇÃO: Para manual, assumir que se scholarship está pago, pode ser manual (RPC não distingue método)
        const hasScholarshipPaidManual = p?.is_scholarship_fee_paid || false;
        // Usar valor baseado no system_type do aluno (550 para simplified, 900 para legacy)
        const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
        const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
        const schManual = hasScholarshipPaidManual ? schBase : 0;

        // I-20 Control manual (seguir mesma regra base: exigir scholarship pago para contar I-20)
        const hasAnyScholarshipPaid = Array.isArray(p?.scholarship_applications)
          ? p.scholarship_applications.some((a: any) => !!a?.is_scholarship_fee_paid)
          : false;
        const isI20Manual = !!p?.has_paid_i20_control_fee && p?.i20_control_fee_payment_method === 'manual';
        // I-20 Control Fee - sempre 900 para ambos os sistemas
        const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
        const i20Manual = (hasAnyScholarshipPaid && isI20Manual) ? i20Base : 0;

        return sum + selManual + schManual + i20Manual;
      }, 0);

      const rows = profiles || []; // Usar profiles em vez de studentsAnalytics
      const totalReferrals = rows.length || 0;
      
      // Derivar status usando a lógica de overrides ajustada
      let derivedCompleted = 0;
      let derivedPending = 0;
      rows.forEach((p: any) => {
        // Verificar se tem algum pagamento usando a nova lógica
        const hasSelectionPaid = !!p?.has_paid_selection_process_fee;
        // ✅ CORREÇÃO: Usar diretamente a flag já calculada pela RPC
        const hasScholarshipPaid = p?.is_scholarship_fee_paid || false;
        const hasI20Paid = !!p?.has_paid_i20_control_fee;
        
        const hasAnyPayment = hasSelectionPaid || hasScholarshipPaid || hasI20Paid;
        if (hasAnyPayment) derivedCompleted += 1; else derivedPending += 1;
      });
      const completedReferrals = derivedCompleted;
      const activeReferrals = derivedPending;

      // Receita últimos 7 dias baseada na data do registro com lógica ajustada
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7DaysRevenue = rows
        .filter((p: any) => p.created_at && new Date(p.created_at) >= sevenDaysAgo)
        .reduce((sum: number, p: any) => {
          const deps = Number(p?.dependents || 0);
          const ov = overridesMap[p?.user_id] || {};

          // Selection Process
          let selPaid = 0;
          if (p?.has_paid_selection_process_fee) {
            // Usar valor baseado no system_type do aluno (350 para simplified, 400 para legacy)
          const baseSelDefault = p?.system_type === 'simplified' ? 350 : 400;
          const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
            selPaid = ov.selection_process_fee != null ? baseSel : baseSel + (deps * 150);
          }

          // Scholarship Fee (sem dependentes)
          const hasAnyScholarshipPaid = Array.isArray(p?.scholarship_applications)
            ? p.scholarship_applications.some((a: any) => !!a?.is_scholarship_fee_paid)
            : false;
          // Usar valor baseado no system_type do aluno (550 para simplified, 900 para legacy)
        const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
        const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
          const schPaid = hasAnyScholarshipPaid ? schBase : 0;

          // I-20 Control (sem dependentes)
          // I-20 Control Fee - sempre 900 para ambos os sistemas
        const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
          const i20Paid = (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) ? i20Base : 0;

          return sum + selPaid + schPaid + i20Paid;
        }, 0);

      const averageCommissionPerReferral = totalReferrals > 0 ? totalRevenue / totalReferrals : 0;

      // Carregar payment requests do afiliado para calcular saldo (excluir rejeitados)
      // Available balance NÃO deve contar valores pagos por fora (manual)
      let availableBalance = Math.max(0, totalRevenue - manualRevenue);
      try {
        const affiliateRequests = await AffiliatePaymentRequestService.listAffiliatePaymentRequests(userId);
        const totalPaidOut = affiliateRequests
          .filter((r: any) => r.status === 'paid')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
        const totalApproved = affiliateRequests
          .filter((r: any) => r.status === 'approved')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
        const totalPending = affiliateRequests
          .filter((r: any) => r.status === 'pending')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);

        availableBalance = Math.max(0, (totalRevenue - manualRevenue) - totalPaidOut - totalApproved - totalPending);
      } catch (err) {
        console.error('Error loading affiliate payment requests for balance:', err);
      }

      // No cartão principal, exibiremos Total Revenue usando o campo totalCredits para manter layout
      setFinancialStats({
        totalCredits: totalRevenue,
        totalEarned: availableBalance,
        totalReferrals,
        activeReferrals,
        completedReferrals,
        last7DaysRevenue,
        pendingCredits: activeReferrals * 50,
        averageCommissionPerReferral,
        manualRevenue
      });

      // Processar dados para analytics detalhados a partir de studentsAnalytics
      await processDetailedAnalytics(rows, []);

      // Atualiza controle de cache
      lastUserIdRef.current = userId;
      lastFetchAtRef.current = Date.now();
    } catch (error: any) {
      console.error('Error loading affiliate financial data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId]);

  // Process detailed analytics
  const processDetailedAnalytics = async (referralsData: any[], transactionsData: any[]) => {
    // Preparar overrides para cálculos
    const uniqueUserIds = Array.from(new Set((referralsData || []).map((p) => p.user_id).filter(Boolean)));
    const overrideEntries = await Promise.allSettled(uniqueUserIds.map(async (uid) => {
      const { data, error } = await supabase.rpc('get_user_fee_overrides', { user_id_param: uid });
      return [uid, error ? null : data];
    }));
    const overridesMap: Record<string, any> = overrideEntries.reduce((acc: Record<string, any>, res) => {
      if (res.status === 'fulfilled') {
        const arr = res.value;
        const uid = arr[0];
        const data = arr[1];
        if (data) acc[uid] = {
          selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
          scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
          i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
        };
      }
      return acc;
    }, {});

    // Função para calcular revenue de um perfil usando a lógica de overrides
    const calculateProfileRevenue = (p: any) => {
      const deps = Number(p?.dependents || 0);
      const ov = overridesMap[p?.user_id] || {};

      // Selection Process
      let selPaid = 0;
      if (p?.has_paid_selection_process_fee) {
        const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : 400;
        selPaid = ov.selection_process_fee != null ? baseSel : baseSel + (deps * 150);
      }

      // Scholarship Fee (sem dependentes)
      const hasAnyScholarshipPaid = Array.isArray(p?.scholarship_applications)
        ? p.scholarship_applications.some((a: any) => !!a?.is_scholarship_fee_paid)
        : false;
      const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : 900;
      const schPaid = hasAnyScholarshipPaid ? schBase : 0;

      // I-20 Control (sem dependentes)
      const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
      const i20Paid = (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) ? i20Base : 0;

      return selPaid + schPaid + i20Paid;
    };

    // Calcular receita diária dos últimos 30 dias usando lógica de overrides
    const dailyRevenue = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = referralsData?.filter((r: any) => {
        const rDate = new Date(r.created_at).toISOString().split('T')[0];
        return rDate === dateStr;
      }).reduce((sum: number, r: any) => sum + calculateProfileRevenue(r), 0) || 0;
      
      dailyRevenue.push({ date: dateStr, amount: dayRevenue });
    }

    // Calcular receita mensal dos últimos 12 meses usando lógica de overrides
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      const monthRevenue = referralsData?.filter((r: any) => {
        const rDate = new Date(r.created_at);
        return rDate.getMonth() === date.getMonth() && 
               rDate.getFullYear() === date.getFullYear();
      }).reduce((sum: number, r: any) => sum + calculateProfileRevenue(r), 0) || 0;
      
      monthlyRevenue.push({ month: monthStr, amount: monthRevenue });
    }

    // Calcular tendências de referência usando a lógica de overrides
    const totalReferrals = referralsData?.length || 0;
    const getPaidFlags = (r: any) => {
      const hasSelectionPaid = !!r?.has_paid_selection_process_fee;
      const hasScholarshipPaid = Array.isArray(r?.scholarship_applications)
        ? r.scholarship_applications.some((a: any) => !!a?.is_scholarship_fee_paid)
        : false;
      const hasI20Paid = !!r?.has_paid_i20_control_fee;
      
      return {
        paidSelection: hasSelectionPaid,
        paidScholarship: hasScholarshipPaid,
        paidI20: hasI20Paid
      };
    };
    const completedReferrals = referralsData?.filter((r: any) => {
      const { paidSelection, paidScholarship, paidI20 } = getPaidFlags(r);
      return paidSelection || paidScholarship || paidI20;
    }).length || 0;
    const conversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;
    const averageCommission = totalReferrals > 0 ? 
      referralsData?.reduce((sum: number, r: any) => sum + calculateProfileRevenue(r), 0) / totalReferrals : 0;

    // Calcular breakdown por status derivado dos pagamentos usando lógica de overrides
    const totalRequests = referralsData?.length || 0;
    let derivedCompleted = 0;
    let derivedPending = 0;
    referralsData?.forEach((r: any) => {
      const { paidSelection, paidScholarship, paidI20 } = getPaidFlags(r);
      const hasAnyPayment = paidSelection || paidScholarship || paidI20;
      if (hasAnyPayment) derivedCompleted += 1; else derivedPending += 1;
    });
    const paymentMethodBreakdown = {
      completed: totalRequests > 0 ? Math.round((derivedCompleted / totalRequests) * 100) : 0,
      pending: totalRequests > 0 ? Math.round((derivedPending / totalRequests) * 100) : 0,
      credits: 0
    };

    // Criar atividade recente (últimos 10 eventos) usando lógica de overrides
    const recentActivity: Array<{date: string, type: string, amount: number, description: string}> = [];

    // Montar eventos por taxa paga usando lógica de overrides
    referralsData?.slice(0, 10).forEach((row: any) => {
      const deps = Number(row?.dependents || 0);
      const ov = overridesMap[row?.user_id] || {};
      
      // Usar flags de pagamento para determinar quais taxas foram pagas
      const paidSelection = !!row.has_paid_selection_process_fee;
      const paidI20Control = !!row.has_paid_i20_control_fee;
      const hasAnyScholarshipPaid = Array.isArray(row?.scholarship_applications)
        ? row.scholarship_applications.some((a: any) => !!a?.is_scholarship_fee_paid)
        : false;

      // Calcular valores usando a lógica de overrides
      if (paidSelection) {
        // Usar valor baseado no system_type do aluno (350 para simplified, 400 para legacy)
        const baseSelDefault = row?.system_type === 'simplified' ? 350 : 400;
        const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
        const selectionFeeAmount = ov.selection_process_fee != null ? baseSel : baseSel + (deps * 150);
        recentActivity.push({
          date: row.created_at,
          type: 'commission',
          amount: selectionFeeAmount,
          description: 'Selection Process Fee paid'
        });
      }

      if (hasAnyScholarshipPaid) {
        // Usar valor baseado no system_type do aluno (550 para simplified, 900 para legacy)
        const schBaseDefault = row?.system_type === 'simplified' ? 550 : 900;
        const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
        recentActivity.push({
          date: row.created_at,
          type: 'commission',
          amount: schBase,
          description: 'Scholarship Fee paid'
        });
      }

      if (hasAnyScholarshipPaid && paidI20Control) {
        // I-20 Control Fee - sempre 900 para ambos os sistemas
        const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
        recentActivity.push({
          date: row.created_at,
          type: 'commission',
          amount: i20Base,
          description: 'I20 Control Fee paid'
        });
      }

      // Se nenhum fee pago ainda, manter como pendente
      if (!paidSelection && !hasAnyScholarshipPaid && !paidI20Control) {
        recentActivity.push({
          date: row.created_at,
          type: 'pending',
          amount: 0,
          description: 'Pending student fees'
        });
      }
    });

    // Adicionar transações recentes de créditos
    transactionsData?.slice(0, 5).forEach(transaction => {
      recentActivity.push({
        date: transaction.created_at,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || 'Credit transaction'
      });
    });

    // Ordenar por data e pegar os 10 mais recentes
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    recentActivity.splice(10);

    setFinancialAnalytics({
      dailyRevenue,
      monthlyRevenue,
      referralTrends: {
        totalReferrals,
        completedReferrals,
        conversionRate,
        averageCommission
      },
      paymentMethodBreakdown,
      recentActivity
    });
  };

  // Create revenue chart
  const createRevenueChart = () => {
    if (!revenueChartRef.current || !window.Chart) return;

    // Destroy existing chart
    if (revenueChart) {
      revenueChart.destroy();
    }

    const ctx = revenueChartRef.current.getContext('2d');
    const data = revenueChartType === 'daily' 
      ? financialAnalytics.dailyRevenue.slice(-revenueChartPeriod)
      : financialAnalytics.monthlyRevenue.slice(-revenueChartPeriod);

    const chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(item => 
          revenueChartType === 'daily' 
            ? new Date((item as any).date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : (item as any).month
        ),
        datasets: [{
          label: 'Revenue',
          data: data.map(item => item.amount),
          borderColor: '#05294E',
          backgroundColor: 'rgba(5, 41, 78, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#05294E',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(5, 41, 78, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#05294E',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context: any) => `Revenue: ${formatCurrency(Number(context.parsed.y) || 0)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value: any) => formatCurrency(Number(value) || 0)
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    setRevenueChart(chart);
  };

  // Create referral status pie chart
  const createReferralStatusChart = () => {
    if (!referralStatusChartRef.current || !window.Chart) return;

    // Destroy existing chart
    if (referralStatusChart) {
      referralStatusChart.destroy();
    }

    const ctx = referralStatusChartRef.current.getContext('2d');
    
    const chart = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending', 'Cancelled'],
        datasets: [{
          data: [
            financialStats.completedReferrals,
            financialStats.activeReferrals,
            financialStats.totalReferrals - financialStats.completedReferrals - financialStats.activeReferrals
          ],
          backgroundColor: [
            '#10B981', // Green for completed
            '#F59E0B', // Yellow for pending
            '#EF4444'  // Red for cancelled
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(5, 41, 78, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#05294E',
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: function(context: any) {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    });

    setReferralStatusChart(chart);
  };

  // Create trend analysis chart
  const createTrendChart = () => {
    if (!trendChartRef.current || !window.Chart) return;

    // Destroy existing chart
    if (trendChart) {
      trendChart.destroy();
    }

    const ctx = trendChartRef.current.getContext('2d');
    const data = financialAnalytics.monthlyRevenue.slice(-6); // Last 6 months

    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(item => (item as any).month),
        datasets: [{
          label: 'Revenue',
          data: data.map(item => item.amount),
          backgroundColor: 'rgba(5, 41, 78, 0.8)',
          borderColor: '#05294E',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(5, 41, 78, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#05294E',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context: any) => `Revenue: ${formatCurrency(Number(context.parsed.y) || 0)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value: any) => formatCurrency(Number(value) || 0)
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });

    setTrendChart(chart);
  };

  // Calculate real metrics
  const calculateRealMetrics = () => {
    // Calculate revenue growth (comparing last 7 days vs previous 7 days)
    const last7Days = financialAnalytics.dailyRevenue.slice(-7);
    const previous7Days = financialAnalytics.dailyRevenue.slice(-14, -7);
    
    const last7DaysTotal = last7Days.reduce((sum, day) => sum + day.amount, 0);
    const previous7DaysTotal = previous7Days.reduce((sum, day) => sum + day.amount, 0);
    
    const revenueGrowth = previous7DaysTotal > 0 
      ? ((last7DaysTotal - previous7DaysTotal) / previous7DaysTotal) * 100 
      : 0;

    // Calculate monthly average
    const monthlyAverage = financialAnalytics.monthlyRevenue.length > 0
      ? financialAnalytics.monthlyRevenue.reduce((sum, month) => sum + month.amount, 0) / financialAnalytics.monthlyRevenue.length
      : 0;

    // Find best month
    const bestMonth = financialAnalytics.monthlyRevenue.length > 0
      ? financialAnalytics.monthlyRevenue.reduce((max, month) => 
          month.amount > max.amount ? month : max
        ).month
      : '';

    // Calculate conversion target
    const conversionTarget = financialAnalytics.referralTrends.conversionRate > 0
      ? Math.min(95, financialAnalytics.referralTrends.conversionRate * 1.1) // 10% above current
      : 85; // Default target

    setCalculatedMetrics({
      revenueGrowth,
      conversionTarget,
      monthlyAverage,
      bestMonth,
      totalReferrals: financialAnalytics.referralTrends.totalReferrals
    });
  };

  // Update charts when data changes
  useEffect(() => {
    if (window.Chart && financialAnalytics.dailyRevenue.length > 0) {
      createRevenueChart();
      createReferralStatusChart();
      createTrendChart();
    }
  }, [financialAnalytics, revenueChartType, revenueChartPeriod]);

  // Calculate metrics when financial data changes
  useEffect(() => {
    if (financialAnalytics.dailyRevenue.length > 0) {
      calculateRealMetrics();
    }
  }, [financialAnalytics]);

  // Load financial data when userId changes / TTL expira
  useEffect(() => {
    if (!userId) return;
    // se user mudou, invalidar cache para forçar recarga
    if (lastUserIdRef.current !== userId) {
      lastFetchAtRef.current = 0;
    }
    loadAffiliateFinancialData();
  }, [userId, loadAffiliateFinancialData]);

  // Forçar recarregar quando o token mudar
  useEffect(() => {
    if (!userId) return;
    // invalidar TTL e recarregar
    lastFetchAtRef.current = 0;
    loadAffiliateFinancialData();
  }, [forceReloadToken]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  // const formatCredits = (amount: number) => {
  //   return `${amount.toFixed(0)} credits`;
  // };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Credits Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className={`flex items-center ${calculatedMetrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculatedMetrics.revenueGrowth >= 0 ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              <span className="text-sm font-medium">
                {calculatedMetrics.revenueGrowth >= 0 ? '+' : ''}{calculatedMetrics.revenueGrowth.toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(financialStats.totalCredits)}
            </p>
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Conversion Rate</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {financialAnalytics.referralTrends.conversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">Referrals to commission</p>
          </div>
        </div>

        {/* Available Balance Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(financialStats.totalEarned)}
            </p>
            <p className="text-xs text-slate-500">Ready for withdrawal</p>
          </div>
        </div>

        {/* Manual Paid (Outside) Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex items-center text-yellow-600">
              <Activity className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Outside</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Outside Payments</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(financialStats.manualRevenue)}
            </p>
            <p className="text-xs text-slate-500">Consolidated</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {/* Revenue Trend Chart - Full Width */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Revenue Trend</h3>
            <p className="text-sm text-slate-600">Earnings from referrals over time</p>
          </div>
          
          {/* Time Period Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setRevenueChartType('daily');
                  setRevenueChartPeriod(7);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  revenueChartType === 'daily' && revenueChartPeriod === 7
                    ? 'bg-[#05294E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7D
              </button>
              <button
                onClick={() => {
                  setRevenueChartType('daily');
                  setRevenueChartPeriod(30);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  revenueChartType === 'daily' && revenueChartPeriod === 30
                    ? 'bg-[#05294E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30D
              </button>
              <button
                onClick={() => {
                  setRevenueChartType('monthly');
                  setRevenueChartPeriod(3);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  revenueChartType === 'monthly' && revenueChartPeriod === 3
                    ? 'bg-[#05294E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3M
              </button>
              <button
                onClick={() => {
                  setRevenueChartType('monthly');
                  setRevenueChartPeriod(6);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  revenueChartType === 'monthly' && revenueChartPeriod === 6
                    ? 'bg-[#05294E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                6M
              </button>
              <button
                onClick={() => {
                  setRevenueChartType('monthly');
                  setRevenueChartPeriod(12);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  revenueChartType === 'monthly' && revenueChartPeriod === 12
                    ? 'bg-[#05294E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1Y
              </button>
            </div>
          </div>
        </div>
        
        <div className="h-64">
          <canvas ref={revenueChartRef}></canvas>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {revenueChartType === 'daily' 
              ? `Last ${revenueChartPeriod} day${revenueChartPeriod > 1 ? 's' : ''}`
              : `Last ${revenueChartPeriod} month${revenueChartPeriod > 1 ? 's' : ''}`
            }
          </span>
          <span className="font-semibold text-slate-900">
            {revenueChartType === 'daily' 
              ? formatCurrency(
                  financialAnalytics.dailyRevenue.slice(-revenueChartPeriod).reduce((sum, day) => sum + day.amount, 0)
                )
              : formatCurrency(
                  financialAnalytics.monthlyRevenue.slice(-revenueChartPeriod).reduce((sum, month) => sum + month.amount, 0)
                )
            }
          </span>
        </div>
      </div>

      {/* Detailed Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Monthly Performance</h3>
            <BarChart3 className="w-5 h-5 text-slate-600" />
          </div>
          
          <div className="h-48">
            <canvas ref={trendChartRef}></canvas>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Best Month</span>
              <span className="font-medium text-slate-900">
                {calculatedMetrics.bestMonth || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Monthly Average</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(calculatedMetrics.monthlyAverage)}
              </span>
            </div>
          </div>
        </div>

        {/* Referral Status Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Referral Status</h3>
            <PieChart className="w-5 h-5 text-slate-600" />
          </div>
          
          <div className="h-48">
            <canvas ref={referralStatusChartRef}></canvas>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {financialStats.completedReferrals}
              </div>
              <div className="text-xs text-slate-600">Completed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600">
                {financialStats.activeReferrals}
              </div>
              <div className="text-xs text-slate-600">Pending</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">
                {financialStats.totalReferrals - financialStats.completedReferrals - financialStats.activeReferrals}
              </div>
              <div className="text-xs text-slate-600">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Quick Stats</h3>
            <TrendingUp className="w-5 h-5 text-slate-600" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Last 7 Days</span>
              <span className="text-sm font-medium text-slate-900">
                {formatCurrency(financialStats.last7DaysRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Pending Credits</span>
              <span className="text-sm font-medium text-slate-900">
                {formatCurrency(financialStats.pendingCredits)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Active Referrals</span>
              <span className="text-sm font-medium text-slate-900">
                {financialStats.activeReferrals}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Referrals</span>
              <span className="text-sm font-medium text-slate-900">
                {financialStats.totalReferrals}
              </span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {financialAnalytics.referralTrends.conversionRate.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-600">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Recent Activity</h3>
            <p className="text-sm text-slate-600">Latest commission and referral events</p>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-600">Live</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {financialAnalytics.recentActivity.length > 0 ? (
            financialAnalytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className={`w-3 h-3 rounded-full ${
                  activity.type === 'commission' ? 'bg-green-500' :
                  activity.type === 'pending' ? 'bg-yellow-500' :
                  activity.type === 'earned' ? 'bg-blue-500' :
                  'bg-slate-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                  <p className="text-xs text-slate-600">
                    {new Date(activity.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    activity.type === 'commission' || activity.type === 'earned' ? 'text-green-600' :
                    activity.type === 'pending' ? 'text-yellow-600' :
                    'text-slate-600'
                  }`}>
                    {activity.type === 'commission' || activity.type === 'earned' ? '+' : ''}{formatCurrency(activity.amount)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No recent activity to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;
