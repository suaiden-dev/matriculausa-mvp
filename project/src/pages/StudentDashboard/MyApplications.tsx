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
  ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, Scholarship } from '../../types';
import { StripeCheckout } from '../../components/StripeCheckout';

// Combine os tipos para incluir os detalhes da bolsa na aplicação
type ApplicationWithScholarship = Application & {
  scholarships: Scholarship | null;
};

const MyApplications: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('scholarship_applications')
          .select('*, scholarships(*)')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Erro ao buscar aplicações:', error);
          setError('Erro ao buscar aplicações.');
        } else {
          if (!data || data.length === 0) {
            console.warn('Nenhuma aplicação encontrada para student_id:', user.id);
          }
          setApplications(data || []);
        }
      } catch (err) {
        setError('Erro inesperado ao buscar aplicações.');
        console.error(err);
      }
      setLoading(false);
    };
    if (user?.id) fetchApplications();
  }, [user]);


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
      minimumFractionDigits: 0
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
      case 'approved': return 'Congratulations! Your application has been approved.';
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

  if (loading) {
    return <div>Loading applications...</div>;
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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

              if (!scholarship) return null; // Skip rendering if scholarship data is missing
              
              return (
                <div key={application.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="p-6">
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
                            {(scholarship.id && (application.status === 'pending' || application.status === 'under_review')) && (
                              <StripeCheckout
                                productId="SCHOLARSHIPS_FEE"
                                buttonText="Pay Scholarship Fee ($550)"
                                className="ml-4"
                                paymentType="scholarship_fee"
                                feeType="scholarship_fee"
                                scholarshipsIds={[scholarship.id]}
                                studentProcessType={application.student_process_type}
                                successUrl={`${window.location.origin}/student/dashboard/scholarship-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                                cancelUrl={`${window.location.origin}/student/dashboard/scholarship-fee-error`}
                                metadata={{ scholarships_ids: String(scholarship.id) }}
                              />
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                            <span className="font-semibold text-green-600">
                              {formatAmount(scholarship.amount || 0)}
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
                        <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium border ${getStatusColor(application.status)}`}>
                          <Icon className="h-4 w-4 mr-2" />
                          {application.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {application.status === 'approved' && (
                          <button
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
                            onClick={() => navigate(`/student/dashboard/application/${application.id}/chat`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className={`p-4 rounded-xl border ${
                      application.status === 'approved' ? 'bg-green-50 border-green-200' :
                      application.status === 'rejected' ? 'bg-red-50 border-red-200' :
                      application.status === 'under_review' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <p className={`text-sm font-medium ${
                        application.status === 'approved' ? 'text-green-800' :
                        application.status === 'rejected' ? 'text-red-800' :
                        application.status === 'under_review' ? 'text-yellow-800' :
                        'text-gray-800'
                      }`}>
                        {getStatusMessage(application.status)}
                      </p>
                      
                      {application.notes && (
                        <p className="text-sm text-slate-600 mt-2">
                          <strong>Note:</strong> {application.notes}
                        </p>
                      )}
                    </div>

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
                        <StripeCheckout
                          productId="SCHOLARSHIP_FEE"
                          paymentType="scholarship_fee"
                          feeType="scholarship_fee"
                          scholarshipsIds={[application.scholarship_id]}
                          buttonText="Pay Scholarship Fee ($550)"
                          successUrl={`${window.location.origin}/student/dashboard/scholarship-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                          cancelUrl={`${window.location.origin}/student/dashboard/scholarship-fee-error`}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          metadata={{ scholarships_ids: String(application.scholarship_id), application_id: application.id }}
                          onSuccess={() => {
                            setSuccessMessage('Scholarship fee paid successfully!');
                            setPayingId(null);
                          }}
                          onError={(err) => {
                            setErrorMessage('Payment failed: ' + err);
                            setPayingId(null);
                          }}
                          disabled={payingId === application.id}
                        />
                      </div>
                    )}

                    {/* Exibir documentos enviados */}
                    {Array.isArray(application.documents) && application.documents.length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold text-slate-800 mb-1">Documents:</div>
                        <ul className="list-disc ml-6">
                          {application.documents.map((doc: any, idx: number) => (
                            <li key={idx} className="mb-1">
                              <span className="font-medium capitalize">{doc.type}:</span> <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredApplications.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No applications found</h3>
              <p className="text-slate-500">
                {searchTerm ? `No applications match "${searchTerm}"` : 'No applications with the selected status'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Mensagem de sucesso/erro do pagamento */}
      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center max-w-sm w-full">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-green-700 mb-2">Payment successful!</h3>
            <p className="text-slate-700 mb-4">{successMessage}</p>
            <button
              className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-all"
              onClick={() => setSuccessMessage(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center max-w-sm w-full">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-red-700 mb-2">Payment failed</h3>
            <p className="text-slate-700 mb-4">{errorMessage}</p>
            <button
              className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all"
              onClick={() => setErrorMessage(null)}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyApplications;