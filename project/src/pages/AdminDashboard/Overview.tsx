import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  Users, 
  Award, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Eye,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  XCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UniversityPaymentRequestService } from '../../services/UniversityPaymentRequestService';
import { AffiliatePaymentRequestService } from '../../services/AffiliatePaymentRequestService';
import PendingPaymentsSummary from '../../components/AdminDashboard/PendingPaymentsSummary';

interface OverviewProps {
  stats: {
    totalUniversities: number;
    pendingUniversities: number;
    approvedUniversities: number;
    totalStudents: number;
    totalScholarships: number;
    totalApplications: number;
    totalFunding: number;
    monthlyGrowth: number;
  };
  universities: any[];
  users: any[];
  applications: any[];
  error: string | null;
  onApprove?: (universityId: string) => void;
  onReject?: (universityId: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ stats, universities, users, error, onApprove, onReject }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [universityRequestsCount, setUniversityRequestsCount] = useState(0);
  const [affiliateRequestsCount, setAffiliateRequestsCount] = useState(0);
  const [zellePaymentsCount, setZellePaymentsCount] = useState(0);
  const [universityRequestsAmount, setUniversityRequestsAmount] = useState(0);
  const [affiliateRequestsAmount, setAffiliateRequestsAmount] = useState(0);
  const [zellePaymentsAmount, setZellePaymentsAmount] = useState(0);
  
  const UNIVERSITIES_PER_PAGE = 4; // Reduzido para caber melhor no layout compacto
  
  // Carregar dados de pagamentos pendentes
  useEffect(() => {
    const loadPendingPaymentsCounts = async () => {
      try {
        setLoadingPayments(true);
        
        // Carregar University Payment Requests
        try {
          const universityRequests = await UniversityPaymentRequestService.listAllPaymentRequests();
          const pendingUniversity = universityRequests.filter(r => r.status === 'pending');
          setUniversityRequestsCount(pendingUniversity.length);
          setUniversityRequestsAmount(pendingUniversity.reduce((sum, r) => sum + (r.amount_usd || 0), 0));
        } catch (error) {
          console.error('Error loading university requests:', error);
          setUniversityRequestsCount(0);
          setUniversityRequestsAmount(0);
        }

        // Carregar Affiliate Payment Requests
        try {
          const affiliateRequests = await AffiliatePaymentRequestService.listAllPaymentRequests();
          const pendingAffiliate = affiliateRequests.filter(r => r.status === 'pending');
          setAffiliateRequestsCount(pendingAffiliate.length);
          setAffiliateRequestsAmount(pendingAffiliate.reduce((sum, r) => sum + (r.amount_usd || 0), 0));
        } catch (error) {
          console.error('Error loading affiliate requests:', error);
          setAffiliateRequestsCount(0);
          setAffiliateRequestsAmount(0);
        }

        // Carregar Zelle Payments
        try {
          const { data: zellePaymentsData, error: zelleError } = await supabase
            .from('zelle_payments')
            .select('*')
            .eq('status', 'pending_verification')
            .gt('amount', 0);

          if (zelleError) {
            console.error('Error loading zelle payments:', zelleError);
            setZellePaymentsCount(0);
            setZellePaymentsAmount(0);
          } else {
            setZellePaymentsCount(zellePaymentsData?.length || 0);
            setZellePaymentsAmount(zellePaymentsData?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0);
          }
        } catch (error) {
          console.error('Error loading zelle payments:', error);
          setZellePaymentsCount(0);
          setZellePaymentsAmount(0);
        }
      } finally {
        setLoadingPayments(false);
      }
    };

    loadPendingPaymentsCounts();
  }, []);

  // Filtrar universidades pendentes
  const pendingUniversities = universities.filter(u => !u.is_approved);
  
  // Calcular paginação
  const totalPages = Math.ceil(pendingUniversities.length / UNIVERSITIES_PER_PAGE);
  const startIndex = (currentPage - 1) * UNIVERSITIES_PER_PAGE;
  const currentUniversities = pendingUniversities.slice(startIndex, startIndex + UNIVERSITIES_PER_PAGE);

  const handleApprove = (universityId: string) => {
    if (onApprove) {
      onApprove(universityId);
    } else {
      console.log('Approve university:', universityId);
    }
  };

  const handleReject = (universityId: string) => {
    if (onReject) {
      onReject(universityId);
    } else {
      console.log('Reject university:', universityId);
    }
  };

  const quickActions = [
    {
      title: 'Approve Universities',
      description: 'Review pending university applications',
      icon: Building,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/admin/dashboard/universities',
      count: stats.pendingUniversities
    },
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: Users,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      link: '/admin/dashboard/users',
      count: users.length
    },
    {
      title: 'Monitor Scholarships',
      description: 'Track scholarship programs',
      icon: Award,
      color: 'bg-[#05294E]',
      link: '/admin/dashboard/scholarships',
      count: stats.totalScholarships
    }
  ];

  return (
    <div className="space-y-8">
      {/* Error Alert */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-medium text-yellow-800">System Notice</h3>
              <p className="text-sm text-yellow-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Universities</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalUniversities}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+{stats.monthlyGrowth}% this month</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Building className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-slate-900">{users.length}</p>
              <div className="flex items-center mt-2">
                <Users className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">{stats.totalStudents} students</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Scholarships</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalScholarships}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-[#05294E] to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Award className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Applications</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalApplications}</p>
              <div className="flex items-center mt-2">
                <FileText className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">Active submissions</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={index}
              to={action.link}
              className="group block p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-slate-900 mr-2">{action.count}</span>
                  <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{action.title}</h3>
              <p className="text-slate-600 text-sm">{action.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Pending Approvals Section - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Payment Approvals - 2/3 width */}
        <div className="lg:col-span-2">
          <PendingPaymentsSummary
            universityRequestsCount={universityRequestsCount}
            affiliateRequestsCount={affiliateRequestsCount}
            zellePaymentsCount={zellePaymentsCount}
            universityRequestsAmount={universityRequestsAmount}
            affiliateRequestsAmount={affiliateRequestsAmount}
            zellePaymentsAmount={zellePaymentsAmount}
            loading={loadingPayments}
          />
        </div>
        
        {/* Pending University Approvals - 1/3 width */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Pending University Approvals</h3>
                  <p className="text-slate-500 text-sm">
                    {pendingUniversities.length} universit{pendingUniversities.length !== 1 ? 'ies' : 'y'} awaiting review
                  </p>
                </div>
                <Link
                  to="/admin/dashboard/universities"
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center"
                >
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {pendingUniversities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">All caught up!</h3>
                  <p className="text-slate-500">No universities pending approval</p>
                </div>
              ) : (
                <>
                  {/* Lista de universidades - mais compacta */}
                  <div className="space-y-4 mb-6">
                    {currentUniversities.map((university) => (
                      <div 
                        key={university.id} 
                        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all duration-300 group"
                      >
                        {/* Header compacto */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                              <Building className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-purple-600 transition-colors">
                                {university.name}
                              </h4>
                              <p className="text-xs text-slate-500 truncate">
                                {university.location || 'Location not provided'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Review
                          </span>
                        </div>

                        {/* Ações compactas */}
                        <div className="flex items-center justify-between">
                          <button 
                            onClick={() => handleApprove(university.id)}
                            className="flex items-center px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </button>
                          
                          <div className="flex items-center space-x-1">
                            <button 
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={() => handleReject(university.id)}
                              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                      <div className="text-sm text-slate-600">
                        Showing {startIndex + 1}-{Math.min(startIndex + UNIVERSITIES_PER_PAGE, pendingUniversities.length)} of {pendingUniversities.length} universities
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Previous Page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        
                        <span className="px-4 py-2 text-sm font-medium text-slate-900">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Next Page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;