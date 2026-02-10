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

const StudentOnboarding: React.FC = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, loading, goToStep } = useOnboardingProgress();
  const { t } = useTranslation();
  
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const validSteps: OnboardingStep[] = ['welcome', 'selection_fee', 'scholarship_selection', 'scholarship_review', 'process_type', 'documents_upload', 'waiting_approval', 'completed'];
      if (validSteps.includes(stepParam as OnboardingStep)) {
        window.localStorage.setItem('onboarding_current_step', stepParam);
        if (stepParam === 'welcome') {
          goToStep('welcome');
        } else {
          setTimeout(() => {
            goToStep(stepParam as OnboardingStep);
          }, 100);
        }
      }
    }
  }, [searchParams, goToStep]);

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment');
    const stepParam = searchParams.get('step');
    const sessionId = searchParams.get('session_id');

    if (paymentSuccess === 'success' && stepParam && sessionId) {
      const verifyStripeSession = async () => {
        try {
          let edgeFunctionName = '';
          if (stepParam === 'scholarship_selection') {
            edgeFunctionName = 'verify-stripe-session-selection-process-fee';
          } else if (stepParam === 'waiting_approval') {
            edgeFunctionName = 'verify-stripe-session-application-fee';
          } else if (stepParam === 'completed') {
            edgeFunctionName = 'verify-stripe-session-scholarship-fee';
          }

          if (!edgeFunctionName) return;

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
            setTimeout(() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('payment');
              url.searchParams.delete('session_id');
              url.searchParams.delete('pix_payment');
              window.history.replaceState({}, '', url.toString());
              window.location.reload();
            }, 6000);
          } else {
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
      setShowPaymentAnimation(true);
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('payment');
        window.history.replaceState({}, '', url.toString());
        window.location.reload();
      }, 6000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'student') {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!loading && state.onboardingCompleted) {
      navigate('/student/dashboard');
    }
  }, [loading, state.onboardingCompleted, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
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
        
        window.localStorage.removeItem('onboarding_current_step');
        navigate('/student/dashboard');
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }
  };

  const completedSteps: OnboardingStep[] = [];
  if (state.currentStep !== 'welcome') completedSteps.push('welcome');
  if (state.selectionFeePaid) completedSteps.push('selection_fee');
  if (state.currentStep !== 'scholarship_selection' && state.scholarshipsSelected) {
    completedSteps.push('scholarship_selection');
  }
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
          <div className="text-center py-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
            <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Onboarding concluído!</h2>
            <p className="text-white/60 mb-8">Você completou todas as etapas necessárias.</p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20"
            >
              Ir para o Painel
            </button>
          </div>
        );
      default:
        return <WelcomeStep onNext={handleNext} onBack={handleBack} />;
    }
  };

  if (showPaymentAnimation) {
    return (
      <PaymentSuccessOverlay
        isSuccess={true}
        title={t('successPages.selectionProcessFee.title')}
        message={t('successPages.common.paymentProcessedAmount')}
      />
    );
  }

  if (isVerifyingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <CustomLoading 
          color="green" 
          title={t('successPages.selectionProcessFee.verifying')} 
          message={t('successPages.selectionProcessFee.pleaseWait')} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] w-full flex flex-col relative overflow-hidden">
      {/* Background blobs decorativos */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Padrão diagonal inspirado em marcas de luxo - fixo na viewport */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Linha 1 - y:0% */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '0%', left: '0%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '0%', left: '16%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '0%', left: '33%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '0%', left: '50%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '0%', left: '66%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '0%', left: '83%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        
        {/* Linha 2 - y:12% offset diagonal */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '12%', left: '8%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '12%', left: '25%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '12%', left: '42%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '12%', left: '58%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '12%', left: '75%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '12%', left: '92%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        
        {/* Linha 3 - y:25% */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '25%', left: '0%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '25%', left: '16%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '25%', left: '33%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '25%', left: '50%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '25%', left: '66%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '25%', left: '83%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        
        {/* Linha 4 - y:37% offset diagonal */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '37%', left: '8%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '37%', left: '25%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '37%', left: '42%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '37%', left: '58%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '37%', left: '75%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '37%', left: '92%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        
        {/* Linha 5 - y:50% */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '50%', left: '0%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '50%', left: '16%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '50%', left: '33%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '50%', left: '50%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '50%', left: '66%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '50%', left: '83%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        
        {/* Linha 6 - y:62% offset diagonal */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '62%', left: '8%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '62%', left: '25%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '62%', left: '42%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '62%', left: '58%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '62%', left: '75%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '62%', left: '92%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        
        {/* Linha 7 - y:75% */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '75%', left: '0%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '75%', left: '16%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '75%', left: '33%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '75%', left: '50%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '75%', left: '66%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '75%', left: '83%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        
        {/* Linha 8 - y:87% offset diagonal */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '87%', left: '8%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '87%', left: '25%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '87%', left: '42%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '87%', left: '58%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '87%', left: '75%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '87%', left: '92%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        
        {/* Linha 9 - y:96% */}
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '96%', left: '0%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '96%', left: '16%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '96%', left: '33%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '96%', left: '50%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '96%', left: '66%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
        <div className="absolute opacity-5 w-16 h-16" style={{ top: '96%', left: '83%', backgroundImage: 'url(/favicon-branco.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'blur(1px)' }} />
      </div>
      
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8 flex-1 flex flex-col relative z-10">
        {state.currentStep !== 'welcome' && (
          <div className="mb-4 sm:mb-6 flex justify-between items-center">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors bg-white hover:bg-gray-50 px-4 py-2 rounded-xl shadow-sm border border-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Voltar</span>
            </button>

            <button
              onClick={() => navigate('/student/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors bg-white hover:bg-gray-50 px-4 py-2 rounded-xl shadow-sm border border-gray-100"
            >
              <span className="font-medium">Dashboard</span>
            </button>
          </div>
        )}

        {state.currentStep !== 'welcome' && (
          <div className="mb-6 sm:mb-8">
            <StepIndicator currentStep={state.currentStep} completedSteps={completedSteps} />
          </div>
        )}

        <div className="w-full flex-1 flex flex-col">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default StudentOnboarding;
