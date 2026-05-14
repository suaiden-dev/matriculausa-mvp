import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  DollarSign,
  TrendingUp,
  Mail,
  Calendar,
  Coins,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useEnvironment } from '../../hooks/useEnvironment';

interface ReferralAffiliate {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  total_referrals: number;
  created_at: string;
  full_name: string;
  email: string;
  coin_balance: number;
  pending_payment_requests: number;
  pending_amount: number;
}

const ReferralAffiliatesManagement: React.FC = () => {
  const { isDevelopment } = useEnvironment();
  const navigate = useNavigate();
  const [affiliates, setAffiliates] = useState<ReferralAffiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [codesRes, usersRes, profilesRes, coinsRes, referralsRes, paymentReqRes] = await Promise.all([
        supabase
          .from('affiliate_codes')
          .select('id, user_id, code, is_active, created_at')
          .order('created_at', { ascending: false }),
        supabase.rpc('get_admin_users_data'),
        supabase.from('user_profiles').select('user_id, full_name, role'),
        supabase.from('matriculacoin_credits').select('user_id, balance'),
        supabase.from('affiliate_referrals').select('affiliate_code'),
        supabase.from('affiliate_payment_requests').select('referrer_user_id, amount_usd, status').in('status', ['pending', 'approved'])
      ]);

      if (codesRes.error) throw codesRes.error;

      const codesData = codesRes.data || [];

      const emailMap: Record<string, string> = {};
      (usersRes.data || []).forEach((u: any) => { emailMap[u.id] = u.email || ''; });

      const nameMap: Record<string, string> = {};
      const roleMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => {
        nameMap[p.user_id] = p.full_name || '';
        roleMap[p.user_id] = p.role || '';
      });

      const coinsMap: Record<string, number> = {};
      (coinsRes.data || []).forEach((c: any) => {
        coinsMap[c.user_id] = Number(c.balance) || 0;
      });

      const referralCountByCode: Record<string, number> = {};
      (referralsRes.data || []).forEach((r: any) => {
        referralCountByCode[r.affiliate_code] = (referralCountByCode[r.affiliate_code] || 0) + 1;
      });

      const paymentByUser: Record<string, { count: number; amount: number }> = {};
      (paymentReqRes.data || []).forEach((p: any) => {
        if (!paymentByUser[p.referrer_user_id]) {
          paymentByUser[p.referrer_user_id] = { count: 0, amount: 0 };
        }
        paymentByUser[p.referrer_user_id].count++;
        paymentByUser[p.referrer_user_id].amount += Number(p.amount_usd) || 0;
      });

      const mapped: ReferralAffiliate[] = codesData
        .filter((c: any) => roleMap[c.user_id] === 'affiliate')
        .map((c: any) => {
          const payStats = paymentByUser[c.user_id] || { count: 0, amount: 0 };
          return {
            id: c.id,
            user_id: c.user_id,
            code: c.code,
            is_active: c.is_active,
            total_referrals: referralCountByCode[c.code] || 0,
            created_at: c.created_at,
            full_name: nameMap[c.user_id] || emailMap[c.user_id] || 'Unknown',
            email: emailMap[c.user_id] || '',
            coin_balance: coinsMap[c.user_id] || 0,
            pending_payment_requests: payStats.count,
            pending_amount: payStats.amount,
          };
        });

      const isUorak = (a: ReferralAffiliate) =>
        a.email.toLowerCase().includes('@uorak.com') ||
        a.full_name.toLowerCase().includes('@uorak.com');

      const result = isDevelopment ? mapped : mapped.filter(a => !isUorak(a));
      setAffiliates(result);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = useMemo(() => {
    return affiliates.filter(a => {
      if (statusFilter === 'active' && !a.is_active) return false;
      if (statusFilter === 'inactive' && a.is_active) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.full_name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [affiliates, search, statusFilter]);

  const stats = useMemo(() => ({
    total: affiliates.length,
    active: affiliates.filter(a => a.is_active).length,
    totalReferrals: affiliates.reduce((s, a) => s + a.total_referrals, 0),
    pendingRequests: affiliates.reduce((s, a) => s + a.pending_payment_requests, 0),
    pendingAmount: affiliates.reduce((s, a) => s + a.pending_amount, 0),
  }), [affiliates]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="h-7 bg-slate-200 rounded w-64 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
              <div className="h-7 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
        <div>
          <p className="font-medium text-red-800">Erro ao carregar dados</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button onClick={loadData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Affiliate Program</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Professional affiliates — click an affiliate to view full details
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Affiliates</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-400">{stats.total - stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Students</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Pending Payouts</p>
          <p className="text-2xl font-bold text-orange-600">${stats.pendingAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{stats.pendingRequests} requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or code..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          {filtered.length} of {affiliates.length} affiliates
        </p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No affiliates found</p>
          </div>
        ) : (
          filtered.map(affiliate => (
            <div
              key={affiliate.id}
              onClick={() => navigate(`/admin/dashboard/referral-affiliates/${affiliate.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {affiliate.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{affiliate.full_name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      affiliate.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {affiliate.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {affiliate.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {affiliate.pending_payment_requests > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        <DollarSign className="h-3 w-3" />
                        {affiliate.pending_payment_requests} pending payout
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {affiliate.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(affiliate.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Code badge */}
                <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <code className="text-sm font-mono font-bold text-slate-700">{affiliate.code}</code>
                  <button
                    onClick={e => handleCopyCode(e, affiliate.code)}
                    className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Copy code"
                  >
                    {copiedCode === affiliate.code
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      : <Copy className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>

                {/* Quick stats */}
                <div className="hidden lg:grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{affiliate.total_referrals}</p>
                    <p className="text-xs text-slate-500">Students</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-600">{affiliate.coin_balance.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Coins</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-600">
                      {affiliate.pending_payment_requests > 0 ? `$${affiliate.pending_amount.toLocaleString()}` : '–'}
                    </p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </div>

              {/* Mobile stats */}
              <div className="lg:hidden flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                  <span><b>{affiliate.total_referrals}</b> students</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  <span><b>{affiliate.coin_balance}</b> coins</span>
                </div>
                {affiliate.pending_payment_requests > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span><b>${affiliate.pending_amount}</b> pending</span>
                  </div>
                )}
                <div className="sm:hidden flex items-center gap-1 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                  {affiliate.code}
                  <button onClick={e => handleCopyCode(e, affiliate.code)}>
                    {copiedCode === affiliate.code
                      ? <CheckCircle2 className="h-3 w-3 text-green-500 ml-1" />
                      : <Copy className="h-3 w-3 text-slate-400 ml-1" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReferralAffiliatesManagement;
