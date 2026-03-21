import React, { useState } from 'react';
import { CreditCard, Check, Loader2, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { getExchangeRate, calculateCardAmountWithFees, calculatePIXTotalWithIOF } from '../../../utils/stripeFeeCalculator';
import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';

const PACKAGE_FEE_AMOUNT = 1800;

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

interface PackageFeeTabProps {
  feeType: 'ds160_package' | 'i539_cos_package';
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
}) => {
  const { t } = useTranslation(['registration', 'common', 'scholarships', 'payment']);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const { isBlocked, pendingPayment, refetch: refetchPaymentStatus } = usePaymentBlocked();
  const hasZellePendingPackageFee = isBlocked && pendingPayment?.fee_type === feeType;

  React.useEffect(() => {
    getExchangeRate().then(rate => setExchangeRate(rate));
  }, []);

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch { return null; }
  };

  const handleStripeCheckout = async (paymentMethod: 'stripe' | 'pix') => {
    setLoading(true);
    setError(null);
    try {
      console.log('[PackageFeeTab] Starting Stripe Checkout...', { paymentMethod, feeType, finalAmount: PACKAGE_FEE_AMOUNT });
      const token = await getAccessToken();
      console.log('[PackageFeeTab] Access Token obtained:', !!token);
      if (!token) throw new Error(t('rapidRegistration.payment.error.notAuthenticated'));

      const currentUrl = window.location.href.split('?')[0];
      const successUrl = `${currentUrl}?step=my_applications&payment=success&session_id={CHECKOUT_SESSION_ID}&fee_type=${feeType}`;
      const cancelUrl = `${currentUrl}?step=my_applications&payment=cancelled`;

      let finalAmount = PACKAGE_FEE_AMOUNT;

      const payload: any = {
        success_url: successUrl,
        cancel_url: cancelUrl,
        amount: finalAmount,
        fee_type: feeType,
        payment_method: paymentMethod,
        metadata: { fee_type: feeType },
      };

      if (paymentMethod === 'pix' && exchangeRate) {
        payload.metadata.exchange_rate = exchangeRate.toString();
      }

      console.log('[PackageFeeTab] Calling Edge Function:', `${SUPABASE_URL}/functions/v1/stripe-checkout-package-fee`);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout-package-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      console.log('[PackageFeeTab] Edge Function Response status:', response.status);
      const data = await response.json();
      console.log('[PackageFeeTab] Edge Function Response data:', data);

      if (!response.ok || !data.session_url) {
        throw new Error(data.error || t('rapidRegistration.payment.error.generationFailed'));
      }

      console.log('[PackageFeeTab] Redirecting to Stripe:', data.session_url);
      window.location.href = data.session_url;
    } catch (err: any) {
      console.error('[PackageFeeTab] Stripe error DETAIL:', err);
      setError(err.message || t('rapidRegistration.payment.error.generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleParcelowCheckout = async () => {
    // Check CPF first
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
      console.log('[PackageFeeTab] Launching Parcelow Checkout...', { feeType });
      const token = await getAccessToken();
      console.log('[PackageFeeTab] Access Token obtained for Parcelow:', !!token);
      if (!token) throw new Error(t('rapidRegistration.payment.error.notAuthenticated'));

      console.log('[PackageFeeTab] Calling Parcelow Edge Function:', `${SUPABASE_URL}/functions/v1/parcelow-checkout-package-fee`);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/parcelow-checkout-package-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: PACKAGE_FEE_AMOUNT, fee_type: feeType }),
      });

      console.log('[PackageFeeTab] Parcelow Response status:', response.status);
      const data = await response.json();
      console.log('[PackageFeeTab] Parcelow Response data:', data);

      if (!response.ok) {
        if (data.error === 'document_number_required') { 
          console.warn('[PackageFeeTab] CPF document number required by backend');
          setShowInlineCpf(true); 
          setLoading(false); 
          return; 
        }
        throw new Error(data.error || t('rapidRegistration.payment.error.generationFailed'));
      }
      if (data.checkout_url) {
        // Redireciona na mesma aba para que o payment=success seja processado pelo onboarding
        console.log('[PackageFeeTab] Redirecting to Parcelow URL (same tab):', data.checkout_url);
        window.location.href = data.checkout_url;
      } else {
        console.error('[PackageFeeTab] No checkout_url returned from Parcelow');
      }
    } catch (err: any) {
      console.error('[PackageFeeTab] Parcelow error DETAIL:', err);
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
      console.log('[PackageFeeTab] Saving CPF...', { digits, userId: userProfile?.user_id || userProfile?.id });
      // Usando user_id que é mais garantido estar presente e correto para o vínculo com o auth.user
      const targetUserId = userProfile?.user_id || userProfile?.id;
      if (!targetUserId) throw new Error(t('rapidRegistration.payment.error.userIdNotFound'));

      const { data, error: updateErr } = await supabase
        .from('user_profiles')
        .update({ cpf_document: digits })
        .eq('user_id', targetUserId)
        .select();
      
      console.log('[PackageFeeTab] Supabase update result:', { data, error: updateErr });
      if (updateErr) throw updateErr;
      
      console.log('[PackageFeeTab] CPF saved successfully, proceeding to checkout');
      setShowInlineCpf(false);
      await launchParcelowCheckout();
    } catch (err: any) {
      console.error('[PackageFeeTab] Save CPF error DETAIL:', err);
      setCpfError(err.message || t('rapidRegistration.payment.error.saveCpfFailed'));
    } finally {
      console.log('[PackageFeeTab] Resetting savingCpf state');
      setSavingCpf(false);
    }
  };

  const pixAmount = exchangeRate ? calculatePIXTotalWithIOF(PACKAGE_FEE_AMOUNT, exchangeRate).totalWithIOF : null;
  const cardAmount = calculateCardAmountWithFees(PACKAGE_FEE_AMOUNT);



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
    <div className="space-y-8 pb-12">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />

        {/* Header */}
        <div className="bg-slate-50 px-8 py-10 md:p-12 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-500/20 shrink-0">
                <CreditCard className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-[22px] md:text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">
                  {feeLabel}
                </h2>
                <p className="text-slate-500 text-sm font-medium">{t('studentOnboarding.documentsUpload.packageFees.obligatoryFee')}</p>
              </div>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-4xl font-black text-slate-900 tracking-tighter">$1,800</span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">USD</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-12 space-y-8">


          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}



          <div className="space-y-6">
            <p className="text-[22px] font-black text-slate-900 uppercase tracking-tight mb-4">{t('studentOnboarding.documentsUpload.packageFees.paymentMethod')}</p>
            
            <div className="flex flex-col gap-4">
              {hasZellePendingPackageFee ? (
                <div className="flex flex-col gap-0">
                  <div className="bg-amber-50 border border-amber-200 rounded-t-[2rem] px-6 py-4 flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-amber-700 uppercase tracking-tight">{t('paymentStep.zellePendingTitle', { ns: 'payment' })}</p>
                      <p className="text-xs text-amber-600/80 font-medium mt-0.5 leading-relaxed">
                        {t('paymentStep.zellePendingMessage', { ns: 'payment' })}
                      </p>
                    </div>
                  </div>
                  <div className="border border-amber-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                    <ZelleCheckout
                      feeType={feeType as any}
                      amount={PACKAGE_FEE_AMOUNT}
                      isPendingVerification={hasZellePendingPackageFee}
                      onProcessingChange={(isProcessing) => {
                        if (isProcessing) refetchPaymentStatus();
                      }}
                      hideHeader={true}
                      onClose={() => {
                        console.log('[PackageFeeTab] Zelle onClose triggered');
                        setShowZelle(false);
                      }}
                      onSuccess={() => {
                        console.log('[PackageFeeTab] Zelle onSuccess triggered');
                        setShowZelle(false);
                        onPaymentSuccess();
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
              {/* Stripe Card */}
              <button
                onClick={() => { setSelectedPaymentMethod('stripe'); handleStripeCheckout('stripe'); setShowZelle(false); setShowInlineCpf(false); }}
                disabled={loading}
                className="group/btn relative bg-white border border-gray-200 px-6 py-6 md:p-8 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                    <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                      <StripeIcon className="w-9 h-9" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-base uppercase tracking-tight">{t('rapidRegistration.payment.methods.stripe')}</div>
                      <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('rapidRegistration.payment.notes.processingFees')}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                      USD ${cardAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                  {t('rapidRegistration.payment.notes.processingFees')}
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
                  onClick={() => { setSelectedPaymentMethod('pix'); handleStripeCheckout('pix'); setShowZelle(false); setShowInlineCpf(false); }}
                  disabled={loading}
                  className="group/btn relative bg-white border border-gray-200 px-6 py-6 md:p-8 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                      <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                        <PixIcon className="w-9 h-9" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-base uppercase tracking-tight">{t('rapidRegistration.payment.methods.pix')}</div>
                        <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('rapidRegistration.payment.notes.processingFees')}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                        {pixAmount ? `R$ ${pixAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '...'}
                      </div>
                    </div>
                  </div>
                  <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                    {t('rapidRegistration.payment.notes.processingFees')}
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
                  onClick={() => { setSelectedPaymentMethod('parcelow'); handleParcelowCheckout(); setShowZelle(false); }}
                  disabled={loading}
                  className={`group/btn relative bg-white border px-6 py-6 md:p-8 text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full ${
                    showInlineCpf ? 'rounded-t-[2rem] border-slate-200 border-b-0 bg-slate-50/30' : 'rounded-[2rem] border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                      <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors px-2 shrink-0">
                        <ParcelowIcon className="w-full h-10" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-base uppercase tracking-tight">{t('rapidRegistration.payment.methods.parcelow')}</div>
                        <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('rapidRegistration.payment.notes.parcelowFees')}</div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <div className="text-slate-900 text-xl font-black uppercase tracking-tight">USD ${PACKAGE_FEE_AMOUNT.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest leading-tight">{t('studentOnboarding.documentsUpload.packageFees.installments12x')}</span>
                    </div>
                  </div>
                  <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                    {t('rapidRegistration.payment.notes.parcelowFees')}
                  </div>
                  {loading && selectedPaymentMethod === 'parcelow' && !showInlineCpf && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    </div>
                  )}
                </button>

                {showInlineCpf && (
                  <div className="p-6 bg-blue-50 border border-slate-200 border-t-0 rounded-b-[2rem] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('studentOnboarding.documentsUpload.packageFees.cpfRequiredTitle')}</h4>
                      <button onClick={() => setShowInlineCpf(false)} title={t('common.close')}>
                        <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="000.000.000-00"
                          value={inlineCpf}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').substring(0, 11);
                            // Máscara simples para CPF
                            let masked = val;
                            if (val.length > 9) masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                            else if (val.length > 6) masked = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                            else if (val.length > 3) masked = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                            
                            setInlineCpf(masked);
                            if (cpfError) setCpfError(null);
                          }}
                          className={`w-full bg-white border ${cpfError ? 'border-red-300 ring-4 ring-red-500/10' : 'border-slate-200'} rounded-xl px-4 py-3 text-lg font-bold text-slate-900 tracking-widest focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-300`}
                        />
                        {savingCpf && (
                          <div className="absolute right-3 top-3">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                      {cpfError && (
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" />
                          {cpfError}
                        </p>
                      )}
                      <button
                        onClick={handleSaveCpf}
                        disabled={savingCpf || inlineCpf.replace(/\D/g, '').length !== 11}
                        className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                      >
                        {t('studentOnboarding.documentsUpload.packageFees.saveCpfContinue')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Zelle */}
              <div className="flex flex-col">
                <button
                  onClick={() => { setShowZelle(!showZelle); setSelectedPaymentMethod('zelle'); setShowInlineCpf(false); }}
                  disabled={loading}
                  className={`group/btn relative bg-white border px-6 py-6 md:p-8 text-left hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full ${
                    showZelle ? 'rounded-t-[2rem] border-slate-200 border-b-0 bg-slate-50/30' : 'rounded-[2rem] border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                      <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                        <ZelleIcon className="w-9 h-9" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-base uppercase tracking-tight">{t('rapidRegistration.payment.methods.zelle')}</div>
                        <div className="hidden md:flex text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wide leading-tight items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {t('rapidRegistration.payment.notes.zelleTime')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-slate-900 text-xl font-black uppercase tracking-tight">USD $1,800.00</div>
                      <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest leading-tight text-right">{t('studentOnboarding.documentsUpload.packageFees.noFees')}</span>
                    </div>
                  </div>
                  <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('rapidRegistration.payment.notes.zelleTime')}
                  </div>
                </button>

                {showZelle && (
                  <div className="border border-slate-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                    <ZelleCheckout
                      feeType={feeType as any}
                      amount={PACKAGE_FEE_AMOUNT}
                      onClose={() => {
                        console.log('[PackageFeeTab] Zelle onClose triggered');
                        setShowZelle(false);
                      }}
                      onSuccess={() => {
                        console.log('[PackageFeeTab] Zelle onSuccess triggered');
                        setShowZelle(false);
                        onPaymentSuccess();
                      }}
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
  );
};
