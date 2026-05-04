import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Shield,
  X,
  ArrowLeft,
  Eye,
  EyeOff,
  Ticket,
  CheckCircle
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

// Mostrar o contador de urgência sempre que um cupom for aplicado

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
      <div className="bg-[#05294E] rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-center shadow-2xl border border-white/10 gap-6 sm:gap-10">
        {/* Text */}
        <div className="flex items-center">
          <span className="text-white font-black text-lg sm:text-xl tracking-tight text-center sm:text-left">
            {t('rapidRegistration.urgencyBanner.title')}
          </span>
        </div>

        {/* Timer */}
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
            {t('rapidRegistration.urgencyBanner.timeLeft')}
          </span>
        </div>
      </div>
    </div>
  );
};

// SVG Icons (Simplified for the registration page)
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
    <span
      className="text-white font-black text-[20px] sm:text-[28px] leading-[0] select-none"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transform: 'translateY(-1.5px)'
      }}
    >
      S
    </span>
  </div>
);

const ParcelowIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg overflow-hidden p-0.5 shadow-sm border border-gray-100`}>
    <img
      src="/parcelow_share.webp"
      alt="Parcelow"
      className="w-full h-full object-contain scale-110"
    />
  </div>
);

const QuickRegistration: React.FC = () => {
  const { t } = useTranslation(['registration', 'payment', 'common', 'auth']);
  const navigate = useNavigate();
  const location = useLocation();
  const { register, supabaseUser, userProfile, updateUserProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig();
  const { recordTermAcceptance } = useTermsAcceptance();
  const { trackFieldFilled, trackStepReached, trackFormSubmitted } = useFormTracking({ formName: 'quick_registration' });
  const { captureLead, markAsConverted } = useLeadCapture();

  // Helper handling onBlur to track and capture
  const handleFieldBlur = (fieldName: string) => {
    trackFieldFilled(fieldName);
    captureLead({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      source_page: 'quick_registration'
    });
  };

  interface Term {
    id: string;
    title: string;
    content: string;
    term_type: string;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
  }

  const { pendingPayment, rejectedPayment, loading: paymentBlockedLoading } = usePaymentBlocked();

  // Flag para verificar se já pagou
  const hasPaid = userProfile?.has_paid_selection_process_fee;

  // Se já houver um pagamento pendente ou rejeitado de Zelle do tipo selection_process,
  // abrimos o checkout do Zelle automaticamente no refresh para mostrar o status.
  useEffect(() => {
    if (!paymentBlockedLoading) {
      if (pendingPayment?.fee_type === 'selection_process' || rejectedPayment?.fee_type === 'selection_process') {
        setShowZelleCheckout(true);
        setSelectedMethod('zelle');
      }
    }
  }, [pendingPayment, rejectedPayment, paymentBlockedLoading]);

  // Form State
  const [formData, setFormData] = useState(() => {
    try {
      // 1. Check URL params first (from Pre-Qualification or exact linking)
      const searchParams = new URLSearchParams(window.location.search);
      const urlName = searchParams.get('name');
      const urlEmail = searchParams.get('email');
      const urlPhone = searchParams.get('phone');
      
      const saved = sessionStorage.getItem('matricula_quick_form');
      const parsed = saved ? JSON.parse(saved) : null;

      return {
        full_name: urlName || (parsed?.full_name || ''),
        email: urlEmail || (parsed?.email || ''),
        phone: urlPhone || (parsed?.phone || ''),
        dependents: parsed?.dependents || '',
        password: '',
        confirm_password: '',
        termsAccepted: false,
        cpf: parsed?.cpf || '',
        country: parsed?.country || '',
        field_of_interest: parsed?.field_of_interest || '',
        academic_level: parsed?.academic_level || '',
        english_proficiency: parsed?.english_proficiency || '',
        newsletter_consent: true
      };
    } catch {
      return {
        full_name: '',
        email: '',
        phone: '',
        dependents: '',
        password: '',
        confirm_password: '',
        termsAccepted: false,
        newsletter_consent: true,
        cpf: '',
        country: '',
        field_of_interest: '',
        academic_level: '',
        english_proficiency: ''
      };
    }
  });

  const [isRegistered, setIsRegistered] = useState(() => {
    return sessionStorage.getItem('matricula_quick_registered') === 'true';
  });

  // Atualiza os dados com base na sessão ativa
  useEffect(() => {
    if (supabaseUser) {
      setIsRegistered(true);
      setFormData((prev: any) => ({
        ...prev,
        full_name: userProfile?.full_name || prev.full_name,
        email: supabaseUser.email || prev.email,
        phone: userProfile?.phone || prev.phone,
        dependents: userProfile?.dependents !== undefined && userProfile?.dependents !== null ? userProfile.dependents : prev.dependents,
        termsAccepted: true
      }));
    }
  }, [supabaseUser, userProfile]);

  useEffect(() => {
    if (formData.full_name || formData.email) {
      sessionStorage.setItem('matricula_quick_form', JSON.stringify(formData));
    }
  }, [formData]);

  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState('');
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'pix' | 'zelle' | 'parcelow'>(() => {
    return (sessionStorage.getItem('matricula_quick_selected_method') as any) || 'stripe';
  });
  const [showZelleCheckout, setShowZelleCheckout] = useState(() => {
    return sessionStorage.getItem('matricula_quick_show_zelle') === 'true';
  });
  const [isZelleProcessing, setIsZelleProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Persistir método selecionado e estado do modal Zelle
  useEffect(() => {
    sessionStorage.setItem('matricula_quick_selected_method', selectedMethod);
  }, [selectedMethod]);

  useEffect(() => {
    sessionStorage.setItem('matricula_quick_show_zelle', String(showZelleCheckout));
  }, [showZelleCheckout]);

  // Loading Progress State
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Helper to simulate smooth progress within a range
  const simulateProgress = (start: number, end: number, duration: number) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      // Ease out quadratic
      const easedProgress = rawProgress === 1 ? 1 : 1 - Math.pow(1 - rawProgress, 2);
      const current = start + (end - start) * easedProgress;
      setLoadingProgress(current);
      if (rawProgress === 1) clearInterval(interval);
    }, 50);
    return interval;
  };

  const [activeIntervals, setActiveIntervals] = useState<NodeJS.Timeout[]>([]);

  const addInterval = (interval: NodeJS.Timeout) => {
    setActiveIntervals(prev => [...prev, interval]);
  };

  const clearAllIntervals = () => {
    activeIntervals.forEach(clearInterval);
    setActiveIntervals([]);
  };

  // Aligned with SelectionFeeStep coupon states
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    isSelfReferral?: boolean;
    codeType?: 'rewards' | 'seller';
  } | null>(null);
  const [codeApplied, setCodeApplied] = useState(false);

  // Detectar se o aluno chegou via link de rastreamento sem desconto (?sref=)
  // Nesse caso, ocultamos toda a seção de cupons — ele já está vinculado ao vendedor
  const isNoDiscountLink = new URLSearchParams(location.search).get('sref') !== null;

  // Promotional coupon states (admin coupons)
  const [isValidatingPromotionalCoupon, setIsValidatingPromotionalCoupon] = useState(false);
  const [promotionalCouponValidation, setPromotionalCouponValidation] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
    couponId?: string;
  } | null>(null);
  const [promotionalCoupon, setPromotionalCoupon] = useState('');

  // Auto-scroll to top when Zelle checkout is shown
  useEffect(() => {
    if (showZelleCheckout) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showZelleCheckout]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // CPF Mask/Format helper
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Terms state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);

  // Fees with Stripe fees
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [cardAmountWithFees, setCardAmountWithFees] = useState<number>(0);
  const [pixAmountWithFees, setPixAmountWithFees] = useState<number>(0);

  // Constants
  const baseFee = getFeeAmount('selection_process');

  // Calcular preço final com desconto (Lógica da SelectionFeeStep)
  const currentFee = (() => {
    // Se o tempo acabou, preço cheio sem choro
    if (timeLeft <= 0) return baseFee;

    // 1. Cupom promocional tem prioridade
    if (promotionalCouponValidation?.isValid && promotionalCouponValidation.finalAmount !== undefined) {
      return promotionalCouponValidation.finalAmount;
    }

    // 2. Código validado e aplicado — só aplica desconto se discount > 0 (exclui links sref)
    if ((isCouponValid || codeApplied) && validationResult?.isValid && (validationResult.discountAmount ?? 50) > 0) {
      const discount = validationResult.discountAmount || 50;
      return Math.max(baseFee - discount, 0);
    }

    return baseFee;
  })();

  const formattedAmount = formatFeeAmount(currentFee);


  // URL Parameter for Coupon
  // ?ref= e ?coupon= → aplicam desconto | ?sref= → apenas rastreamento sem desconto
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const srefCode = params.get('sref');
    const code = params.get('coupon') || params.get('ref');

    if (srefCode) {
      // Link de vendedor sem desconto: salvar apenas para rastreamento via userData
      // Não chamamos handleValidateCoupon para não aplicar $50 de desconto
      setCouponCode(srefCode.toUpperCase());
      setCodeApplied(true);
      setValidationResult({
        isValid: true,
        message: '',
        discountAmount: 0,
        codeType: 'seller',
      });
    } else if (code) {
      setCouponCode(code);
      handleValidateCoupon(code);
    }
  }, [location.search]);

  const handleValidateCoupon = async (code: string) => {
    if (!code) return;
    setHasReferralCode(true);
    await validateDiscountCode(code);
  };

  const validateDiscountCode = async (providedCode?: string) => {
    const targetCode = (providedCode || couponCode).trim().toUpperCase();

    if (!targetCode) {
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.pleaseEnterCode') || 'Please enter a code'
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      let codeType: 'rewards' | 'seller' = 'rewards';

      // Check if code exists and is active (checking both affiliate_codes and sellers)
      let { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes')
        .select('user_id, code, is_active')
        .eq('code', targetCode)
        .eq('is_active', true)
        .maybeSingle();

      // Fallback to sellers table if not found in affiliate_codes
      if (!affiliateCodeData && !affiliateError) {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('user_id, referral_code, is_active')
          .eq('referral_code', targetCode)
          .eq('is_active', true)
          .maybeSingle();

        if (sellerData) {
          codeType = 'seller';
          affiliateCodeData = {
            user_id: sellerData.user_id,
            code: sellerData.referral_code,
            is_active: sellerData.is_active
          };
        }
      }

      if (!affiliateCodeData) {
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.invalidCode') || 'Invalid code'
        });
        return;
      }

      // Check if not self-referral
      if (affiliateCodeData.user_id === supabaseUser?.id) {
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.selfReferral') || 'Self-referral not allowed'
        });
        return;
      }

      // Se já estiver logado/registrado, podemos aplicar no banco
      if (isRegistered && supabaseUser?.id && supabaseUser?.email) {
        const { data: result, error: validationError } = await supabase
          .rpc('validate_and_apply_referral_code', {
            user_id_param: supabaseUser.id,
            affiliate_code_param: targetCode,
            email_param: supabaseUser.email
          });

        if (validationError || !result?.success) {
          const errorMessage = validationError?.message || result?.error || t('preCheckoutModal.errorValidating') || 'Erro ao validar código';
          setValidationResult({
            isValid: false,
            message: errorMessage
          });
          return;
        }
      }

      // Se for apenas pré-registro, validamos localmente para a UI
      setValidationResult({
        isValid: true,
        message: t('preCheckoutModal.validCode') || 'Valid code! $50 discount applied',
        discountAmount: 50,
        codeType
      });
      setIsCouponValid(true);
      setCodeApplied(true);
      if (providedCode) setCouponCode(targetCode);

    } catch (error) {
      console.error('Error validating code:', error);
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.errorValidating') || 'Error validating code'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const validatePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim()) {
      setPromotionalCouponValidation({
        isValid: false,
        message: 'Please enter a coupon code'
      });
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
        setPromotionalCouponValidation({
          isValid: false,
          message: result?.message || 'Invalid coupon code'
        });
        return;
      }

      let dAmount = 0;
      if (result.discount_type === 'percentage') {
        dAmount = (baseFee * result.discount_value) / 100;
      } else {
        dAmount = result.discount_value;
      }

      dAmount = Math.min(dAmount, baseFee);
      const fAmount = Math.max(0, baseFee - dAmount);

      setPromotionalCouponValidation({
        isValid: true,
        message: `Coupon ${normalizedCode} applied! You saved $${dAmount.toFixed(2)}`,
        discountAmount: dAmount,
        finalAmount: fAmount,
        couponId: result.id
      });

    } catch (error: any) {
      console.error('Error validating promotional coupon:', error);
      setPromotionalCouponValidation({
        isValid: false,
        message: 'Failed to validate coupon'
      });
    } finally {
      setIsValidatingPromotionalCoupon(false);
    }
  };

  const removePromotionalCoupon = () => {
    setPromotionalCoupon('');
    setPromotionalCouponValidation(null);
  };

  // Load exchange rate and calculate fees
  useEffect(() => {
    const loadExchangeRate = async () => {
      const rate = await getExchangeRate();
      setExchangeRate(rate);
    };
    loadExchangeRate();
  }, []);

  useEffect(() => {
    if (currentFee > 0) {
      setCardAmountWithFees(calculateCardAmountWithFees(currentFee));
      if (exchangeRate) {
        setPixAmountWithFees(calculatePIXAmountWithFees(currentFee, exchangeRate));
      }
    }
  }, [currentFee, exchangeRate]);

  // Load active terms from database
  const loadActiveTerms = async () => {
    try {
      setLoadingTerms(true);
      const { data, error } = await supabase
        .from('application_terms')
        .select('*')
        .eq('term_type', 'checkout_terms')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading terms:', error);
        return;
      }

      if (data && data.length > 0) {
        setActiveTerm(data[0]);
      }
    } catch (err) {
      console.error('Unexpected error loading terms:', err);
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleTermsClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await loadActiveTerms();
    setShowTermsModal(true);
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
        name === 'dependents' ? (value === '' ? '' : parseInt(value)) : value
    }));

    // Limpar erro do campo ao digitar
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleRegisterAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    trackFormSubmitted();
    trackStepReached(2, 'payment');

    if (userProfile?.has_paid_selection_process_fee) {
      if (!userProfile?.selection_survey_passed) {
        navigate('/student/onboarding?step=selection_fee&payment=success');
      } else {
        navigate('/student/dashboard');
      }
      return;
    }

    if (isRegistered) {
      setLoading(true);
      setError(null);
      try {
        if (selectedMethod === 'parcelow') {
          if (!formData.cpf || formData.cpf.length < 14) {
            setFieldErrors({ cpf: t('rapidRegistration.payment.cpf.error') || 'CPF é obrigatório para pagamento via Parcelow.' });
            setLoading(false);
            return;
          }
          // Update profile if CPF is missing
          if (!userProfile?.cpf_document || userProfile.cpf_document !== formData.cpf) {
            await updateUserProfile({ cpf_document: formData.cpf });
          }
        }

        if (selectedMethod === 'stripe' || selectedMethod === 'pix' || selectedMethod === 'parcelow' || !selectedMethod) {
          await handlePaymentCheckout(selectedMethod || 'stripe');
        } else if (selectedMethod === 'zelle') {
          setShowZelleCheckout(true);
          setLoading(false);
        } else {
          throw new Error(t('rapidRegistration.payment.error.invalidMethod') || 'Método de pagamento inválido.');
        }
      } catch (err: any) {
        setError(err.message || 'Error occurred');
        setLoading(false);
      }
      return;
    }

    const newFieldErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) newFieldErrors.full_name = t('common.required_field', 'Campo obrigatório');
    if (!formData.email.trim()) newFieldErrors.email = t('common.required_field', 'Campo obrigatório');
    if (!formData.phone.trim()) newFieldErrors.phone = t('common.required_field', 'Campo obrigatório');

    if (formData.password !== formData.confirm_password) {
      newFieldErrors.password = t('rapidRegistration.form.error.passwordsNotMatch') || 'As senhas não coincidem';
      newFieldErrors.confirm_password = t('rapidRegistration.form.error.passwordsNotMatch') || 'As senhas não coincidem';
    }

    if (formData.dependents === '') {
      newFieldErrors.dependents = 'Por favor, selecione o número de dependentes.';
    }

    if (!formData.termsAccepted) {
      newFieldErrors.termsAccepted = t('rapidRegistration.form.error.terms') || 'Você deve aceitar os termos';
    }

    if (selectedMethod === 'parcelow' && (!formData.cpf || formData.cpf.length < 14)) {
      newFieldErrors.cpf = t('rapidRegistration.payment.cpf.error') || 'CPF é obrigatório para pagamento via Parcelow.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setLoading(false);
      // Rolar para o primeiro erro
      const firstErrorField = Object.keys(newFieldErrors)[0];
      const element = document.getElementsByName(firstErrorField)[0] || document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setFieldErrors({});

    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    setLoadingStep("Criando sua conta com segurança...");
    const regInterval = simulateProgress(0, 30, 2000);
    addInterval(regInterval);

    try {
      // Direct Sales check (SUAIDEN ou BRANT logic for auto package)
      const isDirectSalesCode = codeApplied && ['SUAIDEN', 'BRANT'].includes((couponCode || '').toUpperCase());

      // 1. Register User
      const userData: any = {
        full_name: formData.full_name,
        phone: formData.phone,
        dependents: formData.dependents,
        role: 'student' as const,
        cpf_document: formData.cpf, // Include CPF in metadata
        newsletter_consent: formData.newsletter_consent
      };

      if (codeApplied && couponCode && validationResult?.codeType) {
        if (validationResult.codeType === 'seller') {
          userData.seller_referral_code = couponCode;
          // Link ?sref= = rastreamento sem desconto → marcar no perfil para o dashboard mostrar $400
          if (isNoDiscountLink) {
            userData.no_referral_discount = true;
          }
        } else {
          userData.affiliate_code = couponCode;
        }
      }

      if (isDirectSalesCode) {
        userData.scholarship_package_number = 3;
        userData.desired_scholarship_range = 4500;
      }

      const result = await register(formData.email, formData.password, userData);

      // 2. Upload Identity Photo and record Terms Acceptance
      if (result?.user?.id) {
        // Record terms acceptance first
        if (activeTerm) {
          try {
            await recordTermAcceptance(activeTerm.id, 'checkout_terms', result.user.id);
          } catch (termErr) {
            console.error('Failed to record terms:', termErr);
            // Continue anyway, registration was successful
          }
        }
      }

      setIsRegistered(true);
      sessionStorage.setItem('matricula_quick_registered', 'true');
      markAsConverted(formData.email);
      clearInterval(regInterval);
      setLoadingProgress(30);

      // 3. Initiate Payment
      if (selectedMethod === 'stripe' || selectedMethod === 'pix' || selectedMethod === 'parcelow' || !selectedMethod) {
        await handlePaymentCheckout(selectedMethod || 'stripe');
      } else if (selectedMethod === 'zelle') {
        setShowZelleCheckout(true);
        setLoading(false);
      } else {
        throw new Error(t('rapidRegistration.payment.error.invalidMethod') || 'Método de pagamento inválido.');
      }

    } catch (err: any) {
      clearAllIntervals();
      console.error('Registration failed:', err);
      setError(err.message || t('rapidRegistration.form.error.general', 'Ocorreu um erro no registro.'));
      setLoading(false);
    }
  };

  const handlePaymentCheckout = async (method: 'stripe' | 'pix' | 'parcelow') => {
    const startProgress = loadingProgress || 0;
    setLoadingStep("Validando seus dados...");
    const authInterval = simulateProgress(startProgress, Math.max(startProgress + 20, 60), 3000);
    addInterval(authInterval);

    try {
      let sessionData = null;
      let token = null;

      // 🎯 CORREÇÃO SAFARI: Lógica de retentativa para obter a sessão
      // Em alguns navegadores (como Safari Mobile), o getSession pode retornar nulo 
      // imediatamente após um login/registro automático devido a race conditions de armazenamento.
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          sessionData = data;
          token = data.session.access_token;
          console.log(`✅ [QuickRegistration] Sessão obtida na tentativa ${i + 1}`);
          break;
        }

        if (i < 4) {
          console.log(`⏳ [QuickRegistration] Sessão não encontrada, tentando novamente em ${(i + 1) * 500}ms... (Tentativa ${i + 1}/5)`);
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 500));
        }
      }

      if (!token || !sessionData?.session) {
        console.error('❌ [QuickRegistration] Falha crítica: Sessão não encontrada após 5 tentativas');
        throw new Error(t('rapidRegistration.payment.error.notAuthenticated', 'Usuário não autenticado.'));
      }

      clearInterval(authInterval);
      setLoadingProgress(60);
      setLoadingStep("Preparando seu checkout seguro...");
      const fetchInterval = simulateProgress(60, 90, 4000);
      addInterval(fetchInterval);

      const sessionUser = sessionData.session.user;

      let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
      if (method === 'parcelow') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-selection-process`;
      }

      // Metadata estruturado para o webhook e tracking
      const paymentMetadata = {
        student_id: sessionUser.id,
        user_id: sessionUser.id,
        email: sessionUser.email,
        full_name: formData.full_name,
        phone: formData.phone,
        country: formData.country,
        cpf: formData.cpf,
        field_of_interest: formData.field_of_interest,
        academic_level: formData.academic_level,
        english_proficiency: formData.english_proficiency,
        affiliate_code: (codeApplied && timeLeft > 0) ? couponCode : undefined,
        promotional_coupon: (promotionalCouponValidation?.isValid && timeLeft > 0) ? promotionalCoupon : undefined,
        registration_source: 'quick_registration',
        fee_type: 'selection_process',
        payment_method: method
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: STRIPE_PRODUCTS.selectionProcess.priceId,
          amount: currentFee,
          payment_method: method,
          success_url: `${window.location.origin}/student/onboarding?step=selection_fee&payment=success&session_id={CHECKOUT_SESSION_ID}&pm=${method === 'pix' ? 'pix' : 's'}`,
          cancel_url: window.location.href,
          mode: 'payment',
          payment_type: 'selection_process',
          fee_type: 'selection_process',
          metadata: paymentMetadata,
          // Campos no root para compatibilidade
          user_id: sessionUser.id,
          email: sessionUser.email,
          cpf: formData.cpf
        })
      });

      const data = await response.json();

      const paymentUrl = data.session_url || data.url || data.checkout_url;

      if (paymentUrl) {
        clearInterval(fetchInterval);
        setLoadingProgress(100);
        setLoadingStep("Redirecionando para o pagamento...");
        
        // Limpar persistência antes de redirecionar para fora
        sessionStorage.removeItem('matricula_quick_selected_method');
        sessionStorage.removeItem('matricula_quick_show_zelle');
        
        // Pequeno delay para o usuário ver o 100%
        await new Promise(resolve => setTimeout(resolve, 800));
        window.location.href = paymentUrl;
      } else {
        throw new Error(data.error || t('rapidRegistration.payment.error.generationFailed', 'Falha ao gerar link de pagamento. Tente novamente.'));
      }
    } catch (err: any) {
      clearAllIntervals();
      console.error('Payment redirect failed:', err);
      throw err;
    }
  };

  const getButtonText = () => {
    const methodNames: Record<string, string> = {
      stripe: t('rapidRegistration.payment.methods.stripe', 'Cartão de Crédito'),
      pix: t('rapidRegistration.payment.methods.pix', 'PIX'),
      parcelow: t('rapidRegistration.payment.methods.parcelow', 'Parcelow'),
      zelle: t('rapidRegistration.payment.methods.zelle', 'Zelle')
    };

    const methodLabel = methodNames[selectedMethod || ''];

    if (methodLabel) {
      return t('rapidRegistration.payment.payWith', { method: methodLabel });
    }

    return isRegistered
      ? (t('rapidRegistration.payment.securePayment', 'Pagar de Forma Segura'))
      : (t('rapidRegistration.form.submit', 'Confirmar Registro'));
  };

  if (showZelleCheckout) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pt-12 pb-32">
        <div className="max-w-4xl w-full relative">
          {!isZelleProcessing && (
            <button
              onClick={() => setShowZelleCheckout(false)}
              className="flex items-center gap-2 text-gray-500 font-bold hover:text-[#05294E] transition-all mb-8 group"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              {t('rapidRegistration.zelle.back')}
            </button>
          )}

          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-8 overflow-hidden">
            <ZelleCheckout
              amount={currentFee}
              feeType="selection_process"
              onSuccess={() => {
                sessionStorage.removeItem('matricula_quick_selected_method');
                sessionStorage.removeItem('matricula_quick_show_zelle');
                navigate('/student/onboarding?step=selection_fee&payment=success');
              }}
              onProcessingChange={setIsZelleProcessing}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          {(codeApplied || promotionalCouponValidation?.isValid) && (
            <UrgencyBanner timeLeft={timeLeft} />
          )}
          <h1 className="text-4xl font-extrabold text-grey-900 tracking-tight sm:text-5xl">
            {t('rapidRegistration.title')}
          </h1>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Registration Form */}
          <div className="lg:col-span-2 space-y-8">
            <form id="registration-form" onSubmit={handleRegisterAndPay} className="space-y-8">
              {/* Seção 1: Informações da Conta & Termos */}
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                <div className="relative z-10 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Full Name */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
                        <span className="text-[#D0151C] font-bold mr-1">*</span>
                        {t('rapidRegistration.form.fullName')}
                      </label>
                      <div className="relative mt-auto">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          name="full_name"
                          required
                          value={formData.full_name}
                          onChange={handleChange}
                          onBlur={() => handleFieldBlur('full_name')}
                          disabled={isRegistered}
                          placeholder={t('rapidRegistration.form.placeholders.fullName')}
                          className={`block w-full pl-12 pr-4 py-3.5 border ${fieldErrors.full_name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200'} rounded-2xl outline-none focus:outline-none focus:ring-2 ${fieldErrors.full_name ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-[#05294E] focus:border-[#05294E]'} text-slate-900 bg-slate-50/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                      </div>
                      {fieldErrors.full_name && (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                          {fieldErrors.full_name}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
                        <span className="text-[#D0151C] font-bold mr-1">*</span>
                        {t('rapidRegistration.form.email')}
                      </label>
                      <div className="relative mt-auto">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={() => handleFieldBlur('email')}
                          disabled={isRegistered}
                          placeholder={t('rapidRegistration.form.placeholders.email')}
                          className={`block w-full pl-12 pr-4 py-3.5 border ${fieldErrors.email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200'} rounded-2xl outline-none focus:outline-none focus:ring-2 ${fieldErrors.email ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-[#05294E] focus:border-[#05294E]'} text-slate-900 bg-slate-50/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
                        <span className="text-[#D0151C] font-bold mr-1">*</span>
                        {t('rapidRegistration.form.phone')}
                      </label>
                      <div className="relative mt-auto">
                        <PhoneInput
                          international
                          defaultCountry="US"
                          addInternationalOption={false}
                          limitMaxLength={true}
                          maxLength={20}
                          value={formData.phone}
                          disabled={isRegistered}
                          onBlur={() => handleFieldBlur('phone')}
                          onChange={(value) => {
                            setFormData((prev: any) => ({ ...prev, phone: value || '' }));
                            if (fieldErrors.phone) {
                              setFieldErrors(prev => {
                                const next = { ...prev };
                                delete next.phone;
                                return next;
                              });
                            }
                          }}
                          className={`quick-registration-phone w-full px-4 py-3.5 bg-slate-50/50 border ${fieldErrors.phone ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200'} rounded-2xl outline-none focus-within:outline-none focus-within:ring-2 ${fieldErrors.phone ? 'focus-within:ring-red-500 focus-within:border-red-500' : 'focus-within:ring-[#05294E] focus-within:border-[#05294E]'} text-slate-900 transition-all duration-300 ${isRegistered ? 'opacity-50 cursor-not-allowed' : ''}`}
                          placeholder={t('rapidRegistration.form.placeholders.phone')}
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Dependents Selector */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1 leading-tight">
                        <span className="text-[#D0151C] font-bold mr-1">*</span>
                        {t('rapidRegistration.form.dependents')}
                        <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                          {t('rapidRegistration.form.dependentsSubtitle') || 'Family members (spouse and/or children)'}
                        </span>
                      </label>
                      <div className="relative mt-auto">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                          <Users className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none z-10">
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <select
                          id="dependents"
                          name="dependents"
                          value={formData.dependents}
                          disabled={isRegistered}
                          required
                          onBlur={() => trackFieldFilled('dependents')}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : parseInt(e.target.value);
                            setFormData((prev: any) => ({ ...prev, dependents: value }));
                            if (fieldErrors.dependents) {
                              setFieldErrors(prev => {
                                const next = { ...prev };
                                delete next.dependents;
                                return next;
                              });
                            }
                          }}
                          className={`appearance-none block w-full pl-12 pr-12 py-3.5 border ${fieldErrors.dependents ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200'} rounded-2xl outline-none focus:outline-none focus:ring-2 ${fieldErrors.dependents ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-[#05294E] focus:border-[#05294E]'} ${formData.dependents === '' ? 'text-slate-400' : 'text-slate-900'} bg-slate-50/50 transition-all duration-300 text-sm sm:text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <option value="" disabled hidden className="text-slate-400">{t('common.select', 'Selecione')}</option>
                          <option value={0} className="text-slate-900">{t('rapidRegistration.form.dependentOptions.count', { count: 0 })}</option>
                          <option value={1} className="text-slate-900">{t('rapidRegistration.form.dependentOptions.count', { count: 1 })}</option>
                          <option value={2} className="text-slate-900">{t('rapidRegistration.form.dependentOptions.count', { count: 2 })}</option>
                          <option value={3} className="text-slate-900">{t('rapidRegistration.form.dependentOptions.count', { count: 3 })}</option>
                          <option value={4} className="text-slate-900">{t('rapidRegistration.form.dependentOptions.count', { count: 4 })}</option>
                          <option value={5} className="text-slate-900">{t('rapidRegistration.form.dependentOptions.count', { count: 5 })}</option>
                        </select>
                      </div>
                      {fieldErrors.dependents && (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                          {fieldErrors.dependents}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    {!isRegistered && (
                      <div className="flex flex-col">
                        <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
                          <span className="text-[#D0151C] font-bold mr-1">*</span>
                          {t('rapidRegistration.form.password')}
                        </label>
                        <div className="relative mt-auto">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400" />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required={!isRegistered}
                            minLength={6}
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={() => trackFieldFilled('password')}
                            disabled={isRegistered}
                            placeholder={t('rapidRegistration.form.placeholders.password')}
                            className={`block w-full pl-12 pr-12 py-3.5 border ${fieldErrors.password ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200'} rounded-2xl outline-none focus:outline-none focus:ring-2 ${fieldErrors.password ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-[#05294E] focus:border-[#05294E]'} text-slate-900 bg-slate-50/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isRegistered}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-red-500 text-xs font-bold mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                            {fieldErrors.password}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Confirm Password */}
                    {!isRegistered && (
                      <div className="flex flex-col">
                        <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
                          <span className="text-[#D0151C] font-bold mr-1">*</span>
                          {t('rapidRegistration.form.confirmPassword')}
                        </label>
                        <div className="relative mt-auto">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400" />
                          </div>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirm_password"
                            required={!isRegistered}
                            minLength={6}
                            value={formData.confirm_password}
                            onChange={handleChange}
                            onBlur={() => trackFieldFilled('confirm_password')}
                            disabled={isRegistered}
                            placeholder={t('rapidRegistration.form.placeholders.confirmPassword')}
                            className={`block w-full pl-12 pr-12 py-3.5 border ${fieldErrors.confirm_password ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200'} rounded-2xl outline-none focus:outline-none focus:ring-2 ${fieldErrors.confirm_password ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-[#05294E] focus:border-[#05294E]'} text-slate-900 bg-slate-50/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isRegistered}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        {fieldErrors.confirm_password && (
                          <p className="text-red-500 text-xs font-bold mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                            {fieldErrors.confirm_password}
                          </p>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Seção Agrupada: Cupons e Termos (Coladinhos) */}
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
                    {!isNoDiscountLink && !userProfile?.seller_referral_code && !codeApplied && !hasPaid && (
                      <div className="relative z-10">
                        {/* Checkbox para Referral Code */}
                        <div className="flex items-center space-x-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl group transition-all duration-300 hover:bg-white shadow-sm cursor-pointer" onClick={() => {
                          setHasReferralCode(!hasReferralCode);
                        }}>
                          <input
                            id="hasReferralCode"
                            type="checkbox"
                            checked={hasReferralCode}
                            onChange={(e) => {
                              setHasReferralCode(e.target.checked);
                              if (!e.target.checked) {
                                setCouponCode('');
                                setValidationResult(null);
                                setCodeApplied(false);
                                setIsCouponValid(false);
                              }
                            }}
                            className="h-5 w-5 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E] cursor-pointer"
                          />
                          <label
                            htmlFor="hasReferralCode"
                            className="text-sm text-slate-700 font-medium leading-relaxed cursor-pointer flex-1"
                            onClick={(e) => {
                              // Parent already has the toggle logic, but let's make it robust
                              e.preventDefault();
                              const newState = !hasReferralCode;
                              setHasReferralCode(newState);
                              if (!newState) {
                                setCouponCode('');
                                setValidationResult(null);
                                setCodeApplied(false);
                                setIsCouponValid(false);
                              }
                            }}
                          >
                            {t('preCheckoutModal.haveReferralCode') || 'Eu tenho um código de indicação'}
                          </label>
                        </div>

                        {/* Área de Input de Cupons */}
                        {!isNoDiscountLink && (hasReferralCode || promotionalCouponValidation?.isValid || codeApplied) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 pb-2">
                            {/* ... (Referral e Promo Columns mantidos) */}
                            {/* Referral Code Column */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <Ticket className="w-3 h-3 mr-2" />
                                {t('preCheckoutModal.referralCode') || 'Código de Indicação'}
                              </h4>

                              <div className="flex gap-2">
                                <div className="relative flex-1 group/input">
                                  <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => {
                                      if (!codeApplied) {
                                        setCouponCode(e.target.value.toUpperCase());
                                      }
                                    }}
                                    placeholder={t('payment:preCheckoutModal.placeholder') || 'Digite o código'}
                                    readOnly={codeApplied}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E] transition-all text-center font-black text-slate-900 text-lg tracking-[0.2em] placeholder:text-slate-300 disabled:opacity-50"
                                  />
                                  {codeApplied && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                  )}
                                </div>

                                {!codeApplied && (
                                  <button
                                    type="button"
                                    onClick={() => validateDiscountCode()}
                                    disabled={isValidating || !couponCode.trim()}
                                    className={`px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 ${isValidating || !couponCode.trim()
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                      : 'bg-[#05294E] text-white hover:bg-[#063a6e] border border-[#05294E]/50'
                                      }`}
                                  >
                                    {isValidating ? (
                                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                    ) : (
                                      t('payment:paymentSelector.promotionalCoupon.validate') || 'Validar'
                                    )}
                                  </button>
                                )}
                              </div>

                              {validationResult && (
                                <div className={`flex items-center gap-2 text-xs font-bold p-3 rounded-lg ${validationResult.isValid ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-red-500 bg-red-50 border border-red-100'}`}>
                                  {validationResult.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                  {validationResult.message}
                                </div>
                              )}
                            </div>

                            {/* Promotional Coupon Column */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <Ticket className="w-3 h-3 mr-2" />
                                {t('rapidRegistration.coupons.promotionalLabel') || 'Cupom Promocional'}
                              </h4>

                              {promotionalCouponValidation?.isValid ? (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-inner">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-emerald-100">
                                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-black text-emerald-600/50 uppercase block tracking-widest leading-none mb-1">{t('registration:rapidRegistration.sidebar.couponApplied')}</span>
                                      <span className="text-lg font-black text-emerald-700 uppercase tracking-tight">{promotionalCoupon}</span>
                                    </div>
                                  </div>
                                  <button type="button" onClick={removePromotionalCoupon} className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all border border-slate-100 hover:border-red-100">
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <div className="relative flex-1 group/input">
                                    <input
                                      type="text"
                                      value={promotionalCoupon}
                                      onChange={(e) => setPromotionalCoupon(e.target.value.toUpperCase())}
                                      placeholder={t('payment:preCheckoutModal.placeholder') || 'Digite o código'}
                                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E] transition-all text-center font-black text-slate-900 text-lg tracking-[0.2em] placeholder:text-slate-300"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={validatePromotionalCoupon}
                                    disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()}
                                    className={`px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 ${isValidatingPromotionalCoupon || !promotionalCoupon.trim()
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                      : 'bg-[#05294E] text-white hover:bg-[#063a6e] border border-[#05294E]/50'
                                      }`}
                                  >
                                    {isValidatingPromotionalCoupon ? (
                                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                    ) : (
                                      t('payment:paymentSelector.promotionalCoupon.validate') || 'Validar'
                                    )}
                                  </button>
                                </div>
                              )}

                              {promotionalCouponValidation && !promotionalCouponValidation.isValid && (
                                <div className="flex items-center gap-2 text-xs font-bold p-3 rounded-lg text-red-500 bg-red-50 border border-red-100">
                                  <AlertCircle className="w-4 h-4" />
                                  {promotionalCouponValidation.message}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`flex items-start space-x-3 p-4 border rounded-2xl group/terms transition-colors duration-300 ${formData.termsAccepted || isRegistered
                        ? 'border-gray-100 bg-emerald-50/20'
                        : fieldErrors.termsAccepted
                          ? 'border-red-500 bg-red-50/10 shadow-[0_0_20px_rgba(239,68,68,0.05)]'
                          : 'bg-gray-50 border-gray-100 hover:bg-gray-100/50'
                        }`}
                    >
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id="termsAccepted"
                          name="termsAccepted"
                          type="checkbox"
                          required={!isRegistered}
                          disabled={isRegistered || formData.termsAccepted}
                          checked={formData.termsAccepted || isRegistered}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData((prev: any) => ({ ...prev, termsAccepted: true }));
                              if (fieldErrors.termsAccepted) {
                                setFieldErrors(prev => {
                                  const next = { ...prev };
                                  delete next.termsAccepted;
                                  return next;
                                });
                              }
                            }
                          }}
                          className="h-5 w-5 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div
                          className="text-sm text-gray-700 leading-relaxed block font-medium"
                        >
                          <span className="text-[#D0151C] font-bold mr-1">*</span>
                          {t('preCheckoutModal.acceptPrefix', 'Eu aceito os ')}
                          <button
                            type="button"
                            onClick={(e) => handleTermsClick(e)}
                            className="text-blue-600 hover:text-blue-800 underline font-bold px-1"
                          >
                            {t('preCheckoutModal.termsAndConditionsLink', 'termos e condições')}
                          </button>
                          {t('preCheckoutModal.acceptSuffix', ' do contrato de prestação de serviços.')}
                        </div>
                        {formData.termsAccepted && (
                          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center mt-1">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t('rapidRegistration.form.termsAcceptedBadge') || 'Termos Aceitos'}
                          </span>
                        )}
                        {fieldErrors.termsAccepted && (
                          <p className="text-red-500 text-xs font-bold mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                            {fieldErrors.termsAccepted}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Newsletter Consent Checkbox */}
                    {!isRegistered && (
                      <div className="flex items-start space-x-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl group transition-all duration-300 hover:bg-white shadow-sm cursor-pointer" onClick={() => {
                        setFormData((prev: any) => ({ ...prev, newsletter_consent: !prev.newsletter_consent }));
                      }}>
                        <div className="flex items-center h-5 mt-0.5">
                          <input
                            id="newsletter_consent"
                            name="newsletter_consent"
                            type="checkbox"
                            checked={formData.newsletter_consent}
                            onChange={(e) => {
                              setFormData((prev: any) => ({ ...prev, newsletter_consent: e.target.checked }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E] cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <label
                            htmlFor="newsletter_consent"
                            className="text-sm text-slate-700 font-medium leading-relaxed cursor-pointer block"
                          >
                            {t('authPage.register.newsletterConsent', { ns: 'auth' })}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 2: Método de Pagamento */}
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-grey-900 mb-8 flex items-center uppercase tracking-tight">
                    {t('rapidRegistration.payment.selectMethod')}
                  </h3>

                  <div className={`space-y-4 ${hasPaid ? 'filter blur-[4px] opacity-40 pointer-events-none select-none transition-all duration-300' : ''}`}>
                    {[
                      { id: 'stripe' as const, name: t('rapidRegistration.payment.methods.stripe'), icon: StripeIcon },
                      { id: 'pix' as const, name: t('rapidRegistration.payment.methods.pix'), icon: PixIcon },
                      { id: 'parcelow' as const, name: t('rapidRegistration.payment.methods.parcelow'), icon: ParcelowIcon },
                      { id: 'zelle' as const, name: t('rapidRegistration.payment.methods.zelle'), icon: ZelleIcon }
                    ].map((method) => {
                      const Icon = method.icon;
                      const isSelected = selectedMethod === method.id;
                      const isFormValid = formData.full_name && formData.email && formData.phone && formData.password && formData.confirm_password;
                      const isDisabled = !isRegistered && (!isFormValid || !formData.termsAccepted);

                      return (
                        <React.Fragment key={method.id}>
                          <button
                            key={method.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setSelectedMethod(method.id)}
                            className={`w-full pl-2 pr-5 py-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group/method ${isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                              } ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'}`}
                          >
                            <div className="flex flex-col relative z-10 w-full">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center space-x-2 sm:space-x-5">
                                  <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl bg-white border border-gray-100 transition-transform duration-500 group-hover/method:scale-110 shadow-sm">
                                    <Icon className="w-6 h-6 sm:w-10 sm:h-10 text-gray-700" />
                                  </div>
                                  <h4 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">{method.name}</h4>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-3">
                                  {method.id === 'stripe' && (
                                    <span className="text-grey-900 text-base sm:text-lg font-black px-1 sm:px-2">${cardAmountWithFees.toFixed(2)}</span>
                                  )}
                                  {method.id === 'pix' && exchangeRate && (
                                    <span className="text-grey-900 text-base sm:text-lg font-black px-1 sm:px-2">R$ {pixAmountWithFees.toFixed(2)}</span>
                                  )}
                                  {method.id === 'parcelow' && (
                                    <div className="flex flex-col items-end">
                                      <span className="text-grey-900 text-base sm:text-lg font-black px-1 sm:px-2">${currentFee.toFixed(2)}</span>
                                      <span className="text-[10px] sm:text-xs font-bold text-black mt-0.5 whitespace-nowrap">{t('rapidRegistration.payment.installment')}</span>
                                    </div>
                                  )}
                                  {method.id === 'zelle' && (
                                    <span className="text-grey-900 text-base sm:text-lg font-black px-1 sm:px-2">${currentFee.toFixed(2)}</span>
                                  )}
                                </div>
                              </div>

                              {/* Rodapé do método - Notas e observações */}
                              <div className="mt-2 sm:mt-1 sm:pl-[68px]">
                                {method.id === 'stripe' && (
                                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-tight block">{t('rapidRegistration.payment.notes.processingFees')}</span>
                                )}
                                {method.id === 'pix' && (
                                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-tight block">{t('rapidRegistration.payment.notes.processingFees')}</span>
                                )}
                                {method.id === 'parcelow' && (
                                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-tight block">{t('rapidRegistration.payment.notes.parcelowFees')}</span>
                                )}
                                {method.id === 'zelle' && (
                                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-tight flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                    {t('rapidRegistration.payment.notes.zelleTime')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Inline CPF Field - Only for Parcelow when selected */}
                          {method.id === 'parcelow' && isSelected && (
                            <div className="mt-2 ml-4 mr-4 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <label className="block text-[10px] font-black text-blue-900/60 uppercase tracking-widest mb-2 leading-tight">
                                  {t('rapidRegistration.payment.cpf.label')}
                                </label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    name="cpf"
                                    required
                                    disabled={loading}
                                    value={formData.cpf}
                                    onChange={(e) => {
                                      const formatted = formatCPF(e.target.value);
                                      setFormData((prev: any) => ({ ...prev, cpf: formatted }));
                                    }}
                                    placeholder={t('rapidRegistration.payment.cpf.placeholder')}
                                    className={`block w-full px-4 py-3 border ${fieldErrors.cpf ? 'border-red-500 ring-2 ring-red-500/10' : 'border-blue-200/50'} rounded-xl outline-none focus:outline-none focus:ring-2 ${fieldErrors.cpf ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} text-sm font-bold text-slate-900 bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                                  />
                                </div>
                                {fieldErrors.cpf && (
                                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                    {fieldErrors.cpf}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {hasPaid && (
                    <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col items-center justify-center z-20 bg-white/20 backdrop-blur-[2px] rounded-b-3xl">
                      <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center shadow-2xl max-w-sm w-full mx-4 transform transition-all">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h4 className="text-xl font-black text-emerald-900 uppercase tracking-tight mb-2">
                          {t('rapidRegistration.payment.alreadyPaid.title', 'Taxa Já Paga!')}
                        </h4>
                        <p className="text-emerald-700 text-sm mb-8 font-medium leading-relaxed">
                          {t('rapidRegistration.payment.alreadyPaid.description', 'Você já realizou o pagamento da taxa do processo seletivo. Pode prosseguir com sua inscrição.')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (!userProfile?.selection_survey_passed) {
                              navigate('/student/onboarding?step=identity_verification');
                            } else {
                              navigate('/student/dashboard');
                            }
                          }}
                          className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-lg hover:bg-emerald-700 hover:shadow-xl hover:scale-105 active:scale-95"
                        >
                          {t('rapidRegistration.payment.alreadyPaid.continue', 'Continuar no Onboarding')}
                        </button>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-8 p-4 bg-red-50 rounded-xl flex items-center text-red-700 text-sm">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </form>
            <div className="h-12"></div> {/* Spacing below payment method */}
          </div>

          {/* Right: Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                <h3 className="text-2xl font-black text-slate-900 mb-8 pb-4 border-b border-slate-50 flex items-center uppercase tracking-tight relative z-10">
                  {t('rapidRegistration.sidebar.title')}
                </h3>

                <div className="space-y-6 mb-8 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-xl font-black text-slate-900 leading-none whitespace-nowrap mb-6">
                      {t('rapidRegistration.sidebar.selectionFee', 'Taxa do Processo Seletivo')}
                    </span>
                    <div className="flex justify-between items-end">
                      <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        {t('rapidRegistration.sidebar.total')}
                      </span>
                      <div className="text-right">
                        <div className="flex flex-col items-end">
                          {/* Preço Original Riscado (Apenas se houver desconto) */}
                          {currentFee < baseFee && (
                            <span className="text-xl font-bold text-slate-400 line-through mb-1 decoration-red-500/50">
                              {formatFeeAmount(baseFee)}
                            </span>
                          )}
                          <span className="text-4xl font-black text-grey-900 tracking-tighter">
                            {formattedAmount}
                          </span>
                        </div>

                        {isCouponValid && timeLeft > 0 && (
                          <div className="flex items-center justify-end mt-1">
                            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center">
                              <Ticket className="w-2.5 h-2.5 mr-1" />
                              {t('rapidRegistration.sidebar.couponApplied')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                      {t('rapidRegistration.sidebar.feeExplanation')}
                    </p>
                  </div>
                </div>

              </div>




              {/* Refund Assurance Note */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h5 className="font-black text-slate-900 text-sm uppercase tracking-widest">{t('rapidRegistration.sidebar.refundAssuranceTitle')}</h5>
                  </div>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed pl-12 uppercase tracking-wide">
                    {t('rapidRegistration.sidebar.refundAssuranceText')}
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              {hasPaid ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!userProfile?.selection_survey_passed) {
                      navigate('/student/onboarding?step=identity_verification');
                    } else {
                      navigate('/student/dashboard');
                    }
                  }}
                  className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest text-sm py-5 rounded-2xl transition-all flex items-center justify-center shadow-xl hover:shadow-2xl hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {t('rapidRegistration.sidebar.alreadyPaidContinue', 'Continuar no Onboarding')}
                </button>
              ) : (
                <button
                  type="submit"
                  form="registration-form"
                  disabled={loading || (!formData.termsAccepted && !isRegistered) || (selectedMethod === 'parcelow' && (!formData.cpf || formData.cpf.length < 14))}
                  className={`w-full text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${(formData.termsAccepted || isRegistered) && (selectedMethod !== 'parcelow' || (formData.cpf && formData.cpf.length >= 14)) ? 'bg-[#05294E]' : 'bg-slate-400'
                    }`}
                >
                  {getButtonText()}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      <Transition appear show={showTermsModal} as={React.Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setShowTermsModal(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl max-h-[95vh] flex flex-col transform overflow-hidden rounded-[2.5rem] bg-white p-0 text-left align-middle shadow-2xl transition-all border border-slate-100">
                  {/* Header */}
                  <div className="relative flex-shrink-0 px-8 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Dialog.Title as="h3" className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                          {activeTerm?.title || t('preCheckoutModal.termsAndConditions.title')}
                        </Dialog.Title>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                          {t('rapidRegistration.terms.contractSubtitle') || 'Contrato de Prestação de Serviços'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowTermsModal(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-hidden px-8 py-4 flex flex-col min-h-0">
                    <div
                      className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
                    >
                      {loadingTerms ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                          <Loader2 className="w-12 h-12 text-[#05294E] animate-spin" />
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('preCheckoutModal.loading')}</p>
                        </div>
                      ) : activeTerm ? (
                        <div
                          className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:font-medium prose-headings:text-slate-900 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-strong:text-slate-900"
                          dangerouslySetInnerHTML={{ __html: activeTerm.content }}
                        />
                      ) : (
                        <div className="text-center py-20">
                          <Shield className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                          <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">{t('preCheckoutModal.noTermsFound')}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center flex-shrink-0">
                      <button
                        type="button"
                        className="w-full sm:w-auto px-12 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:scale-95"
                        onClick={() => setShowTermsModal(false)}
                      >
                        {t('preCheckoutModal.closeTerms', 'Fechar')}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <PaymentLoadingOverlay 
        show={loading && !showZelleCheckout} 
        step={loadingStep} 
        progress={loadingProgress} 
      />
    </div>
  );
};

export default QuickRegistration;