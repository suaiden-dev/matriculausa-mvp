import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Wallet,
  FileText,
  Mail,
  RefreshCw,
  ExternalLink,
  User,
  ArrowUpRight
} from 'lucide-react';
import { useUniversity } from '../../context/UniversityContext';
import { useAuth } from '../../hooks/useAuth';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';

const Overview: React.FC = () => {
  const { university, scholarships, applications } = useUniversity();
  const { user } = useAuth();
  const { getFeeAmount } = useFeeConfig();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;
  
  // Financial data state
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [loadingFinancial, setLoadingFinancial] = useState<boolean>(true);

  // Pending actions state
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [loadingActions, setLoadingActions] = useState<boolean>(true);

  // Load pending actions for the university
  useEffect(() => {
    const loadPendingActions = async () => {
      if (!user?.id) {
        setLoadingActions(false);
        return;
      }

      try {
        setLoadingActions(true);

        // 1. Fetch all universities associated with the current user
        // school_manager: use university_id from profile; school: query by user_id
        let universityIds: string[] = [];
        if (user.role === 'school_manager' && user.university_id) {
          universityIds = [user.university_id];
        } else {
          const { data: userUniversities } = await supabase
            .from('universities')
            .select('id')
            .eq('user_id', user.id);
          universityIds = (userUniversities || []).map(u => u.id);
        }
        if (universityIds.length === 0) {
          setPendingActions([]);
          setLoadingActions(false);
          return;
        }

        // 2. Fetch active applications linked to these universities
        const { data: activeApps, error: appsError } = await supabase
          .from('scholarship_applications')
          .select(`
            id,
            status,
            created_at,
            documents,
            transfer_form_status,
            acceptance_letter_status,
            acceptance_letter_url,
            is_application_fee_paid,
            student_id,
            user_profiles!student_id(full_name, email),
            scholarships!inner(id, title, university_id)
          `)
          .in('scholarships.university_id', universityIds)
          .not('status', 'in', '("enrolled","rejected")');

        if (appsError) {
          console.error("Error fetching active apps for actions:", appsError);
          setLoadingActions(false);
          return;
        }

        // 3. Fetch manual or global document requests uploads in pending status
        const appIds = (activeApps || []).map(app => app.id);
        let pendingUploads: any[] = [];
        
        if (appIds.length > 0) {
          const { data: uploads, error: uploadsError } = await supabase
            .from('document_request_uploads')
            .select(`
              id,
              status,
              uploaded_at,
              document_request_id,
              document_requests!inner(
                title,
                scholarship_application_id
              )
            `)
            .in('document_requests.scholarship_application_id', appIds)
            .in('status', ['pending', 'under_review']);

          if (uploadsError) {
            console.error("Error fetching document request uploads:", uploadsError);
          } else {
            pendingUploads = uploads || [];
          }
        }

        // 4. Map & consolidate pending items per application
        const consolidatedActions: any[] = [];

        (activeApps || []).forEach((app: any) => {
          const studentName = app.user_profiles?.full_name || app.user_profiles?.email || 'Unknown Student';
          const scholarshipTitle = app.scholarships?.title || 'Scholarship Opportunity';

          // Action: Eligibility Review
          if (app.status === 'pending' || app.status === 'under_review') {
            consolidatedActions.push({
              id: `review_${app.id}`,
              applicationId: app.id,
              studentName,
              scholarshipTitle,
              type: 'eligibility',
              label: 'Eligibility Review',
              description: 'Awaiting scholarship eligibility evaluation.',
              date: app.created_at
            });
          }

          // Action: Basic Documents Review
          const docs = Array.isArray(app.documents) ? app.documents : [];
          const basicDocsUnderReview = docs.filter((d: any) => d.status === 'under_review');
          if (basicDocsUnderReview.length > 0) {
            consolidatedActions.push({
              id: `basic_docs_${app.id}`,
              applicationId: app.id,
              studentName,
              scholarshipTitle,
              type: 'basic_docs',
              label: 'Basic Docs Approval',
              description: `${basicDocsUnderReview.length} basic document(s) pending approval.`,
              date: basicDocsUnderReview[0].uploaded_at || app.created_at
            });
          }

          // Action: Additional Documents Review (from requested uploads)
          const specificUploads = pendingUploads.filter(up => up.document_requests?.scholarship_application_id === app.id);
          if (specificUploads.length > 0) {
            consolidatedActions.push({
              id: `additional_docs_${app.id}`,
              applicationId: app.id,
              studentName,
              scholarshipTitle,
              type: 'additional_docs',
              label: 'Requested Docs Approval',
              description: `${specificUploads.length} requested document(s) pending approval.`,
              date: specificUploads[0].uploaded_at || app.created_at
            });
          }

          // Action: Acceptance Letter Upload
          const needsAcceptanceLetter = app.is_application_fee_paid && 
                                        (!app.acceptance_letter_url || app.acceptance_letter_status !== 'sent');
          if (needsAcceptanceLetter && app.status === 'approved') {
            consolidatedActions.push({
              id: `acceptance_letter_${app.id}`,
              applicationId: app.id,
              studentName,
              scholarshipTitle,
              type: 'acceptance_letter',
              label: 'Acceptance Letter Pending',
              description: 'Awaiting upload & sending of Acceptance Letter.',
              date: app.created_at
            });
          }

          // Action: Transfer Form Approval
          if (app.transfer_form_status === 'sent') {
            consolidatedActions.push({
              id: `transfer_form_${app.id}`,
              applicationId: app.id,
              studentName,
              scholarshipTitle,
              type: 'transfer_form',
              label: 'Transfer Form Approval',
              description: 'Student submitted signed Transfer Form.',
              date: app.created_at
            });
          }
        });

        // Sort by date descending
        consolidatedActions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setPendingActions(consolidatedActions);

      } catch (err) {
        console.error("Error loading pending actions:", err);
      } finally {
        setLoadingActions(false);
      }
    };

    loadPendingActions();
  }, [user?.id, university?.id, applications]);

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
        let universityIds: string[] = [];
        if (user.role === 'school_manager' && user.university_id) {
          universityIds = [user.university_id];
        } else {
          const { data: userUniversities } = await supabase
            .from('universities')
            .select('id')
            .eq('user_id', user.id);
          universityIds = (userUniversities || []).map(u => u.id);
        }
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
            .select('id, dependents, system_type, has_paid_reinstatement_package')
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

        // Calcular receita total de Reinstatement Fees (uma única vez por estudante que pagou)
        const paidStudentIds = Array.from(new Set((paidApplications || []).map((app: any) => app.student_id).filter(Boolean)));
        const totalReinstatementFeeRevenue = paidStudentIds.reduce((sum: number, studentId: string) => {
          const s = studentsMap[studentId];
          if (s?.has_paid_reinstatement_package) {
            return sum + getFeeAmount('reinstatement_fee');
          }
          return sum;
        }, 0);

        // Receita Acumulada Consolidada
        const totalConsolidatedRevenue = totalApplicationFeeRevenue + totalReinstatementFeeRevenue;

        // Total Balance = receita consolidada
        setTotalBalance(totalConsolidatedRevenue);

        // Total Available = receita consolidada - payment requests (paid + approved + pending)
        const availableBalance = Math.max(0, totalConsolidatedRevenue - totalPaidOut - totalApproved - totalPending);
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
                    <p className="text-xs text-slate-500 truncate">{app.scholarships?.field_of_study || '-'}</p>
                    <p className="text-xs text-slate-400 truncate italic">{app.scholarships?.title || '-'}</p>
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
                      <th className="px-3 lg:px-4 py-2 text-left text-xs lg:text-sm font-medium text-slate-600">Course</th>
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
                          <div className="max-w-xs truncate font-medium">
                            {app.scholarships?.field_of_study || '-'}
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 py-2 text-xs lg:text-sm">
                          <div className="max-w-xs truncate text-slate-500">
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

  const renderPendingActionsPanel = () => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getBadgeStyle = (type: string) => {
      switch (type) {
        case 'eligibility':
          return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'basic_docs':
        case 'additional_docs':
          return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'acceptance_letter':
          return 'bg-green-50 text-green-700 border-green-200';
        case 'transfer_form':
          return 'bg-purple-50 text-purple-700 border-purple-200';
        default:
          return 'bg-slate-50 text-slate-700 border-slate-200';
      }
    };

    const getIcon = (type: string) => {
      switch (type) {
        case 'eligibility':
          return <Award className="h-3 w-3 text-amber-600 mr-1" />;
        case 'basic_docs':
        case 'additional_docs':
          return <FileText className="h-3 w-3 text-blue-600 mr-1" />;
        case 'acceptance_letter':
          return <Mail className="h-3 w-3 text-green-600 mr-1" />;
        case 'transfer_form':
          return <RefreshCw className="h-3 w-3 text-purple-600 mr-1" />;
        default:
          return <Clock className="h-3 w-3 text-slate-600 mr-1" />;
      }
    };

    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Pending Actions & Approvals</h3>
                {pendingActions.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2.5 py-0.5 rounded-full">
                    {pendingActions.length}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500">Tasks requiring your university's review or action</p>
            </div>
          </div>
          <Link
            to="/school/dashboard/application-tracking"
            className="text-xs sm:text-sm font-bold text-[#05294E] hover:text-blue-700 flex items-center"
          >
            Tracking Pipeline
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="p-4 sm:p-5 lg:p-6">
          {loadingActions ? (
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-3 sm:p-4 border border-slate-100 rounded-xl">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-24 sm:w-32 bg-slate-200 rounded"></div>
                      <div className="h-3 w-32 sm:w-48 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                  <div className="w-16 h-8 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : pendingActions.length === 0 ? (
            <div className="text-center py-6 sm:py-8 lg:py-12">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-slate-900 font-bold text-base sm:text-lg mb-1">All Caught Up!</h3>
              <p className="text-slate-500 text-xs sm:text-sm">There are no pending student items requiring your university's attention right now.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {pendingActions.map((action) => (
                <div key={action.id} className="p-3 sm:p-4 border border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/10 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors flex-shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {action.studentName}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getBadgeStyle(action.type)}`}>
                            {getIcon(action.type)}
                            <span className="ml-1">{action.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mb-1">
                          {action.scholarshipTitle}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-400">
                          {action.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
                      <div className="text-[10px] sm:text-xs text-slate-400 text-right">
                        <span>{formatDate(action.date)}</span>
                      </div>
                      <Link
                        to={`/school/dashboard/student/${action.applicationId}`}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center group-hover:translate-x-0.5 duration-200"
                      >
                        Review
                        <ExternalLink className="h-3 w-3 ml-1.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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


        {renderPendingActionsPanel()}        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
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
          <div className="bg-gradient-to-br from-[#05294E] to-blue-700 rounded-xl sm:rounded-2xl shadow-lg text-white p-4 sm:p-5 lg:p-6 flex flex-col justify-between">
            <div>
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