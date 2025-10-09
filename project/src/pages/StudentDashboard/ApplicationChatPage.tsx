import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useStudentLogs } from '../../hooks/useStudentLogs';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import { supabase } from '../../lib/supabase';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { FileText, UserCircle, GraduationCap, CheckCircle, Building, Award, Home, Info, FileCheck, FolderOpen } from 'lucide-react';
import { I20ControlFeeModal } from '../../components/I20ControlFeeModal';
import TruncatedText from '../../components/TruncatedText';
// Remover os imports das imagens
// import WelcomeImg from '../../assets/page 7.png';
// import SupportImg from '../../assets/page 8.png';

// TABS será montado dinamicamente conforme o status

interface DocumentInfo {
  key: string;
  label: string;
  description: string;
}

// Componente de card padrão para dashboard
const DashboardCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-2xl border border-blue-100 p-6 md:p-10 mb-8 w-full ${className}`}>
    {children}
  </div>
);

// Função utilitária de download imediato será movida para dentro do componente

const ApplicationChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { formatFeeAmount, getFeeAmount } = useFeeConfig(user?.id);
  const { logAction } = useStudentLogs(userProfile?.id || '');

  // Todos os hooks devem vir ANTES de qualquer return condicional
  const [i20Loading, setI20Loading] = useState(false);
  const [i20Error, setI20Error] = useState<string | null>(null);
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [i20Countdown, setI20Countdown] = useState<string | null>(null);
  const [scholarshipFeeDeadline, setScholarshipFeeDeadline] = useState<Date | null>(null);
  const [showI20ControlFeeModal, setShowI20ControlFeeModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | null>(null);
  // Ajustar tipo de activeTab para incluir 'welcome'
  const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'i20' | 'documents' | 'chat'>('welcome');

  // useEffect também deve vir antes de qualquer return condicional
  useEffect(() => {
    if (applicationId) {
      supabase
        .from('scholarship_applications')
        .select(`*, user_profiles!student_id(*), scholarships(*, universities(*))`)
        .eq('id', applicationId)
        .single()
        .then(({ data }) => {
          console.log('🔍 [ApplicationChatPage] Application details loaded:', data);
          console.log('🔍 [ApplicationChatPage] Student process type:', data?.student_process_type);
          setApplicationDetails(data);
        });
    }
  }, [applicationId]);

  // useEffect para detectar parâmetro de URL e definir aba ativa
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['welcome', 'details', 'i20', 'documents', 'chat'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }
  }, [searchParams]);

  // Polling para atualizar o perfil do usuário a cada 2 minutos (modo conservador)
  useEffect(() => {
    const interval = setInterval(() => {
      refetchUserProfile && refetchUserProfile();
    }, 120000); // Reduzido de 3s para 2 minutos
    return () => clearInterval(interval);
  }, [refetchUserProfile]);

  // Monitorar mudanças no estado do modal para debug
  useEffect(() => {
    console.log('🔍 [ApplicationChatPage] Estado do modal mudou:', {
      showI20ControlFeeModal,
      selectedPaymentMethod,
      i20Loading,
      i20Error
    });
  }, [showI20ControlFeeModal, selectedPaymentMethod, i20Loading, i20Error]);

  // Buscar data de pagamento da scholarship fee (agora usando scholarship_applications)
  useEffect(() => {
    // Removido: busca antiga usando user.id
  }, []);

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
        
        // Verificar se há dados e pegar o primeiro resultado
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
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setI20Countdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scholarshipFeeDeadline]);

  // Lógica de exibição do card
  const hasPaid = !!(userProfile && (userProfile as any).has_paid_i20_control_fee);
  const dueDate = (userProfile && (userProfile as any).i20_control_fee_due_date) || null;
  const paymentDate = (userProfile && (userProfile as any).i20_control_fee_due_date) || null;

  // Função para iniciar o pagamento do I-20 Control Fee
  const handlePayI20 = async () => {
    console.log('🔍 [ApplicationChatPage] handlePayI20 chamada');
    console.log('🔍 [ApplicationChatPage] Estado atual showI20ControlFeeModal:', showI20ControlFeeModal);
    console.log('🔍 [ApplicationChatPage] Estado atual selectedPaymentMethod:', selectedPaymentMethod);
    
    // Resetar o estado antes de abrir o modal
    setSelectedPaymentMethod(null);
    setI20Error(null);
    
    // Abrir o modal do I-20 Control Fee ao invés de redirecionar diretamente
    setShowI20ControlFeeModal(true);
    
    console.log('🔍 [ApplicationChatPage] setShowI20ControlFeeModal(true) executado');
  };

  // Função para lidar com a seleção do método de pagamento
  const handlePaymentMethodSelect = (method: 'stripe' | 'zelle' | 'pix') => {
    console.log('🔍 [ApplicationChatPage] Método de pagamento selecionado:', method);
    setSelectedPaymentMethod(method);
    console.log('🔍 [ApplicationChatPage] Estado setSelectedPaymentMethod atualizado para:', method);
  };

  // Função para fechar o modal
  const handleCloseI20Modal = () => {
    setShowI20ControlFeeModal(false);
    setSelectedPaymentMethod(null);
  };

  // Função para processar o pagamento
  const handleProceedPayment = useCallback(async () => {
    console.log('🔍 [ApplicationChatPage] handleProceedPayment chamado. selectedPaymentMethod:', selectedPaymentMethod);
    
    if (!selectedPaymentMethod) {
      console.log('❌ [ApplicationChatPage] Nenhum método de pagamento selecionado. Abortando.');
      return;
    }
    
    setI20Loading(true);
    setI20Error(null);
    
    try {
      if (selectedPaymentMethod === 'stripe') {
        // Redirecionar para o Stripe
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout-i20-control-fee`;
        
        // Novo modelo: I-20 NÃO recebe adicionais por dependentes
        const baseAmount = getFeeAmount('i20_control_fee');
        const finalAmount = baseAmount;
        
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            success_url: window.location.origin + '/student/dashboard/i20-control-fee-success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: window.location.origin + '/student/dashboard/i20-control-fee-error',
            price_id: STRIPE_PRODUCTS.controlFee.priceId,
            amount: finalAmount, // Valor fixo do I-20 (sem dependentes)
            payment_method: 'stripe'
          }),
        });
        const data = await res.json();
        if (data.session_url) {
          window.location.href = data.session_url;
        } else {
          setI20Error(t('studentDashboard.applicationChatPage.errors.paymentSessionError'));
        }
      } else if (selectedPaymentMethod === 'pix') {
        // Redirecionar para o PIX
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout-i20-control-fee`;
        
        // Novo modelo: I-20 NÃO recebe adicionais por dependentes
        const baseAmount = getFeeAmount('i20_control_fee');
        const finalAmount = baseAmount;
        
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            success_url: window.location.origin + '/student/dashboard/i20-control-fee-success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: window.location.origin + '/student/dashboard/i20-control-fee-error',
            price_id: STRIPE_PRODUCTS.controlFee.priceId,
            amount: finalAmount, // Valor fixo do I-20 (sem dependentes)
            payment_method: 'pix'
          }),
        });
        const data = await res.json();
        if (data.session_url) {
          window.location.href = data.session_url;
        } else {
          setI20Error(t('studentDashboard.applicationChatPage.errors.paymentSessionError'));
        }
      } else if (selectedPaymentMethod === 'zelle') {
        // Redirecionar para a página de pagamento Zelle (mesma rota das outras taxas)
        // Usar valor dinâmico do I-20 Control Fee (com overrides se aplicável)
        const i20Amount = getFeeAmount('i20_control_fee').toString();
        
        const params = new URLSearchParams({
          feeType: 'i20_control_fee',
          amount: i20Amount,
          scholarshipsIds: applicationDetails?.scholarships?.id || ''
        });
        
        // Adicionar campo específico para I-20 Control Fee
        params.append('i20ControlFeeAmount', i20Amount);
        
        window.location.href = `/checkout/zelle?${params.toString()}`;
      }
      
      // Se chegou até aqui sem erro, não fechar o modal ainda (redirecionamento está acontecendo)
      console.log('🔍 [ApplicationChatPage] Redirecionamento iniciado, mantendo modal aberto');
      
    } catch (err) {
      console.error('🔍 [ApplicationChatPage] Erro no pagamento:', err);
      setI20Error(t('studentDashboard.applicationChatPage.errors.paymentRedirectError'));
      setI20Loading(false);
      handleCloseI20Modal();
    }
  }, [selectedPaymentMethod, applicationDetails?.scholarships?.id, t]);

  // Auto-processar pagamento quando método é selecionado
  useEffect(() => {
    if (selectedPaymentMethod && showI20ControlFeeModal) {
      console.log('🔍 [ApplicationChatPage] Auto-processando pagamento para método:', selectedPaymentMethod);
      // Aguardar um frame para garantir que o estado seja propagado
      const timer = setTimeout(() => {
        handleProceedPayment();
      }, 50); // Reduzido para 50ms para ser mais responsivo
      
      return () => clearTimeout(timer);
    }
  }, [selectedPaymentMethod, showI20ControlFeeModal, handleProceedPayment]);

  // AGORA podemos ter o return condicional - todos os hooks já foram chamados
  if (!user) {
    return <div className="text-center text-gray-500 py-10">Authenticating...</div>;
  }

  // Hook do chat da aplicação (mensagens em tempo real)
  const chat = useApplicationChat(applicationId);

  // Array de informações dos documentos
  const DOCUMENTS_INFO: DocumentInfo[] = [
    { key: 'passport', label: t('studentDashboard.applicationChatPage.documentTypes.passport.label'), description: t('studentDashboard.applicationChatPage.documentTypes.passport.description') },
    { key: 'diploma', label: t('studentDashboard.applicationChatPage.documentTypes.diploma.label'), description: t('studentDashboard.applicationChatPage.documentTypes.diploma.description') },
    { key: 'funds_proof', label: t('studentDashboard.applicationChatPage.documentTypes.funds_proof.label'), description: t('studentDashboard.applicationChatPage.documentTypes.funds_proof.description') },
  ];

  // Função utilitária de download imediato
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
    } catch (e) {
      alert(t('studentDashboard.applicationChatPage.errors.downloadFailed'));
    }
  };

  // (removido) ensureCompleteUrl não utilizado

  // Montar as abas dinamicamente com ícones distintos
  const tabs = [
    { id: 'welcome', label: t('studentDashboard.applicationChatPage.tabs.welcome'), icon: Home },
    { id: 'details', label: t('studentDashboard.applicationChatPage.tabs.details'), icon: Info },
    { id: 'chat', label: t('studentDashboard.applicationChatPage.tabs.chat') || 'Chat', icon: FileText },
    ...(applicationDetails && applicationDetails.status === 'enrolled' ? [
      { id: 'i20', label: t('studentDashboard.applicationChatPage.tabs.i20'), icon: FileCheck }
    ] : []),
    
    { id: 'documents', label: t('studentDashboard.applicationChatPage.tabs.documents'), icon: FolderOpen },
  ];

  return (
    <div className="p-6 md:p-12 flex flex-col items-center min-h-screen h-full">
      <div className="w-full max-w-7xl mx-auto space-y-8 flex-1 flex flex-col h-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          {t('studentDashboard.applicationChatPage.title')}
        </h2>
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto flex-nowrap scrollbar-hide" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`flex flex-col items-center gap-1 px-3 py-1 md:px-5 md:py-2 text-sm md:text-base font-semibold rounded-t-lg border-b-2 transition-colors duration-200 focus:outline-none whitespace-nowrap ${activeTab === tab.id ? 'border-[#05294E] text-[#05294E] bg-white' : 'border-transparent text-slate-500 bg-slate-50 hover:text-[#05294E]'}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              type="button"
              aria-selected={activeTab === tab.id ? 'true' : 'false'}
              role="tab"
            >
              <tab.icon className="w-5 h-5 md:w-5 md:h-5" />
              <span className="text-xs md:text-base mt-0.5 md:mt-0">{tab.label}</span>
            </button>
          ))}
        </div>
        {/* Conteúdo das abas */}
        {activeTab === 'welcome' && applicationDetails && (
          // RESTAURAR layout visual anterior do Welcome (não usar DashboardCard)
          <div className="bg-white rounded-2xl shadow-2xl p-0 overflow-hidden border border-blue-100 flex flex-col">
            {/* Header Welcome + Next Steps (layout visual anterior) */}
            <div className="flex items-center gap-4 px-8 pt-8 pb-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex-shrink-0 hidden sm:flex items-center justify-center w-16 h-16 bg-white rounded-full border border-blue-100">
                {applicationDetails.scholarships?.universities?.logo_url ? (
                  <img
                    src={applicationDetails.scholarships.universities.logo_url || ''}
                    alt={(applicationDetails.scholarships.universities.name || 'university') + ' logo'}
                    className="w-12 h-12 object-contain rounded-full"
                    loading="lazy"
                  />
                ) : (
                  <GraduationCap className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#05294E] mb-1 leading-tight">
                  {t('studentDashboard.applicationChatPage.welcome.welcomeMessage', { firstName: applicationDetails.user_profiles?.full_name?.split(' ')[0] || 'Student' })}
                </h1>
                <div className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  {t('studentDashboard.applicationChatPage.welcome.applicationInProgress', { universityName: applicationDetails.scholarships?.universities?.name || 'your university' })}
                </div>
                {applicationDetails.scholarships?.title && (
                  <div className="text-xs sm:text-sm text-slate-600 mt-2 leading-tight">
                    <span className="block sm:inline">
                      {t('studentDashboard.applicationChatPage.welcome.scholarship')}
                    </span>
                    <span className="font-semibold block sm:inline sm:ml-1">
                      {applicationDetails.scholarships.title}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Next Steps - Guia prático */}
            <div className="px-8 py-8 bg-white flex flex-col gap-6 items-center">
              <h2 className="text-2xl font-extrabold text-[#05294E] mb-2 text-center tracking-tight">{t('studentDashboard.applicationChatPage.welcome.howToProceed')}</h2>
              {/* Passo 1: Document Requests */}
              <div className="w-full bg-blue-50 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 shadow">
                <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-blue-900 text-lg mb-1">{t('studentDashboard.applicationChatPage.welcome.documentRequests.title')}</div>
                  <div className="text-base text-slate-700 mb-2">{t('studentDashboard.applicationChatPage.welcome.documentRequests.description')}</div>
                  <button onClick={() => setActiveTab('documents')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-all duration-200">{t('studentDashboard.applicationChatPage.welcome.documentRequests.button')}</button>
                </div>
              </div>

              {/* Passo 3: Application Details */}
              <div className="w-full bg-blue-50 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 shadow">
                <UserCircle className="w-10 h-10 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-blue-900 text-lg mb-1">{t('studentDashboard.applicationChatPage.welcome.applicationDetails.title')}</div>
                  <div className="text-base text-slate-700 mb-2">{t('studentDashboard.applicationChatPage.welcome.applicationDetails.description')}</div>
                  <button onClick={() => setActiveTab('details')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-all duration-200">{t('studentDashboard.applicationChatPage.welcome.applicationDetails.button')}</button>
                </div>
              </div>
              {/* Passo 4: I-20 Control Fee (só se liberado) */}
              {(applicationDetails.status === 'enrolled' || applicationDetails.acceptance_letter_status === 'approved') && (
                <div className="w-full bg-blue-50 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 shadow">
                  <Award className="w-10 h-10 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-bold text-blue-900 text-lg mb-1">{t('studentDashboard.applicationChatPage.welcome.i20ControlFee.title')}</div>
                    <div className="text-base text-slate-700 mb-2">{t('studentDashboard.applicationChatPage.welcome.i20ControlFee.description')}</div>
                    <button onClick={() => setActiveTab('i20')} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-all duration-200">{t('studentDashboard.applicationChatPage.welcome.i20ControlFee.button')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8l-4 1 1.1-3.7A7.82 7.82 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {t('studentDashboard.applicationChatPage.chat.title') || 'Application Chat'}
              </h2>
            </div>
            <div className="p-0 h-96">
              <ApplicationChat
                messages={chat.messages}
                onSend={chat.sendMessage as any}
                loading={chat.loading}
                isSending={chat.isSending}
                error={chat.error}
                currentUserId={user?.id || ''}
                messageContainerClassName="gap-6 py-4"
                className="h-full"
              />
            </div>
          </div>
        )}
        {activeTab === 'details' && applicationDetails && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              {/* Student Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <UserCircle className="w-6 h-6 mr-3" />
                    {t('studentDashboard.applicationChatPage.details.studentInformation.title')}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">{t('studentDashboard.applicationChatPage.details.studentInformation.personalDetails')}</h3>
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.fullName')}</span>
                          <span className="font-medium text-slate-900">{applicationDetails.user_profiles?.full_name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.email')}</span>
                          <span className="font-medium text-slate-900">{applicationDetails.user_profiles?.email || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.phone')}</span>
                          <span className="font-medium text-slate-900">{applicationDetails.user_profiles?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.country')}</span>
                          <span className="font-medium text-slate-900">{applicationDetails.user_profiles?.country || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">{t('studentDashboard.applicationChatPage.details.studentInformation.academicProfile')}</h3>
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.studentType')}</span>
                          <span className="font-medium text-slate-900">
                            {applicationDetails.student_process_type === 'initial' ? t('studentDashboard.applicationChatPage.details.studentInformation.initialF1VisaRequired') :
                             applicationDetails.student_process_type === 'transfer' ? t('studentDashboard.applicationChatPage.details.studentInformation.transferCurrentF1Student') :
                             applicationDetails.student_process_type === 'change_of_status' ? t('studentDashboard.applicationChatPage.details.studentInformation.changeOfStatusFromOtherVisa') :
                             applicationDetails.student_process_type || 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.applicationDate')}</span>
                          <span className="font-medium text-slate-900">
                            {new Date(applicationDetails.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.lastUpdated')}</span>
                          <span className="font-medium text-slate-900">
                            {new Date(applicationDetails.updated_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Application & Status */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">{t('studentDashboard.applicationChatPage.details.studentInformation.applicationStatus')}</h3>
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.currentStatus')}</span>
                          <div className="mt-1">
                            {applicationDetails.status === 'enrolled' || applicationDetails.acceptance_letter_status === 'approved' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                {t('studentDashboard.applicationChatPage.details.studentInformation.enrolled')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                                {t('studentDashboard.applicationChatPage.details.studentInformation.waitingForAcceptanceLetter')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.studentInformation.documentsStatus')}</span>
                          <span className="font-medium text-slate-900">
                            {DOCUMENTS_INFO.filter(doc => {
                              let docData = Array.isArray(applicationDetails.documents)
                                ? applicationDetails.documents.find((d: any) => d.type === doc.key)
                                : null;
                              if (!docData && Array.isArray(applicationDetails.user_profiles?.documents)) {
                                docData = applicationDetails.user_profiles.documents.find((d: any) => d.type === doc.key);
                              }
                              return docData?.status === 'approved';
                            }).length} / {DOCUMENTS_INFO.length} {t('studentDashboard.applicationChatPage.details.studentInformation.approved')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* University Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Building className="w-6 h-6 mr-3" />
                    {t('studentDashboard.applicationChatPage.details.universityInformation.title')}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.universityInformation.universityName')}</div>
                        <div className="font-semibold text-slate-900">{applicationDetails.scholarships?.universities?.name || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.universityInformation.location')}</div>
                        <div className="font-semibold text-slate-900">
                          {applicationDetails.scholarships?.universities?.address?.city || 'N/A'}, {applicationDetails.scholarships?.universities?.address?.country || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.universityInformation.contactInformation')}</div>
                        <div className="space-y-1">
                          {applicationDetails.scholarships?.universities?.website && (
                            <div className="text-sm">
                                                              <span className="text-slate-600">{t('studentDashboard.applicationChatPage.details.universityInformation.website')} </span>
                              <a href={applicationDetails.scholarships.universities.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                {applicationDetails.scholarships.universities.website}
                              </a>
                            </div>
                          )}
                          {(applicationDetails.scholarships?.universities?.contact?.email || applicationDetails.scholarships?.universities?.contact?.admissionsEmail) && (
                            <div className="text-sm">
                                                              <span className="text-slate-600">{t('studentDashboard.applicationChatPage.details.universityInformation.email')} </span>
                              <span className="font-medium text-slate-900">
                                {applicationDetails.scholarships.universities.contact?.email || applicationDetails.scholarships.universities.contact?.admissionsEmail}
                              </span>
                            </div>
                          )}
                          {applicationDetails.scholarships?.universities?.contact?.phone && (
                            <div className="text-sm">
                                                              <span className="text-slate-600">{t('studentDashboard.applicationChatPage.details.universityInformation.phone')} </span>
                              <span className="font-medium text-slate-900">{applicationDetails.scholarships.universities.contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scholarship Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Award className="w-6 h-6 mr-3" />
                    {t('studentDashboard.applicationChatPage.details.scholarshipDetails.title')}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.scholarshipDetails.scholarshipName')}</div>
                        <div className="font-semibold text-slate-900">{applicationDetails.scholarships?.title || applicationDetails.scholarships?.name || 'N/A'}</div>
                      </div>
                    </div>
                    {applicationDetails.scholarships?.course && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.scholarshipDetails.course')}</div>
                          <div className="font-semibold text-slate-900">{applicationDetails.scholarships.course}</div>
                        </div>
                      </div>
                    )}
                    {applicationDetails.scholarships?.description && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.scholarshipDetails.description')}</div>
                          <div className="font-medium text-slate-900">{applicationDetails.scholarships.description}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Student Documents Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-500 to-slate-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <FileText className="w-6 h-6 mr-3" />
                    {t('studentDashboard.applicationChatPage.details.studentDocuments.title')}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {DOCUMENTS_INFO.map((doc) => {
                      let docData = Array.isArray(applicationDetails.documents)
                        ? applicationDetails.documents.find((d: any) => d.type === doc.key)
                        : null;
                      if (!docData && Array.isArray(applicationDetails.user_profiles?.documents)) {
                        docData = applicationDetails.user_profiles.documents.find((d: any) => d.type === doc.key);
                      }
                      const status = docData?.status || 'not_submitted';
                      
                      return (
                        <div key={doc.key} className="border-b border-slate-200 last:border-0 pb-6 last:pb-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-slate-900">{doc.label}</h4>
                                <div className="ml-auto">
                                  {status === 'approved' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {t('studentDashboard.applicationChatPage.status.approved')}
                                    </span>
                                  )}
                                  {status === 'changes_requested' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                      {t('studentDashboard.applicationChatPage.status.changesRequested')}
                                    </span>
                                  )}
                                  {status === 'under_review' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                      {t('studentDashboard.applicationChatPage.status.underReview')}
                                    </span>
                                  )}
                                  {status === 'not_submitted' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                      {t('studentDashboard.applicationChatPage.status.notSubmitted')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 mb-3">{doc.description}</p>
                              {docData && (
                                                              <div className="text-xs text-slate-500 mb-3">
                                {t('studentDashboard.applicationChatPage.details.studentDocuments.uploaded')} {new Date(docData.uploaded_at).toLocaleDateString()}
                              </div>
                              )}
                              
                              {/* Exibir motivo da rejeição se o documento foi rejeitado */}
                              {status === 'rejected' && docData?.rejection_reason && (
                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-xs font-medium text-red-600 mb-1">Rejection reason:</p>
                                  <TruncatedText
                                    text={docData.rejection_reason}
                                    maxLength={120}
                                    className="text-sm text-red-700 leading-relaxed"
                                    showTooltip={true}
                                    tooltipPosition="top"
                                  />
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                {docData ? (
                                  <>
                                    <button
                                      className="px-3 py-1 bg-[#05294E] text-white rounded-lg hover:bg-[#041f38] text-sm font-medium transition-colors"
                                      onClick={() => setPreviewUrl(docData.url)}
                                    >
                                      {t('studentDashboard.applicationChatPage.details.studentDocuments.viewDocument')}
                                    </button>
                                    <button
                                      className="px-3 py-1 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 text-sm font-medium transition-colors"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        await handleForceDownload(docData.url, docData.url.split('/').pop() || 'document.pdf');
                                      }}
                                    >
                                      {t('studentDashboard.applicationChatPage.details.studentDocuments.download')}
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-sm text-red-500 font-medium">{t('studentDashboard.applicationChatPage.details.studentDocuments.documentNotUploaded')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-6">
              {/* Quick Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">{t('studentDashboard.applicationChatPage.details.applicationSummary')}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.details.submitted')}</span>
                    <span className="text-sm text-slate-900">
                      {new Date(applicationDetails.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">{t('studentDashboard.applicationChatPage.details.recentActivity')}</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{t('studentDashboard.applicationChatPage.details.applicationSubmitted')}</div>
                        <div className="text-xs text-slate-600">{new Date(applicationDetails.created_at || Date.now()).toLocaleDateString()}</div>
                      </div>
                    </div>
                    {applicationDetails.updated_at !== applicationDetails.created_at && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">{t('studentDashboard.applicationChatPage.details.applicationUpdated')}</div>
                          <div className="text-xs text-slate-600">{new Date(applicationDetails.updated_at || Date.now()).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">{t('studentDashboard.applicationChatPage.details.quickActions')}</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                                         {[
                       { label: t('studentDashboard.applicationChatPage.details.manageDocuments'), tab: 'documents', icon: FileText },
                      ...(applicationDetails.status === 'enrolled' ? [{ label: 'I-20 Control Fee', tab: 'i20', icon: Award }] : [])
                    ].map((action) => (
                      <button
                        key={action.tab}
                        onClick={() => setActiveTab(action.tab as any)}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <action.icon className="w-4 h-4 text-slate-500" />
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'i20' && applicationDetails && applicationDetails.status === 'enrolled' && (
          <DashboardCard>
            <h3 className="text-xl font-bold text-[#05294E] mb-4">{t('studentDashboard.applicationChatPage.i20ControlFee.title')}</h3>
            
            {!hasPaid ? (
              <>
                <div className="mb-3 text-sm text-slate-700" dangerouslySetInnerHTML={{
                  __html: t('studentDashboard.applicationChatPage.i20ControlFee.description') + '<br />' +
                          '<span class="font-semibold">' + t('studentDashboard.applicationChatPage.i20ControlFee.deadlineInfo') + '</span> ' +
                          t('studentDashboard.applicationChatPage.i20ControlFee.timerInfo') + '<br />' +
                          t('studentDashboard.applicationChatPage.i20ControlFee.paymentInfo')
                }} />
                {/* Cronômetro e botão lado a lado (invertidos) */}
                <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2 w-full mt-4">
                  <div className="flex-1 flex items-center justify-center">
                    <button
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium w-full md:w-auto min-w-[140px] max-w-xs shadow-md border border-blue-200"
                      onClick={handlePayI20}
                      disabled={i20Loading}
                      style={{height: '44px'}}>
                      {i20Loading ? t('studentDashboard.applicationChatPage.i20ControlFee.processing') : t('studentDashboard.applicationChatPage.i20ControlFee.payButton')}
                    </button>
                  </div>
                  {scholarshipFeeDeadline && (
                    <div className={`flex-1 min-w-[140px] max-w-xs p-3 rounded-xl shadow-md text-center border ${i20Countdown === 'Expired' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}
                         style={{height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      {i20Countdown === 'Expired' ? (
                        <span className="text-red-600 font-bold text-sm md:text-base">{t('studentDashboard.applicationChatPage.i20ControlFee.deadlineExpired')}</span>
                      ) : (
                        <span className="font-mono text-base md:text-lg text-[#05294E] tracking-widest">
                          {i20Countdown}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {dueDate && (
                  <span className="text-xs text-slate-600">{t('studentDashboard.applicationChatPage.i20ControlFee.dueDate')} {new Date(dueDate).toLocaleDateString()}</span>
                )}
                {i20Error && <div className="text-center text-red-500 py-2">{i20Error}</div>}
              </>
            ) : (
              <>
                <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-lg font-bold text-green-800">{t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.title')}</h4>
                  </div>
                  <p className="text-green-700 mb-3">
                    {t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.description')}
                  </p>
                                      <div className="text-sm text-green-600">
                      <strong>{t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.nextSteps')}</strong>
                                          <ul className="list-disc list-inside mt-2 space-y-1">
                        {(t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.nextStepsList', { returnObjects: true }) as string[]).map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h5 className="font-semibold text-blue-900 mb-2">{t('studentDashboard.applicationChatPage.i20ControlFee.paymentInformation')}</h5>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>{t('studentDashboard.applicationChatPage.i20ControlFee.amountPaid')}</strong> {formatFeeAmount(getFeeAmount('i20_control_fee'))}</div>
                    <div><strong>{t('studentDashboard.applicationChatPage.i20ControlFee.paymentDate')}</strong> {paymentDate ? new Date(paymentDate).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>{t('studentDashboard.applicationChatPage.i20ControlFee.status')}</strong> <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{t('studentDashboard.applicationChatPage.i20ControlFee.completed')}</span></div>
                  </div>
                </div>
              </>
            )}
          </DashboardCard>
        )}
        
        {activeTab === 'documents' && applicationDetails && (
          <div className="bg-white rounded-2xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('studentDashboard.applicationChatPage.documents.title')}
              </h2>
              <p className="text-slate-200 text-xs sm:text-sm mt-1">{t('studentDashboard.applicationChatPage.documents.subtitle')}</p>
            </div>
            <div className="p-3 sm:p-6">
              <DocumentRequestsCard 
                applicationId={applicationId!} 
                isSchool={false} 
                currentUserId={user.id} 
                studentType={applicationDetails.student_process_type || 'initial'}
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
                          application_id: applicationId
                        }
                      );
                    }
                  } catch (e) {
                    console.error('Failed to log document upload action:', e);
                  }
                }}
              />
            </div>
          </div>
        )}
        {previewUrl && (
          <DocumentViewerModal documentUrl={previewUrl || ''} onClose={() => setPreviewUrl(null)} />
        )}

        {/* Modal do I-20 Control Fee */}
        <I20ControlFeeModal
          isOpen={showI20ControlFeeModal}
          onClose={handleCloseI20Modal}
          selectedPaymentMethod={selectedPaymentMethod}
          onPaymentMethodSelect={handlePaymentMethodSelect}
        />
      </div>
    </div>
  );
};

export default ApplicationChatPage; 