import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { OnboardingStep, OnboardingState } from '../types';
import { useCartStore } from '../../../stores/applicationStore';

const VALID_STEPS: OnboardingStep[] = [
  'selection_fee', 'identity_verification', 'selection_survey',
  'scholarship_selection', 'process_type', 'documents_upload',
  'payment', 'scholarship_fee', 'placement_fee', 'reinstatement_fee', 'my_applications', 'completed'
];

export const useOnboardingProgress = () => {
  const { user, userProfile } = useAuth();
  const { fetchCart } = useCartStore();

  // Extrair apenas os campos primitivos do userProfile para estabilizar dependências.
  // O objeto userProfile tem nova referência a cada render do useAuth,
  // o que causava reconstrução do checkProgress e re-fetch desnecessário ao banco.
  const stableProfile = useMemo(() => ({
    has_paid_selection_process_fee: userProfile?.has_paid_selection_process_fee,
    selection_survey_passed: (userProfile as any)?.selection_survey_passed,
    identity_verified: (userProfile as any)?.identity_verified,
    documents_uploaded: userProfile?.documents_uploaded,
    documents_status: userProfile?.documents_status,
    is_application_fee_paid: userProfile?.is_application_fee_paid,
    is_scholarship_fee_paid: (userProfile as any)?.is_scholarship_fee_paid,
    is_placement_fee_paid: (userProfile as any)?.is_placement_fee_paid,
    has_paid_reinstatement_package: (userProfile as any)?.has_paid_reinstatement_package,
    onboarding_completed: userProfile?.onboarding_completed,
    placement_fee_flow: (userProfile as any)?.placement_fee_flow,
    student_process_type: userProfile?.student_process_type,
    visa_transfer_active: userProfile?.visa_transfer_active,
    selected_scholarship_id: userProfile?.selected_scholarship_id,
    onboarding_current_step: (userProfile as any)?.onboarding_current_step,
    id: (userProfile as any)?.id,
  }), [
    userProfile?.has_paid_selection_process_fee,
    (userProfile as any)?.selection_survey_passed,
    (userProfile as any)?.identity_verified,
    userProfile?.documents_uploaded,
    userProfile?.documents_status,
    userProfile?.is_application_fee_paid,
    (userProfile as any)?.is_scholarship_fee_paid,
    (userProfile as any)?.is_placement_fee_paid,
    (userProfile as any)?.has_paid_reinstatement_package,
    userProfile?.onboarding_completed,
    (userProfile as any)?.placement_fee_flow,
    userProfile?.student_process_type,
    userProfile?.visa_transfer_active,
    userProfile?.selected_scholarship_id,
    (userProfile as any)?.onboarding_current_step,
    (userProfile as any)?.id,
  ]);

  // Refs para controle de fluxo e depuração
  const lastCheckId = useRef<number>(0);
  const isSavingStepRef = useRef<boolean>(false);
  const lastManualNavRef = useRef<number>(0);
  const currentStepRef = useRef<OnboardingStep>('selection_fee');

  // Estado Inicial do Onboarding
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
      reinstatementFeePaid: (userProfile as any)?.has_paid_reinstatement_package || false,
      universityDocumentsUploaded: false,
      onboardingCompleted: userProfile?.onboarding_completed || false,
      isNewFlowUser: (userProfile as any)?.placement_fee_flow || false,
    };
  });

  const [loading, setLoading] = useState(true);

  // Persiste o step no banco de dados com trava de segurança (Locks)
  const saveStep = useCallback(async (step: OnboardingStep) => {
    if (!user?.id) return;
    
    isSavingStepRef.current = true;
    try {
      // Sincronizar com o banco usando user_id (sempre mais seguro que o profile.id)
      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_current_step: step })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('[OnboardingHook] ❌ Erro ao persistir passo no banco:', error?.message);
    } finally {
      // Travar verificações automáticas por 1.2s para garantir consistência
      setTimeout(() => {
        isSavingStepRef.current = false;
      }, 1200);
    }
  }, [user?.id]);

  // Função disparada pela UI para navegar entre etapas
  const goToStep = useCallback((step: OnboardingStep) => {
    console.log('[OnboardingHook] 🚀 NAVEGAÇÃO MANUAL ->', step);
    lastManualNavRef.current = Date.now();
    currentStepRef.current = step;
    
    // Atualização imediata do estado local
    setState(prev => ({ ...prev, currentStep: step }));
    saveStep(step);
  }, [saveStep]);

  // Função mestre de verificação de progresso (Mecanismo Anti-Elástico)
  const checkProgress = useCallback(async () => {
    if (!user?.id) {
      if (loading) setLoading(false);
      return;
    }

    // LOCK: Evita regressão automática durante transições manuais ou salvamentos ativos
    const now = Date.now();
    if (isSavingStepRef.current || (now - lastManualNavRef.current < 1500)) {
       if (loading) setLoading(false);
       return;
    }

    const currentCheckId = ++lastCheckId.current;

    try {
      // 1. Forçar leitura fresca do banco usando user_id (mais estável que o ID da PK)
      let { data: freshData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fallback para RPC se o acesso à tabela falhar (ex: erro 406/403 de RLS)
      if (profileError && (profileError.code === '406' || profileError.code === '403')) {
        console.log('[OnboardingHook] ⚠️ Erro de acesso à tabela (406/403). Tentando via RPC...');
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_user_profile');
        if (!rpcError && rpcData && rpcData.length > 0) {
          freshData = rpcData[0];
          profileError = null;
        }
      }

      if (profileError || !freshData) {
        console.warn(`[OnboardingHook] 🕵️‍♂️ Perfil inacessível. (AuthID: ${user?.id}). Tentando manter estado anterior.`, profileError);
        if (loading) setLoading(false);
        return;
      }
      const freshProfile = freshData;
      const studentId = freshProfile.id;

      if (!studentId) {
        console.warn('[OnboardingHook] ⚠️ Perfil sem ID de banco (studentId).');
        if (loading) setLoading(false);
        return;
      }

      // 1.1 Verificações de Etapa (Pagamento, Termos, etc.)
      const selectionFeePaid = !!freshProfile.has_paid_selection_process_fee;
      const selectionSurveyPassed = !!freshProfile.selection_survey_passed;

      // 1.2 Verificação de Identidade (Foto do Termo)
      // Otimização: só busca no banco se o perfil ainda não tem identity_verified = true
      let identityVerified = !!(freshProfile as any).identity_verified;
      if (!identityVerified) {
        const { data: photoAcceptance } = await supabase
          .from('comprehensive_term_acceptance')
          .select('identity_photo_path')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        identityVerified = !!photoAcceptance?.identity_photo_path;
      }


      // 2. Verificar aplicações — query consolidada traz todos os dados necessários de uma vez
      const { data: appsData } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id, student_process_type, is_application_fee_paid')
        .eq('student_id', studentId);

      let scholarshipsSelected = false;
      if (selectionFeePaid) {
        await fetchCart(user.id);
        const currentCart = useCartStore.getState().cart;
        scholarshipsSelected = !!(
          currentCart.length > 0 ||
          (appsData && appsData.length > 0) ||
          !!freshProfile.selected_scholarship_id ||
          (freshProfile.student_process_type && ['initial', 'transfer', 'change_of_status', 'resident'].includes(freshProfile.student_process_type))
        );
      }

      // 3. Verificação do Tipo de Processo Escolhido (Initial, Transfer, etc)
      const processTypeSelected =
        (appsData && appsData.length > 0 && !!appsData[0].student_process_type) ||
        (freshProfile.student_process_type && ['initial', 'transfer', 'change_of_status', 'resident'].includes(freshProfile.student_process_type)) ||
        (freshProfile.documents_uploaded || false);

      // 4. Verificação de Documentos (Envio e Status de Aprovação)
      const documentsUploaded = freshProfile.documents_uploaded || false;
      const documentsApproved = freshProfile.documents_status === 'approved';

      // 5. Application Fee — derivado da query consolidada acima
      const applicationFeePaid = (appsData && appsData.some((a: any) => a.is_application_fee_paid)) || freshProfile.is_application_fee_paid || false;

      // 6. Configurações de Etapa para Novos Fluxos (Placement Fee)
      const isNewFlowUser = !!freshProfile.placement_fee_flow;
      const scholarshipFeePaid = !!freshProfile.is_scholarship_fee_paid;
      const placementFeePaid = !!freshProfile.is_placement_fee_paid;
      const reinstatementFeePaid = !!(freshProfile as any).has_paid_reinstatement_package;
      const onboardingCompleted = !!freshProfile.onboarding_completed;
      
      const isTransferInactive = freshProfile.student_process_type === 'transfer' && freshProfile.visa_transfer_active === false;
      
      
      let maxAllowedStep: OnboardingStep = 'selection_fee';
      if (!selectionFeePaid) maxAllowedStep = 'selection_fee';
      else if (!identityVerified) maxAllowedStep = 'identity_verification';
      else if (!selectionSurveyPassed) maxAllowedStep = 'selection_survey';
      else if (!scholarshipsSelected) maxAllowedStep = 'scholarship_selection';
      else if (!processTypeSelected) maxAllowedStep = 'process_type';
      else if (!documentsUploaded) maxAllowedStep = 'documents_upload'; // Exige apenas o envio para liberar pagamentos
      else if (!applicationFeePaid) maxAllowedStep = 'payment';
      else if (isNewFlowUser && !placementFeePaid) maxAllowedStep = 'placement_fee';
      else if (!isNewFlowUser && !scholarshipFeePaid && freshProfile.student_process_type !== 'resident') maxAllowedStep = 'scholarship_fee';
      else if (isTransferInactive && !reinstatementFeePaid) maxAllowedStep = 'reinstatement_fee';
      else maxAllowedStep = 'my_applications';

      // DECISÃO FINAL DE PASSO A REPRESENTAR NA UI
      const uiStep = currentStepRef.current; // Valor MAIS ATUAL da intenção da UI
      const savedStep = (freshProfile.onboarding_current_step as OnboardingStep) || 'selection_fee';
      
      const uiIdx = VALID_STEPS.indexOf(uiStep);
      const maxIdx = VALID_STEPS.indexOf(maxAllowedStep);
      const savedIdx = VALID_STEPS.indexOf(savedStep);

      let chosenStep: OnboardingStep;
      if (onboardingCompleted) {
        chosenStep = 'completed';
      } else {
        // Lógica Robusta: 
        // 1. A UI tem prioridade se estiver dentro do limite permitido e for >= ao que já salvamos.
        // 2. Se a UI tentar pular etapas, forçamos o limite (maxAllowedStep).
        // 3. Se a UI estiver atrás do banco (ex: refresh), tentamos usar o banco MAS limitado pelo progresso real.
        
        if (uiIdx !== -1 && uiIdx <= maxIdx && uiIdx >= savedIdx) {
          chosenStep = uiStep;
        } else if (uiIdx > maxIdx) {
          // Bloqueio de tentativa de pular etapas
          chosenStep = maxAllowedStep;
        } else {
          // Fallback para o valor persistido no banco, mas NUNCA permitindo ultrapassar o limite real de progresso
          // Isso corrige bugs onde o banco pode ter um step inconsistente (ex: salvo por erro ou fluxo anterior)
          chosenStep = (savedIdx <= maxIdx) ? savedStep : maxAllowedStep;
        }
      }

      // console.log(`[Onboarding] 🚧 DECISÃO FINAL: | UI: ${uiStep} | Banco: ${savedStep} | Permitido: ${maxAllowedStep} | ESCOLHIDO: ${chosenStep}`);

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
        reinstatementFeePaid,
        universityDocumentsUploaded: false,
        onboardingCompleted,
        isNewFlowUser,
      });

      // Sincronizar banco de dados apenas se a decisão divergir da persistência atual
      if (chosenStep !== savedStep) {
        console.log(`[OnboardingHook] 💾 Persistindo novo step no banco: ${chosenStep} (anterior era ${savedStep})`);
        saveStep(chosenStep);
      }

    } catch (error) {
      console.error('[OnboardingHook] Error checking progress:', error);
    } finally {
      if (currentCheckId === lastCheckId.current) {
        setLoading(false);
      }
    }
  }, [user?.id, stableProfile, fetchCart]);

  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  const markStepComplete = useCallback(async () => {
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
