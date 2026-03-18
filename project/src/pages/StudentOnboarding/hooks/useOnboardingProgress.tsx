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

  // Lê o step salvo direto do perfil (banco de dados)
  const getSavedStep = useCallback((): OnboardingStep | null => {
    const savedStep = (userProfile as any)?.onboarding_current_step;
    if (savedStep && VALID_STEPS.includes(savedStep as OnboardingStep)) {
      return savedStep as OnboardingStep;
    }
    return null;
  }, [userProfile]);

  // Persiste o step no banco (fire-and-forget, sem bloquear a UI)
  const saveStep = useCallback((step: OnboardingStep) => {
    if (!userProfile?.id) return;
    supabase
      .from('user_profiles')
      .update({ onboarding_current_step: step })
      .eq('id', userProfile.id)
      .then(({ error }) => {
        if (error) {
          console.error('[OnboardingHook] Erro ao salvar step no banco:', error);
        }
      });
  }, [userProfile?.id]);

  // Limpa o step no banco (ex: ao completar ou mudar de fluxo)
  const clearStep = useCallback(() => {
    if (!userProfile?.id) return;
    supabase
      .from('user_profiles')
      .update({ onboarding_current_step: null })
      .eq('id', userProfile.id)
      .then(({ error }) => {
        if (error) {
          console.error('[OnboardingHook] Erro ao limpar step no banco:', error);
        }
      });
  }, [userProfile?.id]);

  const [state, setState] = useState<OnboardingState>(() => {
    // Inicializar com step do perfil se existir
    const savedStep = (userProfile as any)?.onboarding_current_step;
    const initialStep = savedStep && VALID_STEPS.includes(savedStep as OnboardingStep)
      ? savedStep as OnboardingStep
      : 'selection_fee';

    return {
      currentStep: initialStep,
      selectionFeePaid: userProfile?.has_paid_selection_process_fee || false,
      selectionSurveyPassed: userProfile?.selection_survey_passed || false,
      scholarshipsSelected: !!userProfile?.selected_scholarship_id,
      processTypeSelected: !!userProfile?.documents_uploaded,
      documentsUploaded: userProfile?.documents_uploaded || false,
      documentsApproved: userProfile?.documents_status === 'approved',
      applicationFeePaid: userProfile?.is_application_fee_paid || false,
      scholarshipFeePaid: false,
      placementFeePaid: false,
      universityDocumentsUploaded: false,
      onboardingCompleted: false,
      isNewFlowUser: false,
    };
  });
  const [loading, setLoading] = useState(true);
  const lastCheckId = useRef(0);

  const checkProgress = useCallback(async () => {
    if (!user?.id || !userProfile?.id) {
      setLoading(false);
      return;
    }

    const currentCheckId = ++lastCheckId.current;

    try {
      setLoading(true);

      // 1. Verificar Selection Fee
      let selectionFeePaid = userProfile.has_paid_selection_process_fee || false;

      if (!selectionFeePaid) {
        const { data: zelleSelection } = await supabase
          .from('zelle_payments')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('fee_type', 'selection_process_fee')
          .in('status', ['approved', 'verified'])
          .limit(1);

        if (!zelleSelection || zelleSelection.length === 0) {
          const { data: zelleSelectionV2 } = await supabase
            .from('zelle_payments')
            .select('id')
            .eq('user_id', userProfile.id)
            .eq('fee_type', 'selection_process')
            .in('status', ['approved', 'verified'])
            .limit(1);

          if (zelleSelectionV2 && zelleSelectionV2.length > 0) {
            selectionFeePaid = true;
          }
        } else {
          selectionFeePaid = true;
        }
      }

      // 1.5 Verificar Identity Verification (selfie)
      let identityVerified = false;
      {
        const { data: photoAcceptance } = await supabase
          .from('comprehensive_term_acceptance')
          .select('identity_photo_path')
          .eq('user_id', user.id)
          .not('identity_photo_path', 'is', null)
          .maybeSingle();
        identityVerified = !!photoAcceptance?.identity_photo_path;
      }

      // 1.6 Verificar Selection Survey
      const selectionSurveyPassed = userProfile.selection_survey_passed || false;

      // 2. Verificar bolsas selecionadas
      let scholarshipsSelected = false;
      let applications: any[] | null = null;

      const { data: appsData } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id, student_process_type')
        .eq('student_id', userProfile.id)
        .limit(1);

      applications = appsData;

      if (selectionFeePaid) {
        await fetchCart(user.id);
        await new Promise(resolve => setTimeout(resolve, 100));
        const { cart: currentCart } = useCartStore.getState();
        const hasCartItems = currentCart.length > 0;

        scholarshipsSelected = hasCartItems || (applications && applications.length > 0) || !!userProfile.selected_scholarship_id;
      }

      // 3. Verificar Process Type
      const userProcessTypeKey = `studentProcessType_${userProfile.id}`;
      const storedProcessType = window.localStorage.getItem(userProcessTypeKey) || window.localStorage.getItem('studentProcessType');

      const processTypeSelected =
        (applications && applications.length > 0 && !!applications[0].student_process_type) ||
        (userProfile.documents_uploaded || false) ||
        (!!storedProcessType && ['initial', 'transfer', 'change_of_status'].includes(storedProcessType) && selectionFeePaid && scholarshipsSelected && getSavedStep() !== 'scholarship_selection' && getSavedStep() !== 'selection_fee');

      // 4. Verificar Documentos
      const documentsUploaded = userProfile.documents_uploaded || false;
      const documentsApproved = userProfile.documents_status === 'approved';

      if (documentsUploaded) {
        scholarshipsSelected = true;
      }

      // 5. Verificar Application Fee
      const { data: appFeeApplications } = await supabase
        .from('scholarship_applications')
        .select('is_application_fee_paid')
        .eq('student_id', userProfile.id)
        .eq('is_application_fee_paid', true)
        .limit(1);

      let applicationFeePaid = (appFeeApplications && appFeeApplications.length > 0) || userProfile.is_application_fee_paid || false;

      if (!applicationFeePaid) {
        const { data: zelleApplication } = await supabase
          .from('zelle_payments')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('fee_type', 'application_fee')
          .in('status', ['approved', 'verified'])
          .limit(1);

        if (zelleApplication && zelleApplication.length > 0) {
          applicationFeePaid = true;
        }
      }

      // 6. Verificar Scholarship Fee / Placement Fee
      const isNewFlowUser = !!(userProfile as any)?.placement_fee_flow;

      const { data: scholarshipFeeApplications } = await supabase
        .from('scholarship_applications')
        .select('is_scholarship_fee_paid')
        .eq('student_id', userProfile.id)
        .eq('is_scholarship_fee_paid', true)
        .limit(1);

      let scholarshipFeePaid = (scholarshipFeeApplications && scholarshipFeeApplications.length > 0) || false;

      if (!scholarshipFeePaid) {
        const { data: zelleScholarship } = await supabase
          .from('zelle_payments')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('fee_type', 'scholarship_fee')
          .in('status', ['approved', 'verified'])
          .limit(1);

        if (zelleScholarship && zelleScholarship.length > 0) {
          scholarshipFeePaid = true;
        }
      }

      let placementFeePaid = false;
      if (isNewFlowUser) {
        if ((userProfile as any)?.is_placement_fee_paid === true) {
          placementFeePaid = true;
        }

        if (!placementFeePaid) {
          const { data: stripePlacement } = await supabase
            .from('individual_fee_payments')
            .select('id')
            .eq('user_id', userProfile.user_id)
            .eq('fee_type', 'placement_fee')
            .limit(1);
          if (stripePlacement && stripePlacement.length > 0) {
            placementFeePaid = true;
          }
        }

        if (!placementFeePaid) {
          const { data: zellePlacement } = await supabase
            .from('zelle_payments')
            .select('id')
            .eq('user_id', userProfile.id)
            .eq('fee_type', 'placement_fee')
            .in('status', ['approved', 'verified'])
            .limit(1);
          if (zellePlacement && zellePlacement.length > 0) {
            placementFeePaid = true;
          }
        }
      }

      // 7. Verificar University Documents
      const isOnboardingCompleted = userProfile.onboarding_completed || false;
      let universityDocumentsUploaded = false;

      if (isOnboardingCompleted) {
        universityDocumentsUploaded = true;
      } else {
        const { data: activeApps } = await supabase
          .from('scholarship_applications')
          .select('id, scholarship_id, scholarships(university_id)')
          .eq('student_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const activeApp = activeApps?.[0];
        const universityId = (activeApp?.scholarships as any)?.university_id;

        if (activeApp) {
          let reqQuery = supabase
            .from('document_requests')
            .select('id', { count: 'exact', head: true });

          if (universityId) {
            reqQuery = reqQuery.or(`scholarship_application_id.eq.${activeApp.id},and(university_id.eq.${universityId},is_global.eq.true)`);
          } else {
            reqQuery = reqQuery.eq('scholarship_application_id', activeApp.id);
          }

          const { count: requestsCount } = await reqQuery;

          if ((requestsCount || 0) === 0) {
            universityDocumentsUploaded = true;
          } else {
            const { count: uploadsCount } = await supabase
              .from('document_request_uploads')
              .select('id', { count: 'exact', head: true })
              .eq('uploaded_by', userProfile.user_id);

            universityDocumentsUploaded = (uploadsCount || 0) > 0;
          }
        } else {
          universityDocumentsUploaded = true;
        }
      }

      const onboardingCompleted = isOnboardingCompleted;

      // Re-ler o step salvo (do banco via userProfile) após operações assíncronas
      const savedStep = getSavedStep();
      const urlParams = new URLSearchParams(window.location.search);
      const isForcingPortal = urlParams.get('step') === 'my_applications';

      // Calcular o máximo permitido baseado no progresso real
      let maxAllowedStep: OnboardingStep = 'selection_fee';
      if (!selectionFeePaid) {
        maxAllowedStep = 'selection_fee';
      } else if (!identityVerified) {
        maxAllowedStep = 'identity_verification';
      } else if (!selectionSurveyPassed) {
        maxAllowedStep = 'selection_survey';
      } else if (!scholarshipsSelected) {
        maxAllowedStep = 'scholarship_selection';
      } else if (!processTypeSelected) {
        maxAllowedStep = 'process_type';
      } else if (!documentsUploaded || !documentsApproved) {
        maxAllowedStep = 'documents_upload';
      } else if (!applicationFeePaid) {
        const selectedAppId = window.localStorage.getItem('selected_application_id');
        maxAllowedStep = selectedAppId ? 'payment' : 'documents_upload';
      } else if (isNewFlowUser && !placementFeePaid) {
        maxAllowedStep = 'placement_fee';
      } else if (!isNewFlowUser && !scholarshipFeePaid) {
        maxAllowedStep = 'scholarship_fee';
      } else {
        maxAllowedStep = 'my_applications';
      }

      const allSteps: OnboardingStep[] = [
        'selection_fee', 'identity_verification', 'selection_survey',
        'scholarship_selection', 'process_type', 'documents_upload',
        'payment', 'scholarship_fee', 'placement_fee', 'my_applications', 'completed'
      ];

      let currentStep: OnboardingStep;

      if (onboardingCompleted && !isForcingPortal) {
        currentStep = 'completed';
        clearStep();
      } else if (onboardingCompleted && isForcingPortal) {
        currentStep = 'my_applications';
      } else if (savedStep && savedStep !== 'completed') {
        const savedIdx = allSteps.indexOf(savedStep);
        const maxIdx = allSteps.indexOf(maxAllowedStep);

        if (isNewFlowUser && savedStep === 'scholarship_fee') {
          console.log('[OnboardingHook] 🔄 Switching to NEW flow (Placement), clearing DB step');
          clearStep();
          currentStep = maxAllowedStep;
        } else if (!isNewFlowUser && savedStep === 'placement_fee') {
          console.log('[OnboardingHook] 🔄 Switching to OLD flow (Scholarship), clearing DB step');
          clearStep();
          currentStep = maxAllowedStep;
        } else if (savedIdx > maxIdx) {
          currentStep = maxAllowedStep;
        } else if (savedStep === 'selection_fee' && maxAllowedStep !== 'selection_fee') {
          // Se o banco estava preservando 'selection_fee' de um usuário que acabou de pagar,
          // solta a âncora e avança ele pro step calculado real.
          currentStep = maxAllowedStep;
        } else {
          currentStep = savedStep;
        }
      } else {
        currentStep = maxAllowedStep;
      }

      if (currentCheckId !== lastCheckId.current) {
        return;
      }

      setState({
        currentStep,
        selectionFeePaid,
        selectionSurveyPassed,
        scholarshipsSelected,
        processTypeSelected,
        documentsUploaded,
        documentsApproved,
        applicationFeePaid,
        scholarshipFeePaid,
        placementFeePaid,
        universityDocumentsUploaded,
        onboardingCompleted,
        isNewFlowUser,
      });

      // Salvar step atual no banco
      saveStep(currentStep);
    } catch (error) {
      console.error('Error checking onboarding progress:', error);
    } finally {
      if (currentCheckId === lastCheckId.current) {
        setLoading(false);
      }
    }
  }, [user?.id, userProfile?.id, userProfile?.has_paid_selection_process_fee, userProfile?.documents_uploaded, userProfile?.documents_status, userProfile?.is_application_fee_paid, userProfile?.onboarding_completed, (userProfile as any)?.placement_fee_flow, fetchCart, getSavedStep, saveStep, clearStep]);

  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
    saveStep(step);
  }, [saveStep]);

  const markStepComplete = useCallback(async (step: OnboardingStep) => {
    setState(prev => {
      const updates: Partial<OnboardingState> = {};

      switch (step) {
        case 'selection_fee':
          updates.selectionFeePaid = true;
          break;
        case 'selection_survey':
          updates.selectionSurveyPassed = true;
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
        case 'payment':
          updates.applicationFeePaid = true;
          break;
        case 'placement_fee':
          updates.placementFeePaid = true;
          break;
        case 'scholarship_fee':
          updates.scholarshipFeePaid = true;
          break;
        case 'my_applications':
          updates.universityDocumentsUploaded = true;
          break;
        case 'completed':
          updates.onboardingCompleted = true;
          break;
      }

      return { ...prev, ...updates };
    });

    // Se completou tudo, marcar onboarding como completo no banco e limpar o step
    if (step === 'completed' && userProfile?.id) {
      try {
        await supabase
          .from('user_profiles')
          .update({ onboarding_completed: true, onboarding_current_step: null })
          .eq('id', userProfile.id);
      } catch (error) {
        console.error('Error marking onboarding as complete:', error);
      }
    }

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
