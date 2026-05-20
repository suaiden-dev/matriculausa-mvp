import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';
import type { Application, UserProfile, Scholarship } from '../../types';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import SelectionSurveyView from '../../components/AdminDashboard/SelectionSurveyView';
import ApplicationProgressCard from '../../components/AdminDashboard/StudentDetails/ApplicationProgressCard';
import PaymentStatusCard from '../../components/AdminDashboard/StudentDetails/PaymentStatusCard';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { getRealPaidAmounts } from '../../utils/paymentConverter';
import { FileText, UserCircle, CheckCircle2, ArrowLeft, Files, ClipboardList } from 'lucide-react';
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & { selection_survey_passed?: boolean };
  scholarships: Scholarship;
}

const DOCUMENTS_INFO = [
  {
    key: 'passport',
    label: 'Passport',
    description: 'A valid copy of the student\'s passport. Used for identification and visa purposes.'
  },
  {
    key: 'diploma',
    label: 'High School Diploma',
    description: 'Proof of high school graduation. Required for university admission.'
  },
  {
    key: 'funds_proof',
    label: 'Proof of Funds',
    description: 'A bank statement or financial document showing sufficient funds for study.'
  }
];

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
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'documents' | 'survey'>('details');

  // Financial Monitoring Logic
  const { getFeeAmount, formatFeeAmount, hasOverride, userSystemType: configSystemType } = useFeeConfig(application?.user_profiles?.user_id);
  const [realPaidAmounts, setRealPaidAmounts] = useState<Record<string, number>>({});
  const [loadingPaidAmounts, setLoadingPaidAmounts] = useState<Record<string, boolean>>({});
  
  // Adapt student data for PaymentStatusCard
  const studentRecord = React.useMemo(() => {
    if (!application) return null;
    const profile = application.user_profiles;
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
      all_applications: [application],
      total_applications: 1,
      is_locked: true,
      system_type: profile.system_type || configSystemType,
      has_paid_ds160_package: (profile as any).has_paid_ds160_package || false,
      has_paid_i539_cos_package: (profile as any).has_paid_i539_cos_package || false,
      placement_fee_flow: (profile as any).placement_fee_flow || false,
      is_placement_fee_paid: (profile as any).is_placement_fee_paid || false,
      placement_fee_pending_balance: (profile as any).placement_fee_pending_balance || 0,
    } as any;
  }, [application, configSystemType]);

  // Load real paid amounts
  useEffect(() => {
    if (!application?.user_profiles?.user_id) return;

    const loadRealPaidAmounts = async () => {
      setLoadingPaidAmounts({
        selection_process: true,
        scholarship: true,
        i20_control: true,
        application: true,
        placement: true,
      });
      try {
        const feeTypes: any[] = ['selection_process', 'scholarship', 'i20_control', 'application', 'placement', 'ds160_package', 'i539_cos_package'];
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
  }, [application?.user_profiles?.user_id]);

  // Documentos básicos do aluno (passport, diploma, funds_proof) para a aba Documents
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  // Modal para justificar solicitação de mudanças
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingRejectType, setPendingRejectType] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
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

  // Estados para Acceptance Letter
  const [acceptanceLetterFile, setAcceptanceLetterFile] = useState<File | null>(null);
  const [uploadingAcceptanceLetter, setUploadingAcceptanceLetter] = useState(false);
  const [acceptanceLetterUploaded, setAcceptanceLetterUploaded] = useState(false);

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
  const [approvingApplication, setApprovingApplication] = useState(false);

  const allSteps = [
    { key: 'apply', label: 'Application' },
    { key: 'review', label: 'Admissions Review' },
    { key: 'application_fee', label: 'Application Fee' },
    { key: 'placement_fee', label: 'Placement Fee' },
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
    if (applicationId && application?.user_profiles?.user_id) {
      fetchDocumentRequests();
      fetchStudentDocuments();
      
      // Buscar dados do Transfer Form se for aplicação de transfer
      if (application?.student_process_type === 'transfer') {
        fetchTransferForm();
        fetchTransferFormUploads();
      }
    }
  }, [applicationId, application]); // Incluída a dependência 'application' para garantir que os documentos sejam recarregados quando a aplicação for atualizada

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
          globalRequests = globalData || [];
        }
      }

      // Combinar requests específicos e globais
      const allRequests = [...(specificRequests || []), ...globalRequests];

      // Buscar uploads para cada request
      if (allRequests && allRequests.length > 0) {
        const requestIds = allRequests.map(req => req.id);
        
        const { data: uploads, error: uploadsError } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', requestIds);

        if (uploadsError) {
          console.error("Error fetching uploads:", uploadsError);
        } else {
          const requestsWithUploads = allRequests.map(request => ({
            ...request,
            uploads: uploads?.filter(upload => upload.document_request_id === request.id) || []
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
              scholarship_application_id
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
                scholarship_application_id
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

      // Combinar uploads com a carta de aceite
      let allDocuments = [...uploads];
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
          request_title: doc.request_title || doc.title || 'Document Request',
          request_description: doc.request_description || doc.description || '',
          request_created_at: doc.request_created_at || doc.created_at,
          is_global: doc.is_global || false,
          request_type: doc.request_type || 'document',
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
    reviewNotes?: string
  ) => {
    const docs = Array.isArray((application as any)?.documents) ? ([...(application as any).documents] as any[]) : [];
    const idx = docs.findIndex((d) => d.type === type);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], status, review_notes: reviewNotes ?? docs[idx]?.review_notes };
    }
    await supabase.from('scholarship_applications').update({ documents: docs }).eq('id', applicationId);
    setApplication((prev) => prev ? ({ ...prev, documents: docs } as any) : prev);
  };

  // Funções para a aba Documents
  const handleViewUpload = (upload: any) => {
    // Implementar visualização do upload
    console.log('View upload:', upload);
  };

  const handleDownloadTemplate = (url: string) => {
    // Implementar download do template
    console.log('Download template:', url);
  };

  const handleApproveDocument = async (documentId: string) => {
    try {
      // Primeiro, buscar informações do upload para notificação
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description
          )
        `)
        .eq('id', documentId)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch upload data: ' + fetchError.message);
      }

      // Atualizar o status para aprovado
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'approved' })
        .eq('id', documentId);
      
      if (error) {
        throw new Error('Failed to approve document: ' + error.message);
      }

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application?.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Documento aprovado",
            email_aluno: userData.email,
            nome_aluno: application?.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been approved.`
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
              await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application?.user_profiles.user_id,
                  title: 'Document approved',
                  message: `Your document ${uploadData.file_url?.split('/').pop()} was approved for request ${uploadData.document_requests?.title}.`,
                  type: 'document_approved',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
      }

      // Atualizar o estado local dos documentos do aluno
      setStudentDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, status: 'approved' } : doc
      ));

      // Recarregar os dados para mostrar o novo status
      fetchStudentDocuments();

      // Log: aprovação de document request pela universidade
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
            p_action_type: 'document_approval',
            p_action_description: `University approved document request upload: ${uploadData.file_url?.split('/').pop() || 'file'} (${uploadData.document_requests?.title || 'Request'})`,
            p_performed_by: performedBy,
            p_performed_by_type: 'university',
            p_metadata: {
              upload_id: documentId,
              request_id: uploadData.document_requests?.id || null,
              request_title: uploadData.document_requests?.title || null,
              ip: clientIp
            }
          });
        }
      } catch (logErr) {
        console.error('Failed to log university document approval:', logErr);
      }

    } catch (err: any) {
      console.error("Error approving document:", err);
      alert(`Failed to approve document: ${err.message}`);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc.file_url) return;
    
    try {
      // ✅ CORREÇÃO: Não converter a URL aqui, deixar o DocumentViewerModal fazer isso
      // Isso permite que o modal teste ambos os buckets (document-attachments e student-documents)
      let downloadUrl = doc.file_url;
      
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
      alert(`Failed to download document: ${err.message}`);
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

  const approveDoc = async (type: string) => {
    if (!applicationId) return;

    try {
      setUpdating(type);
      
      // 1. Buscar a aplicação atual para obter os documentos existentes
      const { data: currentApp, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', applicationId)
        .single();
      
      if (fetchError) throw fetchError;

      // 2. Preparar os documentos atualizados
      let updatedDocuments = currentApp?.documents || [];
      const existingDocIndex = updatedDocuments.findIndex((d: any) => d.type === type);
      
      if (existingDocIndex >= 0) {
        updatedDocuments[existingDocIndex] = {
          ...updatedDocuments[existingDocIndex],
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        };
      } else {
        // Se não existir no JSON, buscar da melhor fonte disponível
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

      // 3. Salvar no banco de dados
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: updatedDocuments })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // 4. ATUALIZAR ESTADO LOCAL IMEDIATAMENTE (Crucial para feedback)
      setApplication(prev => prev ? ({
        ...prev,
        documents: updatedDocuments
      }) : prev);

      setStudentDocs(prev => prev.map(doc => 
        doc.type === type ? { ...doc, status: 'approved' } : doc
      ));

      // 5. Verificar se todos os 3 documentos básicos estão aprovados
      const basicDocTypes = ['passport', 'diploma', 'funds_proof'];
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

      // 6. Enviar Notificações (Sino In-App)
      if (application?.user_profiles?.user_id) {
        try {
          const docLabels: Record<string, string> = {
            passport: 'Passport',
            diploma: 'High School Diploma',
            funds_proof: 'Proof of Funds'
          };
          const label = docLabels[type] || type;

          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
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

      // 7. Log da ação
      try {
        const studentProfileId = application?.user_profiles?.id;
        const performedBy = user?.id;
        if (studentProfileId && performedBy) {
          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'document_approval',
            p_action_description: `Document ${type} approved by university admin`,
            p_performed_by: performedBy,
            p_performed_by_type: 'university',
            p_metadata: { document_type: type, application_id: applicationId }
          });
        }
      } catch (logErr) {
        console.error('Error logging action:', logErr);
      }

    } catch (error: any) {
      console.error(`Error approving document ${type}:`, error);
      alert(`Failed to approve document: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const requestChangesDoc = async (type: string, reason: string) => {
    try {
      setUpdating(type);
      await updateApplicationDocStatus(type, 'changes_requested', reason || undefined);
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







  const handleApproveApplication = async () => {
    if (!application) return;

    // Verificar se todos os documentos básicos estão aprovados
    const requiredTypes = ['passport'];
    const allApproved = requiredTypes.every(type => {
      const doc = latestDocByType(type);
      return doc && doc.status === 'approved';
    });

    if (!allApproved) {
      if (!confirm('Passport is not yet approved. Do you want to approve the application anyway?')) {
        return;
      }
    }

    try {
      setApprovingApplication(true);
      
      const { error } = await supabase
        .from('scholarship_applications')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', application.id);

      if (error) throw error;

      // Atualizar estado local
      setApplication(prev => prev ? ({ 
        ...prev, 
        status: 'approved' 
      } as any) : prev);

      // Notificação via webhook
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
            o_que_enviar: `Congratulations! Your application for <strong>${application.scholarships?.title}</strong> has been approved by the university. You can now proceed with the next steps in your dashboard.`
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

      alert('Application approved successfully!');
    } catch (err: any) {
      console.error('Error approving application:', err);
      alert(`Failed to approve application: ${err.message}`);
    } finally {
      setApprovingApplication(false);
    }
  };

  const rejectStudent = async () => {
    try {
      // Atualiza perfil do aluno para estado rejeitado
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'rejected' })
        .eq('user_id', application.user_profiles.user_id);
      // Atualiza aplicação com status e justificativa
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', applicationId);
      
      // Atualizar o estado local da aplicação
      setApplication(prev => prev ? ({
        ...prev,
        status: 'rejected'
      } as any) : prev);
      
      setActiveTab('details');
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
    } catch (error) {
      console.error('Error rejecting student:', error);
    }
  };

  const handleRejectDocument = async (documentId: string, reason: string) => {
    try {
      // Primeiro, buscar informações do upload para notificação
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description
          )
        `)
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar dados do upload:', fetchError);
        throw new Error('Failed to fetch upload data: ' + fetchError.message);
      }

      // Atualizar o status para rejeitado
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ 
          status: 'rejected',
          review_notes: reason || null
        })
        .eq('id', documentId);
      
      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw new Error('Failed to reject document: ' + error.message);
      }

      // Atualizar o estado local dos documentos do aluno
      setStudentDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, status: 'rejected' } : doc
      ));

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application?.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Changes Requested",
            email_aluno: userData.email,
            nome_aluno: application?.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          // Notificação in-app no sino do aluno — deve ser enviada SEMPRE, independente do e-mail
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          if (accessToken) {
            const notificationPayload = {
              user_id: application?.user_profiles.user_id,
              title: 'Document rejected',
              message: `Your document ${uploadData.file_url?.split('/').pop()} was rejected. Reason: ${reason}`,
              type: 'document_rejected',
              link: '/student/dashboard/applications',
            };
            
            const response = await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            
            let responseData;
            try {
              responseData = await response.json();
            } catch (parseError) {
              console.error('Erro ao fazer parse da resposta:', parseError);
              const responseText = await response.text();
              console.error('Resposta da Edge Function (texto):', responseText);
            }
            
            if (!response.ok) {
              console.error('Erro na Edge Function:', responseData);
            } else {
              console.log('✅ Notificação de rejeição enviada com sucesso:', responseData);
            }
          }
        } catch (e) {
          console.error('Error sending in-app student notification:', e);
        }
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }

      // Recarregar documentos do estudante
      fetchStudentDocuments();
      
    } catch (err: any) {
      console.error("Error rejecting document:", err);
      alert(`Failed to reject document: ${err.message}`);
    }
  };

  // Função para upload do Transfer Form pela universidade
  const handleUploadTransferForm = async (file: File) => {
    if (!application || !file) return;

    setUploadingTransferForm(true);
    try {
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
      
      alert('Transfer form template uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading transfer form:', error);
      alert(`Failed to upload transfer form: ${error.message}`);
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
      
      alert('Transfer form approved successfully!');
    } catch (error: any) {
      console.error('Error approving transfer form:', error);
      alert(`Failed to approve transfer form: ${error.message}`);
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
      
      alert('Transfer form rejected successfully!');
    } catch (error: any) {
      console.error('Error rejecting transfer form:', error);
      alert(`Failed to reject transfer form: ${error.message}`);
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
              alert('File size must be less than 10MB');
              return;
            }
            
            // Validar tipo de arquivo
            const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!allowedTypes.includes(fileExtension)) {
              alert('Please select a valid file type: PDF, DOC, DOCX, JPG, JPEG, or PNG');
              return;
            }
            
            setAcceptanceLetterFile(file);
            setAcceptanceLetterUploaded(false);
            
            // Limpar o input para permitir selecionar o mesmo arquivo novamente
            event.target.value = '';
          }
        } catch (error) {
          console.error('Error processing file selection:', error);
          alert('Error processing file. Please try again.');
        } finally {
          setIsFileSelecting(false);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error selecting file:', error);
      alert('Error selecting file. Please try again.');
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
      alert('Please select a file first.');
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
            p_performed_by_type: 'university',
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
      alert(`Failed to process acceptance letter: ${error.message}`);
    } finally {
      setUploadingAcceptanceLetter(false);
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
      alert(`Failed to create document request: ${err.message}`);
    } finally {
      setCreatingDocumentRequest(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto">   
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
                Admitted Enrollment
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Review and manage {application?.user_profiles?.full_name || 'Student'}'s admitted enrollment details
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
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Conteúdo das abas */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
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
                          {application.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                           application.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                           application.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                           application.student_process_type || 'Not specified'}
                        </dd>
                      </div>
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
                        <dt className="text-sm font-medium text-slate-600">Course / Field of Study</dt>
                        <dd className="text-lg font-semibold text-slate-900 mb-4">{application.scholarships.field_of_study || '-'}</dd>
                        
                        <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                        <dd className="text-lg font-semibold text-slate-900">{application.scholarships.title}</dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Annual Value</dt>
                        <dd className="text-2xl font-bold text-[#05294E]">
                          ${Number(application.scholarships.annual_value_with_scholarship ?? 0).toLocaleString()}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Description</dt>
                        <dd className="text-base text-slate-700 leading-relaxed">{application.scholarships.description}</dd>
                      </div>
                    </div>
                    {application.scholarships.min_gpa && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <dt className="text-sm font-medium text-slate-600">Minimum GPA</dt>
                          <dd className="text-base font-semibold text-slate-900">{application.scholarships.min_gpa}</dd>
                        </div>
                      </div>
                    )}
                    {application.scholarships.min_english_proficiency && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <dt className="text-sm font-medium text-slate-600">Minimum English Proficiency</dt>
                          <dd className="text-base font-semibold text-slate-900">{application.scholarships.min_english_proficiency.toUpperCase()}</dd>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Exemplo de exibição condicional do botão do I-20 Control Fee */}
              {application.acceptance_letter_status === 'approved' && (
                <div className="mt-6">
                  {/* Aqui vai o botão do I-20 Control Fee, se já não estiver em outro lugar */}
                  {/* <ButtonI20ControlFee ... /> */}
                </div>
              )}

              {/* Student Documents Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-8 py-5">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Document Review & Approval
                  </h2>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    {DOCUMENTS_INFO.map((doc, index) => {
                      const d = latestDocByType(doc.key);
                      const status = d?.status || 'not_submitted';
                      
                      return (
                        <div key={doc.key}>
                          <div className="bg-white py-4">
                            <div className="flex items-start space-x-4">
                              <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-1">
                                  <p className="text-base font-semibold text-slate-900">{doc.label}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    status === 'approved' ? 'bg-green-100 text-green-800' :
                                    status === 'changes_requested' ? 'bg-red-100 text-red-800' :
                                    status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {status === 'approved' ? 'Approved' :
                                     status === 'changes_requested' ? 'Changes Requested' :
                                     status === 'under_review' ? 'Under Review' :
                                     d?.file_url ? 'Submitted' : 'Not Submitted'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">{doc.description}</p>
                                {d?.file_url && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Uploaded: {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : new Date().toLocaleDateString()}
                                  </p>
                                )}
                                
                                {/* Botões posicionados abaixo das informações */}
                                <div className="flex items-center space-x-2 mt-3">
                                  {/* Botões de ação para documentos Under Review */}
                                  {d?.file_url && status !== 'approved' && status !== 'rejected' && application.status !== 'enrolled' && application.acceptance_letter_status !== 'approved' && (
                                    <div className="flex items-center space-x-2 mr-3">
                                      <button
                                        onClick={() => d && approveDoc(d.type)}
                                        disabled={updating === d.type}
                                        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (d) {
                                            setPendingRejectType(d.type);
                                            setShowReasonModal(true);
                                          }
                                        }}
                                        disabled={updating === d.type}
                                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Botões de visualização e download - só mostrar se houver documento */}
                                  {d?.file_url && (
                                    <>
                                      <button 
                                        onClick={() => handleViewDocument(d)}
                                        className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                      >
                                        View Document
                                      </button>
                                      <button 
                                        onClick={() => handleDownloadDocument(d)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                      >
                                        Download
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < DOCUMENTS_INFO.length - 1 && (
                            <div className="border-t border-slate-200"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Application Decision Section - Integrated into bottom right */}
                  {(application.status !== 'enrolled' && application.status !== 'approved' && application.acceptance_letter_status !== 'approved') && (
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-4">
                      <button
                        onClick={() => setShowRejectStudentModal(true)}
                        className="px-6 py-2.5 text-red-600 hover:bg-red-50 text-sm font-bold rounded-xl transition-all"
                      >
                        Reject Application
                      </button>
                      <button
                        onClick={handleApproveApplication}
                        disabled={approvingApplication}
                        className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-100 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      >
                        {approvingApplication ? (
                          <div className="flex items-center">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Approving...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve Application
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>


            </div>

            {/* Sidebar */}
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
                  onStartEditFees={() => {}}
                  onSaveEditFees={async () => {}}
                  onCancelEditFees={() => {}}
                  onResetFees={async () => {}}
                  onEditFeesChange={() => {}}
                  onMarkAsPaid={() => {}}
                  onEditPaymentMethod={() => {}}
                  onUpdatePaymentMethod={async () => {}}
                  onCancelPaymentMethod={() => {}}
                  onPaymentMethodChange={() => {}}
                  formatFeeAmount={formatFeeAmount}
                  getFeeAmount={getFeeAmount}
                  hideSelectionFee={true}
                />
              )}
              
              {/* Sidebar Content is now focused on Progress and Payments */}


            </div>
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

        {activeTab === 'documents' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-6 text-white h-6 mr-3" />
                    <div>
                      <h2 className="text-xl font-semibold text-white">Document Management</h2>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
              {/* New Request Button */}
              <div className="flex justify-end mb-6">
                <button 
                  onClick={() => setShowNewRequestModal(true)}
                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 flex items-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Request</span>
                </button>
              </div>

              {/* University Document Requests */}
              <div className="mb-6">
                {documentRequests.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-600 font-medium">No document requests yet</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first request using the button above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentRequests.map((request) => (
                      <div key={request.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                         <div className="flex items-start justify-between">
                           <div className="flex items-start space-x-3 flex-1">
                             <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
                             <div className="flex-1">
                               <div className="flex items-center space-x-2 mb-1">
                                 <h6 className="font-semibold text-slate-900">{request.title}</h6>
                                 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                   request.is_global 
                                     ? 'bg-blue-100 text-blue-800' 
                                     : 'bg-purple-100 text-purple-800'
                                 }`}>
                                   {request.is_global ? 'Global Request' : 'Individual Request'}
                                 </span>
                               </div>
                               <p className="text-sm text-slate-600">{request.description}</p>
                                {request.due_date && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Due: {new Date(request.due_date).toLocaleDateString()}
                                  </p>
                                )}
                            
                            {/* Student Upload Status */}
                            {request.uploads && request.uploads.length > 0 ? (
                              <div className="mt-3">
                                <div className="flex items-start space-x-3">
                                  <span className="text-sm text-slate-600">Student response:</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    request.uploads[0].status === 'approved' ? 'bg-green-100 text-green-800' :
                                    request.uploads[0].status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {request.uploads[0].status === 'approved' ? 'Approved' :
                                     request.uploads[0].status === 'rejected' ? 'Rejected' :
                                     'Under Review'}
                                  </span>
                                  <button 
                                    onClick={() => handleViewUpload(request.uploads[0])}
                                    className="text-[#05294E] hover:text-[#041f38] text-sm font-medium hover:underline"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="ml-13 mt-3">
                                <span className="text-sm text-slate-500 italic">No response from student yet</span>
                              </div>
                            )}
                          </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              request.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'closed' ? 'bg-slate-100 text-slate-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {request.status === 'open' ? 'Open' :
                               request.status === 'closed' ? 'Closed' :
                               request.status}
                            </span>
                            
                            {request.attachment_url && (
                              <button 
                                onClick={() => handleDownloadTemplate(request.attachment_url)}
                                className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                Template
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Student Uploads Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 rounded-t-3xl flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Student Responses to Document Requests
                  </h4>
                  <button
                    onClick={() => {
                      console.log('Refresh manual dos documentos');
                      fetchStudentDocuments();
                    }}
                    className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center bg-white border border-slate-200 shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
                
                <div className="p-6">
                    {studentDocuments.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-3xl">
                        <p className="text-slate-500">No responses from student yet</p>
                        <p className="text-sm text-slate-400 mt-1">Documents will appear here once the student responds to your document requests</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentDocuments.map((doc) => {
                          return (
                            <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4 flex-1">
                                  <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900">{doc.filename || 'Document'}</p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        doc.is_global ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                      }`}>
                                        {doc.request_type || 'Individual Request'}
                                      </span>
                                      <span className="text-sm text-slate-500">
                                        Response to: <span className="font-medium text-slate-700">{doc.request_title || 'Unknown Request'}</span>
                                      </span>
                                    </div>
                                    {doc.request_description && (
                                      <p className="text-xs text-slate-400 mt-1">{doc.request_description}</p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-1">
                                      Uploaded: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Unknown date'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 ml-4">
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    (doc.status === 'approved' || doc.status === 'sent') ? 'bg-green-100 text-green-800' :
                                    doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {(doc.status === 'approved' || doc.status === 'sent') ? 'Approved' :
                                     doc.status === 'rejected' ? 'Rejected' :
                                     'Under Review'}
                                  </span>
                                  
                                  {/* Botões de ação para documentos Under Review */}
                                  {doc.status === 'under_review' && application.status !== 'enrolled' && application.acceptance_letter_status !== 'approved' && (
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleApproveDocument(doc.id)}
                                        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          setPendingRejectDocumentId(doc.id);
                                          setShowRejectDocumentModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  
                                  <button 
                                    onClick={() => handleDownloadDocument(doc)}
                                    className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    Download
                                  </button>
                                  <button 
                                    onClick={() => handleViewDocument(doc)}
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
                    )}
                  </div>
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
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="bg-white rounded-3xl p-6 mb-6">
                    <p className="text-slate-700 mb-6 leading-relaxed">
                      Please upload the student's acceptance letter and any other required documents, such as the I-20 Control Fee receipt.
                    </p>
                    
                    {acceptanceLetterUploaded ? (
                      <div className="text-center py-8 bg-green-50 border-2 border-green-200 rounded-3xl">
                        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h5 className="font-semibold text-green-900 mb-2">Acceptance Letter Uploaded Successfully!</h5>
                        <p className="text-green-700 text-sm">The student has been enrolled and notified.</p>
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
                              <label className={`bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center justify-center min-w-[140px] ${
                                isFileSelecting ? 'opacity-50 cursor-not-allowed' : ''
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden mt-8">
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
                              </div>
                            </div>
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
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectType) {
                    requestChangesDoc(pendingRejectType, rejectReason);
                    setShowReasonModal(false);
                    setRejectReason('');
                    setPendingRejectType(null);
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
                disabled={!rejectDocumentReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Reject Document
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
                <p className="text-slate-500">Provide a reason for this decision</p>
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
                }}
                className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={rejectStudent}
                disabled={!rejectStudentReason.trim() || approvingApplication}
                className="px-8 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetails;