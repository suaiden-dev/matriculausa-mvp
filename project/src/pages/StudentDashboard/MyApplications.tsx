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
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, Scholarship } from '../../types';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useCartStore } from '../../stores/applicationStore';
import { ScholarshipConfirmationModal } from '../../components/ScholarshipConfirmationModal';
import { formatCentsToDollars } from '../../utils/currency';
// import StudentDashboardLayout from "./StudentDashboardLayout";
// import CustomLoading from '../../components/CustomLoading';

// Combine os tipos para incluir os detalhes da bolsa na aplicação
type ApplicationWithScholarship = Application & {
  scholarships: Scholarship | null;
};

// Labels amigáveis para os documentos principais - será definido dentro do componente

const MyApplications: React.FC = () => {
  const { t } = useTranslation();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  
  // Labels amigáveis para os documentos principais
  const DOCUMENT_LABELS: Record<string, string> = {
    passport: t('studentDashboard.myApplications.documents.passport'),
    diploma: t('studentDashboard.myApplications.documents.highSchoolDiploma'),
    funds_proof: t('studentDashboard.myApplications.documents.proofOfFunds'),
  };
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
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Modal confirmation states para Scholarship Fee
  const [showScholarshipFeeModal, setShowScholarshipFeeModal] = useState(false);
  const [pendingScholarshipFeeApplication, setPendingScholarshipFeeApplication] = useState<ApplicationWithScholarship | null>(null);
  const [isProcessingScholarshipFeeCheckout, setIsProcessingScholarshipFeeCheckout] = useState(false);

  // Estado para controlar abertura/fechamento individual dos documents checklist
  const [openChecklists, setOpenChecklists] = useState<Record<string, boolean>>({});

  // Função para alternar o estado de um checklist específico
  const toggleChecklist = (applicationId: string) => {
    setOpenChecklists(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  // Função para verificar se há documentos rejeitados e abrir automaticamente o checklist
  const checkAndOpenRejectedDocuments = (application: ApplicationWithScholarship) => {
    const docs = parseApplicationDocuments((application as any).documents);
    const hasRejectedDocuments = docs.some(doc => 
      (doc.status || '').toLowerCase() === 'changes_requested' || 
      (doc.status || '').toLowerCase() === 'rejected'
    );
    
    if (hasRejectedDocuments && !openChecklists[application.id]) {
      setOpenChecklists(prev => ({
        ...prev,
        [application.id]: true
      }));
    }
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
          // Verificar e abrir automaticamente checklists de documentos rejeitados
          if (data && data.length) {
            data.forEach(application => {
              checkAndOpenRejectedDocuments(application);
            });
          }
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
    if (status === 'approved') return t('studentDashboard.myApplications.statusLabels.approvedByUniversity');
    if (status === 'rejected') return t('studentDashboard.myApplications.statusLabels.notSelectedForScholarship');
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
            title: t('studentDashboard.myApplications.statusDescriptions.documentsApprovedByUniversity.title'),
            description: t('studentDashboard.myApplications.statusDescriptions.documentsApprovedByUniversity.description'),
            nextSteps: t('studentDashboard.myApplications.statusDescriptions.documentsApprovedByUniversity.nextSteps', { returnObjects: true }) as string[],
            icon: '📋',
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
          };
        } else if (!applicationFeePaid) {
          return {
            title: t('studentDashboard.myApplications.statusDescriptions.applicationApprovedPaymentRequired.title'),
            description: t('studentDashboard.myApplications.statusDescriptions.applicationApprovedPaymentRequired.description'),
            nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationApprovedPaymentRequired.nextSteps', { returnObjects: true }) as string[],
            icon: '💳',
            color: 'text-green-700',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
          };
        } else if (!scholarshipFeePaid) {
          return {
            title: t('studentDashboard.myApplications.statusDescriptions.applicationFeePaidScholarshipFeeRequired.title'),
            description: t('studentDashboard.myApplications.statusDescriptions.applicationFeePaidScholarshipFeeRequired.description'),
            nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationFeePaidScholarshipFeeRequired.nextSteps', { returnObjects: true }) as string[],
            icon: '🎓',
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
          };
        } else {
          return {
            title: t('studentDashboard.myApplications.statusDescriptions.fullyEnrolled.title'),
            description: t('studentDashboard.myApplications.statusDescriptions.fullyEnrolled.description'),
            nextSteps: t('studentDashboard.myApplications.statusDescriptions.fullyEnrolled.nextSteps', { returnObjects: true }) as string[],
            icon: '🎉',
            color: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200'
          };
        }
      
      case 'rejected':
        return {
          title: t('studentDashboard.myApplications.statusDescriptions.applicationNotSelected.title'),
          description: t('studentDashboard.myApplications.statusDescriptions.applicationNotSelected.description'),
          nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationNotSelected.nextSteps', { returnObjects: true }) as string[],
          icon: '📝',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      
      case 'under_review':
        return {
          title: t('studentDashboard.myApplications.statusDescriptions.applicationUnderReview.title'),
          description: t('studentDashboard.myApplications.statusDescriptions.applicationUnderReview.description'),
          nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationUnderReview.nextSteps', { returnObjects: true }) as string[],
          icon: '🔍',
          color: 'text-amber-700',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
      
      case 'pending_scholarship_fee':
        return {
          title: t('studentDashboard.myApplications.statusDescriptions.applicationFeeConfirmed.title'),
          description: t('studentDashboard.myApplications.statusDescriptions.applicationFeeConfirmed.description'),
          nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationFeeConfirmed.nextSteps', { returnObjects: true }) as string[],
          icon: '✅',
          color: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      
      case 'pending':
      default:
        if (hasPendingDocuments) {
          return {
            title: t('studentDashboard.myApplications.statusDescriptions.documentsUnderUniversityReview.title'),
            description: t('studentDashboard.myApplications.statusDescriptions.documentsUnderUniversityReview.description'),
            nextSteps: t('studentDashboard.myApplications.statusDescriptions.documentsUnderUniversityReview.nextSteps', { returnObjects: true }) as string[],
            icon: '📋',
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
          };
        } else {
          return {
            title: t('studentDashboard.myApplications.statusDescriptions.applicationSubmitted.title'),
            description: t('studentDashboard.myApplications.statusDescriptions.applicationSubmitted.description'),
            nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationSubmitted.nextSteps', { returnObjects: true }) as string[],
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
          <p className="text-slate-600 font-medium">{t('studentDashboard.myApplications.loading')}</p>
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
    return <div className="text-red-500">{t('studentDashboard.myApplications.error', { message: error })}</div>;
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

  // Função para processar checkout Stripe
  const handleStripeCheckout = async () => {
    if (!pendingApplication) return;
    
    try {
      // Ativar loading
      setIsProcessingCheckout(true);
      
      console.log('Iniciando checkout Stripe para application fee com application ID:', pendingApplication.id);
      
      // Chamar diretamente a Edge Function do Stripe
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-application-fee`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: 'price_application_fee', // ID do produto no Stripe
          success_url: `${window.location.origin}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/student/dashboard/application-fee-error`,
          mode: 'payment',
          payment_type: 'application_fee',
          fee_type: 'application_fee',
          metadata: {
            application_id: pendingApplication.id,
            selected_scholarship_id: pendingApplication.scholarship_id,
            fee_type: 'application_fee',
            amount: pendingApplication.scholarships?.application_fee_amount || 350,
            application_fee_amount: pendingApplication.scholarships?.application_fee_amount || 350
          },
          scholarships_ids: [pendingApplication.scholarship_id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const { session_url } = await response.json();
      if (session_url) {
        // Redirecionar diretamente para o checkout do Stripe
        window.location.href = session_url;
      } else {
        throw new Error('URL da sessão não encontrada na resposta');
      }
      
    } catch (error) {
      console.error('Erro ao processar checkout:', error);
      // Reabrir o modal em caso de erro
      setShowConfirmationModal(true);
    } finally {
      // Desativar loading
      setIsProcessingCheckout(false);
    }
  };

  // Função para processar checkout Stripe da Scholarship Fee
  const handleScholarshipFeeCheckout = async () => {
    if (!pendingScholarshipFeeApplication) return;
    
    try {
      // Ativar loading
      setIsProcessingScholarshipFeeCheckout(true);
      
      console.log('Iniciando checkout Stripe para scholarship fee com application ID:', pendingScholarshipFeeApplication.id);
      
      // Chamar diretamente a Edge Function do Stripe para scholarship fee
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-scholarship-fee`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: 'price_scholarship_fee', // ID do produto no Stripe
          success_url: `${window.location.origin}/student/dashboard/scholarship-fee-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/student/dashboard/scholarship-fee-error`,
          mode: 'payment',
          payment_type: 'scholarship_fee',
          fee_type: 'scholarship_fee',
          metadata: {
            application_id: pendingScholarshipFeeApplication.id,
            selected_scholarship_id: pendingScholarshipFeeApplication.scholarship_id,
            fee_type: 'scholarship_fee',
            amount: 850, // Valor fixo da scholarship fee
            scholarship_fee_amount: 850
          },
          scholarships_ids: [pendingScholarshipFeeApplication.scholarship_id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const { session_url } = await response.json();
      if (session_url) {
        // Redirecionar diretamente para o checkout do Stripe
        window.location.href = session_url;
      } else {
        throw new Error('URL da sessão não encontrada na resposta');
      }
      
    } catch (error) {
      console.error('Erro ao processar checkout da scholarship fee:', error);
      // Reabrir o modal em caso de erro
      setShowScholarshipFeeModal(true);
    } finally {
      // Desativar loading
      setIsProcessingScholarshipFeeCheckout(false);
    }
  };

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
                    {t('studentDashboard.myApplications.confirmationModal.title')}
                  </h3>
                  <div className="space-y-4">
                    
                    
                    
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
                      <div className="flex items-start relative">
                        <AlertCircle className="h-5 w-5 absolute text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-center font-bold text-amber-900 mb-2">{t('studentDashboard.myApplications.confirmationModal.importantDecision')}</h4>
                          <p className="text-amber-800 text-sm leading-relaxed mb-3">
                            {t('studentDashboard.myApplications.confirmationModal.description')}
                          </p>
                          {otherApprovedApps.length > 0 && (
                            <div className="bg-white rounded-xl p-3 border border-amber-200">
                              <p className="text-amber-800 text-sm font-semibold mb-2">
                                {otherApprovedApps.length === 1 
                                  ? t('studentDashboard.myApplications.confirmationModal.willRemoveOthers', { count: otherApprovedApps.length })
                                  : t('studentDashboard.myApplications.confirmationModal.willRemoveOthersPlural', { count: otherApprovedApps.length })
                                }:
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
                  buttonText={`${t('studentDashboard.myApplications.confirmationModal.secureMyScholarship')} ($${pendingApplication.scholarships?.application_fee_amount ? 
                    Number(pendingApplication.scholarships.application_fee_amount).toFixed(2) : 
                    '350.00'
                  })`}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm text-center mb-3 sm:mb-0"
                  successUrl={`${window.location?.origin || ''}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                  cancelUrl={`${window.location?.origin || ''}/student/dashboard/application-fee-error`}
                  disabled={false}
                  scholarshipsIds={[pendingApplication.scholarship_id]}
                  metadata={{ 
                    application_id: pendingApplication.id, 
                    selected_scholarship_id: pendingApplication.scholarship_id,
                    student_process_type: localStorage.getItem('studentProcessType') || null
                  }}
                  studentProcessType={localStorage.getItem('studentProcessType') || null}
                />
                <button
                  type="button"
                  className="w-full sm:w-auto bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 text-sm"
                  onClick={handleCancelPayment}
                >
                  {t('studentDashboard.myApplications.confirmationModal.letMeThink')}
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-1 sm:mb-2">{t('studentDashboard.myApplications.title')}</h2>
            <p className="text-base sm:text-lg text-slate-600">{t('studentDashboard.myApplications.subtitle')}</p>
          </div>
        </div>

        {/* Aviso removido conforme solicitação */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 min-h-[120px] sm:min-h-[140px] flex items-center hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-2">{t('studentDashboard.myApplications.totalApplications')}</p>
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
              <p className="text-sm font-semibold text-slate-500 mb-2">{t('studentDashboard.myApplications.approved')}</p>
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
              <p className="text-sm font-semibold text-slate-500 mb-2">{t('studentDashboard.myApplications.pending')}</p>
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
                <h3 className="font-bold text-blue-900 text-sm mb-2">{t('studentDashboard.myApplications.stayUpdated')}</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  <strong>{t('studentDashboard.myApplications.important')}</strong> {t('studentDashboard.myApplications.emailNotification')}
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
                  <span className="font-bold text-slate-900">{t('studentDashboard.myApplications.steps.step1Title')} Process Steps</span>
                </div>
                <svg className="w-5 h-5 text-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">{t('studentDashboard.myApplications.steps.step1Title')}</div>
                    <div className="text-xs text-slate-600">{t('studentDashboard.myApplications.steps.step1Description')}</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">{t('studentDashboard.myApplications.steps.step2Title')}</div>
                    <div className="text-xs text-slate-600">{t('studentDashboard.myApplications.steps.step2Description')}</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">{t('studentDashboard.myApplications.steps.step3Title')}</div>
                    <div className="text-xs text-slate-600">{t('studentDashboard.myApplications.steps.step3Description')}</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">{t('studentDashboard.myApplications.steps.step4Title')}</div>
                    <div className="text-xs text-slate-600">{t('studentDashboard.myApplications.steps.step4Description')}</div>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">{t('studentDashboard.myApplications.steps.step1Title')}</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('studentDashboard.myApplications.steps.step1Description')}</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">{t('studentDashboard.myApplications.steps.step2Title')}</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('studentDashboard.myApplications.steps.step2Description')}</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">{t('studentDashboard.myApplications.steps.step3Title')}</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('studentDashboard.myApplications.steps.step3Description')}</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">{t('studentDashboard.myApplications.steps.step4Title')}</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('studentDashboard.myApplications.steps.step4Description')}</div>
            </div>
          </div>
        </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 sm:p-16 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">{t('studentDashboard.myApplications.noApplications.title')}</h3>
          <p className="text-slate-500 mb-6 sm:mb-8 max-w-lg mx-auto text-base sm:text-lg leading-relaxed px-4">
            {t('studentDashboard.myApplications.noApplications.description')}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 max-w-4xl mx-auto">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 sm:mb-3" />
              <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">{t('studentDashboard.myApplications.noApplications.findScholarships')}</h4>
              <p className="text-xs sm:text-sm text-slate-600">{t('studentDashboard.myApplications.noApplications.browseOpportunities')}</p>
            </div>
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-2 sm:mb-3" />
              <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">{t('studentDashboard.myApplications.noApplications.applyEasily')}</h4>
              <p className="text-xs sm:text-sm text-slate-600">{t('studentDashboard.myApplications.noApplications.simpleProcess')}</p>
            </div>
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200 sm:col-span-2 lg:col-span-1">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 sm:mb-3" />
              <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">{t('studentDashboard.myApplications.noApplications.trackProgress')}</h4>
              <p className="text-xs sm:text-sm text-slate-600">{t('studentDashboard.myApplications.noApplications.monitorRealTime')}</p>
            </div>
          </div>
          
          <Link
            to="/student/dashboard/scholarships"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center text-sm sm:text-base"
          >
            {t('studentDashboard.myApplications.noApplications.findScholarships')}
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
                    <h3 className="text-xl font-bold text-slate-900">{t('studentDashboard.myApplications.sections.approvedByUniversity')}</h3>
                    <span className="text-sm text-green-700 bg-green-100 border border-green-200 md:px-4 md:py-2 px-2 py-1 rounded-full font-medium">{approvedList.length} {t('studentDashboard.myApplications.sections.approved')}</span>
                  </div>
                  <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-5 text-sm text-blue-800">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">{t('studentDashboard.myApplications.importantNotice.title')}</span> {t('studentDashboard.myApplications.importantNotice.description')}
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
                          {t('studentDashboard.myApplications.nextSteps')}
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
                          <p className="text-xs text-gray-600 mb-1 font-medium">{t('studentDashboard.myApplications.scholarshipDetails.annualScholarshipValue')}</p>
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
                          <p className="text-xs text-gray-600 mb-1 font-medium">{t('studentDashboard.myApplications.scholarshipDetails.applicationDate')}</p>
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
                    <h3 className="font-bold text-gray-900 mb-4 text-base">{t('studentDashboard.myApplications.paymentStatus.title')}</h3>
                    <div className="space-y-3">
                      <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 text-sm">{t('studentDashboard.myApplications.paymentStatus.applicationFee')}</span>
                          <span className="text-base font-bold text-gray-700">
                            ${scholarship.application_fee_amount ? formatCentsToDollars(scholarship.application_fee_amount) : '350.00'}
                          </span>
                        </div>
                        {applicationFeePaid ? (
                          <div className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('studentDashboard.myApplications.paymentStatus.paid')}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApplicationFeeClick(application)}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                            disabled={hasSelectedScholarship && !scholarshipFeePaid}
                          >
                            {t('studentDashboard.myApplications.paymentStatus.payApplicationFee')}
                          </button>
                        )}
                      </div>
  
                      <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 text-sm">{t('studentDashboard.myApplications.paymentStatus.scholarshipFee')}</span>
                          <span className="text-base font-bold text-gray-700">$850</span>
                        </div>
                        {scholarshipFeePaid ? (
                          <div className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('studentDashboard.myApplications.paymentStatus.paid')}
                          </div>
                        ) : (
                          <StripeCheckout
                            productId="scholarshipFee"
                            feeType="scholarship_fee"
                            paymentType="scholarship_fee"
                            buttonText={t('studentDashboard.myApplications.paymentStatus.payScholarshipFee')}
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
                            {t('studentDashboard.myApplications.importantNotice.description')}
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
                        {t('studentDashboard.myApplications.applicationDetails.viewDetails')}
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
                    <h3 className="text-xl font-bold text-slate-900">{t('studentDashboard.myApplications.sections.pendingAndInProgress')}</h3>
                    <span className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-2 rounded-full font-medium">{otherList.length} {t('studentDashboard.myApplications.sections.applications')}</span>
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
                            {t('studentDashboard.myApplications.nextSteps')}
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
                                    <p className="text-slate-600 text-xs">{t('studentDashboard.myApplications.scholarshipDetails.annualValue')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="h-5 w-5 mr-3 text-slate-500 flex-shrink-0" />
                                  <div>
                                    <span className="font-semibold text-slate-700">
                                      {new Date(application.applied_at).toLocaleDateString()}
                                    </span>
                                    <p className="text-slate-600 text-xs">{t('studentDashboard.myApplications.scholarshipDetails.appliedOn')}</p>
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
                                                                         <strong className="block mb-1">{t('studentDashboard.myApplications.rejectedApplication.reason')}</strong> 
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
                                { type: 'passport', label: t('studentDashboard.myApplications.documents.passport') },
                                { type: 'diploma', label: t('studentDashboard.myApplications.documents.highSchoolDiploma') },
                                { type: 'funds_proof', label: t('studentDashboard.myApplications.documents.proofOfFunds') }
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
                                      {t('studentDashboard.myApplications.documents.checklist')}
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
                                                       {isApproved ? t('studentDashboard.myApplications.documents.status.approved') : isRejected ? t('studentDashboard.myApplications.documents.status.changesNeeded') : isUnderReview ? t('studentDashboard.myApplications.documents.status.underReview') : t('studentDashboard.myApplications.documents.status.pending')}
                                                     </span>
                                                   </div>
                                                   
                                                   {/* Review Notes */}
                                                   {doc.review_notes && isRejected && (
                                                     <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                       <p className="text-xs text-red-700">
                                                         <strong>{t('studentDashboard.myApplications.documents.review')}</strong> {doc.review_notes}
                                                       </p>
                                                     </div>
                                                   )}
                                                   
                                                   {/* Upload Action for Rejected Docs */}
                                                   {isRejected && (
                                                     <div className="mt-3 space-y-2">
                                                       <label className="cursor-pointer bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-2 border-blue-200 hover:from-blue-100 hover:to-blue-200 px-3 py-2 rounded-lg font-semibold transition-all duration-200 w-full block text-center text-xs hover:shadow-md">
                                                         <span>{t('studentDashboard.myApplications.documents.sendNew')} {doc.label}</span>
                                                         <input
                                                           type="file"
                                                           className="sr-only"
                                                           accept="application/pdf,image/*"
                                                           onChange={(e) => handleSelectDocFile(application.id, doc.type, e.target.files ? e.target.files[0] : null)}
                                                         />
                                                       </label>
                                                       {selectedFiles[docKey(application.id, doc.type)] && (
                                                         <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                           <span className="font-medium">{t('studentDashboard.myApplications.paymentStatus.selected')}</span> {selectedFiles[docKey(application.id, doc.type)]?.name}
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
                                                             {t('studentDashboard.myApplications.paymentStatus.uploading')}
                                                           </div>
                                                         ) : t('studentDashboard.myApplications.paymentStatus.uploadDocument')}
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
                                             {t('studentDashboard.myApplications.documents.universityAdditionalRequests')}
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
                                                       {isApproved ? t('studentDashboard.myApplications.documents.status.approved') : isRejected ? t('studentDashboard.myApplications.documents.status.changesNeeded') : t('studentDashboard.myApplications.documents.status.underReview')}
                                                     </span>
                                                   </div>
                                                   {req.review_notes && isRejected && (
                                                     <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                                                       <strong>{t('studentDashboard.myApplications.documents.review')}</strong> {req.review_notes}
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
      
      {/* Modal de confirmação para Application Fee */}
      {pendingApplication && (
        <ScholarshipConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          scholarship={pendingApplication.scholarships!}
          onStripeCheckout={handleStripeCheckout}
          isProcessing={isProcessingCheckout}
        />
      )}

      {/* Modal de confirmação para Scholarship Fee */}
      {pendingScholarshipFeeApplication && (
        <ScholarshipConfirmationModal
          isOpen={showScholarshipFeeModal}
          onClose={() => setShowScholarshipFeeModal(false)}
          scholarship={pendingScholarshipFeeApplication.scholarships!}
          onStripeCheckout={handleScholarshipFeeCheckout}
          isProcessing={isProcessingScholarshipFeeCheckout}
          feeType="scholarship_fee"
        />
      )}
      </div>
    </div>
    </>
  );
};

export default MyApplications;