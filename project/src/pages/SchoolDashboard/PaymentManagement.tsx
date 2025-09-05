import React, { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter, 
  Download, 
  Eye, 
  CreditCard, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  FileText,
  Globe,
  Plus,
  XCircle,
  Shield,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Declare Chart.js types
declare global {
  interface Window {
    Chart: any;
  }
}
import { useUniversity } from '../../context/UniversityContext';
import { useAuth } from '../../hooks/useAuth';
import { usePayments } from '../../hooks/usePayments';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import { UniversityPaymentRequestService } from '../../services/UniversityPaymentRequestService';
import { supabase } from '../../lib/supabase';

const PaymentManagement: React.FC = () => {
  const { university } = useUniversity();
  const { user } = useAuth();
  
  const {
    payments,
    stats,
    totalCount,
    totalPages,
    loading,
    error: paymentsError,
    currentPage,
    pageSize,
    filters,
    loadPayments,
    updateFilters,
    clearFilters,
    handlePageChange,
    handlePageSizeChange,
    exportPayments,
  } = usePayments(university?.id);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Payment request modal state
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentRequestAmount, setPaymentRequestAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<'zelle' | 'bank_transfer' | 'stripe'>('zelle');
  const [payoutDetails, setPayoutDetails] = useState<Record<string, any>>({});
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // University payment requests state
  const [universityPaymentRequests, setUniversityPaymentRequests] = useState<any[]>([]);
  const [loadingUniversityRequests, setLoadingUniversityRequests] = useState(false);
  const [universityBalance, setUniversityBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'student-payments' | 'university-requests' | 'financial-overview'>('financial-overview');
  
  // Financial statistics state
  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    last7DaysRevenue: 0,
    totalPaidOut: 0,
    totalApproved: 0,
    pendingRequests: 0,
    paidApplicationsCount: 0
  });

  // Detailed financial analytics state
  const [financialAnalytics, setFinancialAnalytics] = useState({
    dailyRevenue: [] as Array<{date: string, amount: number}>,
    monthlyRevenue: [] as Array<{month: string, amount: number}>,
    applicationTrends: {
      totalApplications: 0,
      paidApplications: 0,
      conversionRate: 0,
      averageFee: 0
    },
    paymentMethodBreakdown: {
      zelle: 0,
      bank_transfer: 0,
      stripe: 0
    },
    recentActivity: [] as Array<{date: string, type: string, amount: number, description: string}>
  });

  // Revenue chart filter state
  const [revenueChartType, setRevenueChartType] = useState<'daily' | 'monthly'>('daily');
  const [revenueChartPeriod, setRevenueChartPeriod] = useState<number>(7);
  
  // Chart refs for Chart.js
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const paymentStatusChartRef = useRef<HTMLCanvasElement>(null);
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  
  // Chart instances
  const [revenueChart, setRevenueChart] = useState<any>(null);
  const [paymentStatusChart, setPaymentStatusChart] = useState<any>(null);
  const [trendChart, setTrendChart] = useState<any>(null);
  
  // Calculated metrics state
  const [calculatedMetrics, setCalculatedMetrics] = useState({
    revenueGrowth: 0,
    conversionTarget: 0,
    monthlyAverage: 0,
    bestMonth: '',
    totalApplications: 0
  });
  
  
  // Request details modal state
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);
  
  // Stripe Connect status state
  const [hasStripeConnect, setHasStripeConnect] = useState(false);
  const [loadingStripeStatus, setLoadingStripeStatus] = useState(true);
  
  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportPayments();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_requests_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting payments:', err);
    } finally {
      setExporting(false);
    }
  };


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

  const checkStripeConnectStatus = async () => {
    if (!university?.id) return;
    
    try {
      setLoadingStripeStatus(true);
      
      // Verificar se a universidade tem configuração de taxa com Stripe Connect
      const { data: feeConfig, error } = await supabase
        .from('university_fee_configurations')
        .select('stripe_connect_enabled, stripe_connect_account_id')
        .eq('university_id', university.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking Stripe Connect status:', error);
        return;
      }
      
      // Se existe configuração e tem Stripe Connect habilitado
      const hasConnect = feeConfig && 
        feeConfig.stripe_connect_enabled === true && 
        feeConfig.stripe_connect_account_id;
      
      setHasStripeConnect(!!hasConnect);
      
      console.log('🔗 [Stripe Connect] Status check:', {
        universityId: university.id,
        feeConfig,
        hasConnect,
        stripeEnabled: feeConfig?.stripe_connect_enabled,
        accountId: feeConfig?.stripe_connect_account_id
      });
      
    } catch (error: any) {
      console.error('Error checking Stripe Connect status:', error);
    } finally {
      setLoadingStripeStatus(false);
    }
  };

  const loadUniversityPaymentRequests = async () => {
    if (!university?.id) return;
    
    try {
      setLoadingUniversityRequests(true);
      const requests = await UniversityPaymentRequestService.listUniversityPaymentRequests(university.id);
      setUniversityPaymentRequests(requests);
      
      // Calcular total de payment requests (pending, approved e paid) - rejeitados NÃO são subtraídos do saldo
      const totalPaidOut = requests
        .filter((r: any) => r.status === 'paid')
        .reduce((sum: number, r: any) => sum + r.amount_usd, 0);
      
      const totalApproved = requests
        .filter((r: any) => r.status === 'approved')
        .reduce((sum: number, r: any) => sum + r.amount_usd, 0);
      
      const totalPending = requests
        .filter((r: any) => r.status === 'pending')
        .reduce((sum: number, r: any) => sum + r.amount_usd, 0);
      
      const totalRejected = requests
        .filter((r: any) => r.status === 'rejected')
        .reduce((sum: number, r: any) => sum + r.amount_usd, 0);
      
             // Calcular receita baseada APENAS em application fees pagas (TODAS as aplicações, não apenas 90 dias)
       const { data: paidApplications, error: paidError } = await supabase
         .from('scholarship_applications')
         .select(`
           scholarship_id,
           created_at,
           is_application_fee_paid,
           scholarships!inner(
             university_id,
             application_fee_amount
           )
         `)
         .eq('is_application_fee_paid', true)
         .eq('scholarships.university_id', university.id);
       
       if (paidError) {
         console.error('Error fetching paid applications:', paidError);
       }
       
       // Calcular receita total APENAS de application fees - converter de centavos para dólares
       const totalApplicationFeeRevenue = paidApplications?.reduce((sum: number, app: any) => {
         const feeAmount = app.scholarships?.application_fee_amount || 0;
         return sum + (feeAmount / 100); // Converter de centavos para dólares
       }, 0) || 0;
       
       // Calcular receita de application fees dos últimos 7 dias
       const sevenDaysAgo = new Date();
       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
       
       const last7DaysApplicationFeeRevenue = paidApplications?.filter((app: any) => {
         const appDate = new Date(app.created_at);
         return appDate >= sevenDaysAgo;
       }).reduce((sum: number, app: any) => {
         const feeAmount = app.scholarships?.application_fee_amount || 0;
         return sum + (feeAmount / 100);
       }, 0) || 0;
      
             // Calcular saldo disponível: Application fees - Payment requests (pending + approved + paid) + rejeitados voltam ao saldo
       const availableBalance = Math.max(0, totalApplicationFeeRevenue - totalPaidOut - totalApproved - totalPending);
       setUniversityBalance(availableBalance);
       
       // Atualizar estatísticas financeiras
       setFinancialStats({
         totalRevenue: totalApplicationFeeRevenue,
         last7DaysRevenue: last7DaysApplicationFeeRevenue,
         totalPaidOut,
         totalApproved,
         pendingRequests: requests.filter((r: any) => r.status === 'pending').length,
         paidApplicationsCount: paidApplications?.length || 0
       });
       
       console.log('💰 [Balance] Calculation:', {
         totalApplicationFeeRevenue,
         last7DaysApplicationFeeRevenue,
         totalPaidOut,
         totalApproved,
         totalPending,
         totalRejected,
         availableBalance,
         paidApplicationsCount: paidApplications?.length || 0
       });
    } catch (error: any) {
      console.error('Error loading university payment requests:', error);
    } finally {
      setLoadingUniversityRequests(false);
    }
  };

  // Função para carregar análises financeiras detalhadas
  const loadFinancialAnalytics = async () => {
    if (!university?.id) return;
    
    try {
             // Buscar aplicações dos últimos 90 dias para análise temporal (APENAS application fees)
       const ninetyDaysAgo = new Date();
       ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
       
       const { data: applications, error: appsError } = await supabase
         .from('scholarship_applications')
         .select(`
           id,
           created_at,
           is_application_fee_paid,
           scholarships!inner(
             university_id,
             application_fee_amount
           )
         `)
         .eq('scholarships.university_id', university.id)
         .gte('created_at', ninetyDaysAgo.toISOString())
         .order('created_at', { ascending: false });

      if (appsError) {
        console.error('Error fetching applications for analytics:', appsError);
        return;
      }

             // Calcular receita diária de application fees dos últimos 30 dias
       const dailyRevenue = [];
       for (let i = 29; i >= 0; i--) {
         const date = new Date();
         date.setDate(date.getDate() - i);
         const dateStr = date.toISOString().split('T')[0];
         
         const dayApplicationFeeRevenue = applications?.filter(app => {
           const appDate = new Date(app.created_at).toISOString().split('T')[0];
           return appDate === dateStr && app.is_application_fee_paid;
         }).reduce((sum, app) => {
           const scholarship = Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships;
           return sum + ((scholarship?.application_fee_amount || 0) / 100);
         }, 0) || 0;
         
         dailyRevenue.push({ date: dateStr, amount: dayApplicationFeeRevenue });
       }

       // Calcular receita mensal de application fees dos últimos 12 meses
       const monthlyRevenue = [];
       for (let i = 11; i >= 0; i--) {
         const date = new Date();
         date.setMonth(date.getMonth() - i);
         const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
         
         const monthApplicationFeeRevenue = applications?.filter(app => {
           const appDate = new Date(app.created_at);
           return appDate.getMonth() === date.getMonth() && 
                  appDate.getFullYear() === date.getFullYear() && 
                  app.is_application_fee_paid;
         }).reduce((sum, app) => {
           const scholarship = Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships;
           return sum + ((scholarship?.application_fee_amount || 0) / 100);
         }, 0) || 0;
         
         monthlyRevenue.push({ month: monthStr, amount: monthApplicationFeeRevenue });
       }

             // Calcular tendências de aplicação (APENAS application fees)
       const totalApplications = applications?.length || 0;
       const paidApplications = applications?.filter(app => app.is_application_fee_paid).length || 0;
       const conversionRate = totalApplications > 0 ? (paidApplications / totalApplications) * 100 : 0;
       const averageApplicationFee = paidApplications > 0 ? 
         applications?.filter(app => app.is_application_fee_paid)
           .reduce((sum, app) => {
             const scholarship = Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships;
             return sum + ((scholarship?.application_fee_amount || 0) / 100);
           }, 0) / paidApplications : 0;

      // Calcular breakdown por método de pagamento (porcentagens)
      const totalPaymentRequests = universityPaymentRequests.length;
      const zelleCount = universityPaymentRequests.filter(r => r.payout_method === 'zelle').length;
      const bankTransferCount = universityPaymentRequests.filter(r => r.payout_method === 'bank_transfer').length;
      const stripeCount = universityPaymentRequests.filter(r => r.payout_method === 'stripe').length;
      
      const paymentMethodBreakdown = {
        zelle: totalPaymentRequests > 0 ? Math.round((zelleCount / totalPaymentRequests) * 100) : 0,
        bank_transfer: totalPaymentRequests > 0 ? Math.round((bankTransferCount / totalPaymentRequests) * 100) : 0,
        stripe: totalPaymentRequests > 0 ? Math.round((stripeCount / totalPaymentRequests) * 100) : 0
      };

             // Criar atividade recente (últimos 10 eventos) - APENAS application fees e payment requests
       const recentActivity: Array<{date: string, type: string, amount: number, description: string}> = [];
       
       // Adicionar application fees pagas recentes
       applications?.slice(0, 5).forEach(app => {
         if (app.is_application_fee_paid) {
           const scholarship = Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships;
           recentActivity.push({
             date: app.created_at,
             type: 'revenue',
             amount: (scholarship?.application_fee_amount || 0) / 100,
             description: 'Application fee received'
           });
         }
       });

       // Adicionar payment requests recentes
       universityPaymentRequests.slice(0, 5).forEach(request => {
         recentActivity.push({
           date: request.created_at,
           type: request.status === 'paid' ? 'payout' : 'request',
           amount: request.amount_usd,
           description: `Payment request ${request.status}`
         });
       });

       // Ordenar por data e pegar os 10 mais recentes
       recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
       recentActivity.splice(10);

       setFinancialAnalytics({
         dailyRevenue,
         monthlyRevenue,
         applicationTrends: {
           totalApplications,
           paidApplications,
           conversionRate,
           averageFee: averageApplicationFee
         },
         paymentMethodBreakdown,
         recentActivity
       });

    } catch (error: any) {
      console.error('Error loading financial analytics:', error);
    }
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
              label: function(context: any) {
                return `Revenue: $${context.parsed.y.toFixed(2)}`;
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
                return '$' + value.toFixed(0);
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

  // Create payment status pie chart
  const createPaymentStatusChart = () => {
    if (!paymentStatusChartRef.current || !window.Chart) return;

    // Destroy existing chart
    if (paymentStatusChart) {
      paymentStatusChart.destroy();
    }

    const ctx = paymentStatusChartRef.current.getContext('2d');
    
    // Calculate payment status distribution
    const totalPaid = financialStats.paidApplicationsCount;
    const totalPending = financialStats.pendingRequests;
    const totalRejected = universityPaymentRequests.filter((r: any) => r.status === 'rejected').length;

    const chart = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Pending', 'Rejected'],
        datasets: [{
          data: [totalPaid, totalPending, totalRejected],
          backgroundColor: [
            '#10B981', // Green for paid
            '#F59E0B', // Yellow for pending
            '#EF4444'  // Red for rejected
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
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    });

    setPaymentStatusChart(chart);
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
              label: function(context: any) {
                return `Revenue: $${context.parsed.y.toFixed(2)}`;
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
                return '$' + value.toFixed(0);
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

    // Calculate conversion target (industry average or based on historical data)
    const conversionTarget = financialAnalytics.applicationTrends.conversionRate > 0
      ? Math.min(95, financialAnalytics.applicationTrends.conversionRate * 1.1) // 10% above current
      : 85; // Default industry target

    setCalculatedMetrics({
      revenueGrowth,
      conversionTarget,
      monthlyAverage,
      bestMonth,
      totalApplications: financialAnalytics.applicationTrends.totalApplications
    });
  };

  // Update charts when data changes
  useEffect(() => {
    if (window.Chart && financialAnalytics.dailyRevenue.length > 0) {
      createRevenueChart();
      createPaymentStatusChart();
      createTrendChart();
    }
  }, [financialAnalytics, revenueChartType, revenueChartPeriod]);

  // Calculate metrics when financial data changes
  useEffect(() => {
    if (financialAnalytics.dailyRevenue.length > 0) {
      calculateRealMetrics();
    }
  }, [financialAnalytics]);

  // Carregar payment requests da universidade quando a universidade mudar
  React.useEffect(() => {
    if (university?.id) {
      loadUniversityPaymentRequests();
      checkStripeConnectStatus();
      loadFinancialAnalytics();
    }
  }, [university?.id]);


  // Real-time validation of requested amount
  const validatePaymentAmount = (amount: number) => {
    const availableBalance = universityBalance;
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

  // Check if requested amount is valid
  const isPaymentAmountValid = () => {
    return paymentRequestAmount > 0 && paymentRequestAmount <= universityBalance;
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
      // Zelle requer email OU telefone (não ambos), Account holder name é opcional
      return (payoutDetails.zelle_email || payoutDetails.zelle_phone) && 
             !(payoutDetails.zelle_email && payoutDetails.zelle_phone);
    }
    if (payoutMethod === 'stripe') {
      return payoutDetails.stripe_email;
    }
    return true;
  };

  const handleSubmitPaymentRequest = async () => {
    if (!user?.id || !university?.id) return;
    
    // Valid amount validation
    if (!paymentRequestAmount || paymentRequestAmount <= 0) {
      setError('Please enter a valid amount for payment request');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Insufficient balance validation
    const availableBalance = universityBalance;
    if (paymentRequestAmount > availableBalance) {
      setError(`Insufficient balance. You have ${formatCurrency(availableBalance)} available, but requested ${formatCurrency(paymentRequestAmount)}.`);
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Payout details validation
    if (!isPayoutDetailsValid()) {
      let errorMessage = 'Please fill in all required payment details.';
      if (payoutMethod === 'zelle') {
        errorMessage = 'Please provide either Zelle email or phone number (not both).';
      } else if (payoutMethod === 'bank_transfer') {
        errorMessage = 'Please fill in all required bank details.';
      } else if (payoutMethod === 'stripe') {
        errorMessage = 'Please provide Stripe email.';
      }
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      setSubmittingPayout(true);
      
      // Create payment request using the service
      await UniversityPaymentRequestService.createPaymentRequest({
        universityId: university.id,
        userId: user.id,
        amount: paymentRequestAmount,
        payoutMethod: payoutMethod,
        payoutDetails: payoutDetails
      });
      
      setShowPaymentRequestModal(false);
      setPaymentRequestAmount(0);
      setPayoutDetails({});
      
      // Recarregar os requests e saldo para atualizar a interface
      await loadUniversityPaymentRequests();
      
      // Show success message
      setError(null);
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      succeeded: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Processing' },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Failed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getApplicationStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Rejected' },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: Eye, label: 'Under Review' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage payment requests"
      description="Finish setting up your university profile to track and manage scholarship payment requests"
    >
      <div className="min-h-screen">
        {/* Header + Tabs Section */}
        <div className="w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="max-w-full mx-auto bg-slate-50">
              {/* Header: title + note + counter */}
              <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                    Payment Management
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-600">
                    Monitor and manage all scholarship payment requests and application fees.
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    Track student payments and request payouts from your available balance.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                    <DollarSign className="w-5 h-5 mr-2" />
                    {formatCurrency(universityBalance)} Available
                  </div>
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
                      onClick={() => setActiveTab('student-payments')}
                      className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                        activeTab === 'student-payments' 
                          ? 'border-[#05294E] text-[#05294E]' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                      type="button"
                      aria-selected={activeTab === 'student-payments'}
                      role="tab"
                    >
                      <FileText className={`w-5 h-5 mr-2 transition-colors ${
                        activeTab === 'student-payments' ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                      Student Payments
                    </button>
                    <button
                      onClick={() => setActiveTab('university-requests')}
                      className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                        activeTab === 'university-requests' 
                          ? 'border-[#05294E] text-[#05294E]' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                      type="button"
                      aria-selected={activeTab === 'university-requests'}
                      role="tab"
                    >
                      <CreditCard className={`w-5 h-5 mr-2 transition-colors ${
                        activeTab === 'university-requests' ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                      University Requests
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
                        {activeTab === 'student-payments' ? 'Student Payment Records' : 
                         activeTab === 'university-requests' ? 'University Payment Requests' : 
                         'Financial Overview & Analytics'}
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        {activeTab === 'student-payments' 
                          ? 'View and export all student payment transactions and application fees'
                          : activeTab === 'university-requests'
                          ? 'Request payouts from your available balance and track request status'
                          : 'Comprehensive financial analytics, trends, and performance metrics'
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {activeTab === 'university-requests' && (
                        <button
                          onClick={() => setShowPaymentRequestModal(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#05294E] hover:bg-[#05294E]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-colors"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Request Payment
                        </button>
                      )}
                      {activeTab === 'student-payments' && (
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-all duration-200 ease-in-out"
                        >
                          <Filter className={`w-4 h-4 mr-2 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                          Filters
                        </button>
                      )}
                      <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#05294E] hover:bg-[#05294E]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] disabled:opacity-50"
                      >
                        {exporting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

            {/* Student Payments Tab Content */}
      {activeTab === 'student-payments' && (
        <>
          {/* Filters */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="search-query" className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      id="search-query"
                      type="text"
                      placeholder="Search by name or email..."
                      value={filters.search_query}
                      onChange={(e) => updateFilters({ search_query: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                      aria-label="Search payment requests by student name or email"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="application-status-filter" className="block text-sm font-medium text-slate-700 mb-2">Application Status</label>
                  <select
                    id="application-status-filter"
                    value={filters.application_status_filter}
                    onChange={(e) => updateFilters({ application_status_filter: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    aria-label="Filter by application status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="under_review">Under Review</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="payment-type-filter" className="block text-sm font-medium text-slate-700 mb-2">Payment Type</label>
                  <select
                    id="payment-type-filter"
                    value={filters.payment_type_filter}
                    onChange={(e) => updateFilters({ payment_type_filter: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    aria-label="Filter by payment type"
                  >
                    <option value="all">All Types</option>
                    <option value="application_fee">Application Fee</option>
                    <option value="scholarship_fee">Scholarship Fee</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="date-from" className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                  <div className="space-y-2">
                    <input
                      id="date-from"
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => updateFilters({ date_from: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                      aria-label="Filter payment requests from date"
                    />
                    <input
                      id="date-to"
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => updateFilters({ date_to: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                      aria-label="Filter payment requests to date"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={clearFilters}
                  className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>

          {/* Student Payment Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Applications</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_applications}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Paid Application Fees</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.paid_application_fees}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Pending Application Fees</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.pending_application_fees}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                                 <div className="ml-4">
                   <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                   <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total_revenue)}</p>
                   <p className="text-xs text-slate-500">From application fees</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Payment Requests Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900">Payment Requests</h3>
                <div className="flex items-center space-x-4">
                  <label htmlFor="page-size-select" className="text-sm text-slate-600">Show:</label>
                  <select
                    id="page-size-select"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    aria-label="Select number of payment requests to display per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : paymentsError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600">{paymentsError}</p>
                <button
                  onClick={() => loadPayments(currentPage)}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student & Application
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scholarship Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied Date
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th> */}
                  </tr>
                </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{payment.student_name}</div>
                            <div className="text-sm text-gray-500">{payment.student_email}</div>
                            <div className="text-xs text-gray-400 flex items-center mt-1">
                              <Globe className="w-3 h-3 mr-1" />
                              {payment.student_country}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{payment.scholarship_title}</div>
                            {payment.scholarship_field && (
                              <div className="text-xs text-gray-500">
                                {payment.scholarship_field}
                              </div>
                            )}
                            {/* {payment.scholarship_amount && (
                              <div className="text-xs text-gray-500">
                                {formatScholarshipAmount(payment.scholarship_amount)}
                              </div>
                            )} */}
                            {/* <div className="text-xs text-gray-400 flex items-center mt-1">
                              <Award className="w-3 h-3 mr-1" />
                              {payment.scholarship_type || 'Not specified'}
                            </div> */}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getApplicationStatusBadge(payment.application_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.status)}
                          <div className="text-xs text-gray-500 mt-1">
                            {payment.payment_type === 'application_fee' ? 'Application Fee' : 'Scholarship Fee'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(payment.amount_charged)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.applied_at)}
                      </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            title="View application details"
                            aria-label="View application details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            title="Download application"
                            aria-label="Download application"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      aria-label="Go to previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 border rounded-md text-sm ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      aria-label="Go to next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        </>
      )}

      {/* University Payment Requests Tab Content */}
              {activeTab === 'university-requests' && (
        <>
                    {/* Stripe Connect Banner - Only show if not connected */}
                    {!loadingStripeStatus && !hasStripeConnect && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-[#05294E] rounded-xl">
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h2 className="text-xl font-semibold text-slate-900 mb-2">Upgrade to Stripe Connect</h2>
                            <p className="text-slate-600 text-sm mb-4">Skip payment requests, get paid instantly!</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <CheckCircle className="w-4 h-4 text-[#05294E]" />
                                <div>
                                  <h4 className="font-medium text-slate-900 text-sm">Instant Payments</h4>
                                  <p className="text-xs text-slate-600">Application fees go directly to your account</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <TrendingUp className="w-4 h-4 text-[#05294E]" />
                                <div>
                                  <h4 className="text-sm font-medium text-slate-900">No More Delays</h4>
                                  <p className="text-xs text-slate-600">Skip admin approval and waiting periods</p>
                                </div>
                              </div>
                            </div>
                            
                            <button
                              disabled
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-400 text-white text-sm font-medium rounded-lg cursor-not-allowed opacity-60"
                            >
                              <CreditCard className="w-4 h-4" />
                              Under Development
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stripe Connect Success Message - Only show if connected */}
                    {!loadingStripeStatus && hasStripeConnect && (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm mb-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-green-100 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h2 className="text-xl font-semibold text-green-900 mb-2">✅ Stripe Connect Active</h2>
                            <p className="text-green-700 text-sm mb-4">Great! Your Stripe Connect account is set up. Application fees will be paid directly to your connected account.</p>
                            
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              <span>No more payment requests needed</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

          {/* University Requests Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                                 <div className="ml-4">
                   <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                   <p className="text-2xl font-bold text-slate-900">
                     {loadingUniversityRequests ? (
                       <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                     ) : (
                       formatCurrency(financialStats.totalRevenue)
                     )}
                   </p>
                   <p className="text-xs text-slate-500">From application fees</p>
                 </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Requested</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingUniversityRequests ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                    ) : (
                      formatCurrency(universityPaymentRequests.reduce((sum, r) => sum + r.amount_usd, 0))
                    )}
                  </p>
                  <p className="text-xs text-slate-500">All payment requests</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                                 <div className="ml-4">
                   <p className="text-sm font-medium text-slate-600">Pending Payment Requests</p>
                   <p className="text-2xl font-bold text-slate-900">
                     {loadingUniversityRequests ? (
                       <div className="animate-pulse bg-slate-200 h-8 w-8 rounded"></div>
                     ) : (
                       financialStats.pendingRequests
                     )}
                   </p>
                   <p className="text-xs text-slate-500">Awaiting approval</p>
                 </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                                 <div className="ml-4">
                   <p className="text-sm font-medium text-slate-600">Available Balance</p>
                   <p className="text-2xl font-bold text-slate-900">
                     {loadingUniversityRequests ? (
                       <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                     ) : (
                       formatCurrency(universityBalance)
                     )}
                   </p>
                   <p className="text-xs text-slate-500">Application fees - active payment requests</p>
                 </div>
              </div>
            </div>
          </div>


          {/* University Payment Requests Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900">University Payment Requests</h3>
              <p className="text-sm text-slate-600">Your submitted payment requests and their status</p>
            </div>
          </div>

          {loadingUniversityRequests ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : universityPaymentRequests.length === 0 ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {universityPaymentRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Payment Request #{request.id.slice(0, 8)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.user?.full_name || request.user?.email || 'Unknown User'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{formatCurrency(request.amount_usd)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {request.payout_method.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'paid' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="space-y-2">
                          {/* Botão de detalhes */}
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRequestDetailsModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Details
                          </button>
                          
                          {/* Botão de cancelamento para requests pendentes */}
                          {request.status === 'pending' && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to cancel this payment request for ${formatCurrency(request.amount_usd)}? The amount will be returned to your available balance.`)) {
                                  try {
                                    await UniversityPaymentRequestService.cancelPaymentRequest(request.id, user!.id);
                                    // Recarregar requests e saldo
                                    await loadUniversityPaymentRequests();
                                    setSuccessMessage('Payment request cancelled successfully. Amount returned to your balance.');
                                    setTimeout(() => setSuccessMessage(null), 5000);
                                  } catch (error: any) {
                                    setError(error.message || 'Failed to cancel payment request');
                                    setTimeout(() => setError(null), 5000);
                                  }
                                }
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Cancel this payment request and return amount to balance"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Cancel
                            </button>
                          )}
                          
                          {/* Alertas quando há notas do admin */}
                          {request.admin_notes && (
                            <div className="flex items-center space-x-1">
                              {request.status === 'rejected' ? (
                                <>
                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                  <span className="text-xs text-red-600 font-medium">
                                    Has rejection reason
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 text-blue-500" />
                                  <span className="text-xs text-blue-600 font-medium">
                                    Has admin notes
                                  </span>
                                </>
                              )}
                            </div>
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
        </>
      )}

      {/* Financial Overview Tab Content */}
      {activeTab === 'financial-overview' && (
        <>

          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue Card */}
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
                  {formatCurrency(financialStats.totalRevenue)}
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
                  {financialAnalytics.applicationTrends.conversionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">Applications to payments</p>
              </div>
            </div>

            {/* Available Balance Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>

              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-slate-900 mb-1">
                  {formatCurrency(universityBalance)}
                </p>
                <p className="text-xs text-slate-500">Ready for withdrawal</p>
              </div>
            </div>

            {/* Average Fee Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex items-center text-yellow-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">
                    {calculatedMetrics.totalApplications} apps
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Avg. Application Fee</p>
                <p className="text-3xl font-bold text-slate-900 mb-1">
                  {formatCurrency(financialAnalytics.applicationTrends.averageFee)}
                </p>
                <p className="text-xs text-slate-500">Per application</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          {/* Revenue Trend Chart - Full Width */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Revenue Trend</h3>
                <p className="text-sm text-slate-600">Application fee revenue over time</p>
              </div>
              
              {/* Time Period Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Quick Period Buttons */}
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
                
                {/* Custom Period Selector */}
               
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                  <span className="text-slate-600">Average Monthly</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(calculatedMetrics.monthlyAverage)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Status Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Payment Status</h3>
                <PieChart className="w-5 h-5 text-slate-600" />
              </div>
              
              <div className="h-48">
                <canvas ref={paymentStatusChartRef}></canvas>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {financialStats.paidApplicationsCount}
                  </div>
                  <div className="text-xs text-slate-600">Paid</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-yellow-600">
                    {financialStats.pendingRequests}
                  </div>
                  <div className="text-xs text-slate-600">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">
                    {universityPaymentRequests.filter((r: any) => r.status === 'rejected').length}
                  </div>
                  <div className="text-xs text-slate-600">Rejected</div>
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
                  <span className="text-sm text-slate-600">Total Paid Out</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatCurrency(financialStats.totalPaidOut)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Pending Requests</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatCurrency(financialStats.totalApproved)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Applications</span>
                  <span className="text-sm font-medium text-slate-900">
                    {financialAnalytics.applicationTrends.totalApplications}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {financialAnalytics.applicationTrends.conversionRate.toFixed(1)}%
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
                <p className="text-sm text-slate-600">Latest financial transactions and events</p>
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
                      activity.type === 'revenue' ? 'bg-green-500' :
                      activity.type === 'payout' ? 'bg-blue-500' :
                      'bg-yellow-500'
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
                        activity.type === 'revenue' ? 'text-green-600' :
                        activity.type === 'payout' ? 'text-blue-600' :
                        'text-yellow-600'
                      }`}>
                        {activity.type === 'revenue' ? '+' : '-'}{formatCurrency(activity.amount)}
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
        </>
      )}

      {/* Payment Request Modal */}
      {showPaymentRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Request Payment</h3>
              <button onClick={() => setShowPaymentRequestModal(false)} title="Close" className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-5 w-5"/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Error message */}
              {inputError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800 font-medium">{inputError}</span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="payment-request-amount">Amount (USD)</label>
                <input
                  id="payment-request-amount"
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
                    const max = universityBalance;
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
                {inputError ? (
                  <p className="text-xs text-red-600 mt-1">{inputError}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formatCurrency(universityBalance)} • Requested: {formatCurrency(paymentRequestAmount)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="payout-method">Payment method</label>
                <select id="payout-method" value={payoutMethod} onChange={(e)=> setPayoutMethod(e.target.value as 'zelle' | 'bank_transfer' | 'stripe')} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="zelle">Zelle</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>

              {/* Dynamic fields */}
              {payoutMethod === 'zelle' && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <input 
                      placeholder="Zelle email *" 
                      type='email'
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !payoutDetails.zelle_email && !payoutDetails.zelle_phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_email: e.target.value, zelle_phone: ''})}
                    />
                    {!payoutDetails.zelle_email && !payoutDetails.zelle_phone && <p className="text-xs text-red-600 mt-1">Zelle email or phone is required</p>}
                  </div>
                  <div>
                    <input 
                      placeholder="Zelle phone *" 
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !payoutDetails.zelle_email && !payoutDetails.zelle_phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_phone: e.target.value, zelle_email: ''})}
                    />
                    {!payoutDetails.zelle_email && !payoutDetails.zelle_phone && <p className="text-xs text-red-600 mt-1">Zelle email or phone is required</p>}
                  </div>
                  <div>
                    <input 
                      placeholder="Account holder name (optional)" 
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional - useful for verification or records</p>
                  </div>
                </div>
              )}
              {payoutMethod === 'bank_transfer' && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <input 
                      placeholder="Bank name *" 
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !payoutDetails.bank_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      onChange={(e)=> setPayoutDetails({...payoutDetails, bank_name: e.target.value})}
                    />
                    {!payoutDetails.bank_name && <p className="text-xs text-red-600 mt-1">Bank name is required</p>}
                  </div>
                  <div>
                    <input 
                      placeholder="Account holder name *" 
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !payoutDetails.account_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}
                    />
                    {!payoutDetails.account_name && <p className="text-xs text-red-600 mt-1">Account holder name is required</p>}
                  </div>
                  <div>
                    <input 
                      placeholder="Routing number *" 
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !payoutDetails.routing_number ? 'border-red-300' : 'border-gray-300'
                      }`}
                      onChange={(e)=> setPayoutDetails({...payoutDetails, routing_number: e.target.value})}
                    />
                    {!payoutDetails.routing_number && <p className="text-xs text-red-600 mt-1">Routing number is required</p>}
                  </div>
                  <div>
                    <input 
                      placeholder="Account number *" 
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !payoutDetails.account_number ? 'border-red-300' : 'border-gray-300'
                      }`}
                      onChange={(e)=> setPayoutDetails({...payoutDetails, account_number: e.target.value})}
                    />
                    {!payoutDetails.account_number && <p className="text-xs text-red-600 mt-1">Account number is required</p>}
                  </div>
                  <div>
                    <input 
                      placeholder="SWIFT / IBAN (optional)" 
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onChange={(e)=> setPayoutDetails({...payoutDetails, swift: e.target.value, iban: e.target.value})}
                    />
                  </div>
                </div>
              )}
              {payoutMethod === 'stripe' && (
                <div className="grid grid-cols-1 gap-3">
                  <input placeholder="Stripe email" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_email: e.target.value})}/>
                  <input placeholder="Stripe account id (optional)" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_account_id: e.target.value})}/>
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
                         !isPayoutDetailsValid() ? 
                           (payoutMethod === 'zelle' ? 'Please provide either Zelle email or phone number (not both)' :
                            payoutMethod === 'bank_transfer' ? 'Please fill in all required bank details' :
                            payoutMethod === 'stripe' ? 'Please provide Stripe email' :
                            'Please fill in all required payment details') : 
                         'Submit payment request'}
                >
                  {submittingPayout ? 'Submitting...' : 'Submit request'}
                </button>
              </div>
            </div>
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

      {/* Request Details Modal */}
      {showRequestDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Payment Request Details</h3>
                <button 
                  onClick={() => setShowRequestDetailsModal(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Request Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Request Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">{formatCurrency(selectedRequest.amount_usd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-semibold capitalize">{selectedRequest.payout_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedRequest.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        selectedRequest.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{formatDate(selectedRequest.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedRequest.payout_details_preview ? (
                      (() => {
                        const details = selectedRequest.payout_details_preview;
                        const method = selectedRequest.payout_method;
                        
                        if (method === 'zelle') {
                          return (
                            <div className="space-y-3">
                              {details.zelle_email && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Zelle Email:</span>
                                  <span className="text-gray-800">{details.zelle_email}</span>
                                </div>
                              )}
                              {details.zelle_phone && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Zelle Phone:</span>
                                  <span className="text-gray-800">{details.zelle_phone}</span>
                                </div>
                              )}
                              {details.account_name && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Account Holder:</span>
                                  <span className="text-gray-800">{details.account_name}</span>
                                </div>
                              )}
                            </div>
                          );
                        } else if (method === 'bank_transfer') {
                          return (
                            <div className="space-y-3">
                              {details.bank_name && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Bank Name:</span>
                                  <span className="text-gray-800">{details.bank_name}</span>
                                </div>
                              )}
                              {details.account_name && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Account Holder:</span>
                                  <span className="text-gray-800">{details.account_name}</span>
                                </div>
                              )}
                              {details.routing_number && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Routing Number:</span>
                                  <span className="text-gray-800 font-mono">{details.routing_number}</span>
                                </div>
                              )}
                              {details.account_number && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Account Number:</span>
                                  <span className="text-gray-800 font-mono">{details.account_number}</span>
                                </div>
                              )}
                              {(details.swift || details.iban) && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">SWIFT/IBAN:</span>
                                  <span className="text-gray-800 font-mono">{details.swift || details.iban}</span>
                                </div>
                              )}
                            </div>
                          );
                        } else if (method === 'stripe') {
                          return (
                            <div className="space-y-3">
                              {details.stripe_email && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Stripe Email:</span>
                                  <span className="text-gray-800">{details.stripe_email}</span>
                                </div>
                              )}
                              {details.stripe_account_id && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Account ID:</span>
                                  <span className="text-gray-800 font-mono">{details.stripe_account_id}</span>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // Fallback para outros métodos ou dados não reconhecidos
                          return (
                            <div className="space-y-2">
                              {Object.entries(details).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium capitalize">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="text-gray-800 font-mono">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No payment details available for this request</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes - Destaque Principal */}
                {selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      {selectedRequest.status === 'rejected' ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                          Rejection Reason
                        </>
                      ) : selectedRequest.status === 'approved' ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
                          Approval Notes
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-gray-500 mr-2" />
                          Admin Notes
                        </>
                      )}
                    </h4>
                    <div className={`rounded-lg p-4 border-l-4 ${
                      selectedRequest.status === 'rejected' 
                        ? 'bg-red-50 border-red-400' 
                        : selectedRequest.status === 'approved'
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-gray-50 border-gray-400'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                          selectedRequest.status === 'rejected' ? 'bg-red-400' :
                          selectedRequest.status === 'approved' ? 'bg-blue-400' :
                          'bg-gray-400'
                        }`}></div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium mb-2 ${
                            selectedRequest.status === 'rejected' ? 'text-red-700' :
                            selectedRequest.status === 'approved' ? 'text-blue-700' :
                            'text-gray-700'
                          }`}>
                            {selectedRequest.status === 'rejected' ? 'Why was this request rejected?' :
                             selectedRequest.status === 'approved' ? 'Additional information about approval:' :
                             'Administrative notes:'}
                          </p>
                          <div className={`text-sm leading-relaxed ${
                            selectedRequest.status === 'rejected' ? 'text-red-800' :
                            selectedRequest.status === 'approved' ? 'text-blue-800' :
                            'text-gray-800'
                          }`}>
                            {selectedRequest.admin_notes}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Admin Notes */}
                {!selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Admin Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No admin notes available for this request</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end pt-4 border-t">
                  <button
                    onClick={() => setShowRequestDetailsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default PaymentManagement;