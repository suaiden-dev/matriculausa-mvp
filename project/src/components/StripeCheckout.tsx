import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useDynamicFees } from '../hooks/useDynamicFees';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';
import { PreCheckoutModal } from './PreCheckoutModal';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface StripeCheckoutProps {
  productId: keyof typeof STRIPE_PRODUCTS;
  buttonText?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  paymentType?: string;
  feeType: 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'selection_process' | 'i20_control_fee';
  scholarshipsIds?: string[];
  successUrl?: string;
  cancelUrl?: string;
  disabled?: boolean;
  metadata?: { [key: string]: any };
  studentProcessType?: string | null;
  beforeCheckout?: () => Promise<{ applicationId: string } | undefined>;
}

export const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  productId,
  buttonText = 'Checkout',
  className = '',
  // onSuccess,
  onError,
  paymentType,
  feeType,
  scholarshipsIds = [],
  successUrl,
  cancelUrl,
  disabled = false,
  metadata = {},
  studentProcessType,
  beforeCheckout,
}) => {
  const [showPreCheckoutModal, setShowPreCheckoutModal] = useState(false);
  const [showScholarshipFeeModal, setShowScholarshipFeeModal] = useState(false);

  const [showI20ControlFeeModal] = useState(false);

  // Hide floating elements when any modal is open
  useEffect(() => {
    if (showPreCheckoutModal || showScholarshipFeeModal || showI20ControlFeeModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showPreCheckoutModal, showScholarshipFeeModal, showI20ControlFeeModal]);
  const [showPaymentMethodSelector, setShowPaymentMethodSelector] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();
  const { isAuthenticated, user, userProfile } = useAuth();
  const { getFeeAmount, userFeeOverrides } = useFeeConfig(user?.id);
  const { selectionProcessFee, scholarshipFee, i20ControlFee, hasSellerPackage } = useDynamicFees();
  const { isBlocked, pendingPayment, loading: paymentBlockedLoading } = usePaymentBlocked();

  const product = STRIPE_PRODUCTS[productId as keyof typeof STRIPE_PRODUCTS];
  
  if (!product) {
    console.error(`Product '${productId}' não encontrado em stripe-config.ts. Verifique se o nome está correto e padronizado.`);
    return <p className="text-red-500">Erro: Produto Stripe não encontrado. Contate o suporte.</p>;
  }

  const handlePreCheckoutSuccess = (finalAmount?: number) => {
    console.log('🔍 [StripeCheckout] handlePreCheckoutSuccess chamado');
    if (!isAuthenticated) {
      console.error('🔍 [StripeCheckout] Usuário não autenticado');
      onError?.('You must be logged in to checkout');
      return;
    }
    // Este método será chamado pelo PreCheckoutModal após a verificação dos termos
    // Guardar valor final selecionado (se fornecido) para PaymentMethodSelector
    if (typeof finalAmount === 'number') {
      ;(window as any).__checkout_final_amount = finalAmount;
    }
    setShowPaymentMethodSelector(true);
  };

  // Removido fluxo alternativo não utilizado para Scholarship; modal já chama seleção

  const checkActiveDiscount = async () => {
    console.log('🔍 [StripeCheckout] Verificando desconto ativo...');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        console.log('🔍 [StripeCheckout] Sem token, mostrando modal');
        if (feeType === 'scholarship_fee') {
          setShowScholarshipFeeModal(true);
        } else {
          setShowPreCheckoutModal(true);
        }
        return;
      }

      // Verificar se já há desconto ativo usando função RPC diretamente
      console.log('🔍 [StripeCheckout] Chamando get_user_active_discount via RPC...');
      const { data: result, error } = await supabase.rpc('get_user_active_discount', {
        user_id_param: sessionData.session?.user?.id
      });

      if (error) {
        console.error('🔍 [StripeCheckout] Erro na função RPC:', error);
        if (feeType === 'scholarship_fee') {
          setShowScholarshipFeeModal(true);
        } else {
          setShowPreCheckoutModal(true);
        }
        return;
      }

      console.log('🔍 [StripeCheckout] Resultado da verificação:', result);
      
      // CORREÇÃO: Para selection_process fee, SEMPRE mostrar o modal de verificação
      // Isso garante consistência no comportamento
      if (feeType === 'selection_process') {
        console.log('🔍 [StripeCheckout] 🎯 Selection Process Fee: SEMPRE mostrar modal de verificação');
        setShowPreCheckoutModal(true);
      } else if (feeType === 'scholarship_fee') {
        console.log('🔍 [StripeCheckout] 🎯 Scholarship Fee: mostrando modal específico');
        setShowScholarshipFeeModal(true);
      } else {
        console.log('🔍 [StripeCheckout] 🎯 Outros tipos: mostrando modal padrão');
        setShowPreCheckoutModal(true);
      }
      
      // Se há desconto ativo, vamos armazenar para usar depois
      if (result && result.has_discount) {
        console.log('🔍 [StripeCheckout] ✅ Desconto ativo encontrado, será aplicado automaticamente');
        // O desconto será aplicado automaticamente no handlePreCheckoutProceed
      } else {
        console.log('🔍 [StripeCheckout] ❌ Sem desconto ativo, usuário pode inserir código');
      }
    } catch (error) {
      console.error('🔍 [StripeCheckout] Erro ao verificar desconto:', error);
      // Em caso de erro, mostrar modal por segurança
      if (feeType === 'scholarship_fee') {
        setShowScholarshipFeeModal(true);
      } else {
        setShowPreCheckoutModal(true);
      }
    }
  };

  // Removido fluxo legado de aplicação de código aqui; agora o código é tratado no PreCheckoutModal

  const handlePaymentMethodSelect = async (method: string) => {
    console.log('🔍 [StripeCheckout] handlePaymentMethodSelect chamado com método:', method);
    console.log('🔍 [StripeCheckout] Estado anterior - selectedPaymentMethod:', selectedPaymentMethod);
    setSelectedPaymentMethod(method as 'stripe' | 'zelle');
    console.log('🔍 [StripeCheckout] ✅ selectedPaymentMethod definido como:', method);
    
    // Aguarda um frame para permitir o paint do overlay de loading do selector
    await new Promise<void>((resolve) => {
      if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
        window.requestAnimationFrame(() => resolve());
      } else {
        setTimeout(() => resolve(), 0);
      }
    });
    
    if (method === 'stripe') {
      // Para Stripe, continuar com o fluxo normal
      console.log('🔍 [StripeCheckout] 🚀 Iniciando checkout Stripe...');
      handleCheckout();
    } else if (method === 'zelle') {
      console.log('🔍 [StripeCheckout]  Zelle selecionado, redirecionando para checkout...');
      // Redirecionar para a página de checkout do Zelle com valores dinâmicos
      const getDynamicAmount = () => {
        if (feeType === 'selection_process') {
          // Usar valores do useDynamicFees que já incluem dependentes
          return hasSellerPackage ? selectionProcessFee.replace('$', '') : (() => {
            const hasOverride = userFeeOverrides?.selection_process_fee !== undefined;
            if (hasOverride) {
              // Se há override, usar apenas o valor do override (já inclui dependentes se necessário)
              return getFeeAmount('selection_process').toString();
            } else {
              // Se não há override, aplicar lógica de dependentes aos valores padrão
              const dependents = Number(userProfile?.dependents) || 0;
              const dependentCost = dependents * 150; // $150 por dependente apenas no Selection Process
              return (getFeeAmount('selection_process') + dependentCost).toString();
            }
          })();
        } else if (feeType === 'application_fee') {
          return getFeeAmount('application_fee').toString(); // Application Fee sempre usa valor da universidade
        } else if (feeType === 'scholarship_fee') {
          return hasSellerPackage ? scholarshipFee.replace('$', '') : getFeeAmount('scholarship_fee').toString();
        } else if (feeType === 'enrollment_fee' || feeType === 'i20_control_fee') {
          // Usar valores do useDynamicFees que já incluem dependentes
          return hasSellerPackage ? i20ControlFee.replace('$', '') : (() => {
            // Novo modelo: I-20 não recebe adicionais por dependentes
            return (getFeeAmount('i20_control_fee')).toString();
          })();
        }
        return getFeeAmount('selection_process').toString();
      };

      const params = new URLSearchParams({
        feeType: feeType,
        amount: getDynamicAmount(),
        scholarshipsIds: scholarshipsIds?.join(',') || ''
      });
      window.location.href = `/checkout/zelle?${params.toString()}`;
    }
    // Para Zelle, o usuário será redirecionado para a página de checkout
  };

  useEffect(() => {
    console.log('🔍 [StripeCheckout] useEffect - Estados atualizados:', {
      showPreCheckoutModal,
      showPaymentMethodSelector,
      selectedPaymentMethod,
      loading
    });
  }, [showPreCheckoutModal, showPaymentMethodSelector, selectedPaymentMethod, loading]);

  useEffect(() => {
    if (showPaymentMethodSelector) {
      console.log('🔍 [StripeCheckout] 🎯 PaymentMethodSelector deve estar visível agora!');
    }
  }, [showPaymentMethodSelector]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      let applicationId = metadata?.application_id;
      if (beforeCheckout) {
        const result = await beforeCheckout();
        if (result?.applicationId) {
          applicationId = result.applicationId;
        } else {
          setLoading(false);
          setError('Não foi possível criar a aplicação. Tente novamente.');
          return;
        }
      }
      let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      if (feeType === 'selection_process') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
      } else if (feeType === 'application_fee') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-application-fee`;
      } else if (feeType === 'scholarship_fee') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-scholarship-fee`;
      } else if (feeType === 'i20_control_fee') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-i20-control-fee`;
      }
      console.log('Getting session data...');
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session data:', sessionData);
      const token = sessionData.session?.access_token;
      console.log('Token:', token ? 'Found' : 'Not found');
      if (!token) {
        throw new Error('Usuário não autenticado. Token não encontrado.');
      }
      // Obter valor final (com dependentes se aplicável)
      let finalAmount: number;
      
      // Se há um valor do PreCheckoutModal, usar ele
      if ((window as any).__checkout_final_amount && typeof (window as any).__checkout_final_amount === 'number') {
        finalAmount = (window as any).__checkout_final_amount;
      } else {
        // Calcular valor baseado no feeType
        if (feeType === 'selection_process') {
          // Usar valores do useDynamicFees que já incluem dependentes
          finalAmount = hasSellerPackage ? parseFloat(selectionProcessFee.replace('$', '')) : (() => {
            const hasOverride = userFeeOverrides?.selection_process_fee !== undefined;
            if (hasOverride) {
              // Se há override, usar apenas o valor do override (já inclui dependentes se necessário)
              return getFeeAmount('selection_process');
            } else {
              // Se não há override, aplicar lógica de dependentes aos valores padrão
              const dependents = Number(userProfile?.dependents) || 0;
              const dependentCost = dependents * 150; // $150 por dependente apenas no Selection Process
              return getFeeAmount('selection_process') + dependentCost;
            }
          })();
        } else if (feeType === 'i20_control_fee') {
          // Usar valores do useDynamicFees que já incluem dependentes
          finalAmount = hasSellerPackage ? parseFloat(i20ControlFee.replace('$', '')) : (() => {
            // Novo modelo: I-20 não recebe adicionais por dependentes
            return getFeeAmount('i20_control_fee');
          })();
        } else if (feeType === 'scholarship_fee') {
          finalAmount = hasSellerPackage ? parseFloat(scholarshipFee.replace('$', '')) : getFeeAmount('scholarship_fee');
        } else {
          finalAmount = getFeeAmount('application_fee');
        }
      }

      const requestBody = {
        price_id: product.priceId,
        amount: finalAmount, // Incluir valor final calculado
        success_url: (successUrl || `${window.location.origin}/checkout/success`).replace(/\?.*/, '') + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl || `${window.location.origin}/checkout/cancel`,
        mode: product.mode,
        payment_type: paymentType,
        fee_type: feeType,
        metadata: {
          ...metadata,
          application_id: applicationId,
          student_process_type: studentProcessType,
          final_amount: finalAmount, // Incluir no metadata também
        },
        scholarships_ids: scholarshipsIds,
      };


      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const { session_url } = await response.json();
      if (session_url) {
        window.location.href = session_url;
      } else {
        throw new Error('URL da sessão não encontrada na resposta');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setError(error.message || 'Erro ao processar checkout');
      onError?.(error.message || 'Erro ao processar checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={isBlocked && pendingPayment ? undefined : checkActiveDiscount}
        disabled={disabled || loading || paymentBlockedLoading || Boolean(isBlocked && pendingPayment)}
        className={`${className} ${(loading || paymentBlockedLoading || (isBlocked && pendingPayment)) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? t('zelleCheckout.processing') : 
         paymentBlockedLoading ? 'Checking...' : 
         (isBlocked && pendingPayment) ? t('zelleCheckout.processing') : 
         buttonText}
      </button>

      {/* Pre-Checkout Modal para Selection Process e Application Fee */}
      {showPreCheckoutModal && (
        <PreCheckoutModal
          isOpen={showPreCheckoutModal}
          onClose={() => setShowPreCheckoutModal(false)}
          onProceedToCheckout={(amount) => handlePreCheckoutSuccess(amount)}
          feeType={feeType === 'i20_control_fee' ? 'application_fee' : feeType}
          productName={product.name}
          productPrice={(feeType === 'selection_process'
            ? (() => {
                const hasOverride = userFeeOverrides?.selection_process_fee !== undefined;
                if (hasOverride) {
                  // Se há override, usar apenas o valor do override (já inclui dependentes se necessário)
                  return getFeeAmount('selection_process');
                } else {
                  // Se não há override, aplicar lógica de dependentes aos valores padrão
                  const dependents = Number(userProfile?.dependents) || 0;
                  const dependentCost = dependents * 150; // $150 por dependente no Selection Process
                  return getFeeAmount('selection_process') + dependentCost;
                }
              })()
            : getFeeAmount('application_fee'))}
        />
      )}

      {/* Modal Simplificado para Scholarship Fee */}
      {showScholarshipFeeModal && (
        <Dialog
          open={showScholarshipFeeModal}
          onClose={() => setShowScholarshipFeeModal(false)}
          className="relative z-50"
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" aria-hidden="true" />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-30">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
                <button
                  onClick={() => setShowScholarshipFeeModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                  title="Fechar modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <Dialog.Title className="text-xl font-bold">
                      Scholarship Fee Payment
                    </Dialog.Title>
                    <p className="text-blue-100">
                      Choose your payment method
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <PaymentMethodSelector
                  selectedMethod={selectedPaymentMethod}
                  onMethodSelect={handlePaymentMethodSelect}
                  feeType={feeType}
                  amount={(window as any).__checkout_final_amount || getFeeAmount('scholarship_fee')}
                />
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Seleção de Método de Pagamento */}
      {showPaymentMethodSelector && !selectedPaymentMethod && (
        <Dialog
          open={showPaymentMethodSelector}
          onClose={() => {
            console.log('🔍 [StripeCheckout] Fechando seletor de método de pagamento');
            setShowPaymentMethodSelector(false);
            setSelectedPaymentMethod(null);
          }}
          className="relative z-50"
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" aria-hidden="true" />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-30">
            <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
                <button
                  onClick={() => {
                    console.log('🔍 [StripeCheckout] Fechando seletor de método de pagamento');
                    setShowPaymentMethodSelector(false);
                    setSelectedPaymentMethod(null);
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                  title="Fechar modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <Dialog.Title className="text-2xl font-bold">
                      Choose Payment Method
                    </Dialog.Title>
                    <p className="text-blue-100">
                      Select how you would like to pay your fee
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <PaymentMethodSelector
                  selectedMethod={selectedPaymentMethod}
                  onMethodSelect={handlePaymentMethodSelect}
                  feeType={feeType}
                  amount={(window as any).__checkout_final_amount || (feeType === 'selection_process'
                    ? (() => {
                        const hasOverride = userFeeOverrides?.selection_process_fee !== undefined;
                        if (hasOverride) {
                          // Se há override, usar apenas o valor do override (já inclui dependentes se necessário)
                          return getFeeAmount('selection_process');
                        } else {
                          // Se não há override, aplicar lógica de dependentes aos valores padrão
                          const dependents = Number(userProfile?.dependents) || 0;
                          const dependentCost = dependents * 150; // $150 por dependente no Selection Process
                          return getFeeAmount('selection_process') + dependentCost;
                        }
                      })()
                    : feeType === 'scholarship_fee'
                    ? getFeeAmount('scholarship_fee')
                    : feeType === 'i20_control_fee'
                    ? getFeeAmount('i20_control_fee') // I-20 não tem dependentes
                    : getFeeAmount('application_fee'))}
                />
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Checkout Zelle - Removido, agora redireciona para página separada */}

      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </>
  );
};