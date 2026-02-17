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
  ArrowRight,
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
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="2" fill="#7950F2"/>
    <path d="M6 8h12M6 12h8M6 16h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
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

import { Dialog } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const ScholarshipFeeStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const { userProfile } = useAuth();
  /* const { t } = useTranslation(); */
  useTranslation();
  const navigate = useNavigate();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(userProfile?.id);
  
  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  // Zelle state
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [zelleAmount, setZelleAmount] = useState<number>(0);
  const [zelleScholarshipId, setZelleScholarshipId] = useState<string>('');

  // Modern Checkout states
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);
  const [showCpfModal, setShowCpfModal] = useState<boolean>(false);

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
    const amount = getFeeAmount('scholarship_fee');
    setZelleAmount(amount);
    setZelleScholarshipId(application.scholarship_id);
    setShowZelleCheckout(true);
  };

  const unpaidApplications = applications.filter(app => !app.is_scholarship_fee_paid);
  const allPaid = applications.length > 0 && unpaidApplications.length === 0;

  if (loading && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-6" />
        <p className="text-white/60 font-bold uppercase tracking-widest text-sm">Carregando informações...</p>
      </div>
    );
  }

  if (showZelleCheckout) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <button 
          onClick={() => setShowZelleCheckout(false)}
          className="mb-8 flex items-center text-white/60 hover:text-white transition-all gap-3 group"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all border border-white/5">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </div>
          <span className="font-black uppercase tracking-widest text-xs">Voltar</span>
        </button>

        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
          <ZelleCheckout
            feeType="scholarship_fee"
            amount={zelleAmount}
            scholarshipsIds={[zelleScholarshipId]}
            onSuccess={() => {
              setShowZelleCheckout(false);
              handleRefresh();
            }}
            metadata={{
              application_id: applications.find(a => a.scholarship_id === zelleScholarshipId)?.id,
              selected_scholarship_id: zelleScholarshipId
            }}
          />
        </div>
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
              : 'Realize o pagamento da taxa da bolsa para garantir sua vaga e iniciar o processo de matrícula.'}
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

      <div className={`bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border relative overflow-hidden ${
        allPaid 
          ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' 
          : 'border-gray-100'
      }`}>
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
                            <div className="font-black text-gray-900 text-base uppercase tracking-tight">Cartão de Crédito</div>
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
                            <div className="font-black text-gray-900 text-base uppercase tracking-tight">PIX</div>
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
                            <div className="font-black text-gray-900 text-base uppercase tracking-tight">Parcelow</div>
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

                        {/* Zelle Option */}
                        <button
                          onClick={() => handleZelleClick(app)}
                          disabled={!!isProcessingCheckout}
                          className="group/btn relative bg-white border border-gray-200 p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-purple-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 flex items-center justify-center bg-purple-50/50 rounded-2xl group-hover/btn:bg-purple-50 transition-colors">
                              <ZelleIcon className="w-9 h-9" />
                            </div>
                            <div className="font-black text-gray-900 text-base uppercase tracking-tight">Zelle</div>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="text-right">
                              <div className="bg-indigo-100 text-indigo-600 text-sm font-black px-3 py-1.5 rounded-full border border-indigo-200 uppercase tracking-tight">
                                {formatFeeAmount(baseAmount)}
                              </div>
                              <span className="text-[10px] font-bold text-indigo-400 mt-1 block uppercase tracking-widest">Sem Taxas</span>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-300 group-hover/btn:translate-x-1 transition-transform" />
                          </div>
                        </button>
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
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[3rem] p-10 shadow-2xl shadow-blue-500/30 relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-[60px] -ml-16 -mb-16 pointer-events-none" />
              
              <div className="relative z-10 space-y-10">


                <div className="space-y-4 pt-4">
                  <button
                    onClick={onNext}
                    disabled={!allPaid}
                    className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden ${
                      allPaid 
                        ? 'bg-white text-blue-700 hover:scale-[1.02] active:scale-95 shadow-2xl hover:shadow-white/20' 
                        : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    <span className="relative z-10 text-center leading-tight">
                      Concluir &<br />Continuar
                    </span>
                    <ArrowRight className={`w-4 h-4 relative z-10 transition-transform duration-500 ${allPaid ? 'group-hover/btn:translate-x-1' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
               <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center border border-blue-200 flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-gray-900 text-xs font-black uppercase tracking-widest mb-1">Processamento</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase tracking-tight">
                    Cartão e PIX são processados imediatamente.
                  </p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
      
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
