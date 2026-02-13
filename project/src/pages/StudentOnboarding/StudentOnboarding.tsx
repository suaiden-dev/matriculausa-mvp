import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingProgress } from './hooks/useOnboardingProgress';
import { StepIndicator } from './components/StepIndicator';
import { WelcomeStep } from './components/WelcomeStep';
import { SelectionFeeStep } from './components/SelectionFeeStep';
import { ScholarshipSelectionStep } from './components/ScholarshipSelectionStep';
import { ProcessTypeStep } from './components/ProcessTypeStep';
import { DocumentsUploadStep } from './components/DocumentsUploadStep';
import { PaymentStep } from './components/PaymentStep'; // Payment step component
import { ScholarshipFeeStep } from './components/ScholarshipFeeStep';
import { UniversityDocumentsStep } from './components/UniversityDocumentsStep';
import { OnboardingStep } from './types';
import { supabase } from '../../lib/supabase';
import PaymentSuccessOverlay from '../../components/PaymentSuccessOverlay';
import CustomLoading from '../../components/CustomLoading';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';

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
      const validSteps: OnboardingStep[] = ['welcome', 'selection_fee', 'scholarship_selection', 'process_type', 'documents_upload', 'payment', 'scholarship_fee', 'university_documents', 'completed'];
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

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.currentStep]);

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
          } else if (stepParam === 'payment') {
            edgeFunctionName = 'verify-stripe-session-application-fee';
          } else if (stepParam === 'scholarship_fee' || stepParam === 'completed') {
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
    const stepParam = searchParams.get('step');
    if (!loading && state.onboardingCompleted && stepParam !== 'university_documents') {
      navigate('/student/dashboard');
    }
  }, [loading, state.onboardingCompleted, searchParams, navigate]);

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
      'process_type',
      'documents_upload',
      'payment',
      'scholarship_fee',
      'university_documents',
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
      'process_type',
      'documents_upload',
      'payment',
      'scholarship_fee',
      'university_documents',
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

  const handleReset = async () => {
    if (!userProfile?.id) return;
    
    if (!confirm('DESEJA REALMENTE RESETAR TODO O SEU ONBOARDING? Isso apagará aplicações, carrinho e documentos.')) return;

    try {
      // 1. Limpar localStorage
      window.localStorage.removeItem('onboarding_current_step');
      window.localStorage.removeItem('selected_application_id');
      window.localStorage.removeItem('studentProcessType');
      
      // 2. Apagar aplicações
      await supabase.from('scholarship_applications').delete().eq('student_id', userProfile.id);
      
      // 3. Apagar carrinho
      await supabase.from('scholarship_cart').delete().eq('user_id', userProfile.id);
      
      // 4. Apagar pagamentos Zelle
      await supabase.from('zelle_payments').delete().eq('user_id', userProfile.id);
      
      // 5. Resetar perfil
      await supabase.from('user_profiles').update({
        has_paid_selection_process_fee: false,
        documents_uploaded: false,
        documents_status: null,
        is_application_fee_paid: false,
        onboarding_completed: false,
        selected_scholarship_id: null
      }).eq('id', userProfile.id);

      // 6. Recarregar a página para aplicar as mudanças
      window.location.href = '/onboarding?step=welcome';
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      alert('Erro ao resetar onboarding. Verifique o console.');
    }
  };

  const allSteps: OnboardingStep[] = [
    'welcome',
    'selection_fee',
    'scholarship_selection',
    'process_type',
    'documents_upload',
    'payment',
    'scholarship_fee',
    'university_documents',
    'completed',
  ];

  const currentIdx = allSteps.indexOf(state.currentStep);

  const completedSteps: OnboardingStep[] = [];
  if (currentIdx > allSteps.indexOf('welcome')) completedSteps.push('welcome');
  if (state.selectionFeePaid && currentIdx > allSteps.indexOf('selection_fee')) completedSteps.push('selection_fee');
  if (state.scholarshipsSelected && currentIdx > allSteps.indexOf('scholarship_selection')) completedSteps.push('scholarship_selection');
  if (state.processTypeSelected && currentIdx > allSteps.indexOf('process_type')) completedSteps.push('process_type');
  if (state.documentsUploaded && currentIdx > allSteps.indexOf('documents_upload')) completedSteps.push('documents_upload');
  if (state.applicationFeePaid && currentIdx > allSteps.indexOf('payment')) completedSteps.push('payment');
  if (state.scholarshipFeePaid && currentIdx > allSteps.indexOf('scholarship_fee')) completedSteps.push('scholarship_fee');
  if (state.universityDocumentsUploaded && currentIdx > allSteps.indexOf('university_documents')) completedSteps.push('university_documents');

  const renderStep = () => {
    switch (state.currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={handleNext} onBack={handleBack} />;
      case 'selection_fee':
        return <SelectionFeeStep onNext={handleNext} onBack={handleBack} />;
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
      case 'university_documents':
        return <UniversityDocumentsStep onNext={handleNext} onBack={handleBack} />;
      case 'completed':
        return (
          <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="text-center md:text-left space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Onboarding Concluído</h2>
              <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mt-2">Você completou todas as etapas necessárias.</p>
            </div>

            {/* Main White Container */}
            <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
              
              <div className="relative z-10 text-center py-6">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Tudo Pronto!</h3>
                <p className="text-gray-500 mb-8 font-medium">Parabéns! Você completou todas as etapas do onboarding com sucesso.</p>
                <button
                  onClick={handleComplete}
                  className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
                >
                  Ir para o Painel
                </button>
              </div>
            </div>
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

            <div className="flex items-center gap-3">
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

        {state.currentStep !== 'welcome' && state.currentStep !== 'university_documents' && (
          <div className="mb-6 sm:mb-8">
            <StepIndicator currentStep={state.currentStep} completedSteps={completedSteps} />
          </div>
        )}

        <div className="w-full flex-1 flex flex-col">
          {renderStep()}
        </div>
      </div>

      {/* Botão de Reset Temporário para Testes */}
      <div className="fixed bottom-5 right-5 z-[100]">
        <button
          onClick={handleReset}
          className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white p-3 rounded-full shadow-lg backdrop-blur-md border border-red-500/30 transition-all duration-300 group flex items-center gap-2"
          title="Reset Onboarding (Debug)"
        >
          <Trash2 className="w-5 h-5" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-bold uppercase text-xs tracking-widest">
            Reset Onboarding
          </span>
        </button>
      </div>
    </div>
  );
};

export default StudentOnboarding;
