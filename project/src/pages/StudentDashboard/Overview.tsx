import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  FileText,
  CheckCircle,
  Clock,
  Search,
  Target,
  BookOpen,
  ArrowUpRight,
  Calendar,
  Route,
  XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStepByStepGuide } from '../../hooks/useStepByStepGuide';
import { supabase } from '../../lib/supabase';
import StepByStepGuide from '../../components/OnboardingTour/StepByStepGuide';

import './Overview.css'; // Adicionar um arquivo de estilos dedicado para padronização visual

interface OverviewProps {
  profile: any;
  scholarships: any[];
  applications: any[];
  stats: {
    totalApplications: number;
    approvedApplications: number;
    pendingApplications: number;
    availableScholarships: number;
  };
  onApplyScholarship: (scholarshipId: string) => Promise<void>;
  recentApplications?: any[];
}

const Overview: React.FC<OverviewProps> = ({
  stats,
  recentApplications = [],
  applications = []
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, userProfile, refetchUserProfile } = useAuth();
  const { isGuideOpen, openGuide, closeGuide } = useStepByStepGuide();

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
      'payment', 'scholarship_fee', 'placement_fee', 'my_applications', 'completed'
    ];

    // 1. FONTE PRIMÁRIA: step salvo no banco de dados
    const dbStep = (userProfile as any)?.onboarding_current_step;

    if (dbStep && validSteps.includes(dbStep)) {
      // Único bloqueio de segurança: sem taxa de seleção paga, não avança
      if (userProfile && !userProfile.has_paid_selection_process_fee) {
        const stepsAfterSelection = [
          'scholarship_selection', 'process_type', 'documents_upload',
          'payment', 'scholarship_fee', 'placement_fee', 'my_applications',
          'waiting_approval', 'completed'
        ];
        if (stepsAfterSelection.includes(dbStep)) {
          return 'selection_fee';
        }
      }
      return dbStep;
    }

    // 2. FALLBACK: calcular baseado nas flags do perfil (usuários sem campo preenchido)
    let calculatedStep: string | null = 'selection_fee';

    if (userProfile) {
      const hasAppsInSystem = applications.length > 0;
      const anyAppPaidOrApproved = applications.some(app =>
        app.is_application_fee_paid ||
        ['approved', 'enrolled', 'under_review'].includes(app.status)
      );
      const anyScholarshipFeePaid = applications.some(app => app.is_scholarship_fee_paid) || userProfile.is_scholarship_fee_paid;
      const hasGlobalFeePaid = userProfile.is_application_fee_paid || !!userProfile.application_fee_paid_at || !!userProfile.scholarship_fee_paid_at || anyAppPaidOrApproved;
      const hasDocsGlobal = userProfile.documents_uploaded || !!userProfile.application_fee_paid_at || anyAppPaidOrApproved;

      if (userProfile.onboarding_completed) {
        calculatedStep = 'completed';
      } else if (!userProfile.has_paid_selection_process_fee) {
        calculatedStep = 'selection_fee';
      } else if (!userProfile.selection_survey_passed && !isExemptedByLegacy && !hasDocsGlobal && !hasGlobalFeePaid) {
        calculatedStep = 'selection_survey';
      } else if (!userProfile.selected_scholarship_id && !hasAppsInSystem && !hasDocsGlobal && !hasGlobalFeePaid) {
        calculatedStep = 'scholarship_selection';
      } else if (!hasDocsGlobal && userProfile.documents_status !== 'approved') {
        calculatedStep = 'documents_upload';
      } else if (!hasGlobalFeePaid) {
        calculatedStep = 'payment';
      } else if (!anyScholarshipFeePaid) {
        calculatedStep = 'scholarship_fee';
      } else {
        calculatedStep = 'my_applications';
      }
    }

    return calculatedStep;
  }, [userProfile, applications, isExemptedByLegacy]);

  const hasSavedOnboardingStep = savedOnboardingStep !== null;
  const isOnboardingStarted = hasSavedOnboardingStep && savedOnboardingStep !== 'selection_fee' && savedOnboardingStep !== 'welcome';


  const [visibleApplications, setVisibleApplications] = useState(5); // Mostrar 5 inicialmente
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);

  const hasMoreApplications = recentApplications.length > visibleApplications;
  const displayedApplications = recentApplications.slice(0, visibleApplications);

  const handleLoadMore = () => {
    setVisibleApplications(prev => Math.min(prev + 5, recentApplications.length));
  };

  // Função para buscar documentos do estudante
  const fetchStudentDocuments = React.useCallback(async () => {
    if (!user?.id) {
      setDocumentsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar documentos:', error);
        setStudentDocuments([]);
      } else {
        setStudentDocuments(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      setStudentDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [user?.id]);

  // Buscar documentos do estudante
  useEffect(() => {
    fetchStudentDocuments();
  }, [fetchStudentDocuments]);

  // Configurar real-time subscription para atualizações de documentos
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`student-documents-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_documents',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch documentos quando houver mudanças
          fetchStudentDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchStudentDocuments]);

  // Refetch perfil quando necessário (ex: após atualização)
  useEffect(() => {
    if (user?.id) {
      refetchUserProfile();
    }
  }, [user?.id, refetchUserProfile]);

  // Atualizar documentos quando o componente receber foco (ex: ao voltar da página de perfil)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id && !documentsLoading) {
        fetchStudentDocuments();
        refetchUserProfile();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, documentsLoading, refetchUserProfile, fetchStudentDocuments]);



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

  const quickActions = [
    {
      title: t('studentDashboard.quickActions.findScholarships'),
      description: t('studentDashboard.quickActions.findDescription'),
      icon: Search,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/student/dashboard/scholarships',
      count: stats.availableScholarships
    },
    {
      title: t('studentDashboard.quickActions.myApplications'),
      description: t('studentDashboard.quickActions.myApplicationsDescription'),
      icon: FileText,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      link: '/student/dashboard/applications',
      count: stats.totalApplications
    },
    {
      title: t('studentDashboard.quickActions.updateProfile'),
      description: t('studentDashboard.quickActions.updateDescription'),
      icon: Target,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      link: '/student/dashboard/profile',
      count: null
    }
  ];

  // Mapeamento de step de onboarding para número de exibição
  type OnboardingStepKey =
    | 'selection_fee' | 'identity_verification' | 'selection_survey'
    | 'scholarship_selection' | 'process_type' | 'documents_upload'
    | 'payment' | 'scholarship_fee' | 'university_documents'
    | 'waiting_approval' | 'my_applications' | 'completed';

  const STEP_NUMBER_MAP: Record<OnboardingStepKey, number> = {
    'selection_fee': 1,
    'identity_verification': 2,
    'selection_survey': 2,
    'scholarship_selection': 3,
    'process_type': 4,
    'documents_upload': 5,
    'payment': 6,
    'scholarship_fee': 7,
    'university_documents': 7,
    'waiting_approval': 7,
    'my_applications': 7,
    'completed': 7,
  };
  const TOTAL_ONBOARDING_STEPS = 7;

  const currentStepKey = (savedOnboardingStep || 'selection_fee') as OnboardingStepKey;
  const currentStepNumber = STEP_NUMBER_MAP[currentStepKey] ?? 1;
  const currentStepLabel = t(`studentDashboard.progressBar.onboardingBanner.stepLabels.${currentStepKey}`);
  const currentStepDescription = t(`studentDashboard.progressBar.onboardingBanner.stepDescriptions.${currentStepKey}`);

  return (
    <div className="overview-dashboard-container pt-2">


      {/* Mensagem de boas‑vindas movida para o hero */}

      {/* Alerta de desconto duplicado removido para evitar repetição com a mensagem de boas‑vindas */}

      {/* Welcome Message / Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 md:p-6 pb-8 sm:pb-10 text-white relative overflow-hidden ring-1 ring-white/10 shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-row items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Award className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
                {t('studentDashboard.welcome')}, {userProfile?.full_name || user?.email || t('studentDashboard.title').replace(' Dashboard', '')}!
              </h2>
            </div>
          </div>

          {/* Indicador de passo atual do onboarding - Seamless Style Vertical */}
          {!userProfile?.onboarding_completed && (
            <div className="mt-6 sm:mt-0 sm:-mt-2 mb-10 flex flex-col items-center text-center mx-auto w-full max-w-3xl px-4">
              {/* Badge da Etapa - Posicionada acima do título */}
              <div className="inline-flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-1.5 mb-14 sm:mb-20 shadow-xl ring-1 ring-white/10">
                <span className="text-white/90 font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.2em]">
                  PASSO {currentStepNumber} / {TOTAL_ONBOARDING_STEPS}
                </span>
              </div>

              {/* Texto do passo */}
              <div className="flex flex-col items-center justify-center min-w-0">
                <p className="text-white font-black text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tighter">{currentStepLabel}</p>
                <p className="text-white/80 text-sm sm:text-base md:text-lg mt-2 sm:mt-3 mb-6 sm:mb-10 leading-relaxed max-w-2xl">{currentStepDescription}</p>
              </div>
            </div>
          )}

          {/* Botão de Continuar/Iniciar Onboarding - Estilo Vidro Simplificado */}
          {(!userProfile?.onboarding_completed || recentApplications.length > 0) && (
            <button
              onClick={() => {
                const targetStep = userProfile?.onboarding_completed ? 'my_applications' : (savedOnboardingStep || 'selection_fee');
                navigate(`/student/onboarding?step=${targetStep}`);
              }}
              className="max-w-md mx-auto w-full group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 transition-all duration-500 hover:bg-white/20 hover:border-white/40 hover:scale-[1.05] active:scale-[0.95] shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex items-center justify-center text-center mb-6"
            >
              {/* Background Glows animadas */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-400/30 transition-colors duration-700" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-indigo-500/15 rounded-full blur-[60px] group-hover:bg-indigo-400/25 transition-colors duration-700" />

              <h3 className="relative text-lg md:text-xl font-black text-white uppercase tracking-widest leading-tight">
                {userProfile?.onboarding_completed
                  ? t('studentDashboard.progressBar.onboardingBanner.documentsPortal')
                  : (isOnboardingStarted
                    ? t('studentDashboard.progressBar.onboardingBanner.continueProcess')
                    : t('studentDashboard.progressBar.onboardingBanner.startProcess'))}
              </h3>
            </button>
          )}
          {/* Removed three unused mini-cards (Discover/Apply/Track) as requested */}
        </div >
      </div >

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openGuide();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openGuide();
            }
          }}
          role="button"
          tabIndex={0}
          className="hidden bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-md border-2 border-blue-300 hover:border-blue-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
        >
          <div className="relative z-10 pointer-events-none">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Route className="h-7 w-7 text-white" />
              </div>
            </div>
            <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">{t('studentDashboard.stepByStepTour.title')}</h3>
            <p className="text-slate-600 text-sm mb-4">{t('studentDashboard.stepByStepTour.description')}</p>
            <div className="flex justify-end">
              <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                {t('studentDashboard.stepByStepTour.startTour')}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{t('studentDashboard.stats.myApplications')}</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalApplications}</p>
              <div className="flex items-center mt-2">
                <FileText className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">{t('studentDashboard.stats.totalSubmitted')}</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{t('studentDashboard.stats.approved')}</p>
              <p className="text-3xl font-bold text-slate-900">{stats.approvedApplications}</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">{t('studentDashboard.stats.successful')}</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{t('studentDashboard.stats.pending')}</p>
              <p className="text-3xl font-bold text-slate-900">{stats.pendingApplications}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm font-medium text-yellow-600">{t('studentDashboard.stats.underReview')}</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div >

      {/* Quick Actions */}
      < div className="overview-quick-actions" >
        {
          quickActions.map((action) => (
            <Link
              to={action.link}
              key={action.title}
              className="overview-card overview-action-card"
            >
              <div className={`overview-card-icon ${action.color}`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <div className="overview-card-content">
                <div className="overview-card-title">{action.title}</div>
                <div className="overview-card-desc">{action.description}</div>
                {action.count !== null && (
                  <div className="overview-card-count">{action.count}</div>
                )}
              </div>
              <ArrowUpRight className="ml-auto h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </Link>
          ))
        }
      </div >
      {/* Step by Step Guide */}
      {/* <div className="overview-stepbystep-wrapper">
        <div
          className="overview-card overview-stepbystep-card"
          tabIndex={0}
          role="button"
          onClick={() => document.getElementById('step-by-step-btn')?.click()}
          onKeyPress={e => { if (e.key === 'Enter') document.getElementById('step-by-step-btn')?.click(); }}
        >
          <div className="overview-stepbystep-content">
            <div className="overview-stepbystep-title">Step by Step Guide</div>
            <div className="overview-stepbystep-desc">Follow the onboarding steps to complete your journey.</div>
          </div>
          <StepByStepButton id="step-by-step-btn" className="hidden-mobile" />
        </div>
      </div> */}
      {/* Progress Bar */}
      {/* <div className="overview-progressbar-wrapper">
        <ProgressBar steps={steps} feeValues={dynamicFeeValues} />
      </div> */}
      {/* Recent Applications and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{t('studentDashboard.recentApplications.title')}</h3>
                  <p className="text-slate-600 text-sm">{t('studentDashboard.recentApplications.subtitle')}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="flex items-baseline gap-2">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{recentApplications.length}</div>
                  {recentApplications.length > visibleApplications && (
                    <div className="text-sm text-slate-500">
                      ({visibleApplications} {t('studentDashboard.recentApplications.shown')})
                    </div>
                  )}
                </div>
                <div className="text-slate-500 text-xs">{t('studentDashboard.recentApplications.totalApplications')}</div>
              </div>
            </div>

            {recentApplications.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                </div>
                <h4 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">{t('studentDashboard.recentApplications.noApplications')}</h4>
                <p className="text-slate-500 mb-6 px-4">{t('studentDashboard.recentApplications.startJourneyMessage')}</p>
                <Link
                  to="/student/onboarding"
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base"
                >
                  <Search className="w-4 h-4" />
                  Começar Processo
                </Link>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {displayedApplications.map((app) => {
                  const scholarship = app.scholarship || app.scholarships;
                  const StatusIcon = getStatusIcon(app.status);

                  return (
                    <div key={app.id} className="group bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
                        {/* University Logo */}
                        <div className="flex-shrink-0 self-center sm:self-start">
                          {scholarship?.image_url || scholarship?.universities?.logo_url ? (
                            <div className="relative">
                              <img
                                src={scholarship.image_url || scholarship.universities.logo_url}
                                alt={scholarship?.universities?.name || 'University'}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain border-2 border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300"
                                onError={(e) => {
                                  // Fallback para ícone se a imagem falhar
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  e.currentTarget.nextElementSibling?.classList.add('flex');
                                }}
                              />
                              <div className="hidden w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl items-center justify-center border-2 border-slate-200 shadow-lg">
                                <Award className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                              </div>
                            </div >
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center border-2 border-slate-200 shadow-lg">
                              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        < div className="flex-1 min-w-0" >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {scholarship?.title || t('studentDashboard.recentApplications.scholarshipApplication')}
                              </h4>
                              <p className="text-slate-600 font-medium text-sm sm:text-base truncate">
                                {scholarship?.universities?.name || t('studentDashboard.recentApplications.university')}
                              </p>
                            </div>
                            <div className={`flex w-[90px] items-center sm:w-[110px] gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex-shrink-0 ${getStatusColor(app.status)}`}>
                              <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">
                                {app.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                              <span className="sm:hidden">
                                {app.status === 'approved' ? t('studentDashboard.recentApplications.status.approved') :
                                  app.status === 'under_review' ? t('studentDashboard.recentApplications.status.under_review') :
                                    t('studentDashboard.recentApplications.status.pending')}
                              </span>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                            {scholarship?.level && (
                              <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                                {scholarship.level}
                              </span>
                            )}
                            {scholarship?.field_of_study && (
                              <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium truncate max-w-32 sm:max-w-none">
                                {scholarship.field_of_study}
                              </span>
                            )}
                          </div>

                          {/* Dates and Details */}
                          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>{t('studentDashboard.recentApplications.applied')} {new Date(app.applied_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}</span>
                            </div>
                            {scholarship?.deadline && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>{t('studentDashboard.recentApplications.deadline')} {new Date(scholarship.deadline).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}</span>
                              </div>
                            )}
                          </div>
                        </div >
                      </div >
                    </div >
                  );
                })}

                {/* Load More & View All */}
                {recentApplications.length > 0 && (
                  <div className="text-center space-y-3 sm:space-y-4">
                    {/* Contador de Applications */}
                    <div className="text-xs sm:text-sm text-slate-600">
                      {t('studentDashboard.recentApplications.showingApplications', {
                        count: displayedApplications.length,
                        total: recentApplications.length
                      })}
                    </div>

                    {/* Load More Button */}
                    {hasMoreApplications && (
                      <button
                        onClick={handleLoadMore}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all duration-200 font-semibold flex items-center justify-center gap-2 mb-3 sm:mb-4 text-sm sm:text-base"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {t('studentDashboard.recentApplications.loadMoreApplications')}
                      </button>
                    )}

                    {/* View All Link */}
                    <Link
                      to="/student/dashboard/applications"
                      className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 font-semibold border-2 border-blue-200 hover:border-blue-300 text-sm sm:text-base"
                    >
                      <FileText className="w-4 h-4" />
                      {t('studentDashboard.recentApplications.viewAllApplications')}
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div >
        </div >

        {/* Recommended Scholarships & Profile Status */}
        < div className="space-y-4 sm:space-y-6" >
          {/* Profile Completion */}
          < div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-4 sm:p-6" >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
              {t('studentDashboard.profileStatus.title')}
            </h3>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{t('studentDashboard.profileStatus.basicInformation')}</span>
                {basicInfoComplete ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{t('studentDashboard.profileStatus.academicDetails')}</span>
                {academicDetailsComplete ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{t('studentDashboard.profileStatus.documentsUploaded')}</span>
                {documentsComplete ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                )}
              </div>
            </div>

            {(basicInfoComplete && academicDetailsComplete && documentsComplete) ? (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('studentDashboard.profileStatus.profileComplete')}
                </p>
                <Link
                  to="/student/dashboard/profile"
                  className="text-sm font-bold text-green-700 hover:text-green-800 transition-colors"
                >
                  {t('studentDashboard.profileStatus.viewProfile')} →
                </Link>
              </div>
            ) : (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  {t('studentDashboard.profileStatus.completeProfile')}
                </p>
                <Link
                  to="/student/dashboard/profile"
                  className="text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  {t('studentDashboard.profileStatus.completeNow')} →
                </Link>
              </div>
            )}
          </div>

          {/* Study Tips */}
          < div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md text-white p-4 sm:p-6 ring-1 ring-white/10" >
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              💡 {t('studentDashboard.successTips.title')}
            </h3>
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  {t('studentDashboard.successTips.tip1')}
                </p>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  {t('studentDashboard.successTips.tip2')}
                </p>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  {t('studentDashboard.successTips.tip3')}
                </p>
              </div>
            </div>
          </div >
        </div >
      </div >

      {/* Step By Step Guide Modal */}
      < StepByStepGuide isOpen={isGuideOpen} onClose={closeGuide} />

    </div >
  );
};

export default Overview;