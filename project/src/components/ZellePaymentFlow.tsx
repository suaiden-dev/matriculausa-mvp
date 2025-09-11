import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { supabase } from '../lib/supabase';
import { PreCheckoutModal } from './PreCheckoutModal';
import { ZelleCheckout } from './ZelleCheckout';

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
  const { getFeeAmount } = useFeeConfig();
  const [loading] = useState(false);
  const [showPreCheckoutModal, setShowPreCheckoutModal] = useState(false);
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);

  const { isAuthenticated } = useAuth();

  const handleStartPayment = () => {
    if (!isAuthenticated) {
      onError?.('You must be logged in to make a payment');
      return;
    }
    
    console.log('🔍 [ZellePaymentFlow] Iniciando fluxo de pagamento Zelle');
    setShowPreCheckoutModal(true);
  };


  const handlePreCheckoutProceed = async (discountCode?: string) => {
    console.log('🔍 [ZellePaymentFlow] handlePreCheckoutProceed chamado com código:', discountCode);
    
    // Calcular valor base
    const baseAmount = getAmount();
    let finalAmountValue = baseAmount;
    let discountAppliedValue = false;
    
    console.log('🔍 [ZellePaymentFlow] Valores iniciais:', {
      baseAmount,
      finalAmountValue,
      discountAppliedValue,
      feeType
    });
    
    // Se há código de desconto, aplicar via edge function
    if (discountCode) {
      try {
        console.log('🔍 [ZellePaymentFlow] Aplicando código de desconto via edge function...');
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
        
        // Aplicar desconto de $50 se for selection_process
        if (feeType === 'selection_process') {
          finalAmountValue = Math.max(0, baseAmount - 50);
          discountAppliedValue = true;
          console.log('🔍 [ZellePaymentFlow] ✅ Desconto de $50 aplicado. Valor original: $' + baseAmount + ', Valor final: $' + finalAmountValue);
        } else {
          console.log('🔍 [ZellePaymentFlow] ⚠️ Desconto não aplicado - feeType não é selection_process:', feeType);
        }
        
        console.log('🔍 [ZellePaymentFlow] ✅ Código aplicado com sucesso');
      } catch (error) {
        console.error('🔍 [ZellePaymentFlow] ❌ Erro ao aplicar código:', error);
        onError?.(error instanceof Error ? error.message : 'Erro ao aplicar código de desconto');
        return;
      }
    } else {
      console.log('🔍 [ZellePaymentFlow] Nenhum código de desconto fornecido');
    }

    // Definir valores finais
    setFinalAmount(finalAmountValue);
    setDiscountApplied(discountAppliedValue);

    console.log('🔍 [ZellePaymentFlow] Estados finais definidos:', {
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
    return feeType === 'selection_process' ? getFeeAmount('selection_process') : getFeeAmount('application_fee');
  };

  const getProductName = () => {
    const names = {
      selection_process: 'Selection Process Fee',
      application_fee: 'Application Fee',
      enrollment_fee: 'College Enrollment Fee',
      scholarship_fee: 'Scholarship Fee'
    };
    return names[feeType] || 'Fee';
  };

  return (
    <>
      {/* Botão Principal */}
      <button
        onClick={handleStartPayment}
        disabled={loading}
        className={`${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Processing...' : buttonText}
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
                <h2 className="text-xl font-semibold text-gray-900">Zelle Payment</h2>
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
