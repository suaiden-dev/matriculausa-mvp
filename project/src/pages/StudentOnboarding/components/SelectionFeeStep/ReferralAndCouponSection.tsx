import React, { useRef } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ValidationResult, PromotionalCouponValidation } from './types';

interface ReferralAndCouponSectionProps {
  // Referral code
  hasReferralCode: boolean;
  setHasReferralCode: (v: boolean) => void;
  showCodeStep: boolean;
  setShowCodeStep: (v: boolean) => void;
  discountCode: string;
  setDiscountCode: (v: string) => void;
  codeApplied: boolean;
  setCodeApplied: (v: boolean) => void;
  validationResult: ValidationResult | null;
  setValidationResult: (v: ValidationResult | null) => void;
  isValidating: boolean;
  activeDiscount: any;
  hasAffiliateCode: boolean | null | undefined;
  validateDiscountCode: () => Promise<void>;
  // Promotional coupon
  promotionalCoupon: string;
  setPromotionalCoupon: (v: string) => void;
  promotionalCouponValidation: PromotionalCouponValidation | null;
  isValidatingPromotionalCoupon: boolean;
  validatePromotionalCoupon: () => Promise<void>;
  removePromotionalCoupon: () => Promise<void>;
  selectionFeeAmount: number;
  t: (key: string) => string;
}

export const ReferralAndCouponSection: React.FC<ReferralAndCouponSectionProps> = ({
  hasReferralCode,
  setHasReferralCode,
  showCodeStep,
  setShowCodeStep,
  discountCode,
  setDiscountCode,
  codeApplied,
  setCodeApplied,
  validationResult,
  setValidationResult,
  isValidating,
  activeDiscount,
  hasAffiliateCode,
  validateDiscountCode,
  promotionalCoupon,
  setPromotionalCoupon,
  promotionalCouponValidation,
  isValidatingPromotionalCoupon,
  validatePromotionalCoupon,
  removePromotionalCoupon,
  selectionFeeAmount,
  t,
}) => {
  const promotionalCouponInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-6 space-y-4">
      {/* Checkbox para perguntar se tem código - só aparece se não tem desconto ativo e não tem código aplicado */}
      {!activeDiscount?.has_discount && !codeApplied && (
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <label htmlFor="hasReferralCode" className="checkbox-container cursor-pointer flex-shrink-0">
            <input
              id="hasReferralCode"
              name="hasReferralCode"
              type="checkbox"
              checked={hasReferralCode}
              onChange={(e) => {
                setHasReferralCode(e.target.checked);
                if (!e.target.checked) {
                  setDiscountCode('');
                  setValidationResult(null);
                  setCodeApplied(false);
                  setShowCodeStep(false);
                } else {
                  setShowCodeStep(true);
                }
              }}
              className="custom-checkbox"
            />
            <div className="checkmark" />
          </label>
          <label htmlFor="hasReferralCode" className="text-sm sm:text-base font-medium text-gray-700 leading-relaxed cursor-pointer flex-1">
            {t('preCheckoutModal.haveReferralCode') || 'Eu tenho um código de indicação'}
          </label>
        </div>
      )}

      {/* Campo de input - aparece se checkbox marcado OU se já tem código aplicado */}
      {((hasReferralCode && showCodeStep) || (activeDiscount?.has_discount && discountCode) || (codeApplied && discountCode)) && (
        <div className="pt-4 flex flex-col xl:flex-row xl:justify-center gap-12">
          {/* Referral Code */}
          <div className="space-y-4 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                {t('selectionFeeStep.main.referralCode.title')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('selectionFeeStep.main.referralCode.subtitle')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 group/input">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => {
                      if (!activeDiscount?.has_discount && !codeApplied) {
                        setDiscountCode(e.target.value.toUpperCase());
                      }
                    }}
                    placeholder={t('preCheckoutModal.placeholder') || 'Digite o código'}
                    readOnly={!!activeDiscount?.has_discount || !!hasAffiliateCode || codeApplied}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-center font-black text-gray-900 text-lg tracking-[0.2em] placeholder:text-gray-300"
                    maxLength={8}
                  />
                  {(activeDiscount?.has_discount || codeApplied) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500" />
                </div>

                {!activeDiscount?.has_discount && !hasAffiliateCode && !codeApplied && (
                  <button
                    onClick={validateDiscountCode}
                    disabled={isValidating || !discountCode.trim()}
                    className={`px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 whitespace-nowrap sm:w-auto w-full ${
                      isValidating || !discountCode.trim()
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                    }`}
                  >
                    {isValidating ? (
                      <div className="flex items-center space-x-2 justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t('preCheckoutModal.validating') || 'Validando...'}</span>
                      </div>
                    ) : (
                      t('selectionFeeStep.main.referralCode.validate')
                    )}
                  </button>
                )}
              </div>
            </div>

            {validationResult && !validationResult.isValid && (
              <p className="text-sm text-red-600 text-center">{validationResult.message}</p>
            )}
          </div>

          {/* Promotional Coupon */}
          <div className="space-y-4 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                {t('selectionFeeStep.main.promotionalCoupon.title')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('selectionFeeStep.main.promotionalCoupon.subtitle')}
              </p>
            </div>

            <div className="space-y-3">
              {promotionalCouponValidation?.isValid ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                          {t('selectionFeeStep.main.promotionalCoupon.couponApplied')}
                        </span>
                        <span className="text-lg font-black text-gray-800 uppercase tracking-tight">{promotionalCoupon}</span>
                      </div>
                    </div>
                    <button
                      onClick={removePromotionalCoupon}
                      className="px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-gray-100 hover:border-red-100"
                    >
                      {t('selectionFeeStep.main.promotionalCoupon.remove')}
                    </button>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-100 relative z-10">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                      <span>{t('selectionFeeStep.main.promotionalCoupon.originalPrice')}</span>
                      <span className="line-through text-gray-300">${selectionFeeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                      <span>{t('selectionFeeStep.main.promotionalCoupon.discount')}</span>
                      <span className="text-emerald-500">-${promotionalCouponValidation.discountAmount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black uppercase tracking-tight pt-3 text-gray-900">
                      <span>{t('selectionFeeStep.main.promotionalCoupon.totalFinal')}</span>
                      <span className="text-emerald-500">${promotionalCouponValidation.finalAmount?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 group/input">
                      <input
                        ref={promotionalCouponInputRef}
                        type="text"
                        value={promotionalCoupon}
                        onChange={(e) => {
                          const newValue = e.target.value.toUpperCase();
                          const cursorPosition = e.target.selectionStart;
                          setPromotionalCoupon(newValue);
                          requestAnimationFrame(() => {
                            if (promotionalCouponInputRef.current) {
                              promotionalCouponInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                              promotionalCouponInputRef.current.focus();
                            }
                          });
                        }}
                        placeholder={t('preCheckoutModal.placeholder') || 'Digite o código'}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-center font-black text-gray-900 text-lg tracking-[0.2em] placeholder:text-gray-300"
                        maxLength={20}
                        autoComplete="off"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500" />
                    </div>
                    <button
                      onClick={validatePromotionalCoupon}
                      disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()}
                      className={`px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 whitespace-nowrap sm:w-auto w-full ${
                        isValidatingPromotionalCoupon || !promotionalCoupon.trim()
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                      }`}
                    >
                      {isValidatingPromotionalCoupon ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{t('selectionFeeStep.main.promotionalCoupon.validating')}</span>
                        </div>
                      ) : (
                        t('selectionFeeStep.main.referralCode.validate')
                      )}
                    </button>
                  </div>

                  {promotionalCouponValidation && !promotionalCouponValidation.isValid && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 backdrop-blur-md">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-400 font-medium">{promotionalCouponValidation.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
