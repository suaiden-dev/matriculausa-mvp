import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingProgress } from './hooks/useOnboardingProgress';
import { StepIndicator } from './components/StepIndicator';
import { SelectionFeeStep } from './components/SelectionFeeStep';
import { ScholarshipSelectionStep } from './components/ScholarshipSelectionStep';
import { ProcessTypeStep } from './components/ProcessTypeStep';
import { DocumentsUploadStep } from './components/DocumentsUploadStep';
import { PaymentStep } from './components/PaymentStep'; // Payment step component
import { ScholarshipFeeStep } from './components/ScholarshipFeeStep';
import { PlacementFeeStep } from './components/PlacementFeeStep';
import { UniversityDocumentsStep } from './components/UniversityDocumentsStep';
import { SelectionSurveyStep } from './components/SelectionSurveyStep';
import { IdentityVerificationStep } from './components/IdentityVerificationStep';
import { OnboardingStep } from './types';
import PaymentSuccessOverlay from '../../components/PaymentSuccessOverlay';
import CustomLoading from '../../components/CustomLoading';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import { useSmartPollingNotifications } from '../../hooks/useSmartPollingNotifications';
import NotificationsModal from '../../components/NotificationsModal';

const StudentOnboarding: React.FC = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const processingPaymentRef = React.useRef<string | null>(null);
  const { state, loading, goToStep } = useOnboardingProgress();
  const { t } = useTranslation();
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // O estado do progresso agora contém se o usuário é do novo fluxo
  // Prioriza o valor do perfil (banco) sobre o estado local se o perfil já estiver carregado
  const isNewFlowUser = (userProfile as any)?.placement_fee_flow !== undefined 
    ? !!(userProfile as any)?.placement_fee_flow 
    : !!state.isNewFlowUser;
  

  const isNewFlowUserRef = React.useRef(isNewFlowUser);

  useEffect(() => {
    isNewFlowUserRef.current = isNewFlowUser;
  }, [isNewFlowUser]);

  const getOrderedSteps = useCallback((): OnboardingStep[] => {
    const base: OnboardingStep[] = [
      'selection_fee',
      'identity_verification',
      'selection_survey',
      'scholarship_selection',
      'process_type',
      'documents_upload',
      'payment',
      isNewFlowUser ? 'placement_fee' : 'scholarship_fee',
      'my_applications',
      'completed',
    ];
    return base;
  }, [isNewFlowUser]);

  const handleNext = useCallback(() => {
    const steps = getOrderedSteps();
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < steps.length - 1) {
      goToStep(steps[currentIndex + 1]);
    }
  }, [state.currentStep, goToStep, getOrderedSteps]);

  const handleBack = useCallback(() => {
    const steps = getOrderedSteps();
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      goToStep(steps[currentIndex - 1]);
    }
  }, [state.currentStep, goToStep, getOrderedSteps]);

  // Notifications logic
  const {
    notifications,
    unreadCount: newNotificationCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestNotificationPermission
  } = useSmartPollingNotifications({
    userType: 'student',
    userId: user?.id || '',
    onNotificationReceived: (notification) => {
      console.log('🔔 Nova notificação recebida via polling no Onboarding:', notification);
    }
  });

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notifications-container')) {
        setShowNotif(false);
      }
    };

    if (showNotif) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotif]);

  const openNotification = async (n: any) => {
    try {
      if (n && !n.read_at) {
        await markAsRead(n.id);
      }
    } catch { }
    setShowNotif(false);
    const target = n?.link || '/student/dashboard';
    navigate(target);
  };

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const validSteps: OnboardingStep[] = ['selection_fee', 'identity_verification', 'selection_survey', 'scholarship_selection', 'process_type', 'documents_upload', 'payment', 'scholarship_fee', 'placement_fee', 'my_applications'];
      if (validSteps.includes(stepParam as OnboardingStep)) {
        window.localStorage.setItem('onboarding_current_step', stepParam);
        setTimeout(() => {
          goToStep(stepParam as OnboardingStep);
        }, 100);
      }
    }
  }, [searchParams, goToStep]);

  // Sincronizar URL com o passo atual
  useEffect(() => {
    const currentStepUrl = searchParams.get('step');
    if (state.currentStep && state.currentStep !== currentStepUrl) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('step', state.currentStep);
      navigate(`?${newParams.toString()}`, { replace: true });
    }
  }, [state.currentStep, searchParams, navigate]);

  // Scroll to top when step changes
  useEffect(() => {
    // Usamos um pequeno timeout para garantir que o novo passo já foi renderizado
    // e o layout atualizado antes de rolar para o topo
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Fallback para garantir a rolagem em diferentes estruturas de containers
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

    return () => clearTimeout(timer);
  }, [state.currentStep]);

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment');
    const stepParam = searchParams.get('step');
    const sessionId = searchParams.get('session_id');


    if (paymentSuccess === 'success' && stepParam) {
      const paymentKey = sessionId || 'manual_pix';
      if (processingPaymentRef.current === paymentKey) return;
      processingPaymentRef.current = paymentKey;

      if (!sessionId || sessionId === '{CHECKOUT_SESSION_ID}') {
        // Fluxo Parcelow PIX (ou sem session id válido)
        // O webhook demora alguns segundos. Vamos segurar a tela de "Verificando" para dar tempo ao webhook.
        setIsVerifyingPayment(true);
        setTimeout(() => {
          setIsVerifyingPayment(false);
          setShowPaymentAnimation(true);

          // Limpar parâmetros da URL de forma reativa
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('payment');
          newParams.delete('session_id');
          newParams.delete('pix_payment');
          setSearchParams(newParams, { replace: true });

          setTimeout(() => {
            setShowPaymentAnimation(false);
            if (stepParam === 'payment') {
              // Navegar diretamente para o step correto, sem depender de handleNext()
              // que pode usar isNewFlowUser=false caso userProfile ainda não tenha carregado
              const nextFeeStep: OnboardingStep = isNewFlowUserRef.current ? 'placement_fee' : 'scholarship_fee';
              goToStep(nextFeeStep);
            } else if (stepParam === 'scholarship_fee' || stepParam === 'placement_fee') {
              // Mover para my_applications diretamente
              goToStep('my_applications');
            } else {
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete('payment');
              cleanUrl.searchParams.delete('session_id');
              cleanUrl.searchParams.delete('pix_payment');
              window.location.href = cleanUrl.toString();
            }
          }, 4000);
        }, 10000); // Aguarda 10 segundos extras antes da aba de sucesso
      } else {
        // Fluxo Stripe Normal / Stripe PIX
        let pollCount = 0;
        const MAX_POLLS = 10; // Max 30 segundos

        const verifyStripeSession = async () => {
          pollCount++;
          try {
            let edgeFunctionName = '';
            if (stepParam === 'scholarship_selection') {
              edgeFunctionName = 'verify-stripe-session-selection-process-fee';
            } else if (stepParam === 'payment') {
              edgeFunctionName = 'verify-stripe-session-application-fee';
            } else if (stepParam === 'scholarship_fee' || stepParam === 'completed') {
              edgeFunctionName = 'verify-stripe-session-scholarship-fee';
            } else if (stepParam === 'placement_fee') {
              edgeFunctionName = 'verify-stripe-session-placement-fee';
            } else if (stepParam === 'my_applications') {
              edgeFunctionName = 'verify-stripe-session-i20-control-fee';
            }

            if (!edgeFunctionName) {
              setIsVerifyingPayment(false);
              return;
            }

            const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
            const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/${edgeFunctionName}`;

            let token = null;
            try {
              const raw = localStorage.getItem(`sb-${SUPABASE_PROJECT_URL.split('//')[1].split('.')[0]}-auth-token`);
              if (raw) {
                const tokenObj = JSON.parse(raw);
                token = tokenObj?.access_token || null;
              }
            } catch (e) {
              console.error('[Onboarding] Erro ao obter token:', e);
            }

            const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
              },
              body: JSON.stringify({ sessionId }),
            });

            const data = await response.json();

            if (data.status === 'complete' || data.success) {
              setIsVerifyingPayment(false);
              setShowPaymentAnimation(true);

              // Limpar parâmetros da URL de forma reativa
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('payment');
              newParams.delete('session_id');
              newParams.delete('pix_payment');
              setSearchParams(newParams, { replace: true });

              setTimeout(() => {
                setShowPaymentAnimation(false);

                // Recalcular o próximo passo no momento da execução para garantir que
                // usamos o estado mais atualizado de isNewFlowUser vindo do hook ou do profile
                if (stepParam === 'payment') {
                  const nextFeeStep: OnboardingStep = isNewFlowUserRef.current ? 'placement_fee' : 'scholarship_fee';
                  goToStep(nextFeeStep);
                } else if (stepParam === 'scholarship_fee' || stepParam === 'placement_fee') {
                  // Mover para my_applications diretamente para evitar bug de estado no closure do handleNext
                  goToStep('my_applications');
                } else {
                  const cleanUrl = new URL(window.location.href);
                  cleanUrl.searchParams.delete('payment');
                  cleanUrl.searchParams.delete('session_id');
                  cleanUrl.searchParams.delete('pix_payment');
                  window.location.href = cleanUrl.toString();
                }
              }, 4000);
            } else if ((data.status === 'open' || data.status === 'pending') && pollCount < MAX_POLLS) {
              // Pagamento assíncrono (ex: PIX), tenta novamente a cada 3s
              setTimeout(verifyStripeSession, 3000);
            } else {
              // Falha ou tempo limite estourado, sai da tela de verificação
              setIsVerifyingPayment(false);
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('payment');
              newParams.delete('session_id');
              setSearchParams(newParams, { replace: true });
              // Para garantir que o progress veja o real atual, força render ou reload.
              if (pollCount >= MAX_POLLS) {
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('payment');
                cleanUrl.searchParams.delete('session_id');
                cleanUrl.searchParams.delete('pix_payment');
                window.location.href = cleanUrl.toString();
              }
            }
          } catch (error) {
            console.error('[Onboarding] Erro ao verificar sessão Stripe:', error);
            setIsVerifyingPayment(false);
          }
        };

        setIsVerifyingPayment(true);
        verifyStripeSession();
      }
    }
  }, [searchParams, handleNext, isNewFlowUser, goToStep]);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'student') {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (!loading && state.onboardingCompleted && stepParam !== 'my_applications') {
      navigate('/student/dashboard');
    }
  }, [loading, state.onboardingCompleted, searchParams, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'student') {
    return null;
  }



  const feeStep: OnboardingStep = isNewFlowUser ? 'placement_fee' : 'scholarship_fee';
  const feeStepLabel = isNewFlowUser 
    ? t('registration:studentOnboarding.stepper.steps.placementFee') 
    : t('registration:studentOnboarding.stepper.steps.scholarshipFee');

  const allSteps: OnboardingStep[] = [
    'selection_fee',
    'selection_survey',
    'scholarship_selection',
    'process_type',
    'documents_upload',
    'payment',
    feeStep,
    'my_applications',
  ];
  // identity_verification é um passo fantasma — não aparece na trilha visual

  const visualSteps: { key: OnboardingStep; label: string }[] = [
    { key: 'selection_fee', label: t('registration:studentOnboarding.stepper.steps.selectionFee') },
    { key: 'selection_survey', label: t('registration:studentOnboarding.stepper.steps.selectionSurvey') },
    { key: 'scholarship_selection', label: t('registration:studentOnboarding.stepper.steps.scholarshipSelection') },
    { key: 'process_type', label: t('registration:studentOnboarding.stepper.steps.processType') },
    { key: 'documents_upload', label: t('registration:studentOnboarding.stepper.steps.documentsUpload') },
    { key: 'payment', label: t('registration:studentOnboarding.stepper.steps.payment') },
    { key: feeStep, label: feeStepLabel },
  ];

  const currentIdx = allSteps.indexOf(state.currentStep);

  const completedSteps: OnboardingStep[] = [];
  if (state.selectionFeePaid && currentIdx > allSteps.indexOf('selection_fee')) completedSteps.push('selection_fee');
  if (state.selectionSurveyPassed && currentIdx > allSteps.indexOf('selection_survey')) completedSteps.push('selection_survey');
  if (state.scholarshipsSelected && currentIdx > allSteps.indexOf('scholarship_selection')) completedSteps.push('scholarship_selection');
  if (state.processTypeSelected && currentIdx > allSteps.indexOf('process_type')) completedSteps.push('process_type');
  if (state.documentsUploaded && currentIdx > allSteps.indexOf('documents_upload')) completedSteps.push('documents_upload');
  if (state.applicationFeePaid && currentIdx > allSteps.indexOf('payment')) completedSteps.push('payment');
  const feeStepPaid = isNewFlowUser ? state.placementFeePaid : state.scholarshipFeePaid;
  if (feeStepPaid && currentIdx > allSteps.indexOf(feeStep)) completedSteps.push(feeStep);
  if (state.universityDocumentsUploaded && currentIdx > allSteps.indexOf('my_applications')) completedSteps.push('my_applications');

  const renderStep = () => {
    switch (state.currentStep) {
      case 'selection_fee':
        return <SelectionFeeStep onNext={handleNext} onBack={handleBack} />;
      case 'identity_verification':
        return <IdentityVerificationStep onNext={handleNext} onBack={handleBack} />;
      case 'selection_survey':
        return <SelectionSurveyStep onNext={handleNext} onBack={handleBack} />;
      case 'scholarship_selection':
        return <ScholarshipSelectionStep onNext={handleNext} onBack={handleBack} />;
      case 'process_type':
        return <ProcessTypeStep onNext={handleNext} onBack={handleBack} />;
      case 'documents_upload':
        return <DocumentsUploadStep onNext={handleNext} onBack={handleBack} />;
      case 'payment':
        return <PaymentStep onNext={handleNext} onBack={handleBack} />;
      case 'scholarship_fee':
        return <ScholarshipFeeStep onNext={handleNext} onBack={handleBack} />;
      case 'placement_fee':
        return <PlacementFeeStep onNext={handleNext} onBack={handleBack} />;
      case 'my_applications':
        return <UniversityDocumentsStep onNext={handleNext} onBack={handleBack} />;
      default:
        return <SelectionFeeStep onNext={handleNext} onBack={handleBack} />;
    }
  };

  if (showPaymentAnimation) {
    const stepParam = searchParams.get('step');
    let titleKey = 'selectionFeeStep.paid.title';
    if (stepParam === 'payment') titleKey = 'studentDashboard.progressBar.applicationFee';
    else if (stepParam === 'scholarship_fee') titleKey = 'studentDashboard.progressBar.scholarshipFee';
    else if (stepParam === 'placement_fee') titleKey = 'studentDashboard.progressBar.placementFee';
    else if (stepParam === 'my_applications') titleKey = 'studentDashboard.progressBar.i20ControlFee';

    return (
      <PaymentSuccessOverlay
        isSuccess={true}
        title={t(`${titleKey}`)}
        message={t('selectionFeeStep.paid.paidSubtitle')}
      />
    );
  }

  if (isVerifyingPayment) {
    const stepParam = searchParams.get('step');
    let translationKey = 'selectionProcessFee';
    if (stepParam === 'payment') translationKey = 'applicationFee';
    else if (stepParam === 'scholarship_fee') translationKey = 'scholarshipFee';
    else if (stepParam === 'placement_fee') translationKey = 'placementFee';
    else if (stepParam === 'my_applications') translationKey = 'i20ControlFee';

    return (
      <div className="flex-1 flex items-center justify-center bg-slate-300">
        <CustomLoading
          color="green"
          title={t(`successPages.${translationKey}.verifying`)}
          message={t(`successPages.${translationKey}.pleaseWait`)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col relative">
      {/* Background Camada Base (Chumbo + Blur) - Fixo para não afetar scroll */}
      <div className="fixed inset-0 bg-slate-300/80 backdrop-blur-3xl z-0 pointer-events-none" />

      {/* Background blobs decorativos */}
      {/* Background blobs decorativos removidos parcialmente */}
      <div className="fixed bottom-0 left-0 -ml-20 -mb-20 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-slate-600/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Removido padrão diagonal de logos no fundo */}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8 flex-1 flex flex-col relative z-10">
        {true && (
          <div className="mb-4 sm:mb-6 flex justify-between items-center">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors bg-white hover:bg-gray-50 px-4 py-2 rounded-xl shadow-sm border border-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Voltar</span>
            </button>

            <div className="flex items-center gap-3">
              {/* Notifications Bell */}
              <div className="relative notifications-container">
                <button
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setShowNotificationsModal(true);
                    } else {
                      setShowNotif(!showNotif);
                    }
                  }}
                  className="relative p-2 rounded-xl bg-white hover:bg-gray-50 transition-colors shadow-sm border border-gray-100 flex items-center justify-center h-[42px] w-[42px]"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {newNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm">
                      {newNotificationCount > 99 ? '99+' : newNotificationCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown - Desktop */}
                {showNotif && (
                  <div className="hidden md:block absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-300 py-2 z-[100]">
                    <div className="px-4 pb-2 border-b border-slate-300 font-semibold text-slate-900 flex items-center justify-between">
                      <span className="text-sm">Notificações</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <button onClick={() => markAllAsRead()} className="text-blue-600 hover:underline">Marcar todas</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={() => clearAll()} className="text-red-600 hover:underline">Limpar</button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-slate-500 text-center">Nenhuma notificação</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 ${!n.read_at ? 'bg-blue-50/30' : ''}`} onClick={() => openNotification(n)}>
                            <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                              <span className="truncate pr-4">{n.title}</span>
                              {!n.read_at && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></span>}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <LanguageSelector variant="dashboard" showLabel={true} />
              <button
                onClick={() => navigate('/student/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors bg-white hover:bg-gray-50 px-4 py-2 rounded-xl shadow-sm border border-gray-100 h-[42px]"
              >
                <span className="font-medium">Dashboard</span>
              </button>
            </div>
          </div>
        )}

        {state.currentStep !== 'my_applications' && (
          <div className="mb-6 sm:mb-8">
            <StepIndicator
              currentStep={state.currentStep === 'identity_verification' ? 'selection_survey' : state.currentStep}
              completedSteps={completedSteps}
              steps={visualSteps}
            />
          </div>
        )}

        <div className="w-full flex-1 flex flex-col">
          {renderStep()}
        </div>
      </div>

      {/* Notifications Modal - for mobile */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onNotificationClick={async (notification) => {
          await markAsRead(notification.id);
          if (notification.link) {
            navigate(notification.link);
          }
          setShowNotificationsModal(false);
        }}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAll}
      />
    </div>
  );
};

export default StudentOnboarding;
