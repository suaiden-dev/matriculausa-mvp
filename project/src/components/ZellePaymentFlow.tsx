import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { useSystemType } from '../hooks/useSystemType';
import { supabase } from '../lib/supabase';
import { PreCheckoutModal } from './PreCheckoutModal';
import { ZelleCheckout } from './ZelleCheckout';
import { getTranslatedProductName } from '../lib/productNameUtils';

interface ZellePaymentFlowProps {
  feeType: 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'selection_process';
  scholarshipsIds?: string[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  buttonText?: string;
  className?: string;
  metadata?: { [key: string]: any };
  studentProcessType?: string | null;
}

export const ZellePaymentFlow: React.FC<ZellePaymentFlowProps> = ({
  feeType,
  scholarshipsIds,
  onSuccess,
  onError,
  buttonText = 'Pay with Zelle',
  className = '',
  metadata = {},
  studentProcessType,
}) => {
  const { t } = useTranslation();
  const { isAuthenticated, user, userProfile } = useAuth();
  const { getFeeAmount, userFeeOverrides } = useFeeConfig(user?.id);
  const { isBlocked, pendingPayment, loading: paymentBlockedLoading } = usePaymentBlocked();
  const { systemType } = useSystemType();
  const [loading] = useState(false);
  const [showPreCheckoutModal, setShowPreCheckoutModal] = useState(false);
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);

  const handleStartPayment = () => {
    if (!isAuthenticated) {
      onError?.('You must be logged in to make a payment');
      return;
    }
    
    console.log('🔍 [ZellePaymentFlow] Iniciando fluxo de pagamento Zelle');
    setShowPreCheckoutModal(true);
  };


  const handlePreCheckoutProceed = async (finalAmount: number, discountCode?: string) => {
    console.log('🔍 [ZellePaymentFlow] handlePreCheckoutProceed chamado com finalAmount:', finalAmount, 'código:', discountCode);
    
    // Calcular valor base para referência
    const baseAmount = getAmount();
    let finalAmountValue = finalAmount; // ✅ Usar o valor já calculado pelo PreCheckoutModal
    let discountAppliedValue = false;
    
    console.log('🔍 [ZellePaymentFlow] Valores iniciais:', {
      baseAmount,
      finalAmountValue,
      discountAppliedValue,
      feeType,
      discountCode
    });
    
    // Se há código de desconto (referral code), aplicar via edge function
    // Mas o valor final já foi calculado pelo PreCheckoutModal, então só precisamos registrar
    if (discountCode) {
      // Verificar se é cupom promocional (BLACK, etc) ou código de referral
      const isPromotionalCoupon = discountCode === 'BLACK' || (window as any).__checkout_promotional_coupon === discountCode;
      
      if (isPromotionalCoupon) {
        console.log('🔍 [ZellePaymentFlow] ✅ Cupom promocional detectado, valor já calculado:', finalAmountValue);
        discountAppliedValue = true;
      } else {
        // Código de referral - aplicar via edge function
        try {
          console.log('🔍 [ZellePaymentFlow] Aplicando código de referral via edge function...');
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
          console.log('🔍 [ZellePaymentFlow] Resultado da aplicação do código:', result);
          
          if (!result.success) {
            console.error('🔍 [ZellePaymentFlow] ❌ Erro ao aplicar código:', result.error);
            onError?.(result.error || 'Erro ao aplicar código de desconto');
            return;
          }
          
          // O valor final já foi calculado pelo PreCheckoutModal, apenas marcar que desconto foi aplicado
          discountAppliedValue = true;
          console.log('🔍 [ZellePaymentFlow] ✅ Código de referral aplicado com sucesso');
        } catch (error) {
          console.error('🔍 [ZellePaymentFlow] ❌ Erro ao aplicar código:', error);
          onError?.(error instanceof Error ? error.message : 'Erro ao aplicar código de desconto');
          return;
        }
      }
    } else {
      console.log('🔍 [ZellePaymentFlow] Nenhum código de desconto fornecido');
    }

    // Definir valores finais
    setFinalAmount(finalAmountValue);
    setDiscountApplied(discountAppliedValue);

    console.log('🔍 [ZellePaymentFlow] Estados finais definidos:', {
      baseAmount,
      finalAmountValue,
      discountAppliedValue,
      finalAmount: finalAmountValue,
      discountApplied: discountAppliedValue
    });

    // Continuar para o checkout Zelle
    console.log('🔍 [ZellePaymentFlow] Continuando para checkout Zelle com valor:', finalAmountValue);
    setShowPreCheckoutModal(false);
    setShowZelleCheckout(true);
  };

  const handleZelleSuccess = () => {
    console.log('🔍 [ZellePaymentFlow] Pagamento Zelle realizado com sucesso');
    setShowZelleCheckout(false);
    onSuccess?.();
  };

  const handleZelleError = (error: string) => {
    console.error('🔍 [ZellePaymentFlow] Erro no pagamento Zelle:', error);
    setError(error);
    onError?.(error);
  };

  const handleCloseZelleCheckout = () => {
    setShowZelleCheckout(false);
    setError(null);
  };

  const getAmount = () => {
    if (feeType === 'selection_process') {
      const hasOverride = userFeeOverrides?.selection_process_fee !== undefined;
      if (hasOverride) {
        // Se há override, usar apenas o valor do override (já inclui dependentes se necessário)
        return getFeeAmount('selection_process');
      } else {
        // Se não há override, aplicar lógica de dependentes aos valores padrão
        const dependents = Number(userProfile?.dependents) || 0;
        // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
        // Dependentes só afetam Application Fee ($100 por dependente)
        const dependentsCost = systemType === 'simplified' ? 0 : (dependents * 150); // $150 por dependente apenas no Selection Process (legacy)
        return getFeeAmount('selection_process') + dependentsCost;
      }
    }
    
    if (feeType === 'application_fee') {
      const baseAmount = getFeeAmount('application_fee');
      const dependents = Number(userProfile?.dependents) || 0;
      
      // Adicionar $100 por dependente para ambos os sistemas (legacy e simplified)
      if (dependents > 0) {
        const dependentsCost = dependents * 100; // $100 por dependente na Application Fee
        return baseAmount + dependentsCost;
      }
      
      return baseAmount;
    }
    
    return getFeeAmount(feeType as any);
  };

  const getProductName = () => {
    return getTranslatedProductName(feeType, t);
  };

  return (
    <>
      {/* Botão Principal */}
      <button
        onClick={(isBlocked && pendingPayment) ? undefined : handleStartPayment}
        disabled={loading || paymentBlockedLoading || !!(isBlocked && pendingPayment)}
        className={`${className} ${(loading || paymentBlockedLoading || !!(isBlocked && pendingPayment)) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? t('zelleCheckout.processing') : 
         paymentBlockedLoading ? t('zelleWaiting.analyzingPayment') : 
         (isBlocked && pendingPayment) ? t('zelleCheckout.processing') : 
         buttonText}
      </button>

      {/* Modal Pré-Checkout (Termos + Códigos) */}
      {showPreCheckoutModal && (
        <PreCheckoutModal
          isOpen={showPreCheckoutModal}
          onClose={() => setShowPreCheckoutModal(false)}
          onProceedToCheckout={handlePreCheckoutProceed}
          feeType={feeType}
          productName={getProductName()}
          productPrice={getAmount()}
        />
      )}

      {/* Checkout Zelle */}
      {showZelleCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('zelleCheckout.title')}</h2>
                <button
                  onClick={handleCloseZelleCheckout}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <ZelleCheckout
                feeType={feeType}
                amount={finalAmount || getAmount()}
                scholarshipsIds={scholarshipsIds}
                onSuccess={handleZelleSuccess}
                onError={handleZelleError}
                metadata={{
                  ...metadata,
                  student_process_type: studentProcessType,
                  discount_applied: discountApplied,
                  original_amount: getAmount(),
                  final_amount: finalAmount || getAmount(),
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Exibição de Erros */}
      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </>
  );
};
