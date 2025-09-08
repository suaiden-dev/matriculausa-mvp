import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Award,
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
    averageCommissionPerReferral: 0
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
      
      // Buscar analytics de estudantes (mesma lógica do Seller Tracking / total_paid)
      const { data: studentsAnalytics, error: studentsError } = await supabase
        .rpc('get_admin_students_analytics', { admin_user_id: userId });

      if (studentsError) {
        console.error('Error fetching students analytics for affiliate overview:', studentsError);
        return;
      }

      const rows = studentsAnalytics || [];
      const totalRevenue = rows.reduce((sum: number, r: any) => sum + (Number(r.total_paid) || 0), 0);
      const totalReferrals = rows.length || 0;
      const completedReferrals = rows.filter((r: any) => (r.status || '').toLowerCase() === 'completed').length || 0;
      const activeReferrals = rows.filter((r: any) => (r.status || '').toLowerCase() === 'pending').length || 0;

      // Receita últimos 7 dias baseada na data do registro
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7DaysRevenue = rows
        .filter((r: any) => r.created_at && new Date(r.created_at) >= sevenDaysAgo)
        .reduce((sum: number, r: any) => sum + (Number(r.total_paid) || 0), 0);

      const averageCommissionPerReferral = totalReferrals > 0 ? totalRevenue / totalReferrals : 0;

      // No cartão principal, exibiremos Total Revenue usando o campo totalCredits para manter layout
      setFinancialStats({
        totalCredits: totalRevenue,
        totalEarned: totalRevenue,
        totalReferrals,
        activeReferrals,
        completedReferrals,
        last7DaysRevenue,
        pendingCredits: activeReferrals * 50,
        averageCommissionPerReferral
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
    // Calcular receita diária dos últimos 30 dias
    const dailyRevenue = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = referralsData?.filter((r: any) => {
        const rDate = new Date(r.created_at).toISOString().split('T')[0];
        return rDate === dateStr;
      }).reduce((sum: number, r: any) => sum + (Number(r.total_paid) || 0), 0) || 0;
      
      dailyRevenue.push({ date: dateStr, amount: dayRevenue });
    }

    // Calcular receita mensal dos últimos 12 meses
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      const monthRevenue = referralsData?.filter((r: any) => {
        const rDate = new Date(r.created_at);
        return rDate.getMonth() === date.getMonth() && 
               rDate.getFullYear() === date.getFullYear();
      }).reduce((sum: number, r: any) => sum + (Number(r.total_paid) || 0), 0) || 0;
      
      monthlyRevenue.push({ month: monthStr, amount: monthRevenue });
    }

    // Calcular tendências de referência
    const totalReferrals = referralsData?.length || 0;
    const completedReferrals = referralsData?.filter((r: any) => (r.status || '').toLowerCase() === 'completed').length || 0;
    const conversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;
    const averageCommission = totalReferrals > 0 ? 
      referralsData?.reduce((sum: number, r: any) => sum + (Number(r.total_paid) || 0), 0) / totalReferrals : 0;

    // Calcular breakdown por status
    const totalRequests = referralsData?.length || 0;
    const completedCount = referralsData?.filter((r: any) => (r.status || '').toLowerCase() === 'completed').length || 0;
    const pendingCount = referralsData?.filter((r: any) => (r.status || '').toLowerCase() === 'pending').length || 0;
    const cancelledCount = referralsData?.filter((r: any) => (r.status || '').toLowerCase() === 'cancelled').length || 0;
    
    const paymentMethodBreakdown = {
      completed: totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0,
      pending: totalRequests > 0 ? Math.round((pendingCount / totalRequests) * 100) : 0,
      credits: totalRequests > 0 ? Math.round((cancelledCount / totalRequests) * 100) : 0
    };

    // Criar atividade recente (últimos 10 eventos)
    const recentActivity: Array<{date: string, type: string, amount: number, description: string}> = [];
    
    // Adicionar referências recentes
    referralsData?.slice(0, 5).forEach((row: any) => {
      recentActivity.push({
        date: row.created_at,
        type: (row.status || '').toLowerCase() === 'completed' ? 'commission' : 'pending',
        amount: Number(row.total_paid) || 0,
        description: (row.status || '').toLowerCase() === 'completed' ? 'Student fees paid (non-application)' : 'Pending student fees'
      });
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
          label: 'Credits Earned',
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
              label: function(context: any) {
                return `Credits: ${context.parsed.y.toFixed(0)}`;
              }
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
              callback: function(value: any) {
                return value.toFixed(0) + ' credits';
              }
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
          label: 'Credits Earned',
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
              label: function(context: any) {
                return `Credits: ${context.parsed.y.toFixed(0)}`;
              }
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
              callback: function(value: any) {
                return value.toFixed(0) + ' credits';
              }
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

  const formatCredits = (amount: number) => {
    return `${amount.toFixed(0)} credits`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
            <p className="text-sm font-medium text-slate-600 mb-1">Total Credits</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(financialStats.totalCredits)}
            </p>
            <p className="text-xs text-slate-500">Available balance</p>
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

        {/* Total Earned Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Total Earned</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(financialStats.totalEarned)}
            </p>
            <p className="text-xs text-slate-500">Lifetime earnings</p>
          </div>
        </div>

        {/* Average Commission Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex items-center text-yellow-600">
              <Activity className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">
                {calculatedMetrics.totalReferrals} refs
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Avg. Commission</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(financialStats.averageCommissionPerReferral)}
            </p>
            <p className="text-xs text-slate-500">Per referral</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {/* Revenue Trend Chart - Full Width */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Commission Trend</h3>
            <p className="text-sm text-slate-600">Credits earned from referrals over time</p>
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
