import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { OnboardingStep, OnboardingState } from '../types';
import { useCartStore } from '../../../stores/applicationStore';

const VALID_STEPS: OnboardingStep[] = [
  'selection_fee', 'identity_verification', 'selection_survey',
  'scholarship_selection', 'process_type', 'documents_upload',
  'payment', 'scholarship_fee', 'placement_fee', 'my_applications', 'completed'
];

export const useOnboardingProgress = () => {
  const { user, userProfile } = useAuth();
  const { fetchCart } = useCartStore();

  // Refs para controle de fluxo e depuração
  const lastCheckId = useRef<number>(0);
  const isSavingStepRef = useRef<boolean>(false);
  const lastManualNavRef = useRef<number>(0);
  const currentStepRef = useRef<OnboardingStep>('selection_fee');

  // Estado Inicial
  const [state, setState] = useState<OnboardingState>(() => {
    const savedStep = (userProfile as any)?.onboarding_current_step;
    const initial = (savedStep as OnboardingStep) || 'selection_fee';
    currentStepRef.current = initial;
    return {
      currentStep: initial,
      selectionFeePaid: userProfile?.has_paid_selection_process_fee || false,
      identityVerified: false,
      selectionSurveyPassed: (userProfile as any)?.selection_survey_passed || false,
      scholarshipsSelected: false,
      processTypeSelected: false,
      documentsUploaded: userProfile?.documents_uploaded || false,
      documentsApproved: userProfile?.documents_status === 'approved',
      applicationFeePaid: userProfile?.is_application_fee_paid || false,
      scholarshipFeePaid: (userProfile as any)?.is_scholarship_fee_paid || false,
      placementFeePaid: (userProfile as any)?.is_placement_fee_paid || false,
      universityDocumentsUploaded: false,
      onboardingCompleted: userProfile?.onboarding_completed || false,
      isNewFlowUser: (userProfile as any)?.placement_fee_flow || false,
    };
  });

  const [loading, setLoading] = useState(true);

  // Persiste o step no banco de dados
  const saveStep = useCallback(async (step: OnboardingStep) => {
    if (!userProfile?.id) return;
    
    isSavingStepRef.current = true;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_current_step: step })
        .eq('id', userProfile.id);

      if (error) throw error;
      console.log('[OnboardingHook] ✅ Passo persistido no banco:', step);
    } catch (error) {
      console.error('[OnboardingHook] ❌ Erro ao persistir passo:', error);
    } finally {
      setTimeout(() => {
        isSavingStepRef.current = false;
      }, 1000);
    }
  }, [userProfile?.id]);

  // Função para navegar para um passo específico
  const goToStep = useCallback((step: OnboardingStep) => {
    console.log('[OnboardingHook] 🚀 NAVEGAÇÃO MANUAL ->', step);
    lastManualNavRef.current = Date.now();
    currentStepRef.current = step;
    
    // Atualização imediata do estado para mudar a UI
    setState(prev => ({ ...prev, currentStep: step }));
    saveStep(step);
  }, [saveStep]);

  const checkProgress = useCallback(async () => {
    if (!user?.id || !userProfile?.id) {
      if (loading) setLoading(false);
      return;
    }

    // LOCK: Evita que o banco de dados puxre o estado de volta durante uma transição
    const now = Date.now();
    if (isSavingStepRef.current || (now - lastManualNavRef.current < 1500)) {
       // Apenas atualizamos o loading se necessário
       if (loading) setLoading(false);
       return;
    }

    const currentCheckId = ++lastCheckId.current;

    try {
      // 1. Verificar progresso real direto no banco para evitar dados de cache zumbis
      const { data: freshProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userProfile.id)
        .maybeSingle();

      if (!freshProfile) return;

      // 1.1 Verificar Identity Verification
      const { data: photoAcceptance } = await supabase
        .from('comprehensive_term_acceptance')
        .select('identity_photo_path')
        .eq('user_id', user.id)
        .not('identity_photo_path', 'is', null)
        .maybeSingle();

      const selectionFeePaid = freshProfile.has_paid_selection_process_fee || false;
      const identityVerified = !!photoAcceptance?.identity_photo_path;
      const selectionSurveyPassed = !!freshProfile.selection_survey_passed;

      // 2. Verificar bolsas selecionadas
      let scholarshipsSelected = false;
      const { data: appsData } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id, student_process_type')
        .eq('student_id', freshProfile.id)
        .limit(1);

      if (selectionFeePaid) {
        await fetchCart(user.id);
        const { cart: currentCart } = useCartStore.getState();
        scholarshipsSelected = !!(
          currentCart.length > 0 || 
          (appsData && appsData.length > 0) || 
          !!freshProfile.selected_scholarship_id ||
          (freshProfile.student_process_type && ['initial', 'transfer', 'change_of_status'].includes(freshProfile.student_process_type))
        );
      }

      const processTypeSelected =
        (appsData && appsData.length > 0 && !!appsData[0].student_process_type) ||
        (freshProfile.student_process_type && ['initial', 'transfer', 'change_of_status'].includes(freshProfile.student_process_type)) ||
        (freshProfile.documents_uploaded || false);

      const documentsUploaded = freshProfile.documents_uploaded || false;
      const documentsApproved = freshProfile.documents_status === 'approved';

      const { data: appFeePaid } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', freshProfile.id)
        .eq('is_application_fee_paid', true)
        .limit(1);
      const applicationFeePaid = (appFeePaid && appFeePaid.length > 0) || freshProfile.is_application_fee_paid || false;

      const isNewFlowUser = !!freshProfile.placement_fee_flow;
      const scholarshipFeePaid = !!freshProfile.is_scholarship_fee_paid;
      const placementFeePaid = !!freshProfile.is_placement_fee_paid;
      const onboardingCompleted = !!freshProfile.onboarding_completed;
      
      // Cálculo de Etapa Permitida
      let maxAllowedStep: OnboardingStep = 'selection_fee';
      if (!selectionFeePaid) maxAllowedStep = 'selection_fee';
      else if (!identityVerified) maxAllowedStep = 'identity_verification';
      else if (!selectionSurveyPassed) maxAllowedStep = 'selection_survey';
      else if (!scholarshipsSelected) maxAllowedStep = 'scholarship_selection';
      else if (!processTypeSelected) maxAllowedStep = 'process_type';
      else if (!documentsUploaded || !documentsApproved) maxAllowedStep = 'documents_upload';
      else if (!applicationFeePaid) maxAllowedStep = 'payment';
      else if (isNewFlowUser && !placementFeePaid) maxAllowedStep = 'placement_fee';
      else if (!isNewFlowUser && !scholarshipFeePaid) maxAllowedStep = 'scholarship_fee';
      else maxAllowedStep = 'my_applications';

      // Decisão Final
      const uiStep = currentStepRef.current; // Valor MAIS ATUAL da UI (Ref)
      const savedStep = (freshProfile.onboarding_current_step as OnboardingStep) || 'selection_fee';
      
      const uiIdx = VALID_STEPS.indexOf(uiStep);
      const maxIdx = VALID_STEPS.indexOf(maxAllowedStep);
      const savedIdx = VALID_STEPS.indexOf(savedStep);

      let chosenStep: OnboardingStep;
      if (onboardingCompleted) {
        chosenStep = 'completed';
      } else {
        // Lógica: 
        // Se a UI está em um lugar válido (não bloqueado por progresso)
        // e é maior que o passo salvo no banco, mantemos a UI (avanço manual).
        // Se o banco está à frente da UI ou a UI está bloqueada, usamos o banco ou o maxAllowed.
        if (uiIdx !== -1 && uiIdx <= maxIdx && uiIdx >= savedIdx) {
          chosenStep = uiStep;
        } else if (uiIdx > maxIdx) {
          chosenStep = maxAllowedStep;
        } else {
          chosenStep = savedStep;
        }
      }

      console.log(`[Onboarding] 🚧 DECISÃO FINAL: | UI: ${uiStep} | Banco: ${savedStep} | Permitido: ${maxAllowedStep} | ESCOLHIDO: ${chosenStep}`);

      if (currentCheckId !== lastCheckId.current) return;

      currentStepRef.current = chosenStep;
      setState({
        currentStep: chosenStep,
        selectionFeePaid,
        identityVerified,
        selectionSurveyPassed,
        scholarshipsSelected,
        processTypeSelected,
        documentsUploaded,
        documentsApproved,
        applicationFeePaid,
        scholarshipFeePaid,
        placementFeePaid,
        universityDocumentsUploaded: false,
        onboardingCompleted,
        isNewFlowUser,
      });

      // Se o banco estiver atrasado, sincroniza ele com a decisão final
      if (chosenStep !== savedStep) {
        saveStep(chosenStep);
      }

    } catch (error) {
      console.error('[OnboardingHook] Error checking progress:', error);
    } finally {
      if (currentCheckId === lastCheckId.current) {
        setLoading(false);
      }
    }
  }, [user?.id, userProfile, fetchCart, loading]); // loading na dep garante re-check se algo falhou

  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  const markStepComplete = useCallback(async (step: OnboardingStep) => {
    await checkProgress();
  }, [checkProgress]);

  return {
    state,
    loading,
    checkProgress,
    goToStep,
    markStepComplete,
  };
};
