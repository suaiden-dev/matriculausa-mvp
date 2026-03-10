import React from 'react';
import { Dialog } from '@headlessui/react';
import { AlertCircle, CheckCircle, Shield, X } from 'lucide-react';
import { StepProps } from '../../types';
import { ZelleCheckout } from '../../../../components/ZelleCheckout';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { useSelectionFeeStep } from './useSelectionFeeStep';
import { MobileTermsView } from './MobileTermsView';
import { TermsModal } from './TermsModal';
import { PaymentMethodButton } from './PaymentMethodButton';
import { ReferralAndCouponSection } from './ReferralAndCouponSection';
import { StripeIcon, PixIcon, ParcelowIcon, ZelleIcon } from './PaymentIcons';

export const SelectionFeeStep: React.FC<StepProps> = ({ onNext }) => {
  const state = useSelectionFeeStep(onNext);

  const {
    t, navigate, user, userProfile,
    loading, error, selectedMethod, setSelectedMethod,
    showZelleCheckout, setShowZelleCheckout, setZellePaymentSubmitted, isZelleProcessing, setIsZelleProcessing,
    termsAccepted, hasAcceptedTermsInDB, showTermsModal, setShowTermsModal,
    showTermsInDrawer, setShowTermsInDrawer, activeTerm, loadingTerms,
    exchangeRate, discountCode, setDiscountCode, isValidating, validationResult, setValidationResult,
    hasReferralCode, setHasReferralCode, showCodeStep, setShowCodeStep,
    showCpfModal, setShowCpfModal, codeApplied, setCodeApplied,
    showInlineCpf, setShowInlineCpf, inlineCpf, setInlineCpf, savingCpf, cpfError, setCpfError,
    promotionalCoupon, setPromotionalCoupon, isValidatingPromotionalCoupon, promotionalCouponValidation, setPromotionalCouponValidation,
    selectionFeeAmount, computedBasePrice, formattedAmount, originalFormattedAmount, cardAmountWithFees, pixAmountWithFees,
    hasSellerReferralCode, hasAffiliateCode, hasZellePendingSelectionFee, hasPaid,
    isBlocked, pendingPayment, rejectedPayment, paymentBlockedLoading, refetchPaymentStatus,
    activeDiscount,
    handleCheckout, handleCheckboxChange, handleTermsClick,
    validateDiscountCode, validatePromotionalCoupon, removePromotionalCoupon,
    saveCpfAndCheckout, formatCpf, refetchUserProfile, setError,
  } = state;

  const paymentMethods = [
    { id: 'stripe' as const, name: t('selectionFeeStep.main.methods.stripe'), description: t('selectionFeeStep.main.processingFees.card'), icon: StripeIcon },
    { id: 'pix' as const, name: 'PIX', description: t('selectionFeeStep.main.processingFees.pix'), icon: PixIcon },
    { id: 'parcelow' as const, name: 'Parcelow', description: t('selectionFeeStep.main.parcelowInstallments'), icon: ParcelowIcon },
    { id: 'zelle' as const, name: 'Zelle', description: t('selectionFeeStep.main.processingFees.zelle'), icon: ZelleIcon, requiresVerification: true },
  ];

  // ── Paid state ─────────────────────────────────────────────────────────────
  if (hasPaid) {
    return (
      <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
        <div className="text-left space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t('selectionFeeStep.paid.title')}</h2>
        </div>
        <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          <div className="relative z-10 text-center py-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">{t('selectionFeeStep.paid.paidTitle')}</h3>
            <p className="text-gray-500 mb-8 font-medium">{t('selectionFeeStep.paid.paidSubtitle')}</p>
            <button onClick={onNext} className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto">
              {t('selectionFeeStep.paid.continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 sm:space-y-10 pb-12">
      <div className="space-y-6">
        <div className="text-left">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 uppercase tracking-tighter">{t('selectionFeeStep.main.title')}</h2>
          <p className="text-lg md:text-xl text-slate-600 font-medium">{t('selectionFeeStep.main.subtitle')}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2.0rem] sm:rounded-[2.5rem] p-3 sm:p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

          {/* Referral & Coupon section */}
          {!hasSellerReferralCode && !hasZellePendingSelectionFee && (
            <ReferralAndCouponSection
              hasReferralCode={hasReferralCode}
              setHasReferralCode={setHasReferralCode}
              showCodeStep={showCodeStep}
              setShowCodeStep={setShowCodeStep}
              discountCode={discountCode}
              setDiscountCode={setDiscountCode}
              codeApplied={codeApplied}
              setCodeApplied={setCodeApplied}
              validationResult={validationResult}
              setValidationResult={setValidationResult}
              isValidating={isValidating}
              activeDiscount={activeDiscount}
              hasAffiliateCode={hasAffiliateCode}
              validateDiscountCode={validateDiscountCode}
              promotionalCoupon={promotionalCoupon}
              setPromotionalCoupon={setPromotionalCoupon}
              promotionalCouponValidation={promotionalCouponValidation}
              isValidatingPromotionalCoupon={isValidatingPromotionalCoupon}
              validatePromotionalCoupon={validatePromotionalCoupon}
              removePromotionalCoupon={removePromotionalCoupon}
              selectionFeeAmount={selectionFeeAmount}
              t={t}
            />
          )}

          {/* Terms checkbox */}
          {!hasZellePendingSelectionFee && (
            <div className="mb-12">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg group/terms hover:bg-gray-100/50 transition-colors duration-300">
                <label htmlFor="termsAccepted" className={`checkbox-container ${hasAcceptedTermsInDB ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} flex-shrink-0`}>
                  <input
                    id="termsAccepted" name="termsAccepted" type="checkbox"
                    checked={termsAccepted} onChange={handleCheckboxChange}
                    disabled={hasAcceptedTermsInDB} className="custom-checkbox"
                  />
                  <div className="checkmark border-gray-300" />
                </label>
                <div className="text-sm sm:text-base font-medium text-gray-700 leading-relaxed flex-1 cursor-default group-hover/terms:text-gray-900 transition-colors">
                  <span className="text-red-500 font-bold mr-1">*</span>
                  Eu aceito os{' '}
                  <span onClick={handleTermsClick} className="text-blue-600 font-bold underline hover:text-blue-700 cursor-pointer">
                    {t('preCheckoutModal.termsAndConditions.title') || 'termos e condições'}
                  </span>
                  {' '}do contrato de prestação de serviços.
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Skeleton loading */}
          {paymentBlockedLoading && !isBlocked && (!rejectedPayment || rejectedPayment.id === undefined) ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-gray-200 rounded" />
                      <div className="h-4 w-48 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (hasZellePendingSelectionFee || showZelleCheckout) ? (
            /* Zelle checkout inline */
            <div className={`flex flex-col gap-0 ${hasZellePendingSelectionFee ? '' : 'space-y-6 sm:bg-white sm:border sm:border-gray-100 sm:rounded-3xl py-4 pb-1 sm:p-6 sm:shadow-xl relative overflow-hidden'}`}>
              {hasZellePendingSelectionFee && (
                <div className="bg-amber-50 border border-amber-200 rounded-t-[2rem] px-6 py-4 flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-amber-700 uppercase tracking-tight">{t('selectionFeeStep.main.zelleProcessing.title')}</p>
                    <p className="text-xs text-amber-600/80 font-medium mt-0.5 leading-relaxed">{t('selectionFeeStep.main.zelleProcessing.subtitle')}</p>
                  </div>
                </div>
              )}

              {!hasZellePendingSelectionFee && (
                <>
                  <div className="hidden sm:block absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
                  <div className="flex items-center justify-between mb-2 relative z-10 sm:px-0">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{t('selectionFeeStep.main.zellePayment')}</h3>
                    {!isZelleProcessing && (
                      <button onClick={() => { setShowZelleCheckout(false); setIsZelleProcessing(false); setSelectedMethod(null); setShowInlineCpf(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </>
              )}

              <div className={hasZellePendingSelectionFee ? 'border border-amber-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm' : ''}>
                <ZelleCheckout
                  feeType="selection_process"
                  amount={computedBasePrice}
                  scholarshipsIds={[]}
                  metadata={{
                    discount_applied: computedBasePrice < selectionFeeAmount,
                    original_amount: selectionFeeAmount,
                    final_amount: computedBasePrice,
                    ...(activeDiscount?.has_discount && activeDiscount.affiliate_code ? { discount_code: activeDiscount.affiliate_code } : {}),
                    ...(validationResult?.isValid && codeApplied && discountCode.trim() ? { discount_code: discountCode.trim().toUpperCase() } : {}),
                    promotional_coupon: (window as any).__checkout_promotional_coupon || null,
                  }}
                  onSuccess={() => { setZellePaymentSubmitted(false); setShowZelleCheckout(false); setIsZelleProcessing(false); onNext(); }}
                  onError={(err) => { setError(err); setZellePaymentSubmitted(false); setIsZelleProcessing(false); }}
                  onProcessingChange={(isProcessing) => {
                    if (isProcessing && !isZelleProcessing) refetchPaymentStatus();
                    setIsZelleProcessing(isProcessing);
                  }}
                />
              </div>
            </div>
          ) : (
            /* Payment method list */
            <div className="space-y-4 relative z-10">
              {isBlocked && pendingPayment && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 backdrop-blur-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-amber-500 uppercase tracking-tight mb-1">{t('selectionFeeStep.main.paymentProcessing.title')}</p>
                      <p className="text-xs text-white/60 font-medium">{t('selectionFeeStep.main.paymentProcessing.subtitle')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 px-2 gap-2 sm:gap-4">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight w-full sm:w-auto text-left">{t('selectionFeeStep.main.selectMethod')}</h3>
                <div className="text-right flex-shrink-0 self-end sm:self-auto">
                  {computedBasePrice < selectionFeeAmount ? (
                    <div className="flex flex-col items-end">
                      <div className="text-sm line-through text-gray-300 font-bold mb-0.5">{originalFormattedAmount}</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest mb-0.5">Total</span>
                        <div className="text-2xl md:text-4xl font-black text-emerald-500 tracking-tighter leading-none">{formattedAmount}</div>
                      </div>
                      <div className="inline-flex items-center mt-1.5 opacity-90">
                        <CheckCircle className="w-3 h-3 text-emerald-500 mr-1.5" />
                        <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                          {promotionalCouponValidation?.isValid
                            ? t('selectionFeeStep.main.couponApplied', { coupon: promotionalCoupon })
                            : t('selectionFeeStep.main.discountApplied')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-end gap-2">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest mb-0.5">Total</span>
                      <div className="text-2xl md:text-4xl font-black text-gray-900 tracking-tighter leading-none">{formattedAmount}</div>
                    </div>
                  )}
                </div>
              </div>

              {paymentMethods.map((method) => {
                const isSelected = selectedMethod === method.id;
                const isProcessing = loading && isSelected;
                const isDisabled = !!loading || !termsAccepted ||
                  (hasReferralCode && !(validationResult?.isValid) && !activeDiscount?.has_discount) ||
                  (!!isBlocked && !!pendingPayment && method.id !== 'zelle');

                return (
                  <PaymentMethodButton
                    key={method.id}
                    method={method}
                    isSelected={isSelected}
                    isProcessing={isProcessing}
                    isDisabled={isDisabled}
                    cardAmountWithFees={cardAmountWithFees}
                    pixAmountWithFees={pixAmountWithFees}
                    computedBasePrice={computedBasePrice}
                    exchangeRate={exchangeRate}
                    isBlocked={!!isBlocked}
                    pendingPayment={pendingPayment}
                    showInlineCpf={showInlineCpf}
                    inlineCpf={inlineCpf}
                    savingCpf={savingCpf}
                    cpfError={cpfError}
                    onCheckout={handleCheckout}
                    onSaveCpf={saveCpfAndCheckout}
                    onCpfChange={setInlineCpf}
                    onCpfErrorClear={() => setCpfError(null)}
                    formatCpf={formatCpf}
                    t={t}
                  />
                );
              })}
            </div>
          )}

          {/* Terms Drawer for mobile */}
          {showTermsInDrawer && (
            <Drawer open={showTermsInDrawer} onOpenChange={setShowTermsInDrawer}>
              <DrawerContent className="max-h-[95vh] bg-white border-t border-gray-200 rounded-t-2xl">
                <DrawerHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Shield className="w-5 h-5" />
                    </div>
                    <DrawerTitle className="text-xl font-bold">{t('preCheckoutModal.termsAndConditions.title')}</DrawerTitle>
                  </div>
                </DrawerHeader>
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                  <MobileTermsView setShowTermsInDrawer={setShowTermsInDrawer} activeTerm={activeTerm} loadingTerms={loadingTerms} t={t} />
                </div>
              </DrawerContent>
            </Drawer>
          )}

          {/* Terms Modal for desktop */}
          <TermsModal
            showTermsModal={showTermsModal}
            setShowTermsModal={setShowTermsModal}
            activeTerm={activeTerm}
            loadingTerms={loadingTerms}
            t={t}
          />

          {/* CPF Modal for Parcelow (fallback) */}
          <Dialog open={showCpfModal} onClose={() => setShowCpfModal(false)} className="relative z-[100]">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">{t('scholarshipDeadline.parcelowCpfModal.title')}</Dialog.Title>
                  <Dialog.Description className="text-gray-600 mb-6">{t('scholarshipDeadline.parcelowCpfModal.description')}</Dialog.Description>
                  <div className="flex flex-col w-full gap-3">
                    <button onClick={() => { setShowCpfModal(false); navigate('/student/dashboard/profile'); }} className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                      {t('scholarshipDeadline.parcelowCpfModal.confirm')}
                    </button>
                    <button onClick={() => setShowCpfModal(false)} className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                      {t('scholarshipDeadline.parcelowCpfModal.cancel')}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>

          <style>{`
            .checkbox-container input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
            .checkbox-container { display: block; position: relative; cursor: pointer; font-size: 20px; user-select: none; }
            .checkmark { position: relative; top: 0; left: 0; height: 1.3em; width: 1.3em; background-color: #ffffff; border: 2px solid #343434; border-radius: 5px; transition: all 0.5s; }
            .checkbox-container input:checked ~ .checkmark { background-color: #ffffff; border: 2px solid #343434; }
            .checkmark:after { content: ""; position: absolute; display: none; filter: drop-shadow(0 0 10px #888); }
            .checkbox-container input:checked ~ .checkmark:after { display: block; }
            .checkbox-container .checkmark:after { left: 0.4em; top: 0.15em; width: 0.35em; height: 0.6em; border: solid #343434; border-width: 0 0.15em 0.15em 0; border-radius: 2px; transform: rotate(45deg); animation: bounceFadeIn 0.5s cubic-bezier(0.165, 0.84, 0.44, 1); }
            @keyframes bounceFadeIn {
              0% { transform: rotate(45deg) scale(0.3); opacity: 0; }
              50% { transform: rotate(45deg) scale(1.1); opacity: 0.8; }
              100% { transform: rotate(45deg) scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};
