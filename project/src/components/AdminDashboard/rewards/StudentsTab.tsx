import React, { useState, useEffect, useMemo } from 'react';
import { GraduationCap, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { formatActivityDate } from '../../../utils/rewardsUtils';
import PaginationControls from './PaginationControls';

const isProductionHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'matriculausa.com' || window.location.hostname === 'www.matriculausa.com');

interface Props {
  students: any[];
  loadingStudents: boolean;
}

type SortKey = 'full_name' | 'total_referrals' | 'total_earnings' | 'total_spent' | 'current_balance' | 'last_activity';
type SortDir = 'asc' | 'desc';

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-[#05294E] ml-1 inline" />
    : <ChevronDown className="h-3.5 w-3.5 text-[#05294E] ml-1 inline" />;
}

const StudentsTab: React.FC<Props> = ({ students, loadingStudents }) => {
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentFilters, setStudentFilters] = useState({
    affiliateCodeStatus: 'all',
    balanceRange: 'all',
    referralRange: 'all',
    activityRange: 'all',
  });
  const [sortKey, setSortKey] = useState<SortKey>('current_balance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentStudentsPage, setCurrentStudentsPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(15);

  useEffect(() => { setCurrentStudentsPage(1); }, [studentSearchTerm, studentFilters.affiliateCodeStatus, studentFilters.balanceRange, studentFilters.referralRange, studentFilters.activityRange, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const isTest = (student.user_email || '').toLowerCase().includes('uorak');
      if (isProductionHost && isTest) return false;

      const searchLower = studentSearchTerm.toLowerCase();
      const matchesSearch = !studentSearchTerm ||
        (student.full_name && student.full_name.toLowerCase().includes(searchLower)) ||
        (student.user_email && student.user_email.toLowerCase().includes(searchLower)) ||
        (student.affiliate_code && student.affiliate_code.toLowerCase().includes(searchLower));

      const hasAffiliateCode = !!student.affiliate_code;
      const matchesAffiliateCodeStatus = studentFilters.affiliateCodeStatus === 'all' ||
        (studentFilters.affiliateCodeStatus === 'has_code' && hasAffiliateCode) ||
        (studentFilters.affiliateCodeStatus === 'no_code' && !hasAffiliateCode);

      const currentBalance = Number(student.current_balance || 0);
      let matchesBalanceRange = true;
      if (studentFilters.balanceRange === 'positive') matchesBalanceRange = currentBalance > 0;
      else if (studentFilters.balanceRange === 'zero') matchesBalanceRange = currentBalance === 0;
      else if (studentFilters.balanceRange === 'high') matchesBalanceRange = currentBalance > 1000;

      const totalReferrals = Number(student.total_referrals || 0);
      let matchesReferralRange = true;
      if (studentFilters.referralRange === 'none') matchesReferralRange = totalReferrals === 0;
      else if (studentFilters.referralRange === 'low') matchesReferralRange = totalReferrals >= 1 && totalReferrals <= 5;
      else if (studentFilters.referralRange === 'medium') matchesReferralRange = totalReferrals >= 6 && totalReferrals <= 20;
      else if (studentFilters.referralRange === 'high') matchesReferralRange = totalReferrals > 20;

      const lastActivityDate = student.last_activity ? new Date(student.last_activity) : null;
      let matchesActivityRange = true;
      if (studentFilters.activityRange === '7d') matchesActivityRange = lastActivityDate ? lastActivityDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false;
      else if (studentFilters.activityRange === '30d') matchesActivityRange = lastActivityDate ? lastActivityDate >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false;
      else if (studentFilters.activityRange === '90d') matchesActivityRange = lastActivityDate ? lastActivityDate >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) : false;
      else if (studentFilters.activityRange === '1y') matchesActivityRange = lastActivityDate ? lastActivityDate >= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) : false;

      return matchesSearch && matchesAffiliateCodeStatus && matchesBalanceRange && matchesReferralRange && matchesActivityRange;
    });
  }, [students, studentSearchTerm, studentFilters]);

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortKey === 'full_name') { aVal = a.full_name || ''; bVal = b.full_name || ''; }
      else if (sortKey === 'last_activity') { aVal = a.last_activity ? new Date(a.last_activity).getTime() : 0; bVal = b.last_activity ? new Date(b.last_activity).getTime() : 0; }
      else { aVal = Number(a[sortKey] || 0); bVal = Number(b[sortKey] || 0); }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredStudents, sortKey, sortDir]);

  const topPerformers = useMemo(() => {
    return [...students]
      .filter(s => Number(s.current_balance || 0) > 0 && !(isProductionHost && (s.user_email || '').toLowerCase().includes('uorak')))
      .sort((a, b) => Number(b.current_balance || 0) - Number(a.current_balance || 0))
      .slice(0, 3);
  }, [students]);

  const totalStudentsPages = Math.ceil(sortedStudents.length / studentsPerPage);
  const studentsStartIndex = (currentStudentsPage - 1) * studentsPerPage;
  const studentsEndIndex = studentsStartIndex + studentsPerPage;
  const paginatedStudents = sortedStudents.slice(studentsStartIndex, studentsEndIndex);

  const colHeader = (label: string, key: SortKey) => (
    <th
      className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600"
      onClick={() => handleSort(key)}
    >
      {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  const colHeaderRight = (label: string, key: SortKey) => (
    <th
      className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600"
      onClick={() => handleSort(key)}
    >
      {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1A1A2E]">Students</h3>
          <p className="text-sm text-slate-500 mt-0.5">{students.length} students in the Matricula Rewards program</p>
        </div>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topPerformers.map((s, idx) => (
            <div key={s.user_email || idx} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#05294E] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{getInitials(s.full_name || '?')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#1A1A2E] truncate">{s.full_name || 'Unknown'}</div>
                {s.affiliate_code && (
                  <div className="font-mono text-[10px] text-slate-400 mt-0.5">{s.affiliate_code}</div>
                )}
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xl font-bold tabular-nums text-[#C9963F]">{Number(s.current_balance || 0).toLocaleString()}</span>
                  <span className="text-xs text-[#C9963F]/60">coins</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{Number(s.total_referrals || 0)} referrals</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              placeholder="Search by name, email, or affiliate code..."
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
            />
            {studentSearchTerm && (
              <button onClick={() => setStudentSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            <span className="font-semibold">{sortedStudents.length}</span> of {students.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          {[
            { label: 'Affiliate Code', key: 'affiliateCodeStatus', options: [['all', 'All'], ['has_code', 'Has Code'], ['no_code', 'No Code']] },
            { label: 'Balance', key: 'balanceRange', options: [['all', 'All'], ['positive', 'Positive'], ['zero', 'Zero'], ['high', '>1000']] },
            { label: 'Referrals', key: 'referralRange', options: [['all', 'All'], ['none', 'None'], ['low', '1–5'], ['medium', '6–20'], ['high', '>20']] },
            { label: 'Activity', key: 'activityRange', options: [['all', 'All Time'], ['7d', '7d'], ['30d', '30d'], ['90d', '90d'], ['1y', '1y']] },
          ].map(({ label, key, options }) => (
            <div key={key} className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-500">{label}:</label>
              <select
                value={studentFilters[key as keyof typeof studentFilters]}
                onChange={(e) => setStudentFilters(prev => ({ ...prev, [key]: e.target.value }))}
                className="px-2 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              >
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          <button
            onClick={() => { setStudentFilters({ affiliateCodeStatus: 'all', balanceRange: 'all', referralRange: 'all', activityRange: 'all' }); setStudentSearchTerm(''); }}
            className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {loadingStudents ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E] mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">Loading students...</p>
          </div>
        </div>
      ) : sortedStudents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
          <GraduationCap className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">
            {students.length === 0 ? 'No students yet' : 'No students match your filters'}
          </p>
          <p className="text-xs text-slate-400">
            {students.length === 0 ? 'Students will appear here once they join the program' : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {colHeader('Student', 'full_name')}
                    <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Code</th>
                    {colHeaderRight('Referrals', 'total_referrals')}
                    {colHeaderRight('Earned', 'total_earnings')}
                    {colHeaderRight('Spent', 'total_spent')}
                    {colHeaderRight('Balance', 'current_balance')}
                    {colHeaderRight('Last Active', 'last_activity')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.map((student, idx) => {
                    const isTest = (student.user_email || '').toLowerCase().includes('uorak');
                    const balance = Number(student.current_balance || 0);
                    return (
                      <tr key={`${student.user_email || student.full_name || 'student'}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-slate-500">
                              {getInitials(student.full_name || '?')}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-[#1A1A2E]">{student.full_name || 'Student'}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                {student.user_email || ''}
                                {isTest && !isProductionHost && (
                                  <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-600">test</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {student.affiliate_code ? (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{student.affiliate_code}</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-700">{Number(student.total_referrals || 0).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-700">{Number(student.total_earnings || 0).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-500">{Number(student.total_spent || 0).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`text-sm font-semibold tabular-nums ${balance > 0 ? 'text-[#C9963F]' : 'text-slate-400'}`}>
                            {balance > 0 ? `🪙 ${balance.toLocaleString()}` : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-slate-400">{formatActivityDate(student.last_activity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {sortedStudents.length > 0 && (
            <PaginationControls
              currentPage={currentStudentsPage}
              totalPages={totalStudentsPages}
              startIndex={studentsStartIndex}
              endIndex={studentsEndIndex}
              totalItems={sortedStudents.length}
              itemsPerPage={studentsPerPage}
              itemsPerPageOptions={[15, 25, 50, 100]}
              itemLabel="students"
              onPrev={() => setCurrentStudentsPage(p => Math.max(p - 1, 1))}
              onNext={() => setCurrentStudentsPage(p => Math.min(p + 1, totalStudentsPages))}
              onPageClick={setCurrentStudentsPage}
              onItemsPerPageChange={(n) => { setStudentsPerPage(n); setCurrentStudentsPage(1); }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default StudentsTab;
