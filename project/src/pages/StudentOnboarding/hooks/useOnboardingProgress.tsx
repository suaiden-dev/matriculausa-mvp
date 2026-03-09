import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { OnboardingStep, OnboardingState } from '../types';
import { useCartStore } from '../../../stores/applicationStore';

const ONBOARDING_STEP_KEY = 'onboarding_current_step';

export const useOnboardingProgress = () => {
  const { user, userProfile } = useAuth();
  const { fetchCart } = useCartStore();

  // Função para obter step salvo (apenas localStorage por enquanto)
  const getSavedStep = useCallback((): OnboardingStep | null => {
    // Usar apenas localStorage por enquanto (campo no banco não existe ainda)
    const savedStep = window.localStorage.getItem(ONBOARDING_STEP_KEY);
    const validSteps: OnboardingStep[] = ['selection_fee', 'identity_verification', 'selection_survey', 'scholarship_selection', 'process_type', 'documents_upload', 'payment', 'scholarship_fee', 'placement_fee', 'my_applications', 'completed'];
    if (savedStep && validSteps.includes(savedStep as OnboardingStep)) {
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
    const validSteps: OnboardingStep[] = ['selection_fee', 'identity_verification', 'selection_survey', 'scholarship_selection', 'process_type', 'documents_upload', 'payment', 'scholarship_fee', 'placement_fee', 'my_applications', 'completed'];
    const initialStep = savedStep && validSteps.includes(savedStep as OnboardingStep) ? savedStep as OnboardingStep : 'selection_fee';

    return {
      currentStep: initialStep,
      selectionFeePaid: false,
      selectionSurveyPassed: false,
      scholarshipsSelected: false,
      processTypeSelected: false,
      documentsUploaded: false,
      documentsApproved: false,
      applicationFeePaid: false,
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

      // Se não estiver marcado como pago no perfil, verificar se há pagamento Zelle aprovado
      if (!selectionFeePaid) {
        const { data: zelleSelection } = await supabase
          .from('zelle_payments')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('fee_type', 'selection_process_fee') // Ajustado para corresponder ao enum exato se necessário, geralmente é 'selection_process' ou similar
          .in('status', ['approved', 'verified'])
          .limit(1);

        // Tenta buscar também como 'selection_process' caso o enum varie
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

        scholarshipsSelected = hasCartItems || (applications && applications.length > 0) || !!userProfile.selected_scholarship_id;
      }

      // 3. Verificar Process Type - considerar aplicações OU localStorage (fallback)
      const userProcessTypeKey = `studentProcessType_${userProfile.id}`;
      const storedProcessType = window.localStorage.getItem(userProcessTypeKey) || window.localStorage.getItem('studentProcessType');

      const processTypeSelected =
        (applications && applications.length > 0 && !!applications[0].student_process_type) ||
        (userProfile.documents_uploaded || false) ||
        (!!storedProcessType && ['initial', 'transfer', 'change_of_status'].includes(storedProcessType) && selectionFeePaid && scholarshipsSelected && getSavedStep() !== 'scholarship_selection' && getSavedStep() !== 'selection_fee');

      // 4. Verificar Documentos
      const documentsUploaded = userProfile.documents_uploaded || false;
      const documentsApproved = userProfile.documents_status === 'approved';

      // Se documentos foram enviados, assumir que as etapas anteriores foram concluídas
      // Isso evita regressão de estado em caso de falha na leitura de aplicações/carrinho
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

      // Se não estiver marcado como pago, verificar se há pagamento Zelle aprovado
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

      // 6. Verificar Scholarship Fee (legado) OU Placement Fee (novo fluxo)
      const isNewFlowUser = !!(userProfile as any)?.placement_fee_flow;

      const { data: scholarshipFeeApplications } = await supabase
        .from('scholarship_applications')
        .select('is_scholarship_fee_paid')
        .eq('student_id', userProfile.id)
        .eq('is_scholarship_fee_paid', true)
        .limit(1);

      let scholarshipFeePaid = (scholarshipFeeApplications && scholarshipFeeApplications.length > 0) || false;

      // Se não estiver marcado como pago, verificar se há pagamento Zelle aprovado
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

      // Verificar Placement Fee (novo fluxo) - via is_placement_fee_paid, Stripe ou Zelle
      let placementFeePaid = false;
      if (isNewFlowUser) {
        // 1. Verificar campo direto no perfil (atualizado pela edge function)
        if ((userProfile as any)?.is_placement_fee_paid === true) {
          placementFeePaid = true;
        }

        // 2. Verificar pagamento Stripe em individual_fee_payments
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

        // 3. Verificar pagamento Zelle
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

      // 7. Verificar Documentos da Universidade (University Documents)
      const isOnboardingCompleted = userProfile.onboarding_completed || false;
      let universityDocumentsUploaded = false;

      if (isOnboardingCompleted) {
        universityDocumentsUploaded = true;
      } else {
        // Buscar aplicação ativa para saber se existem requests
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
            // Se não há requests, considera "concluído" para não travar o fluxo
            universityDocumentsUploaded = true;
          } else {
            // Se há requests, verifica se há pelo menos um upload para marcar como "em progresso/feito"
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

      // 8. Verificar se onboarding foi completado
      const onboardingCompleted = isOnboardingCompleted;

      // Re-ler o step salvo após as operações assíncronas para evitar race conditions
      const savedStep = getSavedStep();

      let currentStep: OnboardingStep;

      const urlParams = new URLSearchParams(window.location.search);
      const isForcingPortal = urlParams.get('step') === 'my_applications';

      if (onboardingCompleted && !isForcingPortal) {
        currentStep = 'completed';
        // Limpar step salvo quando completado
        window.localStorage.removeItem(ONBOARDING_STEP_KEY);
      } else if (onboardingCompleted && isForcingPortal) {
        currentStep = 'my_applications';
      } else if (savedStep && savedStep !== 'completed') {
        // Se o usuário é do novo fluxo mas tem scholarship_fee salvo no localStorage, limpar
        if (isNewFlowUser && savedStep === 'scholarship_fee') {
          window.localStorage.removeItem(ONBOARDING_STEP_KEY);
          currentStep = 'placement_fee';
          // Forçar re-cálculo sem o step salvo
        } else {
          // Se há um step salvo e não está completado, calcular o máximo permitido
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

          // Se o step salvo é mais avançado que o permitido, usar o permitido
          // Caso contrário, respeitar o desejo do usuário (permitir voltar)
          const allSteps: OnboardingStep[] = ['selection_fee', 'identity_verification', 'selection_survey', 'scholarship_selection', 'process_type', 'documents_upload', 'payment', 'scholarship_fee', 'placement_fee', 'my_applications', 'completed'];
          const savedIdx = allSteps.indexOf(savedStep);
          const maxIdx = allSteps.indexOf(maxAllowedStep);

          currentStep = savedIdx > maxIdx ? maxAllowedStep : savedStep;
        }
      } else {
        // Se não há step salvo e não é novo usuário, calcular baseado no progresso
        if (!selectionFeePaid) {
          currentStep = 'selection_fee';
        } else if (!identityVerified) {
          currentStep = 'identity_verification';
        } else if (!selectionSurveyPassed) {
          currentStep = 'selection_survey';
        } else if (!scholarshipsSelected) {
          currentStep = 'scholarship_selection';
        } else if (!processTypeSelected) {
          currentStep = 'process_type';
        } else if (!documentsUploaded || !documentsApproved) {
          currentStep = 'documents_upload';
        } else if (!applicationFeePaid) {
          // No cálculo automático (sem step salvo), só ir para payment se houver seleção
          const selectedAppId = window.localStorage.getItem('selected_application_id');
          if (selectedAppId) {
            currentStep = 'payment';
          } else {
            currentStep = 'documents_upload';
          }
        } else if (isNewFlowUser && !placementFeePaid) {
          currentStep = 'placement_fee';
        } else if (!isNewFlowUser && !scholarshipFeePaid) {
          currentStep = 'scholarship_fee';
        } else if (!onboardingCompleted) {
          // Sempre passar pelo my_applications antes de reach completed
          currentStep = 'my_applications';
        } else {
          currentStep = 'completed';
        }
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

      // Salvar step atual
      saveStep(currentStep);
    } catch (error) {
      console.error('Error checking onboarding progress:', error);
    } finally {
      if (currentCheckId === lastCheckId.current) {
        setLoading(false);
      }
    }
  }, [user?.id, userProfile?.id, userProfile?.has_paid_selection_process_fee, userProfile?.documents_uploaded, userProfile?.documents_status, userProfile?.is_application_fee_paid, userProfile?.onboarding_completed, (userProfile as any)?.placement_fee_flow, fetchCart, getSavedStep, saveStep]);

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

