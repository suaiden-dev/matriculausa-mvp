import React, { useState, useRef, useEffect } from 'react';
import { Upload, DollarSign, CheckCircle, AlertCircle, X, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { supabase } from '../lib/supabase';

interface ZelleCheckoutProps {
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee';
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
  const { user } = useAuth();
  const { isBlocked, pendingPayment: blockedPendingPayment, loading: paymentBlockedLoading } = usePaymentBlocked();
  
  console.log('🔍 [ZelleCheckout] Componente renderizado com props:', {
    feeType,
    amount,
    metadata,
    discount_applied: metadata?.discount_applied,
    original_amount: metadata?.original_amount,
    final_amount: metadata?.final_amount,
    isBlocked,
    hasPendingPayment: !!blockedPendingPayment,
    paymentBlockedLoading
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'instructions' | 'analyzing' | 'success' | 'under_review' | 'rejected'>('instructions');
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zellePaymentId, setZellePaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'analyzing' | 'approved' | 'under_review' | 'rejected'>('analyzing');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Usar usePaymentBlocked para verificar pagamentos pendentes
  useEffect(() => {
    // IMPORTANTE: Não executar este useEffect se já está em 'rejected' ou 'success' - esses são estados finais
    // Também não executar se há rejectionReason (significa que foi rejeitado)
    if (step === 'rejected' || step === 'success' || rejectionReason) {
      if (rejectionReason && step !== 'rejected') {
        // Se há rejectionReason mas step não é 'rejected', garantir que seja
        console.log('🔒 [ZelleCheckout] Há motivo de rejeição mas step não é rejected - corrigindo');
        setStep('rejected');
        setPaymentStatus('rejected');
        setIsProcessing(false);
        onProcessingChange?.(false);
      } else {
        console.log('🔒 [ZelleCheckout] Estado final (rejected/success) - não executando verificação de bloqueio', {
          step,
          hasRejectionReason: !!rejectionReason
        });
      }
      return;
    }

    console.log('🔍 [ZelleCheckout] Verificando estado de bloqueio:', {
      isBlocked,
      hasPendingPayment: !!blockedPendingPayment,
      paymentBlockedLoading,
      pendingPaymentFeeType: blockedPendingPayment?.fee_type,
      currentFeeType: feeType,
      currentStep: step
    });

    // Se está carregando, aguardar
    if (paymentBlockedLoading) {
      console.log('⏳ [ZelleCheckout] Aguardando verificação de pagamentos pendentes...');
      return;
    }

        // Se há pagamento pendente (de qualquer tipo ou do tipo específico)
        if (isBlocked && blockedPendingPayment) {
          console.log('🚫 [ZelleCheckout] Pagamento pendente detectado:', {
            id: blockedPendingPayment.id,
            status: blockedPendingPayment.status,
            fee_type: blockedPendingPayment.fee_type,
            amount: blockedPendingPayment.amount,
            created_at: blockedPendingPayment.created_at
          });

          // Se o pagamento pendente é do mesmo feeType OU se queremos bloquear qualquer pagamento pendente
          const isRelevantPayment = blockedPendingPayment.fee_type === feeType || true; // Bloquear para qualquer pagamento pendente
          
          if (isRelevantPayment) {
            setIsProcessing(true);
            setZellePaymentId(blockedPendingPayment.id);
            onProcessingChange?.(true);
            
            // Calcular tempo decorrido desde a criação do pagamento
            const createdAt = new Date(blockedPendingPayment.created_at);
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
            setTimeElapsed(elapsed);
            
            console.log('🔄 [ZelleCheckout] Configurando estado de processamento:', {
              status: blockedPendingPayment.status,
              elapsedSeconds: elapsed
            });
            
            // Buscar admin_notes se rejeitado
            if (blockedPendingPayment.status === 'rejected') {
              console.log('📋 [ZelleCheckout] Status: rejected → rejected');
              setStep('rejected');
              setPaymentStatus('rejected');
              setIsProcessing(false);
              onProcessingChange?.(false);
              // Garantir que o zellePaymentId está setado para o polling funcionar
              if (!zellePaymentId) {
                setZellePaymentId(blockedPendingPayment.id);
              }
              // Buscar motivo da rejeição
              supabase
                .from('zelle_payments')
                .select('admin_notes')
                .eq('id', blockedPendingPayment.id)
                .maybeSingle()
                .then(({ data }) => {
                  if (data?.admin_notes) {
                    setRejectionReason(data.admin_notes);
                  } else {
                    setRejectionReason('Payment was rejected by admin');
                  }
                });
            } else if (blockedPendingPayment.status === 'pending_verification') {
              console.log('📋 [ZelleCheckout] Status: pending_verification → under_review');
              setStep('under_review');
              setPaymentStatus('under_review');
              // Garantir que o zellePaymentId está setado para o polling funcionar
              if (!zellePaymentId) {
                setZellePaymentId(blockedPendingPayment.id);
              }
            } else if (blockedPendingPayment.status === 'pending') {
              console.log('📋 [ZelleCheckout] Status: pending → analyzing');
              setStep('analyzing');
              setPaymentStatus('analyzing');
              // Garantir que o zellePaymentId está setado para o polling funcionar
              if (!zellePaymentId) {
                setZellePaymentId(blockedPendingPayment.id);
              }
            } else if (blockedPendingPayment.status === 'approved') {
              console.log('✅ [ZelleCheckout] Status: approved → success');
              setStep('success');
              setPaymentStatus('approved');
              setIsProcessing(false);
              onProcessingChange?.(false);
              onSuccess?.();
            } else {
              console.log('⚠️ [ZelleCheckout] Status inesperado:', blockedPendingPayment.status, '→ under_review');
              setStep('under_review');
              setPaymentStatus('under_review');
              // Garantir que o zellePaymentId está setado para o polling funcionar
              if (!zellePaymentId) {
                setZellePaymentId(blockedPendingPayment.id);
              }
            }
            return;
          }
        }

    // Se não há pagamento pendente, mostrar formulário
    // IMPORTANTE: Não resetar se já está em 'rejected' ou 'success' - esses estados são finais
    // Também não resetar se há rejectionReason (significa que foi rejeitado)
    if (!isBlocked && !blockedPendingPayment) {
      // Verificação adicional: se há rejectionReason, significa que foi rejeitado - não resetar
      if (rejectionReason) {
        console.log('🔒 [ZelleCheckout] Há motivo de rejeição - mantendo estado rejected');
        // Garantir que o step está como 'rejected' se há rejectionReason
        if (step !== 'rejected') {
          console.log('🔒 [ZelleCheckout] Corrigindo step para rejected (há rejectionReason)');
          setStep('rejected');
          setPaymentStatus('rejected');
          setIsProcessing(false);
          onProcessingChange?.(false);
        }
        return;
      }
      // Só resetar se não está em 'rejected' ou 'success' E não há rejectionReason
      if (step !== 'rejected' && step !== 'success') {
        console.log('✅ [ZelleCheckout] Nenhum pagamento pendente - mostrando formulário');
        setStep('instructions');
        setIsProcessing(false);
        setZellePaymentId(null);
        onProcessingChange?.(false);
      }
    }
  }, [isBlocked, blockedPendingPayment, paymentBlockedLoading, feeType, onProcessingChange, step, rejectionReason]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPG, PNG, etc.)');
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
      setError('Please upload a screenshot of your payment confirmation');
      return false;
    }
    return true;
  };

  const uploadComprovante = async (): Promise<string | null> => {
    if (!comprovanteFile) return null;
    
    try {
      // Usar nome de arquivo organizado: timestamp_fee_type.extension
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileExt = comprovanteFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${timestamp}_${feeType}.${fileExt}`;
      const filePath = `zelle-payments/${user?.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('zelle_comprovantes')
        .upload(filePath, comprovanteFile);
      
      if (uploadError) {
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('zelle_comprovantes')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading comprovante:', error);
      throw new Error('Failed to upload payment confirmation');
    }
  };

  const sendToN8n = async (comprovanteUrl: string, paymentId: string) => {
    try {
      // Payload para o n8n (igual ao fluxo padrão do ZelleCheckoutPage)
      const webhookPayload = {
        user_id: user?.id,
        image_url: comprovanteUrl,
        value: amount.toString(),
        currency: 'USD',
        fee_type: feeType,
        timestamp: new Date().toISOString(),
        payment_id: paymentId, // Usar payment_id como no fluxo padrão
        scholarships_ids: scholarshipsIds || [],
        metadata: {
          ...metadata,
          payment_method: 'zelle',
          comprovante_uploaded_at: new Date().toISOString()
        }
      };

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

  // Polling contínuo para verificar status do pagamento
  // IMPORTANTE: Continuar polling mesmo quando está em 'under_review' para detectar rejeição/aprovação
  useEffect(() => {
    // IMPORTANTE: NÃO fazer polling se já está em 'rejected' ou 'success' - esses são estados finais
    // Também não fazer polling se há rejectionReason (significa que foi rejeitado)
    if (step === 'rejected' || step === 'success' || rejectionReason) {
      if (rejectionReason && step !== 'rejected') {
        // Se há rejectionReason mas step não é 'rejected', garantir que seja
        console.log('🔒 [ZelleCheckout] Há motivo de rejeição mas step não é rejected - corrigindo no polling');
        setStep('rejected');
        setPaymentStatus('rejected');
        setIsProcessing(false);
        onProcessingChange?.(false);
      } else {
        console.log('🔒 [ZelleCheckout] Estado final (rejected/success) - não iniciando polling');
      }
      return;
    }
    
    // Continuar polling se está processando OU se está em under_review/analyzing (aguardando decisão do admin)
    // NÃO parar o polling se está em under_review, mesmo que isProcessing seja false
    if (step !== 'under_review' && step !== 'analyzing' && !isProcessing) return;
    
    // Usar o ID do pagamento pendente do hook ou do estado local
    // Priorizar zellePaymentId (do estado local) sobre blockedPendingPayment
    const paymentIdToCheck = zellePaymentId || blockedPendingPayment?.id;
    if (!paymentIdToCheck || !user?.id) {
      console.log('⏳ [ZelleCheckout] Polling não iniciado - sem paymentId ou user:', { paymentIdToCheck, userId: user?.id });
      return;
    }
    
    console.log('🔄 [ZelleCheckout] Iniciando polling para paymentId:', paymentIdToCheck, 'step:', step);
    
    const interval = setInterval(async () => {
      try {
        // Primeiro tentar buscar pelo ID específico (mais preciso)
        let payment = null;
        let error = null;
        
        if (paymentIdToCheck) {
          const { data, error: fetchError } = await supabase
            .from('zelle_payments')
            .select('id, status, admin_notes')
            .eq('id', paymentIdToCheck)
            .maybeSingle();
          
          payment = data;
          error = fetchError;
        }
        
        // Se não encontrou pelo ID, buscar o mais recente do usuário para este fee_type
        if (!payment && !error) {
          const { data: recentPayment, error: recentError } = await supabase
            .from('zelle_payments')
            .select('id, status, admin_notes')
            .eq('user_id', user.id)
            .eq('fee_type', feeType)
            .in('status', ['pending', 'pending_verification', 'approved', 'rejected'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          payment = recentPayment;
          error = recentError;
        }
        
        if (payment && !error) {
          console.log('🔍 [ZelleCheckout] Status do pagamento:', payment.status, 'admin_notes:', payment.admin_notes, 'step atual:', step);
          
          // Verificar status
          if (payment.status === 'approved') {
            console.log('✅ [ZelleCheckout] Pagamento aprovado - parando polling e avançando');
            clearInterval(interval);
            setIsProcessing(false);
            onProcessingChange?.(false);
            setPaymentStatus('approved');
            setStep('success');
            // Avançar para próxima step automaticamente
            onSuccess?.();
            return;
          } else if (payment.status === 'rejected') {
            console.log('❌ [ZelleCheckout] Pagamento rejeitado - parando polling e mostrando rejeição');
            clearInterval(interval);
            setIsProcessing(false);
            onProcessingChange?.(false);
            setPaymentStatus('rejected');
            setStep('rejected');
            // Armazenar motivo da rejeição
            const reason = payment.admin_notes || 'Payment was rejected by admin';
            setRejectionReason(reason);
            // Garantir que o zellePaymentId está setado para manter o estado
            setZellePaymentId(payment.id);
            console.log('❌ [ZelleCheckout] Pagamento rejeitado. Motivo:', reason);
            console.log('❌ [ZelleCheckout] Estado atualizado para rejected, zellePaymentId:', payment.id);
            console.log('❌ [ZelleCheckout] rejectionReason setado:', reason);
            // IMPORTANTE: Não fazer return aqui - deixar o useEffect terminar normalmente
            // O return abaixo vai garantir que o polling não reinicie
            return;
          } else if (payment.status === 'pending_verification') {
            // Continuar processando - atualizar estado se necessário
            if (step !== 'under_review') {
              console.log('📋 [ZelleCheckout] Mudando para under_review');
              setPaymentStatus('under_review');
              setStep('under_review');
              setIsProcessing(true);
              onProcessingChange?.(true);
            }
          } else if (payment.status === 'pending') {
            // Ainda em análise inicial
            if (step !== 'analyzing') {
              console.log('📋 [ZelleCheckout] Mudando para analyzing');
              setPaymentStatus('analyzing');
              setStep('analyzing');
              setIsProcessing(true);
              onProcessingChange?.(true);
            }
          }
        } else {
          console.log('⏳ [ZelleCheckout] Pagamento não encontrado ainda, continuando polling...');
        }
      } catch (error) {
        // Pagamento ainda não foi criado ou erro na busca, continuar verificando
        console.log('⏳ [ZelleCheckout] Erro no polling, continuando...', error);
      }
    }, 3000); // Verificar a cada 3 segundos
    
    return () => {
      console.log('🛑 [ZelleCheckout] Parando polling');
      clearInterval(interval);
    };
  }, [isProcessing, zellePaymentId, blockedPendingPayment?.id, user?.id, feeType, onSuccess, onProcessingChange, step, rejectionReason]);

  const handleSubmit = async () => {
    // BLOQUEIO: Não permitir submit se há pagamento pendente
    if (isBlocked && blockedPendingPayment) {
      console.log('🚫 [ZelleCheckout] Tentativa de submit bloqueada - há pagamento pendente');
      setError('You already have a payment being processed. Please wait for it to be reviewed.');
      return;
    }

    if (!validatePaymentDetails()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Upload comprovante
      const comprovanteUrl = await uploadComprovante();
      if (!comprovanteUrl) {
        throw new Error('Failed to upload payment confirmation');
      }
      
      // Gerar ID único para o pagamento (será usado pelo n8n para criar o registro)
      console.log('💾 [ZelleCheckout] Gerando ID único para o pagamento...');
      const realPaymentId = crypto.randomUUID();
      console.log('✅ [ZelleCheckout] ID gerado:', realPaymentId);
      setZellePaymentId(realPaymentId);
      
      // Construir imageUrl igual ao fluxo padrão (URL completa do storage)
      const imageUrl = comprovanteUrl; // comprovanteUrl já é a URL pública completa
      
      // Enviar para n8n e aguardar resposta (igual ao fluxo padrão)
      const { tempPaymentId, n8nResponse } = await sendToN8n(comprovanteUrl, realPaymentId);
      
      // Iniciar processamento
      setIsProcessing(true);
      setTimeElapsed(0);
      onProcessingChange?.(true);
      
      // Processar resposta do n8n (igual ao fluxo padrão)
      if (n8nResponse?.response) {
        const response = n8nResponse.response.toLowerCase();
        const isPositiveResponse = response === 'the proof of payment is valid.';
        
        if (isPositiveResponse) {
          setStep('analyzing');
          setPaymentStatus('analyzing');
        } else {
          setStep('under_review');
          setPaymentStatus('under_review');
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
              updated_at: new Date().toISOString()
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
      }
      
      setLoading(false);
      
    } catch (error: any) {
      setError(error.message || 'An error occurred while processing your payment');
      onError?.(error.message);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setComprovanteFile(null);
    setComprovantePreview(null);
    setError(null);
    setStep('instructions');
  };

  if (step === 'analyzing') {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 text-center ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg sm:text-xl font-semibold text-blue-800 mb-2">
          Analyzing Payment...
        </h3>
        <p className="text-sm sm:text-base text-blue-700 mb-2">
          Your payment confirmation is being automatically validated. Please wait...
        </p>
      </div>
    );
  }

  if (step === 'under_review') {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6 ${className}`}>
        <div className="text-center mb-4 sm:mb-6">
          <Clock className="w-16 h-16 sm:w-20 sm:h-20 text-amber-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg sm:text-xl font-semibold text-amber-800 mb-2">
            Processing Payment
          </h3>
          <p className="text-sm sm:text-base text-amber-700 mb-4">
            Your payment proof requires additional verification. Our team will review it within 24 hours.
          </p>
        </div>


        {/* Payment Details */}
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-4">
          <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Payment Details:</h4>
          <div className="space-y-2 text-xs sm:text-sm text-gray-600">
            {metadata?.discount_applied && metadata?.original_amount ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Original Amount:</span>
                  <span className="font-medium">${metadata.original_amount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount Applied:</span>
                  <span className="font-medium">-$50.00 USD</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">Final Amount:</span>
                  <span className="font-bold text-green-700">${amount.toFixed(2)} USD</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="font-semibold">Amount:</span>
                <span className="font-bold text-gray-900">${amount.toFixed(2)} USD</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span>Fee Type:</span>
              <span className="font-medium">{feeType.replace('_', ' ')}</span>
            </div>
            {(zellePaymentId || blockedPendingPayment?.id) && (
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span>Payment ID:</span>
                <span className="font-mono text-xs">{zellePaymentId || blockedPendingPayment?.id}</span>
              </div>
            )}
            {blockedPendingPayment?.created_at && (
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span>Submitted:</span>
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
                Payment Under Review
              </p>
              <p className="text-xs sm:text-sm text-blue-700">
                You will be notified once the review is complete. Please do not submit another payment.
              </p>
            </div>
          </div>
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
            Payment Rejected
          </h3>
          <p className="text-sm sm:text-base text-red-700 mb-4">
            Your payment proof was not approved. Please review the reason below and upload a new payment confirmation.
          </p>
        </div>

        {/* Rejection Reason - Destaque maior */}
        {rejectionReason ? (
          <div className="bg-white rounded-lg border-2 border-red-300 p-4 sm:p-5 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">Rejection Reason:</h4>
                <p className="text-sm sm:text-base text-gray-800 bg-red-50 p-3 rounded-lg border border-red-200 font-medium">
                  {rejectionReason}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border-2 border-red-300 p-4 sm:p-5 mb-4">
            <p className="text-sm sm:text-base text-gray-700">
              Payment was rejected by admin. Please upload a new payment confirmation.
            </p>
          </div>
        )}

        {/* Payment Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4">
          <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Payment Details:</h4>
          <div className="space-y-2 text-xs sm:text-sm text-gray-600">
            {metadata?.discount_applied && metadata?.original_amount ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Original Amount:</span>
                  <span className="font-medium">${metadata.original_amount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount Applied:</span>
                  <span className="font-medium">-$50.00 USD</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">Final Amount:</span>
                  <span className="font-bold text-green-700">${amount.toFixed(2)} USD</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="font-semibold">Amount:</span>
                <span className="font-bold text-gray-900">${amount.toFixed(2)} USD</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span>Fee Type:</span>
              <span className="font-medium">{feeType.replace('_', ' ')}</span>
            </div>
            {zellePaymentId && (
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span>Payment ID:</span>
                <span className="font-mono text-xs">{zellePaymentId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button - Destaque */}
        <div className="space-y-3">
          <button
            onClick={() => {
              // Resetar formulário para permitir novo upload
              setComprovanteFile(null);
              setComprovantePreview(null);
              setError(null);
              setStep('instructions');
              setRejectionReason(null);
              setIsProcessing(false);
              onProcessingChange?.(false);
              setZellePaymentId(null);
            }}
            className="w-full bg-red-600 text-white py-3 sm:py-4 px-6 rounded-lg hover:bg-red-700 transition-colors font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Upload New Payment Proof
          </button>
          <p className="text-xs sm:text-sm text-center text-gray-600">
            Click the button above to upload a new payment confirmation screenshot
          </p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 text-center ${className}`}>
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-2">
          Payment Approved Successfully!
        </h3>
        <p className="text-sm sm:text-base text-green-700 mb-4">
          Your Zelle payment has been processed and approved. 
          You can now proceed with the next steps.
        </p>
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 text-left">
          <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Payment Details:</h4>
          <div className="space-y-1 text-xs sm:text-sm text-gray-600">
            {metadata?.discount_applied && metadata?.original_amount ? (
              <div className="space-y-1">
                <div><strong>Original Amount:</strong> ${metadata.original_amount.toFixed(2)} USD</div>
                <div><strong>Discount Applied:</strong> -$50.00 USD</div>
                <div><strong>Final Amount:</strong> <span className="font-bold text-green-700">${amount.toFixed(2)} USD</span></div>
                <div className="text-green-600 font-medium">🎉 You saved $50.00!</div>
              </div>
            ) : (
              <div><strong>Amount:</strong> ${amount.toFixed(2)} USD</div>
            )}
            <div><strong>Fee Type:</strong> {feeType.replace('_', ' ')}</div>
            {zellePaymentId && (
              <div><strong>Payment ID:</strong> {zellePaymentId}</div>
            )}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
          <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">What happens next?</h4>
          <div className="text-xs sm:text-sm text-blue-700 space-y-1">
            <div>✅ Payment confirmation uploaded</div>
            <div>✅ Payment approved successfully</div>
            <div>🚀 Proceeding to next step automatically</div>
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
        <p className="text-sm text-gray-600">Checking payment status...</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 sm:p-6 ${className}`}>
      {/* IMPORTANTE: Só mostrar instruções se NÃO estiver processando e NÃO tiver pagamento pendente */}
      {/* Se há pagamento pendente, os estados analyzing/under_review já foram renderizados acima */}
      {step === 'instructions' && !isProcessing && !isBlocked && !blockedPendingPayment && (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              Zelle Payment Instructions
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Follow these steps to complete your payment via Zelle
            </p>
          </div>

          {/* Zelle Payment Information - Estilo igual ao ZelleCheckoutPage */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Zelle Payment Details</h2>
                <p className="text-xs sm:text-sm text-gray-600">Send payment to the recipient below</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Recipient Email
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                    <code className="text-xs sm:text-sm font-mono text-gray-900 break-all">info@thefutureofenglish.com</code>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Payment Amount
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                    {metadata?.discount_applied && metadata?.original_amount ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 line-through">${metadata.original_amount.toFixed(2)} USD</div>
                        <div className="text-base sm:text-lg font-bold text-gray-900">${amount.toFixed(2)} USD</div>
                        <div className="text-xs text-green-600 font-medium">🎉 You saved $50.00!</div>
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
                    <p className="text-xs sm:text-sm text-gray-800 font-medium mb-1">Important</p>
                    <p className="text-xs sm:text-sm text-gray-700">
                      Make sure to send the exact amount of <strong>${amount.toFixed(2)} USD</strong> to <strong className="break-all">info@thefutureofenglish.com</strong> via Zelle. Any discrepancy will delay your payment processing.
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
              <span>Upload Payment Confirmation Screenshot *</span>
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
                      Remove
                    </button>
                    <span className="text-gray-500 hidden sm:inline">|</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium"
                    >
                      Change File
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-0">
                    PNG, JPG up to 5MB
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 sm:mt-4 bg-blue-600 text-white px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Select File
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
            {loading ? 'Processing...' : (isBlocked && blockedPendingPayment) ? 'Payment Processing...' : 'Submit Payment'}
          </button>
        </div>
      )}

    </div>
  );
};
