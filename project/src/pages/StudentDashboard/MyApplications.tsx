import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Building, 
  Eye, 
  Search,
  Award,
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, Scholarship } from '../../types';
import { StripeCheckout } from '../../components/StripeCheckout';
import StudentDashboardLayout from "./StudentDashboardLayout";
import CustomLoading from '../../components/CustomLoading';

// Combine os tipos para incluir os detalhes da bolsa na aplicação
type ApplicationWithScholarship = Application & {
  scholarships: Scholarship | null;
};

const MyApplications: React.FC = () => {
  const { user, userProfile, refetchUserProfile } = useAuth();
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setUserProfileId(userProfile?.id || null);
    // Iniciar polling apenas se a application fee ainda não foi paga
    if (userProfile && userProfile.is_application_fee_paid) {
      setIsPolling(false);
    } else {
      setIsPolling(true);
    }
  }, [userProfile?.id, userProfile?.is_application_fee_paid]);

  useEffect(() => {
    let isMounted = true;
    const fetchApplications = async (showLoading = false) => {
      if (showLoading && isFirstLoad) setLoading(true);
      try {
        if (!userProfileId) {
          if (isMounted) setApplications([]);
          if (showLoading && isFirstLoad) setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('scholarship_applications')
          .select(`*, scholarships(*, universities!inner(id, name, logo_url, location, is_approved))`)
          .eq('student_id', userProfileId)
          .order('created_at', { ascending: false });
        if (error) {
          if (isMounted) setError('Erro ao buscar aplicações.');
        } else {
          if (isMounted) setApplications(data || []);
        }
      } catch (err) {
        if (isMounted) setError('Erro inesperado ao buscar aplicações.');
      }
      if (showLoading && isFirstLoad) setLoading(false);
      if (isFirstLoad) setIsFirstLoad(false);
    };
    if (userProfileId) fetchApplications(true);

    // Polling eficiente: só roda enquanto isPolling for true
    let interval: NodeJS.Timeout | null = null;
    if (isPolling) {
      interval = setInterval(async () => {
        if (userProfileId) {
          await refetchUserProfile();
          fetchApplications(false);
        }
      }, 1000);
    }
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [userProfileId, refetchUserProfile, isPolling]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('from') === 'payment-success') {
      // Força o refetch dos dados
      setLoading(true);
      setError(null);
      const fetchApplications = async () => {
        try {
          if (!userProfile?.id) {
            setApplications([]);
            setLoading(false);
            return;
          }
          const { data, error } = await supabase
            .from('scholarship_applications')
            .select(`*, scholarships(*, universities!inner(id, name, logo_url, location, is_approved))`)
            .eq('student_id', userProfile.id)
            .order('created_at', { ascending: false });
          if (error) {
            setError('Erro ao buscar aplicações.');
          } else {
            setApplications(data || []);
          }
        } catch (err) {
          setError('Erro inesperado ao buscar aplicações.');
        }
        setLoading(false);
      };
      fetchApplications();
      // Remove o parâmetro da URL para evitar loops
      params.delete('from');
      window.history.replaceState({}, '', `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
    }
  }, [location.search, userProfile]);

  const filteredApplications = applications.filter(application => {
    const scholarshipTitle = application.scholarships?.title || '';
    const universityName = application.scholarships?.universities?.name || '';
    
    const matchesSearch = scholarshipTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         universityName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || application.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_scholarship_fee': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'under_review': return AlertCircle;
      case 'pending_scholarship_fee': return DollarSign;
      default: return Clock;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved': return '';
      case 'rejected': return 'Unfortunately, your application was not selected.';
      case 'under_review': return 'Your application is currently being reviewed.';
      case 'pending_scholarship_fee': return 'Pending scholarship fee payment.';
      default: return 'Your application is pending review.';
    }
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    under_review: applications.filter(app => app.status === 'under_review').length,
    pending_scholarship_fee: applications.filter(app => app.status === 'pending_scholarship_fee').length,
  };

  const createOrGetApplication = async (scholarshipId: string, studentProfileId: string) => {
    // Verifica se já existe aplicação
    const { data: existing, error: fetchError } = await supabase
      .from('scholarship_applications')
      .select('id')
      .eq('student_id', studentProfileId)
      .eq('scholarship_id', scholarshipId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (existing) return { applicationId: existing.id };
    // Cria nova aplicação
    const { data, error } = await supabase
      .from('scholarship_applications')
      .insert({
        student_id: studentProfileId,
        scholarship_id: scholarshipId,
        status: 'pending_scholarship_fee',
        applied_at: new Date().toISOString(),
        student_process_type: localStorage.getItem('studentProcessType') || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { applicationId: data.id };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Carregando suas aplicações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Applications</h2>
          <p className="text-slate-600">Track the status of your scholarship applications</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Applications</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Approved</p>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Under Review</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.under_review}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
              <p className="text-3xl font-bold text-gray-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">No applications yet</h3>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            Start applying for scholarships to track your progress here. We'll help you find the best opportunities that match your profile.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <div className="p-6 bg-slate-50 rounded-2xl">
              <Award className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Find Scholarships</h4>
              <p className="text-sm text-slate-600">Browse through hundreds of opportunities</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <FileText className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Apply Easily</h4>
              <p className="text-sm text-slate-600">Simple application process with guidance</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Track Progress</h4>
              <p className="text-sm text-slate-600">Monitor your applications in real-time</p>
            </div>
          </div>
          
          <Link
            to="/student/dashboard/scholarships"
            className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center"
          >
            Find Scholarships
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  title="Filter applications by status"
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center text-sm text-slate-600">
              <span className="font-medium">{filteredApplications.length}</span>
              <span className="ml-1">
                application{filteredApplications.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            {filteredApplications.map((application) => {
              const Icon = getStatusIcon(application.status);
              const scholarship = application.scholarships;
              const applicationFeePaid = !!application.is_application_fee_paid;
              const scholarshipFeePaid = !!application.is_scholarship_fee_paid;

              if (!scholarship) return null;

              // Box de congratulações e botões de pagamento
              const showCongratsBox = application.status === 'approved';
              const showApplicationFeeButton = showCongratsBox && !applicationFeePaid;
              const showScholarshipFeeButton = showCongratsBox && applicationFeePaid && !scholarshipFeePaid;

              return (
                <div key={application.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 mb-8">
                  <div className="p-8">
                    {/* Box de congratulações */}
                    {/* REMOVIDO: Box de congratulações */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Award className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 mb-1">
                                {scholarship.title}
                              </h3>
                              <div className="flex items-center text-slate-600">
                                <Building className="h-4 w-4 mr-2" />
                                {scholarship.universities?.name}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                            <span className="font-semibold text-green-600">
                              {formatAmount(scholarship.annual_value_with_scholarship ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                            <span className="text-slate-600">Applied on {new Date(application.applied_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-slate-600 capitalize">
                              Level: {scholarship.level}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-6 flex flex-col items-end space-y-3">
                        <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium border ${getStatusColor(application.status === 'enrolled' ? 'approved' : application.status)} shadow-sm bg-gray-50`}>
                          <Icon className="h-4 w-4 mr-2" />
                          {(application.status === 'enrolled' ? 'APPROVED' : application.status.replace('_', ' ').toUpperCase())}
                        </span>
                        {/* Indicadores de pagamento */}
                        {/* REMOVIDO: Badges Application Fee Paid e Scholarship Fee Paid */}
                        {['approved', 'enrolled'].includes(application.status) && (
                          <button
                            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 shadow border border-blue-700"
                            onClick={() => navigate(`/student/dashboard/application/${application.id}/chat`)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Status Message */}
                    {application.status === 'pending_scholarship_fee' && (
                      <div className="mt-4 p-4 bg-blue-50 border-t border-blue-200">
                        <p className="text-blue-800 font-semibold mb-2 text-center">
                          To proceed with your application, please pay the scholarship fee.
                        </p>
                        {payingId === application.id && (
                          <div className="mb-2 flex justify-center">
                            <span className="text-blue-600 animate-pulse">Processing payment...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botões de pagamento - AGORA NO FINAL DO CARD */}
                    {['pending', 'under_review', 'approved'].includes(application.status) && (
                      <div className="flex flex-row gap-4 mt-8 items-center justify-center">
                        {/* Application Fee */}
                        {applicationFeePaid ? (
                          <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Paid
                          </span>
                        ) : (
                          <button
                            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
                            onClick={() => navigate('/student/dashboard/application-fee')}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Pay Application Fee ($350)
                          </button>
                        )}
                        {/* Scholarship Fee */}
                        {scholarshipFeePaid ? (
                          <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Paid
                          </span>
                        ) : (
                          <StripeCheckout
                            productId="scholarshipFee"
                            feeType="scholarship_fee"
                            paymentType="scholarship_fee"
                            buttonText="Pay Scholarship Fee ($550)"
                            successUrl={`${window.location.origin}/student/dashboard/scholarship-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                            cancelUrl={`${window.location.origin}/student/dashboard/scholarship-fee-error`}
                            disabled={!applicationFeePaid || scholarshipFeePaid}
                            scholarshipsIds={[application.scholarship_id]}
                            metadata={{
                              application_id: application.id,
                              selected_scholarship_id: application.scholarship_id,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MyApplications;