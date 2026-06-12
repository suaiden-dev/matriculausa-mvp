import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  DollarSign,
  Search,
  Mail,
  Phone,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  Save,
  X,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAffiliateData } from '../../hooks/useAffiliateData';
import { supabase } from '../../lib/supabase';
import { useEnvironment } from '../../hooks/useEnvironment';

// ─── Protected agencies — read-only, no edits allowed ──────────────────────────
// To unprotect an agency, remove its ID from this set.
const PROTECTED_AGENCY_IDS = new Set([
  '525e4fba-5743-49c0-8ab8-f0dba284bc7a', // Brant Immigration
  'fa01ff90-b78f-4362-990a-f9d9c24e2445', // The Future of English
]);

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'pending';
  sortBy: 'name' | 'created_at' | 'total_revenue' | 'total_students' | 'total_sellers' | 'total_commission';
  sortOrder: 'asc' | 'desc';
}

interface AgencyRequest {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface CommissionRule {
  type: 'fixed' | 'percentage';
  value: number;
  enabled?: boolean;
  trigger?: 'on_payment' | 'on_last_fee';
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_COMMISSION_RULES = {
  selection_process: { type: 'fixed' as const, value: 100, enabled: true,  trigger: 'on_last_fee' as const },
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

// ─── CommissionRulesModal ───────────────────────────────────────────────────────

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
            <p className="text-sm text-slate-500 mt-1">Configure commission rules per fee type.</p>
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

// ─── RejectModal ────────────────────────────────────────────────────────────────

const RejectModal: React.FC<{
  request: AgencyRequest;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}> = ({ request, onConfirm, onClose, loading }) => {
  const [reason, setReason] = useState('');
  const [domMounted, setDomMounted] = useState(false);
  useEffect(() => { setDomMounted(true); }, []);
  if (!domMounted) return null;
  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Reject Partnership Request</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Rejecting request from <span className="font-medium">{request.company_name}</span> ({request.email}).
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Rejection reason (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
              placeholder="Enter reason for rejection..."
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Reject
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── RequestDetailsModal ────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; value: string | null | undefined; className?: string }> = ({ label, value, className }) => {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-900 font-medium">{value}</p>
    </div>
  );
};

// ─── Status badge ───────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = {
    active:   { cls: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-green-500',  label: 'Active' },
    inactive: { cls: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-red-500',    label: 'Inactive' },
    pending:  { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500', label: 'Pending' },
  }[status] || { cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', label: status };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const AffiliateManagement: React.FC = () => {
  const { affiliates, allSellers, loading, error, refetch } = useAffiliateData();
  const navigate = useNavigate();
  const { isDevelopment } = useEnvironment();

  // Filter @uorak.com in production
  const filteredAffiliates = useMemo(() => {
    if (isDevelopment) return affiliates;
    return affiliates.filter((aff: any) => !aff.email?.toLowerCase().includes('@uorak.com'));
  }, [affiliates, isDevelopment]);

  const filteredSellers = useMemo(() => {
    if (isDevelopment) return allSellers;
    return allSellers.filter((s: any) => !s.email?.toLowerCase().includes('@uorak.com'));
  }, [allSellers, isDevelopment]);

  // ── Filters ──
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const updateFilters = (newFilters: Partial<FilterState>) =>
    setFilters(prev => ({ ...prev, ...newFilters }));

  const resetFilters = () =>
    setFilters({ search: '', status: 'all', sortBy: 'created_at', sortOrder: 'desc' });

  // ── Agency requests ──
  const [agencyRequests, setAgencyRequests] = useState<AgencyRequest[]>([]);
  const [loadingAgencyRequests, setLoadingAgencyRequests] = useState(false);
  const [agencyRequestsError, setAgencyRequestsError] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Filter @uorak.com agency requests in production
  const filteredAgencyRequests = useMemo(() => {
    if (isDevelopment) return agencyRequests;
    return agencyRequests.filter((r: AgencyRequest) => !r.email?.toLowerCase().includes('@uorak.com'));
  }, [agencyRequests, isDevelopment]);

  // Approval modal
  const [approvalModalRequest, setApprovalModalRequest] = useState<AgencyRequest | null>(null);
  const [approvalRules, setApprovalRules] = useState<Record<string, CommissionRule>>({ ...DEFAULT_COMMISSION_RULES });
  const [approvingAgency, setApprovingAgency] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Reject modal
  const [rejectModalRequest, setRejectModalRequest] = useState<AgencyRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState(false);

  // Request details modal
  const [viewingRequest, setViewingRequest] = useState<AgencyRequest | null>(null);
  const [viewingAffiliate, setViewingAffiliate] = useState<any | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);

  // Quick commission from list
  const [commissionModalAffiliate, setCommissionModalAffiliate] = useState<any | null>(null);
  const [savingQuickRules, setSavingQuickRules] = useState(false);
  const [quickRulesError, setQuickRulesError] = useState<string | null>(null);

  const [domMounted, setDomMounted] = useState(false);
  useEffect(() => { setDomMounted(true); }, []);

  // ── Load agency requests ──
  const loadAgencyRequests = async () => {
    setLoadingAgencyRequests(true);
    setAgencyRequestsError(null);
    try {
      const { data, error: err } = await supabase
        .from('agency_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setAgencyRequests((data as AgencyRequest[]) || []);
    } catch (e: any) {
      setAgencyRequestsError(e.message || 'Failed to load requests');
    } finally {
      setLoadingAgencyRequests(false);
    }
  };

  useEffect(() => { loadAgencyRequests(); }, []);

  // ── Request details ──
  const openRequestDetails = async (req: AgencyRequest) => {
    setViewingRequest(req);
    setViewingAffiliate(null);
    setLoadingAffiliate(true);
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', req.email.toLowerCase())
        .maybeSingle();
      if (profile?.user_id) {
        const { data: affiliate } = await supabase
          .from('affiliate_admins')
          .select('*')
          .eq('user_id', profile.user_id)
          .maybeSingle();
        setViewingAffiliate(affiliate || null);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingAffiliate(false);
    }
  };

  // ── Approve with commission rules ──
  const handleApproveRequest = (req: AgencyRequest) => {
    setApprovalRules({ ...DEFAULT_COMMISSION_RULES });
    setApprovalError(null);
    setApprovalModalRequest(req);
  };

  const handleConfirmApprove = async (rulesOverride?: Record<string, CommissionRule>) => {
    if (!approvalModalRequest) return;
    setApprovingAgency(true);
    setApprovalError(null);
    setProcessingRequest(approvalModalRequest.id);
    const finalRules = rulesOverride ?? approvalRules;
    try {
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-agency-user', {
        body: {
          email: approvalModalRequest.email,
          full_name: approvalModalRequest.full_name,
          company_name: approvalModalRequest.company_name,
          agency_request_id: approvalModalRequest.id,
          commission_rules: finalRules,
        },
      });
      if (inviteError) throw inviteError;
      if (inviteData?.error) throw new Error(inviteData.error);
      await loadAgencyRequests();
    } catch (e: any) {
      setApprovalError(e.message || 'Failed to approve. Please try again.');
      setApprovingAgency(false);
      setProcessingRequest(null);
      return;
    }
    // Reset saving before closing so React doesn't try to update an unmounted portal
    setApprovingAgency(false);
    setProcessingRequest(null);
    setApprovalModalRequest(null);
  };

  // ── Reject request ──
  const handleConfirmReject = async (reason: string) => {
    if (!rejectModalRequest) return;
    setRejectingRequest(true);
    setProcessingRequest(rejectModalRequest.id);
    try {
      const { error: updateError } = await supabase
        .from('agency_requests')
        .update({ status: 'rejected', rejection_reason: reason || null, reviewed_at: new Date().toISOString() })
        .eq('id', rejectModalRequest.id);
      if (updateError) throw updateError;
      setRejectModalRequest(null);
      await loadAgencyRequests();
    } catch {
      // silently fail for now
    } finally {
      setRejectingRequest(false);
      setProcessingRequest(null);
    }
  };

  // ── Quick commission save from list ──
  const handleSaveQuickRules = async (rules: Record<string, CommissionRule>) => {
    if (!commissionModalAffiliate) return;
    if (PROTECTED_AGENCY_IDS.has(commissionModalAffiliate.id)) return;
    setSavingQuickRules(true);
    setQuickRulesError(null);
    try {
      const { error: updateErr } = await supabase
        .from('affiliate_admins')
        .update({ commission_rules: rules })
        .eq('id', commissionModalAffiliate.id);
      if (updateErr) throw updateErr;
      refetch();
    } catch (e: any) {
      setQuickRulesError(e.message || 'Failed to save rules');
      setSavingQuickRules(false);
      return;
    }
    // Reset saving before closing so React doesn't try to update an unmounted portal
    setSavingQuickRules(false);
    setCommissionModalAffiliate(null);
  };

  const getQuickCommissionRules = (affiliate: any): Record<string, CommissionRule> => {
    const raw = affiliate.commission_rules || DEFAULT_COMMISSION_RULES;
    return Object.fromEntries(
      FEE_LABELS.map(f => {
        const existing = raw[f.id];
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
  };

  // ── Filtered + sorted list ──
  const filteredAndSortedAffiliates = useMemo(() => {
    const list = filteredAffiliates.filter((aff: any) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const name = (aff.company_name?.trim() || aff.full_name || '').toLowerCase();
        if (!name.includes(q) && !aff.email?.toLowerCase().includes(q) && !aff.country?.toLowerCase().includes(q) && !aff.phone?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filters.status !== 'all' && aff.status !== filters.status) return false;
      return true;
    });

    list.sort((a: any, b: any) => {
      let av: any, bv: any;
      switch (filters.sortBy) {
        case 'name':
          av = (a.company_name?.trim() || a.full_name || '').toLowerCase();
          bv = (b.company_name?.trim() || b.full_name || '').toLowerCase();
          break;
        case 'created_at':
          av = new Date(a.created_at).getTime();
          bv = new Date(b.created_at).getTime();
          break;
        case 'total_revenue': av = a.total_revenue; bv = b.total_revenue; break;
        case 'total_students': av = a.total_students; bv = b.total_students; break;
        case 'total_sellers': av = a.total_sellers; bv = b.total_sellers; break;
        case 'total_commission': av = a.total_commission ?? -1; bv = b.total_commission ?? -1; break;
        default: av = a.created_at; bv = b.created_at;
      }
      return filters.sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return list;
  }, [filteredAffiliates, filters]);

  // ── Total stats ──
  const totalStats = useMemo(() => ({
    totalAffiliates: filteredAffiliates.length,
    activeAffiliates: filteredAffiliates.filter((a: any) => a.status === 'active').length,
    totalSellers: filteredSellers.length,
    activeSellers: filteredSellers.filter((s: any) => s.is_active).length,
    totalStudents: filteredAffiliates.reduce((s: number, a: any) => s + (a.total_students || 0), 0),
    totalRevenue: filteredAffiliates.reduce((s: number, a: any) => s + (a.total_revenue || 0), 0),
  }), [filteredAffiliates, filteredSellers]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US');

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="h-7 bg-slate-200 rounded w-56 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-80"></div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 h-24"></div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex gap-4">
            <div className="h-10 bg-slate-200 rounded flex-1"></div>
            <div className="h-10 bg-slate-200 rounded w-40"></div>
            <div className="h-10 bg-slate-200 rounded w-40"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-slate-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-40"></div>
                <div className="h-3 bg-slate-200 rounded w-56"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-20"></div>
              <div className="h-6 bg-slate-200 rounded w-16"></div>
              <div className="h-6 bg-slate-200 rounded w-16"></div>
              <div className="h-6 bg-slate-200 rounded w-24"></div>
              <div className="h-8 bg-slate-200 rounded w-28"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Data</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingRequests = filteredAgencyRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      {/* ── Header + Stats unificado ── */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agency Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage and monitor all B2B agency partners</p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-start md:self-auto text-sm"
          >
            <Activity className="h-4 w-4" />
            Refresh
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg"><Building2 className="h-4 w-4 text-blue-600" /></div>
            <div>
              <p className="text-xs text-slate-400">Agencies</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">{totalStats.totalAffiliates} <span className="text-xs font-normal text-green-600">{totalStats.activeAffiliates} active</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg"><Users className="h-4 w-4 text-purple-600" /></div>
            <div>
              <p className="text-xs text-slate-400">Sellers</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">{totalStats.totalSellers} <span className="text-xs font-normal text-purple-600">{totalStats.activeSellers} active</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg"><Users className="h-4 w-4 text-indigo-600" /></div>
            <div>
              <p className="text-xs text-slate-400">Students</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">{totalStats.totalStudents}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg"><DollarSign className="h-4 w-4 text-green-600" /></div>
            <div>
              <p className="text-xs text-slate-400">Revenue</p>
              <p className="text-lg font-bold text-green-600 leading-tight">{formatCurrency(totalStats.totalRevenue)}</p>
            </div>
          </div>
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded-lg"><AlertCircle className="h-4 w-4 text-amber-600" /></div>
              <div>
                <p className="text-xs text-slate-400">Pending Requests</p>
                <p className="text-lg font-bold text-amber-600 leading-tight">{pendingRequests.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Partnership Requests ── */}
      {(loadingAgencyRequests || filteredAgencyRequests.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Partnership Requests</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {filteredAgencyRequests.length} total
              </span>
              {filteredAgencyRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  {filteredAgencyRequests.filter(r => r.status === 'pending').length} pending
                </span>
              )}
              {filteredAgencyRequests.filter(r => r.status === 'approved').length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {filteredAgencyRequests.filter(r => r.status === 'approved').length} approved
                </span>
              )}
              {filteredAgencyRequests.filter(r => r.status === 'rejected').length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  {filteredAgencyRequests.filter(r => r.status === 'rejected').length} rejected
                </span>
              )}
            </div>
            <button
              onClick={loadAgencyRequests}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Refresh
            </button>
          </div>

          {agencyRequestsError && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{agencyRequestsError}</p>
            </div>
          )}

          {loadingAgencyRequests ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Agency</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredAgencyRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{req.company_name}</div>
                        {req.country && <div className="text-xs text-slate-400">{req.country}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{req.full_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{req.email}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          req.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openRequestDetails(req)}
                            className="px-2.5 py-1 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Details
                          </button>
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveRequest(req)}
                                disabled={processingRequest === req.id}
                                className="px-2.5 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {processingRequest === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectModalRequest(req)}
                                disabled={processingRequest === req.id}
                                className="px-2.5 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
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
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search agencies by name, email, phone or country..."
              value={filters.search}
              onChange={e => updateFilters({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
            />
          </div>
          <select
            value={filters.status}
            onChange={e => updateFilters({ status: e.target.value as any })}
            className="w-full lg:w-40 px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={e => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              updateFilters({ sortBy: sortBy as any, sortOrder: sortOrder as any });
            }}
            className="w-full lg:w-48 px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="total_revenue-desc">Revenue High-Low</option>
            <option value="total_revenue-asc">Revenue Low-High</option>
            <option value="total_commission-desc">Commission High-Low</option>
            <option value="total_commission-asc">Commission Low-High</option>
            <option value="total_students-desc">Students High-Low</option>
            <option value="total_sellers-desc">Sellers High-Low</option>
          </select>
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Reset
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Showing {filteredAndSortedAffiliates.length} of {filteredAffiliates.length} agencies
        </p>
      </div>

      {/* ── Agencies Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filteredAndSortedAffiliates.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No agencies found</h3>
            <p className="text-slate-500 text-sm">
              {filters.search || filters.status !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No agency partners have been registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Agency</th>
                  <th className="px-5 py-3 font-semibold text-center">Sellers</th>
                  <th className="px-5 py-3 font-semibold text-center">Students</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    <div className="flex items-center justify-end gap-1">
                      Platform Revenue
                      <div className="relative group">
                        <Info className="h-3.5 w-3.5 text-slate-400 cursor-default" />
                        <div className="absolute right-0 top-5 z-10 w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                          Total paid by students to the platform via this agency.
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    <div className="flex items-center justify-end gap-1">
                      Agency Earnings
                      <div className="relative group">
                        <Info className="h-3.5 w-3.5 text-slate-400 cursor-default" />
                        <div className="absolute right-0 top-5 z-10 w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                          Total commission earned by this agency based on their commission rules.
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAndSortedAffiliates.map((affiliate: any) => {
                  const displayName = affiliate.company_name?.trim() || affiliate.full_name;
                  const borderColor =
                    affiliate.status === 'active' ? 'border-l-green-400' :
                    affiliate.status === 'pending' ? 'border-l-yellow-400' :
                    'border-l-red-300';

                  const isProtected = PROTECTED_AGENCY_IDS.has(affiliate.id);

                  return (
                    <tr
                      key={affiliate.id}
                      onClick={() => navigate(`/admin/dashboard/agencies/${affiliate.id}`)}
                      className={`hover:bg-slate-50/70 transition-colors border-l-4 ${borderColor} cursor-pointer`}
                    >
                      {/* Agency */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {affiliate.logo_url ? (
                            <img
                              src={affiliate.logo_url}
                              alt={displayName}
                              className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-white font-bold">{displayName.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{displayName}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />{affiliate.email}
                              </span>
                              {affiliate.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />{affiliate.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sellers */}
                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-slate-900">{affiliate.total_sellers}</span>
                      </td>

                      {/* Students */}
                      <td className="px-5 py-4 text-center font-semibold text-slate-900">
                        {affiliate.total_students}
                      </td>

                      {/* Revenue */}
                      <td className="px-5 py-4 text-right font-semibold text-green-600">
                        {formatCurrency(affiliate.total_revenue)}
                      </td>

                      {/* Commission */}
                      <td className="px-5 py-4 text-right font-semibold text-blue-600">
                        {affiliate.total_commission === null
                          ? <span className="text-slate-400 font-normal">—</span>
                          : formatCurrency(affiliate.total_commission)}
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(affiliate.created_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); if (isProtected) return; setCommissionModalAffiliate(affiliate); setQuickRulesError(null); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Commission Rules"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Commission
                          </button>
                          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Approve Modal (with commission rules) ── */}
      {approvalModalRequest && (
        <CommissionRulesModal
          rules={approvalRules}
          title={`Approve & Configure — ${approvalModalRequest.company_name}`}
          confirmLabel="Confirm & Approve"
          saving={approvingAgency}
          error={approvalError}
          onSave={(rules) => handleConfirmApprove(rules)}
          onClose={() => { setApprovalModalRequest(null); setApprovalError(null); }}
        />
      )}

      {/* ── Quick Commission Modal (from list) ── */}
      {commissionModalAffiliate && (
        <CommissionRulesModal
          rules={getQuickCommissionRules(commissionModalAffiliate)}
          title={`Commission Rules — ${commissionModalAffiliate.company_name?.trim() || commissionModalAffiliate.full_name}`}
          confirmLabel="Save Rules"
          saving={savingQuickRules}
          error={quickRulesError}
          onSave={handleSaveQuickRules}
          onClose={() => { setCommissionModalAffiliate(null); setQuickRulesError(null); }}
        />
      )}

      {/* ── Reject Modal ── */}
      {rejectModalRequest && (
        <RejectModal
          request={rejectModalRequest}
          onConfirm={handleConfirmReject}
          onClose={() => setRejectModalRequest(null)}
          loading={rejectingRequest}
        />
      )}

      {/* ── Request Details Modal ── */}
      {viewingRequest && domMounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Request Details</h3>
                <p className="text-sm text-slate-500 mt-0.5">{viewingRequest.company_name} — {viewingRequest.email}</p>
              </div>
              <button onClick={() => { setViewingRequest(null); setViewingAffiliate(null); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  viewingRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  viewingRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {viewingRequest.status === 'pending' ? 'Pending' : viewingRequest.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
                <span className="text-xs text-slate-400">Requested on {formatDate(viewingRequest.created_at)}</span>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Company Info</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Agency Name" value={viewingAffiliate?.company_name || viewingRequest.company_name} />
                  <Field label="Contact Name" value={viewingRequest.full_name} />
                  <Field label="Email" value={viewingRequest.email} />
                  {viewingAffiliate?.website && <Field label="Website" value={viewingAffiliate.website} />}
                  {viewingAffiliate?.logo_url && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Logo</p>
                      <img src={viewingAffiliate.logo_url} alt="Logo" className="h-16 w-auto object-contain rounded-lg border border-slate-100" />
                    </div>
                  )}
                </div>
              </div>

              {(viewingAffiliate?.country || viewingAffiliate?.city || viewingRequest.country) && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Location</p>
                  <div className="grid grid-cols-2 gap-4">
                    {(viewingAffiliate?.country || viewingRequest.country) && <Field label="Country" value={viewingAffiliate?.country || viewingRequest.country} />}
                    {viewingAffiliate?.state && <Field label="State / Province" value={viewingAffiliate.state} />}
                    {viewingAffiliate?.city && <Field label="City" value={viewingAffiliate.city} />}
                    {viewingAffiliate?.address && <Field label="Address" value={viewingAffiliate.address} className="col-span-2" />}
                  </div>
                </div>
              )}

              {(viewingAffiliate?.phone || viewingAffiliate?.whatsapp || viewingRequest.phone) && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    {(viewingAffiliate?.phone || viewingRequest.phone) && <Field label="Phone" value={viewingAffiliate?.phone || viewingRequest.phone} />}
                    {viewingAffiliate?.whatsapp && <Field label="WhatsApp" value={viewingAffiliate.whatsapp} />}
                  </div>
                </div>
              )}

              {(viewingAffiliate?.students_per_year || viewingAffiliate?.markets?.length || viewingAffiliate?.how_found_us) && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">About the Business</p>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingAffiliate?.students_per_year && <Field label="Students / Year" value={viewingAffiliate.students_per_year} />}
                    {viewingAffiliate?.how_found_us && <Field label="How they found us" value={viewingAffiliate.how_found_us} />}
                    {viewingAffiliate?.markets?.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Markets</p>
                        <div className="flex flex-wrap gap-2">
                          {viewingAffiliate.markets.map((m: string) => (
                            <span key={m} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewingRequest.message && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Message</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 leading-relaxed">{viewingRequest.message}</p>
                </div>
              )}

              {loadingAffiliate && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading onboarding data...
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              {viewingRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => { const r = viewingRequest; setViewingRequest(null); setViewingAffiliate(null); handleApproveRequest(r); }}
                    className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => { const r = viewingRequest; setViewingRequest(null); setViewingAffiliate(null); setRejectModalRequest(r); }}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
                  >
                    Reject
                  </button>
                </>
              )}
              <button onClick={() => { setViewingRequest(null); setViewingAffiliate(null); }} className="px-4 py-2 text-sm rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AffiliateManagement;
