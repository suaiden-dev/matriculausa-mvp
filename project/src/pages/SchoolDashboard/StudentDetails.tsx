import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';
import type { Application, UserProfile, Scholarship } from '../../types';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import SelectionSurveyView from '../../components/AdminDashboard/SelectionSurveyView';
import ApplicationProgressCard from '../../components/AdminDashboard/StudentDetails/ApplicationProgressCard';
import PaymentStatusCard from '../../components/AdminDashboard/StudentDetails/PaymentStatusCard';
import { INSTALLMENT_CONFIG, InstallmentPlan } from '../../config/installmentConfig';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { getRealPaidAmounts } from '../../utils/paymentConverter';
import { groupUploadsBySubmission, getFileName } from '../../utils/documentUploadUtils';
import { FileText, UserCircle, CheckCircle2, ArrowLeft, Files, ClipboardList, Award, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Download, ExternalLink } from 'lucide-react';
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & {
    selection_survey_passed?: boolean;
    selected_application_id?: string | null;
  };
  scholarships: Scholarship;
}

const DOCUMENTS_INFO = [
  {
    key: 'passport',
    label: 'Passport',
    description: 'A valid copy of the student\'s passport. Used for identification and visa purposes.'
  }
];

const UPLOAD_STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  under_review: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
};

function formatHistoryDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const TABS = [
  { id: 'details', label: 'Details', icon: UserCircle },
  // { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'documents', label: 'Documents', icon: Files },
  { id: 'survey', label: 'Selection Survey', icon: ClipboardList },
  // { id: 'review', label: 'Review', icon: FileText }, // Removida a aba Review
];

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'documents' | 'survey'>('details');
  const [allStudentApplications, setAllStudentApplications] = useState<any[]>([]);

  const acceptanceLetterRef = React.useRef<HTMLDivElement>(null);
  const transferFormRef = React.useRef<HTMLDivElement>(null);
  const documentReviewRef = React.useRef<HTMLDivElement>(null);

  const selectedAppId = application?.user_profiles?.selected_application_id;
  const isChoseAnother = !!selectedAppId && selectedAppId !== application?.id && !allStudentApplications.some((a: any) => a.id === selectedAppId);

  const activeTabs = isChoseAnother ? TABS.filter(tab => tab.id !== 'documents') : TABS;

  useEffect(() => {
    if (isChoseAnother && activeTab === 'documents') {
      setActiveTab('details');
    }
  }, [isChoseAnother, activeTab]);

  useEffect(() => {
    if (loading || !application) return;
    const tab = searchParams.get('tab') as 'details' | 'documents' | 'survey' | null;
    const section = searchParams.get('section');
    if (!tab && !section) return;

    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }

    if (section) {
      const scrollTimeout = setTimeout(() => {
        const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
          acceptance_letter: acceptanceLetterRef,
          transfer_form: transferFormRef,
          document_review: documentReviewRef,
        };
        const targetRef = refMap[section];
        targetRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

      setSearchParams({}, { replace: true });
      return () => clearTimeout(scrollTimeout);
    }

    setSearchParams({}, { replace: true });
  }, [loading, application]);

  // Financial Monitoring Logic
  const { getFeeAmount, formatFeeAmount, hasOverride, userSystemType: configSystemType } = useFeeConfig(application?.user_profiles?.user_id);
  const [realPaidAmounts, setRealPaidAmounts] = useState<Record<string, number>>({});
  const [loadingPaidAmounts, setLoadingPaidAmounts] = useState<Record<string, boolean>>({});

  // Adapt student data for PaymentStatusCard
  const studentRecord = React.useMemo(() => {
    if (!application) return null;
    const profile = application.user_profiles;
    const selectedAppId = profile.selected_application_id;
    const activeApp = (selectedAppId && allStudentApplications.find((a: any) => a.id === selectedAppId)) || application;
    return {
      student_id: profile.id,
      user_id: profile.user_id,
      student_name: profile.full_name || '',
      student_email: profile.email || '',
      phone: profile.phone,
      country: profile.country,
      field_of_interest: profile.field_of_interest,
      academic_level: profile.academic_level,
      gpa: profile.gpa,
      english_proficiency: profile.english_proficiency,
      status: profile.status,
      avatar_url: profile.avatar_url,
      dependents: profile.dependents || 0,
      student_created_at: profile.created_at || '',
      has_paid_selection_process_fee: profile.has_paid_selection_process_fee,
      has_paid_i20_control_fee: profile.has_paid_i20_control_fee,
      is_application_fee_paid: application.is_application_fee_paid || profile.is_application_fee_paid,
      is_scholarship_fee_paid: application.is_scholarship_fee_paid || profile.is_scholarship_fee_paid,
      acceptance_letter_status: application.acceptance_letter_status || null,
      student_process_type: application.student_process_type || profile.student_process_type || null,
      visa_transfer_active: (profile as any).visa_transfer_active,
      seller_referral_code: profile.seller_referral_code || null,
      application_id: application.id,
      scholarship_id: application.scholarship_id,
      application_status: application.status,
      applied_at: application.applied_at,
      scholarship_name: application.scholarships?.title || null,
      course_name: application.scholarships?.field_of_study || null,
      university_name: application.scholarships?.university_name || null,
      scholarship_fee_amount: application.scholarships?.scholarship_fee_amount || 0,
      application_fee_amount: application.scholarships?.application_fee_amount || 0,
      all_applications: allStudentApplications.length > 0 ? allStudentApplications : [application],
      total_applications: allStudentApplications.length || 1,
      is_locked: true,
      system_type: profile.system_type || configSystemType,
      has_paid_ds160_package: (profile as any).has_paid_ds160_package || false,
      has_paid_i539_cos_package: (profile as any).has_paid_i539_cos_package || false,
      has_paid_reinstatement_package: (profile as any).has_paid_reinstatement_package || false,
      reinstatement_package_payment_method: (profile as any).reinstatement_package_payment_method || null,
      placement_fee_flow: (profile as any).placement_fee_flow || false,
      is_placement_fee_paid: (profile as any).is_placement_fee_paid || false,
      placement_fee_pending_balance: (profile as any).placement_fee_pending_balance || 0,
      selected_application_id: profile.selected_application_id || null,
    } as any;
  }, [application, configSystemType, allStudentApplications]);

  // Fetch installment plans for this student
  const [installmentPlans, setInstallmentPlans] = useState<Record<string, InstallmentPlan | null>>({});
  useEffect(() => {
    const userId = application?.user_profiles?.user_id;
    if (!userId) return;
    supabase
      .from('fee_installment_plans')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'completed'])
      .then(({ data }) => {
        const map: Record<string, InstallmentPlan | null> = {};
        (INSTALLMENT_CONFIG.SUPPORTED_FEE_TYPES as readonly string[]).forEach(ft => { map[ft] = null; });
        (data || []).forEach((plan: InstallmentPlan) => { map[plan.fee_type] = plan; });
        setInstallmentPlans(map);
      });
  }, [application?.user_profiles?.user_id]);

  // Load real paid amounts
  useEffect(() => {
    if (!application?.user_profiles?.user_id || isChoseAnother) return;

    const loadRealPaidAmounts = async () => {
      setLoadingPaidAmounts({
        selection_process: true,
        scholarship: true,
        i20_control: true,
        application: true,
        placement: true,
      });
      try {
        const feeTypes: any[] = ['selection_process', 'scholarship', 'i20_control', 'application', 'placement', 'ds160_package', 'i539_cos_package', 'reinstatement_package'];
        const amounts = await getRealPaidAmounts(application.user_profiles.user_id, feeTypes as any);
        setRealPaidAmounts(amounts);
      } catch (error) {
        console.error('Error loading real paid amounts:', error);
      } finally {
        setLoadingPaidAmounts({
          selection_process: false,
          scholarship: false,
          i20_control: false,
          application: false,
          placement: false,
        });
      }
    };

    loadRealPaidAmounts();
  }, [application?.user_profiles?.user_id, isChoseAnother]);

  // Documentos básicos do aluno (passport, diploma, funds_proof) para a aba Documents
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  // Modal para justificar solicitação de mudanças
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingRejectType, setPendingRejectType] = useState<string | null>(null);
  const [pendingRejectDocAppId, setPendingRejectDocAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedAppDocs, setExpandedAppDocs] = useState<Record<string, boolean>>({});
  // Modal para recusar aluno na bolsa
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');

  // Estados para a aba Documents
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [showRejectDocumentModal, setShowRejectDocumentModal] = useState(false);
  const [pendingRejectDocumentId, setPendingRejectDocumentId] = useState<string | null>(null);
  const [rejectDocumentReason, setRejectDocumentReason] = useState('');
  const [approvingDocumentId, setApprovingDocumentId] = useState<Record<string, boolean>>({});
  const [rejectingDocumentId, setRejectingDocumentId] = useState<Record<string, boolean>>({});
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  // Estados para Acceptance Letter
  const [acceptanceLetterFile, setAcceptanceLetterFile] = useState<File | null>(null);
  const [uploadingAcceptanceLetter, setUploadingAcceptanceLetter] = useState(false);
  const [acceptanceLetterUploaded, setAcceptanceLetterUploaded] = useState(false);
  const [replacingAcceptanceLetter, setReplacingAcceptanceLetter] = useState(false);
  const [replaceAcceptanceLetterFile, setReplaceAcceptanceLetterFile] = useState<File | null>(null);

  const [isFileSelecting, setIsFileSelecting] = useState(false);

  // Estados para Transfer Form
  const [transferFormUploads, setTransferFormUploads] = useState<any[]>([]);
  const [selectedTransferFormFile, setSelectedTransferFormFile] = useState<File | null>(null);
  const [uploadingTransferForm, setUploadingTransferForm] = useState(false);
  const [transferForm, setTransferForm] = useState<any>(null);

  // Estados para o modal de nova solicitação de documento
  const [newDocumentRequest, setNewDocumentRequest] = useState({
    title: '',
    description: '',
    due_date: '',
    attachment: null as File | null
  });
  const [creatingDocumentRequest, setCreatingDocumentRequest] = useState(false);

  // Application Progress State
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [approvingApplication, setApprovingApplication] = useState<Record<string, boolean>>({});
  const [pendingRejectAppId, setPendingRejectAppId] = useState<string | null>(null);
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [pendingApproveAppId, setPendingApproveAppId] = useState<string | null>(null);

  const allSteps = [
    { key: 'selection_fee', label: 'Selection Process Fee' },
    { key: 'apply', label: 'Application' },
    { key: 'review', label: 'Admissions Review' },
    { key: 'application_fee', label: 'Application Fee' },
    { key: 'placement_fee', label: 'Placement Fee' },
    { key: 'reinstatement_fee', label: 'Reinstatement Fee' },
    { key: 'ds160_package', label: 'Control Fee' },
    { key: 'i539_cos_package', label: 'Control Fee' },
    { key: 'scholarship_fee', label: 'Scholarship Fee' },
    { key: 'i20_fee', label: 'I-20 Control Fee' },
    { key: 'acceptance_letter', label: 'Acceptance Letter' },
    { key: 'transfer_form', label: 'Transfer Form' },
    { key: 'enrollment', label: 'Enrolled' }
  ];

  const steps = React.useMemo(() => {
    return allSteps.filter(step => {
      if (!application) return false;
      const processType = application.student_process_type || application.user_profiles?.student_process_type;
      const isTransferInactive = processType === 'transfer' && (application.user_profiles as any)?.visa_transfer_active === false;

      if (step.key === 'transfer_form') return processType === 'transfer';
      if (step.key === 'ds160_package') return processType === 'initial';
      if (step.key === 'i539_cos_package') return processType === 'change_of_status';

      if (step.key === 'reinstatement_fee') return isTransferInactive;
      if (isTransferInactive && ['scholarship_fee', 'i20_fee'].includes(step.key)) return false;

      const placementFeeFlow = (application.user_profiles as any)?.placement_fee_flow;
      if (placementFeeFlow) {
        return !['scholarship_fee', 'i20_fee'].includes(step.key);
      } else {
        return step.key !== 'placement_fee';
      }
    });
  }, [application]);

  const getStepStatus = React.useCallback((step: { key: string; label: string }) => {
    if (!application) return 'pending';
    const profile: any = application.user_profiles;

    switch (step.key) {
      case 'selection_fee':
        return profile?.has_paid_selection_process_fee ? 'completed' : 'pending';
      case 'apply':
        return 'completed';
      case 'review':
        if (application.status === 'enrolled' || application.status === 'approved') return 'completed';
        if (application.status === 'rejected') return 'rejected';
        if (application.status === 'under_review') return 'in_progress';
        return 'pending';
      case 'application_fee':
        return application.is_application_fee_paid ? 'completed' : 'pending';
      case 'placement_fee':
        return profile?.is_placement_fee_paid ? 'completed' : 'pending';
      case 'reinstatement_fee':
        return profile?.has_paid_reinstatement_package ? 'completed' : 'pending';
      case 'ds160_package':
        return profile?.has_paid_ds160_package ? 'completed' : 'pending';
      case 'i539_cos_package':
        return profile?.has_paid_i539_cos_package ? 'completed' : 'pending';
      case 'scholarship_fee':
        return application.is_scholarship_fee_paid || profile?.is_scholarship_fee_paid ? 'completed' : 'pending';
      case 'i20_fee':
        return profile?.has_paid_i20_control_fee ? 'completed' : 'pending';
      case 'acceptance_letter':
        if (application.acceptance_letter_status === 'approved' || application.acceptance_letter_status === 'sent') return 'completed';
        return 'pending';
      case 'transfer_form':
        const processType = application.student_process_type || profile?.student_process_type;
        if (processType !== 'transfer') return 'skipped';
        const tfStatus = (application as any).transfer_form_status;
        return tfStatus === 'approved' || tfStatus === 'sent' ? 'completed' : 'pending';
      case 'enrollment':
        return application.status === 'enrolled' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  }, [application]);

  const getCurrentStep = React.useCallback(() => {
    if (!application) return null;

    for (let i = 0; i < steps.length; i++) {
      const status = getStepStatus(steps[i]);
      if (status === 'in_progress' || status === 'pending') {
        return { step: steps[i], index: i, status };
      }
    }
    return { step: steps[steps.length - 1], index: steps.length - 1, status: 'completed' };
  }, [application, steps, getStepStatus]);

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails();
    }
  }, [applicationId]);

  // Inicializar estado da Acceptance Letter baseado na aplicação
  useEffect(() => {
    if (application) {
      const shouldBeUploaded = !!(application.acceptance_letter_url &&
        application.acceptance_letter_status &&
        application.acceptance_letter_status !== 'pending');
      setAcceptanceLetterUploaded(shouldBeUploaded);
    }
  }, [application]);

  // Limpar erros quando o arquivo for alterado
  useEffect(() => {
    if (acceptanceLetterFile) {
      clearFileSelectionError();
    }
  }, [acceptanceLetterFile]);

  // Limpar estados de arquivo quando a aba for alterada
  useEffect(() => {
    if (activeTab !== 'documents') {
      setAcceptanceLetterFile(null);
    }
  }, [activeTab]);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Tenta buscar pelo ID da aplicação (comportamento padrão)
      let { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id(*),
          scholarships(*, universities(*))
        `)
        .eq('id', applicationId)
        .maybeSingle();

      // 2. Fallback: Se não encontrou, talvez o ID passado seja um student_id (ex: vindo do Chat)
      if (!data && !error) {
        const altResponse = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            user_profiles!student_id(*),
            scholarships(*, universities(*))
          `)
          .eq('student_id', applicationId)
          // Ordena pela mais recente caso haja múltiplas
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        data = altResponse.data;
        error = altResponse.error;
      }

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Application not found');
      }

      if (data) {
        setApplication(data as ApplicationDetails);

        // Fetch all applications from this student in the same university
        const studentProfileId = (data as any).user_profiles?.id;
        const universityId = (data as any).scholarships?.university_id || (data as any).scholarships?.universities?.id;
        if (studentProfileId && universityId) {
          const { data: allApps } = await supabase
            .from('scholarship_applications')
            .select(`
              *,
              scholarships(*)
            `)
            .eq('student_id', studentProfileId)
            .order('created_at', { ascending: false });

          // Filter to only apps belonging to the same university
          const universityApps = (allApps || []).filter((a: any) => a.scholarships?.university_id === universityId);
          setAllStudentApplications(universityApps.length > 0 ? universityApps : [data]);
        } else {
          setAllStudentApplications([data]);
        }

        // Mantemos uma cópia simplificada para compatibilidade antiga
        const appDocs = (data as any).documents;
        if (Array.isArray(appDocs) && appDocs.length > 0) {
          setStudentDocs(appDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
        } else {
          // Fallback 1: usar documentos salvos no perfil do aluno (user_profiles.documents)
          const profileDocs = (data as any).user_profiles?.documents;
          if (Array.isArray(profileDocs) && profileDocs.length > 0) {
            setStudentDocs(profileDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
          } else {
            // Fallback 2: buscar do storage se a application ainda não tiver documentos associados
            const studentId = (data as any).user_profiles?.user_id;
            if (studentId) {
              const { data: docs } = await supabase
                .from('student_documents')
                .select('*')
                .eq('user_id', studentId);
              if (docs && docs.length > 0) {
                setStudentDocs((docs || []).map((d: any) => ({ type: d.type, file_url: d.file_url, status: d.status || 'under_review' })));
              } else {
                setStudentDocs([]);
              }
            } else {
              setStudentDocs([]);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching application details:", err);
      setError("Failed to load application details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar e sincronizar o documents_status
  const syncDocumentsStatus = async () => {
    if (!application?.documents || !application?.user_profiles?.user_id) return;

    const allDocsApproved = ['passport']
      .every((docType) => {
        const doc = application.documents.find((d: any) => d.type === docType);
        return doc && (doc as any).status === 'approved';
      });

    if (allDocsApproved && application.user_profiles.documents_status !== 'approved') {
      const { error } = await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', application.user_profiles.user_id);

      if (error) {
        console.error('Erro ao sincronizar documents_status:', error);
      } else {
        setApplication((prev) => prev ? ({
          ...prev,
          user_profiles: { ...prev.user_profiles, documents_status: 'approved' }
        } as any) : prev);
      }
    }
  };

  // Sincronizar documents_status sempre que a aplicação for carregada
  useEffect(() => {
    if (application && application.user_profiles) {
      syncDocumentsStatus();
    }
  }, [application]);

  // Carregar dados dos documentos quando a aplicação for carregada
  useEffect(() => {
    if (applicationId && application?.user_profiles?.user_id && !isChoseAnother) {
      fetchDocumentRequests();
      fetchStudentDocuments();

      // Buscar dados do Transfer Form se for aplicação de transfer
      if (application?.student_process_type === 'transfer') {
        fetchTransferForm();
        fetchTransferFormUploads();
      }
    }
  }, [applicationId, application, isChoseAnother]); // Incluída a dependência 'application' para garantir que os documentos sejam recarregados quando a aplicação for atualizada

  const fetchDocumentRequests = async () => {
    if (!application) return;

    try {
      // Buscar requests específicos para esta aplicação
      const { data: specificRequests, error: specificError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', application.id)
        .order('created_at', { ascending: false });

      if (specificError) {
        console.error("Error fetching specific document requests:", specificError);
      }

      // Buscar requests globais da universidade
      let globalRequests: any[] = [];
      if (application.scholarships?.university_id) {
        const { data: globalData, error: globalError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('is_global', true)
          .eq('university_id', application.scholarships.university_id)
          .order('created_at', { ascending: false });

        if (globalError) {
          console.error("Error fetching global document requests:", globalError);
        } else {
          // Filtrar requests globais conforme aplicabilidade do estudante
          const studentType = application.student_process_type || application.user_profiles?.student_process_type;
          const scholarshipLevel = application.scholarships?.level;

          globalRequests = (globalData || []).filter((r: any) => {
            // Filtrar por tipo de estudante se configurado
            if (r.applicable_student_types && r.applicable_student_types.length > 0) {
              const hasMatchingType = r.applicable_student_types.includes(studentType) || r.applicable_student_types.includes('all');
              if (!hasMatchingType) return false;
            }

            // Filtrar por nível acadêmico da bolsa se configurado
            if (r.applicable_scholarship_levels && r.applicable_scholarship_levels.length > 0 && scholarshipLevel) {
              const hasMatchingLevel = r.applicable_scholarship_levels.includes(scholarshipLevel) || r.applicable_scholarship_levels.includes('all');
              if (!hasMatchingLevel) return false;
            }

            return true;
          });
        }
      }

      // Combinar requests específicos e globais
      const allRequests = [...(specificRequests || []), ...globalRequests];

      // Buscar uploads para cada request
      if (allRequests && allRequests.length > 0) {
        const requestIds = allRequests.map(req => req.id);

        // ✅ SEGURANÇA: Requests globais são compartilhados por todos os alunos da universidade
        // (todos enviam para o mesmo document_request_id). Sem filtrar por uploaded_by, os
        // uploads de OUTROS alunos apareceriam neste aluno. uploaded_by = user_profiles.user_id.
        const studentUserId = application.user_profiles?.user_id;

        let uploadsQuery = supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', requestIds)
          .order('uploaded_at', { ascending: false });

        if (studentUserId) {
          uploadsQuery = uploadsQuery.eq('uploaded_by', studentUserId);
        }

        const { data: uploads, error: uploadsError } = await uploadsQuery;

        if (uploadsError) {
          console.error("Error fetching uploads:", uploadsError);
        } else {
          const requestsWithUploads = allRequests.map(request => ({
            ...request,
            // Filtrar uploads deste request (apenas do aluno atual) e garantir que o mais recente venha primeiro
            uploads: (uploads?.filter(upload =>
              upload.document_request_id === request.id &&
              (!studentUserId || upload.uploaded_by === studentUserId)
            ) || [])
              .sort((a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime())
          }));
          setDocumentRequests(requestsWithUploads);
        }
      } else {
        setDocumentRequests([]);
      }
    } catch (error) {
      console.error("Error in fetchDocumentRequests:", error);
      setDocumentRequests([]);
    }
  };

  const fetchStudentDocuments = async () => {
    if (!application) return;

    try {
      let uploads: any[] = [];

      // Estratégia 1: Buscar uploads através dos document_requests da aplicação
      try {
        const { data: uploadsForApp, error: errorApp } = await supabase
          .from('document_request_uploads')
          .select(`
            *,
            document_requests!inner(
              id,
              title,
              description,
              created_at,
              is_global,
              university_id,
              scholarship_application_id,
              applicable_student_types,
              applicable_scholarship_levels
            )
          `)
          .eq('document_requests.scholarship_application_id', application.id);

        if (errorApp) {
          console.error('Erro ao buscar uploads por aplicação:', errorApp);
        } else if (uploadsForApp && uploadsForApp.length > 0) {
          uploads = uploadsForApp;
        }
      } catch (error) {
        console.error('Erro na estratégia 1:', error);
      }

      // Estratégia 2: Se não encontrou por aplicação, buscar por uploaded_by (ID do usuário)
      if (uploads.length === 0 && application.user_profiles?.user_id) {
        try {
          const { data: uploadsByUser, error: error1 } = await supabase
            .from('document_request_uploads')
            .select(`
              *,
              document_requests(
                id,
                title,
                description,
                created_at,
                is_global,
                university_id,
                scholarship_application_id,
                applicable_student_types,
                applicable_scholarship_levels
              )
            `)
            .eq('uploaded_by', application.user_profiles.user_id);

          if (error1) {
            console.error('Erro ao buscar por uploaded_by:', error1);
          } else if (uploadsByUser && uploadsByUser.length > 0) {
            uploads = uploadsByUser;
          }
        } catch (error) {
          console.error('Erro na estratégia 2:', error);
        }
      }

      // Filtrar uploads com base nas regras de aplicabilidade dos document_requests
      const studentType = application.student_process_type || application.user_profiles?.student_process_type;
      const scholarshipLevel = application.scholarships?.level;

      const filteredUploads = uploads.filter((u: any) => {
        const req = u.document_requests;
        if (!req) return false;

        // Se for request específico desta aplicação, é aplicável
        if (req.scholarship_application_id === application.id) return true;

        // Se for global, validar tipo de estudante e nível da bolsa
        if (req.is_global) {
          // Filtrar por tipo de estudante
          if (req.applicable_student_types && req.applicable_student_types.length > 0) {
            const hasMatchingType = req.applicable_student_types.includes(studentType) || req.applicable_student_types.includes('all');
            if (!hasMatchingType) return false;
          }

          // Filtrar por nível acadêmico da bolsa
          if (req.applicable_scholarship_levels && req.applicable_scholarship_levels.length > 0 && scholarshipLevel) {
            const hasMatchingLevel = req.applicable_scholarship_levels.includes(scholarshipLevel) || req.applicable_scholarship_levels.includes('all');
            if (!hasMatchingLevel) return false;
          }

          return true;
        }

        return false;
      });

      // Buscar também a carta de aceite da aplicação
      let acceptanceLetterDoc = null;

      // Verificar se há carta de aceite
      // Só aceitar se tiver URL E status não for 'pending'
      if (application.acceptance_letter_url &&
        application.acceptance_letter_url.trim() !== '' &&
        application.acceptance_letter_status !== 'pending') {
        acceptanceLetterDoc = {
          id: `acceptance_letter_${application.id}`,
          filename: application.acceptance_letter_url?.split('/').pop() || 'Acceptance Letter',
          file_url: application.acceptance_letter_url,
          status: application.acceptance_letter_status || 'sent',
          uploaded_at: application.acceptance_letter_sent_at || new Date().toISOString(),
          request_title: 'Acceptance Letter',
          request_description: 'Official acceptance letter from the university',
          request_created_at: application.acceptance_letter_sent_at || new Date().toISOString(),
          is_global: false,
          request_type: 'Acceptance Letter',
          is_acceptance_letter: true
        };
      }

      // Combinar uploads filtrados com a carta de aceite
      const allDocuments = [...filteredUploads];
      if (acceptanceLetterDoc) {
        allDocuments.unshift(acceptanceLetterDoc); // Colocar a carta de aceite no topo
      }

      if (!allDocuments || allDocuments.length === 0) {
        setStudentDocuments([]);
        return;
      }

      // Formatar os documentos para exibição
      const studentDocuments = allDocuments.map(doc => {
        // Determinar o nome do arquivo
        let filename = 'Document';
        if (doc.file_url) {
          const urlParts = doc.file_url.split('/');
          filename = urlParts[urlParts.length - 1] || 'Document';
        } else if (doc.filename) {
          filename = doc.filename;
        }

        return {
          id: doc.id,
          filename: filename,
          file_url: doc.file_url,
          status: doc.status || 'under_review',
          uploaded_at: doc.uploaded_at || doc.created_at,
          request_title: doc.request_title || doc.document_requests?.title || doc.title || 'Document Request',
          request_description: doc.request_description || doc.document_requests?.description || doc.description || '',
          request_created_at: doc.request_created_at || doc.created_at,
          is_global: doc.is_global ?? doc.document_requests?.is_global ?? false,
          request_type: doc.request_type || (doc.document_requests?.is_global ? 'Global Request' : 'Individual Request') || 'document',
          is_acceptance_letter: doc.is_acceptance_letter || false
        };
      });

      setStudentDocuments(studentDocuments);
    } catch (error) {
      console.error("Error in fetchStudentDocuments:", error);
      setStudentDocuments([]);
    }
  };

  // Função para buscar dados do Transfer Form
  const fetchTransferForm = async () => {
    if (!application) return;

    try {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select('id, transfer_form_url, transfer_form_status, transfer_form_sent_at')
        .eq('id', application.id)
        .single();

      if (error) {
        console.error('Erro ao buscar transfer form:', error);
        return;
      }

      setTransferForm(data);
    } catch (error) {
      console.error('Error in fetchTransferForm:', error);
    }
  };

  // Função para buscar uploads do Transfer Form
  const fetchTransferFormUploads = async () => {
    if (!application) return;

    try {
      const { data, error } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', application.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar transfer form uploads:', error);
        return;
      }

      setTransferFormUploads(data || []);
    } catch (error) {
      console.error('Error in fetchTransferFormUploads:', error);
    }
  };

  // Debug: verificar estado da autenticação
  useEffect(() => {
    // Estado da autenticação verificado
  }, [user]);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p>Application not found.</p>
      </div>
    );
  }

  // Verificar se application existe antes de extrair dados
  if (!application) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  // Verificar se application.user_profiles existe
  if (!application.user_profiles) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-slate-600">Student profile not found</p>
          <p className="text-sm text-slate-500 mt-2">Please check the application data</p>
        </div>
      </div>
    );
  }
  const latestDocByType = (type: string) => {
    // ✅ CORREÇÃO: Buscar documentos de MÚLTIPLAS fontes para garantir que todos os 3 sejam exibidos

    // Fonte 1: Documentos da aplicação (scholarship_applications.documents)
    const appDocsOfType = Array.isArray((application as any)?.documents)
      ? (application as any).documents.filter((d: any) => d.type === type)
      : [];

    // Fonte 2: Documentos do perfil do aluno (user_profiles.documents)
    const profileDocsOfType = Array.isArray((application as any)?.user_profiles?.documents)
      ? (application as any).user_profiles.documents.filter((d: any) => d.type === type)
      : [];

    // Fonte 3: Documentos na tabela student_documents (storage central)
    const storageDocsOfType = studentDocs.filter(doc => doc.type === type);

    // Fonte 4: Documentos de solicitações específicas (document_request_uploads)
    // ✅ NOVO: Adicionar documentos vindos de solicitações manuais ou globais
    const requestDocsOfType = studentDocuments.filter(doc => doc.type === type);

    const allDocsOfType = [
      ...appDocsOfType.map((d: any) => ({ ...d, source: 'application', file_url: d.url || d.file_url })),
      ...profileDocsOfType.map((d: any) => ({ ...d, source: 'profile', file_url: d.url || d.file_url })),
      ...storageDocsOfType.map((d: any) => ({ ...d, source: 'storage', file_url: d.file_url })),
      ...requestDocsOfType.map((d: any) => ({ ...d, source: 'request', file_url: d.file_url }))
    ];

    if (allDocsOfType.length === 0) return null;

    // Retornar o mais recente baseado na data de upload
    const latestDoc = allDocsOfType.sort((a: any, b: any) => {
      const dateA = new Date(a.uploaded_at || a.created_at || a.saved_at || 0).getTime();
      const dateB = new Date(b.uploaded_at || b.created_at || b.saved_at || 0).getTime();
      return dateB - dateA;
    })[0];

    // ✅ CORREÇÃO: Garantir que file_url seja sempre uma URL completa
    let finalFileUrl = latestDoc.file_url;

    // Se file_url não é uma URL completa, construir a URL completa do Supabase
    if (finalFileUrl && !finalFileUrl.startsWith('http')) {
      finalFileUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/student-documents/${finalFileUrl}`;
    }

    return {
      id: latestDoc.id || `temp_${type}_${Date.now()}`,
      type: latestDoc.type,
      file_url: finalFileUrl,
      status: latestDoc.status || 'under_review',
      uploaded_at: latestDoc.uploaded_at || latestDoc.created_at || latestDoc.saved_at,
      source: latestDoc.source
    };
  };

  const updateApplicationDocStatus = async (
    type: string,
    status: 'approved' | 'changes_requested' | 'under_review',
    reviewNotes?: string,
    targetAppId?: string
  ) => {
    const appIdToUse = targetAppId || applicationId;
    const targetApp = allStudentApplications.find((a: any) => a.id === appIdToUse) || application;
    const docs = Array.isArray(targetApp?.documents) ? ([...targetApp.documents] as any[]) : [];
    const idx = docs.findIndex((d: any) => d.type === type);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], status, review_notes: reviewNotes ?? docs[idx]?.review_notes };
    }
    await supabase.from('scholarship_applications').update({ documents: docs }).eq('id', appIdToUse);
    if (appIdToUse === application?.id) {
      setApplication((prev) => prev ? ({ ...prev, documents: docs } as any) : prev);
    }
    setAllStudentApplications(prev =>
      prev.map((a: any) => a.id === appIdToUse ? { ...a, documents: docs } : a)
    );
  };

  // Funções para a aba Documents
  const handleViewUpload = (upload: any) => {
    if (!upload?.file_url) return;
    setPreviewUrl(upload.file_url);
  };

  const handleDownloadTemplate = (url: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const handleApproveDocument = async (documentId: string) => {
    setApprovingDocumentId(prev => ({ ...prev, [documentId]: true }));
    try {
      // Buscar informações do upload para notificação e log
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`*, document_requests!inner(id, title, description)`)
        .eq('id', documentId)
        .single();

      if (fetchError) throw new Error('Failed to fetch upload data: ' + fetchError.message);

      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', documentId);

      if (error) throw new Error('Failed to approve document: ' + error.message);

      // Optimistic update — sem re-fetch
      setStudentDocuments(prev => prev.map(doc =>
        doc.id === documentId ? { ...doc, status: 'approved' } : doc
      ));
      setDocumentRequests(prev => prev.map(req => ({
        ...req,
        uploads: (req.uploads || []).map((u: any) =>
          u.id === documentId ? { ...u, status: 'approved' } : u
        )
      })));

      toast.success('Document approved');

      // Notificações (fire-and-forget)
      try {
        const { data: userData } = await supabase
          .from('user_profiles').select('email').eq('user_id', application?.user_profiles.user_id).single();
        if (userData?.email) {
          fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_notf: "Documento aprovado",
              email_aluno: userData.email,
              nome_aluno: application?.user_profiles.full_name,
              email_universidade: user?.email,
              o_que_enviar: `Congratulations! Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been approved.`
            }),
          }).catch(console.error);
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token) {
            fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({
                user_id: application?.user_profiles.user_id,
                title: 'Document approved',
                message: `Your document for request "${uploadData.document_requests?.title}" has been approved.`,
                type: 'document_approved',
                link: '/student/dashboard',
              }),
            }).catch(console.error);
          }
        });
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
      }

      // Log (fire-and-forget)
      const studentProfileId = application?.user_profiles?.id;
      const performedBy = user?.id;
      if (studentProfileId && performedBy) {
        fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) })
          .then(r => r.json()).catch(() => ({}))
          .then(j => supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'document_approval',
            p_action_description: `University approved document request upload: ${uploadData.file_url?.split('/').pop() || 'file'} (${uploadData.document_requests?.title || 'Request'})`,
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: { upload_id: documentId, request_id: uploadData.document_requests?.id || null, request_title: uploadData.document_requests?.title || null, ip: j?.ip }
          })).catch(console.error);
      }

    } catch (err: any) {
      console.error("Error approving document:", err);
      toast.error('Failed to approve document: ' + err.message);
    } finally {
      setApprovingDocumentId(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc.file_url) return;

    try {
      // ✅ CORREÇÃO: Não converter a URL aqui, deixar o DocumentViewerModal fazer isso
      // Isso permite que o modal teste ambos os buckets (document-attachments e student-documents)
      const downloadUrl = doc.file_url;

      // Fazer download usando a URL
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download document: ' + response.statusText);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro no download:', err);
      toast.error(`Failed to download document: ${err.message}`);
    }
  };

  const handleViewDocument = (doc: any) => {
    // Verificação de segurança adicional
    if (!doc || !doc.file_url) {
      return;
    }

    // ✅ CORREÇÃO: Não converter a URL aqui, deixar o DocumentViewerModal fazer isso
    // Isso permite que o modal teste ambos os buckets (document-attachments e student-documents)
    setPreviewUrl(doc.file_url);
  };

  const approveDoc = async (type: string, targetAppId?: string) => {
    const appIdToUse = targetAppId || applicationId;
    if (!appIdToUse) return;

    try {
      setUpdating(`${appIdToUse}:${type}`);

      const { data: currentApp, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', appIdToUse)
        .single();

      if (fetchError) throw fetchError;

      const updatedDocuments = currentApp?.documents || [];
      const existingDocIndex = updatedDocuments.findIndex((d: any) => d.type === type);

      if (existingDocIndex >= 0) {
        updatedDocuments[existingDocIndex] = {
          ...updatedDocuments[existingDocIndex],
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        };
      } else {
        const currentDoc = latestDocByType(type);
        updatedDocuments.push({
          type,
          url: currentDoc?.file_url || '',
          status: 'approved',
          uploaded_at: currentDoc?.uploaded_at || new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        });
      }

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: updatedDocuments })
        .eq('id', appIdToUse);

      if (updateError) throw updateError;

      if (appIdToUse === application?.id) {
        setApplication(prev => prev ? ({
          ...prev,
          documents: updatedDocuments
        }) : prev);
        setStudentDocs(prev => prev.map(doc =>
          doc.type === type ? { ...doc, status: 'approved' } : doc
        ));
      }

      setAllStudentApplications(prev =>
        prev.map((a: any) => a.id === appIdToUse ? { ...a, documents: updatedDocuments } : a)
      );

      const basicDocTypes = ['passport'];
      const allBasicDocsApproved = basicDocTypes.every(t => {
        const doc = updatedDocuments.find((d: any) => d.type === t);
        return doc && doc.status === 'approved';
      });

      if (allBasicDocsApproved && application?.user_profiles?.user_id) {
        await supabase
          .from('user_profiles')
          .update({ documents_status: 'approved' })
          .eq('user_id', application.user_profiles.user_id);
      }

      if (application?.user_profiles?.user_id) {
        try {
          const docLabels: Record<string, string> = { passport: 'Passport' };
          const label = docLabels[type] || type;
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({
                user_id: application.user_profiles.user_id,
                title: 'Document Approved',
                message: `Your ${label} has been approved by the university.`,
                link: '/student/dashboard/applications'
              })
            });
          }
        } catch (notifErr) {
          console.error('Error sending notification:', notifErr);
        }
      }

      try {
        const studentProfileId = application?.user_profiles?.id;
        const performedBy = user?.id;
        if (studentProfileId && performedBy) {
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) { const j = await res.json(); clientIp = j?.ip; }
          } catch (_) { /* ignore */ }
          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'document_approval',
            p_action_description: `Document ${type} approved by university admin`,
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: { document_type: type, application_id: appIdToUse, ip: clientIp }
          });
        }
      } catch (logErr) {
        console.error('Error logging action:', logErr);
      }

      toast.success('Document approved');
    } catch (error: any) {
      console.error(`Error approving document ${type}:`, error);
      toast.error(`Failed to approve document: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const requestChangesDoc = async (type: string, reason: string, targetAppId?: string) => {
    const appIdToUse = targetAppId || applicationId;
    try {
      setUpdating(`${appIdToUse}:${type}`);
      await updateApplicationDocStatus(type, 'changes_requested', reason || undefined, appIdToUse);
      // Mantém o fluxo do aluno em revisão
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'under_review' })
        .eq('user_id', application.user_profiles.user_id);

      // --- NOTIFICAÇÃO VIA WEBHOOK N8N ---
      try {
        console.log('Enviando notificação de rejeição de documento via webhook...');
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const documentLabel = DOCUMENTS_INFO.find(doc => doc.key === type)?.label || type;
          const webhookPayload = {
            tipo_notf: "Changes Requested",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name || 'Student',
            email_universidade: user?.email,
            o_que_enviar: `Your document <strong>${documentLabel}</strong> has been rejected and needs changes. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          console.log('Enviando webhook para documento rejeitado:', webhookPayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          });

          console.log('Webhook response status:', webhookResponse.status);

          if (!webhookResponse.ok) {
            const webhookErrorText = await webhookResponse.text();
            console.error('Webhook error:', webhookErrorText);
          } else {
            console.log('Webhook enviado com sucesso para rejeição de documento');
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application.user_profiles.user_id,
                  title: 'Document rejected',
                  message: `Your ${documentLabel} document was rejected. Reason: ${reason}`,
                  type: 'document_rejected',
                  link: '/student/dashboard/applications',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }
      // --- FIM DA NOTIFICAÇÃO ---
    } finally {
      setUpdating(null);
    }
  };







  const handleApproveApplication = async (appId?: string) => {
    if (!application) return;
    const targetAppId = appId || application.id;

    try {
      setApprovingApplication(prev => ({ ...prev, [targetAppId]: true }));

      const { error } = await supabase
        .from('scholarship_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', targetAppId);

      if (error) throw error;

      if (targetAppId === application.id) {
        setApplication(prev => prev ? ({
          ...prev,
          status: 'approved'
        } as any) : prev);
      }

      setAllStudentApplications(prev =>
        prev.map((a: any) => a.id === targetAppId ? { ...a, status: 'approved' } : a)
      );

      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Application Approved",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name || 'Student',
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your application for <strong>${(allStudentApplications.find((a: any) => a.id === targetAppId) || application)?.scholarships?.title || 'your scholarship'}</strong> has been approved by the university. You can now proceed with the next steps in your dashboard.`
          };

          await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          });
        }
      } catch (webhookErr) {
        console.error('Error sending approval webhook:', webhookErr);
      }

      toast.success('Application approved successfully!');
    } catch (err: any) {
      console.error('Error approving application:', err);
      toast.error(`Failed to approve application: ${err.message}`);
    } finally {
      setApprovingApplication(prev => ({ ...prev, [targetAppId]: false }));
    }
  };

  const rejectStudent = async () => {
    const targetAppId = pendingRejectAppId || applicationId;
    try {
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', targetAppId);

      if (targetAppId === application?.id) {
        setApplication(prev => prev ? ({
          ...prev,
          status: 'rejected'
        } as any) : prev);
      }

      setAllStudentApplications(prev =>
        prev.map((a: any) => a.id === targetAppId ? { ...a, status: 'rejected', notes: rejectStudentReason || null } : a)
      );

      const allRejected = allStudentApplications.every((a: any) =>
        a.id === targetAppId ? true : a.status === 'rejected'
      );
      if (allRejected) {
        await supabase
          .from('user_profiles')
          .update({ documents_status: 'rejected' })
          .eq('user_id', application.user_profiles.user_id);
      }

      setActiveTab('details');
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
      setPendingRejectAppId(null);
      toast.success('Application rejected.');
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application.');
    }
  };

  const handleRejectDocument = async (documentId: string, reason: string) => {
    setRejectingDocumentId(prev => ({ ...prev, [documentId]: true }));
    try {
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`*, document_requests!inner(id, title, description)`)
        .eq('id', documentId)
        .single();

      if (fetchError) throw new Error('Failed to fetch upload data: ' + fetchError.message);

      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'rejected', rejection_reason: reason || null, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', documentId);

      if (error) throw new Error('Failed to reject document: ' + error.message);

      // Optimistic update — sem re-fetch
      setStudentDocuments(prev => prev.map(doc =>
        doc.id === documentId ? { ...doc, status: 'rejected', rejection_reason: reason } : doc
      ));
      setDocumentRequests(prev => prev.map(req => ({
        ...req,
        uploads: (req.uploads || []).map((u: any) =>
          u.id === documentId ? { ...u, status: 'rejected', rejection_reason: reason } : u
        )
      })));

      toast.success('Document rejected');

      // Log (fire-and-forget)
      const studentProfileId = application?.user_profiles?.id;
      const performedBy = user?.id;
      if (studentProfileId && performedBy) {
        fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) })
          .then(r => r.json()).catch(() => ({}))
          .then(j => supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'document_rejection',
            p_action_description: `University rejected document request upload: ${uploadData.file_url?.split('/').pop() || 'file'} (${uploadData.document_requests?.title || 'Request'})`,
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: { upload_id: documentId, request_id: uploadData.document_requests?.id || null, request_title: uploadData.document_requests?.title || null, rejection_reason: reason, ip: j?.ip }
          })).catch(console.error);
      }

      // Notificações (fire-and-forget)
      try {
        const { data: userData } = await supabase
          .from('user_profiles').select('email').eq('user_id', application?.user_profiles.user_id).single();
        if (userData?.email) {
          fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_notf: "Changes Requested",
              email_aluno: userData.email,
              nome_aluno: application?.user_profiles.full_name,
              email_universidade: user?.email,
              o_que_enviar: `Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
            }),
          }).catch(console.error);
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token) {
            fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({
                user_id: application?.user_profiles.user_id,
                title: 'Document rejected',
                message: `Your document for request "${uploadData.document_requests?.title}" was rejected. Reason: ${reason}`,
                type: 'document_rejected',
                link: '/student/dashboard/applications',
              }),
            }).catch(console.error);
          }
        });
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }

    } catch (err: any) {
      console.error("Error rejecting document:", err);
      toast.error('Failed to reject document: ' + err.message);
    } finally {
      setRejectingDocumentId(prev => ({ ...prev, [documentId]: false }));
    }
  };

  // Função para upload do Transfer Form pela universidade
  const handleUploadTransferForm = async (file: File) => {
    if (!application || !file) return;

    setUploadingTransferForm(true);
    try {
      // Se j\u00e1 existe um transfer form, deletar o arquivo antigo do storage
      if (transferForm?.transfer_form_url) {
        const oldUrl = transferForm.transfer_form_url;
        const oldFileName = oldUrl.split('/document-attachments/')[1];
        if (oldFileName) {
          await supabase.storage
            .from('document-attachments')
            .remove([decodeURIComponent(oldFileName)]);
        }
      }

      // Sanitizar nome do arquivo
      const sanitizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const fileName = `transfer-forms/${Date.now()}_${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData.path);

      // Atualizar aplicação
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          transfer_form_url: publicUrl,
          transfer_form_status: 'sent',
          transfer_form_sent_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (updateError) {
        throw new Error('Failed to update application: ' + updateError.message);
      }

      // Atualizar estado local
      setTransferForm((prev: any) => ({
        ...prev,
        transfer_form_url: publicUrl,
        transfer_form_status: 'sent',
        transfer_form_sent_at: new Date().toISOString()
      }));

      // Recarregar dados
      await fetchTransferForm();
      setSelectedTransferFormFile(null);

      toast.success('Transfer form template uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading transfer form:', error);
      toast.error(`Failed to upload transfer form: ${error.message}`);
    } finally {
      setUploadingTransferForm(false);
    }
  };

  // Função para aprovar upload do Transfer Form do aluno
  const handleApproveTransferFormUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', uploadId);

      if (error) {
        throw new Error('Failed to approve transfer form: ' + error.message);
      }

      // Atualizar também a aplicação associada
      if (application?.id) {
        const { error: appError } = await supabase
          .from('scholarship_applications')
          .update({
            transfer_form_status: 'approved'
          })
          .eq('id', application.id);

        if (appError) {
          console.error('Failed to update application transfer form status:', appError);
        } else {
          setApplication((prev: any) => prev ? ({
            ...prev,
            transfer_form_status: 'approved'
          }) : prev);
        }
      }

      // Recarregar uploads
      await fetchTransferFormUploads();

      toast.success('Transfer form approved successfully!');
    } catch (error: any) {
      console.error('Error approving transfer form:', error);
      toast.error(`Failed to approve transfer form: ${error.message}`);
    }
  };

  // Função para rejeitar upload do Transfer Form do aluno
  const handleRejectTransferFormUpload = async (uploadId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', uploadId);

      if (error) {
        throw new Error('Failed to reject transfer form: ' + error.message);
      }

      // Atualizar também a aplicação associada
      if (application?.id) {
        const { error: appError } = await supabase
          .from('scholarship_applications')
          .update({
            transfer_form_status: 'returned' // 'returned' indica que retornou para correções no fluxo
          })
          .eq('id', application.id);

        if (appError) {
          console.error('Failed to update application transfer form status:', appError);
        } else {
          setApplication((prev: any) => prev ? ({
            ...prev,
            transfer_form_status: 'returned'
          }) : prev);
        }
      }

      // Recarregar uploads
      await fetchTransferFormUploads();

      toast.success('Transfer form rejected successfully!');
    } catch (error: any) {
      console.error('Error rejecting transfer form:', error);
      toast.error(`Failed to reject transfer form: ${error.message}`);
    }
  };

  // Função para limpar erros de seleção de arquivo
  const clearFileSelectionError = () => {
    // Função removida - não há mais fileSelectionError
  };

  // Função para selecionar arquivo da carta de aceite
  const handleAcceptanceLetterFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {

      setTimeout(() => {
        try {
          const file = event.target.files?.[0];
          if (file) {
            // Validar o arquivo
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
              toast.error('File size must be less than 10MB');
              return;
            }

            // Validar tipo de arquivo
            const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!allowedTypes.includes(fileExtension)) {
              toast.error('Please select a valid file type: PDF, DOC, DOCX, JPG, JPEG, or PNG');
              return;
            }

            setAcceptanceLetterFile(file);
            setAcceptanceLetterUploaded(false);

            // Limpar o input para permitir selecionar o mesmo arquivo novamente
            event.target.value = '';
          }
        } catch (error) {
          console.error('Error processing file selection:', error);
          toast.error('Error processing file. Please try again.');
        } finally {
          setIsFileSelecting(false);
        }
      }, 100);

    } catch (error) {
      console.error('Error selecting file:', error);
      toast.error('Error selecting file. Please try again.');
      setIsFileSelecting(false);
    }
  };

  // Função para sanitizar nomes de arquivos (remover acentos, espaços e caracteres especiais)
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos (acentos)
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Substituir caracteres especiais por underscore
      .replace(/_+/g, '_') // Remover underscores múltiplos
      .replace(/^_|_$/g, ''); // Remover underscores do início e fim
  };

  // Função para processar a carta de aceite
  const handleProcessAcceptanceLetter = async () => {
    if (!application || !acceptanceLetterFile) {
      toast.error('Please select a file first.');
      return;
    }

    setUploadingAcceptanceLetter(true);
    try {
      // Sanitizar o nome do arquivo e gerar chave segura
      const sanitizedFileName = sanitizeFileName(acceptanceLetterFile.name);
      const timestamp = Date.now();
      const fileName = `acceptance_letters/${timestamp}_${sanitizedFileName}`;

      // Upload do arquivo original
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, acceptanceLetterFile);

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Obter a URL pública do arquivo original
      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData.path);

      // Gerar preview via Edge Function no backend (seguro e confiável)
      let previewUrl: string | null = null;
      if (acceptanceLetterFile.type === 'application/pdf') {
        console.log('[StudentDetails] Requesting backend preview generation...');
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const res = await supabase.functions.invoke('generate-document-preview', {
          body: {
            storagePath: uploadData.path,
            applicationId: application.id,
            documentType: 'acceptance_letter',
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (res.error) {
          console.error('[StudentDetails] Preview generation failed:', res.error);
        } else {
          previewUrl = res.data?.previewUrl ?? null;
          console.log('[StudentDetails] Preview generated:', previewUrl);
        }
      }

      // Atualizar a aplicação com a URL da carta de aceite e o preview
      const updateData = {
        acceptance_letter_url: publicUrl,
        acceptance_letter_preview_url: previewUrl,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      };

      console.log('=== ATUALIZANDO APLICAÇÃO COM STATUS ENROLLED ===');
      console.log('Application ID:', application.id);
      console.log('Update data:', updateData);

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update(updateData)
        .eq('id', application.id);

      if (updateError) {
        console.error('Erro ao atualizar aplicação:', updateError);
        throw new Error('Failed to update application: ' + updateError.message);
      }

      console.log('Aplicação atualizada com sucesso!');

      // Atualizar o estado local da aplicação
      setApplication(prev => prev ? ({
        ...prev,
        acceptance_letter_url: publicUrl,
        acceptance_letter_preview_url: previewUrl,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      } as any) : prev);

      // Atualizar o estado local da carta de aceite
      setAcceptanceLetterUploaded(true);

      // Atualizar o perfil do usuário com documents_status e status geral
      console.log('=== ATUALIZANDO PERFIL DO USUÁRIO ===');
      console.log('User ID:', application.user_profiles.user_id);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          documents_status: 'approved',
          status: 'active'
        })
        .eq('user_id', application.user_profiles.user_id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      } else {
        console.log('Perfil do usuário atualizado com sucesso!');
      }

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Carta de aceite enviada",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your acceptance letter has been processed and you are now enrolled. Please check your dashboard for next steps.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);

          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });

            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);

            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          // Segundo webhook: Notificar sobre I-20 Control Fee disponível
          try {
            const i20ControlFeePayload = {
              tipo_notf: "I-20 Control Fee Disponível",
              email_aluno: userData.email,
              nome_aluno: application.user_profiles.full_name,
              email_universidade: user?.email,
              o_que_enviar: `Great news! Your I-20 Control Fee is now available for payment. This fee is required for the issuance of your I-20 document, essential for your F-1 visa. You have 10 days to complete this payment. Please check your dashboard to proceed.`
            };

            console.log('Enviando webhook I-20 Control Fee...');
            console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
            console.log('I-20 Control Fee payload:', i20ControlFeePayload);

            const i20WebhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(i20ControlFeePayload),
            });

            console.log('I-20 Control Fee webhook response status:', i20WebhookResponse.status);
            console.log('I-20 Control Fee webhook response ok:', i20WebhookResponse.ok);

            if (!i20WebhookResponse.ok) {
              const i20WebhookErrorText = await i20WebhookResponse.text();
              console.error('I-20 Control Fee webhook error:', i20WebhookErrorText);
            } else {
              console.log('I-20 Control Fee webhook enviado com sucesso');
            }
          } catch (i20WebhookError) {
            console.error('Erro ao enviar webhook I-20 Control Fee:', i20WebhookError);
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application.user_profiles.user_id,
                  title: 'Enrolled - Acceptance letter processed',
                  message: 'Your enrollment is confirmed. Check your dashboard for next steps.',
                  type: 'enrolled',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }

          // Notificar Migma que a acceptance letter foi emitida
          try {
            const migmaUrl = import.meta.env.VITE_MIGMA_FUNCTIONS_URL;
            const migmaSecret = import.meta.env.VITE_MIGMA_WEBHOOK_SECRET;
            const migmaAnonKey = import.meta.env.VITE_MIGMA_SUPABASE_ANON_KEY;
            if (migmaUrl && migmaSecret) {
              const migmaRes = await fetch(`${migmaUrl}/receive-matriculausa-letter`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${migmaAnonKey}`,
                  'x-migma-webhook-secret': migmaSecret,
                },
                body: JSON.stringify({
                  student_email: userData.email,
                  acceptance_letter_url: publicUrl,
                }),
              });
              if (!migmaRes.ok) {
                console.warn('[Migma] receive-matriculausa-letter failed:', migmaRes.status, await migmaRes.text());
              } else {
                console.log('[Migma] Acceptance letter notified successfully');
              }
            }
          } catch (migmaError) {
            console.warn('[Migma] Acceptance letter notification failed (non-critical):', migmaError);
          }
        }
      } catch (notificationError) {
        console.error('Error sending acceptance notification:', notificationError);
      }

      setAcceptanceLetterUploaded(true);

      // Recarregar apenas os documentos do aluno
      await fetchStudentDocuments();

      // Recarregar os dados da aplicação para garantir sincronização
      console.log('=== RECARREGANDO DADOS DA APLICAÇÃO ===');
      await fetchApplicationDetails();

      // Log: envio de acceptance letter pela universidade
      try {
        const studentProfileId = application?.user_profiles?.id;
        const performedBy = user?.id;
        if (studentProfileId && performedBy) {
          // Enriquecer metadados com IP público (melhor esforço)
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              const j = await res.json();
              clientIp = j?.ip;
            }
          } catch (_) { /* ignore */ }

          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'acceptance_letter_sent',
            p_action_description: 'University sent acceptance letter',
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: {
              application_id: application.id,
              acceptance_letter_url: publicUrl,
              ip: clientIp
            }
          });
        }
      } catch (logErr) {
        console.error('Failed to log acceptance letter sent (university):', logErr);
      }
    } catch (error: any) {
      console.error('Error processing acceptance letter:', error);
      toast.error(`Failed to process acceptance letter: ${error.message}`);
    } finally {
      setUploadingAcceptanceLetter(false);
    }
  };

  const handleReplaceAcceptanceLetter = async () => {
    if (!application || !replaceAcceptanceLetterFile) return;

    setReplacingAcceptanceLetter(true);
    try {
      const sanitizedFileName = sanitizeFileName(replaceAcceptanceLetterFile.name);
      const timestamp = Date.now();
      const fileName = `acceptance_letters/${timestamp}_${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, replaceAcceptanceLetterFile);

      if (uploadError) throw new Error('Failed to upload file: ' + uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData.path);

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          acceptance_letter_url: publicUrl,
          acceptance_letter_status: 'approved',
          acceptance_letter_sent_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (updateError) throw new Error('Failed to update application: ' + updateError.message);

      setApplication(prev => prev ? ({
        ...prev,
        acceptance_letter_url: publicUrl,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
      } as any) : prev);

      try {
        const studentProfileId = application?.user_profiles?.id;
        const performedBy = user?.id;
        if (studentProfileId && performedBy) {
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) { const j = await res.json(); clientIp = j?.ip; }
          } catch (_) { /* ignore */ }

          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'acceptance_letter_replaced',
            p_action_description: 'University replaced acceptance letter',
            p_performed_by: performedBy,
            p_performed_by_type: user?.role === 'school_manager' ? 'school_manager' : 'university',
            p_metadata: { application_id: application.id, acceptance_letter_url: publicUrl, ip: clientIp }
          });
        }
      } catch (logErr) {
        console.error('Failed to log acceptance letter replaced:', logErr);
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (accessToken) {
          await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({
              user_id: application.user_profiles.user_id,
              title: 'Acceptance letter updated',
              message: 'Your acceptance letter has been updated. Check your dashboard for details.',
              type: 'acceptance_letter_sent',
              link: '/student/dashboard',
            }),
          });
        }
      } catch { /* ignore notify errors */ }

      setReplaceAcceptanceLetterFile(null);
      await fetchStudentDocuments();
      toast.success('Acceptance letter replaced successfully!');
    } catch (error: any) {
      console.error('Error replacing acceptance letter:', error);
      toast.error(`Failed to replace acceptance letter: ${error.message}`);
    } finally {
      setReplacingAcceptanceLetter(false);
    }
  };

  const handleViewAcceptanceLetter = () => {
    if (application?.acceptance_letter_url) {
      setPreviewUrl(application.acceptance_letter_url);
    }
  };

  const handleDownloadAcceptanceLetter = async () => {
    if (!application?.acceptance_letter_url) return;
    try {
      const response = await fetch(application.acceptance_letter_url);
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = application.acceptance_letter_url.split('/').pop() || 'acceptance_letter.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading acceptance letter:', err);
      toast.error(`Failed to download: ${err.message}`);
    }
  };

  // Função para criar nova solicitação de documento
  const handleCreateDocumentRequest = async () => {
    if (!application) return;
    setCreatingDocumentRequest(true);
    try {
      let attachment_url = '';

      // Upload do arquivo se houver
      if (newDocumentRequest.attachment) {
        const { data, error } = await supabase.storage
          .from('document-attachments')
          .upload(`individual/${Date.now()}_${newDocumentRequest.attachment.name}`, newDocumentRequest.attachment);

        if (error) {
          throw new Error('Failed to upload attachment: ' + error.message);
        }
        attachment_url = data?.path;
      }

      // Buscar university_id da aplicação
      const { data: appData } = await supabase
        .from('scholarship_applications')
        .select('scholarship_id, scholarships(university_id)')
        .eq('id', application.id)
        .single();

      let university_id: string | undefined = undefined;
      if (appData?.scholarships) {
        if (Array.isArray(appData.scholarships)) {
          university_id = (appData.scholarships[0] as any)?.university_id;
        } else {
          university_id = (appData.scholarships as any).university_id;
        }
      }

      // Criar o request usando a Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const payload = {
        title: newDocumentRequest.title,
        description: newDocumentRequest.description,
        due_date: newDocumentRequest.due_date || null,
        attachment_url,
        university_id,
        is_global: false,
        status: 'open',
        created_by: user?.id || '',
        scholarship_application_id: application.id
      };

      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-document-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      let result: any = {};
      try {
        result = await response.json();
      } catch (e) {
        console.log('Erro ao fazer parse do JSON de resposta:', e);
      }

      if (!response.ok || !result.success) {
        throw new Error('Failed to create request: ' + (result.error || 'Unknown error'));
      }

      // Enviar notificação para o aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Nova solicitação de documento",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `A new document request has been submitted for your review: <strong>${newDocumentRequest.title}</strong>. Please log in to your dashboard to view the details and upload the requested document.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);

          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });

            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);

            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-student-notification', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application.user_profiles.user_id,
                  title: 'New document request',
                  message: `A new document request was created: ${newDocumentRequest.title}.`,
                  type: 'document_request_created',
                  link: `/student/dashboard/application/${applicationId}/chat?tab=documents`,
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

      // Limpar formulário e fechar modal
      setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
      setShowNewRequestModal(false);

      // Recarregar solicitações de documentos
      fetchDocumentRequests();

    } catch (err: any) {
      console.error("Error creating document request:", err);
      toast.error(`Failed to create document request: ${err.message}`);
    } finally {
      setCreatingDocumentRequest(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto">
      {isChoseAnother && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="max-w-full mx-auto flex items-center gap-3">
            <div className="flex p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="font-medium text-amber-800 text-sm md:text-base leading-snug">
              This application is inactive because the student has chosen to proceed with another university's scholarship. Access to their documents, progress tracking, and payment details is restricted.
            </p>
          </div>
        </div>
      )}
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-slate-500 hover:text-slate-700 mb-4 transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 mr-1 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-medium">Back to students</span>
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Student Details
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Review and manage {application?.user_profiles?.full_name || 'Student'}'s application details
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                <div className="flex items-center px-6 py-2.5 rounded-full text-base font-bold bg-green-600 text-white shadow-lg shadow-green-100 ring-4 ring-green-50">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Enrolled
                </div>
              ) : application.status === 'approved' ? (
                <div className="flex items-center px-6 py-2.5 rounded-full text-base font-bold bg-green-600 text-white shadow-lg shadow-green-100 ring-4 ring-green-50">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Application Approved
                </div>
              ) : application.status === 'rejected' ? (
                <div className="flex items-center px-6 py-2.5 rounded-full text-base font-bold bg-red-600 text-white shadow-lg shadow-red-100 ring-4 ring-red-50">
                  <div className="w-2.5 h-2.5 bg-white rounded-full mr-2"></div>
                  Application Rejected
                </div>
              ) : (
                <div className="flex items-center px-6 py-2.5 rounded-full text-base font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  <div className="w-3 h-3 bg-slate-400 rounded-full mr-2 animate-pulse"></div>
                  Pending Review
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-300 rounded-b-3xl">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" role="tablist">
            {activeTabs.map(tab => (
              <button
                key={tab.id}
                className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                    ? 'border-[#05294E] text-[#05294E]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                onClick={() => setActiveTab(tab.id as any)}
                type="button"
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <tab.icon className={`w-5 h-5 mr-2 transition-colors ${activeTab === tab.id ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                  }`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Conteúdo das abas */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className={`${isChoseAnother ? 'xl:col-span-12' : 'xl:col-span-8'} space-y-6`}>
              {/* Student Information Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-8 py-5">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <UserCircle className="w-6 h-6 mr-3" />
                    Student Information
                  </h2>
                </div>

                <div className="p-8 space-y-12">
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                      <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mr-3"></div>
                      Personal Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Full Name</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.full_name || 'Not provided'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Email Address</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.email || 'Not provided'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Phone Number</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.phone || 'Not provided'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Country of Residence</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.country || 'Not specified'}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Academic Profile Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                      <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mr-3"></div>
                      Academic Profile
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Field of Interest</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.field_of_interest || 'Not specified'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Academic Level</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.academic_level || 'Not specified'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">GPA / Academic Performance</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.gpa || 'Not provided'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">English Proficiency</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.english_proficiency || 'Not specified'}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Application Status Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                      <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mr-3"></div>
                      Application & Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Student Process Type</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">
                          {(() => {
                            const type = application.student_process_type;
                            const visaTransferActive = (application.user_profiles as any)?.visa_transfer_active;
                            if (type === 'initial') return 'Initial – F-1 Visa';
                            if (type === 'transfer') {
                              return visaTransferActive === false
                                ? 'Transfer – Needs Reinstatement'
                                : 'Transfer – Active F-1';
                            }
                            if (type === 'change_of_status') return 'Change of Status';
                            if (type === 'resident') return 'Resident';
                            return type || 'Not specified';
                          })()}
                        </dd>
                      </div>
                      {!isChoseAnother && (
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Application Fee</dt>
                        <dd className="mt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {(() => {
                                const paid = (application as any)?.is_application_fee_paid ?? application?.user_profiles?.is_application_fee_paid;
                                return (
                                  <>
                                    <div className={`w-2.5 h-2.5 rounded-full ${paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className={`text-sm font-semibold ${paid ? 'text-green-700' : 'text-red-700'}`}>
                                      {paid ? 'Paid' : 'Pending Payment'}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                            {!((application as any)?.is_application_fee_paid ?? application?.user_profiles?.is_application_fee_paid) && (
                              <div className="text-right">
                                <span className="text-[11px] font-medium text-slate-400 uppercase">Varies by scholarship</span>
                              </div>
                            )}
                          </div>
                        </dd>
                      </div>
                      )}
                      {!isChoseAnother && (
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Documents Review</dt>
                        <dd className="mt-1">
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const statusDisplay = getDocumentStatusDisplay(application?.user_profiles?.documents_status || '');
                              return (
                                <>
                                  <div className={`w-2.5 h-2.5 rounded-full ${statusDisplay.bgColor}`}></div>
                                  <span className={`text-sm font-semibold ${statusDisplay.color}`}>
                                    {statusDisplay.text}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </dd>
                      </div>
                      )}
                      {!isChoseAnother && (
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Enrollment Milestone</dt>
                        <dd className="mt-1">
                          {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-semibold text-green-700">Fully Enrolled</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                              <span className="text-sm font-semibold text-amber-700">Pending Acceptance</span>
                            </div>
                          )}
                        </dd>
                      </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Scholarship — shows the scholarship the student chose to proceed with */}
              {(() => {
                const selectedAppId = application.user_profiles?.selected_application_id;
                const selectedApp = selectedAppId
                  ? allStudentApplications.find((a: any) => a.id === selectedAppId)
                  : null;

                const scholarship = selectedApp?.scholarships || {};

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <Award className="w-6 h-6 mr-3" />
                        Selected Scholarship
                      </h2>
                    </div>
                    {selectedApp ? (
                      <div className="p-6 space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                          <dd className="text-lg font-semibold text-slate-900 mt-1">{scholarship.title || 'Unknown'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Course</dt>
                          <dd className="text-base font-semibold text-slate-900">{scholarship.field_of_study || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Semester Value (with Scholarship)</dt>
                          <dd className="text-base font-semibold text-slate-900">
                            {(() => {
                              const v = scholarship.annual_value_with_scholarship;
                              return typeof v === 'number' ? `$${v.toLocaleString()}` : (v ? `$${Number(v).toLocaleString()}` : 'N/A');
                            })()}
                          </dd>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6">
                        <div className="text-center py-4">
                          <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Award className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">No scholarship selected yet</p>
                          <p className="text-xs text-slate-400 mt-1">The student hasn't confirmed which scholarship they want to proceed with.</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Document Review & Application Approval — per application accordion */}
              <div ref={documentReviewRef} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-8 py-5">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Document Review & Approval
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {(allStudentApplications.length > 0 ? allStudentApplications : [application]).map((app: any) => {
                      const appKey = app.id;
                      const isExpanded = expandedAppDocs[appKey] ?? false;
                      const scholarship = app.scholarships || {};
                      const appDocs: any[] = Array.isArray(app.documents) ? app.documents : [];


                      const statusBorder = app.status === 'approved' || app.status === 'enrolled'
                        ? 'border-green-200'
                        : app.status === 'rejected'
                          ? 'border-red-200'
                          : 'border-slate-200';
                      const headerBg = app.status === 'approved' || app.status === 'enrolled'
                        ? 'bg-green-50 hover:bg-green-100'
                        : app.status === 'rejected'
                          ? 'bg-red-50 hover:bg-red-100'
                          : 'bg-slate-50 hover:bg-slate-100';

                      return (
                        <div key={appKey} className={`border rounded-xl overflow-hidden ${statusBorder}`}>
                          {/* Accordion header */}
                          <button
                            onClick={() => setExpandedAppDocs(prev => ({ ...prev, [appKey]: !isExpanded }))}
                            className={`w-full px-4 py-3 transition-colors text-left flex items-center justify-between ${headerBg}`}
                          >
                            <div className="flex items-center space-x-3">
                              {(app.status === 'approved' || app.status === 'enrolled') && (
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                              )}
                              {app.status === 'rejected' && (
                                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                              )}
                              {app.status !== 'approved' && app.status !== 'enrolled' && app.status !== 'rejected' && (
                                <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                              )}
                              <div>
                                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                  <span>{scholarship.title || 'Scholarship Application'}</span>
                                  {app.status === 'approved' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
                                  )}
                                  {app.status === 'enrolled' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Enrolled</span>
                                  )}
                                  {app.status === 'rejected' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>
                                  )}
                                </h4>
                                <p className="text-sm text-slate-600">
                                  {appDocs.length} document{appDocs.length !== 1 ? 's' : ''}
                                </p>
                                <div className="mt-1 text-xs text-slate-700">
                                  <div>
                                    <span className="text-slate-500">Course:</span>{' '}
                                    <span className="font-medium">{scholarship.field_of_study || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Semester Value:</span>{' '}
                                    <span className="font-medium">
                                      {(() => {
                                        const v = scholarship.annual_value_with_scholarship;
                                        return typeof v === 'number' ? `$${v.toLocaleString()}` : (v ? `$${Number(v).toLocaleString()}` : 'N/A');
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <svg
                              className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Accordion content */}
                          {isExpanded && (
                            <div className="border-t border-slate-200">
                              {/* Documents table-style list */}
                              <div className="divide-y divide-slate-100">
                                {DOCUMENTS_INFO.map((docInfo) => {
                                  const docInApp = appDocs.find((d: any) => d.type === docInfo.key);
                                  const d = docInApp ? {
                                    ...docInApp,
                                    file_url: docInApp.url || docInApp.file_url,
                                    type: docInApp.type,
                                    status: docInApp.status || 'under_review',
                                    uploaded_at: docInApp.uploaded_at
                                  } : null;
                                  const status = d?.status || 'not_submitted';
                                  const updatingKey = `${app.id}:${docInfo.key}`;

                                  return (
                                    <div key={docInfo.key} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          status === 'approved' ? 'bg-green-100' :
                                          status === 'changes_requested' ? 'bg-red-100' :
                                          d?.file_url ? 'bg-blue-100' : 'bg-slate-100'
                                        }`}>
                                          <FileText className={`w-4 h-4 ${
                                            status === 'approved' ? 'text-green-600' :
                                            status === 'changes_requested' ? 'text-red-600' :
                                            d?.file_url ? 'text-blue-600' : 'text-slate-400'
                                          }`} />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-slate-900">{docInfo.label}</p>
                                          <p className="text-xs text-slate-400">
                                            {d?.uploaded_at
                                              ? `Uploaded ${new Date(d.uploaded_at).toLocaleDateString()}`
                                              : 'Not submitted yet'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                          status === 'approved' ? 'bg-green-100 text-green-700' :
                                          status === 'changes_requested' ? 'bg-red-100 text-red-700' :
                                          status === 'under_review' ? 'bg-amber-100 text-amber-700' :
                                          'bg-slate-100 text-slate-500'
                                        }`}>
                                          {status === 'approved' ? 'Approved' :
                                           status === 'changes_requested' ? 'Changes Requested' :
                                           status === 'under_review' ? 'Under Review' :
                                           d?.file_url ? 'Submitted' : 'Pending'}
                                        </span>
                                        {d?.file_url && (
                                          <button
                                            onClick={() => handleViewDocument(d)}
                                            className="text-xs text-[#05294E] hover:text-[#05294E]/80 font-medium px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                                          >
                                            View
                                          </button>
                                        )}
                                        {d?.file_url && status !== 'approved' && app.status !== 'enrolled' && app.status !== 'rejected' && !isChoseAnother && (
                                          <>
                                            <button
                                              onClick={() => approveDoc(docInfo.key, app.id)}
                                              disabled={updating === updatingKey}
                                              className="text-xs font-medium px-2 py-1 rounded-md border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                                            >
                                              Approve
                                            </button>
                                            <button
                                              onClick={() => {
                                                setPendingRejectType(docInfo.key);
                                                setPendingRejectDocAppId(app.id);
                                                setShowReasonModal(true);
                                              }}
                                              disabled={updating === updatingKey}
                                              className="text-xs font-medium px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Application Approval Section */}
                              {app.status !== 'enrolled' && (
                                <div className={`mx-4 mb-4 mt-2 p-4 rounded-xl ${
                                  isChoseAnother ? 'bg-slate-50 border border-slate-200' :
                                  app.status === 'approved' ? 'bg-green-50 border border-green-200' :
                                  app.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                                  'bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200'
                                }`}>
                                  {isChoseAnother ? (
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-900">Application Decision</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                          This student has already been admitted to another scholarship. No actions available.
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                        <span className="text-xs font-semibold text-slate-500">Locked</span>
                                      </div>
                                    </div>
                                  ) : (
                                  <>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-900">Application Decision</h4>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {(() => {
                                          if (app.status === 'approved') return 'This application has been approved.';
                                          if (app.status === 'rejected') return 'This application has been rejected.';

                                          const requiredTypes = ['passport'];
                                          const presentTypes = appDocs.map((d: any) => (d.type || '').toLowerCase());
                                          const missingRequired = requiredTypes.filter(t => !presentTypes.includes(t));

                                          if (missingRequired.length > 0) {
                                            return `Missing required documents: ${missingRequired.join(', ')}.`;
                                          }

                                          const allApproved = appDocs.length > 0 && appDocs.every((d: any) => (d.status || '').toLowerCase() === 'approved');
                                          if (!allApproved) {
                                            return 'Approve all documents first to unlock application approval.';
                                          }

                                          return 'All documents approved — ready to approve this application.';
                                        })()}
                                      </p>
                                    </div>
                                    {app.status === 'approved' && (
                                      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 rounded-full">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                        <span className="text-xs font-semibold text-green-700">Approved</span>
                                      </div>
                                    )}
                                    {app.status === 'rejected' && (
                                      <span className="px-3 py-1 bg-red-100 rounded-full text-xs font-semibold text-red-700">Rejected</span>
                                    )}
                                  </div>
                                  {app.status !== 'approved' && app.status !== 'rejected' && (
                                    <div className="flex items-center gap-2 mt-3">
                                      {(() => {
                                        const requiredTypes = ['passport'];
                                        const presentTypes = appDocs.map((d: any) => (d.type || '').toLowerCase());
                                        const hasAllRequired = requiredTypes.every(t => presentTypes.includes(t));
                                        const allDocsApproved = appDocs.length > 0 && appDocs.every((d: any) => (d.status || '').toLowerCase() === 'approved');
                                        const canApprove = hasAllRequired && allDocsApproved;

                                        return (
                                          <>
                                            <button
                                              disabled={!canApprove || !!approvingApplication[app.id]}
                                              onClick={() => {
                                                setPendingApproveAppId(app.id);
                                                setShowApproveConfirmModal(true);
                                              }}
                                              className={`px-4 py-2 rounded-lg font-medium text-white text-sm transition-all ${
                                                canApprove
                                                  ? 'bg-[#05294E] hover:bg-[#041f38] hover:scale-[1.02] active:scale-[0.98] shadow-sm'
                                                  : 'bg-slate-300 cursor-not-allowed'
                                              }`}
                                            >
                                              {approvingApplication[app.id] ? 'Approving...' : 'Approve Application'}
                                            </button>
                                            <button
                                              onClick={() => {
                                                setPendingRejectAppId(app.id);
                                                setShowRejectStudentModal(true);
                                              }}
                                              className="px-4 py-2 rounded-lg font-medium text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                  </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>


            </div>

            {/* Sidebar */}
            {!isChoseAnother && (
              <div className="xl:col-span-4 space-y-4">
                <ApplicationProgressCard
                  currentStep={getCurrentStep()}
                  allSteps={steps}
                  isExpanded={isProgressExpanded}
                  onToggleExpand={() => setIsProgressExpanded(!isProgressExpanded)}
                  getStepStatus={getStepStatus}
                />

                {studentRecord && (
                  <PaymentStatusCard
                    student={studentRecord}
                    realPaidAmounts={realPaidAmounts}
                    loadingPaidAmounts={loadingPaidAmounts}
                    editingFees={null}
                    editingPaymentMethod={null}
                    newPaymentMethod=""
                    savingPaymentMethod={false}
                    savingFees={false}
                    isPlatformAdmin={false}
                    dependents={studentRecord.dependents || 0}
                    hasOverride={hasOverride}
                    userSystemType={studentRecord.system_type}
                    hasMatriculaRewardsDiscount={false}
                    installmentPlans={installmentPlans}
                    onStartEditFees={() => { }}
                    onSaveEditFees={async () => { }}
                    onCancelEditFees={() => { }}
                    onResetFees={async () => { }}
                    onEditFeesChange={() => { }}
                    onMarkAsPaid={() => { }}
                    onEditPaymentMethod={() => { }}
                    onUpdatePaymentMethod={async () => { }}
                    onCancelPaymentMethod={() => { }}
                    onPaymentMethodChange={() => { }}
                    formatFeeAmount={formatFeeAmount}
                    getFeeAmount={getFeeAmount}
                    hideSelectionFee={true}
                  />
                )}

                {/* Sidebar Content is now focused on Progress and Payments */}
              </div>
            )}
          </div>
        )}
        {/* {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <MessageCircle className="w-6 h-6 mr-3" />
              Communication Center
            </h2>
                                    <p className="text-slate-200 text-sm mt-1">Chat with {student?.full_name || 'Student'}</p>
          </div>
          <div className="p-6">
            <div className="flex-1 flex flex-col">
              <ApplicationChat
                messages={chat.messages}
                onSend={chat.sendMessage} // Corrected typage
                loading={chat.loading}
                isSending={chat.isSending}
                error={chat.error}
                currentUserId={user?.id || ''}
                messageContainerClassName="gap-6 py-4"
              />
            </div>
          </div>
        </div>
      )} */}

        {activeTab === 'survey' && (
          <SelectionSurveyView
            userId={application?.user_profiles?.user_id || ''}
            surveyPassed={application?.user_profiles?.selection_survey_passed}
          />
        )}

        {activeTab === 'documents' && !isChoseAnother && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                      <FileText className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-white">Document Management</h2>
                      <p className="text-slate-200 text-sm">Manage document requests and student submissions</p>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      onClick={() => setShowNewRequestModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/30 transition-all font-semibold text-sm shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New Request</span>
                    </button>
                    <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
                      {documentRequests.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {documentRequests.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-700 mb-2">No document requests yet</h4>
                    <p className="text-slate-500 max-w-md mx-auto">Create your first request using the button above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documentRequests.map((request) => (
                      <div key={request.id} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 relative group">
                        <div className="absolute top-4 right-4 flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() => setExpandedRequests(prev => ({ ...prev, [request.id]: !(prev[request.id] !== false) }))}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                          >
                            {expandedRequests[request.id] === false ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                          </button>
                          {request.attachment_url && (
                            <button
                              onClick={() => handleDownloadTemplate(request.attachment_url)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#05294E] hover:bg-[#041f38] text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-200"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span className="hidden sm:inline">Template</span>
                            </button>
                          )}
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${request.status === 'open' ? 'bg-blue-100 text-blue-800 border border-blue-200/50' :
                              request.status === 'closed' ? 'bg-slate-100 text-slate-800 border border-slate-200/50' :
                                'bg-green-100 text-green-800 border border-green-200/50'
                            }`}>
                            {request.status === 'open' ? 'Open' :
                              request.status === 'closed' ? 'Closed' :
                                request.status}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-200/50">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>

                          <div className="flex-1 min-w-0 pr-0 sm:pr-40">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="text-lg font-bold text-slate-900 leading-tight break-words">
                                {request.title}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${request.is_global
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200/50'
                                  : 'bg-purple-100 text-purple-800 border border-purple-200/50'
                                }`}>
                                {request.is_global ? 'Global Request' : 'Individual Request'}
                              </span>
                            </div>

                            {request.description && (
                              <p className="text-sm text-slate-600 mb-3 leading-relaxed break-words">{request.description}</p>
                            )}

                            {request.due_date && (
                              <div className="flex items-center text-xs font-medium text-slate-400 mb-4 bg-slate-50 self-start px-2 py-1 rounded inline-flex">
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Due: {new Date(request.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Student Upload Section — grouped by submission rounds */}
                        {expandedRequests[request.id] !== false && (() => {
                          const allUploads = request.uploads || [];
                          const { closedGroups, currentGroup } = groupUploadsBySubmission(allUploads);
                          const lastClosedGroup = closedGroups.length > 0 ? closedGroups[closedGroups.length - 1] : null;
                          const historyGroups = currentGroup.length > 0 ? closedGroups : closedGroups.slice(0, -1);
                          const isHistoryOpen = expandedHistory[request.id] === true;

                          return (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                          {allUploads.length > 0 ? (
                            <>
                              {/* Current pending group or last closed group */}
                              {currentGroup.length > 0 ? (
                                <div className="space-y-3">
                                  {currentGroup.map((upload: any) => {
                                    const uploadStatus = upload.status || 'under_review';
                                    const isPending = uploadStatus === 'under_review';
                                    const cfg = UPLOAD_STATUS_CONFIG[uploadStatus] || UPLOAD_STATUS_CONFIG['under_review'];
                                    const StatusIcon = cfg.icon;
                                    return (
                                      <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-green-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 break-all">
                                              {upload.file_url ? getFileName(upload.file_url) : 'Student response file'}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                              Submitted on {upload.uploaded_at ? new Date(upload.uploaded_at).toLocaleDateString() : 'Unknown date'}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center">
                                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium ${cfg.className}`}>
                                            <StatusIcon className="h-4 w-4" />
                                            {cfg.label}
                                          </span>

                                          <button
                                            onClick={() => handleViewUpload(upload)}
                                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                                          >
                                            View
                                          </button>

                                          {isPending && application.status !== 'enrolled' && application.acceptance_letter_status !== 'approved' && application.status !== 'rejected' && (
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => handleApproveDocument(upload.id)}
                                                disabled={approvingDocumentId[upload.id]}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                {approvingDocumentId[upload.id] ? 'Approving...' : 'Approve'}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setPendingRejectDocumentId(upload.id);
                                                  setShowRejectDocumentModal(true);
                                                }}
                                                disabled={rejectingDocumentId[upload.id]}
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : lastClosedGroup ? (
                                <div className="space-y-3">
                                  {lastClosedGroup.map((upload: any) => {
                                    const cfg = UPLOAD_STATUS_CONFIG[upload.status] || UPLOAD_STATUS_CONFIG['under_review'];
                                    const StatusIcon = cfg.icon;
                                    return (
                                      <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-green-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 break-all">
                                              {upload.file_url ? getFileName(upload.file_url) : 'Student response file'}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                              Submitted on {upload.uploaded_at ? new Date(upload.uploaded_at).toLocaleDateString() : 'Unknown date'}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center">
                                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium ${cfg.className}`}>
                                            <StatusIcon className="h-4 w-4" />
                                            {cfg.label}
                                          </span>
                                          <button
                                            onClick={() => handleViewUpload(upload)}
                                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                                          >
                                            View
                                          </button>
                                          {upload.status === 'under_review' && application.status !== 'enrolled' && application.acceptance_letter_status !== 'approved' && application.status !== 'rejected' && (
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => handleApproveDocument(upload.id)}
                                                disabled={approvingDocumentId[upload.id]}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                {approvingDocumentId[upload.id] ? 'Approving...' : 'Approve'}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setPendingRejectDocumentId(upload.id);
                                                  setShowRejectDocumentModal(true);
                                                }}
                                                disabled={rejectingDocumentId[upload.id]}
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {lastClosedGroup[lastClosedGroup.length - 1]?.rejection_reason && (
                                    <div className="w-full mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                                      <p className="text-xs font-semibold text-red-800 uppercase mb-1">Rejection Reason</p>
                                      <p className="text-sm text-red-900">{lastClosedGroup[lastClosedGroup.length - 1].rejection_reason}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                                  <p className="text-slate-500 text-sm">No response submitted yet</p>
                                </div>
                              )}

                              {/* Grouped submission history accordion */}
                              {historyGroups.length > 0 && (
                                <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedHistory(prev => ({ ...prev, [request.id]: !prev[request.id] }))}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600"
                                  >
                                    <span>
                                      Submission History
                                      {request.title && <span className="text-slate-800 font-semibold"> — {request.title}</span>}
                                      <span className="ml-1 text-slate-400">({historyGroups.length} {historyGroups.length === 1 ? 'previous attempt' : 'previous attempts'})</span>
                                    </span>
                                    {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>

                                  {isHistoryOpen && (
                                    <ul className="divide-y divide-slate-100">
                                      {[...historyGroups].reverse().map((group, groupIdx) => {
                                        const groupNumber = historyGroups.length - groupIdx;
                                        const lastUpload = group[group.length - 1];
                                        const cfg = UPLOAD_STATUS_CONFIG[lastUpload.status] || UPLOAD_STATUS_CONFIG['under_review'];
                                        const GroupIcon = cfg.icon;
                                        return (
                                          <li key={groupIdx} className="px-4 py-3 bg-white">
                                            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400 font-medium">Attempt #{groupNumber}</span>
                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.className}`}>
                                                  <GroupIcon className="w-3 h-3" />
                                                  {cfg.label}
                                                </span>
                                                <span className="text-xs text-slate-400">{group.length} file(s)</span>
                                              </div>
                                              <span className="text-xs text-slate-400">{formatHistoryDate(lastUpload.uploaded_at)}</span>
                                            </div>

                                            {lastUpload.rejection_reason && (
                                              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-2">
                                                <span className="font-semibold">Reason: </span>{lastUpload.rejection_reason}
                                              </p>
                                            )}

                                            <div className="space-y-1">
                                              {group.map((upload: any, fileIdx: number) => (
                                                <div key={upload.id} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded border border-slate-100">
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                                    <div className="flex flex-col min-w-0">
                                                      <span className="text-xs text-slate-700 font-medium truncate">
                                                        {upload.file_url ? getFileName(upload.file_url) : `File ${fileIdx + 1}`}
                                                      </span>
                                                      <span className="text-[10px] text-slate-400">
                                                        {formatHistoryDate(upload.uploaded_at)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  {upload.file_url && (
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                      <button
                                                        onClick={() => handleViewUpload(upload)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-[#05294E] text-white hover:bg-[#041f38] transition-colors"
                                                      >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View
                                                      </button>
                                                      <a
                                                        href={upload.file_url}
                                                        download
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                                                      >
                                                        <Download className="w-3 h-3" />
                                                      </a>
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                              <p className="text-slate-500 text-sm">No response submitted yet</p>
                            </div>
                          )}
                        </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Acceptance Letter Section */}
            <div ref={acceptanceLetterRef} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">Acceptance Letter</h4>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="bg-white rounded-3xl p-6 mb-6">
                  <p className="text-slate-700 mb-6 leading-relaxed">
                    Please upload the student's acceptance letter and any other required documents, such as the I-20 Control Fee receipt.
                  </p>

                  {acceptanceLetterUploaded && application?.acceptance_letter_url ? (
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-1">
                            <p className="font-medium text-slate-900 break-words">
                              {application.acceptance_letter_url.split('/').pop() || 'Acceptance Letter'}
                            </p>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                              Available
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 break-words">
                            Sent on {application.acceptance_letter_sent_at ? new Date(application.acceptance_letter_sent_at).toLocaleDateString() : 'Unknown date'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 break-words">
                            Official university acceptance document
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2 mt-3">
                            <button
                              onClick={handleViewAcceptanceLetter}
                              className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto text-center"
                            >
                              View
                            </button>
                            <button
                              onClick={handleDownloadAcceptanceLetter}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto text-center"
                            >
                              Download
                            </button>
                            <label className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl cursor-pointer transition-colors w-full sm:w-auto text-center justify-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              {replacingAcceptanceLetter ? 'Replacing...' : (replaceAcceptanceLetterFile ? 'Change file' : 'Replace Letter')}
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => setReplaceAcceptanceLetterFile(e.target.files?.[0] || null)}
                                disabled={replacingAcceptanceLetter}
                              />
                            </label>
                          </div>
                          {replaceAcceptanceLetterFile && (
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex items-center space-x-2 bg-blue-50 rounded-lg px-3 py-2 flex-1 min-w-0">
                                <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-blue-800 text-sm font-medium truncate">{replaceAcceptanceLetterFile.name}</span>
                              </div>
                              <button
                                onClick={handleReplaceAcceptanceLetter}
                                disabled={replacingAcceptanceLetter}
                                className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                              >
                                {replacingAcceptanceLetter ? 'Saving...' : 'Confirm Replace'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-blue-300 rounded-3xl p-6 bg-blue-50">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <h5 className="font-semibold text-blue-900 mb-2">Select Acceptance Letter</h5>
                        <p className="text-blue-700 text-sm mb-4">Drag and drop or click to browse files</p>

                        {acceptanceLetterFile ? (
                          <div className="mb-4">
                            <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg px-4 py-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-blue-800 font-medium">{acceptanceLetterFile.name}</span>
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-col items-center space-y-4">
                          <div className="file-input-wrapper">
                            <label className={`bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center justify-center min-w-[140px] ${isFileSelecting ? 'opacity-50 cursor-not-allowed' : ''
                              }`}>
                              {isFileSelecting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              )}
                              <span>{isFileSelecting ? 'Selecting...' : (acceptanceLetterFile ? 'Change File' : 'Choose File')}</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={handleAcceptanceLetterFileSelect}
                                disabled={uploadingAcceptanceLetter || isFileSelecting}
                                key={acceptanceLetterFile ? 'change' : 'initial'} // Força re-render do input
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!acceptanceLetterUploaded && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleProcessAcceptanceLetter}
                      disabled={!acceptanceLetterFile || uploadingAcceptanceLetter}
                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingAcceptanceLetter ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Process Acceptance</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Form Section - Only for Transfer Students */}
            {application?.student_process_type === 'transfer' && (
              <div ref={transferFormRef} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden mt-8">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">Transfer Form</h4>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="bg-white rounded-3xl p-6 mb-6">
                    <p className="text-slate-700 mb-6 leading-relaxed">
                      Upload the transfer form template for the student to download, fill out, and submit back to you for review.
                    </p>

                    {/* Upload Template Section */}
                    <div className="mb-6">
                      <h5 className="text-lg font-semibold text-slate-800 mb-4">Transfer Form Template</h5>

                      {transferForm?.transfer_form_url ? (
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-green-800">Template Uploaded</p>
                                  <p className="text-sm text-green-600">
                                    Sent on {transferForm.transfer_form_sent_at ? new Date(transferForm.transfer_form_sent_at).toLocaleDateString() : 'Unknown date'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = transferForm.transfer_form_url;
                                    link.download = 'transfer_form_template.pdf';
                                    link.click();
                                  }}
                                  className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => setPreviewUrl(transferForm.transfer_form_url)}
                                  className="bg-white text-green-600 border border-green-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.doc,.docx';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        setSelectedTransferFormFile(file);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                                >
                                  Replace
                                </button>
                              </div>
                            </div>
                          </div>

                          {(selectedTransferFormFile || uploadingTransferForm) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                              <h4 className="text-lg font-semibold text-[#05294E] mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {uploadingTransferForm ? 'Uploading Transfer Form...' : 'Replace Transfer Form'}
                              </h4>

                              {uploadingTransferForm ? (
                                <div className="text-center py-4">
                                  <div className="w-8 h-8 border-4 border-[#05294E] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                  <p className="text-[#05294E] font-medium">Uploading transfer form...</p>
                                </div>
                              ) : selectedTransferFormFile ? (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-[#05294E] mb-2">
                                      New Transfer Form File
                                    </label>
                                    <div className="flex items-center justify-center">
                                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-200 transition font-medium text-[#05294E]">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <span>Change file</span>
                                        <input
                                          type="file"
                                          className="sr-only"
                                          accept=".pdf,.doc,.docx"
                                          onChange={(e) => setSelectedTransferFormFile(e.target.files ? e.target.files[0] : null)}
                                          disabled={uploadingTransferForm}
                                        />
                                      </label>
                                    </div>
                                    <p className="text-sm text-blue-600 mt-2 text-center">
                                      Selected: {selectedTransferFormFile?.name || 'Unknown file'}
                                    </p>
                                  </div>

                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => handleUploadTransferForm(selectedTransferFormFile)}
                                      disabled={!selectedTransferFormFile || uploadingTransferForm}
                                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                                    >
                                      Replace Transfer Form
                                    </button>
                                    <button
                                      onClick={() => setSelectedTransferFormFile(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-blue-300 rounded-3xl p-6 bg-blue-50">
                          <div className="text-center">
                            <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <h5 className="font-semibold text-blue-900 mb-2">Upload Transfer Form Template</h5>
                            <p className="text-blue-700 text-sm mb-4">Select the transfer form template for the student</p>

                            {selectedTransferFormFile ? (
                              <div className="mb-4">
                                <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg px-4 py-2">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-blue-800 font-medium">{selectedTransferFormFile.name}</span>
                                </div>
                              </div>
                            ) : null}

                            <div className="flex flex-col items-center space-y-4">
                              <label className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span>{selectedTransferFormFile ? 'Change File' : 'Choose File'}</span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => setSelectedTransferFormFile(e.target.files ? e.target.files[0] : null)}
                                  disabled={uploadingTransferForm}
                                />
                              </label>

                              {selectedTransferFormFile && (
                                <button
                                  onClick={() => handleUploadTransferForm(selectedTransferFormFile)}
                                  disabled={uploadingTransferForm}
                                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {uploadingTransferForm ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span>Upload Template</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Student Uploads Section */}
                    {transferFormUploads.length > 0 && (
                      <div>
                        <h5 className="text-lg font-semibold text-slate-800 mb-4">Student Submissions</h5>
                        <div className="space-y-3">
                          {transferFormUploads.map((upload) => {
                            const statusColor = upload.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                              upload.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-yellow-100 text-yellow-800 border-yellow-200';

                            return (
                              <div key={upload.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-900">
                                        {upload.file_url.split('/').pop()}
                                      </p>
                                      <p className="text-sm text-slate-500">
                                        Uploaded: {new Date(upload.uploaded_at).toLocaleDateString()}
                                      </p>
                                      {upload.rejection_reason && (
                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                          <p className="text-xs font-medium text-red-600 mb-1">Rejection reason:</p>
                                          <p className="text-sm text-red-700">{upload.rejection_reason}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-3 ml-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                                      {upload.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    </span>

                                    {/* Action buttons for under_review status */}
                                    {upload.status === 'under_review' && (
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleApproveTransferFormUpload(upload.id)}
                                          className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => {
                                            setPendingRejectDocumentId(upload.id);
                                            setShowRejectDocumentModal(true);
                                          }}
                                          className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}

                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = upload.file_url;
                                        link.download = upload.file_url.split('/').pop() || 'transfer_form.pdf';
                                        link.click();
                                      }}
                                      className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      Download
                                    </button>
                                    <button
                                      onClick={() => setPreviewUrl(upload.file_url)}
                                      className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      View
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Modal para justificar solicitação de mudanças */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Request Changes</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for requesting changes to this document. This will help the student understand what needs to be fixed.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setRejectReason('');
                  setPendingRejectType(null);
                  setPendingRejectDocAppId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectType) {
                    requestChangesDoc(pendingRejectType, rejectReason, pendingRejectDocAppId || undefined);
                    setShowReasonModal(false);
                    setRejectReason('');
                    setPendingRejectType(null);
                    setPendingRejectDocAppId(null);
                  }
                }}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para recusar aluno na bolsa */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Student Application</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this student's application. This information will be shared with the student.
            </p>
            <textarea
              value={rejectStudentReason}
              onChange={(e) => setRejectStudentReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectStudentModal(false);
                  setRejectStudentReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={rejectStudent}
                disabled={!rejectStudentReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequestModal && application && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-4 border border-slate-200">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Document Request</h3>
            <p className="text-sm text-slate-600 mb-6 text-center">
              Request a new document from {application?.user_profiles?.full_name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  placeholder="e.g., Additional Reference Letter"
                  value={newDocumentRequest.title}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base min-h-[80px] resize-vertical"
                  placeholder="Describe what document you need and any specific requirements..."
                  value={newDocumentRequest.description}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  type="date"
                  value={newDocumentRequest.due_date}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Template/Attachment (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" />
                    </svg>
                    <span>{newDocumentRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => setNewDocumentRequest(prev => ({
                        ...prev,
                        attachment: e.target.files ? e.target.files[0] : null
                      }))}
                      disabled={creatingDocumentRequest}
                    />
                  </label>
                  {newDocumentRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">
                      {newDocumentRequest.attachment.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition disabled:opacity-50"
                onClick={() => {
                  setShowNewRequestModal(false);
                  setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
                }}
                disabled={creatingDocumentRequest}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-[#05294E] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#041f38] transition disabled:opacity-50 flex items-center justify-center"
                onClick={handleCreateDocumentRequest}
                disabled={creatingDocumentRequest || !newDocumentRequest.title.trim()}
              >
                {creatingDocumentRequest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para rejeitar documento */}
      {showRejectDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Document</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this document. This information will be shared with the student.
            </p>
            <textarea
              value={rejectDocumentReason}
              onChange={(e) => setRejectDocumentReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectDocumentModal(false);
                  setRejectDocumentReason('');
                  setPendingRejectDocumentId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectDocumentId) {
                    // Verificar se é um transfer form upload ou document request upload
                    const isTransferFormUpload = transferFormUploads.some(upload => upload.id === pendingRejectDocumentId);

                    if (isTransferFormUpload) {
                      handleRejectTransferFormUpload(pendingRejectDocumentId, rejectDocumentReason);
                    } else {
                      handleRejectDocument(pendingRejectDocumentId, rejectDocumentReason);
                    }

                    setShowRejectDocumentModal(false);
                    setRejectDocumentReason('');
                    setPendingRejectDocumentId(null);
                  }
                }}
                disabled={!rejectDocumentReason.trim() || (!!pendingRejectDocumentId && !!rejectingDocumentId[pendingRejectDocumentId])}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {pendingRejectDocumentId && rejectingDocumentId[pendingRejectDocumentId] ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para rejeitar aplicação */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Reject Application</h3>
                <p className="text-slate-500">
                  {(() => {
                    const targetApp = allStudentApplications.find((a: any) => a.id === pendingRejectAppId);
                    return targetApp?.scholarships?.title
                      ? `Scholarship: ${targetApp.scholarships.title}`
                      : 'Provide a reason for this decision';
                  })()}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 font-medium">
              This message will be sent to the student to help them understand why their application was not accepted.
            </p>

            <textarea
              value={rejectStudentReason}
              onChange={(e) => setRejectStudentReason(e.target.value)}
              className="w-full h-40 p-4 border-2 border-slate-200 rounded-2xl text-slate-700 resize-none focus:outline-none focus:border-[#05294E] transition-colors bg-slate-50"
              placeholder="Ex: Missing specific prerequisite, incomplete information, etc..."
            />

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowRejectStudentModal(false);
                  setRejectStudentReason('');
                  setPendingRejectAppId(null);
                }}
                className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={rejectStudent}
                disabled={!rejectStudentReason.trim()}
                className="px-8 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de aprovação */}
      {showApproveConfirmModal && (() => {
        const pendingApp = allStudentApplications.find((a: any) => a.id === pendingApproveAppId);
        const scholarship = pendingApp?.scholarships || {};
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Confirm Approval</h3>
                  <p className="text-sm text-slate-500">Review the details before confirming</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex-shrink-0">Student</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">{application?.user_profiles?.full_name || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-2 border-t border-slate-200 pt-3">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex-shrink-0">Scholarship</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">{scholarship.title || '—'}</span>
                </div>
                {scholarship.field_of_study && (
                  <div className="flex items-start justify-between gap-2 border-t border-slate-200 pt-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex-shrink-0">Field of Study</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{scholarship.field_of_study}</span>
                  </div>
                )}
                {scholarship.annual_value_with_scholarship && (
                  <div className="flex items-start justify-between gap-2 border-t border-slate-200 pt-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex-shrink-0">With Scholarship</span>
                    <span className="text-sm font-bold text-green-700 text-right">
                      ${Number(scholarship.annual_value_with_scholarship).toLocaleString('en-US')}<span className="text-xs font-medium text-green-600">/yr</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowApproveConfirmModal(false);
                    setPendingApproveAppId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowApproveConfirmModal(false);
                    if (pendingApproveAppId) handleApproveApplication(pendingApproveAppId);
                    setPendingApproveAppId(null);
                  }}
                  disabled={!!pendingApproveAppId && !!approvingApplication[pendingApproveAppId]}
                  className="px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {pendingApproveAppId && approvingApplication[pendingApproveAppId] ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Approving...
                    </>
                  ) : (
                    'Confirm Approval'
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default StudentDetails;