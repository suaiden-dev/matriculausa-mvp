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
import { PaymentMethodSelectorDrawer } from './PaymentMethodSelectorDrawer';
import { ProfileRequiredModal } from './ProfileRequiredModal';
import { getTranslatedProductNameByProductId } from '../lib/productNameUtils';
import { getExchangeRate } from '../utils/stripeFeeCalculator';

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
  exchangeRate?: number; // Taxa de câmbio para PIX (opcional)
}

export const StripeCheckout = React.forwardRef<HTMLButtonElement, StripeCheckoutProps>(({
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
  exchangeRate,
}, ref) => {
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [profileErrorType, setProfileErrorType] = useState<'cpf_missing' | 'profile_incomplete' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();
  const { isAuthenticated, user, userProfile } = useAuth();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const { selectionProcessFee, scholarshipFee, i20ControlFee, hasSellerPackage } = useDynamicFees();
  const { isBlocked, pendingPayment, loading: paymentBlockedLoading } = usePaymentBlocked();

  const product = STRIPE_PRODUCTS[productId as keyof typeof STRIPE_PRODUCTS];

  // Helper: Application Fee final (base + $100 por dependente se legacy)
  const getFinalApplicationFee = (): number => {
    const base = Number(getFeeAmount('application_fee'));
    const deps = Number(userProfile?.dependents) || 0;
    const systemType = userProfile?.system_type || 'legacy';
    const final = systemType === 'legacy' && deps > 0 ? base + deps * 100 : base;
    return final;
  };

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
      ; (window as any).__checkout_final_amount = finalAmount;
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

  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | undefined>(undefined);

  const handlePaymentMethodSelect = async (method: string, exchangeRate?: number) => {
    console.log('🔍 [StripeCheckout] handlePaymentMethodSelect chamado com método:', method, 'exchangeRate:', exchangeRate);
    console.log('🔍 [StripeCheckout] Estado anterior - selectedPaymentMethod:', selectedPaymentMethod);
    setSelectedPaymentMethod(method as 'stripe' | 'zelle' | 'pix' | 'parcelow');

    // Salvar taxa de câmbio se for PIX
    if (method === 'pix' && exchangeRate) {
      setCurrentExchangeRate(exchangeRate);
      console.log('[PIX] Taxa de câmbio recebida do PaymentMethodSelector:', exchangeRate);
    }

    console.log('🔍 [StripeCheckout] ✅ selectedPaymentMethod definido como:', method);

    // Salvar método de pagamento no localStorage para PIX
    if (method === 'pix') {
      localStorage.setItem('last_payment_method', 'pix');
      console.log('[PIX] Método de pagamento salvo no localStorage');
    }

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
      handleCheckout('stripe');
    } else if (method === 'pix') {
      // Para PIX, usar mesma edge function mas com parâmetro PIX
      console.log('🔍 [StripeCheckout] 🇧🇷 PIX selecionado, iniciando checkout PIX...');
      console.log('[PIX] 🎯 PIX selecionado no frontend');
      console.log('[PIX] 💰 Valor USD:', (window as any).__checkout_final_amount || 'calculando...');
      console.log('[PIX] 🔗 URL atual:', window.location.href);
      // Passar taxa de câmbio diretamente para evitar problema de timing com estado
      console.log('[PIX] 🚀 Chamando handleCheckout com método PIX e taxa de câmbio:', exchangeRate);
      handleCheckout('pix', exchangeRate);
    } else if (method === 'zelle') {
      console.log('🔍 [StripeCheckout]  Zelle selecionado, redirecionando para checkout...');
      // ✅ CORREÇÃO: Priorizar valor com desconto do PreCheckoutModal se disponível
      const getDynamicAmount = () => {
        // Se há valor final salvo no window (vem do PreCheckoutModal com desconto aplicado), usar esse valor
        const finalAmountFromWindow = (window as any).__checkout_final_amount;
        if (typeof finalAmountFromWindow === 'number' && !Number.isNaN(finalAmountFromWindow)) {
          console.log('🔍 [StripeCheckout] ✅ Usando valor com desconto do PreCheckoutModal:', finalAmountFromWindow);
          return finalAmountFromWindow.toString();
        }

        // Caso contrário, calcular valor base
        if (feeType === 'selection_process') {
          // ✅ CORREÇÃO: Usar sempre os valores do useDynamicFees que já consideram o system_type
          if (!selectionProcessFee) {
            throw new Error('Selection Process Fee ainda está carregando. Aguarde um momento e tente novamente.');
          }
          return selectionProcessFee.replace('$', '');
        } else if (feeType === 'application_fee') {
          return getFinalApplicationFee().toString();
        } else if (feeType === 'scholarship_fee') {
          // ✅ CORREÇÃO: Usar sempre os valores do useDynamicFees que já consideram o system_type
          if (!scholarshipFee) {
            throw new Error('Scholarship Fee ainda está carregando. Aguarde um momento e tente novamente.');
          }
          return scholarshipFee.replace('$', '');
        } else if (feeType === 'enrollment_fee' || feeType === 'i20_control_fee') {
          // ✅ CORREÇÃO: Usar sempre os valores do useDynamicFees que já consideram o system_type
          if (!i20ControlFee) {
            throw new Error('I-20 Control Fee ainda está carregando. Aguarde um momento e tente novamente.');
          }
          return i20ControlFee.replace('$', '');
        }
        if (!selectionProcessFee) {
          throw new Error('Selection Process Fee ainda está carregando. Aguarde um momento e tente novamente.');
        }
        return selectionProcessFee.replace('$', '');
      };

      const amountToUse = getDynamicAmount();
      const params = new URLSearchParams({
        feeType: feeType,
        amount: amountToUse,
        scholarshipsIds: scholarshipsIds?.join(',') || ''
      });

      // Se for scholarship_fee, adicionar parâmetro específico
      if (feeType === 'scholarship_fee') {
        params.append('scholarshipFeeAmount', amountToUse);
      }

      console.log('🔍 [StripeCheckout] Navegando para Zelle com valor:', amountToUse);
      window.location.href = `/checkout/zelle?${params.toString()}`;
    } else if (method === 'parcelow') {
      console.log('🔍 [StripeCheckout] 📦 Parcelow selecionado, iniciando checkout Parcelow...');
      handleCheckout('parcelow');
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

  const handleCheckout = async (paymentMethod?: string, exchangeRateParam?: number) => {
    setLoading(true);
    try {
      // Se for PIX e não tiver taxa de câmbio, buscar uma antes de continuar
      let finalExchangeRate = exchangeRateParam || currentExchangeRate || exchangeRate;
      if (paymentMethod === 'pix' && !finalExchangeRate) {
        console.log('[StripeCheckout] ⚠️ PIX selecionado mas taxa de câmbio não disponível, buscando...');
        try {
          finalExchangeRate = await getExchangeRate();
          console.log('[StripeCheckout] ✅ Taxa de câmbio obtida:', finalExchangeRate);
        } catch (error) {
          console.error('[StripeCheckout] ❌ Erro ao buscar taxa de câmbio:', error);
          finalExchangeRate = 5.6; // Fallback
        }
      }

      if (paymentMethod === 'pix' && finalExchangeRate) {
        console.log('[StripeCheckout] 💱 Taxa de câmbio final para PIX:', finalExchangeRate);
      }

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

      // Verificar se há desconto já aplicado no valor
      const hasDiscountApplied = (window as any).__checkout_final_amount && typeof (window as any).__checkout_final_amount === 'number';

      // Se há um valor do PreCheckoutModal, usar ele
      if (hasDiscountApplied) {
        finalAmount = (window as any).__checkout_final_amount;
        console.log('🔍 [StripeCheckout] ✅ Usando valor com desconto do PreCheckoutModal:', finalAmount);
      } else {
        // Calcular valor baseado no feeType
        if (feeType === 'selection_process') {
          // ✅ CORREÇÃO: Usar sempre os valores do useDynamicFees que já consideram o system_type
          if (!selectionProcessFee) {
            throw new Error('Selection Process Fee ainda está carregando. Aguarde um momento e tente novamente.');
          }
          finalAmount = parseFloat(selectionProcessFee.replace('$', ''));
          console.log('🔍 [StripeCheckout] Selection Process Fee calculado:', {
            selectionProcessFee,
            finalAmount,
            hasSellerPackage,
            systemType: userProfile?.system_type
          });
        } else if (feeType === 'i20_control_fee') {
          // ✅ CORREÇÃO: Usar sempre os valores do useDynamicFees que já consideram o system_type
          if (!i20ControlFee) {
            throw new Error('I-20 Control Fee ainda está carregando. Aguarde um momento e tente novamente.');
          }
          finalAmount = parseFloat(i20ControlFee.replace('$', ''));
          console.log('🔍 [StripeCheckout] I-20 Control Fee calculado:', {
            i20ControlFee,
            finalAmount,
            hasSellerPackage,
            systemType: userProfile?.system_type
          });
        } else if (feeType === 'scholarship_fee') {
          // ✅ CORREÇÃO: Usar sempre os valores do useDynamicFees que já consideram o system_type
          if (!scholarshipFee) {
            throw new Error('Scholarship Fee ainda está carregando. Aguarde um momento e tente novamente.');
          }
          finalAmount = parseFloat(scholarshipFee.replace('$', ''));
          console.log('🔍 [StripeCheckout] Scholarship Fee calculado:', {
            scholarshipFee,
            finalAmount,
            hasSellerPackage,
            systemType: userProfile?.system_type
          });
        } else {
          finalAmount = getFinalApplicationFee();
        }
      }

      // Extrair código promocional do window se existir (passado pelo PreCheckoutModal)
      const promotionalCoupon = (window as any).__checkout_promotional_coupon || null;

      // Preparar taxa de câmbio para PIX
      // Usar finalExchangeRate que já foi buscado se necessário
      const exchangeRateToSend = paymentMethod === 'pix' ? finalExchangeRate : undefined;
      if (paymentMethod === 'pix') {
        console.log('[StripeCheckout] 💱 Taxa de câmbio para PIX:', {
          exchangeRateParam,
          currentExchangeRate,
          exchangeRate,
          finalExchangeRate,
          exchangeRateToSend,
          willSend: !!exchangeRateToSend
        });
      }

      // Verificar se o desconto já foi aplicado no valor (via activeDiscount do PreCheckoutModal)
      const discountAlreadyApplied = hasDiscountApplied && (window as any).__checkout_discount_applied === true;

      const requestBody = {
        price_id: product.priceId,
        amount: finalAmount, // Incluir valor final calculado (já com desconto se aplicável)
        success_url: (successUrl || `${window.location.origin}/checkout/success`).replace(/\?.*/, '') + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl || `${window.location.origin}/checkout/cancel`,
        mode: product.mode,
        payment_type: paymentType,
        fee_type: feeType,
        payment_method: paymentMethod, // Adicionar método de pagamento (PIX, stripe, etc.)
        promotional_coupon: promotionalCoupon, // Adicionar cupom promocional se houver
        metadata: {
          ...metadata,
          application_id: applicationId,
          student_process_type: studentProcessType,
          final_amount: finalAmount, // Incluir no metadata também
          // Flag para indicar que o desconto já foi aplicado no frontend
          discount_already_applied: discountAlreadyApplied ? 'true' : 'false',
          // Incluir taxa de câmbio se for PIX e estiver disponível (priorizar currentExchangeRate do PaymentMethodSelector, senão usar prop exchangeRate)
          ...(exchangeRateToSend ? {
            exchange_rate: exchangeRateToSend.toString()
          } : {}),
        },
        scholarships_ids: scholarshipsIds,
      };

      if (paymentMethod === 'pix' && exchangeRateToSend) {
        console.log('[StripeCheckout] ✅ Taxa de câmbio incluída no metadata:', exchangeRateToSend);
        console.log('[StripeCheckout] 📤 RequestBody metadata.exchange_rate:', requestBody.metadata.exchange_rate);
      } else if (paymentMethod === 'pix' && !exchangeRateToSend) {
        console.warn('[StripeCheckout] ⚠️ PIX selecionado mas taxa de câmbio não disponível!');
        console.warn('[StripeCheckout] ⚠️ Debug - exchangeRateParam:', exchangeRateParam, 'currentExchangeRate:', currentExchangeRate, 'exchangeRate:', exchangeRate, 'finalExchangeRate:', finalExchangeRate);
      }

      console.log('[StripeCheckout] 📤 Enviando requestBody (metadata):', JSON.stringify(requestBody.metadata, null, 2));

      // ✅ Caso especial Parcelow
      if (paymentMethod === 'parcelow') {
        console.log('🔍 [StripeCheckout] Iniciando checkout Parcelow...');

        let parcelowUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-application-fee`;

        if (feeType === 'selection_process') {
          parcelowUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-selection-process`;
        } else if (feeType === 'scholarship_fee') {
          parcelowUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-scholarship-fee`;
        } else if (feeType === 'i20_control_fee') {
          parcelowUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-i20-control-fee`;
        }

        const response = await fetch(parcelowUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: finalAmount,
            fee_type: feeType,
            metadata: {
              ...metadata,
              application_id: applicationId,
              student_process_type: studentProcessType,
              final_amount: finalAmount,
              promotional_coupon: promotionalCoupon
            },
            promotional_coupon: promotionalCoupon,
            scholarships_ids: scholarshipsIds
          })
        });

        if (!response.ok) {
          let errorData: { error?: string; message?: string } = {};
          try {
            errorData = await response.json();
          } catch {
            setError(t('errors.genericPaymentError', 'Unable to start checkout. Please try again.'));
            setLoading(false);
            return;
          }
          setShowPaymentMethodSelector(false);
          if (errorData.error === 'document_number_required') {
            setProfileErrorType('cpf_missing');
            setShowProfileRequiredModal(true);
            setLoading(false);
            return;
          }
          if (errorData.error === 'User profile not found') {
            setProfileErrorType('profile_incomplete');
            setShowProfileRequiredModal(true);
            setLoading(false);
            return;
          }
          if (errorData.error === 'parcelow_client_email_exists' || errorData.error === 'parcelow_order_rejected') {
            setError(errorData.message || errorData.error || 'Parcelow recusou o pedido. Tente novamente ou use outro método.');
            setLoading(false);
            return;
          }
          setError(errorData.message || errorData.error || 'Erro ao criar sessão Parcelow');
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.checkout_url) {
          console.log('[Parcelow] Redirecionando para:', data.checkout_url);
          window.location.href = data.checkout_url;
          return;
        } else {
          throw new Error('URL de checkout Parcelow não encontrada');
        }
      }


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

      const data = await response.json();
      if (data.session_url) {
        // Para PIX, incluir script de redirecionamento
        if (paymentMethod === 'pix') {
          console.log('[PIX] Incluindo script de redirecionamento...');

          // Injetar script diretamente na página do Stripe
          const script = document.createElement('script');
          script.textContent = `
            (function() {
              console.log('[PIX] Script de redirecionamento ativado na página do Stripe');
              
              const checkPixStatus = async () => {
                try {
                  const SUPABASE_PROJECT_URL = '${import.meta.env.VITE_SUPABASE_URL}';
                  const EDGE_FUNCTION_ENDPOINT = SUPABASE_PROJECT_URL + '/functions/v1/verify-stripe-session-selection-process-fee';
                  
                  let token = null;
                  try {
                    const raw = localStorage.getItem('sb-' + SUPABASE_PROJECT_URL.split('//')[1].split('.')[0] + '-auth-token');
                    if (raw) {
                      const tokenObj = JSON.parse(raw);
                      token = tokenObj?.access_token || null;
                    }
                  } catch (e) {
                    token = null;
                  }
                  
                  const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token && { 'Authorization': 'Bearer ' + token }),
                    },
                    body: JSON.stringify({ sessionId: '${data.session_id}' }),
                  });
                  
                  const data = await response.json();
                  
                  if (data.payment_method === 'pix' && data.status === 'complete') {
                    console.log('[PIX] Pagamento confirmado! Redirecionando...');
                    window.location.href = '${successUrl || window.location.origin + '/student/onboarding?step=selection_fee&payment=success'}';
                    return true;
                  }
                  
                  return false;
                } catch (error) {
                  console.error('[PIX] Erro ao verificar status:', error);
                  return false;
                }
              };
              
              // Verificar imediatamente
              checkPixStatus();
              
              // Verificar a cada 3 segundos
              const interval = setInterval(async () => {
                const redirected = await checkPixStatus();
                if (redirected) {
                  clearInterval(interval);
                }
              }, 3000);
              
              // Timeout após 2 minutos
              setTimeout(() => {
                clearInterval(interval);
                console.log('[PIX] Timeout - redirecionando...');
                window.location.href = '${successUrl || window.location.origin + '/student/onboarding?step=selection_fee&payment=success'}';
              }, 120000);
              
            })();
          `;
          document.head.appendChild(script);
        }
        window.location.href = data.session_url;
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
        ref={ref}
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
          productName={getTranslatedProductNameByProductId(productId, t)}
          productPrice={(feeType === 'selection_process'
            ? (selectionProcessFee ? parseFloat(selectionProcessFee.replace('$', '')) : 0)
            : getFinalApplicationFee())}
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

      {/* Seleção de Método de Pagamento - Responsive Drawer/Dialog */}
      {showPaymentMethodSelector && (
        <PaymentMethodSelectorDrawer
          isOpen={showPaymentMethodSelector}
          onClose={() => {
            console.log('🔍 [StripeCheckout] Fechando seletor de método de pagamento');
            setShowPaymentMethodSelector(false);
            setSelectedPaymentMethod(null);
          }}
          selectedMethod={selectedPaymentMethod}
          onMethodSelect={handlePaymentMethodSelect}
          feeType={feeType}
          amount={(window as any).__checkout_final_amount || (feeType === 'selection_process'
            ? (selectionProcessFee ? parseFloat(selectionProcessFee.replace('$', '')) : 0)
            : feeType === 'scholarship_fee'
              ? (scholarshipFee ? parseFloat(scholarshipFee.replace('$', '')) : 0)
              : feeType === 'i20_control_fee'
                ? (i20ControlFee ? parseFloat(i20ControlFee.replace('$', '')) : 0)
                : getFinalApplicationFee())}
          isLoading={loading}
        />
      )}

      {/* Checkout Zelle - Removido, agora redireciona para página separada */}

      {/* Profile Required Modal */}
      <ProfileRequiredModal
        isOpen={showProfileRequiredModal}
        onClose={() => {
          setShowProfileRequiredModal(false);
          setProfileErrorType(null);
        }}
        errorType={profileErrorType}
      />

      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}

    </>
  );
});