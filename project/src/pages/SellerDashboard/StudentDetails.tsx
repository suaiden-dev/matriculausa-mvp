import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Eye, 
  DollarSign, 
  Calendar, 
  MapPin, 
  User, 
  ChevronDown,
  ChevronRight,
  Users,
  Phone,
  Building,
  Award,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Home,
  BarChart3,
  Settings,
  Clock
} from 'lucide-react';
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
  total_fees_paid: number; // Será convertido de bigint para number
  fees_count: number; // Será convertido de bigint para number
  scholarship_title?: string;
  university_name?: string;
  selected_scholarship_id?: string;
  documents_status?: string;
  is_application_fee_paid?: boolean;
  is_scholarship_fee_paid?: boolean;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
  student_process_type?: string;
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
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');

  const TABS = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

  // Estado atual para debug (removido para produção)

  // Carregar dados iniciais
  const loadStudentDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar informações do estudante
      const { data: studentData, error: studentError } = await supabase.rpc(
        'get_student_detailed_info',
        { target_student_id: studentId }
      );

      if (studentError) {
        console.error('❌ [STUDENT_DETAILS] Erro na RPC:', studentError);
        throw new Error(`Failed to load student info: ${studentError.message}`);
      }

      if (studentData && studentData.length > 0) {
        // Converter bigint para number para compatibilidade com TypeScript
        const studentInfoData = {
          ...studentData[0],
          total_fees_paid: Number(studentData[0].total_fees_paid || 0),
          fees_count: Number(studentData[0].fees_count || 0)
        };
        setStudentInfo(studentInfoData);
        // Dados do estudante carregados com sucesso
      } else {
        console.warn('⚠️ [STUDENT_DETAILS] Nenhum dado retornado da RPC');
        setStudentInfo(null);
      }

      // Carregar histórico de taxas
      const { data: feesData, error: feesError } = await supabase.rpc(
        'get_student_fee_history',
        { target_student_id: studentId }
      );

      if (feesError) {
        console.warn('⚠️ [STUDENT_DETAILS] Could not load fee history:', feesError);
      } else {
        setFeeHistory(feesData || []);
      }

      // Verificando aplicação de bolsa
      const { data: applicationsList, error: listError } = await supabase
        .from('scholarship_applications')
        .select('id, status, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (applicationsList && applicationsList.length > 0) {
        const latestApplication = applicationsList[0];
        
        const { data: appData, error: applicationError } = await supabase
          .from('scholarship_applications')
          .select('*')
          .eq('id', latestApplication.id)
          .single();

        if (!applicationError) {
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
        const { data: globalData, error: globalError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('is_global', true);

        if (!globalError) {
          globalRequests = globalData || [];
        }
      }

      // Combinar as duas listas
      const allRequests = [...(specificRequests || []), ...globalRequests];
      setDocumentRequests(allRequests);
    } catch (err) {
      console.error('❌ [STUDENT_DETAILS] Erro ao carregar solicitações de documentos:', err);
    }
  }, [scholarshipApplication?.id, studentInfo?.university_name]);

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

      if (requestsError || !requests || requests.length === 0) {
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

      if (!error) {
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading data...</p>
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

  // Se um estudante está selecionado, mostrar detalhes
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm md:text-base">Back to list</span>
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Student Application
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Review and manage {studentInfo.full_name}'s application details
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {scholarshipApplication?.status === 'enrolled' ? 'Enrolled' : 'Active'}
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
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
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-300 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-[#05294E] text-[#05294E]' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                onClick={() => setActiveTab(tab.id as any)}
                type="button"
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <tab.icon className={`w-5 h-5 mr-2 transition-colors ${
                  activeTab === tab.id ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                }`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Conteúdo das abas */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
              {/* Student Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <User className="w-6 h-6 mr-3" />
                    Student Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Personal Details</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                          <dd className="text-base font-semibold text-slate-900 mt-1">{studentInfo.full_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Email</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.email || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Phone</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.phone || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Country</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.country || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.field_of_interest || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.academic_level || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">GPA</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.gpa || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.english_proficiency || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Application & Status */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Student Type</dt>
                          <dd className="text-base text-slate-900 mt-1">
                            {studentInfo.student_process_type ? (
                              studentInfo.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                              studentInfo.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                              studentInfo.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                              studentInfo.student_process_type
                            ) : (
                              <span className="text-slate-500 italic">Not specified</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                studentInfo.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                studentInfo.is_application_fee_paid ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {studentInfo.is_application_fee_paid ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                studentInfo.documents_status === 'approved' ? 'bg-green-500' :
                                studentInfo.documents_status === 'rejected' ? 'bg-red-500' :
                                studentInfo.documents_status === 'pending' ? 'bg-yellow-500' :
                                studentInfo.documents_status === 'analyzing' ? 'bg-blue-500' :
                                'bg-slate-400'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                studentInfo.documents_status === 'approved' ? 'text-green-700' :
                                studentInfo.documents_status === 'rejected' ? 'text-red-700' :
                                studentInfo.documents_status === 'pending' ? 'text-yellow-700' :
                                studentInfo.documents_status === 'analyzing' ? 'text-blue-700' :
                                'text-slate-600'
                              }`}>
                                {studentInfo.documents_status === 'approved' ? 'Approved' :
                                 studentInfo.documents_status === 'rejected' ? 'Rejected' :
                                 studentInfo.documents_status === 'pending' ? 'Pending' :
                                 studentInfo.documents_status === 'analyzing' ? 'Analyzing' :
                                 studentInfo.documents_status || 'Not Started'}
                              </span>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Enrollment Status</dt>
                          <dd className="mt-1">
                            {scholarshipApplication?.status === 'enrolled' ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-700">Enrolled</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm font-medium text-yellow-700">Pending Acceptance</span>
                              </div>
                            )}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scholarship Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Scholarship Details
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {studentInfo.scholarship_title || 'Scholarship information not available'}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">University</dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {studentInfo.university_name || 'University not specified'}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Application Status</dt>
                        <dd className="text-base text-slate-700">
                          {scholarshipApplication?.status ? 
                            scholarshipApplication.status.charAt(0).toUpperCase() + scholarshipApplication.status.slice(1) : 
                            'Status not available'
                          }
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Process Type</dt>
                        <dd className="text-base text-slate-700">
                          {studentInfo.student_process_type ? (
                            studentInfo.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                            studentInfo.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                            studentInfo.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                            studentInfo.student_process_type
                          ) : (
                            <span className="text-slate-500 italic">Not specified</span>
                          )}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Documents Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Student Documents
                  </h2>
                  <p className="text-slate-200 text-sm mt-1">View student submitted documents and their current status</p>
                </div>
                <div className="p-6">
                  {scholarshipApplication?.documents && scholarshipApplication.documents.length > 0 ? (
                    <div className="space-y-2">
                      {scholarshipApplication.documents.map((doc: any, index: number) => (
                        <div key={doc.id || index}>
                          <div className="bg-white p-4">
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-1">
                                  <p className="font-medium text-slate-900">{doc.document_type || 'Document'}</p>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Submitted'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">{doc.description || 'Document description not available'}</p>
                                {doc.uploaded_at && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Uploaded: {formatDate(doc.uploaded_at)}
                                  </p>
                                )}
                                
                                {/* Apenas botões de visualização */}
                                <div className="flex items-center space-x-2 mt-3">
                                  {doc.document_url && (
                                    <button className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                      View Document
                                    </button>
                                  )}
                                  <button className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                    Download
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < scholarshipApplication.documents.length - 1 && (
                            <div className="border-t border-slate-200"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-600 font-medium">No documents uploaded yet</p>
                      <p className="text-sm text-slate-500 mt-1">Documents will appear here when the student uploads them</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-4">
              {/* Quick Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Application Summary</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Submitted</span>
                    <span className="text-sm text-slate-900">
                      {formatDate(studentInfo.registration_date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Application submitted</p>
                        <p className="text-xs text-slate-500">{formatDate(studentInfo.registration_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Last updated</p>
                        <p className="text-xs text-slate-500">{formatDate(studentInfo.registration_date)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('documents')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <span className="text-sm font-medium text-slate-900">Documents</span>
                      </div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-6 text-white h-6 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Document Management</h2>
                    <p className="text-slate-200 text-sm mt-1">View student submitted documents and their current status</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Document Requests Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-8">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                  <h4 className="font-semibold text-slate-900 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Document Requests
                  </h4>
                </div>
                
                <div className="p-6">
                  <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-600 font-medium">No document requests yet</p>
                    <p className="text-sm text-slate-500 mt-1">Document requests will appear here when created by university staff</p>
                  </div>
                </div>
              </div>

              {/* Student Uploads Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-8">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                  <h4 className="font-semibold text-slate-900 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Student Responses to Document Requests
                  </h4>
                </div>
                
                <div className="p-6">
                  {scholarshipApplication?.documents && scholarshipApplication.documents.length > 0 ? (
                    <div className="space-y-3">
                      {scholarshipApplication.documents.map((doc: any, index: number) => (
                        <div key={doc.id || index} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900">{doc.document_type || 'Document'}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {doc.request_type || 'Document Request'}
                                  </span>
                                  <span className="text-sm text-slate-500">
                                    Response to: <span className="font-medium text-slate-700">{doc.request_title || 'Document Request'}</span>
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{doc.request_title || 'Document Request'}</p>
                                {doc.uploaded_at && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Uploaded: {formatDate(doc.uploaded_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 ml-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Under Review'}
                              </span>
                              
                              {/* Apenas botões de visualização */}
                              <button className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                                Download
                              </button>
                              {doc.document_url && (
                                <button className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                                  View
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-slate-600 font-medium">No student responses yet</p>
                      <p className="text-sm text-slate-500 mt-1">Student document responses will appear here when they upload documents</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acceptance Letter Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">Acceptance Letter</h4>
                      <p className="text-blue-100 text-sm">View student acceptance letter and enrollment status</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="bg-white rounded-3xl p-6 mb-6">
                    <p className="text-slate-700 mb-6 leading-relaxed">
                      The student's acceptance letter and any other required documents, such as the I-20 Control Fee receipt.
                    </p>
                    
                    {scholarshipApplication?.acceptance_letter_url ? (
                      <div className="text-center py-8 bg-green-50 border-2 border-green-200 rounded-3xl">
                        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h5 className="font-semibold text-green-900 mb-2">Acceptance Letter Uploaded Successfully!</h5>
                        <p className="text-green-700 text-sm">The student has been enrolled and notified.</p>
                        <div className="mt-4">
                          <button className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            View Acceptance Letter
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                        <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h5 className="font-semibold text-slate-900 mb-2">Acceptance Letter Not Uploaded Yet</h5>
                        <p className="text-slate-700 text-sm">The acceptance letter will appear here when uploaded by university staff</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetails;