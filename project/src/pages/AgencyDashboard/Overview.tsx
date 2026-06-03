// @ts-nocheck
import React, { useState } from 'react';
import { useState as useStateReact, useEffect, useMemo } from 'react';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Add sellers',
      description: 'Invite sellers by email. Each one receives a unique referral link.',
    },
    {
      number: '02',
      title: 'Sellers generate enrollments',
      description: 'Sellers share the link. Students sign up and start the enrollment process.',
    },
    {
      number: '03',
      title: 'Student completes the flow',
      description: 'The student goes through all steps: selection process, application, placement, and I-20 control.',
    },
    {
      number: '04',
      title: 'Commission is credited',
      description: 'Commission is credited per fee paid — depending on your plan, some are immediate and others are released at the final step.',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-6">
      <h3 className="font-semibold text-slate-900 mb-6">How the affiliate system works</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col gap-2">
            <span className="text-2xl font-bold text-slate-200">{step.number}</span>
            <h4 className="font-semibold text-slate-900 text-sm">{step.title}</h4>
            <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
        <div>
          <h4 className="font-semibold text-slate-900 text-sm mb-2">Commission</h4>
          <p className="text-slate-500 text-sm leading-relaxed">
            Each agency has a custom commission plan configured at approval. Some fees pay immediately when the student completes them; others are held and released only when the student pays the final I-20 Control Fee. Check your plan above for the exact rules.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 text-sm mb-2">Sales tracking</h4>
          <p className="text-slate-500 text-sm leading-relaxed">
            Use the <strong>Sales & Registration Panel</strong> below to see all referred students, which seller brought them, and which fees have already been paid.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 text-sm mb-2">Withdrawals</h4>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your available balance is shown in the card at the top. Go to <strong>Payment Management</strong> to request a withdrawal at any time.
          </p>
        </div>
      </div>
    </div>
  );
};
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Search,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useAgencyRevenueCalculationQuery } from '../../hooks/useAgencyQueries';
import { invalidateAffiliateAdminAll } from '../../lib/queryKeys';
import DirectSalesLink from './DirectSalesLink';

// ─── CommissionPlanCard ────────────────────────────────────────────────────────

const FEE_CONFIG = [
  { key: 'selection_process', label: 'Selection Process Fee' },
  { key: 'application',       label: 'Application Fee'       },
  { key: 'placement',         label: 'Placement Fee'         },
  { key: 'reinstatement',     label: 'Reinstatement Fee'     },
  { key: 'i20_control',       label: 'I-20 Control Fee'      },
];

const CommissionPlanCard = ({ commissionRules }) => {
  const enabledFees = FEE_CONFIG.filter(f => {
    const rule = commissionRules?.[f.key];
    return rule?.enabled !== false && rule?.value > 0;
  });

  const formatValue = (rule) =>
    rule.type === 'percentage' ? `${rule.value}%` : `$${rule.value}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-[#05294E] rounded-xl flex items-center justify-center shrink-0">
          <DollarSign className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-base">Your Commission Plan</h3>
          <p className="text-slate-500 text-sm">How your agency earns commission for each enrolled student</p>
        </div>
      </div>

      {/* Active fee rows */}
      <div className="divide-y divide-slate-100">
        {enabledFees.map(f => {
          const rule = commissionRules[f.key];
          const isOnLastFee = rule.trigger === 'on_last_fee';
          return (
            <div key={f.key} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 text-sm">{f.label}</p>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                    <span>{isOnLastFee
                      ? 'Released when the student pays the final fee (I-20 Control)'
                      : 'Credited as soon as this fee is paid by the student'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-bold text-[#05294E]">{formatValue(rule)}</span>
                <p className="text-xs text-slate-400">{rule.type === 'percentage' ? 'of fee value' : 'fixed'}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: inactive fees mentioned as plain text + note if any on_last_fee */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-2">
        {enabledFees.some(f => commissionRules[f.key]?.trigger === 'on_last_fee') && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <strong>Note:</strong> Commissions pending release are held until the student completes the enrollment and pays the I-20 Control Fee. After that, they become available for withdrawal.
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Overview ─────────────────────────────────────────────────────────────────

interface OverviewProps {
  stats: any;
  sellers?: any[];
  students?: any[];
  onRefresh?: () => void;
  userId: string | undefined;
  commissionRules?: any;
}

const Overview: React.FC<OverviewProps> = ({ stats, sellers = [], students = [], onRefresh, userId, commissionRules = null }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ React Query Hook for revenue calculations
  const {
    data: revenueData,
    isPending: isLoadingRevenue,
    error: revenueError
  } = useAgencyRevenueCalculationQuery(userId);

  // Default values for stats
  const safeStats = {
    totalSellers: stats?.totalSellers || 0,
    activeSellers: stats?.activeSellers || 0,
    pendingSellers: stats?.pendingSellers || 0,
    approvedSellers: stats?.approvedSellers || 0,
    rejectedSellers: stats?.rejectedSellers || 0,
    totalStudents: stats?.totalStudents || 0,
    totalRevenue: stats?.totalRevenue || 0
  };

  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // ✅ Use React Query data with fallback to old values
  const totalRevenue = revenueData?.totalRevenue ?? safeStats.totalRevenue;
  const adjustedRevenueByReferral = revenueData?.adjustedRevenueByReferral ?? {};
  const paidStudents = revenueData?.paidStudents ?? [];
  const paidStudentsCount = revenueData?.paidStudentsCount ?? 0;
  const revenueBreakdown = revenueData?.revenueBreakdown ?? [];

  // Map commission by student ID for individual display
  const studentCommissions = useMemo(() => {
    const map = {};
    (revenueBreakdown || []).forEach(b => {
      map[b.profile_id] = b.total;
    });
    return map;
  }, [revenueBreakdown]);

  // State for Sales & Registration Panel
  const [searchTerm, setSearchTerm] = useStateReact('');
  const [statusFilter, setStatusFilter] = useStateReact('all'); // all, active, registered
  const [copiedSellerId, setCopiedSellerId] = useStateReact(null);

  // Map sellers by referral code for fast lookup
  const sellersByReferralCode = useMemo(() => {
    const map = {};
    (sellers || []).forEach(s => {
      if (s.referral_code) {
        map[s.referral_code.toUpperCase()] = s;
      }
    });
    return map;
  }, [sellers]);

  // Filtered student list for Sales & Registration Panel
  const filteredStudentList = useMemo(() => {
    return (students || []).filter(student => {
      const referralCode = (student.seller_referral_code || '').toUpperCase();
      const seller = sellersByReferralCode[referralCode];

      const studentName = student.full_name || '';
      const studentEmail = student.email || '';
      const sellerName = seller?.name || '';

      const matchesSearch =
        studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referralCode.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'active') {
        return matchesSearch && student.has_paid_selection_process_fee;
      }
      if (statusFilter === 'registered') {
        return matchesSearch && !student.has_paid_selection_process_fee;
      }
      return matchesSearch;
    });
  }, [students, sellersByReferralCode, searchTerm, statusFilter]);

  const handleCopyLink = (referralCode, sellerId) => {
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedSellerId(sellerId);
    setTimeout(() => {
      setCopiedSellerId(null);
    }, 2000);
  };


  // ✅ Refresh function using React Query
  const handleRefresh = () => {
    invalidateAffiliateAdminAll(queryClient);
    onRefresh?.(); // Manter compatibilidade com props externos
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // ✅ Agrupar estudantes pagos por referral_code usando dados do React Query
  const paidStudentsByReferral = useMemo(() => {
    const map = {};
    (paidStudents || []).forEach((s) => {
      const referralCode = (s.seller_referral_code || '').toUpperCase();
      if (referralCode) {
        if (!map[referralCode]) {
          map[referralCode] = [];
        }
        map[referralCode].push(s);
      }
    });
    return map;
  }, [paidStudents]);

  // ✅ Recent sellers usando dados do React Query
  const recentSellers = useMemo(() => {
    if (isLoadingRevenue) return [];

    return (sellers || [])
      .filter((s) => {
        const referralCode = (s.referral_code || '').toUpperCase();
        const hasAdjustedRevenue = adjustedRevenueByReferral[referralCode] && adjustedRevenueByReferral[referralCode] > 0;
        return hasAdjustedRevenue;
      })
      .map((s) => {
        const paidCount = paidStudentsByReferral[(s?.referral_code || '').toUpperCase()]?.length || 0;
        return {
          ...s,
          students_count: paidCount
        };
      })
      .slice(0, 5);
  }, [sellers, paidStudentsByReferral, adjustedRevenueByReferral, isLoadingRevenue]);

  // ✅ Display sellers usando dados do React Query
  const displaySellers = useMemo(() => {
    if (isLoadingRevenue) return [];

    return (sellers || [])
      .filter((s) => {
        const referralCode = (s.referral_code || '').toUpperCase();
        const hasRevenue = (adjustedRevenueByReferral[referralCode] ?? 0) > 0;
        const hasPaidStudents = (paidStudentsByReferral[referralCode]?.length ?? 0) > 0;
        return hasRevenue || hasPaidStudents;
      })
      .map((s) => {
        const referralCode = (s?.referral_code || '').toUpperCase();
        const adjustedRevenue = adjustedRevenueByReferral[referralCode];
        const finalRevenue = adjustedRevenue != null && adjustedRevenue !== undefined ? adjustedRevenue : 0;
        const paidCount = paidStudentsByReferral[referralCode]?.length || 0;

        return {
          ...s,
          total_revenue: finalRevenue,
          students_count: paidCount
        };
      });
  }, [sellers, adjustedRevenueByReferral, paidStudentsByReferral, isLoadingRevenue]);

  // ✅ Total revenue usando dados do React Query
  const displayTotalRevenue = useMemo(() => {
    if (isLoadingRevenue) return 0;
    return Object.values(adjustedRevenueByReferral || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
  }, [adjustedRevenueByReferral, isLoadingRevenue]);


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Refresh
        </button>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Commission Card: Total Commissions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">Total Commissions</p>
              {isLoadingRevenue ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-9 w-32 bg-slate-200 rounded"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalRevenue || 0)}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm font-medium text-blue-600">Total accumulated</span>
                  </div>
                </>
              )}
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* Student Count Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.totalStudents || 0}</p>
              <div className="flex items-center mt-2">
                <Users className="h-4 w-4 text-[#05294E] mr-1" />
                <span className="text-sm font-medium text-[#05294E]">Enrolled students</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-[#05294E] to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* Available Balance Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">Available Balance</p>
              {isLoadingRevenue ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-9 w-32 bg-slate-200 rounded"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats?.availableBalance || 0)}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                    <span className="text-sm font-medium text-emerald-600">Available for withdrawal</span>
                  </div>
                </>
              )}
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Commission Plan CTA */}
      {commissionRules && <CommissionPlanCard commissionRules={commissionRules} />}

      {/* How the affiliate system works */}
      <HowItWorks />


      {/* Direct Sales Link */}
      <DirectSalesLink />

      {/* Painel de Vendas e Registros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-slate-900">Sales & Registration Panel</h3>
              <p className="text-slate-500 text-sm mt-0.5">
                {filteredStudentList.length} of {students.length} record{students.length !== 1 ? 's' : ''} • {students.filter(s => s.has_paid_selection_process_fee).length} active student{students.filter(s => s.has_paid_selection_process_fee).length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => navigate('/agency/dashboard/sales')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors self-start sm:self-auto"
            >
              View All
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student, email or seller..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] bg-slate-50"
              />
            </div>
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 flex-shrink-0">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'registered', label: 'Registered' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    statusFilter === opt.value
                      ? 'bg-white text-[#05294E] shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Body */}
        {students.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Users className="h-10 w-10 text-[#05294E]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No records yet</h3>
            <p className="text-slate-500 text-sm mb-4">Add sellers to start capturing registrations</p>
            <button
              onClick={() => navigate('/agency/dashboard/users?tab=registration')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#05294E] text-white rounded-lg text-sm font-medium hover:bg-[#041f3a] transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Add Seller
            </button>
          </div>
        ) : filteredStudentList.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No results for "{searchTerm}"</p>
            <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} className="mt-2 text-sm text-[#05294E] font-semibold hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Seller</th>
                  <th className="px-5 py-3 font-semibold">Registration</th>
                  <th className="px-5 py-3 font-semibold">Paid steps</th>
                  <th className="px-5 py-3 font-semibold">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudentList.slice(0, 15).map((student) => {
                  const referralCode = (student.seller_referral_code || '').toUpperCase();
                  const seller = sellersByReferralCode[referralCode];
                  const studentId = student.profile_id || student.id;
                  const commission = studentCommissions[studentId] != null
                    ? studentCommissions[studentId]
                    : 0;

                  // ── Dynamic steps based on process type (same as admin) ──
                  const isTransfer = student.student_process_type === 'transfer';
                  const isReinstatement = isTransfer && student.visa_transfer_active === false;
                  const isPlacementFlow = !!student.placement_fee_flow;
                  // I-20 only for Initial, COS and Reinstatement — active Transfer has no I-20
                  const hasI20Step = !isTransfer || isReinstatement;

                  const fees = [
                    { key: 'selection', label: 'Sel.', paid: !!student.has_paid_selection_process_fee },
                    { key: 'application', label: 'App.', paid: !!student.is_application_fee_paid },
                    isPlacementFlow
                      ? { key: 'placement', label: 'Plac.', paid: !!student.is_placement_fee_paid }
                      : { key: 'scholarship', label: 'Schol.', paid: !!student.is_scholarship_fee_paid },
                    ...(isReinstatement
                      ? [
                          { key: 'reinstatement', label: 'Reinst.', paid: !!student.has_paid_reinstatement_package },
                          { key: 'control', label: 'Control', paid: !!(student.has_paid_i20_control_fee || student.has_paid_i539_cos_package || student.has_paid_ds160_package) }
                        ]
                      : (hasI20Step
                          ? [{ key: 'i20', label: 'I-20', paid: !!(student.has_paid_i20_control_fee || student.has_paid_i539_cos_package || student.has_paid_ds160_package) }]
                          : []))
                  ];
                  // ─────────────────────────────────────────────────────────────────

                  const isActive = !!student.has_paid_selection_process_fee;

                  return (
                    <tr key={student.profile_id || student.user_id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Student */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                            <span className={`text-xs font-bold ${isActive ? 'text-emerald-700' : 'text-orange-600'}`}>
                              {(student.full_name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate max-w-[160px]">{student.full_name || 'No name'}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[160px]">{student.email}</p>
                          </div>
                          {isActive ? (
                            <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 flex-shrink-0">Active</span>
                          ) : (
                            <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600 flex-shrink-0">Registered</span>
                          )}
                        </div>
                      </td>

                      {/* Seller */}
                      <td className="px-5 py-3">
                        {seller ? (
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate max-w-[120px]">{seller.name}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </td>

                      {/* Data de Registro */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs whitespace-nowrap">{formatDate(student.created_at)}</span>
                        </div>
                      </td>

                      {/* Paid Steps */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {fees.map(fee => (
                            <div key={fee.key} className="flex flex-col items-center gap-0.5" title={`${fee.label}: ${fee.paid ? 'Paid' : 'Pending'}`}>
                              {fee.paid ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-slate-200" />
                              )}
                              <span className={`text-[9px] font-semibold ${fee.paid ? 'text-emerald-600' : 'text-slate-300'}`}>{fee.label}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Commission */}
                      <td className="px-5 py-3">
                        {isActive ? (
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(commission)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Waiting</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Show more */}
            {filteredStudentList.length > 15 && (
              <div className="px-5 py-4 border-t border-slate-100 text-center">
                <button
                  onClick={() => navigate('/agency/dashboard/sales')}
                  className="text-sm text-[#05294E] font-semibold hover:underline"
                >
                  View all {filteredStudentList.length} records →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;
