import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CreditCard,
  Activity,
  GraduationCap,
  Eye,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AffiliatePaymentRequestService } from '../../services/AffiliatePaymentRequestService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyData {
  id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  commission_per_sale: number | null;
  commission_rules: Record<string, CommissionRule> | null;
  company_name: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
}

interface CommissionRule {
  type: 'fixed' | 'percentage';
  value: number;
  enabled?: boolean;
  trigger?: 'on_payment' | 'on_last_fee';
}

interface Seller {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
}

interface Student {
  id: string;
  profile_id: string;
  user_id: string;
  full_name: string;
  email: string;
  country: string;
  seller_referral_code: string;
  seller_name: string;
  seller_id: string;
  has_paid_selection_process_fee: boolean;
  is_application_fee_paid: boolean;
  is_placement_fee_paid: boolean;
  has_paid_i20_control_fee: boolean;
  has_paid_reinstatement_package: boolean;
  system_type: string;
  dependents: number;
  created_at: string;
  total_paid: number;
}

interface CommissionHistoryRow {
  completed_at: string;
  student_name: string;
  student_email: string;
  seller_name: string;
  seller_code: string;
  payment_amount: number;
  commission_amount: number;
}

interface PaymentRequest {
  id: string;
  amount_usd: number;
  status: string;
  payout_method: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_COMMISSION_RULES = {
  selection_process: { type: 'fixed' as const, value: 100, enabled: true, trigger: 'on_last_fee' as const },
  application:       { type: 'fixed' as const, value: 0,   enabled: false, trigger: 'on_payment' as const },
  placement:         { type: 'fixed' as const, value: 0,   enabled: false, trigger: 'on_payment' as const },
  reinstatement:     { type: 'fixed' as const, value: 0,   enabled: false, trigger: 'on_payment' as const },
  i20_control:       { type: 'fixed' as const, value: 0,   enabled: false, trigger: 'on_payment' as const },
};

const FEE_LABELS = [
  { id: 'selection_process', label: 'Selection Process Fee', icon: Activity },
  { id: 'application',       label: 'Application Fee',       icon: CreditCard },
  { id: 'placement',         label: 'Placement Fee',         icon: GraduationCap },
  { id: 'reinstatement',     label: 'Reinstatement Fee',     icon: ShieldAlert },
  { id: 'i20_control',       label: 'Control Fee',           icon: ShieldCheck },
];

// ─── Helper components ───────────────────────────────────────────────────────

const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
    isActive
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-amber-50 text-amber-700 border-amber-200'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-amber-500'}`} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

const StatCard: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

// ─── CommissionRulesModal ─────────────────────────────────────────────────────

interface CommissionRulesModalProps {
  rules: Record<string, CommissionRule>;
  title: string;
  confirmLabel: string;
  saving: boolean;
  error: string | null;
  onSave: (rules: Record<string, CommissionRule>) => void;
  onClose: () => void;
}

const CommissionRulesModal: React.FC<CommissionRulesModalProps> = ({
  rules: initialRules,
  title,
  confirmLabel,
  saving,
  error,
  onSave,
  onClose,
}) => {
  const [tempRules, setTempRules] = useState<Record<string, CommissionRule>>({ ...initialRules });
  const [domMounted, setDomMounted] = useState(false);
  useEffect(() => { setDomMounted(true); }, []);

  if (!domMounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              {title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Configure commission rules per fee type. Can be edited at any time.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {FEE_LABELS.map(fee => {
            const rule = tempRules[fee.id] || DEFAULT_COMMISSION_RULES[fee.id as keyof typeof DEFAULT_COMMISSION_RULES];
            const Icon = fee.icon;
            const isEnabled = rule.enabled ?? true;

            return (
              <div key={fee.id} className={`p-4 rounded-xl border transition-opacity ${isEnabled ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <h4 className="font-semibold text-slate-800">{fee.label}</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-medium text-slate-500">{isEnabled ? 'Active' : 'Inactive'}</span>
                    <button
                      type="button"
                      onClick={() => setTempRules({ ...tempRules, [fee.id]: { ...rule, enabled: !isEnabled } })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                </div>

                <div className={`flex items-center gap-4 mb-3 ${!isEnabled ? 'pointer-events-none' : ''}`}>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Commission Type</label>
                    <select
                      value={rule.type}
                      onChange={e => setTempRules({ ...tempRules, [fee.id]: { ...rule, type: e.target.value as 'fixed' | 'percentage' } })}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="fixed">Fixed ($)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Value</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm pointer-events-none">
                        {rule.type === 'fixed' ? '$' : '%'}
                      </span>
                      <input
                        type="number" min="0" step="0.01"
                        value={rule.value}
                        onChange={e => setTempRules({ ...tempRules, [fee.id]: { ...rule, value: parseFloat(e.target.value) || 0 } })}
                        className="w-full text-sm border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className={!isEnabled ? 'pointer-events-none opacity-50' : ''}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">When to pay commission</label>
                  <select
                    value={rule.trigger ?? 'on_payment'}
                    onChange={e => setTempRules({ ...tempRules, [fee.id]: { ...rule, trigger: e.target.value as 'on_payment' | 'on_last_fee' } })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="on_payment">When this fee is paid</option>
                    <option value="on_last_fee">When the last fee is paid</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => setTempRules({ ...DEFAULT_COMMISSION_RULES })}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Restore defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(tempRules)}
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AgencyDetail: React.FC = () => {
  const { agencyId } = useParams<{ agencyId: string }>();
  const navigate = useNavigate();

  // ── State ──
  const [agency, setAgency] = useState<AgencyData | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [commissionHistory, setCommissionHistory] = useState<CommissionHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Commission balance (calculated)
  const [commissionBalance, setCommissionBalance] = useState<{ total: number; paid: number; saldo: number } | null>(null);

  // Copy link
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const handleCopySellerLink = (referralCode: string) => {
    const link = `https://matriculausa.com/selection-fee-registration?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(referralCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Actions
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Commission modal
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  // Commission history expand
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Data loading ──
  const loadData = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Load affiliate_admin record
      const { data: aaData, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id, user_id, is_active, created_at, commission_per_sale, commission_rules')
        .eq('id', agencyId)
        .maybeSingle();

      if (aaErr) throw aaErr;
      if (!aaData) throw new Error('Agency not found');

      const userId = aaData.user_id;

      // 2. Parallel: user_profiles + sellers + payment_requests
      const [profileRes, sellersRes, paymentRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('full_name, company_name, email, phone, country')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('sellers')
          .select('id, name, email, referral_code, is_active, created_at')
          .eq('affiliate_admin_id', agencyId),
        supabase
          .from('affiliate_payment_requests')
          .select('id, amount_usd, status, payout_method, created_at')
          .eq('referrer_user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      const profile = profileRes.data;
      const sellersData: Seller[] = sellersRes.data || [];

      setAgency({
        id: aaData.id,
        user_id: userId,
        is_active: !!aaData.is_active,
        created_at: aaData.created_at,
        commission_per_sale: aaData.commission_per_sale ?? null,
        commission_rules: aaData.commission_rules || null,
        company_name: profile?.company_name || '',
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        country: profile?.country || '',
      });
      setSellers(sellersData);
      setPaymentRequests(paymentRes.data || []);

      // 3. Load students via seller codes
      if (sellersData.length > 0) {
        const sellerCodes = sellersData.map(s => s.referral_code).filter(Boolean);
        const { data: studentProfiles } = await supabase
          .from('user_profiles')
          .select('id, user_id, full_name, email, country, seller_referral_code, has_paid_selection_process_fee, is_application_fee_paid, has_paid_i20_control_fee, is_placement_fee_paid, has_paid_reinstatement_package, system_type, dependents, created_at')
          .in('seller_referral_code', sellerCodes);

        const sellersByCode: Record<string, Seller> = {};
        sellersData.forEach(s => { sellersByCode[s.referral_code] = s; });

        // Fetch real payment amounts from individual_fee_payments
        const studentUserIds = (studentProfiles || []).map((p: any) => p.user_id).filter(Boolean);
        const realPaymentsMap: Record<string, number> = {};
        if (studentUserIds.length > 0) {
          const { data: feePayments } = await supabase
            .from('individual_fee_payments')
            .select('user_id, amount')
            .in('user_id', studentUserIds);
          (feePayments || []).forEach((p: any) => {
            if (p.user_id && p.amount != null) {
              realPaymentsMap[p.user_id] = (realPaymentsMap[p.user_id] || 0) + Number(p.amount);
            }
          });
        }

        const studentsProcessed: Student[] = (studentProfiles || []).map(p => {
          const seller = sellersByCode[p.seller_referral_code || ''];
          const sysType = p.system_type || 'legacy';
          const deps = Number(p.dependents || 0);

          // Use real payment data when available; fall back to hardcoded estimates for legacy records
          let total = 0;
          if (realPaymentsMap[p.user_id] != null) {
            total = realPaymentsMap[p.user_id];
          } else {
            if (p.has_paid_selection_process_fee) total += sysType === 'simplified' ? 350 : 400 + (deps * 150);
            if (p.is_application_fee_paid) total += 100;
          }

          return {
            id: p.id,
            profile_id: p.id,
            user_id: p.user_id,
            full_name: p.full_name || '',
            email: p.email || '',
            country: p.country || '',
            seller_referral_code: p.seller_referral_code || '',
            seller_name: seller?.name || p.seller_referral_code || '',
            seller_id: seller?.id || '',
            has_paid_selection_process_fee: !!p.has_paid_selection_process_fee,
            is_application_fee_paid: !!p.is_application_fee_paid,
            is_placement_fee_paid: !!p.is_placement_fee_paid,
            has_paid_i20_control_fee: !!p.has_paid_i20_control_fee,
            has_paid_reinstatement_package: !!p.has_paid_reinstatement_package,
            system_type: sysType,
            dependents: deps,
            created_at: p.created_at,
            total_paid: total,
          };
        });
        setStudents(studentsProcessed);
      } else {
        setStudents([]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load agency data');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Commission balance calculation
  useEffect(() => {
    if (!paymentRequests.length) {
      setCommissionBalance({ total: 0, paid: 0, saldo: 0 });
      return;
    }
    const paid = paymentRequests
      .filter(r => r.status === 'paid')
      .reduce((s, r) => s + Number(r.amount_usd), 0);
    // total is fetched lazily via commission history — show only paid vs balance
    setCommissionBalance({ total: 0, paid, saldo: 0 });
  }, [paymentRequests]);

  // Commission history lazy load
  const loadCommissionHistory = useCallback(async () => {
    if (historyLoaded || historyLoading || sellers.length === 0) return;
    setHistoryLoading(true);
    try {
      const sellerCodes = sellers.map(s => s.referral_code).filter(Boolean);
      const { data: referrals } = await supabase
        .from('affiliate_referrals')
        .select('affiliate_code, referred_id, payment_amount, commission_amount, completed_at')
        .in('affiliate_code', sellerCodes)
        .not('commission_amount', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(100);

      const referredIds = [...new Set((referrals || []).map((r: any) => r.referred_id).filter(Boolean))];
      let profilesByUserId: Record<string, any> = {};
      if (referredIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', referredIds);
        profilesByUserId = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      }
      const sellersByCode: Record<string, Seller> = {};
      sellers.forEach(s => { sellersByCode[s.referral_code] = s; });

      const totalCommission = (referrals || []).reduce((sum: number, r: any) => sum + (Number(r.commission_amount) || 0), 0);
      const paidOut = paymentRequests.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount_usd), 0);
      setCommissionBalance({ total: totalCommission, paid: paidOut, saldo: Math.max(0, totalCommission - paidOut) });

      setCommissionHistory((referrals || []).map((r: any) => ({
        completed_at: r.completed_at,
        student_name: profilesByUserId[r.referred_id]?.full_name || 'Unknown',
        student_email: profilesByUserId[r.referred_id]?.email || '',
        seller_name: sellersByCode[r.affiliate_code]?.name || r.affiliate_code,
        seller_code: r.affiliate_code,
        payment_amount: Number(r.payment_amount) || 0,
        commission_amount: Number(r.commission_amount) || 0,
      })));
      setHistoryLoaded(true);
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, [sellers, paymentRequests, historyLoaded, historyLoading]);

  const handleToggleHistory = () => {
    if (!historyExpanded && !historyLoaded) {
      loadCommissionHistory();
    }
    setHistoryExpanded(prev => !prev);
  };

  // ── Actions ──
  const handleToggleStatus = async () => {
    if (!agency) return;
    setTogglingStatus(true);
    setToggleError(null);
    try {
      const { error: updateErr } = await supabase
        .from('affiliate_admins')
        .update({ is_active: !agency.is_active })
        .eq('id', agency.id);
      if (updateErr) throw updateErr;
      setAgency(prev => prev ? { ...prev, is_active: !prev.is_active } : prev);
    } catch (e: any) {
      setToggleError(e.message || 'Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleSaveCommissionRules = async (rules: Record<string, CommissionRule>) => {
    if (!agency) return;
    setSavingRules(true);
    setRulesError(null);
    try {
      const { error: updateErr } = await supabase
        .from('affiliate_admins')
        .update({ commission_rules: rules })
        .eq('id', agency.id);
      if (updateErr) throw updateErr;
      setAgency(prev => prev ? { ...prev, commission_rules: rules } : prev);
    } catch (e: any) {
      setRulesError(e.message || 'Failed to save commission rules');
      setSavingRules(false);
      return;
    }
    // Reset saving before closing so React doesn't try to update an unmounted portal
    setSavingRules(false);
    setCommissionModalOpen(false);
  };

  // ── Derived data ──
  const displayName = agency?.company_name?.trim() || agency?.full_name || 'Unknown Agency';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const totalRevenue = useMemo(() => students.reduce((s, st) => s + st.total_paid, 0), [students]);

  const sellerStudentCounts = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    students.forEach(st => {
      if (!map[st.seller_referral_code]) map[st.seller_referral_code] = { count: 0, revenue: 0 };
      map[st.seller_referral_code].count++;
      map[st.seller_referral_code].revenue += st.total_paid;
    });
    return map;
  }, [students]);

  const paymentInfo = useMemo(() => {
    const pending = paymentRequests.filter(r => r.status === 'pending' || r.status === 'approved');
    const paid = paymentRequests.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount_usd), 0);
    const pendingAmt = pending.reduce((s, r) => s + Number(r.amount_usd), 0);
    // Outside payments (manual) — not calculated here, shown as N/A
    const available = Math.max(0, totalRevenue - paid - pendingAmt);
    return { paid, pendingAmt, pendingCount: pending.length, available };
  }, [paymentRequests, totalRevenue]);

  const normalizedRules = useMemo(() => {
    const raw = agency?.commission_rules || DEFAULT_COMMISSION_RULES;
    return Object.fromEntries(
      FEE_LABELS.map(f => {
        const existing = (raw as any)[f.id];
        const defaults = DEFAULT_COMMISSION_RULES[f.id as keyof typeof DEFAULT_COMMISSION_RULES];
        if (!existing) return [f.id, defaults];
        return [f.id, {
          type: existing.type ?? defaults.type,
          value: existing.value ?? defaults.value,
          enabled: existing.enabled ?? true,
          trigger: existing.trigger ?? 'on_payment',
        }];
      })
    );
  }, [agency?.commission_rules]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US');

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl"></div>
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-200 rounded w-48"></div>
              <div className="h-4 bg-slate-200 rounded w-64"></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium">Failed to Load Agency</h3>
            <p className="text-red-600 text-sm mt-1">{error || 'Agency not found'}</p>
            <button onClick={() => navigate('/admin/dashboard/agencies')} className="mt-3 text-sm text-red-700 underline">
              Back to Agencies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <button
          onClick={() => navigate('/admin/dashboard/agencies')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agencies
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
              <span className="text-white font-bold text-2xl">{avatarLetter}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
                <StatusBadge isActive={agency.is_active} />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                {agency.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {agency.email}
                  </span>
                )}
                {agency.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {agency.phone}
                  </span>
                )}
                {agency.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {agency.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatDate(agency.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setCommissionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              Commission Rules
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                agency.is_active
                  ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {togglingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : agency.is_active ? (
                <ShieldAlert className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {agency.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>

        {toggleError && (
          <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{toggleError}</p>
          </div>
        )}

        {!agency.is_active && (
          <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">This agency is inactive and cannot access the dashboard.</p>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Sellers" value={sellers.length} icon={Users} color="bg-purple-100 text-purple-600" />
        <StatCard label="Students" value={students.length} icon={GraduationCap} color="bg-blue-100 text-blue-600" />
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} color="bg-green-100 text-green-600" />
        <StatCard label="Available Balance" value={formatCurrency(paymentInfo.available)} icon={CreditCard} color="bg-orange-100 text-orange-600" />
        <StatCard
          label="Commission Balance"
          value={commissionBalance ? formatCurrency(commissionBalance.saldo) : '—'}
          icon={Activity}
          color="bg-indigo-100 text-indigo-600"
        />
      </div>

      {/* ── Payment Information ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-slate-600" />
          Payment Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-slate-400 mt-1">All fees collected</p>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Paid Out</p>
            <p className="text-2xl font-bold text-slate-700">{formatCurrency(paymentInfo.paid)}</p>
            <p className="text-xs text-slate-400 mt-1">Commission paid</p>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(paymentInfo.available)}</p>
            <p className="text-xs text-slate-400 mt-1">Pending withdrawal</p>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Payment Requests</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(paymentInfo.pendingAmt)}</p>
            <p className="text-xs text-slate-400 mt-1">{paymentInfo.pendingCount} pending/approved</p>
          </div>
        </div>
      </div>

      {/* ── Commission Rules summary ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Active Commission Rules
          </h2>
          <button
            onClick={() => setCommissionModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Edit Rules
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {FEE_LABELS.map(fee => {
            const rule = normalizedRules[fee.id];
            const Icon = fee.icon;
            if (!rule?.enabled) return null;
            return (
              <div key={fee.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Icon className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-medium text-slate-700">{fee.label}:</span>
                <span className="text-xs font-bold text-blue-700">
                  {rule.type === 'fixed' ? `$${rule.value}` : `${rule.value}%`}
                </span>
                <span className="text-xs text-slate-400">
                  ({rule.trigger === 'on_last_fee' ? 'on last fee' : 'on payment'})
                </span>
              </div>
            );
          })}
          {FEE_LABELS.every(f => !normalizedRules[f.id]?.enabled) && (
            <p className="text-sm text-slate-400 italic">No active commission rules configured.</p>
          )}
        </div>
      </div>

      {/* ── Sellers Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-600" />
            Sellers ({sellers.length})
          </h2>
        </div>
        {sellers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No sellers registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Seller</th>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold text-right">Students</th>
                  <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sellers.map(seller => {
                  const stats = sellerStudentCounts[seller.referral_code] || { count: 0, revenue: 0 };
                  return (
                    <tr key={seller.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-purple-600">{seller.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{seller.name}</p>
                            <p className="text-xs text-slate-400">{seller.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{seller.referral_code}</span>
                          <button
                            onClick={() => handleCopySellerLink(seller.referral_code)}
                            title="Copy registration link"
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {copiedCode === seller.referral_code
                              ? <Check className="h-3.5 w-3.5 text-green-500" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">{stats.count}</td>
                      <td className="px-5 py-3 text-right font-medium text-green-600">{formatCurrency(stats.revenue)}</td>
                      <td className="px-5 py-3 text-xs text-slate-400">{formatDate(seller.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Students Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-slate-600" />
            Students ({students.length})
          </h2>
        </div>
        {students.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No students registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Seller</th>
                  <th className="px-4 py-3 font-semibold text-center">Sel.</th>
                  <th className="px-4 py-3 font-semibold text-center">App.</th>
                  <th className="px-4 py-3 font-semibold text-center">Place.</th>
                  <th className="px-4 py-3 font-semibold text-center">Reinst.</th>
                  <th className="px-4 py-3 font-semibold text-center">Control</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                  <th className="px-5 py-3 font-semibold">Registered</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          student.has_paid_selection_process_fee ? 'bg-emerald-100' : 'bg-orange-100'
                        }`}>
                          <span className={`text-xs font-bold ${
                            student.has_paid_selection_process_fee ? 'text-emerald-700' : 'text-orange-600'
                          }`}>
                            {(student.full_name || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-[160px]">{student.full_name || 'No name'}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{student.seller_name}</td>
                    {/* Fee checkmarks */}
                    <td className="px-4 py-3 text-center">
                      {student.has_paid_selection_process_fee
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <XCircle className="h-4 w-4 text-slate-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {student.is_application_fee_paid
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <XCircle className="h-4 w-4 text-slate-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {student.is_placement_fee_paid
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <XCircle className="h-4 w-4 text-slate-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {student.has_paid_reinstatement_package
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <XCircle className="h-4 w-4 text-slate-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {student.has_paid_i20_control_fee
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <XCircle className="h-4 w-4 text-slate-200 mx-auto" />}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-green-600">{formatCurrency(student.total_paid)}</td>
                    <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(student.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/dashboard/students/${student.profile_id}`)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Commission History (lazy) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={handleToggleHistory}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-600" />
            Commission History
            {commissionBalance && commissionBalance.total > 0 && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                Total: {formatCurrency(commissionBalance.total)} • Paid: {formatCurrency(commissionBalance.paid)} • Balance: {formatCurrency(commissionBalance.saldo)}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            {historyExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
          </div>
        </button>

        {historyExpanded && (
          <div className="border-t border-slate-100">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : commissionHistory.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No commission records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Student</th>
                      <th className="px-5 py-3 font-semibold">Seller</th>
                      <th className="px-5 py-3 font-semibold text-right">Payment</th>
                      <th className="px-5 py-3 font-semibold text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {commissionHistory.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {row.completed_at ? formatDate(row.completed_at) : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-900">{row.student_name}</div>
                          <div className="text-xs text-slate-400">{row.student_email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-700">{row.seller_name}</div>
                          <div className="text-xs text-slate-400 font-mono">{row.seller_code}</div>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">{formatCurrency(row.payment_amount)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-blue-600">{formatCurrency(row.commission_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Commission Rules Modal ── */}
      {commissionModalOpen && (
        <CommissionRulesModal
          rules={normalizedRules}
          title="Commission Rules"
          confirmLabel="Save Rules"
          saving={savingRules}
          error={rulesError}
          onSave={handleSaveCommissionRules}
          onClose={() => { setCommissionModalOpen(false); setRulesError(null); }}
        />
      )}
    </div>
  );
};

export default AgencyDetail;
