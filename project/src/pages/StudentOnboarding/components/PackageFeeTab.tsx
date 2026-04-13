import React, { useState, useRef } from 'react';
import { CreditCard, Check, Loader2, AlertCircle, X, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { getExchangeRate, calculateCardAmountWithFees, calculatePIXTotalWithIOF } from '../../../utils/stripeFeeCalculator';
import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';


const PixIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z" />
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z" />
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z" />
  </svg>
);

const ParcelowIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg overflow-hidden p-0.5 border border-gray-100`}>
    <img src="/parcelow_share.webp" alt="Parcelow" className="w-full h-full object-contain scale-110" />
  </div>
);

const ZelleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#a0f" d="M35,42H13c-3.866,0-7-3.134-7-7V13c0-3.866,3.134-7,7-7h22c3.866,0,7,3.134,7,7v22C42,38.866,38.866,42,35,42z" />
    <path fill="#fff" d="M17.5,18.5h14c0.552,0,1-0.448,1-1V15c0-0.552-0.448-1-1-1h-14c-0.552,0-1,0.448-1,1v2.5C16.5,18.052,16.948,18.5,17.5,18.5z" />
    <path fill="#fff" d="M17,34.5h14.5c0.552,0,1-0.448,1-1V31c0-0.552-0.448-1-1-1H17c-0.552,0-1,0.448-1,1v2.5C16,34.052,16.448,34.5,17,34.5z" />
    <path fill="#fff" d="M22.25,11v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,10.5,22.25,10.724,22.25,11z" />
    <path fill="#fff" d="M22.25,32v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,31.5,22.25,31.724,22.25,32z" />
    <path fill="#fff" d="M16.578,30.938H22l10.294-12.839c0.178-0.222,0.019-0.552-0.266-0.552H26.5L16.275,30.298C16.065,30.553,16.247,30.938,16.578,30.938z" />
  </svg>
);

const StripeIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-[#635bff] rounded-lg overflow-hidden shadow-sm shadow-[#635bff]/20`}>
    <span className="text-white font-black text-[28px] leading-[0] select-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', transform: 'translateY(-1.5px)' }}>S</span>
  </div>
);

type PaymentMethod = 'stripe' | 'pix' | 'parcelow' | 'zelle';

interface CouponValidation {
  isValid: boolean;
  message?: string;
  discountAmount?: number;
  finalAmount?: number;
  couponId?: string;
}

interface PackageFeeTabProps {
  feeType: 'ds160_package' | 'i539_cos_package' | 'reinstatement_package';
  amount: number;
  feeLabel: string;
  isPaid: boolean;
  supabaseUrl?: string;
  accessToken?: string;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
  selectedPaymentMethod: PaymentMethod | null;
  setSelectedPaymentMethod: (v: PaymentMethod | null) => void;
  showZelle: boolean;
  setShowZelle: (v: boolean) => void;
  showInlineCpf: boolean;
  setShowInlineCpf: (v: boolean) => void;
  inlineCpf: string;
  setInlineCpf: (v: string) => void;
  savingCpf: boolean;
  setSavingCpf: (v: boolean) => void;
  cpfError: string | null;
  setCpfError: (v: string | null) => void;
  userProfile: any;
  onPaymentSuccess: () => void;
  currentStep: string;
  universityLogo?: string;
  universityName?: string;
  scholarshipTitle?: string;
}

export const PackageFeeTab: React.FC<PackageFeeTabProps> = ({
  feeType,
  feeLabel,
  isPaid,
  loading,
  setLoading,
  error,
  setError,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  showZelle,
  setShowZelle,
  showInlineCpf,
  setShowInlineCpf,
  inlineCpf,
  setInlineCpf,
  savingCpf,
  setSavingCpf,
  cpfError,
  setCpfError,
  userProfile,
  onPaymentSuccess,
  amount,
  currentStep,
  universityLogo,
  universityName,
  scholarshipTitle,
}) => {
  const { t } = useTranslation(['registration', 'common', 'scholarships', 'payment']);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const { isBlocked, pendingPayment, refetch: refetchPaymentStatus } = usePaymentBlocked();
  const hasZellePendingPackageFee = isBlocked && pendingPayment?.fee_type === feeType;

  // ── Estados de cupom ─────────────────────────────────────────────────────
  const [hasCoupon, setHasCoupon] = useState(false);
  const [promotionalCoupon, setPromotionalCoupon] = useState('');
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const couponInputRef = useRef<HTMLInputElement>(null);

  // Chave de window para persistência entre re-renders
  const windowCouponKey = `__checkout_${feeType}_coupon`;
  const windowAmountKey = `__checkout_${feeType}_final_amount`;

  React.useEffect(() => {
    getExchangeRate().then(rate => setExchangeRate(rate));
  }, []);

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch { return null; }
  };

  // ── Validação de cupom ───────────────────────────────────────────────────
  const validateCoupon = async () => {
    if (!promotionalCoupon.trim()) return;
    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    setIsValidatingCoupon(true);
    setCouponValidation(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error: rpcError } = await supabase.rpc(
        'validate_and_apply_admin_promotional_coupon',
        {
          p_code: normalizedCode,
          p_fee_type: feeType,
          p_user_id: user?.id,
        }
      );

      if (rpcError) throw rpcError;

      if (!result || !result.valid) {
        setCouponValidation({ isValid: false, message: result?.message || 'Código de cupom inválido' });
        return;
      }

      let discountAmount = result.discount_type === 'percentage'
        ? (amount * result.discount_value) / 100
        : result.discount_value;
      discountAmount = Math.min(discountAmount, amount);
      const finalAmount = Math.max(0, amount - discountAmount);

      setCouponValidation({ isValid: true, discountAmount, finalAmount, couponId: result.id });

      // Persistir valores no window para o momento do redirect
      (window as any)[windowCouponKey] = normalizedCode;
      (window as any)[windowAmountKey] = finalAmount;

      // Registrar validação no log
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch(`${SUPABASE_URL}/functions/v1/record-promotional-coupon-validation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              coupon_code: normalizedCode,
              coupon_id: result.id,
              fee_type: feeType,
              original_amount: amount,
              discount_amount: discountAmount,
              final_amount: finalAmount,
            }),
          });
        }
      } catch (recordError) {
        console.warn('[PackageFeeTab] Não foi possível registrar uso do cupom:', recordError);
      }
    } catch (e: any) {
      setCouponValidation({ isValid: false, message: 'Falha ao validar cupom. Tente novamente.' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    if (!promotionalCoupon.trim()) return;
    try {
      const token = await getAccessToken();
      if (token) {
        await fetch(`${SUPABASE_URL}/functions/v1/remove-promotional-coupon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ coupon_code: promotionalCoupon.trim().toUpperCase(), fee_type: feeType }),
        });
      }
    } catch (e) {
      console.warn('[PackageFeeTab] Erro ao remover cupom:', e);
    }
    setHasCoupon(false);
    setPromotionalCoupon('');
    setCouponValidation(null);
    delete (window as any)[windowCouponKey];
    delete (window as any)[windowAmountKey];
  };

  // Valor efetivo (com ou sem cupom)
  const effectiveAmount = couponValidation?.isValid && couponValidation.finalAmount !== undefined
    ? couponValidation.finalAmount
    : amount;

  const appliedCoupon = couponValidation?.isValid && promotionalCoupon.trim()
    ? promotionalCoupon.trim().toUpperCase()
    : null;

  // ── Checkout Stripe/PIX ──────────────────────────────────────────────────
  const handleStripeCheckout = async (paymentMethod: 'stripe' | 'pix') => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error(t('rapidRegistration.payment.error.notAuthenticated'));

      const currentUrl = window.location.origin + window.location.pathname;
      const successUrl = `${currentUrl}?step=${currentStep}&payment=success&session_id={CHECKOUT_SESSION_ID}&fee_type=${feeType}`;
      const cancelUrl = `${currentUrl}?step=${currentStep}&payment=cancelled`;

      const payload: any = {
        success_url: successUrl,
        cancel_url: cancelUrl,
        amount: effectiveAmount,
        fee_type: feeType,
        payment_method: paymentMethod,
        ...(appliedCoupon && { promotional_coupon: appliedCoupon }),
        metadata: {
          fee_type: feeType,
          final_amount: effectiveAmount.toString(),
          promotional_coupon: appliedCoupon,
        },
      };

      if (paymentMethod === 'pix' && exchangeRate) {
        payload.metadata.exchange_rate = exchangeRate.toString();
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout-package-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.session_url) {
        throw new Error(data.error || t('rapidRegistration.payment.error.generationFailed'));
      }

      window.location.href = data.session_url;
    } catch (err: any) {
      console.error('[PackageFeeTab] Stripe error:', err);
      setError(err.message || t('rapidRegistration.payment.error.generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  // ── Checkout Parcelow ────────────────────────────────────────────────────
  const handleParcelowCheckout = async () => {
    if (!userProfile?.cpf_document) {
      setShowInlineCpf(true);
      return;
    }
    await launchParcelowCheckout();
  };

  const launchParcelowCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error(t('rapidRegistration.payment.error.notAuthenticated'));

      const response = await fetch(`${SUPABASE_URL}/functions/v1/parcelow-checkout-package-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: effectiveAmount,
          fee_type: feeType,
          ...(appliedCoupon && { promotional_coupon: appliedCoupon }),
          metadata: {
            fee_type: feeType,
            // final_amount = valor com desconto (ou cheio se sem cupom)
            final_amount: effectiveAmount.toString(),
            promotional_coupon: appliedCoupon,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'document_number_required') {
          setShowInlineCpf(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || t('rapidRegistration.payment.error.generationFailed'));
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        console.error('[PackageFeeTab] No checkout_url returned from Parcelow');
      }
    } catch (err: any) {
      console.error('[PackageFeeTab] Parcelow error:', err);
      setError(err.message || t('rapidRegistration.payment.error.generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCpf = async () => {
    if (!inlineCpf.trim()) { setCpfError(t('rapidRegistration.payment.cpf.error')); return; }
    const digits = inlineCpf.replace(/\D/g, '');
    if (digits.length !== 11) { setCpfError(t('rapidRegistration.payment.cpf.error')); return; }
    setSavingCpf(true);
    setCpfError(null);
    try {
      const targetUserId = userProfile?.user_id || userProfile?.id;
      if (!targetUserId) throw new Error(t('rapidRegistration.payment.error.userIdNotFound'));

      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({ cpf_document: digits })
        .eq('user_id', targetUserId);

      if (updateErr) throw updateErr;

      setShowInlineCpf(false);
      await launchParcelowCheckout();
    } catch (err: any) {
      setCpfError(err.message || t('rapidRegistration.payment.error.saveCpfFailed'));
    } finally {
      setSavingCpf(false);
    }
  };

  const pixAmount = exchangeRate ? calculatePIXTotalWithIOF(effectiveAmount, exchangeRate).totalWithIOF : null;
  const cardAmount = calculateCardAmountWithFees(effectiveAmount);

  if (isPaid) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden p-12 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">{feeLabel}</h2>
          <p className="text-emerald-600 font-bold text-lg">{t('studentOnboarding.documentsUpload.packageFees.paidSuccess')}</p>
          <p className="text-slate-500 text-sm mt-2">{t('studentOnboarding.documentsUpload.packageFees.confirmedMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 w-full mx-auto animate-fadeIn">
      <div className="relative overflow-hidden">
        <div className="grid grid-cols-1 gap-8 items-start relative z-10 w-full">
          <div className="space-y-6">
            <div className="group relative bg-white border border-slate-200 rounded-[2.5rem] transition-all shadow-sm hover:shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

              {/* Branding Header */}
              <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col items-center text-center space-y-6">
                  {universityLogo ? (
                    <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden transform hover:scale-105 transition-transform duration-500">
                      <img src={universityLogo} alt={universityName} className="w-full h-full object-contain p-4" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-500/20">
                      <CreditCard className="w-10 h-10 text-white" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full mb-2">
                      <Shield className="w-3.5 h-3.5 text-blue-600 mr-2" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        {t('paymentStep.securePaymentBadge', { ns: 'payment' })}
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                      {feeLabel}
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                      {universityName || scholarshipTitle}
                    </p>
                  </div>

                  {/* Exibição de preço */}
                  <div className="pt-4">
                    <div className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter flex flex-col items-center">
                      <span className="text-sm text-slate-400 font-black uppercase tracking-[0.3em] mb-1">Total Amount</span>
                      {couponValidation?.isValid && couponValidation.finalAmount !== undefined ? (
                        <div className="flex flex-col items-center gap-1">
                          {/* Preço original riscado */}
                          <div className="flex items-start opacity-40">
                            <span className="text-xl mt-1 mr-1 text-slate-400">$</span>
                            <span className="line-through text-slate-500">{amount.toLocaleString('en-US')}</span>
                            <span className="text-sm mt-auto mb-2 ml-2 text-slate-400 uppercase tracking-widest">USD</span>
                          </div>
                          {/* Preço com desconto */}
                          <div className="flex items-start text-emerald-600">
                            <span className="text-2xl mt-2 mr-1">$</span>
                            {couponValidation.finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-sm mt-auto mb-3 ml-2 uppercase tracking-widest">USD</span>
                          </div>
                          {/* Badge de desconto */}
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                            -{couponValidation.discountAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD de desconto
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start">
                          <span className="text-2xl mt-2 mr-1 text-slate-400">$</span>
                          {amount.toLocaleString('en-US')}
                          <span className="text-sm mt-auto mb-3 ml-2 text-slate-400 uppercase tracking-widest">USD</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── UI de Cupom ──────────────────────────────────────────── */}
                <div className="mt-6 p-4">
                  <div className="flex flex-row items-center justify-between gap-4 min-h-[52px]">
                    {/* Checkbox + Label */}
                    <label className="flex items-center gap-3 cursor-pointer select-none shrink-0">
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${hasCoupon ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white hover:border-blue-400'}`}
                        onClick={() => {
                          const next = !hasCoupon;
                          setHasCoupon(next);
                          if (!next) removeCoupon();
                          else setTimeout(() => couponInputRef.current?.focus(), 150);
                        }}
                      >
                        {hasCoupon && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        {t('selectionFeeStep.main.promotionalCoupon.title', { ns: 'payment', defaultValue: 'Tenho um cupom promocional' })}
                      </span>
                    </label>

                    {/* Input + Botão (aparece quando hasCoupon) */}
                    {hasCoupon && (
                      <div className="flex-1 flex gap-2 items-center max-w-sm animate-in fade-in slide-in-from-right-2 duration-200">
                        <input
                          ref={couponInputRef}
                          type="text"
                          value={promotionalCoupon}
                          onChange={(e) => {
                            setPromotionalCoupon(e.target.value.toUpperCase());
                            if (couponValidation) setCouponValidation(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && validateCoupon()}
                          placeholder={t('payment:preCheckoutModal.placeholder', { defaultValue: 'Cupom' })}
                          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
                          disabled={couponValidation?.isValid}
                        />
                        {couponValidation?.isValid ? (
                          <button
                            onClick={removeCoupon}
                            className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-black hover:bg-red-100 transition-all whitespace-nowrap flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {t('common:remove', { defaultValue: 'Remover' })}
                          </button>
                        ) : (
                          <button
                            onClick={validateCoupon}
                            disabled={isValidatingCoupon || !promotionalCoupon.trim()}
                            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                          >
                            {isValidatingCoupon
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : t('common:apply', { defaultValue: 'Aplicar' })
                            }
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Feedback de validação */}
                  {hasCoupon && couponValidation && (
                    <div className={`mt-3 flex items-center gap-2 text-xs font-bold ${couponValidation.isValid ? 'text-emerald-700' : 'text-red-600'}`}>
                      {couponValidation.isValid
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      }
                      {couponValidation.isValid
                        ? `Cupom aplicado! Desconto de $${couponValidation.discountAmount?.toFixed(2)} USD`
                        : couponValidation.message
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="p-6 md:p-12 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {t('studentOnboarding.documentsUpload.packageFees.paymentMethod')}
                  </h3>
                  {error && (
                    <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl flex items-center gap-2 animate-shake">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-bold text-red-600">{error}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {hasZellePendingPackageFee ? (
                    <div className="flex flex-col gap-0 border-2 border-amber-200 rounded-[2.5rem] overflow-hidden">
                      <div className="bg-amber-50 px-6 py-4 flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 flex-shrink-0 mt-0.5">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-amber-700 uppercase tracking-tight">
                            {t('paymentStep.zellePendingTitle', { ns: 'payment' })}
                          </p>
                          <p className="text-xs text-amber-600/80 font-medium mt-0.5 leading-relaxed">
                            {t('paymentStep.zellePendingMessage', { ns: 'payment' })}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white p-2">
                        <ZelleCheckout
                          feeType={feeType as any}
                          amount={effectiveAmount}
                          isPendingVerification={hasZellePendingPackageFee}
                          onProcessingChange={(isProcessing) => isProcessing && refetchPaymentStatus()}
                          hideHeader={true}
                          onSuccess={onPaymentSuccess}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Credit Card / Stripe */}
                      <button
                        onClick={() => { setSelectedPaymentMethod('stripe'); handleStripeCheckout('stripe'); }}
                        disabled={loading}
                        className="group/btn relative bg-white border border-slate-200 p-5 md:p-6 rounded-[2rem] text-left hover:scale-[1.01] active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-600/30 hover:bg-blue-50/10"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <StripeIcon className="w-14 h-14" />
                            <div>
                              <div className="font-black text-slate-900 text-lg uppercase tracking-tight">
                                {t('rapidRegistration.payment.methods.stripe')}
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                                {t('rapidRegistration.payment.notes.processingFees')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-900 text-2xl font-black tracking-tighter">
                              ${cardAmount.toFixed(2)}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">INC. FEES</span>
                          </div>
                        </div>
                        {loading && selectedPaymentMethod === 'stripe' && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </button>

                      {/* PIX */}
                      {pixAmount && pixAmount <= 3000 && (
                        <button
                          onClick={() => { setSelectedPaymentMethod('pix'); handleStripeCheckout('pix'); }}
                          disabled={loading}
                          className="group/btn relative bg-white border border-slate-200 p-5 md:p-6 rounded-[2rem] text-left hover:scale-[1.01] active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-600/30 hover:bg-blue-50/10"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover/btn:bg-slate-100 transition-colors">
                                <PixIcon className="w-10 h-10" />
                              </div>
                              <div>
                                <div className="font-black text-slate-900 text-lg uppercase tracking-tight">PIX</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                                  {t('rapidRegistration.payment.notes.processingFees')}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-900 text-2xl font-black tracking-tighter">
                                R$ {pixAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CONVERTED</span>
                            </div>
                          </div>
                          {loading && selectedPaymentMethod === 'pix' && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                              <Loader2 className="w-8 h-8 text-[#4db6ac] animate-spin" />
                            </div>
                          )}
                        </button>
                      )}

                      {/* Parcelow */}
                      <div className="flex flex-col">
                        <button
                          onClick={() => { setSelectedPaymentMethod('parcelow'); handleParcelowCheckout(); }}
                          disabled={loading}
                          className={`group/btn relative bg-white border p-5 md:p-6 text-left hover:scale-[1.01] active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-600/30 hover:bg-blue-50/10 ${
                            showInlineCpf ? 'rounded-t-[2rem] border-slate-200 border-b-0 bg-slate-50/50' : 'rounded-[2rem] border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <ParcelowIcon className="w-16 h-14" />
                              <div>
                                <div className="font-black text-slate-900 text-lg uppercase tracking-tight">Parcelow</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide leading-tight">
                                  {t('rapidRegistration.payment.notes.parcelowFees')}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-900 text-2xl font-black tracking-tighter">
                                ${effectiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                {t('studentOnboarding.documentsUpload.packageFees.installments12x')}
                              </span>
                            </div>
                          </div>
                          {loading && selectedPaymentMethod === 'parcelow' && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            </div>
                          )}
                        </button>

                        {showInlineCpf && (
                          <div className="p-6 bg-blue-50 border border-slate-200 border-t-0 rounded-b-[2rem] space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" />
                                {t('studentOnboarding.documentsUpload.packageFees.cpfRequiredTitle')}
                              </h4>
                              <button onClick={() => setShowInlineCpf(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="000.000.000-00"
                                value={inlineCpf}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').substring(0, 11);
                                  let masked = val.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                  setInlineCpf(masked);
                                  setCpfError(null);
                                }}
                                className="w-full bg-white border border-blue-200 rounded-2xl px-5 py-4 text-xl font-black text-slate-900 tracking-tighter focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                              />
                              {cpfError && (
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                                  <AlertCircle className="w-3 h-3" />
                                  {cpfError}
                                </p>
                              )}
                              <button
                                onClick={handleSaveCpf}
                                disabled={savingCpf || inlineCpf.replace(/\D/g, '').length !== 11}
                                className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                              >
                                {savingCpf ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('studentOnboarding.documentsUpload.packageFees.saveCpfContinue')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Zelle */}
                      <div className="flex flex-col">
                        <button
                          onClick={() => { setShowZelle(!showZelle); setSelectedPaymentMethod('zelle'); }}
                          disabled={loading}
                          className={`group/btn relative bg-white border p-5 md:p-6 text-left hover:scale-[1.01] active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-600/30 hover:bg-blue-50/10 ${
                            showZelle ? 'rounded-t-[2rem] border-slate-200 border-b-0 bg-slate-50/50' : 'rounded-[2rem] border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover/btn:bg-slate-100 transition-colors">
                                <ZelleIcon className="w-10 h-10" />
                              </div>
                              <div>
                                <div className="font-black text-slate-900 text-lg uppercase tracking-tight">Zelle</div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                                  <AlertCircle className="w-3 h-3" />
                                  {t('rapidRegistration.payment.notes.zelleTime')}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-900 text-2xl font-black tracking-tighter">
                                ${effectiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                {t('studentOnboarding.documentsUpload.packageFees.noFees')}
                              </span>
                            </div>
                          </div>
                        </button>

                        {showZelle && (
                          <div className="border border-slate-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-xl animate-in fade-in slide-in-from-top-2">
                            <ZelleCheckout
                              feeType={feeType as any}
                              amount={effectiveAmount}
                              onSuccess={() => { setShowZelle(false); onPaymentSuccess(); }}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
