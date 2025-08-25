import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, DollarSign, GraduationCap, Building, Award, Clock, FileText, Eye, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StudentInfo {
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  field_of_interest: string;
  academic_level: string;
  gpa: number;
  english_proficiency: string;
  registration_date: string;
  current_status: string;
  seller_referral_code: string;
  seller_name: string;
  total_fees_paid: number;
  fees_count: number;
  scholarship_title?: string;
  university_name?: string;
  selected_scholarship_id?: string;
  documents_status?: string;
  is_application_fee_paid?: boolean;
  is_scholarship_fee_paid?: boolean;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
}

interface FeePayment {
  payment_id: string;
  fee_type: string;
  fee_name: string;
  amount_paid: number;
  currency: string;
  payment_status: string;
  payment_date: string;
  stripe_payment_intent: string;
  notes: string;
}

interface ScholarshipApplication {
  id: string;
  status: string;
  student_process_type: string;
  applied_at: string;
  reviewed_at: string;
  notes: string;
  documents: any[];
  acceptance_letter_status: string;
  acceptance_letter_url: string;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  paid_at: string;
  payment_status: string;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
}

interface DocumentRequest {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  created_at: string;
  attachment_url: string;
}

interface StudentDetailsProps {
  studentId: string;
  onRefresh?: () => void;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ studentId, onRefresh }) => {
  const navigate = useNavigate();
  
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [feeHistory, setFeeHistory] = useState<FeePayment[]>([]);
  const [scholarshipApplication, setScholarshipApplication] = useState<ScholarshipApplication | null>(null);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'scholarship'>('details');

  const TABS = [
    { id: 'details', label: 'Student Details', icon: User },
    { id: 'scholarship', label: 'Scholarship Info', icon: Award },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];



  const loadStudentDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregando detalhes do estudante...

      // Carregar informações do estudante
      const { data: studentData, error: studentError } = await supabase.rpc(
        'get_student_detailed_info',
        { target_student_id: studentId }
      );

      // Buscando informações do estudante...

      if (studentError) {
        console.error('❌ [STUDENT_DETAILS] Erro na RPC:', studentError);
        throw new Error(`Failed to load student info: ${studentError.message}`);
      }

      if (studentData && studentData.length > 0) {
        // Dados do estudante carregados com sucesso
        
        setStudentInfo(studentData[0]);
      } else {
        console.warn('⚠️ [STUDENT_DETAILS] Nenhum dado retornado da RPC');
        setStudentInfo(null);
      }

      // Carregar histórico de taxas
      const { data: feesData, error: feesError } = await supabase.rpc(
        'get_student_fee_history',
        { target_student_id: studentId }
      );

      // Carregando histórico de taxas...

      if (feesError) {
        console.warn('⚠️ [STUDENT_DETAILS] Could not load fee history:', feesError);
      } else {
        setFeeHistory(feesData || []);
      }

      // Verificando aplicação de bolsa...
      
      const { data: applicationsList, error: listError } = await supabase
        .from('scholarship_applications')
        .select('id, status, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

              if (applicationsList && applicationsList.length > 0) {
          const latestApplication = applicationsList[0];
        
        // Agora carregar os detalhes completos
        const { data: appData, error: applicationError } = await supabase
          .from('scholarship_applications')
          .select('*')
          .eq('id', latestApplication.id)
          .single();

                  if (applicationError) {
            console.warn('⚠️ [STUDENT_DETAILS] Could not load scholarship application details:', applicationError);
          } else {
            setScholarshipApplication(appData);
          }
      }

      // Carregar solicitações de documentos
      await loadDocumentRequests();
      
      // Carregar documentos do estudante
      await loadStudentDocuments();

    } catch (err) {
      console.error('❌ [STUDENT_DETAILS] Erro ao carregar detalhes do estudante:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  // Carregar dados quando o studentId mudar
  useEffect(() => {
    if (studentId) {
      loadStudentDetails();
    }
  }, [studentId, loadStudentDetails]);

  const loadDocumentRequests = useCallback(async () => {
          if (!scholarshipApplication?.id) {
        return;
      }

    try {
      // Primeiro, buscar document_requests específicas para esta aplicação
      const { data: specificRequests, error: specificError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', scholarshipApplication.id);

              // Também buscar document_requests globais da universidade
        let globalRequests: any[] = [];
        if (studentInfo?.university_name) {
        
        // Primeiro, buscar todas as document_requests globais
        const { data: globalData, error: globalError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('is_global', true);

                  if (globalError) {
            console.warn('⚠️ [STUDENT_DETAILS] Could not load global document requests:', globalError);
          } else {
            globalRequests = globalData || [];
          }
      }

      // Combinar as duas listas
      const allRequests = [...(specificRequests || []), ...globalRequests];

      if (specificError) {
        console.warn('⚠️ [STUDENT_DETAILS] Could not load specific document requests:', specificError);
      }

      // Se ainda não encontramos nenhuma, vamos buscar por outras estratégias
      if (allRequests.length === 0) {
        
        // Buscar por document_requests que possam estar relacionadas ao tipo de bolsa
        if (studentInfo?.scholarship_title && studentInfo.scholarship_title !== 'No scholarship selected') {
          
          const { data: scholarshipRequests, error: scholarshipError } = await supabase
            .from('document_requests')
            .select('*')
            .ilike('title', `%${studentInfo.scholarship_title}%`);

          if (scholarshipError) {
            console.warn('⚠️ [STUDENT_DETAILS] Could not load scholarship-related document requests:', scholarshipError);
          } else if (scholarshipRequests && scholarshipRequests.length > 0) {
            allRequests.push(...scholarshipRequests);
          }
        }
      }

      setDocumentRequests(allRequests);
    } catch (err) {
      console.error('❌ [STUDENT_DETAILS] Erro ao carregar solicitações de documentos:', err);
    }
  }, [scholarshipApplication?.id, studentInfo?.university_name, studentInfo?.scholarship_title]);

  const loadStudentDocuments = useCallback(async () => {
          if (!scholarshipApplication?.id) {
        return;
      }

    try {
      // Primeiro, buscar as document_requests para esta aplicação
      const { data: requests, error: requestsError } = await supabase
        .from('document_requests')
        .select('id')
        .eq('scholarship_application_id', scholarshipApplication.id);

              if (requestsError) {
          console.warn('⚠️ [STUDENT_DETAILS] Could not load document requests for documents:', requestsError);
          return;
        }

        if (!requests || requests.length === 0) {
          setStudentDocuments([]);
          return;
        }

      // Agora buscar os documentos baseados nos IDs das document_requests
      const requestIds = requests.map(r => r.id);
      const { data, error } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests (
            title,
            description
          )
        `)
        .in('document_request_id', requestIds);

              // Documentos do estudante carregados

      if (error) {
        console.warn('⚠️ [STUDENT_DETAILS] Could not load student documents:', error);
      } else {
        setStudentDocuments(data || []);
      }
    } catch (err) {
      console.error('❌ [STUDENT_DETAILS] Erro ao carregar documentos do estudante:', err);
    }
  }, [scholarshipApplication?.id]);

  // Recarregar documentos quando a aplicação de bolsa mudar
  useEffect(() => {
    if (scholarshipApplication?.id) {
      loadDocumentRequests();
      loadStudentDocuments();
    }
  }, [scholarshipApplication?.id, loadDocumentRequests, loadStudentDocuments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-32 w-32 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Student</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadStudentDetails()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="h-32 w-32 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-gray-600">The requested student could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Go back"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Complete information about {studentInfo.full_name}
              </h1>
              <p className="text-gray-600">Student ID: {studentInfo.student_id}</p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Refresh student data"
              aria-label="Refresh student data"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 inline mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Full Name</p>
                      <p className="text-slate-900">{studentInfo.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Email</p>
                      <p className="text-slate-900">{studentInfo.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Phone</p>
                      <p className="text-slate-900">{studentInfo.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Country</p>
                      <p className="text-slate-900">{studentInfo.country || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Registration Date</p>
                      <p className="text-slate-900">{formatDate(studentInfo.registration_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Status</p>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        studentInfo.current_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {studentInfo.current_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Academic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <GraduationCap className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Field of Interest</p>
                      <p className="text-slate-900">{studentInfo.field_of_interest || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Award className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Academic Level</p>
                      <p className="text-slate-900">{studentInfo.academic_level || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">GPA</p>
                      <p className="text-slate-900">{studentInfo.gpa || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">English Proficiency</p>
                      <p className="text-slate-900">{studentInfo.english_proficiency || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total Fees Paid</p>
                      <p className="text-slate-900">{formatCurrency(studentInfo.total_fees_paid)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Number of Payments</p>
                      <p className="text-slate-900">{studentInfo.fees_count}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Referral Code</p>
                      <p className="text-slate-900">{studentInfo.seller_referral_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-500">Seller Name</p>
                      <p className="text-slate-900">{studentInfo.seller_name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee History */}
            {feeHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Fee Payment History</h3>
                <div className="space-y-4">
                  {feeHistory.map((payment) => (
                    <div key={payment.payment_id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">{payment.fee_name}</h4>
                          <p className="text-sm text-slate-600 mt-1">{payment.fee_type}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                            <span>Date: {formatDate(payment.payment_date)}</span>
                            <span>Status: {payment.payment_status}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-slate-900">{formatCurrency(payment.amount_paid)}</p>
                          <p className="text-sm text-slate-500">{payment.currency}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'scholarship' && (
          <div className="space-y-6">
            {/* Scholarship Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Scholarship Information</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Award className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Scholarship Title</p>
                    <p className="text-slate-900">{studentInfo.scholarship_title || 'No scholarship selected'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">University</p>
                    <p className="text-slate-900">{studentInfo.university_name || 'No university selected'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Status */}
            {scholarshipApplication && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Application Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">Status</span>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      scholarshipApplication.status === 'approved' ? 'bg-green-100 text-green-800' :
                      scholarshipApplication.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {scholarshipApplication.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">Applied Date</span>
                    <span className="text-slate-900">{formatDate(scholarshipApplication.applied_at)}</span>
                  </div>
                  {scholarshipApplication.reviewed_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">Reviewed Date</span>
                      <span className="text-slate-900">{formatDate(scholarshipApplication.reviewed_at)}</span>
                    </div>
                  )}
                  {scholarshipApplication.notes && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">Notes</span>
                      <span className="text-slate-900">{scholarshipApplication.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Document Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Document Requests</h3>
              
              {documentRequests.length > 0 ? (
                <div className="space-y-4">
                  {documentRequests.map((request) => (
                    <div key={request.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">{request.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{request.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                            <span>Due: {request.due_date ? formatDate(request.due_date) : 'No due date'}</span>
                            <span>Created: {formatDate(request.created_at)}</span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          request.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No document requests</h4>
                  <p className="text-slate-500">No documents have been requested from this student yet.</p>
                </div>
              )}
            </div>

            {/* Student Documents */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Student Documents</h3>
              
              {studentDocuments.length > 0 ? (
                <div className="space-y-4">
                  {studentDocuments.map((doc) => (
                    <div key={doc.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {doc.document_requests?.title || 'Document'}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {doc.document_requests?.description || 'No description'}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                            <span>Uploaded: {formatDate(doc.created_at)}</span>
                            {doc.review_notes && (
                              <span>Notes: {doc.review_notes}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                            {getStatusIcon(doc.status)}
                            <span className="ml-1">{doc.status}</span>
                          </span>
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No documents uploaded</h4>
                  <p className="text-slate-500">This student hasn't uploaded any documents yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetails;
