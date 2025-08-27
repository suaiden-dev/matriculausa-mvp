import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Building, UserCheck, Zap, Shield, Award, GraduationCap, Users, Globe, MapPin, CheckCircle, X, Scroll, Gift, Target } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import { supabase } from '../lib/supabase';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface AuthProps {
  mode: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ mode }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'student' | 'university'>('student');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Student specific fields
    phone: '',
    country: '',
    fieldOfInterest: '',
    englishLevel: '',
    // University specific fields
    universityName: '',
    position: '',
    website: '',
    location: '',
    // Referral code fields - now separated
    affiliateCode: '', // Matricula Rewards (student-to-student)
    sellerReferralCode: '' // Seller referral (seller-to-student)
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showStudentVerificationNotice, setShowStudentVerificationNotice] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasScrolledToBottomPrivacy, setHasScrolledToBottomPrivacy] = useState(false);
  const [affiliateCodeValid, setAffiliateCodeValid] = useState<boolean | null>(null);
  const [affiliateCodeLoading, setAffiliateCodeLoading] = useState(false);
  const [isReferralCodeLocked, setIsReferralCodeLocked] = useState(false);
  // Seller referral code validation states
  const [sellerReferralCodeValid, setSellerReferralCodeValid] = useState<boolean | null>(null);
  const [sellerReferralCodeLoading, setSellerReferralCodeLoading] = useState(false);
  const [isSellerReferralCodeLocked, setIsSellerReferralCodeLocked] = useState(false);
  // New states for referral code UI
  const [showReferralCodeSection, setShowReferralCodeSection] = useState<boolean | null>(null);
  const [selectedReferralType, setSelectedReferralType] = useState<'friend' | 'seller' | null>(null);
  const termsContentRef = useRef<HTMLDivElement>(null);
  const privacyContentRef = useRef<HTMLDivElement>(null);
  
  const { login, register, isAuthenticated, user } = useAuth();
  const { recordTermAcceptance, getLatestActiveTerm } = useTermsAcceptance();
  const navigate = useNavigate();

  // Global scroll-to-top on login/register page load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      // console.log('Scroll position reset to top on login/register page load.');
    }, 75);
    return () => clearTimeout(timer);
  }, []);

  // Load referral codes from localStorage
  useEffect(() => {
    if (mode === 'register' && activeTab === 'student') {
      console.log('[AUTH] Carregando códigos de referência do localStorage...');
      
      // Load Matricula Rewards code
      const pendingReferralCode = localStorage.getItem('pending_affiliate_code');
      if (pendingReferralCode) {
        console.log('[AUTH] Código de Matricula Rewards encontrado:', pendingReferralCode);
        setFormData(prev => ({ ...prev, affiliateCode: pendingReferralCode }));
        setIsReferralCodeLocked(true);
        validateAffiliateCode(pendingReferralCode);
        // Configure the new UI for friend referral code
        setShowReferralCodeSection(true);
        setSelectedReferralType('friend');
        // IMPORTANTE: Limpar o campo de seller se este for um código de Matricula Rewards
        setFormData(prev => ({ ...prev, sellerReferralCode: '' }));
        setIsSellerReferralCodeLocked(false);
      }

      // Load seller referral code
      const pendingSellerCode = localStorage.getItem('pending_seller_referral_code');
      if (pendingSellerCode) {
        console.log('[AUTH] Código de Seller encontrado:', pendingSellerCode);
        setFormData(prev => ({ ...prev, sellerReferralCode: pendingSellerCode }));
        setIsSellerReferralCodeLocked(true);
        validateSellerReferralCode(pendingSellerCode);
        // Configure the new UI for seller referral code
        setShowReferralCodeSection(true);
        setSelectedReferralType('seller');
        // IMPORTANTE: Limpar o campo de Matricula Rewards se este for um código de Seller
        setFormData(prev => ({ ...prev, affiliateCode: '' }));
        setIsReferralCodeLocked(false);
      }
      
      console.log('[AUTH] Estado final dos campos:', {
        affiliateCode: pendingReferralCode,
        sellerReferralCode: pendingSellerCode
      });
    }
  }, [mode, activeTab]);

  // Validate affiliate code
  const validateAffiliateCode = async (code: string) => {
    if (!code || code.length < 4) {
      setAffiliateCodeValid(false);
      return;
    }

    setAffiliateCodeLoading(true);
    try {
      console.log('[AUTH] Validando código de afiliado:', code);
      const { data, error } = await supabase
        .from('affiliate_codes')
        .select('code, is_active')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      console.log('[AUTH] Resultado da validação de afiliado:', { data, error });

      if (error) {
        console.error('[AUTH] Erro na validação de afiliado:', error);
        setAffiliateCodeValid(false);
      } else if (data) {
        console.log('[AUTH] Código de afiliado válido:', data);
        setAffiliateCodeValid(true);
      } else {
        console.log('[AUTH] Código de afiliado não encontrado');
        setAffiliateCodeValid(false);
      }
    } catch (error) {
      console.error('[AUTH] Exceção na validação de afiliado:', error);
      setAffiliateCodeValid(false);
    } finally {
      setAffiliateCodeLoading(false);
    }
  };

  // Validate seller referral code
  const validateSellerReferralCode = async (code: string) => {
    if (!code || code.length < 4) {
      setSellerReferralCodeValid(false);
      return;
    }

    setSellerReferralCodeLoading(true);
    try {
      console.log('[AUTH] Validando código de seller:', code);
      const { data, error } = await supabase
        .from('sellers')
        .select('referral_code, is_active')
        .eq('referral_code', code)
        .eq('is_active', true)
        .single();

      console.log('[AUTH] Resultado da validação de seller:', { data, error });

      if (error) {
        console.error('[AUTH] Erro na validação de seller:', error);
        setSellerReferralCodeValid(false);
      } else if (data) {
        console.log('[AUTH] Código de seller válido:', data);
        setSellerReferralCodeValid(true);
      } else {
        console.log('[AUTH] Código de seller não encontrado');
        setSellerReferralCodeValid(false);
      }
    } catch (error) {
      console.error('[AUTH] Exceção na validação de seller:', error);
      setSellerReferralCodeValid(false);
    } finally {
      setSellerReferralCodeLoading(false);
    }
  };

  // Handle affiliate code change
  const handleAffiliateCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, affiliateCode: code }));
    
    if (code.length >= 4) {
      validateAffiliateCode(code);
    } else {
      setAffiliateCodeValid(null);
    }
  };

  // Handle seller referral code change
  const handleSellerReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, sellerReferralCode: code }));
    
    if (code.length >= 4) {
      validateSellerReferralCode(code);
    } else {
      setSellerReferralCodeValid(null);
    }
  };

  // Handle referral code section toggle
  const handleReferralCodeToggle = (hasCode: boolean) => {
    if (hasCode) {
      // User says they have a code - show the type selection
      setShowReferralCodeSection(true);
    } else {
      // User says they don't have a code - mark as answered but don't show input
      setShowReferralCodeSection(false);
      // Clear all referral codes when user says they don't have one
      setFormData(prev => ({ 
        ...prev, 
        affiliateCode: '', 
        sellerReferralCode: '' 
      }));
      setSelectedReferralType(null);
      setAffiliateCodeValid(null);
      setSellerReferralCodeValid(null);
      setIsReferralCodeLocked(false);
      setIsSellerReferralCodeLocked(false);
    }
  };

  // Handle referral type selection
  const handleReferralTypeSelect = (type: 'friend' | 'seller') => {
    setSelectedReferralType(type);
    // Clear the other type's code when switching
    if (type === 'friend') {
      setFormData(prev => ({ ...prev, sellerReferralCode: '' }));
      setSellerReferralCodeValid(null);
      setIsSellerReferralCodeLocked(false);
    } else {
      setFormData(prev => ({ ...prev, affiliateCode: '' }));
      setAffiliateCodeValid(null);
      setIsReferralCodeLocked(false);
    }
  };

  // Handle scroll in terms modal
  const handleTermsScroll = () => {
    if (termsContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      console.log('Terms scroll:', { scrollTop, scrollHeight, clientHeight, isAtBottom });
      setHasScrolledToBottom(isAtBottom);
    }
  };

  // Handle scroll in privacy modal
  const handlePrivacyScroll = () => {
    if (privacyContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = privacyContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setHasScrolledToBottomPrivacy(isAtBottom);
    }
  };

  // Handle terms modal open
  const handleTermsClick = () => {
    setShowTermsModal(true);
    setHasScrolledToBottom(false);
  };

  // Handle terms acceptance and open privacy modal
  const handleTermsAccept = () => {
    console.log('handleTermsAccept called, hasScrolledToBottom:', hasScrolledToBottom);
    if (hasScrolledToBottom) {
      console.log('Opening privacy modal...');
      setShowTermsModal(false);
      setShowPrivacyModal(true);
      setHasScrolledToBottomPrivacy(false);
    } else {
      console.log('User has not scrolled to bottom yet');
    }
  };

  // Handle privacy acceptance
  const handlePrivacyAccept = async () => {
    if (hasScrolledToBottomPrivacy) {
      try {
        // Record acceptance of both terms of service and privacy policy
        const termsOfServiceTerm = await getLatestActiveTerm('terms_of_service');
        const privacyPolicyTerm = await getLatestActiveTerm('privacy_policy');
        
        if (termsOfServiceTerm) {
          await recordTermAcceptance(termsOfServiceTerm.id, 'terms_of_service');
        }
        
        if (privacyPolicyTerm) {
          await recordTermAcceptance(privacyPolicyTerm.id, 'privacy_policy');
        }
        
        setTermsAccepted(true);
        setShowPrivacyModal(false);
      } catch (error) {
        console.error('Error recording term acceptance:', error);
        // Still allow user to proceed even if recording fails
        setTermsAccepted(true);
        setShowPrivacyModal(false);
      }
    }
  };

  // Remove redirecionamento - deixar AuthRedirect fazer isso

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        console.log('🔍 [AUTH] Iniciando processo de registro');
        console.log('🔍 [AUTH] Dados do formulário:', formData);
        console.log('🔍 [AUTH] Tab ativa:', activeTab);
        console.log('🔍 [AUTH] Telefone no formData:', formData.phone);
        
        if (formData.password !== formData.confirmPassword) {
          setError(t('authPage.messages.passwordsNotMatch'));
          setLoading(false);
          return;
        }

        // Validate allowed password characters: letters, numbers and @#$!
        const allowedPasswordRegex = /^[A-Za-z0-9@#$!]+$/;
        if (!allowedPasswordRegex.test(formData.password)) {
          setError(t('authPage.messages.invalidPasswordChars'));
          setLoading(false);
          return;
        }
        
        // Validar telefone obrigatório e formato internacional
        if (!formData.phone || formData.phone.length < 8) {
          console.log('❌ [AUTH] Validação de telefone falhou:', {
            phone: formData.phone,
            length: formData.phone?.length
          });
          setError(t('authPage.messages.invalidPhone'));
          setLoading(false);
          return;
        }
        
        // Validar aceitação dos termos
        if (!termsAccepted) {
          setError(t('authPage.messages.mustAcceptTerms'));
          setLoading(false);
          return;
        }
        
        // Validar resposta sobre código de referência (apenas para estudantes)
        if (activeTab === 'student' && showReferralCodeSection === null) {
          setError(t('authPage.messages.mustAnswerReferralCode'));
          setLoading(false);
          return;
        }
        
        console.log('✅ [AUTH] Validação de telefone passou:', formData.phone);
        
        const userData = {
          full_name: activeTab === 'student' ? formData.full_name : formData.full_name,
          role: (activeTab === 'student' ? 'student' : 'school') as 'student' | 'school',
          // Add additional registration data only for universities
          ...(activeTab === 'university' && {
            universityName: formData.universityName || '',
            position: formData.position || '',
            website: formData.website || '',
            location: formData.location || '',
            phone: formData.phone || ''
          }),
          // Add phone for student
          ...(activeTab === 'student' && {
            phone: formData.phone || '',
            affiliate_code: formData.affiliateCode || null, // Matricula Rewards code
            seller_referral_code: formData.sellerReferralCode || null // Seller referral code
          })
        };

        console.log('🔍 [AUTH] userData criado:', userData);
        console.log('🔍 [AUTH] Telefone no userData:', userData.phone);
        
        // Salvar no localStorage antes de chamar register
        console.log('💾 [AUTH] Salvando telefone no localStorage:', formData.phone);
        localStorage.setItem('pending_phone', formData.phone || '');
        
        await register(formData.email, formData.password, userData);

        // Limpar códigos de referência do localStorage após registro bem-sucedido
        localStorage.removeItem('pending_affiliate_code');
        localStorage.removeItem('pending_seller_referral_code');

        // Se for registro de universidade, mostra modal e retorna
        if (activeTab === 'university') {
          setShowVerificationModal(true);
          return;
        }
        // Para estudante, mostrar aviso de verificação
        if (activeTab === 'student') {
          setShowStudentVerificationNotice(true);
          return;
        }
        return;
      } else {
        await login(formData.email, formData.password);
        // O redirecionamento será feito pelo AuthRedirect
        return;
      }
    } catch (err: any) {
      // Enhanced error handling with specific messages
      let errorMessage = t('authPage.messages.authenticationFailed');
      
      if (err.message) {
        const message = err.message.toLowerCase();
        
        if (message.includes('invalid_credentials') || message.includes('invalid login credentials')) {
          errorMessage = t('authPage.messages.invalidCredentials');
        } else if (message.includes('email_not_confirmed')) {
          errorMessage = t('authPage.messages.emailNotConfirmed');
        } else if (message.includes('too_many_requests')) {
          errorMessage = t('authPage.messages.tooManyRequests');
        } else if (message.includes('user_not_found')) {
          errorMessage = t('authPage.messages.userNotFound');
        } else if (message.includes('weak_password')) {
          errorMessage = t('authPage.messages.weakPassword');
        } else if (message.includes('email_address_invalid')) {
          errorMessage = t('authPage.messages.invalidEmail');
        } else if (message.includes('signup_disabled')) {
          errorMessage = t('authPage.messages.signupDisabled');
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || '' // Garantir que nunca seja undefined
    }));
  };

  const handleTabChange = (tab: 'student' | 'university') => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (showVerificationModal || showStudentVerificationNotice) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000); // 3 seconds
      return () => clearTimeout(timer);
    }
  }, [showVerificationModal, showStudentVerificationNotice, navigate]);

  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img 
                src="/favicon-branco.png" 
                alt="Matrícula USA" 
                className="h-16 w-auto"
              />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">
              {t('authPage.login.title')}
            </h2>
            <p className="text-slate-600 text-lg">
              {t('authPage.login.subtitle')}
            </p>
            <p className="mt-4 text-sm text-slate-500">
              {t('authPage.login.noAccount')}{' '}
              <Link to="/register" className="font-bold text-[#D0151C] hover:text-[#B01218] transition-colors">
                {t('authPage.login.signUpHere')}
              </Link>
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6 bg-slate-50 p-8 rounded-3xl shadow-lg border border-slate-200" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                <div className="font-medium text-red-800 mb-1">{t('authPage.login.loginFailed')}</div>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                {t('authPage.login.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                  placeholder={t('authPage.login.enterEmail')}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                {t('authPage.login.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                  placeholder={t('authPage.login.enterPassword')}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-[#D0151C] hover:text-[#B01218] font-medium transition-colors"
              >
                {t('authPage.login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-[#05294E] hover:bg-[#041f3a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('authPage.login.signingIn')}
                </div>
              ) : (
                t('authPage.login.signIn')
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      {/* Modal for email verification after university registration */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200">
            <div className="mb-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('authPage.modals.verification.title')}</h2>
              <p className="text-slate-700 text-base mb-4" dangerouslySetInnerHTML={{ __html: t('authPage.modals.verification.description') }}>
              </p>
            </div>
            <button
              className="bg-[#05294E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#02172b] transition-all duration-200"
              onClick={() => setShowVerificationModal(false)}
            >
              {t('authPage.modals.verification.gotIt')}
            </button>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <img 
              src="/favicon-branco.png" 
              alt="Matrícula USA" 
              className="h-16 w-auto"
            />
          </div>
                    <h1 className="text-5xl font-black text-slate-900 mb-4">
            {t('authPage.register.title')}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {t('authPage.register.subtitle')}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            {t('authPage.register.hasAccount')}{' '}
            <Link to="/login" className="font-bold text-[#D0151C] hover:text-[#B01218] transition-colors">
              {t('authPage.register.signInHere')}
            </Link>
            </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 p-2 rounded-2xl flex space-x-2">
                          <button
                onClick={() => handleTabChange('student')}
                className={`flex items-center px-8 py-4 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === 'student'
                    ? 'bg-white text-[#05294E] shadow-lg'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                {t('authPage.register.tabStudent')}
              </button>
              <button
                onClick={() => handleTabChange('university')}
                className={`flex items-center px-8 py-4 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === 'university'
                    ? 'bg-white text-[#05294E] shadow-lg'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="h-5 w-5 mr-2" />
                {t('authPage.register.tabUniversity')}
              </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-slate-50 rounded-3xl p-8 shadow-lg border border-slate-200">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-6">
              <div className="font-medium text-red-800 mb-1">{t('authPage.messages.registrationFailed')}</div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Form */}
            {activeTab === 'student' && (
              <>
                <div className="text-center mb-8">
                  <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2">{t('authPage.register.studentRegistration')}</h2>
                  <p className="text-slate-600">{t('authPage.register.studentSubtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.fullName')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder={t('authPage.register.enterFullName')}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.emailAddress')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        className="appearance-none relative block w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder={t('authPage.register.enterEmail')}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.phoneNumber')}
                    </label>
                    <div className="relative">
                      <PhoneInput
                        international
                        defaultCountry="US"
                        addInternationalOption={false}
                        value={formData.phone}
                        onChange={(value) => {
                          setFormData(prev => {
                            const newData = { ...prev, phone: value || '' };
                            return newData;
                          });
                        }}
                        style={{
                          '--PhoneInputCountryFlag-height': '1.2em',
                          '--PhoneInputCountrySelectArrow-opacity': '0.8',
                          '--PhoneInput-color--focus': '#05294E'
                        }}
                        className="phone-input-custom w-full pl-4 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder={t('authPage.register.enterPhone')}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.password')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder={t('authPage.register.createPassword')}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={formData.confirmPassword || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder={t('authPage.register.confirmYourPassword')}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                    <div className="col-span-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center mb-3">
                          <UserCheck className="h-4 w-4 text-slate-500 mr-2" />
                          <span className="text-sm font-medium text-slate-700">
                            {t('authPage.register.referralCode.title')}
                          </span>
                        </div>

                        {/* Initial choice */}
                        {showReferralCodeSection === null && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleReferralCodeToggle(true)}
                              className="flex items-center px-3 py-2 bg-white border border-slate-300 rounded-lg hover:border-[#05294E] hover:bg-slate-50 transition-all duration-200 text-sm"
                            >
                              <CheckCircle className="h-4 w-4 text-slate-400 mr-2" />
                              {t('authPage.register.referralCode.yesIHave')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReferralCodeToggle(false)}
                              className="flex items-center px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg hover:border-slate-400 transition-all duration-200 text-sm text-slate-600"
                            >
                              {t('authPage.register.referralCode.noThanks')}
                            </button>
                          </div>
                        )}

                        {/* User chose "No, thanks" */}
                        {showReferralCodeSection === false && (
                          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              <span className="text-sm text-green-700">
                                {t('authPage.register.referralCode.noCodeSelected')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowReferralCodeSection(null)}
                              className="text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                              {t('authPage.register.referralCode.changeAnswer')}
                            </button>
                          </div>
                        )}

                        {/* Referral code input section */}
                        {showReferralCodeSection === true && (
                          <div className="space-y-3">
                            {/* Type selection */}
                            {!selectedReferralType && (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-600">
                                  {t('authPage.register.referralCode.chooseType')}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleReferralTypeSelect('friend')}
                                    className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-[#05294E] hover:bg-slate-50 transition-all duration-200 text-sm"
                                  >
                                    <Gift className="h-3 w-3 text-[#05294E] mr-2" />
                                    {t('authPage.register.referralCode.friendCode')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReferralTypeSelect('seller')}
                                    className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-[#D0151C] hover:bg-slate-50 transition-all duration-200 text-sm"
                                  >
                                    <Target className="h-3 w-3 text-[#D0151C] mr-2" />
                                    {t('authPage.register.referralCode.sellerCode')}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Friend referral code input */}
                            {selectedReferralType === 'friend' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Gift className="h-3 w-3 text-[#05294E] mr-2" />
                                    <span className="text-sm font-medium text-slate-700">
                                      {t('authPage.register.referralCode.friendCode')}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleReferralTypeSelect('seller')}
                                    className="text-xs text-[#05294E] hover:text-[#041f3a] font-medium"
                                  >
                                    {t('authPage.register.referralCode.switchToSeller')}
                                  </button>
                                </div>
                                <div className="relative">
                                  {isReferralCodeLocked ? (
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                                  ) : (
                                    <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  )}
                                  <input
                                    id="affiliateCode"
                                    name="affiliateCode"
                                    type="text"
                                    value={formData.affiliateCode || ''}
                                    onChange={handleAffiliateCodeChange}
                                    readOnly={isReferralCodeLocked}
                                    className={`w-full pl-10 pr-8 py-2 bg-white border rounded-lg focus:outline-none focus:ring-1 transition-all duration-200 text-sm ${
                                      isReferralCodeLocked 
                                        ? 'bg-gray-50 cursor-not-allowed' 
                                        : ''
                                    } ${
                                      affiliateCodeValid === true 
                                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500' 
                                        : affiliateCodeValid === false 
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : 'border-slate-300 focus:ring-[#05294E] focus:border-[#05294E]'
                                    }`}
                                    placeholder={isReferralCodeLocked ? t('authPage.register.referralCode.applied') : t('authPage.register.referralCode.placeholder')}
                                    maxLength={8}
                                  />
                                  {affiliateCodeLoading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#05294E]"></div>
                                    </div>
                                  )}
                                  {affiliateCodeValid === true && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                    </div>
                                  )}
                                  {affiliateCodeValid === false && formData.affiliateCode && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                      <X className="h-3 w-3 text-red-500" />
                                    </div>
                                  )}
                                </div>
                                {formData.affiliateCode && (
                                  <div className="text-xs">
                                    {affiliateCodeValid === true && (
                                      <p className="text-green-600 flex items-center">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {t('authPage.register.referralCode.valid')}
                                        {isReferralCodeLocked && (
                                          <span className="ml-2 text-blue-600">
                                            {t('authPage.register.referralCode.appliedFromLink')}
                                          </span>
                                        )}
                                      </p>
                                    )}
                                    {affiliateCodeValid === false && (
                                      <p className="text-red-600 flex items-center">
                                        <X className="h-3 w-3 mr-1" />
                                        {t('authPage.register.referralCode.invalid')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Seller referral code input */}
                            {selectedReferralType === 'seller' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Target className="h-3 w-3 text-[#D0151C] mr-2" />
                                    <span className="text-sm font-medium text-slate-700">
                                      {t('authPage.register.sellerReferralCode.title')}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleReferralTypeSelect('friend')}
                                    className="text-xs text-[#D0151C] hover:text-[#B01218] font-medium"
                                  >
                                    {t('authPage.register.referralCode.switchToFriend')}
                                  </button>
                                </div>
                                <div className="relative">
                                  {isSellerReferralCodeLocked ? (
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                                  ) : (
                                    <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  )}
                                  <input
                                    id="sellerReferralCode"
                                    name="sellerReferralCode"
                                    type="text"
                                    value={formData.sellerReferralCode || ''}
                                    onChange={handleSellerReferralCodeChange}
                                    readOnly={isSellerReferralCodeLocked}
                                    className={`w-full pl-10 pr-8 py-2 bg-white border rounded-lg focus:outline-none focus:ring-1 transition-all duration-200 text-sm ${
                                      isSellerReferralCodeLocked 
                                        ? 'bg-gray-50 cursor-not-allowed' 
                                        : ''
                                    } ${
                                      sellerReferralCodeValid === true 
                                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500' 
                                        : sellerReferralCodeValid === false 
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : 'border-slate-300 focus:ring-[#D0151C] focus:border-[#D0151C]'
                                    }`}
                                    placeholder={isSellerReferralCodeLocked ? t('authPage.register.sellerReferralCode.applied') : t('authPage.register.sellerReferralCode.placeholder')}
                                    maxLength={20}
                                  />
                                  {sellerReferralCodeLoading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#D0151C]"></div>
                                    </div>
                                  )}
                                  {sellerReferralCodeValid === true && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                    </div>
                                  )}
                                  {sellerReferralCodeValid === false && formData.sellerReferralCode && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                      <X className="h-3 w-3 text-red-500" />
                                    </div>
                                  )}
                                </div>
                                {formData.sellerReferralCode && (
                                  <div className="text-xs">
                                    {sellerReferralCodeValid === true && (
                                      <p className="text-green-600 flex items-center">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {t('authPage.register.sellerReferralCode.valid')}
                                        {isSellerReferralCodeLocked && (
                                          <span className="ml-2 text-blue-600">
                                            {t('authPage.register.sellerReferralCode.appliedFromLink')}
                                          </span>
                                        )}
                                      </p>
                                    )}
                                    {sellerReferralCodeValid === false && (
                                      <p className="text-red-600 flex items-center">
                                        <X className="h-3 w-3 mr-1" />
                                        {t('authPage.register.sellerReferralCode.invalid')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Back button */}
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReferralCodeSection(null);
                                  setSelectedReferralType(null);
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    affiliateCode: '', 
                                    sellerReferralCode: '' 
                                  }));
                                  setAffiliateCodeValid(null);
                                  setSellerReferralCodeValid(null);
                                  setIsReferralCodeLocked(false);
                                  setIsSellerReferralCodeLocked(false);
                                }}
                                className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center transition-colors"
                              >
                                <X className="h-3 w-3 mr-1" />
                                {t('authPage.register.referralCode.backToChoice')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                </div>
              </>
            )}

            {/* University Form */}
            {activeTab === 'university' && (
              <>
                <div className="text-center mb-8">
                  <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Building className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2">{t('authPage.register.universityRegistration')}</h2>
                  <p className="text-slate-600">{t('authPage.register.universitySubtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="universityName" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.universityName')}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="universityName"
                        name="universityName"
                        type="text"
                        required
                        value={formData.universityName || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder={t('authPage.register.enterUniversityName')}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.contactPersonName')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="name"
                        name="full_name"
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder={t('authPage.register.yourFullName')}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.officialEmail')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder={t('authPage.register.officialUniversityEmail')}
                      />
                    </div>
                  </div>
                  

                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.phoneNumber')}
                    </label>
                    <div className="relative">
                      <PhoneInput
                        international
                        defaultCountry="US"
                        addInternationalOption={false}
                        value={formData.phone}
                        onChange={(value) => {
                          console.log('📞 [PHONEINPUT-UNI] Valor capturado:', value);
                          setFormData(prev => {
                            const newData = { ...prev, phone: value || '' };
                            console.log('📞 [PHONEINPUT-UNI] Novo formData:', newData);
                            return newData;
                          });
                        }}
                        style={{
                          '--PhoneInputCountryFlag-height': '1.2em',
                          '--PhoneInputCountrySelectArrow-opacity': '0.8',
                          '--PhoneInput-color--focus': '#D0151C'
                        }}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder={t('authPage.register.enterContactPhone')}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.password')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder={t('authPage.register.createPassword')}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={formData.confirmPassword || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder={t('authPage.register.confirmYourPassword')}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-slate-100 rounded-2xl">
              <input
                id="termsAccepted"
                name="termsAccepted"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleTermsClick();
                  } else {
                    setTermsAccepted(false);
                  }
                }}
                className="mt-1 h-4 w-4 text-[#05294E] border-slate-300 rounded focus:ring-[#05294E] focus:ring-2"
              />
              <label htmlFor="termsAccepted" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                {t('authPage.register.termsAndConditions.title')}{' '}
                <span className="text-[#05294E] hover:text-[#041f3a] font-semibold underline">
                  {t('authPage.register.termsAndConditions.termsOfUse')}
                </span>
                {' '}{t('authPage.register.termsAndConditions.and')}{' '}
                <span className="text-[#05294E] hover:text-[#041f3a] font-semibold underline">
                  {t('authPage.register.termsAndConditions.privacyPolicy')}
                </span>
                {' '}{t('authPage.register.termsAndConditions.description')}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !termsAccepted || (activeTab === 'student' && showReferralCodeSection === null)}
              className={`w-full flex justify-center py-4 px-4 border border-transparent text-lg font-black rounded-2xl text-white transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'student' 
                  ? 'bg-[#05294E] hover:bg-[#05294E]/90 focus:ring-[#05294E]' 
                  : 'bg-[#D0151C] hover:bg-[#B01218] focus:ring-[#D0151C]'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('authPage.register.creatingAccount')}
                </div>
              ) : (
                <div className="flex items-center">
                  {activeTab === 'student' ? t('authPage.register.createStudentAccount') : t('authPage.register.createUniversityAccount')}
                </div>
              )}
            </button>
          </form>

          {/* Terms and Conditions Modal */}
          {showTermsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900">{t('authPage.modals.terms.title')}</h2>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title={t('authPage.modals.terms.close')}
                  >
                    <X className="h-6 w-6 text-slate-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div 
                  ref={termsContentRef}
                  onScroll={handleTermsScroll}
                  className="flex-1 overflow-y-auto p-6 space-y-6"
                >
                  {/* Terms of Service */}
                  <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">{t('authPage.modals.terms.content.title')}</h3>
                    <div className="prose prose-slate max-w-none">
                      {/* 1. ACCEPTANCE OF TERMS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.acceptance.title')}</h4>
                        <p className="text-slate-700 mb-4">
                          {t('authPage.modals.terms.content.acceptance.description')}
                        </p>
                      </div>

                      {/* 2. SERVICE DESCRIPTION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.serviceDescription.title')}</h4>
                        <p className="text-slate-700 mb-4">
                          {t('authPage.modals.terms.content.serviceDescription.description')}
                        </p>
                        
                        <div className="space-y-4 mb-4">
                          <div className="border border-slate-200 p-4 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.serviceDescription.emailHub.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.terms.content.serviceDescription.emailHub.features', { returnObjects: true }) as string[]).map((feature: string, index: number) => (
                                <li key={index}>{feature}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="border border-slate-200 p-4 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.serviceDescription.scholarshipManagement.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.terms.content.serviceDescription.scholarshipManagement.features', { returnObjects: true }) as string[]).map((feature: string, index: number) => (
                                <li key={index}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 3. LICENSE GRANT */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.licenseGrant.title')}</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.licenseGrant.limitedLicense.title')}</h5>
                            <p className="text-slate-700">
                              {t('authPage.modals.terms.content.licenseGrant.limitedLicense.description')}
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.licenseGrant.restrictions.title')}</h5>
                            <p className="text-slate-700 mb-2">{t('authPage.modals.terms.content.licenseGrant.restrictions.description')}</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              {(t('authPage.modals.terms.content.licenseGrant.restrictions.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 4. THIRD-PARTY DEPENDENCIES */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.thirdPartyDependencies.title')}</h4>
                        <div className="space-y-4">
                          <div className="border border-slate-300 p-4 bg-slate-50 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.thirdPartyDependencies.googleApis.title')}</h5>
                            <p className="text-slate-700 mb-2">
                              {t('authPage.modals.terms.content.thirdPartyDependencies.googleApis.description')}
                            </p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.terms.content.thirdPartyDependencies.googleApis.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.thirdPartyDependencies.otherProviders.title')}</h5>
                            <p className="text-slate-700 mb-2">{t('authPage.modals.terms.content.thirdPartyDependencies.otherProviders.description')}</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              {(t('authPage.modals.terms.content.thirdPartyDependencies.otherProviders.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 5. INTELLECTUAL PROPERTY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.intellectualProperty.title')}</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.intellectualProperty.platformOwnership.title')}</h5>
                            <p className="text-slate-700 text-sm">
                              {t('authPage.modals.terms.content.intellectualProperty.platformOwnership.description')}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.intellectualProperty.customerData.title')}</h5>
                            <p className="text-slate-700 text-sm mb-2">{t('authPage.modals.terms.content.intellectualProperty.customerData.description')}</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.terms.content.intellectualProperty.customerData.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                            <p className="text-slate-700 text-sm mt-2">
                              {t('authPage.modals.terms.content.intellectualProperty.customerData.conclusion')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 6. RESPONSIBILITIES */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.responsibilities.title')}</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.responsibilities.userResponsibilities.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.terms.content.responsibilities.userResponsibilities.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.responsibilities.matriculaResponsibilities.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.terms.content.responsibilities.matriculaResponsibilities.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 7. LIMITATION OF LIABILITY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.limitationOfLiability.title')}</h4>
                        <p className="text-slate-700 mb-2">{t('authPage.modals.terms.content.limitationOfLiability.description')}</p>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          {(t('authPage.modals.terms.content.limitationOfLiability.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      {/* 8. SUSPENSION AND TERMINATION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.suspensionAndTermination.title')}</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.suspensionAndTermination.suspension.title')}</h5>
                            <p className="text-slate-700 mb-2">{t('authPage.modals.terms.content.suspensionAndTermination.suspension.description')}</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              {(t('authPage.modals.terms.content.suspensionAndTermination.suspension.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.suspensionAndTermination.termination.title')}</h5>
                            <p className="text-slate-700 mb-2">{t('authPage.modals.terms.content.suspensionAndTermination.termination.description')}</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              {(t('authPage.modals.terms.content.suspensionAndTermination.termination.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 9. MODIFICATIONS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.modifications.title')}</h4>
                        <p className="text-slate-700">
                          {t('authPage.modals.terms.content.modifications.description')}
                        </p>
                      </div>

                      {/* 10. GOVERNING LAW */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.governingLaw.title')}</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.governingLaw.jurisdiction.title')}</h5>
                            <p className="text-slate-700">
                              {t('authPage.modals.terms.content.governingLaw.jurisdiction.description')}
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.governingLaw.disputeResolution.title')}</h5>
                            <p className="text-slate-700">
                              {t('authPage.modals.terms.content.governingLaw.disputeResolution.description')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 11. ARBITRATION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.arbitration.title')}</h4>
                        <p className="text-slate-700">
                          {t('authPage.modals.terms.content.arbitration.description')}
                        </p>
                      </div>

                      {/* 12. GENERAL PROVISIONS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.generalProvisions.title')}</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.generalProvisions.entireAgreement.title')}</h5>
                            <p className="text-slate-700">
                              {t('authPage.modals.terms.content.generalProvisions.entireAgreement.description')}
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.generalProvisions.waiver.title')}</h5>
                            <p className="text-slate-700">
                              {t('authPage.modals.terms.content.generalProvisions.waiver.description')}
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.generalProvisions.severability.title')}</h5>
                            <p className="text-slate-700">
                              {t('authPage.modals.terms.content.generalProvisions.severability.description')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 13. CONTACT */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.terms.content.contact.title')}</h4>
                        <p className="text-slate-700 mb-2">{t('authPage.modals.terms.content.contact.description')}</p>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-blue-800"><strong>{t('authPage.modals.terms.content.contact.email.label')}:</strong> {t('authPage.modals.terms.content.contact.email.value')}</p>
                          <p className="text-blue-800"><strong>{t('authPage.modals.terms.content.contact.phone.label')}:</strong> {t('authPage.modals.terms.content.contact.phone.value')}</p>
                          <p className="text-blue-800"><strong>{t('authPage.modals.terms.content.contact.address.label')}:</strong> {t('authPage.modals.terms.content.contact.address.value')}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Scroll indicator */}
                  {!hasScrolledToBottom && (
                    <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                      <span className="text-amber-800 font-medium">
                        {t('authPage.modals.terms.scrollIndicator')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200">
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                  >
                    {t('authPage.modals.terms.cancel')}
                  </button>
                  <button
                    onClick={handleTermsAccept}
                    disabled={!hasScrolledToBottom}
                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                      hasScrolledToBottom
                        ? 'bg-[#05294E] text-white hover:bg-[#041f3a] shadow-lg'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {hasScrolledToBottom ? t('authPage.modals.terms.continueToPrivacy') : t('authPage.modals.terms.scrollToBottomFirst')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Policy Modal */}
          {showPrivacyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900">{t('authPage.modals.privacy.title')}</h2>
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title={t('authPage.modals.privacy.close')}
                  >
                    <X className="h-6 w-6 text-slate-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div 
                  ref={privacyContentRef}
                  onScroll={handlePrivacyScroll}
                  className="flex-1 overflow-y-auto p-6 space-y-6"
                >
                  {/* Privacy Policy Content */}
                  <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">{t('authPage.modals.privacy.content.title')}</h3>
                    <div className="prose prose-slate max-w-none">
                      {/* 1. INTRODUCTION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.introduction.title')}</h4>
                        <p className="text-slate-700 mb-4">
                          {t('authPage.modals.privacy.content.introduction.description')}
                        </p>
                      </div>

                      {/* 2. DATA COLLECTED AND ACCESSED */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataCollected.title')}</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataCollected.userAccountData.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              {(t('authPage.modals.privacy.content.dataCollected.userAccountData.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataCollected.gmailData.title')}</h5>
                            <p className="text-slate-700 mb-2">
                              {t('authPage.modals.privacy.content.dataCollected.gmailData.description')}
                            </p>
                            
                            <div className="border border-slate-200 p-4 mb-4">
                              <h6 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataCollected.gmailData.readonlyPermission.title')}</h6>
                              <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                                {(t('authPage.modals.privacy.content.dataCollected.gmailData.readonlyPermission.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="border border-slate-200 p-4">
                              <h6 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataCollected.gmailData.sendPermission.title')}</h6>
                              <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                                {(t('authPage.modals.privacy.content.dataCollected.gmailData.sendPermission.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. HOW WE USE YOUR INFORMATION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.howWeUse.title')}</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.howWeUse.primaryEmailHub.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              {(t('authPage.modals.privacy.content.howWeUse.primaryEmailHub.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.howWeUse.otherUses.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              {(t('authPage.modals.privacy.content.howWeUse.otherUses.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 4. DATA SECURITY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataSecurity.title')}</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="border border-slate-200 p-4">
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataSecurity.encryptionAndStorage.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.privacy.content.dataSecurity.encryptionAndStorage.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
                              ))}
                            </ul>
                          </div>

                          <div className="border border-slate-200 p-4">
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataSecurity.securityMeasures.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.privacy.content.dataSecurity.securityMeasures.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 5. GOOGLE COMPLIANCE */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.googleCompliance.title')}</h4>
                        <div className="border border-slate-300 p-4 bg-slate-50 rounded-lg">
                          <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.googleCompliance.important')}</h5>
                          <p className="text-slate-700 mb-2">
                            {t('authPage.modals.privacy.content.googleCompliance.description')}
                          </p>
                          <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                            {(t('authPage.modals.privacy.content.googleCompliance.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* 6. YOUR RIGHTS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.yourRights.title')}</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.yourRights.accessAndPortability.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.privacy.content.yourRights.accessAndPortability.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.yourRights.correctionAndUpdate.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.privacy.content.yourRights.correctionAndUpdate.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.yourRights.deletion.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.privacy.content.yourRights.deletion.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.yourRights.consentWithdrawal.title')}</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              {(t('authPage.modals.privacy.content.yourRights.consentWithdrawal.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 7. DATA RETENTION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataRetention.title')}</h4>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          {(t('authPage.modals.privacy.content.dataRetention.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                            <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
                          ))}
                        </ul>
                      </div>

                      {/* 8. DATA SHARING */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.dataSharing.title')}</h4>
                        <p className="text-slate-700 mb-2">
                          {t('authPage.modals.privacy.content.dataSharing.description')}
                        </p>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          {(t('authPage.modals.privacy.content.dataSharing.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      {/* 9. CHILDREN'S PRIVACY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.childrensPrivacy.title')}</h4>
                        <p className="text-slate-700">
                          {t('authPage.modals.privacy.content.childrensPrivacy.description')}
                        </p>
                      </div>

                      {/* 10. INTERNATIONAL DATA TRANSFERS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.internationalDataTransfers.title')}</h4>
                        <p className="text-slate-700">
                          {t('authPage.modals.privacy.content.internationalDataTransfers.description')}
                        </p>
                      </div>

                      {/* 11. CONTACT */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('authPage.modals.privacy.content.contact.title')}</h4>
                        <p className="text-slate-700 mb-2">
                          {t('authPage.modals.privacy.content.contact.description')}
                        </p>
                        <div className="border border-slate-200 p-4">
                          <p className="text-slate-700"><strong>{t('authPage.modals.privacy.content.contact.email.label')}:</strong> {t('authPage.modals.privacy.content.contact.email.value')}</p>
                          <p className="text-slate-700"><strong>{t('authPage.modals.privacy.content.contact.phone.label')}:</strong> {t('authPage.modals.privacy.content.contact.phone.value')}</p>
                          <p className="text-slate-700"><strong>{t('authPage.modals.privacy.content.contact.address.label')}:</strong> {t('authPage.modals.privacy.content.contact.address.value')}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Scroll indicator */}
                  {!hasScrolledToBottomPrivacy && (
                    <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                      <span className="text-amber-800 font-medium">
                        {t('authPage.modals.privacy.scrollIndicator')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200">
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                  >
                    {t('authPage.modals.privacy.cancel')}
                  </button>
                  <button
                    onClick={handlePrivacyAccept}
                    disabled={!hasScrolledToBottomPrivacy}
                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                      hasScrolledToBottomPrivacy
                        ? 'bg-[#05294E] text-white hover:bg-[#041f3a] shadow-lg'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {hasScrolledToBottomPrivacy ? t('authPage.modals.privacy.accept') : t('authPage.modals.privacy.scrollToBottomFirst')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de registro de estudante */}
          {showStudentVerificationNotice && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-2xl text-sm mb-4 mt-4">
              <div className="font-bold mb-1">{t('authPage.messages.checkEmail')}</div>
              {t('authPage.messages.studentVerification')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;