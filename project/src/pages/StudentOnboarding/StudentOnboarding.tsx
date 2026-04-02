import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingProgress } from './hooks/useOnboardingProgress';
import { StepIndicator } from './components/StepIndicator';
import { SelectionFeeStep } from './components/SelectionFeeStep';
import { ScholarshipSelectionStep } from './components/ScholarshipSelectionStep';
import { DocumentsUploadStep } from './components/DocumentsUploadStep';
import { PaymentStep } from './components/PaymentStep'; // Payment step component
import { ScholarshipFeeStep } from './components/ScholarshipFeeStep';
import { PlacementFeeStep } from './components/PlacementFeeStep';
import { UniversityDocumentsStep } from './components/UniversityDocumentsStep';
import { SelectionSurveyStep } from './components/SelectionSurveyStep';
import { IdentityVerificationStep } from './components/IdentityVerificationStep';
import { ReinstatementFeeStep } from './components/ReinstatementFeeStep';
import { ProcessTypeStep } from './components/ProcessTypeStep';
import { OnboardingStep } from './types';
import PaymentSuccessOverlay from '../../components/PaymentSuccessOverlay';

// Lazy loading de cada step — cada um vira um chunk separado no bundle
const SelectionFeeStep = React.lazy(() =>
  import('./components/SelectionFeeStep').then(m => ({ default: m.SelectionFeeStep }))
);
const IdentityVerificationStep = React.lazy(() =>
  import('./components/IdentityVerificationStep').then(m => ({ default: m.IdentityVerificationStep }))
);
const SelectionSurveyStep = React.lazy(() =>
  import('./components/SelectionSurveyStep').then(m => ({ default: m.SelectionSurveyStep }))
);
const ScholarshipSelectionStep = React.lazy(() =>
  import('./components/ScholarshipSelectionStep').then(m => ({ default: m.ScholarshipSelectionStep }))
);
const ProcessTypeStep = React.lazy(() =>
  import('./components/ProcessTypeStep').then(m => ({ default: m.ProcessTypeStep }))
);
const DocumentsUploadStep = React.lazy(() =>
  import('./components/DocumentsUploadStep').then(m => ({ default: m.DocumentsUploadStep }))
);
const PaymentStep = React.lazy(() =>
  import('./components/PaymentStep').then(m => ({ default: m.PaymentStep }))
);
const ScholarshipFeeStep = React.lazy(() =>
  import('./components/ScholarshipFeeStep').then(m => ({ default: m.ScholarshipFeeStep }))
);
const PlacementFeeStep = React.lazy(() =>
  import('./components/PlacementFeeStep').then(m => ({ default: m.PlacementFeeStep }))
);
const ReinstatementFeeStep = React.lazy(() =>
  import('./components/ReinstatementFeeStep').then(m => ({ default: m.ReinstatementFeeStep }))
);
const UniversityDocumentsStep = React.lazy(() =>
  import('./components/UniversityDocumentsStep').then(m => ({ default: m.UniversityDocumentsStep }))
);

import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import { useSmartPollingNotifications } from '../../hooks/useSmartPollingNotifications';
import NotificationsModal from '../../components/NotificationsModal';

const StudentOnboarding: React.FC = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const processingPaymentRef = React.useRef<string | null>(null);
  // Controle de progresso do onboarding
  const { state, loading, goToStep } = useOnboardingProgress();
  const { t } = useTranslation(['common', 'registration', 'payment', 'dashboard']);
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('payment') === 'success';
  });
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
    const isTransferInactive = userProfile?.student_process_type === 'transfer' && userProfile?.visa_transfer_active === false;
    const processTypeSet = userProfile?.student_process_type &&
      ['initial', 'transfer', 'change_of_status'].includes(userProfile.student_process_type);

    const base: OnboardingStep[] = [
      'selection_fee',
      'identity_verification',
      'selection_survey',
      'scholarship_selection',
      ...(!processTypeSet ? ['process_type' as OnboardingStep] : []),
      'documents_upload',
      'payment',
      isNewFlowUser ? 'placement_fee' : 'scholarship_fee',
    ];

    if (isTransferInactive) {
      base.push('reinstatement_fee');
    }

    base.push('my_applications');
    base.push('completed');
    return base;
  }, [isNewFlowUser, userProfile]);

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

  // Controle de montagem inicial para ler a URL apenas uma vez
  const isInitialMount = React.useRef(true);

  // 1. Sincronizar URL -> Estado (Apenas no carregamento inicial ou POPSTATE do navegador)
  useEffect(() => {
    if (isVerifyingPayment || showPaymentAnimation) return;

    // Se não for a montagem inicial, não forçamos o estado pela URL 
    // a menos que o usuário clique no botão "Voltar" do navegador (popstate)
    const handlePopState = () => {
      const stepParam = new URLSearchParams(window.location.search).get('step');
      if (stepParam) {
        const validSteps: OnboardingStep[] = ['selection_fee', 'identity_verification', 'selection_survey', 'scholarship_selection', 'process_type', 'documents_upload', 'payment', 'scholarship_fee', 'placement_fee', 'my_applications'];
        if (validSteps.includes(stepParam as OnboardingStep) && stepParam !== state.currentStep) {
          console.log('[Onboarding] 🌐 PopState detectado, forçando step:', stepParam);
          goToStep(stepParam as OnboardingStep);
        }
      }
    };

    if (isInitialMount.current) {
      const stepParam = searchParams.get('step');
      if (stepParam) {
        const validSteps: OnboardingStep[] = ['selection_fee', 'identity_verification', 'selection_survey', 'scholarship_selection', 'process_type', 'documents_upload', 'payment', 'scholarship_fee', 'placement_fee', 'my_applications'];
        if (validSteps.includes(stepParam as OnboardingStep) && stepParam !== state.currentStep) {
          console.log('[Onboarding] 🚀 Carga inicial, forçando step via URL:', stepParam);
          goToStep(stepParam as OnboardingStep);
        }
      }
      isInitialMount.current = false;
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [goToStep, isVerifyingPayment, showPaymentAnimation]); // Removemos searchParams para evitar loop reativo

  // 2. Sincronizar Estado -> URL (A única fonte de verdade durante a navegação interna)
  useEffect(() => {
    if (isVerifyingPayment || showPaymentAnimation || isInitialMount.current || loading) return;

    const currentStepUrl = searchParams.get('step');

    // 🎯 PROTEÇÃO: Se o estado interno recuou mas a URL é identity_verification (um passo especial),
    // não forçamos a volta para a URL a menos que o estado esteja MUITO inconsistente.
    // Isso evita o loop de redirecionamento em erros 406.
    if (state.currentStep && state.currentStep !== currentStepUrl) {
      if (currentStepUrl === 'identity_verification' && state.currentStep === 'selection_fee') {
        console.warn('[Onboarding] 🚧 Bloqueando redirecionamento circular de identity_verification -> selection_fee');
        return;
      }

      console.log(`[Onboarding] 🔄 Sincronizando URL com Estado: ${state.currentStep}`);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('step', state.currentStep);
      navigate(`?${newParams.toString()}`, { replace: true });
    }
  }, [state.currentStep, searchParams, navigate, isVerifyingPayment, showPaymentAnimation, loading]);

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
    // Corrige bug da Parcelow: os parâmetros chegam como &amp; ou &amp%3B (%3B = ; percent-encoded)
    // Exemplo: ?step=my_applications&amp%3Bpayment=success&amp%3Bref=ds16_xxx
    const rawSearch = window.location.search;
    const hasAmpEncoded = rawSearch.includes('&amp%3B');   // &amp;  com ; percent-encoded
    const hasAmpLiteral = rawSearch.includes('&amp;');     // &amp;  com ; literal
    if (hasAmpEncoded || hasAmpLiteral) {
      // Normalizar: substituir qualquer variante de &amp; por &
      const fixedSearch = rawSearch
        .replace(/&amp%3B/gi, '&')   // &amp%3B → &
        .replace(/&amp;/gi, '&');    // &amp;   → &
      navigate(`${window.location.pathname}${fixedSearch}`, { replace: true });
      return;
    }

    const paymentSuccess = searchParams.get('payment');
    const stepParam = searchParams.get('step');
    const sessionId = searchParams.get('session_id');


    if (paymentSuccess === 'cancelled') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('session_id');
      newParams.delete('pix_payment');
      setSearchParams(newParams, { replace: true });
      return;
    }


    if (paymentSuccess === 'success' && stepParam) {
      const paymentKey = sessionId || 'manual_pix';
      if (processingPaymentRef.current === paymentKey) return;
      processingPaymentRef.current = paymentKey;

      if (!sessionId || sessionId === '{CHECKOUT_SESSION_ID}') {
        // Fluxo Parcelow (sem session_id – pagamento assíncrono)
        // Aguarda o webhook processar e o registro aparecer no banco
        setIsVerifyingPayment(true);

        const refParam = searchParams.get('ref');

        // Para taxas de pacote (ds160/i539), fazer poll do banco
        if (stepParam === 'my_applications' && refParam) {
          const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
          let pollCount = 0;
          const MAX_POLLS = 10; // 30 segundos

          const pollPackagePayment = async () => {
            pollCount++;
            try {
              let token: string | null = null;
              const raw = localStorage.getItem(`sb-${SUPABASE_PROJECT_URL.split('//')[1].split('.')[0]}-auth-token`);
              if (raw) { token = JSON.parse(raw)?.access_token || null; }

              if (!token) {
                setIsVerifyingPayment(false);
                return;
              }

              // Verificar se o registro foi criado com status paid
              const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/individual_fee_payments?parcelow_reference=eq.${encodeURIComponent(refParam)}&parcelow_status=eq.paid&select=id,fee_type`, {
                headers: {
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                  // Pagamento confirmado!
                  setIsVerifyingPayment(false);
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('payment');
                  newParams.delete('session_id');
                  newParams.delete('ref');
                  newParams.delete('pm');
                  newParams.delete('fee_type');
                  newParams.delete('f'); // Remove também o f= se existir
                  setSearchParams(newParams, { replace: true });
                  return;
                }
              }

              if (pollCount < MAX_POLLS) {
                setTimeout(pollPackagePayment, 3000);
              } else {
                // Timeout — limpa URL mesmo assim
                setIsVerifyingPayment(false);
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('payment');
                newParams.delete('session_id');
                newParams.delete('ref');
                newParams.delete('pm');
                newParams.delete('fee_type');
                newParams.delete('f');
                setSearchParams(newParams, { replace: true });
              }
            } catch {
              setIsVerifyingPayment(false);
            }
          };

          pollPackagePayment();
        } else {
          // Outros steps (sem package fee) — aguarda 8s como antes
          setTimeout(() => {
            setIsVerifyingPayment(false);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('payment');
            newParams.delete('session_id');
            newParams.delete('pix_payment');
            setSearchParams(newParams, { replace: true });

            setTimeout(() => {
              setShowPaymentAnimation(false);
              const currentStepParam = searchParams.get('step');

              if (currentStepParam === 'payment') {
                // Ao pagar a taxa de aplicação, vai para a placement_fee ou scholarship_fee
                const nextFeeStep: OnboardingStep = isNewFlowUserRef.current ? 'placement_fee' : 'scholarship_fee';
                console.log(`[Onboarding] 🚀 Pagamento confirmado via Parcelow. Indo para: ${nextFeeStep}`);
                goToStep(nextFeeStep);
              } else if (currentStepParam === 'scholarship_fee' || currentStepParam === 'placement_fee') {
                // Ao pagar as taxas finais, vai para a listagem ou corrige fluxo
                if (isNewFlowUserRef.current && currentStepParam === 'scholarship_fee') {
                  console.log('[Onboarding] 🚧 Redirecionamento Parcelow incorreto (scholarship_fee no novo fluxo). Corrigindo para placement_fee.');
                  goToStep('placement_fee');
                } else {
                  console.log('[Onboarding] 🚀 Pagamento de Taxa Final confirmado via Parcelow. Finalizando onboarding.');
                  goToStep('my_applications');
                }
              } else {
                const finalParams = new URLSearchParams(searchParams);
                finalParams.delete('payment');
                finalParams.delete('session_id');
                finalParams.delete('pix_payment');
                setSearchParams(finalParams, { replace: true });
              }
            }, 600); // Reduzido de 4000 para 600ms para ser mais rápido
          }, 8000); // Reduzido de 10000 para 8000ms
        } // fecha else (outros steps)
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
            } else if (stepParam === 'reinstatement_fee') {
              edgeFunctionName = 'verify-stripe-session-reinstatement-fee';
            } else if (stepParam === 'my_applications') {
              // Detectar se é uma taxa de pacote (ds160 ou i539) ou i20 padrão
              const feeTypeParam = searchParams.get('fee_type');
              if (feeTypeParam === 'ds160_package' || feeTypeParam === 'i539_cos_package') {
                edgeFunctionName = 'verify-stripe-session-package-fee';
              } else {
                edgeFunctionName = 'verify-stripe-session-i20-control-fee';
              }
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
                // Lógica de transição dinâmica baseada na ordem dos passos
                const orderedSteps = getOrderedSteps();
                const currentIndex = orderedSteps.indexOf(stepParam as OnboardingStep);

                if (currentIndex !== -1 && currentIndex < orderedSteps.length - 1) {
                  let nextStep = orderedSteps[currentIndex + 1];

                  // Pular identity_verification se já estiver verificado ou se for um passo fantasma
                  if (nextStep === 'identity_verification') {
                    nextStep = orderedSteps[currentIndex + 2] || 'my_applications';
                  }

                  console.log(`[Onboarding] 💳 Pagamento de ${stepParam} confirmado. Progredindo para: ${nextStep}`);
                  goToStep(nextStep);
                } else {
                  // Fallback para limpar a URL se for o último passo
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('payment');
                  newParams.delete('session_id');
                  newParams.delete('pix_payment');
                  setSearchParams(newParams, { replace: true });
                }

              }, 600); // Reduzido de 4000 para 600ms
            } else if ((data.status === 'open' || data.status === 'pending') && pollCount < MAX_POLLS) {
              // Pagamento assíncrono (ex: PIX), tenta novamente a cada 3s
              setTimeout(verifyStripeSession, 3000);
            } else {
              // Falha ou tempo limite estourado, sai da tela de verificação
              setIsVerifyingPayment(false);
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('payment');
              newParams.delete('session_id');
              newParams.delete('pix_payment');
              setSearchParams(newParams, { replace: true });
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
    if (!loading && state.onboardingCompleted) {
      console.log('[Onboarding] 🏁 Onboarding concluído, redirecionando para Dashboard Applications');
      navigate('/student/dashboard/applications', { replace: true });
    }
  }, [loading, state.onboardingCompleted, navigate]);

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

  // Centralizando a definição de todos os passos para evitar redundância
  const allOrderedSteps = getOrderedSteps();

  // Filtramos apenas as chaves que queremos exibir (removendo identity_verification e completed)
  const allSteps: OnboardingStep[] = allOrderedSteps.filter(s => s !== 'identity_verification' && s !== 'completed');

  const visualSteps: { key: OnboardingStep; label: string }[] = [
    { key: 'selection_fee', label: t('registration:studentOnboarding.stepper.steps.selectionFee') },
    { key: 'selection_survey', label: t('registration:studentOnboarding.stepper.steps.selectionSurvey') },
    { key: 'scholarship_selection', label: t('registration:studentOnboarding.stepper.steps.scholarshipSelection') },
    { key: 'documents_upload', label: t('registration:studentOnboarding.stepper.steps.documentsUpload') },
    { key: 'payment', label: t('registration:studentOnboarding.stepper.steps.payment') },
    { key: feeStep, label: feeStepLabel || '' },
  ];

  const isTransferInactive = userProfile?.student_process_type === 'transfer' && userProfile?.visa_transfer_active === false;
  if (isTransferInactive) {
    visualSteps.push({ key: 'reinstatement_fee', label: t('registration:studentOnboarding.stepper.steps.reinstatementFee') });
  }

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

  if (state.reinstatementFeePaid && currentIdx > allSteps.indexOf('reinstatement_fee')) completedSteps.push('reinstatement_fee');

  if (state.universityDocumentsUploaded && currentIdx > allSteps.indexOf('my_applications')) completedSteps.push('my_applications');

  const StepFallback = (
    <div className="min-h-[300px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  const renderStep = () => {
    const stepContent = (() => {
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
          return <ScholarshipFeeStep onNext={handleNext} onBack={handleBack} currentStep={state.currentStep} />;
        case 'placement_fee':
          return <PlacementFeeStep onNext={handleNext} onBack={handleBack} currentStep={state.currentStep} />;
        case 'reinstatement_fee':
          return <ReinstatementFeeStep onNext={handleNext} onBack={handleBack} currentStep={state.currentStep} />;
        case 'my_applications':
          return <UniversityDocumentsStep onNext={handleNext} onBack={handleBack} />;
        default:
          return <SelectionFeeStep onNext={handleNext} onBack={handleBack} />;
      }
    })();

    return (
      <Suspense fallback={StepFallback}>
        {stepContent}
      </Suspense>
    );
  };

  if (showPaymentAnimation || isVerifyingPayment) {
    const stepParam = searchParams.get('step');

    // Mapeamento para o título final (sucesso) - Usamos os nomes das taxas do dashboard
    let titleKey = 'dashboard:studentDashboard.progressBar.selectionProcessFee';
    if (stepParam === 'payment') titleKey = 'dashboard:studentDashboard.progressBar.applicationFee';
    else if (stepParam === 'scholarship_fee') titleKey = 'dashboard:studentDashboard.progressBar.scholarshipFee';
    else if (stepParam === 'placement_fee') titleKey = 'dashboard:studentDashboard.progressBar.placementFee';
    else if (stepParam === 'my_applications') titleKey = 'dashboard:studentDashboard.progressBar.i20ControlFee';

    // Mapeamento para as chaves de verificação em successPages.[namespace] do common.json
    let successNS = 'selectionProcessFee';
    if (stepParam === 'payment') successNS = 'applicationFee';
    else if (stepParam === 'scholarship_fee') successNS = 'scholarshipFee';
    else if (stepParam === 'placement_fee') successNS = 'placementFee';
    else if (stepParam === 'my_applications') successNS = 'i20ControlFee';

    return (
      <PaymentSuccessOverlay
        isSuccess={true}
        title={isVerifyingPayment ? t(`common:successPages.${successNS}.verifying`) : t(`${titleKey}`)}
        message={isVerifyingPayment ? t(`common:successPages.${successNS}.pleaseWait`) : t('payment:selectionFeeStep.paid.paidSubtitle')}
      />
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
            {window.location.hostname === 'localhost' && (
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors bg-white hover:bg-gray-50 px-4 py-2 rounded-xl shadow-sm border border-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">{t('common:common.back')}</span>
              </button>
            )}

            <div className="flex items-center gap-3 ml-auto">
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
                      <span className="text-sm">{t('dashboard:studentDashboard.notifications.title')}</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <button onClick={() => markAllAsRead()} className="text-blue-600 hover:underline">{t('dashboard:studentDashboard.notifications.markAllAsRead')}</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={() => clearAll()} className="text-red-600 hover:underline">{t('dashboard:studentDashboard.notifications.clearAll')}</button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-slate-500 text-center">{t('dashboard:studentDashboard.notifications.noNotifications')}</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 ${!n.read_at ? 'bg-blue-50/30' : ''}`} onClick={() => openNotification(n)}>
                            <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                              <span className="truncate pr-4">{t(`dashboard:studentDashboard.notifications.${n.title}`, n.title)}</span>
                              {!n.read_at && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></span>}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 line-clamp-2">{t(`dashboard:studentDashboard.notifications.${n.message}`, n.message)}</div>
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
                <span className="font-medium">{t('common:nav.dashboard')}</span>
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
