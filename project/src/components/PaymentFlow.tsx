import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StripeCheckout } from './StripeCheckout';
import { ZellePaymentFlow } from './ZellePaymentFlow';
import { PaymentMethodChoice } from './PaymentMethodChoice';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';

interface PaymentFlowProps {
  productId: string;
  feeType: 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'selection_process';
  scholarshipsIds?: string[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  buttonText?: string;
  className?: string;
  metadata?: { [key: string]: any };
  studentProcessType?: string | null;
  beforeCheckout?: () => Promise<{ applicationId: string } | undefined>;
}

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  productId,
  feeType,
  scholarshipsIds,
  onSuccess,
  onError,
  buttonText = 'Start Payment',
  className = '',
  metadata = {},
  studentProcessType,
  beforeCheckout,
}) => {
  const { t } = useTranslation();
  const { getFeeAmount } = useFeeConfig();
  const { isBlocked, pendingPayment, loading: paymentBlockedLoading } = usePaymentBlocked();
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'zelle' | null>(null);

  const handleStartPayment = () => {
    // Sempre reiniciar a seleção do método ao iniciar o fluxo novamente
    setSelectedMethod(null);
    setShowMethodSelector(true);
  };

  const handleStripeSelected = () => {
    setSelectedMethod('stripe');
    setShowMethodSelector(false);
  };

  const handleZelleSelected = () => {
    setSelectedMethod('zelle');
    setShowMethodSelector(false);
  };

  const handleCloseMethodSelector = () => {
    setShowMethodSelector(false);
    setSelectedMethod(null);
  };

  // Reiniciar seleção quando o produto ou tipo de taxa mudarem
  useEffect(() => {
    setSelectedMethod(null);
    setShowMethodSelector(false);
  }, [productId, feeType]);

  const getAmount = () => {
    return feeType === 'selection_process' ? getFeeAmount('selection_process') : getFeeAmount('application_fee');
  };

  // Se um método foi selecionado, renderizar o componente correspondente
  if (selectedMethod === 'stripe') {
    return (
      <StripeCheckout
        productId={productId as any}
        feeType={feeType}
        scholarshipsIds={scholarshipsIds}
        onSuccess={onSuccess}
        onError={onError}
        buttonText={buttonText}
        className={className}
        metadata={metadata}
        studentProcessType={studentProcessType}
        beforeCheckout={beforeCheckout}
      />
    );
  }

  if (selectedMethod === 'zelle') {
    return (
      <ZellePaymentFlow
        feeType={feeType}
        scholarshipsIds={scholarshipsIds}
        onSuccess={onSuccess}
        onError={onError}
        buttonText={buttonText}
        className={className}
        metadata={metadata}
        studentProcessType={studentProcessType}
      />
    );
  }

  return (
    <>
      {/* Botão Principal */}
      <button
        onClick={isBlocked && pendingPayment ? undefined : handleStartPayment}
        disabled={paymentBlockedLoading || (isBlocked && pendingPayment)}
        className={`${className} ${(paymentBlockedLoading || (isBlocked && pendingPayment)) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {paymentBlockedLoading ? 'Checking...' : 
         (isBlocked && pendingPayment) ? t('zelleCheckout.processing') : 
         buttonText}
      </button>

      {/* Seletor de Método de Pagamento */}
      {showMethodSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Choose Payment Method</h2>
                <button
                  onClick={handleCloseMethodSelector}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <PaymentMethodChoice
                feeType={feeType}
                amount={getAmount()}
                onStripeSelected={handleStripeSelected}
                onZelleSelected={handleZelleSelected}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
