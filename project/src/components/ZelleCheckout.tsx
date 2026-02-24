import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Upload, DollarSign, CheckCircle, AlertCircle, X, Clock, Loader2, FileUp, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/uuid';
import { config } from '../lib/config';
import { getN8nProxyUrl } from '../utils/storageProxy';

interface ZelleCheckoutProps {
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'i20_control_fee';
  amount: number;
  scholarshipsIds?: string[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  metadata?: { 
    [key: string]: any;
    discount_applied?: boolean;
    original_amount?: number;
    final_amount?: number;
  };
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const ZelleCheckout: React.FC<ZelleCheckoutProps> = ({
  feeType,
  amount,
  scholarshipsIds,
  onSuccess,
  onError,
  className = '',
  metadata = {},
  onProcessingChange
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isBlocked, pendingPayment: blockedPendingPayment, rejectedPayment: blockedRejectedPayment, approvedPayment: blockedApprovedPayment, loading: paymentBlockedLoading } = usePaymentBlocked();
  
  // Localhost Test Mode
  const isLocalhost = config.isDevelopment();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'instructions' | 'analyzing' | 'success' | 'under_review' | 'rejected'>('instructions');

  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zellePaymentId, setZellePaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'analyzing' | 'approved' | 'under_review' | 'rejected'>('analyzing');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState<'uploading' | 'sending' | 'analyzing'>('uploading');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastProcessedPaymentIdRef = useRef<string | null>(null);
  const lastProcessedRejectedIdRef = useRef<string | null>(null);
  const lastDataKeyRef = useRef<string | null>(null);
  const stepRef = useRef(step);
  const zellePaymentIdRef = useRef(zellePaymentId);
  const rejectionReasonRef = useRef(rejectionReason);
  const paymentStatusRef = useRef(paymentStatus);
  const isProcessingRef = useRef(isProcessing);
  
  // Atualizar refs quando estados mudam
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  
  useEffect(() => {
    zellePaymentIdRef.current = zellePaymentId;
  }, [zellePaymentId]);
  
  useEffect(() => {
    rejectionReasonRef.current = rejectionReason;
  }, [rejectionReason]);
  
  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);
  
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const handleMockSuccess = async () => {
    setLoading(true);
    setError(null);
    setIsProcessing(true);
    onProcessingChange?.(true);
    
    try {
      // Em localhost, criar um registro real no banco para persistir o pagamento
      // E também atualizar as flags relevantes no user_profiles / scholarship_applications
      // (replicando o que a edge function approve-zelle-payment-automatic faz)
      if (user?.id) {
        const mockPaymentId = generateUUID();
        
        const { error: insertError } = await supabase
          .from('zelle_payments')
          .insert({
            id: mockPaymentId,
            user_id: user.id,
            fee_type: feeType,
            amount: amount,
            status: 'approved', // Já aprovado
            scholarships_ids: scholarshipsIds || [],
            screenshot_url: 'https://placehold.co/600x400/png?text=Mock+Payment',
            admin_notes: 'Mock Payment (Localhost)',
            created_at: new Date().toISOString(),
            admin_approved_at: new Date().toISOString(),
            metadata: {
              ...metadata,
              is_mock: true
            }
          });

        if (insertError) {
          console.error('Error creating mock payment:', insertError);
          // Não falhar o mock se o banco der erro, apenas logar
        } else {
          console.log('✅ Mock payment created in database:', mockPaymentId);
          setZellePaymentId(mockPaymentId);
          zellePaymentIdRef.current = mockPaymentId;
        }

        // --- ATUALIZAR FLAGS NO BANCO (replicando approve-zelle-payment-automatic) ---
        if (feeType === 'selection_process') {
          // Atualizar has_paid_selection_process_fee no user_profiles
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_selection_process_fee: true,
              selection_process_fee_payment_method: 'zelle',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (profileError) {
            console.error('❌ [Mock] Erro ao atualizar has_paid_selection_process_fee:', profileError);
          } else {
            console.log('✅ [Mock] has_paid_selection_process_fee marcado como true');
          }
        } else if (feeType === 'application_fee' || feeType === 'scholarship_fee') {
          // Buscar o user_profiles.id correto (student_id nas scholarship_applications)
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profileData?.id && scholarshipsIds && scholarshipsIds.length > 0) {
            const fieldToUpdate = feeType === 'application_fee' 
              ? 'is_application_fee_paid' 
              : 'is_scholarship_fee_paid';
            const methodField = feeType === 'application_fee'
              ? 'application_fee_payment_method'
              : 'scholarship_fee_payment_method';

            for (const scholarshipId of scholarshipsIds) {
              // Atualizar scholarship_applications existentes
              const { error: appError } = await supabase
                .from('scholarship_applications')
                .update({ 
                  [fieldToUpdate]: true,
                  [methodField]: 'zelle',
                  updated_at: new Date().toISOString()
                })
                .eq('student_id', profileData.id)
                .eq('scholarship_id', scholarshipId);

              if (appError) {
                console.error(`❌ [Mock] Erro ao atualizar ${fieldToUpdate} para scholarship ${scholarshipId}:`, appError);
              } else {
                console.log(`✅ [Mock] ${fieldToUpdate} marcado como true para scholarship ${scholarshipId}`);
              }
            }
          }
        } else if (feeType === 'i20_control_fee') {
          // Atualizar has_paid_i20_control_fee no user_profiles
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_i20_control_fee: true,
              i20_control_fee_payment_method: 'zelle',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (profileError) {
            console.error('❌ [Mock] Erro ao atualizar has_paid_i20_control_fee:', profileError);
          } else {
            console.log('✅ [Mock] has_paid_i20_control_fee marcado como true');
          }
        }
        // --- FIM ATUALIZAÇÃO DE FLAGS ---
      }

      setStep('success');
      setPaymentStatus('approved');
      stepRef.current = 'success';
      paymentStatusRef.current = 'approved';
      
      // Delay pequeno para garantir que UI atualize antes de chamar onSuccess
      setTimeout(() => {
        onSuccess?.();
      }, 500);
      
    } catch (err: any) {
      setError(err.message || 'Mock failed');
    } finally {
      setLoading(false);
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  // Função helper para determinar o estado do pagamento baseado nos dados do banco
  const determinePaymentState = (
    pendingPayment: typeof blockedPendingPayment,
    rejectedPayment: typeof blockedRejectedPayment,
    approvedPayment: typeof blockedApprovedPayment,
    currentStep: typeof step,
    currentZellePaymentId: string | null,
    currentRejectionReason: string | null
  ): {
    step: typeof step;
    paymentStatus: typeof paymentStatus;
    zellePaymentId: string | null;
    rejectionReason: string | null;
    isProcessing: boolean;
  } => {
    // PRIORIDADE 1: Se há pagamento aprovado recente, sempre mostrar success
    // CRÍTICO: Só considerar pagamento aprovado se o fee_type corresponder EXATAMENTE ao feeType atual
    // Não aceitar fee_type null/vazio como match - isso pode causar confusão com pagamentos de outras taxas
    if (approvedPayment && approvedPayment.fee_type === feeType) {
      // Se há pagamento pendente, só mostrar aprovação se for o mesmo pagamento
      if (pendingPayment) {
        // Se o pagamento aprovado é o mesmo que está pendente (mesmo ID), mostrar success
        if (approvedPayment.id === pendingPayment.id) {
          return {
            step: 'success',
            paymentStatus: 'approved',
            zellePaymentId: approvedPayment.id,
            rejectionReason: null,
            isProcessing: false
          };
        }
        // Se são pagamentos diferentes, processar o pendente primeiro
      } else {
        // Se não há pagamento pendente, mostrar aprovação
        return {
          step: 'success',
          paymentStatus: 'approved',
          zellePaymentId: approvedPayment.id,
          rejectionReason: null,
          isProcessing: false
        };
      }
    }

    // Estados finais não mudam a menos que haja nova informação do banco
    if (currentStep === 'success') {
      return {
        step: 'success',
        paymentStatus: 'approved',
        zellePaymentId: currentZellePaymentId,
        rejectionReason: null,
        isProcessing: false
      };
    }

    // Se há pagamento rejeitado recente, mostrar rejected APENAS se:
    // 1. Não há pagamento pendente (para não mostrar rejeição antiga quando há novo pagamento)
    // 2. OU o pagamento rejeitado é o mesmo que estava pendente (mesmo ID)
    // CRÍTICO: Só considerar pagamento rejeitado se o fee_type corresponder EXATAMENTE ao feeType atual
    // Não aceitar fee_type null/vazio como match - isso pode causar confusão com pagamentos de outras taxas
    // CRÍTICO: Se estamos em 'instructions' ou 'analyzing' ou 'under_review' e há um currentZellePaymentId,
    // isso significa que acabamos de fazer um novo upload - IGNORAR rejeição antiga completamente
    if (rejectedPayment && rejectedPayment.fee_type === feeType) {
      // Se estamos em um estado que indica novo upload (instructions, analyzing, under_review) E temos um zellePaymentId,
      // isso significa que acabamos de fazer um novo upload - IGNORAR rejeição antiga
      const isNewUpload = (currentStep === 'instructions' || currentStep === 'analyzing' || currentStep === 'under_review') && 
                          currentZellePaymentId && 
                          currentZellePaymentId !== rejectedPayment.id;
      
      if (isNewUpload) {
        // Novo upload em andamento - ignorar rejeição antiga completamente
        // Continuar processamento abaixo para mostrar o novo pagamento pendente
      } else if (pendingPayment) {
        // Se há pagamento pendente, só mostrar rejeição se for o mesmo pagamento
        if (rejectedPayment.id === pendingPayment.id) {
          return {
            step: 'rejected',
            paymentStatus: 'rejected',
            zellePaymentId: rejectedPayment.id,
            rejectionReason: rejectedPayment.admin_notes || t('zelleComponent.rejected.defaultReason'),
            isProcessing: false
          };
        }
        // Se são pagamentos diferentes, ignorar a rejeição antiga e processar o pendente
      } else {
        // Se não há pagamento pendente, mostrar rejeição (pode ser rejeição recente)
        return {
          step: 'rejected',
          paymentStatus: 'rejected',
          zellePaymentId: rejectedPayment.id,
          rejectionReason: rejectedPayment.admin_notes || t('zelleComponent.rejected.defaultReason'),
          isProcessing: false
        };
      }
    }

    // Se já está em rejected e não há novo pagamento rejeitado, manter rejected
    if (currentStep === 'rejected') {
      return {
        step: 'rejected',
        paymentStatus: 'rejected',
        zellePaymentId: currentZellePaymentId,
        rejectionReason: currentRejectionReason,
        isProcessing: false
      };
    }

    // Se há pagamento pendente, mapear status do banco para estado do componente
    // CRÍTICO: Só considerar pagamento pendente se o fee_type corresponder EXATAMENTE ao feeType atual
    // Não aceitar fee_type null/vazio como match - isso pode causar confusão com pagamentos de outras taxas
    if (pendingPayment && pendingPayment.fee_type === feeType) {
      const paymentId = pendingPayment.id;
      
      switch (pendingPayment.status) {
        case 'rejected':
          return {
            step: 'rejected',
            paymentStatus: 'rejected',
            zellePaymentId: paymentId,
            rejectionReason: null, // Será buscado se necessário
            isProcessing: false
          };
        case 'approved':
        case 'verified':
          return {
            step: 'success',
            paymentStatus: 'approved',
            zellePaymentId: paymentId,
            rejectionReason: null,
            isProcessing: false
          };
        case 'pending_verification':
          return {
            step: 'under_review',
            paymentStatus: 'under_review',
            zellePaymentId: paymentId,
            rejectionReason: null,
            isProcessing: true
          };
        case 'pending':
        default:
          return {
            step: 'analyzing',
            paymentStatus: 'analyzing',
            zellePaymentId: paymentId,
            rejectionReason: null,
            isProcessing: true
          };
      }
    }

    // IMPORTANTE: Se temos um zellePaymentId mas não há pendingPayment nem rejectedPayment,
    // pode ser que o pagamento foi rejeitado recentemente e o hook ainda não atualizou.
    // Neste caso, manter o estado atual (analyzing/under_review) para evitar reset prematuro.
    // O polling ou próximo ciclo do usePaymentBlocked vai detectar a rejeição.
    if (currentZellePaymentId && !pendingPayment && !rejectedPayment && (currentStep === 'analyzing' || currentStep === 'under_review')) {
      // Manter estado atual enquanto aguarda atualização do hook
      return {
        step: currentStep,
        paymentStatus: currentStep === 'under_review' ? 'under_review' : 'analyzing',
        zellePaymentId: currentZellePaymentId,
        rejectionReason: currentRejectionReason,
        isProcessing: true
      };
    }

    // Se não há pagamento pendente ou rejeitado, e não está em estado final, mostrar instruções
    // MAS apenas se realmente não há nenhum pagamento relacionado
    if (!currentZellePaymentId) {
      return {
        step: 'instructions',
        paymentStatus: 'analyzing',
        zellePaymentId: null,
        rejectionReason: null,
        isProcessing: false
      };
    }

    // Manter estado atual se não há mudanças
    return {
      step: currentStep,
      paymentStatus: currentStep === 'under_review' ? 'under_review' : 'analyzing',
      zellePaymentId: currentZellePaymentId,
      rejectionReason: currentRejectionReason,
      isProcessing: currentStep === 'analyzing' || currentStep === 'under_review'
    };
  };

  // useEffect inicial: verificar pagamentos pendentes/rejeitados ao montar o componente
  useEffect(() => {
    // Ao montar, se não há estado definido mas há pagamento pendente/rejeitado, atualizar imediatamente
    if (!paymentBlockedLoading && step === 'instructions' && !zellePaymentId) {
      if (blockedPendingPayment && blockedPendingPayment.fee_type === feeType) {
        // Há pagamento pendente - atualizar estado imediatamente
        const newState = determinePaymentState(
          blockedPendingPayment,
          blockedRejectedPayment,
          blockedApprovedPayment,
          'instructions',
          null,
          null
        );
        setStep(newState.step);
        setPaymentStatus(newState.paymentStatus);
        setZellePaymentId(newState.zellePaymentId);
        setIsProcessing(newState.isProcessing);
        onProcessingChange?.(newState.isProcessing);
        
        // Atualizar refs
        stepRef.current = newState.step;
        paymentStatusRef.current = newState.paymentStatus;
        zellePaymentIdRef.current = newState.zellePaymentId;
        isProcessingRef.current = newState.isProcessing;
      } else if (blockedApprovedPayment && blockedApprovedPayment.fee_type === feeType) {
        // Há pagamento aprovado - atualizar estado imediatamente
        setStep('success');
        setPaymentStatus('approved');
        setZellePaymentId(blockedApprovedPayment.id);
        setRejectionReason(null);
        setIsProcessing(false);
        onProcessingChange?.(false);
        
        // Atualizar refs
        stepRef.current = 'success';
        paymentStatusRef.current = 'approved';
        zellePaymentIdRef.current = blockedApprovedPayment.id;
        isProcessingRef.current = false;
        
        // Chamar onSuccess para avançar para próxima step
        onSuccess?.();
      } else if (blockedRejectedPayment && blockedRejectedPayment.fee_type === feeType) {
        // Há pagamento rejeitado - atualizar estado imediatamente
        setStep('rejected');
        setPaymentStatus('rejected');
        setZellePaymentId(blockedRejectedPayment.id);
        setRejectionReason(blockedRejectedPayment.admin_notes || t('zelleComponent.rejected.defaultReason'));
        setIsProcessing(false);
        onProcessingChange?.(false);
        
        // Atualizar refs
        stepRef.current = 'rejected';
        paymentStatusRef.current = 'rejected';
        zellePaymentIdRef.current = blockedRejectedPayment.id;
        rejectionReasonRef.current = blockedRejectedPayment.admin_notes || t('zelleComponent.rejected.defaultReason');
        isProcessingRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentBlockedLoading, blockedPendingPayment?.id, blockedRejectedPayment?.id, blockedApprovedPayment?.id, feeType]);

  // useEffect principal: sincronizar estado com dados do banco
  useEffect(() => {
    // Se está carregando, aguardar
    if (paymentBlockedLoading) {
      return;
    }

    // CRÍTICO: Se acabamos de fazer um novo upload (temos zellePaymentId mas step é analyzing/under_review),
    // e há uma rejeição antiga no hook, IGNORAR completamente a rejeição antiga até que o novo pagamento apareça no hook
    if ((stepRef.current === 'analyzing' || stepRef.current === 'under_review') && 
        zellePaymentIdRef.current && 
        blockedRejectedPayment && 
        blockedRejectedPayment.id !== zellePaymentIdRef.current) {
      // Novo upload em andamento - ignorar rejeição antiga completamente
      // Não processar até que o novo pagamento apareça no hook
      if (!blockedPendingPayment || blockedPendingPayment.id !== zellePaymentIdRef.current) {
        // Ainda não temos o novo pagamento no hook - aguardar
        return;
      }
    }

    // Verificar se os dados do banco mudaram (usar refs para evitar processamento duplicado)
    const currentPendingId = blockedPendingPayment?.id || null;
    const currentRejectedId = blockedRejectedPayment?.id || null;
    const currentPendingStatus = blockedPendingPayment?.status || null;
    const currentRejectedStatus = blockedRejectedPayment?.status || null;
    
    // Criar chave única para identificar mudanças significativas
    const dataKey = `${currentPendingId}-${currentPendingStatus}-${currentRejectedId}-${currentRejectedStatus}`;
    
    // Se não há mudança significativa, não processar novamente
    // EXCETO se estamos em analyzing/under_review e acabamos de definir manualmente (após resposta n8n)
    // Neste caso, permitir processamento para sincronizar com o banco, mas não resetar o estado
    if (dataKey === lastDataKeyRef.current) {
      // Se acabamos de processar resposta do n8n e ainda não há pendingPayment no hook,
      // não resetar o estado (aguardar hook atualizar)
      if ((stepRef.current === 'analyzing' || stepRef.current === 'under_review') && 
          !blockedPendingPayment && zellePaymentIdRef.current) {
        // Não resetar - manter estado definido manualmente após resposta n8n
        return;
      }
      return;
    }

    // Atualizar refs ANTES de processar para evitar reprocessamento
    lastDataKeyRef.current = dataKey;
    if (currentPendingId) {
      lastProcessedPaymentIdRef.current = currentPendingId;
    }
    if (currentRejectedId) {
      lastProcessedRejectedIdRef.current = currentRejectedId;
    }

    // Usar função helper para determinar estado baseado nos dados do banco
    // Usar refs para acessar valores atuais sem depender deles nas dependências
    const newState = determinePaymentState(
      blockedPendingPayment,
      blockedRejectedPayment,
      blockedApprovedPayment,
      stepRef.current,
      zellePaymentIdRef.current,
      rejectionReasonRef.current
    );

    // Aplicar mudanças apenas se necessário (comparar com refs)
    if (newState.step !== stepRef.current) {
      setStep(newState.step);
    }
    if (newState.zellePaymentId !== zellePaymentIdRef.current) {
      setZellePaymentId(newState.zellePaymentId);
    }
    if (newState.rejectionReason !== rejectionReasonRef.current) {
      setRejectionReason(newState.rejectionReason);
    }
    if (newState.paymentStatus !== paymentStatusRef.current) {
      setPaymentStatus(newState.paymentStatus);
    }
    if (newState.isProcessing !== isProcessingRef.current) {
      setIsProcessing(newState.isProcessing);
      onProcessingChange?.(newState.isProcessing);
    }

    // Se status mudou para approved, chamar onSuccess (apenas uma vez)
    if (newState.step === 'success' && stepRef.current !== 'success') {
      onSuccess?.();
    }
            
    // Buscar admin_notes se necessário (quando status é rejected mas não temos motivo)
    if (newState.step === 'rejected' && !newState.rejectionReason && newState.zellePaymentId) {
      supabase
        .from('zelle_payments')
        .select('admin_notes, status')
        .eq('id', newState.zellePaymentId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.admin_notes) {
            setRejectionReason(data.admin_notes);
          }
          // Se o status no banco é rejected mas não temos rejectedPayment do hook,
          // forçar atualização do estado
          if (data?.status === 'rejected' && !blockedRejectedPayment) {
            // Isso vai forçar uma nova verificação no próximo ciclo
            lastDataKeyRef.current = null;
          }
        });
    }
    
    // Verificação adicional: se temos zellePaymentId mas não há pendingPayment nem rejectedPayment,
    // verificar diretamente no banco se foi aprovado ou rejeitado (apenas quando estamos em analyzing/under_review)
    // Isso evita que o estado seja resetado prematuramente quando o admin aprova/rejeita
    // TAMBÉM verificar se há pendingPayment com status approved/verified ou rejected (caso o hook ainda não atualizou)
    
    // PRIORIDADE 1: Verificar se pagamento foi APROVADO
    if (blockedPendingPayment && 
        (blockedPendingPayment.status === 'approved' || blockedPendingPayment.status === 'verified') && 
        blockedPendingPayment.fee_type === feeType) {
      // Pagamento pendente foi aprovado! Atualizar estado imediatamente
      setStep('success');
      setPaymentStatus('approved');
      setZellePaymentId(blockedPendingPayment.id);
      setRejectionReason(null);
      setIsProcessing(false);
      onProcessingChange?.(false);
      
      // Atualizar refs
      stepRef.current = 'success';
      paymentStatusRef.current = 'approved';
      zellePaymentIdRef.current = blockedPendingPayment.id;
      isProcessingRef.current = false;
      
      // Chamar onSuccess para avançar para próxima step
      onSuccess?.();
    }
    // PRIORIDADE 2: Verificar se pagamento foi REJEITADO
    else if (blockedPendingPayment && blockedPendingPayment.status === 'rejected' && blockedPendingPayment.fee_type === feeType) {
      // Pagamento pendente foi rejeitado! Atualizar estado imediatamente
      setStep('rejected');
      setPaymentStatus('rejected');
      setZellePaymentId(blockedPendingPayment.id);
      setRejectionReason(null); // Será buscado abaixo
      setIsProcessing(false);
      onProcessingChange?.(false);
      
      // Buscar admin_notes
      supabase
        .from('zelle_payments')
        .select('admin_notes')
        .eq('id', blockedPendingPayment.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.admin_notes) {
            setRejectionReason(data.admin_notes);
          }
        });
      
      // Atualizar refs
      stepRef.current = 'rejected';
      paymentStatusRef.current = 'rejected';
      zellePaymentIdRef.current = blockedPendingPayment.id;
      isProcessingRef.current = false;
    } 
    // IMPORTANTE: Se tínhamos um pendingPayment antes mas agora não temos mais (e não temos rejectedPayment),
    // pode ser que o pagamento foi aprovado ou rejeitado e o hook ainda não atualizou. Verificar diretamente no banco.
    else if (lastProcessedPaymentIdRef.current && !blockedPendingPayment && !blockedRejectedPayment && 
        (stepRef.current === 'analyzing' || stepRef.current === 'under_review' || stepRef.current === 'instructions')) {
      // Tínhamos um pagamento pendente que desapareceu - verificar se foi aprovado ou rejeitado
      const checkIfApprovedOrRejected = async () => {
        try {
          const { data } = await supabase
            .from('zelle_payments')
            .select('id, status, admin_notes, fee_type')
            .eq('id', lastProcessedPaymentIdRef.current)
            .eq('fee_type', feeType)
            .maybeSingle();
          
          if (data?.status === 'approved' || data?.status === 'verified') {
            // Pagamento foi aprovado! Atualizar estado imediatamente
            setStep('success');
            setPaymentStatus('approved');
            setZellePaymentId(data.id);
            setRejectionReason(null);
            setIsProcessing(false);
            onProcessingChange?.(false);
            
            // Atualizar refs
            stepRef.current = 'success';
            paymentStatusRef.current = 'approved';
            zellePaymentIdRef.current = data.id;
            isProcessingRef.current = false;
            
            // Chamar onSuccess para avançar para próxima step
            onSuccess?.();
            
            // Forçar atualização do hook na próxima verificação
            lastDataKeyRef.current = null;
          } else if (data?.status === 'rejected') {
            // Pagamento foi rejeitado! Atualizar estado imediatamente
            setStep('rejected');
            setPaymentStatus('rejected');
            setZellePaymentId(data.id);
            setRejectionReason(data.admin_notes || t('zelleComponent.rejected.defaultReason'));
            setIsProcessing(false);
            onProcessingChange?.(false);
            
            // Atualizar refs
            stepRef.current = 'rejected';
            paymentStatusRef.current = 'rejected';
            zellePaymentIdRef.current = data.id;
            rejectionReasonRef.current = data.admin_notes || t('zelleComponent.rejected.defaultReason');
            isProcessingRef.current = false;
            
            // Forçar atualização do hook na próxima verificação
            lastDataKeyRef.current = null;
          }
        } catch (error) {
          console.error('❌ [ZelleCheckout] Erro ao verificar se pagamento foi aprovado/rejeitado:', error);
        }
      };
      
      // Executar verificação com pequeno delay para evitar race conditions
      setTimeout(checkIfApprovedOrRejected, 300);
    } else if (zellePaymentIdRef.current && !blockedPendingPayment && !blockedRejectedPayment && 
        (stepRef.current === 'analyzing' || stepRef.current === 'under_review')) {
      // Usar um timeout para evitar múltiplas verificações simultâneas
      const checkApprovalOrRejection = async () => {
        try {
          const { data } = await supabase
            .from('zelle_payments')
            .select('id, status, admin_notes, fee_type')
            .eq('id', zellePaymentIdRef.current)
            .eq('fee_type', feeType)
            .maybeSingle();
          
          if (data?.status === 'approved' || data?.status === 'verified') {
            // Pagamento foi aprovado! Atualizar estado imediatamente
            setStep('success');
            setPaymentStatus('approved');
            setZellePaymentId(data.id);
            setRejectionReason(null);
            setIsProcessing(false);
            onProcessingChange?.(false);
            
            // Atualizar refs
            stepRef.current = 'success';
            paymentStatusRef.current = 'approved';
            zellePaymentIdRef.current = data.id;
            isProcessingRef.current = false;
            
            // Chamar onSuccess para avançar para próxima step
            onSuccess?.();
            
            // Forçar atualização do hook na próxima verificação
            lastDataKeyRef.current = null;
          } else if (data?.status === 'rejected') {
            // Pagamento foi rejeitado! Atualizar estado imediatamente
            setStep('rejected');
            setPaymentStatus('rejected');
            setZellePaymentId(data.id);
            setRejectionReason(data.admin_notes || t('zelleComponent.rejected.defaultReason'));
            setIsProcessing(false);
            onProcessingChange?.(false);
            
            // Atualizar refs
            stepRef.current = 'rejected';
            paymentStatusRef.current = 'rejected';
            zellePaymentIdRef.current = data.id;
            rejectionReasonRef.current = data.admin_notes || t('zelleComponent.rejected.defaultReason');
            isProcessingRef.current = false;
            
            // Forçar atualização do hook na próxima verificação
            lastDataKeyRef.current = null;
          }
        } catch (error) {
          console.error('❌ [ZelleCheckout] Erro ao verificar aprovação/rejeição:', error);
        }
      };
      
      // Executar apenas uma vez por ciclo, com pequeno delay para evitar race conditions
      setTimeout(checkApprovalOrRejection, 500);
    }
    // IMPORTANTE: Dependências apenas dos dados do banco, não dos estados locais que atualizamos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlocked, blockedPendingPayment?.id, blockedPendingPayment?.status, blockedRejectedPayment?.id, blockedRejectedPayment?.status, blockedApprovedPayment?.id, blockedApprovedPayment?.status, paymentBlockedLoading, feeType]);

  // Polling controlado para atualizações rápidas quando há pagamento em processamento
  // Funciona para TODOS os tipos de taxa: selection_process, application_fee, scholarship_fee, enrollment_fee
  useEffect(() => {
    // Polling apenas quando:
    // - Há zellePaymentId definido
    // - Estado NÃO é final (rejected ou success)
    // - Estado é analyzing ou under_review (aguardando resultado)
    if (!zellePaymentId || step === 'rejected' || step === 'success' || step === 'instructions') {
      return;
              }

    if (step !== 'analyzing' && step !== 'under_review') {
      return;
    }

    console.log(`🔄 [ZelleCheckout] Iniciando polling para paymentId: ${zellePaymentId}, feeType: ${feeType}`);

    const pollPaymentStatus = async () => {
      try {
        const { data: paymentData, error } = await supabase
          .from('zelle_payments')
          .select('id, status, admin_notes, fee_type')
          .eq('id', zellePaymentId)
          .eq('fee_type', feeType)
          .maybeSingle();

        if (error) {
          console.error('❌ [ZelleCheckout] Erro ao fazer polling:', error);
          return;
        }

        if (!paymentData) {
          console.log('⚠️ [ZelleCheckout] Pagamento não encontrado no polling');
            return;
          }

        // Se status mudou para rejeitado, atualizar estado imediatamente
        // Funciona para TODOS os tipos de taxa (application_fee, scholarship_fee, etc.)
        if (paymentData.status === 'rejected') {
          console.log(`🚫 [ZelleCheckout] Rejeição detectada no polling para ${feeType}, atualizando estado`);
          setStep('rejected');
          setPaymentStatus('rejected');
          setRejectionReason(paymentData.admin_notes || t('zelleComponent.rejected.defaultReason'));
          setIsProcessing(false);
          onProcessingChange?.(false);
          
          // Atualizar refs
          stepRef.current = 'rejected';
          paymentStatusRef.current = 'rejected';
          rejectionReasonRef.current = paymentData.admin_notes || t('zelleComponent.rejected.defaultReason');
          isProcessingRef.current = false;
          
          // Forçar atualização do hook na próxima verificação
          lastDataKeyRef.current = null;
          return;
        }

        // Se status é aprovado, atualizar estado imediatamente
        // Funciona para TODOS os tipos de taxa (application_fee, scholarship_fee, etc.)
        if (paymentData.status === 'approved' || paymentData.status === 'verified') {
          console.log(`✅ [ZelleCheckout] Aprovação detectada no polling para ${feeType}, atualizando estado`);
          setStep('success');
          setPaymentStatus('approved');
          setRejectionReason(null);
          setIsProcessing(false);
          onProcessingChange?.(false);
          
          // Atualizar refs
          stepRef.current = 'success';
          paymentStatusRef.current = 'approved';
          isProcessingRef.current = false;
          
          // Chamar onSuccess para avançar para próxima step
          onSuccess?.();
          
          // Forçar atualização do hook na próxima verificação
          lastDataKeyRef.current = null;
          return;
        }
      } catch (error) {
        console.error('❌ [ZelleCheckout] Erro no polling:', error);
      }
    };

    // Primeira verificação imediata
    pollPaymentStatus();

    // Polling a cada 10 segundos para detectar mudanças mais rapidamente
    const interval = setInterval(() => {
      pollPaymentStatus();
    }, 10000);

    return () => {
      console.log('🛑 [ZelleCheckout] Parando polling');
      clearInterval(interval);
    };
  }, [zellePaymentId, step, rejectionReason]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError(t('zelleComponent.errors.fileSize'));
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError(t('zelleComponent.errors.fileType'));
        return;
      }
      
      setComprovanteFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setComprovantePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validatePaymentDetails = () => {
    if (!comprovanteFile) {
      setError(t('zelleComponent.errors.uploadRequired'));
      return false;
    }
    return true;
  };

  const uploadComprovante = async (): Promise<string | null> => {
    if (!comprovanteFile) return null;
    
    try {
      setUploadStep('uploading');
      setUploadProgress(0);
      
      // Simular progresso do upload (Supabase não fornece progresso real, então simulamos)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Usar nome de arquivo organizado: timestamp_fee_type.extension
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileExt = comprovanteFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${timestamp}_${feeType}.${fileExt}`;
      const filePath = `zelle-payments/${user?.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('zelle_comprovantes')
        .upload(filePath, comprovanteFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (uploadError) {
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('zelle_comprovantes')
        .getPublicUrl(filePath);
      
      // Pequeno delay para mostrar 100%
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading comprovante:', error);
      throw new Error(t('zelleComponent.errors.uploadFailed'));
    }
  };

  const sendToN8n = async (comprovanteUrl: string, paymentId: string) => {
    try {
      // Construir a URL proxied para o n8n conseguir acessar a imagem
      const proxiedImageUrl = getN8nProxyUrl(comprovanteUrl);

      // Payload no mesmo formato que o ZelleCheckoutPage.tsx usa
      const webhookPayload: Record<string, any> = {
        user_id: user?.id,
        image_url: proxiedImageUrl,
        value: amount.toString(),
        currency: 'USD',
        fee_type: feeType,
        timestamp: new Date().toISOString(),
        payment_id: paymentId,
      };

      // Adicionar scholarships_ids se aplicável
      if ((feeType === 'application_fee' || feeType === 'scholarship_fee') && scholarshipsIds && scholarshipsIds.length > 0) {
        webhookPayload.scholarships_ids = scholarshipsIds;
      }

      console.log('📤 [ZelleCheckout] Enviando para n8n:', webhookPayload);

      const response = await fetch('https://nwh.suaiden.com/webhook/zelle-global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
      }

      // Aguardar resposta do n8n
      const responseText = await response.text();
      console.log('📥 [ZelleCheckout] Resposta bruta do n8n:', responseText);
      
      let n8nResponse = null;
      try {
        n8nResponse = JSON.parse(responseText);
        console.log('📥 [ZelleCheckout] Resposta JSON do n8n:', n8nResponse);
      } catch (e) {
        console.log('⚠️ [ZelleCheckout] Resposta não é JSON válido');
      }

      // Armazenar resposta no localStorage para verificação posterior
      if (n8nResponse) {
        localStorage.setItem(`n8n_response_${paymentId}`, JSON.stringify(n8nResponse));
      }

      return { tempPaymentId: paymentId, n8nResponse };
    } catch (error) {
      console.error('Error sending to n8n:', error);
      throw error;
    }
  };


  const handleSubmit = async () => {
    // BLOQUEIO: Não permitir submit se há pagamento pendente
    if (isBlocked && blockedPendingPayment) {
      console.log('🚫 [ZelleCheckout] Tentativa de submit bloqueada - há pagamento pendente');
      setError(t('zelleComponent.errors.alreadyPending'));
      return;
    }

    if (!validatePaymentDetails()) return;
    
    setLoading(true);
    setError(null);
    setShowUploadModal(true);
    setUploadStep('uploading');
    setUploadProgress(0);
    
    try {
      // Upload comprovante
      const comprovanteUrl = await uploadComprovante();
      if (!comprovanteUrl) {
        throw new Error(t('zelleComponent.errors.uploadFailed'));
      }
      
      // Atualizar modal para etapa de envio
      setUploadStep('sending');
      setUploadProgress(0);
      
      // Simular progresso do envio
      const sendProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) {
            clearInterval(sendProgressInterval);
            return 80;
          }
          return prev + 15;
        });
      }, 150);
      
      // Gerar ID único para o pagamento (enviado ao n8n para referência)
      console.log('💾 [ZelleCheckout] Gerando ID único para o pagamento...');
      const realPaymentId = generateUUID();
      console.log('✅ [ZelleCheckout] ID gerado:', realPaymentId);
      setZellePaymentId(realPaymentId);
      
      // Construir imageUrl igual ao fluxo padrão (URL completa do storage)
      const imageUrl = comprovanteUrl; // comprovanteUrl já é a URL pública completa
      
      // Enviar para n8n e aguardar resposta (o n8n criará o registro no banco)
      const { n8nResponse } = await sendToN8n(comprovanteUrl, realPaymentId);
      
      clearInterval(sendProgressInterval);
      setUploadProgress(100);
      
      // Atualizar para etapa de análise
      setUploadStep('analyzing');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Fechar modal e iniciar processamento
      setShowUploadModal(false);
      setIsProcessing(true);
      onProcessingChange?.(true);
      
      // Processar resposta do n8n (igual ao fluxo padrão)
      if (n8nResponse?.response) {
        const response = n8nResponse.response.toLowerCase();
        const isPositiveResponse = response === 'the proof of payment is valid.';
        
        if (isPositiveResponse) {
          setStep('analyzing');
          setPaymentStatus('analyzing');
          // Atualizar refs imediatamente para evitar sobrescrita
          stepRef.current = 'analyzing';
          paymentStatusRef.current = 'analyzing';
        } else {
          setStep('under_review');
          setPaymentStatus('under_review');
          // Atualizar refs imediatamente para evitar sobrescrita
          stepRef.current = 'under_review';
          paymentStatusRef.current = 'under_review';
        }
        
        // ✅ SEMPRE atualizar o pagamento no banco com a imagem e resposta do n8n (igual ao fluxo padrão)
        console.log('💾 [ZelleCheckout] Atualizando pagamento no banco com resultado do n8n...');
        
        try {
          // Aguardar um pouco para o n8n processar e criar o registro
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de delay
          
          // Buscar o pagamento mais recente do usuário para este tipo de taxa
          // Tentar várias vezes se não encontrar
          let recentPayment = null;
          let findError = null;
          let attempts = 0;
          const maxAttempts = 5;
          
          while (attempts < maxAttempts && !recentPayment) {
            attempts++;
            console.log(`🔍 [ZelleCheckout] Tentativa ${attempts}/${maxAttempts} de buscar pagamento...`);
            
            // Primeiro tentar buscar com fee_type específico
            let { data, error } = await supabase
              .from('zelle_payments')
              .select('id')
              .eq('user_id', user?.id)
              .eq('fee_type', feeType)
              .eq('status', 'pending_verification')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            // Se não encontrar com fee_type específico, buscar por valor e status (para pagamentos criados pelo n8n)
            if (error && error.code === 'PGRST116') {
              console.log(`🔍 [ZelleCheckout] Não encontrado com fee_type específico, buscando por valor e status...`);
              const { data: dataByAmount, error: errorByAmount } = await supabase
                .from('zelle_payments')
                .select('id')
                .eq('user_id', user?.id)
                .eq('amount', amount)
                .eq('status', 'pending_verification')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              
              if (!errorByAmount && dataByAmount) {
                data = dataByAmount;
                error = null;
                console.log(`✅ [ZelleCheckout] Pagamento encontrado por valor e status!`);
              }
            }
            
            if (error && error.code === 'PGRST116') {
              // Nenhum registro encontrado, aguardar mais um pouco
              console.log(`⏳ [ZelleCheckout] Pagamento não encontrado na tentativa ${attempts}, aguardando...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de delay
              continue;
            }
            
            if (error) {
              findError = error;
              break;
            }
            
            recentPayment = data;
          }
          
          if (findError || !recentPayment) {
            console.error('❌ [ZelleCheckout] Pagamento não encontrado após todas as tentativas:', findError);
          } else {
            console.log('🔍 [ZelleCheckout] Pagamento encontrado para atualização:', recentPayment.id);
            
            // Preparar dados de atualização baseado na resposta da IA (igual ao fluxo padrão)
            const updateData: any = {
              screenshot_url: imageUrl,
              admin_notes: `n8n response: ${n8nResponse.response}`,
              updated_at: new Date().toISOString(),
              // ✅ Sempre garantir que fee_type esteja correto (n8n pode criar sem fee_type)
              fee_type: feeType,
            };
            
            // ✅ APENAS quando a IA aprova, marcar como aprovado
            if (isPositiveResponse) {
              updateData.status = 'approved';
              updateData.admin_approved_at = new Date().toISOString();
              console.log('✅ [ZelleCheckout] Marcando pagamento como aprovado');
            } else {
              console.log('⏳ [ZelleCheckout] Mantendo pagamento como pending_verification para revisão manual');
            }
            
            // Persistir scholarships_ids no registro quando aplicável
            if ((feeType === 'application_fee' || feeType === 'scholarship_fee') && scholarshipsIds && scholarshipsIds.length > 0) {
              updateData.scholarships_ids = Array.isArray(scholarshipsIds) ? scholarshipsIds : [scholarshipsIds];
              console.log('💾 [ZelleCheckout] Gravando scholarships_ids no zelle_payments:', updateData.scholarships_ids);
            }
            
            // Atualizar o registro encontrado
            const { data: updateResult, error: updateError } = await supabase
              .from('zelle_payments')
              .update(updateData)
              .eq('id', recentPayment.id)
              .select();
            
            if (updateError) {
              console.error('❌ [ZelleCheckout] Erro ao atualizar pagamento:', updateError);
            } else {
              console.log('✅ [ZelleCheckout] Pagamento atualizado com sucesso:', updateResult);
            }
          }
        } catch (updateError) {
          console.error('❌ [ZelleCheckout] Erro ao processar pagamento:', updateError);
        }
      } else {
        // Se não tem resposta imediata, aguardar verificação
        setStep('analyzing');
        setPaymentStatus('analyzing');
        // Atualizar refs imediatamente para evitar sobrescrita
        stepRef.current = 'analyzing';
        paymentStatusRef.current = 'analyzing';
      }
      
      // Atualizar zellePaymentIdRef também
      zellePaymentIdRef.current = realPaymentId;
      
      setLoading(false);
      
    } catch (error: any) {
      setShowUploadModal(false);
      setError(error.message || t('zelleComponent.errors.uploadFailed'));
      onError?.(error.message);
      setLoading(false);
    }
  };

  // Modal de Upload com Animação
  const UploadModal = () => {
    // Não mostrar modal em estados finais
    if (!showUploadModal || step === 'rejected' || step === 'success') return null;

    const getStepInfo = () => {
      switch (uploadStep) {
        case 'uploading':
          return {
            icon: FileUp,
            title: t('zelleComponent.uploadModal.uploadingTitle'),
            message: t('zelleComponent.uploadModal.uploadingMessage'),
            bgGradient: 'from-blue-50/50 to-blue-100/30',
            borderColor: 'border-blue-200',
            iconGradient: 'from-blue-500 to-blue-600',
            ringColor: 'border-blue-300',
            titleColor: 'text-blue-900',
            progressGradient: 'from-blue-500 to-blue-600',
            dotColor: 'bg-blue-500'
          };
        case 'sending':
          return {
            icon: Send,
            title: t('zelleComponent.uploadModal.sendingTitle'),
            message: t('zelleComponent.uploadModal.sendingMessage'),
            bgGradient: 'from-indigo-50/50 to-indigo-100/30',
            borderColor: 'border-indigo-200',
            iconGradient: 'from-indigo-500 to-indigo-600',
            ringColor: 'border-indigo-300',
            titleColor: 'text-indigo-900',
            progressGradient: 'from-indigo-500 to-indigo-600',
            dotColor: 'bg-indigo-500'
          };
        case 'analyzing':
          return {
            icon: Sparkles,
            title: t('zelleComponent.uploadModal.analyzingTitle'),
            message: t('zelleComponent.uploadModal.analyzingMessage'),
            bgGradient: 'from-purple-50/50 to-purple-100/30',
            borderColor: 'border-purple-200',
            iconGradient: 'from-purple-500 to-purple-600',
            ringColor: 'border-purple-300',
            titleColor: 'text-purple-900',
            progressGradient: 'from-purple-500 to-purple-600',
            dotColor: 'bg-purple-500'
          };
        default:
          return {
            icon: Loader2,
            title: t('zelleComponent.instructions.processing'),
            message: t('zelleComponent.uploadModal.uploadingMessage'),
            bgGradient: 'from-blue-50/50 to-blue-100/30',
            borderColor: 'border-blue-200',
            iconGradient: 'from-blue-500 to-blue-600',
            ringColor: 'border-blue-300',
            titleColor: 'text-blue-900',
            progressGradient: 'from-blue-500 to-blue-600',
            dotColor: 'bg-blue-500'
          };
      }
    };

    const stepInfo = getStepInfo();
    const Icon = stepInfo.icon;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
          {/* Background Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stepInfo.bgGradient}`}></div>
          
          {/* Animated Border */}
          <div className={`absolute inset-0 rounded-3xl border-2 ${stepInfo.borderColor} animate-pulse`}></div>
          
          <div className="relative z-10 text-center">
            {/* Animated Icon */}
            <div className="mb-6 flex justify-center">
              <div className={`relative w-20 h-20 bg-gradient-to-br ${stepInfo.iconGradient} rounded-2xl flex items-center justify-center shadow-xl`}>
                <Icon className="w-10 h-10 text-white animate-pulse" />
                {/* Rotating Ring */}
                <div className={`absolute inset-0 rounded-2xl border-4 ${stepInfo.ringColor} animate-spin`} style={{ borderTopColor: 'transparent' }}></div>
              </div>
            </div>

            {/* Title */}
            <h3 className={`text-2xl font-bold ${stepInfo.titleColor} mb-2`}>
              {stepInfo.title}
            </h3>

            {/* Message */}
            <p className="text-gray-600 mb-6 text-sm">
              {stepInfo.message}
            </p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${stepInfo.progressGradient} rounded-full transition-all duration-300 ease-out shadow-lg`}
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="h-full bg-white/30 animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{uploadProgress}%</p>
            </div>

            {/* Animated Dots */}
            <div className="flex justify-center space-x-2">
              <div className={`w-2 h-2 ${stepInfo.dotColor} rounded-full animate-bounce`} style={{ animationDelay: '0s' }}></div>
              <div className={`w-2 h-2 ${stepInfo.dotColor} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
              <div className={`w-2 h-2 ${stepInfo.dotColor} rounded-full animate-bounce`} style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (step === 'analyzing') {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 sm:p-8 text-center shadow-lg ${className}`}>
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-blue-200/30 rounded-full animate-ping"></div>
            </div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
              <div className="absolute inset-0 rounded-2xl border-4 border-blue-300 animate-spin" style={{ borderTopColor: 'transparent' }}></div>
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-blue-900 mb-3">
            {t('zelleComponent.analyzing.title')}
          </h3>
          <p className="text-sm sm:text-base text-blue-700 mb-4">
            {t('zelleComponent.analyzing.subtitle')}
          </p>

          {isLocalhost && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-bold text-amber-800 uppercase mb-2">Test Mode (Localhost Only)</p>
              <button
                onClick={handleMockSuccess}
                className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium text-xs uppercase"
              >
                Skip to Success (Mock)
              </button>
            </div>
          )}
      </div>
    );
  }

  if (step === 'under_review') {
    return (
      <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8 shadow-lg ${className}`}>
          <div className="text-center mb-6">
            <div className="relative mb-6 inline-block">
              {/* Animated Background Circle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-amber-200/40 rounded-full animate-pulse"></div>
              </div>
              {/* Main Icon */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Clock className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-amber-900 mb-3">
              {t('zelleComponent.underReview.title')}
          </h3>
            <p className="text-sm sm:text-base text-amber-800 mb-4 leading-relaxed">
            {t('zelleComponent.underReview.subtitle')}
          </p>
            <div className="flex justify-center space-x-2 mt-4">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>


        {/* Payment Details */}
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-4">
          <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">{t('zelleComponent.success.detailsTitle')}</h4>
          <div className="space-y-2 text-xs sm:text-sm text-gray-600">
            {metadata?.discount_applied && metadata?.original_amount ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>{t('zelleComponent.success.originalAmount')}</span>
                  <span className="font-medium">${metadata.original_amount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>{t('zelleComponent.success.discountApplied')}</span>
                  <span className="font-medium">-$50.00 USD</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">{t('zelleComponent.success.finalAmount')}</span>
                  <span className="font-bold text-green-700">${amount.toFixed(2)} USD</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="font-semibold">{t('zelleComponent.success.amount')}</span>
                <span className="font-bold text-gray-900">${amount.toFixed(2)} USD</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span>{t('zelleComponent.success.feeType')}</span>
              <span className="font-medium">{feeType.replace('_', ' ')}</span>
            </div>
            {(zellePaymentId || blockedPendingPayment?.id) && (
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span>{t('zelleComponent.success.paymentId')}</span>
                <span className="font-mono text-xs">{zellePaymentId || blockedPendingPayment?.id}</span>
              </div>
            )}
            {blockedPendingPayment?.created_at && (
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span>{t('zelleComponent.success.submitted')}</span>
                <span className="font-medium">{new Date(blockedPendingPayment.created_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <span className="text-blue-600 text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-blue-800 font-medium mb-1">
                {t('zelleComponent.underReview.title')}
              </p>
              <p className="text-xs sm:text-sm text-blue-700">
                {t('zelleComponent.underReview.notification')}
              </p>
            </div>
          </div>

          {isLocalhost && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
              <p className="text-xs font-bold text-amber-800 uppercase mb-2">Test Mode (Localhost Only)</p>
              <button
                onClick={handleMockSuccess}
                className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium text-xs uppercase"
              >
                Skip to Success (Mock)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'rejected') {
    return (
      <div className={`bg-red-50 border-2 border-red-300 rounded-lg p-4 sm:p-6 ${className}`}>
        <div className="text-center mb-4 sm:mb-6">
          <AlertCircle className="w-16 h-16 sm:w-20 sm:h-20 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-bold text-red-800 mb-2">
            {t('zelleComponent.rejected.title')}
          </h3>
          <p className="text-sm sm:text-base text-red-700 mb-4">
            {t('zelleComponent.rejected.subtitle')}
          </p>
        </div>

        {/* Rejection Reason - Destaque maior */}
        {rejectionReason ? (
          <div className="bg-white rounded-lg border-2 border-red-300 p-4 sm:p-5 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">{t('zelleComponent.rejected.reasonTitle')}</h4>
                <p className="text-sm sm:text-base text-gray-800 bg-red-50 p-3 rounded-lg border border-red-200 font-medium">
                  {rejectionReason}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border-2 border-red-300 p-4 sm:p-5 mb-4">
            <p className="text-sm sm:text-base text-gray-700">
              {t('zelleComponent.rejected.defaultReason')}
            </p>
          </div>
        )}

        {/* Payment Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4">
          <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">{t('zelleComponent.success.detailsTitle')}</h4>
          <div className="space-y-2 text-xs sm:text-sm text-gray-600">
            {metadata?.discount_applied && metadata?.original_amount ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>{t('zelleComponent.success.originalAmount')}</span>
                  <span className="font-medium">${metadata.original_amount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>{t('zelleComponent.success.discountApplied')}</span>
                  <span className="font-medium">-$50.00 USD</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">{t('zelleComponent.success.finalAmount')}</span>
                  <span className="font-bold text-green-700">${amount.toFixed(2)} USD</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="font-semibold">{t('zelleComponent.success.amount')}</span>
                <span className="font-bold text-gray-900">${amount.toFixed(2)} USD</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span>{t('zelleComponent.success.feeType')}</span>
              <span className="font-medium">{feeType.replace('_', ' ')}</span>
            </div>
            {zellePaymentId && (
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span>{t('zelleComponent.success.paymentId')}</span>
                <span className="font-mono text-xs">{zellePaymentId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button - Destaque */}
        <div className="space-y-3">
          <button
            onClick={() => {
              console.log('🔄 [ZelleCheckout] Usuário clicou em "Upload New Payment Proof" - resetando formulário');
              // Resetar todos os estados para permitir novo upload
              setComprovanteFile(null);
              setComprovantePreview(null);
              setError(null);
              setStep('instructions');
              setRejectionReason(null);
              setIsProcessing(false);
              onProcessingChange?.(false);
              setZellePaymentId(null);
              
              // IMPORTANTE: Limpar refs também para garantir que a lógica de determinePaymentState
              // não use valores antigos
              stepRef.current = 'instructions';
              paymentStatusRef.current = 'analyzing';
              zellePaymentIdRef.current = null;
              rejectionReasonRef.current = null;
              isProcessingRef.current = false;
              lastProcessedPaymentIdRef.current = null;
              lastProcessedRejectedIdRef.current = null;
              lastDataKeyRef.current = null;
            }}
            className="w-full bg-red-600 text-white py-3 sm:py-4 px-6 rounded-lg hover:bg-red-700 transition-colors font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {t('zelleComponent.rejected.uploadNew')}
          </button>
          <p className="text-xs sm:text-sm text-center text-gray-600">
            {t('zelleComponent.rejected.uploadNewNote')}
          </p>

          {isLocalhost && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-bold text-amber-800 uppercase mb-2">Test Mode (Localhost Only)</p>
              <button
                onClick={handleMockSuccess}
                className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium text-xs uppercase"
              >
                Skip to Success (Mock)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 text-center ${className}`}>
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-2">
          {t('zelleComponent.success.title')}
        </h3>
        <p className="text-sm sm:text-base text-green-700 mb-4">
          {t('zelleComponent.success.subtitle')}
        </p>
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 text-left">
          <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">{t('zelleComponent.success.detailsTitle')}</h4>
          <div className="space-y-1 text-xs sm:text-sm text-gray-600">
            {metadata?.discount_applied && metadata?.original_amount ? (
              <div className="space-y-1">
                <div><strong>{t('zelleComponent.success.originalAmount')}</strong> ${metadata.original_amount.toFixed(2)} USD</div>
                <div><strong>{t('zelleComponent.success.discountApplied')}</strong> -$50.00 USD</div>
                <div><strong>{t('zelleComponent.success.finalAmount')}</strong> <span className="font-bold text-green-700">${amount.toFixed(2)} USD</span></div>
                <div className="text-green-600 font-medium">🎉 {t('zelleComponent.success.youSavedSuccess')}</div>
              </div>
            ) : (
              <div><strong>{t('zelleComponent.success.amount')}</strong> ${amount.toFixed(2)} USD</div>
            )}
            <div><strong>{t('zelleComponent.success.feeType')}</strong> {feeType.replace('_', ' ')}</div>
            {zellePaymentId && (
              <div><strong>{t('zelleComponent.success.paymentId')}</strong> {zellePaymentId}</div>
            )}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
          <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">{t('zelleComponent.success.nextStepsTitle')}</h4>
          <div className="text-xs sm:text-sm text-blue-700 space-y-1">
            <div>✅ {t('zelleComponent.success.stepUploaded')}</div>
            <div>✅ {t('zelleComponent.success.stepApproved')}</div>
            <div>🚀 {t('zelleComponent.success.stepProceeding')}</div>
          </div>
        </div>
      </div>
    );
  }

  // Se está verificando pagamento pendente, mostrar loading
  if (paymentBlockedLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 sm:p-6 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">{t('zelleComponent.errors.checkingStatus')}</p>
      </div>
    );
  }

  return (
    <>
      {/* Modal de Upload */}
      <UploadModal />
      
    <div className={`bg-white border border-gray-200 rounded-lg p-4 sm:p-6 ${className}`}>
      {/* IMPORTANTE: Só mostrar instruções se NÃO estiver processando e NÃO tiver pagamento pendente */}
      {/* Se há pagamento pendente, os estados analyzing/under_review já foram renderizados acima */}
      {step === 'instructions' && !isProcessing && !isBlocked && !blockedPendingPayment && (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t('zelleComponent.instructions.title')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {t('zelleComponent.instructions.subtitle')}
            </p>
          </div>

          {/* Zelle Payment Information - Estilo igual ao ZelleCheckoutPage */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('zelleComponent.instructions.detailsTitle')}</h2>
                <p className="text-xs sm:text-sm text-gray-600">{t('zelleComponent.instructions.detailsSubtitle')}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t('zelleComponent.instructions.recipientEmail')}
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                    <code className="text-xs sm:text-sm font-mono text-gray-900 break-all">pay@matriculausa.com</code>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t('zelleComponent.instructions.paymentAmount')}
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                    {metadata?.discount_applied && metadata?.original_amount ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 line-through">${metadata.original_amount.toFixed(2)} USD</div>
                        <div className="text-base sm:text-lg font-bold text-gray-900">${amount.toFixed(2)} USD</div>
                        <div className="text-xs text-green-600 font-medium">
                          🎉 {t('zelleComponent.instructions.youSaved', { amount: `$${(metadata.original_amount - amount).toFixed(2)}` })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-base sm:text-lg font-bold text-gray-900">${amount.toFixed(2)} USD</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-200 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-gray-600 text-xs font-bold">!</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-800 font-medium mb-1">{t('zelleComponent.instructions.important')}</p>
                    <p className="text-xs sm:text-sm text-gray-700">
                      <Trans 
                        i18nKey="zelleComponent.instructions.importantNote"
                        values={{ amount: `$${amount.toFixed(2)} USD`, email: 'pay@matriculausa.com' }}
                        components={{ strong: <strong className="break-all" /> }}
                      />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section - Integrado na primeira parte */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-sm sm:text-base text-gray-900 mb-2 sm:mb-3 flex items-center">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-600 flex-shrink-0" />
              <span>{t('zelleComponent.instructions.uploadTitle')}</span>
            </h4>
            
            {error && (
              <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                <div className="flex items-center">
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-red-700 break-words">{error}</span>
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
              {comprovantePreview ? (
                <div className="space-y-3 sm:space-y-4">
                  <img
                    src={comprovantePreview}
                    alt="Payment confirmation preview"
                    className="max-w-full h-32 sm:h-48 object-contain mx-auto rounded-lg border border-gray-200"
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 sm:space-x-2">
                    <button
                      onClick={() => {
                        setComprovanteFile(null);
                        setComprovantePreview(null);
                        setError(null);
                      }}
                      className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium"
                    >
                      {t('zelleComponent.instructions.remove')}
                    </button>
                    <span className="text-gray-500 hidden sm:inline">|</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium"
                    >
                      {t('zelleComponent.instructions.changeFile')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-2">
                    {t('zelleComponent.instructions.clickToUpload')}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-0">
                    {t('zelleComponent.instructions.fileFormats')}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 sm:mt-4 bg-blue-600 text-white px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('zelleComponent.instructions.selectFile')}
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !comprovanteFile || (isBlocked && blockedPendingPayment)}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('zelleComponent.instructions.processing') : (isBlocked && blockedPendingPayment) ? t('zelleComponent.instructions.paymentProcessing') : t('zelleComponent.instructions.submitPayment')}
          </button>

          {isLocalhost && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-bold text-amber-800 uppercase mb-2">Test Mode (Localhost Only)</p>
              <button
                onClick={handleMockSuccess}
                className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium text-xs uppercase"
              >
                Skip to Success (Mock)
              </button>
            </div>
          )}
        </div>
      )}

    </div>
    </>
  );
};
