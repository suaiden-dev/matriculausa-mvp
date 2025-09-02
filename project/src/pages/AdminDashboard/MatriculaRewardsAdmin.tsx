import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Award, 
  Eye, 
  Shield, 
  Activity,
  Download,
  RefreshCw,
  AlertTriangle,
  Crown,
  Target,
  DollarSign,
  XCircle,
  CheckCircle,
  Clock,
  CheckCircle2,
  CreditCard,
  Banknote,
  User,
  GraduationCap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import MatriculaRewardsModeration from './MatriculaRewardsModeration';
import { PayoutService } from '../../services/PayoutService';
import type { TuitionRedemption } from '../../types';

interface MatriculaRewardsStats {
  totalUsers: number;
  totalReferrals: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  conversionRate: number;
  averageCoinsPerUser: number;
  topReferrers: TopReferrer[];
  recentActivity: RecentActivity[];
  topStudentsByBalance: StudentSummary[];
  topStudentsBySpent: StudentSummary[];
  couponUsage: CouponUsageStats;
  couponUsageDetails: CouponUsageDetail[];
  recentRedemptions: RedemptionEntry[];
}

interface TopReferrer {
  userId: string;
  fullName: string;
  email: string;
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'referral' | 'redemption' | 'share' | 'click';
  userId: string;
  fullName: string;
  description: string;
  amount?: number;
  createdAt: string;
}

interface StudentSummary {
  fullName: string;
  email: string;
  totalEarnings: number;
  totalSpent: number;
  currentBalance: number;
}

interface CouponUsageStats {
  totalUsed: number;
  usedInRange: number;
}

interface CouponUsageDetail {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  affiliateCode: string;
  referrerId: string;
  referrerEmail: string;
  referrerName: string;
  discountAmount: number;
  stripeCouponId: string;
  status: string;
  appliedAt: string | null;
  expiresAt: string | null;
}

interface RedemptionEntry {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  rewardId: string;
  rewardName: string;
  costPaid: number;
  status: string;
  redeemedAt: string | null;
}

const MatriculaRewardsAdmin: React.FC = () => {
  const [stats, setStats] = useState<MatriculaRewardsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrers' | 'activity' | 'moderation' | 'payouts' | 'students'>('overview');
  // const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const { user } = useAuth();
  const lastFetchKeyRef = useRef<string | null>(null);

  // Payouts state
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  // Payout filters state
  const [payoutFilters, setPayoutFilters] = useState({
    status: 'all',
    method: 'all',
    dateRange: 'all'
  });
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Students state
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  // Students filters state
  const [studentFilters, setStudentFilters] = useState({
    affiliateCodeStatus: 'all', // 'all', 'has_code', 'no_code'
    balanceRange: 'all', // 'all', 'positive', 'zero', 'high' (>1000)
    referralRange: 'all', // 'all', 'none', 'low' (1-5), 'medium' (6-20), 'high' (>20)
    activityRange: 'all' // 'all', '7d', '30d', '90d', '1y'
  });

  // Students search state
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Students pagination state
  const [currentStudentsPage, setCurrentStudentsPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(15);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const formatActivityDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const formatPaymentDetails = (details: any, method: string) => {
    if (!details) return null;
    
    const formatKey = (key: string) => {
      return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatValue = (key: string, value: any) => {
      // Mask sensitive data
      if (key.includes('account_number') || key.includes('routing_number') || key.includes('iban') || key.includes('swift')) {
        return String(value).replace(/./g, '*');
      }
      return String(value);
    };

    return (
      <div className="text-xs space-y-1 max-w-xs">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex justify-between items-start">
            <span className="font-medium text-slate-600 flex-shrink-0">{formatKey(key)}:</span>
            <span className="text-slate-800 text-right break-all">{formatValue(key, value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const getPayoutStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          bgColor: 'bg-yellow-50'
        };
      case 'approved':
        return {
          icon: CheckCircle2,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          bgColor: 'bg-blue-50'
        };
      case 'paid':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800 border-green-200',
          bgColor: 'bg-green-50'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'bg-red-100 text-red-800 border-red-200',
          bgColor: 'bg-red-50'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          bgColor: 'bg-gray-50'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const getPayoutMethodConfig = (method: string) => {
    switch (method) {
      case 'zelle':
        return {
          icon: CreditCard,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100'
        };
      case 'bank_transfer':
        return {
          icon: Banknote,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
      case 'stripe':
        return {
          icon: CreditCard,
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      default:
        return {
          icon: CreditCard,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        };
    }
  };

  const getRangeStart = (range: string) => {
    const now = new Date();
    if (range === '7d') return new Date(now.getTime() - 7*24*60*60*1000);
    if (range === '30d') return new Date(now.getTime() - 30*24*60*60*1000);
    if (range === '90d') return new Date(now.getTime() - 90*24*60*60*1000);
    if (range === '1y') return new Date(now.getTime() - 365*24*60*60*1000);
    return new Date(now.getTime() - 30*24*60*60*1000);
  };

  // Filter payouts based on current filters and search term
  const filteredPayouts = payouts.filter(request => {
    // Search term filtering
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (request.universities?.name && request.universities.name.toLowerCase().includes(searchLower)) ||
      (request.payout_invoices?.[0]?.invoice_number && request.payout_invoices[0].invoice_number.toLowerCase().includes(searchLower)) ||
      (request.id && request.id.toLowerCase().includes(searchLower)) ||
      (request.payout_method && request.payout_method.toLowerCase().includes(searchLower)) ||
      (request.status && request.status.toLowerCase().includes(searchLower));

    // Status filtering
    const matchesStatus = payoutFilters.status === 'all' || request.status === payoutFilters.status;
    
    // Method filtering
    const matchesMethod = payoutFilters.method === 'all' || request.payout_method === payoutFilters.method;
    
    // Date range filtering
    const matchesDateRange = payoutFilters.dateRange === 'all' || 
      (request.created_at && new Date(request.created_at) >= getRangeStart(payoutFilters.dateRange));

    return matchesSearch && matchesStatus && matchesMethod && matchesDateRange;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayouts = filteredPayouts.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, payoutFilters.status, payoutFilters.method, payoutFilters.dateRange]);

  // Students pagination logic
  const filteredStudents = students.filter(student => {
    const searchLower = studentSearchTerm.toLowerCase();
    const matchesSearch = !studentSearchTerm || 
      (student.full_name && student.full_name.toLowerCase().includes(searchLower)) ||
      (student.user_email && student.user_email.toLowerCase().includes(searchLower)) ||
      (student.affiliate_code && student.affiliate_code.toLowerCase().includes(searchLower));

         // Affiliate Code Status filtering
     const hasAffiliateCode = !!student.affiliate_code;
     const matchesAffiliateCodeStatus = studentFilters.affiliateCodeStatus === 'all' || 
       (studentFilters.affiliateCodeStatus === 'has_code' && hasAffiliateCode) ||
       (studentFilters.affiliateCodeStatus === 'no_code' && !hasAffiliateCode);

    // Balance Range filtering
    const currentBalance = Number(student.current_balance || 0);
    let matchesBalanceRange = true;
    if (studentFilters.balanceRange === 'positive') {
      matchesBalanceRange = currentBalance > 0;
    } else if (studentFilters.balanceRange === 'zero') {
      matchesBalanceRange = currentBalance === 0;
    } else if (studentFilters.balanceRange === 'high') {
      matchesBalanceRange = currentBalance > 1000;
    }

    // Referral Range filtering
    const totalReferrals = Number(student.total_referrals || 0);
    let matchesReferralRange = true;
    if (studentFilters.referralRange === 'none') {
      matchesReferralRange = totalReferrals === 0;
    } else if (studentFilters.referralRange === 'low') {
      matchesReferralRange = totalReferrals >= 1 && totalReferrals <= 5;
    } else if (studentFilters.referralRange === 'medium') {
      matchesReferralRange = totalReferrals >= 6 && totalReferrals <= 20;
    } else if (studentFilters.referralRange === 'high') {
      matchesReferralRange = totalReferrals > 20;
    }

    // Activity Range filtering
    const lastActivityDate = student.last_activity ? new Date(student.last_activity) : null;
    let matchesActivityRange = true;
    if (studentFilters.activityRange === '7d') {
      matchesActivityRange = lastActivityDate ? lastActivityDate >= new Date(Date.now() - 7*24*60*60*1000) : false;
    } else if (studentFilters.activityRange === '30d') {
      matchesActivityRange = lastActivityDate ? lastActivityDate >= new Date(Date.now() - 30*24*60*60*1000) : false;
    } else if (studentFilters.activityRange === '90d') {
      matchesActivityRange = lastActivityDate ? lastActivityDate >= new Date(Date.now() - 90*24*60*60*1000) : false;
    } else if (studentFilters.activityRange === '1y') {
      matchesActivityRange = lastActivityDate ? lastActivityDate >= new Date(Date.now() - 365*24*60*60*1000) : false;
    }

    return matchesSearch && matchesAffiliateCodeStatus && matchesBalanceRange && matchesReferralRange && matchesActivityRange;
  });

  // Students pagination logic
  const totalStudentsPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const studentsStartIndex = (currentStudentsPage - 1) * studentsPerPage;
  const studentsEndIndex = studentsStartIndex + studentsPerPage;
  const paginatedStudents = filteredStudents.slice(studentsStartIndex, studentsEndIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentStudentsPage(1);
  }, [studentSearchTerm, studentFilters.affiliateCodeStatus, studentFilters.balanceRange, studentFilters.referralRange, studentFilters.activityRange]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const key = `${user.id}-${dateRange}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    loadMatriculaRewardsStats();
  }, [user?.id, user?.role, dateRange]);

  useEffect(() => {
    if (activeTab === 'payouts') {
      void loadPayoutRequests();
    }
    if (activeTab === 'students') {
      void loadStudentsData();
    }
  }, [activeTab]);

  const loadPayoutRequests = async () => {
    try {
      setLoadingPayouts(true);
      setError(null);
      // Try to load with invoice embed and payment details
      // Filtrar apenas requests do tipo matricula_rewards
      const { data, error } = await supabase
        .from('university_payout_requests')
        .select('*, universities(name), payout_invoices(invoice_number), payout_details_preview, payout_method')
        .eq('request_type', 'matricula_rewards') // Filtrar apenas matricula_rewards
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayouts(data || []);
    } catch (e: any) {
      console.error('[Admin] Failed to load payout requests:', e);
      setError('Failed to load payout requests');
      setPayouts([]);
    } finally {
      setLoadingPayouts(false);
    }
  };

  const approve = async (id: string) => {
    try { await PayoutService.adminApprove(id, user!.id); await loadPayoutRequests(); } catch(e:any){ setError(e.message); }
  };
  const markPaid = async (id: string, reference?: string) => {
    try { 
      await PayoutService.adminMarkPaid(id, user!.id, reference); 
      await loadPayoutRequests(); 
      setShowMarkPaidModal(false);
      setSelectedPayoutId(null);
      setPaymentReference('');
    } catch(e:any){ 
      setError(e.message); 
    }
  };
  
  const reject = async (id: string, reason: string) => {
    try { 
      await PayoutService.adminReject(id, user!.id, reason); 
      await loadPayoutRequests(); 
      setShowRejectModal(false);
      setSelectedPayoutId(null);
      setRejectReason('');
    } catch(e:any){ 
      setError(e.message); 
    }
  };

  const loadMatriculaRewardsStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Period
      const start = getRangeStart(dateRange).toISOString();

      // 1) Agregados de universidades
      const { data: uniAccounts, error: uniAccErr } = await supabase
        .from('university_rewards_account')
        .select('balance_coins,total_received_coins,total_discounts_sent,total_discount_amount');
      if (uniAccErr) console.warn('[Admin] university_rewards_account error:', uniAccErr);
      const aggBalance = (uniAccounts || []).reduce((sum: number, r: any)=> sum + (Number(r.balance_coins||0)), 0);

      // 2) Tuition redemptions in the period - abordagem alternativa
      const { data: tuitionRedemptionsRaw, error: trErr } = await supabase
        .from('tuition_redemptions')
        .select(`
          id,
          user_id, 
          university_id, 
          cost_coins_paid, 
          discount_amount, 
          redeemed_at,
          status
        `)
        .gte('redeemed_at', start)
        .order('redeemed_at', { ascending: false })
        .limit(10);
      if (trErr) {
        console.warn('[Admin] tuition_redemptions error:', trErr);
      }
      
      // Buscar perfis dos usuários para as redenções encontradas
      const userIds = (tuitionRedemptionsRaw || []).map(r => r.user_id);
      let userProfiles: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: upErr } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        if (upErr) console.warn('[Admin] user_profiles error:', upErr);
        userProfiles = profilesData || [];
      }
      
      console.log('[Admin] User profiles loaded:', userProfiles?.length || 0);
      
      // Combinar os dados
      const tuitionRedemptions = (tuitionRedemptionsRaw || []).map(redemption => {
        const userProfile = (userProfiles || []).find(up => up.user_id === redemption.user_id);
        return {
          ...redemption,
          user_profiles: userProfile
        };
      });

      const redemptionsCountPeriod = (tuitionRedemptions || []).length;
      const totalCoinsToUniversitiesPeriod = (tuitionRedemptions || []).reduce((s: number, r: any)=> s + Number(r.cost_coins_paid||0), 0);
      const totalUsdTuitionPeriod = (tuitionRedemptions || []).reduce((s: number, r: any)=> s + Number(r.discount_amount||0), 0);

      // 3) Payouts in the period
      const { data: payoutsData, error: poErr } = await supabase
        .from('university_payout_requests')
        .select('status, created_at')
        .eq('request_type', 'matricula_rewards') // Filtrar apenas matricula_rewards
        .gte('created_at', start)
        .order('created_at', { ascending: false });
      if (poErr) console.warn('[Admin] payout_requests error:', poErr);
      const payoutCounts = (payoutsData||[]).reduce((acc: any, p: any)=> { acc[p.status] = (acc[p.status]||0)+1; return acc; }, {} as Record<string,number>);

      // 4) Atividade recente combinando tuition redemptions e payouts
      const recentRedemptions: any[] = (tuitionRedemptions||[]).map((r: any) => ({
        id: r.id || `${r.user_id}-${r.redeemed_at}`,
        type: 'redemption',
        userId: r.user_id,
        fullName: r.user_profiles?.full_name || 'Student Name',
        email: r.user_profiles?.email || 'student@email.com',
        description: `Tuition discount: ${Number(r.discount_amount||0).toFixed(0)} USD`,
        amount: Number(r.cost_coins_paid||0),
        createdAt: r.redeemed_at,
        rewardName: 'Tuition Discount',
        costPaid: Number(r.cost_coins_paid||0),
        redeemedAt: r.redeemed_at,
        status: r.status || 'active'
      }));

      const recentPayouts: any[] = (payoutsData||[]).slice(0, 10).map((p: any)=> ({
        id: `${p.status}-${p.created_at}`,
        type: 'payout',
        userId: '',
        fullName: p.status.toUpperCase(),
        description: `Payout ${p.status}`,
        amount: undefined,
        createdAt: p.created_at
      }));

      // 5) Manter chamadas existentes (afiliados) sem quebrar layout
      console.log('🔍 [MatriculaRewardsAdmin] Loading stats for dateRange:', dateRange);
      const { data: generalStats, error: statsError } = await supabase
        .rpc('get_matricula_rewards_admin_stats', { date_range: dateRange });
      if (statsError) console.warn('get_matricula_rewards_admin_stats failed:', statsError);

      const { data: topReferrers, error: referrersError } = await supabase
        .rpc('get_top_referrers', { limit_count: 10 });
      if (referrersError) console.warn('get_top_referrers failed:', referrersError);

      const { data: usersTotals, error: usersTotalsError } = await supabase
        .rpc('export_matricula_rewards_data', { date_range: dateRange });
      if (usersTotalsError) console.warn('export_matricula_rewards_data failed:', usersTotalsError);

      const rows = (usersTotals || []) as any[];
      const mapRow = (r: any) => ({
        fullName: r.full_name,
        email: r.user_email,
        totalEarnings: Number(r.total_earnings || 0),
        totalSpent: Number(r.total_spent || 0),
        currentBalance: Number(r.current_balance || 0)
      });
      const topStudentsByBalance = [...rows].sort((a,b)=> Number(b.current_balance||0) - Number(a.current_balance||0)).slice(0,5).map(mapRow);
      const topStudentsBySpent = [...rows].sort((a,b)=> Number(b.total_spent||0) - Number(a.total_spent||0)).slice(0,5).map(mapRow);

      const finalStats = {
        totalUsers: generalStats?.[0]?.total_users || 0,
        totalReferrals: generalStats?.[0]?.total_referrals || 0,
        // Substituir os cards por dados de tuition/admin mantendo layout
        totalCoinsSpent: totalCoinsToUniversitiesPeriod, // Coins Spent (period)
        totalCoinsEarned: aggBalance, // Coins Earned (saldo agregado universidades)
        conversionRate: generalStats?.[0]?.conversion_rate || 0,
        averageCoinsPerUser: generalStats?.[0]?.average_coins_per_user || 0,
        topReferrers: topReferrers || [],
        recentActivity: [...recentRedemptions, ...recentPayouts].sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,10),
        topStudentsByBalance,
        topStudentsBySpent,
        couponUsage: { totalUsed: 0, usedInRange: 0 },
        couponUsageDetails: [],
        recentRedemptions: recentRedemptions as any
      } as any;

      setStats(finalStats);
    } catch (err) {
      console.error('🔍 [MatriculaRewardsAdmin] Error loading Matricula Rewards stats:', err);
      setError('Failed to load rewards analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('export_matricula_rewards_data', { date_range: dateRange });
      
      if (error) throw error;
      
      // Criar e baixar arquivo CSV
      const csvContent = convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matricula-rewards-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data');
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ];
    return csvRows.join('\n');
  };

  const loadStudentsData = async () => {
    try {
      setLoadingStudents(true);
      setError(null);
      
      const { data, error } = await supabase
        .rpc('export_matricula_rewards_data', { date_range: dateRange });
      
      if (error) throw error;
      
      setStudents(data || []);
    } catch (err: any) {
      console.error('[Admin] Failed to load students data:', err);
      setError('Failed to load students data');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Future: moderation handlers can be re-enabled when UI is added

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading rewards dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <Award className="h-6 w-6 mr-2 text-[#05294E]" />
                Matricula Rewards Admin
              </h1>
              <p className="text-slate-600">Manage the rewards program and affiliate analytics</p>
              {error && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">{error}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                aria-label="Select time range"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Past year</option>
              </select>
              
              <button 
                onClick={loadMatriculaRewardsStats}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button 
                onClick={handleExportData}
                className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#102336] transition-colors flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              <button
                onClick={() => setActiveTab('payouts')}
                className="bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors flex items-center"
                title="View payout history"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Payment History
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <nav className="-mb-px flex space-x-8">
              {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'payouts', label: 'Payout Requests', icon: DollarSign },
              { id: 'students', label: 'Students', icon: GraduationCap },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#05294E] text-[#05294E]'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">System Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Referrals</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalReferrals.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Coins Spent</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalCoinsSpent.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <DollarSign className="h-5 w-5 text-red-600" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Coins Earned</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalCoinsEarned.toLocaleString()}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Award className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Student Metrics */}
            <div className="space-y-6">
                             {/* Discount coupon usage */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-lg font-semibold text-slate-900">Discount Coupons Redeemed</h3>
                     <p className="text-sm text-slate-600 mt-1">Count for selected period and lifetime total</p>
                   </div>
                   <div className="text-right">
                     <p className="text-3xl font-bold text-slate-900">{stats.couponUsage.usedInRange.toLocaleString()}</p>
                     <p className="text-sm text-slate-500">in period • lifetime total {stats.couponUsage.totalUsed.toLocaleString()}</p>
                   </div>
                 </div>
               </div>

               {/* Coupon Usage Details */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                 <div className="p-6 border-b border-slate-200">
                   <h3 className="text-lg font-semibold text-slate-900">Coupon Usage Details</h3>
                   <p className="text-sm text-slate-600">Users who used discount coupons and paid less on first fee</p>
                 </div>
                 <div className="overflow-x-auto rounded-b-xl">
                   <table className="w-full">
                     <thead className="bg-slate-50">
                       <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Referrer</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Coupon Code</th>
                         <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Discount</th>
                         <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Applied At</th>
                         <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-slate-200">
                       {stats.couponUsageDetails?.map((c, idx) => (
                         <tr key={`${c.id || c.userId || 'coupon'}-${idx}`}>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div>
                               <div className="text-sm font-medium text-slate-900">{c.fullName}</div>
                               <div className="text-sm text-slate-500">{c.userEmail}</div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div>
                               <div className="text-sm font-medium text-slate-900">{c.referrerName}</div>
                               <div className="text-sm text-slate-500">{c.referrerEmail}</div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{c.affiliateCode}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">${c.discountAmount.toLocaleString()}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">{formatActivityDate(c.appliedAt)}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                             <span className={`px-2 py-1 rounded-full font-medium ${
                               c.status === 'applied' ? 'bg-green-100 text-green-800' :
                               c.status === 'expired' ? 'bg-red-100 text-red-800' :
                               c.status === 'cancelled' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'
                             }`}>{c.status}</span>
                           </td>
                         </tr>
                       ))}
                       {(!stats.couponUsageDetails || stats.couponUsageDetails.length === 0) && (
                         <tr>
                           <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">No coupon usage in selected period</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Top Students by Balance</h3>
                  </div>
                  <div className="overflow-x-auto rounded-b-xl">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                  {stats.topStudentsByBalance.map((s, idx) => (
                          <tr key={`${s.email || s.fullName || 'student'}-balance-${idx}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-slate-900">{s.fullName}</div>
                                <div className="text-sm text-slate-500">{s.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">{s.currentBalance.toLocaleString()} coins</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Top Spenders (coins)</h3>
                  </div>
                  <div className="overflow-x-auto rounded-b-xl">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Spent</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                  {stats.topStudentsBySpent.map((s, idx) => (
                          <tr key={`${s.email || s.fullName || 'student'}-spent-${idx}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-slate-900">{s.fullName}</div>
                                <div className="text-sm text-slate-500">{s.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">{s.totalSpent.toLocaleString()} coins</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Reward Redemptions */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Recent Reward Redemptions</h3>
                    <p className="text-sm text-slate-600">What was redeemed, by whom, and the coin amount</p>
                  </div>
                  <div className="overflow-x-auto rounded-b-xl">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reward</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Cost</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Redeemed At</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {stats.recentRedemptions?.map((r, idx) => (
                          <tr key={`${r.id || r.userId || 'redemption'}-${idx}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                {/* Avatar do estudante */}
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-slate-600" />
                                  </div>
                                </div>
                                {/* Informações do estudante */}
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {r.fullName || 'Student Name'}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {r.email || 'student@email.com'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              {r.rewardName || 'Tuition Discount'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                              {Number(r.costPaid || 0).toLocaleString()} coins
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                              {formatActivityDate(r.redeemedAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                              <span className={`px-2 py-1 rounded-full font-medium ${
                                r.status === 'active' ? 'bg-green-100 text-green-800' :
                                r.status === 'used' ? 'bg-blue-100 text-blue-800' :
                                r.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {r.status || 'active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!stats.recentRedemptions || stats.recentRedemptions.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                  <Award className="h-6 w-6 text-slate-400" />
                                </div>
                                <h3 className="text-sm font-medium text-slate-900 mb-1">No recent redemptions</h3>
                                <p className="text-sm text-slate-500">
                                  No reward redemptions found for the selected period
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          </div>
        )}


        
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Payout Requests</h3>
                <p className="text-slate-600 mt-2">
                                      Approve, mark as paid or reject payment requests from universities
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <div className="text-sm text-blue-600 font-medium">
                    Total: {payouts.length} requests
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center space-x-3">
                  <div className="flex-1 max-w-md">
                    <label htmlFor="search" className="sr-only">Search payout requests</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        id="search"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by university name, invoice number, ID, method, or status..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          <svg className="h-4 w-4 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">{filteredPayouts.length}</span> of <span className="font-medium">{payouts.length}</span> requests
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700">Status:</label>
                    <select
                      value={payoutFilters.status}
                      onChange={(e) => setPayoutFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700">Method:</label>
                    <select
                      value={payoutFilters.method}
                      onChange={(e) => setPayoutFilters(prev => ({ ...prev, method: e.target.value }))}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    >
                      <option value="all">All Methods</option>
                      <option value="zelle">Zelle</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="stripe">Stripe</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700">Period:</label>
                    <select
                      value={payoutFilters.dateRange}
                      onChange={(e) => setPayoutFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    >
                      <option value="all">All Time</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="1y">Past year</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setPayoutFilters({ status: 'all', method: 'all', dateRange: 'all' });
                      setSearchTerm('');
                    }}
                    className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['pending', 'approved', 'paid', 'rejected'].map((status) => {
                const count = filteredPayouts.filter((r: any) => r.status === status).length;
                const config = getPayoutStatusConfig(status);
                const Icon = config.icon;
                
                return (
                  <div key={status} className={`bg-white border border-slate-200 rounded-xl p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                                                 <p className="text-sm font-medium text-slate-600 capitalize">
                           {status === 'pending' ? 'Pending' :
                            status === 'approved' ? 'Approved' :
                            status === 'paid' ? 'Paid' : 'Rejected'}
                         </p>
                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Requests Grid */}
            {loadingPayouts ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading payout requests...</p>
                </div>
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {payouts.length === 0 ? 'No requests found' : 'No requests match your search and filters'}
                </h3>
                <p className="text-slate-600">
                  {payouts.length === 0 ? 'University payout requests will appear here' : 'Try adjusting your search terms or filters to see more results'}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          University
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {paginatedPayouts.map((request: any) => {
                        const statusConfig = getPayoutStatusConfig(request.status);
                        const methodConfig = getPayoutMethodConfig(request.payout_method);
                        const StatusIcon = statusConfig.icon;
                        const MethodIcon = methodConfig.icon;
                        
                        return (
                          <tr key={request.id} className="hover:bg-slate-50 transition-colors duration-150">
                            {/* University */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-slate-900">
                                    {request.universities?.name || 'University not found'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Invoice */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900 font-mono">
                                {request.payout_invoices?.[0]?.invoice_number || request.id.slice(0, 8)}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">
                                <div className="font-semibold">{request.amount_coins} coins</div>
                                <div className="text-slate-500">${Number(request.amount_usd).toFixed(2)}</div>
                              </div>
                            </td>

                            {/* Method */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`p-1.5 rounded-lg ${methodConfig.bgColor}`}>
                                  <MethodIcon className={`h-4 w-4 ${methodConfig.color}`} />
                                </div>
                                <span className="ml-2 text-sm text-slate-900 capitalize">
                                  {String(request.payout_method).replace('_', ' ')}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`p-1.5 rounded-lg ${statusConfig.color}`}>
                                  <StatusIcon className="h-4 w-4" />
                                </div>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                  {request.status === 'pending' ? 'Pending' :
                                   request.status === 'approved' ? 'Approved' :
                                   request.status === 'paid' ? 'Paid' :
                                   request.status === 'rejected' ? 'Rejected' : 'Cancelled'}
                                </span>
                              </div>
                            </td>

                            {/* Date */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {formatActivityDate(request.created_at)}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {request.status === 'pending' && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => approve(request.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-3 rounded-md transition-colors duration-200 flex items-center space-x-1"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedPayoutId(request.id);
                                      setRejectReason('');
                                      setShowRejectModal(true);
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1.5 px-3 rounded-md transition-colors duration-200 flex items-center space-x-1"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Reject</span>
                                  </button>
                                </div>
                              )}

                              {request.status === 'approved' && (
                                <button
                                  onClick={() => {
                                    setSelectedPayoutId(request.id);
                                    setPaymentReference('');
                                    setShowMarkPaidModal(true);
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded-md transition-colors duration-200 flex items-center space-x-1"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Mark as Paid</span>
                                </button>
                              )}

                              {(request.status === 'paid' || request.status === 'rejected' || request.status === 'cancelled') && (
                                <span className="text-slate-400 text-xs">No actions available</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

              {/* Pagination Controls */}
              {filteredPayouts.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4 mt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                    {/* Items per page selector */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-slate-700">Show:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                      <span className="text-sm text-slate-600">per page</span>
                    </div>

                    {/* Page info */}
                    <div className="text-sm text-slate-600">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredPayouts.length)}</span> of{' '}
                      <span className="font-medium">{filteredPayouts.length}</span> results
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center space-x-2">
                      {/* Previous button */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      {/* Page numbers */}
                      <div className="flex items-center space-x-1">
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
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-[#05294E] text-white'
                                  : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next button */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Students</h3>
                <p className="text-slate-600 mt-2">
                  View and manage students participating in the Matricula Rewards program.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <div className="text-sm text-blue-600 font-medium">
                    Total: {students.length} students
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center space-x-3">
                  <div className="flex-1 max-w-md">
                    <label htmlFor="studentSearch" className="sr-only">Search students</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        id="studentSearch"
                        type="text"
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        placeholder="Search by name, email, or affiliate code..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                      />
                      {studentSearchTerm && (
                        <button
                          onClick={() => setStudentSearchTerm('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          <svg className="h-4 w-4 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">{filteredStudents.length}</span> of <span className="font-medium">{students.length}</span> students
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700">Affiliate Code:</label>
                    <select
                      value={studentFilters.affiliateCodeStatus}
                      onChange={(e) => setStudentFilters(prev => ({ ...prev, affiliateCodeStatus: e.target.value }))}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="has_code">Has Code</option>
                      <option value="no_code">No Code</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700">Balance:</label>
                    <select
                      value={studentFilters.balanceRange}
                      onChange={(e) => setStudentFilters(prev => ({ ...prev, balanceRange: e.target.value }))}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="positive">Positive</option>
                      <option value="zero">Zero</option>
                                             <option value="high">High (&gt;1000)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700">Referrals:</label>
                    <select
                      value={studentFilters.referralRange}
                      onChange={(e) => setStudentFilters(prev => ({ ...prev, referralRange: e.target.value }))}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="none">None</option>
                      <option value="low">1-5</option>
                      <option value="medium">6-20</option>
                                             <option value="high">&gt;20</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700">Activity:</label>
                    <select
                      value={studentFilters.activityRange}
                      onChange={(e) => setStudentFilters(prev => ({ ...prev, activityRange: e.target.value }))}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    >
                      <option value="all">All Time</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="1y">Past year</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setStudentFilters({ affiliateCodeStatus: 'all', balanceRange: 'all', referralRange: 'all', activityRange: 'all' });
                      setStudentSearchTerm('');
                    }}
                    className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Students List */}
            {loadingStudents ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading students data...</p>
                </div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {students.length === 0 ? 'No students found' : 'No students match your search and filters'}
                </h3>
                <p className="text-slate-600">
                  {students.length === 0 
                    ? 'No students are currently participating in the Matricula Rewards program'
                    : 'Try adjusting your search terms or filters to see more results'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Affiliate Code
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Referrals
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Total Earned
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Total Spent
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Current Balance
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Last Activity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedStudents.map((student, idx) => (
                          <tr key={`${student.user_email || student.full_name || 'student'}-${idx}`} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-slate-600" />
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {student.full_name || 'Student Name'}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {student.user_email || 'student@email.com'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">
                                {student.affiliate_code ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {student.affiliate_code}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">No code</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                              {Number(student.total_referrals || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                              <div className="flex items-center justify-end space-x-1">
                                <Award className="h-4 w-4 text-yellow-500" />
                                <span>{Number(student.total_earnings || 0).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                              <div className="flex items-center justify-end space-x-1">
                                <DollarSign className="h-4 w-4 text-red-500" />
                                <span>{Number(student.total_spent || 0).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                              <div className="flex items-center justify-end space-x-1">
                                <div className={`w-3 h-3 rounded-full ${
                                  Number(student.current_balance || 0) > 0 ? 'bg-green-500' : 'bg-slate-300'
                                }`}></div>
                                <span className={`font-medium ${
                                  Number(student.current_balance || 0) > 0 ? 'text-green-700' : 'text-slate-500'
                                }`}>
                                  {Number(student.current_balance || 0).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500">
                              {formatActivityDate(student.last_activity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Students Pagination Controls */}
                {filteredStudents.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                      {/* Items per page selector */}
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-slate-700">Show:</label>
                        <select
                          value={studentsPerPage}
                          onChange={(e) => {
                            setStudentsPerPage(Number(e.target.value));
                            setCurrentStudentsPage(1);
                          }}
                          className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                        >
                          <option value={15}>15</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-slate-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-slate-600">
                        Showing <span className="font-medium">{studentsStartIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(studentsEndIndex, filteredStudents.length)}</span> of{' '}
                        <span className="font-medium">{filteredStudents.length}</span> students
                      </div>

                      {/* Pagination buttons */}
                      <div className="flex items-center space-x-2">
                        {/* Previous button */}
                        <button
                          onClick={() => setCurrentStudentsPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentStudentsPage === 1}
                          className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalStudentsPages) }, (_, i) => {
                            let pageNum;
                            if (totalStudentsPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentStudentsPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentStudentsPage >= totalStudentsPages - 2) {
                              pageNum = totalStudentsPages - 4 + i;
                            } else {
                              pageNum = currentStudentsPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentStudentsPage(pageNum)}
                                className={`px-3 py-2 text-sm font-medium rounded-md ${
                                  currentStudentsPage === pageNum
                                    ? 'bg-[#05294E] text-white'
                                    : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        {/* Next button */}
                        <button
                          onClick={() => setCurrentStudentsPage(prev => Math.min(prev + 1, totalStudentsPages))}
                          disabled={currentStudentsPage === totalStudentsPages}
                          className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Reject Payout Request</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedPayoutId(null);
                  setRejectReason('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="rejectReason" className="block text-sm font-medium text-slate-700 mb-2">
                Reason for rejection
              </label>
              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejecting this payout request..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedPayoutId(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedPayoutId && reject(selectedPayoutId, rejectReason || 'No reason provided')}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Mark Payout as Paid</h3>
              <button
                onClick={() => {
                  setShowMarkPaidModal(false);
                  setSelectedPayoutId(null);
                  setPaymentReference('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="paymentReference" className="block text-sm font-medium text-slate-700 mb-2">
                Payment Reference (Optional)
              </label>
              <input
                type="text"
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Enter payment reference, transaction ID, or any notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowMarkPaidModal(false);
                  setSelectedPayoutId(null);
                  setPaymentReference('');
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedPayoutId && markPaid(selectedPayoutId, paymentReference || undefined)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatriculaRewardsAdmin; 