import React, { useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useDynamicFees } from '../hooks/useDynamicFees';
import { useAuth } from '../hooks/useAuth';

interface I20ControlFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPaymentMethod: 'stripe' | 'zelle' | 'pix' | null;
  onPaymentMethodSelect: (method: 'stripe' | 'zelle' | 'pix') => void;
}

export const I20ControlFeeModal: React.FC<I20ControlFeeModalProps> = ({
  isOpen,
  onClose,
  selectedPaymentMethod,
  onPaymentMethodSelect,
}) => {
  const { user } = useAuth();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const { i20ControlFee, hasSellerPackage } = useDynamicFees();
  
  // Hide floating elements when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);
  
  // Função para selecionar o método de pagamento (não processa automaticamente)
  const handlePaymentMethodSelect = (method: 'stripe' | 'zelle' | 'pix') => {
    console.log('🔍 [I20ControlFeeModal] Método selecionado:', method);
    onPaymentMethodSelect(method);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-[9999]"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" aria-hidden="true" />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0">
          {/* Header */}
          <div className="relative bg-blue-600 text-white p-6">
            <button
              onClick={onClose}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold">
                  I-20 Control Fee Payment
                </Dialog.Title>
                <p className="text-blue-100">
                  Choose your payment method
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Seletor de Método de Pagamento */}
            <PaymentMethodSelector
              selectedMethod={selectedPaymentMethod}
              onMethodSelect={handlePaymentMethodSelect}
              feeType="i20_control_fee"
              amount={hasSellerPackage ? parseFloat(i20ControlFee.replace('$', '')) : getFeeAmount('i20_control_fee')}
            />

            {/* Info sobre processamento automático */}
            <div className="text-center text-sm text-gray-600">
              <p>Select a payment method to proceed automatically to checkout</p>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
