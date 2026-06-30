import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  Clock,
  Search,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  XCircle,
  GraduationCap,
  Briefcase,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStepByStepGuide } from '../../hooks/useStepByStepGuide';
import { useCartStore } from '../../stores/applicationStore';
import StepByStepGuide from '../../components/OnboardingTour/StepByStepGuide';
import {
  useStudentApplicationsQuery,
  useStudentDocumentsQuery
} from '../../hooks/useStudentDashboardQueries';

import './Overview.css';

// --- Sub-componente do Passo 1 do Onboarding ---
interface Step1SelectionFeeCTAProps {
  onStart: () => void;
  t: any;
}

const Step1SelectionFeeCTA: React.FC<Step1SelectionFeeCTAProps> = ({ onStart, t }) => {
  return (
    <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-[#05294E] p-6 sm:p-10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-8 border border-white/10 ring-1 ring-white/5">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

      {/* Glassmorphism Overlay Layer */}
      <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-[2px] pointer-events-none" />
      
      <div className="relative z-10">
        {/* Step Progress Trail */}
        <div className="w-full flex justify-center mb-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Dots Trail */}
            <div className="flex items-center gap-3">
              {/* Ghost dot and line for Step 1 to keep the active dot centered */}
              <div className="w-2 h-2 opacity-0" />
              <div className="w-10 h-0.5 opacity-0" />

              {/* Active Dot */}
              <div className="relative">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] relative z-10" 
                />
                <div className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping opacity-40" />
              </div>
              
              {/* Connector line and Next dot */}
              <div className="w-10 h-0.5 bg-gradient-to-r from-white/60 to-white/10 rounded-full" />
              <div className="w-2 h-2 bg-white/20 rounded-full" />
            </div>

            {/* Label */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-1.5">
              <span className="text-white font-bold text-[10px] sm:text-xs uppercase tracking-[0.15em]">
                {t('studentDashboard.onboardingStep1.stepLabel')}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Main Content Area: Text + Image */}
        <div className="flex flex-col lg:flex-row items-center gap-10 mb-10">
          <div className="flex-1 lg:max-w-2xl">
            {/* Title & Description */}
            <div className="mb-8">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight"
              >
                {t('studentDashboard.onboardingStep1.title')}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/80 text-sm sm:text-lg md:text-xl leading-relaxed"
              >
                {t('studentDashboard.onboardingStep1.description')}
              </motion.p>
            </div>

            {/* Benefit Tags */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <div className="inline-flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 text-xs sm:text-sm font-medium hover:bg-white/10 transition-colors cursor-default">
                <GraduationCap className="w-5 h-5 mr-3 text-blue-400" />
                {t('studentDashboard.onboardingStep1.benefit1')}
              </div>
              <div className="inline-flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 text-xs sm:text-sm font-medium hover:bg-white/10 transition-colors cursor-default">
                <Briefcase className="w-5 h-5 mr-3 text-blue-400" />
                {t('studentDashboard.onboardingStep1.benefit2')}
              </div>
              <div className="inline-flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 text-xs sm:text-sm font-medium hover:bg-white/10 transition-colors cursor-default">
                <RefreshCw className="w-5 h-5 mr-3 text-blue-400" />
                {t('studentDashboard.onboardingStep1.benefit3')}
              </div>
            </motion.div>
          </div>

          {/* Right Side Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full lg:w-1/3 aspect-[16/9] lg:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/60 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
            <img 
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/group-four-students-graduation-blue-gown.webp" 
              alt={t('studentDashboard.onboardingStep1.imageAlt')}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              style={{ objectPosition: '65% 50%' }} // Ajuste aqui a posição da imagem (X% Y%)
            />
          </motion.div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* Footer Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center text-white/80"
          >
            <p className="text-sm sm:text-base font-medium tracking-wide text-center sm:text-left">
              {t('studentDashboard.onboardingStep1.urgencyNoticeBefore')}<span className="text-white font-bold">{t('studentDashboard.onboardingStep1.urgencyNoticeBold')}</span>{t('studentDashboard.onboardingStep1.urgencyNoticeAfter')}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center sm:items-end gap-2"
          >
            <button
              onClick={onStart}
              className="group relative inline-flex items-center justify-center bg-white text-[#05294E] px-12 py-5 rounded-2xl font-black text-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
            >
              {t('studentDashboard.onboardingStep1.startBtn')}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Overview: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, userProfile, refetchUserProfile } = useAuth();
  const { isGuideOpen, closeGuide } = useStepByStepGuide();

  // Hooks de dados — declarados antes dos useMemos que dependem deles
  const { data: applications = [] } = useStudentApplicationsQuery(userProfile?.id);
  const { data: studentDocuments = [], isLoading: documentsLoading } = useStudentDocumentsQuery(user?.id);

  // Threshold para obrigatoriedade do questionário: 18/02/2026
  const SURVEY_THRESHOLD_DATE = new Date('2026-02-18T21:50:00Z');
  const paidAt = userProfile?.selection_process_paid_at ? new Date(userProfile.selection_process_paid_at) : null;
  const isExemptedByLegacy = userProfile?.has_paid_selection_process_fee && (!paidAt || paidAt < SURVEY_THRESHOLD_DATE);

  // Verificar qual o passo de onboarding correto baseado no banco de dados
  const savedOnboardingStep = React.useMemo(() => {
    if (typeof window === 'undefined') return null;

    const validSteps = [
      'selection_fee', 'identity_verification', 'selection_survey',
      'scholarship_selection', 'process_type', 'documents_upload',
      'payment', 'ambassador_program', 'scholarship_fee', 'placement_fee',
      'reinstatement_fee', 'my_applications', 'completed'
    ];

    // 1. FONTE PRIMÁRIA: step salvo no banco de dados
    const dbStep = (userProfile as any)?.onboarding_current_step;

    if (dbStep && validSteps.includes(dbStep)) {
      // Bloqueio: sem taxa de seleção paga, não avança
      if (userProfile && !userProfile.has_paid_selection_process_fee) {
        const stepsAfterSelection = [
          'scholarship_selection', 'process_type', 'documents_upload',
          'payment', 'ambassador_program', 'scholarship_fee', 'placement_fee',
          'reinstatement_fee', 'my_applications', 'waiting_approval', 'completed'
        ];
        if (stepsAfterSelection.includes(dbStep)) {
          return 'selection_fee';
        }
      }

      // Bloqueio: step salvo pode estar stale após mudança de fluxo pelo admin.
      // Ex: aluno era old flow (scholarship_fee salvo) e virou new flow (placement_fee_flow=true).
      // Validar se o step ainda existe no conjunto de steps válidos para o perfil atual.
      if (userProfile && ['ambassador_program', 'scholarship_fee', 'placement_fee'].includes(dbStep)) {
        const isNewFlow = !!(userProfile as any).placement_fee_flow;
        const isTransferInactive = userProfile.student_process_type === 'transfer' && (userProfile as any).visa_transfer_active === false;
        const rewardsAlreadySeen = !!(userProfile as any).rewards_popup_shown_at;
        const isStaleAmbassadorStep = dbStep === 'ambassador_program' && rewardsAlreadySeen;
        const isStaleScholarshipStep = dbStep === 'scholarship_fee' && (isNewFlow || isTransferInactive);
        const isStalePlacementStep = dbStep === 'placement_fee' && (!isNewFlow || isTransferInactive);

        if (!isStaleAmbassadorStep && !isStaleScholarshipStep && !isStalePlacementStep) {
          // Step stale — cai para o fallback
          return dbStep;
        }
      } else {
        return dbStep;
      }
    }

    // 2. FALLBACK: calcular baseado nas flags do perfil (usuários sem campo preenchido)
    let calculatedStep: string | null = 'selection_fee';

    if (userProfile) {
      const { cart } = useCartStore.getState();
      const hasCartItems = cart.length > 0;
      const hasAppsInSystem = applications.length > 0;
      const anyAppPaidOrApproved = applications.some(app =>
        app.is_application_fee_paid ||
        ['approved', 'enrolled', 'under_review'].includes(app.status)
      );
      const hasPaidPackage = !!(userProfile as any).has_paid_ds160_package || !!(userProfile as any).has_paid_i539_cos_package;
      const anyScholarshipFeePaid = applications.some(app => app.is_scholarship_fee_paid) || userProfile.is_scholarship_fee_paid || hasPaidPackage;
      const placementFeePaid = !!(userProfile as any).is_placement_fee_paid;
      const reinstatementFeePaid = !!(userProfile as any).has_paid_reinstatement_package;
      const hasGlobalFeePaid = userProfile.is_application_fee_paid || !!userProfile.application_fee_paid_at || !!userProfile.scholarship_fee_paid_at || placementFeePaid || anyAppPaidOrApproved || hasPaidPackage;
      const hasDocsGlobal = userProfile.documents_uploaded || !!userProfile.application_fee_paid_at || anyAppPaidOrApproved || hasPaidPackage;

      // Verificar Process Type (situação do visto)
      const userProcessTypeKey = `studentProcessType_${userProfile.id}`;
      const storedProcessType = typeof window !== 'undefined' ? (window.localStorage.getItem(userProcessTypeKey) || window.localStorage.getItem('studentProcessType')) : null;
      const effectiveProcessType = userProfile.student_process_type || applications[0]?.student_process_type || storedProcessType;
      const hasProcessType = !!effectiveProcessType && ['initial', 'transfer', 'change_of_status', 'resident'].includes(effectiveProcessType);
      const isNewFlow = !!(userProfile as any).placement_fee_flow;
      const isTransferInactive = effectiveProcessType === 'transfer' && (userProfile as any).visa_transfer_active === false;
      const rewardsAlreadySeen = !!(userProfile as any).rewards_popup_shown_at;

      if (userProfile.onboarding_completed) {
        calculatedStep = 'completed';
      } else if (!userProfile.has_paid_selection_process_fee) {
        calculatedStep = 'selection_fee';
      } else if (!userProfile.selection_survey_passed && !isExemptedByLegacy && !hasDocsGlobal && !hasGlobalFeePaid) {
        calculatedStep = 'selection_survey';
      } else if (!userProfile.selected_scholarship_id && !hasAppsInSystem && !hasCartItems && !hasDocsGlobal && !hasGlobalFeePaid) {
        calculatedStep = 'scholarship_selection';
      } else if (!hasProcessType && !hasDocsGlobal && !hasGlobalFeePaid) {
        calculatedStep = 'process_type';
      } else if (!hasDocsGlobal && userProfile.documents_status !== 'approved') {
        calculatedStep = 'documents_upload';
      } else if (!hasGlobalFeePaid) {
        calculatedStep = 'payment';
      } else if (!rewardsAlreadySeen && !placementFeePaid && !anyScholarshipFeePaid && !reinstatementFeePaid) {
        calculatedStep = 'ambassador_program';
      } else if (isNewFlow && !placementFeePaid && !isTransferInactive) {
        calculatedStep = 'placement_fee';
      } else if (!isNewFlow && !anyScholarshipFeePaid && effectiveProcessType !== 'resident' && !isTransferInactive) {
        calculatedStep = 'scholarship_fee';
      } else if (isTransferInactive && !reinstatementFeePaid) {
        calculatedStep = 'reinstatement_fee';
      } else {
        calculatedStep = 'my_applications';
      }
    }

    return calculatedStep;
  }, [userProfile, applications, isExemptedByLegacy]);

  const hasSavedOnboardingStep = savedOnboardingStep !== null;
  const isOnboardingStarted = hasSavedOnboardingStep && savedOnboardingStep !== 'selection_fee' && savedOnboardingStep !== 'welcome';

  // Aplicações recentes ordenadas por data
  const recentApplications = [...applications]
    .sort((a: any, b: any) => new Date(b.applied_at ?? b.created_at ?? 0).getTime() - new Date(a.applied_at ?? a.created_at ?? 0).getTime())
    .slice(0, 5);

  const [visibleApplications, setVisibleApplications] = useState(5);

  const hasMoreApplications = recentApplications.length > visibleApplications;
  const displayedApplications = recentApplications.slice(0, visibleApplications);

  const handleLoadMore = () => {
    setVisibleApplications(prev => Math.min(prev + 5, recentApplications.length));
  };

  // Refetch perfil quando necessário (ex: após atualização)
  useEffect(() => {
    if (user?.id) {
      refetchUserProfile();
    }
  }, [user?.id, refetchUserProfile]);




  // Redirecionamento automático para o onboarding via query param ou fallback localStorage
  useEffect(() => {
    const shouldOpenModal = searchParams.get('openModal') || localStorage.getItem('pending_open_modal');

    if (shouldOpenModal === 'selection_process') {
      console.log('[Overview] Redirecionando para onboarding:', searchParams.get('openModal') ? 'Query Param' : 'LocalStorage');

      // Limpar o parâmetro da URL e o localStorage
      if (searchParams.get('openModal')) {
        searchParams.delete('openModal');
        setSearchParams(searchParams, { replace: true });
      }
      localStorage.removeItem('pending_open_modal');

      // Redirecionar para o fluxo de onboarding
      navigate('/student/onboarding?step=selection_fee');
    }
  }, [searchParams, setSearchParams, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'enrolled': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'under_review': return Clock;
      case 'pending': return Clock;
      case 'enrolled': return CheckCircle;
      default: return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
      case 'enrolled':
        return t('studentDashboard.myApplications.statusLabels.approvedByUniversity');
      case 'rejected':
        return t('studentDashboard.myApplications.statusLabels.notSelectedForScholarship');
      case 'pending':
        return t('studentDashboard.myApplications.statusLabels.pending');
      case 'under_review':
        return t('studentDashboard.myApplications.statusLabels.underReview');
      default:
        return status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
  };

  // Funções para verificar o status de cada seção do perfil
  const checkBasicInformationComplete = (): boolean => {
    if (!userProfile) return false;
    return !!(
      userProfile.full_name &&
      userProfile.phone &&
      userProfile.country
    );
  };

  const checkAcademicDetailsComplete = (): boolean => {
    if (!userProfile) return false;
    return !!(
      userProfile.field_of_interest &&
      userProfile.academic_level &&
      userProfile.gpa !== null &&
      userProfile.gpa !== undefined &&
      userProfile.english_proficiency
    );
  };

  const checkDocumentsUploaded = (): boolean => {
    if (documentsLoading) return false;

    const requiredDocTypes = ['passport', 'diploma', 'funds_proof'];
    const uploadedDocTypes = new Set(
      studentDocuments
        .filter(doc => doc.file_url && doc.status !== 'rejected')
        .map(doc => doc.type)
    );

    return requiredDocTypes.every(type => uploadedDocTypes.has(type));
  };

  // Status de cada seção
  const basicInfoComplete = checkBasicInformationComplete();
  const academicDetailsComplete = checkAcademicDetailsComplete();
  const documentsComplete = checkDocumentsUploaded();



  // Mapeamento de step de onboarding para número de exibição
  type OnboardingStepKey =
    | 'selection_fee' | 'identity_verification' | 'selection_survey'
    | 'scholarship_selection' | 'process_type' | 'documents_upload'
    | 'payment' | 'ambassador_program' | 'scholarship_fee' | 'placement_fee'
    | 'reinstatement_fee' | 'university_documents' | 'waiting_approval'
    | 'my_applications' | 'completed';

  const STEP_NUMBER_MAP: Record<OnboardingStepKey, number> = {
    'selection_fee': 1,
    'identity_verification': 2,
    'selection_survey': 2,
    'scholarship_selection': 3,
    'process_type': 4,
    'documents_upload': 5,
    'payment': 6,
    'ambassador_program': 7,
    'scholarship_fee': 7,
    'placement_fee': 7,
    'reinstatement_fee': 7,
    'university_documents': 7,
    'waiting_approval': 7,
    'my_applications': 7,
    'completed': 7,
  };
  const TOTAL_ONBOARDING_STEPS = 7;

  const currentStepKey = (savedOnboardingStep || 'selection_fee') as OnboardingStepKey;
  const currentStepNumber = STEP_NUMBER_MAP[currentStepKey] ?? 1;
  let currentStepLabel = t(`studentDashboard.progressBar.onboardingBanner.stepLabels.${currentStepKey}`);
  let currentStepDescription = t(`studentDashboard.progressBar.onboardingBanner.stepDescriptions.${currentStepKey}`);

  if (currentStepKey === 'selection_fee' && !userProfile?.has_paid_selection_process_fee) {
    currentStepLabel = t('studentDashboard.progressBar.onboardingBanner.stepLabels.selection_fee_pending');
    currentStepDescription = t('studentDashboard.progressBar.onboardingBanner.stepDescriptions.selection_fee_pending');
  }

  const isStep1Pending = currentStepKey === 'selection_fee' && !userProfile?.has_paid_selection_process_fee;

  return (
    <div className="overview-dashboard-container pt-2">


      {/* Mensagem de boas‑vindas movida para o hero */}

      {/* Alerta de desconto duplicado removido para evitar repetição com a mensagem de boas‑vindas */}

      {/* Welcome Message */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
          {t('studentDashboard.welcome')}, {userProfile?.full_name || user?.email || t('studentDashboard.title').replace(' Dashboard', '')}!
        </h2>
      </div>

      {/* Onboarding Banner / Hero */}
      {isStep1Pending ? (
        <Step1SelectionFeeCTA
          onStart={() => navigate('/student/onboarding?step=selection_fee')}
          t={t}
        />
      ) : (
        <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-[#05294E] p-6 sm:p-10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-8 border border-white/10 ring-1 ring-white/5">
          {/* Dynamic Background Blobs */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
          
          {/* Glassmorphism Overlay Layer */}
          <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-[2px] pointer-events-none" />

          <div className="relative z-10">
            {/* Indicador de passo atual do onboarding - Seamless Style Vertical */}
            {!userProfile?.onboarding_completed && (
              <div className="mt-6 sm:mt-0 sm:-mt-2 mb-10 flex flex-col items-center text-center mx-auto w-full max-w-3xl px-4">
                {/* New Premium Progress Trail */}
                {currentStepKey !== 'my_applications' && (
                  <div className="flex flex-col items-center gap-6 mb-12 sm:mb-16">
                    {/* Dots Trail */}
                    <div className="flex items-center gap-3">
                      {/* Ghost dot if first step, or real Previous Step Dot */}
                      {currentStepNumber === 1 ? (
                        <>
                          <div className="w-2 h-2 opacity-0" />
                          <div className="w-10 h-0.5 opacity-0" />
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-white/20 rounded-full" />
                          <div className="w-10 h-0.5 bg-gradient-to-r from-white/10 to-white/40 rounded-full" />
                        </>
                      )}

                      {/* Active Step Dot */}
                      <div className="relative">
                        <div className="w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)] relative z-10" />
                        <div className="absolute inset-0 w-3.5 h-3.5 bg-white rounded-full animate-ping opacity-40" />
                      </div>

                      {/* Next Step Dot or Ghost dot if last step */}
                      {currentStepNumber < TOTAL_ONBOARDING_STEPS ? (
                        <>
                          <div className="w-10 h-0.5 bg-gradient-to-r from-white/40 to-white/10 rounded-full" />
                          <div className="w-2 h-2 bg-white/20 rounded-full" />
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-0.5 opacity-0" />
                          <div className="w-2 h-2 opacity-0" />
                        </>
                      )}
                    </div>

                    {/* Step Label - Translucent Glass Style */}
                    <div className="inline-flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 shadow-xl ring-1 ring-white/10">
                      <span className="text-white font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em]">
                        {currentStepLabel}
                      </span>
                    </div>
                  </div>
                )}

                {/* Texto do passo */}
                <div className="flex flex-col items-center justify-center min-w-0">
                  <p className="text-white font-black text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tighter">{currentStepLabel}</p>
                  <p className="text-white/80 text-sm sm:text-base md:text-lg mt-2 sm:mt-3 mb-6 sm:mb-10 leading-relaxed max-w-2xl">{currentStepDescription}</p>
                </div>
              </div>
            )}

            {/* Botão de Continuar/Iniciar Onboarding - Estilo Premium Glass */}
            {(!userProfile?.onboarding_completed || recentApplications.length > 0) && (
              <button
                onClick={() => {
                  const targetStep = userProfile?.onboarding_completed ? 'my_applications' : (savedOnboardingStep || 'selection_fee');
                  navigate(`/student/onboarding?step=${targetStep}`);
                }}
                className="max-w-md mx-auto w-full group relative overflow-hidden bg-white text-[#05294E] rounded-2xl p-5 transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center justify-center text-center mb-6"
              >
                <h3 className="relative text-lg md:text-xl font-black uppercase tracking-widest leading-tight">
                  {(!userProfile?.onboarding_completed && !isOnboardingStarted)
                    ? t('studentDashboard.progressBar.onboardingBanner.startProcess')
                    : t('studentDashboard.progressBar.onboardingBanner.continueProcess')}
                </h3>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Grid: Recent Applications & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-10">
        {/* Recent Applications (Main Column) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#05294E] flex items-center gap-3">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                  {t('studentDashboard.recentApplications.title')}
                </h2>
                <p className="text-slate-500 text-sm sm:text-base mt-1">
                  {t('studentDashboard.recentApplications.subtitle')}
                </p>
              </div>
              <Link
                to="/student/dashboard/applications"
                className="hidden sm:flex items-center gap-2 text-[#05294E] hover:text-blue-700 font-bold text-sm transition-colors group/all"
              >
                {t('studentDashboard.quickActions.myApplications')}
                <ArrowRight className="w-4 h-4 group-hover/all:translate-x-1 transition-transform" />
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                </div>
                <h4 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">{t('studentDashboard.recentApplications.noApplications')}</h4>
                <p className="text-slate-500 mb-6 px-4">{t('studentDashboard.recentApplications.startJourneyMessage')}</p>
                <Link
                  to="/student/dashboard/scholarships"
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 bg-[#05294E] text-white rounded-xl hover:bg-[#0a3a6b] transition-colors font-semibold text-sm sm:text-base"
                >
                  <Search className="w-4 h-4" />
                  {t('studentDashboard.recentApplications.browseScholarships')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {displayedApplications.map((app) => {
                  const scholarship = app.scholarship || app.scholarships;
                  const StatusIcon = getStatusIcon(app.status);

                  return (
                    <Link 
                      key={app.id} 
                      to={`/student/dashboard/application/${app.id}/chat`}
                      className="group bg-white rounded-[1.5rem] p-3 sm:p-4 border border-slate-100 hover:border-[#05294E]/10 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 block"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                          <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-[#05294E]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate group-hover:text-blue-700 transition-colors">
                              {scholarship?.title || t('studentDashboard.recentApplications.unknownScholarship')}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap ${getStatusColor(app.status)}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getStatusLabel(app.status)}
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 truncate font-medium">
                            {scholarship?.universities?.name || t('studentDashboard.recentApplications.unknownUniversity')}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
                            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="font-medium">
                                {t('studentDashboard.recentApplications.applied')} {new Date(app.applied_at).toLocaleDateString()}
                              </span>
                            </div>
                            {scholarship?.deadline && (
                              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-bold">
                                  {t('studentDashboard.recentApplications.deadline')} {new Date(scholarship.deadline).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button in Card */}
                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-slate-400 font-medium italic">
                          {t('studentDashboard.recentApplications.scholarshipApplication')}
                        </span>
                        <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs sm:text-sm group-hover:translate-x-1 transition-transform">
                          {t('studentDashboard.myApplications.general.accessYourApplication')}
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Load More & View All */}
                {recentApplications.length > 0 && (
                  <div className="text-center space-y-3 sm:space-y-4">
                    <div className="text-xs sm:text-sm text-slate-600 font-medium">
                      {t('studentDashboard.recentApplications.showingApplications', {
                        count: displayedApplications.length,
                        total: recentApplications.length
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      {hasMoreApplications && (
                        <button
                          onClick={handleLoadMore}
                          className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl transition-all duration-200 font-bold flex items-center justify-center gap-2 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          {t('studentDashboard.recentApplications.loadMoreApplications')}
                        </button>
                      )}

                      <Link
                        to="/student/dashboard/applications"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 font-bold border-2 border-blue-200 hover:border-blue-300 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        {t('studentDashboard.recentApplications.viewAllApplications')}
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Right Column) */}
        <div className="space-y-4 sm:space-y-6">
          {/* Find Scholarships (Moved from Quick Actions) */}
          <Link
            to="/student/dashboard/scholarships"
            className="group relative bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg hover:shadow-2xl hover:border-[#05294E]/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden flex flex-col gap-4 no-underline"
          >
            {/* Decorative number watermark */}
            <div className="absolute -top-4 -right-4 text-7xl font-black pointer-events-none leading-none select-none transition-all duration-500 text-blue-50 group-hover:opacity-0">
              01
            </div>

            {/* Elegant hover highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#05294E] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-[#05294E] transition-colors">
                  {t('studentDashboard.quickActions.findScholarships')}
                </h3>
              </div>

              <div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {t('studentDashboard.quickActions.findDescription')}
                </p>
              </div>


            </div>
          </Link>

          {/* Profile Completion */}
          <div className="bg-white rounded-[2rem] shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-100 p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 px-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-bold text-[#05294E]">
                  {t('studentDashboard.profileStatus.title')}
                </h3>
              </div>
              {/* Progresso em % */}
              <span className={`text-sm font-black px-3 py-1 rounded-full ${
                basicInfoComplete && academicDetailsComplete && documentsComplete
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {Math.round(([basicInfoComplete, academicDetailsComplete, documentsComplete].filter(Boolean).length / 3) * 100)}%
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="mb-4 px-4">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${
                    basicInfoComplete && academicDetailsComplete && documentsComplete
                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                      : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                  }`}
                  style={{
                    width: `${Math.round(([basicInfoComplete, academicDetailsComplete, documentsComplete].filter(Boolean).length / 3) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Itens de Status */}
            <div className="mx-2 bg-slate-50/50 rounded-[1.5rem] p-2">
              {/* Informações Básicas */}
              <div className="flex items-center gap-4 p-3.5 rounded-xl transition-all">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  basicInfoComplete ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'
                }`} />
                <span className={`text-base font-bold flex-1 ${
                  basicInfoComplete ? 'text-green-800' : 'text-[#05294E]'
                }`}>
                  {t('studentDashboard.profileStatus.basicInformation')}
                </span>
                {!basicInfoComplete && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {t('studentDashboard.profileStatus.pending')}
                  </span>
                )}
              </div>

              {/* Detalhes Acadêmicos */}
              <div className="flex items-center gap-4 p-3.5 rounded-xl transition-all">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  academicDetailsComplete ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'
                }`} />
                <span className={`text-base font-bold flex-1 ${
                  academicDetailsComplete ? 'text-green-800' : 'text-[#05294E]'
                }`}>
                  {t('studentDashboard.profileStatus.academicDetails')}
                </span>
                {!academicDetailsComplete && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {t('studentDashboard.profileStatus.pending')}
                  </span>
                )}
              </div>

              {/* Documentos */}
              <div className="flex items-center gap-4 p-3.5 rounded-xl transition-all">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  documentsComplete ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'
                }`} />
                <span className={`text-base font-bold flex-1 ${
                  documentsComplete ? 'text-green-800' : 'text-[#05294E]'
                }`}>
                  {t('studentDashboard.profileStatus.documentsUploaded')}
                </span>
                {!documentsComplete && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {t('studentDashboard.profileStatus.pending')}
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            <Link
              to="/student/dashboard/profile"
              className={`mt-5 flex items-center justify-center gap-2 w-fit mx-auto px-8 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                basicInfoComplete && academicDetailsComplete && documentsComplete
                  ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                  : 'bg-[#05294E] text-white hover:bg-blue-900 shadow-md hover:shadow-lg'
              }`}
            >
              {basicInfoComplete && academicDetailsComplete && documentsComplete ? (
                <>
                  {t('studentDashboard.profileStatus.viewProfile')}
                </>
              ) : (
                <>
                  {t('studentDashboard.profileStatus.completeNow')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Link>
          </div>

          {/* Study Tips */}
          <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[2rem] shadow-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center text-[#05294E]">
              {t('studentDashboard.successTips.title')}
            </h3>
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {t('studentDashboard.successTips.tip1')}
                </p>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {t('studentDashboard.successTips.tip2')}
                </p>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {t('studentDashboard.successTips.tip3')}
                </p>
              </div>
            </div>
            {/* Decorative blob */}
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>



      {/* Step By Step Guide Modal */}
      < StepByStepGuide isOpen={isGuideOpen} onClose={closeGuide} />

    </div >
  );
};

export default Overview;
