import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import {
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Shield,
    X,
    Loader2,
    Building
} from 'lucide-react';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { calculateCardAmountWithFees, getExchangeRate, calculatePIXTotalWithIOF } from '../../../utils/stripeFeeCalculator';
import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';

interface ApplicationWithScholarship {
    id: string;
    scholarship_id: string;
    scholarships: {
        id: string;
        title: string;
        image_url: string | null;
        annual_value_with_scholarship: number;
        universities: {
            id: string;
            name: string;
            logo_url: string | null;
        } | null;
    } | null;
}

// Componente SVG para o logo do PIX (oficial)
const PixIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z" />
        <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z" />
        <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z" />
    </svg>
);

// Componente SVG para o logo do Zelle
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

const ParcelowIcon = ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center bg-white rounded-lg overflow-hidden p-0.5 border border-gray-100`}>
        <img
            src="/parcelow_share.webp"
            alt="Parcelow"
            className="w-full h-full object-contain scale-110"
        />
    </div>
);

const StripeIcon = ({ className }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center bg-[#635bff] rounded-lg overflow-hidden shadow-sm shadow-[#635bff]/20`}>
        <span
            className="text-white font-black text-[28px] leading-[0] select-none"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', transform: 'translateY(-1.5px)' }}
        >
            S
        </span>
    </div>
);

export const ReinstatementFeeStep: React.FC<StepProps> = ({ onNext, onBack, currentStep }) => {
    const { t } = useTranslation(['registration', 'payment']);
    const { userProfile } = useAuth();
    const { formatFeeAmount } = useFeeConfig(userProfile?.user_id);
    const { isBlocked, pendingPayment, refetch: refetchPaymentStatus } = usePaymentBlocked();

    const [exchangeRate, setExchangeRate] = useState<number>(0);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);
    const [isZelleActive, setIsZelleActive] = useState(false);
    const [showInlineCpf, setShowInlineCpf] = useState(false);
    const [inlineCpf, setInlineCpf] = useState('');
    const [savingCpf, setSavingCpf] = useState(false);
    const [cpfError, setCpfError] = useState<string | null>(null);
    const [application, setApplication] = useState<ApplicationWithScholarship | null>(null);
    const [loadingApp, setLoadingApp] = useState(true);

    const baseAmount = 500; // Valor fixo da Reinstatement Fee
    
    // Se has_paid_reinstatement_package já está true no perfil, avançar automaticamente
    const isAlreadyPaid = !!(userProfile as any)?.has_paid_reinstatement_package;

    useEffect(() => {
        getExchangeRate().then(rate => setExchangeRate(rate));
        
        const fetchSelectedApplication = async () => {
            if (!userProfile?.selected_application_id) {
                setLoadingApp(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('scholarship_applications')
                    .select(`
                        id,
                        scholarship_id,
                        scholarships (
                            id,
                            title,
                            image_url,
                            universities (
                                id,
                                name,
                                logo_url
                            )
                        )
                    `)
                    .eq('id', userProfile.selected_application_id)
                    .single();

                if (error) throw error;
                setApplication(data as any);
            } catch (err) {
                console.error('[ReinstatementFeeStep] Error fetching application:', err);
            } finally {
                setLoadingApp(false);
            }
        };

        fetchSelectedApplication();
    }, [userProfile?.selected_application_id]);

    // Se o usuário já pagou, avançar automaticamente
    useEffect(() => {
        if (isAlreadyPaid) {
            onNext();
        }
    }, [isAlreadyPaid, onNext]);

    const processCheckout = async (method: 'stripe' | 'pix' | 'parcelow') => {
        try {
            setIsProcessingCheckout(method);
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) throw new Error('User not authenticated');

            let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-reinstatement-fee`;
            if (method === 'parcelow') {
                apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-reinstatement-fee`;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: baseAmount,
                    payment_method: method,
                    success_url: `${window.location.origin}/student/onboarding?step=${currentStep}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${window.location.origin}/student/onboarding?step=${currentStep}&payment=cancelled`,
                    metadata: {
                        fee_type: 'reinstatement_package',
                        exchange_rate: exchangeRate.toString()
                    },
                    payment_type: 'reinstatement_package',
                    fee_type: 'reinstatement_package',
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error creating checkout session');
            }

            const data = await response.json();
            const redirectUrl = data.session_url || data.checkout_url || data.url;

            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                throw new Error('Session/Checkout URL not found');
            }
        } catch (err: any) {
            console.error(`[ReinstatementFeeStep] Error processing ${method} checkout:`, err);
            alert(err.message || t('payment:paymentStep.error.generationFailed'));
        } finally {
            setIsProcessingCheckout(null);
        }
    };

    const saveCpfAndCheckout = async () => {
        const cleaned = inlineCpf.replace(/\D/g, '');
        if (cleaned.length !== 11) {
            setCpfError(t('payment:paymentStep.parcelowCpfInvalid'));
            return;
        }

        try {
            setSavingCpf(true);
            setCpfError(null);

            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ cpf_document: cleaned })
                .eq('user_id', userProfile?.user_id);

            if (updateError) throw updateError;

            setShowInlineCpf(false);
            await processCheckout('parcelow');
        } catch (err: any) {
            console.error('[ReinstatementFeeStep] Error saving CPF:', err);
            setCpfError(t('payment:paymentStep.parcelowCpfError'));
        } finally {
            setSavingCpf(false);
        }
    };

    const handleParcelowClick = () => {
        if (!(userProfile as any)?.cpf_document) {
            setShowInlineCpf(true);
            return;
        }
        processCheckout('parcelow');
    };

    const hasZellePending = isBlocked && pendingPayment?.fee_type === 'reinstatement_package';

    const cardAmount = calculateCardAmountWithFees(baseAmount);
    const pixInfo = calculatePIXTotalWithIOF(baseAmount, exchangeRate);

    if (isAlreadyPaid) {
        return (
            <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
                <div className="text-center md:text-left space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t('reinstatementFeeStep.title')}</h2>
                    <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mt-2">{t('reinstatementFeeStep.confirmedMessage')}</p>
                </div>
                <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 text-center py-4">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                            <CheckCircle className="w-12 h-12 text-emerald-400" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">{t('reinstatementFeeStep.paidSuccess')}</h3>
                        <p className="text-gray-500 mb-8 font-medium">{t('reinstatementFeeStep.confirmedMessage')}</p>
                        <button
                            onClick={onNext}
                            className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
                        >
                            {t('registration:studentOnboarding.processType.continueButton')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 w-full mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="text-center md:text-left space-y-4">
                    <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-2">
                        <Shield className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('payment:preCheckoutModal.securePayment')}</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                        {t('reinstatementFeeStep.title')}
                    </h2>
                    <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl">
                        {t('reinstatementFeeStep.subtitle')}
                    </p>
                </div>
            </div>

            <div className="relative overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 w-full">
                    <div className="lg:col-span-12 space-y-6">
                        <div className="group relative bg-white border border-slate-200 rounded-[2rem] px-4 py-8 md:p-8 transition-all shadow-sm hover:shadow-xl">
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="w-28 h-28 bg-slate-50 rounded-[2rem] flex items-center justify-center flex-shrink-0 mx-auto md:mx-0 border border-slate-100/50 shadow-sm overflow-hidden group-hover:scale-105 transition-transform duration-500 p-4">
                                            {loadingApp ? (
                                                <Loader2 className="w-12 h-12 text-slate-300 animate-spin" />
                                            ) : application?.scholarships?.universities?.logo_url || application?.scholarships?.image_url ? (
                                                <img 
                                                    src={application.scholarships.universities?.logo_url || application.scholarships.image_url || ''} 
                                                    alt={application.scholarships.title}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <Building className="w-16 h-16 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 text-center md:text-left">
                                            {application?.scholarships ? (
                                                <>
                                                    <h3 className="text-2xl font-black text-gray-900 truncate uppercase tracking-tight">
                                                        {application.scholarships.title}
                                                    </h3>
                                                    <div className="flex items-center justify-center md:justify-start gap-1.5 mt-0.5 text-gray-500">
                                                        <Building className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-bold uppercase tracking-wide">
                                                            {application.scholarships.universities?.name}
                                                        </span>
                                                    </div>
                                                    {application.scholarships.annual_value_with_scholarship > 0 && (
                                                        <div className="mt-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                            {t('reinstatementFeeStep.annualTuition', { 
                                                                amount: application.scholarships.annual_value_with_scholarship.toLocaleString('en-US', { 
                                                                    style: 'currency', 
                                                                    currency: 'USD' 
                                                                }) 
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <h3 className="text-2xl font-black text-gray-900 truncate uppercase tracking-tight">
                                                    {t('reinstatementFeeStep.feeLabel')}
                                                </h3>
                                            )}
                                            
                                            {t('reinstatementFeeStep.description') && (
                                                <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-md mt-2">
                                                    {t('reinstatementFeeStep.description')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center md:items-end">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{t('reinstatementFeeStep.feeLabel')}</span>
                                        <div className="text-4xl font-black text-slate-900 tracking-tighter">
                                            {formatFeeAmount(baseAmount)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 mt-4">
                                    {hasZellePending ? (
                                        <div className="flex flex-col gap-0">
                                            <div className="bg-amber-50 border border-amber-200 rounded-t-[2rem] px-6 py-4 flex items-start gap-4">
                                                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 flex-shrink-0 mt-0.5">
                                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-amber-700 uppercase tracking-tight">{t('payment:paymentStep.zellePendingTitle')}</p>
                                                    <p className="text-xs text-amber-600/80 font-medium mt-0.5 leading-relaxed">
                                                        {t('payment:paymentStep.zellePendingMessage')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="border border-amber-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                                                <ZelleCheckout
                                                    feeType="reinstatement_package"
                                                    amount={baseAmount}
                                                    metadata={{
                                                        fee_type: 'reinstatement_package'
                                                    }}
                                                    isPendingVerification={hasZellePending}
                                                    onProcessingChange={(isProcessing) => { if (isProcessing) refetchPaymentStatus(); }}
                                                    hideHeader={true}
                                                    onSuccess={onNext}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Stripe */}
                                            <button
                                                onClick={() => processCheckout('stripe')}
                                                disabled={!!isProcessingCheckout}
                                                className="group/btn relative bg-white border border-gray-200 px-4 py-5 md:p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                                        <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                                                            <StripeIcon className="w-9 h-9" />
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-900 text-base uppercase tracking-tight">{t('payment:paymentStep.creditCard')}</div>
                                                            <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('payment:paymentStep.creditCardFees')}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-slate-900 text-xl font-black uppercase tracking-tight">{formatFeeAmount(cardAmount, true)}</div>
                                                    </div>
                                                </div>
                                                {isProcessingCheckout === 'stripe' && (
                                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* PIX */}
                                            {pixInfo.totalWithIOF <= 3000 && (
                                                <button
                                                    onClick={() => processCheckout('pix')}
                                                    disabled={!!isProcessingCheckout}
                                                    className="group/btn relative bg-white border border-gray-200 px-4 py-5 md:p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full"
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                                            <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                                                                <PixIcon className="w-9 h-9" />
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">PIX</div>
                                                                <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('payment:paymentStep.pixFees')}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                                                                R$ {pixInfo.totalWithIOF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Parcelow */}
                                            <div className="group/parcelow flex flex-col gap-0">
                                                <button
                                                    onClick={handleParcelowClick}
                                                    disabled={!!isProcessingCheckout}
                                                    className={`group/btn relative bg-white border border-gray-200 px-4 py-5 md:p-5 text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full ${showInlineCpf ? 'rounded-t-[2rem] border-b-0' : 'rounded-[2rem]'}`}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                                            <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors px-2 shrink-0">
                                                                <ParcelowIcon className="w-full h-10" />
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">Parcelow</div>
                                                                <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('payment:paymentStep.parcelowFees')}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end shrink-0">
                                                            <div className="text-slate-900 text-xl font-black uppercase tracking-tight">{formatFeeAmount(baseAmount, true)}</div>
                                                            <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest leading-tight">{t('payment:paymentStep.parcelowInstallments')}</span>
                                                        </div>
                                                    </div>
                                                </button>

                                                {showInlineCpf && (
                                                    <div className="p-6 bg-slate-50 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('payment:paymentStep.cpfRequiredTitle')}</h4>
                                                            <button onClick={() => setShowInlineCpf(false)} title="Fechar">
                                                                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                                            </button>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder={t('payment:paymentStep.cpfPlaceholder')}
                                                                    value={inlineCpf}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value.replace(/\D/g, '').substring(0, 11);
                                                                        setInlineCpf(val);
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
                                                                onClick={saveCpfAndCheckout}
                                                                disabled={savingCpf || inlineCpf.replace(/\D/g, '').length !== 11}
                                                                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                                            >
                                                                {t('payment:paymentStep.payWith', { method: 'Parcelow' })}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Zelle */}
                                            <div className="flex flex-col">
                                                <button
                                                    onClick={() => setIsZelleActive(!isZelleActive)}
                                                    disabled={!!isProcessingCheckout}
                                                    className={`group/btn relative bg-white border px-4 py-5 md:p-5 text-left hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full ${isZelleActive
                                                        ? 'rounded-t-[2rem] border-slate-200 border-b-0 bg-slate-50/30'
                                                        : 'rounded-[2rem] border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                                            <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                                                                <ZelleIcon className="w-9 h-9" />
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">Zelle</div>
                                                                <div className="hidden md:flex text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wide leading-tight items-center gap-1">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    {t('payment:paymentStep.zelleProcessingTime')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-slate-900 text-xl font-black uppercase tracking-tight">{formatFeeAmount(baseAmount)}</div>
                                                            <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest leading-tight">{t('payment:paymentStep.zelleNoFees')}</span>
                                                        </div>
                                                    </div>
                                                </button>

                                                {isZelleActive && (
                                                    <div className="border border-slate-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                                                        <ZelleCheckout
                                                            feeType="reinstatement_package"
                                                            amount={baseAmount}
                                                            metadata={{
                                                                fee_type: 'reinstatement_package'
                                                            }}
                                                            isPendingVerification={hasZellePending}
                                                            onProcessingChange={(isProcessing) => { if (isProcessing) refetchPaymentStatus(); }}
                                                            onClose={() => setIsZelleActive(false)}
                                                            onSuccess={() => {
                                                                setIsZelleActive(false);
                                                                onNext();
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
            </div>
            
            <div className="flex justify-start mt-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-xs transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('registration:rapidRegistration.zelle.back')}
                </button>
            </div>
        </div>
    );
};

const ArrowLeft = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);
