import React, { useState, useEffect } from 'react';
import { Award, BarChart3, Users, DollarSign, GraduationCap, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useMatriculaRewardsStats, usePayouts, useStudentsData } from '../../hooks/useMatriculaRewards';
import { convertToCSV } from '../../utils/rewardsUtils';
import OverviewTab from '../../components/AdminDashboard/rewards/OverviewTab';
import ReferralsTab from '../../components/AdminDashboard/rewards/ReferralsTab';
import PayoutsTab from '../../components/AdminDashboard/rewards/PayoutsTab';
import StudentsTab from '../../components/AdminDashboard/rewards/StudentsTab';

type Tab = 'overview' | 'referrals' | 'payouts' | 'students';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'referrals', label: 'Referrals', icon: Users },
  { id: 'payouts', label: 'Payout Requests', icon: DollarSign },
  { id: 'students', label: 'Students', icon: GraduationCap },
];

const DATE_PILLS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

const MatriculaRewardsAdmin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState('all');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { stats, loading, error: statsError, reload } = useMatriculaRewardsStats(dateRange, user?.id, user?.role);
  const payoutsHook = usePayouts(user?.id, setGlobalError);
  const studentsHook = useStudentsData(dateRange, setGlobalError);

  const error = statsError || globalError;

  useEffect(() => {
    if (activeTab === 'payouts') void payoutsHook.load();
    if (activeTab === 'students') void studentsHook.load();
  }, [activeTab]);

  const tabBadges: Record<Tab, number | null> = {
    overview: null,
    referrals: stats?.totalReferrals ?? 0,
    payouts: payoutsHook.payouts.length,
    students: stats?.totalUsers ?? 0,
  };

  const handleExportData = async () => {
    try {
      const { data, error } = await supabase.rpc('export_matricula_rewards_data', { date_range: dateRange });
      if (error) throw error;
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
      setGlobalError('Failed to export data');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center">
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
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading rewards dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-[#1A1A2E] flex items-center gap-2">
                <Award className="h-5 w-5 text-[#C9963F]" />
                Matricula Rewards
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Program analytics & payout management</p>
              {error && (
                <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Date range pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {DATE_PILLS.map(pill => (
                  <button
                    key={pill.value}
                    onClick={() => setDateRange(pill.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      dateRange === pill.value
                        ? 'bg-[#05294E] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <button
                onClick={reload}
                className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-sm"
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleExportData}
                className="bg-[#05294E] text-white px-3 py-1.5 rounded-lg hover:bg-[#102336] transition-colors flex items-center gap-1.5 text-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <nav className="-mb-px flex space-x-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const badge = tabBadges[tab.id];
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'border-[#05294E] text-[#05294E]'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {badge !== null && badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                      isActive
                        ? 'bg-[#05294E]/10 text-[#05294E]'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {badge.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && stats && <OverviewTab stats={stats} />}
        {activeTab === 'referrals' && stats && <ReferralsTab referralList={stats.referralList} />}
        {activeTab === 'payouts' && (
          <PayoutsTab
            payouts={payoutsHook.payouts}
            loadingPayouts={payoutsHook.loadingPayouts}
            showRejectModal={payoutsHook.showRejectModal}
            setShowRejectModal={payoutsHook.setShowRejectModal}
            showMarkPaidModal={payoutsHook.showMarkPaidModal}
            setShowMarkPaidModal={payoutsHook.setShowMarkPaidModal}
            selectedPayoutId={payoutsHook.selectedPayoutId}
            setSelectedPayoutId={payoutsHook.setSelectedPayoutId}
            rejectReason={payoutsHook.rejectReason}
            setRejectReason={payoutsHook.setRejectReason}
            paymentReference={payoutsHook.paymentReference}
            setPaymentReference={payoutsHook.setPaymentReference}
            approve={payoutsHook.approve}
            markPaid={payoutsHook.markPaid}
            reject={payoutsHook.reject}
          />
        )}
        {activeTab === 'students' && (
          <StudentsTab
            students={studentsHook.students}
            loadingStudents={studentsHook.loadingStudents}
          />
        )}
      </div>
    </div>
  );
};

export default MatriculaRewardsAdmin;
