import React, { useState, Suspense, lazy, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useStudentDetails } from '../../hooks/useStudentDetails';
import { useAdminStudentActions } from '../../hooks/useAdminStudentActions';
import { useTransferForm } from '../../hooks/useTransferForm';
import { useDocumentRequests } from '../../hooks/useDocumentRequests';
import { useAdminNotes } from '../../hooks/useAdminNotes';
import { useDocumentRequestHandlers } from '../../hooks/useDocumentRequestHandlers';
import { generateTermAcceptancePDF, StudentTermAcceptanceData } from '../../utils/pdfGenerator';

// Componentes de UI Base
import SkeletonLoader from '../../components/AdminDashboard/StudentDetails/SkeletonLoader';
import StudentDetailsHeader from '../../components/AdminDashboard/StudentDetails/StudentDetailsHeader';
import StudentDetailsTabNavigation, { TabId } from '../../components/AdminDashboard/StudentDetails/StudentDetailsTabNavigation';

// Componentes Overview - Lazy Load
const StudentInformationCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/StudentInformationCard'));
const ReferralInfoCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/ReferralInfoCard'));
const AdminNotesCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/AdminNotesCard'));
const SelectedScholarshipCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/SelectedScholarshipCard'));
const StudentDocumentsCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/StudentDocumentsCard'));

// Componentes Sidebar - Lazy Load
const PaymentStatusCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/PaymentStatusCard'));
const ApplicationProgressCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/ApplicationProgressCard'));
const I20DeadlineTimerCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/I20DeadlineTimerCard'));
const TermAcceptancesCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/TermAcceptancesCard'));

// Modals
import PaymentConfirmationModal from '../../components/AdminDashboard/StudentDetails/PaymentConfirmationModal';
import RejectDocumentModal from '../../components/AdminDashboard/StudentDetails/RejectDocumentModal';

// Novos componentes para Transfer Form e Document Requests
import { TransferFormSection } from '../../components/AdminDashboard/StudentDetails/TransferFormSection';
import { NewRequestModal } from '../../components/AdminDashboard/StudentDetails/NewRequestModal';

// Tabs já existentes
const DocumentsView = lazy(() => import('../../components/EnhancedStudentTracking/DocumentsView'));
const AdminScholarshipSelection = lazy(() => import('../../components/AdminDashboard/AdminScholarshipSelection'));
const StudentLogsView = lazy(() => import('../../components/AdminDashboard/StudentLogsView'));

// Tab Loading Skeleton
const TabLoadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4">
            <div className="h-5 w-64 bg-slate-200 rounded mb-3"></div>
            <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
            <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AdminStudentDetails: React.FC = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Custom Hooks
  const { student, setStudent, loading } = useStudentDetails(profileId);
  const { saving, saveProfile, markFeeAsPaid, approveDocument, rejectDocument } = useAdminStudentActions();
  const { getFeeAmount, formatFeeAmount, hasOverride, userSystemType, userFeeOverrides } = useFeeConfig(student?.user_id);
  
  // Estados locais - Definir antes dos hooks personalizados que dependem deles
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const isPlatformAdmin = user?.role === 'admin';
  
  // Hooks para Transfer Form
  const {
    transferFormFile,
    setTransferFormFile,
    uploadingTransferForm,
    transferFormUploads,
    getTransferApplication,
    handleUploadTransferForm,
    handleApproveTransferFormUpload,
    handleRejectTransferFormUpload
  } = useTransferForm(student, isPlatformAdmin, user?.id);
  
  // Hooks para Document Requests
  const {
    showNewRequestModal,
    creatingDocumentRequest,
    newDocumentRequest,
    openNewRequestModal,
    closeNewRequestModal,
    updateNewDocumentRequest,
    handleCreateDocumentRequest
  } = useDocumentRequests(student, user?.id, setDocumentRequests);
  
  // Hooks para Admin Notes
  const {
    adminNotes,
    isAddingNote,
    setIsAddingNote,
    newNoteContent,
    setNewNoteContent,
    editingNoteId,
    setEditingNoteId,
    editingNoteContent,
    setEditingNoteContent,
    savingNotes,
    handleAddNote,
    handleEditNote,
    handleSaveEditNote,
    handleDeleteNote
  } = useAdminNotes(student, user?.id);
  
  // Hooks para Document Request Handlers
  const {
    uploadingDocumentRequest,
    approvingDocumentRequest,
    rejectingDocumentRequest,
    deletingDocumentRequest,
    handleUploadDocumentRequest,
    handleApproveDocumentRequest,
    handleRejectDocumentRequest,
    handleDownloadDocument,
    handleEditTemplate,
    handleDeleteDocumentRequest
  } = useDocumentRequestHandlers(student, user?.id, setDocumentRequests);

  // Outros estados locais
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [dependents, setDependents] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [i20Deadline, setI20Deadline] = useState<string | null>(null);
  const [i20Countdown, setI20Countdown] = useState<string>('');
  
  // Estados de documentos
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [approvingDocs, setApprovingDocs] = useState<Record<string, boolean>>({});
  const [rejectingDocs] = useState<Record<string, boolean>>({});
  
  // Estados de modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRejectDocModal, setShowRejectDocModal] = useState(false);
  const [rejectDocData, setRejectDocData] = useState<{applicationId: string; docType: string} | null>(null);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('manual');
  const [paymentAmount, setPaymentAmount] = useState(0);
  
  // Estados de dados secundários
  const [termAcceptances, setTermAcceptances] = useState<any[]>([]);
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [realPaidAmounts, setRealPaidAmounts] = useState<Record<string, number>>({});
  const [hasMatriculaRewardsDiscount, setHasMatriculaRewardsDiscount] = useState(false);
  
  // Estados de edição
  const [isEditingProcessType, setIsEditingProcessType] = useState(false);
  const [editingProcessType, setEditingProcessType] = useState('');
  const [savingProcessType, setSavingProcessType] = useState(false);
  const [editingFees, setEditingFees] = useState<any>(null);
  const [savingFees, setSavingFees] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<string | null>(null);
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);

  // Permissões (isPlatformAdmin já definido acima)
  const canEditProfile = isPlatformAdmin;
  const canUniversityManage = isPlatformAdmin;

  // Sincronizar dependents quando student carrega
  React.useEffect(() => {
    if (student?.dependents) {
      setDependents(Number(student.dependents));
    }
  }, [student?.dependents]);

  // Calcular I-20 deadline
  React.useEffect(() => {
    if (!student) return;

    // Se o I-20 já foi pago, não há deadline
    if (student.has_paid_i20_control_fee) {
      setI20Deadline(null);
      setI20Countdown('');
      return;
    }

    // Buscar aplicação com acceptance letter
    const appWithLetter = student.all_applications?.find((app: any) => 
      app.acceptance_letter_sent_at && 
      (app.acceptance_letter_status === 'sent' || app.acceptance_letter_status === 'approved')
    );

    if (appWithLetter) {
      // Calcular deadline baseado na data de envio da carta de aceite + 10 dias
      const acceptanceDate = new Date(appWithLetter.acceptance_letter_sent_at);
      const deadline = new Date(acceptanceDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 dias
      setI20Deadline(deadline.toISOString());
      
      // Calcular countdown
      const updateCountdown = () => {
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        
        if (diff <= 0) {
          setI20Countdown('Expired');
          return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        setI20Countdown(`${days}d ${hours}h ${minutes}m`);
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Atualizar a cada minuto
      
      return () => clearInterval(interval);
    } else {
      setI20Deadline(null);
      setI20Countdown('');
    }
  }, [student]);

  // Verificar se tem desconto do Matricula Rewards
  React.useEffect(() => {
    if (!student?.user_id) {
      setHasMatriculaRewardsDiscount(false);
      return;
    }

    const checkMatriculaRewardsDiscount = async () => {
      try {
        // Verificar se há código MATR em used_referral_codes
        const { data: usedCodes } = await supabase
          .from('used_referral_codes')
          .select('affiliate_code')
          .eq('user_id', student.user_id)
          .limit(10);

        if (usedCodes && usedCodes.length > 0) {
          // Verificar se algum código começa com MATR
          const hasMatrCode = usedCodes.some((code: any) => 
            code.affiliate_code && /^MATR/i.test(code.affiliate_code)
          );
          
          if (hasMatrCode) {
            setHasMatriculaRewardsDiscount(true);
            return;
          }
        }

        // Verificar também em affiliate_referrals (usa referred_id, não user_id)
        const { data: affiliateRefs } = await supabase
          .from('affiliate_referrals')
          .select('affiliate_code, payment_amount')
          .eq('referred_id', student.user_id)
          .limit(10);

        if (affiliateRefs && affiliateRefs.length > 0) {
          const hasMatrDiscount = affiliateRefs.some((ref: any) => 
            ref.affiliate_code && /^MATR/i.test(ref.affiliate_code)
          );
          
          if (hasMatrDiscount) {
            setHasMatriculaRewardsDiscount(true);
            return;
          }
        }

        // Verificar também seller_referral_code (fallback)
        if (student.seller_referral_code && /^MATR/i.test(student.seller_referral_code)) {
          setHasMatriculaRewardsDiscount(true);
          return;
        }

        setHasMatriculaRewardsDiscount(false);
      } catch (error) {
        console.error('Error checking Matricula Rewards discount:', error);
        setHasMatriculaRewardsDiscount(false);
      }
    };

    checkMatriculaRewardsDiscount();
  }, [student?.user_id, student?.seller_referral_code]);

  // Carregar dados secundários
  React.useEffect(() => {
    if (!student?.user_id) return;

    const loadSecondaryData = async () => {
      try {
        // Tentar usar RPC consolidado
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_admin_student_secondary_data',
          { target_user_id: student.user_id }
        );

        if (!rpcError && rpcData) {
          const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
          
          // Atualizar estados com dados da RPC
          if (parsed.term_acceptances) {
            // Garantir que os dados estão no formato correto
            const mappedAcceptances = parsed.term_acceptances.map((acc: any) => ({
              ...acc,
              user_email: acc.user_email || student?.student_email,
              user_full_name: acc.user_full_name || student?.student_name,
              term_title: acc.term_title || 'Term',
              term_content: acc.term_content || ''
            }));
            setTermAcceptances(mappedAcceptances);
          }
          if (parsed.referral_info) {
            setReferralInfo(parsed.referral_info);
          }
          if (parsed.individual_fee_payments) {
            const payments = parsed.individual_fee_payments;
            const amounts: Record<string, number> = {};
            payments.forEach((p: any) => {
              amounts[p.fee_type] = p.amount_paid;
            });
            setRealPaidAmounts(amounts);
          }
        } else {
          // Fallback: carregar manualmente
          await loadSecondaryDataFallback();
        }
      } catch (error) {
        console.error('Error loading secondary data:', error);
        await loadSecondaryDataFallback();
      }
    };

    const loadSecondaryDataFallback = async () => {
      // Carregar referral info
      if (student.seller_referral_code) {
        await fetchReferralInfo(student.seller_referral_code);
      }

      // Carregar real paid amounts
      const { data: payments } = await supabase
        .from('individual_fee_payments')
        .select('fee_type, amount_paid')
        .eq('user_id', student.user_id);

      if (payments) {
        const amounts: Record<string, number> = {};
        payments.forEach((p) => {
          amounts[p.fee_type] = p.amount_paid;
        });
        setRealPaidAmounts(amounts);
      }

      // Carregar term acceptances com joins para obter dados completos
      const { data: acceptances } = await supabase
        .from('comprehensive_term_acceptance')
        .select(`
          *,
          user_profiles!comprehensive_term_acceptance_user_id_fkey (
            email,
            full_name
          ),
          application_terms!comprehensive_term_acceptance_term_id_fkey (
            title,
            content
          )
        `)
        .eq('user_id', student.user_id)
        .order('accepted_at', { ascending: false });

      if (acceptances) {
        // Mapear os dados para o formato esperado
        const mappedAcceptances = acceptances.map((acc: any) => ({
          ...acc,
          user_email: acc.user_profiles?.email || student.student_email,
          user_full_name: acc.user_profiles?.full_name || student.student_name,
          term_title: acc.application_terms?.title || 'Term',
          term_content: acc.application_terms?.content || ''
        }));
        setTermAcceptances(mappedAcceptances);
      }
    };

    loadSecondaryData();
  }, [student?.user_id, student?.seller_referral_code]);

  // Admin notes agora são gerenciados pelo hook useAdminNotes

  // Carregar document requests - usa scholarship_application_id, não user_id
  React.useEffect(() => {
    if (!student?.all_applications || student.all_applications.length === 0) {
      setDocumentRequests([]);
      return;
    }

    const loadDocumentRequests = async () => {
      try {
        if (!student?.all_applications || student.all_applications.length === 0) {
          setDocumentRequests([]);
          return;
        }

        const applicationIds = student.all_applications.map((app: any) => app.id).filter(Boolean);
        
        if (applicationIds.length === 0) {
          setDocumentRequests([]);
          return;
        }

        // Buscar requests específicos para as aplicações
        const { data: specificRequests, error: specificError } = await supabase
          .from('document_requests')
          .select('*')
          .in('scholarship_application_id', applicationIds)
          .order('created_at', { ascending: false });

        if (specificError) {
          console.error('Error fetching specific document requests:', specificError);
        }

        // Buscar requests globais das universidades
        const universityIds = (student.all_applications || [])
          .map((app: any) => app.scholarships?.university_id || app.university_id)
          .filter(Boolean);
        const uniqueUniversityIds = [...new Set(universityIds)];

        let globalRequests: any[] = [];
        if (uniqueUniversityIds.length > 0) {
          const { data: globalData, error: globalError } = await supabase
            .from('document_requests')
            .select('*')
            .eq('is_global', true)
            .in('university_id', uniqueUniversityIds)
            .order('created_at', { ascending: false });

          if (globalError) {
            console.error('Error fetching global document requests:', globalError);
          } else {
            globalRequests = globalData || [];
          }
        }

        // Combinar requests específicos e globais
        const allRequests = [...(specificRequests || []), ...globalRequests];
        setDocumentRequests(allRequests);
      } catch (error) {
        console.error('Error loading document requests:', error);
        setDocumentRequests([]);
      }
    };

    loadDocumentRequests();
  }, [student?.all_applications]);

  // Função para buscar informações de referência
  const fetchReferralInfo = async (referralCode: string) => {
    if (!referralCode) {
      setReferralInfo(null);
      return;
    }

    try {
      // Matricula Rewards: códigos iniciados com MATR
      if (/^MATR/i.test(referralCode)) {
        const { data: codeOwner } = await supabase
          .from('affiliate_codes')
          .select('user_id')
          .eq('code', referralCode)
          .maybeSingle();

        let ownerName: string | null = null;
        let ownerEmail: string | null = null;
        if (codeOwner?.user_id) {
          const { data: ownerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', codeOwner.user_id)
            .maybeSingle();
          ownerName = (ownerProfile as any)?.full_name || null;
          ownerEmail = (ownerProfile as any)?.email || null;
        }

        setReferralInfo({
          type: 'student',
          name: ownerName,
          email: ownerEmail,
          isRewards: true
        });
        return;
      }

      // Buscar em sellers
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('name, email, affiliate_admin_id')
        .eq('referral_code', referralCode)
        .single();

      if (sellerData) {
        let affiliateName: string | null = null;
        let affiliateEmail: string | null = null;
        
        // Mapear affiliate_admin_id -> user_id via affiliate_admins
        const { data: affiliateAdmin } = await supabase
          .from('affiliate_admins')
          .select('user_id')
          .eq('id', (sellerData as any).affiliate_admin_id)
          .maybeSingle();

        const affiliateUserId = (affiliateAdmin as any)?.user_id || null;

        if (affiliateUserId) {
          const { data: affiliateProfile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', affiliateUserId)
            .maybeSingle();
          
          if (affiliateProfile) {
            affiliateName = (affiliateProfile as any)?.full_name || null;
            affiliateEmail = (affiliateProfile as any)?.email || null;
          }
        }

        setReferralInfo({
          type: 'seller',
          name: (sellerData as any)?.name || null,
          email: (sellerData as any)?.email || null,
          affiliateName,
          affiliateEmail
        });
        return;
      }

      // Buscar em affiliate_admins
      const { data: affiliateAdmin } = await supabase
        .from('affiliate_admins')
        .select('user_id, company_name')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (affiliateAdmin) {
        const { data: affiliateProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', (affiliateAdmin as any).user_id)
          .maybeSingle();

        setReferralInfo({
          type: 'affiliate',
          name: (affiliateProfile as any)?.full_name || null,
          email: (affiliateProfile as any)?.email || null,
          company: (affiliateAdmin as any)?.company_name || null
        });
        return;
      }

      // Não encontrado
      setReferralInfo(null);
    } catch (error) {
      console.error('Error fetching referral info:', error);
      setReferralInfo(null);
    }
  };

  // Handlers
  const handleOpenChat = useCallback(() => {
    if (student) {
      navigate(`/admin/chat/${student.user_id}`);
    }
  }, [student, navigate]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleSaveProfile = useCallback(async () => {
    if (!student) return;
    
    const result = await saveProfile(student.student_id, {
      full_name: student.student_name,
      email: student.student_email,
      phone: student.phone,
      country: student.country,
      field_of_interest: student.field_of_interest,
      academic_level: student.academic_level,
      gpa: student.gpa,
      english_proficiency: student.english_proficiency,
      dependents: dependents,
      desired_scholarship_range: student.desired_scholarship_range,
    });

    if (result.success) {
      setIsEditing(false);
      alert('Profile saved successfully!');
    } else {
      alert('Error saving profile: ' + result.error);
    }
  }, [student, dependents, saveProfile]);

  const handleMarkAsPaid = useCallback((feeType: string) => {
    setPendingPayment({ fee_type: feeType });
    setPaymentAmount(getFeeAmount(feeType));
    setShowPaymentModal(true);
  }, [getFeeAmount]);

  const handleConfirmPayment = useCallback(async () => {
    if (!student || !pendingPayment) return;

    const result = await markFeeAsPaid(
      student.user_id,
      pendingPayment.fee_type,
      paymentAmount,
      paymentMethod
    );

    if (result.success) {
      setShowPaymentModal(false);
      setPendingPayment(null);
      alert('Payment recorded successfully!');
      window.location.reload();
    } else {
      alert('Error recording payment: ' + result.error);
    }
  }, [student, pendingPayment, paymentAmount, paymentMethod, markFeeAsPaid]);

  const handleApproveDocument = useCallback(async (appId: string, docType: string) => {
    setApprovingDocs(prev => ({ ...prev, [`${appId}:${docType}`]: true }));
    
    const result = await approveDocument(appId, docType);
    
    setApprovingDocs(prev => ({ ...prev, [`${appId}:${docType}`]: false }));
    
    if (result.success) {
      alert('Document approved!');
      window.location.reload();
    } else {
      alert('Error: ' + result.error);
    }
  }, [approveDocument]);

  const handleRejectDocument = useCallback((appId: string, docType: string) => {
    setRejectDocData({ applicationId: appId, docType });
    setShowRejectDocModal(true);
  }, []);

  const handleConfirmReject = useCallback(async (reason: string) => {
    if (!rejectDocData) return;

    const result = await rejectDocument(
      rejectDocData.applicationId,
      rejectDocData.docType,
      reason
    );

    if (result.success) {
      alert('Document rejected!');
      window.location.reload();
    } else {
      alert('Error: ' + result.error);
    }
  }, [rejectDocData, rejectDocument]);

  const handleViewDocument = useCallback((doc: { file_url: string; filename: string }) => {
    window.open(doc.file_url, '_blank');
  }, []);

  const handleUploadDocument = useCallback(async (appId: string, docType: string, _file: File) => {
    setUploadingDocs(prev => ({ ...prev, [`${appId}:${docType}`]: true }));
    // Implementation would go here
    setUploadingDocs(prev => ({ ...prev, [`${appId}:${docType}`]: false }));
  }, []);

  // Admin Notes handlers
  // Funções de Admin Notes agora vêm do useAdminNotes hook

  // Funções de Document Request Handlers agora vêm do useDocumentRequestHandlers hook

  // Application Progress Functions
  const allSteps = [
    { key: 'selection_fee', label: 'Selection Fee' },
    { key: 'apply', label: 'Application' },
    { key: 'review', label: 'Review' },
    { key: 'application_fee', label: 'App Fee' },
    { key: 'scholarship_fee', label: 'Scholarship Fee' },
    { key: 'i20_fee', label: 'I-20 Fee' },
    { key: 'acceptance_letter', label: 'Acceptance' },
    { key: 'transfer_form', label: 'Transfer Form' },
    { key: 'enrollment', label: 'Enrollment' }
  ];

  const steps = allSteps.filter(step => {
    if (step.key === 'transfer_form') {
      return student?.student_process_type === 'transfer';
    }
    return true;
  });

  const getStepStatus = useCallback((step: { key: string; label: string }) => {
    if (!student) return 'pending';
    
    switch (step.key) {
      case 'selection_fee':
        return student.has_paid_selection_process_fee ? 'completed' : 'pending';
      case 'apply':
        return student.total_applications > 0 ? 'completed' : 'pending';
      case 'review':
        if (student.application_status === 'enrolled' || student.application_status === 'approved') return 'completed';
        if (student.application_status === 'rejected') return 'rejected';
        if (student.application_status === 'under_review') return 'in_progress';
        return 'pending';
      case 'application_fee':
        return student.is_application_fee_paid ? 'completed' : 'pending';
      case 'scholarship_fee':
        return student.is_scholarship_fee_paid ? 'completed' : 'pending';
      case 'i20_fee':
        return student.has_paid_i20_control_fee ? 'completed' : 'pending';
      case 'acceptance_letter':
        if (student.acceptance_letter_status === 'approved' || student.acceptance_letter_status === 'sent') return 'completed';
        return 'pending';
      case 'transfer_form':
        if (student.student_process_type !== 'transfer') return 'skipped';
        const transferApp = student.all_applications?.find((app: any) => 
          app.student_process_type === 'transfer' && 
          (app.transfer_form_status === 'approved' || app.transfer_form_status === 'sent')
        );
        return transferApp ? 'completed' : 'pending';
      case 'enrollment':
        return student.application_status === 'enrolled' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  }, [student]);

  const getCurrentStep = useCallback(() => {
    if (!student) return null;
    
    for (let i = 0; i < steps.length; i++) {
      const status = getStepStatus(steps[i]);
      if (status === 'in_progress' || status === 'pending') {
        return { step: steps[i], index: i, status };
      }
    }
    
    // Se todos estão completos, retorna o último
    return { step: steps[steps.length - 1], index: steps.length - 1, status: 'completed' };
  }, [student, steps, getStepStatus]);

  // Handler para download de PDF de termos
  const handleDownloadTermPDF = useCallback(async (acceptance: any) => {
    try {
      // Preparar dados para o PDF
      const pdfData: StudentTermAcceptanceData = {
        student_name: acceptance.user_full_name || student?.student_name || 'N/A',
        student_email: acceptance.user_email || student?.student_email || 'N/A',
        term_title: acceptance.term_title || 'N/A',
        accepted_at: new Date(acceptance.accepted_at).toLocaleString('en-US'),
        ip_address: acceptance.ip_address || 'N/A',
        user_agent: acceptance.user_agent || 'N/A',
        country: student?.country || 'N/A',
        affiliate_code: student?.seller_referral_code || undefined,
        term_content: acceptance.term_content || ''
      };
      
      // Gerar e baixar o PDF
      generateTermAcceptancePDF(pdfData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  }, [student]);

  // Handler para salvar edição de fees
  const handleSaveEditFees = useCallback(async () => {
    if (!editingFees || !student) return;

    try {
      setSavingFees(true);

      // Criar tabela se não existir
      const { error: createTableError } = await supabase.rpc('create_user_fee_overrides_table_if_not_exists');
      
      if (createTableError) {
        console.warn('Erro ao criar tabela, tentando continuar:', createTableError);
      }

      // Salvar ou atualizar override
      const { error } = await supabase
        .from('user_fee_overrides')
        .upsert({
          user_id: student.user_id,
          selection_process_fee: editingFees.selection_process,
          scholarship_fee: editingFees.scholarship,
          i20_control_fee: editingFees.i20_control,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setEditingFees(null);
      // Recarregar dados do estudante para refletir as mudanças
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving fee overrides:', error);
      alert('Erro ao salvar as taxas personalizadas: ' + error.message);
    } finally {
      setSavingFees(false);
    }
  }, [editingFees, student]);

  // Handler para resetar fees para padrão
  const handleResetFees = useCallback(async () => {
    if (!student) return;

    try {
      setSavingFees(true);

      // Remover override do banco
      const { error } = await supabase
        .from('user_fee_overrides')
        .delete()
        .eq('user_id', student.user_id);

      if (error) throw error;

      setEditingFees(null);
      // Recarregar dados do estudante para refletir as mudanças
      window.location.reload();
    } catch (error: any) {
      console.error('Error resetting fees:', error);
      alert('Erro ao resetar as taxas: ' + error.message);
    } finally {
      setSavingFees(false);
    }
  }, [student]);

  // Handler para iniciar edição de fees
  const handleStartEditFees = useCallback(() => {
    if (!student) return;
    
    // Calcular o valor exato que seria exibido para Selection Process Fee
    let selectionProcessValue: number;
    const hasCustomOverride = hasOverride('selection_process');
    
    if (hasCustomOverride && userFeeOverrides?.selection_process_fee !== undefined) {
      // Se tem override, usar o valor do override diretamente
      selectionProcessValue = userFeeOverrides.selection_process_fee;
    } else {
      // Calcular baseado no system_type, Matricula Rewards e dependents
      const hasMatrFromSellerCode = student?.seller_referral_code && /^MATR/i.test(student.seller_referral_code);
      const hasMatrDiscount = hasMatriculaRewardsDiscount || hasMatrFromSellerCode;
      
      let base: number;
      if (hasMatrDiscount) {
        base = 350; // $400 - $50 desconto
      } else {
        const systemType = userSystemType || 'legacy';
        base = systemType === 'simplified' ? 350 : 400;
      }
      selectionProcessValue = base + dependents * 150;
    }
    
    // Para scholarship e i20_control, usar getFeeAmount que já considera overrides
    setEditingFees({
      selection_process: selectionProcessValue,
      scholarship: getFeeAmount('scholarship_fee'),
      i20_control: getFeeAmount('i20_control_fee')
    });
  }, [student, getFeeAmount, hasOverride, userFeeOverrides, userSystemType, hasMatriculaRewardsDiscount, dependents]);

  // Handler para cancelar edição de fees
  const handleCancelEditFees = useCallback(() => {
    setEditingFees(null);
  }, []);

  // Função utilitária para sanitizar nome de arquivo
  // Funções de Transfer Form e Document Requests agora vêm dos hooks personalizados

  // Handler para atualizar método de pagamento
  const handleUpdatePaymentMethod = useCallback(async (feeType: string) => {
    if (!student || !isPlatformAdmin) return;
    
    setSavingPaymentMethod(true);
    try {
      const method = paymentMethod as 'stripe' | 'zelle' | 'manual';
      
      if (feeType === 'selection_process') {
        const { error } = await supabase
          .from('user_profiles')
          .update({ selection_process_fee_payment_method: method })
          .eq('id', student.student_id);
        
        if (error) throw error;
      } else if (feeType === 'application') {
        // Buscar aplicação que tem application fee pago
        const paidApp = student.all_applications?.find((app: any) => app.is_application_fee_paid);
        if (paidApp?.id) {
          const { error } = await supabase
            .from('scholarship_applications')
            .update({ application_fee_payment_method: method })
            .eq('id', paidApp.id);
          
          if (error) throw error;
        }
      } else if (feeType === 'scholarship') {
        // Buscar aplicação que tem scholarship fee pago
        const paidApp = student.all_applications?.find((app: any) => app.is_scholarship_fee_paid);
        if (paidApp?.id) {
          const { error } = await supabase
            .from('scholarship_applications')
            .update({ scholarship_fee_payment_method: method })
            .eq('id', paidApp.id);
          
          if (error) throw error;
        }
      } else if (feeType === 'i20_control') {
        const { error } = await supabase
          .from('user_profiles')
          .update({ i20_control_fee_payment_method: method })
          .eq('id', student.student_id);
        
        if (error) throw error;
      }
      
      setEditingPaymentMethod(null);
      alert('Payment method updated successfully!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      alert('Error updating payment method: ' + error.message);
    } finally {
      setSavingPaymentMethod(false);
    }
  }, [student, isPlatformAdmin, paymentMethod]);

  // Loading state
  if (loading || !student) {
    return <SkeletonLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <StudentDetailsHeader
        studentName={student.student_name}
        onOpenChat={handleOpenChat}
        onBack={handleBack}
      />

      {/* Tab Navigation */}
      <StudentDetailsTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <StudentInformationCard
                student={student}
                dependents={dependents}
                isEditing={isEditing}
                savingProfile={saving}
                canEditProfile={canEditProfile}
                isEditingProcessType={isEditingProcessType}
                editingProcessType={editingProcessType}
                savingProcessType={savingProcessType}
                onStudentChange={setStudent}
                onDependentsChange={setDependents}
                onEditToggle={() => setIsEditing(!isEditing)}
                onSaveProfile={handleSaveProfile}
                onCancelEdit={() => setIsEditing(false)}
                onEditProcessType={() => {
                  setIsEditingProcessType(true);
                  setEditingProcessType(student.student_process_type || 'initial');
                }}
                onSaveProcessType={async () => {
                  setSavingProcessType(true);
                  await saveProfile(student.student_id, { student_process_type: editingProcessType });
                  setSavingProcessType(false);
                  setIsEditingProcessType(false);
                }}
                onCancelProcessType={() => setIsEditingProcessType(false)}
                onProcessTypeChange={setEditingProcessType}
              />

              {student.seller_referral_code && (
                <ReferralInfoCard
                  referralCode={student.seller_referral_code}
                  referralInfo={referralInfo}
                  loading={false}
                />
              )}

              {isPlatformAdmin && (
                <AdminNotesCard
                  notes={adminNotes}
                  isAddingNote={isAddingNote}
                  newNoteContent={newNoteContent}
                  editingNoteId={editingNoteId}
                  editingNoteContent={editingNoteContent}
                  savingNotes={savingNotes}
                  onAddNoteToggle={setIsAddingNote}
                  onNewNoteChange={setNewNoteContent}
                  onAddNote={handleAddNote}
                  onEditNote={handleEditNote}
                  onSaveEditNote={handleSaveEditNote}
                  onCancelEditNote={() => setEditingNoteId(null)}
                  onEditNoteContentChange={setEditingNoteContent}
                  onDeleteNote={handleDeleteNote}
                />
              )}

              <SelectedScholarshipCard student={student} />

              <StudentDocumentsCard
                applications={student.all_applications || []}
                expandedApps={expandedApps}
                canPlatformAdmin={isPlatformAdmin}
                canUniversityManage={canUniversityManage}
                uploadingDocs={uploadingDocs}
                approvingDocs={approvingDocs}
                rejectingDocs={rejectingDocs}
                onToggleExpand={(appKey) => setExpandedApps(prev => ({ ...prev, [appKey]: !prev[appKey] }))}
                onViewDocument={handleViewDocument}
                onUploadDocument={handleUploadDocument}
                onApproveDocument={handleApproveDocument}
                onRejectDocument={handleRejectDocument}
              />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Suspense fallback={<div className="animate-pulse bg-slate-100 h-64 rounded-2xl"></div>}>
              <ApplicationProgressCard
                currentStep={getCurrentStep()}
                allSteps={steps}
                isExpanded={isProgressExpanded}
                onToggleExpand={() => setIsProgressExpanded(!isProgressExpanded)}
                getStepStatus={getStepStatus}
              />
            </Suspense>

            <Suspense fallback={<div className="animate-pulse bg-slate-100 h-64 rounded-2xl"></div>}>
              <PaymentStatusCard
                student={student}
                fees={{
                  selection_process: getFeeAmount('selection_process'),
                  application: getFeeAmount('application_fee'),
                  scholarship: getFeeAmount('scholarship_fee'),
                  i20_control: getFeeAmount('i20_control_fee'),
                }}
                realPaidAmounts={realPaidAmounts}
                editingFees={editingFees}
                editingPaymentMethod={editingPaymentMethod}
                newPaymentMethod={paymentMethod}
                savingPaymentMethod={savingPaymentMethod}
                savingFees={savingFees}
                isPlatformAdmin={isPlatformAdmin}
                dependents={dependents}
                hasOverride={hasOverride}
                userSystemType={userSystemType}
                userFeeOverrides={userFeeOverrides}
                hasMatriculaRewardsDiscount={hasMatriculaRewardsDiscount}
                onStartEditFees={handleStartEditFees}
                onSaveEditFees={handleSaveEditFees}
                onCancelEditFees={handleCancelEditFees}
                onResetFees={handleResetFees}
                onEditFeesChange={setEditingFees}
                onMarkAsPaid={handleMarkAsPaid}
                onEditPaymentMethod={setEditingPaymentMethod}
                onUpdatePaymentMethod={handleUpdatePaymentMethod}
                onCancelPaymentMethod={() => setEditingPaymentMethod(null)}
                onPaymentMethodChange={setPaymentMethod}
                formatFeeAmount={formatFeeAmount}
                getFeeAmount={getFeeAmount}
              />
            </Suspense>

            {i20Deadline && !student.has_paid_i20_control_fee && (
              <Suspense fallback={<div className="animate-pulse bg-slate-100 h-32 rounded-2xl"></div>}>
                <I20DeadlineTimerCard
                  deadline={i20Deadline}
                  countdown={i20Countdown}
                  isPaid={student.has_paid_i20_control_fee}
                />
              </Suspense>
            )}

            {termAcceptances.length > 0 && (
              <Suspense fallback={<div className="animate-pulse bg-slate-100 h-64 rounded-2xl"></div>}>
                <TermAcceptancesCard
                  termAcceptances={termAcceptances}
                  loading={false}
                  onDownloadPDF={handleDownloadTermPDF}
                />
              </Suspense>
            )}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Botão para criar novo Document Request (somente Admin) */}
          {isPlatformAdmin && (
            <div className="flex justify-end">
              <button
                onClick={openNewRequestModal}
                className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                New Request
              </button>
            </div>
          )}

          {/* Transfer Form Section - Only for transfer students */}
          {student?.student_process_type === 'transfer' && (
            <TransferFormSection
              student={student}
              isPlatformAdmin={isPlatformAdmin}
              transferFormFile={transferFormFile}
              setTransferFormFile={setTransferFormFile}
              uploadingTransferForm={uploadingTransferForm}
              transferFormUploads={transferFormUploads}
              getTransferApplication={getTransferApplication}
              handleUploadTransferForm={handleUploadTransferForm}
              handleApproveTransferFormUpload={handleApproveTransferFormUpload}
              handleRejectTransferFormUpload={handleRejectTransferFormUpload}
              handleViewDocument={handleViewDocument}
              handleDownloadDocument={handleDownloadDocument}
            />
          )}

          {/* Versão antiga removida - Transfer Form agora usa o componente TransferFormSection */}

          <Suspense fallback={<TabLoadingSkeleton />}>
            <DocumentsView
              studentDocuments={[]}
              documentRequests={documentRequests}
              scholarshipApplication={(() => {
                const apps = student?.all_applications || [];
                const paidApp = apps.find((app: any) => app.is_application_fee_paid);
                return paidApp || apps[0];
              })()}
              studentId={student?.user_id || ''}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
              onUploadDocument={handleUploadDocumentRequest}
              onApproveDocument={handleApproveDocumentRequest}
              onRejectDocument={handleRejectDocumentRequest}
              onEditTemplate={handleEditTemplate}
              onDeleteDocumentRequest={handleDeleteDocumentRequest}
              isAdmin={isPlatformAdmin}
              uploadingStates={uploadingDocumentRequest}
              approvingStates={approvingDocumentRequest}
              rejectingStates={rejectingDocumentRequest}
              deletingStates={deletingDocumentRequest}
            />
          </Suspense>
        </div>
      )}

      {/* Scholarships Tab */}
      {activeTab === 'scholarships' && (
        <Suspense fallback={<TabLoadingSkeleton />}>
          <AdminScholarshipSelection
            studentProfileId={student?.student_id || ''}
            studentUserId={student?.user_id || ''}
          />
        </Suspense>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <Suspense fallback={<TabLoadingSkeleton />}>
          <StudentLogsView 
            studentId={student?.student_id || ''}
            studentName={student?.student_name || ''}
          />
        </Suspense>
      )}

      {/* New Request Modal */}
      <NewRequestModal
        isOpen={showNewRequestModal}
        studentName={student?.student_name || ''}
        newDocumentRequest={newDocumentRequest}
        creatingDocumentRequest={creatingDocumentRequest}
        onClose={closeNewRequestModal}
        onRequestChange={updateNewDocumentRequest}
        onCreate={handleCreateDocumentRequest}
      />

      {/* Reject Transfer Form Modal - Agora está dentro do TransferFormSection */}

      {/* Modals */}
      <PaymentConfirmationModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleConfirmPayment}
        pendingPayment={pendingPayment}
        student={student}
        paymentMethod={paymentMethod}
        amount={paymentAmount}
        onPaymentMethodChange={setPaymentMethod}
        onAmountChange={setPaymentAmount}
        isProcessing={saving}
      />

      <RejectDocumentModal
        isOpen={showRejectDocModal}
        onClose={() => setShowRejectDocModal(false)}
        onReject={handleConfirmReject}
        documentType={rejectDocData?.docType || ''}
      />
    </div>
  );
};

export default AdminStudentDetails;

