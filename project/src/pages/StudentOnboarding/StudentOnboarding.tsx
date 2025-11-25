import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingProgress } from './hooks/useOnboardingProgress';
import { StepIndicator } from './components/StepIndicator';
import { WelcomeStep } from './components/WelcomeStep';
import { SelectionFeeStep } from './components/SelectionFeeStep';
import { ScholarshipSelectionStep } from './components/ScholarshipSelectionStep';
import { ScholarshipReviewStep } from './components/ScholarshipReviewStep';
import { ProcessTypeStep } from './components/ProcessTypeStep';
import { DocumentsUploadStep } from './components/DocumentsUploadStep';
import { WaitingApprovalStep } from './components/WaitingApprovalStep';
import { OnboardingStep } from './types';
import { supabase } from '../../lib/supabase';
import PaymentSuccessOverlay from '../../components/PaymentSuccessOverlay';
import CustomLoading from '../../components/CustomLoading';
import { useTranslation } from 'react-i18next';

const STEPS = [
  { key: 'welcome' as OnboardingStep, label: 'Welcome' },
  { key: 'selection_fee' as OnboardingStep, label: 'Selection Process Fee' },
  { key: 'scholarship_selection' as OnboardingStep, label: 'Choose Scholarships' },
  { key: 'scholarship_review' as OnboardingStep, label: 'Review Scholarships' },
  { key: 'process_type' as OnboardingStep, label: 'Process Type' },
  { key: 'documents_upload' as OnboardingStep, label: 'Upload Documents' },
  { key: 'waiting_approval' as OnboardingStep, label: 'Review & Payments' },
];

const StudentOnboarding: React.FC = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, loading, checkProgress, goToStep, markStepComplete } = useOnboardingProgress();
  const { t } = useTranslation();
  
  // Estados para animação de sucesso do pagamento
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Ler step da URL quando o componente carrega - deve ter prioridade sobre checkProgress
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const validSteps: OnboardingStep[] = ['welcome', 'selection_fee', 'scholarship_selection', 'scholarship_review', 'process_type', 'documents_upload', 'waiting_approval', 'completed'];
      if (validSteps.includes(stepParam as OnboardingStep)) {
        // Salvar o step da URL no localStorage imediatamente para que checkProgress o respeite
        window.localStorage.setItem('onboarding_current_step', stepParam);
        
        // Se o step da URL for 'welcome', ir direto para welcome
        // Isso garante que a página de welcome seja mostrada completamente, sem StepIndicator
        if (stepParam === 'welcome') {
          goToStep('welcome');
        } else {
          // Para outros steps, aplicar após um pequeno delay
          setTimeout(() => {
            goToStep(stepParam as OnboardingStep);
          }, 100);
        }
      }
    }
  }, [searchParams, goToStep]);

  // Verificar se veio de pagamento bem-sucedido e processar sessão do Stripe
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment');
    const stepParam = searchParams.get('step');
    const sessionId = searchParams.get('session_id');

    if (paymentSuccess === 'success' && stepParam && sessionId) {
      console.log('[Onboarding] Pagamento detectado - verificando sessão Stripe:', sessionId);
      
      // Chamar Edge Function para verificar e registrar o pagamento
      const verifyStripeSession = async () => {
        try {
          // Determinar qual edge function chamar baseado no step
          let edgeFunctionName = '';
          if (stepParam === 'scholarship_selection') {
            edgeFunctionName = 'verify-stripe-session-selection-process-fee';
          } else if (stepParam === 'waiting_approval') {
            // Pode ser application_fee ou scholarship_fee - tentar detectar ou usar fallback
            edgeFunctionName = 'verify-stripe-session-application-fee';
          } else if (stepParam === 'completed') {
            edgeFunctionName = 'verify-stripe-session-scholarship-fee';
          }

          if (!edgeFunctionName) {
            console.warn('[Onboarding] Não foi possível determinar edge function para verificação');
            return;
          }

          const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
          const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/${edgeFunctionName}`;
          
          // Obter token
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

          console.log('[Onboarding] Chamando edge function:', edgeFunctionName);
          const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({ sessionId }),
          });

          const data = await response.json();
          console.log('[Onboarding] Resposta da verificação:', data);

          if (data.status === 'complete' || data.success) {
            console.log('[Onboarding] ✅ Pagamento verificado e registrado com sucesso!');
            
            // Mostrar animação de sucesso
            setIsVerifyingPayment(false);
            setShowPaymentAnimation(true);
            
            // Aguardar 6 segundos (animação completa) antes de recarregar
            setTimeout(() => {
              // Remover parâmetros de pagamento da URL
              const url = new URL(window.location.href);
              url.searchParams.delete('payment');
              url.searchParams.delete('session_id');
              url.searchParams.delete('pix_payment');
              window.history.replaceState({}, '', url.toString());
              
              // Forçar reload do profile e progresso
              window.location.reload();
            }, 6000);
          } else {
            console.warn('[Onboarding] ⚠️ Pagamento não foi completado:', data);
            setIsVerifyingPayment(false);
          }
        } catch (error) {
          console.error('[Onboarding] Erro ao verificar sessão Stripe:', error);
          setIsVerifyingPayment(false);
        }
      };

      setIsVerifyingPayment(true);
      verifyStripeSession();
    } else if (paymentSuccess === 'success' && stepParam) {
      // Sem session_id (pode ser Zelle) - mostrar animação e recarregar
      setShowPaymentAnimation(true);
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('payment');
        window.history.replaceState({}, '', url.toString());
        window.location.reload();
      }, 6000);
    }
  }, [searchParams]);

  // Redirecionar se não for aluno
  useEffect(() => {
    if (!authLoading && user && user.role !== 'student') {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Redirecionar se onboarding já foi completado
  useEffect(() => {
    if (!loading && state.onboardingCompleted) {
      navigate('/student/dashboard');
    }
  }, [loading, state.onboardingCompleted, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  const handleNext = () => {
    const steps: OnboardingStep[] = [
      'welcome',
      'selection_fee',
      'scholarship_selection',
      'scholarship_review',
      'process_type',
      'documents_upload',
      'waiting_approval',
      'completed',
    ];

    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < steps.length - 1) {
      goToStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: OnboardingStep[] = [
      'welcome',
      'selection_fee',
      'scholarship_selection',
      'scholarship_review',
      'process_type',
      'documents_upload',
      'waiting_approval',
      'completed',
    ];

    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      goToStep(steps[currentIndex - 1]);
    }
  };

  const handleComplete = async () => {
    if (userProfile?.id) {
      try {
        await supabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('id', userProfile.id);
        
        // Limpar step salvo do localStorage
        window.localStorage.removeItem('onboarding_current_step');
        
        navigate('/student/dashboard');
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }
  };

  const completedSteps: OnboardingStep[] = [];
  // Welcome is always completed if we're past it
  if (state.currentStep !== 'welcome') completedSteps.push('welcome');
  if (state.selectionFeePaid) completedSteps.push('selection_fee');
  // scholarship_selection só é completado quando passa para scholarship_review
  if (state.currentStep !== 'scholarship_selection' && state.scholarshipsSelected) {
    completedSteps.push('scholarship_selection');
  }
  // scholarship_review é completado quando passa para process_type
  if (state.processTypeSelected) {
    completedSteps.push('scholarship_review');
    completedSteps.push('process_type');
  }
  if (state.documentsUploaded) completedSteps.push('documents_upload');
  if (state.documentsApproved) completedSteps.push('waiting_approval');

  const renderStep = () => {
    switch (state.currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={handleNext} onBack={handleBack} />;
      case 'selection_fee':
        return <SelectionFeeStep onNext={handleNext} onBack={handleBack} />;
      case 'scholarship_selection':
        return <ScholarshipSelectionStep onNext={handleNext} onBack={handleBack} />;
      case 'scholarship_review':
        return <ScholarshipReviewStep onNext={handleNext} onBack={handleBack} />;
      case 'process_type':
        return <ProcessTypeStep onNext={handleNext} onBack={handleBack} />;
      case 'documents_upload':
        return <DocumentsUploadStep onNext={handleNext} onBack={handleBack} />;
      case 'waiting_approval':
        return <WaitingApprovalStep onNext={handleNext} onBack={handleBack} onComplete={handleComplete} />;
      case 'completed':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Onboarding Complete!</h2>
            <p className="text-gray-600 mb-6">You've completed all required steps.</p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        );
      default:
        return <WelcomeStep onNext={handleNext} onBack={handleBack} />;
    }
  };

  // Mostrar animação de sucesso do pagamento
  if (showPaymentAnimation) {
    return (
      <PaymentSuccessOverlay
        isSuccess={true}
        title={t('successPages.selectionProcessFee.title')}
        message={t('successPages.common.paymentProcessedAmount')}
      />
    );
  }

  // Mostrar loading enquanto verifica o pagamento
  if (isVerifyingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <CustomLoading 
          color="green" 
          title={t('successPages.selectionProcessFee.verifying')} 
          message={t('successPages.selectionProcessFee.pleaseWait')} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full flex flex-col">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8 flex-1 flex flex-col">
        {/* Header - apenas para steps após welcome */}
        {state.currentStep !== 'welcome' && (
          <div className="mb-4 sm:mb-6">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          </div>
        )}

        {/* Step Indicator - oculto no welcome */}
        {state.currentStep !== 'welcome' && (
          <div className="mb-6 sm:mb-8">
            <StepIndicator currentStep={state.currentStep} completedSteps={completedSteps} />
          </div>
        )}

        {/* Main Content - flex-1 para ocupar espaço disponível */}
        <div className="w-full flex-1 flex flex-col">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default StudentOnboarding;

