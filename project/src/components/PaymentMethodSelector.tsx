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
  amount: _amount,
  className = ''
}) => {
  const { t } = useTranslation();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingSelection, setProcessingSelection] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  // Reset processing state when component unmounts
  useEffect(() => {
    return () => {
      setProcessingSelection(false);
    };
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
          display_name: t('paymentSelector.methods.stripe.title'),
          description: t('paymentSelector.methods.stripe.description'),
          is_active: true,
          requires_verification: false
        },
        {
          id: 'zelle',
          name: 'zelle',
          display_name: t('paymentSelector.methods.zelle.title'),
          description: t('paymentSelector.methods.zelle.descriptionDetailed'),
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

  const handleMethodSelect = async (method: 'stripe' | 'zelle') => {
    if (processingSelection) return;
    
    console.log('🔍 [PaymentMethodSelector] Iniciando seleção:', method);
    setProcessingSelection(true);
    
    try {
      // Mostrar feedback visual
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), method === 'stripe' ? 800 : 200); // Mais tempo para Stripe
      });
      
      console.log('🔍 [PaymentMethodSelector] Chamando callback onMethodSelect');
      onMethodSelect(method);
      
      // Reset após o callback ser chamado - tempo maior para Stripe
      setTimeout(() => {
        setProcessingSelection(false);
      }, method === 'stripe' ? 2500 : 300); // 2.5s para Stripe, 300ms para Zelle
      
    } catch (error) {
      console.error('Error selecting payment method:', error);
      setProcessingSelection(false);
    }
  };

  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 ${className}`} aria-busy="true" aria-live="polite">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.10),transparent_60%)]" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-white shadow-inner flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-blue-600 animate-pulse" />
            </div>
            <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-lg bg-white shadow flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-indigo-600 animate-pulse" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-3 w-40 bg-white/70 rounded mb-2 animate-pulse" />
            <div className="h-3 w-64 bg-white/60 rounded animate-pulse" />
            <p className="text-sm text-gray-700 mt-3">
              {t('paymentSelector.loading.message')}
            </p>
          </div>
          <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Overlay de processamento quando selecionando método */}
      {processingSelection && (
        <div className="absolute inset-0 z-10 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 text-blue-700">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">{t('paymentSelector.loading.processing')}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('paymentSelector.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('paymentSelector.subtitle', { feeType: t(`paymentSelector.feeTypes.${feeType}`) })}
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
              } ${processingSelection ? 'pointer-events-none opacity-60' : ''}`}
              onClick={() => handleMethodSelect(method.id as 'stripe' | 'zelle')}
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
                    
                    {selectedMethod === method.id && !processingSelection && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  {method.requires_verification && (
                    <div className="mt-2 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-amber-700">
                        {t('paymentSelector.manualVerification')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedMethod === method.id && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  {method.name === 'zelle' && (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                      <strong>{t('paymentSelector.important')}</strong> {t('paymentSelector.zelleUploadNote')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};