import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Building,
  Shield,
  Loader2
} from 'lucide-react';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { useTranslation } from 'react-i18next';

import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { calculateCardAmountWithFees, getExchangeRate, calculatePIXTotalWithIOF } from '../../../utils/stripeFeeCalculator';

interface ApplicationWithScholarship {
  id: string;
  status: string;
  applied_at: string;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  scholarship_id: string;
  scholarships: {
    id: string;
    title: string;
    level: string;
    application_fee_amount: number | null;
    annual_value_with_scholarship?: number;
    image_url: string | null;
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

// Componente SVG para o logo do Zelle (oficial)
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
    <span
      className="text-white font-black text-[28px] leading-[0] select-none"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transform: 'translateY(-1.5px)' // Puxando para cima para compensar o peso da fonte
      }}
    >
      S
    </span>
  </div>
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

import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';

export const PaymentStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const { userProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount, userDependents } = useFeeConfig(userProfile?.user_id);
  const { isBlocked, pendingPayment, refetch: refetchPaymentStatus } = usePaymentBlocked();
  const { t } = useTranslation();

  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);
  const [zelleActiveApp, setZelleActiveApp] = useState<ApplicationWithScholarship | null>(null);

  // CPF inline states (para Parcelow)
  const [showInlineCpf, setShowInlineCpf] = useState<string | null>(null); // app.id quando aberto
  const [inlineCpf, setInlineCpf] = useState('');
  const [savingCpf, setSavingCpf] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [pendingParcelowApp, setPendingParcelowApp] = useState<ApplicationWithScholarship | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      setLoading(applications.length === 0);
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          scholarships (
            *,
            universities (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('student_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allApps = (data || []) as ApplicationWithScholarship[];
      let selectedId = localStorage.getItem('selected_application_id');

      // Se houver uma selecionada, tentamos filtrar
      let filteredApps = selectedId
        ? allApps.filter(app => app.id === selectedId || app.is_application_fee_paid)
        : allApps;

      // Segurança: Se temos aplicações mas o filtro resultou em vazio (ID inválido ou antigo)
      // Selecionamos a aplicação mais recente automaticamente
      if (allApps.length > 0 && filteredApps.length === 0) {
        const mostRecent = allApps[0];
        filteredApps = [mostRecent];
        localStorage.setItem('selected_application_id', mostRecent.id);
      }

      setApplications(filteredApps);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id, applications.length]);

  useEffect(() => {
    fetchApplications();
    getExchangeRate().then(rate => setExchangeRate(rate));
  }, [fetchApplications]);

  const unpaidApplications = applications.filter(app => !app.is_application_fee_paid);
  const allPaid = applications.length > 0 && unpaidApplications.length === 0;

  // Detecta se há um Zelle pendente do tipo application_fee
  const hasZellePendingApplicationFee = isBlocked && pendingPayment?.fee_type === 'application_fee';

  // Formatar CPF enquanto digita (000.000.000-00)
  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Salvar CPF inline e prosseguir ao checkout Parcelow
  const saveCpfAndCheckout = async () => {
    const cleaned = inlineCpf.replace(/\D/g, '');
    if (cleaned.length !== 11) {
      setCpfError(t('paymentStep.parcelowCpfInvalid'));
      return;
    }
    if (!pendingParcelowApp) return;

    setSavingCpf(true);
    setCpfError(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ cpf_document: cleaned })
        .eq('user_id', userProfile?.user_id);

      if (error) throw error;

      // Fechar campo inline
      setShowInlineCpf(null);
      setInlineCpf('');

      // Chamar checkout normalmente agora que CPF está salvo (pulando a checagem no estado local)
      processCheckout(pendingParcelowApp, 'parcelow', true);
    } catch (err: any) {
      setCpfError(t('paymentStep.parcelowCpfError'));
      console.error('[PaymentStep] Erro ao salvar CPF inline:', err);
    } finally {
      setSavingCpf(false);
    }
  };

  const processCheckout = async (application: ApplicationWithScholarship, method: 'stripe' | 'pix' | 'parcelow', skipCpfCheck = false) => {
    // Verificar CPF se o método for Parcelow e não estivermos ignorando a checagem
    if (method === 'parcelow' && !userProfile?.cpf_document && !skipCpfCheck) {
      setPendingParcelowApp(application);
      setShowInlineCpf(application.id);
      // Fechar Zelle se aberto
      setZelleActiveApp(null);
      return;
    }
    // Se mudando de método, fechar CPF inline
    setShowInlineCpf(null);

    try {
      setIsProcessingCheckout(`${application.id}_${method}`);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) throw new Error('User not authenticated');

      let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-application-fee`;
      if (method === 'parcelow') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-application-fee`;
      }

      const baseAmount = getFeeAmount('application_fee', application.scholarships?.application_fee_amount || undefined);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          application_id: application.id,
          scholarships_ids: [application.scholarship_id],
          amount: baseAmount,
          payment_method: method,
          success_url: `${window.location.origin}/student/onboarding?step=payment&payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/student/onboarding?step=payment&payment=cancelled`,
          metadata: {
            application_id: application.id,
            selected_scholarship_id: application.scholarship_id,
            fee_type: 'application_fee',
            exchange_rate: exchangeRate.toString()
          }
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
      console.error(`Error processing ${method} checkout:`, err);
      alert(err.message || 'Error processing payment. Please try again.');
    } finally {
      setIsProcessingCheckout(null);
    }
  };

  const handleZelleClick = (application: ApplicationWithScholarship) => {
    setZelleActiveApp(prev => prev?.id === application.id ? null : application);
  };



  if (loading && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-6" />
        <p className="text-white/60 font-bold uppercase tracking-widest text-sm">{t('paymentStep.loading')}</p>
      </div>
    );
  }

  if (allPaid && !loading && applications.length > 0) {
    return (
      <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
        <div className="text-left space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t('paymentStep.title')}</h2>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

          <div className="relative z-10 text-center py-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">{t('paymentStep.completedTitle')}</h3>
            <p className="text-gray-500 mb-8 font-medium">{t('paymentStep.completedSubtitle')}</p>
            <button
              onClick={onNext}
              className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
            >
              {t('paymentStep.continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-10 pb-20 w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-left space-y-4">
          <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-2">
            <Shield className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('paymentStep.securePaymentBadge')}</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            {t('paymentStep.title')}
          </h2>
          <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl">
            {allPaid 
              ? t('paymentStep.subtitleAllPaid')
              : t('paymentStep.subtitlePending')}
          </p>
        </div>


      </div>

      <div className="relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 w-full">
          {/* Main List */}
          <div className="lg:col-span-12 space-y-6">
            {applications.map((app) => {
              const baseAmount = getFeeAmount('application_fee', app.scholarships?.application_fee_amount || undefined);
              const cardAmount = calculateCardAmountWithFees(baseAmount);
              const pixInfo = calculatePIXTotalWithIOF(baseAmount, exchangeRate);

              return (
                <div
                  key={app.id}
                  className={`group relative bg-white border rounded-[2rem] px-4 py-8 md:p-8 transition-all ${
                    app.is_application_fee_paid 
                      ? 'border-emerald-500/30 ring-1 ring-emerald-500/20 bg-white' 
                      : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl'
                  }`}
                >
                  {app.is_application_fee_paid && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 z-20 scale-110 border-4 border-white">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {app.scholarships?.image_url || app.scholarships?.universities?.logo_url ? (
                          <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center border border-gray-100/50 overflow-hidden shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-500 mx-auto md:mx-0">
                            <img 
                              src={app.scholarships.image_url || app.scholarships.universities?.logo_url || ''} 
                              alt="" 

                              className="w-full h-full object-contain p-2"
                              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="w-28 h-28 bg-slate-50 rounded-[2rem] flex items-center justify-center flex-shrink-0 mx-auto md:mx-0">
                            <Building className="w-16 h-16 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 text-center md:text-left">
                          <div className="mb-1">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                              {app.scholarships?.title || 'Scholarship'}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                            <Building className="w-3 h-3" />
                            {app.scholarships?.universities?.name || 'University'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center md:items-end">
                        <div className="flex items-center gap-3 mb-4 md:mb-2">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{t('paymentStep.enrollmentFeeLabel')}</span>
                        </div>
                        {userDependents > 0 && (
                          <div className="text-center md:text-right mb-3 flex flex-col items-center md:items-end gap-1.5 border-b border-slate-100 pb-3 w-full md:w-auto">
                            <p className="text-xs font-bold text-slate-900 uppercase tracking-tight flex justify-between w-full gap-8">
                              <span>{t('paymentStep.feeWithoutDependents')}</span>
                              <span>{formatFeeAmount(baseAmount - (userDependents * 100))}</span>
                            </p>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-tight flex justify-between w-full gap-8">
                              <span>{userDependents} {userDependents === 1 ? t('paymentStep.dependentsSingular') : t('paymentStep.dependentsPlural')}</span>

                              <span>+ {formatFeeAmount(userDependents * 100)}</span>
                            </p>
                          </div>
                        )}
                        <div className="text-4xl font-black text-slate-900 tracking-tighter">
                          {formatFeeAmount(baseAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Payment Options List */}
                    {!app.is_application_fee_paid && (
                      <div className="flex flex-col gap-4 mt-4">
                        {/* Zelle Pendente — bloqueia outros métodos */}
                        {hasZellePendingApplicationFee ? (
                          <div className="flex flex-col gap-0">
                            {/* Banner de aviso */}
                            <div className="bg-amber-50 border border-amber-200 rounded-t-[2rem] px-6 py-4 flex items-start gap-4">
                              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 flex-shrink-0 mt-0.5">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-amber-700 uppercase tracking-tight">{t('paymentStep.zellePendingTitle')}</p>
                                <p className="text-xs text-amber-600/80 font-medium mt-0.5 leading-relaxed">
                                  {t('paymentStep.zellePendingMessage')}
                                </p>
                              </div>
                            </div>

                            {/* ZelleCheckout inline — aberto automaticamente */}
                            <div className="border border-amber-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                              <ZelleCheckout
                                feeType="application_fee"
                                amount={getFeeAmount('application_fee', app.scholarships?.application_fee_amount || undefined)}
                                scholarshipsIds={[app.scholarship_id]}
                                metadata={{
                                  application_id: app.id,
                                  selected_scholarship_id: app.scholarship_id,
                                  annual_tuition: app.scholarships?.annual_value_with_scholarship
                                }}
                                isPendingVerification={hasZellePendingApplicationFee}
                                onProcessingChange={(isProcessing) => {
                                  if (isProcessing) refetchPaymentStatus();
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Stripe Option */}
                            <button
                              onClick={() => processCheckout(app, 'stripe')}
                              disabled={!!isProcessingCheckout}
                              className="group/btn relative bg-white border border-gray-200 px-4 py-5 md:p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                  <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors shrink-0">
                                    <StripeIcon className="w-9 h-9" />
                                  </div>
                                  <div>
                                    <div className="font-black text-slate-900 text-base uppercase tracking-tight">{t('paymentStep.creditCard')}</div>
                                    <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('paymentStep.creditCardFees')}</div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                                    {formatFeeAmount(cardAmount)}
                                  </div>
                                </div>
                              </div>
                              <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                                {t('paymentStep.creditCardFees')}
                              </div>
                              {isProcessingCheckout === `${app.id}_stripe` && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* PIX Option */}
                            <button
                              onClick={() => processCheckout(app, 'pix')}
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
                                    <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('paymentStep.pixFees')}</div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                                    R$ {pixInfo.totalWithIOF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                              <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                                {t('paymentStep.pixFees')}
                              </div>
                              {isProcessingCheckout === `${app.id}_pix` && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <RefreshCw className="w-8 h-8 text-[#4db6ac] animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* Parcelow Option */}
                            <div className="flex flex-col">
                              <button
                                onClick={() => processCheckout(app, 'parcelow')}
                                disabled={!!isProcessingCheckout}
                                className="group/btn relative bg-white border border-gray-200 px-4 py-5 md:p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-4 sm:gap-5 -ml-1 md:ml-0">
                                    <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl group-hover/btn:bg-slate-100 transition-colors px-2 shrink-0">
                                      <ParcelowIcon className="w-full h-10" />
                                    </div>
                                    <div>
                                      <div className="font-black text-slate-900 text-base uppercase tracking-tight">Parcelow</div>
                                      <div className="hidden md:block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide leading-tight">{t('paymentStep.parcelowFees')}</div>
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end shrink-0">
                                    <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                                      {formatFeeAmount(cardAmount)}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest leading-tight">{t('paymentStep.parcelowInstallments')}</span>
                                  </div>
                                </div>
                                <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                                  {t('paymentStep.parcelowFees')}
                                </div>
                                {isProcessingCheckout === `${app.id}_parcelow` && (
                                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                    <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                                  </div>
                                )}
                              </button>

                              {/* Campo inline de CPF para Parcelow */}
                              {showInlineCpf === app.id && (
                                <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl mt-4 space-y-4 animate-fadeIn relative z-0 shadow-[0_15px_30px_rgba(59,130,246,0.1)]">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex-initial sm:w-[300px]">
                                      <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Shield className="w-3 h-3" />
                                        {t('paymentStep.parcelowCpfTitle')}
                                      </p>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={inlineCpf}
                                          onChange={(e) => {
                                            setInlineCpf(formatCpf(e.target.value));
                                            setCpfError(null);
                                          }}
                                          placeholder={t('paymentStep.parcelowCpfPlaceholder')}
                                          maxLength={14}
                                          className="w-full px-4 py-3 rounded-xl border border-blue-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all shadow-sm"
                                        />
                                      </div>
                                    </div>
                                    <button
                                      onClick={saveCpfAndCheckout}
                                      disabled={savingCpf || inlineCpf.replace(/\D/g, '').length !== 11}
                                      className="sm:mt-6 px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95"
                                    >
                                      {savingCpf ? <Loader2 className="w-4 h-4 animate-spin" /> : t('paymentStep.goToPayment')}
                                    </button>
                                  </div>
                                  {cpfError && (
                                    <p className="text-xs text-red-600 flex items-center gap-1 font-bold animate-pulse">
                                      <AlertCircle className="w-4 h-4" />
                                      {cpfError}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Zelle Option — accordion inline */}
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleZelleClick(app)}
                                disabled={!!isProcessingCheckout}
                                className={`group/btn relative bg-white border px-4 py-5 md:p-5 text-left hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 block w-full ${
                                  zelleActiveApp?.id === app.id
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
                                        {t('paymentStep.zelleProcessingTime')}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-5 shrink-0">
                                    <div className="text-right">
                                      <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                                        {formatFeeAmount(baseAmount)}
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest">{t('paymentStep.zelleNoFees')}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="md:hidden mt-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {t('paymentStep.zelleProcessingTime')}
                                </div>
                              </button>

                              {zelleActiveApp?.id === app.id && (
                                <div className="border border-slate-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                                  <ZelleCheckout
                                    feeType="application_fee"
                                    amount={getFeeAmount('application_fee', app.scholarships?.application_fee_amount || undefined)}
                                    scholarshipsIds={[app.scholarship_id]}
                                    metadata={{
                                      application_id: app.id,
                                      selected_scholarship_id: app.scholarship_id,
                                      annual_tuition: app.scholarships?.annual_value_with_scholarship
                                    }}
                                    isPendingVerification={hasZellePendingApplicationFee}
                                    onProcessingChange={(isProcessing) => {
                                      if (isProcessing) refetchPaymentStatus();
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}


                    {/* Paid Badge Area */}
                    {app.is_application_fee_paid && (
                      <div className="flex items-center gap-4 bg-white border border-emerald-100 px-6 py-4 rounded-[2rem]">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-emerald-700 font-black uppercase tracking-widest text-sm">{t('paymentStep.paymentConfirmed')}</div>
                          <p className="text-emerald-600/80 text-xs font-medium uppercase tracking-tight mt-0.5">{t('paymentStep.paymentConfirmedSubtitle')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {applications.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                  <AlertCircle className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t('paymentStep.noApplications')}</h3>
                <p className="text-gray-500 font-medium max-w-sm">{t('paymentStep.noApplicationsMessage')}</p>
                <button 

                  onClick={onBack}
                  className="mt-6 px-8 py-3 bg-white border border-gray-200 rounded-2xl text-gray-900 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all shadow-sm"
                >
                  {t('paymentStep.backToSelection')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};
