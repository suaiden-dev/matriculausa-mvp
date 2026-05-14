import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  DollarSign,
  TrendingUp,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  Coins,
  Clock,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useEnvironment } from '../../hooks/useEnvironment';

interface ReferralAffiliate {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  total_referrals: number;
  total_earnings: number;
  created_at: string;
  full_name: string;
  email: string;
  coin_balance: number;
  coin_total_earned: number;
  completed_referrals: number;
  pending_referrals: number;
  pending_payment_requests: number;
  pending_amount: number;
}

interface PaymentRequest {
  id: string;
  amount_usd: number;
  status: string;
  payout_method: string;
  created_at: string;
  payout_details: any;
  admin_notes?: string;
}

const ReferralAffiliatesManagement: React.FC = () => {
  const { isDevelopment } = useEnvironment();
  const [affiliates, setAffiliates] = useState<ReferralAffiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<Record<string, PaymentRequest[]>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
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

      // Buscar tudo em paralelo
      const [codesRes, usersRes, profilesRes, coinsRes, referralsRes, paymentReqRes] = await Promise.all([
        supabase
          .from('affiliate_codes')
          .select('id, user_id, code, is_active, total_referrals, total_earnings, created_at')
          .order('created_at', { ascending: false }),
        supabase.rpc('get_admin_users_data'),
        supabase.from('user_profiles').select('user_id, full_name'),
        supabase.from('matriculacoin_credits').select('user_id, balance, total_earned'),
        supabase.from('affiliate_referrals').select('affiliate_code, status'),
        supabase.from('affiliate_payment_requests').select('referrer_user_id, amount_usd, status').in('status', ['pending', 'approved'])
      ]);

      if (codesRes.error) throw codesRes.error;

      const codesData = codesRes.data || [];

      // Email map
      const emailMap: Record<string, string> = {};
      (usersRes.data || []).forEach((u: any) => { emailMap[u.id] = u.email || ''; });

      // Profile name map
      const nameMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name || ''; });

      // Coins map
      const coinsMap: Record<string, { balance: number; total_earned: number }> = {};
      (coinsRes.data || []).forEach((c: any) => {
        coinsMap[c.user_id] = { balance: Number(c.balance) || 0, total_earned: Number(c.total_earned) || 0 };
      });

      // Referrals by code
      const referralsByCode: Record<string, { completed: number; pending: number }> = {};
      (referralsRes.data || []).forEach((r: any) => {
        if (!referralsByCode[r.affiliate_code]) {
          referralsByCode[r.affiliate_code] = { completed: 0, pending: 0 };
        }
        if (r.status === 'completed') referralsByCode[r.affiliate_code].completed++;
        else if (r.status === 'pending') referralsByCode[r.affiliate_code].pending++;
      });

      // Payment requests by user
      const paymentByUser: Record<string, { count: number; amount: number }> = {};
      (paymentReqRes.data || []).forEach((p: any) => {
        if (!paymentByUser[p.referrer_user_id]) {
          paymentByUser[p.referrer_user_id] = { count: 0, amount: 0 };
        }
        paymentByUser[p.referrer_user_id].count++;
        paymentByUser[p.referrer_user_id].amount += Number(p.amount_usd) || 0;
      });

      const mapped: ReferralAffiliate[] = codesData.map((c: any) => {
        const refStats = referralsByCode[c.code] || { completed: 0, pending: 0 };
        const payStats = paymentByUser[c.user_id] || { count: 0, amount: 0 };
        const coins = coinsMap[c.user_id] || { balance: 0, total_earned: 0 };

        return {
          id: c.id,
          user_id: c.user_id,
          code: c.code,
          is_active: c.is_active,
          total_referrals: c.total_referrals || 0,
          total_earnings: Number(c.total_earnings) || 0,
          created_at: c.created_at,
          full_name: nameMap[c.user_id] || emailMap[c.user_id] || 'Unknown',
          email: emailMap[c.user_id] || '',
          coin_balance: coins.balance,
          coin_total_earned: coins.total_earned,
          completed_referrals: refStats.completed,
          pending_referrals: refStats.pending,
          pending_payment_requests: payStats.count,
          pending_amount: payStats.amount
        };
      });

      // Filtrar emails de teste em produção
      const filtered = isDevelopment
        ? mapped
        : mapped.filter(a => !a.email.toLowerCase().includes('@uorak.com'));

      setAffiliates(filtered);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentRequests = async (userId: string) => {
    if (paymentRequests[userId]) return;
    const { data } = await supabase
      .from('affiliate_payment_requests')
      .select('id, amount_usd, status, payout_method, created_at, payout_details, admin_notes')
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false });

    setPaymentRequests(prev => ({ ...prev, [userId]: data || [] }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (affiliate: ReferralAffiliate) => {
    setTogglingId(affiliate.id);
    try {
      const { error } = await supabase
        .from('affiliate_codes')
        .update({ is_active: !affiliate.is_active, updated_at: new Date().toISOString() })
        .eq('id', affiliate.id);

      if (error) throw error;

      setAffiliates(prev =>
        prev.map(a => a.id === affiliate.id ? { ...a, is_active: !a.is_active } : a)
      );
      showToast(`Código ${affiliate.code} ${!affiliate.is_active ? 'ativado' : 'desativado'} com sucesso`);
    } catch (e: any) {
      showToast(e.message || 'Erro ao atualizar status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdatePaymentStatus = async (
    requestId: string,
    newStatus: 'approved' | 'paid' | 'rejected',
    userId: string
  ) => {
    setUpdatingPayment(requestId);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'approved') updateData.approved_at = new Date().toISOString();
      if (newStatus === 'paid') updateData.paid_at = new Date().toISOString();

      const { error } = await supabase
        .from('affiliate_payment_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Atualizar lista local
      setPaymentRequests(prev => ({
        ...prev,
        [userId]: (prev[userId] || []).map(r =>
          r.id === requestId ? { ...r, status: newStatus } : r
        )
      }));

      // Atualizar stats do afiliado
      await loadData();
      showToast(`Solicitação ${newStatus === 'approved' ? 'aprovada' : newStatus === 'paid' ? 'marcada como paga' : 'rejeitada'}`);
    } catch (e: any) {
      showToast(e.message || 'Erro ao atualizar solicitação', 'error');
    } finally {
      setUpdatingPayment(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleExpand = async (affiliate: ReferralAffiliate) => {
    if (expandedId === affiliate.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(affiliate.id);
    await loadPaymentRequests(affiliate.user_id);
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
    totalConversions: affiliates.reduce((s, a) => s + a.completed_referrals, 0),
    pendingRequests: affiliates.reduce((s, a) => s + a.pending_payment_requests, 0),
    pendingAmount: affiliates.reduce((s, a) => s + a.pending_amount, 0),
  }), [affiliates]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="h-7 bg-slate-200 rounded w-64 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
            <h1 className="text-2xl font-bold text-slate-900">Programa de Afiliados</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Gerencie os usuários cadastrados no programa "Torne-se Afiliado" (códigos MATR####)
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Afiliados</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Ativos</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Inativos</p>
          <p className="text-2xl font-bold text-slate-400">{stats.total - stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Indicações</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Conversões</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalConversions}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Saques Pendentes</p>
          <p className="text-2xl font-bold text-orange-600">${stats.pendingAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{stats.pendingRequests} sol.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou código..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          {filtered.length} de {affiliates.length} afiliados
        </p>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nenhum afiliado encontrado</p>
          </div>
        ) : (
          filtered.map(affiliate => {
            const isExpanded = expandedId === affiliate.id;
            const requests = paymentRequests[affiliate.user_id] || [];

            return (
              <div key={affiliate.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Row */}
                <div className="p-5">
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
                          affiliate.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {affiliate.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {affiliate.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {affiliate.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(affiliate.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Code badge */}
                    <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg">
                      <code className="text-sm font-mono font-bold text-slate-700">{affiliate.code}</code>
                      <button
                        onClick={() => handleCopyCode(affiliate.code)}
                        className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copiar código"
                      >
                        {copiedCode === affiliate.code ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Quick stats */}
                    <div className="hidden lg:grid grid-cols-4 gap-6 text-center">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{affiliate.total_referrals}</p>
                        <p className="text-xs text-slate-500">Indicações</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-purple-600">{affiliate.completed_referrals}</p>
                        <p className="text-xs text-slate-500">Conversões</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-600">{affiliate.coin_balance.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">MatriculaCoins</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-orange-600">
                          {affiliate.pending_payment_requests > 0
                            ? `$${affiliate.pending_amount.toLocaleString()}`
                            : '–'}
                        </p>
                        <p className="text-xs text-slate-500">Saques pend.</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(affiliate)}
                        disabled={togglingId === affiliate.id}
                        title={affiliate.is_active ? 'Desativar código' : 'Ativar código'}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                      >
                        {togglingId === affiliate.id ? (
                          <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                        ) : affiliate.is_active ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-slate-400" />
                        )}
                      </button>

                      <button
                        onClick={() => handleExpand(affiliate)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="lg:hidden flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                      <span><b>{affiliate.total_referrals}</b> indicações</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <UserCheck className="h-3.5 w-3.5 text-purple-500" />
                      <span><b>{affiliate.completed_referrals}</b> conversões</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      <span><b>{affiliate.coin_balance}</b> coins</span>
                    </div>
                    {affiliate.pending_payment_requests > 0 && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span><b>${affiliate.pending_amount}</b> saque pend.</span>
                      </div>
                    )}
                    <div className="sm:hidden flex items-center gap-1 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                      {affiliate.code}
                      <button onClick={() => handleCopyCode(affiliate.code)}>
                        {copiedCode === affiliate.code
                          ? <CheckCircle2 className="h-3 w-3 text-green-500 ml-1" />
                          : <Copy className="h-3 w-3 text-slate-400 ml-1" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded: detalhes + payment requests */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50">
                    <div className="p-5 space-y-5">
                      {/* Stats detalhados */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            <p className="text-xs text-slate-500">Total Indicações</p>
                          </div>
                          <p className="text-xl font-bold text-slate-900">{affiliate.total_referrals}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{affiliate.pending_referrals} pendentes</p>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <UserCheck className="h-4 w-4 text-purple-500" />
                            <p className="text-xs text-slate-500">Conversões</p>
                          </div>
                          <p className="text-xl font-bold text-purple-600">{affiliate.completed_referrals}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {affiliate.total_referrals > 0
                              ? `${Math.round((affiliate.completed_referrals / affiliate.total_referrals) * 100)}% conversão`
                              : '–'}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Coins className="h-4 w-4 text-amber-500" />
                            <p className="text-xs text-slate-500">MatriculaCoins</p>
                          </div>
                          <p className="text-xl font-bold text-amber-600">{affiliate.coin_balance.toLocaleString()}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{affiliate.coin_total_earned.toLocaleString()} ganhos total</p>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <p className="text-xs text-slate-500">Ganhos Totais</p>
                          </div>
                          <p className="text-xl font-bold text-green-600">${affiliate.total_earnings.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Solicitações de pagamento */}
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Solicitações de Saque
                          {requests.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              {requests.length}
                            </span>
                          )}
                        </h4>

                        {requests.length === 0 ? (
                          <div className="text-center py-6 bg-white rounded-lg border border-slate-200">
                            <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Nenhuma solicitação de saque</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {requests.map(req => (
                              <div key={req.id} className="bg-white rounded-lg border border-slate-200 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(req.status)}`}>
                                      {req.status === 'pending' ? 'Pendente' :
                                       req.status === 'approved' ? 'Aprovado' :
                                       req.status === 'paid' ? 'Pago' :
                                       req.status === 'rejected' ? 'Rejeitado' : req.status}
                                    </span>
                                    <div>
                                      <p className="font-semibold text-slate-900 text-sm">${Number(req.amount_usd).toLocaleString()}</p>
                                      <p className="text-xs text-slate-500">
                                        {req.payout_method} · {new Date(req.created_at).toLocaleDateString('pt-BR')}
                                      </p>
                                      {req.payout_details && (
                                        <p className="text-xs text-slate-400 mt-0.5">
                                          {typeof req.payout_details === 'object'
                                            ? Object.entries(req.payout_details).map(([k, v]) => `${k}: ${v}`).join(' · ')
                                            : req.payout_details}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions por status */}
                                  {req.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <button
                                        disabled={updatingPayment === req.id}
                                        onClick={() => handleUpdatePaymentStatus(req.id, 'approved', affiliate.user_id)}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                      >
                                        {updatingPayment === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                        Aprovar
                                      </button>
                                      <button
                                        disabled={updatingPayment === req.id}
                                        onClick={() => handleUpdatePaymentStatus(req.id, 'rejected', affiliate.user_id)}
                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                                      >
                                        <XCircle className="h-3 w-3" />
                                        Rejeitar
                                      </button>
                                    </div>
                                  )}
                                  {req.status === 'approved' && (
                                    <button
                                      disabled={updatingPayment === req.id}
                                      onClick={() => handleUpdatePaymentStatus(req.id, 'paid', affiliate.user_id)}
                                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {updatingPayment === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                      Marcar como Pago
                                    </button>
                                  )}
                                </div>
                                {req.admin_notes && (
                                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded p-2">
                                    <b>Obs:</b> {req.admin_notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReferralAffiliatesManagement;
