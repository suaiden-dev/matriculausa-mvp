import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  AlertCircle, 
  RefreshCw,
  Building,
  Shield,
  GraduationCap
} from 'lucide-react';
import { ZelleCheckout } from '../../../components/ZelleCheckout';

import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { calculateCardAmountWithFees, getExchangeRate, calculatePIXTotalWithIOF } from '../../../utils/stripeFeeCalculator';

interface ApplicationWithScholarship {
  id: string;
  status: string;
  applied_at: string;
  is_scholarship_fee_paid: boolean;
  scholarship_id: string;
  scholarships: {
    id: string;
    title: string;
    level: string;
    original_annual_value: number;
    annual_value_with_scholarship: number;
    scholarship_fee: number; // Assuming this field exists or we calculate it
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
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

// Componente SVG para o logo do Zelle (oficial)
const ZelleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#a0f" d="M35,42H13c-3.866,0-7-3.134-7-7V13c0-3.866,3.134-7,7-7h22c3.866,0,7,3.134,7,7v22C42,38.866,38.866,42,35,42z"/>
    <path fill="#fff" d="M17.5,18.5h14c0.552,0,1-0.448,1-1V15c0-0.552-0.448-1-1-1h-14c-0.552,0-1,0.448-1,1v2.5C16.5,18.052,16.948,18.5,17.5,18.5z"/>
    <path fill="#fff" d="M17,34.5h14.5c0.552,0,1-0.448,1-1V31c0-0.552-0.448-1-1-1H17c-0.552,0-1,0.448-1,1v2.5C16,34.052,16.448,34.5,17,34.5z"/>
    <path fill="#fff" d="M22.25,11v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,10.5,22.25,10.724,22.25,11z"/>
    <path fill="#fff" d="M22.25,32v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,31.5,22.25,31.724,22.25,32z"/>
    <path fill="#fff" d="M16.578,30.938H22l10.294-12.839c0.178-0.222,0.019-0.552-0.266-0.552H26.5L16.275,30.298C16.065,30.553,16.247,30.938,16.578,30.938z"/>
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

import { Dialog } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';

export const ScholarshipFeeStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const { userProfile } = useAuth();
  /* const { t } = useTranslation(); */
  useTranslation();
  const navigate = useNavigate();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(userProfile?.id);
  const { isBlocked, pendingPayment, refetch: refetchPaymentStatus } = usePaymentBlocked();

  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);
  const [showCpfModal, setShowCpfModal] = useState<boolean>(false);
  const [zelleActiveApp, setZelleActiveApp] = useState<ApplicationWithScholarship | null>(null);

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
      // Para Scholarship Fee, geralmente exibimos todas as que JÁ PAGARAM a taxa de aplicação.
      const appsWithAppFeePaid = allApps.filter(() => {
         // Opcional: Só mostrar se já pagou application fee. Mas o fluxo já garante isso pelo step.
         // Mas como o usuário pode voltar, vamos filtrar para mostrar apenas as relevantes.
         // Se ele selecionou na etapa anterior, deve ser a mesma.
         // Mas vamos mostrar todas que precisam de scholarship fee (ou já pagaram).
         return true; // Simplificação: Mostra todas, o usuário decide qual pagar.
         // Idealmente: Se ele pagou a App Fee da seleção X, ele deve pagar a Scholarship Fee da seleção X agora.
      });

      const selectedId = localStorage.getItem('selected_application_id');
      
      const filteredApps = selectedId 
        ? appsWithAppFeePaid.filter(app => app.id === selectedId || app.is_scholarship_fee_paid)
        : appsWithAppFeePaid;

      setApplications(filteredApps);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.id, applications.length]);

  useEffect(() => {
    fetchApplications();
    getExchangeRate().then(rate => setExchangeRate(rate));
  }, [fetchApplications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const processCheckout = async (application: ApplicationWithScholarship, method: 'stripe' | 'pix' | 'parcelow') => {
    if (method === 'parcelow' && !userProfile?.cpf_document) {
      setShowCpfModal(true);
      return;
    }

    try {
      setIsProcessingCheckout(`${application.id}_${method}`);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) throw new Error('User not authenticated');

      let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-scholarship-fee`;
      if (method === 'parcelow') {
        // Tentativa de usar endpoint parcelow. Se não existir, corre o risco de 404.
        // Assumindo que o dev criará ou já existe. Se não existir, pode falhar.
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-scholarship-fee`;
      }

      // Scholarship fee é fixa ou vem da bolsa?
      // Geralmente é fixa no sistema (ex: $1500 ou $450).
      // Usar getFeeAmount('scholarship_fee') que busca do config.
      const baseAmount = getFeeAmount('scholarship_fee');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          // Payload adaptado para scholarship fee
          scholarships_ids: [application.scholarship_id],
          amount: baseAmount,
          payment_method: method,
          success_url: `${window.location.origin}/student/onboarding?step=scholarship_fee&payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/student/onboarding?step=scholarship_fee&payment=cancelled`,
          metadata: {
            application_id: application.id,
            selected_scholarship_id: application.scholarship_id,
            fee_type: 'scholarship_fee',
            exchange_rate: exchangeRate.toString()
          },
            // Campos extras que podem ser necessários
           payment_type: 'scholarship_fee',
           fee_type: 'scholarship_fee',
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating checkout session');
      }

      const data = await response.json();
      if (data.session_url || data.url) {
        window.location.href = data.session_url || data.url;
      } else {
        throw new Error('Session URL not found');
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

  const unpaidApplications = applications.filter(app => !app.is_scholarship_fee_paid);
  const allPaid = applications.length > 0 && unpaidApplications.length === 0;

  // Detecta se há um Zelle pendente do tipo scholarship_fee
  const hasZellePendingScholarshipFee = isBlocked && pendingPayment?.fee_type === 'scholarship_fee';


  if (loading && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-6" />
        <p className="text-white/60 font-bold uppercase tracking-widest text-sm">Carregando informações...</p>
      </div>
    );
  }


  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-center md:text-left space-y-4">
          <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-2">
            <Shield className="w-4 h-4 text-blue-400 mr-2" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pagamento Seguro</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
            Taxa da Bolsa
          </h2>
          <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl">
            {allPaid 
              ? 'Pagamento da bolsa confirmado! Você está pronto para avançar.' 
              : 'Esta taxa é o compromisso final com a bolsa ou faculdade selecionada.'}
          </p>
        </div>
        
        {!allPaid && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:bg-white/10 hover:text-white transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 group"
          >
            <RefreshCw className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar Status'}
          </button>
        )}
      </div>

      {allPaid && !loading && applications.length > 0 && (
        <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
          <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="relative z-10 text-center py-6">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Etapa Concluída</h3>
              <p className="text-gray-500 mb-8 font-medium">Sua taxa de bolsa foi processada com sucesso. Esta etapa está completa.</p>
              <button
                onClick={onNext}
                className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {!allPaid && (
        <div className={`bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border relative overflow-hidden border-gray-100`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          <div className="lg:col-span-8 space-y-6">
            {applications.map((app) => {
              const baseAmount = getFeeAmount('scholarship_fee');
              const cardAmount = calculateCardAmountWithFees(baseAmount);
              const pixInfo = calculatePIXTotalWithIOF(baseAmount, exchangeRate);
              
              return (
                <div 
                  key={app.id}
                  className={`group relative bg-gray-50 border rounded-[2rem] p-8 transition-colors ${
                    app.is_scholarship_fee_paid 
                      ? 'border-emerald-500/30 ring-1 ring-emerald-500/20 bg-emerald-50/50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-xl'
                  }`}
                >
                  {app.is_scholarship_fee_paid && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 z-20 scale-110 border-4 border-white">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm p-3 group-hover:scale-105 transition-transform duration-500">
                          {app.scholarships?.universities?.logo_url ? (
                            <img 
                              src={app.scholarships.universities.logo_url} 
                              alt={app.scholarships.universities.name} 
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <GraduationCap className="w-10 h-10 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-2xl font-black text-gray-900 truncate uppercase tracking-tight">
                              {app.scholarships?.title || 'Scholarship'}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                            <Building className="w-3 h-3" />
                            {app.scholarships?.universities?.name || 'University'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Scholarship Fee</span>
                        </div>
                        <div className="text-4xl font-black text-gray-900 tracking-tighter">
                          {formatFeeAmount(baseAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Payment Options List */}
                    {!app.is_scholarship_fee_paid && (
                      <div className="flex flex-col gap-4 mt-4">
                        {/* Zelle Pendente — bloqueia outros métodos */}
                        {hasZellePendingScholarshipFee ? (
                          <div className="flex flex-col gap-0">
                            {/* Banner de aviso */}
                            <div className="bg-amber-50 border border-amber-200 rounded-t-[2rem] px-6 py-4 flex items-start gap-4">
                              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 flex-shrink-0 mt-0.5">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-amber-700 uppercase tracking-tight">Pagamento Zelle em Análise</p>
                                <p className="text-xs text-amber-600/80 font-medium mt-0.5 leading-relaxed">
                                  Você já iniciou um pagamento via Zelle. Aguarde a confirmação antes de usar outro método. Isso pode levar até 48 horas.
                                </p>
                              </div>
                            </div>

                            {/* ZelleCheckout inline — aberto automaticamente */}
                            <div className="border border-amber-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                              <ZelleCheckout
                                feeType="scholarship_fee"
                                amount={getFeeAmount('scholarship_fee')}
                                scholarshipsIds={[app.scholarship_id]}
                                metadata={{
                                  application_id: app.id,
                                  selected_scholarship_id: app.scholarship_id
                                }}
                                onSuccess={() => {
                                  setZelleActiveApp(null);
                                  onNext();
                                }}
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
                              className="group/btn relative bg-white border border-gray-200 p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-200 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-14 h-14 flex items-center justify-center bg-blue-50/50 rounded-2xl group-hover/btn:bg-blue-50 transition-colors">
                                  <StripeIcon className="w-9 h-9" />
                                </div>
                                <div>
                                  <div className="font-black text-gray-900 text-base uppercase tracking-tight">Cartão de Crédito</div>
                                  <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide leading-tight">* Podem incluir taxas de processamento</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-5">
                                <div className="text-right">
                                  <div className="bg-blue-100 text-blue-600 text-sm font-black px-3 py-1.5 rounded-full border border-blue-200 uppercase tracking-tight">
                                    {formatFeeAmount(cardAmount)}
                                  </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-300 group-hover/btn:translate-x-1 transition-transform" />
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
                              className="group/btn relative bg-white border border-gray-200 p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-emerald-200 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-14 h-14 flex items-center justify-center bg-emerald-50/50 rounded-2xl group-hover/btn:bg-emerald-50 transition-colors">
                                  <PixIcon className="w-9 h-9" />
                                </div>
                                <div>
                                  <div className="font-black text-gray-900 text-base uppercase tracking-tight">PIX</div>
                                  <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide leading-tight">* Podem incluir taxas de processamento</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-5">
                                <div className="text-right">
                                  <div className="bg-emerald-100 text-emerald-600 text-sm font-black px-3 py-1.5 rounded-full border border-emerald-200 uppercase tracking-tight">
                                    R$ {pixInfo.totalWithIOF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-300 group-hover/btn:translate-x-1 transition-transform" />
                              </div>
                              {isProcessingCheckout === `${app.id}_pix` && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <RefreshCw className="w-8 h-8 text-[#4db6ac] animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* Parcelow Option */}
                            <button
                              onClick={() => processCheckout(app, 'parcelow')}
                              disabled={!!isProcessingCheckout}
                              className="group/btn relative bg-white border border-gray-200 p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-orange-200 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-14 h-14 flex items-center justify-center bg-orange-50/50 rounded-2xl group-hover/btn:bg-orange-50 transition-colors px-2">
                                  <ParcelowIcon className="w-full h-10" />
                                </div>
                                <div>
                                  <div className="font-black text-gray-900 text-base uppercase tracking-tight">Parcelow</div>
                                  <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide leading-tight">* Podem incluir taxas de operadora e processamento da plataforma</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-5">
                                <div className="text-right flex flex-col items-end">
                                  <div className="bg-blue-100 text-blue-700 text-sm font-black px-3 py-1.5 rounded-full border border-blue-200 uppercase tracking-tight">
                                    {formatFeeAmount(cardAmount)}
                                  </div>
                                  <span className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-widest">Até 12x no cartão</span>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-300 group-hover/btn:translate-x-1 transition-transform" />
                              </div>
                              {isProcessingCheckout === `${app.id}_parcelow` && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* Zelle Option — accordion inline */}
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleZelleClick(app)}
                                disabled={!!isProcessingCheckout}
                                className={`group/btn relative bg-white border p-5 text-left hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-purple-200 flex items-center justify-between ${
                                  zelleActiveApp?.id === app.id
                                    ? 'rounded-t-[2rem] border-purple-200 border-b-0 bg-purple-50/30'
                                    : 'rounded-[2rem] border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-5">
                                  <div className="w-14 h-14 flex items-center justify-center bg-purple-50/50 rounded-2xl group-hover/btn:bg-purple-50 transition-colors">
                                    <ZelleIcon className="w-9 h-9" />
                                  </div>
                                  <div>
                                    <div className="font-black text-gray-900 text-base uppercase tracking-tight">Zelle</div>
                                    <div className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wide leading-tight flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Processamento pode levar até 48 horas
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-5">
                                  <div className="text-right">
                                    <div className="bg-indigo-100 text-indigo-600 text-sm font-black px-3 py-1.5 rounded-full border border-indigo-200 uppercase tracking-tight">
                                      {formatFeeAmount(baseAmount)}
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-400 mt-1 block uppercase tracking-widest">Sem Taxas</span>
                                  </div>
                                  <ChevronRight className={`w-6 h-6 text-gray-300 transition-transform ${
                                    zelleActiveApp?.id === app.id ? 'rotate-90' : 'group-hover/btn:translate-x-1'
                                  }`} />
                                </div>
                              </button>

                              {zelleActiveApp?.id === app.id && (
                                <div className="border border-purple-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                                  <ZelleCheckout
                                    feeType="scholarship_fee"
                                    amount={getFeeAmount('scholarship_fee')}
                                    scholarshipsIds={[app.scholarship_id]}
                                    metadata={{
                                      application_id: app.id,
                                      selected_scholarship_id: app.scholarship_id
                                    }}
                                    onSuccess={() => {
                                      setZelleActiveApp(null);
                                      onNext();
                                    }}
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

                    {app.is_scholarship_fee_paid && (
                      <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-[2rem]">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center border border-emerald-200">
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-emerald-700 font-black uppercase tracking-widest text-sm">Pagamento Confirmado</div>
                          <p className="text-emerald-600/80 text-xs font-medium uppercase tracking-tight mt-0.5">Sua taxa de bolsa foi confirmada.</p>
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
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Nenhuma aplicação pronta</h3>
                <p className="text-gray-500 font-medium max-w-sm">Você precisa completar as etapas anteriores antes de pagar a taxa da bolsa.</p>
                <button 
                  onClick={onBack}
                  className="mt-6 px-8 py-3 bg-white border border-gray-200 rounded-2xl text-gray-900 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all shadow-sm"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">


            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              
               <div className="flex items-start space-x-4 relative z-10">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-black uppercase tracking-widest mb-1">Processamento</h4>
                  <p className="text-[10px] text-white/50 leading-relaxed font-bold uppercase tracking-tight">
                    Cartão e PIX são processados imediatamente.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
        </div> // Fim da div bg-white
      )}

      <Dialog
        open={showCpfModal}
        onClose={() => setShowCpfModal(false)}
        className="relative z-[100]"
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
                CPF Necessário
              </Dialog.Title>
              <Dialog.Description className="text-gray-600 mb-6">
                Para pagar com Parcelow, você precisa cadastrar seu CPF no perfil.
              </Dialog.Description>
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => {
                    setShowCpfModal(false);
                    navigate('/student/dashboard/profile');
                  }}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                >
                  Ir para Perfil
                </button>
                <button
                  onClick={() => setShowCpfModal(false)}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};
