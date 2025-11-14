import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useDynamicFees } from '../../hooks/useDynamicFees';
import { useStudentLogs } from '../../hooks/useStudentLogs';

import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import { supabase } from '../../lib/supabase';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { FileText, UserCircle, GraduationCap, CheckCircle, Building, Award, Home, Info, FileCheck, FolderOpen, MapPin, Phone, Globe, Mail, BookOpen } from 'lucide-react';
import { I20ControlFeeModal } from '../../components/I20ControlFeeModal';
import TruncatedText from '../../components/TruncatedText';
import { ExpandableTabs } from '../../components/ui/expandable-tabs';
// Remover os imports das imagens
// import WelcomeImg from '../../assets/page 7.png';
// import SupportImg from '../../assets/page 8.png';

// TABS será montado dinamicamente conforme o status

interface DocumentInfo {
  key: string;
  label: string;
  description: string;
}

// Componente DashboardCard removido - não mais utilizado

// Função utilitária de download imediato será movida para dentro do componente

const ApplicationChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { formatFeeAmount, getFeeAmount } = useFeeConfig(user?.id);
  const { i20ControlFee } = useDynamicFees();
  const { logAction } = useStudentLogs(userProfile?.id || '');

  // Todos os hooks devem vir ANTES de qualquer return condicional
  const [i20Loading, setI20Loading] = useState(false);
  const [i20Error, setI20Error] = useState<string | null>(null);
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [i20Countdown, setI20Countdown] = useState<string | null>(null);
  const [i20CountdownValues, setI20CountdownValues] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [scholarshipFeeDeadline, setScholarshipFeeDeadline] = useState<Date | null>(null);
  const [showI20ControlFeeModal, setShowI20ControlFeeModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | null>(null);
  const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'i20' | 'documents'>('welcome');
  
  // Estados para controlar document requests (removidos - não mais utilizados)

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
    if (tabParam && ['welcome', 'details', 'i20', 'documents'].includes(tabParam)) {
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

  // Document requests logic removed - no longer needed

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
        
        // ✅ CORREÇÃO: Usar useDynamicFees que já considera system_type
        if (!i20ControlFee) {
          setI20Error('I-20 Control Fee ainda está carregando. Aguarde um momento e tente novamente.');
          return;
        }
        const finalAmount = parseFloat(i20ControlFee.replace('$', ''));
        
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
    return <div className="text-center text-gray-500 py-10">{t('studentDashboard.applicationChatPage.hardcodedTexts.authenticating')}</div>;
  }

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

  // Montar as abas dinamicamente com ícones distintos para ExpandableTabs
  // Garantir que tabItems e tabIds estejam sempre sincronizados
  const tabItems: Array<{ title: string; icon: any }> = [
    { title: t('studentDashboard.applicationChatPage.tabs.welcome'), icon: Home },
    { title: t('studentDashboard.applicationChatPage.tabs.details'), icon: Info },
  ];
  
  const tabIds: (typeof activeTab)[] = ['welcome', 'details'];
  
  // I-20 agora aparece após scholarship fee ser paga
  if (applicationDetails && applicationDetails.is_scholarship_fee_paid) {
    tabItems.push({ title: t('studentDashboard.applicationChatPage.tabs.i20'), icon: FileCheck });
    tabIds.push('i20');
  }
  
  tabItems.push({ title: t('studentDashboard.applicationChatPage.tabs.documents'), icon: FolderOpen });
  tabIds.push('documents');

  // Mapear índice da tab para o id da tab
  const getTabIdFromIndex = (index: number | null): typeof activeTab => {
    if (index === null) return activeTab;
    // Garantir que tabItems e tabIds têm o mesmo tamanho
    if (tabItems.length !== tabIds.length) {
      return 'welcome';
    }
    // Garantir que o índice corresponde ao mesmo índice em tabIds
    if (index >= 0 && index < tabItems.length && index < tabIds.length) {
      return tabIds[index] || 'welcome';
    }
    return 'welcome';
  };

  // Obter índice da tab ativa (sem contar separadores)
  const getActiveTabIndex = (): number | null => {
    const activeIndex = tabIds.indexOf(activeTab);
    return activeIndex !== -1 ? activeIndex : null;
  };

  // Handler para mudança de tab
  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    const tabId = getTabIdFromIndex(index);
    setActiveTab(tabId);
  };

  // Estado para controlar a tab selecionada no ExpandableTabs
  const [selectedTabIndex, setSelectedTabIndex] = React.useState<number | null>(0); // Iniciar com welcome (índice 0)

  // Sincronizar selectedTabIndex quando activeTab mudar externamente
  React.useEffect(() => {
    const newIndex = getActiveTabIndex();
    if (newIndex !== null && newIndex !== selectedTabIndex) {
      setSelectedTabIndex(newIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, applicationDetails?.is_scholarship_fee_paid]);

  return (
    <div className="p-6 md:p-12 flex flex-col items-center min-h-screen h-full">
      <div className="w-full max-w-7xl mx-auto space-y-8 flex-1 flex flex-col h-full">
        {/* Expandable Tabs */}
        <div className="lg:mb-6 mb-0 flex justify-center">
          <ExpandableTabs
            tabs={tabItems}
            activeColor="text-[#05294E]"
            className="border-[#05294E]/20 gap-3"
            onChange={(index) => {
              setSelectedTabIndex(index);
              handleTabChange(index);
            }}
            defaultSelected={selectedTabIndex}
          />
        </div>
        {/* Conteúdo das abas */}
        {activeTab === 'welcome' && applicationDetails && (
          <div className="w-full max-w-4xl mx-auto">
            {/* Hero Section - Mobile First */}
            <div className="relative bg-gradient-to-br from-[#05294E] via-[#0a4a7a] to-[#05294E] rounded-3xl overflow-hidden mb-8 shadow-2xl">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
              </div>
              
              <div className="relative z-10 p-6 sm:p-8 md:p-12">
                <div className="flex flex-col items-center text-center space-y-4">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight text-center">
                    {t('studentDashboard.applicationChatPage.welcome.welcomeMessage', { 
                      firstName: applicationDetails.user_profiles?.full_name?.split(' ')[0] || 'Student' 
                    })}
                  </h1>
                  
                  <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed text-center">
                    {t('studentDashboard.applicationChatPage.welcome.applicationInProgress', { 
                      universityName: applicationDetails.scholarships?.universities?.name || 'your university' 
                    })}
                  </p>
                  
                  {applicationDetails.scholarships?.title && (
                    <div className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mt-6">
                      <Award className="w-5 h-5 text-white mr-2" />
                      <span className="text-white font-medium">
                        {applicationDetails.scholarships.title}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Steps Section - Mobile First */}
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#05294E] mb-3">
                  {t('studentDashboard.applicationChatPage.welcome.howToProceed')}
                </h2>
                <p className="text-gray-600 text-lg">{t('studentDashboard.applicationChatPage.hardcodedTexts.followSteps')}</p>
              </div>

              {/* Step Cards */}
              <div className="grid gap-6 md:gap-8">
                {/* Step 1: Documents */}
                <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#05294E]/20 transform hover:-translate-y-1">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center">
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">1</span>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                          {t('studentDashboard.applicationChatPage.welcome.documentRequests.title')}
                        </h3>
                      </div>
                      
                      <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                        {t('studentDashboard.applicationChatPage.welcome.documentRequests.description')}
                      </p>
                      
                      <button 
                        onClick={() => setActiveTab('documents')}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                      >
                        {t('studentDashboard.applicationChatPage.welcome.documentRequests.button')}
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2: Application Details */}
                <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#05294E]/20 transform hover:-translate-y-1">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center">

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#05294E]/10 text-[#05294E] rounded-full text-sm font-bold">2</span>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                          {t('studentDashboard.applicationChatPage.welcome.applicationDetails.title')}
                        </h3>
                      </div>
                      
                      <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                        {t('studentDashboard.applicationChatPage.welcome.applicationDetails.description')}
                      </p>
                      
                      <button 
                        onClick={() => setActiveTab('details')}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#05294E] to-[#0a4a7a] text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                      >
                        {t('studentDashboard.applicationChatPage.welcome.applicationDetails.button')}
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3: I-20 Control Fee (if available) */}
                {applicationDetails.is_scholarship_fee_paid && (
                  <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#D0151C]/20 transform hover:-translate-y-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center ">
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-[#D0151C] rounded-full text-sm font-bold">3</span>
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {t('studentDashboard.applicationChatPage.welcome.i20ControlFee.title')}
                          </h3>
                        </div>
                        
                        <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                          {t('studentDashboard.applicationChatPage.welcome.i20ControlFee.description')}
                        </p>
                        
                        <button 
                          onClick={() => setActiveTab('i20')}
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                        >
                          {t('studentDashboard.applicationChatPage.welcome.i20ControlFee.button')}
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'details' && applicationDetails && (
          <div className="w-full max-w-6xl mx-auto">

            {/* Cards Grid - Mobile First */}
            <div className="grid gap-6 md:gap-8">
              {/* Student Information Card */}
              <div className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#05294E]/20 overflow-hidden">
                <div className="bg-gradient-to-br from-[#05294E] via-[#0a4a7a] to-[#05294E] p-6 sm:p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <UserCircle className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {t('studentDashboard.applicationChatPage.details.studentInformation.title')}
                    </h2>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Personal Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                          <UserCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{t('studentDashboard.applicationChatPage.details.studentInformation.personalDetails')}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.fullName')}</span>
                          <span className="text-base font-semibold text-gray-900">{applicationDetails.user_profiles?.full_name || 'N/A'}</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.email')}</span>
                          <span className="text-base font-semibold text-gray-900">{applicationDetails.user_profiles?.email || 'N/A'}</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.phone')}</span>
                          <span className="text-base font-semibold text-gray-900">{applicationDetails.user_profiles?.phone || 'N/A'}</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.country')}</span>
                          <span className="text-base font-semibold text-gray-900">{applicationDetails.user_profiles?.country || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{t('studentDashboard.applicationChatPage.details.studentInformation.academicProfile')}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.studentType')}</span>
                          <span className="text-base font-semibold text-gray-900">
                            {applicationDetails.student_process_type === 'initial' ? t('studentDashboard.applicationChatPage.details.studentInformation.initialF1VisaRequired') :
                             applicationDetails.student_process_type === 'transfer' ? t('studentDashboard.applicationChatPage.details.studentInformation.transferCurrentF1Student') :
                             applicationDetails.student_process_type === 'change_of_status' ? t('studentDashboard.applicationChatPage.details.studentInformation.changeOfStatusFromOtherVisa') :
                             applicationDetails.student_process_type || 'N/A'}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.applicationDate')}</span>
                          <span className="text-base font-semibold text-gray-900">
                            {new Date(applicationDetails.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.lastUpdated')}</span>
                          <span className="text-base font-semibold text-gray-900">
                            {new Date(applicationDetails.updated_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Application & Status */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{t('studentDashboard.applicationChatPage.details.studentInformation.applicationStatus')}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-2">{t('studentDashboard.applicationChatPage.details.studentInformation.currentStatus')}</span>
                          {applicationDetails.status === 'enrolled' || applicationDetails.acceptance_letter_status === 'approved' ? (
                            <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t('studentDashboard.applicationChatPage.details.studentInformation.enrolled')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                              {t('studentDashboard.applicationChatPage.details.studentInformation.waitingForAcceptanceLetter')}
                            </span>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200">
                          <span className="text-sm font-medium text-gray-600 block mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.documentsStatus')}</span>
                          <span className="text-base font-semibold text-gray-900">
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
              <div className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 overflow-hidden">
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 sm:p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {t('studentDashboard.applicationChatPage.details.universityInformation.title')}
                    </h2>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 rounded-2xl p-6 hover:bg-blue-100 transition-colors duration-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-blue-600">{t('studentDashboard.applicationChatPage.details.universityInformation.universityName')}</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">{applicationDetails.scholarships?.universities?.name || 'N/A'}</div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-2xl p-6 hover:bg-blue-100 transition-colors duration-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-blue-600">{t('studentDashboard.applicationChatPage.details.universityInformation.location')}</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {applicationDetails.scholarships?.universities?.address?.city || 'N/A'}, {applicationDetails.scholarships?.universities?.address?.country || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Information */}
                  <div className="mt-6 bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-gray-600" />
                      {t('studentDashboard.applicationChatPage.details.universityInformation.contactInformation')}
                    </h3>
                    <div className="space-y-3">
                      {applicationDetails.scholarships?.universities?.website && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-white rounded-xl hover:bg-gray-50 transition-colors duration-200">
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-600 whitespace-nowrap">{t('studentDashboard.applicationChatPage.details.universityInformation.website')}</span>
                          </div>
                          <a 
                            href={applicationDetails.scholarships.universities.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 font-medium break-all sm:break-words sm:ml-auto"
                          >
                            {applicationDetails.scholarships.universities.website}
                          </a>
                        </div>
                      )}
                      {(applicationDetails.scholarships?.universities?.contact?.email || applicationDetails.scholarships?.universities?.contact?.admissionsEmail) && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-white rounded-xl hover:bg-gray-50 transition-colors duration-200">
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-600 whitespace-nowrap">{t('studentDashboard.applicationChatPage.details.universityInformation.email')}</span>
                          </div>
                          <span className="font-medium text-gray-900 break-all sm:break-words sm:ml-auto">
                            {applicationDetails.scholarships.universities.contact?.email || applicationDetails.scholarships.universities.contact?.admissionsEmail}
                          </span>
                        </div>
                      )}
                      {applicationDetails.scholarships?.universities?.contact?.phone && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-white rounded-xl hover:bg-gray-50 transition-colors duration-200">
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-600 whitespace-nowrap">{t('studentDashboard.applicationChatPage.details.universityInformation.phone')}</span>
                          </div>
                          <span className="font-medium text-gray-900 break-all sm:break-words sm:ml-auto">{applicationDetails.scholarships.universities.contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scholarship Information Card */}
              <div className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#D0151C]/20 overflow-hidden">
                <div className="bg-gradient-to-br from-[#D0151C] via-red-600 to-red-700 p-6 sm:p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {t('studentDashboard.applicationChatPage.details.scholarshipDetails.title')}
                    </h2>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="space-y-6">
                    <div className="bg-red-50 rounded-2xl p-6 hover:bg-red-100 transition-colors duration-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                          <Award className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="text-sm font-medium text-red-600">{t('studentDashboard.applicationChatPage.details.scholarshipDetails.scholarshipName')}</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">{applicationDetails.scholarships?.title || applicationDetails.scholarships?.name || 'N/A'}</div>
                    </div>
                    
                    {applicationDetails.scholarships?.course && (
                      <div className="bg-red-50 rounded-2xl p-6 hover:bg-red-100 transition-colors duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-red-600" />
                          </div>
                          <span className="text-sm font-medium text-red-600">{t('studentDashboard.applicationChatPage.details.scholarshipDetails.course')}</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">{applicationDetails.scholarships.course}</div>
                      </div>
                    )}
                    
                    {applicationDetails.scholarships?.description && (
                      <div className="bg-red-50 rounded-2xl p-6 hover:bg-red-100 transition-colors duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-red-600" />
                          </div>
                          <span className="text-sm font-medium text-red-600">{t('studentDashboard.applicationChatPage.details.scholarshipDetails.description')}</span>
                        </div>
                        <div className="text-base font-medium text-gray-900 leading-relaxed">{applicationDetails.scholarships.description}</div>
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

          </div>
        )}
        {activeTab === 'i20' && applicationDetails && applicationDetails.is_scholarship_fee_paid && (
          <div className="w-full max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('studentDashboard.applicationChatPage.hardcodedTexts.completeI20Payment')}
              </p>
            </div>

            {!hasPaid ? (
              <div className="space-y-8">
                {/* Information Card */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-br from-[#D0151C] via-red-600 to-red-700 p-6 sm:p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Informações do Pagamento</h2>
                        <p className="text-red-100 text-sm mt-1">Taxa obrigatória para processamento do I-20</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    <div className="prose prose-gray max-w-none">
                      <div className="text-gray-700 leading-relaxed space-y-4">
                        <p>{t('studentDashboard.applicationChatPage.i20ControlFee.description')}</p>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-amber-800 mb-1">{t('studentDashboard.applicationChatPage.i20ControlFee.deadlineInfo')}</p>
                              <p className="text-amber-700 text-sm">{t('studentDashboard.applicationChatPage.i20ControlFee.timerInfo')}</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{t('studentDashboard.applicationChatPage.i20ControlFee.paymentInfo')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Action Card */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                      {/* Payment Button */}
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Realizar Pagamento</h3>
                        <div className="bg-gray-50 rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-600">Valor da Taxa:</span>
                            <span className="text-2xl font-bold text-[#D0151C]">{formatFeeAmount(getFeeAmount('i20_control_fee'))}</span>
                          </div>
                          <button
                            onClick={handlePayI20}
                            disabled={i20Loading}
                            className="w-full bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                          >
                            {i20Loading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {t('studentDashboard.applicationChatPage.i20ControlFee.processing')}
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                {t('studentDashboard.applicationChatPage.i20ControlFee.payButton')}
                              </>
                            )}
                          </button>
                          {dueDate && (
                            <p className="text-xs text-gray-500 mt-3 text-center">
                              {t('studentDashboard.applicationChatPage.i20ControlFee.dueDate')} {new Date(dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Countdown Timer */}
                      {scholarshipFeeDeadline && (
                        <div className="space-y-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-4">Tempo Restante</h3>
                          <div className={`rounded-3xl p-8 text-center shadow-lg border-2 ${
                            i20Countdown === 'Expired' 
                              ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
                              : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
                          }`}>
                            {i20Countdown === 'Expired' ? (
                              <div className="space-y-3">
                                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-red-600 font-bold text-lg">{t('studentDashboard.applicationChatPage.i20ControlFee.deadlineExpired')}</p>
                                  <p className="text-red-500 text-sm mt-1">Entre em contato conosco urgentemente</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-blue-600 font-semibold text-sm mb-2">Prazo para pagamento:</p>
                                  <p className="font-mono text-2xl sm:text-3xl font-bold text-[#05294E] tracking-wider">
                                    {i20Countdown}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {i20Error && (
                      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-red-700 font-medium">{i20Error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Success Card */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 sm:p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">{t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.title')}</h2>
                        <p className="text-green-100 text-sm mt-1">Pagamento processado com sucesso</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    <div className="space-y-6">
                      <p className="text-gray-700 text-base leading-relaxed">
                        {t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.description')}
                      </p>
                      
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                        <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.nextSteps')}
                        </h4>
                        <ul className="space-y-3">
                          {(t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.nextStepsList', { returnObjects: true }) as string[]).map((step, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-green-600 text-sm font-bold">{index + 1}</span>
                              </div>
                              <span className="text-green-700">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Details Card */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-6 sm:p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white">{t('studentDashboard.applicationChatPage.i20ControlFee.paymentInformation')}</h3>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 rounded-2xl p-6 hover:bg-blue-100 transition-colors duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-blue-600">{t('studentDashboard.applicationChatPage.i20ControlFee.amountPaid')}</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">{formatFeeAmount(getFeeAmount('i20_control_fee'))}</div>
                      </div>
                      
                      <div className="bg-blue-50 rounded-2xl p-6 hover:bg-blue-100 transition-colors duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm6-6V7a4 4 0 10-8 0v4h8z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-blue-600">{t('studentDashboard.applicationChatPage.i20ControlFee.paymentDate')}</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">{paymentDate ? new Date(paymentDate).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      
                      <div className="bg-blue-50 rounded-2xl p-6 hover:bg-blue-100 transition-colors duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-blue-600">{t('studentDashboard.applicationChatPage.i20ControlFee.status')}</span>
                        </div>
                        <div className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('studentDashboard.applicationChatPage.i20ControlFee.completed')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
            <div className="p-3 sm:p-6 space-y-6">
              {/* Aviso sobre Acceptance Letter - Mostrar quando I-20 foi pago mas carta ainda não enviada */}
              {applicationDetails.is_scholarship_fee_paid && 
               (userProfile as any)?.has_paid_i20_control_fee && 
               !applicationDetails.acceptance_letter_url && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-yellow-900 mb-2">
                        {t('studentDashboard.applicationChatPage.documents.acceptanceLetter.waitingForUniversityTitle') || 'Acceptance Letter - Waiting for University'}
                      </h3>
                      <p className="text-yellow-800 text-sm mb-3">
                        {t('studentDashboard.applicationChatPage.documents.acceptanceLetter.waitingForUniversityDescription') || 'Your I-20 Control Fee has been paid successfully. The university is now processing your acceptance letter. It will appear here once they send it to you.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Seção de Document Requests */}
              <DocumentRequestsCard 
                applicationId={applicationId!} 
                isSchool={false} 
                currentUserId={user.id} 
                studentType={applicationDetails.student_process_type || 'initial'}
                showAcceptanceLetter={false} // Não mostrar acceptance letter aqui, será controlado separadamente
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
               {/* Seção de Acceptance Letter - Mostrar apenas quando I-20 pago e enviado */}
               {applicationDetails.acceptance_letter_url && 
                 (applicationDetails.acceptance_letter_status === 'approved' || applicationDetails.acceptance_letter_status === 'sent') && 
                 (userProfile as any)?.has_paid_i20_control_fee && (
                 <div className="bg-white rounded-lg mb-3 max-w-3xl mx-auto p-4 sm:p-6 border border-slate-200">
                   {/* Header da seção */}
                   <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                     <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                       <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                       <h3 className="text-lg font-bold text-slate-900">{t('studentDashboard.applicationChatPage.documents.acceptanceLetter.title')}</h3>
                       <p className="text-sm text-slate-600">{t('studentDashboard.applicationChatPage.documents.acceptanceLetter.description')}</p>
                          </div>
                        </div>

                   {/* Status de recebimento */}
                   <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                     <div className="flex items-center gap-2">
                       <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <p className="text-green-800 font-semibold text-sm">
                                  {t('studentDashboard.applicationChatPage.documents.acceptanceLetter.received')}
                                </p>
                     </div>
                     <p className="text-green-700 text-sm mt-1 ml-7">
                                  {t('studentDashboard.applicationChatPage.documents.acceptanceLetter.readyForDownload')}
                                </p>
                              </div>
                   
                   {/* Botões de ação */}
                   <div className="flex flex-col sm:flex-row gap-3">
                                <button
                       className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                  onClick={async () => {
                                    try {
                                      // Função utilitária para extrair caminho relativo
                                      const getRelativePath = (fullUrl: string) => {
                                        const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
                                        if (fullUrl.startsWith(baseUrl)) {
                                          return fullUrl.replace(baseUrl, '');
                                        }
                                        return fullUrl;
                                      };

                                      const filePath = getRelativePath(applicationDetails.acceptance_letter_url);
                                      const { data, error } = await supabase.storage
                                        .from('document-attachments')
                                        .createSignedUrl(filePath, 60 * 60);
                                      
                                      if (error) {
                                        console.error('Erro ao gerar signed URL:', error);
                                        alert('Erro ao baixar documento');
                                        return;
                                      }
                                      
                                      // Fazer download
                                      const response = await fetch(data.signedUrl);
                                      if (!response.ok) throw new Error('Failed to download document');
                                      
                                      const blob = await response.blob();
                                      const url = URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = 'acceptance_letter.pdf';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);
                                    } catch (error) {
                                      console.error('Erro no download:', error);
                                      alert('Erro ao baixar documento');
                                    }
                                  }}
                                >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                                  {t('studentDashboard.applicationChatPage.documents.acceptanceLetter.downloadButton')}
                                </button>
                                <button
                       className="flex-1 bg-white text-blue-600 border border-blue-600 px-4 py-3 rounded-lg font-semibold shadow hover:bg-blue-50 transition flex items-center justify-center gap-2"
                                  onClick={async () => {
                                    try {
                                      const getRelativePath = (fullUrl: string) => {
                                        const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
                                        if (fullUrl.startsWith(baseUrl)) {
                                          return fullUrl.replace(baseUrl, '');
                                        }
                                        return fullUrl;
                                      };

                                      const filePath = getRelativePath(applicationDetails.acceptance_letter_url);
                                      const { data, error } = await supabase.storage
                                        .from('document-attachments')
                                        .createSignedUrl(filePath, 60 * 60);
                                      
                                      if (error) {
                                        console.error('Erro ao gerar signed URL:', error);
                                        alert('Erro ao visualizar documento');
                                        return;
                                      }
                                      
                                      setPreviewUrl(data.signedUrl);
                                    } catch (error) {
                                      console.error('Erro ao visualizar:', error);
                                      alert('Erro ao visualizar documento');
                                    }
                                  }}
                                >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                       </svg>
                                  {t('studentDashboard.applicationChatPage.documents.acceptanceLetter.viewButton')}
                                </button>
                              </div>
                            </div>
               )}
              
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