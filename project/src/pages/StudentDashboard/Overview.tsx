import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  CreditCard,
  Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useAuth } from '../../hooks/useAuth';
import { useReferralCode } from '../../hooks/useReferralCode';
import { ProgressBar } from '../../components/ProgressBar';
import StepByStepButton from '../../components/OnboardingTour/StepByStepButton';
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
  recentApplications = []
}) => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const { activeDiscount } = useReferralCode();
  const { getFeeAmount, userFeeOverrides } = useFeeConfig(user?.id);
  const [visibleApplications, setVisibleApplications] = useState(5); // Mostrar 5 inicialmente
  const [feesLoading, setFeesLoading] = useState(true);
  
  const hasMoreApplications = recentApplications.length > visibleApplications;
  const displayedApplications = recentApplications.slice(0, visibleApplications);
  
  const handleLoadMore = () => {
    setVisibleApplications(prev => Math.min(prev + 5, recentApplications.length));
  };

  // Exibir skeleton até os dados de perfil e taxas estarem prontos para evitar flicker
  useEffect(() => {
    // Considera carregado quando perfil está resolvido (mesmo que null) e já tivemos uma avaliação inicial das taxas
    // Também adiciona um pequeno debounce para permitir cálculos de overrides/discounts estabilizarem
    const debounce = setTimeout(() => {
      const selection = Number(getFeeAmount('selection_process')) || 0;
      const scholarship = Number(getFeeAmount('scholarship_fee')) || 0;
      const i20 = Number(getFeeAmount('i20_control_fee')) || 0;
      const hasProfileResolved = user !== undefined; // quando hook de auth já rodou
      const someFeeKnown = selection > 0 || scholarship > 0 || i20 > 0;
      if (hasProfileResolved && someFeeKnown) {
        setFeesLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounce);
  }, [user, userProfile, userFeeOverrides, getFeeAmount]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return Clock;
      case 'under_review': return Clock;
      default: return Clock;
    }
  };

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

  // Base fee amounts with user overrides
  const selectionBase = Number(getFeeAmount('selection_process')) || 0;
  const scholarshipBase = Number(getFeeAmount('scholarship_fee')) || 0;
  const i20Base = Number(getFeeAmount('i20_control_fee')) || 0;

  // Dependents impact: $150 por dependente somente no Selection Process
  // APENAS se não há override personalizado (override já inclui dependentes se necessário)
  const dependents = (userProfile?.dependents as number) || 0;
  const hasSelectionOverride = userFeeOverrides?.selection_process_fee !== undefined;
  const hasI20Override = userFeeOverrides?.i20_control_fee !== undefined;
  
  const selectionExtra = hasSelectionOverride ? 0 : (dependents * 150); // Só soma dependentes se não tem override
  const i20Extra = hasI20Override ? 0 : 0; // I-20 nunca tem dependentes

  // Display amounts
  const selectionWithDependents = selectionBase + selectionExtra;
  const i20WithDependents = i20Base + i20Extra;

  // Valores das taxas para o ProgressBar (Application fee é variável)
  const dynamicFeeValues = [
    `$${selectionWithDependents}`, // Selection Process Fee (inclui dependentes)
    'As per university', // Application Fee (variável - não mostra valor específico)
    `$${scholarshipBase}`, // Scholarship Fee (sem dependentes)
    `$${i20WithDependents}`, // I-20 Control Fee (inclui dependentes)
  ];

  // Lógica da barra de progresso dinâmica
  let steps = [];
  if (!userProfile?.has_paid_selection_process_fee) {
    // Só pagou (ou está pagando) a Selection Process Fee
    steps = [
      {
        label: t('studentDashboard.progressBar.selectionProcessFee'),
        description: t('studentDashboard.progressBar.payApplicationFee'),
        completed: false,
        current: true,
      },
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
  } else if (!hasApplicationFeePaid) {
    // Pagou só a Selection Process Fee
    steps = [
      {
        label: t('studentDashboard.progressBar.selectionProcessFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.applicationFee'),
        description: t('studentDashboard.progressBar.payApplicationFee'),
        completed: false,
        current: true,
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
  } else if (!hasScholarshipFeePaid) {
    // Pagou Application Fee
    steps = [
      {
        label: t('studentDashboard.progressBar.selectionProcessFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.applicationFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.scholarshipFee'),
        description: t('studentDashboard.progressBar.payScholarshipFee'),
        completed: false,
        current: true,
      },
      {
        label: t('studentDashboard.progressBar.i20ControlFee'),
        description: t('studentDashboard.progressBar.payI20Fee'),
        completed: false,
        current: false,
      },
    ];
  } else if (!userProfile?.has_paid_i20_control_fee) {
    // Pagou Scholarship Fee, mas não I-20 Control Fee
    steps = [
      {
        label: t('studentDashboard.progressBar.selectionProcessFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.applicationFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.scholarshipFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.i20ControlFee'),
        description: t('studentDashboard.progressBar.payI20Fee'),
        completed: false,
        current: true,
      },
    ];
  } else {
    // Pagou tudo
    steps = [
      {
        label: t('studentDashboard.progressBar.selectionProcessFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.applicationFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.scholarshipFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
      {
        label: t('studentDashboard.progressBar.i20ControlFee'),
        description: t('studentDashboard.progressBar.completed'),
        completed: true,
        current: false,
      },
    ];
  }

  const allCompleted = steps.every(step => step.completed);

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
            {allCompleted ? 'All Steps Completed! 🎉' : t('studentDashboard.progressBar.title')}
          </div>
          <div className="mb-2 md:mb-4">
            <ProgressBar steps={steps} feeValues={dynamicFeeValues} />
          </div>

          {userProfile && !userProfile.has_paid_selection_process_fee && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-4 sm:p-6 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-3 sm:mb-4">
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white mr-2 sm:mr-3" />
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">{t('studentDashboard.selectionProcess.title')}</h3>
                    <p className="text-blue-100 text-xs sm:text-sm">{t('studentDashboard.selectionProcess.completeApplicationProcess')}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  {feesLoading ? (
                    <div className="inline-block w-24 h-6 bg-white/30 rounded animate-pulse" />
                  ) : activeDiscount?.has_discount ? (
                    <div className="flex flex-col sm:text-center">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white line-through">${selectionWithDependents}</div>
                      <div className="text-base sm:text-lg md:text-xl font-bold text-green-300">
                        ${Math.max(selectionWithDependents - (activeDiscount.discount_amount || 0), 0)}
                      </div>
                      <div className="flex items-center sm:justify-center mt-1">
                        <Tag className="h-3 w-3 text-green-300 mr-1" />
                        <span className="text-xs text-green-300 font-medium">
                          {t('studentDashboard.recentApplications.couponApplied')} -${activeDiscount.discount_amount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">${selectionWithDependents}</div>
                  )}
                </div>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">
                {t('studentDashboard.selectionProcess.description')}
                {activeDiscount?.has_discount && (
                  <span className="block mt-1 text-green-300 font-medium">
                    {t('studentDashboard.selectionProcess.discountApplied')}
                  </span>
                )}
              </p>
              
              {/* Botão de pagamento sempre visível */}
          <StripeCheckout 
                productId="selectionProcess"
                feeType="selection_process"
                paymentType="selection_process"
            buttonText={t('studentDashboard.selectionProcess.startButton')}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-3 px-4 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 cursor-pointer border-2 border-white text-sm sm:text-base"
                successUrl={`${window.location.origin}/student/dashboard/selection-process-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                cancelUrl={`${window.location.origin}/student/dashboard/selection-process-fee-error`}
              />
              
              {/* Aviso para usuários com seller_referral_code */}
              {/* {userProfile.seller_referral_code && userProfile.seller_referral_code.trim() !== '' && (
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-300/30 rounded-lg px-3 py-2">
                    <Target className="h-4 w-4 text-amber-300" />
                    <span className="text-amber-200 text-xs">
                      {t('studentDashboard.selectionProcess.sellerReferralCodeInfo')}
                    </span>
                  </div>
                </div>
              )} */}
            </div>
          )}
          {/* Removed three unused mini-cards (Discover/Apply/Track) as requested */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-6.518-3.89A1 1 0 007 8.618v6.764a1 1 0 001.234.97l6.518-1.878a1 1 0 00.748-.97v-2.764a1 1 0 00-.748-.97z" /></svg>
            </div>
          </div>
          <h3 className="font-bold text-slate-900 mb-2">{t('studentDashboard.stepByStepTour.title')}</h3>
          <p className="text-slate-600 text-sm mb-4">{t('studentDashboard.stepByStepTour.description')}</p>
          <div className="flex justify-end">
            <StepByStepButton />
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
                      {`Showing ${displayedApplications.length} of ${recentApplications.length} applications`}
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
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{t('studentDashboard.profileStatus.academicDetails')}</span>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{t('studentDashboard.profileStatus.documentsUploaded')}</span>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              </div>
            </div>

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

    </div>
  );
};

export default Overview;