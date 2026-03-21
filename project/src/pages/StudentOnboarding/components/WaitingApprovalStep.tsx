import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle,
  Loader2,
  Building,
  AlertCircle,
  GraduationCap,
  FileText,
  Clock,
  RefreshCw,
  Download,
  Lock,
  Shield,
  Info,
  ArrowRight,
  Award,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { useTranslation } from 'react-i18next';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { useDynamicFees } from '../../../hooks/useDynamicFees';
import { I20ControlFeeModal } from '../../../components/I20ControlFeeModal';
import { STRIPE_PRODUCTS } from '../../../stripe-config';
import { ProfileRequiredModal } from '../../../components/ProfileRequiredModal';
import { ZelleCheckout } from '../../../components/ZelleCheckout';

interface ApplicationWithScholarship {
  id: string;
  status: string;
  applied_at: string;
  scholarship_id: string;
  acceptance_letter_url?: string | null;
  acceptance_letter_status?: string | null;
  acceptance_letter_sent_at?: string | null;
  acceptance_letter_approved_at?: string | null;
  acceptance_letter_signed_url?: string | null;
  acceptance_letter_signed_at?: string | null;
  is_application_fee_paid?: boolean;
  is_scholarship_fee_paid?: boolean;
  scholarships: {
    id: string;
    title: string;
    annual_value_with_scholarship: number;
    level: string;
    image_url: string | null;
    university_id?: string;
    universities: {
      id: string;
      name: string;
      logo_url?: string;
    };
  };
}

import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';

export const WaitingApprovalStep: React.FC<StepProps> = ({ onComplete }) => {
  const { t } = useTranslation(['registration', 'common']);
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const { i20ControlFee, hasSellerPackage } = useDynamicFees();
  const { isBlocked, pendingPayment, refetch: refetchPaymentStatus } = usePaymentBlocked();


  const [application, setApplication] = useState<ApplicationWithScholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // I-20 Payment states
  const [showI20Modal, setShowI20Modal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
  const [i20Loading, setI20Loading] = useState(false);
  const [i20Error, setI20Error] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [profileErrorType, setProfileErrorType] = useState<'cpf_missing' | 'profile_incomplete' | null>(null);
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);

  // Derived state
  const isNewFlowUser = !!(userProfile as any)?.placement_fee_flow;
  const hasPaidI20 = isNewFlowUser || !!(userProfile && (userProfile as any).has_paid_i20_control_fee);
  const hasZellePendingI20 = isBlocked && pendingPayment?.fee_type === 'i20_control_fee';
  const i20PaidAt = (userProfile as any)?.i20_paid_at || null;

  // Acceptance letter states
  const letterStatus = application?.acceptance_letter_status || 'pending';
  const letterUrl = application?.acceptance_letter_url || null;
  const letterSentAt = application?.acceptance_letter_sent_at || null;
  const hasLetterAvailable = letterStatus === 'sent' || letterStatus === 'approved' || !!letterSentAt;
  const canDownloadLetter = hasPaidI20 && hasLetterAvailable && !!letterUrl;

  // I-20 Fee amount
  const i20Amount = hasSellerPackage && i20ControlFee
    ? parseFloat(i20ControlFee.replace('$', ''))
    : getFeeAmount('i20_control_fee');

  // Fetch the single application (most recent approved one)
  const fetchApplication = useCallback(async () => {
    if (!userProfile?.id) {
      setLoading(false);
      setApplication(null);
      return;
    }

    try {
      // Buscar a candidatura mais recente que possui scholarship_fee paga ou está aprovada
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`*, scholarships(*, universities(id, name, logo_url))`)
        .eq('student_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[WaitingApprovalStep] Error fetching application:', error);
      } else if (data && data.length > 0) {
        // Segurança: ocultar URL da carta se I-20 não foi pago (exceto se for novo fluxo)
        const app = data[0] as ApplicationWithScholarship;
        const isNewFlow = !!(userProfile as any)?.placement_fee_flow;
        if (!isNewFlow && !(userProfile as any)?.has_paid_i20_control_fee) {
          app.acceptance_letter_url = null;
        }
        setApplication(app);
      } else {
        setApplication(null);
      }
    } catch (error) {
      console.error('[WaitingApprovalStep] Error fetching application:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.id, hasPaidI20]);

  useEffect(() => {
    fetchApplication();
    const interval = setInterval(fetchApplication, 15000);
    return () => clearInterval(interval);
  }, [fetchApplication]);

  // Refresh handler
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchApplication();
    if (refetchUserProfile) refetchUserProfile();
  };

  // I-20 Payment handlers
  const handlePayI20Click = () => {
    setSelectedPaymentMethod(null);
    setI20Error(null);
    setShowI20Modal(true);
  };

  const handlePaymentMethodSelect = (method: 'stripe' | 'zelle' | 'pix' | 'parcelow', exchangeRateParam?: number) => {
    setSelectedPaymentMethod(method);
    if (method === 'pix' && exchangeRateParam) {
      setExchangeRate(exchangeRateParam);
    } else {
      setExchangeRate(null);
    }
  };

  const handleCloseI20Modal = () => {
    setShowI20Modal(false);
    setSelectedPaymentMethod(null);
  };

  const handleProceedPayment = useCallback(async () => {
    if (!selectedPaymentMethod) return;

    setI20Loading(true);
    setI20Error(null);

    try {
      if (selectedPaymentMethod === 'stripe') {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout-i20-control-fee`;

        const baseAmount = getFeeAmount('i20_control_fee');
        const promotionalCoupon = (window as any).__checkout_promotional_coupon || null;
        const finalAmountWithDiscount = (window as any).__checkout_final_amount || baseAmount;

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            success_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=cancelled`,
            price_id: STRIPE_PRODUCTS.controlFee.priceId,
            amount: finalAmountWithDiscount,
            payment_method: 'stripe',
            promotional_coupon: promotionalCoupon,
          }),
        });
        const data = await res.json();
        if (data.session_url) {
          window.location.href = data.session_url;
        } else {
          setI20Error('Erro ao criar sessão de pagamento.');
        }
      } else if (selectedPaymentMethod === 'pix') {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout-i20-control-fee`;

        const baseAmount = getFeeAmount('i20_control_fee');
        const promotionalCoupon = (window as any).__checkout_promotional_coupon || null;
        const finalAmountWithDiscount = (window as any).__checkout_final_amount || baseAmount;

        const metadata: any = {};
        if (exchangeRate && exchangeRate > 0) {
          metadata.exchange_rate = exchangeRate.toString();
        }

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            success_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=cancelled`,
            price_id: STRIPE_PRODUCTS.controlFee.priceId,
            amount: finalAmountWithDiscount,
            payment_method: 'pix',
            promotional_coupon: promotionalCoupon,
            metadata,
          }),
        });
        const data = await res.json();
        if (data.session_url) {
          window.location.href = data.session_url;
        } else {
          setI20Error('Erro ao criar sessão de pagamento PIX.');
        }
      } else if (selectedPaymentMethod === 'zelle') {
        setShowZelleCheckout(true);
        setShowI20Modal(false);
        setI20Loading(false);
      } else if (selectedPaymentMethod === 'parcelow') {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiUrl = `${supabaseUrl}/functions/v1/parcelow-checkout-i20-control-fee`;

        const finalAmount = (window as any).__checkout_final_amount || parseFloat(i20ControlFee?.replace('$', '') || '0');
        const promotionalCoupon = (window as any).__checkout_promotional_coupon || null;

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: finalAmount,
            fee_type: 'i20_control_fee',
            metadata: {
              application_id: application?.id,
              final_amount: finalAmount,
              promotional_coupon: promotionalCoupon,
            },
            promotional_coupon: promotionalCoupon,
            scholarships_ids: application?.scholarships?.id ? [application.scholarships.id] : [],
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          if (errorData.error === 'document_number_required') {
            setProfileErrorType('cpf_missing');
            setShowProfileRequiredModal(true);
            setI20Loading(false);
            return;
          }
          if (errorData.error === 'User profile not found') {
            setProfileErrorType('profile_incomplete');
            setShowProfileRequiredModal(true);
            setI20Loading(false);
            return;
          }
          throw new Error(errorData.error || 'Erro ao criar sessão Parcelow');
        }

        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        } else {
          throw new Error('URL de checkout Parcelow não encontrada');
        }
      }
    } catch (err) {
      console.error('[WaitingApprovalStep] Payment error:', err);
      setI20Error('Erro ao processar pagamento. Tente novamente.');
      setI20Loading(false);
      handleCloseI20Modal();
    }
  }, [selectedPaymentMethod, application, getFeeAmount, i20ControlFee, exchangeRate]);

  // Auto-process payment when method is selected
  useEffect(() => {
    if (selectedPaymentMethod && showI20Modal) {
      const timer = setTimeout(() => {
        handleProceedPayment();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedPaymentMethod, showI20Modal, handleProceedPayment]);

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
        <p className="text-slate-600">Carregando informações...</p>
      </div>
    );
  }

  // Helper functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getLevelLabel = (level: string) => {
    if (!level) return '';
    const levelKey = level.toLowerCase().trim();
    const mappedKey = levelKey === 'doctoral' ? 'doctorate' : levelKey;
    const translationKey = `scholarshipsPage.filters.levels.${mappedKey}`;
    const translated = t(translationKey);
    if (!translated || translated === translationKey || translated.includes('scholarshipsPage.filters.levels')) {
      return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    }
    return translated;
  };

  const handleForceDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    } catch (_e) {
      alert('Erro ao baixar o arquivo. Tente novamente.');
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-center md:text-left space-y-4">
          <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-2">
            <Shield className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Último Passo do Onboarding</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            {isNewFlowUser ? 'Carta de Aceitação' : 'Carta de Aceitação & I-20'}
          </h2>
          <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl">
            {isNewFlowUser
              ? 'Visualize e faça o download da sua carta de aceitação da universidade.'
              : 'Pague a taxa I-20 e faça o download da sua carta de aceitação para garantir sua vaga.'}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl text-slate-600 hover:text-slate-900 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 group shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar Status'}
        </button>
      </div>

      {/* No Application */}
      {!application ? (
        <div className="bg-white rounded-[2.5rem] p-10 md:p-16 shadow-2xl border border-gray-100 text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
            <FileText className="w-12 h-12 text-blue-300" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-3">Nenhuma Candidatura</h3>
          <p className="text-gray-500 font-medium max-w-sm mx-auto">
            Você ainda não possui candidaturas. Complete os passos anteriores do onboarding.
          </p>
        </div>
      ) : showZelleCheckout ? (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowZelleCheckout(false)}
            className="mb-8 flex items-center text-slate-600 hover:text-slate-900 transition-all gap-3 group"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center group-hover:bg-gray-50 group-hover:scale-110 transition-all border border-gray-100 shadow-sm">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </div>
            <span className="font-black uppercase tracking-widest text-xs">Voltar</span>
          </button>

          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
            <ZelleCheckout
              feeType="i20_control_fee"
              amount={i20Amount}
              scholarshipsIds={application?.scholarship_id ? [application.scholarship_id] : []}
              metadata={{
                application_id: application?.id,
                selected_scholarship_id: application?.scholarship_id,
                annual_tuition: application?.scholarships?.annual_value_with_scholarship
              }}
              isPendingVerification={hasZellePendingI20}
              onProcessingChange={(isProcessing) => {
                if (isProcessing) refetchPaymentStatus();
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Main Content - Application Card */}
          <div className="lg:col-span-8">
            <div className={`bg-white rounded-[2.5rem] shadow-2xl border relative overflow-hidden transition-all duration-500 ${hasPaidI20
              ? 'border-emerald-500/30 ring-1 ring-emerald-500/20'
              : 'border-gray-100'
              }`}>

              {/* Application Header with decorative blobs */}
              <div className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[60px] -ml-16 -mb-16 pointer-events-none" />

                <div className="p-8 md:p-10">
                  {/* University Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center space-x-6">
                      {application.scholarships.image_url || application.scholarships.universities?.logo_url ? (
                        <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center border border-gray-100/50 overflow-hidden shadow-sm flex-shrink-0">
                          <img
                            src={application.scholarships.image_url || application.scholarships.universities?.logo_url || ''}
                            alt=""
                            className="w-full h-full object-contain p-2"
                            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                          />
                        </div>
                      ) : (
                        <div className="w-28 h-28 bg-slate-50 rounded-[2rem] flex items-center justify-center flex-shrink-0">
                          <Building className="w-16 h-16 text-slate-300" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl font-black text-gray-900 truncate uppercase tracking-tight mb-1">
                          {application.scholarships.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                            <Building className="w-3 h-3" />
                            {application.scholarships.universities?.name || 'University'}
                          </span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                            <GraduationCap className="w-3 h-3" />
                            {getLevelLabel(application.scholarships.level)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Status badge */}
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest">
                      <CheckCircle className="w-4 h-4" />
                      Aceito
                    </div>
                  </div>

                  {/* I-20 Info Section */}
                  {!isNewFlowUser && (
                    <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-[2rem] border border-blue-100 p-6 sm:p-8 mb-8">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center border border-blue-200">
                          <Info className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="text-gray-900 text-xs font-black uppercase tracking-widest">O que é a Taxa I-20?</h4>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-5 font-medium">
                        O formulário <strong className="text-gray-900">I-20</strong> é o documento oficial emitido pela universidade que confirma sua aceitação no programa. É <strong className="text-gray-900">essencial</strong> para solicitar o visto F-1.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { icon: Shield, title: 'Valida sua matrícula', desc: 'Comprova sua aceitação na universidade' },
                          { icon: FileText, title: 'Necessário para o Visto', desc: 'Obrigatório para aplicar ao visto F-1' },
                          { icon: Award, title: 'Garante sua vaga', desc: 'Sua vaga fica oficialmente assegurada' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-3 bg-white/80 rounded-2xl p-4 border border-blue-100/50">
                            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <item.icon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-xs uppercase tracking-tight">{item.title}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* I-20 Fee Payment Section */}
                  {!isNewFlowUser && (
                    <div className={`group relative rounded-[2rem] p-8 transition-all duration-500 mb-8 ${hasPaidI20
                      ? 'bg-emerald-50/50 border border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-xl'
                      }`}>
                      {hasPaidI20 && (
                        <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 z-20 border-4 border-white">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      )}

                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${hasPaidI20
                              ? 'bg-emerald-100 border-emerald-200'
                              : 'bg-amber-50 border-amber-200'
                              }`}>
                              {hasPaidI20 ? (
                                <CheckCircle className="w-7 h-7 text-emerald-600" />
                              ) : (
                                <Clock className="w-7 h-7 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                I-20 Control Fee
                              </h4>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                                {hasPaidI20 ? 'Pagamento Confirmado' : 'Pagamento Pendente'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col md:items-end">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Valor</span>
                            <span className="text-4xl font-black text-gray-900 tracking-tighter">
                              {i20ControlFee || formatAmount(i20Amount)}
                            </span>
                          </div>
                        </div>

                        {hasPaidI20 ? (
                          <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-[2rem]">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center border border-emerald-200">
                              <CheckCircle className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <div className="text-emerald-700 font-black uppercase tracking-widest text-sm">Pagamento Confirmado</div>
                              <p className="text-emerald-600/80 text-xs font-medium uppercase tracking-tight mt-0.5">
                                {i20PaidAt ? `Pago em ${formatDate(i20PaidAt)}` : 'Sua taxa foi processada com sucesso.'}
                              </p>
                            </div>
                          </div>
                        ) : hasZellePendingI20 ? (
                          <div className="flex flex-col gap-0 shadow-sm rounded-[2rem] overflow-hidden border border-amber-100">
                            <div className="bg-amber-50/50 p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 shrink-0">
                                <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Pagamento Zelle em Análise</p>
                                <p className="text-[11px] text-amber-700/80 font-bold mt-0.5 leading-relaxed uppercase tracking-wide">
                                  Você já iniciou um pagamento via Zelle. Aguarde a confirmação de até 48 horas.
                                </p>
                              </div>
                            </div>
                            <div className="bg-white p-2">
                              <ZelleCheckout
                                feeType="i20_control_fee"
                                amount={i20Amount}
                                scholarshipsIds={application?.scholarship_id ? [application.scholarship_id] : []}
                                metadata={{
                                  application_id: application?.id,
                                  selected_scholarship_id: application?.scholarship_id,
                                  annual_tuition: application?.scholarships?.annual_value_with_scholarship
                                }}
                                isPendingVerification={true}
                                onProcessingChange={(isProcessing) => {
                                  if (isProcessing) refetchPaymentStatus();
                                }}
                                className="!border-0 !shadow-none !bg-transparent"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-500 text-sm font-medium">
                              Pague a taxa I-20 Control Fee para liberar o download da sua carta de aceitação da universidade.
                            </p>
                            <button
                              onClick={handlePayI20Click}
                              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] active:scale-95"
                            >
                              <Sparkles className="w-4 h-4 relative z-10" />
                              <span className="relative z-10">Pagar Agora</span>
                              <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-500 group-hover/btn:translate-x-1" />
                            </button>

                            {i20Error && (
                              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {i20Error}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Acceptance Letter Section */}
                  <div className={`group relative rounded-[2rem] p-8 transition-all duration-500 ${canDownloadLetter
                    ? 'bg-emerald-50/50 border border-emerald-500/30 ring-1 ring-emerald-500/20'
                    : 'bg-gray-50 border border-gray-200'
                    }`}>
                    {canDownloadLetter && (
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 z-20 border-4 border-white">
                        <Download className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${canDownloadLetter
                          ? 'bg-emerald-100 border-emerald-200'
                          : 'bg-gray-100 border-gray-200'
                          }`}>
                          {canDownloadLetter ? (
                            <Download className="w-7 h-7 text-emerald-600" />
                          ) : (
                            <Lock className="w-7 h-7 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                            Carta de Aceitação
                          </h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                            {canDownloadLetter
                              ? 'Pronta para Download'
                              : hasLetterAvailable && !hasPaidI20
                                ? 'Bloqueada — Pague o I-20'
                                : 'Aguardando Universidade'}
                          </p>
                        </div>
                      </div>

                      {canDownloadLetter ? (
                        <>
                          <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-[2rem]">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center border border-emerald-200">
                              <CheckCircle className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <div className="text-emerald-700 font-black uppercase tracking-widest text-sm">Carta Disponível</div>
                              <p className="text-emerald-600/80 text-xs font-medium uppercase tracking-tight mt-0.5">
                                {letterSentAt ? `Enviada em ${formatDate(letterSentAt)}` : `Carta de ${application.scholarships.universities?.name} pronta para download`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (letterUrl) {
                                handleForceDownload(
                                  letterUrl,
                                  `Carta_Aceitação_${application.scholarships.universities?.name || 'Universidade'}.pdf`
                                );
                              }
                            }}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-95"
                          >
                            <Download className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">Baixar Carta de Aceitação</span>
                          </button>
                        </>
                      ) : hasLetterAvailable && !hasPaidI20 ? (
                        <div className="relative overflow-hidden rounded-2xl">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-5 shadow-lg border border-gray-200 flex items-center gap-4">
                              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
                                <Lock className="w-6 h-6 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-black text-gray-900 text-sm uppercase tracking-tight">Bloqueado</p>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Pague a taxa I-20 para desbloquear</p>
                              </div>
                            </div>
                          </div>
                          <div className="opacity-20 pointer-events-none p-6">
                            <div className="bg-gray-200 h-5 rounded-full w-3/4 mb-3" />
                            <div className="bg-gray-200 h-4 rounded-full w-1/2 mb-6" />
                            <div className="bg-gray-200 h-14 rounded-2xl w-48" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 bg-gray-100/50 border border-gray-200 px-6 py-5 rounded-[2rem]">
                          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200 flex-shrink-0">
                            <Clock className="w-5 h-5 text-gray-400 animate-pulse" />
                          </div>
                          <div>
                            <div className="text-gray-700 font-black uppercase tracking-widest text-xs">Aguardando Envio</div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight mt-0.5">
                              {!hasPaidI20 ? 'Pague a taxa I-20 enquanto aguarda.' : 'Aguarde a universidade processar seus documentos.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complete Onboarding Button */}
                  {hasPaidI20 && onComplete && (
                    <div className="mt-8">
                      <button
                        onClick={onComplete}
                        className="w-full bg-white text-emerald-700 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 border border-emerald-200"
                      >
                        <CheckCircle className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Concluir Onboarding</span>
                        <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-500 group-hover/btn:translate-x-1" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            {/* Status Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[3rem] p-10 shadow-2xl shadow-blue-500/30 relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-[60px] -ml-16 -mb-16 pointer-events-none" />

              <div className="relative z-10 space-y-10">
                <div>
                  <h3 className="text-white/60 font-black uppercase tracking-[0.2em] text-[10px] mb-2 text-center md:text-left">Progresso</h3>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-8">
                    <div
                      className="h-full bg-white transition-all duration-1000"
                      style={{ width: `${hasPaidI20 && canDownloadLetter ? 100 : hasPaidI20 ? 66 : 33}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Step 1: I-20 Payment */}
                  {!isNewFlowUser && (
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${hasPaidI20
                        ? 'bg-emerald-500/30 border-emerald-400/40'
                        : 'bg-white/10 border-white/20'
                        }`}>
                        {hasPaidI20 ? (
                          <CheckCircle className="w-5 h-5 text-emerald-300" />
                        ) : (
                          <Clock className="w-5 h-5 text-white/60" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Pagar Taxa I-20</p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-tight mt-0.5">
                          {hasPaidI20 ? 'Concluído ✓' : 'Pendente'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Acceptance Letter */}
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${canDownloadLetter
                      ? 'bg-emerald-500/30 border-emerald-400/40'
                      : 'bg-white/10 border-white/20'
                      }`}>
                      {canDownloadLetter ? (
                        <Download className="w-5 h-5 text-emerald-300" />
                      ) : (
                        <Lock className="w-5 h-5 text-white/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Carta de Aceitação</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-tight mt-0.5">
                        {canDownloadLetter ? 'Disponível ✓' : hasLetterAvailable ? 'Aguardando pagamento' : 'Aguardando envio'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Visa */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-white/5 border-white/10">
                      <GraduationCap className="w-5 h-5 text-white/30" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Solicitar Visto F-1</p>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-tight mt-0.5">Próximo passo</p>
                    </div>
                  </div>

                  <div className="h-px bg-white/20 my-2" />

                  {!isNewFlowUser && (
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Taxa I-20</span>
                      <span className="text-5xl font-black text-white tracking-tighter leading-none">
                        {i20ControlFee || formatAmount(i20Amount)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4">
                  {!hasPaidI20 ? (
                    <>
                      <button
                        onClick={handlePayI20Click}
                        className="w-full py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden bg-white text-blue-700 hover:scale-[1.02] active:scale-95 shadow-2xl hover:shadow-white/20"
                      >
                        <Sparkles className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Pagar Agora</span>
                        <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-500 group-hover/btn:translate-x-1" />
                      </button>
                      <p className="text-[10px] text-white/40 text-center font-bold uppercase tracking-widest animate-pulse">
                        Pague a taxa para prosseguir
                      </p>
                    </>
                  ) : onComplete ? (
                    <button
                      onClick={onComplete}
                      className="w-full py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden bg-white text-emerald-700 hover:scale-[1.02] active:scale-95 shadow-2xl hover:shadow-white/20"
                    >
                      <CheckCircle className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Concluir</span>
                      <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-500 group-hover/btn:translate-x-1" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="bg-gray-50 border border-gray-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center border border-blue-200 flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-gray-900 text-xs font-black uppercase tracking-widest mb-1">Sobre o I-20</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase tracking-tight">
                    O I-20 é emitido pela universidade e é obrigatório para solicitar o visto F-1 americano.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center border border-emerald-200 flex-shrink-0">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-gray-900 text-xs font-black uppercase tracking-widest mb-1">Pagamento Seguro</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase tracking-tight">
                    Todas as transações são protegidas com criptografia de ponta a ponta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* I-20 Control Fee Modal */}
      <I20ControlFeeModal
        isOpen={showI20Modal}
        onClose={handleCloseI20Modal}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        isLoading={i20Loading}
      />

      {/* Profile Required Modal */}
      {showProfileRequiredModal && (
        <ProfileRequiredModal
          isOpen={showProfileRequiredModal}
          onClose={() => setShowProfileRequiredModal(false)}
          errorType={profileErrorType || 'profile_incomplete'}
        />
      )}
    </div>
  );
};
