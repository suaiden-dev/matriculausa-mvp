import React, { useState } from 'react';
import { CreditCard, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaymentMethodChoiceProps {
  feeType: 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'selection_process';
  amount: number;
  onStripeSelected: () => void;
  onZelleSelected: () => void;
  className?: string;
}

export const PaymentMethodChoice: React.FC<PaymentMethodChoiceProps> = ({
  feeType,
  amount,
  onStripeSelected,
  onZelleSelected,
  className = ''
}) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processingSelection, setProcessingSelection] = useState(false);

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'stripe',
      display_name: t('paymentChoice.methods.stripe.title'),
      description: t('paymentChoice.methods.stripe.description'),
      icon: CreditCard,
      is_active: true,
      requires_verification: false
    },
    {
      id: 'zelle',
      name: 'zelle',
      display_name: t('paymentChoice.methods.zelle.title'),
      description: t('paymentChoice.methods.zelle.description'),
      icon: Smartphone,
      is_active: true,
      requires_verification: true
    }
  ];

  const handleMethodSelect = async (methodId: string) => {
    if (processingSelection) return;
    
    setProcessingSelection(true);
    setSelectedMethod(methodId);
    
    try {
      if (methodId === 'stripe') {
        onStripeSelected();
      } else if (methodId === 'zelle') {
        onZelleSelected();
      }
    } catch (error) {
      console.error('Error selecting payment method:', error);
      setProcessingSelection(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Overlay de processamento quando selecionando método */}
      {processingSelection && (
        <div className="absolute inset-0 z-10 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 text-blue-700">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">{t('paymentChoice.loading.processing')}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('paymentChoice.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('paymentChoice.subtitle', { feeType: t(`paymentChoice.feeTypes.${feeType}`) })}
          </p>
        </div>

      <div className="grid gap-4">
        {paymentMethods.map((method) => {
          const IconComponent = method.icon;
          return (
            <div
              key={method.id}
              className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                selectedMethod === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${processingSelection ? 'pointer-events-none opacity-60' : ''}`}
              onClick={() => handleMethodSelect(method.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <IconComponent className={`w-6 h-6 ${
                    selectedMethod === method.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {method.display_name}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {method.description}
                      </p>
                    </div>
                    
                    {selectedMethod === method.id && !processingSelection && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  {method.requires_verification && (
                    <div className="mt-2 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-amber-700">
                        {t('paymentChoice.manualVerification')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedMethod === method.id && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{t('paymentChoice.amount')}:</span> ${amount.toFixed(2)} USD
                  </div>
                  
                  {method.name === 'zelle' && (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                      <strong>{t('paymentChoice.important')}:</strong> {t('paymentChoice.zelleUploadNote')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
