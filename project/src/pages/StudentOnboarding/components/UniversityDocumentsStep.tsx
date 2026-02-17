import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Building, 
  Award, 
  Info, 
  MapPin, 
  Phone, 
  Globe, 
  Mail, 
  DollarSign,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,

  FileSearch,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  History,
  Stamp,
  Home,
  FolderOpen,
  GraduationCap,
  FileCheck,
  Star,
  Monitor,
  Calendar,
  X,
  Eye,
  Download,
  Lock
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { useTranslation } from 'react-i18next';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { useStudentLogs } from '../../../hooks/useStudentLogs';
import DocumentRequestsCard from '../../../components/DocumentRequestsCard';
import DocumentViewerModal from '../../../components/DocumentViewerModal';
import { I20ControlFeeModal } from '../../../components/I20ControlFeeModal';
import { STRIPE_PRODUCTS } from '../../../stripe-config';
import { ProfileRequiredModal } from '../../../components/ProfileRequiredModal';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { ExpandableTabs } from '../../../components/ui/expandable-tabs';
import { motion, AnimatePresence } from 'framer-motion';

export const UniversityDocumentsStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { formatFeeAmount, getFeeAmount } = useFeeConfig(user?.id);
  const { logAction } = useStudentLogs(userProfile?.id || '');
  
  const [loading, setLoading] = useState(true);
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'i20' | 'documents' | 'acceptance'>('welcome');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showI20ControlFeeModal, setShowI20ControlFeeModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
  const [i20Loading, setI20Loading] = useState(false);
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [profileErrorType, setProfileErrorType] = useState<'cpf_missing' | 'profile_incomplete' | null>(null);
  const [realI20PaidAmount, setRealI20PaidAmount] = useState<number | null>(null);
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [realI20PaymentDate, setRealI20PaymentDate] = useState<string | null>(null);
  const [scholarshipFeeDeadline, setScholarshipFeeDeadline] = useState<Date | null>(null);
  const [i20Countdown, setI20Countdown] = useState<string | null>(null);
  const [i20CountdownValues, setI20CountdownValues] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  useEffect(() => {
    fetchApplicationDetails();
  }, [userProfile?.id]);

  const fetchApplicationDetails = async (isRefresh = false) => {
    if (!userProfile?.id) return;
    
    try {
      if (!isRefresh) setLoading(true);
      
      const selectedId = localStorage.getItem('selected_application_id');
      
      let query = supabase
        .from('scholarship_applications')
        .select(`*, user_profiles!student_id(*), scholarships(*, internal_fees, universities(*))`)
        .eq('student_id', userProfile.id);

      if (selectedId) {
        query = query.eq('id', selectedId);
      } else {
        // 1. Fallback para a aplicação ativa (a mais recente) se não houver seleção explícita
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      if (data) {
        // ✅ SEGURANÇA: Ocultar acceptance_letter_url se o I-20 não foi pago
        if (data && !(userProfile as any)?.has_paid_i20_control_fee) {
          data.acceptance_letter_url = null;
        }
        setApplicationDetails(data);

        // Buscar detalhes de pagamento do I-20 se aplicável
        if ((userProfile as any)?.has_paid_i20_control_fee) {
          const { data: paymentData } = await supabase
            .from('individual_fee_payments')
            .select('*')
            .eq('student_id', userProfile.id)
            .eq('fee_type', 'i20_control_fee')
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })
            .limit(1)
            .single();
          
          if (paymentData) {
            setRealI20PaidAmount(paymentData.amount || paymentData.gross_amount_usd);
            setRealI20PaymentDate(paymentData.paid_at);
          }
        }
      }

    } catch (err: any) {
      console.error('Error fetching university documents details:', err);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  // Buscar deadline da scholarship fee (data limite para I-20 Control Fee)
  useEffect(() => {
    async function fetchScholarshipFeeDeadline() {
      if (!userProfile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('scholarship_applications')
          .select('id, updated_at, is_scholarship_fee_paid')
          .eq('student_id', userProfile.id)
          .eq('is_scholarship_fee_paid', true)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('Erro ao buscar scholarship fee deadline:', error);
          setScholarshipFeeDeadline(null);
          return;
        }
        
        if (data && data.length > 0 && data[0]?.updated_at) {
          const paidDate = new Date(data[0].updated_at);
          const deadline = new Date(paidDate.getTime() + 10 * 24 * 60 * 60 * 1000);
          setScholarshipFeeDeadline(deadline);
        } else {
          setScholarshipFeeDeadline(null);
        }
      } catch (error) {
        console.error('Erro inesperado ao buscar scholarship fee deadline:', error);
        setScholarshipFeeDeadline(null);
      }
    }
    
    fetchScholarshipFeeDeadline();
  }, [userProfile]);

  // Cronômetro regressivo para a deadline
  useEffect(() => {
    if (!scholarshipFeeDeadline) return;
    function updateCountdown() {
      if (!scholarshipFeeDeadline) return;
      const now = new Date();
      const diff = scholarshipFeeDeadline.getTime() - now.getTime();
      if (diff <= 0) {
        setI20Countdown('Expired');
        setI20CountdownValues(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setI20Countdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      setI20CountdownValues({ days, hours, minutes, seconds });
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scholarshipFeeDeadline]);

  const getRelativePath = (fullUrl: string, bucketName: string) => {
    const baseUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/${bucketName}/`;
    if (fullUrl.startsWith(baseUrl)) {
      return fullUrl.replace(baseUrl, '');
    }
    return fullUrl;
  };

  const handleViewDocument = async (docUrl: string, bucketName = 'student-documents') => {
    if (!docUrl) return;
    
    try {
      if (docUrl.includes(`supabase.co/storage/v1/object/public/${bucketName}/`)) {
        const filePath = getRelativePath(docUrl, bucketName);
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60);
        
        if (error) throw error;
        setPreviewUrl(data.signedUrl);
      } else {
        setPreviewUrl(docUrl);
      }
    } catch (err) {
      console.error('Error viewing document:', err);
      alert('Erro ao visualizar documento');
    }
  };

  const handleDownloadDocument = async (docUrl: string, fileName: string, bucketName = 'student-documents') => {
    if (!docUrl) return;
    
    try {
      let downloadUrl = docUrl;
      
      if (docUrl.includes(`supabase.co/storage/v1/object/public/${bucketName}/`)) {
        const filePath = getRelativePath(docUrl, bucketName);
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60);
        
        if (error) throw error;
        downloadUrl = data.signedUrl;
      }
      
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Erro ao baixar documento');
    }
  };

  const handlePayI20 = () => {
    setSelectedPaymentMethod(null);
    setProfileErrorType(null);
    setShowI20ControlFeeModal(true);
  };

  const handlePaymentMethodSelect = async (method: 'stripe' | 'zelle' | 'pix' | 'parcelow', exchangeRateParam?: number) => {
    // Verificar CPF apenas para Parcelow
    if (method === 'parcelow' && !userProfile?.cpf_document) {
      setShowI20ControlFeeModal(false);
      setProfileErrorType('cpf_missing');
      setShowProfileRequiredModal(true);
      return;
    }

    setSelectedPaymentMethod(method);
    setI20Loading(true);

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) throw new Error('Not authenticated');

      const token = session.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const successUrl = `${window.location.origin}/student/onboarding?step=university_documents&payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/student/onboarding?step=university_documents&payment=cancelled`;
      
      const amount = getFeeAmount('i20_control_fee');
      const promotionalCoupon = (window as any).__checkout_promotional_coupon || null;
      const finalAmount = (window as any).__checkout_final_amount || amount;

      if (method === 'stripe' || method === 'pix') {
         const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout-i20-control-fee`;
         
         const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
               payment_method: method,
               price_id: STRIPE_PRODUCTS.controlFee.priceId,
               amount: finalAmount,
               success_url: successUrl,
               cancel_url: cancelUrl,
               promotional_coupon: promotionalCoupon,
               metadata: method === 'pix' ? { exchange_rate: exchangeRateParam } : {}
            })
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || 'Erro na requisição de pagamento');

         if (data.session_url) {
            window.location.href = data.session_url;
         } else {
            throw new Error('Sessão de pagamento não criada');
         }

      } else if (method === 'parcelow') {
         const apiUrl = `${supabaseUrl}/functions/v1/parcelow-checkout-i20-control-fee`;
         
         const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
               amount: finalAmount,
               fee_type: 'i20_control_fee',
               promotional_coupon: promotionalCoupon,
               scholarships_ids: applicationDetails?.scholarships?.id ? [applicationDetails.scholarships.id] : [],
               metadata: {
                  application_id: applicationDetails?.id,
                  final_amount: finalAmount,
                  promotional_coupon: promotionalCoupon
               }
            })
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || 'Erro ao processar Parcelow');
         
         if (data.checkout_url) {
            window.location.href = data.checkout_url;
         } else {
            throw new Error('URL de checkout Parcelow não encontrada');
         }

      } else if (method === 'zelle') {
        setShowZelleCheckout(true);
        setShowI20ControlFeeModal(false);
        setI20Loading(false);
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      alert(err.message || 'Error processing payment');
      setI20Loading(false);
    }
  };

  const handleCloseI20Modal = () => {
    setShowI20ControlFeeModal(false);
    setSelectedPaymentMethod(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
        </div>
        <p className="text-white/60 font-medium mt-4">Carregando portal de gerenciamento...</p>
      </div>
    );
  }

  if (!applicationDetails) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 text-center">
        <div className="w-20 h-20 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Nenhuma Aplicação Encontrada</h3>
        <p className="text-white/60 mb-8 max-w-md mx-auto">
          Você ainda não possui uma aplicação ativa. Por favor, volte ao passo anterior ou entre em contato com o suporte.
        </p>
        <button onClick={onBack} className="bg-white text-blue-900 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition-all">
          Voltar
        </button>
      </div>
    );
  }

  const TABS = [
    { title: t('studentDashboard.applicationChatPage.tabs.welcome'), icon: Home },
    { title: t('studentDashboard.applicationChatPage.tabs.details'), icon: Info },
    { title: t('studentDashboard.applicationChatPage.tabs.documents'), icon: FolderOpen },
    { title: t('studentDashboard.applicationChatPage.tabs.i20'), icon: Stamp },
    { title: 'Carta de Aceite', icon: Award }
  ];

  const tabIds: ('welcome' | 'details' | 'documents' | 'i20' | 'acceptance')[] = ['welcome', 'details', 'documents', 'i20', 'acceptance'];
  const activeTabIndex = tabIds.indexOf(activeTab);

  const requiredDocs = ['transcript', 'diploma', 'passport', 'bank_balance'];
  const allDocsApproved = requiredDocs.every(key => {
    const doc = (applicationDetails.documents || []).find((d: any) => d.type === key) || 
                (applicationDetails.user_profiles?.documents || []).find((d: any) => d.type === key);
    return doc?.status === 'approved';
  });

  const hasPaid = (userProfile as any)?.has_paid_i20_control_fee;

  const isAcceptanceUnlocked = hasPaid && allDocsApproved;

  return (
    <div className="space-y-8 pb-24">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Passo Final</span>
            </div>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
            Portal da <span className="text-blue-400">Candidatura</span>
          </h2>

        </div>

        {/* Global Progress Button */}
        <button 
          onClick={onNext}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 p-1 pr-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none mb-1">Onboarding</p>
            <p className="text-sm font-black text-white uppercase tracking-tight">Finalizar Jornada</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center">
        <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
          <ExpandableTabs 
            tabs={TABS as any} 
            defaultSelected={activeTabIndex >= 0 ? activeTabIndex : 0}
            onChange={(index) => {
              if (index !== null) setActiveTab(tabIds[index]);
            }}
          />
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[500px]"
        >
          {activeTab === 'welcome' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Main Welcome Card */}
              <div className="md:col-span-12 space-y-6">
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden border border-slate-200">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                  
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <LayoutDashboard className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                            Parabéns {userProfile?.full_name || 'Estudante'},<br/> você foi <span className="text-emerald-600">aprovado</span> na <span className="text-blue-600">{applicationDetails?.scholarships?.universities?.name || 'Universidade'}</span>
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-14">
                        <p className="text-gray-600 leading-relaxed text-lg">
                          Falta muito pouco para tudo ficar pronto! Nesta etapa final você pode rever os detalhes da universidade que escolheu, enviar a documentação obrigatória e realizar o pagamento da taxa da I-20. Assim que tudo estiver certo, sua Carta de Aceite estará liberada aqui mesmo para você baixar.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button 
                            onClick={() => setActiveTab('documents')}
                            className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FileSearch className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Enviar Documentos</p>
                              <p className="text-xs text-gray-500 font-medium">Documentos solicitados</p>
                            </div>
                          </button>

                          <button 
                            onClick={() => setActiveTab('details')}
                            className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Info className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Detalhes da Bolsa</p>
                              <p className="text-xs text-gray-500 font-medium">Requisitos e valores</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-center">
                      <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] p-8 py-12 text-white flex flex-col justify-center">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Precisa de Ajuda?</h4>
                        <p className="text-sm text-gray-400 mb-6">Nossos mentores estão prontos para ajudar com qualquer dúvida sobre este processo.</p>
                        <button 
                          onClick={() => navigate('/student/dashboard/chat')}
                          className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          Falar com Suporte
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline simplified */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-2xl shadow-blue-900/5">
                   <h4 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <History className="w-5 h-5 text-blue-600" />
                     Próximas Etapas
                   </h4>
                   <div className="space-y-4">
                     {[
                       { 
                         title: 'Enviar / Análise de Documentos', 
                         status: allDocsApproved ? 'Concluído' : 'Em Análise', 
                         variant: allDocsApproved ? 'success' : 'warning',
                         tab: 'documents' 
                       },
                       { 
                         title: 'Taxa I-20 (Controle)', 
                         status: hasPaid ? 'Pago' : 'Pendente', 
                         variant: hasPaid ? 'success' : 'warning',
                         tab: 'i20' 
                       },
                       { 
                         title: 'Recebimento da Carta de Aceite', 
                         status: isAcceptanceUnlocked ? 'Disponível' : (allDocsApproved && hasPaid ? 'Aguardando Emissão' : 'Bloqueado'), 
                         variant: isAcceptanceUnlocked ? 'success' : (allDocsApproved && hasPaid ? 'warning' : 'error'),
                         tab: 'acceptance' 
                       }
                     ].map((step, i) => {
                       const isClickable = true;
                       
                       const variantStyles = {
                         success: {
                           container: 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50',
                           iconBg: 'bg-emerald-100 text-emerald-600',
                           status: 'text-emerald-600',
                           indicator: 'bg-emerald-500'
                         },
                         warning: {
                           container: 'bg-amber-50/50 border-amber-200 hover:border-amber-300 hover:bg-amber-50',
                           iconBg: 'bg-amber-100 text-amber-600',
                           status: 'text-amber-600',
                           indicator: 'bg-amber-500'
                         },
                         error: {
                           container: 'bg-red-50/50 border-red-200 hover:border-red-300 hover:bg-red-50',
                           iconBg: 'bg-red-100 text-red-600',
                           status: 'text-red-600',
                           indicator: 'bg-red-500'
                         },
                         default: {
                           container: 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-white',
                           iconBg: 'bg-slate-100 text-slate-400',
                           status: 'text-slate-400',
                           indicator: 'bg-slate-300'
                         }
                       };

                       const styles = variantStyles[step.variant as keyof typeof variantStyles] || variantStyles.default;
                       
                       return (
                         <div 
                           key={i} 
                           onClick={() => isClickable && setActiveTab(step.tab as any)}
                           className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/5 hover:scale-[1.02] ${styles.container}`}
                         >
                           <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${styles.iconBg}`}>
                               <span className="text-xs font-bold">{i + 1}</span>
                             </div>
                             <div className="flex flex-col">
                               <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">{step.title}</span>
                               <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Clique para ir</span>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${styles.indicator}`} />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${styles.status}`}>{step.status}</span>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>



              {hasPaid && allDocsApproved && (
                  <div className="md:col-span-12 bg-white rounded-[3rem] p-8 md:p-16 shadow-2xl shadow-blue-900/5 border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />
                    <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-8 relative z-10 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-blue-600" />
                      </div>
                      O que acontece agora?
                    </h4>
                    <div className="space-y-4 relative z-10">
                       {(t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.nextStepsList', { returnObjects: true }) as string[]).map((step, index) => (
                         <div key={index} className="flex items-center gap-5 p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
                              {index + 1}
                            </div>
                            <p className="text-sm font-bold text-slate-700 leading-tight uppercase tracking-tight">{step}</p>
                         </div>
                       ))}
                    </div>
                  </div>
              )}
          </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-8 pb-12">
              {/* University Hero Card */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden group">
                <div className="bg-gradient-to-r from-[#05294E] to-[#08427e] p-8 md:p-12 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <Building className="w-96 h-96 -right-24 -bottom-24 absolute rotate-12" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center p-6 transform group-hover:scale-105 transition-transform duration-500">
                      {applicationDetails.scholarships?.universities?.logo_url ? (
                        <img 
                          src={applicationDetails.scholarships.universities.logo_url} 
                          alt={applicationDetails.scholarships.universities.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building className="w-20 h-20 text-[#05294E]" />
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">University Partner</span>
                        {applicationDetails.scholarships?.delivery_mode && (
                           <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/30">
                             {applicationDetails.scholarships.delivery_mode === 'in_person' ? 'Presencial' : 'Online'}
                           </span>
                        )}
                        {applicationDetails.scholarships?.is_exclusive && (
                          <span className="px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-amber-400 uppercase tracking-widest border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3" /> Exclusiva
                          </span>
                        )}
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                        {applicationDetails.scholarships?.universities?.name || 'Universidade Candidatada'}
                      </h2>
                      <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 text-white/70">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span className="font-bold uppercase tracking-widest text-xs">
                              {applicationDetails.scholarships?.universities?.address?.city || applicationDetails.scholarships?.universities?.location || 'Cidade não informada'}, {applicationDetails.scholarships?.universities?.address?.country || 'USA'}
                            </span>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-12">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                     {/* Left: Program Info */}
                     <div className="lg:col-span-2 space-y-12">
                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Nível', val: applicationDetails.scholarships?.level || 'N/A', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100' },
                            { label: 'Modalidade', val: applicationDetails.scholarships?.delivery_mode === 'in_person' ? 'Presencial' : 'Online', icon: Monitor, color: 'text-purple-600', bg: 'bg-purple-100' },
                            { label: 'Prazo', val: applicationDetails.scholarships?.deadline ? new Date(applicationDetails.scholarships.deadline).toLocaleDateString() : 'N/A', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-100' }
                          ].map((item, i) => (
                            <div key={i} className={`${item.bg} p-4 rounded-2xl border border-white/50 shadow-sm ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <item.icon className={`w-4 h-4 ${item.color}`} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                              </div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.val}</p>
                            </div>
                          ))}
                        </div>

                        <div className="border border-slate-300 rounded-[2rem] p-8 space-y-12 bg-white shadow-sm relative overflow-hidden">
                          <section className="space-y-6">
                           <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3 border-b border-slate-200 pb-4">
                             <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                               <Award className="w-5 h-5 text-blue-600" />
                             </div>
                             Detalhes da Bolsa
                           </h4>
                           <div className="bg-slate-50 p-6 rounded-2xl mb-4">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Título da Bolsa</p>
                              <p className="text-xl font-black text-slate-900 uppercase leading-tight">{applicationDetails.scholarships?.title || applicationDetails.scholarships?.name || 'N/A'}</p>
                           </div>

                           {applicationDetails.scholarships?.course && (
                             <div className="bg-blue-50 p-6 rounded-2xl mb-4">
                               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Curso / Área de Estudo</p>
                               <p className="text-xl font-black text-blue-900 uppercase leading-tight">{applicationDetails.scholarships.course}</p>
                             </div>
                           )}
                           
                           {applicationDetails.scholarships?.description && (
                             <div className="bg-slate-50 p-6 rounded-2xl mb-4">
                               <div className="mb-2">
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                   {t('studentDashboard.applicationChatPage.details.scholarshipDetails.description')}
                                 </span>
                               </div>
                               <div className="text-sm font-medium text-gray-700 leading-relaxed">
                                 {applicationDetails.scholarships.description}
                               </div>
                             </div>
                           )}

                           {/* Application Fee (Enrollment Fee) */}
                           {applicationDetails.scholarships?.application_fee_amount && (
                             <div className="bg-slate-50 p-6 rounded-2xl mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                               <div className="flex items-start gap-3">
                                 <div>
                                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Taxa de Matrícula</p>
                                   <p className="text-xs font-semibold text-gray-900">
                                     {Number(applicationDetails.scholarships.application_fee_amount) !== 350
                                       ? t('scholarshipsPage.scholarshipCard.customFee') 
                                       : t('scholarshipsPage.scholarshipCard.standardFee')}
                                   </p>
                                 </div>
                               </div>
                               <div className="text-xl font-black text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm whitespace-nowrap">
                                 {formatFeeAmount(
                                   getFeeAmount('application_fee', applicationDetails.scholarships.application_fee_amount)
                                 )}
                               </div>
                             </div>
                           )}
                        </section>



                        {/* Internal Fees */}
                        {applicationDetails.scholarships?.internal_fees && Array.isArray(applicationDetails.scholarships.internal_fees) && applicationDetails.scholarships.internal_fees.length > 0 && (
                          <section className="space-y-6">
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-amber-600" />
                              </div>
                              Taxas Internas da Instituição
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {applicationDetails.scholarships.internal_fees.map((fee: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-colors">
                                   <div className="min-w-0 mr-4">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{fee.frequency || fee.details || 'Pagamento Único'}</p>
                                     <p className="text-sm font-black text-gray-900 uppercase truncate" title={fee.category || fee.name}>{fee.category || fee.name}</p>
                                   </div>
                                   <span className="text-xl font-black text-blue-600 whitespace-nowrap">${Number(fee.amount).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3">
                              <Info className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs font-medium text-sky-700 leading-relaxed">
                                Estas taxas são informadas pela universidade e pagas diretamente a eles. Elas não fazem parte do serviço de mentoria da Matricula USA.
                              </p>
                            </div>
                          </section>
                        )}
                        </div>

                        {/* Documents Progress Summary */}
                        <div className="border border-slate-300 rounded-[2rem] p-8 space-y-12 bg-white shadow-sm relative overflow-hidden">
                        <section className="space-y-6">
                           <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3 border-b border-slate-200 pb-4">
                             <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                               <FileCheck className="w-5 h-5 text-slate-600" />
                             </div>
                             Documentos do Estudante
                           </h4>
                           <div className="flex flex-col gap-4">
                              {[
                                { key: 'diploma', label: 'Diploma / Certificado (High School)' },
                                { key: 'passport', label: 'Passaporte (Cópia Colorida)' },
                                { key: 'funds_proof', label: 'Extrato Bancário (Financial Statement)' }
                              ].map((doc) => {
                                const docData = (applicationDetails.documents || []).find((d: any) => d.type === doc.key) || 
                                                (applicationDetails.user_profiles?.documents || []).find((d: any) => d.type === doc.key);
                                const status = docData?.status || 'not_submitted';
                                const fileUrl = docData?.file_url || docData?.url;
                                
                                return (
                                  <div key={doc.key} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                        status === 'under_review' ? 'bg-blue-50 text-blue-600' :
                                        status === 'changes_requested' ? 'bg-amber-50 text-amber-600' :
                                        'bg-slate-50 text-slate-400'
                                      }`}>
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{doc.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {fileUrl && (
                                        <div className="flex items-center gap-1 border-r border-slate-100 pr-3 mr-1">
                                          <button 
                                            onClick={() => handleViewDocument(fileUrl)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Visualizar"
                                          >
                                            <Eye className="w-5 h-5" />
                                          </button>
                                          <button 
                                            onClick={() => handleDownloadDocument(fileUrl, doc.label)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Baixar"
                                          >
                                            <Download className="w-5 h-5" />
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        {status === 'approved' ? (
                                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : status === 'under_review' ? (
                                          <Clock className="w-5 h-5 text-blue-500" />
                                        ) : status === 'changes_requested' ? (
                                          <AlertCircle className="w-5 h-5 text-amber-500" />
                                        ) : (
                                          <div className="w-2 h-2 rounded-full bg-slate-200" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                        </section>
                        </div>
                     </div>

                     {/* Right: Financial & Sidebar */}
                     <div className="space-y-8">
                       {/* Financial Summary Table */}
                       <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6 pb-2 border-b border-white/10 flex items-center justify-between">
                            Resumo Financeiro
                            <TrendingUp className="w-3 h-3 text-blue-400" />
                          </h4>
                          <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                               <div>
                                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Custo Anual Original</p>
                                 <p className="text-xl font-black text-white/30 line-through tracking-tighter">${(applicationDetails.scholarships?.original_annual_value || 0).toLocaleString()}</p>
                               </div>
                               <div className="text-right">
                                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Taxa de Matrícula</p>
                                 <p className="text-sm font-bold text-white">
                                   {formatFeeAmount(
                                     applicationDetails.scholarships?.application_fee_amount 
                                       ? getFeeAmount('application_fee', applicationDetails.scholarships.application_fee_amount)
                                       : getFeeAmount('application_fee')
                                   )}
                                 </p>
                               </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                               <div>
                                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Com Bolsa Exclusiva</p>
                                 <div className="flex items-baseline gap-1">
                                   <span className="text-4xl font-black text-white tracking-tighter">${(applicationDetails.scholarships?.annual_value_with_scholarship || 0).toLocaleString()}</span>
                                   <span className="text-sm text-white/40 font-bold uppercase">/ano</span>
                                 </div>
                               </div>
                               {applicationDetails.scholarships?.original_value_per_credit && (
                                 <div className="text-right">
                                   <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Por Crédito</p>
                                   <p className="text-xs font-bold text-white/60">${applicationDetails.scholarships.original_value_per_credit}</p>
                                 </div>
                               )}
                            </div>

                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                               <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Economia Anual Garantida</span>
                                  <div className="px-2 py-0.5 bg-emerald-500 text-[10px] font-black text-white rounded uppercase">Total Saving</div>
                               </div>
                               <p className="text-3xl font-black text-emerald-400 tracking-tighter">
                                 + $ {((applicationDetails.scholarships?.original_annual_value || 0) - (applicationDetails.scholarships?.annual_value_with_scholarship || 0)).toLocaleString()}
                               </p>
                            </div>
                          </div>
                       </div>

                       {/* Contact & Support */}
                       <div className="space-y-4">
                         <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-300">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-slate-300 pb-2">Instituição</h4>
                            <div className="space-y-4">
                               {applicationDetails.scholarships?.universities?.contact?.email && (
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                                      <Mail className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                                      <p className="text-sm font-bold text-slate-900 truncate" title={applicationDetails.scholarships.universities.contact.email}>
                                        {applicationDetails.scholarships.universities.contact.email}
                                      </p>
                                    </div>
                                 </div>
                               )}
                               {applicationDetails.scholarships?.universities?.contact?.phone && (
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                                      <Phone className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Telefone</p>
                                      <p className="text-sm font-bold text-slate-900">{applicationDetails.scholarships.universities.contact.phone}</p>
                                    </div>
                                 </div>
                               )}
                               {applicationDetails.scholarships?.universities?.website && (
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                                      <Globe className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Website</p>
                                      <a href={applicationDetails.scholarships.universities.website} target="_blank" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1 truncate">
                                        {applicationDetails.scholarships.universities.website.replace('https://', '')}
                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      </a>
                                    </div>
                                 </div>
                               )}

                            </div>
                         </div>


                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'i20' && (
            <div className="w-full">
              {!(userProfile as any)?.has_paid_i20_control_fee ? (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                  
                  {/* Header Card */}
                  <div className="bg-slate-50 px-8 py-10 md:p-12 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-500/20 transition-transform">
                          <Stamp className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-center md:text-left">
                          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">Taxa de Controle <span className="text-blue-600">I-20</span></h2>
                          <p className="text-gray-500 font-medium">Requisito essencial para emissão do seu documento oficial de estudante</p>
                        </div>
                      </div>
                      <div className="bg-white px-8 py-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor da Taxa</span>
                        <span className="text-4xl font-black text-blue-600 tracking-tighter">{formatFeeAmount(getFeeAmount('i20_control_fee'))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="p-8 md:p-16 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Info className="w-4 h-4 text-blue-600" />
                          </div>
                          O que é esta taxa?
                        </h4>
                        <p className="text-gray-600 leading-relaxed font-medium">
                          {t('studentDashboard.applicationChatPage.i20ControlFee.description')}
                        </p>
                        <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <ShieldCheck className="w-5 h-5 text-blue-600" />
                           </div>
                           <p className="text-xs font-bold text-blue-800 leading-relaxed uppercase tracking-wider">
                             Garante o processamento digital e físico do documento I-20 enviado pela universidade para o seu endereço.
                           </p>
                        </div>
                      </div>

                      <div className="space-y-8">
                         <div className={`border rounded-[2rem] p-8 relative overflow-hidden ${
                           i20Countdown === 'Expired' 
                             ? 'bg-red-50 border-red-200' 
                             : 'bg-amber-50 border-amber-200'
                         }`}>
                           <div className="absolute top-0 right-0 p-4 opacity-5">
                             <Clock className={`w-20 h-20 ${i20Countdown === 'Expired' ? 'text-red-900' : 'text-amber-900'}`} />
                           </div>
                           <div className="flex items-start gap-4 relative z-10">
                              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                                <AlertCircle className={`w-5 h-5 ${i20Countdown === 'Expired' ? 'text-red-600' : 'text-amber-600'}`} />
                              </div>
                              <div className="flex-1">
                                <h5 className={`font-black uppercase tracking-tight mb-2 ${i20Countdown === 'Expired' ? 'text-red-900' : 'text-amber-900'}`}>
                                  {i20Countdown === 'Expired' ? 'Prazo Expirado' : 'Atenção ao Prazo'}
                                </h5>
                                <p className={`text-sm font-medium leading-relaxed mb-4 ${i20Countdown === 'Expired' ? 'text-red-800' : 'text-amber-800'}`}>
                                  {i20Countdown === 'Expired' 
                                    ? 'O prazo para garantir o processamento prioritário da sua taxa I-20 expirou. Entre em contato com o suporte urgentemente.'
                                    : t('studentDashboard.applicationChatPage.i20ControlFee.deadlineInfo')}
                                </p>
                                
                                {scholarshipFeeDeadline && i20Countdown !== 'Expired' && (
                                  <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/50">
                                    <p className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest mb-2">Tempo Restante</p>
                                    <div className="flex items-center gap-4">
                                      {i20CountdownValues && (
                                        <>
                                          <div className="text-center">
                                            <p className="text-xl font-black text-amber-900 tracking-tighter">{i20CountdownValues.days}</p>
                                            <p className="text-[8px] font-black text-amber-900/40 uppercase">Dias</p>
                                          </div>
                                          <div className="w-px h-8 bg-amber-900/10" />
                                          <div className="text-center">
                                            <p className="text-xl font-black text-amber-900 tracking-tighter">{i20CountdownValues.hours}</p>
                                            <p className="text-[8px] font-black text-amber-900/40 uppercase">Hrs</p>
                                          </div>
                                          <div className="w-px h-8 bg-amber-900/10" />
                                          <div className="text-center">
                                            <p className="text-xl font-black text-amber-900 tracking-tighter">{i20CountdownValues.minutes}</p>
                                            <p className="text-[8px] font-black text-amber-900/40 uppercase">Min</p>
                                          </div>
                                          <div className="w-px h-8 bg-amber-900/10" />
                                          <div className="text-center">
                                            <p className="text-xl font-black text-amber-900 tracking-tighter">{i20CountdownValues.seconds}</p>
                                            <p className="text-[8px] font-black text-amber-900/40 uppercase">Seg</p>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                           </div>
                         </div>

                         <button
                           onClick={handlePayI20}
                           disabled={i20Loading}
                           className="w-full group relative bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-2xl shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50"
                         >
                           <div className="bg-white/10 p-5 rounded-xl border border-white/10 flex items-center justify-center gap-4">
                              {i20Loading ? (
                                <>
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                  <span className="font-black uppercase tracking-widest">Processando...</span>
                                </>
                              ) : (
                                <>
                                  <DollarSign className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                  <span className="text-lg font-black uppercase tracking-widest">Realizar Pagamento</span>
                                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
                                </>
                              )}
                           </div>
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Success Header */}
                  <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 p-12 text-center relative">
                       <div className="absolute inset-0 opacity-10 pointer-events-none">
                         <Stamp className="w-64 h-64 -left-16 -top-16 absolute -rotate-12" />
                         <CheckCircle className="w-64 h-64 -right-16 -bottom-16 absolute rotate-12" />
                       </div>
                       <div className="relative z-10 space-y-6">
                         <div className="w-24 h-24 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto backdrop-blur-md shadow-inner">
                           <CheckCircle2 className="w-12 h-12 text-white" />
                         </div>
                         <div className="space-y-2">
                           <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Pagamento <span className="text-emerald-200">Confirmado</span></h2>
                           <p className="text-emerald-100 text-lg font-medium">Sua taxa de controle I-20 foi processada com sucesso!</p>
                         </div>
                       </div>
                    </div>

                    <div className="p-8 md:p-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Valor Pago</p>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                               <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter">
                              {realI20PaidAmount ? formatFeeAmount(realI20PaidAmount) : formatFeeAmount(getFeeAmount('i20_control_fee'))}
                            </p>
                         </div>
                       </div>

                       <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Data da Transação</p>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                               <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter">
                              {realI20PaymentDate ? new Date(realI20PaymentDate).toLocaleDateString() : new Date().toLocaleDateString()}
                            </p>
                         </div>
                       </div>

                       <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Status do I-20</p>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                               <Stamp className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="px-3 py-1 bg-emerald-500 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">Emitindo</span>
                         </div>
                       </div>
                    </div>
                  </div>


                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-8">
              {/* Main Documents Component with Header integrated */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden">
                 {/* Header moved here */}
                 <div className="p-8 md:p-12 relative overflow-hidden border-b border-slate-200">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                        <FolderOpen className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Gestão de <span className="text-blue-600">Documentação</span></h3>
                        <p className="text-gray-600 font-medium">Envie os documentos solicitados pela universidade para análise e aprovação final.</p>
                      </div>
                    </div>
                 </div>

                <DocumentRequestsCard 
                  applicationId={applicationDetails.id} 
                  isSchool={false} 
                  currentUserId={user?.id || ''} 
                  studentType={applicationDetails.student_process_type || 'initial'}
                  showAcceptanceLetter={false}
                  onDocumentUploaded={async (requestId: string, fileName: string, isResubmission: boolean) => {
                    try {
                      if (logAction && user?.id) {
                        await logAction(
                          isResubmission ? 'document_resubmitted' : 'document_uploaded',
                          `Document "${fileName}" ${isResubmission ? 'resubmitted' : 'uploaded'} for document request`,
                          user.id,
                          'student',
                          {
                            request_id: requestId,
                            file_name: fileName,
                            is_resubmission: isResubmission,
                            application_id: applicationDetails.id
                          }
                        );
                      }
                      await fetchApplicationDetails(true);
                    } catch (e) {
                      console.error('Failed to log document upload action:', e);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'acceptance' && (
            <div className="space-y-8 pb-12">
               {!isAcceptanceUnlocked ? (
                 <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-300 shadow-2xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                    
                    <div className="w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mx-auto border border-red-100 relative shadow-sm">
                       <Award className="w-12 h-12 text-red-600" />
                       <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                          <Lock className="w-5 h-5 text-red-50" />
                       </div>
                    </div>
                    <div className="max-w-md mx-auto space-y-4">
                       <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Acesso Bloqueado</h3>
                       <p className="text-gray-600 font-medium leading-relaxed">
                          Sua carta de aceite será liberada assim que os seguintes requisitos forem cumpridos:
                       </p>
                    </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className={`p-8 rounded-[2rem] border transition-all duration-300 ${allDocsApproved ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                           <div className="flex items-center gap-3 mb-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allDocsApproved ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg' : 'bg-blue-600 text-white shadow-blue-200 shadow-lg'}`}>
                                 {allDocsApproved ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${allDocsApproved ? 'text-emerald-600' : 'text-gray-900'}`}>Documentos</span>
                           </div>
                           <p className={`text-base font-bold tracking-tight uppercase ${allDocsApproved ? 'text-gray-900' : 'text-gray-900'}`}>Aprovação de Documentos</p>
                           {!allDocsApproved && (
                             <button onClick={() => setActiveTab('documents')} className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:blue-700 underline-offset-4 hover:underline transition-all">Resolver Pendências</button>
                           )}
                        </div>

                        <div className={`p-8 rounded-[2rem] border transition-all duration-300 ${hasPaid ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                           <div className="flex items-center gap-3 mb-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasPaid ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg' : 'bg-blue-600 text-white shadow-blue-200 shadow-lg'}`}>
                                 {hasPaid ? <CheckCircle2 className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${hasPaid ? 'text-emerald-600' : 'text-gray-900'}`}>Pagamento</span>
                           </div>
                           <p className={`text-base font-bold tracking-tight uppercase ${hasPaid ? 'text-gray-900' : 'text-gray-900'}`}>Taxa I-20 (Controle)</p>
                           {!hasPaid && (
                             <button onClick={() => setActiveTab('i20')} className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 underline-offset-4 hover:underline transition-all">Pagar Agora</button>
                           )}
                        </div>
                     </div>
                 </div>
                ) : (
                  <div className="space-y-8">
                    {/* Acceptance Header Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden group">
                      <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-12 md:p-16 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
                        <div className="relative z-10">
                          <div className="flex flex-col md:flex-row items-center gap-10">
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-white/20 rounded-[2.5rem] flex items-center justify-center backdrop-blur-md shadow-2xl border border-white/30 animate-bounce-slow">
                              <Award className="w-12 h-12 md:w-16 md:h-16 text-white" />
                            </div>
                            <div className="flex-1 text-center md:text-left space-y-4">
                              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">Documento Oficial</span>
                                <span className="px-3 py-1 bg-yellow-400/20 backdrop-blur-md rounded-full text-[10px] font-black text-yellow-300 uppercase tracking-widest border border-yellow-400/30">Admissão Confirmada</span>
                              </div>
                              <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight">Parabéns pelo seu Aceite!</h3>
                              <p className="text-emerald-100 text-lg font-medium max-w-2xl leading-relaxed">
                                Sua jornada acadêmica nos EUA acaba de se tornar realidade. Sua carta de aceite oficial já está disponível para download.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Acceptance Actions Content */}
                      <div className="p-8 md:p-12 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                          <div className="md:col-span-7 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              <Info className="w-3 h-3" />
                              O que significa este documento?
                            </div>
                            <p className="text-gray-600 leading-relaxed font-medium">
                              A Carta de Aceite é o documento oficial emitido pela universidade confirmando sua admissão no programa. Ela é essencial para os próximos passos da sua jornada internacional e para a emissão do seu visto.
                            </p>
                          </div>
                          
                          <div className="md:col-span-5 flex flex-col gap-4">
                            {applicationDetails.acceptance_letter_url ? (
                              <>
                                <button 
                                  onClick={() => handleViewDocument(applicationDetails.acceptance_letter_url, 'document-attachments')}
                                  className="w-full bg-slate-900 hover:bg-slate-800 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 group"
                                >
                                  <FileSearch className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                  Visualizar Carta
                                </button>
                                <button 
                                  onClick={() => handleDownloadDocument(applicationDetails.acceptance_letter_url, 'acceptance_letter', 'document-attachments')}
                                  className="w-full bg-white hover:bg-slate-50 text-emerald-600 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border-2 border-emerald-100 flex items-center justify-center gap-3 active:scale-95 hover:border-emerald-200"
                                >
                                  <Download className="w-5 h-5" />
                                  Baixar PDF Original
                                </button>
                              </>
                            ) : (
                              <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Aguardando Envio da Universidade</p>
                                <p className="text-[10px] text-slate-300 mt-1 uppercase font-black tracking-widest">Liberação em andamento</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Legacy/Modals support */}
      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl || ''} onClose={() => setPreviewUrl(null)} />
      )}

      {showZelleCheckout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 custom-scrollbar">
            <button 
              onClick={() => setShowZelleCheckout(false)} 
              className="absolute top-6 right-6 p-2 rounded-full bg-gray-100/50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-8 md:p-10">
              <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
                  <DollarSign className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Pagamento via Zelle</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Siga as instruções para realizar a transferência</p>
                </div>
              </div>
              
              <ZelleCheckout
                feeType="i20_control_fee"
                amount={getFeeAmount('i20_control_fee')}
                scholarshipsIds={applicationDetails?.scholarships?.id ? [applicationDetails.scholarships.id] : []}
                metadata={{
                  application_id: applicationDetails?.id,
                  selected_scholarship_id: applicationDetails?.scholarships?.id
                }}
                onSuccess={() => {
                  setShowZelleCheckout(false);
                  fetchApplicationDetails();
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      <I20ControlFeeModal
        isOpen={showI20ControlFeeModal}
        onClose={handleCloseI20Modal}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        isLoading={i20Loading}
      />

      <ProfileRequiredModal
        isOpen={showProfileRequiredModal}
        onClose={() => {
          setShowProfileRequiredModal(false);
          setProfileErrorType(null);
        }}
        errorType={profileErrorType}
      />

      {/* Global CSS for animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}} />

      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl || ''} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
};

