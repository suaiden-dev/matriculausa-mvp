import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  CheckCircle, 
  DollarSign, 
  Users, 
  Settings, 
  Eye, 
  Edit,
  TrendingUp,
  Calendar,
  Target,
  Zap,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  PlusCircle,
  Home,
  Wallet
} from 'lucide-react';
import { useUniversity } from '../../context/UniversityContext';
import { useAuth } from '../../hooks/useAuth';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const Overview: React.FC = () => {
  const { university, scholarships, applications } = useUniversity();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;
  
  // Financial data state
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [loadingFinancial, setLoadingFinancial] = useState<boolean>(true);

  // Calculate stats
  const stats = {
    totalScholarships: scholarships.length,
    activeScholarships: scholarships.filter(s => s.is_active).length,
    totalFunding: scholarships.reduce((sum, s) => sum + Number(s.amount), 0),
    avgAmount: scholarships.length > 0 ? scholarships.reduce((sum, s) => sum + Number(s.amount), 0) / scholarships.length : 0
  };

  // Load financial data
  useEffect(() => {
    const loadFinancialData = async () => {
      if (!university?.id || !user?.id) {
        setLoadingFinancial(false);
        return;
      }

      try {
        setLoadingFinancial(true);

        // Buscar todas as universidades do usuário
        const { data: userUniversities } = await supabase
          .from('universities')
          .select('id')
          .eq('user_id', user.id);

        const universityIds = (userUniversities || []).map(u => u.id);
        if (universityIds.length === 0) {
          setTotalBalance(0);
          setTotalAvailable(0);
          setLoadingFinancial(false);
          return;
        }

        // Buscar payment requests
        const { data: allRequests } = await supabase
          .from('university_payout_requests')
          .select('status, amount_usd')
          .in('university_id', universityIds)
          .eq('request_type', 'university_payment');

        const totalPaidOut = (allRequests || [])
          .filter((r: any) => r.status === 'paid')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);

        const totalApproved = (allRequests || [])
          .filter((r: any) => r.status === 'approved')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);

        const totalPending = (allRequests || [])
          .filter((r: any) => r.status === 'pending')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);

        // Buscar aplicações pagas
        const { data: paidApplications } = await supabase
          .from('scholarship_applications')
          .select(`
            scholarship_id,
            student_id,
            scholarships!inner(
              university_id,
              application_fee_amount
            )
          `)
          .eq('is_application_fee_paid', true)
          .in('scholarships.university_id', universityIds);

        // Buscar dependentes dos estudantes
        const studentIds = Array.from(new Set((paidApplications || []).map((a: any) => a.student_id).filter(Boolean)));
        let studentsMap: Record<string, any> = {};
        if (studentIds.length > 0) {
          const { data: students } = await supabase
            .from('user_profiles')
            .select('id, dependents, system_type')
            .in('id', studentIds);
          (students || []).forEach((s: any) => { studentsMap[s.id] = s; });
        }

        // Calcular receita total de application fees (incluindo dependentes)
        const totalApplicationFeeRevenue = (paidApplications || []).reduce((sum: number, app: any) => {
          const feeAmount = Number(app.scholarships?.application_fee_amount || 0);
          const s = studentsMap[app.student_id];
          const deps = Number(s?.dependents) || 0;
          const withDeps = deps > 0 ? feeAmount + deps * 100 : feeAmount;
          return sum + withDeps;
        }, 0);

        // Total Balance = receita total
        setTotalBalance(totalApplicationFeeRevenue);

        // Total Available = receita total - payment requests (paid + approved + pending)
        const availableBalance = Math.max(0, totalApplicationFeeRevenue - totalPaidOut - totalApproved - totalPending);
        setTotalAvailable(availableBalance);
      } catch (error) {
        console.error('Error loading financial data:', error);
        setTotalBalance(0);
        setTotalAvailable(0);
      } finally {
        setLoadingFinancial(false);
      }
    };

    loadFinancialData();
  }, [university?.id, user?.id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const quickActions = [
    {
      title: 'New Scholarship',
      description: 'Create a new scholarship opportunity',
      icon: Award,
      color: 'bg-gradient-to-r from-[#D0151C] to-red-600',
      link: '/school/dashboard/scholarship/new',
      enabled: university?.profile_completed
    },
    {
      title: 'Edit Profile',
      description: 'Update university information',
      icon: Edit,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/school/dashboard/profile',
      enabled: true
    },
    {
      title: 'View Applicants',
      description: 'Track student applications',
      icon: Users,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      link: '/school/dashboard/students',
      enabled: false
    }
  ];

  const renderApplicationsPanel = () => {
    // Calculate pagination
    const totalPages = Math.ceil(applications.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentApplications = applications.slice(startIndex, endIndex);

    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 mt-6 sm:mt-8 lg:mt-10">
        <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">Applications Received</h3>
          <p className="text-slate-500 text-xs sm:text-sm">Track all student applications for your scholarships</p>
        </div>
        <div className="p-4 sm:p-5 lg:p-6">
          {applications.length === 0 ? (
            <div className="text-slate-500 text-center py-6 sm:py-8 text-sm sm:text-base">No applications received yet.</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {currentApplications.map((app) => (
                  <div key={app.id} className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-900 text-sm truncate">
                        {app.user_profiles?.full_name || app.user_profiles?.email || 'Unknown'}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'approved' ? 'bg-green-100 text-green-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{app.scholarships?.title || '-'}</p>
                    <div className="flex justify-end">
                      <Link 
                        to={`/school/dashboard/student/${app.id}`} 
                        className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 lg:px-4 py-2 text-left text-xs lg:text-sm font-medium text-slate-600">Student</th>
                      <th className="px-3 lg:px-4 py-2 text-left text-xs lg:text-sm font-medium text-slate-600">Scholarship</th>
                      <th className="px-3 lg:px-4 py-2 text-left text-xs lg:text-sm font-medium text-slate-600">Status</th>
                      <th className="px-3 lg:px-4 py-2 text-left text-xs lg:text-sm font-medium text-slate-600">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50">
                        <td className="px-3 lg:px-4 py-2 text-xs lg:text-sm">
                          <div className="max-w-xs truncate">
                            {app.user_profiles?.full_name || app.user_profiles?.email || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 py-2 text-xs lg:text-sm">
                          <div className="max-w-xs truncate">
                            {app.scholarships?.title || '-'}
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 py-2 text-xs lg:text-sm">
                          <span className={`inline-flex items-center px-2 py-1 lg:px-2.5 lg:py-0.5 rounded-full text-xs font-medium ${
                            app.status === 'approved' ? 'bg-green-100 text-green-800' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-2 text-xs lg:text-sm">
                          <Link 
                            to={`/school/dashboard/student/${app.id}`} 
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 sm:mt-6 gap-3">
                  <p className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                    Showing {startIndex + 1} to {Math.min(endIndex, applications.length)} of {applications.length} applications
                  </p>
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium rounded-lg ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to access the dashboard"
      description="Finish setting up your university profile to view analytics, manage scholarships, and connect with students"
    >
      <div className="space-y-6 lg:space-y-8">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">Total Scholarships</p>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-slate-900 truncate">{stats.totalScholarships}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-green-600 truncate">+12% this month</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-gradient-to-br from-[#05294E] to-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">Active Scholarships</p>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-slate-900 truncate">{stats.activeScholarships}</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-green-600 truncate">Available</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">Total Available</p>
              {loadingFinancial ? (
                <div className="h-6 sm:h-8 lg:h-10 bg-slate-200 rounded animate-pulse mb-2"></div>
              ) : (
                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-slate-900 truncate">{formatCurrency(totalAvailable)}</p>
              )}
              <div className="flex items-center mt-2">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-green-600 truncate">Available to request</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">Total Balance</p>
              {loadingFinancial ? (
                <div className="h-6 sm:h-8 lg:h-10 bg-slate-200 rounded animate-pulse mb-2"></div>
              ) : (
                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-slate-900 truncate">{formatCurrency(totalBalance)}</p>
              )}
              <div className="flex items-center mt-2">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mr-1 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-blue-600 truncate">Total revenue</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={index}
              to={action.enabled ? action.link : '#'}
              className={`group block p-4 sm:p-5 lg:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden ${
                !action.enabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'
              }`}
              onClick={(e) => !action.enabled && e.preventDefault()}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                {action.enabled ? (
                  <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                ) : (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-medium">Coming Soon</span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-sm sm:text-base">{action.title}</h3>
              <p className="text-slate-600 text-xs sm:text-sm">{action.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Recent Scholarships */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200">
            <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Recent Scholarships</h3>
                  <p className="text-slate-500 text-xs sm:text-sm">Manage your scholarship opportunities</p>
                </div>

              </div>
            </div>
            
            <div className="p-4 sm:p-5 lg:p-6">
              {!university?.profile_completed ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Settings className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">Complete your profile first</h3>
                  <p className="text-slate-500 mb-4 sm:mb-6 text-sm sm:text-base px-4">Set up your university profile to start creating scholarships</p>
                  <Link
                    to="/school/setup-profile"
                    className="bg-gradient-to-r from-[#05294E] to-blue-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl hover:from-[#05294E]/90 hover:to-blue-600 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                  >
                    Complete Profile
                  </Link>
                </div>
              ) : scholarships.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Award className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">No scholarships yet</h3>
                  <p className="text-slate-500 mb-4 sm:mb-6 text-sm sm:text-base px-4">Start by creating your first scholarship opportunity</p>
                  <Link
                    to="/school/dashboard/scholarship/new" 
                    className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl hover:from-[#B01218] hover:to-red-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                  >
                    Create First Scholarship
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {scholarships.slice(0, 5).map((scholarship) => (
                    <div key={scholarship.id} className="group flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center justify-between p-3 sm:p-4 lg:p-5 bg-slate-50 hover:bg-slate-100 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${
                          scholarship.is_active 
                            ? 'bg-gradient-to-br from-green-500 to-green-600' 
                            : 'bg-gradient-to-br from-slate-400 to-slate-500'
                        }`}>
                          <Award className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 mb-1 truncate group-hover:text-[#05294E] transition-colors text-sm sm:text-base">
                            {scholarship.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
                            <div className="flex items-center">
                              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{formatCurrency(Number(scholarship.annual_value_with_scholarship ?? 0))}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{new Date(scholarship.deadline).toLocaleDateString()}</span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium ${
                              scholarship.is_active 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {scholarship.is_active ? (
                                <>
                                  <Zap className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Inactive
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {scholarships.length > 5 && (
                    <div className="pt-4 border-t border-slate-200">
                      <Link
                        to="/school/dashboard/scholarships"
                        className="block text-center text-[#05294E] hover:text-[#05294E]/80 font-medium py-3 hover:bg-slate-50 rounded-xl transition-all duration-300 text-sm sm:text-base"
                      >
                        View all scholarships ({scholarships.length})
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status & Tips */}
        <div className="space-y-4 sm:space-y-6">
          {/* Profile Status */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Profile Status</h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-700">Basic information</span>
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-700">Profile complete</span>
                {university?.profile_completed ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-700">Team approval</span>
                {university?.is_approved ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                )}
              </div>
            </div>

            {(!university?.profile_completed || !university?.is_approved) && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg sm:rounded-xl border border-orange-200">
                <p className="text-xs sm:text-sm font-medium text-orange-800 mb-2">
                  {!university?.profile_completed 
                    ? 'Complete your profile to unlock all features'
                    : 'Your profile is being reviewed by our team'
                  }
                </p>
                {!university?.profile_completed && (
                  <Link
                    to="/school/setup-profile"
                    className="text-xs sm:text-sm font-bold text-orange-700 hover:text-orange-800 transition-colors"
                  >
                    Complete now →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-[#05294E] to-blue-700 rounded-xl sm:rounded-2xl shadow-lg text-white p-4 sm:p-5 lg:p-6">
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">💡 Success Tips</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100">
                  Scholarships with attractive amounts receive 3x more applications
                </p>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100">
                  Detailed descriptions increase the quality of candidates
                </p>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100">
                  Respond quickly to applications to maintain engagement
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderApplicationsPanel()}
      </div>
    </ProfileCompletionGuard>
  );
};

export default Overview;