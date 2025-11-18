import React, { useState, Suspense, lazy, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useStudentDetailsQuery, useStudentSecondaryDataQuery, usePendingZellePaymentsQuery } from '../../hooks/useStudentDetailsQueries';
import { useAdminStudentActions } from '../../hooks/useAdminStudentActions';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import RefreshButton from '../../components/RefreshButton';
import { useTransferForm } from '../../hooks/useTransferForm';
import { useDocumentRequests } from '../../hooks/useDocumentRequests';
import { useAdminNotes } from '../../hooks/useAdminNotes';
import { useDocumentRequestHandlers } from '../../hooks/useDocumentRequestHandlers';
import { generateTermAcceptancePDF, StudentTermAcceptanceData } from '../../utils/pdfGenerator';
import { recordIndividualFeePayment } from '../../lib/paymentRecorder';
import { useStudentLogs } from '../../hooks/useStudentLogs';

// Componentes de UI Base
import {
  Clock,
  ExternalLink
} from 'lucide-react';
import SkeletonLoader from '../../components/AdminDashboard/StudentDetails/SkeletonLoader';
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
  const queryClient = useQueryClient();
  
  // React Query Hooks
  const studentDetailsQuery = useStudentDetailsQuery(profileId);
  const student = studentDetailsQuery.data || null;
  const loading = studentDetailsQuery.isLoading;
  
  // Dados secundários
  const secondaryDataQuery = useStudentSecondaryDataQuery(student?.user_id);
  const pendingZelleQuery = usePendingZellePaymentsQuery(student?.user_id);
  
  // Extrair dados secundários
  const termAcceptances = secondaryDataQuery.data?.termAcceptances || [];
  const realPaidAmounts = (() => {
    const amounts: Record<string, number> = {};
    (secondaryDataQuery.data?.individualFeePayments || []).forEach((p: any) => {
      amounts[p.fee_type] = p.amount_paid;
    });
    return amounts;
  })();
  const pendingZellePayments = pendingZelleQuery.data || [];
  
  // Função para atualizar student localmente (mantida para compatibilidade com hooks que dependem de setStudent)
  const setStudent = React.useCallback((updater: any) => {
    if (typeof updater === 'function') {
      const current = studentDetailsQuery.data;
      if (current) {
        const updated = updater(current);
        // Atualizar cache do React Query
        queryClient.setQueryData(queryKeys.students.details(profileId), updated);
      }
    } else {
      queryClient.setQueryData(queryKeys.students.details(profileId), updater);
    }
  }, [studentDetailsQuery.data, profileId, queryClient]);
  
  // Função para refresh de todos os dados
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        studentDetailsQuery.refetch(),
        secondaryDataQuery.refetch(),
        pendingZelleQuery.refetch(),
      ]);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };
  
  const { saving, saveProfile, markFeeAsPaid, approveDocument, rejectDocument } = useAdminStudentActions();
  const { getFeeAmount, formatFeeAmount, hasOverride, userSystemType, userFeeOverrides } = useFeeConfig(student?.user_id);
  const { logAction } = useStudentLogs(student?.student_id || '');
  
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
  } = useAdminNotes(student, user?.id, setStudent);
  
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
  
  // Estados para aprovar/rejeitar aplicação
  const [approvingStudent, setApprovingStudent] = useState(false);
  const [rejectingStudent, setRejectingStudent] = useState(false);
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');
  const [pendingRejectAppId, setPendingRejectAppId] = useState<string | null>(null);
  
  // Estados de dados secundários (alguns ainda são locais)
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [hasMatriculaRewardsDiscount, setHasMatriculaRewardsDiscount] = useState(false);
  // termAcceptances, realPaidAmounts e pendingZellePayments agora vêm dos React Query hooks (definidos acima)
  
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

  // Carregar referral info quando necessário (ainda é local pois depende de seller_referral_code)
  React.useEffect(() => {
    if (student?.seller_referral_code) {
      fetchReferralInfo(student.seller_referral_code);
        } else {
      setReferralInfo(null);
    }
  }, [student?.seller_referral_code]);

  // Pagamentos Zelle pendentes agora vêm do usePendingZellePaymentsQuery hook

  // Admin notes agora são gerenciados pelo hook useAdminNotes

  // ✅ OTIMIZAÇÃO: Carregar document requests apenas quando necessário
  // Usa cache e debounce para evitar múltiplas queries
  React.useEffect(() => {
    if (activeTab !== 'documents' || !student?.all_applications || (student.all_applications && student.all_applications.length === 0)) {
      if (activeTab !== 'documents') {
        setDocumentRequests([]);
      }
      return;
    }

    let cancelled = false;
    const loadDocumentRequests = async () => {
      try {
        if (!student?.all_applications) {
          if (!cancelled) setDocumentRequests([]);
          return;
        }
        const applicationIds = student.all_applications.map((app: any) => app.id).filter(Boolean);
        
        if (applicationIds.length === 0) {
          if (!cancelled) setDocumentRequests([]);
          return;
        }

        // ✅ OTIMIZAÇÃO: Selecionar apenas campos necessários
        const fields = 'id,title,description,due_date,is_global,university_id,scholarship_application_id,created_at,updated_at,template_url,attachment_url';

        // ✅ OTIMIZAÇÃO: Executar queries em paralelo
        const [specificResult, globalResult] = await Promise.all([
          supabase
            .from('document_requests')
            .select(fields)
            .in('scholarship_application_id', applicationIds)
            .order('created_at', { ascending: false }),
          
          (() => {
            const universityIds = (student.all_applications || [])
              .map((app: any) => app.scholarships?.university_id || app.university_id)
              .filter(Boolean);
            const uniqueUniversityIds = [...new Set(universityIds)];
            
            if (uniqueUniversityIds.length === 0) {
              return Promise.resolve({ data: [], error: null });
            }
            
            return supabase
              .from('document_requests')
              .select(fields)
              .eq('is_global', true)
              .in('university_id', uniqueUniversityIds)
              .order('created_at', { ascending: false });
          })()
        ]);

        if (cancelled) return;

        const allRequests = [
          ...(specificResult.data || []),
          ...(globalResult.data || [])
        ];

        // Remover duplicatas
        const uniqueRequests = Array.from(
          new Map(allRequests.map(req => [req.id, req])).values()
        );

        setDocumentRequests(uniqueRequests);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading document requests:', error);
          setDocumentRequests([]);
        }
      }
    };

    // Debounce para evitar múltiplas chamadas
    const timeoutId = setTimeout(loadDocumentRequests, 300);
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [student?.all_applications, activeTab]);

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
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      alert('Profile saved successfully!');
    } else {
      alert('Error saving profile: ' + result.error);
    }
  }, [student, dependents, saveProfile, profileId, queryClient]);

  const handleMarkAsPaid = useCallback((feeType: string) => {
    setPendingPayment({ fee_type: feeType });
    setPaymentAmount(getFeeAmount(feeType));
    setShowPaymentModal(true);
  }, [getFeeAmount]);

  const handleConfirmPayment = useCallback(async () => {
    if (!student || !pendingPayment) return;

    const feeType = pendingPayment.fee_type as 'selection_process' | 'application' | 'scholarship' | 'i20_control';
    let applicationId: string | undefined = undefined;

    // Para Application Fee, buscar a aplicação aprovada ou mais recente
    if (feeType === 'application') {
      const approvedApps = student?.all_applications?.filter((app: any) => app.status === 'approved') || [];
      
      if (approvedApps.length > 1) {
        // Com múltiplas aplicações, usar a primeira aprovada (ou implementar seleção se necessário)
        applicationId = approvedApps[0]?.id;
      } else if (approvedApps.length === 1) {
        applicationId = approvedApps[0].id;
      } else {
        // Se não há aplicação aprovada, buscar a mais recente
        const { data: applications, error: fetchError } = await supabase
          .from('scholarship_applications')
          .select('id, status')
          .eq('student_id', student.student_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!fetchError && applications && applications.length > 0) {
          applicationId = applications[0].id;
        } else {
          alert('No application found for this student');
          return;
        }
      }
    }

    // Para Application Fee, calcular o valor correto baseado na bolsa
    let finalPaymentAmount = paymentAmount;
    if (feeType === 'application' && applicationId) {
      try {
        const { data: applicationData } = await supabase
          .from('scholarship_applications')
          .select(`
            id,
            scholarships (
              application_fee_amount
            )
          `)
          .eq('id', applicationId)
          .single();

        if (applicationData?.scholarships) {
          const scholarship = Array.isArray(applicationData.scholarships) 
            ? applicationData.scholarships[0] 
            : applicationData.scholarships;
          
          if (scholarship?.application_fee_amount) {
            finalPaymentAmount = Number(scholarship.application_fee_amount);
          }
        }

        // Adicionar $100 por dependente apenas para sistema legacy
        const systemType = userSystemType || 'legacy';
        const studentDependents = dependents || Number(student.dependents || 0);
        if (systemType === 'legacy' && studentDependents > 0) {
          finalPaymentAmount += studentDependents * 100;
        }
      } catch (error) {
        console.error('Error fetching application data for fee calculation:', error);
      }
    }

    // Registrar pagamento na tabela individual_fee_payments
    const paymentDate = new Date().toISOString();
    const paymentMethodValue = (paymentMethod || 'manual') as 'stripe' | 'zelle' | 'manual';
    
    try {
      await recordIndividualFeePayment(supabase, {
        userId: student.user_id,
        feeType: feeType,
        amount: finalPaymentAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethodValue,
        paymentIntentId: null,
        stripeChargeId: null,
        zellePaymentId: null
      });
    } catch (recordError) {
      console.error('Failed to record individual fee payment:', recordError);
      // Não quebra o fluxo, mas loga o erro
    }

    // Marcar como pago usando o hook
    const result = await markFeeAsPaid(
      student.user_id,
      feeType,
      finalPaymentAmount,
      paymentMethodValue,
      applicationId
    );

    if (result.success) {
      // Para Application Fee, atualizar o estado local com a bolsa comprometida
      if (feeType === 'application' && applicationId) {
        try {
          const { data: updatedApplication } = await supabase
            .from('scholarship_applications')
            .select(`
              id,
              scholarships!inner (
                title,
                universities!inner (
                  name
                )
              )
            `)
            .eq('id', applicationId)
            .single();

          if (updatedApplication?.scholarships) {
            const scholarship = Array.isArray(updatedApplication.scholarships) 
              ? updatedApplication.scholarships[0] 
              : updatedApplication.scholarships;
            
            if (scholarship) {
              setStudent((prev: any) => {
                if (!prev) return prev;
                const updatedStudent = { ...prev, is_application_fee_paid: true };
                updatedStudent.scholarship_title = scholarship.title;
                const university = Array.isArray(scholarship.universities) 
                  ? scholarship.universities[0] 
                  : scholarship.universities;
                updatedStudent.university_name = university?.name;
                return updatedStudent as any;
              });
            }
          }
        } catch (error) {
          console.error('Error fetching application details:', error);
        }
      }

      // Log the action
      try {
        await logAction(
          'fee_payment',
          `${feeType === 'selection_process' ? 'Selection Process Fee' : feeType === 'application' ? 'Application Fee' : feeType === 'scholarship' ? 'Scholarship Fee' : 'I-20 Control Fee'} marked as paid via ${paymentMethodValue} payment`,
          user?.id || '',
          'admin',
          {
            fee_type: feeType,
            payment_method: paymentMethodValue,
            amount: finalPaymentAmount,
            ...(applicationId && { application_id: applicationId })
          }
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }

      setShowPaymentModal(false);
      setPendingPayment(null);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
    } else {
      console.error('Error recording payment:', result.error);
    }
  }, [student, pendingPayment, paymentAmount, paymentMethod, markFeeAsPaid, dependents, userSystemType, user, logAction, profileId, queryClient]);

  const handleApproveDocument = useCallback(async (appId: string, docType: string) => {
    if (!student) return;
    
    setApprovingDocs(prev => ({ ...prev, [`${appId}:${docType}`]: true }));
    
    try {
      const result = await approveDocument(appId, docType);
      
      if (result.success) {
        // Buscar os documentos atualizados do banco de dados
        const { data: updatedApp, error: fetchError } = await supabase
          .from('scholarship_applications')
          .select('id, documents')
          .eq('id', appId)
          .single();
        
        if (!fetchError && updatedApp) {
          // Atualizar o estado do student localmente sem reload
          setStudent((prev: any) => {
            if (!prev) return prev;
            const updatedApps = (prev.all_applications || []).map((a: any) =>
              a.id === appId ? { ...a, documents: updatedApp.documents || [] } : a
            );
            return { ...prev, all_applications: updatedApps } as any;
          });
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
        }
      } else {
        console.error('Error approving document:', result.error);
      }
    } catch (error) {
      console.error('Error approving document:', error);
    } finally {
      setApprovingDocs(prev => ({ ...prev, [`${appId}:${docType}`]: false }));
    }
  }, [approveDocument, student, setStudent]);

  const handleRejectDocument = useCallback((appId: string, docType: string) => {
    setRejectDocData({ applicationId: appId, docType });
    setShowRejectDocModal(true);
  }, []);

  const handleConfirmReject = useCallback(async (reason: string) => {
    if (!rejectDocData || !student) return;

    try {
      const result = await rejectDocument(
        rejectDocData.applicationId,
        rejectDocData.docType,
        reason
      );

      if (result.success) {
        // Buscar os documentos atualizados do banco de dados
        const { data: updatedApp, error: fetchError } = await supabase
          .from('scholarship_applications')
          .select('id, documents')
          .eq('id', rejectDocData.applicationId)
          .single();
        
        if (!fetchError && updatedApp) {
          // Atualizar o estado do student localmente sem reload
          setStudent((prev: any) => {
            if (!prev) return prev;
            const updatedApps = (prev.all_applications || []).map((a: any) =>
              a.id === rejectDocData.applicationId ? { ...a, documents: updatedApp.documents || [] } : a
            );
            return { ...prev, all_applications: updatedApps } as any;
          });
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
        }
        
        // Fechar o modal de rejeição
        setShowRejectDocModal(false);
        setRejectDocData(null);
      } else {
        console.error('Error rejecting document:', result.error);
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  }, [rejectDocData, rejectDocument, student, setStudent]);

  const handleViewDocument = useCallback((doc: { file_url: string; filename: string }) => {
    // ✅ Aceitar tanto file_url quanto url (fallback)
    const fileUrl: string | undefined = doc?.file_url || (doc as any)?.url;
    if (!doc || !fileUrl) {
      console.error('Documento ou file_url/url está vazio ou undefined');
      return;
    }
    
    try {
      // ✅ CORREÇÃO: Se já é uma URL completa do Supabase, usar diretamente
      if (fileUrl && (fileUrl.startsWith('https://') || fileUrl.startsWith('http://'))) {
        // Se já é uma URL completa, usar diretamente
        window.open(fileUrl, '_blank');
      } else {
        // Se file_url é um path do storage, converter para URL pública
        const publicUrl = supabase.storage
          .from('student-documents')
          .getPublicUrl(fileUrl)
          .data.publicUrl;
        
        window.open(publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao gerar URL pública:', error);
      // Fallback: tentar usar a URL original
      window.open(fileUrl, '_blank');
    }
  }, []);

  const handleUploadDocument = useCallback(async (appId: string, docType: string, file: File) => {
    if (!canUniversityManage || !student) return;
    const k = `${appId}:${docType}`;
    setUploadingDocs(prev => ({ ...prev, [k]: true }));
    
    try {
      // Caminho no bucket
      const safeDocType = docType.replace(/[^a-z0-9_\-]/gi, '').toLowerCase();
      const timestamp = Date.now();
      const storagePath = `${student.student_id}/${appId}/${safeDocType}_${timestamp}_${file.name}`;

      // Upload no bucket student-documents (upsert para substituir)
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(storagePath, file, { upsert: true, cacheControl: '3600' });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Error uploading document: ' + uploadError.message);
        return;
      }

      // URL pública
      const { data: pub } = supabase.storage.from('student-documents').getPublicUrl(storagePath);
      const publicUrl = pub?.publicUrl || storagePath;

      // Atualizar array de documentos na aplicação
      const targetApp = student.all_applications?.find((a: any) => a.id === appId);
      if (!targetApp) {
        console.error('Application not found:', appId);
        return;
      }
      
      const currentDocs: any[] = Array.isArray(targetApp.documents) ? targetApp.documents : [];
      let found = false;
      const updatedDocs = currentDocs.map((d: any) => {
        if (d?.type === docType) {
          found = true;
          return {
            ...d,
            url: publicUrl,
            status: 'under_review',
            uploaded_at: new Date().toISOString()
          };
        }
        return d;
      });
      
      const finalDocs = found
        ? updatedDocs
        : [...updatedDocs, { type: docType, url: publicUrl, status: 'under_review', uploaded_at: new Date().toISOString() }];

      const { data, error } = await supabase
        .from('scholarship_applications')
        .update({ documents: finalDocs, updated_at: new Date().toISOString() })
        .eq('id', appId)
        .select('id, documents')
        .single();
      
      if (error) {
        console.error('Update documents error:', error);
        alert('Error updating document: ' + error.message);
        return;
      }

      // Atualizar estado local
      setStudent((prev: any) => {
        if (!prev) return prev;
        const updatedApps = (prev.all_applications || []).map((a: any) => 
          a.id === appId ? { ...a, documents: data?.documents || finalDocs } : a
        );
        return { ...prev, all_applications: updatedApps } as any;
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      
      // Log the action
      try {
        await logAction(
          'document_upload',
          `Document ${docType} replaced/uploaded`,
          user?.id || '',
          'admin',
          {
            application_id: appId,
            document_type: docType,
            file_url: publicUrl
          }
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert('Error uploading document: ' + (error.message || 'Unknown error'));
    } finally {
      setUploadingDocs(prev => ({ ...prev, [k]: false }));
    }
  }, [student, canUniversityManage, setStudent, user, logAction, profileId, queryClient]);

  // Funções para aprovar/rejeitar aplicação
  const approveApplication = useCallback(async (applicationId: string) => {
    if (!student || !isPlatformAdmin) return;
    
    try {
      setApprovingStudent(true);
      
      console.log('🔄 [APPROVE] Iniciando aprovação da aplicação:', applicationId);
      
      const { data: updatedApp, error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [APPROVE] Erro ao atualizar status da aplicação:', updateError);
        throw new Error('Failed to update application status: ' + updateError.message);
      }
      
      console.log('✅ [APPROVE] Aplicação aprovada no banco:', updatedApp);

      // Atualizar também o documents_status no perfil do usuário
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', student.user_id);

      if (profileUpdateError) {
        console.error('Erro ao atualizar documents_status:', profileUpdateError);
      }

      // Webhook e notificação
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', student.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Aluno aprovado na bolsa",
            email_aluno: userData.email,
            nome_aluno: student.student_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations, you have been selected for the scholarship.`
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

          // Enviar também notificação in-app para o aluno (sino)
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: student.user_id,
                  title: 'Scholarship approved',
                  message: `You have been selected for the scholarship.`,
                  type: 'scholarship_approved',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (error) {
        console.error('Error sending webhook:', error);
      }

      // Atualizar o estado local com os dados atualizados do banco
      if (updatedApp) {
        console.log('🔄 [APPROVE] Atualizando estado local...');
        setStudent((prev: any) => {
          if (!prev) {
            console.warn('⚠️ [APPROVE] Student é null, não é possível atualizar');
            return prev;
          }
          
          // Criar um novo array de aplicações com a aplicação atualizada
          const updatedApps = (prev.all_applications || []).map((app: any) => {
            if (app.id === applicationId) {
              console.log('🔄 [APPROVE] Atualizando aplicação:', app.id, 'de', app.status, 'para approved');
              // Criar um novo objeto completamente para garantir que o React detecte a mudança
              return {
                ...app,
                status: 'approved',
                updated_at: updatedApp.updated_at || new Date().toISOString()
              };
            }
            return app;
          });
          
          console.log('✅ [APPROVE] Novo array de aplicações criado:', updatedApps.length, 'aplicações');
          
          // Criar um novo objeto student completamente para garantir que o React detecte a mudança
          const newStudent = {
            ...prev,
            all_applications: updatedApps,
            application_status: 'approved'
          } as any;
          
          console.log('✅ [APPROVE] Novo objeto student criado');
          return newStudent;
        });
        
        console.log('✅ [APPROVE] setStudent chamado, aguardando re-render...');
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      } else {
        console.warn('⚠️ [APPROVE] updatedApp é null ou undefined');
      }
    } catch (error: any) {
      console.error('Error approving application:', error);
    } finally {
      setApprovingStudent(false);
    }
  }, [student, isPlatformAdmin, user, setStudent, profileId, queryClient]);

  const rejectApplication = useCallback(async (applicationId: string) => {
    if (!student || !isPlatformAdmin) return;
    
    try {
      setRejectingStudent(true);
      
      const { data: updatedApp, error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', applicationId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Erro ao atualizar status da aplicação:', updateError);
        throw updateError;
      }
      
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
      setPendingRejectAppId(null);
      
      // Atualizar o estado local com os dados atualizados do banco
      if (updatedApp) {
        setStudent((prev: any) => {
          if (!prev) return prev;
          
          // Criar um novo array de aplicações com a aplicação atualizada
          const updatedApps = (prev.all_applications || []).map((app: any) => {
            if (app.id === applicationId) {
              // Criar um novo objeto completamente para garantir que o React detecte a mudança
              return {
                ...app,
                status: 'rejected',
                notes: rejectStudentReason || null,
                updated_at: updatedApp.updated_at || new Date().toISOString()
              };
            }
            return app;
          });
          
          // Criar um novo objeto student completamente para garantir que o React detecte a mudança
          return {
            ...prev,
            all_applications: updatedApps,
            application_status: 'rejected'
          } as any;
        });
        
        console.log('✅ [REJECT] Estado local atualizado com sucesso');
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      }
    } catch (error: any) {
      console.error('Erro ao rejeitar aplicação:', error);
    } finally {
      setRejectingStudent(false);
    }
  }, [student, isPlatformAdmin, rejectStudentReason, setStudent, profileId, queryClient]);

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
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
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
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
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

  const handleGoToZellePayments = useCallback(() => {
    navigate('/admin/dashboard/payments?tab=zelle');
  }, [navigate]);

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
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      alert('Payment method updated successfully!');
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Details</h1>
          <p className="text-slate-600 mt-1">Detailed view for {student.student_name}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={handleOpenChat}
              className="group relative px-4 py-2.5 text-slate-700 flex items-center space-x-2 transition-all duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-inset"
              title="Send message to student"
            >
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-medium text-sm whitespace-nowrap">Send Message</span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <button
              onClick={handleBack}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-inset"
            >
              <span className="font-medium text-sm whitespace-nowrap">Back</span>
            </button>
          </div>
          <div className="flex-shrink-0">
            <RefreshButton
              onClick={handleRefresh}
              isRefreshing={isRefreshing}
              title="Refresh student data"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <StudentDetailsTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Zelle Payments Pending Alert */}
      {pendingZellePayments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Pending Zelle Payment Approvals
                </h3>
                <p className="text-sm text-yellow-700">
                  This student has a Zelle payment awaiting administrative approval.
                </p>
              </div>
            </div>
            <button
              onClick={handleGoToZellePayments}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <span>Review Payments</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

              {student.seller_referral_code && student.all_applications && (
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

              <SelectedScholarshipCard 
                student={student} 
                isPlatformAdmin={isPlatformAdmin}
                approvingStudent={approvingStudent}
                rejectingStudent={rejectingStudent}
                onApproveApplication={approveApplication}
                onRejectApplication={(appId) => {
                  setPendingRejectAppId(appId);
                  setShowRejectStudentModal(true);
                }}
              />

              <StudentDocumentsCard
                applications={student.all_applications || []}
                expandedApps={expandedApps}
                canPlatformAdmin={isPlatformAdmin}
                canUniversityManage={canUniversityManage}
                uploadingDocs={uploadingDocs}
                approvingDocs={approvingDocs}
                rejectingDocs={rejectingDocs}
                approvingStudent={approvingStudent}
                rejectingStudent={rejectingStudent}
                onToggleExpand={(appKey) => setExpandedApps(prev => ({ ...prev, [appKey]: !prev[appKey] }))}
                onViewDocument={handleViewDocument}
                onUploadDocument={handleUploadDocument}
                onApproveDocument={handleApproveDocument}
                onRejectDocument={handleRejectDocument}
                onApproveApplication={approveApplication}
                onRejectApplication={(appId) => {
                  setPendingRejectAppId(appId);
                  setShowRejectStudentModal(true);
                }}
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

      {/* Modal para rejeitar aplicação */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Application</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this application. This information will be shared with the student.
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
                  setPendingRejectAppId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectAppId) {
                    rejectApplication(pendingRejectAppId);
                  }
                }}
                disabled={!rejectStudentReason.trim() || rejectingStudent}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                {rejectingStudent ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rejecting...
                  </>
                ) : (
                  'Reject Application'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentDetails;

