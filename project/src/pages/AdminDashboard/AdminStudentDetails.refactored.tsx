import React, { useState, Suspense, lazy, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import { getGrossPaidAmounts } from '../../utils/paymentConverter';

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
const IdentityPhotoVerificationCard = lazy(() => import('../../components/AdminDashboard/StudentDetails/IdentityPhotoVerificationCard'));

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
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();
  
  // React Query Hooks
  const studentDetailsQuery = useStudentDetailsQuery(profileId);
  const student = studentDetailsQuery.data || null;
  const loading = studentDetailsQuery.isLoading;
  
  // Dados secundários
  const secondaryDataQuery = useStudentSecondaryDataQuery(student?.user_id);
  const pendingZelleQuery = usePendingZellePaymentsQuery(student?.user_id);
  const [directTermAcceptances, setDirectTermAcceptances] = useState<any[] | null>(null);
  
  // Forçar refetch de dados secundários se estiverem vazios no mount/local refresh.
  React.useEffect(() => {
    if (!student?.user_id) return;
    try {
      const hasData = !!secondaryDataQuery.data;
      const termCount = (secondaryDataQuery.data && Array.isArray(secondaryDataQuery.data.termAcceptances))
        ? secondaryDataQuery.data.termAcceptances.length
        : 0;

      if (!hasData || termCount === 0) {
        console.log('🔁 [AdminStudentDetails] Forçando refetch de secondaryDataQuery (no cliente local)...', { hasData, termCount });
        secondaryDataQuery.refetch().catch(err => console.error('Erro ao refetch secondaryDataQuery:', err));
      }
    } catch (err) {
      console.error('Erro ao verificar/refetch secondaryDataQuery:', err);
    }
  }, [student?.user_id]);

  // Hotfix: se o RPC/cache não trouxer dados, buscar diretamente do banco
  React.useEffect(() => {
    let cancelled = false;
    const loadDirectTermAcceptances = async () => {
      if (!student?.user_id) return;
      const hasData = !!secondaryDataQuery.data;
      const termCount = (secondaryDataQuery.data && Array.isArray(secondaryDataQuery.data.termAcceptances))
        ? secondaryDataQuery.data.termAcceptances.length
        : 0;

      if (hasData && termCount > 0) {
        setDirectTermAcceptances(null);
        return;
      }

      try {
        console.log('🔁 [AdminStudentDetails] Hotfix: tentando RPC get_admin_student_secondary_data...');
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_student_secondary_data', {
          target_user_id: student.user_id
        });

        if (!rpcError && rpcData) {
          const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
          const termAcceptancesFromRpc = parsed.term_acceptances || [];
          if (!cancelled) {
            setDirectTermAcceptances(termAcceptancesFromRpc);
            console.log('🔁 [AdminStudentDetails] Hotfix: directTermAcceptances loaded from RPC:', termAcceptancesFromRpc.length);
            return;
          }
        } else {
          console.log('🔁 [AdminStudentDetails] Hotfix: RPC não disponível ou retornou erro, fallback para select simples', rpcError);
        }

        // Fallback simples: buscar acceptances sem tentar usar relationships no select
        const { data, error } = await supabase
          .from('comprehensive_term_acceptance')
          .select('*')
          .eq('user_id', student.user_id)
          .order('accepted_at', { ascending: false });

        if (error) {
          console.error('🔁 [AdminStudentDetails] Hotfix fetch error (fallback):', error);
          return;
        }

        if (cancelled) return;

        const mapped = (data || []).map((acc: any) => ({
          ...acc,
          user_email: acc.user_email || null,
          user_full_name: acc.user_full_name || null,
          term_title: acc.term_title || 'Term',
          term_content: acc.term_content || '',
          identity_photo_path: acc.identity_photo_path || acc.photo_path || null,
          identity_photo_name: acc.identity_photo_name || null,
          identity_photo_status: acc.identity_photo_status || null,
          identity_photo_rejection_reason: acc.identity_photo_rejection_reason || null,
          identity_photo_reviewed_at: acc.identity_photo_reviewed_at || null,
          identity_photo_reviewed_by: acc.identity_photo_reviewed_by || null,
        }));

        setDirectTermAcceptances(mapped);
        console.log('🔁 [AdminStudentDetails] Hotfix: directTermAcceptances loaded (fallback):', mapped.length);
      } catch (err) {
        console.error('🔁 [AdminStudentDetails] Hotfix exception:', err);
      }
    };

    loadDirectTermAcceptances();
    return () => { cancelled = true; };
  }, [student?.user_id, secondaryDataQuery.data]);

  // Extrair dados secundários
  const termAcceptances = secondaryDataQuery.data?.termAcceptances || [];
  // Debug: log secondary data for admin details
  console.log('🔍 [AdminStudentDetails] secondaryDataQuery.data:', secondaryDataQuery.data);
  console.log('🔍 [AdminStudentDetails] termAcceptances:', termAcceptances);
  
  // Log específico para status de foto de identidade
  const identityPhotoAcceptance = termAcceptances.find((acc: any) => 
    acc.term_type === 'checkout_terms' && (acc.identity_photo_path || acc.identity_photo_status)
  );
  if (identityPhotoAcceptance) {
    console.log('🔍 [AdminStudentDetails] Identity Photo Status:', {
      id: identityPhotoAcceptance.id,
      status: identityPhotoAcceptance.identity_photo_status,
      rejection_reason: identityPhotoAcceptance.identity_photo_rejection_reason,
      reviewed_at: identityPhotoAcceptance.identity_photo_reviewed_at
    });
  }
  const [realPaidAmounts, setRealPaidAmounts] = useState<Record<string, number>>({});
  const [loadingPaidAmounts, setLoadingPaidAmounts] = useState<Record<string, boolean>>({});
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
      // ✅ Recarregar realPaidAmounts após refresh
      await reloadRealPaidAmounts();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };
  
  const { saving, saveProfile, markFeeAsPaid, approveDocument, rejectDocument } = useAdminStudentActions();
  const { getFeeAmount, formatFeeAmount, hasOverride, userSystemType, userFeeOverrides, loadUserFeeOverrides } = useFeeConfig(student?.user_id);
  const { logAction } = useStudentLogs(student?.student_id || '');

  /**
   * Valida e normaliza valores pagos usando a mesma lógica do Payment Management
   * Se o valor estiver muito discrepante (provavelmente BRL não convertido), usa valores fixos em dólar
   */
  const validateAndNormalizePaidAmounts = React.useCallback((
    realPaidAmounts: Record<string, number>,
    systemType: 'legacy' | 'simplified' | null,
    feeOverrides: any,
    feeAmountFn: (feeType: string) => number,
    dependents: number = 0,
    hasMatriculaRewardsDiscount: boolean = false,
    studentHasSellerCode: boolean = false
  ): Record<string, number> => {
    const normalized: Record<string, number> = {};
    
    // Helper: Verifica se o valor está dentro de uma faixa razoável (50% de tolerância)
    const isValueReasonable = (realValue: number, expectedValue: number): boolean => {
      const tolerance = 0.5; // 50% de tolerância
      const min = expectedValue * (1 - tolerance);
      const max = expectedValue * (1 + tolerance);
      return realValue >= min && realValue <= max;
    };

    const sysType = systemType || 'legacy';
    const dependentCost = sysType === 'simplified' ? 0 : (dependents * 150);

    // Selection Process Fee
    if (realPaidAmounts.selection_process !== undefined && realPaidAmounts.selection_process > 0) {
      // ✅ CORREÇÃO: Valores que vêm de getGrossPaidAmounts já foram processados corretamente
      // e podem ter pequenas variações devido a taxas do Stripe, conversão de moeda, etc.
      // Para valores razoáveis (entre $50 e $2000), sempre aceitar o valor real pago
      const isReasonableRange = realPaidAmounts.selection_process >= 50 && realPaidAmounts.selection_process <= 2000;
      
      if (isReasonableRange) {
        // Valor está em range razoável, aceitar diretamente (já foi processado pelo paymentConverter)
        normalized.selection_process = realPaidAmounts.selection_process;
        console.log(`[AdminStudentDetails] ✅ Aceitando valor real pago para selection_process: ${realPaidAmounts.selection_process}`);
      } else {
        // Valor fora do range razoável, pode ser BRL não convertido ou erro
        console.log(`[AdminStudentDetails] ⚠️ Valor de selection_process fora do range razoável: ${realPaidAmounts.selection_process}, usando cálculo fixo`);
        // Considerar desconto Matricula ao calcular valor esperado
        const hasMatrDiscount = hasMatriculaRewardsDiscount || studentHasSellerCode;
        let expectedSelectionProcess: number;
        if (hasMatrDiscount) {
          expectedSelectionProcess = 350; // $400 - $50 desconto
        } else {
          expectedSelectionProcess = sysType === 'simplified' ? 350 : 400;
        }
        
        if (feeOverrides?.selection_process_fee !== undefined) {
          normalized.selection_process = feeOverrides.selection_process_fee;
        } else {
          normalized.selection_process = expectedSelectionProcess + dependentCost;
        }
      }
    }

    // Scholarship Fee
    if (realPaidAmounts.scholarship !== undefined && realPaidAmounts.scholarship > 0) {
      const expectedScholarship = sysType === 'simplified' ? 550 : 900;
      
      if (isValueReasonable(realPaidAmounts.scholarship, expectedScholarship)) {
        normalized.scholarship = realPaidAmounts.scholarship;
      } else {
        // Valor muito discrepante, usar cálculo fixo
        console.log(`[AdminStudentDetails] Valor de scholarship muito discrepante: ${realPaidAmounts.scholarship} (esperado ~${expectedScholarship}), usando cálculo fixo`);
        if (feeOverrides?.scholarship_fee !== undefined) {
          normalized.scholarship = feeOverrides.scholarship_fee;
        } else {
          normalized.scholarship = expectedScholarship;
        }
      }
    }

    // I-20 Control Fee
    if (realPaidAmounts.i20_control !== undefined && realPaidAmounts.i20_control > 0) {
      const expectedI20Control = feeAmountFn('i20_control_fee');
      
      if (isValueReasonable(realPaidAmounts.i20_control, expectedI20Control)) {
        normalized.i20_control = realPaidAmounts.i20_control;
      } else {
        // Valor muito discrepante, usar cálculo fixo
        console.log(`[AdminStudentDetails] Valor de i20_control muito discrepante: ${realPaidAmounts.i20_control} (esperado ~${expectedI20Control}), usando cálculo fixo`);
        if (feeOverrides?.i20_control_fee !== undefined) {
          normalized.i20_control = feeOverrides.i20_control_fee;
        } else {
          normalized.i20_control = expectedI20Control;
        }
      }
    }

    // Application Fee
    if (realPaidAmounts.application !== undefined && realPaidAmounts.application > 0) {
      const expectedApplicationFee = feeAmountFn('application_fee');
      const expectedApplicationFeeWithDeps = dependents > 0
        ? expectedApplicationFee + (dependents * 100)
        : expectedApplicationFee;
      
      if (isValueReasonable(realPaidAmounts.application, expectedApplicationFeeWithDeps)) {
        normalized.application = realPaidAmounts.application;
      } else {
        // Valor muito discrepante, usar cálculo fixo
        console.log(`[AdminStudentDetails] Valor de application muito discrepante: ${realPaidAmounts.application} (esperado ~${expectedApplicationFeeWithDeps}), usando cálculo fixo`);
        normalized.application = expectedApplicationFee;
        if (dependents > 0) {
          normalized.application += dependents * 100;
        }
      }
    }

    return normalized;
  }, []);

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
  } = useTransferForm(student, isPlatformAdmin, user?.id, user?.email, logAction);
  
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
  } = useAdminNotes(student, user?.id, setStudent, logAction, student?.student_id);
  
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
  } = useDocumentRequestHandlers(student, user?.id, setDocumentRequests, logAction, student?.student_id);

  // Outros estados locais
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [dependents, setDependents] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  
  // Ler parâmetro 'tab' da URL e definir aba inicial
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'documents', 'scholarships', 'logs'].includes(tabParam)) {
      setActiveTab(tabParam as TabId);
    }
  }, [searchParams]);
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [i20Deadline, setI20Deadline] = useState<string | null>(null);
  const [i20Countdown, setI20Countdown] = useState<string>('');
  
  // Estados de documentos
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [approvingDocs, setApprovingDocs] = useState<Record<string, boolean>>({});
  const [rejectingDocs] = useState<Record<string, boolean>>({});
  const [processingIdentityPhoto, setProcessingIdentityPhoto] = useState(false);
  
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
  // ✅ Estado para forçar recarregamento de overrides no PaymentStatusCard
  const [overridesRefreshKey, setOverridesRefreshKey] = useState(0);

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

  // Buscar valores brutos pagos usando getGrossPaidAmounts (mostra o valor que o aluno realmente pagou, incluindo taxas do Stripe)
  // Usa gross_amount_usd quando disponível, senão usa amount
  // Aplica validação para garantir que valores em BRL não sejam exibidos como USD
  // ✅ IMPORTANTE: Este useEffect deve vir DEPOIS das definições de userSystemType, userFeeOverrides, getFeeAmount, hasMatriculaRewardsDiscount e validateAndNormalizePaidAmounts
  
  // Usar useRef para rastrear se já carregamos os dados e evitar loops infinitos
  const lastLoadedUserIdRef = React.useRef<string | null>(null);
  const lastLoadedDepsRef = React.useRef<string>('');
  const isLoadingRef = React.useRef<boolean>(false);
  
  React.useEffect(() => {
    if (!student?.user_id) {
      setRealPaidAmounts({});
      lastLoadedUserIdRef.current = null;
      lastLoadedDepsRef.current = '';
      isLoadingRef.current = false;
      return;
    }
    
    // Criar uma string de dependências para comparação (sem getFeeAmount e validateAndNormalizePaidAmounts que são funções)
    const depsKey = JSON.stringify({
      userId: student.user_id,
      systemType: userSystemType,
      dependents: student?.dependents || 0,
      hasDiscount: hasMatriculaRewardsDiscount,
      sellerCode: student?.seller_referral_code || '',
      // Serializar userFeeOverrides de forma estável
      overrides: userFeeOverrides ? JSON.stringify(userFeeOverrides) : ''
    });
    
    // Evitar re-executar se as dependências não mudaram ou se já está carregando
    if (isLoadingRef.current || (lastLoadedUserIdRef.current === student.user_id && lastLoadedDepsRef.current === depsKey)) {
      return;
    }
    
    lastLoadedUserIdRef.current = student.user_id;
    lastLoadedDepsRef.current = depsKey;
    isLoadingRef.current = true;
    
    const loadRealPaidAmounts = async () => {
      setLoadingPaidAmounts({
        selection_process: true,
        scholarship: true,
        i20_control: true,
        application: true,
      });
      try {
        const amounts = await getGrossPaidAmounts(student.user_id, ['selection_process', 'scholarship', 'i20_control', 'application']);
        
        // ✅ APLICAR VALIDAÇÃO: Usar a mesma lógica do Payment Management
        // Se valores estiverem muito discrepantes (provavelmente BRL não convertido), usar valores fixos em dólar
        const hasMatrFromSellerCode = !!(student?.seller_referral_code && /^MATR/i.test(student.seller_referral_code));
        const normalizedAmounts = validateAndNormalizePaidAmounts(
          amounts,
          userSystemType,
          userFeeOverrides,
          getFeeAmount,
          student?.dependents || 0,
          hasMatriculaRewardsDiscount,
          hasMatrFromSellerCode
        );
        
        setRealPaidAmounts(normalizedAmounts);
        console.log('[AdminStudentDetails] ✅ realPaidAmounts carregado e normalizado:', normalizedAmounts);
      } catch (error) {
        console.error('[AdminStudentDetails] Erro ao buscar valores brutos pagos:', error);
        setRealPaidAmounts({});
      } finally {
        setLoadingPaidAmounts({
          selection_process: false,
          scholarship: false,
          i20_control: false,
          application: false,
        });
        isLoadingRef.current = false;
      }
    };
    
    loadRealPaidAmounts();
    // Remover validateAndNormalizePaidAmounts das dependências pois é estável (useCallback com [] vazio)
    // Remover getFeeAmount também, pois pode mudar a cada render mas não afeta a lógica de quando carregar
  }, [student?.user_id, userSystemType, userFeeOverrides, student?.dependents, hasMatriculaRewardsDiscount, student?.seller_referral_code]);

  // Função para recarregar realPaidAmounts (força recarregamento mesmo se dependências não mudaram)
  const reloadRealPaidAmounts = React.useCallback(async () => {
    if (!student?.user_id) return;
    
    // Resetar refs para forçar recarregamento
    lastLoadedUserIdRef.current = null;
    lastLoadedDepsRef.current = '';
    isLoadingRef.current = false;
    
    setLoadingPaidAmounts({
      selection_process: true,
      scholarship: true,
      i20_control: true,
      application: true,
    });
    
    try {
      const amounts = await getGrossPaidAmounts(student.user_id, ['selection_process', 'scholarship', 'i20_control', 'application']);
      
      // ✅ APLICAR VALIDAÇÃO: Usar a mesma lógica do Payment Management
      const hasMatrFromSellerCode = !!(student?.seller_referral_code && /^MATR/i.test(student.seller_referral_code));
      const normalizedAmounts = validateAndNormalizePaidAmounts(
        amounts,
        userSystemType,
        userFeeOverrides,
        getFeeAmount,
        student?.dependents || 0,
        hasMatriculaRewardsDiscount,
        hasMatrFromSellerCode
      );
      
      setRealPaidAmounts(normalizedAmounts);
      console.log('[AdminStudentDetails] ✅ realPaidAmounts recarregado após refresh/save:', normalizedAmounts);
    } catch (error) {
      console.error('[AdminStudentDetails] Erro ao recarregar valores brutos pagos:', error);
      setRealPaidAmounts({});
    } finally {
      setLoadingPaidAmounts({
        selection_process: false,
        scholarship: false,
        i20_control: false,
        application: false,
      });
    }
  }, [student?.user_id, student?.dependents, student?.seller_referral_code, userSystemType, userFeeOverrides, hasMatriculaRewardsDiscount, getFeeAmount, validateAndNormalizePaidAmounts]);

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

        // ✅ CORREÇÃO: Incluir uploads na query para garantir que apareçam no DocumentsView
        const fields = 'id,title,description,due_date,is_global,university_id,scholarship_application_id,created_at,updated_at,template_url,attachment_url';
        const fieldsWithUploads = `${fields},document_request_uploads(*)`;

        // ✅ OTIMIZAÇÃO: Executar queries em paralelo
        const [specificResult, globalResult] = await Promise.all([
          supabase
            .from('document_requests')
            .select(fieldsWithUploads)
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
              .select(fieldsWithUploads)
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
  const handleOpenChat = useCallback(async () => {
    if (student?.user_id) {
      // First, try to find existing conversation with this student
      try {
        let query = supabase
          .from('admin_student_conversations')
          .select('id, admin_id')
          .eq('student_id', student.user_id);

        // For affiliate admins, only look for their own conversations
        // For regular admins, look for any existing conversation with this student
        if (userProfile && userProfile.role === 'affiliate_admin') {
          query = query.eq('admin_id', user?.id);
        }

        const { data: existingConversations, error } = await query;

        if (error) {
          console.error('Error finding existing conversation:', error);
        }

        if (existingConversations && existingConversations.length > 0) {
          // Use the first existing conversation (most recent)
          const existingConversation = existingConversations[0];
          navigate(`/admin/dashboard/users?tab=messages&conversation=${existingConversation.id}&recipient_id=${student.user_id}`);
        } else {
          // Navigate to create new conversation
          navigate(`/admin/dashboard/users?tab=messages&recipient_id=${student.user_id}`);
        }
      } catch (e) {
        console.error('Error in handleOpenChat:', e);
        // Fallback to creating new conversation
        navigate(`/admin/dashboard/users?tab=messages&recipient_id=${student.user_id}`);
      }
    }
  }, [student, user, userProfile, navigate]);

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
      
      // Log da ação
      try {
        await logAction(
          'profile_update',
          `Student profile updated by platform admin`,
          user?.id || '',
          'admin',
          {
            updated_fields: {
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
            },
            updated_by: user?.email || 'Platform Admin'
          }
        );
      } catch (logError) {
        console.error('Failed to log profile update:', logError);
      }
      
      alert('Profile saved successfully!');
    } else {
      alert('Error saving profile: ' + result.error);
    }
  }, [student, dependents, saveProfile, profileId, queryClient, user, logAction]);

  const handleMarkAsPaid = useCallback((feeType: string) => {
    setPendingPayment({ fee_type: feeType });
    setPaymentAmount(getFeeAmount(feeType));
    setShowPaymentModal(true);
  }, [getFeeAmount]);

  const handleConfirmPayment = useCallback(async () => {
    if (!student || !pendingPayment) return;

    const feeType = pendingPayment.fee_type as 'selection_process' | 'application' | 'scholarship' | 'i20_control';
    let applicationId: string | undefined = undefined;

    // Para Application Fee e Scholarship Fee, buscar a aplicação aprovada ou mais recente
    if (feeType === 'application' || feeType === 'scholarship') {
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
          alert(`No application found for this student. ${feeType === 'application' ? 'Application' : 'Scholarship'} fee requires an application.`);
          return;
        }
      }
    }

    // ✅ CORREÇÃO: Para Application Fee, SEMPRE usar o valor informado pelo admin
    // O admin deve ter controle total sobre o valor a ser registrado
    // O valor da bolsa (application_fee_amount) é apenas uma referência, não deve sobrescrever o valor informado
    let finalPaymentAmount = paymentAmount;
    
    // Para Application Fee, o valor informado pelo admin deve ser respeitado
    // Não sobrescrever com application_fee_amount da bolsa
    if (feeType === 'application' && applicationId) {
      // ✅ IMPORTANTE: Usar o valor informado pelo admin diretamente
      // Se o admin informou $1200, registrar $1200, não sobrescrever com o valor da bolsa
      console.log(`[PaymentStatusCard] Application Fee - Usando valor informado pelo admin: $${paymentAmount}`);
      finalPaymentAmount = paymentAmount;
      
      // Nota: Se no futuro precisar adicionar dependentes automaticamente,
      // isso deve ser feito apenas se o admin não informou um valor customizado
      // Por enquanto, respeitamos sempre o valor informado
    }

    // Validar que applicationId está presente quando necessário
    if ((feeType === 'application' || feeType === 'scholarship') && !applicationId) {
      alert(`Application ID is required for ${feeType === 'application' ? 'application' : 'scholarship'} fees. Please ensure the student has an approved application.`);
      return;
    }

    // Registrar pagamento na tabela individual_fee_payments
    const paymentDate = new Date().toISOString();
    const paymentMethodValue = (paymentMethod || 'manual') as 'stripe' | 'zelle' | 'manual';
    
    // ✅ IMPORTANTE: Ativar loading ANTES de registrar o pagamento
    // Isso evita mostrar o valor antigo enquanto o novo valor está sendo carregado
    setLoadingPaidAmounts(prev => ({ ...prev, [feeType]: true }));
    
    // ✅ IMPORTANTE: Registrar pagamento na tabela individual_fee_payments ANTES de marcar como pago
    // Isso garante que o registro seja feito mesmo se houver erro ao marcar como pago
    try {
      console.log('[PaymentStatusCard] Attempting to record individual fee payment:', {
        fee_type: feeType,
        user_id: student.user_id,
        amount: finalPaymentAmount,
        payment_method: paymentMethodValue
      });
      
      const recordResult = await recordIndividualFeePayment(supabase, {
        userId: student.user_id,
        feeType: feeType,
        amount: finalPaymentAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethodValue,
        paymentIntentId: null,
        stripeChargeId: null,
        zellePaymentId: null,
        grossAmountUsd: null, // Para pagamentos manuais, não há valor bruto do Stripe
        feeAmountUsd: null // Para pagamentos manuais, não há taxas do Stripe
      });
      
      if (!recordResult.success) {
        console.error('[PaymentStatusCard] ❌ Failed to record individual fee payment:', recordResult.error);
        // Mostrar alerta ao admin sobre o erro, mas continuar o fluxo
        alert(`Warning: Payment was marked as paid, but failed to record in individual_fee_payments table. Error: ${recordResult.error}`);
      } else {
        console.log('[PaymentStatusCard] ✅ Individual fee payment recorded successfully:', {
          payment_id: recordResult.paymentId,
          fee_type: feeType
        });
      }
    } catch (recordError: any) {
      console.error('[PaymentStatusCard] ❌ Exception while recording individual fee payment:', {
        error: recordError.message,
        stack: recordError.stack,
        fee_type: feeType
      });
      // Mostrar alerta ao admin sobre a exceção
      alert(`Warning: Payment was marked as paid, but an exception occurred while recording in individual_fee_payments table. Error: ${recordError.message}`);
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
      
      // ✅ IMPORTANTE: Atualizar realPaidAmounts após registrar pagamento
      // O loading já foi ativado antes de registrar o pagamento
      // Buscar novamente os valores pagos para refletir o pagamento recém-registrado
      try {
        const updatedAmounts = await getGrossPaidAmounts(student.user_id, ['selection_process', 'scholarship', 'i20_control', 'application']);
        
        // ✅ APLICAR VALIDAÇÃO: Usar a mesma lógica do Payment Management
        const hasMatrFromSellerCode = !!(student?.seller_referral_code && /^MATR/i.test(student.seller_referral_code));
        const normalizedAmounts = validateAndNormalizePaidAmounts(
          updatedAmounts,
          userSystemType,
          userFeeOverrides,
          getFeeAmount,
          student?.dependents || 0,
          hasMatriculaRewardsDiscount,
          hasMatrFromSellerCode
        );
        
        setRealPaidAmounts(normalizedAmounts);
        console.log('[PaymentStatusCard] ✅ realPaidAmounts atualizado após pagamento:', normalizedAmounts);
      } catch (updateError) {
        console.error('[PaymentStatusCard] Erro ao atualizar realPaidAmounts:', updateError);
      } finally {
        // Desativar loading após atualizar
        setLoadingPaidAmounts(prev => ({ ...prev, [feeType]: false }));
      }
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
    } else {
      console.error('Error recording payment:', result.error);
      alert(`Error marking fee as paid: ${result.error || 'Unknown error'}`);
    }
  }, [student, pendingPayment, paymentAmount, paymentMethod, markFeeAsPaid, dependents, userSystemType, userFeeOverrides, getFeeAmount, hasMatriculaRewardsDiscount, user, logAction, profileId, queryClient, validateAndNormalizePaidAmounts]);

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

        // Log da ação
        try {
          await logAction(
            'document_approval',
            `Document ${docType} approved by platform admin`,
            user?.id || '',
            'admin',
            {
              document_type: docType,
              application_id: appId,
              approved_by: user?.email || 'Platform Admin'
            }
          );
        } catch (logError) {
          console.error('Failed to log document approval:', logError);
        }
      } else {
        console.error('Error approving document:', result.error);
      }
    } catch (error) {
      console.error('Error approving document:', error);
    } finally {
      setApprovingDocs(prev => ({ ...prev, [`${appId}:${docType}`]: false }));
    }
  }, [approveDocument, student, setStudent, user, logAction, profileId, queryClient]);

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

        // Log da ação
        try {
          await logAction(
            'document_rejection',
            `Document ${rejectDocData.docType} rejected by platform admin: ${reason}`,
            user?.id || '',
            'admin',
            {
              document_type: rejectDocData.docType,
              application_id: rejectDocData.applicationId,
              rejection_reason: reason,
              rejected_by: user?.email || 'Platform Admin'
            }
          );
        } catch (logError) {
          console.error('Failed to log document rejection:', logError);
        }

        // ENVIAR NOTIFICAÇÕES PARA O ALUNO
        console.log('📤 [handleConfirmReject] Enviando notificações de rejeição para o aluno...');
        
        // Obter labels amigáveis para os documentos (definir antes do try para estar disponível em ambos os blocos)
        const docLabels: Record<string, string> = {
          passport: 'Passport',
          diploma: 'High School Diploma',
          funds_proof: 'Proof of Funds',
        };
        const docLabel = docLabels[rejectDocData.docType] || rejectDocData.docType;
        
        try {
          // 1. ENVIAR EMAIL VIA WEBHOOK (payload idêntico ao da universidade)
          const rejectionPayload = {
            tipo_notf: "Changes Requested",
            email_aluno: student.student_email,
            nome_aluno: student.student_name,
            email_universidade: user?.email,
            document_type: rejectDocData.docType, // ✅ CORREÇÃO: Adicionar tipo de documento (passport, diploma, funds_proof)
            document_title: docLabel, // ✅ CORREÇÃO: Adicionar título amigável do documento (Passport, High School Diploma, Proof of Funds)
            o_que_enviar: `Your document <strong>${docLabel}</strong> has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          console.log('📤 [handleConfirmReject] Payload de rejeição:', rejectionPayload);

          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(rejectionPayload),
          });

          if (webhookResponse.ok) {
            console.log('✅ [handleConfirmReject] Email de rejeição enviado com sucesso!');
          } else {
            console.warn('⚠️ [handleConfirmReject] Erro ao enviar email de rejeição:', webhookResponse.status);
          }
        } catch (webhookError) {
          console.error('❌ [handleConfirmReject] Erro ao enviar webhook de rejeição:', webhookError);
          // Não falhar o processo se o webhook falhar
        }

        // 2. ENVIAR NOTIFICAÇÃO IN-APP PARA O ALUNO (SINO)
        console.log('📤 [handleConfirmReject] Enviando notificação in-app para o aluno...');
        
        try {
          // docLabel já foi calculado acima, reutilizar
          
          // Usar Edge Function que tem service role para criar notificação
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          if (!accessToken) {
            console.error('❌ [handleConfirmReject] Access token não encontrado');
          } else {
            // Preparar payload - usar user_id (UUID) que a Edge Function vai converter para student_id
            // A Edge Function busca o student_id (user_profiles.id) a partir do user_id
            const notificationPayload = {
              user_id: student.user_id, // UUID que referencia auth.users.id
              title: 'Document Rejected',
              message: `Your ${docLabel} document has been rejected. Reason: ${reason}. Please review and upload a corrected version.`,
              link: '/student/dashboard/applications',
            };
            
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ [handleConfirmReject] Erro ao criar notificação:', response.status, errorText);
            } else {
              await response.json(); // Result não usado, apenas para consumir a resposta
              console.log('✅ [handleConfirmReject] Notificação in-app enviada com sucesso!');
            }
          }
        } catch (notificationError) {
          console.error('❌ [handleConfirmReject] Erro ao enviar notificação in-app:', notificationError);
          // Não falhar o processo se a notificação in-app falhar
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
  }, [rejectDocData, rejectDocument, student, setStudent, user, logAction, profileId, queryClient]);

  // Handlers para aprovar/rejeitar foto de identidade
  const handleApproveIdentityPhoto = useCallback(async (acceptanceId: string) => {
    if (!student || !user) {
      console.error('❌ [handleApproveIdentityPhoto] Student ou user não encontrado');
      alert('Error: Student or user not found');
      return;
    }

    setProcessingIdentityPhoto(true);
    console.log('🔄 [handleApproveIdentityPhoto] Iniciando aprovação...', { acceptanceId, studentId: student.student_id });

    try {
      // Atualizar status usando RPC (que tem SECURITY DEFINER e bypass RLS)
      console.log('📝 [handleApproveIdentityPhoto] Atualizando via RPC update_identity_photo_status...');
      const { data: rpcResult, error: rpcError } = await supabase.rpc('update_identity_photo_status', {
        p_acceptance_id: acceptanceId,
        p_status: 'approved',
        p_rejection_reason: null,
        p_reviewed_by: user.id
      });

      if (rpcError) {
        console.error('❌ [handleApproveIdentityPhoto] Erro ao atualizar via RPC:', rpcError);
        throw rpcError;
      }

      if (rpcResult === false || rpcResult === null) {
        console.error('❌ [handleApproveIdentityPhoto] RPC retornou false - nenhum registro atualizado');
        throw new Error(`RPC function returned false. Record update failed. ID: ${acceptanceId}`);
      }

      console.log('✅ [handleApproveIdentityPhoto] Status atualizado via RPC com sucesso:', rpcResult);

      // Log da ação
      try {
        await logAction(
          'identity_photo_approval',
          `Identity photo approved by platform admin`,
          user?.id || '',
          'admin',
          {
            acceptance_id: acceptanceId,
            student_id: student.student_id,
            student_name: student.student_name || 'N/A',
            approved_by: user?.email || 'Platform Admin',
            approved_at: new Date().toISOString()
          }
        );
        console.log('✅ [handleApproveIdentityPhoto] Ação logada com sucesso');
      } catch (logError) {
        console.error('⚠️ [handleApproveIdentityPhoto] Erro ao logar ação (não crítico):', logError);
      }

      // Verificar se a atualização foi persistida
      console.log('🔍 [handleApproveIdentityPhoto] Verificando se status foi atualizado no banco...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('comprehensive_term_acceptance')
        .select('id, identity_photo_status')
        .eq('id', acceptanceId)
        .single();

      if (verifyError) {
        console.error('⚠️ [handleApproveIdentityPhoto] Erro ao verificar atualização:', verifyError);
      } else {
        console.log('✅ [handleApproveIdentityPhoto] Status verificado no banco:', verifyData);
        if (verifyData.identity_photo_status !== 'approved') {
          console.error('❌ [handleApproveIdentityPhoto] Status não foi atualizado corretamente! Esperado: approved, Recebido:', verifyData.identity_photo_status);
        }
      }

      // Aguardar um pouco para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));

      // Limpar estado do hotfix para forçar reload
      setDirectTermAcceptances(null);

      // Invalidar e refetch queries para atualizar UI
      console.log('🔄 [handleApproveIdentityPhoto] Invalidando e refazendo queries...');
      
      // Limpar cache completamente para forçar refetch
      queryClient.removeQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
      queryClient.removeQueries({ queryKey: queryKeys.students.details(profileId) });
      
      // Refetch forçado
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id), type: 'active' }),
        queryClient.refetchQueries({ queryKey: queryKeys.students.details(profileId), type: 'active' })
      ]);

      console.log('✅ [handleApproveIdentityPhoto] Aprovação concluída com sucesso');
    } catch (err: any) {
      console.error('❌ [handleApproveIdentityPhoto] Erro ao aprovar foto:', err);
      alert('Error approving identity photo: ' + (err?.message || String(err)));
    } finally {
      setProcessingIdentityPhoto(false);
    }
  }, [student, user, logAction, queryClient, profileId]);

  const handleRejectIdentityPhoto = useCallback(async (acceptanceId: string, reason: string) => {
    if (!student || !user) {
      console.error('❌ [handleRejectIdentityPhoto] Student ou user não encontrado');
      alert('Error: Student or user not found');
      return;
    }

    if (!reason || reason.trim() === '') {
      console.error('❌ [handleRejectIdentityPhoto] Motivo de rejeição não fornecido');
      alert('Error: Rejection reason is required');
      return;
    }

    setProcessingIdentityPhoto(true);
    console.log('🔄 [handleRejectIdentityPhoto] Iniciando rejeição...', { acceptanceId, reason, studentId: student.student_id });

    try {
      // 1. Verificar se o registro existe primeiro
      console.log('🔍 [handleRejectIdentityPhoto] Verificando se registro existe...', { acceptanceId });
      const { data: existingRecord, error: checkError } = await supabase
        .from('comprehensive_term_acceptance')
        .select('id, user_id, identity_photo_path, identity_photo_status')
        .eq('id', acceptanceId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ [handleRejectIdentityPhoto] Erro ao verificar registro:', checkError);
        throw checkError;
      }

      if (!existingRecord) {
        console.error('❌ [handleRejectIdentityPhoto] Registro não encontrado com ID:', acceptanceId);
        throw new Error(`Record not found with ID: ${acceptanceId}`);
      }

      console.log('✅ [handleRejectIdentityPhoto] Registro encontrado:', existingRecord);

      // 2. Atualizar status no banco usando RPC (que tem SECURITY DEFINER e bypass RLS)
      console.log('📝 [handleRejectIdentityPhoto] Atualizando via RPC update_identity_photo_status...');
      const { data: rpcResult, error: rpcError } = await supabase.rpc('update_identity_photo_status', {
        p_acceptance_id: acceptanceId,
        p_status: 'rejected',
        p_rejection_reason: reason,
        p_reviewed_by: user.id
      });

      if (rpcError) {
        console.error('❌ [handleRejectIdentityPhoto] Erro ao atualizar via RPC:', rpcError);
        console.error('❌ [handleRejectIdentityPhoto] Detalhes do erro:', {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint
        });
        throw rpcError;
      }

      if (rpcResult === false || rpcResult === null) {
        console.error('❌ [handleRejectIdentityPhoto] RPC retornou false - nenhum registro atualizado');
        console.error('❌ [handleRejectIdentityPhoto] Registro que tentamos atualizar:', existingRecord);
        console.error('❌ [handleRejectIdentityPhoto] ID usado:', acceptanceId);
        throw new Error(`RPC function returned false. Record exists but update failed. ID: ${acceptanceId}`);
      }

      console.log('✅ [handleRejectIdentityPhoto] Status atualizado via RPC com sucesso:', rpcResult);

      // 2. Log da ação
      try {
        await logAction(
          'identity_photo_rejection',
          `Identity photo rejected by platform admin: ${reason}`,
          user?.id || '',
          'admin',
          {
            acceptance_id: acceptanceId,
            student_id: student.student_id,
            student_name: student.student_name || 'N/A',
            rejection_reason: reason,
            rejected_by: user?.email || 'Platform Admin',
            rejected_at: new Date().toISOString()
          }
        );
        console.log('✅ [handleRejectIdentityPhoto] Ação logada com sucesso');
      } catch (logError) {
        console.error('⚠️ [handleRejectIdentityPhoto] Erro ao logar ação (não crítico):', logError);
      }

      // 3. Enviar notificações (webhook/in-app)
      try {
        console.log('📤 [handleRejectIdentityPhoto] Buscando dados do aluno para notificação...');
        const { data: studentProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('email, full_name')
          .eq('user_id', student.user_id)
          .single();

        if (profileError) {
          console.error('❌ [handleRejectIdentityPhoto] Erro ao buscar perfil do aluno:', profileError);
        } else {
          console.log('✅ [handleRejectIdentityPhoto] Perfil do aluno encontrado:', studentProfile);
        }

        if (studentProfile?.email) {
          // 3.1. Enviar email via webhook
          const rejectionPayload = {
            tipo_notf: 'Identity Photo Rejected',
            email_aluno: studentProfile.email,
            nome_aluno: studentProfile.full_name || student.student_name || 'Student',
            email_universidade: user?.email || '',
            document_type: 'Identity Photo',
            document_title: 'Identity Photo',
            rejection_reason: reason,
            o_que_enviar: `Your identity photo has been rejected. Reason: <strong>${reason}</strong>. Please review the terms again and upload a corrected version.`
          };

          console.log('📤 [handleRejectIdentityPhoto] Enviando webhook de rejeição:', rejectionPayload);

          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(rejectionPayload),
            });

            if (webhookResponse.ok) {
              console.log('✅ [handleRejectIdentityPhoto] Webhook enviado com sucesso');
            } else {
              const errorText = await webhookResponse.text();
              console.error('❌ [handleRejectIdentityPhoto] Erro ao enviar webhook:', webhookResponse.status, errorText);
            }
          } catch (webhookError) {
            console.error('❌ [handleRejectIdentityPhoto] Erro na requisição do webhook:', webhookError);
          }
        } else {
          console.warn('⚠️ [handleRejectIdentityPhoto] Email do aluno não encontrado, pulando webhook');
        }

        // 3.2. Enviar notificação in-app (sino)
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (accessToken) {
          const notificationPayload = {
            user_id: student.user_id,
            title: 'Identity Photo Rejected',
            message: `Your identity photo has been rejected. Reason: ${reason}. Please review and upload a corrected version.`,
            link: '/student/dashboard/identity-verification',
          };

          console.log('📤 [handleRejectIdentityPhoto] Enviando notificação in-app:', notificationPayload);

          try {
            const notificationResponse = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });

            if (notificationResponse.ok) {
              console.log('✅ [handleRejectIdentityPhoto] Notificação in-app criada com sucesso');
            } else {
              const errorText = await notificationResponse.text();
              console.error('❌ [handleRejectIdentityPhoto] Erro ao criar notificação in-app:', notificationResponse.status, errorText);
            }
          } catch (notificationError) {
            console.error('❌ [handleRejectIdentityPhoto] Erro na requisição de notificação in-app:', notificationError);
          }
        } else {
          console.warn('⚠️ [handleRejectIdentityPhoto] Access token não encontrado para notificação in-app');
        }
      } catch (notificationError) {
        console.error('❌ [handleRejectIdentityPhoto] Erro ao enviar notificações:', notificationError);
        // Não falha a rejeição por causa das notificações
      }

      // 4. Verificar se a atualização foi persistida (com retry)
      console.log('🔍 [handleRejectIdentityPhoto] Verificando se status foi atualizado no banco...');
      let verifyData: any = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Aguardar entre tentativas
        
        const { data: checkData, error: verifyError } = await supabase
          .from('comprehensive_term_acceptance')
          .select('id, identity_photo_status, identity_photo_rejection_reason, identity_photo_reviewed_at')
          .eq('id', acceptanceId)
          .single();

        if (verifyError) {
          console.error(`⚠️ [handleRejectIdentityPhoto] Erro ao verificar atualização (tentativa ${attempts + 1}/${maxAttempts}):`, verifyError);
          attempts++;
          continue;
        }

        verifyData = checkData;
        console.log(`✅ [handleRejectIdentityPhoto] Status verificado no banco (tentativa ${attempts + 1}/${maxAttempts}):`, verifyData);
        
        if (verifyData.identity_photo_status === 'rejected') {
          console.log('✅ [handleRejectIdentityPhoto] Status confirmado como "rejected" no banco!');
          break;
        } else {
          console.warn(`⚠️ [handleRejectIdentityPhoto] Status ainda não atualizado. Esperado: rejected, Recebido: ${verifyData.identity_photo_status}. Tentando novamente...`);
          attempts++;
        }
      }

      if (!verifyData || verifyData.identity_photo_status !== 'rejected') {
        console.error('❌ [handleRejectIdentityPhoto] Status não foi atualizado após múltiplas tentativas!', verifyData);
        // Não lançar erro, apenas logar - pode ser um problema de cache do banco
      }

      // 6. Limpar estado do hotfix para forçar reload
      setDirectTermAcceptances(null);

      // 7. Invalidar e refetch queries para atualizar UI
      console.log('🔄 [handleRejectIdentityPhoto] Invalidando e refazendo queries...');
      
      // Limpar cache completamente para forçar refetch
      queryClient.removeQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
      queryClient.removeQueries({ queryKey: queryKeys.students.details(profileId) });
      
      // Refetch forçado via queryClient
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id), type: 'active' }),
        queryClient.refetchQueries({ queryKey: queryKeys.students.details(profileId), type: 'active' })
      ]);

      // Aguardar um pouco e refetch novamente para garantir que os dados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 1000));
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id), type: 'active' }),
        queryClient.refetchQueries({ queryKey: queryKeys.students.details(profileId), type: 'active' })
      ]);

      console.log('✅ [handleRejectIdentityPhoto] Rejeição concluída com sucesso');
    } catch (err: any) {
      console.error('❌ [handleRejectIdentityPhoto] Erro ao rejeitar foto:', err);
      alert('Error rejecting identity photo: ' + (err?.message || String(err)));
    } finally {
      setProcessingIdentityPhoto(false);
    }
  }, [student, user, logAction, queryClient, profileId]);

  const handleUpdateRejectionReason = useCallback(async (acceptanceId: string, reason: string) => {
    if (!student || !user) {
      console.error('❌ [handleUpdateRejectionReason] Student ou user não encontrado');
      return;
    }

    if (!reason || reason.trim() === '') {
      console.error('❌ [handleUpdateRejectionReason] Motivo de rejeição não fornecido');
      return;
    }

    setProcessingIdentityPhoto(true);
    console.log('🔄 [handleUpdateRejectionReason] Atualizando motivo de rejeição...', { acceptanceId, reason });

    try {
      // Atualizar apenas o motivo usando RPC (mantém status como rejected)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('update_identity_photo_status', {
        p_acceptance_id: acceptanceId,
        p_status: 'rejected', // Manter como rejected
        p_rejection_reason: reason, // Novo motivo
        p_reviewed_by: user.id // Manter o mesmo admin
      });

      if (rpcError) {
        console.error('❌ [handleUpdateRejectionReason] Erro ao atualizar via RPC:', rpcError);
        throw rpcError;
      }

      if (rpcResult === false || rpcResult === null) {
        console.error('❌ [handleUpdateRejectionReason] RPC retornou false');
        throw new Error('RPC function returned false');
      }

      console.log('✅ [handleUpdateRejectionReason] Motivo atualizado via RPC com sucesso');

      // Log da ação
      try {
        await logAction(
          'identity_photo_rejection_reason_updated',
          `Identity photo rejection reason updated by platform admin: ${reason}`,
          user?.id || '',
          'admin',
          {
            acceptance_id: acceptanceId,
            student_id: student.student_id,
            student_name: student.student_name || 'N/A',
            new_rejection_reason: reason,
            updated_by: user?.email || 'Platform Admin',
            updated_at: new Date().toISOString()
          }
        );
        console.log('✅ [handleUpdateRejectionReason] Ação logada com sucesso');
      } catch (logError) {
        console.error('⚠️ [handleUpdateRejectionReason] Erro ao logar ação (não crítico):', logError);
      }

      // Invalidar e refetch queries
      queryClient.removeQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id), type: 'active' }),
        queryClient.refetchQueries({ queryKey: queryKeys.students.details(profileId), type: 'active' })
      ]);

      setDirectTermAcceptances(null); // Limpar hotfix

      console.log('✅ [handleUpdateRejectionReason] Motivo atualizado com sucesso');
    } catch (err: any) {
      console.error('❌ [handleUpdateRejectionReason] Erro ao atualizar motivo:', err);
      alert('Error updating rejection reason: ' + (err?.message || String(err)));
    } finally {
      setProcessingIdentityPhoto(false);
    }
  }, [student, user, logAction, queryClient, profileId]);

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
        // ✅ CORREÇÃO: Determinar o bucket correto baseado no caminho do arquivo
        // Transfer Form uploads estão no bucket 'document-attachments' com caminho 'transfer-forms-filled/...'
        // Outros documentos estão no bucket 'student-documents'
        let bucket = 'student-documents'; // padrão
        
        if (fileUrl.includes('transfer-forms-filled/') || fileUrl.includes('transfer-forms/')) {
          bucket = 'document-attachments';
        }
        
        // Se file_url é um path do storage, converter para URL pública
        const publicUrl = supabase.storage
          .from(bucket)
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
    console.log('🔵 [handleUploadDocument] Called with:', { appId, docType, fileName: file.name });
    
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

      // 🔔 NOTIFICAÇÕES PARA ACCEPTANCE LETTER
      // Normalizar para garantir match
      const normalizedType = docType.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isAcceptanceLetter = normalizedType.includes('acceptanceletter') || 
                                 normalizedType.includes('cartadeaceite') || 
                                 docType === 'acceptance_letter';

      console.log('🔍 [handleUploadDocument] Check type:', { docType, normalizedType, isAcceptanceLetter });

      if (isAcceptanceLetter) {
        console.log('📤 [handleUploadDocument] Enviando notificações de Acceptance Letter...');
        
        // 1. Webhook n8n (Email)
        try {
          // Buscar email do aluno se não estiver disponível diretamente (garantir)
          let studentEmail = student.student_email;
          if (!studentEmail) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('email')
              .eq('user_id', student.user_id)
              .single();
            studentEmail = profile?.email;
          }

          if (studentEmail) {
            const webhookPayload = {
              tipo_notf: "Carta de aceite enviada",
              email_aluno: studentEmail,
              nome_aluno: student.student_name,
              email_universidade: user?.email,
              o_que_enviar: "Your Acceptance Letter has been sent! Please check your documents."
            };
            
            console.log('📤 [handleUploadDocument] Enviando webhook (awaiting):', webhookPayload);
            
            // Usar await para garantir execução e debug
            const response = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            if (response.ok) {
              console.log('✅ Webhook n8n enviado com sucesso');
            } else {
              const text = await response.text();
              console.error('❌ Erro no envio do webhook n8n:', response.status, text);
            }
          } else {
            console.warn('⚠️ [handleUploadDocument] Email do aluno não encontrado, pulando webhook');
          }
        } catch (err) {
          console.error('❌ Erro ao preparar/enviar webhook acceptance letter:', err);
        }

        // 2. Notificação In-App
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          if (accessToken) {
            // Validar appId
            if (!appId) {
                console.error('❌ [handleUploadDocument] appId is missing for notification link!');
            }
            const link = appId ? `/student/dashboard/application/${appId}/chat?tab=documents` : `/student/dashboard/applications`;
            
            const notificationPayload = {
              user_id: student.user_id,
              title: 'Acceptance Letter Sent',
              message: 'Your Acceptance Letter has been uploaded. Please check your documents.',
              link: link,
              type: 'acceptance_letter'
            };

            console.log('📤 [handleUploadDocument] Payload in-app:', notificationPayload);

            const notifRes = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            
            if (notifRes.ok) {
                console.log('✅ [handleUploadDocument] Notificação in-app enviada.');
            } else {
                console.error('❌ [handleUploadDocument] Falha ao enviar notificação in-app:', await notifRes.text());
            }
          }
        } catch (err) {
          console.error('❌ Erro ao enviar notificação in-app acceptance letter:', err);
        }
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

  // ✅ Wrapper wrapper para handleUploadDocumentRequest para tratar notificações na aba Documents
  const handleUploadDocumentRequestWrapped = useCallback(async (requestId: string, file: File) => {
    console.log('🔵 [handleUploadDocumentRequestWrapped] Called with:', { requestId });
    
    // 1. Executar o upload original
    await handleUploadDocumentRequest(requestId, file);

    // 2. Verificar se é Acceptance Letter
    const request = documentRequests.find(r => r.id === requestId);
    if (!request) {
      console.warn('⚠️ [handleUploadDocumentRequestWrapped] Request não encontrado:', requestId);
      return;
    }

    console.log('🔍 [handleUploadDocumentRequestWrapped] Request found:', request);

    const title = (request.title || '').toLowerCase();
    const isAcceptanceLetter = title.includes('acceptance letter') || 
                               title.includes('carta de aceite') ||
                               title.includes('acceptance_letter');

    if (isAcceptanceLetter) {
        console.log('🔔 [handleUploadDocumentRequestWrapped] Enviando notificações para Acceptance Letter');
        const appId = request.scholarship_application_id;
        
        if (!appId) {
          console.error('❌ [handleUploadDocumentRequestWrapped] appId (scholarship_application_id) não encontrado no request! Link ficará incorreto.', request);
        }

        // 2.1 Webhook n8n
        try {
          let studentEmail = student?.student_email;
          if (!studentEmail && student?.user_id) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('email')
              .eq('user_id', student.user_id)
              .single();
            studentEmail = profile?.email;
          }

          if (studentEmail) {
             const webhookPayload = {
              tipo_notf: "Carta de aceite enviada",
              email_aluno: studentEmail,
              nome_aluno: student?.student_name || 'Student',
              email_universidade: user?.email,
              o_que_enviar: "Your Acceptance Letter has been sent! Please check your documents."
            };
            
            console.log('📤 [handleUploadDocumentRequestWrapped] Enviando webhook (awaiting):', webhookPayload);
            const response = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            if (response.ok) {
              console.log('✅ Webhook n8n enviado com sucesso');
            } else {
              const text = await response.text();
              console.error('❌ Erro no envio do webhook n8n:', response.status, text);
            }
          } else {
            console.warn('⚠️ [handleUploadDocumentRequestWrapped] Email do aluno não encontrado, pulando webhook');
          }
        } catch (err) {
            console.error('❌ Erro ao preparar/enviar webhook:', err);
        }

        // 2.2 Notificação In-App
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          if (accessToken && student?.user_id) {
             // Garantir link correto
             const link = appId ? `/student/dashboard/application/${appId}/chat?tab=documents` : '/student/dashboard/applications';
             
             const notificationPayload = {
              user_id: student.user_id,
              title: 'Acceptance Letter Sent',
              message: 'Your Acceptance Letter has been uploaded. Please check your documents.',
              link: link,
              type: 'acceptance_letter'
            };
            
            console.log('📤 [handleUploadDocumentRequestWrapped] Payload in-app:', notificationPayload);
            const notifRes = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            
            if (notifRes.ok) {
                console.log('✅ Notificação in-app enviada');
            } else {
                console.error('❌ Erro envio in-app:', await notifRes.text());
            }
            
          }
        } catch (err) {
            console.error('❌ Erro ao enviar notificação in-app:', err);
        }
    } else {
        console.log('ℹ️ [handleUploadDocumentRequestWrapped] Not Sending Notification. Title match fail:', title);
    }
  }, [handleUploadDocumentRequest, documentRequests, student, user]);

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

      // Log da ação
      try {
        await logAction(
          'application_approval',
          `Application approved by platform admin`,
          user?.id || '',
          'admin',
          {
            application_id: applicationId,
            student_id: student.student_id,
            student_name: student.student_name || 'N/A',
            approved_by: user?.email || 'Platform Admin',
            approved_at: new Date().toISOString()
          }
        );
        console.log('✅ [approveApplication] Ação logada com sucesso');
      } catch (logError) {
        console.error('⚠️ [approveApplication] Erro ao logar ação (não crítico):', logError);
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
  }, [student, isPlatformAdmin, user, setStudent, profileId, queryClient, logAction, rejectStudentReason]);

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
      
      // Log da ação
      try {
        await logAction(
          'application_rejection',
          `Application rejected by platform admin: ${rejectStudentReason || 'No reason provided'}`,
          user?.id || '',
          'admin',
          {
            application_id: applicationId,
            student_id: student.student_id,
            student_name: student.student_name || 'N/A',
            rejection_reason: rejectStudentReason || null,
            rejected_by: user?.email || 'Platform Admin',
            rejected_at: new Date().toISOString()
          }
        );
        console.log('✅ [rejectApplication] Ação logada com sucesso');
      } catch (logError) {
        console.error('⚠️ [rejectApplication] Erro ao logar ação (não crítico):', logError);
      }
      
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
      // Buscar identity_photo_path e identity_photo_name se não estiverem no acceptance
      let identityPhotoPath = acceptance.identity_photo_path;
      let identityPhotoName = acceptance.identity_photo_name;
      
      // Se não estiverem no acceptance, buscar do banco
      if (!identityPhotoPath && acceptance.id) {
        const { data: termAcceptanceData, error: termError } = await supabase
          .from('comprehensive_term_acceptance')
          .select('identity_photo_path, identity_photo_name')
          .eq('id', acceptance.id)
          .maybeSingle();
        
        if (!termError && termAcceptanceData) {
          identityPhotoPath = termAcceptanceData.identity_photo_path;
          identityPhotoName = termAcceptanceData.identity_photo_name;
        }
      }
      
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
        term_content: acceptance.term_content || '',
        identity_photo_path: identityPhotoPath || undefined,
        identity_photo_name: identityPhotoName || undefined
      };
      
      // Gerar e baixar o PDF (agora é assíncrono)
      await generateTermAcceptancePDF(pdfData);
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

      console.log('✅ [handleSaveEditFees] Overrides salvos no banco:', {
        selection_process: editingFees.selection_process,
        scholarship: editingFees.scholarship,
        i20_control: editingFees.i20_control
      });

      // Log da ação
      try {
        await logAction(
          'fee_override_update',
          `Fee overrides updated by platform admin`,
          user?.id || '',
          'admin',
          {
            selection_process_fee: editingFees.selection_process,
            scholarship_fee: editingFees.scholarship,
            i20_control_fee: editingFees.i20_control,
            updated_by: user?.email || 'Platform Admin'
          }
        );
      } catch (logError) {
        console.error('Failed to log fee override update:', logError);
      }

      setEditingFees(null);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
      
      // ✅ Aguardar um pouco para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // ✅ Recarregar realPaidAmounts E userFeeOverrides após salvar fees
      // Isso garante que os valores estejam atualizados quando iniciar nova edição
      await Promise.all([
        reloadRealPaidAmounts(),
        loadUserFeeOverrides()
      ]);
      
      // ✅ Forçar recarregamento de overrides no PaymentStatusCard
      setOverridesRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error saving fee overrides:', error);
      alert('Erro ao salvar as taxas personalizadas: ' + error.message);
    } finally {
      setSavingFees(false);
    }
  }, [editingFees, student, user, logAction, profileId, queryClient, reloadRealPaidAmounts]);

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

      // Log da ação
      try {
        await logAction(
          'fee_override_reset',
          `Fee overrides reset to default by platform admin`,
          user?.id || '',
          'admin',
          {
            reset_by: user?.email || 'Platform Admin'
          }
        );
      } catch (logError) {
        console.error('Failed to log fee override reset:', logError);
      }

      setEditingFees(null);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.secondaryData(student?.user_id) });
      
      // ✅ Recarregar realPaidAmounts E userFeeOverrides após resetar fees
      // Isso garante que os valores estejam atualizados quando iniciar nova edição
      await Promise.all([
        reloadRealPaidAmounts(),
        loadUserFeeOverrides()
      ]);
      
      // ✅ Forçar recarregamento de overrides no PaymentStatusCard
      setOverridesRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error resetting fees:', error);
      alert('Erro ao resetar as taxas: ' + error.message);
    } finally {
      setSavingFees(false);
    }
  }, [student, user, logAction, profileId, queryClient, reloadRealPaidAmounts]);

  // Handler para iniciar edição de fees
  const handleStartEditFees = useCallback(async () => {
    if (!student) return;
    
    // ✅ IMPORTANTE: Recarregar realPaidAmounts antes de iniciar edição
    await reloadRealPaidAmounts();
    
    // ✅ Buscar overrides diretamente do banco para garantir valores atualizados
    // Isso evita problemas de closure com o estado do hook
    let currentOverrides: {
      selection_process_fee?: number;
      scholarship_fee?: number;
      i20_control_fee?: number;
    } | null = null;
    
    try {
      // ✅ Forçar nova query sem cache adicionando timestamp
      const { data: overrideData, error: overrideError } = await supabase
        .from('user_fee_overrides')
        .select('selection_process_fee, scholarship_fee, i20_control_fee, updated_at')
        .eq('user_id', student.user_id)
        .maybeSingle();
      
      if (overrideError && overrideError.code !== 'PGRST116') {
        console.error('❌ [handleStartEditFees] Erro ao buscar overrides:', overrideError);
      }
      
      if (!overrideError && overrideData) {
        currentOverrides = {
          selection_process_fee: overrideData.selection_process_fee != null ? Number(overrideData.selection_process_fee) : undefined,
          scholarship_fee: overrideData.scholarship_fee != null ? Number(overrideData.scholarship_fee) : undefined,
          i20_control_fee: overrideData.i20_control_fee != null ? Number(overrideData.i20_control_fee) : undefined,
        };
        console.log('✅ [handleStartEditFees] Overrides encontrados no banco:', currentOverrides);
      } else {
        console.log('ℹ️ [handleStartEditFees] Nenhum override encontrado para este usuário');
      }
    } catch (error) {
      console.error('❌ [handleStartEditFees] Erro ao buscar overrides:', error);
    }
    
    // ✅ Buscar affiliate admin email do aluno para verificar se deve aplicar custo de dependentes
    let studentAffiliateAdminEmail: string | null = null;
    if (student.seller_referral_code) {
      try {
        const { data: result, error } = await supabase.rpc('get_affiliate_admin_email_by_seller_code', {
          seller_code: student.seller_referral_code
        });
        
        if (!error && result && result.length > 0 && result[0]?.email) {
          studentAffiliateAdminEmail = result[0].email;
        }
      } catch (error) {
        console.error('Error fetching student affiliate admin email:', error);
      }
    }
    
    // ✅ Verificar se é do affiliate admin "contato@brantimmigration.com" para aplicar valores fixos
    const isBrantImmigrationAffiliate = studentAffiliateAdminEmail?.toLowerCase() === 'contato@brantimmigration.com';
    
    // ✅ Se a fee já foi paga, usar o valor realmente pago (realPaidAmounts) como padrão
    // Caso contrário, usar o valor calculado/esperado
    // Nota: realPaidAmounts foi recarregado acima, então agora está atualizado
    
    // Selection Process Fee
    let selectionProcessValue: number;
    if (student.has_paid_selection_process_fee && realPaidAmounts?.selection_process !== undefined && realPaidAmounts?.selection_process !== null) {
      // Se já foi pago, usar o valor realmente pago
      selectionProcessValue = realPaidAmounts.selection_process;
    } else {
      // Se não foi pago, calcular o valor esperado
      
      // ✅ PRIORIDADE 1: Verificar override primeiro (antes de Brant)
      if (currentOverrides?.selection_process_fee !== undefined && currentOverrides?.selection_process_fee !== null) {
      // Se tem override, usar o valor do override diretamente
        selectionProcessValue = currentOverrides.selection_process_fee;
        console.log('✅ [handleStartEditFees] Selection Process usando override:', selectionProcessValue);
      } else if (isBrantImmigrationAffiliate) {
        // ✅ PRIORIDADE 2: Se for do affiliate admin "contato@brantimmigration.com", usar valores fixos
        // Selection Process: $400 base + $150 por dependente
        selectionProcessValue = 400 + (dependents * 150);
    } else {
        // Caso contrário, calcular normalmente
      const hasMatrFromSellerCode = student?.seller_referral_code && /^MATR/i.test(student.seller_referral_code);
      const hasMatrDiscount = hasMatriculaRewardsDiscount || hasMatrFromSellerCode;
      
      let base: number;
      if (hasMatrDiscount) {
        base = 350; // $400 - $50 desconto
      } else {
        const systemType = userSystemType || 'legacy';
        base = systemType === 'simplified' ? 350 : 400;
      }
        
        // Para legacy, dependentes só se for do Brant (já tratado acima)
        selectionProcessValue = base;
      }
    }
    
    // Scholarship Fee
    let scholarshipValue: number;
    if (student.is_scholarship_fee_paid && realPaidAmounts?.scholarship !== undefined && realPaidAmounts?.scholarship !== null) {
      // Se já foi pago, usar o valor realmente pago
      scholarshipValue = realPaidAmounts.scholarship;
    } else {
      // ✅ PRIORIDADE 1: Verificar override primeiro (antes de Brant)
      if (currentOverrides?.scholarship_fee !== undefined && currentOverrides?.scholarship_fee !== null) {
        // Se tem override, usar o valor do override diretamente
        scholarshipValue = currentOverrides.scholarship_fee;
        console.log('✅ [handleStartEditFees] Scholarship usando override:', scholarshipValue);
      } else if (isBrantImmigrationAffiliate) {
        // ✅ PRIORIDADE 2: Valor fixo para Brant: $900
        scholarshipValue = 900;
      } else {
        // Caso contrário, usar getFeeAmount que já considera overrides
        scholarshipValue = getFeeAmount('scholarship_fee');
      }
    }
    
    // I-20 Control Fee
    let i20ControlValue: number;
    if (student.has_paid_i20_control_fee && realPaidAmounts?.i20_control !== undefined && realPaidAmounts?.i20_control !== null) {
      // Se já foi pago, usar o valor realmente pago
      i20ControlValue = realPaidAmounts.i20_control;
    } else {
      // ✅ PRIORIDADE 1: Verificar override primeiro (antes de Brant)
      if (currentOverrides?.i20_control_fee !== undefined && currentOverrides?.i20_control_fee !== null) {
        // Se tem override, usar o valor do override diretamente
        i20ControlValue = currentOverrides.i20_control_fee;
        console.log('✅ [handleStartEditFees] I-20 Control usando override:', i20ControlValue);
      } else if (isBrantImmigrationAffiliate) {
        // ✅ PRIORIDADE 2: Valor fixo para Brant: $900
        i20ControlValue = 900;
      } else {
        // Caso contrário, usar getFeeAmount que já considera overrides
        i20ControlValue = getFeeAmount('i20_control_fee');
      }
    }
    
    const finalFees = {
      selection_process: selectionProcessValue,
      scholarship: scholarshipValue,
      i20_control: i20ControlValue
    };
    
    console.log('✅ [handleStartEditFees] Valores finais para edição:', finalFees);
    console.log('✅ [handleStartEditFees] Overrides usados:', currentOverrides);
    
    setEditingFees(finalFees);
    
    // ✅ Verificar se o estado foi atualizado (usar setTimeout para verificar após o próximo render)
    setTimeout(() => {
      console.log('🔍 [handleStartEditFees] Estado editingFees após setEditingFees (verificação):', finalFees);
    }, 100);
  }, [student, getFeeAmount, userSystemType, hasMatriculaRewardsDiscount, dependents, realPaidAmounts, reloadRealPaidAmounts]);

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
      
      // Log da ação
      try {
        await logAction(
          'payment_method_update',
          `Payment method for ${feeType} updated to ${method} by platform admin`,
          user?.id || '',
          'admin',
          {
            fee_type: feeType,
            payment_method: method,
            updated_by: user?.email || 'Platform Admin'
          }
        );
      } catch (logError) {
        console.error('Failed to log payment method update:', logError);
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
  }, [student, isPlatformAdmin, paymentMethod, user, logAction, profileId, queryClient]);

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
                  const currentValue = student.student_process_type || 'initial';
                  // Garantir que o valor é válido (está nas opções do select)
                  const validValues = ['initial', 'transfer', 'change_of_status', 'enrolled'];
                  const validValue = validValues.includes(currentValue) ? currentValue : 'initial';
                  console.log('🔍 [AdminStudentDetails] Editando Process Type:', { currentValue, validValue });
                  setIsEditingProcessType(true);
                  setEditingProcessType(validValue);
                }}
                onSaveProcessType={async () => {
                  setSavingProcessType(true);
                  
                  try {
                    // student_process_type está na tabela scholarship_applications, não em user_profiles
                    // Precisamos atualizar todas as aplicações do estudante ou a aplicação ativa/locked
                    const applications = student.all_applications || [];
                    
                    if (applications.length === 0) {
                      alert('Error: Student has no applications. Cannot update process type.');
                      setSavingProcessType(false);
                      return;
                    }
                    
                    // Atualizar todas as aplicações do estudante com o novo process type
                    const applicationIds = applications.map((app: any) => app.id).filter(Boolean);
                    
                    if (applicationIds.length === 0) {
                      alert('Error: No valid application IDs found.');
                      setSavingProcessType(false);
                      return;
                    }
                    
                    console.log('🔄 [onSaveProcessType] Atualizando student_process_type em aplicações:', applicationIds);
                    
                    const { error: updateError } = await supabase
                      .from('scholarship_applications')
                      .update({ student_process_type: editingProcessType })
                      .in('id', applicationIds);
                    
                    if (updateError) {
                      console.error('❌ [onSaveProcessType] Erro ao atualizar:', updateError);
                      throw updateError;
                    }
                    
                    console.log('✅ [onSaveProcessType] student_process_type atualizado com sucesso');
                    
                    // Atualizar estado local imediatamente
                    setStudent((prev: any) => {
                      if (!prev) return prev;
                      // Atualizar todas as aplicações no estado local
                      const updatedApps = (prev.all_applications || []).map((app: any) => ({
                        ...app,
                        student_process_type: editingProcessType
                      }));
                      return { 
                        ...prev, 
                        student_process_type: editingProcessType,
                        all_applications: updatedApps
                      } as any;
                    });
                    
                    // Invalidar queries para garantir sincronização
                    queryClient.invalidateQueries({ queryKey: queryKeys.students.details(profileId) });
                    
                    // Log da ação
                    try {
                      await logAction(
                        'process_type_update',
                        `Student process type updated by platform admin to: ${editingProcessType}`,
                        user?.id || '',
                        'admin',
                        {
                          student_id: student.student_id,
                          student_name: student.student_name || 'N/A',
                          old_process_type: student.student_process_type || 'N/A',
                          new_process_type: editingProcessType,
                          updated_by: user?.email || 'Platform Admin',
                          updated_at: new Date().toISOString(),
                          application_ids: applicationIds
                        }
                      );
                      console.log('✅ [onSaveProcessType] Ação logada com sucesso');
                    } catch (logError) {
                      console.error('⚠️ [onSaveProcessType] Erro ao logar ação (não crítico):', logError);
                    }
                    
                    setIsEditingProcessType(false);
                  } catch (error: any) {
                    console.error('❌ [onSaveProcessType] Erro ao atualizar process type:', error);
                    alert('Error updating process type: ' + (error?.message || 'Unknown error'));
                  } finally {
                    setSavingProcessType(false);
                  }
                }}
                onCancelProcessType={() => {
                  setIsEditingProcessType(false);
                  setEditingProcessType(student.student_process_type || 'initial');
                }}
                onProcessTypeChange={(value) => {
                  console.log('🔍 [AdminStudentDetails] Process Type mudou para:', value);
                  setEditingProcessType(value);
                }}
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
                loadingPaidAmounts={loadingPaidAmounts}
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
                overridesRefreshKey={overridesRefreshKey}
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
            
            {/* Identity Photo Verification Card */}
            {(() => {
              const combinedTermAcceptances = (termAcceptances && termAcceptances.length > 0)
                ? termAcceptances
                : (directTermAcceptances || []);

              const checkoutTermsAcceptances = combinedTermAcceptances.filter(acc => acc.term_type === 'checkout_terms');
              let identityPhotoAcceptance = checkoutTermsAcceptances.find(acc => {
                // aceitar caminhos em diferentes chaves ou formatos
                const path = acc.identity_photo_path || acc.identity_photo || acc.photo_path || null;
                return path && String(path).trim() !== '';
              });

              // Fallback: se não encontrar por caminho, usar o primeiro checkout_terms disponível
              if (!identityPhotoAcceptance && checkoutTermsAcceptances.length > 0) {
                console.log('ℹ️ [AdminStudentDetails] identityPhotoAcceptance não encontrada por path — usando primeiro checkout_terms como fallback');
                identityPhotoAcceptance = checkoutTermsAcceptances[0];
              }

              if (termAcceptances.length > 0 || checkoutTermsAcceptances.length > 0) {
                // Debug logs (useful during local development)
                console.log('🔍 [AdminStudentDetails] checkoutTermsAcceptances:', checkoutTermsAcceptances);
                console.log('🔍 [AdminStudentDetails] identityPhotoAcceptance:', identityPhotoAcceptance);
                if (identityPhotoAcceptance) {
                  console.log('🔍 [AdminStudentDetails] identityPhotoAcceptance.status:', identityPhotoAcceptance.identity_photo_status);
                  console.log('🔍 [AdminStudentDetails] identityPhotoAcceptance.rejection_reason:', identityPhotoAcceptance.identity_photo_rejection_reason);
                }
              }

              return identityPhotoAcceptance ? (
                <Suspense fallback={<div className="animate-pulse bg-slate-100 h-64 rounded-2xl"></div>}>
                  <IdentityPhotoVerificationCard
                    termAcceptance={identityPhotoAcceptance}
                    onApprove={handleApproveIdentityPhoto}
                    onReject={handleRejectIdentityPhoto}
                    onUpdateRejectionReason={handleUpdateRejectionReason}
                    isProcessing={processingIdentityPhoto}
                  />
                </Suspense>
              ) : null;
            })()}
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
              onUploadDocument={handleUploadDocumentRequestWrapped}
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

