import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  DollarSign,
  Users,
  Clock,
  Filter,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDisplayAmounts } from '../../utils/paymentConverter';
import { formatCurrency } from '../../utils/currency';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import StudentStepProgress, { buildStudentRecord } from '../../components/StudentStepProgress';

interface Student {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  country?: string;
  created_at: string;
  status: string;
  latest_activity: string;
  has_paid_selection_process_fee: boolean;
  is_placement_fee_paid: boolean;
  is_scholarship_fee_paid?: boolean;
  is_application_fee_paid: boolean;
  placement_fee_flow?: boolean;
  has_paid_i20_control_fee?: boolean;
  has_paid_ds160_package?: boolean;
  has_paid_i539_cos_package?: boolean;
  has_paid_reinstatement_package?: boolean;
  visa_transfer_active?: boolean;
  student_process_type?: string;
  application_status?: string;
  total_applications?: number;
  acceptance_letter_status?: string | null;
  acceptance_letter_url?: string | null;
  transfer_form_status?: string | null;
  sevis_transfer_completed?: boolean;
  visa_approved?: boolean;
  has_sent_docs_to_university?: boolean;
  has_submitted_form?: boolean;
  selected_scholarship_id?: string | null;
  documents_uploaded?: boolean;
}

interface MyStudentsProps {
  students: Student[];
  onRefresh: () => void;
}

// ── Condensed 5-step progress bar ──────────────────────────────────────────
// Maps each summary step to the applicationFlowStages keys used to determine its status
const SUMMARY_STEPS = [
  { label: 'Selection',    keys: ['selection_fee'] as const },
  { label: 'Applying',     keys: ['apply', 'bdp_collection', 'review', 'start_admission'] as const },
  { label: 'Fees',         keys: ['application_fee', 'placement_fee', 'scholarship_fee', 'reinstatement_fee'] as const },
  { label: 'Sending Docs', keys: ['university_docs', 'docs_approval', 'send_docs_to_university'] as const },
  { label: 'Processing',   keys: ['receive_acceptance_letter', 'send_acceptance_letter', 'student_sends_letter', 'sevis_transfer', 'i20_fee', 'visa_approval'] as const },
  { label: 'Admitted',     keys: ['enrollment'] as const },
];

function getStudentRecord(student: Student) {
  return {
    user_id: student.id,
    student_id: student.id,
    application_id: (student as any).application_id || null,
    has_paid_selection_process_fee: !!student.has_paid_selection_process_fee,
    total_applications: student.total_applications || 0,
    application_status: student.application_status || null,
    is_application_fee_paid: !!student.is_application_fee_paid,
    is_scholarship_fee_paid: !!student.is_scholarship_fee_paid,
    has_paid_i20_control_fee: !!student.has_paid_i20_control_fee,
    placement_fee_flow: !!student.placement_fee_flow,
    is_placement_fee_paid: !!student.is_placement_fee_paid,
    acceptance_letter_status: student.acceptance_letter_status || null,
    acceptance_letter_url: student.acceptance_letter_url || null,
    student_process_type: student.student_process_type || null,
    transfer_form_status: student.transfer_form_status || null,
    has_paid_ds160_package: !!student.has_paid_ds160_package,
    has_paid_i539_cos_package: !!student.has_paid_i539_cos_package,
    has_paid_reinstatement_package: !!student.has_paid_reinstatement_package,
    documents_uploaded: !!student.documents_uploaded,
    has_submitted_form: !!student.has_submitted_form,
    selected_scholarship_id: student.selected_scholarship_id || null,
    visa_transfer_active: student.visa_transfer_active ?? null,
    has_sent_docs_to_university: !!student.has_sent_docs_to_university,
    sevis_transfer_completed: !!student.sevis_transfer_completed,
    visa_approved: !!student.visa_approved,
  };
}

// Returns: 'completed' | 'current' | 'pending'
function getSummaryStepState(record: any, stepKeys: readonly string[]): 'completed' | 'current' | 'pending' {
  const statuses = stepKeys.map(k => getStepStatus(record, k as any));
  if (statuses.every(s => s === 'completed' || s === 'skipped')) return 'completed';
  if (statuses.some(s => s === 'in_progress')) return 'current';
  // If any key before this is completed but this group isn't done → current
  return 'pending';
}

function getSummarySteps(student: Student) {
  const record = getStudentRecord(student);
  const results: ('completed' | 'current' | 'pending')[] = [];

  let seenPending = false;
  for (const step of SUMMARY_STEPS) {
    if (seenPending) {
      results.push('pending');
      continue;
    }
    const state = getSummaryStepState(record, step.keys);
    if (state === 'pending') {
      // Mark as current if the previous was completed
      results.push(results.length > 0 && results[results.length - 1] === 'completed' ? 'current' : 'pending');
      seenPending = true;
    } else if (state === 'current') {
      results.push('current');
      seenPending = true;
    } else {
      results.push('completed');
    }
  }

  // If all completed, last one should stay completed
  return results;
}

interface StepProgressProps {
  student: Student;
}

const StepProgress: React.FC<StepProgressProps> = ({ student }) => {
  const states = getSummarySteps(student);

  return (
    <div className="flex items-center gap-0">
      {SUMMARY_STEPS.map((step, i) => {
        const state = states[i];
        const isLast = i === SUMMARY_STEPS.length - 1;

        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center gap-1">
              {/* Circle */}
              <div
                title={`${step.label}: ${state}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                  ${state === 'completed'
                    ? 'bg-slate-800'
                    : state === 'current'
                    ? 'bg-white border-2 border-slate-800 shadow-sm'
                    : 'bg-white border-2 border-slate-200'
                  }`}
              >
                {state === 'completed' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                {state === 'current' && <span className="w-2 h-2 rounded-full bg-slate-800" />}
              </div>
              {/* Label */}
              <span className={`text-[9px] font-medium whitespace-nowrap
                ${state === 'completed' ? 'text-slate-700' : state === 'current' ? 'text-slate-900 font-semibold' : 'text-slate-300'}`}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className={`h-0.5 w-5 flex-shrink-0 mb-3 ${state === 'completed' ? 'bg-slate-800' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────────────

const MyStudents: React.FC<MyStudentsProps> = ({ students, onRefresh }) => {
  const { getFeeAmount } = useFeeConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'revenue'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [studentRealPaidAmounts, setStudentRealPaidAmounts] = useState<Record<string, any>>({});
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [studentDependents, setStudentDependents] = useState<Record<string, number>>({});
  const [studentSystemTypes, setStudentSystemTypes] = useState<Record<string, string>>({});
  const [studentFeeOverrides, setStudentFeeOverrides] = useState<Record<string, any>>({});

  useEffect(() => {
    const ids = Array.from(new Set(students.map(s => s.id).filter(Boolean)));
    ids.forEach(async (userId) => {
      if (studentDependents[userId] !== undefined) return;
      const { data } = await supabase.from('user_profiles').select('dependents, system_type').eq('user_id', userId).single();
      setStudentDependents(prev => ({ ...prev, [userId]: Number(data?.dependents || 0) }));
      setStudentSystemTypes(prev => ({ ...prev, [userId]: data?.system_type || 'legacy' }));
    });
  }, [students]);

  useEffect(() => {
    const ids = Array.from(new Set(students.map(s => s.id).filter(Boolean)));
    ids.forEach(async (userId) => {
      if (studentFeeOverrides[userId] !== undefined) return;
      try {
        const { data } = await supabase.rpc('get_user_fee_overrides', { target_user_id: userId });
        setStudentFeeOverrides(prev => ({ ...prev, [userId]: data || null }));
      } catch {
        setStudentFeeOverrides(prev => ({ ...prev, [userId]: null }));
      }
    });
  }, [students]);

  useEffect(() => {
    const load = async () => {
      const ids = Array.from(new Set(students.map(s => s.id).filter(Boolean)));
      if (!ids.length) { setLoadingRevenue(false); return; }
      setLoadingRevenue(true);
      const map: Record<string, any> = {};
      await Promise.allSettled(ids.map(async (userId) => {
        try { map[userId] = await getDisplayAmounts(userId, ['selection_process', 'placement_fee', 'ds160_package', 'i539_cos_package', 'reinstatement_package']); }
        catch { /* silent */ }
      }));
      setStudentRealPaidAmounts(map);
      setLoadingRevenue(false);
    };
    load();
  }, [students]);

  const calculateRevenue = (student: Student): number => {
    let total = 0;
    const real = studentRealPaidAmounts[student.id] || {};
    const deps = studentDependents[student.id] || 0;
    const systemType = studentSystemTypes[student.id] || 'legacy';
    const ov = studentFeeOverrides[student.id] || {};
    if (student.has_paid_selection_process_fee) {
      if (real.selection_process > 0) total += real.selection_process;
      else {
        const base = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : (Number(getFeeAmount('selection_process')) || (systemType === 'simplified' ? 350 : 400));
        total += ov.selection_process_fee != null ? base : base + deps * 100;
      }
    }
    if (student.student_process_type === 'initial' && student.has_paid_ds160_package) total += real.ds160_package > 0 ? real.ds160_package : 1800;
    if (student.student_process_type === 'change_of_status' && student.has_paid_i539_cos_package) total += real.i539_cos_package > 0 ? real.i539_cos_package : 1800;
    if (student.student_process_type === 'transfer' && (student.has_paid_reinstatement_package || (student as any).has_paid_transfer_fee)) total += real.reinstatement_package > 0 ? real.reinstatement_package : 500;
    if (student.is_placement_fee_paid) total += real.placement_fee > 0 ? real.placement_fee : (ov.placement_fee != null ? Number(ov.placement_fee) : 1500);
    return total;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return students.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
  }, [students]);

  const filtered = useMemo(() => {
    let list = uniqueStudents;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      let av: any = sortBy === 'name' ? (a.full_name || '') : sortBy === 'revenue' ? calculateRevenue(a) : new Date(a.created_at);
      let bv: any = sortBy === 'name' ? (b.full_name || '') : sortBy === 'revenue' ? calculateRevenue(b) : new Date(b.created_at);
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [uniqueStudents, searchTerm, sortBy, sortOrder, studentRealPaidAmounts]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, sortBy, sortOrder]);

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalVolume = useMemo(() => {
    if (loadingRevenue) return 0;
    return uniqueStudents.reduce((s, st) => s + calculateRevenue(st), 0);
  }, [uniqueStudents, loadingRevenue, studentRealPaidAmounts, studentDependents]);

  return (
    <div className="min-h-screen space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Students</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{uniqueStudents.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Sales Volume</p>
            {loadingRevenue
              ? <div className="h-8 w-36 bg-slate-200 rounded animate-pulse mt-1" />
              : <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totalVolume)}</p>}
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${showAdvancedFilters ? 'bg-[#05294E] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button onClick={onRefresh} title="Refresh" className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="border-t border-slate-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E]">
                  <option value="date">Registration Date</option>
                  <option value="name">Name</option>
                  <option value="revenue">Sales Volume</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <div className="flex gap-2">
                  <button onClick={() => setSortOrder('desc')} className={`px-3 py-2 rounded-lg transition-colors ${sortOrder === 'desc' ? 'bg-[#05294E] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><TrendingDown className="h-4 w-4" /></button>
                  <button onClick={() => setSortOrder('asc')} className={`px-3 py-2 rounded-lg transition-colors ${sortOrder === 'asc' ? 'bg-[#05294E] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><TrendingUp className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-slate-600">
          <span className="font-medium">{filtered.length}</span> student{filtered.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {paginated.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Progress</th>
                    <th className="px-5 py-3 font-semibold">Registration</th>
                    <th className="px-5 py-3 font-semibold">Sales Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((student, idx) => {
                    const isActive = !!student.has_paid_selection_process_fee;
                    const revenue = calculateRevenue(student);

                    return (
                      <tr key={`${student.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                        {/* Student */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                              <span className={`text-xs font-bold ${isActive ? 'text-emerald-700' : 'text-orange-600'}`}>
                                {(student.full_name || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate max-w-[160px]">{student.full_name || 'No name'}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[160px]">{student.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="px-5 py-4">
                          <StudentStepProgress student={student} />
                        </td>

                        {/* Registration */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs whitespace-nowrap">{formatDate(student.created_at)}</span>
                          </div>
                        </td>

                        {/* Sales Volume */}
                        <td className="px-5 py-4">
                          {isActive ? (
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                              {loadingRevenue
                                ? <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                                : <span className="font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(revenue)}</span>}
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
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              {searchTerm ? 'No students found' : 'No referred students yet'}
            </h3>
            <p className="text-sm text-slate-500">
              {searchTerm ? 'Try a different search term.' : 'Share your referral code to get started!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStudents;
