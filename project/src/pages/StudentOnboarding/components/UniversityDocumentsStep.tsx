import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, Award, Info, Home, FolderOpen, GraduationCap, Download, 
  ShieldCheck, ArrowRight, LayoutDashboard, MapPin, 
  Star, Eye, CheckCircle2, Clock, Mail, Phone, Globe, ExternalLink,
  CreditCard, Check, X, RefreshCw, Loader2, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { useTranslation, Trans } from 'react-i18next';
import { useStudentLogs } from '../../../hooks/useStudentLogs';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { ExpandableTabs } from '../../../components/ui/expandable-tabs';
import DocumentRequestsCard from '../../../components/DocumentRequestsCard';
import DocumentViewerModal from '../../../components/DocumentViewerModal';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { STRIPE_PRODUCTS } from '../../../stripe-config';
import { ProfileRequiredModal } from '../../../components/ProfileRequiredModal';
import { getExchangeRate, calculateCardAmountWithFees, calculatePIXTotalWithIOF } from '../../../utils/stripeFeeCalculator';
import { PackageFeeTab } from './PackageFeeTab';

// Ícones de Pagamento
const PixIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z" />
        <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z" />
        <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z" />
    </svg>
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

export const UniversityDocumentsStep: React.FC<StepProps> = ({ onBack }) => {
  const { t } = useTranslation(['registration', 'common', 'scholarships']);
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { logAction } = useStudentLogs(userProfile?.id || '');
  const { formatFeeAmount, getFeeAmount } = useFeeConfig();
  
  const [loading, setLoading] = useState(true);
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'welcome' | 'details' | 'documents' | 'i20' | 'ds160' | 'i539' | 'acceptance'>('welcome');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  // Estado dinâmico das taxas de pacote (busca em individual_fee_payments, não depende do userProfile)
  const [ds160PackagePaid, setDs160PackagePaid] = useState<boolean>(false);
  const [i539PackagePaid, setI539PackagePaid] = useState<boolean>(false);
  
  // Pagamento I-20
  const [i20Loading, setI20Loading] = useState(false);
  const [i20Error, setI20Error] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [profileErrorType, setProfileErrorType] = useState<'cpf_missing' | 'profile_incomplete' | null>(null);
  const [inlineCpf, setInlineCpf] = useState('');
  const [savingCpf, setSavingCpf] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [showInlineCpf, setShowInlineCpf] = useState(false);

  useEffect(() => {
    getExchangeRate().then(rate => setExchangeRate(rate));
  }, []);
  useEffect(() => {
    fetchApplicationDetails();
  }, [userProfile?.id]);

  const fetchApplicationDetails = async (isRefresh = false) => {
    if (!userProfile?.id) {
      if (!isRefresh) setLoading(false);
      return;
    }
    
    try {
      if (!isRefresh) setLoading(true);
      
      const selectedId = userProfile.selected_application_id;
      
      let query = supabase
        .from('scholarship_applications')
        .select(`*, user_profiles!student_id(*), scholarships(*, internal_fees, universities(*))`)
        .eq('student_id', userProfile.id);

      if (selectedId) {
        // 1. Prioridade para a aplicação explicitamente selecionada no banco
        query = query.eq('id', selectedId);
      } else {
        // 2. Fallback: procurar por qualquer aplicação que já tenha a taxa paga (garantia de consistência)
        // 3. Fallback final para a mais recente
        query = query.order('is_application_fee_paid', { ascending: false })
                     .order('created_at', { ascending: false })
                     .limit(1);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setApplicationDetails(data);

        // Buscar solicitações de documentos para verificar status real de conclusão
        const { data: reqs } = await supabase
          .from('document_requests')
          .select('id, title, status, document_request_uploads(status)')
          .eq('scholarship_application_id', data.id);
        
        if (reqs) {
          setDocumentRequests(reqs);
        }

        // Verificar pagamento das taxas de pacote diretamente no banco
        // (não depende do userProfile.has_paid_* que só atualiza após relogin)
        if (userProfile?.user_id) {
          const { data: packagePayments } = await supabase
            .from('individual_fee_payments')
            .select('fee_type, parcelow_status, payment_method')
            .eq('user_id', userProfile.user_id)
            .in('fee_type', ['ds160_package', 'i539_cos_package'])
            .limit(10);

          if (packagePayments) {
            const ds160Paid = packagePayments.some(
              (p: any) => p.fee_type === 'ds160_package' &&
                (p.parcelow_status === 'paid' || p.payment_method === 'stripe' || p.payment_method === 'zelle')
            );
            const i539Paid = packagePayments.some(
              (p: any) => p.fee_type === 'i539_cos_package' &&
                (p.parcelow_status === 'paid' || p.payment_method === 'stripe' || p.payment_method === 'zelle')
            );
            setDs160PackagePaid(ds160Paid || !!(userProfile as any)?.has_paid_ds160_package);
            setI539PackagePaid(i539Paid || !!(userProfile as any)?.has_paid_i539_cos_package);
          } else {
            // Fallback para o campo do perfil
            setDs160PackagePaid(!!(userProfile as any)?.has_paid_ds160_package);
            setI539PackagePaid(!!(userProfile as any)?.has_paid_i539_cos_package);
          }
        }
      }

    } catch (err: any) {
      console.error('Error fetching university documents details:', err);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };



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





  // I-20 Payment handlers
  const handlePaymentMethodSelect = (method: 'stripe' | 'zelle' | 'pix' | 'parcelow', exchangeRateParam?: number) => {
    setSelectedPaymentMethod(method);
    if (method === 'pix' && exchangeRateParam) {
      setExchangeRate(exchangeRateParam);
    } else {
      setExchangeRate(null);
    }
  };

  const handleProceedPayment = useCallback(async () => {
    if (!selectedPaymentMethod || !applicationDetails) return;

    setI20Loading(true);
    setI20Error(null);

    try {
      if (selectedPaymentMethod === 'stripe') {
        console.log('[Stripe] Iniciando checkout I-20...');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        console.log('[Stripe] Token presente:', !!token);
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout-i20-control-fee`;
        console.log('[Stripe] URL API:', apiUrl);

        const baseAmount = getFeeAmount('i20_control_fee');
        const promotionalCoupon = (window as any).__checkout_promotional_coupon || null;
        const finalAmountWithDiscount = (window as any).__checkout_final_amount || baseAmount;
        console.log('[Stripe] Valor final:', finalAmountWithDiscount);

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            success_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=cancelled`,
            price_id: STRIPE_PRODUCTS.controlFee.priceId,
            amount: finalAmountWithDiscount,
            payment_method: 'stripe',
            promotional_coupon: promotionalCoupon,
          }),
        });

        console.log('[Stripe] Status resposta:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[Stripe] Erro na API:', errorText);
          setI20Error(`Erro API (${res.status}): ${errorText}`);
          setI20Loading(false);
          return;
        }

        const data = await res.json();
        console.log('[Stripe] Dados recebidos:', data);

        if (data.session_url) {
          console.log('[Stripe] Redirecionando para:', data.session_url);
          window.location.href = data.session_url;
        } else {
          console.error('[Stripe] session_url ausente');
          setI20Error('Erro ao criar sessão de pagamento.');
          setI20Loading(false);
        }
      } else if (selectedPaymentMethod === 'pix') {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
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
            success_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/student/onboarding?step=my_applications&payment=cancelled`,
            price_id: STRIPE_PRODUCTS.controlFee.priceId,
            amount: finalAmountWithDiscount,
            payment_method: 'pix',
            promotional_coupon: promotionalCoupon,
            metadata,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          setI20Error(`Erro API PIX (${res.status}): ${errorText}`);
          setI20Loading(false);
          return;
        }

        const data = await res.json();
        if (data.session_url) {
          window.location.href = data.session_url;
        } else {
          setI20Error('Erro ao criar sessão de pagamento PIX.');
          setI20Loading(false);
        }
      } else if (selectedPaymentMethod === 'zelle') {
        setShowZelleCheckout(true);
        setI20Loading(false);
      } else if (selectedPaymentMethod === 'parcelow') {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiUrl = `${supabaseUrl}/functions/v1/parcelow-checkout-i20-control-fee`;

        const finalAmount = (window as any).__checkout_final_amount || getFeeAmount('i20_control_fee');
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
              application_id: applicationDetails?.id,
              final_amount: finalAmount,
              promotional_coupon: promotionalCoupon,
            },
            promotional_coupon: promotionalCoupon,
            scholarships_ids: applicationDetails?.scholarships?.id ? [applicationDetails.scholarships.id] : [],
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
      console.error('[UniversityDocumentsStep] Payment error:', err);
      setI20Error('Erro ao processar pagamento. Tente novamente.');
      setI20Loading(false);
      setSelectedPaymentMethod(null);
    }
  }, [selectedPaymentMethod, applicationDetails, getFeeAmount, exchangeRate]);

  // Internal Fees including fixed fees (I539 and DS160)
  const internalFees = useMemo(() => {
    const base = Array.isArray(applicationDetails?.scholarships?.internal_fees)
      ? applicationDetails.scholarships.internal_fees
      : [];
    
    const fixedFees = [
      { 
        name: t('scholarshipsPage.modal.i539COSPackage', { ns: 'scholarships' }), 
        amount: 1800, 
        details: t('scholarshipsPage.modal.i539PackageDescription', { ns: 'scholarships' }) 
      },
      { 
        name: t('scholarshipsPage.modal.ds160Package', { ns: 'scholarships' }), 
        amount: 1800, 
        details: t('scholarshipsPage.modal.ds160PackageDescription', { ns: 'scholarships' }) 
      }
    ];
    
    return [...fixedFees, ...base];
  }, [applicationDetails?.scholarships?.internal_fees, t]);

  const saveCpfAndCheckout = async () => {
    const cleaned = inlineCpf.replace(/\D/g, '');
    if (cleaned.length !== 11) {
      setCpfError('CPF deve ter 11 dígitos');
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
      handlePaymentMethodSelect('parcelow');
      handleProceedPayment();
    } catch (err: any) {
      console.error('[UniversityDocumentsStep] Error saving CPF:', err);
      setCpfError('Erro ao salvar CPF. Tente novamente.');
    } finally {
      setSavingCpf(false);
    }
  };

  const handleParcelowClick = () => {
    if (!(userProfile as any)?.cpf_document) {
      setShowInlineCpf(true);
      return;
    }
    handlePaymentMethodSelect('parcelow');
    handleProceedPayment();
  };

  // Remover useEffect do modal

  const isScholarshipFeePaid = !!applicationDetails?.is_scholarship_fee_paid;
  const isPlacementFeePaid = !!applicationDetails?.is_placement_fee_paid;
  const isPlacementFlow = !!(userProfile as any)?.placement_fee_flow;
  const showI20Tab = !isPlacementFlow && (isScholarshipFeePaid || isPlacementFeePaid);

  // Novas taxas de pacote (apenas para usuários do novo fluxo/placement_fee)
  const studentProcessType = applicationDetails?.student_process_type as string | undefined;
  // DS160 para 'initial', I539 para 'change_of_status'
  // Usa estado dinâmico buscado do banco, com fallback para userProfile
  const hasDs160Package = ds160PackagePaid;
  const hasI539Package = i539PackagePaid;
  // DS160 para 'initial', I539 para 'change_of_status'
  const showDs160Tab = isPlacementFlow && studentProcessType === 'initial';
  const showI539Tab = isPlacementFlow && studentProcessType === 'change_of_status';
  // Bloquear acceptance letter se há taxa de pacote obrigatória não paga
  const packageFeeRequired = (showDs160Tab && !hasDs160Package) || (showI539Tab && !hasI539Package);

  // Estado de pagamento das novas taxas (reutiliza mesma lógica do I-20)
  const [packageFeeLoading, setPackageFeeLoading] = useState(false);
  const [packageFeeError, setPackageFeeError] = useState<string | null>(null);
  const [selectedPackagePaymentMethod, setSelectedPackagePaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
  const [showZellePackageFee, setShowZellePackageFee] = useState(false);
  const [showInlineCpfPackage, setShowInlineCpfPackage] = useState(false);
  const [inlineCpfPackage, setInlineCpfPackage] = useState('');
  const [savingCpfPackage, setSavingCpfPackage] = useState(false);
  const [cpfErrorPackage, setCpfErrorPackage] = useState<string | null>(null);

  // Redirecionamento de segurança caso a aba I-20 esteja desativada para o usuário
  useEffect(() => {
    if (activeTab === 'i20' && !showI20Tab && !loading) {
      console.log('[UniversityDocumentsStep] 🛡️ Redirecionando: I-20 desativada para este usuário');
      setActiveTab('welcome');
    }
  }, [activeTab, showI20Tab, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-slate-800" />
          </div>
        </div>
        <p className="text-slate-600 font-medium mt-4">{t('studentDashboard.myApplicationStep.loading')}</p>
      </div>
    );
  }


  if (!applicationDetails) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{t('studentDashboard.myApplicationStep.noApplication.title')}</h3>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          {t('studentDashboard.myApplicationStep.noApplication.description')}
        </p>
        <button onClick={onBack} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">
          {t('studentDashboard.myApplicationStep.back')}
        </button>
      </div>
    );
  }


  const TABS = [
    { title: t('studentDashboard.applicationChatPage.tabs.welcome'), icon: Home },
    { title: t('studentDashboard.applicationChatPage.tabs.details'), icon: Info },
    { title: t('studentDashboard.applicationChatPage.tabs.documents'), icon: FolderOpen },
    ...(showI20Tab ? [{ title: t('studentDashboard.applicationChatPage.tabs.i20ControlFee'), icon: CreditCard }] : []),
    ...(showDs160Tab ? [{ title: t('scholarshipsPage.modal.ds160Package', { ns: 'scholarships' }), icon: CreditCard }] : []),
    ...(showI539Tab ? [{ title: t('scholarshipsPage.modal.i539COSPackage', { ns: 'scholarships' }), icon: CreditCard }] : []),
    { title: t('studentDashboard.myApplicationStep.tabs.acceptanceLetter'), icon: Award }
  ];

  const tabIds: ('welcome' | 'details' | 'documents' | 'i20' | 'ds160' | 'i539' | 'acceptance')[] = [
    'welcome', 
    'details', 
    'documents', 
    ...(showI20Tab ? ['i20' as const] : []),
    ...(showDs160Tab ? ['ds160' as const] : []),
    ...(showI539Tab ? ['i539' as const] : []),
    'acceptance'
  ];
  const activeTabIndex = tabIds.indexOf(activeTab as any);

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





  return (
    <div className="space-y-8 pb-24">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-6 md:mt-0">
        <div className="space-y-3">
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            {t('studentDashboard.myApplicationStep.header.my')} <span className="text-blue-600">{t('studentDashboard.myApplicationStep.header.application')}</span>
          </h2>

        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center">
        <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
          <ExpandableTabs 
            tabs={TABS as any} 
            defaultSelected={activeTabIndex >= 0 ? activeTabIndex : 0}
            onChange={(index: number | null) => {
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
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden ">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                  
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="hidden md:flex w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/20">
                          <LayoutDashboard className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                            <Trans 
                              i18nKey="studentDashboard.myApplicationStep.welcome.congratsMessage"
                              values={{ 
                                name: userProfile?.full_name || 'Estudante',
                                university: applicationDetails?.scholarships?.universities?.name || 'Universidade'
                              }}
                              components={{
                                br: <br />,
                                approved: <span className="text-emerald-600" />,
                                university: <span className="text-blue-600" />
                              }}
                            />
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-14">
                        <p className="text-gray-600 leading-relaxed text-lg">
                          {t('studentDashboard.myApplicationStep.welcome.almostDone')}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button 
                            onClick={() => setActiveTab('documents')}
                            className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-300 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FolderOpen className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{t('studentDashboard.myApplicationStep.welcome.sendDocuments')}</p>
                              <p className="text-xs text-gray-500 font-medium">{t('studentDashboard.myApplicationStep.welcome.requestedDocs')}</p>
                            </div>
                          </button>

                          <button 
                            onClick={() => setActiveTab('details')}
                            className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-300 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Info className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{t('studentDashboard.myApplicationStep.welcome.scholarshipDetails')}</p>
                              <p className="text-xs text-gray-500 font-medium">{t('studentDashboard.myApplicationStep.welcome.requirementsValues')}</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-center">
                      <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] p-8 py-12 text-white flex flex-col justify-center">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white-400 mb-4">{t('studentDashboard.myApplicationStep.welcome.needHelp')}</h4>
                        <p className="text-sm text-white-400 mb-6">{t('studentDashboard.myApplicationStep.welcome.mentorsReady')}</p>
                        <button 
                          onClick={() => navigate('/student/dashboard/chat')}
                          className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          {t('studentDashboard.myApplicationStep.welcome.talkToSupport')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline simplified */}
                <div className="bg-white rounded-[2.5rem] p-8  shadow-2xl shadow-blue-900/5">
                   <h4 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                     {t('studentDashboard.myApplicationStep.welcome.nextSteps')}
                   </h4>
                   <div className="space-y-4">
                     {[
                       { 
                         title: t('studentDashboard.myApplicationStep.welcome.documentSubmission'), 
                         status: allDocsApproved ? t('studentDashboard.myApplicationStep.welcome.status.completed') : (allDocsDone ? t('studentDashboard.myApplicationStep.welcome.status.underReview') : t('studentDashboard.myApplicationStep.welcome.status.actionRequired')), 
                         variant: allDocsApproved ? 'success' : (allDocsDone ? 'success' : 'warning'),
                         tab: 'documents' 
                       },
                       // Etapas condicionais de taxas de pacote
                       ...(showDs160Tab ? [{
                         title: 'DS160 Package - INITIAL',
                         status: hasDs160Package ? t('studentDashboard.myApplicationStep.welcome.status.completed') : t('studentDashboard.myApplicationStep.welcome.status.actionRequired'),
                         variant: hasDs160Package ? 'success' : 'warning',
                         tab: 'ds160'
                       }] : []),
                       ...(showI539Tab ? [{
                         title: 'I539 COS Package - COS',
                         status: hasI539Package ? t('studentDashboard.myApplicationStep.welcome.status.completed') : t('studentDashboard.myApplicationStep.welcome.status.actionRequired'),
                         variant: hasI539Package ? 'success' : 'warning',
                         tab: 'i539'
                       }] : []),
                       { 
                         title: t('studentDashboard.myApplicationStep.welcome.acceptanceLetterReceipt'), 
                         status: applicationDetails.acceptance_letter_url ? t('studentDashboard.myApplicationStep.welcome.documentAvailable') : (packageFeeRequired ? t('studentDashboard.myApplicationStep.welcome.status.blocked') : t('studentDashboard.myApplicationStep.welcome.status.inProgress')), 
                         variant: applicationDetails.acceptance_letter_url ? 'success' : (packageFeeRequired ? 'error' : 'warning'),
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
                            indicator: 'bg-emerald-600'
                         },
                         default: {
                           container: 'bg-slate-50 border-slate-300 hover:border-blue-300 hover:bg-white',
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
                           className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg gap-3 ${styles.container}`}
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
                             </div>
                           </div>
                           <div className="flex items-center gap-2 relative z-10 sm:ml-0 ml-[52px]">
                               <div className="relative flex items-center justify-center">
                                 {isLetterAvailable && <div className="absolute w-3 h-3 bg-emerald-400 rounded-full animate-ping" />}
                                 <div className={`w-2 h-2 rounded-full relative z-10 ${styles.indicator}`} />
                               </div>
                               <span className={`text-[10px] font-black uppercase tracking-widest ${styles.status}`}>{step.status}</span>
                              {isLetterAvailable && <ArrowRight className="w-4 h-4 text-emerald-600 ml-2 group-hover:translate-x-1 transition-transform" />}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>




          </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-8 pb-12">
              {/* University Hero Card */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden group border border-slate-300">
                <div className="bg-gradient-to-r from-[#05294E] to-[#08427e] p-8 md:p-12 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center p-2 transform group-hover:scale-105 transition-transform duration-500">
                      {applicationDetails.scholarships?.image_url || applicationDetails.scholarships?.universities?.logo_url ? (
                        <img 
                          src={applicationDetails.scholarships.image_url || applicationDetails.scholarships.universities.logo_url} 
                          alt={applicationDetails.scholarships.universities?.name || ''}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">{t('studentDashboard.myApplicationStep.details.universityPartner')}</span>
                        {applicationDetails.scholarships?.delivery_mode && (
                           <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/30">
                             {applicationDetails.scholarships.delivery_mode === 'in_person' ? t('studentDashboard.myApplicationStep.details.inPerson') : t('studentDashboard.myApplicationStep.details.online')}
                           </span>
                        )}
                        {applicationDetails.scholarships?.is_exclusive && (
                          <span className="px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-amber-400 uppercase tracking-widest border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3" /> {t('studentDashboard.myApplicationStep.details.exclusive')}
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

                <div className="p-4 sm:p-8 md:p-12">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                     {/* Left: Program Info */}
                     <div className="lg:col-span-2 space-y-12">
                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: t('studentDashboard.myApplicationStep.details.level'), val: applicationDetails.scholarships?.level || 'N/A' },
                            { label: t('studentDashboard.myApplicationStep.details.mode'), val: applicationDetails.scholarships?.delivery_mode === 'in_person' ? t('studentDashboard.myApplicationStep.details.inPerson') : t('studentDashboard.myApplicationStep.details.online') },
                            { label: t('studentDashboard.myApplicationStep.details.deadline'), val: applicationDetails.scholarships?.deadline ? new Date(applicationDetails.scholarships.deadline).toLocaleDateString() : 'N/A' }
                          ].map((item, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-300">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.label}</span>
                              </div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.val}</p>
                            </div>
                          ))}
                        </div>
 
                        {/* Financial Summary - Mobile Only (Ordered after Deadline) */}
                        <div className="block lg:hidden space-y-12">
                           {/* Application Meta Info - Mobile Only */}
                           <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-300 space-y-5">
                              <div className="flex flex-col border-b border-slate-100 pb-3">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.studentType')}</p>
                                <p className="text-xs font-black text-slate-900 uppercase">
                                  {applicationDetails.student_process_type === 'initial' ? t('studentDashboard.applicationChatPage.details.studentInformation.initialF1VisaRequired') :
                                   applicationDetails.student_process_type === 'transfer' ? t('studentDashboard.applicationChatPage.details.studentInformation.transferCurrentF1Student') :
                                   applicationDetails.student_process_type === 'change_of_status' ? t('studentDashboard.applicationChatPage.details.studentInformation.changeOfStatusFromOtherVisa') :
                                   applicationDetails.student_process_type || 'N/A'}
                                </p>
                              </div>
                              <div className="flex flex-col">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.applicationDate')}</p>
                                <p className="text-xs font-black text-slate-900 uppercase">
                                  {new Date(applicationDetails.created_at || Date.now()).toLocaleDateString()}
                                </p>
                              </div>
                           </div>

                           <div className="bg-white rounded-2xl p-5 text-slate-900 shadow-sm border border-slate-300 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-16 -mt-16 blur-xl" />
                              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 pb-2 border-b border-slate-100 flex items-center justify-between">
                                {t('studentDashboard.myApplicationStep.details.finance.financialSummary')}
                              </h4>
                              <div className="space-y-6">
                                <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                                   <div>
                                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('studentDashboard.myApplicationStep.details.finance.originalAnnualCost')}</p>
                                     <p className="text-xl font-black text-slate-900 line-through tracking-tighter">${(applicationDetails.scholarships?.original_annual_value || 0).toLocaleString()}</p>
                                   </div>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                   <div>
                                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">{t('studentDashboard.myApplicationStep.details.finance.withExclusiveScholarship')}</p>
                                     <div className="flex items-baseline gap-1">
                                       <span className="text-4xl font-black text-emerald-600 tracking-tighter">${(applicationDetails.scholarships?.annual_value_with_scholarship || 0).toLocaleString()}</span>
                                        <span className="text-sm text-emerald-600 font-bold uppercase">{t('studentDashboard.myApplicationStep.details.finance.perYear')}</span>
                                     </div>
                                   </div>
                                   {applicationDetails.scholarships?.original_value_per_credit && (
                                      <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('studentDashboard.myApplicationStep.details.finance.perCredit')}</p>
                                        <p className="text-xs font-bold text-slate-900">${applicationDetails.scholarships.original_value_per_credit}</p>
                                      </div>
                                   )}
                                </div>
                                
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">{t('studentDashboard.myApplicationStep.details.finance.guaranteedAnnualSavings')}</p>
                                  <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                                    + $ {((applicationDetails.scholarships?.original_annual_value || 0) - (applicationDetails.scholarships?.annual_value_with_scholarship || 0)).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                           </div>
                        </div>

                        <div className=" rounded-2xl p-4 sm:p-5 md:p-8 space-y-8 md:space-y-12 bg-white shadow-sm border border-slate-300 relative overflow-hidden">
                          <section className="space-y-6">
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight border-b border-slate-300 pb-4">
                              {t('studentDashboard.myApplicationStep.details.scholarshipDetails')}
                            </h4>
                           <div className="py-4 border-b border-slate-100 mb-2">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('studentDashboard.myApplicationStep.details.scholarshipTitle')}</p>
                              <p className="text-lg sm:text-xl font-black text-slate-900 uppercase leading-tight">{applicationDetails.scholarships?.title || applicationDetails.scholarships?.name || 'N/A'}</p>
                           </div>

                           {applicationDetails.scholarships?.course && (
                             <div className="py-4 border-b border-slate-100 mb-2">
                               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{t('studentDashboard.myApplicationStep.details.courseField')}</p>
                               <p className="text-lg sm:text-xl font-black text-blue-900 uppercase leading-tight">{applicationDetails.scholarships.course}</p>
                             </div>
                           )}
                           
                           {applicationDetails.scholarships?.description && (
                             <div className="py-4 border-b border-slate-100 mb-2">
                               <div className="mb-2">
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                   {t('studentDashboard.applicationChatPage.details.scholarshipDetails.description')}
                                 </span>
                               </div>
                               <div className="text-xs sm:text-sm font-medium text-gray-700 leading-relaxed">
                                 {applicationDetails.scholarships.description}
                               </div>
                             </div>
                           )}

                           {/* Application Fee (Enrollment Fee) */}
                           {applicationDetails.scholarships?.application_fee_amount && (
                             <div className="py-4 border-b border-slate-100 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                               <div className="flex items-start gap-3">
                                 <div>
                                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('studentDashboard.myApplicationStep.details.enrollmentFee')}</p>
                                   <p className="text-xs font-semibold text-gray-900">
                                     {Number(applicationDetails.scholarships.application_fee_amount) !== 350
                                       ? t('scholarshipsPage.scholarshipCard.customFee') 
                                       : t('scholarshipsPage.scholarshipCard.standardFee')}
                                   </p>
                                 </div>
                               </div>
                               <div className="text-lg sm:text-xl font-black text-gray-900 whitespace-nowrap">
                                 {formatFeeAmount(
                                   getFeeAmount('application_fee', applicationDetails.scholarships.application_fee_amount)
                                 )}
                               </div>
                             </div>
                           )}
                        </section>



                        {/* Internal Fees */}
                        {internalFees.length > 0 && (
                          <section className="space-y-6">
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight ">
                              {t('studentDashboard.myApplicationStep.details.internalFees')}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {internalFees.map((fee: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-2xl group transition-all hover:bg-slate-100/50 border border-transparent hover:border-slate-200">
                                   <div className="min-w-0 mr-4">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{fee.frequency || t('studentDashboard.myApplicationStep.details.oneTimePayment')}</p>
                                     <p className="text-sm font-black text-gray-900 uppercase" title={fee.category || fee.name}>{fee.category || fee.name}</p>
                                     {fee.details && <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-1 leading-relaxed">{fee.details}</p>}
                                   </div>
                                   <div className="flex flex-col items-end">
                                      <span className="text-xl font-black text-gray-900 whitespace-nowrap">${Number(fee.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                   </div>
                                </div>
                              ))}
                            </div>
                            <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3">
                              <Info className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs font-medium text-sky-700 leading-relaxed">
                                {t('studentDashboard.myApplicationStep.details.internalFeesNote')}
                              </p>
                            </div>
                          </section>
                        )}
                        </div>
 
                        {/* Institution Info - Mobile Only */}
                        <div className="block lg:hidden">
                           <div className="bg-white rounded-2xl p-5 border border-slate-300">
                              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-slate-300 pb-2">{t('studentDashboard.myApplicationStep.details.institution.title')}</h4>
                              <div className="space-y-4">
                                 {applicationDetails.scholarships?.universities?.contact?.email && (
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                                        <Mail className="w-5 h-5 text-slate-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('studentDashboard.myApplicationStep.details.institution.email')}</p>
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
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('studentDashboard.myApplicationStep.details.institution.phone')}</p>
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
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('studentDashboard.myApplicationStep.details.institution.website')}</p>
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

                        {/* Documents Progress Summary */}
                        <div className=" rounded-2xl p-5 md:p-8 space-y-12 bg-white shadow-sm border border-slate-300 relative overflow-hidden">
                        <section className="space-y-6">
                            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight border-b border-slate-300 pb-4">
                              {t('studentDashboard.myApplicationStep.details.studentDocuments')}
                            </h4>
                           <div className="flex flex-col gap-4">
                              {[
                                { key: 'diploma', label: t('studentDashboard.myApplicationStep.details.diploma') },
                                { key: 'passport', label: t('studentDashboard.myApplicationStep.details.passport') },
                                { key: 'funds_proof', label: t('studentDashboard.myApplicationStep.details.bankStatement') }
                              ].map((doc) => {
                                const docData = (applicationDetails.documents || []).find((d: any) => d.type === doc.key) || 
                                                (applicationDetails.user_profiles?.documents || []).find((d: any) => d.type === doc.key);
                                const fileUrl = docData?.file_url || docData?.url;
                                
                                return (
                                  <div key={doc.key} className="flex items-start md:items-center justify-between py-4 border-b border-slate-100 last:border-0 transition-colors gap-2">
                                    <div className="flex items-start md:items-center gap-2 flex-1 min-w-0">
                                      <div className="flex flex-col text-left min-w-0 flex-1">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight break-words">{doc.label}</span>
                                        {docData?.uploaded_at && (
                                          <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                            {t('studentDashboard.myApplicationStep.details.submittedOn')} {new Date(docData.uploaded_at).toLocaleDateString('pt-BR')}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 flex-shrink-0">
                                      {fileUrl && (
                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => handleViewDocument(fileUrl)}
                                            className="p-2 md:p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                                            title={t('studentDashboard.myApplicationStep.details.view')}
                                          >
                                            <Eye className="w-5 h-5" />
                                          </button>
                                          <button 
                                            onClick={() => handleDownloadDocument(fileUrl, doc.label)}
                                            className="p-2 md:p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                                            title={t('studentDashboard.myApplicationStep.details.download')}
                                          >
                                            <Download className="w-5 h-5" />
                                          </button>
                                        </div>
                                      )}
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
                       {/* Application Meta Info - Desktop Only */}
                       <div className="hidden lg:block bg-white rounded-2xl p-5 md:p-8 shadow-sm border border-slate-300 space-y-6">
                          <div className="flex flex-col border-b border-slate-100 pb-4">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.studentType')}</p>
                            <p className="text-sm font-black text-slate-900 uppercase">
                              {applicationDetails.student_process_type === 'initial' ? t('studentDashboard.applicationChatPage.details.studentInformation.initialF1VisaRequired') :
                               applicationDetails.student_process_type === 'transfer' ? t('studentDashboard.applicationChatPage.details.studentInformation.transferCurrentF1Student') :
                               applicationDetails.student_process_type === 'change_of_status' ? t('studentDashboard.applicationChatPage.details.studentInformation.changeOfStatusFromOtherVisa') :
                               applicationDetails.student_process_type || 'N/A'}
                            </p>
                          </div>
                          <div className="flex flex-col">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('studentDashboard.applicationChatPage.details.studentInformation.applicationDate')}</p>
                            <p className="text-sm font-black text-slate-900 uppercase">
                              {new Date(applicationDetails.created_at || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                       </div>

                       {/* Financial Summary Table - Desktop Only */}
                        <div className="hidden lg:block bg-white rounded-2xl p-5 md:p-8 text-slate-900 shadow-sm border border-slate-300 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-16 -mt-16 blur-xl" />
                           <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 pb-2 border-b border-slate-100 flex items-center justify-between">
                             {t('studentDashboard.myApplicationStep.details.finance.financialSummary')}
                           </h4>
                           <div className="space-y-6">
                             <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('studentDashboard.myApplicationStep.details.finance.originalAnnualCost')}</p>
                                  <p className="text-xl font-black text-slate-900 line-through tracking-tighter">${(applicationDetails.scholarships?.original_annual_value || 0).toLocaleString()}</p>
                                </div>
                             </div>
                             
                             <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">{t('studentDashboard.myApplicationStep.details.finance.withExclusiveScholarship')}</p>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-emerald-600 tracking-tighter">${(applicationDetails.scholarships?.annual_value_with_scholarship || 0).toLocaleString()}</span>
                                     <span className="text-sm text-emerald-600 font-bold uppercase">{t('studentDashboard.myApplicationStep.details.finance.perYear')}</span>
                                  </div>
                                </div>
                                {applicationDetails.scholarships?.original_value_per_credit && (
                                   <div className="text-right">
                                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('studentDashboard.myApplicationStep.details.finance.perCredit')}</p>
                                     <p className="text-xs font-bold text-slate-900">${applicationDetails.scholarships.original_value_per_credit}</p>
                                   </div>
                                )}
                             </div>
                             
                             <div>
                               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">{t('studentDashboard.myApplicationStep.details.finance.guaranteedAnnualSavings')}</p>
                               <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                                 + $ {((applicationDetails.scholarships?.original_annual_value || 0) - (applicationDetails.scholarships?.annual_value_with_scholarship || 0)).toLocaleString()}
                               </p>
                             </div>
                           </div>
                        </div>

                       {/* Contact & Support - Desktop Only */}
                       <div className="hidden lg:block space-y-4">
                         <div className="bg-white rounded-2xl p-5 md:p-8 border border-slate-300">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-slate-300 pb-2">{t('studentDashboard.myApplicationStep.details.institution.title')}</h4>
                            <div className="space-y-4">
                               {applicationDetails.scholarships?.universities?.contact?.email && (
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                                      <Mail className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('studentDashboard.myApplicationStep.details.institution.email')}</p>
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
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('studentDashboard.myApplicationStep.details.institution.phone')}</p>
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
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('studentDashboard.myApplicationStep.details.institution.website')}</p>
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {showZelleCheckout ? (
                <div className="bg-white rounded-[2.5rem] shadow-2xl  overflow-hidden">
                  <div className="p-8">
                    <button
                      onClick={() => setShowZelleCheckout(false)}
                      className="mb-8 flex items-center text-slate-600 hover:text-slate-900 transition-all gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-all">
                        <ArrowRight className="w-5 h-5 rotate-180" />
                      </div>
                      <span className="font-black uppercase tracking-widest text-xs">Voltar</span>
                    </button>
                    <ZelleCheckout
                      feeType="i20_control_fee"
                      amount={getFeeAmount('i20_control_fee')}
                      scholarshipsIds={applicationDetails?.scholarship_id ? [applicationDetails.scholarship_id] : []}
                      metadata={{
                        application_id: applicationDetails?.id,
                        selected_scholarship_id: applicationDetails?.scholarship_id,
                      }}
                      onProcessingChange={(isProcessing) => {
                        if (isProcessing) fetchApplicationDetails(true);
                      }}
                    />
                  </div>
                </div>
              ) : !(userProfile as any)?.has_paid_i20_control_fee ? (
                <div className="bg-white rounded-[2.5rem] shadow-2xl  overflow-hidden">
                  <div className="p-8 md:p-12 relative overflow-hidden border-b border-slate-300">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20 transition-transform hover:scale-105">
                        <CreditCard className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">{t('studentDashboard.applicationChatPage.i20ControlFee.title')}</h3>
                        <p className="text-gray-600 font-medium">{t('studentDashboard.applicationChatPage.i20ControlFee.subtitle')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 md:p-12 space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                          {t('studentDashboard.applicationChatPage.i20ControlFee.paymentRequired')}
                        </h4>
                        <p className="text-gray-600 leading-relaxed font-medium">
                          {t('studentDashboard.applicationChatPage.i20ControlFee.description')}
                        </p>
                        <div className="p-6 bg-slate-50  rounded-3xl space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('studentDashboard.applicationChatPage.i20ControlFee.feeType')}</span>
                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                              I-20 Control Fee
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('studentDashboard.applicationChatPage.i20ControlFee.amount')}</span>
                            <span className="text-2xl font-black text-blue-600 tracking-tighter">{formatFeeAmount(getFeeAmount('i20_control_fee'))}</span>
                          </div>
                        </div>

                        {i20Error && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-xs font-bold uppercase tracking-tight">{i20Error}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col flex-1 gap-6">
                        {/* Stripe */}
                        <button
                          onClick={() => { handlePaymentMethodSelect('stripe'); handleProceedPayment(); }}
                          disabled={i20Loading}
                          className="group/btn relative bg-white border border-gray-200 p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl">
                              <StripeIcon className="w-9 h-9" />
                            </div>
                            <div>
                              <div className="font-black text-slate-900 text-base uppercase tracking-tight">Cartão de Crédito</div>
                              <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">* Podem incluir taxas de processamento</div>
                            </div>
                          </div>
                          <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                            {formatFeeAmount(calculateCardAmountWithFees(getFeeAmount('i20_control_fee')))}
                          </div>
                          {selectedPaymentMethod === 'stripe' && i20Loading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                          )}
                        </button>

                        {/* PIX */}
                        {calculatePIXTotalWithIOF(getFeeAmount('i20_control_fee'), exchangeRate || 5.6).totalWithIOF <= 3000 && (
                          <button
                            onClick={() => { handlePaymentMethodSelect('pix', exchangeRate || 5.6); handleProceedPayment(); }}
                            disabled={i20Loading}
                            className="group/btn relative bg-white border border-gray-200 p-5 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl">
                                <PixIcon className="w-9 h-9" />
                              </div>
                              <div>
                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">PIX</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">* Podem incluir taxas de processamento</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-900 text-xl font-black uppercase tracking-tight">
                                R$ {calculatePIXTotalWithIOF(getFeeAmount('i20_control_fee'), exchangeRate || 5.6).totalWithIOF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            {selectedPaymentMethod === 'pix' && i20Loading && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                <RefreshCw className="w-8 h-8 text-[#4db6ac] animate-spin" />
                              </div>
                            )}
                          </button>
                        )}

                        {/* Parcelow */}
                        <div className="flex flex-col gap-0 border border-gray-100 rounded-[2rem] overflow-hidden bg-white shadow-sm ring-1 ring-slate-100/50">
                          <button
                            onClick={handleParcelowClick}
                            disabled={i20Loading}
                            className={`group/btn relative bg-white p-5 text-left hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-between ${showInlineCpf ? 'border-b border-gray-100 rounded-t-[2rem]' : 'rounded-[2rem]'}`}
                          >
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl px-2">
                                <ParcelowIcon className="w-full h-10" />
                              </div>
                              <div>
                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">Parcelow</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">* Podem incluir taxas da operadora</div>
                              </div>
                            </div>
                            <div className="text-slate-900 text-xl font-black uppercase tracking-tight">{formatFeeAmount(getFeeAmount('i20_control_fee'))}</div>
                            {selectedPaymentMethod === 'parcelow' && i20Loading && !showInlineCpf && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                              </div>
                            )}
                          </button>

                          {showInlineCpf && (
                            <div className="p-6 bg-slate-50 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Informe seu CPF para Parcelow</h4>
                                <button onClick={() => setShowInlineCpf(false)} title="Fechar">
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
                                  Continuar para Pagamento
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Zelle */}
                        <div className="flex flex-col">
                          <button
                            onClick={() => { setShowZelleCheckout(!showZelleCheckout); setSelectedPaymentMethod('zelle'); }}
                            disabled={i20Loading}
                            className={`group/btn relative bg-white border p-5 text-left hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-between ${showZelleCheckout
                              ? 'rounded-t-[2rem] border-slate-200 border-b-0 bg-slate-50/30'
                              : 'rounded-[2rem] border-gray-200'
                              }`}
                          >
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl">
                                <ZelleIcon className="w-9 h-9" />
                              </div>
                              <div>
                                <div className="font-black text-slate-900 text-base uppercase tracking-tight">Zelle</div>
                                <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wide flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Processamento pode levar até 48 horas
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-900 text-xl font-black uppercase tracking-tight">{formatFeeAmount(getFeeAmount('i20_control_fee'))}</div>
                              <span className="text-[10px] font-bold text-slate-900 mt-1 block uppercase tracking-widest">Sem Taxas</span>
                            </div>
                          </button>

                          {showZelleCheckout && (
                            <div className="border border-slate-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                              <ZelleCheckout
                                feeType="i20_control_fee"
                                amount={getFeeAmount('i20_control_fee')}
                                scholarshipsIds={applicationDetails?.scholarships?.id ? [applicationDetails.scholarships.id] : []}
                                metadata={{
                                  application_id: applicationDetails?.id,
                                  selected_scholarship_id: applicationDetails?.scholarships?.id,
                                }}
                                isPendingVerification={false}
                                onProcessingChange={(isProcessing) => { if (isProcessing) fetchApplicationDetails(true); }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 justify-center text-slate-400 mt-4">
                          <ShieldCheck className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('studentDashboard.applicationChatPage.i20ControlFee.securePayment')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] shadow-2xl  overflow-hidden">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30 shadow-xl">
                        <Check className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">{t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.title')}</h3>
                        <p className="text-emerald-100 font-medium">{t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.paymentProcessed')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 md:p-12 space-y-12">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-8">
                      <h4 className="text-lg font-black text-emerald-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                        {t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.nextSteps')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(t('studentDashboard.applicationChatPage.i20ControlFee.paymentSuccess.nextStepsList', { returnObjects: true }) as string[]).map((step, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 bg-white/50 rounded-2xl border border-emerald-100">
                            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-600 font-black text-sm">
                              {index + 1}
                            </div>
                            <p className="text-sm font-medium text-emerald-800 leading-relaxed">{step}</p>
                          </div>
                        ))}
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
              <div className="bg-white rounded-[2.5rem] shadow-2xl  overflow-hidden">
                 {/* Header moved here */}
                 <div className="p-8 md:p-12 relative overflow-hidden border-b border-slate-300">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                        <FolderOpen className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t('studentDashboard.myApplicationStep.documents.title')}</h3>
                        <p className="text-gray-600 font-medium">{t('studentDashboard.myApplicationStep.documents.subtitle')}</p>
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

          {/* ====== DS160 Package Tab ====== */}
          {activeTab === 'ds160' && (
            <PackageFeeTab
              feeType="ds160_package"
              feeLabel="DS160 Package"
              isPaid={hasDs160Package}
              loading={packageFeeLoading}
              setLoading={setPackageFeeLoading}
              error={packageFeeError}
              setError={setPackageFeeError}
              selectedPaymentMethod={selectedPackagePaymentMethod}
              setSelectedPaymentMethod={setSelectedPackagePaymentMethod}
              showZelle={showZellePackageFee}
              setShowZelle={setShowZellePackageFee}
              showInlineCpf={showInlineCpfPackage}
              setShowInlineCpf={setShowInlineCpfPackage}
              inlineCpf={inlineCpfPackage}
              setInlineCpf={setInlineCpfPackage}
              savingCpf={savingCpfPackage}
              setSavingCpf={setSavingCpfPackage}
              cpfError={cpfErrorPackage}
              setCpfError={setCpfErrorPackage}
              userProfile={userProfile}
              onPaymentSuccess={() => fetchApplicationDetails(true)}
            />
          )}

          {/* ====== I539 COS Package Tab ====== */}
          {activeTab === 'i539' && (
            <PackageFeeTab
              feeType="i539_cos_package"
              feeLabel="I539 COS Package"
              isPaid={hasI539Package}
              loading={packageFeeLoading}
              setLoading={setPackageFeeLoading}
              error={packageFeeError}
              setError={setPackageFeeError}
              selectedPaymentMethod={selectedPackagePaymentMethod}
              setSelectedPaymentMethod={setSelectedPackagePaymentMethod}
              showZelle={showZellePackageFee}
              setShowZelle={setShowZellePackageFee}
              showInlineCpf={showInlineCpfPackage}
              setShowInlineCpf={setShowInlineCpfPackage}
              inlineCpf={inlineCpfPackage}
              setInlineCpf={setInlineCpfPackage}
              savingCpf={savingCpfPackage}
              setSavingCpf={setSavingCpfPackage}
              cpfError={cpfErrorPackage}
              setCpfError={setCpfErrorPackage}
              userProfile={userProfile}
              onPaymentSuccess={() => fetchApplicationDetails(true)}
            />
          )}

          {activeTab === 'acceptance' && (
            <div className="space-y-8 pb-12">
              <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-80 h-80 bg-slate-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                
                {/* Header Card */}
                <div className="bg-slate-50 px-8 py-10 md:p-12 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-500/20 transition-transform">
                        <Award className="w-10 h-10 text-white" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-[22px] md:text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2 whitespace-nowrap">
                          {t('studentDashboard.myApplicationStep.acceptance.letterOf')} <span className="text-blue-600">{t('studentDashboard.myApplicationStep.acceptance.acceptance')}</span>
                        </h2>
                      </div>
                    </div>

                    <div className={`flex items-center w-fit gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all duration-500 ${
                      applicationDetails.acceptance_letter_url && !packageFeeRequired
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : packageFeeRequired
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      {applicationDetails.acceptance_letter_url && !packageFeeRequired ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          {t('studentDashboard.myApplicationStep.acceptance.available')}
                        </>
                      ) : packageFeeRequired ? (
                        <>
                          <Lock className="w-4 h-4" />
                          {t('studentDashboard.myApplicationStep.welcome.status.blocked')}
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          {t('studentDashboard.myApplicationStep.acceptance.inProgress')}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-8 md:p-16 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                        {t('studentDashboard.myApplicationStep.acceptance.successConfirmation')}
                      </h4>
                      <p className="text-gray-600 leading-relaxed font-medium">
                        {t('studentDashboard.myApplicationStep.acceptance.description')}
                      </p>
                      <div className="p-6 bg-slate-50 rounded-3xl flex items-start gap-4 border border-slate-300">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-slate-400" />
                         </div>
                         <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                           {t('studentDashboard.myApplicationStep.acceptance.officialNote')}
                         </p>
                      </div>
                    </div>

                    <div className="space-y-8">
                       {/* Status indicator block */}
                       {packageFeeRequired ? (
                         <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in duration-700 relative overflow-hidden group">
                           {/* Decorative background element */}
                           <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-200/20 rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="text-left space-y-4 relative z-10 w-full">
                              <p className="text-sm text-red-900/80 font-bold leading-relaxed">
                                <Trans 
                                  i18nKey="studentOnboarding.documentsUpload.acceptance.lockMessage"
                                  values={{ feeName: showDs160Tab ? 'DS160 Package' : 'I539 COS Package' }}
                                  components={{ 0: <span className="text-red-600 font-black" /> }}
                                />
                              </p>
                            </div>
                            
                            <button 
                              onClick={() => setActiveTab(showDs160Tab ? 'ds160' : 'i539')}
                              className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-3 active:scale-95 group/btn"
                            >
                              <CreditCard className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                              {t('studentOnboarding.documentsUpload.acceptance.goToPayment')}
                            </button>
                         </div>
                       ) : applicationDetails.acceptance_letter_url ? (
                         <div className="bg-emerald-50 border-2 border-emerald-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-500">
                           <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-200 rounded-2xl flex items-center justify-center animate-bounce-slow">
                             <Award className="w-8 h-8 text-emerald-600" />
                           </div>
                           <div className="text-center space-y-2">
                             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('studentDashboard.myApplicationStep.acceptance.documentAvailable')}</span>
                             <p className="text-sm text-emerald-800 font-bold">{t('studentDashboard.myApplicationStep.acceptance.readyToDownload')}</p>
                           </div>
                           <button 
                             onClick={() => handleDownloadDocument(applicationDetails.acceptance_letter_url, 'acceptance_letter', 'document-attachments')}
                             className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex items-center justify-center gap-2 group"
                           >
                             <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                             {t('studentDashboard.myApplicationStep.acceptance.downloadPdf')}
                           </button>
                         </div>
                       ) : (
                         null
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>


      {/* Legacy/Modals support */}







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

