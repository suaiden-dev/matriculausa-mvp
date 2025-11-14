import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { OnboardingStep, OnboardingState } from '../types';
import { useCartStore } from '../../../stores/applicationStore';

const ONBOARDING_STEP_KEY = 'onboarding_current_step';

export const useOnboardingProgress = () => {
  const { user, userProfile } = useAuth();
  const { cart, fetchCart } = useCartStore();
  
  // Função para obter step salvo (apenas localStorage por enquanto)
  const getSavedStep = useCallback((): OnboardingStep | null => {
    // Usar apenas localStorage por enquanto (campo no banco não existe ainda)
    const savedStep = window.localStorage.getItem(ONBOARDING_STEP_KEY);
    if (savedStep && ['welcome', 'selection_fee', 'scholarship_selection', 'scholarship_review', 'process_type', 'documents_upload', 'waiting_approval', 'completed'].includes(savedStep)) {
      return savedStep as OnboardingStep;
    }
    return null;
  }, []);

  // Função para salvar step (apenas localStorage por enquanto)
  const saveStep = useCallback((step: OnboardingStep) => {
    // Salvar no localStorage (campo no banco não existe ainda)
    window.localStorage.setItem(ONBOARDING_STEP_KEY, step);
  }, []);

  const [state, setState] = useState<OnboardingState>(() => {
    // Inicializar com step do localStorage se existir (síncrono)
    const savedStep = window.localStorage.getItem(ONBOARDING_STEP_KEY);
    const validSteps = ['welcome', 'selection_fee', 'scholarship_selection', 'scholarship_review', 'process_type', 'documents_upload', 'waiting_approval', 'completed'];
    const initialStep = savedStep && validSteps.includes(savedStep) ? savedStep as OnboardingStep : 'welcome';
    
    return {
      currentStep: initialStep,
      selectionFeePaid: false,
      scholarshipsSelected: false,
      processTypeSelected: false,
      documentsUploaded: false,
      documentsApproved: false,
      applicationFeePaid: false,
      scholarshipFeePaid: false,
      onboardingCompleted: false,
    };
  });
  const [loading, setLoading] = useState(true);

  const checkProgress = useCallback(async () => {
    if (!user?.id || !userProfile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Verificar Selection Fee
      const selectionFeePaid = userProfile.has_paid_selection_process_fee || false;

      // 2. Verificar se há bolsas selecionadas (cart ou aplicações)
      // IMPORTANTE: Só considerar bolsas selecionadas se o usuário já pagou a taxa de seleção
      // Isso evita marcar como concluído quando há dados antigos no carrinho
      let scholarshipsSelected = false;
      let applications: any[] | null = null;
      
      // Sempre buscar aplicações para verificar process type, mas só considerar bolsas selecionadas se pagou a taxa
      const { data: appsData } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id, student_process_type')
        .eq('student_id', userProfile.id)
        .limit(1);
      
      applications = appsData;
      
      if (selectionFeePaid) {
        await fetchCart(user.id);
        // Aguardar um pouco para o cart ser atualizado
        await new Promise(resolve => setTimeout(resolve, 100));
        const { cart: currentCart } = useCartStore.getState();
        const hasCartItems = currentCart.length > 0;
        
        scholarshipsSelected = hasCartItems || (applications && applications.length > 0);
      }

      // 3. Verificar Process Type - só considerar se realmente há aplicações criadas
      const processTypeSelected = 
        applications && applications.length > 0 && !!applications[0].student_process_type;

      // 4. Verificar Documentos
      const documentsUploaded = userProfile.documents_uploaded || false;
      const documentsApproved = userProfile.documents_status === 'approved';

      // 5. Verificar Application Fee
      const { data: appFeeApplications } = await supabase
        .from('scholarship_applications')
        .select('is_application_fee_paid')
        .eq('student_id', userProfile.id)
        .eq('is_application_fee_paid', true)
        .limit(1);
      
      const applicationFeePaid = (appFeeApplications && appFeeApplications.length > 0) || userProfile.is_application_fee_paid || false;

      // 6. Verificar Scholarship Fee
      const { data: scholarshipFeeApplications } = await supabase
        .from('scholarship_applications')
        .select('is_scholarship_fee_paid')
        .eq('student_id', userProfile.id)
        .eq('is_scholarship_fee_paid', true)
        .limit(1);
      
      const scholarshipFeePaid = (scholarshipFeeApplications && scholarshipFeeApplications.length > 0) || false;

      // 7. Verificar se onboarding foi completado
      const onboardingCompleted = userProfile.onboarding_completed || false;

      // Verificar se é um novo usuário (sem nenhum progresso)
      const isNewUser = !selectionFeePaid && !scholarshipsSelected && !processTypeSelected && !documentsUploaded;
      
      // Tentar recuperar step salvo (localStorage)
      const savedStep = getSavedStep();
      let currentStep: OnboardingStep;

      if (onboardingCompleted) {
        currentStep = 'completed';
        // Limpar step salvo quando completado
        window.localStorage.removeItem(ONBOARDING_STEP_KEY);
      } else if (isNewUser) {
        // Novo usuário sempre começa na página de welcome, independente de step salvo
        currentStep = 'welcome';
        // Limpar step salvo se existir para garantir que comece do zero
        if (savedStep && savedStep !== 'welcome') {
          window.localStorage.removeItem(ONBOARDING_STEP_KEY);
        }
      } else if (savedStep === 'welcome' && !selectionFeePaid && !scholarshipsSelected) {
        // Se o step salvo é 'welcome' e não há progresso, manter em 'welcome'
        // Isso permite que o usuário veja a página de welcome quando acessa via URL
        currentStep = 'welcome';
      } else if (savedStep && savedStep !== 'completed') {
        // Se há um step salvo e não está completado, usar ele
        // Mas validar se o step salvo ainda é válido baseado no progresso
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
        
        let calculatedStep: OnboardingStep = 'welcome';
        let minRequiredStep: OnboardingStep = 'welcome'; // Step mínimo necessário baseado no progresso
        
        if (!selectionFeePaid) {
          calculatedStep = 'selection_fee';
          minRequiredStep = 'selection_fee';
        } else if (!scholarshipsSelected) {
          calculatedStep = 'scholarship_selection';
          minRequiredStep = 'scholarship_selection';
        } else if (scholarshipsSelected && !processTypeSelected) {
          // Se tem bolsas selecionadas mas ainda não passou pela revisão, ir para scholarship_review
          // Mas se já passou da revisão (tem process type), pode ir direto para process_type
          calculatedStep = 'scholarship_review';
          // O mínimo necessário é scholarship_review, mas o usuário pode estar em scholarship_selection
          minRequiredStep = 'scholarship_selection';
        } else if (!processTypeSelected) {
          calculatedStep = 'process_type';
          minRequiredStep = 'process_type';
        } else if (!documentsUploaded) {
          calculatedStep = 'documents_upload';
          minRequiredStep = 'documents_upload';
        } else if (!documentsApproved) {
          calculatedStep = 'waiting_approval';
          minRequiredStep = 'waiting_approval';
        } else {
          // Se documentos estão aprovados, ficar em waiting_approval para pagar fees
          // O usuário pode completar manualmente quando todas as fees estiverem pagas
          calculatedStep = 'waiting_approval';
          minRequiredStep = 'waiting_approval';
        }
        
        const savedStepIndex = steps.indexOf(savedStep);
        const calculatedStepIndex = steps.indexOf(calculatedStep);
        const minRequiredStepIndex = steps.indexOf(minRequiredStep);
        
        // Se o step salvo está entre o mínimo necessário e o calculado (ou além), usar o salvo
        // Isso permite que o usuário volte para o step onde estava, mesmo que já tenha feito progresso
        if (savedStepIndex >= minRequiredStepIndex && savedStepIndex <= calculatedStepIndex) {
          currentStep = savedStep;
        } else if (savedStepIndex > calculatedStepIndex) {
          // Se o step salvo está mais avançado que o calculado, usar o calculado (não pode pular etapas)
          currentStep = calculatedStep;
        } else {
          // Se o step salvo está antes do mínimo necessário, usar o mínimo necessário
          currentStep = minRequiredStep;
        }
      } else {
        // Se não há step salvo e não é novo usuário, calcular baseado no progresso
        if (!selectionFeePaid) {
          currentStep = 'selection_fee';
        } else if (!scholarshipsSelected) {
          currentStep = 'scholarship_selection';
        } else if (scholarshipsSelected && !processTypeSelected) {
          // Se tem bolsas selecionadas, ir para scholarship_review antes de process_type
          currentStep = 'scholarship_review';
        } else if (!processTypeSelected) {
          currentStep = 'process_type';
        } else if (!documentsUploaded) {
          currentStep = 'documents_upload';
        } else if (!documentsApproved) {
          currentStep = 'waiting_approval';
        } else {
          // Se documentos estão aprovados, ficar em waiting_approval para pagar fees
          currentStep = 'waiting_approval';
        }
      }

      setState({
        currentStep,
        selectionFeePaid,
        scholarshipsSelected,
        processTypeSelected,
        documentsUploaded,
        documentsApproved,
        applicationFeePaid,
        scholarshipFeePaid,
        onboardingCompleted,
      });
      
      // Salvar step atual
      saveStep(currentStep);
    } catch (error) {
      console.error('Error checking onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userProfile?.id, userProfile?.has_paid_selection_process_fee, userProfile?.documents_uploaded, userProfile?.documents_status, userProfile?.is_application_fee_paid, userProfile?.onboarding_completed, fetchCart, getSavedStep, saveStep]);

  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
    // Salvar step quando mudar
    saveStep(step);
  }, [saveStep]);

  const markStepComplete = useCallback(async (step: OnboardingStep) => {
    // Atualizar estado local
    setState(prev => {
      const updates: Partial<OnboardingState> = {};
      
      switch (step) {
        case 'selection_fee':
          updates.selectionFeePaid = true;
          break;
        case 'scholarship_selection':
          updates.scholarshipsSelected = true;
          break;
        case 'process_type':
          updates.processTypeSelected = true;
          break;
        case 'documents_upload':
          updates.documentsUploaded = true;
          break;
        case 'waiting_approval':
          updates.documentsApproved = true;
          break;
        case 'completed':
          updates.onboardingCompleted = true;
          break;
      }
      
      return { ...prev, ...updates };
    });

    // Se completou tudo, marcar onboarding como completo no banco
    if (step === 'completed' && userProfile?.id) {
      try {
        await supabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('id', userProfile.id);
      } catch (error) {
        console.error('Error marking onboarding as complete:', error);
      }
    }

    // Recarregar progresso
    await checkProgress();
  }, [userProfile?.id, checkProgress]);

  return {
    state,
    loading,
    checkProgress,
    goToStep,
    markStepComplete,
  };
};

