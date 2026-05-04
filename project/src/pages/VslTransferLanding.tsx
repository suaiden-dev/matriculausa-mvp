import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';
import {
  Mail,
  User,
  Users,
  Lock,
  Loader2,
  ChevronDown,
  Shield,
  X,
  ArrowLeft,
  Eye,
  Ticket,
  Check
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import { calculateCardAmountWithFees, calculatePIXAmountWithFees, getExchangeRate } from '../utils/stripeFeeCalculator';
import { ZelleCheckout } from '../components/ZelleCheckout';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { PaymentLoadingOverlay } from '../components/PaymentLoadingOverlay';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { useFormTracking } from '../hooks/useFormTracking';
import { useLeadCapture } from '../hooks/useLeadCapture';

// Interfaces e Componentes Auxiliares do Checkout
interface UrgencyBannerProps {
  timeLeft: number;
}

const UrgencyBanner: React.FC<UrgencyBannerProps> = ({ timeLeft }) => {
  const { t } = useTranslation(['registration']);
  if (timeLeft <= 0) return null;

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const format = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="max-w-4xl mx-auto mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="bg-blue-600/10 backdrop-blur-md rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-center shadow-2xl border border-blue-500/20 gap-6 sm:gap-10">
        <div className="flex items-center">
          <span className="text-white font-black text-lg sm:text-xl tracking-tight text-center sm:text-left">
            {t('registration:rapidRegistration.urgencyBanner.title')}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <div className="bg-[#D0151C] border border-white/20 rounded-xl px-3 py-1.5 text-white font-black text-xl tabular-nums shadow-lg">
              {format(hours)}
            </div>
            <span className="text-white/40 font-bold">:</span>
            <div className="bg-[#D0151C] border border-white/20 rounded-xl px-3 py-1.5 text-white font-black text-xl tabular-nums shadow-lg">
              {format(minutes)}
            </div>
            <span className="text-white/40 font-bold">:</span>
            <div className="bg-[#D0151C] border border-white/20 rounded-xl px-3 py-1.5 text-white font-black text-xl tabular-nums shadow-lg">
              {format(seconds)}
            </div>
          </div>
          <span className="text-white/60 font-bold text-[10px] uppercase tracking-widest">
            {t('registration:rapidRegistration.urgencyBanner.timeLeft')}
          </span>
        </div>
      </div>
    </div>
  );
};

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

const StripeIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-[#635bff] rounded-lg overflow-hidden shadow-sm shadow-[#635bff]/20`}>
    <span className="text-white font-black text-[20px] sm:text-[28px] leading-[0] select-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', transform: 'translateY(-1.5px)' }}>S</span>
  </div>
);

const ParcelowIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg overflow-hidden p-0.5 shadow-sm border border-gray-100`}>
    <img src="/parcelow_share.webp" alt="Parcelow" className="w-full h-full object-contain scale-110" />
  </div>
);

const methodNames: Record<string, string> = {
  stripe: 'Cartão',
  pix: 'PIX',
  zelle: 'Zelle',
  parcelow: 'Boleto/PIX'
};

const VslTransferLanding: React.FC = () => {
  const { t } = useTranslation(['registration', 'payment', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { register, supabaseUser, userProfile, updateUserProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig();
  const { recordTermAcceptance } = useTermsAcceptance();
  const { trackFormSubmitted } = useFormTracking({ formName: 'vsl_transfer_registration' });
  const { markAsConverted } = useLeadCapture();

  // --- Lógica de Checkout Unificada ---
  const { pendingPayment, rejectedPayment, loading: paymentBlockedLoading } = usePaymentBlocked();

  const [formData, setFormData] = useState(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlName = searchParams.get('name');
      const urlEmail = searchParams.get('email');
      const urlPhone = searchParams.get('phone');
      const saved = sessionStorage.getItem('vsl_transfer_form');
      const parsed = saved ? JSON.parse(saved) : null;

      return {
        full_name: urlName || (parsed?.full_name || ''),
        email: urlEmail || (parsed?.email || ''),
        phone: urlPhone || (parsed?.phone || ''),
        dependents: parsed?.dependents !== undefined ? parsed.dependents : 0,
        password: '', confirm_password: '',
        termsAccepted: false,
        cpf: parsed?.cpf || '', country: parsed?.country || '',
        field_of_interest: parsed?.field_of_interest || '',
        academic_level: parsed?.academic_level || '',
        english_proficiency: parsed?.english_proficiency || ''
      };
    } catch {
      return { full_name: '', email: '', phone: '', dependents: 0, password: '', confirm_password: '', termsAccepted: false, cpf: '', country: '', field_of_interest: '', academic_level: '', english_proficiency: '' };
    }
  });

  const [isRegistered, setIsRegistered] = useState(() => sessionStorage.getItem('vsl_transfer_registered') === 'true');
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState('');
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'pix' | 'zelle' | 'parcelow'>(() => (sessionStorage.getItem('vsl_selected_method') as any) || 'stripe');
  const [showZelleCheckout, setShowZelleCheckout] = useState(() => sessionStorage.getItem('vsl_show_zelle') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // States para Cupons
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message: string; discountAmount?: number; isSelfReferral?: boolean; codeType?: 'rewards' | 'seller'; } | null>(null);
  const [codeApplied, setCodeApplied] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [isValidatingPromotionalCoupon, setIsValidatingPromotionalCoupon] = useState(false);
  const [promotionalCouponValidation, setPromotionalCouponValidation] = useState<{ isValid: boolean; message: string; discountAmount?: number; finalAmount?: number; couponId?: string; } | null>(null);
  const [promotionalCoupon, setPromotionalCoupon] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [cardAmountWithFees, setCardAmountWithFees] = useState<number>(0);
  const [pixAmountWithFees, setPixAmountWithFees] = useState<number>(0);
  const [activeIntervals, setActiveIntervals] = useState<NodeJS.Timeout[]>([]);

  const isNoDiscountLink = new URLSearchParams(location.search).get('sref') !== null;
  const baseFee = getFeeAmount('selection_process');

  const currentFee = (() => {
    if (timeLeft <= 0) return baseFee;
    if (promotionalCouponValidation?.isValid && promotionalCouponValidation.finalAmount !== undefined) return promotionalCouponValidation.finalAmount;
    if ((isCouponValid || codeApplied) && validationResult?.isValid && (validationResult.discountAmount ?? 50) > 0) {
      return Math.max(baseFee - (validationResult.discountAmount || 50), 0);
    }
    return baseFee;
  })();

  const formattedAmount = formatFeeAmount(currentFee);

  // --- Effects ---
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      setIsRegistered(true);
      setFormData((prev: any) => ({
        ...prev,
        full_name: userProfile?.full_name || prev.full_name,
        email: supabaseUser.email || prev.email,
        phone: userProfile?.phone || prev.phone,
        dependents: userProfile?.dependents !== null && userProfile?.dependents !== undefined ? userProfile.dependents : prev.dependents,
        termsAccepted: true
      }));
    }
  }, [supabaseUser, userProfile]);

  useEffect(() => {
    if (formData.full_name || formData.email) sessionStorage.setItem('vsl_transfer_form', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    sessionStorage.setItem('vsl_selected_method', selectedMethod);
    sessionStorage.setItem('vsl_show_zelle', String(showZelleCheckout));
  }, [selectedMethod, showZelleCheckout]);

  useEffect(() => {
    const loadExchangeRate = async () => { setExchangeRate(await getExchangeRate()); };
    loadExchangeRate();
  }, []);

  useEffect(() => {
    if (currentFee > 0) {
      setCardAmountWithFees(calculateCardAmountWithFees(currentFee));
      if (exchangeRate) setPixAmountWithFees(calculatePIXAmountWithFees(currentFee, exchangeRate));
    }
  }, [currentFee, exchangeRate]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (!paymentBlockedLoading && (pendingPayment?.fee_type === 'selection_process' || rejectedPayment?.fee_type === 'selection_process')) {
      setShowZelleCheckout(true);
      setSelectedMethod('zelle');
    }
  }, [pendingPayment, rejectedPayment, paymentBlockedLoading]);

  // URL Parameter for Coupon
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const srefCode = params.get('sref');
    const code = params.get('coupon') || params.get('ref');

    if (srefCode) {
      setCouponCode(srefCode.toUpperCase());
      setCodeApplied(true);
      setValidationResult({ isValid: true, message: '', discountAmount: 0, codeType: 'seller' });
    } else if (code) {
      setCouponCode(code);
      handleValidateCoupon(code);
    }
  }, [location.search]);

  // --- Handlers ---
  const simulateProgress = (start: number, end: number, duration: number) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = rawProgress === 1 ? 1 : 1 - Math.pow(1 - rawProgress, 2);
      setLoadingProgress(start + (end - start) * easedProgress);
      if (rawProgress === 1) clearInterval(interval);
    }, 50);
    setActiveIntervals(prev => [...prev, interval]);
    return interval;
  };

  const clearAllIntervals = () => { activeIntervals.forEach(clearInterval); setActiveIntervals([]); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : name === 'dependents' ? (value === '' ? '' : parseInt(value)) : value
    }));
    if (fieldErrors[name]) setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  };

  const handleValidateCoupon = async (code: string) => {
    if (!code) return;
    setHasReferralCode(true);
    await validateDiscountCode(code);
  };

  const validateDiscountCode = async (providedCode?: string) => {
    const targetCode = (providedCode || couponCode).trim().toUpperCase();
    if (!targetCode) { setValidationResult({ isValid: false, message: t('payment:preCheckoutModal.pleaseEnterCode') }); return; }
    setIsValidating(true); setValidationResult(null);
    try {
      let codeType: 'rewards' | 'seller' = 'rewards';
      let { data: affiliateCodeData } = await supabase.from('affiliate_codes').select('user_id, code, is_active').eq('code', targetCode).eq('is_active', true).maybeSingle();
      if (!affiliateCodeData) {
        const { data: sellerData } = await supabase.from('sellers').select('user_id, referral_code, is_active').eq('referral_code', targetCode).eq('is_active', true).maybeSingle();
        if (sellerData) { codeType = 'seller'; affiliateCodeData = { user_id: sellerData.user_id, code: sellerData.referral_code, is_active: sellerData.is_active }; }
      }
      if (!affiliateCodeData) { setValidationResult({ isValid: false, message: t('payment:preCheckoutModal.invalidCode') }); return; }
      if (affiliateCodeData.user_id === supabaseUser?.id) { setValidationResult({ isValid: false, message: t('payment:preCheckoutModal.selfReferral') }); return; }
      if (isRegistered && supabaseUser?.id && supabaseUser?.email) {
        const { data: result, error: validationError } = await supabase.rpc('validate_and_apply_referral_code', { user_id_param: supabaseUser.id, affiliate_code_param: targetCode, email_param: supabaseUser.email });
        if (validationError || !result?.success) { setValidationResult({ isValid: false, message: validationError?.message || result?.error || 'Erro ao validar código' }); return; }
      }
      setValidationResult({ isValid: true, message: t('payment:preCheckoutModal.validCode'), discountAmount: 50, codeType });
      setIsCouponValid(true); setCodeApplied(true); if (providedCode) setCouponCode(targetCode);
    } catch (error) { setValidationResult({ isValid: false, message: 'Erro ao validar código' }); } finally { setIsValidating(false); }
  };

  const validatePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim()) {
      setPromotionalCouponValidation({ isValid: false, message: 'Digite um código de cupom' });
      return;
    }
    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    setIsValidatingPromotionalCoupon(true);
    setPromotionalCouponValidation(null);
    try {
      const { data: result, error } = await supabase.rpc('validate_and_apply_admin_promotional_coupon', {
        p_code: normalizedCode,
        p_fee_type: 'selection_process',
        p_user_id: supabaseUser?.id || null
      });
      if (error || !result?.valid) {
        setPromotionalCouponValidation({ isValid: false, message: result?.message || 'Cupom inválido' });
        return;
      }
      let dAmount = result.discount_type === 'percentage' ? (baseFee * result.discount_value) / 100 : result.discount_value;
      dAmount = Math.min(dAmount, baseFee);
      const fAmount = Math.max(0, baseFee - dAmount);
      setPromotionalCouponValidation({ isValid: true, message: `Cupom ${normalizedCode} aplicado! Você economizou $${dAmount.toFixed(2)}`, discountAmount: dAmount, finalAmount: fAmount, couponId: result.id });
    } catch (error: any) {
      setPromotionalCouponValidation({ isValid: false, message: 'Falha ao validar cupom' });
    } finally { setIsValidatingPromotionalCoupon(false); }
  };

  const removePromotionalCoupon = () => {
    setPromotionalCoupon('');
    setPromotionalCouponValidation(null);
  };

  const handleRegisterAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    trackFormSubmitted();
    if (userProfile?.has_paid_selection_process_fee) {
      if (!userProfile?.selection_survey_passed) navigate('/student/onboarding?step=selection_fee&payment=success');
      else navigate('/student/dashboard');
      return;
    }

    if (isRegistered) {
      setLoading(true); setError(null);
      try {
        if (selectedMethod === 'parcelow') {
          if (!formData.cpf || formData.cpf.length < 14) { setFieldErrors({ cpf: 'CPF é obrigatório para Parcelow.' }); setLoading(false); return; }
          if (!userProfile?.cpf_document || userProfile.cpf_document !== formData.cpf) await updateUserProfile({ cpf_document: formData.cpf });
        }
        if (['stripe', 'pix', 'parcelow'].includes(selectedMethod) || !selectedMethod) await handlePaymentCheckout(selectedMethod || 'stripe');
        else if (selectedMethod === 'zelle') { setShowZelleCheckout(true); setLoading(false); }
      } catch (err: any) { setError(err.message); setLoading(false); }
      return;
    }

    // Validação de Campos
    const errors: Record<string, string> = {};
    if (!formData.full_name.trim()) {
      errors.full_name = 'Campo obrigatório';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Campo obrigatório';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'E-mail inválido';
    }

    if (!formData.phone.trim() || formData.phone.length < 8) {
      errors.phone = 'Telefone inválido';
    }

    if (!isRegistered) {
      if (!formData.password) errors.password = 'Senha é obrigatória';
      else if (formData.password.length < 6) errors.password = 'Mínimo 6 caracteres';
      
      if (formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Senhas não coincidem';
      }
    }

    if (formData.dependents === '') errors.dependents = 'Selecione os dependentes';
    if (!formData.termsAccepted) errors.termsAccepted = 'Aceite os termos';
    if (selectedMethod === 'parcelow' && (!formData.cpf || formData.cpf.length < 14)) errors.cpf = 'CPF obrigatório';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = document.querySelector('[name="' + Object.keys(errors)[0] + '"]');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true); setError(null);
    setLoadingStep("Criando sua conta...");
    simulateProgress(0, 30, 2000);

    try {
      const userData: any = { full_name: formData.full_name, phone: formData.phone, dependents: formData.dependents, role: 'student', cpf_document: formData.cpf };
      if (codeApplied && couponCode && validationResult?.codeType) {
        if (validationResult.codeType === 'seller') { userData.seller_referral_code = couponCode; if (isNoDiscountLink) userData.no_referral_discount = true; }
        else userData.affiliate_code = couponCode;
      }
      const result = await register(formData.email, formData.password, userData);
      if (result?.user?.id && activeTerm) await recordTermAcceptance(activeTerm.id, 'checkout_terms', result.user.id);
      
      setIsRegistered(true); sessionStorage.setItem('vsl_transfer_registered', 'true');
      markAsConverted(formData.email);
      setLoadingProgress(30);
      if (['stripe', 'pix', 'parcelow'].includes(selectedMethod) || !selectedMethod) await handlePaymentCheckout(selectedMethod || 'stripe');
      else if (selectedMethod === 'zelle') { setShowZelleCheckout(true); setLoading(false); }
    } catch (err: any) { clearAllIntervals(); setError(err.message); setLoading(false); }
  };

  const handlePaymentCheckout = async (method: 'stripe' | 'pix' | 'parcelow' | 'zelle') => {
    setLoadingStep("Validando sessão...");
    simulateProgress(30, 60, 2000);
    try {
      let sessionData = null; let token = null;
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) { sessionData = data; token = data.session.access_token; break; }
        await new Promise(r => setTimeout(r, (i + 1) * 500));
      }
      if (!token || !sessionData?.session) throw new Error('Usuário não autenticado.');

      setLoadingProgress(60); setLoadingStep("Gerando checkout...");
      simulateProgress(60, 90, 3000);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${method === 'parcelow' ? 'parcelow' : 'stripe'}-checkout-selection-process${method === 'parcelow' ? '' : '-fee'}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          price_id: STRIPE_PRODUCTS.selectionProcess.priceId,
          amount: currentFee, payment_method: method,
          success_url: `${window.location.origin}/student/onboarding?step=selection_fee&payment=success&session_id={CHECKOUT_SESSION_ID}&pm=${method === 'pix' ? 'pix' : 's'}`,
          cancel_url: window.location.href, mode: 'payment', fee_type: 'selection_process',
          metadata: { student_id: sessionData.session.user.id, email: sessionData.session.user.email, full_name: formData.full_name, phone: formData.phone, cpf: formData.cpf, registration_source: 'vsl_transfer' }
        })
      });

      const data = await response.json();
      const paymentUrl = data.session_url || data.url || data.checkout_url;
      if (paymentUrl) {
        setLoadingProgress(100); setLoadingStep("Redirecionando...");
        await new Promise(r => setTimeout(r, 800));
        window.location.href = paymentUrl;
      } else throw new Error(data.error || 'Falha ao gerar link de pagamento.');
    } catch (err: any) { clearAllIntervals(); throw err; }
  };

  const handleTermsClick = async (e: any) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setLoadingTerms(true);
    const { data } = await supabase.from('application_terms').select('*').eq('term_type', 'checkout_terms').eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    if (data?.[0]) setActiveTerm(data[0]);
    setShowTermsModal(true);
    setLoadingTerms(false);
  };

  const formatCPF = (val: string) => val.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').substring(0, 14);

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden bg-slate-950">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      </div>

      <header className="py-8 flex justify-center w-full relative z-10">
        <img src="/logo.png.png" alt="Matrícula USA" className="h-12 md:h-16 w-auto opacity-90 transition-opacity" />
      </header>

      <section className="relative pt-6 pb-16 px-4 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-8 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-50 to-indigo-100">
              Estude e Trabalhe nos EUA
            </h1>
            <p className="text-lg md:text-xl text-blue-100/60 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
              Entenda como transferir para uma faculdade com bolsa, permissão de trabalho e aulas uma vez por semestre.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="mt-12 relative w-full aspect-[9/16] mx-auto max-w-sm rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.1)] border border-white/5 bg-slate-900/50 backdrop-blur-sm group">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-blue-600/20 group-hover:bg-blue-600/40 transition-all rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_30px_rgba(37,99,235,0.2)] mb-4">
                <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent translate-x-1" />
              </div>
              <span className="text-slate-500 font-medium">Seu VSL aparecerá aqui</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Checkout Section Injected */}
      <section id="checkout-section" className="relative z-20 w-full pt-20 pb-40 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter italic">Garanta sua Vaga Agora</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          </div>

          <AnimatePresence mode="wait">
            {showZelleCheckout ? (
              <motion.div key="zelle" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto">
                 <button onClick={() => setShowZelleCheckout(false)} className="flex items-center gap-2 text-slate-400 font-bold hover:text-white transition-all mb-8 group">
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" /> Voltar
                </button>
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8">
                  <ZelleCheckout amount={currentFee} feeType="selection_process" onSuccess={() => navigate('/student/onboarding?step=selection_fee&payment=success')} onProcessingChange={() => {}} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                <div className="lg:col-span-2 space-y-8">
                   {(codeApplied || promotionalCouponValidation?.isValid) && <UrgencyBanner timeLeft={timeLeft} />}
                   
                   <form id="registration-form" onSubmit={handleRegisterAndPay} className="space-y-8">
                    {/* Step 1: Info */}
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                      <h3 className="text-xl font-black text-blue-400 mb-8 uppercase tracking-widest flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">1</div>
                        Dados do seu Perfil
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} disabled={isRegistered} className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-white placeholder:text-slate-600" placeholder="Seu nome" />
                          </div>
                          {fieldErrors.full_name && <p className="text-red-500 text-[10px] font-bold uppercase ml-1 mt-1">{fieldErrors.full_name}</p>}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={isRegistered} className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-white placeholder:text-slate-600" placeholder="exemplo@email.com" />
                          </div>
                          {fieldErrors.email && <p className="text-red-500 text-[10px] font-bold uppercase ml-1 mt-1">{fieldErrors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                          <div className="h-[14px] mb-1"></div> {/* Espaçador técnico para alinhamento */}
                          <PhoneInput international defaultCountry="US" value={formData.phone} onChange={v => setFormData(p => ({...p, phone: v || ''}))} className="vsl-phone-input w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/50 transition-all text-white" />
                          {fieldErrors.phone && <p className="text-red-500 text-[10px] font-bold uppercase ml-1 mt-1">{fieldErrors.phone}</p>}
                        </div>

                        {/* Dependents */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Número de Dependentes</label>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider ml-1 -mt-1 mb-1">Membros da família (cônjuge e/ou filhos)</p>
                          <div className="relative">
                             <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10" />
                             <select name="dependents" value={formData.dependents} onChange={handleChange} disabled={isRegistered} className="w-full pl-12 pr-10 py-4 bg-slate-950/50 border border-white/10 rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-white cursor-pointer relative z-0">
                                {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n} dependente{n === 1 ? '' : 's'}</option>)}
                             </select>
                             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                          </div>
                          {fieldErrors.dependents && <p className="text-red-500 text-[10px] font-bold uppercase ml-1 mt-1">{fieldErrors.dependents}</p>}
                        </div>

                        {/* Password Fields */}
                        {!isRegistered && (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full pl-12 pr-12 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-white placeholder:text-slate-600" placeholder="Digite sua senha" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><Eye className="w-5 h-5"/></button>
                              </div>
                              {fieldErrors.password && <p className="text-red-500 text-[10px] font-bold uppercase ml-1 mt-1">{fieldErrors.password}</p>}
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input type={showConfirmPassword ? "text" : "password"} name="confirm_password" value={formData.confirm_password} onChange={handleChange} className="w-full pl-12 pr-12 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-white placeholder:text-slate-600" placeholder="Confirme sua senha" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><Eye className="w-5 h-5"/></button>
                              </div>
                              {fieldErrors.confirm_password && <p className="text-red-500 text-[10px] font-bold uppercase ml-1 mt-1">{fieldErrors.confirm_password}</p>}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Coupon Trigger & Area */}
                      {!isNoDiscountLink && (
                        <div className="mt-8">
                          <div 
                            className="flex items-center gap-4 cursor-pointer group" 
                            onClick={() => {
                              const nextState = !hasReferralCode;
                              setHasReferralCode(nextState);
                              if (nextState) {
                                setTimeout(() => {
                                  const el = document.getElementById('coupon-area');
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }, 100);
                              }
                            }}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${hasReferralCode ? 'bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-slate-950/50 border-white/10 group-hover:border-blue-500/50'}`}>
                              {hasReferralCode && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">Tenho um código de indicação ou cupom</span>
                          </div>

                          <AnimatePresence>
                            {hasReferralCode && (
                              <motion.div 
                                id="coupon-area"
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }} 
                                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }} 
                                className="overflow-hidden origin-top"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 pb-2">
                                  {/* Referral Column */}
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                      <Ticket className="w-3 h-3" /> Código de Indicação
                                    </h4>
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <input type="text" value={couponCode} onChange={e => !codeApplied && setCouponCode(e.target.value.toUpperCase())} readOnly={codeApplied} placeholder="CÓDIGO" className="w-full px-4 py-3 bg-slate-950/30 border border-white/10 rounded-xl text-center font-black text-white text-base tracking-[0.2em] focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-700" />
                                        {codeApplied && <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                                      </div>
                                      {!codeApplied && (
                                        <button type="button" onClick={() => validateDiscountCode()} disabled={isValidating || !couponCode.trim()} className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 transition-all disabled:opacity-50">
                                          {isValidating ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Validar'}
                                        </button>
                                      )}
                                    </div>
                                    {validationResult && <p className={`text-[9px] font-bold uppercase ${validationResult.isValid ? 'text-emerald-500' : 'text-red-500'}`}>{validationResult.message}</p>}
                                  </div>

                                  {/* Promo Column */}
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                      <Ticket className="w-3 h-3" /> Cupom Promocional
                                    </h4>
                                    {promotionalCouponValidation?.isValid ? (
                                      <div className="flex items-center justify-between p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <span className="font-black text-white text-[10px] tracking-widest">{promotionalCoupon}</span>
                                        <button type="button" onClick={removePromotionalCoupon} className="text-slate-400 hover:text-white transition-colors"><X className="w-3 h-3"/></button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <input type="text" value={promotionalCoupon} onChange={e => setPromotionalCoupon(e.target.value.toUpperCase())} placeholder="CUPOM" className="flex-1 px-4 py-3 bg-slate-950/30 border border-white/10 rounded-xl text-center font-black text-white text-base tracking-[0.2em] focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-700" />
                                        <button type="button" onClick={validatePromotionalCoupon} disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50">
                                          {isValidatingPromotionalCoupon ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Validar'}
                                        </button>
                                      </div>
                                    )}
                                    {promotionalCouponValidation && !promotionalCouponValidation.isValid && <p className="text-red-500 text-[9px] font-bold uppercase">{promotionalCouponValidation.message}</p>}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Terms */}
                      <div className="mt-8">
                        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => !isRegistered && setFormData(p => ({...p, termsAccepted: !p.termsAccepted}))}>
                           <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${formData.termsAccepted ? 'bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-slate-950/50 border-white/10 group-hover:border-blue-500/50'}`}>
                              {formData.termsAccepted && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                           </div>
                           <label htmlFor="terms" className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors cursor-pointer select-none">
                              Eu aceito e concordo com os <button type="button" onClick={(e) => { e.stopPropagation(); handleTermsClick(e); }} className="text-blue-400 hover:text-blue-300 underline font-black uppercase tracking-widest transition-colors">Termos e Condições</button> do contrato de prestação de serviços.
                           </label>
                        </div>
                        {fieldErrors.termsAccepted && <p className="text-red-500 text-[10px] font-bold uppercase ml-1 mt-2">{fieldErrors.termsAccepted}</p>}
                      </div>
                    </div>

                    {/* Step 2: Payment */}
                    <div className="space-y-8">
                      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                        <h3 className="text-xl font-black text-blue-400 mb-8 uppercase tracking-widest flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">2</div>
                          Forma de Pagamento
                        </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 'stripe', name: 'Cartão de Crédito', icon: StripeIcon, price: `$${cardAmountWithFees.toFixed(2)}` },
                          { id: 'pix', name: 'PIX (Brasil)', icon: PixIcon, price: `R$ ${pixAmountWithFees.toFixed(2)}` },
                          { id: 'zelle', name: 'Zelle (EUA)', icon: ZelleIcon, price: `$${currentFee.toFixed(2)}` },
                          { id: 'parcelow', name: 'Boleto/PIX Parcelado', icon: ParcelowIcon, price: `$${currentFee.toFixed(2)}` }
                        ].map((m) => (
                          <button key={m.id} type="button" onClick={() => setSelectedMethod(m.id as any)} className={`p-6 rounded-2xl border-2 transition-all flex flex-col gap-4 text-left group ${selectedMethod === m.id ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-white/5 bg-slate-950/30 hover:bg-slate-950/50'}`}>
                            <div className="flex items-center justify-between">
                              <m.icon className="w-12 h-12" />
                              <span className="text-lg font-black text-white leading-none tracking-tight">{m.price}</span>
                            </div>
                            <span className="font-bold text-slate-100 uppercase tracking-widest text-xs">{m.name}</span>
                          </button>
                        ))}
                      </div>

                      {selectedMethod === 'parcelow' && (
                        <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 block">Seu CPF (Para Parcelamento)</label>
                          <input type="text" value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: formatCPF(e.target.value)}))} placeholder="000.000.000-00" className="w-full p-4 bg-slate-950 border border-white/10 rounded-xl text-white font-black tracking-widest text-center" />
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

                {/* Sidebar Summary */}
                <div className="lg:col-span-1">
                  <div className="sticky top-24 space-y-6">
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
                      
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-4">Resumo do Pagamento</h3>
                      
                      <div className="space-y-6 mb-8 relative z-10">
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-white leading-none mb-6">
                            Taxa do Processo Seletivo
                          </span>
                          <div className="flex justify-between items-end">
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Total</span>
                            <div className="text-right flex flex-col items-end">
                              {currentFee < baseFee && (
                                <span className="text-xl font-bold text-slate-500 line-through mb-1 decoration-blue-500/50">
                                  {formatFeeAmount(baseFee)}
                                </span>
                              )}
                              <span className="text-4xl font-black text-white tracking-tighter">
                                {formattedAmount}
                              </span>
                              
                              {codeApplied && (
                                <div className="flex items-center justify-end mt-2">
                                  <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center">
                                    <Ticket className="w-2.5 h-2.5 mr-1" />
                                    Cupom Aplicado
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-widest text-left px-4">
                          A Taxa do Processo Seletivo é o primeiro pagamento obrigatório na plataforma MatriculaUSA. Ela desbloqueia seu acesso completo para visualizar todas as bolsas e iniciar seu processo de candidatura.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden text-left">
                      <h5 className="font-black text-white text-center uppercase tracking-widest mb-4">Garantia de Reembolso</h5>
                      <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-widest text-center">
                        Se você não for aceito em nenhuma universidade parceira, a taxa do processo seletivo será totalmente reembolsada.
                      </p>
                    </div>

                    <button
                      type="submit"
                      form="registration-form"
                      disabled={loading || (!formData.termsAccepted && !isRegistered)}
                      className={`w-full py-5 rounded-2xl flex items-center justify-center text-lg font-black uppercase tracking-widest transition-all shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale ${formData.termsAccepted || isRegistered ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-slate-800 text-slate-500'}`}
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Continuar com ${methodNames[selectedMethod]}`}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Terms Modal */}
      <Transition appear show={showTermsModal} as={React.Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setShowTermsModal(false)}>
          <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                   <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <Shield className="w-5 h-5 text-white" />
                         <Dialog.Title className="text-xl font-black text-white uppercase">Termos e Condições</Dialog.Title>
                      </div>
                      <button onClick={() => setShowTermsModal(false)} className="text-white hover:text-white/80 transition-colors"><X className="w-6 h-6"/></button>
                   </div>
                   <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                      {loadingTerms ? <Loader2 className="w-12 h-12 text-white animate-spin mx-auto py-20"/> : <div className="prose prose-invert max-w-none text-white leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: activeTerm?.content || '' }} />}
                    </div>
                   <div className="p-6 border-t border-white/10 flex justify-center"><button onClick={() => setShowTermsModal(false)} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all">Fechar</button></div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <PaymentLoadingOverlay show={loading && !showZelleCheckout} step={loadingStep} progress={loadingProgress} />
      
      <style>{`
        .vsl-phone-input input { background: transparent !important; border: none !important; color: white !important; font-weight: bold !important; width: 100% !important; padding: 0 !important; }
        .vsl-phone-input .PhoneInputCountry { margin-right: 12px; }
        .vsl-phone-input select, #registration-form select { background-color: #0f172a !important; color: white !important; }
        .vsl-phone-input option, #registration-form option { background-color: #0f172a !important; color: white !important; }
        .prose strong { color: white !important; font-weight: 800; }
        .prose p, .prose li, .prose ul, .prose ol { color: white !important; margin-bottom: 1.5rem; text-align: justify; }
        .prose h1, .prose h2, .prose h3 { color: white !important; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 900; margin-top: 2rem; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.5); border-radius: 4px; }
      `}</style>
      {/* Footer */}
      <footer className="py-12 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm font-medium">
            © 2026 Matrícula USA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default VslTransferLanding;
