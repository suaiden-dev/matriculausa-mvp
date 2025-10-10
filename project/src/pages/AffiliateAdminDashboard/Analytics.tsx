import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnalyticsProps {
  stats: {
    totalSellers?: number;
    activeSellers?: number;
    totalStudents?: number;
    totalRevenue?: number;
  };
  sellers?: any[];
  students?: any[];
  userId?: string; // Adicionar userId como prop
}

interface MonthlyPerformance {
  month_year: string;
  students_count: number;
  total_revenue: number;
  active_sellers: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ stats, sellers = [], userId }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  
  // Estados para receita ajustada (mesmo padrão do Overview.tsx)
  const [clientAdjustedRevenue, setClientAdjustedRevenue] = useState<number | null>(null);
  const [adjustedRevenueByReferral, setAdjustedRevenueByReferral] = useState<Record<string, number>>({});
  const [loadingAdjusted, setLoadingAdjusted] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Valores padrão para stats
  const safeStats = {
    totalSellers: stats?.totalSellers || 0,
    activeSellers: stats?.activeSellers || 0,
    totalStudents: stats?.totalStudents || 0,
    totalRevenue: stats?.totalRevenue || 0
  };

  // Carregar dados de receita ajustada (mesmo padrão do Overview.tsx)
  const loadAdjustedRevenue = async () => {
    try {
      setLoadingAdjusted(true);
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) {
        setClientAdjustedRevenue(null);
        return;
      }
      
      // Descobrir affiliate_admin_id
      const { data: aaList, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', currentUserId)
        .limit(1);
      if (aaErr || !aaList || aaList.length === 0) {
        setClientAdjustedRevenue(null);
        return;
      }
      const affiliateAdminId = aaList[0].id;

      // Buscar sellers vinculados a este affiliate admin
      const { data: sellers, error: sellersErr } = await supabase
        .from('sellers')
        .select('referral_code')
        .eq('affiliate_admin_id', affiliateAdminId);
      
      if (sellersErr || !sellers || sellers.length === 0) {
        setClientAdjustedRevenue(null);
        return;
      }
      
      const referralCodes = sellers.map(s => s.referral_code);
      
      // Buscar perfis de estudantes vinculados via seller_referral_code
      const { data: profiles, error: profilesErr } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          has_paid_selection_process_fee, 
          has_paid_i20_control_fee, 
          dependents,
          seller_referral_code,
          system_type,
          scholarship_applications(is_scholarship_fee_paid)
        `)
        .in('seller_referral_code', referralCodes);
      if (profilesErr || !profiles) {
        setClientAdjustedRevenue(null);
        return;
      }

      // Preparar overrides por user_id
      const uniqueUserIds = Array.from(new Set((profiles || []).map((p) => p.user_id).filter(Boolean)));
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

      // Calcular total ajustado considerando dependentes quando não houver override e somar por referral_code
      const revenueByReferral: Record<string, number> = {};
      const total = (profiles || []).reduce((sum, p) => {
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
          ? p.scholarship_applications.some((a) => !!a?.is_scholarship_fee_paid)
          : false;
        // Usar valor baseado no system_type do aluno (550 para simplified, 900 para legacy)
        const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
        const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
        const schPaid = hasAnyScholarshipPaid ? schBase : 0;

        // I-20 Control (sem dependentes) - sempre 900 para ambos os sistemas
        const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
        // Contar I-20 somente se a bolsa estiver paga (fluxo esperado)
        const i20Paid = (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) ? i20Base : 0;

        const subtotal = selPaid + schPaid + i20Paid;
        const ref = p?.seller_referral_code || '__unknown__';
        revenueByReferral[ref] = (revenueByReferral[ref] || 0) + subtotal;
        return sum + subtotal;
      }, 0);

      setClientAdjustedRevenue(total);
      setAdjustedRevenueByReferral(revenueByReferral);
    } catch {
      setClientAdjustedRevenue(null);
    } finally {
      setLoadingAdjusted(false);
    }
  };

  // Carregar dados de performance mensal - agora calcula manualmente com overrides
  const loadMonthlyPerformance = async () => {
    if (!userId) {
      console.warn('No user ID provided for analytics');
      return;
    }

    // Aguardar os dados de receita ajustada serem carregados
    if (loadingAdjusted) {
      return;
    }

    try {
      setLoadingMonthly(true);
      
      // Descobrir affiliate_admin_id
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) {
        setMonthlyData([]);
        return;
      }
      
      const { data: aaList, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', currentUserId)
        .limit(1);
      if (aaErr || !aaList || aaList.length === 0) {
        setMonthlyData([]);
        return;
      }
      const affiliateAdminId = aaList[0].id;

      // Buscar sellers vinculados a este affiliate admin
      const { data: sellers, error: sellersErr } = await supabase
        .from('sellers')
        .select('referral_code')
        .eq('affiliate_admin_id', affiliateAdminId);
      
      if (sellersErr || !sellers || sellers.length === 0) {
        setMonthlyData([]);
        return;
      }
      
      const referralCodes = sellers.map(s => s.referral_code);
      
      // Buscar perfis de estudantes vinculados via seller_referral_code com dados de criação
      const { data: profiles, error: profilesErr } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          has_paid_selection_process_fee, 
          has_paid_i20_control_fee, 
          dependents,
          seller_referral_code,
          created_at,
          scholarship_applications(is_scholarship_fee_paid, created_at)
        `)
        .in('seller_referral_code', referralCodes)
        .order('created_at', { ascending: false });
        
      if (profilesErr || !profiles) {
        setMonthlyData([]);
        return;
      }

      // Preparar overrides por user_id
      const uniqueUserIds = Array.from(new Set((profiles || []).map((p) => p.user_id).filter(Boolean)));
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

      // Calcular dados mensais dos últimos 12 meses
      const monthlyMap: Record<string, { students_count: number; total_revenue: number; active_sellers: Set<string> }> = {};
      
      // Inicializar últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[monthYear] = {
          students_count: 0,
          total_revenue: 0,
          active_sellers: new Set()
        };
      }

      // Processar cada perfil de estudante
      (profiles || []).forEach((p) => {
        const createdDate = new Date(p.created_at);
        const monthYear = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap[monthYear]) return; // Fora do range de 12 meses

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
          ? p.scholarship_applications.some((a) => !!a?.is_scholarship_fee_paid)
          : false;
        // Usar valor baseado no system_type do aluno (550 para simplified, 900 para legacy)
        const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
        const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
        const schPaid = hasAnyScholarshipPaid ? schBase : 0;

        // I-20 Control (sem dependentes)
        const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
        const i20Paid = (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) ? i20Base : 0;

        const totalRevenue = selPaid + schPaid + i20Paid;

        monthlyMap[monthYear].students_count++;
        monthlyMap[monthYear].total_revenue += totalRevenue;
        if (p?.seller_referral_code) {
          monthlyMap[monthYear].active_sellers.add(p.seller_referral_code);
        }
      });

      // Converter para array ordenado (decrescente - mais recente primeiro)
      const monthlyDataArray = Object.entries(monthlyMap)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([monthYear, data]) => ({
          month_year: monthYear,
          students_count: data.students_count,
          total_revenue: data.total_revenue,
          active_sellers: data.active_sellers.size
        }));

      setMonthlyData(monthlyDataArray);
    } catch (error) {
      console.error('Error loading monthly performance:', error);
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Carregar dados quando o componente montar ou userId mudar
  useEffect(() => {
    if (userId) {
      loadAdjustedRevenue();
    }
  }, [userId]);

  // Carregar dados mensais após receita ajustada ser carregada
  useEffect(() => {
    if (userId && !loadingAdjusted && clientAdjustedRevenue !== null) {
      loadMonthlyPerformance();
    }
  }, [userId, loadingAdjusted, clientAdjustedRevenue]);

  // Sellers com receita ajustada (mesmo padrão do Overview.tsx)
  const displaySellers = (sellers || []).map((s) => ({
    ...s,
    total_revenue: adjustedRevenueByReferral[s?.referral_code] != null
      ? adjustedRevenueByReferral[s.referral_code]
      : (s.total_revenue || 0)
  }));

  // Top vendedores por performance
  const topSellers = displaySellers
    .sort((a, b) => {
      // Sort by number of students first, then by revenue
      if (b.students_count !== a.students_count) {
        return b.students_count - a.students_count;
      }
      return (b.total_revenue || 0) - (a.total_revenue || 0);
    })
    .slice(0, 5);

  // Cálculos de crescimento mensal
  const lastMonthData = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
  const currentMonthData = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;

  const calculateSafeGrowth = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  const sellersGrowthPercentage = lastMonthData && currentMonthData ? 
    calculateSafeGrowth(currentMonthData.active_sellers, lastMonthData.active_sellers) : 0;

  const revenueGrowthPercentage = lastMonthData && currentMonthData ? 
    calculateSafeGrowth(Number(currentMonthData.total_revenue), Number(lastMonthData.total_revenue)) : 0;

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
                  Analytics Dashboard
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Comprehensive analytics and performance insights for your affiliate program.
                </p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Performance Analytics
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Real-time insights and performance metrics for data-driven decisions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Activation Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {safeStats.totalSellers > 0 
                  ? ((safeStats.activeSellers / safeStats.totalSellers) * 100).toFixed(1)
                  : 0
                }%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={`font-medium ${
              sellersGrowthPercentage > 0 ? 'text-green-600' : 
              sellersGrowthPercentage < 0 ? 'text-red-600' : 'text-slate-600'
            }`}>
              {sellersGrowthPercentage > 0 ? `+${sellersGrowthPercentage.toFixed(1)}%` : 
               sellersGrowthPercentage < 0 ? `${sellersGrowthPercentage.toFixed(1)}%` : '0%'}
            </span>
            <span className="text-slate-600 ml-1">vs previous month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Conversion per Seller</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {safeStats.activeSellers > 0 
                  ? (safeStats.totalStudents / safeStats.activeSellers).toFixed(1)
                  : 0
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={`font-medium ${
              revenueGrowthPercentage > 0 ? 'text-green-600' : 
              revenueGrowthPercentage < 0 ? 'text-red-600' : 'text-slate-600'
            }`}>
              {revenueGrowthPercentage > 0 ? `+${revenueGrowthPercentage.toFixed(1)}%` : 
               revenueGrowthPercentage < 0 ? `${revenueGrowthPercentage.toFixed(1)}%` : '0%'}
            </span>
            <span className="text-slate-600 ml-1">vs previous month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Revenue per Student</p>
              {loadingAdjusted ? (
                <div className="h-9 bg-slate-200 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {safeStats.totalStudents > 0 
                    ? formatCurrency((clientAdjustedRevenue || safeStats.totalRevenue) / safeStats.totalStudents) 
                    : '$0.00'
                  }
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {loadingAdjusted ? (
              <div className="h-4 bg-slate-200 rounded animate-pulse w-24"></div>
            ) : (
              <>
                <span className={`font-medium ${
                  revenueGrowthPercentage > 0 ? 'text-green-600' : 
                  revenueGrowthPercentage < 0 ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {revenueGrowthPercentage > 0 ? `+${revenueGrowthPercentage.toFixed(1)}%` : 
                   revenueGrowthPercentage < 0 ? `${revenueGrowthPercentage.toFixed(1)}%` : '0%'}
                </span>
                <span className="text-slate-600 ml-1">vs mês anterior</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Monthly Performance</h3>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          
          <div className="space-y-4">
            {loadingMonthly || loadingAdjusted ? (
              // Skeleton loading para monthly performance
              [...Array(6)].map((_, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-20 h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[120px]">
                      <div className="bg-slate-200 h-2 rounded-full w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-16 mb-1"></div>
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-12"></div>
                  </div>
                </div>
              ))
            ) : monthlyData.length > 0 ? (
              monthlyData.map((data) => (
                <div key={data.month_year} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-20 text-sm text-slate-600 font-medium">{data.month_year}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[120px]">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(data.students_count / Math.max(...monthlyData.map(d => d.students_count), 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">{data.students_count} students</div>
                    <div className="text-xs text-slate-500">{formatCurrency(data.total_revenue)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No monthly data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Top Sellers</h3>
            <Award className="h-5 w-5 text-slate-400" />
          </div>
          
          <div className="space-y-4">
            {loadingAdjusted ? (
              // Skeleton loading para top sellers
              [...Array(3)].map((_, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                    <div>
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-24 mb-1"></div>
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-32"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-16 mb-1"></div>
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-12"></div>
                  </div>
                </div>
              ))
            ) : topSellers.length > 0 ? (
              topSellers.map((seller, idx) => (
                <div key={seller.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                      idx === 1 ? 'bg-slate-100 text-slate-800' :
                      idx === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{seller.name}</div>
                      <div className="text-xs text-slate-500">{seller.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">{seller.students_count || 0} students</div>
                    <div className="text-xs text-slate-500">{formatCurrency(seller.total_revenue || 0)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No sellers registered</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-slate-600 text-sm">
          <Calendar className="h-4 w-4" />
          <span>Data last updated: {new Date().toLocaleString()}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          All data is sourced from real-time database queries using optimized SQL functions
        </p>
      </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
