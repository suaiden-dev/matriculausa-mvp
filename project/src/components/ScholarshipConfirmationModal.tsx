import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, X } from 'lucide-react';
import { Scholarship } from '../types';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { convertCentsToDollars } from '../utils/currency';
import { ZelleCheckout } from './ZelleCheckout';

// Componente SVG para o logo do PIX
const PixIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

// Componente SVG para o logo do Zelle
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

interface ScholarshipConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholarship: Scholarship;
  onStripeCheckout: () => void;
  onPixCheckout?: () => void;
  onZelleCheckout?: () => void; // Callback para Zelle (se fornecido, mostra inline)
  onZelleSuccess?: () => void; // Callback quando Zelle payment for aprovado
  isProcessing?: boolean;
  feeType?: 'application_fee' | 'scholarship_fee';
  zelleMetadata?: { // Metadados para passar ao ZelleCheckout quando inline
    application_id?: string;
    selected_scholarship_id?: string;
    application_fee_amount?: number;
  };
}

export const ScholarshipConfirmationModal: React.FC<ScholarshipConfirmationModalProps> = ({
  isOpen,
  onClose,
  scholarship,
  onStripeCheckout,
  onPixCheckout,
  onZelleCheckout,
  onZelleSuccess,
  isProcessing = false,
  feeType = 'application_fee',
  zelleMetadata
}) => {
  const navigate = useNavigate();
  const { getFeeAmount: getFeeAmountFromConfig } = useFeeConfig();
  const { userProfile } = useAuth();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | null>(null);
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(false);
  
  // Hook para detectar se é mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Evitar flicker: só mostra spinner após pequeno atraso
  useEffect(() => {
    let timeout: number | undefined;
    if (isProcessing || submitting) {
      timeout = window.setTimeout(() => setSpinnerVisible(true), 250);
    } else {
      setSpinnerVisible(false);
    }
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [isProcessing, submitting]);

  // Hide floating elements when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Valor dinâmico baseado no tipo de taxa
  const getFeeAmount = () => {
    if (feeType === 'scholarship_fee') {
      return scholarship.scholarship_fee_amount || getFeeAmountFromConfig('scholarship_fee');
    }
    
    // Application Fee: o valor vem em centavos do banco
    let applicationFeeAmountInCents = scholarship.application_fee_amount;
    
    if (!applicationFeeAmountInCents) {
      // Valor padrão em centavos: $350.00 = 35000 centavos
      applicationFeeAmountInCents = 35000;
    }
    
    // Converter centavos para dólares usando a função utilitária
    let applicationFeeAmount = convertCentsToDollars(applicationFeeAmountInCents);
    
    // Aplicar +$100 por dependente quando sistema legacy
    const deps = Number(userProfile?.dependents) || 0;
    const systemType = userProfile?.system_type || 'legacy';
    const final = systemType === 'legacy' && deps > 0
      ? applicationFeeAmount + deps * 100
      : applicationFeeAmount;

    return final;
  };

  const feeAmount = getFeeAmount();
  const universityName = scholarship.universities?.name || scholarship.university_name || 'University';

  // Títulos e textos dinâmicos baseados no tipo de taxa
  const getModalContent = () => {
    if (feeType === 'scholarship_fee') {
      return {
        title: t('scholarshipConfirmationModal.scholarshipFee.title'),
        subtitle: t('scholarshipConfirmationModal.scholarshipFee.subtitle'),
        feeLabel: t('scholarshipConfirmationModal.scholarshipFee.feeLabel'),
        buttonText: t('scholarshipConfirmationModal.scholarshipFee.buttonText', { amount: getFeeAmountFromConfig('scholarship_fee') })
      };
    }
    
    return {
      title: t('scholarshipConfirmationModal.applicationFee.title'),
      subtitle: t('scholarshipConfirmationModal.applicationFee.subtitle'),
      feeLabel: t('scholarshipConfirmationModal.applicationFee.feeLabel'),
      buttonText: t('scholarshipConfirmationModal.applicationFee.buttonText', { amount: feeAmount.toFixed(2) })
    };
  };

  const modalContent = getModalContent();

  const handlePaymentMethodSelect = (method: 'stripe' | 'zelle' | 'pix') => {
    setSelectedPaymentMethod(method);
  };

  const handleProceed = async () => {
    if (!selectedPaymentMethod) return;

    try {
      setSubmitting(true);
      if (selectedPaymentMethod === 'stripe') {
        onStripeCheckout();
      } else if (selectedPaymentMethod === 'pix') {
        if (onPixCheckout) {
          onPixCheckout();
        } else {
          onStripeCheckout();
        }
      } else if (selectedPaymentMethod === 'zelle') {
        // Se há callback onZelleCheckout, não fazer nada aqui - o ZelleCheckout será mostrado inline
        if (!onZelleCheckout) {
          // Caso contrário, redirecionar para página de checkout Zelle (comportamento padrão)
          const params = new URLSearchParams({
            feeType: feeType,
            amount: feeAmount.toString(),
            scholarshipsIds: scholarship.id
          });
          
          if (feeType === 'application_fee') {
            params.append('applicationFeeAmount', feeAmount.toString());
          } else if (feeType === 'scholarship_fee') {
            params.append('scholarshipFeeAmount', feeAmount.toString());
          }
          
          navigate(`/checkout/zelle?${params.toString()}`);
        }
        // Se há onZelleCheckout, o ZelleCheckout será renderizado inline abaixo (não precisa fazer nada aqui)
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Se Zelle foi selecionado e há callback, mostrar ZelleCheckout inline
  const showZelleInline = selectedPaymentMethod === 'zelle' && onZelleCheckout;

  const canProceed = selectedPaymentMethod !== null;

  // Componente de conteúdo comum para Drawer e Dialog
  const ModalContent = ({ isInDrawer = false }: { isInDrawer?: boolean }) => (
    <>
      {/* Loading Overlay */}
      {(isProcessing || submitting) && spinnerVisible && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-900">{t('scholarshipConfirmationModal.loading.processing')}</p>
            <p className="text-sm text-gray-600 mt-2">{t('scholarshipConfirmationModal.loading.redirecting')}</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      {isInDrawer ? (
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-xl font-bold text-gray-900">
            {modalContent.title}
          </DrawerTitle>
          <DrawerDescription className="text-gray-600">
            {modalContent.subtitle}
          </DrawerDescription>
        </DrawerHeader>
      ) : (
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isProcessing || submitting}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            title={t('common.close')}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="flex items-center gap-3 pr-12">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {modalContent.title}
              </h2>
              <p className="text-blue-100 text-sm">
                {modalContent.subtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`${isInDrawer ? 'p-4' : 'flex-1 overflow-y-auto p-4 sm:p-6'} space-y-4`}>
        {/* Scholarship Info */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{t('scholarshipConfirmationModal.labels.selectedScholarship')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('scholarshipConfirmationModal.labels.scholarship')}:</span>
              <span className="font-medium text-gray-900 text-right ml-2 flex-1">{scholarship.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('scholarshipConfirmationModal.labels.university')}:</span>
              <span className="font-medium text-gray-900 text-right ml-2 flex-1">{universityName}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="text-gray-600">{modalContent.feeLabel}</span>
              <span className="font-bold text-base sm:text-lg text-green-600">${feeAmount.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('scholarshipConfirmationModal.labels.choosePaymentMethod')}</h3>
          
          <div className="grid gap-2 sm:gap-3">
            {/* Stripe Option */}
            <label className="relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
              <input
                type="radio"
                name="payment-method"
                value="stripe"
                checked={selectedPaymentMethod === 'stripe'}
                onChange={() => handlePaymentMethodSelect('stripe')}
                className="sr-only"
              />
              <div className={`w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-full mr-2 sm:mr-3 flex items-center justify-center flex-shrink-0 ${
                selectedPaymentMethod === 'stripe' 
                  ? 'border-blue-600 bg-blue-600' 
                  : 'border-gray-300'
              }`}>
                {selectedPaymentMethod === 'stripe' && (
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                )}
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-sm sm:text-base">{t('scholarshipConfirmationModal.payment.stripe.title')}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.stripe.description')}</div>
                </div>
              </div>
            </label>

            {/* Zelle Option */}
            <label className="relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
              <input
                type="radio"
                name="payment-method"
                value="zelle"
                checked={selectedPaymentMethod === 'zelle'}
                onChange={() => handlePaymentMethodSelect('zelle')}
                className="sr-only"
              />
              <div className={`w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-full mr-2 sm:mr-3 flex items-center justify-center flex-shrink-0 ${
                selectedPaymentMethod === 'zelle' 
                  ? 'border-blue-600 bg-blue-600' 
                  : 'border-gray-300'
              }`}>
                {selectedPaymentMethod === 'zelle' && (
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                )}
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <ZelleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-sm sm:text-base">{t('scholarshipConfirmationModal.payment.zelle.title')}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.zelle.description')}</div>
                </div>
              </div>
            </label>

            {/* PIX Option (if available) */}
            {onPixCheckout && (
              <label className="relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
                <input
                  type="radio"
                  name="payment-method"
                  value="pix"
                  checked={selectedPaymentMethod === 'pix'}
                  onChange={() => handlePaymentMethodSelect('pix')}
                  className="sr-only"
                />
                <div className={`w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-full mr-2 sm:mr-3 flex items-center justify-center flex-shrink-0 ${
                  selectedPaymentMethod === 'pix' 
                    ? 'border-blue-600 bg-blue-600' 
                    : 'border-gray-300'
                }`}>
                  {selectedPaymentMethod === 'pix' && (
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <PixIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm sm:text-base">{t('scholarshipConfirmationModal.payment.pix.title')}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.pix.description')}</div>
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* ZelleCheckout inline quando Zelle for selecionado e há callback */}
        {showZelleInline && (
          <div className="mt-4">
            <ZelleCheckout
              feeType={feeType}
              amount={feeAmount}
              scholarshipsIds={[scholarship.id]}
              onSuccess={() => {
                // Chamar callback de sucesso se fornecido
                if (onZelleSuccess) {
                  onZelleSuccess();
                }
                onClose();
              }}
              metadata={
                zelleMetadata || (feeType === 'application_fee'
                  ? {
                      application_fee_amount: feeAmount,
                      selected_scholarship_id: scholarship.id
                    }
                  : {
                      selected_scholarship_id: scholarship.id
                    })
              }
            />
          </div>
        )}
      </div>

      {/* Footer - esconder quando Zelle está sendo processado inline */}
      {!showZelleInline && (
        <>
          {isInDrawer ? (
            <DrawerFooter className="flex-row gap-2">
              <DrawerClose className="flex-1 bg-white text-gray-700 py-2.5 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
                {t('scholarshipConfirmationModal.payment.cancel')}
              </DrawerClose>
              <button
                onClick={handleProceed}
                disabled={!canProceed || isProcessing || submitting}
                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isProcessing || submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('scholarshipConfirmationModal.loading.processing')}
                  </div>
                ) : (
                  modalContent.buttonText
                )}
              </button>
            </DrawerFooter>
          ) : (
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex gap-2 sm:gap-3 flex-shrink-0 border-t border-gray-100">
              <button
                onClick={onClose}
                disabled={isProcessing || submitting}
                className="flex-1 bg-white text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                {t('scholarshipConfirmationModal.payment.cancel')}
              </button>
              
              <button
                onClick={handleProceed}
                disabled={!canProceed || isProcessing || submitting}
                className="flex-1 bg-blue-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {isProcessing || submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('scholarshipConfirmationModal.loading.processing')}
                  </div>
                ) : (
                  modalContent.buttonText
                )}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );

  // Usar Drawer em mobile, Dialog em desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh] bg-white">
          <ModalContent isInDrawer={true} />
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4 z-30">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0 max-h-[80vh] flex flex-col">
          <ModalContent isInDrawer={false} />
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
