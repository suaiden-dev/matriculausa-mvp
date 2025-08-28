import React from 'react';
import { Dialog } from '@headlessui/react';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface I20ControlFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  selectedPaymentMethod: 'stripe' | 'zelle' | null;
  onPaymentMethodSelect: (method: 'stripe' | 'zelle') => void;
}

export const I20ControlFeeModal: React.FC<I20ControlFeeModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  selectedPaymentMethod,
  onPaymentMethodSelect,
}) => {
  // Função para selecionar o método de pagamento (sem processar imediatamente)
  const handlePaymentMethodSelect = (method: 'stripe' | 'zelle') => {
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
              amount={1250}
            />

            {/* Botão de Confirmação - só aparece quando um método é selecionado */}
            {selectedPaymentMethod && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={onProceed}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                >
                  Proceed with {selectedPaymentMethod === 'stripe' ? 'Card Payment' : 'Zelle Transfer'}
                </button>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
