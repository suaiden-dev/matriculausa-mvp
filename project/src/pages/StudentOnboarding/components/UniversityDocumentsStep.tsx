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
  Clock,
  ArrowRight,
  Lock,
  RefreshCw,
  ShieldCheck,
  LayoutDashboard,

  CheckCircle2,
  ExternalLink,
  Stamp,
  Home,
  FolderOpen,
  GraduationCap,

  Star,

  Eye,
  Download,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { useTranslation } from 'react-i18next';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { useStudentLogs } from '../../../hooks/useStudentLogs';
import DocumentRequestsCard from '../../../components/DocumentRequestsCard';
import DocumentViewerModal from '../../../components/DocumentViewerModal';
import { STRIPE_PRODUCTS } from '../../../stripe-config';
import { ProfileRequiredModal } from '../../../components/ProfileRequiredModal';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';
import { ExpandableTabs } from '../../../components/ui/expandable-tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateCardAmountWithFees, getExchangeRate, calculatePIXTotalWithIOF } from '../../../utils/stripeFeeCalculator';

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

export const UniversityDocumentsStep: React.FC<StepProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { formatFeeAmount, getFeeAmount } = useFeeConfig(user?.id);
  const { logAction } = useStudentLogs(userProfile?.id || '');
  
  const [loading, setLoading] = useState(true);
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'i20' | 'documents' | 'acceptance'>('welcome');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
  const [i20Loading, setI20Loading] = useState(false);
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [profileErrorType, setProfileErrorType] = useState<'cpf_missing' | 'profile_incomplete' | null>(null);
  const [realI20PaidAmount, setRealI20PaidAmount] = useState<number | null>(null);
  const [zelleActive, setZelleActive] = useState(false);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const { isBlocked, pendingPayment, refetch: refetchPaymentStatus } = usePaymentBlocked();

  // Detecta se há um Zelle pendente do tipo i20_control_fee
  const hasZellePendingI20 = isBlocked && pendingPayment?.fee_type === 'i20_control_fee';
  
  const [realI20PaymentDate, setRealI20PaymentDate] = useState<string | null>(null);
  const [scholarshipFeeDeadline, setScholarshipFeeDeadline] = useState<Date | null>(null);
  const [i20Countdown, setI20Countdown] = useState<string | null>(null);
  const [i20CountdownValues, setI20CountdownValues] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [promotionalCoupon, setPromotionalCoupon] = useState('');
  const [hasPromotionalCouponCheckbox, setHasPromotionalCouponCheckbox] = useState(false);
  const [isValidatingPromotionalCoupon, setIsValidatingPromotionalCoupon] = useState(false);
  const [promotionalCouponValidation, setPromotionalCouponValidation] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
    couponId?: string;
  } | null>(null);
  const promotionalCouponInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    getExchangeRate().then(rate => setExchangeRate(rate));
  }, []);
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
            .eq('user_id', userProfile.user_id || userProfile.id) // Fallback para id se user_id não existir
            .eq('fee_type', 'i20_control_fee')
            .order('payment_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (paymentData) {
            setRealI20PaidAmount(paymentData.amount || paymentData.gross_amount_usd);
            setRealI20PaymentDate(paymentData.payment_date);
          }
        }
        
        // Buscar solicitações de documentos para verificar status real de conclusão
        const { data: reqs } = await supabase
          .from('document_requests')
          .select('id, title, status, document_request_uploads(status)')
          .eq('scholarship_application_id', data.id);
        
        if (reqs) {
          setDocumentRequests(reqs);
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


  const validatePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim()) {
      setPromotionalCouponValidation({
        isValid: false,
        message: 'Por favor, insira um código de cupom'
      });
      return;
    }

    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    const normalizedFeeType = 'i20_control_fee';
    const baseAmount = getFeeAmount('i20_control_fee');
    
    setIsValidatingPromotionalCoupon(true);
    setPromotionalCouponValidation(null);

    try {
      const { data: result, error } = await supabase.rpc('validate_and_apply_admin_promotional_coupon', {
        p_code: normalizedCode,
        p_fee_type: normalizedFeeType,
        p_user_id: user?.id
      });

      if (error) {
        console.error('[UniversityDocumentsStep] Erro RPC:', error);
        throw error;
      }

      if (!result || !result.valid) {
        setPromotionalCouponValidation({
          isValid: false,
          message: result?.message || 'Código de cupom inválido'
        });
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (result.discount_type === 'percentage') {
        discountAmount = (baseAmount * result.discount_value) / 100;
      } else {
        discountAmount = result.discount_value;
      }

      const finalAmount = Math.max(0, baseAmount - discountAmount);

      setPromotionalCouponValidation({
        isValid: true,
        message: `Cupom ${normalizedCode} aplicado! Você economizou $${discountAmount.toFixed(2)}`,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        couponId: result.coupon_id
      });

      // Salvar no window
      (window as any).__checkout_promotional_coupon = normalizedCode;
      (window as any).__checkout_final_amount = finalAmount;

    } catch (err: any) {
      console.error('Error validating coupon:', err);
      setPromotionalCouponValidation({
        isValid: false,
        message: 'Erro ao validar cupom. Tente novamente.'
      });
    } finally {
      setIsValidatingPromotionalCoupon(false);
    }
  };

  // Função para remover cupom promocional aplicado
  const removePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim() || !user?.id) return;
    
    console.log('[UniversityDocumentsStep] Removendo cupom promocional...');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Remover do banco de dados
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-promotional-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          coupon_code: promotionalCoupon.trim().toUpperCase(),
          fee_type: 'i20_control_fee'
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        console.warn('[UniversityDocumentsStep] ⚠️ Aviso: Não foi possível remover o cupom do banco:', result.error);
      } else {
        console.log('[UniversityDocumentsStep] ✅ Cupom removido do banco com sucesso!');
      }
    } catch (error) {
      console.warn('[UniversityDocumentsStep] ⚠️ Aviso: Erro ao remover cupom do banco:', error);
    }
    
    // Limpar estados locais
    setPromotionalCoupon('');
    setPromotionalCouponValidation(null);
    
    // Limpar do window
    delete (window as any).__checkout_promotional_coupon;
    delete (window as any).__checkout_final_amount;
  };

  const handlePaymentMethodSelect = async (method: 'stripe' | 'zelle' | 'pix' | 'parcelow', exchangeRateParam?: number) => {
    // Verificar CPF apenas para Parcelow
    if (method === 'parcelow' && !userProfile?.cpf_document) {
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
      
      const successUrl = `${window.location.origin}/student/onboarding?step=my_applications&payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/student/onboarding?step=my_applications&payment=cancelled`;
      
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
        setZelleActive(true);
        setI20Loading(false);
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      alert(err.message || 'Error processing payment');
      setI20Loading(false);
    }
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

  // 1. Verifica os documentos "core" (JSONB)
  const coreDocs = (applicationDetails?.documents || []) as any[];
  
  // 2. Verifica as solicitações dinâmicas
  const hasPendingRequests = documentRequests.some(req => {
    const uploads = req.document_request_uploads || [];
    const hasValidUpload = uploads.some((u: any) => u.status === 'approved' || u.status === 'under_review');
    return !hasValidUpload;
  });

  // O passo é considerado "Concluído" (para o estudante) se:
  // - Todas as solicitações dinâmicas tiverem pelo menos um envio em análise ou aprovado
  // (Ignora-se o status 'rejected' dos docs core aqui pois, se houver rejeição, 
  // haverá uma solicitação pendente no hasPendingRequests para o aluno agir)
  const allDocsDone = !hasPendingRequests;
  const allDocsApproved = !hasPendingRequests && 
                        coreDocs.every(d => d.status === 'approved') && 
                        (documentRequests.length === 0 || documentRequests.every(req => (req.document_request_uploads || []).some((u: any) => u.status === 'approved')));

  const hasPaid = (userProfile as any)?.has_paid_i20_control_fee;

  const isAcceptanceUnlocked = hasPaid && !!applicationDetails.acceptance_letter_url;



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
            Minha <span className="text-blue-400">Aplicação</span>
          </h2>

        </div>

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
                          Falta muito pouco para tudo ficar pronto! Nesta etapa final você pode rever os detalhes da universidade que escolheu, enviar a documentação obrigatória e realizar o pagamento da Taxa de Controle I-20. Assim que tudo estiver certo, sua Carta de Aceite estará liberada aqui mesmo para você baixar.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button 
                            onClick={() => setActiveTab('documents')}
                            className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FolderOpen className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
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
                        <h4 className="text-xs font-black uppercase tracking-widest text-white-400 mb-4">Precisa de Ajuda?</h4>
                        <p className="text-sm text-white-400 mb-6">Nossos mentores estão prontos para ajudar com qualquer dúvida sobre este processo.</p>
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
                     Próximas Etapas
                   </h4>
                   <div className="space-y-4">
                     {[
                       { 
                         title: 'Envio de Documentos', 
                         status: allDocsApproved ? 'Concluído' : (allDocsDone ? 'Em Análise' : 'Ação Necessária'), 
                         variant: allDocsApproved ? 'success' : (allDocsDone ? 'success' : 'warning'),
                         tab: 'documents' 
                       },
                       { 
                         title: 'Taxa de Controle I-20', 
                         status: hasPaid ? 'Pago' : 'Pendente', 
                         variant: hasPaid ? 'success' : 'warning',
                         tab: 'i20' 
                       },
                       { 
                         title: 'Recebimento da Carta de Aceite', 
                         status: applicationDetails.acceptance_letter_url ? 'Disponível' : (hasPaid ? 'Liberação em Andamento' : 'Liberação Pendente'), 
                         variant: applicationDetails.acceptance_letter_url ? 'success' : (hasPaid ? 'warning' : 'error'),
                         tab: 'acceptance' 
                       }
                     ].map((step, i) => {
                       const isClickable = true;
                       const isLetterAvailable = step.tab === 'acceptance' && applicationDetails.acceptance_letter_url;
                       
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
                         highlighted: {
                            container: 'bg-gradient-to-br from-emerald-50/60 to-teal-50/60 backdrop-blur-xl border border-emerald-400/40 shadow-[0_10px_40px_rgba(16,185,129,0.15)] hover:shadow-emerald-500/30 hover:border-emerald-500 transform hover:scale-[1.02] transition-all duration-500 relative overflow-hidden group ring-2 ring-white/50',
                            iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/30',
                            status: 'text-emerald-700 font-black tracking-tight',
                            indicator: 'bg-emerald-600 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                         },
                         default: {
                           container: 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-white',
                           iconBg: 'bg-slate-100 text-slate-400',
                           status: 'text-slate-400',
                           indicator: 'bg-slate-300'
                         }
                       };

                       const styles = isLetterAvailable 
                        ? variantStyles.highlighted 
                        : (variantStyles[step.variant as keyof typeof variantStyles] || variantStyles.default);
                       
                       return (
                         <div 
                           key={i} 
                           onClick={() => isClickable && setActiveTab(step.tab as any)}
                           className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg ${styles.container}`}
                         >
                            {/* Emerald Shine effect */}
                            {isLetterAvailable && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                            )}

                           <div className="flex items-center gap-3 relative z-10">
                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${styles.iconBg} ${isLetterAvailable ? 'group-hover:scale-110' : ''}`}>
                               {isLetterAvailable ? <Award className="w-5 h-5 text-white animate-bounce-slow" /> : <span className="text-xs font-bold">{i + 1}</span>}
                             </div>
                             <div className="flex flex-col">
                               <span className={`text-sm font-bold uppercase tracking-tight ${isLetterAvailable ? 'text-emerald-950' : 'text-gray-900'}`}>{step.title}</span>
                               {isLetterAvailable && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-widest">Documento Disponível</span>
                                  </div>
                               )}
                             </div>
                           </div>
                           <div className="flex items-center gap-2 relative z-10">
                              <div className={`w-2 h-2 rounded-full ${styles.indicator}`} />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${styles.status}`}>{step.status}</span>
                              {isLetterAvailable && <ArrowRight className="w-4 h-4 text-emerald-600 ml-2 group-hover:translate-x-1 transition-transform" />}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>



              {hasPaid && (
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
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center p-2 transform group-hover:scale-105 transition-transform duration-500">
                      {applicationDetails.scholarships?.image_url || applicationDetails.scholarships?.universities?.logo_url ? (
                        <img 
                          src={applicationDetails.scholarships.image_url || applicationDetails.scholarships.universities.logo_url} 
                          alt={applicationDetails.scholarships.universities?.name || ''}
                          className="w-full h-full object-contain p-2"
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
                            { label: 'Nível', val: applicationDetails.scholarships?.level || 'N/A' },
                            { label: 'Modalidade', val: applicationDetails.scholarships?.delivery_mode === 'in_person' ? 'Presencial' : 'Online' },
                            { label: 'Prazo', val: applicationDetails.scholarships?.deadline ? new Date(applicationDetails.scholarships.deadline).toLocaleDateString() : 'N/A' }
                          ].map((item, i) => (
                            <div key={i} className={`bg-white p-4 rounded-[2rem] border border-slate-300 shadow-sm ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.label}</span>
                              </div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.val}</p>
                            </div>
                          ))}
                        </div>

                        <div className="border border-slate-300 rounded-[2rem] p-8 space-y-12 bg-white shadow-sm relative overflow-hidden">
                          <section className="space-y-6">
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight border-b border-slate-200 pb-4">
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
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                              Taxas Internas da Instituição
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {applicationDetails.scholarships.internal_fees.map((fee: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-colors">
                                   <div className="min-w-0 mr-4">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{fee.frequency || fee.details || 'Pagamento Único'}</p>
                                     <p className="text-sm font-black text-gray-900 uppercase truncate" title={fee.category || fee.name}>{fee.category || fee.name}</p>
                                   </div>
                                   <span className="text-xl font-black text-gray-900 whitespace-nowrap">${Number(fee.amount).toFixed(2)}</span>
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
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight border-b border-slate-200 pb-4">
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
                                        status === 'approved' ? 'text-slate-900' :
                                        status === 'under_review' ? 'text-blue-600' :
                                        status === 'changes_requested' ? 'text-amber-600' :
                                        'text-slate-400'
                                      }`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{doc.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {fileUrl && (
                                        <div className="flex items-center gap-1 border-r border-slate-100 pr-3 mr-1">
                                          <button 
                                            onClick={() => handleViewDocument(fileUrl)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Visualizar"
                                          >
                                            <Eye className="w-6 h-6" />
                                          </button>
                                          <button 
                                            onClick={() => handleDownloadDocument(fileUrl, doc.label)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Baixar"
                                          >
                                            <Download className="w-6 h-6" />
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        {status === 'approved' ? (
                                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        ) : status === 'under_review' ? (
                                          <Clock className="w-6 h-6 text-blue-500" />
                                        ) : status === 'changes_requested' ? (
                                          <AlertCircle className="w-6 h-6 text-amber-500" />
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
                        <div className="bg-white rounded-[2rem] p-8 text-slate-900 border border-slate-300 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-16 -mt-16 blur-xl" />
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 pb-2 border-b border-slate-100 flex items-center justify-between">
                             Resumo Financeiro
                           </h4>
                           <div className="space-y-6">
                             <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Custo Anual Original</p>
                                  <p className="text-xl font-black text-slate-900 line-through tracking-tighter">${(applicationDetails.scholarships?.original_annual_value || 0).toLocaleString()}</p>
                                </div>
                             </div>
                             
                             <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Com Bolsa Exclusiva</p>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-emerald-600 tracking-tighter">${(applicationDetails.scholarships?.annual_value_with_scholarship || 0).toLocaleString()}</span>
                                     <span className="text-sm text-emerald-600 font-bold uppercase">/ano</span>
                                  </div>
                                </div>
                                {applicationDetails.scholarships?.original_value_per_credit && (
                                   <div className="text-right">
                                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Por Crédito</p>
                                     <p className="text-xs font-bold text-slate-900">${applicationDetails.scholarships.original_value_per_credit}</p>
                                   </div>
                                )}
                             </div>
                             
                             <div>
                               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Economia Anual Garantida</p>
                               <p className="text-3xl font-black text-emerald-600 tracking-tighter">
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
                        </div>
                      </div>
                    </div>
                  </div>

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
                      </div>

                      <div className="space-y-8">
                         <div className={`border rounded-[2rem] p-8 relative overflow-hidden ${
                           i20Countdown === 'Expired' 
                             ? 'bg-red-50 border-red-200' 
                             : 'bg-amber-50 border-amber-200'
                         }`}>
                           <div className="flex items-start gap-4 relative z-10">
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
                                  <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/50 w-80 mx-auto">
                                    <p className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest mb-2 text-center">Tempo Restante</p>
                                    <div className="flex items-center justify-center gap-4">
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

                       </div>
                     </div>

                    {/* Integrated Payment Options - Expanded to full width */}
                    <div className="space-y-8 pt-6 pb-8 px-8 md:pt-8 md:pb-10 md:px-10 border-2 border-slate-200 rounded-[3rem] bg-slate-50/50 mt-12">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                            Escolha o Método de Pagamento
                          </h4>
                        </div>

                        <div className="bg-white px-8 py-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center min-w-[200px]">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total da Taxa</span>
                           <span className="text-4xl font-black text-grey-900 tracking-tighter leading-none">
                             {formatFeeAmount(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee'))}
                           </span>
                        </div>
                      </div>

                      {/* Promotional Coupon Section */}
                      <div className="space-y-4 max-w-2xl w-full">
                        {!promotionalCouponValidation?.isValid && (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100 max-w-md">
                            <label htmlFor="hasPromotionalCouponCheckbox" className="checkbox-container cursor-pointer flex-shrink-0">
                              <input
                                id="hasPromotionalCouponCheckbox"
                                name="hasPromotionalCouponCheckbox"
                                type="checkbox"
                                checked={hasPromotionalCouponCheckbox}
                                onChange={(e) => {
                                  setHasPromotionalCouponCheckbox(e.target.checked);
                                  if (!e.target.checked) {
                                    setPromotionalCoupon('');
                                    setPromotionalCouponValidation(null);
                                  }
                                }}
                                className="custom-checkbox"
                              />
                              <div className="checkmark" />
                            </label>
                            <label htmlFor="hasPromotionalCouponCheckbox" className="text-sm text-gray-700 font-medium leading-relaxed cursor-pointer select-none">
                              {t('preCheckoutModal.haveReferralCode') || 'Tenho um código de desconto'}
                            </label>
                          </div>
                        )}

                        {(hasPromotionalCouponCheckbox || promotionalCouponValidation?.isValid) && (
                          <div className="space-y-4 pt-4">
                            {!promotionalCouponValidation?.isValid && (
                              <div className="text-center">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                                  Cupom Promocional
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Tem um cupom promocional? Aplique aqui para economizar ainda mais na sua Taxa I-20!
                                </p>
                              </div>
                            )}

                            <div className="space-y-3">
                              {promotionalCouponValidation?.isValid ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-inner relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
                                  
                                  <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Cupom Aplicado</span>
                                        <span className="text-lg font-black text-gray-800 uppercase tracking-tight">{promotionalCoupon}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={removePromotionalCoupon}
                                      className="px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-gray-100 hover:border-red-100"
                                    >
                                      Remover
                                    </button>
                                  </div>

                                  <div className="space-y-3 pt-4 border-t border-gray-100 relative z-10">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                      <span>Preço Original:</span>
                                      <span className="line-through text-gray-300">
                                        ${getFeeAmount('i20_control_fee').toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                      <span>Desconto:</span>
                                      <span className="text-emerald-500">
                                        -${promotionalCouponValidation.discountAmount?.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xl font-black uppercase tracking-tight pt-3 text-gray-900">
                                      <span>Total Final:</span>
                                      <span className="text-emerald-500">
                                        ${promotionalCouponValidation.finalAmount?.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1 group/input">
                                      <input
                                        id="promotionalCouponInput"
                                        name="promotionalCouponInput"
                                        ref={promotionalCouponInputRef}
                                        type="text"
                                        value={promotionalCoupon}
                                        onChange={(e) => {
                                          const newValue = e.target.value.toUpperCase();
                                          const cursorPosition = e.target.selectionStart;
                                          setPromotionalCoupon(newValue);
                                          requestAnimationFrame(() => {
                                            if (promotionalCouponInputRef.current) {
                                              promotionalCouponInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                                              promotionalCouponInputRef.current.focus();
                                            }
                                          });
                                        }}
                                        placeholder={t('preCheckoutModal.placeholder') || "Digite o código"}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-center font-black text-gray-900 text-lg tracking-[0.2em] placeholder:text-gray-300"
                                        maxLength={20}
                                        autoComplete="off"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500" />
                                    </div>
                                    <button
                                      onClick={validatePromotionalCoupon}
                                      disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()}
                                      className={`px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 whitespace-nowrap sm:w-auto w-full ${
                                        isValidatingPromotionalCoupon || !promotionalCoupon.trim()
                                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                          : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                                      }`}
                                    >
                                      {isValidatingPromotionalCoupon ? (
                                        <div className="flex items-center justify-center space-x-2">
                                          <Loader2 className="w-5 h-5 animate-spin" />
                                          <span>Validando...</span>
                                        </div>
                                      ) : (
                                        'Validar'
                                      )}
                                    </button>
                                  </div>
                                  
                                  {promotionalCouponValidation && !promotionalCouponValidation.isValid && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 backdrop-blur-md">
                                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                      <span className="text-sm text-red-400 font-medium">{promotionalCouponValidation.message}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        {hasZellePendingI20 ? (
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
                                feeType="i20_control_fee"
                                amount={promotionalCouponValidation?.finalAmount ?? getFeeAmount('i20_control_fee')}
                                scholarshipsIds={applicationDetails?.scholarships?.id ? [applicationDetails.scholarships.id] : []}
                                metadata={{
                                  application_id: applicationDetails?.id,
                                  selected_scholarship_id: applicationDetails?.scholarships?.id
                                }}
                                onSuccess={() => {
                                  setZelleActive(false);
                                  fetchApplicationDetails(true);
                                  refetchPaymentStatus();
                                }}
                                onProcessingChange={(isProcessing) => {
                                  if (isProcessing) refetchPaymentStatus();
                                }}
                                className="w-full"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Stripe Option */}
                            <button
                              onClick={() => handlePaymentMethodSelect('stripe')}
                              disabled={i20Loading}
                              className="group/btn relative bg-white border border-gray-200 p-6 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 flex items-center"
                            >
                              <div className="w-14 h-14 flex items-center justify-center bg-blue-50 transition-colors rounded-2xl mr-5">
                                <StripeIcon className="w-9 h-9" />
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                 <div className="flex items-baseline justify-between leading-none">
                                    <span className="font-bold text-gray-900 text-lg">Cartão de Crédito</span>
                                    <span className="text-slate-900 text-xl font-black px-3 uppercase tracking-tight">
                                      {formatFeeAmount(calculateCardAmountWithFees(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee')))}
                                    </span>
                                 </div>
                                 <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5 leading-none">* Podem incluir taxas de processamento</p>
                              </div>
                              {selectedPaymentMethod === 'stripe' && i20Loading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* PIX Option */}
                            <button
                              onClick={() => handlePaymentMethodSelect('pix', exchangeRate)}
                              disabled={i20Loading}
                              className="group/btn relative bg-white border border-gray-200 p-6 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 flex items-center"
                            >
                              <div className="w-14 h-14 flex items-center justify-center bg-emerald-50 transition-colors rounded-2xl mr-5">
                                <PixIcon className="w-9 h-9" />
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                 <div className="flex items-baseline justify-between leading-none">
                                    <span className="font-bold text-gray-900 text-lg">PIX</span>
                                    <span className="text-slate-900 text-xl font-black px-3 uppercase tracking-tight">
                                      R$ {calculatePIXTotalWithIOF(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee'), exchangeRate).totalWithIOF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                 </div>
                                 <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5 leading-none">* Podem incluir taxas de processamento</p>
                              </div>
                              {selectedPaymentMethod === 'pix' && i20Loading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* Parcelow Option */}
                            <button
                              onClick={() => handlePaymentMethodSelect('parcelow')}
                              disabled={i20Loading}
                              className="group/btn relative bg-white border border-gray-200 p-6 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 flex items-center"
                            >
                              <div className="w-14 h-14 flex items-center justify-center bg-orange-50 transition-colors rounded-2xl mr-5 px-1">
                                <ParcelowIcon className="w-full h-10" />
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                 <div className="flex items-baseline justify-between leading-none">
                                    <span className="font-bold text-gray-900 text-lg">Parcelow</span>
                                    <div className="text-right flex flex-col items-end leading-none">
                                      <span className="text-slate-900 text-xl font-black px-3 uppercase tracking-tight">
                                        {formatFeeAmount(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee'))}
                                      </span>
                                      <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest">até 12x</div>
                                    </div>
                                 </div>
                                 <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold -mt-1.5 leading-none">* Podem incluir taxas da operadora e processamento da plataforma</p>
                              </div>
                              {selectedPaymentMethod === 'parcelow' && i20Loading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* Zelle Option — accordion inline */}
                            <div className="flex flex-col">
                              <button
                                onClick={() => setZelleActive(!zelleActive)}
                                disabled={i20Loading}
                                className={`group/btn relative bg-white border p-6 text-left hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 flex items-center ${
                                  zelleActive
                                    ? 'rounded-t-[2rem] border-purple-200 border-b-0 bg-purple-50/30'
                                    : 'rounded-[2rem] border-gray-200'
                                }`}
                              >
                                <div className="w-14 h-14 flex items-center justify-center bg-purple-50 transition-colors rounded-2xl mr-5">
                                  <ZelleIcon className="w-9 h-9" />
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                   <div className="flex items-baseline justify-between leading-none">
                                      <span className="font-bold text-gray-900 text-lg">Zelle</span>
                                      <div className="text-right flex flex-col items-end leading-none">
                                        <div className="text-slate-900 text-xl font-black px-3 uppercase tracking-tight">
                                          {formatFeeAmount(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee'))}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-900 block uppercase tracking-widest text-right">Sem Taxas</span>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-2 text-gray-400 -mt-1.5">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-bold uppercase tracking-wide leading-none">Processamento pode levar até 48 horas</span>
                                   </div>
                                </div>
                              </button>

                              {zelleActive && (
                                <div className="border border-purple-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                                  <ZelleCheckout
                                    feeType="i20_control_fee"
                                    amount={promotionalCouponValidation?.finalAmount ?? getFeeAmount('i20_control_fee')}
                                    scholarshipsIds={applicationDetails?.scholarships?.id ? [applicationDetails.scholarships.id] : []}
                                    metadata={{
                                      application_id: applicationDetails?.id,
                                      selected_scholarship_id: applicationDetails?.scholarships?.id
                                    }}
                                    onSuccess={() => {
                                      setZelleActive(false);
                                      fetchApplicationDetails(true);
                                      refetchPaymentStatus();
                                    }}
                                    onProcessingChange={(isProcessing) => {
                                      if (isProcessing) refetchPaymentStatus();
                                    }}
                                    className="w-full"
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

                    <div className="p-8 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl transition-all flex flex-col items-center text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Valor Pago</p>
                          <div className="flex items-center">
                             <p className="text-4xl font-black text-slate-900 tracking-tighter">
                               {realI20PaidAmount ? formatFeeAmount(realI20PaidAmount) : formatFeeAmount(getFeeAmount('i20_control_fee'))}
                             </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl transition-all flex flex-col items-center text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Data da Transação</p>
                          <div className="flex items-center">
                             <p className="text-4xl font-black text-slate-900 tracking-tighter">
                               {realI20PaymentDate ? new Date(realI20PaymentDate).toLocaleDateString() : new Date().toLocaleDateString()}
                             </p>
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
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Envio de <span className="text-blue-600">Documentos</span></h3>
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
                <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-slate-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                  
                  {/* Header Card matching I-20 Tab */}
                  <div className="bg-slate-50 px-8 py-10 md:p-12 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-500/20 transition-transform">
                          <Award className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-center md:text-left">
                          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">Carta de <span className="text-blue-600">Aceite</span></h2>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="p-8 md:p-16 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                          Sua Confirmação de Sucesso
                        </h4>
                        <p className="text-gray-600 leading-relaxed font-medium">
                          A Carta de Aceite é o documento oficial emitido pela universidade que confirma sua admissão. Ela contém detalhes importantes sobre seu curso e é fundamental para o processo de visto.
                        </p>
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex items-start gap-4">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <ShieldCheck className="w-5 h-5 text-slate-400" />
                           </div>
                           <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                             {!hasPaid 
                               ? "Este documento será liberado automaticamente após a aprovação da Taxa de Controle I-20."
                               : "Sua taxa foi aprovada. Aguardando a emissão da carta pela universidade."}
                           </p>
                        </div>
                      </div>

                      <div className="space-y-8">
                         {/* Status indicator block — sem texto, apenas ícones */}
                         {!hasPaid ? (
                           /* Estado: não pagou — cadeado vermelho */
                           <button
                             onClick={() => setActiveTab('i20')}
                             className="w-full group flex flex-col items-center justify-center gap-4 bg-red-50 border-2 border-red-200 rounded-[2rem] p-8 hover:bg-red-100 hover:border-red-300 transition-all active:scale-95 shadow-sm hover:shadow-md"
                           >
                             <div className="w-16 h-16 bg-red-100 border-2 border-red-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                               <Lock className="w-8 h-8 text-red-500" />
                             </div>
                             <div className="flex items-center gap-2">
                               <ArrowRight className="w-3.5 h-3.5 text-red-400" />
                               <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Pagar Taxa I-20</span>
                             </div>
                           </button>
                         ) : (
                           /* Estado: pagou, aguardando carta — refresh amarelo animado */
                           <div className="flex flex-col items-center justify-center gap-4 bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-8 shadow-sm">
                             <div className="w-16 h-16 bg-amber-100 border-2 border-amber-200 rounded-2xl flex items-center justify-center shadow-inner">
                               <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                             </div>
                             <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Liberação em Andamento</span>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Success Header matching I-20 Success */}
                  <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-12 text-center relative overflow-hidden">
                       <div className="absolute inset-0 opacity-10 pointer-events-none">
                         <Award className="w-64 h-64 -left-16 -top-16 absolute -rotate-12" />
                         <CheckCircle className="w-64 h-64 -right-16 -bottom-16 absolute rotate-12" />
                       </div>
                       <div className="relative z-10 space-y-6">
                         <div className="w-24 h-24 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto backdrop-blur-md shadow-inner border border-white/30 animate-bounce-slow">
                           <Award className="w-12 h-12 text-white" />
                         </div>
                         <div className="space-y-2">
                           <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Carta de Aceite <span className="text-emerald-200">Disponível</span></h2>
                         </div>
                       </div>
                    </div>

                    <div className="p-8 md:p-16">
                      {/* Integrated Alerts when Paid but No URL */}
                      {!applicationDetails.acceptance_letter_url ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-[2rem] p-8 flex flex-col md:flex-row items-start gap-6">
                          <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center flex-shrink-0 border border-yellow-200">
                            <Clock className="w-7 h-7 text-yellow-600 animate-pulse" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-yellow-900 mb-2">Aguardando Envio da Universidade</h3>
                            <p className="text-yellow-800 font-medium leading-relaxed">
                              Sua Taxa I-20 foi paga com sucesso! A universidade está processando sua carta oficial e ela aparecerá aqui automaticamente em breve.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                          <div className="md:col-span-7 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              <Info className="w-3 h-3" />
                              Instruções de Download
                            </div>
                            <p className="text-gray-600 leading-relaxed font-medium">
                              Sua carta de aceite já pode ser baixada em formato PDF. Recomendamos que você guarde uma cópia digital e física deste documento.
                            </p>
                          </div>
                          
                          <div className="md:col-span-5 flex flex-col gap-4">
                            <button 
                              onClick={() => handleDownloadDocument(applicationDetails.acceptance_letter_url, 'acceptance_letter', 'document-attachments')}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 group"
                            >
                              <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              Baixar PDF Original
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>


      {/* Legacy/Modals support */}





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
          50% { transform: translateY(-4px); }
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

