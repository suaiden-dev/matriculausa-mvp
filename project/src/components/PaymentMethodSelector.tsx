import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
  requires_verification: boolean;
}

interface PaymentMethodSelectorProps {
  selectedMethod: 'stripe' | 'zelle' | null;
  onMethodSelect: (method: 'stripe' | 'zelle') => void;
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'i20_control_fee';
  amount: number;
  className?: string;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodSelect,
  feeType,
  amount,
  className = ''
}) => {
  const { t } = useTranslation();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      // Por enquanto, vamos usar métodos hardcoded
      // Depois podemos buscar do banco de dados
      const methods: PaymentMethod[] = [
        {
          id: 'stripe',
          name: 'stripe',
          display_name: 'Stripe',
          description: 'Pay securely with credit or debit card via Stripe',
          is_active: true,
          requires_verification: false
        },
        {
          id: 'zelle',
          name: 'zelle',
          display_name: 'Zelle',
          description: 'Pay via Zelle transfer (requires manual verification)',
          is_active: true,
          requires_verification: true
        }
      ];
      
      setPaymentMethods(methods);
      
      // NÃO selecionar método automaticamente - deixar usuário escolher
      console.log('🔍 [PaymentMethodSelector] Métodos de pagamento carregados, aguardando seleção do usuário');
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

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
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              selectedMethod === method.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => onMethodSelect(method.id as 'stripe' | 'zelle')}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {method.name === 'stripe' ? (
                  <CreditCard className={`w-6 h-6 ${
                    selectedMethod === method.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                ) : (
                  <Smartphone className={`w-6 h-6 ${
                    selectedMethod === method.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                )}
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
        ))}
      </div>
    </div>
  );
};
