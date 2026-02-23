import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { supabase } from '../lib/supabase';
import { 
  CreditCard, 
  Mail, 
  User, 
  Users, 
  Lock, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Shield,
  Scroll,
  CheckCircle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import { calculateCardAmountWithFees, calculatePIXAmountWithFees, getExchangeRate } from '../utils/stripeFeeCalculator';
import { ZelleCheckout } from '../components/ZelleCheckout';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// SVG Icons (Simplified for the registration page)
const PixIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

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
  <img 
    src="/parcelow_share.webp" 
    alt="Parcelow" 
    className={className} 
    style={{ objectFit: 'contain' }}
  />
);

const QuickRegistration: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig();
  const { recordTermAcceptance } = useTermsAcceptance();

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

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    dependents: 0,
    password: '',
    confirm_password: '',
    termsAccepted: false
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'pix' | 'zelle' | 'parcelow'>('stripe');
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Terms state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const termsContentRef = useRef<HTMLDivElement>(null);

  // Fees with Stripe fees
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [cardAmountWithFees, setCardAmountWithFees] = useState<number>(0);
  const [pixAmountWithFees, setPixAmountWithFees] = useState<number>(0);

  // Constants
  const baseFee = getFeeAmount('selection_process');
  const discountAmount = 50;
  const currentFee = isCouponValid ? baseFee - discountAmount : baseFee;

  const formattedAmount = formatFeeAmount(currentFee);
  const originalFormattedAmount = formatFeeAmount(baseFee);

  // URL Parameter for Coupon
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('coupon') || params.get('ref');
    if (code) {
      setCouponCode(code);
      handleValidateCoupon(code);
    }
  }, [location.search]);

  const handleValidateCoupon = async (code: string) => {
    if (!code) return;
    try {
      if (code.length > 3) {
        setIsCouponValid(true);
      }
    } catch (err) {
      console.error('Error validating coupon:', err);
    }
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

  const handleTermsClick = async () => {
    await loadActiveTerms();
    setShowTermsModal(true);
    setHasScrolledToBottom(false);
  };

  const handleTermsAccept = async () => {
    if (hasScrolledToBottom && activeTerm) {
      // In a real scenario we'd need a user ID, but since this is BEFORE registration,
      // we'll just mark it as accepted in state and record it after registration if needed,
      // or record it anonymously if the system supports it.
      // However, the rule says: "ao aceitar ele vai para o primeiro registro do banco"
      // This implies we should record it. But we don't have a user ID yet.
      // THE QUICK REGISTRATION FLOW REGISTERS THE USER THEN PAYS.
      // So we will record the acceptance AFTER registration.
      setFormData(prev => ({ ...prev, termsAccepted: true }));
      setShowTermsModal(false);
    }
  };

  const handleTermsScroll = () => {
    if (termsContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsContentRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        setHasScrolledToBottom(true);
      }
    }
  };

  useEffect(() => {
    if (activeTerm && showTermsModal) {
      const timer = setTimeout(() => {
        if (termsContentRef.current) {
          const { scrollHeight, clientHeight } = termsContentRef.current;
          if (scrollHeight <= clientHeight) {
            setHasScrolledToBottom(true);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTerm, showTermsModal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               name === 'dependents' ? parseInt(value) : value
    }));
  };

  const handleRegisterAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setError(t('rapidRegistration.form.error.passwordsNotMatch') || 'As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (!formData.termsAccepted) {
      setError(t('rapidRegistration.form.error.terms') || 'Você deve aceitar os termos');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Register User
      const userData = {
        full_name: formData.full_name,
        phone: formData.phone,
        dependents: formData.dependents,
        referralCode: couponCode,
        role: 'student' as const
      };

      const result = await register(formData.email, formData.password, userData);
      
      // 2. Record Terms Acceptance
      if (activeTerm && result?.user?.id) {
        try {
          await recordTermAcceptance(activeTerm.id, 'checkout_terms', result.user.id);
        } catch (termErr) {
          console.error('Failed to record terms acceptance:', termErr);
          // Continue anyway, registration was successful
        }
      }
      
      // 2. Initiate Payment
      if (selectedMethod === 'stripe' || selectedMethod === 'pix' || selectedMethod === 'parcelow' || !selectedMethod) {
        await handlePaymentCheckout(selectedMethod || 'stripe');
      } else if (selectedMethod === 'zelle') {
        setShowZelleCheckout(true);
      } else {
        navigate('/student/dashboard');
      }

    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || t('rapidRegistration.form.error.general'));
      setLoading(false);
    }
  };

  const handlePaymentCheckout = async (method: 'stripe' | 'pix' | 'parcelow') => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) throw new Error('Not authenticated');

      let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
      if (method === 'parcelow') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-selection-process`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: 'price_selection_process_fee',
          amount: currentFee,
          payment_method: method,
          success_url: `${window.location.origin}/student/dashboard`,
          cancel_url: `${window.location.origin}/student/dashboard`,
          mode: 'payment',
          payment_type: 'selection_process',
          fee_type: 'selection_process',
          discount_code: isCouponValid ? couponCode : undefined
        })
      });

      const data = await response.json();
      if (data.session_url || data.url) {
        window.location.href = data.session_url || data.url;
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      console.error('Payment redirect failed:', err);
      navigate('/student/dashboard');
    }
  };

  if (showZelleCheckout) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-xl w-full">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento com Zelle</h2>
            <p className="text-gray-600">Siga as instruções abaixo para concluir seu pagamento.</p>
          </div>
          <ZelleCheckout 
            amount={currentFee}
            feeType="selection_process"
            onSuccess={() => navigate('/student/dashboard')}
          />
          <button 
            onClick={() => setShowZelleCheckout(false)}
            className="mt-6 w-full text-gray-500 font-medium hover:text-gray-700 transition-all"
          >
            Voltar para as opções de pagamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-grey-900 tracking-tight sm:text-5xl">
            {t('rapidRegistration.title')}
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            {t('rapidRegistration.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Registration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8">
                <form onSubmit={handleRegisterAndPay} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Full Name */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
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
                          placeholder={t('rapidRegistration.form.placeholders.fullName')}
                          className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-slate-900 bg-slate-50/50 transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
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
                          placeholder={t('rapidRegistration.form.placeholders.email')}
                          className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-slate-900 bg-slate-50/50 transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
                        {t('rapidRegistration.form.phone')}
                      </label>
                      <div className="relative mt-auto">
                        <PhoneInput
                          international
                          defaultCountry="US"
                          addInternationalOption={false}
                          value={formData.phone}
                          onChange={(value) => {
                            setFormData(prev => ({ ...prev, phone: value || '' }));
                          }}
                          className="quick-registration-phone w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-[#05294E] focus-within:border-[#05294E] text-slate-900 transition-all duration-300"
                          placeholder={t('rapidRegistration.form.placeholders.phone')}
                        />
                      </div>
                    </div>

                    {/* Dependents Selector */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1 leading-tight">
                        {t('rapidRegistration.form.dependents')} 
                        <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                          Family members (spouse and/or children)
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
                          value={formData.dependents || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, dependents: value }));
                          }}
                          className="appearance-none block w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-slate-900 bg-slate-50/50 transition-all duration-300 text-sm sm:text-base cursor-pointer"
                        >
                          <option value={0}>0 Dependents</option>
                          <option value={1}>1 Dependent</option>
                          <option value={2}>2 Dependents</option>
                          <option value={3}>3 Dependents</option>
                          <option value={4}>4 Dependents</option>
                          <option value={5}>5 Dependents</option>
                        </select>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
                        {t('rapidRegistration.form.password')}
                      </label>
                      <div className="relative mt-auto">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          required
                          minLength={6}
                          value={formData.password}
                          onChange={handleChange}
                          placeholder={t('rapidRegistration.form.placeholders.password')}
                          className="block w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-slate-900 bg-slate-50/50 transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-bold text-slate-700 mb-2 px-1">
                        {t('rapidRegistration.form.confirmPassword')}
                      </label>
                      <div className="relative mt-auto">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirm_password"
                          required
                          minLength={6}
                          value={formData.confirm_password}
                          onChange={handleChange}
                          placeholder={t('rapidRegistration.form.placeholders.confirmPassword')}
                          className="block w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-slate-900 bg-slate-50/50 transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Terms acceptance - Moved before payment */}
                  <div className="mt-4 mb-16">
                    <div 
                      onClick={() => !formData.termsAccepted && handleTermsClick()}
                      className={`flex items-start space-x-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl group/terms hover:bg-gray-100/50 transition-colors duration-300 cursor-pointer ${
                        formData.termsAccepted ? 'border-emerald-100 bg-emerald-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id="termsAccepted"
                          name="termsAccepted"
                          type="checkbox"
                          required
                          checked={formData.termsAccepted}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleTermsClick();
                            } else {
                              setFormData(prev => ({ ...prev, termsAccepted: false }));
                            }
                          }}
                          className="h-5 w-5 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm text-gray-700 leading-relaxed cursor-pointer block font-medium">
                          <span className="text-[#D0151C] font-bold mr-1">*</span>
                          {t('preCheckoutModal.acceptContractTerms') || 'Eu aceito os termos e condições do contrato de prestação de serviços.'}
                        </label>
                        {formData.termsAccepted && (
                          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center mt-1">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Termos Visualizados e Aceitos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods Section - Updated styling */}
                  <div>
                    <h3 className="text-lg font-black text-[#05294E] mb-4 flex items-center uppercase tracking-tight">
                      <CreditCard className="mr-2 h-5 w-5" />
                      {t('payment.selectMethod') || 'Selecione o Método de Pagamento'}
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Stripe / Card */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('stripe')}
                        className={`w-full p-6 rounded-[1.5rem] border-2 transition-all duration-300 text-left relative overflow-hidden group/method ${
                          selectedMethod === 'stripe'
                            ? 'border-[#05294E] bg-slate-50 shadow-lg'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-5 relative z-10">
                          <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
                            <StripeIcon className="h-8 w-8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Cartão de Crédito</h4>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">* Internacional (Stripe)</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-900 text-lg font-black">${cardAmountWithFees.toFixed(2)}</span>
                                {selectedMethod === 'stripe' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* PIX */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('pix')}
                        className={`w-full p-6 rounded-[1.5rem] border-2 transition-all duration-300 text-left relative overflow-hidden group/method ${
                          selectedMethod === 'pix'
                            ? 'border-[#05294E] bg-slate-50 shadow-lg'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-5 relative z-10">
                          <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-[#E2F9F6] border border-[#B2EBE3] shadow-sm">
                            <PixIcon className="h-8 w-8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">PIX</h4>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">* Brasileiros</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-900 text-lg font-black">R$ {pixAmountWithFees.toFixed(2)}</span>
                                {selectedMethod === 'pix' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Zelle */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('zelle')}
                        className={`w-full p-6 rounded-[1.5rem] border-2 transition-all duration-300 text-left relative overflow-hidden group/method ${
                          selectedMethod === 'zelle'
                            ? 'border-[#05294E] bg-slate-50 shadow-lg'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-5 relative z-10">
                          <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-[#6D1ED4]/10 border border-[#6D1ED4]/20 shadow-sm">
                            <ZelleIcon className="h-8 w-8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Zelle</h4>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">* Residentes nos EUA</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-900 text-lg font-black">${currentFee.toFixed(2)}</span>
                                {selectedMethod === 'zelle' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Parcelow */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod('parcelow')}
                        className={`w-full p-6 rounded-[1.5rem] border-2 transition-all duration-300 text-left relative overflow-hidden group/method ${
                          selectedMethod === 'parcelow'
                            ? 'border-[#05294E] bg-slate-50 shadow-lg'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-5 relative z-10">
                          <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
                            <ParcelowIcon className="h-10 w-10" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Parcelow</h4>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">* Parcelamento para Brasileiros</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-900 text-lg font-black">${currentFee.toFixed(2)}</span>
                                {selectedMethod === 'parcelow' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 rounded-xl flex items-center text-red-700 text-sm">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !formData.termsAccepted}
                    className={`w-full text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${
                      formData.termsAccepted ? 'bg-[#05294E]' : 'bg-slate-400'
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 mr-2" />
                    )}
                    {t('rapidRegistration.form.submit')}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right: Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                
                <h3 className="text-xl font-black text-slate-900 mb-8 pb-4 border-b border-slate-50 flex items-center uppercase tracking-tight relative z-10">
                  <ShieldCheck className="h-6 w-6 text-[#05294E] mr-3" />
                  {t('rapidRegistration.sidebar.title')}
                </h3>

                <div className="space-y-6 mb-8 relative z-10">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">
                      {t('rapidRegistration.sidebar.currentFee')}
                    </span>
                    <div className="text-right">
                      {isCouponValid && (
                        <span className="text-sm line-through block text-slate-300 font-bold mb-1">
                          {originalFormattedAmount}
                        </span>
                      )}
                      <span className="text-4xl font-black text-[#05294E] tracking-tighter">
                        {formattedAmount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                      "{t('rapidRegistration.sidebar.feeExplanation')}"
                    </p>
                  </div>
                </div>

                <div className="space-y-5 pt-8 border-t border-slate-100 relative z-10">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] flex items-center opacity-70">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {t('rapidRegistration.sidebar.futureFeesTitle')}
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{t('rapidRegistration.sidebar.enrollmentFee')}</span>
                      <span className="font-black text-slate-900">$350.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{t('rapidRegistration.sidebar.scholarshipFee')}</span>
                      <span className="font-black text-slate-900">$900.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{t('rapidRegistration.sidebar.i20Fee')}</span>
                      <span className="font-black text-slate-900">$900.00</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-6 leading-relaxed font-bold uppercase tracking-wide">
                    * {t('rapidRegistration.sidebar.futureFeesNote')}
                  </p>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Pagamento Seguro</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <CheckCircle2 className="h-8 w-8 text-[#05294E] mb-2" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Suporte 24/7</span>
                </div>
              </div>
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
                  <div className="relative flex-shrink-0 px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#05294E] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/10">
                          <Scroll className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <Dialog.Title as="h3" className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            {activeTerm?.title || t('preCheckoutModal.termsAndConditions.title')}
                          </Dialog.Title>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                            Contrato de Prestação de Serviços
                          </p>
                        </div>
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
                  <div className="flex-1 overflow-hidden p-8 flex flex-col min-h-0">
                    <div 
                      ref={termsContentRef}
                      onScroll={handleTermsScroll}
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

                    <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4 flex-shrink-0">
                      <button
                        type="button"
                        className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:scale-95"
                        onClick={() => setShowTermsModal(false)}
                      >
                        {t('preCheckoutModal.closeTerms') || 'Fechar'}
                      </button>
                      <button
                        type="button"
                        disabled={!hasScrolledToBottom || loadingTerms}
                        className={`flex-[2] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 ${
                          hasScrolledToBottom
                            ? 'bg-[#05294E] text-white hover:bg-blue-900 shadow-blue-900/10'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                        }`}
                        onClick={handleTermsAccept}
                      >
                        {hasScrolledToBottom 
                          ? t('preCheckoutModal.acceptTerms') || 'Aceitar e Confirmar' 
                          : t('preCheckoutModal.scrollToBottomFirst') || 'Leia até o final'
                        }
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default QuickRegistration;
