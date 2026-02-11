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
  Building,
  Route,
  XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useDynamicFees } from '../../hooks/useDynamicFees';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useReferralCode } from '../../hooks/useReferralCode';
import { useStepByStepGuide } from '../../hooks/useStepByStepGuide';
import { supabase } from '../../lib/supabase';
import { ProgressBar } from '../../components/ProgressBar';
import StepByStepGuide from '../../components/OnboardingTour/StepByStepGuide';

import { getGrossPaidAmounts } from '../../utils/paymentConverter';
import './Overview.css'; // Adicionar um arquivo de estilos dedicado para padronização visual

// Componente de skeleton para valores de taxa
const FeeSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-300 rounded w-16"></div>
  </div>
);

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
  recentApplications = []
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, userProfile, refetchUserProfile } = useAuth();
  const { activeDiscount } = useReferralCode();
  const { userFeeOverrides } = useFeeConfig(user?.id);
  const { selectionProcessFeeAmount, scholarshipFeeAmount, i20ControlFeeAmount } = useDynamicFees();
  const { isGuideOpen, openGuide, closeGuide } = useStepByStepGuide();
  

  
  // Verificar se há step de onboarding salvo no localStorage
  const savedOnboardingStep = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const savedStep = window.localStorage.getItem('onboarding_current_step');
    const validSteps = ['welcome', 'selection_fee', 'scholarship_selection', 'process_type', 'documents_upload', 'payment', 'scholarship_fee', 'university_documents', 'waiting_approval', 'completed'];
    return savedStep && validSteps.includes(savedStep) ? savedStep : null;
  }, []);
  
  const hasSavedOnboardingStep = savedOnboardingStep !== null;
  const isOnboardingStarted = hasSavedOnboardingStep && savedOnboardingStep !== 'welcome';
  
  // Mapear step para label amigável
  const currentStepLabel = React.useMemo(() => {
    if (!savedOnboardingStep) return null;
    const stepLabels: Record<string, string> = {
      'welcome': 'Boas-vindas',
      'selection_fee': 'Taxa de Seleção',
      'scholarship_selection': 'Seleção de Bolsas',
      'process_type': 'Tipo de Processo',
      'documents_upload': 'Upload de Documentos',
      'payment': 'Taxa de Aplicação',
      'scholarship_fee': 'Taxa da Bolsa',
      'university_documents': 'Documentos da Faculdade',
      'waiting_approval': 'Aguardando Aprovação',
      'completed': 'Concluído'
    };
    return stepLabels[savedOnboardingStep] || savedOnboardingStep;
  }, [savedOnboardingStep]);
  
  const [visibleApplications, setVisibleApplications] = useState(5); // Mostrar 5 inicialmente
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [realPaidAmounts, setRealPaidAmounts] = useState<Record<string, number>>({});
  const [loadingPaidAmounts, setLoadingPaidAmounts] = useState(false);
  
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

  // Verificar se há application_fee ou scholarship_fee pagos nas applications
  const hasApplicationFeePaid = recentApplications.some(app => app.is_application_fee_paid);
  const hasScholarshipFeePaid = recentApplications.some(app => app.is_scholarship_fee_paid);

  // Buscar valores reais pagos de individual_fee_payments
  useEffect(() => {
    const fetchRealPaidAmounts = async () => {
      if (!user?.id) return;

      setLoadingPaidAmounts(true);
      try {
        const amounts = await getGrossPaidAmounts(user.id, ['selection_process', 'scholarship', 'i20_control', 'application']);
        setRealPaidAmounts(amounts);
        console.log('[Overview] Valores reais pagos carregados:', amounts);
      } catch (error) {
        console.error('[Overview] Erro ao buscar valores reais pagos:', error);
        setRealPaidAmounts({});
      } finally {
        setLoadingPaidAmounts(false);
      }
    };

    fetchRealPaidAmounts();
  }, [user?.id, userProfile?.has_paid_selection_process_fee, hasApplicationFeePaid, hasScholarshipFeePaid, userProfile?.has_paid_i20_control_fee]);

  // Base fee amounts with user overrides - usar valores do useDynamicFees
  const selectionBase = selectionProcessFeeAmount || 0;
  const scholarshipBase = scholarshipFeeAmount || 0;
  const i20Base = i20ControlFeeAmount || 0;

  // Verificar se as taxas estão carregando
  const isFeesLoading = selectionProcessFeeAmount === undefined || 
                       scholarshipFeeAmount === undefined || 
                       i20ControlFeeAmount === undefined;

  // ✅ CORREÇÃO: selectionBase já vem com dependentes calculados do useDynamicFees
  // Não recalcular dependentes aqui para evitar duplicação
  const hasI20Override = userFeeOverrides?.i20_control_fee !== undefined;
  
  // I-20 nunca tem dependentes, então não precisa de cálculo extra
  const i20Extra = hasI20Override ? 0 : 0;

  // Display amounts - usar valores já calculados do useDynamicFees
  const selectionWithDependents = selectionBase; // Já inclui dependentes
  const i20WithDependents = i20Base + i20Extra;

  // Valores das taxas para o ProgressBar (Application fee é variável)
  // ✅ CORREÇÃO: Aplicar desconto na barra de progresso se houver activeDiscount
  const selectionFeeWithDiscount = activeDiscount?.has_discount 
    ? Math.max(selectionWithDependents - (activeDiscount.discount_amount || 0), 0)
    : selectionWithDependents;

  // ✅ CORREÇÃO: Prioridade: Override > Valor real pago > Valor esperado
  const getSelectionProcessFeeDisplay = () => {
    if (loadingPaidAmounts) return <FeeSkeleton />;
    
    // PRIORIDADE 1: Override (MÁXIMA PRIORIDADE)
    if (userFeeOverrides?.selection_process_fee !== undefined) {
      return `$${userFeeOverrides.selection_process_fee.toFixed(2)}`;
    }
    
    // PRIORIDADE 2: Valor real pago quando já foi pago
    if (userProfile?.has_paid_selection_process_fee && realPaidAmounts?.selection_process !== undefined && realPaidAmounts.selection_process > 0) {
      return `$${realPaidAmounts.selection_process.toFixed(2)}`;
    }
    
    // PRIORIDADE 3: Valor esperado (com desconto se aplicável)
    return `$${typeof selectionFeeWithDiscount === 'number' ? selectionFeeWithDiscount.toFixed(2) : selectionFeeWithDiscount}`;
  };

  const getScholarshipFeeDisplay = () => {
    if (loadingPaidAmounts) return <FeeSkeleton />;
    
    // PRIORIDADE 1: Override (MÁXIMA PRIORIDADE)
    if (userFeeOverrides?.scholarship_fee !== undefined) {
      return `$${userFeeOverrides.scholarship_fee.toFixed(2)}`;
    }
    
    // PRIORIDADE 2: Valor real pago quando já foi pago
    if (hasScholarshipFeePaid && realPaidAmounts?.scholarship !== undefined && realPaidAmounts.scholarship > 0) {
      return `$${realPaidAmounts.scholarship.toFixed(2)}`;
    }
    
    // PRIORIDADE 3: Valor esperado
    return `$${typeof scholarshipBase === 'number' ? scholarshipBase.toFixed(2) : scholarshipBase}`;
  };

  const getI20ControlFeeDisplay = () => {
    if (loadingPaidAmounts) return <FeeSkeleton />;
    
    // PRIORIDADE 1: Override (MÁXIMA PRIORIDADE)
    if (userFeeOverrides?.i20_control_fee !== undefined) {
      return `$${userFeeOverrides.i20_control_fee.toFixed(2)}`;
    }
    
    // PRIORIDADE 2: Valor real pago quando já foi pago
    if (userProfile?.has_paid_i20_control_fee && realPaidAmounts?.i20_control !== undefined && realPaidAmounts.i20_control > 0) {
      return `$${realPaidAmounts.i20_control.toFixed(2)}`;
    }
    
    // PRIORIDADE 3: Valor esperado
    return `$${typeof i20WithDependents === 'number' ? i20WithDependents.toFixed(2) : i20WithDependents}`;
  };

  const dynamicFeeValues = [
    isFeesLoading ? '...' : String(getSelectionProcessFeeDisplay()), // Selection Process Fee (valor real pago ou esperado)
    t('feeValues.asPerUniversity'), // Application Fee (variável - não mostra valor específico)
    isFeesLoading ? '...' : String(getScholarshipFeeDisplay()), // Scholarship Fee (valor real pago ou esperado)
    isFeesLoading ? '...' : String(getI20ControlFeeDisplay()), // I-20 Control Fee (valor real pago ou esperado)
  ];

  // Lógica da barra de progresso dinâmica
  const getStep1State = () => {
    // Se onboarding concluído
    if (userProfile?.onboarding_completed) {
      return {
        label: t('studentDashboard.progressBar.selectionProcessFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false
      };
    }

    // Se ainda está no onboarding ou não pagou
    return {
      label: t('studentDashboard.progressBar.selectionProcessFee'),
      description: t('studentDashboard.progressBar.payApplicationFee'),
      completed: !!userProfile?.has_paid_selection_process_fee,
      current: !userProfile?.has_paid_selection_process_fee || !userProfile?.onboarding_completed
    };
  };

  const step1 = getStep1State();
  
  let steps = [
    step1,
    {
      label: t('studentDashboard.progressBar.applicationFee'),
      description: t('studentDashboard.progressBar.payApplicationFee'),
      completed: false,
      current: false,
    },
    {
      label: t('studentDashboard.progressBar.scholarshipFee'),
      description: t('studentDashboard.progressBar.payScholarshipFee'),
      completed: false,
      current: false,
    },
    {
      label: t('studentDashboard.progressBar.i20ControlFee'),
      description: t('studentDashboard.progressBar.payI20Fee'),
      completed: false,
      current: false,
    },
  ];

  // Ajustar status dos passos subsequentes baseado no primeiro
  if (step1.completed) {
    if (!hasApplicationFeePaid) {
      steps[1].current = true;
    } else if (!hasScholarshipFeePaid) {
      steps[1].completed = true;
      steps[2].current = true;
    } else if (!userProfile?.has_paid_i20_control_fee) {
      steps[1].completed = true;
      steps[2].completed = true;
      steps[3].current = true;
    } else {
      steps[1].completed = true;
      steps[2].completed = true;
      steps[3].completed = true;
    }
  } else if (userProfile?.has_paid_selection_process_fee) {
    // Se pagou a taxa mas ainda está no onboarding, o passo 1 é atual (já definido no getStep1State)
    // Mas os outros passos já não podem ser "current"
  }

  const allCompleted = steps.every(step => step.completed);

  // Cálculo do progresso visual para a trilha animada
  const calculateVisualProgress = () => {
    // 1. Prioridade para pagamentos confirmados (posições fixas nos nós)
    if (userProfile?.has_paid_i20_control_fee) return 3;
    if (hasScholarshipFeePaid) return 3; // Se pagou a bolsa, o próximo passo é o I-20 (nó 3)
    if (hasApplicationFeePaid) return 2; // Se pagou a aplicação, o próximo passo é a bolsa (nó 2)

    // 2. Se o onboarding foi concluído mas ainda não pagou a taxa de aplicação
    if (userProfile?.onboarding_completed) return 1;

    // 3. Se ainda não pagou nem a primeira taxa (Taxa de Seleção)
    if (!userProfile?.has_paid_selection_process_fee) return 0;

    // 4. Progresso granular durante o onboarding (entre o nó 0 e nó 1)
    const onboardingProgressMap: Record<string, number> = {
      'welcome': 0,
      'selection_fee': 0,
      'scholarship_selection': 0.2,
      'process_type': 0.4,
      'documents_upload': 0.6,
      'payment': 1, // 'payment' no onboarding é a Taxa de Aplicação (nó 1)
      'scholarship_fee': 1.25,
      'university_documents': 1.5,
      'waiting_approval': 1.75, // Quase chegando na liberação da taxa da bolsa
      'completed': 2
    };

    return onboardingProgressMap[savedOnboardingStep || ''] || 0.5;
  };

  const visualProgress = calculateVisualProgress();

  return (
    <div className="overview-dashboard-container pt-2">

      
      {/* Mensagem de boas‑vindas movida para o hero */}
      
      {/* Alerta de desconto duplicado removido para evitar repetição com a mensagem de boas‑vindas */}
      
      {/* Welcome Message / Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 md:p-6 text-white relative overflow-hidden ring-1 ring-white/10 shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Award className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">
                {t('studentDashboard.welcome')}, {userProfile?.full_name || user?.email || t('studentDashboard.title').replace(' Dashboard', '')}!
              </h2>
            </div>
          </div>

          {/* Progress Bar dentro do bloco azul */}
          <div className="text-center text-white/90 text-sm md:text-base font-medium mb-1">
            {allCompleted ? t('studentDashboard.progressBar.allStepsCompleted') : t('studentDashboard.progressBar.title')}
          </div>
          <div className="mb-2 md:mb-4">
            {/* Status do Onboarding acima da trilha - Layout Pílula Integrado */}
            {!userProfile?.onboarding_completed && (
              <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 animate-fade-in bg-white/5 backdrop-blur-xl border border-white/10 rounded-full py-2 px-4 md:px-6 w-fit mx-auto shadow-[0_10px_30px_rgba(0,0,0,0.2)] ring-1 ring-white/10">
                <div className="relative flex items-center">
                  <span className="bg-amber-400 text-black text-[9px] md:text-[10px] font-black px-2 md:px-3 py-0.5 rounded-full uppercase tracking-tighter shadow-lg shadow-amber-400/20">
                    Ação Necessária
                  </span>
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping opacity-75" />
                </div>
                <div className="w-px h-4 bg-white/20 hidden xs:block" />
                <p className="text-white text-[10px] md:text-sm font-bold tracking-tight opacity-90 drop-shadow-md">
                  {isOnboardingStarted 
                    ? `Você parou em: ${currentStepLabel}`
                    : 'Comece sua jornada agora mesmo'}
                </p>
              </div>
            )}
            <ProgressBar 
              steps={steps} 
              feeValues={dynamicFeeValues}
              applicationId={recentApplications?.[0]?.id || null}
              isSelectionProcessUnlocked={true} // Sempre liberada
              isApplicationFeeUnlocked={userProfile?.has_paid_selection_process_fee || false}
              isScholarshipFeeUnlocked={hasApplicationFeePaid}
              isI20Unlocked={hasScholarshipFeePaid}
              progress={visualProgress}
            />
          </div>

          {/* Botão de Continuar/Iniciar Onboarding - Estilo Vidro Simplificado */}
          {!userProfile?.onboarding_completed && (
            <button
              onClick={() => navigate(`/student/onboarding?step=${savedOnboardingStep || 'welcome'}`)}
              className="max-w-md mx-auto w-full group relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 transition-all duration-500 hover:bg-white/20 hover:border-white/40 hover:scale-[1.05] active:scale-[0.95] shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex items-center justify-center text-center"
            >
              {/* Background Glows animadas */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-400/30 transition-colors duration-700" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-indigo-500/15 rounded-full blur-[60px] group-hover:bg-indigo-400/25 transition-colors duration-700" />
              
              <h3 className="relative text-lg md:text-xl font-black text-white uppercase tracking-widest leading-tight">
                {isOnboardingStarted ? 'Continuar Jornada' : 'Iniciar Jornada'}
              </h3>
            </button>
          )}
          {/* Removed three unused mini-cards (Discover/Apply/Track) as requested */}
        </div>
      </div>

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
          className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-md border-2 border-blue-300 hover:border-blue-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
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
      </div>

      {/* Quick Actions */}
      <div className="overview-quick-actions">
        {quickActions.map((action) => (
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
        ))}
      </div>
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
      {/* Outros cards/boxes da overview seguem o mesmo padrão visual */}
      {/* Recent Applications */}
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
                  to="/student/dashboard/scholarships"
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base"
                >
                  <Search className="w-4 h-4" />
                  {t('studentDashboard.recentApplications.browseScholarships')}
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
                          {scholarship?.universities?.logo_url ? (
                            <div className="relative">
                              <img 
                                src={scholarship.universities.logo_url} 
                                alt={scholarship.universities.name} 
                                className="w-36 h-20 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300" 
                                onError={(e) => {
                                  // Fallback para ícone se a imagem falhar
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl items-center justify-center border-2 border-slate-200 shadow-lg">
                                <Building className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center border-2 border-slate-200 shadow-lg">
                              <Building className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
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
                        </div>
                      </div>
                    </div>
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
          </div>
        </div>

        {/* Recommended Scholarships & Profile Status */}
        <div className="space-y-4 sm:space-y-6">
          {/* Profile Completion */}
          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-4 sm:p-6">
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
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md text-white p-4 sm:p-6 ring-1 ring-white/10">
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
          </div>
        </div>
      </div>

      {/* Step By Step Guide Modal */}
      <StepByStepGuide isOpen={isGuideOpen} onClose={closeGuide} />

    </div>
  );
};

export default Overview;