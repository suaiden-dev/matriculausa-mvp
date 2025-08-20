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
  Award,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, Scholarship } from '../../types';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useCartStore } from '../../stores/applicationStore';
// import StudentDashboardLayout from "./StudentDashboardLayout";
// import CustomLoading from '../../components/CustomLoading';

// Combine os tipos para incluir os detalhes da bolsa na aplicação
type ApplicationWithScholarship = Application & {
  scholarships: Scholarship | null;
};

// Labels amigáveis para os documentos principais
const DOCUMENT_LABELS: Record<string, string> = {
  passport: 'Passport',
  diploma: 'High School Diploma',
  funds_proof: 'Proof of Funds',
};

const MyApplications: React.FC = () => {
  const { user, userProfile, refetchUserProfile } = useAuth();
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // const [payingId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  // Document Requests uploads grouped by applicationId
  const [requestUploadsByApp, setRequestUploadsByApp] = useState<Record<string, { title: string; status: string; review_notes?: string }[]>>({});
  // const [pendingUploads] = useState<Record<string, Record<string, File | null>>>({});
  // const [uploadingAppId, setUploadingAppId] = useState<string | null>(null);
  // const navigate = useNavigate();
  const location = useLocation();
  const syncCartWithDatabase = useCartStore(state => state.syncCartWithDatabase);

  // Modal confirmation states
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingApplication, setPendingApplication] = useState<ApplicationWithScholarship | null>(null);

  // Estado para controlar abertura/fechamento individual dos documents checklist
  const [openChecklists, setOpenChecklists] = useState<Record<string, boolean>>({});

  // Função para alternar o estado de um checklist específico
  const toggleChecklist = (applicationId: string) => {
    setOpenChecklists(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };


  useEffect(() => {
    setUserProfileId(userProfile?.id || null);
    // Mantemos o polling ativo para refletir mudanças de pagamento/edge imediatamente
    setIsPolling(true);
  }, [userProfile?.id]);

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
          // Buscar uploads de Document Requests do aluno e agrupar por aplicação
          if (data && data.length && user?.id) {
            try {
              const apps = (data as any[]);
              const appIds = apps.map(a => a.id);
              const uniIds = apps.map(a => (a as any).scholarships?.university_id).filter(Boolean);
              // Buscar requests individuais da aplicação e globais por universidade
              const { data: reqs } = await supabase
                .from('document_requests')
                .select('id,title,scholarship_application_id,university_id,is_global')
                .or(`scholarship_application_id.in.(${appIds.join(',')}),and(is_global.eq.true,university_id.in.(${uniIds.join(',')}))`);
              const requestIds = (reqs || []).map(r => r.id);
              if (requestIds.length) {
                const { data: uploads } = await supabase
                  .from('document_request_uploads')
                  .select('document_request_id,status,review_notes,uploaded_at,uploaded_by')
                  .in('document_request_id', requestIds)
                  .eq('uploaded_by', user.id);
                // Mapear requestId -> {title, appIds[]}
                const reqMeta: Record<string, { title: string; appIds: string[] }> = {};
                (reqs || []).forEach((r: any) => {
                  if (r.scholarship_application_id) {
                    reqMeta[r.id] = { title: r.title, appIds: [r.scholarship_application_id] };
                  } else if (r.is_global && r.university_id) {
                    const targetApps = apps.filter(a => (a as any).scholarships?.university_id === r.university_id).map(a => a.id);
                    reqMeta[r.id] = { title: r.title, appIds: targetApps };
                  }
                });
                const grouped: Record<string, { title: string; status: string; review_notes?: string }[]> = {};
                (uploads || []).forEach((u: any) => {
                  const meta = reqMeta[u.document_request_id];
                  if (!meta) return;
                  meta.appIds.forEach(appId => {
                    if (!grouped[appId]) grouped[appId] = [];
                    grouped[appId].push({ title: meta.title, status: (u.status || '').toLowerCase(), review_notes: u.review_notes || undefined });
                  });
                });
                if (isMounted) setRequestUploadsByApp(grouped);
              } else {
                if (isMounted) setRequestUploadsByApp({});
              }
            } catch {}
          }
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

  // Nenhum fallback de cart: a página lista exclusivamente o que está em scholarship_applications

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

  // Sincronizar cart com banco de dados quando a página carrega
  useEffect(() => {
    if (user?.id) {
      syncCartWithDatabase(user.id);
    }
  }, [user?.id, syncCartWithDatabase]);

  // Quando o aluno pagar a taxa de uma bolsa aprovada, escondemos as demais aprovadas não pagas
  const chosenPaidApp = applications.find(
    (a) => !!(a as any).is_application_fee_paid || !!(a as any).is_scholarship_fee_paid
  );
  const applicationsToShow = chosenPaidApp
    ? applications.filter((a) => a.id === chosenPaidApp.id)
    : applications;



  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // const sanitizeFileName = (fileName: string): string => fileName;

  // const onSelectFile = (appId: string, type: string, file: File | null) => {
  //   setPendingUploads(prev => ({ ...prev, [appId]: { ...(prev[appId] || {}), [type]: file } }));
  // };

  // const submitUpdatedDocs = async (application: any) => { };

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

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return 'APPROVED BY THE UNIVERSITY';
    if (status === 'rejected') return 'NOT SELECTED FOR THE SCHOLARSHIP';
    return status.replace('_', ' ').toUpperCase();
  };

  // Função para gerar mensagens detalhadas sobre o status
  const getStatusDescription = (application: ApplicationWithScholarship) => {
    const status = application.status;
    const hasDocuments = (application as any)?.documents && Array.isArray((application as any).documents) && (application as any).documents.length > 0;
    const hasPendingDocuments = hasDocuments && (application as any).documents.some((doc: any) => 
      doc.status === 'pending' || doc.status === 'under_review' || doc.status === 'changes_requested'
    );
    const applicationFeePaid = !!(application as any).is_application_fee_paid;
    const scholarshipFeePaid = !!(application as any).is_scholarship_fee_paid;

    switch (status) {
      case 'approved':
        if (hasPendingDocuments) {
          return {
            title: 'Documents Approved by University',
            description: 'Great news! Your application has been approved, but some documents still need attention.',
            nextSteps: ['Complete any pending document uploads', 'Pay the application fee to secure your spot', 'Prepare for the next phase of enrollment'],
            icon: '📋',
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
          };
        } else if (!applicationFeePaid) {
          return {
            title: 'Application Approved - Payment Required',
            description: 'Congratulations! Your application has been fully approved. The next step is to pay the application fee.',
            nextSteps: ['Pay the application fee to secure your scholarship', 'Complete enrollment process', 'Prepare for your academic journey'],
            icon: '💳',
            color: 'text-green-700',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
          };
        } else if (!scholarshipFeePaid) {
          return {
            title: 'Application Fee Paid - Scholarship Fee Required',
            description: 'Excellent! Your application fee has been confirmed. Now pay the scholarship fee to finalize your enrollment.',
            nextSteps: ['Pay the scholarship fee to complete enrollment', 'Receive final confirmation', 'Begin your academic program'],
            icon: '🎓',
            color: 'text-purple-700',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200'
          };
        } else {
          return {
            title: 'Fully Enrolled!',
            description: 'Perfect! You have successfully completed all requirements and are officially enrolled.',
            nextSteps: ['Access your student portal', 'Review class schedule', 'Connect with academic advisors'],
            icon: '🎉',
            color: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200'
          };
        }
      
      case 'rejected':
        return {
          title: 'Application Not Selected',
          description: 'Unfortunately, your application was not selected for this scholarship opportunity.',
          nextSteps: ['Review other available scholarships', 'Consider improving your application', 'Apply for different programs'],
          icon: '📝',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      
      case 'under_review':
        return {
          title: 'Application Under Review',
          description: 'Your application is currently being evaluated by the university. This process typically takes 2-4 weeks.',
          nextSteps: ['Wait for university decision', 'Monitor your email for important notifications', 'Check application status regularly', 'Be patient during the review process'],
          icon: '🔍',
          color: 'text-amber-700',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
      
      case 'pending_scholarship_fee':
        return {
          title: 'Application Fee Confirmed',
          description: 'Your application fee has been received and confirmed. You are now eligible for the scholarship.',
          nextSteps: ['Pay the scholarship fee to complete enrollment', 'Submit any remaining documents', 'Prepare for your program start'],
          icon: '✅',
          color: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      
      case 'pending':
      default:
        if (hasPendingDocuments) {
          return {
            title: 'Documents Under University Review',
            description: 'Your application has been submitted with all required documents. The university is currently reviewing your materials.',
            nextSteps: ['Wait for university document review', 'Monitor your email for notifications', 'Check application status regularly'],
            icon: '📋',
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
          };
        } else {
          return {
            title: 'Application Submitted',
            description: 'Your application has been successfully submitted and is awaiting initial review.',
            nextSteps: ['Wait for document review', 'Monitor application status', 'Prepare for next steps'],
            icon: '📤',
            color: 'text-slate-700',
            bgColor: 'bg-slate-50',
            borderColor: 'border-slate-200'
          };
        }
    }
  };

  // Função para verificar se há documentos pendentes
  const hasPendingDocuments = (application: ApplicationWithScholarship) => {
    const docs = parseApplicationDocuments((application as any).documents);
    return docs.some(doc => 
      doc.status === 'pending' || doc.status === 'under_review' || doc.status === 'changes_requested'
    );
  };

  // Estilo para status dos documentos (nível do documento, não da aplicação)
  const getDocBadgeClasses = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-700 border border-green-200';
    if (s === 'changes_requested') return 'bg-red-100 text-red-700 border border-red-200';
    if (s === 'under_review') return 'bg-amber-100 text-amber-700 border border-amber-200';
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  const docKey = (applicationId: string, type: string) => `${applicationId}:${type}`;

  const handleSelectDocFile = (applicationId: string, type: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [docKey(applicationId, type)]: file }));
  };

  const handleUploadDoc = async (applicationId: string, type: string) => {
    const key = docKey(applicationId, type);
    const file = selectedFiles[key];
    if (!user?.id || !file) return;
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const path = `${user.id}/${applicationId}-${type}-${Date.now()}-${file.name}`;
      const { data, error: upErr } = await supabase.storage
        .from('student-documents')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const publicUrl = supabase.storage.from('student-documents').getPublicUrl(data?.path || path).data.publicUrl;
      if (!publicUrl) throw new Error('Failed to get file URL');
      // Log no histórico do aluno
      await supabase.from('student_documents').insert({ user_id: user.id, type, file_url: publicUrl, status: 'under_review' });

      // Atualizar documentos da aplicação
      const app = applications.find(a => a.id === applicationId);
      const currentDocs: any[] = (app as any)?.documents || [];
      const normalized = parseApplicationDocuments(currentDocs);
      const idx = normalized.findIndex(d => d.type === type);
      const newDoc = { type, url: publicUrl, status: 'under_review', review_notes: undefined as any } as any;
      let newDocs: any[];
      if (idx >= 0) {
        // preservar outros docs com estrutura o mais completa possível
        newDocs = (currentDocs as any[]).map((d: any) => d.type === type ? { ...(d || {}), ...newDoc } : d);
      } else {
        const base = Array.isArray(currentDocs) ? [...currentDocs] : [];
        newDocs = [...base, newDoc];
      }
      await supabase.from('scholarship_applications').update({ documents: newDocs }).eq('id', applicationId);
      // Atualiza estado local
      setApplications(prev => prev.map(a => a.id === applicationId ? ({ ...a, documents: newDocs } as any) : a));
      // Limpa seleção
      setSelectedFiles(prev => ({ ...prev, [key]: null }));
    } catch (e) {
      // opcional: setError local da página
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Normaliza o array de documentos da aplicação para lidar com ambos os formatos:
  // - string[] (legado)
  // - { type, url, status, review_notes }[] (atual)
  const parseApplicationDocuments = (documents: any): { type: string; status?: string; review_notes?: string }[] => {
    if (!Array.isArray(documents)) return [];
    if (documents.length === 0) return [];
    if (typeof documents[0] === 'string') {
      return (documents as string[]).map((t) => ({ type: t }));
    }
    return (documents as any[]).map((d) => ({ type: d.type, status: d.status, review_notes: d.review_notes }));
  };

  // const getStatusMessage = (status: string) => {
  //   switch (status) {
  //     case 'approved': return '';
  //     case 'rejected': return 'Unfortunately, your application was not selected.';
  //     case 'under_review': return 'Your application is currently being reviewed.';
  //     case 'pending_scholarship_fee': return 'Pending scholarship fee payment.';
  //     default: return 'Your application is pending review.';
  //   }
  // };

  const stats = {
    total: applicationsToShow.length,
    pending: applicationsToShow.filter(app => app.status === 'pending').length,
    approved: applicationsToShow.filter(app => app.status === 'approved').length,
    rejected: applicationsToShow.filter(app => app.status === 'rejected').length,
    under_review: applicationsToShow.filter(app => app.status === 'under_review').length,
    pending_scholarship_fee: applicationsToShow.filter(app => app.status === 'pending_scholarship_fee').length,
  };

  // const createOrGetApplication = async (scholarshipId: string, studentProfileId: string) => {
  //   // Verifica se já existe aplicação
  //   const { data: existing, error: fetchError } = await supabase
  //     .from('scholarship_applications')
  //     .select('id')
  //     .eq('student_id', studentProfileId)
  //     .eq('scholarship_id', scholarshipId)
  //     .maybeSingle();
  //   if (fetchError) throw fetchError;
  //   if (existing) return { applicationId: existing.id };
  //   // Cria nova aplicação
  //   const { data, error } = await supabase
  //     .from('scholarship_applications')
  //     .insert({
  //       student_id: studentProfileId,
  //       scholarship_id: scholarshipId,
  //       status: 'pending_scholarship_fee',
  //       applied_at: new Date().toISOString(),
  //       student_process_type: localStorage.getItem('studentProcessType') || null,
  //     })
  //     .select('id')
  //     .single();
  //   if (error) throw error;
  //   return { applicationId: data.id };
  // };

  // Garante/recupera a application para uso no checkout
  const ensureApplication = async (scholarshipId: string): Promise<{ applicationId: string } | undefined> => {
    if (!userProfileId) return undefined;
    const { data: existing, error: fetchError } = await supabase
      .from('scholarship_applications')
      .select('id')
      .eq('student_id', userProfileId)
      .eq('scholarship_id', scholarshipId)
      .maybeSingle();
    if (fetchError) return undefined;
    if (existing) return { applicationId: existing.id };
    const { data, error } = await supabase
      .from('scholarship_applications')
      .insert({
        student_id: userProfileId,
        scholarship_id: scholarshipId,
        status: 'pending',
        applied_at: new Date().toISOString(),
        student_process_type: localStorage.getItem('studentProcessType') || null,
      })
      .select('id')
      .single();
    if (error) return undefined;
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

  const hasSelectedScholarship = false;

const getLevelColor = (level: any) => {
  switch (level.toLowerCase()) {
    case 'undergraduate':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'graduate':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'doctoral':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  // Function to handle application fee payment confirmation
  const handleApplicationFeeClick = (application: ApplicationWithScholarship) => {
    setPendingApplication(application);
    setShowConfirmationModal(true);
  };

  const handleCancelPayment = () => {
    setShowConfirmationModal(false);
    setPendingApplication(null);
  };

  // Count other approved applications
  const otherApprovedApps = applications.filter(app => 
    app.status === 'approved' && 
    app.id !== pendingApplication?.id &&
    !app.is_application_fee_paid
  );

  return (
    <>
      {/* Confirmation Modal */}
      {showConfirmationModal && pendingApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCancelPayment}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-3xl px-6 pt-6 pb-8 text-left overflow-hidden shadow-xl transform transition-all sm:mt-60 sm:align-middle sm:max-w-lg sm:w-full sm:p-8">
              <div className="sm:flex sm:items-start">
                
                <div className="mt-3 text-center sm:mt-0 sm:text-left flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Confirm Your Scholarship Selection
                  </h3>
                  <div className="space-y-4">
                    
                    
                    
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
                      <div className="flex items-start relative">
                        <AlertCircle className="h-5 w-5 absolute text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-center font-bold text-amber-900 mb-2">Important Decision</h4>
                          <p className="text-amber-800 text-sm leading-relaxed mb-3">
                            By proceeding with this payment, you're making this your <strong>final scholarship choice</strong>. 
                            This action cannot be undone.
                          </p>
                          {otherApprovedApps.length > 0 && (
                            <div className="bg-white rounded-xl p-3 border border-amber-200">
                              <p className="text-amber-800 text-sm font-semibold mb-2">
                                This will remove {otherApprovedApps.length} other approved application{otherApprovedApps.length > 1 ? 's' : ''}:
                              </p>
                              <ul className="text-amber-700 text-xs space-y-1">
                                {otherApprovedApps.map(app => (
                                  <li key={app.id} className="flex items-center">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                                    {app.scholarships?.title} - {app.scholarships?.universities?.name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 sm:mt-8 sm:flex sm:flex-row-reverse gap-3">
                <StripeCheckout
                  productId="applicationFee"
                  feeType="application_fee"
                  paymentType="application_fee"
                  buttonText={`Yes, Secure My Scholarship ($${pendingApplication.scholarships?.application_fee_amount ? 
                    Number(pendingApplication.scholarships.application_fee_amount).toFixed(2) : 
                    '350.00'
                  })`}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm text-center mb-3 sm:mb-0"
                  successUrl={`${window.location?.origin || ''}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                  cancelUrl={`${window.location?.origin || ''}/student/dashboard/application-fee-error`}
                  disabled={false}
                  scholarshipsIds={[pendingApplication.scholarship_id]}
                  metadata={{ application_id: pendingApplication.id, selected_scholarship_id: pendingApplication.scholarship_id }}
                  scholarshipData={pendingApplication.scholarships ? {
                    title: pendingApplication.scholarships.title || '',
                    universityName: pendingApplication.scholarships.universities?.name || 'Unknown University',
                    applicationFeeAmount: pendingApplication.scholarships.application_fee_amount || 350.00
                  } : undefined}
                />
                <button
                  type="button"
                  className="w-full sm:w-auto bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 text-sm"
                  onClick={handleCancelPayment}
                >
                  Let me think about it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    <div className="pt-6 sm:pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-1 sm:mb-2">My Applications</h2>
            <p className="text-base sm:text-lg text-slate-600">Track the status of your scholarship applications and next steps</p>
          </div>
        </div>

        {/* Aviso removido conforme solicitação */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 min-h-[120px] sm:min-h-[140px] flex items-center hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-2">Total Applications</p>
              <p className="text-3xl sm:text-4xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center">
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 min-h-[120px] sm:min-h-[140px] flex items-center hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-2">Approved</p>
              <p className="text-3xl sm:text-4xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
            </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 min-h-[120px] sm:min-h-[140px] flex items-center hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-2">Pending</p>
              <p className="text-3xl sm:text-4xl font-bold text-gray-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center">
              <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-gray-600" />
            </div>
            </div>
          </div>
        </div>

        {/* Guidance: explain fees and next steps */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8 mb-8">
          {/* Important Notice */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">!</div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm mb-2">Stay Updated!</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  <strong>Important:</strong> Always check your email for notifications from the university. 
                  Application status updates, document requests, and important deadlines will be sent to your registered email address.
                </p>
              </div>
            </div>
          </div>

          {/* Mobile: Collapsible steps */}
          <div className="block sm:hidden">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</div>
                  <span className="font-bold text-slate-900">Application Process Steps</span>
                </div>
                <svg className="w-5 h-5 text-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">Submit Documents</div>
                    <div className="text-xs text-slate-600">Upload passport, diploma and proof of funds</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">University Review</div>
                    <div className="text-xs text-slate-600">Application shows as Pending until approved</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">Pay Application Fee</div>
                    <div className="text-xs text-slate-600">Secure your approved scholarship spot</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">Pay Scholarship Fee</div>
                    <div className="text-xs text-slate-600">Complete enrollment and start your program</div>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">Step 1 — Submit your documents</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">Upload passport, high school diploma and proof of funds so the university can evaluate your application.</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">Step 2 — University review</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">Your application will show as Pending/Under Review until the university approves your candidacy.</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">Step 3 — Application fee</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">After approval, pay the Application Fee to secure your scholarship spot and proceed to enrollment.</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">Step 4 — Scholarship fee</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">Once confirmed, pay the Scholarship Fee to complete enrollment and begin your academic program.</div>
            </div>
          </div>
        </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 sm:p-16 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">No applications yet</h3>
          <p className="text-slate-500 mb-6 sm:mb-8 max-w-lg mx-auto text-base sm:text-lg leading-relaxed px-4">
            Start applying for scholarships to track your progress here. We'll help you find the best opportunities that match your profile.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 max-w-4xl mx-auto">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 sm:mb-3" />
              <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">Find Scholarships</h4>
              <p className="text-xs sm:text-sm text-slate-600">Browse through hundreds of opportunities</p>
            </div>
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-2 sm:mb-3" />
              <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">Apply Easily</h4>
              <p className="text-xs sm:text-sm text-slate-600">Simple application process with guidance</p>
            </div>
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200 sm:col-span-2 lg:col-span-1">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 sm:mb-3" />
              <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">Track Progress</h4>
              <p className="text-xs sm:text-sm text-slate-600">Monitor your applications in real-time</p>
            </div>
          </div>
          
          <Link
            to="/student/dashboard/scholarships"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center text-sm sm:text-base"
          >
            Find Scholarships
            <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
          </Link>
        </div>
              ) : (
          <>
            {/* Applications List - two sections */}
          <div className="space-y-10">
            {/* Approved */}
            {(() => {
              const approvedList = applicationsToShow.filter(a => a.status === 'approved' || a.status === 'enrolled');
              if (approvedList.length === 0) return null;
              const selectedApp = approvedList.find(a => (a as any).is_scholarship_fee_paid);
              const hasSelectedScholarship = !!selectedApp;
              return (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Approved by the University</h3>
                    <span className="text-sm text-green-700 bg-green-100 border border-green-200 md:px-4 md:py-2 px-2 py-1 rounded-full font-medium">{approvedList.length} approved</span>
                  </div>
                  <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-5 text-sm text-blue-800">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">Important:</span> You can choose only one scholarship. After you pay the Application Fee for a scholarship, other options will be disabled.
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center md:justify-start gap-4 sm:gap-6 overflow-x-auto pb-4 items-start" style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    {approvedList.map((application) => {
                      const Icon = getStatusIcon(application.status);
                      const scholarship = application.scholarships;
                      const applicationFeePaid = !!application.is_application_fee_paid;
                      const scholarshipFeePaid = !!application.is_scholarship_fee_paid;
                      if (!scholarship) return null;

                      // Obter descrição detalhada do status
                      const statusInfo = getStatusDescription(application);
                      
                      return (
                        <div key={application.id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group flex-shrink-0 w-80 sm:w-96 min-w-0 self-start">
                <div className="p-4 sm:p-6">
                  {/* Header Section */}
                  <div className="mb-4 sm:mb-6">
                    {/* Status Badge - Primeiro elemento */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold border ${getStatusColor(application.status === 'enrolled' ? 'approved' : application.status)}`}>
                        <Icon className="h-4 w-4 mr-2" />
                        {getStatusLabel(application.status === 'enrolled' ? 'approved' : application.status)}
                      </span>
                    </div>
                    
                    {/* Scholarship Title */}
                    <h2 className="font-bold text-gray-900 text-lg mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                      {scholarship.title}
                    </h2>
                    
                    {/* University */}
                    <div className="flex items-center text-gray-600 mb-3">
                      <Building className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-sm">{scholarship.universities?.name}</span>
                    </div>
                    
                    {/* Level Badge */}
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getLevelColor(scholarship.level)}`}>
                        <GraduationCap className="h-4 w-4 mr-1.5" />
                        {scholarship.level.charAt(0).toUpperCase() + scholarship.level.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Status Description Card */}
                  <div className={`mb-4 sm:mb-6 rounded-2xl p-4 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
                    <div className="flex items-start mb-3">
                      <div className="flex-1">
                        <h3 className={`font-bold text-sm ${statusInfo.color} mb-2`}>
                          {statusInfo.title}
                        </h3>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {statusInfo.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Next Steps */}
                    {statusInfo.nextSteps && statusInfo.nextSteps.length > 0 && (
                      <div className="mt-4">
                        <h4 className={`font-semibold text-xs ${statusInfo.color} mb-2 uppercase tracking-wide`}>
                          Next Steps:
                        </h4>
                        <ul className="space-y-2">
                          {statusInfo.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-start text-xs text-slate-700">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
  
                  {/* Details Section */}
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-slate-200">
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded-lg mr-3 flex-shrink-0">
                          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Annual Scholarship Value</p>
                          <p className="font-bold text-base sm:text-lg text-green-700 truncate">
                            {formatAmount(scholarship.annual_value_with_scholarship ?? 0)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3 flex-shrink-0">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Application Date</p>
                          <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                            {new Date(application.applied_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
  
                  {/* Payment Status Section */}
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-900 mb-4 text-base">Payment Status</h3>
                    <div className="space-y-3">
                      <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 text-sm">Application Fee</span>
                          <span className="text-base font-bold text-gray-700">
                            ${scholarship.application_fee_amount ? Number(scholarship.application_fee_amount).toFixed(2) : '350.00'}
                          </span>
                        </div>
                        {applicationFeePaid ? (
                          <div className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Paid
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApplicationFeeClick(application)}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                            disabled={hasSelectedScholarship && !scholarshipFeePaid}
                          >
                            Pay Application Fee
                          </button>
                        )}
                      </div>
  
                      <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 text-sm">Scholarship Fee</span>
                          <span className="text-base font-bold text-gray-700">$550</span>
                        </div>
                        {scholarshipFeePaid ? (
                          <div className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Paid
                          </div>
                        ) : (
                          <StripeCheckout
                            productId="scholarshipFee"
                            feeType="scholarship_fee"
                            paymentType="scholarship_fee"
                            buttonText="Pay Scholarship Fee"
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                            successUrl={`${window.location?.origin || ''}/student/dashboard/scholarship-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                            cancelUrl={`${window.location?.origin || ''}/student/dashboard/scholarship-fee-error`}
                            disabled={!applicationFeePaid || scholarshipFeePaid || (hasSelectedScholarship && !scholarshipFeePaid)}
                            scholarshipsIds={[application.scholarship_id]}
                            metadata={{ application_id: application.id, selected_scholarship_id: application.scholarship_id }}
                          />
                        )}
                      </div>
                    </div>
  
                    {(hasSelectedScholarship && !scholarshipFeePaid) && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-start">
                          <AlertCircle className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-800 leading-relaxed">
                            You have already selected another scholarship. Payments for additional scholarships are currently disabled.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
  
                  {/* Action Section */}
                  {(applicationFeePaid && scholarshipFeePaid) && (
                    <div className="border-t border-slate-200 pt-4">
                      <Link
                        to={`/student/dashboard/application/${application.id}/chat`}
                        className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 text-sm"
                      >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        View Application Details
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
                  </div>
                </section>
              );
            })()}

            {/* Others */}
            {(() => {
              const otherList = applicationsToShow.filter(a => a.status !== 'approved' && a.status !== 'enrolled');
              if (otherList.length === 0) return null;
              return (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Pending and In Progress</h3>
                    <span className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-2 rounded-full font-medium">{otherList.length} applications</span>
                  </div>
                  <div className="sm:grid flex justify-center sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto pb-4 items-start" style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    {otherList.map((application) => {
                      const Icon = getStatusIcon(application.status);
                      const scholarship = application.scholarships;
                      if (!scholarship) return null;

                      // Obter descrição detalhada do status
                      const statusInfo = getStatusDescription(application);
                      
                      return (
                        <div key={application.id} className="bg-white rounded-3xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden group flex-shrink-0 w-80 sm:w-96 min-w-0 self-start">
                          <div className="p-4 sm:p-6">
                            {/* Header Section - mesma estrutura da seção aprovada */}
                            <div className="mb-4 sm:mb-6">
                              {/* Status Badge - Primeiro elemento */}
                              <div className="mb-3">
                                <span className={`inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold border ${getStatusColor(application.status)}`}>
                                  <Icon className="h-4 w-4 mr-2" />
                                  {getStatusLabel(application.status)}
                                </span>
                              </div>
                              
                              {/* Scholarship Title */}
                              <h3 className="font-bold text-slate-900 text-lg mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                                {scholarship.title}
                              </h3>
                              
                              {/* University */}
                              <div className="flex items-center text-slate-600 mb-3">
                                <Building className="h-4 w-4 mr-2 text-slate-500 flex-shrink-0" />
                                <span className="font-medium text-sm truncate">{scholarship.universities?.name}</span>
                              </div>
                              
                              {/* Level Badge */}
                              <div className="flex items-center">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getLevelColor(scholarship.level)}`}>
                                  <GraduationCap className="h-4 w-4 mr-1.5" />
                                  {scholarship.level.charAt(0).toUpperCase() + scholarship.level.slice(1)}
                                </span>
                              </div>
                            </div>

                            {/* Status Description Card */}
                            <div className={`mb-4 sm:mb-6 rounded-2xl p-4 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
                              <div className="flex items-start mb-3">
                                <div className="flex-1">
                                  <h3 className={`font-bold text-sm ${statusInfo.color} mb-2`}>
                                    {statusInfo.title}
                                  </h3>
                                  <p className="text-sm text-slate-700 leading-relaxed">
                                    {statusInfo.description}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Next Steps */}
                              {statusInfo.nextSteps && statusInfo.nextSteps.length > 0 && (
                                <div className="mt-4">
                                  <h4 className={`font-semibold text-xs ${statusInfo.color} mb-2 uppercase tracking-wide`}>
                                    Next Steps:
                                  </h4>
                                  <ul className="space-y-2">
                                    {statusInfo.nextSteps.map((step, index) => (
                                      <li key={index} className="flex items-start text-xs text-slate-700">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                        {step}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Scholarship Details */}
                            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-4 mb-6 border border-slate-200">
                              <div className="grid grid-cols-1 gap-4 text-sm">
                                <div className="flex items-center">
                                  <DollarSign className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
                                  <div>
                                    <span className="font-semibold text-green-700 text-base">
                                      {formatAmount(scholarship.annual_value_with_scholarship ?? 0)}
                                    </span>
                                    <p className="text-slate-600 text-xs">Annual value</p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="h-5 w-5 mr-3 text-slate-500 flex-shrink-0" />
                                  <div>
                                    <span className="font-semibold text-slate-700">
                                      {new Date(application.applied_at).toLocaleDateString()}
                                    </span>
                                    <p className="text-slate-600 text-xs">Applied on</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Not selected reason for rejected applications */}
                            {application.status === 'rejected' && (application as any).notes && (
                              <div className="mb-6 rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                                <div className="flex items-start">
                                  <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <strong className="block mb-1">Reason:</strong> 
                                    {(application as any).notes}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Documents Status - Individual Check List */}
                            {(() => {
                              const docs = parseApplicationDocuments((application as any).documents);
                              const reqUploads = requestUploadsByApp[application.id] || [];
                              
                              // Create a complete document list with status
                              const allDocuments = [
                                { type: 'passport', label: 'Passport' },
                                { type: 'diploma', label: 'High School Diploma' },
                                { type: 'funds_proof', label: 'Proof of Funds' }
                              ].map(docTemplate => {
                                const docData = docs.find(d => d.type === docTemplate.type);
                                return {
                                  ...docTemplate,
                                  status: docData?.status || 'pending',
                                  review_notes: docData?.review_notes
                                };
                              });

                              if (docs.length === 0 && reqUploads.length === 0) return null;

                              return (
                                <div className="border-t border-slate-200 pt-6">
                                  <button 
                                    onClick={() => toggleChecklist(application.id)}
                                    className="flex items-center justify-between cursor-pointer select-none mb-4 p-2 hover:bg-slate-50 rounded-lg transition-colors w-full text-left"
                                  >
                                    <h4 className="text-sm font-bold text-slate-900 flex items-center">
                                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                      Documents Checklist
                                    </h4>
                                    <svg 
                                      className={`w-4 h-4 text-slate-500 transition-transform ${openChecklists[application.id] ? 'rotate-180' : ''}`} 
                                      viewBox="0 0 20 20" 
                                      fill="currentColor" 
                                      aria-hidden="true"
                                    >
                                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
                                    </svg>
                                  </button>
                                  
                                                                     <div 
                                     className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                       openChecklists[application.id] 
                                         ? 'max-h-[2000px] opacity-100' 
                                         : 'max-h-0 opacity-0'
                                     }`}
                                   >
                                     <div className="space-y-3 pt-2">
                                       {/* Required Documents */}
                                       {allDocuments.map((doc) => {
                                         const status = (doc.status || '').toLowerCase();
                                         const isApproved = status === 'approved';
                                         const isRejected = status === 'changes_requested' || status === 'rejected';
                                         const isUnderReview = status === 'under_review';
                                         const isPending = !isApproved && !isRejected && !isUnderReview;

                                         return (
                                           <div key={doc.type} className="bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-slate-300 transition-all duration-200">
                                             <div className="flex items-start justify-between">
                                               <div className="flex items-start flex-1">
                                                 {/* Check Icon */}
                                                 <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 transition-all duration-200 ${
                                                   isApproved 
                                                     ? 'bg-green-100 border-green-400 text-green-600' 
                                                     : isRejected 
                                                       ? 'bg-red-100 border-red-400 text-red-600'
                                                       : isUnderReview
                                                         ? 'bg-amber-100 border-amber-400 text-amber-600'
                                                         : 'bg-slate-100 border-slate-300 text-slate-400'
                                                 }`}>
                                                   {isApproved ? (
                                                     <CheckCircle className="h-4 w-4" />
                                                   ) : isRejected ? (
                                                     <XCircle className="h-4 w-4" />
                                                   ) : isUnderReview ? (
                                                     <Clock className="h-4 w-4" />
                                                   ) : (
                                                     <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                                   )}
                                                 </div>
                                                 
                                                 {/* Document Info */}
                                                 <div className="flex-1 min-w-0">
                                                   <div className="flex items-center justify-between mb-1">
                                                     <h5 className="font-semibold text-slate-900 text-sm truncate">{doc.label}</h5>
                                                     <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                                       isApproved 
                                                         ? 'bg-green-50 text-green-700 border-green-200' 
                                                         : isRejected 
                                                           ? 'bg-red-50 text-red-700 border-red-200'
                                                         : isUnderReview
                                                           ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                           : 'bg-slate-50 text-slate-600 border-slate-200'
                                                     }`}>
                                                       {isApproved ? 'Approved' : isRejected ? 'Changes Needed' : isUnderReview ? 'Under Review' : 'Pending'}
                                                     </span>
                                                   </div>
                                                   
                                                   {/* Review Notes */}
                                                   {doc.review_notes && isRejected && (
                                                     <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                       <p className="text-xs text-red-700">
                                                         <strong>Review:</strong> {doc.review_notes}
                                                       </p>
                                                     </div>
                                                   )}
                                                   
                                                   {/* Upload Action for Rejected Docs */}
                                                   {isRejected && (
                                                     <div className="mt-3 space-y-2">
                                                       <label className="cursor-pointer bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-2 border-blue-200 hover:from-blue-100 hover:to-blue-200 px-3 py-2 rounded-lg font-semibold transition-all duration-200 w-full block text-center text-xs hover:shadow-md">
                                                         <span>Send New {doc.label}</span>
                                                         <input
                                                           type="file"
                                                           className="sr-only"
                                                           accept="application/pdf,image/*"
                                                           onChange={(e) => handleSelectDocFile(application.id, doc.type, e.target.files ? e.target.files[0] : null)}
                                                         />
                                                       </label>
                                                       {selectedFiles[docKey(application.id, doc.type)] && (
                                                         <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                           <span className="font-medium">Selected:</span> {selectedFiles[docKey(application.id, doc.type)]?.name}
                                                         </div>
                                                       )}
                                                       <button
                                                         className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs"
                                                         disabled={!selectedFiles[docKey(application.id, doc.type)] || uploading[docKey(application.id, doc.type)]}
                                                         onClick={() => handleUploadDoc(application.id, doc.type)}
                                                       >
                                                         {uploading[docKey(application.id, doc.type)] ? (
                                                           <div className="flex items-center justify-center">
                                                             <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                                             Uploading...
                                                           </div>
                                                         ) : 'Upload Document'}
                                                       </button>
                                                     </div>
                                                   )}
                                                 </div>
                                               </div>
                                             </div>
                                           </div>
                                         );
                                       })}

                                       {/* University Additional Requests */}
                                       {reqUploads.length > 0 && (
                                         <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border-2 border-slate-200 p-4">
                                           <h5 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                                             <Building className="h-4 w-4 mr-2 text-blue-600" />
                                             University Additional Requests
                                           </h5>
                                           <div className="space-y-2">
                                             {reqUploads.map((req, idx) => {
                                               const status = (req.status || '').toLowerCase();
                                               const isApproved = status === 'approved';
                                               const isRejected = status === 'rejected';
                                               const isUnderReview = status === 'under_review';
                                               
                                               return (
                                                 <div key={idx} className="bg-white rounded-lg border border-slate-200 p-3">
                                                   <div className="flex items-center justify-between">
                                                     <div className="flex items-center">
                                                       <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 ${
                                                         isApproved 
                                                           ? 'bg-green-100 border-green-400' 
                                                           : isRejected 
                                                             ? 'bg-red-100 border-red-400'
                                                             : 'bg-amber-100 border-amber-400'
                                                       }`}>
                                                         {isApproved ? (
                                                           <CheckCircle className="h-3 w-3 text-green-600" />
                                                         ) : isRejected ? (
                                                           <XCircle className="h-3 w-3 text-red-600" />
                                                         ) : (
                                                           <Clock className="h-3 w-3 text-amber-600" />
                                                         )}
                                                       </div>
                                                       <span className="font-medium text-slate-900 text-xs">{req.title}</span>
                                                     </div>
                                                     <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                       isApproved 
                                                         ? 'bg-green-100 text-green-700' 
                                                         : isRejected 
                                                           ? 'bg-red-100 text-red-700'
                                                           : 'bg-amber-100 text-amber-700'
                                                     }`}>
                                                       {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Under Review'}
                                                     </span>
                                                   </div>
                                                   {req.review_notes && isRejected && (
                                                     <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                                                       <strong>Note:</strong> {req.review_notes}
                                                     </div>
                                                   )}
                                                 </div>
                                               );
                                             })}
                                           </div>
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}
          </div>
        </>
      )}
      </div>
    </div>
    </>
  );
};

export default MyApplications;