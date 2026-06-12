import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { applyFreePayment } from '../../../lib/freePaymentHandler';
import { useCouponState } from '../../../hooks/useCouponState';

export const ApplicationFeeStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation('payment');
  const { user, userProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFreeProcessing, setIsFreeProcessing] = useState(false);

  const baseAmount = getFeeAmount('application_fee');
  const formattedAmount = baseAmount && !isNaN(baseAmount) ? formatFeeAmount(baseAmount) : '$0.00';
  const hasPaid = userProfile?.is_application_fee_paid || false;

  // ── Cupom (persiste no sessionStorage — refresh não gasta uso) ────────────
  const {
    hasCoupon, setHasCoupon,
    promotionalCoupon, setPromotionalCoupon,
    couponValidation,
    isValidatingCoupon,
    couponInputRef,
    validateCoupon,
    removeCoupon,
    clearCouponStorage,
    effectiveAmount,
    appliedCoupon,
  } = useCouponState('application_fee', baseAmount);

  const isFreePayment = effectiveAmount === 0;

  useEffect(() => {
    if (hasPaid) onNext();
  }, [hasPaid, onNext]);

  // ── Free payment handler ──────────────────────────────────────────────────
  const handleFreePayment = async () => {
    if (!user?.id) return;
    setIsFreeProcessing(true);
    setError(null);

    try {
      const { data: applications } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', userProfile?.id)
        .limit(1);

      const applicationId = applications?.[0]?.id;

      const { error: freeErr } = await applyFreePayment({
        supabase,
        feeType: 'application_fee',
        userId: user.id,
        applicationId,
        couponCode: appliedCoupon || undefined,
        amount: baseAmount,
        onSuccess: () => { clearCouponStorage(); onNext(); },
      });

      if (freeErr) throw freeErr;
    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento gratuito. Tente novamente.');
      setIsFreeProcessing(false);
    }
  };

  // ── Stripe checkout ───────────────────────────────────────────────────────
  const handleCheckout = async (paymentMethod: 'stripe' | 'pix' = 'stripe') => {
    if (isFreePayment) {
      await handleFreePayment();
      return;
    }

    if (!user?.id || !userProfile?.id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) throw new Error('User not authenticated');

      const { data: applications } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id')
        .eq('student_id', userProfile.id)
        .limit(1);

      if (!applications || applications.length === 0) {
        throw new Error('No applications found. Please select scholarships first.');
      }

      const application = applications[0];

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-application-fee`;

      const requestBody = {
        application_id: application.id,
        scholarship_id: application.scholarship_id,
        amount: effectiveAmount,
        payment_method: paymentMethod,
        success_url: `${window.location.origin}/student/onboarding?step=scholarship_fee&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/student/onboarding?step=application_fee&payment=cancelled`,
        mode: 'payment',
        payment_type: 'application_fee',
        fee_type: 'application_fee',
        ...(appliedCoupon && { promotional_coupon: appliedCoupon }),
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const data = await response.json();
      const redirectUrl = data.session_url || data.checkout_url || data.url;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('URL de redirecionamento não encontrada');
      }
    } catch (err: any) {
      console.error('Erro ao processar checkout:', err);
      setError(err.message || 'Erro ao processar pagamento. Tente novamente.');
      setLoading(false);
    }
  };

  if (hasPaid) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Fee Paid!</h3>
        <p className="text-gray-600 mb-6">You've already paid the application fee.</p>
        <button
          onClick={onNext}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pay Application Fee</h2>
        <p className="text-gray-600">Complete your application by paying the application fee</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        {/* Amount display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-medium text-gray-900">Application Fee</span>
          </div>
          <div className="text-right">
            {couponValidation?.isValid ? (
              <div className="flex flex-col items-end">
                <span className="text-sm line-through text-gray-300 font-bold">{formattedAmount}</span>
                <span className="text-2xl font-bold text-emerald-600">{formatFeeAmount(effectiveAmount)}</span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-gray-900">{formattedAmount}</span>
            )}
          </div>
        </div>

        {/* Coupon section */}
        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={hasCoupon}
              onChange={(e) => {
                setHasCoupon(e.target.checked);
                if (!e.target.checked) removeCoupon();
                else setTimeout(() => couponInputRef.current?.focus(), 100);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Tenho um cupom promocional</span>
          </label>

          {hasCoupon && (
            <div className="flex gap-2 items-center">
              <input
                ref={couponInputRef}
                type="text"
                value={promotionalCoupon}
                onChange={(e) => {
                  setPromotionalCoupon(e.target.value.toUpperCase());
                  if (couponValidation) setCouponValidation(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && validateCoupon()}
                placeholder="Código do cupom"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                disabled={couponValidation?.isValid}
              />
              {couponValidation?.isValid ? (
                <button
                  onClick={removeCoupon}
                  className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-all"
                >
                  Remover
                </button>
              ) : (
                <button
                  onClick={validateCoupon}
                  disabled={isValidatingCoupon || !promotionalCoupon.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </button>
              )}
            </div>
          )}

          {hasCoupon && couponValidation && (
            <div className={`mt-2 flex items-center gap-2 text-xs font-bold ${couponValidation.isValid ? 'text-emerald-700' : 'text-red-600'}`}>
              {couponValidation.isValid
                ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                : <AlertCircle className="w-4 h-4 text-red-500" />
              }
              {couponValidation.isValid
                ? `Cupom aplicado! Desconto de ${formatFeeAmount(couponValidation.discountAmount || 0)}`
                : couponValidation.message
              }
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Payment buttons */}
        {isFreePayment ? (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">{t('freePayment.title')}</p>
                <p className="text-xs text-emerald-700">{t('freePayment.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleFreePayment}
              disabled={isFreeProcessing}
              className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg hover:bg-emerald-700 transition-colors font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isFreeProcessing
                ? <><RefreshCw className="w-5 h-5 animate-spin" /> {t('freePayment.processing')}</>
                : t('freePayment.button')
              }
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleCheckout('stripe')}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Pay with Card — {formatFeeAmount(effectiveAmount)}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
