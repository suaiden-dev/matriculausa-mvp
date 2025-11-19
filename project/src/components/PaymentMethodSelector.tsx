import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { calculateCardAmountWithFees, calculatePIXAmountWithFees, getExchangeRate } from '../utils/stripeFeeCalculator';

// Componente SVG para o logo do PIX (oficial)
const PixIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

// Componente SVG para o logo do Zelle (oficial)
const ZelleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#a0f" d="M35,42H13c-3.866,0-7-3.134-7-7V13c0-3.866,3.134-7,7-7h22c3.866,0,7,3.134,7,7v22C42,38.866,38.866,42,35,42z"/>
    <path fill="#fff" d="M17.5,18.5h14c0.552,0,1-0.448,1-1V15c0-0.552-0.448-1-1-1h-14c-0.552,0-1,0.448-1,1v2.5C16.5,18.052,16.948,18.5,17.5,18.5z"/>
    <path fill="#fff" d="M17,34.5h14.5c0.552,0,1-0.448,1-1V31c0-0.552-0.448-1-1-1H17c-0.552,0-1,0.448-1,1v2.5C16,34.052,16.448,34.5,17,34.5z"/>
    <path fill="#fff" d="M22.25,11v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,10.5,22.25,10.724,22.25,11z"/>
    <path fill="#fff" d="M22.25,32v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,31.5,22.25,31.724,22.25,32z"/>
    <path fill="#fff" d="M16.578,30.938H22l10.294-12.839c0.178-0.222,0.019-0.552-0.266-0.552H26.5L16.275,30.298C16.065,30.553,16.247,30.938,16.578,30.938z"/>
  </svg>
);

// Componente SVG para o logo do Stripe (baseado no ícone oficial)
const StripeIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="2" fill="#7950F2"/>
    <path d="M6 8h12M6 12h8M6 16h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
import { useTranslation } from 'react-i18next';

export interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
  requires_verification: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface PaymentMethodSelectorProps {
  selectedMethod: 'stripe' | 'zelle' | 'pix' | null;
  onMethodSelect: (method: 'stripe' | 'zelle' | 'pix', exchangeRate?: number) => void;
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
  const [processingSelection, setProcessingSelection] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  
  // Calcular valores com markup de taxas do Stripe
  const cardAmountWithFees = amount > 0 ? calculateCardAmountWithFees(amount) : 0;
  const pixAmountWithFees = amount > 0 && exchangeRate ? calculatePIXAmountWithFees(amount, exchangeRate) : 0;

  useEffect(() => {
    loadPaymentMethods();
    // Buscar taxa de câmbio da mesma API que o backend usa
    getExchangeRate().then(rate => {
      setExchangeRate(rate);
      console.log('[PaymentMethodSelector] Taxa de câmbio obtida:', rate);
    }).catch(error => {
      console.error('[PaymentMethodSelector] Erro ao buscar taxa de câmbio:', error);
      // Fallback para 5.6 se falhar
      setExchangeRate(5.6);
    });
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
          requires_verification: false,
          icon: StripeIcon
        },
        {
          id: 'pix',
          name: 'pix',
          display_name: t('paymentSelector.methods.pix.title'),
          description: t('paymentSelector.methods.pix.description'),
          is_active: true,
          requires_verification: false,
          icon: PixIcon
        },
        {
          id: 'zelle',
          name: 'zelle',
          display_name: t('paymentSelector.methods.zelle.title'),
          description: t('paymentSelector.methods.zelle.descriptionDetailed'),
          is_active: true,
          requires_verification: true,
          icon: ZelleIcon
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

  const handleMethodSelect = async (method: 'stripe' | 'zelle' | 'pix') => {
    if (processingSelection) return;
    
    console.log('🔍 [PaymentMethodSelector] Iniciando seleção:', method);
    setProcessingSelection(true);
    
    try {
      // Mostrar feedback visual
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), method === 'stripe' ? 800 : 200); // Mais tempo para Stripe
      });
      
      console.log('🔍 [PaymentMethodSelector] Chamando callback onMethodSelect');
      // Passar taxa de câmbio quando for PIX para garantir consistência
      onMethodSelect(method, method === 'pix' ? (exchangeRate || undefined) : undefined);
      
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
        <div className="grid gap-4">
          {paymentMethods.map((method) => {
            const isSelected = selectedMethod === method.id;
            
            return (
              <div
                key={method.id}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${processingSelection ? 'pointer-events-none opacity-60' : ''}`}
                onClick={() => handleMethodSelect(method.id as 'stripe' | 'zelle' | 'pix')}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {method.icon ? (
                      <method.icon className={`w-6 h-6 ${
                        isSelected ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    ) : (
                      <CreditCard className={`w-6 h-6 ${
                        isSelected ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {method.display_name}
                          </h4>
                          {/* Exibir valor ao lado de cada opção */}
                          {amount > 0 && method.id === 'stripe' && (
                            <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                              ${cardAmountWithFees.toFixed(2)}
                            </span>
                          )}
                          {amount > 0 && method.id === 'pix' && (
                            <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                              {exchangeRate ? `R$ ${pixAmountWithFees.toFixed(2)}` : '...'}
                            </span>
                          )}
                          {method.id === 'zelle' && (
                            <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                              ${amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {method.description}
                        </p>
                        {/* Tag "inclui taxa de processamento" para Stripe e PIX */}
                        {(method.id === 'stripe' || method.id === 'pix') && (
                          <p className="text-xs text-gray-400 mt-1">
                            {t('paymentSelector.includesProcessingFees')}
                          </p>
                        )}
                      </div>
                      
                      {isSelected && !processingSelection && (
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
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
                
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    {method.name === 'zelle' && (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                        <strong>{t('paymentSelector.important')}</strong> {t('paymentSelector.zelleUploadNote')}
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