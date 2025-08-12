import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Gift, AlertCircle, CheckCircle, CreditCard, Shield, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface PreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: (discountCode?: string) => void;
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee';
  productName: string;
  productPrice: number;
}

export const PreCheckoutModal: React.FC<PreCheckoutModalProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
  feeType,
  productName,
  productPrice
}) => {
  const { user } = useAuth();
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    isSelfReferral?: boolean;
  } | null>(null);
  const [hasUsedReferralCode, setHasUsedReferralCode] = useState(false);
  const [codeApplied, setCodeApplied] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset all state when modal opens
      setDiscountCode('');
      setValidationResult(null);
      setIsValidating(false);
      setCodeApplied(false);
      checkReferralCodeUsage();
    } else {
      // Clean up state when modal closes
      setDiscountCode('');
      setValidationResult(null);
      setIsValidating(false);
      setCodeApplied(false);
    }
  }, [isOpen]);

  // Clean up state when component unmounts
  useEffect(() => {
    return () => {
      setDiscountCode('');
      setValidationResult(null);
      setIsValidating(false);
      setCodeApplied(false);
    };
  }, []);

  // Check if user already used referral code
  const checkReferralCodeUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('used_referral_codes')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasUsedReferralCode(true);
      }
    } catch (error) {
      console.error('Error checking referral code usage:', error);
    }
  };

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setValidationResult({
        isValid: false,
        message: 'Please enter a referral code'
      });
      return;
    }

    console.log('🔍 [PreCheckoutModal] Validando código de desconto:', discountCode);
    setIsValidating(true);
    setValidationResult(null);

    try {
      // Check if code exists and is active
      const { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes')
        .select('user_id, code, is_active')
        .eq('code', discountCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (affiliateError || !affiliateCodeData) {
        console.log('🔍 [PreCheckoutModal] ❌ Código inválido ou inativo');
        setValidationResult({
          isValid: false,
          message: 'Invalid or inactive referral code'
        });
        return;
      }

      // Check if not self-referral
      if (affiliateCodeData.user_id === user?.id) {
        console.log('🔍 [PreCheckoutModal] ❌ Auto-referência detectada');
        setValidationResult({
          isValid: false,
          message: 'You cannot use your own referral code',
          isSelfReferral: true
        });
        return;
      }

      // Check if user already used any code
      if (hasUsedReferralCode) {
        console.log('🔍 [PreCheckoutModal] ❌ Usuário já usou código anteriormente');
        setValidationResult({
          isValid: false,
          message: 'You have already used a referral code previously'
        });
        return;
      }

      // Valid code
      console.log('🔍 [PreCheckoutModal] ✅ Código válido, aplicando desconto...');
      setValidationResult({
        isValid: true,
        message: 'Valid referral code! You will receive a $50 discount.',
        discountAmount: 50
      });
      setCodeApplied(true);

    } catch (error) {
      console.error('🔍 [PreCheckoutModal] Erro ao validar código:', error);
      setValidationResult({
        isValid: false,
        message: 'Error validating code. Please try again.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleProceed = () => {
    console.log('🔍 [PreCheckoutModal] handleProceed chamado');
    console.log('🔍 [PreCheckoutModal] validationResult:', validationResult);
    console.log('🔍 [PreCheckoutModal] discountCode:', discountCode);
    console.log('🔍 [PreCheckoutModal] codeApplied:', codeApplied);
    
    if (validationResult?.isValid && discountCode.trim() && codeApplied) {
      console.log('🔍 [PreCheckoutModal] ✅ Aplicando código e continuando para checkout');
      onProceedToCheckout(discountCode.trim().toUpperCase());
    } else {
      console.log('🔍 [PreCheckoutModal] ⚠️ Continuando sem código de desconto');
      onProceedToCheckout();
    }
    onClose();
  };

  const handleSkip = () => {
    onProceedToCheckout();
    onClose();
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <Dialog.Title className="text-2xl font-bold">
                  Secure Payment
                </Dialog.Title>
                <p className="text-blue-100">
                  You will be redirected to Stripe to complete your payment
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Product Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-0">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{productName}</h3>
                <div className="inline-flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Secure payment via Stripe</span>
                </div>
              </div>
            </div>

            {/* Discount Code Input */}
            {!hasUsedReferralCode ? (
              <div className="space-y-4">
                <div className="text-center">
                  <label className="block text-lg font-semibold text-gray-900 mb-2">
                    Referral Code
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter another student's code to get a $50 discount
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Ex: MATR1234"
                    className="flex-1 px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center font-mono text-lg tracking-wider"
                    maxLength={8}
                  />
                  <button
                    onClick={validateDiscountCode}
                    disabled={isValidating || !discountCode.trim()}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {isValidating ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Validating...</span>
                      </div>
                    ) : (
                      'Validate'
                    )}
                  </button>
                </div>
                
                {/* Validation Result */}
                {validationResult && (
                  <div className={`p-4 rounded-xl border-2 ${
                    validationResult.isValid 
                      ? 'bg-green-50 border-green-300 text-green-800' 
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {validationResult.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium text-sm">{validationResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 rounded-xl p-6 text-center border-0">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <span className="text-xl font-bold text-green-800">
                    Code already used!
                  </span>
                </div>
                <p className="text-green-700 text-base">
                  The discount is already applied to your profile.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 px-6 py-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Continue without code
            </button>
            <button
              onClick={handleProceed}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 ${
                validationResult?.isValid && codeApplied
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {validationResult?.isValid && codeApplied ? 'Apply code and continue' : 'Go to payment'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
