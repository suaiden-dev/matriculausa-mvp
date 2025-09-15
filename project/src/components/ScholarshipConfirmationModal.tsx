import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, Smartphone, CheckCircle, X } from 'lucide-react';
import { Scholarship } from '../types';
import { formatCentsToDollars } from '../utils/currency';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useTranslation } from 'react-i18next';

interface ScholarshipConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholarship: Scholarship;
  onStripeCheckout: () => void;
  isProcessing?: boolean;
  feeType?: 'application_fee' | 'scholarship_fee'; // Novo prop para identificar o tipo de taxa
}

export const ScholarshipConfirmationModal: React.FC<ScholarshipConfirmationModalProps> = ({
  isOpen,
  onClose,
  scholarship,
  onStripeCheckout,
  isProcessing = false,
  feeType = 'application_fee' // Default para application fee
}) => {
  const navigate = useNavigate();
  const { getFeeAmount: getFeeAmountFromConfig, formatFeeAmount } = useFeeConfig();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | null>(null);
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(false);

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

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Valor dinâmico baseado no tipo de taxa
  const getFeeAmount = () => {
    if (feeType === 'scholarship_fee') {
      return scholarship.scholarship_fee_amount || getFeeAmountFromConfig('scholarship_fee') * 100; // Usar valor do useFeeConfig (em centavos)
    }
    
    // Para application fee, usar o valor real da bolsa ou valor padrão se não existir
    let applicationFeeAmount = scholarship.application_fee_amount;
    
    // Se não houver valor definido pela universidade, usar valor padrão
    if (!applicationFeeAmount) {
      applicationFeeAmount = 35000; // $350.00 em centavos (valor padrão)
    }
    
    // Se o valor for maior que 1000, provavelmente está em centavos, converter para dólares
    if (applicationFeeAmount > 1000) {
      applicationFeeAmount = applicationFeeAmount / 100;
    }
    
    return applicationFeeAmount;
  };

  const feeAmount = getFeeAmount();
  
  // Nome da universidade - usa o relacionamento ou campo denormalizado
  const universityName = scholarship.universities?.name || scholarship.university_name || 'University';

  // Títulos e textos dinâmicos baseados no tipo de taxa
  const getModalContent = () => {
    if (feeType === 'scholarship_fee') {
      return {
        title: t('scholarshipConfirmationModal.scholarshipFee.title'),
        subtitle: t('scholarshipConfirmationModal.scholarshipFee.subtitle'),
        feeLabel: t('scholarshipConfirmationModal.scholarshipFee.feeLabel'),
        feeDescription: t('scholarshipConfirmationModal.scholarshipFee.feeDescription'),
        buttonText: t('scholarshipConfirmationModal.scholarshipFee.buttonText', { amount: getFeeAmountFromConfig('scholarship_fee') }),
        warningText: t('scholarshipConfirmationModal.scholarshipFee.warningText')
      };
    }
    
    return {
      title: t('scholarshipConfirmationModal.applicationFee.title'),
      subtitle: t('scholarshipConfirmationModal.applicationFee.subtitle'),
      feeLabel: t('scholarshipConfirmationModal.applicationFee.feeLabel'),
      feeDescription: t('scholarshipConfirmationModal.applicationFee.feeDescription'),
      buttonText: t('scholarshipConfirmationModal.applicationFee.buttonText', { amount: feeAmount.toFixed(2) }),
      warningText: t('scholarshipConfirmationModal.applicationFee.warningText')
    };
  };

  const modalContent = getModalContent();

  const handlePaymentMethodSelect = (method: 'stripe' | 'zelle') => {
    setSelectedPaymentMethod(method);
  };

  const handleProceed = async () => {
    if (!selectedPaymentMethod) return;

    try {
      setSubmitting(true);
      if (selectedPaymentMethod === 'stripe') {
        onStripeCheckout();
      } else if (selectedPaymentMethod === 'zelle') {
        const params = new URLSearchParams({
          feeType: feeType,
          amount: feeAmount.toString(),
          scholarshipsIds: scholarship.id
        });
        
        // Adicionar campos específicos baseados no tipo de taxa
        if (feeType === 'application_fee') {
          params.append('applicationFeeAmount', feeAmount.toString());
        } else if (feeType === 'scholarship_fee') {
          params.append('scholarshipFeeAmount', feeAmount.toString());
        }
        
        navigate(`/checkout/zelle?${params.toString()}`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = selectedPaymentMethod !== null;

  // Renderização simplificada para scholarship fee
  if (feeType === 'scholarship_fee') {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" aria-hidden="true" />
        
        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4 z-30">
          <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0">
            {/* Loading Overlay (anti-flicker) */}
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
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
              <button
                onClick={onClose}
                disabled={isProcessing || submitting}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                title={t('common.close')}
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <Dialog.Title className="text-xl font-bold">
                    {modalContent.title}
                  </Dialog.Title>
                  <p className="text-blue-100 text-sm">
                    {modalContent.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Scholarship Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{t('scholarshipConfirmationModal.labels.selectedScholarship')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('scholarshipConfirmationModal.labels.scholarship')}:</span>
                    <span className="font-medium text-gray-900">{scholarship.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('scholarshipConfirmationModal.labels.university')}:</span>
                    <span className="font-medium text-gray-900">{universityName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{modalContent.feeLabel}</span>
                    <span className="font-bold text-lg text-green-600">${formatCentsToDollars(feeAmount * 100)} USD</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">{t('scholarshipConfirmationModal.labels.choosePaymentMethod')}</h3>
                
                <div className="grid gap-3">
                  {/* Stripe Option */}
                  <label className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
                    <input
                      type="radio"
                      name="payment-method"
                      value="stripe"
                      checked={selectedPaymentMethod === 'stripe'}
                      onChange={() => handlePaymentMethodSelect('stripe')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${
                      selectedPaymentMethod === 'stripe' 
                        ? 'border-blue-600 bg-blue-600' 
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'stripe' && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{t('scholarshipConfirmationModal.payment.stripe.title')}</div>
                        <div className="text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.stripe.description')}</div>
                      </div>
                    </div>
                  </label>

                  {/* Zelle Option */}
                  <label className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
                    <input
                      type="radio"
                      name="payment-method"
                      value="zelle"
                      checked={selectedPaymentMethod === 'zelle'}
                      onChange={() => handlePaymentMethodSelect('zelle')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${
                      selectedPaymentMethod === 'zelle' 
                        ? 'border-blue-600 bg-blue-600' 
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'zelle' && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Smartphone className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{t('scholarshipConfirmationModal.payment.zelle.title')}</div>
                        <div className="text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.zelle.description')}</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing || submitting}
                className="flex-1 bg-white text-gray-700 py-3 px-6 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              
              <button
                onClick={handleProceed}
                disabled={!canProceed || isProcessing || submitting}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing || submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('common.processing')}
                  </div>
                ) : (
                  modalContent.buttonText
                )}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Modal completo para application fee (com referral code e outros campos)
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" aria-hidden="true" />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-end sm:items-center justify-center z-30">
        <Dialog.Panel className="w-full h-full sm:h-auto sm:max-w-2xl bg-white  md:rounded-2xl shadow-2xl overflow-hidden relative border-0 sm:max-h-[90vh] flex flex-col">
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
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 sm:p-6 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={isProcessing || submitting}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              title={t('common.close')}
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <Dialog.Title className="text-2xl font-bold">
                  {modalContent.title}
                </Dialog.Title>
                <p className="text-blue-100">
                  {modalContent.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
            {/* Scholarship Info */}
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
              <h3 className="font-semibold text-gray-900 mb-2">{t('scholarshipConfirmationModal.labels.selectedScholarship')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('scholarshipConfirmationModal.labels.scholarship')}:</span>
                  <span className="font-medium text-gray-900">{scholarship.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('scholarshipConfirmationModal.labels.university')}:</span>
                  <span className="font-medium text-gray-900">{universityName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{modalContent.feeLabel}</span>
                  <span className="font-bold text-lg text-green-600">${feeAmount.toFixed(2)} USD</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {modalContent.feeDescription}
                </div>
              </div>
            </div>

            {/* Important Decision Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">{t('scholarshipConfirmationModal.labels.importantDecision')}</h4>
                  <p className="text-sm text-yellow-700">
                    {modalContent.warningText}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">{t('scholarshipConfirmationModal.labels.choosePaymentMethod')}</h3>
              
              <div className="grid gap-3">
                {/* Stripe Option */}
                <label className="relative flex items-center p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
                  <input
                    type="radio"
                    name="payment-method"
                    value="stripe"
                    checked={selectedPaymentMethod === 'stripe'}
                    onChange={() => handlePaymentMethodSelect('stripe')}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${
                    selectedPaymentMethod === 'stripe' 
                      ? 'border-blue-600 bg-blue-600' 
                      : 'border-gray-300'
                  }`}>
                    {selectedPaymentMethod === 'stripe' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{t('scholarshipConfirmationModal.payment.stripe.title')}</div>
                      <div className="text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.stripe.description')}</div>
                    </div>
                  </div>
                </label>

                {/* Zelle Option */}
                <label className="relative flex items-center p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
                  <input
                    type="radio"
                    name="payment-method"
                    value="zelle"
                    checked={selectedPaymentMethod === 'zelle'}
                    onChange={() => handlePaymentMethodSelect('zelle')}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${
                    selectedPaymentMethod === 'zelle' 
                      ? 'border-blue-600 bg-blue-600' 
                      : 'border-gray-300'
                  }`}>
                    {selectedPaymentMethod === 'zelle' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{t('scholarshipConfirmationModal.payment.zelle.title')}</div>
                      <div className="text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.zelle.descriptionDetailed')}</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-3 sm:px-6 py-2 sm:py-4 flex gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={isProcessing || submitting}
              className="flex-1 bg-white text-gray-700 py-2 px-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
            >
              {t('scholarshipConfirmationModal.labels.thinkAboutIt')}
            </button>
            
            <button
              onClick={handleProceed}
              disabled={!canProceed || isProcessing || submitting}
              className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {(isProcessing || submitting) ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('common.processing')}
                </div>
              ) : (
                modalContent.buttonText
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
