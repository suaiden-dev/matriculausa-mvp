import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Dialog } from '@headlessui/react';
import { useAuth } from '../hooks/useAuth';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';
import { PreCheckoutModal } from './PreCheckoutModal';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { ZelleCheckout } from './ZelleCheckout';

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
  onSuccess,
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
  const [showI20ControlFeeModal, setShowI20ControlFeeModal] = useState(false);
  const [showPaymentMethodSelector, setShowPaymentMethodSelector] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, updateUserProfile } = useAuth();
  const { getFeeAmount } = useFeeConfig();

  const product = STRIPE_PRODUCTS[productId as keyof typeof STRIPE_PRODUCTS];
  
  if (!product) {
    console.error(`Product '${productId}' não encontrado em stripe-config.ts. Verifique se o nome está correto e padronizado.`);
    return <p className="text-red-500">Erro: Produto Stripe não encontrado. Contate o suporte.</p>;
  }

  const handlePreCheckoutSuccess = () => {
    console.log('🔍 [StripeCheckout] handlePreCheckoutSuccess chamado');
    if (!isAuthenticated) {
      console.error('🔍 [StripeCheckout] Usuário não autenticado');
      onError?.('You must be logged in to checkout');
      return;
    }
    // Este método será chamado pelo PreCheckoutModal após a verificação dos termos
    setShowPaymentMethodSelector(true);
  };

  const handleScholarshipFeeSuccess = () => {
    console.log('🔍 [StripeCheckout] handleScholarshipFeeSuccess chamado');
    if (!isAuthenticated) {
      console.error('🔍 [StripeCheckout] Usuário não autenticado');
      onError?.('You must be logged in to checkout');
      return;
    }
    // Para scholarship fee, ir direto para seleção de método de pagamento
    setShowPaymentMethodSelector(true);
  };

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

  const handlePreCheckoutProceed = async (discountCode?: string) => {
    console.log('🔍 [StripeCheckout] handlePreCheckoutProceed chamado com código:', discountCode);
    console.log('🔍 [StripeCheckout] Estado atual - showPaymentMethodSelector:', showPaymentMethodSelector);
    console.log('🔍 [StripeCheckout] Estado atual - selectedPaymentMethod:', selectedPaymentMethod);
    
    // Se há código de desconto, aplicar via edge function
    if (discountCode) {
      try {
        console.log('🔍 [StripeCheckout] Aplicando código de desconto via edge function...');
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          throw new Error('Usuário não autenticado');
        }

        // Aplicar código de desconto
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-referral-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ affiliate_code: discountCode }),
        });

        const result = await response.json();
        console.log('🔍 [StripeCheckout] Resultado da aplicação do código:', result);
        
        if (!result.success) {
          console.error('🔍 [StripeCheckout] ❌ Erro ao aplicar código:', result.error);
          onError?.(result.error || 'Erro ao aplicar código de desconto');
          return;
        }
        
        console.log('🔍 [StripeCheckout] ✅ Código aplicado com sucesso');
      } catch (error) {
        console.error('🔍 [StripeCheckout] ❌ Erro ao aplicar código:', error);
        onError?.(error instanceof Error ? error.message : 'Erro ao aplicar código de desconto');
        return;
      }
    } else {
      console.log('🔍 [StripeCheckout] Nenhum código de desconto fornecido');
    }

    // IMPORTANTE: Sempre mostrar o seletor de método de pagamento
    console.log('🔍 [StripeCheckout] 🎯 Mostrando seletor de método de pagamento...');
    setShowPaymentMethodSelector(true);
    console.log('🔍 [StripeCheckout] ✅ showPaymentMethodSelector definido como true');
    
    // NÃO continuar com checkout aqui - aguardar seleção do método
    console.log('🔍 [StripeCheckout] ⏳ Aguardando usuário selecionar método de pagamento...');
  };

  const handlePaymentMethodSelect = (method: string) => {
    console.log('🔍 [StripeCheckout] handlePaymentMethodSelect chamado com método:', method);
    console.log('🔍 [StripeCheckout] Estado anterior - selectedPaymentMethod:', selectedPaymentMethod);
    setSelectedPaymentMethod(method as 'stripe' | 'zelle');
    console.log('🔍 [StripeCheckout] ✅ selectedPaymentMethod definido como:', method);
    
    if (method === 'stripe') {
      // Para Stripe, continuar com o fluxo normal
      console.log('🔍 [StripeCheckout] 🚀 Iniciando checkout Stripe...');
      handleCheckout();
    } else if (method === 'zelle') {
      console.log('🔍 [StripeCheckout] �� Zelle selecionado, redirecionando para checkout...');
      // Redirecionar para a página de checkout do Zelle
      const params = new URLSearchParams({
        feeType: feeType,
        amount: feeType === 'selection_process' ? getFeeAmount('selection_process').toString() : 
                feeType === 'application_fee' ? getFeeAmount('application_fee').toString() :
                feeType === 'scholarship_fee' ? getFeeAmount('scholarship_fee').toString() :
                feeType === 'enrollment_fee' ? getFeeAmount('i20_control_fee').toString() : getFeeAmount('selection_process').toString(),
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
      }
      console.log('Getting session data...');
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session data:', sessionData);
      const token = sessionData.session?.access_token;
      console.log('Token:', token ? 'Found' : 'Not found');
      if (!token) {
        throw new Error('Usuário não autenticado. Token não encontrado.');
      }
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: product.priceId,
          success_url: (successUrl || `${window.location.origin}/checkout/success`).replace(/\?.*/, '') + '?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: cancelUrl || `${window.location.origin}/checkout/cancel`,
          mode: product.mode,
          payment_type: paymentType,
          fee_type: feeType,
          metadata: {
            ...metadata,
            application_id: applicationId,
            student_process_type: studentProcessType,
          },
          scholarships_ids: scholarshipsIds,
        }),
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
        onClick={checkActiveDiscount}
        disabled={disabled || loading}
        className={`${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Processing...' : buttonText}
      </button>

      {/* Pre-Checkout Modal para Selection Process e Application Fee */}
      {showPreCheckoutModal && (
        <PreCheckoutModal
          isOpen={showPreCheckoutModal}
          onClose={() => setShowPreCheckoutModal(false)}
          onProceedToCheckout={handlePreCheckoutSuccess}
          feeType={feeType}
          productName={product.name}
          productPrice={feeType === 'selection_process' ? getFeeAmount('selection_process') : getFeeAmount('application_fee')}
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
                  amount={getFeeAmount('scholarship_fee')}
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
                  amount={feeType === 'selection_process' ? getFeeAmount('selection_process') : feeType === 'scholarship_fee' ? getFeeAmount('scholarship_fee') : getFeeAmount('application_fee')}
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