import React from 'react';
import { AlertCircle, CheckCircle, Lock, Tag } from 'lucide-react';

interface ModalContentProps {
  productName: string;
  computedBasePrice: number;
  hasUsedReferralCode: boolean;
  hasSellerReferralCode: boolean;
  activeDiscount: any;
  hasReferralCode: boolean;
  showCodeStep: boolean;
  setHasReferralCode: (value: boolean) => void;
  setDiscountCode: (value: string) => void;
  setValidationResult: (value: any) => void;
  setCodeApplied: (value: boolean) => void;
  setShowCodeStep: (value: boolean) => void;
  discountCode: string;
  hasAffiliateCode: boolean;
  validateDiscountCode: () => void;
  isValidating: boolean;
  validationResult: any;
  termsAccepted: boolean;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProceed: () => void;
  isLoading: boolean;
  t: any;
}

export const ModalContent: React.FC<ModalContentProps> = ({
  productName,
  computedBasePrice,
  hasUsedReferralCode,
  hasSellerReferralCode,
  activeDiscount,
  hasReferralCode,
  showCodeStep,
  setHasReferralCode,
  setDiscountCode,
  setValidationResult,
  setCodeApplied,
  setShowCodeStep,
  discountCode,
  hasAffiliateCode,
  validateDiscountCode,
  isValidating,
  validationResult,
  termsAccepted,
  handleCheckboxChange,
  handleProceed,
  isLoading,
  t,
  promotionalCouponApplied
}: ModalContentProps & {
  promotionalCouponApplied?: {
    discountAmount: number;
    finalAmount: number;
    code?: string;
  } | null;
}) => {
  
  return (
  <div className="space-y-4 sm:space-y-6 bg-white min-h-full">
    {/* Product Info */}
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border-0">
      <div className="text-center">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">{productName}</h3>
        <div className="mb-3">
          {promotionalCouponApplied ? (
            <>
              <div className="text-3xl font-bold text-blue-700">
                ${promotionalCouponApplied.finalAmount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Valor com desconto
              </p>
              <p className="text-xs text-gray-500 mt-1 line-through">
                ${(promotionalCouponApplied.finalAmount + promotionalCouponApplied.discountAmount).toFixed(2)} Valor original
              </p>
              <div className="flex items-center justify-center mt-2">
                <Tag className="h-3 w-3 text-green-600 mr-1" />
                <span className="text-xs text-green-600 font-medium">
                  Cupom {promotionalCouponApplied.code} aplicado! -${promotionalCouponApplied.discountAmount.toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-blue-700">
                ${computedBasePrice.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {t('preCheckoutModal.totalAmount')}
              </p>
            </>
          )}
        </div>
        
        <div className="inline-flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full mt-3">
          <Lock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">{t('preCheckoutModal.securePaymentGateway')}</span>
        </div>
      </div>
    </div>

    {/* Discount Code Section */}
    {(!hasUsedReferralCode && !hasSellerReferralCode) || activeDiscount?.has_discount ? (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('preCheckoutModal.referralCode')}
          </h3>
        </div>

        {activeDiscount?.has_discount ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="text-green-800 font-semibold">{t('preCheckoutModal.codeAlreadyUsed')}</p>
                <p className="text-green-600 text-sm">{t('preCheckoutModal.discountAlreadyApplied')}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ✅ CORREÇÃO: Se não tem seller_referral_code, mostrar campo diretamente (sem checkbox) */}
            {!hasSellerReferralCode ? (
              <div className="space-y-3">
                {/* Campo de input com botão de validar ao lado */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder={t('preCheckoutModal.placeholder')}
                    readOnly={!!hasAffiliateCode}
                    className={`flex-1 px-4 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center font-mono text-base sm:text-lg tracking-wider ${
                      hasAffiliateCode 
                        ? 'border-green-300 bg-green-50 cursor-not-allowed' 
                        : 'border-gray-300'
                    }`}
                    style={{ fontSize: '16px' }}
                    maxLength={8}
                  />
                  {!hasAffiliateCode && (
                    <button
                      onClick={validateDiscountCode}
                      disabled={isValidating || !discountCode.trim()}
                      className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
                    >
                      {isValidating ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="hidden sm:inline">{t('preCheckoutModal.validating')}</span>
                        </div>
                      ) : (
                        t('preCheckoutModal.validate')
                      )}
                    </button>
                  )}
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
              /* Se tem seller_referral_code, não mostrar nada (comportamento anterior) */
              null
            )}
          </>
        )}
      </div>
    ) : !hasSellerReferralCode && (
      <div className="bg-green-50 rounded-xl p-6 text-center border-0">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <span className="text-xl font-bold text-green-800">
            {t('preCheckoutModal.codeAlreadyUsed')}
          </span>
        </div>
        <p className="text-green-700 text-base">
          {t('preCheckoutModal.discountAlreadyApplied')}
        </p>
      </div>
    )}

    {/* Terms acceptance */}
    <div className="flex items-start space-x-3 p-3 sm:p-4 bg-slate-100 rounded-2xl">
      <input
        id="termsAccepted"
        name="termsAccepted"
        type="checkbox"
        checked={termsAccepted}
        onChange={handleCheckboxChange}
        className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
      />
      <label htmlFor="termsAccepted" className="text-xs sm:text-sm text-slate-700 leading-relaxed cursor-pointer">
        {t('preCheckoutModal.acceptContractTerms')}
      </label>
    </div>

    {/* Footer */}
    <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-2xl">
      <button
        onClick={handleProceed}
        disabled={isLoading || !termsAccepted || (!hasSellerReferralCode && discountCode.trim() && !(validationResult?.isValid) && !activeDiscount?.has_discount)}
        className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base ${
          validationResult?.isValid
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
        } ${isLoading || !termsAccepted || (!hasSellerReferralCode && discountCode.trim() && !(validationResult?.isValid) && !activeDiscount?.has_discount) ? 'opacity-75 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>{t('preCheckoutModal.processingPayment')}</span>
          </div>
        ) : (validationResult?.isValid || activeDiscount?.has_discount) ? (
          t('preCheckoutModal.applyCodeAndContinue')
        ) : (
          t('preCheckoutModal.goToPayment')
        )}
      </button>
    </div>
  </div>
);
};