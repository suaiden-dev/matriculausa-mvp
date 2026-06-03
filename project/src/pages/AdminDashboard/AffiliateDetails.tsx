import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  DollarSign,
  Mail,
  Calendar,
  Coins,
  Clock,
  AlertCircle,
  GraduationCap,
  ToggleLeft,
  ToggleRight,
  BadgeCheck,
  Ban,
  Receipt,
  X,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface AffiliateData {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  full_name: string;
  email: string;
  coin_balance: number;
  coin_total_earned: number;
  pending_payment_requests: number;
  pending_amount: number;
}

interface ReferredStudent {
  referral_id: string;
  referred_id: string;
  full_name: string;
  email: string;
  selection_process_paid_at: string | null;
  application_fee_paid_at: string | null;
  scholarship_fee_paid_at: string | null;
  i20_paid_at: string | null;
  credits_earned: number;
  created_at: string;
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

interface PaymentModal {
  type: 'approve' | 'reject' | 'mark_paid';
  requestId: string;
  amount: number;
  method: string;
}

const StepBadge = ({ label, date }: { label: string; date: string | null }) => (
  <div className={`flex flex-col items-center text-center min-w-[64px] ${date ? 'text-green-700' : 'text-slate-400'}`}>
    <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-0.5 ${date ? 'bg-green-100' : 'bg-slate-100'}`}>
      {date
        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
      }
    </div>
    <span className="text-[10px] font-medium leading-tight">{label}</span>
    {date && <span className="text-[9px] text-slate-400 mt-0.5">{new Date(date).toLocaleDateString('pt-BR')}</span>}
  </div>
);

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

const statusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'approved': return 'Approved';
    case 'paid': return 'Paid';
    case 'rejected': return 'Rejected';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const AffiliateDetails: React.FC = () => {
  const { affiliateId } = useParams<{ affiliateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [students, setStudents] = useState<ReferredStudent[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModal | null>(null);
  const [modalInput, setModalInput] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    if (!affiliateId) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Affiliate code
      const { data: codeData, error: codeErr } = await supabase
        .from('affiliate_codes')
        .select('id, user_id, code, is_active, created_at')
        .eq('id', affiliateId)
        .maybeSingle();

      if (codeErr) throw codeErr;
      if (!codeData) throw new Error('Affiliate not found');

      const userId = codeData.user_id;

      // 2. All remaining data in parallel
      const [profileRes, usersRes, coinsRes, referralsRes, requestsRes] = await Promise.all([
        supabase.from('user_profiles').select('full_name, email').eq('user_id', userId).maybeSingle(),
        supabase.rpc('get_admin_users_data'),
        supabase.from('matriculacoin_credits').select('balance, total_earned').eq('user_id', userId).maybeSingle(),
        supabase
          .from('affiliate_referrals')
          .select('id, referred_id, selection_process_paid_at, application_fee_paid_at, scholarship_fee_paid_at, i20_paid_at, credits_earned, created_at')
          .eq('referrer_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('affiliate_payment_requests')
          .select('id, amount_usd, status, payout_method, created_at, payout_details, admin_notes')
          .eq('referrer_user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      // Email from RPC
      const emailMap: Record<string, string> = {};
      (usersRes.data || []).forEach((u: any) => { emailMap[u.id] = u.email || ''; });

      const profileName = profileRes.data?.full_name || '';
      const profileEmail = profileRes.data?.email || emailMap[userId] || '';
      const coins = coinsRes.data;

      // Payment pending stats
      const pendingReqs = (requestsRes.data || []).filter((r: any) => r.status === 'pending' || r.status === 'approved');
      const pendingAmount = pendingReqs.reduce((s: number, r: any) => s + Number(r.amount_usd), 0);

      setAffiliate({
        id: codeData.id,
        user_id: userId,
        code: codeData.code,
        is_active: codeData.is_active,
        created_at: codeData.created_at,
        full_name: profileName || profileEmail || 'Unknown',
        email: profileEmail,
        coin_balance: Number(coins?.balance) || 0,
        coin_total_earned: Number(coins?.total_earned) || 0,
        pending_payment_requests: pendingReqs.length,
        pending_amount: pendingAmount,
      });

      // Referred students — merge with profiles
      const referrals = referralsRes.data || [];
      if (referrals.length > 0) {
        const referredIds = referrals.map((r: any) => r.referred_id).filter(Boolean);
        const { data: refProfiles } = await supabase
          .from('user_profiles')
          .select('id, user_id, full_name, email')
          .in('user_id', referredIds);

        const profMap: Record<string, { id: string; full_name: string; email: string }> = {};
        (refProfiles || []).forEach((p: any) => {
          profMap[p.user_id] = { id: p.id, full_name: p.full_name || '', email: p.email || '' };
        });

        setStudents(referrals.map((r: any) => {
          const prof = profMap[r.referred_id] || { id: '', full_name: '', email: '' };
          return {
            referral_id: r.id,
            referred_id: r.referred_id,
            profile_id: prof.id,
            full_name: prof.full_name || prof.email || r.referred_id?.slice(0, 8),
            email: prof.email,
            selection_process_paid_at: r.selection_process_paid_at,
            application_fee_paid_at: r.application_fee_paid_at,
            scholarship_fee_paid_at: r.scholarship_fee_paid_at,
            i20_paid_at: r.i20_paid_at,
            credits_earned: Number(r.credits_earned) || 0,
            created_at: r.created_at,
          };
        }));
      } else {
        setStudents([]);
      }

      setRequests(requestsRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [affiliateId]);

  const handleToggleActive = async () => {
    if (!affiliate) return;
    setTogglingId(true);
    try {
      const { error } = await supabase
        .from('affiliate_codes')
        .update({ is_active: !affiliate.is_active, updated_at: new Date().toISOString() })
        .eq('id', affiliate.id);
      if (error) throw error;
      setAffiliate(prev => prev ? { ...prev, is_active: !prev.is_active } : prev);
      showToast(`Code ${affiliate.code} ${!affiliate.is_active ? 'activated' : 'deactivated'}`);
    } catch (e: any) {
      showToast(e.message || 'Failed to update status', 'error');
    } finally {
      setTogglingId(false);
    }
  };

  const handleCopyCode = () => {
    if (!affiliate) return;
    navigator.clipboard.writeText(affiliate.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const openPaymentModal = (type: PaymentModal['type'], req: PaymentRequest) => {
    setModalInput('');
    setPaymentModal({ type, requestId: req.id, amount: req.amount_usd, method: req.payout_method });
  };

  const closePaymentModal = () => {
    setPaymentModal(null);
    setModalInput('');
  };

  const handleConfirmPaymentAction = async () => {
    if (!paymentModal) return;
    const { type, requestId } = paymentModal;
    setUpdatingPayment(requestId);
    closePaymentModal();
    try {
      if (type === 'approve') {
        const { error } = await supabase.rpc('admin_approve_affiliate_payment_request', {
          p_id: requestId, p_admin: user?.id,
        });
        if (error) throw error;
        showToast('Request approved — pending payment');
      } else if (type === 'reject') {
        const { error } = await supabase.rpc('admin_reject_affiliate_payment_request', {
          p_id: requestId, p_admin: user?.id, p_reason: modalInput,
        });
        if (error) throw error;
        showToast('Request rejected — coins refunded to affiliate');
      } else if (type === 'mark_paid') {
        const { error } = await supabase.rpc('admin_mark_paid_affiliate_payment_request', {
          p_id: requestId, p_admin: user?.id, p_reference: modalInput,
        });
        if (error) throw error;
        showToast('Marked as paid');
      }
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Error processing request', 'error');
    } finally {
      setUpdatingPayment(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="h-7 bg-slate-200 rounded w-64 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-48" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
              <div className="h-7 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 h-64" />
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 h-64" />
        </div>
      </div>
    );
  }

  if (error || !affiliate) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
        <div>
          <p className="font-medium text-red-800">Failed to load affiliate</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button onClick={loadData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
            Retry
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

      {/* Payment Action Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className={`flex items-center justify-between p-5 border-b border-slate-100 rounded-t-2xl ${
              paymentModal.type === 'reject' ? 'bg-red-50' :
              paymentModal.type === 'mark_paid' ? 'bg-green-50' : 'bg-blue-50'
            }`}>
              <div className="flex items-center gap-3">
                {paymentModal.type === 'approve' && <BadgeCheck className="h-5 w-5 text-blue-600" />}
                {paymentModal.type === 'reject' && <Ban className="h-5 w-5 text-red-600" />}
                {paymentModal.type === 'mark_paid' && <Receipt className="h-5 w-5 text-green-600" />}
                <h3 className="font-bold text-slate-900">
                  {paymentModal.type === 'approve' && 'Approve Payout Request'}
                  {paymentModal.type === 'reject' && 'Reject Payout Request'}
                  {paymentModal.type === 'mark_paid' && 'Mark as Paid'}
                </h3>
              </div>
              <button onClick={closePaymentModal} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Amount</p>
                  <p className="text-2xl font-bold text-slate-900">${Number(paymentModal.amount).toLocaleString()} USD</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Method</p>
                  <p className="text-sm font-bold text-slate-700">{paymentModal.method.toUpperCase()}</p>
                </div>
              </div>

              {paymentModal.type === 'approve' && (
                <p className="text-sm text-slate-600">
                  This will mark the request as <strong>Approved</strong>. The affiliate's coins have already been deducted. Once approved, proceed to pay and mark as paid.
                </p>
              )}
              {paymentModal.type === 'reject' && (
                <div>
                  <p className="text-sm text-slate-600 mb-3">
                    Rejecting will <strong>refund the coins</strong> back to the affiliate. Provide a reason (optional).
                  </p>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for rejection</label>
                  <textarea
                    value={modalInput}
                    onChange={e => setModalInput(e.target.value)}
                    placeholder="e.g. Invalid payout details, insufficient info..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
              )}
              {paymentModal.type === 'mark_paid' && (
                <div>
                  <p className="text-sm text-slate-600 mb-3">
                    Confirm the payment was sent. Add a transaction reference (optional).
                  </p>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Transaction reference</label>
                  <input
                    type="text"
                    value={modalInput}
                    onChange={e => setModalInput(e.target.value)}
                    placeholder="e.g. Zelle #12345, Stripe txn_abc..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={handleConfirmPaymentAction}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  paymentModal.type === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : paymentModal.type === 'mark_paid'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {paymentModal.type === 'approve' && <><BadgeCheck className="h-4 w-4" /> Approve</>}
                {paymentModal.type === 'reject' && <><Ban className="h-4 w-4" /> Reject & Refund Coins</>}
                {paymentModal.type === 'mark_paid' && <><Receipt className="h-4 w-4" /> Confirm Payment</>}
              </button>
              <button
                onClick={closePaymentModal}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard/referral-affiliates')}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {affiliate.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{affiliate.full_name}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  affiliate.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {affiliate.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {affiliate.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {affiliate.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {new Date(affiliate.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            {/* Code badge */}
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Copy code"
            >
              <code className="text-sm font-mono font-bold text-slate-700">{affiliate.code}</code>
              {copiedCode
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                : <Copy className="h-3.5 w-3.5 text-slate-400" />
              }
            </button>
            {/* Toggle */}
            <button
              onClick={handleToggleActive}
              disabled={togglingId}
              title={affiliate.is_active ? 'Deactivate code' : 'Activate code'}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              {togglingId
                ? <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                : affiliate.is_active
                  ? <ToggleRight className="h-5 w-5 text-green-600" />
                  : <ToggleLeft className="h-5 w-5 text-slate-400" />
              }
            </button>
            {/* Refresh */}
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-medium text-slate-500">Coins Balance</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{affiliate.coin_balance.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{affiliate.coin_total_earned.toLocaleString()} total earned</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-medium text-slate-500">Referred Students</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-orange-500" />
            <p className="text-xs font-medium text-slate-500">Pending Requests</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{affiliate.pending_payment_requests}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-green-500" />
            <p className="text-xs font-medium text-slate-500">Pending Payout</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {affiliate.pending_amount > 0 ? `$${affiliate.pending_amount.toLocaleString()}` : '–'}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Referred Students */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-500" />
            Referred Students
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
              {students.length}
            </span>
          </h2>

          {students.length === 0 ? (
            <div className="text-center py-10">
              <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No referred students yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map(student => (
                <div key={student.referral_id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <button
                        onClick={() => navigate(`/admin/dashboard/students/${student.profile_id || student.referred_id}`)}
                        className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm hover:text-blue-600 transition-colors group"
                      >
                        {student.full_name}
                        <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </button>
                      <p className="text-xs text-slate-500">{student.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Referred {new Date(student.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StepBadge label="Selection" date={student.selection_process_paid_at} />
                      <StepBadge label="App Fee" date={student.application_fee_paid_at} />
                      <StepBadge label="Placement" date={student.scholarship_fee_paid_at} />
                      <StepBadge label="Control Fee" date={student.i20_paid_at} />
                      {student.credits_earned > 0 && (
                        <div className="flex items-center gap-1 ml-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200">
                          <Coins className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-bold text-amber-700">+{student.credits_earned}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payout Requests */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Payout Requests
            {requests.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                {requests.length}
              </span>
            )}
          </h2>

          {requests.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No payout requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-slate-900">${Number(req.amount_usd).toLocaleString()} USD</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {req.payout_method.toUpperCase()} · {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {req.payout_details && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {typeof req.payout_details === 'object'
                            ? Object.values(req.payout_details).join(' · ')
                            : req.payout_details}
                        </p>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${statusColor(req.status)}`}>
                      {statusLabel(req.status)}
                    </span>
                  </div>

                  {req.admin_notes && (
                    <p className="text-xs text-slate-500 bg-white rounded-lg p-2 mb-3 border border-slate-100">
                      <b>Note:</b> {req.admin_notes}
                    </p>
                  )}

                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        disabled={updatingPayment === req.id}
                        onClick={() => openPaymentModal('approve', req)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {updatingPayment === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />}
                        Approve
                      </button>
                      <button
                        disabled={updatingPayment === req.id}
                        onClick={() => openPaymentModal('reject', req)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        <Ban className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  )}
                  {req.status === 'approved' && (
                    <button
                      disabled={updatingPayment === req.id}
                      onClick={() => openPaymentModal('mark_paid', req)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {updatingPayment === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
                      Mark as Paid
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AffiliateDetails;
