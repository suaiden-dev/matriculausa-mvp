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
  CheckCircle
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
  const [activeTab, setActiveTab] = useState<'overview' | 'referrers' | 'activity' | 'moderation' | 'payouts'>('overview');
  // const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const { user } = useAuth();
  const lastFetchKeyRef = useRef<string | null>(null);

  // Payouts state
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState<boolean>(false);

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

  const getRangeStart = (range: string) => {
    const now = new Date();
    if (range === '7d') return new Date(now.getTime() - 7*24*60*60*1000);
    if (range === '30d') return new Date(now.getTime() - 30*24*60*60*1000);
    if (range === '90d') return new Date(now.getTime() - 90*24*60*60*1000);
    if (range === '1y') return new Date(now.getTime() - 365*24*60*60*1000);
    return new Date(now.getTime() - 30*24*60*60*1000);
  };

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
  }, [activeTab]);

  const loadPayoutRequests = async () => {
    try {
      setLoadingPayouts(true);
      setError(null);
      // Tenta carregar com embed de invoice
      const { data, error } = await supabase
        .from('university_payout_requests')
        .select('*, universities(name), payout_invoices(invoice_number)')
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
  const markPaid = async (id: string) => {
    const ref = prompt('Payment reference (optional)') || undefined;
    try { await PayoutService.adminMarkPaid(id, user!.id, ref); await loadPayoutRequests(); } catch(e:any){ setError(e.message); }
  };
  const reject = async (id: string) => {
    const reason = prompt('Reason to reject') || 'No reason';
    try { await PayoutService.adminReject(id, user!.id, reason); await loadPayoutRequests(); } catch(e:any){ setError(e.message); }
  };

  const loadMatriculaRewardsStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Período
      const start = getRangeStart(dateRange).toISOString();

      // 1) Agregados de universidades
      const { data: uniAccounts, error: uniAccErr } = await supabase
        .from('university_rewards_account')
        .select('balance_coins,total_received_coins,total_discounts_sent,total_discount_amount');
      if (uniAccErr) console.warn('[Admin] university_rewards_account error:', uniAccErr);
      const aggBalance = (uniAccounts || []).reduce((sum: number, r: any)=> sum + (Number(r.balance_coins||0)), 0);

      // 2) Tuition redemptions no período
      const { data: tuitionRedemptions, error: trErr } = await supabase
        .from('tuition_redemptions')
        .select('user_id, university_id, cost_coins_paid, discount_amount, redeemed_at')
        .gte('redeemed_at', start)
        .order('redeemed_at', { ascending: false });
      if (trErr) console.warn('[Admin] tuition_redemptions error:', trErr);

      const redemptionsCountPeriod = (tuitionRedemptions || []).length;
      const totalCoinsToUniversitiesPeriod = (tuitionRedemptions || []).reduce((s: number, r: any)=> s + Number(r.cost_coins_paid||0), 0);
      const totalUsdTuitionPeriod = (tuitionRedemptions || []).reduce((s: number, r: any)=> s + Number(r.discount_amount||0), 0);

      // 3) Payouts no período
      const { data: payoutsData, error: poErr } = await supabase
        .from('university_payout_requests')
        .select('status, created_at')
        .gte('created_at', start)
        .order('created_at', { ascending: false });
      if (poErr) console.warn('[Admin] payout_requests error:', poErr);
      const payoutCounts = (payoutsData||[]).reduce((acc: any, p: any)=> { acc[p.status] = (acc[p.status]||0)+1; return acc; }, {} as Record<string,number>);

      // 4) Atividade recente combinando tuition redemptions e payouts
      const recentRedemptions: any[] = (tuitionRedemptions||[]).slice(0, 10).map((r: any) => ({
        id: r.id || `${r.user_id}-${r.redeemed_at}`,
        type: 'redemption',
        userId: r.user_id,
        fullName: r.user_id,
        description: `Tuition discount: ${Number(r.discount_amount||0).toFixed(0)} USD`,
        amount: Number(r.cost_coins_paid||0),
        createdAt: r.redeemed_at
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
        totalCoinsSpent: totalCoinsToUniversitiesPeriod, // Coins Spent (período)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
                <Award className="h-6 w-6 mr-2 text-purple-600" />
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
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
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
              { id: 'referrers', label: 'Top Referrers', icon: Crown },
              { id: 'activity', label: 'Recent Activity', icon: Activity },
              { id: 'payouts', label: 'Payout Requests', icon: DollarSign },
              { id: 'moderation', label: 'Moderation', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Referrals</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalReferrals.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Coins Spent</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalCoinsSpent.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Coins Earned</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.totalCoinsEarned.toLocaleString()}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Award className="h-6 w-6 text-yellow-600" />
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
                 <div className="overflow-x-auto">
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
                  <div className="overflow-x-auto">
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
                  <div className="overflow-x-auto">
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
                
                {/* Recent Reward Redemptions */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Recent Reward Redemptions</h3>
                    <p className="text-sm text-slate-600">What was redeemed, by whom, and the coin amount</p>
                  </div>
                  <div className="overflow-x-auto">
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
                              <div>
                                <div className="text-sm font-medium text-slate-900">{r.fullName}</div>
                                <div className="text-sm text-slate-500">{r.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{r.rewardName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">{Number(r.costPaid || 0).toLocaleString()} coins</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">{formatActivityDate(r.redeemedAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                              <span className={`px-2 py-1 rounded-full font-medium ${
                                r.status === 'active' ? 'bg-green-100 text-green-800' :
                                r.status === 'used' ? 'bg-blue-100 text-blue-800' :
                                r.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                              }`}>{r.status}</span>
                            </td>
                          </tr>
                        ))}
                        {(!stats.recentRedemptions || stats.recentRedemptions.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">No recent redemptions</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referrers' && stats && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Top Referrers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Referrals</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Earnings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conversion Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {stats.topReferrers.map((referrer, idx) => (
                    <tr key={`${referrer.userId || referrer.email || 'ref'}-${idx}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{referrer.fullName}</div>
                          <div className="text-sm text-slate-500">{referrer.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {referrer.totalReferrals}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {Number(referrer.totalEarnings ?? 0).toLocaleString()} coins
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {Number(referrer.conversionRate ?? 0).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className="text-purple-600 hover:text-purple-900"
                          aria-label="View referrer details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activity' && stats && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {stats.recentActivity.map((activity, idx) => {
                const title =
                  activity.type === 'referral'
                    ? 'Referral credit'
                    : activity.type === 'redemption'
                    ? 'Reward redemption'
                    : activity.type === 'share'
                    ? 'Referral link shared'
                    : 'Referral link click';
                return (
                  <div key={`${activity.id || activity.createdAt}-${idx}`} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          activity.type === 'referral' ? 'bg-green-100' :
                          activity.type === 'redemption' ? 'bg-purple-100' :
                          activity.type === 'share' ? 'bg-blue-100' : 'bg-yellow-100'
                        }`}>
                          {activity.type === 'referral' && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {activity.type === 'redemption' && <Award className="h-4 w-4 text-purple-600" />}
                          {activity.type === 'share' && <Activity className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'click' && <Eye className="h-4 w-4 text-yellow-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{title}</p>
                          <p className="text-xs text-slate-500">{activity.fullName}</p>
                          {activity.description && (
                            <p className="text-sm text-slate-500">{activity.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {typeof activity.amount === 'number' && (
                          <p className="text-sm font-medium text-slate-900">{activity.amount} coins</p>
                        )}
                        <p className="text-sm text-slate-500">{formatActivityDate(activity.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Payout Requests</h3>
                <p className="text-sm text-slate-600">Approve, mark as paid or reject withdrawals requested by universities</p>
              </div>
            </div>
            <div className="p-6 overflow-x-auto">
              {loadingPayouts ? (
                <div className="text-slate-600">Loading...</div>
              ) : payouts.length ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-slate-600 text-left">
                      <th className="py-2 pr-4">Invoice</th>
                      <th className="py-2 pr-4">University</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Method</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((r: any) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-2 pr-4">{r.payout_invoices?.[0]?.invoice_number || r.id.slice(0,8)}</td>
                        <td className="py-2 pr-4">{r.universities?.name || '-'}</td>
                        <td className="py-2 pr-4">{r.amount_coins} coins (${Number(r.amount_usd).toFixed(2)})</td>
                        <td className="py-2 pr-4 capitalize">{String(r.payout_method).replace('_',' ')}</td>
                        <td className="py-2 pr-4 capitalize">{r.status}</td>
                        <td className="py-2 pr-4">{formatActivityDate(r.created_at)}</td>
                        <td className="py-2 pl-4 text-right space-x-2">
                          {r.status === 'pending' && (
                            <>
                              <button onClick={()=>approve(r.id)} className="px-3 py-1 rounded-lg bg-blue-600 text-white">Approve</button>
                              <button onClick={()=>reject(r.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white">Reject</button>
                            </>
                          )}
                          {r.status === 'approved' && (
                            <button onClick={()=>markPaid(r.id)} className="px-3 py-1 rounded-lg bg-green-600 text-white">Mark Paid</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-slate-500">No payout requests.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <MatriculaRewardsModeration />
        )}
      </div>
    </div>
  );
};

export default MatriculaRewardsAdmin; 