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

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'stripe',
      display_name: 'Credit Card',
      description: 'Pay securely with credit or debit card via Stripe',
      icon: CreditCard,
      is_active: true,
      requires_verification: false
    },
    {
      id: 'zelle',
      name: 'zelle',
      display_name: 'Zelle',
      description: 'Pay via Zelle transfer (requires manual verification)',
      icon: Smartphone,
      is_active: true,
      requires_verification: true
    }
  ];

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    
    if (methodId === 'stripe') {
      onStripeSelected();
    } else if (methodId === 'zelle') {
      onZelleSelected();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choose Payment Method
        </h3>
        <p className="text-sm text-gray-600">
          Select how you would like to pay your {feeType.replace('_', ' ')} fee
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
              }`}
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
                    
                    {selectedMethod === method.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  {method.requires_verification && (
                    <div className="mt-2 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-amber-700">
                        Manual verification required
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedMethod === method.id && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Amount:</span> ${amount.toFixed(2)} USD
                  </div>
                  
                  {method.name === 'zelle' && (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                      <strong>Important:</strong> After making the Zelle payment, you'll need to upload a screenshot of the confirmation showing the confirmation code, date, amount, and recipient.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
