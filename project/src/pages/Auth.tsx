import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Building, UserCheck, Zap, Shield, Award, GraduationCap, Users, Globe, MapPin, CheckCircle, X, Scroll, Gift } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface AuthProps {
  mode: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ mode }) => {
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
    // Affiliate code field
    affiliateCode: ''
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
  const termsContentRef = useRef<HTMLDivElement>(null);
  const privacyContentRef = useRef<HTMLDivElement>(null);
  
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Global scroll-to-top on login/register page load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      // console.log('Scroll position reset to top on login/register page load.');
    }, 75);
    return () => clearTimeout(timer);
  }, []);

  // Capture affiliate code from localStorage (captura global já feita no App.tsx)
  useEffect(() => {
    if (mode === 'register') {
      const savedCode = localStorage.getItem('pending_referral_code');
      if (savedCode) {
        setFormData(prev => ({ ...prev, affiliateCode: savedCode }));
        validateAffiliateCode(savedCode);
        setIsReferralCodeLocked(true); // Bloqueia edição
      }
    }
  }, [mode]);

  // Validate affiliate code
  const validateAffiliateCode = async (code: string) => {
    if (!code || code.length < 4) {
      setAffiliateCodeValid(false);
      return;
    }

    setAffiliateCodeLoading(true);
    try {
      const { data, error } = await supabase
        .from('affiliate_codes')
        .select('code, is_active')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setAffiliateCodeValid(false);
      } else {
        setAffiliateCodeValid(true);
      }
    } catch (error) {
      setAffiliateCodeValid(false);
    } finally {
      setAffiliateCodeLoading(false);
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

  // Handle scroll in terms modal
  const handleTermsScroll = () => {
    if (termsContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
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
    if (hasScrolledToBottom) {
      setShowTermsModal(false);
      setShowPrivacyModal(true);
      setHasScrolledToBottomPrivacy(false);
    }
  };

  // Handle privacy acceptance
  const handlePrivacyAccept = () => {
    if (hasScrolledToBottomPrivacy) {
      setTermsAccepted(true);
      setShowPrivacyModal(false);
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
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        // Validate allowed password characters: letters, numbers and @#$!
        const allowedPasswordRegex = /^[A-Za-z0-9@#$!]+$/;
        if (!allowedPasswordRegex.test(formData.password)) {
          setError('Password contains invalid characters. Only letters, numbers, and @ # $ ! are allowed.');
          setLoading(false);
          return;
        }
        
        // Validar telefone obrigatório e formato internacional
        if (!formData.phone || formData.phone.length < 8) {
          console.log('❌ [AUTH] Validação de telefone falhou:', {
            phone: formData.phone,
            length: formData.phone?.length
          });
          setError('Please enter a valid phone number with country code');
          setLoading(false);
          return;
        }
        
        // Validar aceitação dos termos
        if (!termsAccepted) {
          setError('You must accept the Terms of Use and Privacy Policy to continue');
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
            affiliate_code: formData.affiliateCode || null // Add affiliate code to user data
          })
        };

        console.log('🔍 [AUTH] userData criado:', userData);
        console.log('🔍 [AUTH] Telefone no userData:', userData.phone);
        
        // Salvar no localStorage antes de chamar register
        console.log('💾 [AUTH] Salvando telefone no localStorage:', formData.phone);
        localStorage.setItem('pending_phone', formData.phone || '');
        
        await register(formData.email, formData.password, userData);

        // Limpar código de referência do localStorage após registro bem-sucedido
        localStorage.removeItem('pending_referral_code');

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
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (err.message) {
        const message = err.message.toLowerCase();
        
        if (message.includes('invalid_credentials') || message.includes('invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (message.includes('email_not_confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (message.includes('too_many_requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
        } else if (message.includes('user_not_found')) {
          errorMessage = 'No account found with this email address. Please check your email or create a new account.';
        } else if (message.includes('weak_password')) {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else if (message.includes('email_address_invalid')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (message.includes('signup_disabled')) {
          errorMessage = 'New registrations are currently disabled. Please contact support.';
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
              Login
            </h2>
            <p className="text-slate-600 text-lg">
              Sign in to access your dashboard and continue your educational journey
            </p>
            <p className="mt-4 text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-[#D0151C] hover:text-[#B01218] transition-colors">
                Sign up here
              </Link>
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6 bg-slate-50 p-8 rounded-3xl shadow-lg border border-slate-200" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                <div className="font-medium text-red-800 mb-1">Login Failed</div>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                Email Address
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
                  placeholder="Enter your email"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                Password
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-[#D0151C] hover:text-[#B01218] font-medium transition-colors"
              >
                Forgot your password?
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
                  Signing In...
                </div>
              ) : (
                'Sign In'
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
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration successful!</h2>
              <p className="text-slate-700 text-base mb-4">
                A verification link has been sent to your email.<br />
                Please check your inbox (and spam/junk folder) to complete your login and access the dashboard.
              </p>
            </div>
            <button
              className="bg-[#05294E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#02172b] transition-all duration-200"
              onClick={() => setShowVerificationModal(false)}
            >
              Got it
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
            Create Your Account
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Create your account and unlock exclusive scholarship opportunities through our AI-powered platform
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#D0151C] hover:text-[#B01218] transition-colors">
              Sign in here
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
              I'm a Student
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
              I'm a University
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-slate-50 rounded-3xl p-8 shadow-lg border border-slate-200">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-6">
              <div className="font-medium text-red-800 mb-1">Registration Failed</div>
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
                  <h2 className="text-3xl font-black text-slate-900 mb-2">Student Registration</h2>
                  <p className="text-slate-600">Start your journey to American education excellence</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-bold text-slate-900 mb-2">
                      Full Name *
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
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                      Email Address *
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
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                      Phone Number *
                    </label>
                    <PhoneInput
                      international
                      defaultCountry="US"
                      addInternationalOption={false}
                      value={formData.phone}
                      onChange={(value) => {
                        console.log('📞 [PHONEINPUT] Valor capturado:', value);
                        setFormData(prev => {
                          const newData = { ...prev, phone: value || '' };
                          console.log('📞 [PHONEINPUT] Novo formData:', newData);
                          return newData;
                        });
                      }}
                      style={{
                        '--PhoneInputCountryFlag-height': '1.2em',
                        '--PhoneInputCountrySelectArrow-opacity': '0.8',
                        '--PhoneInput-color--focus': '#05294E'
                      }}
                      className="phone-input-custom"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                      Password *
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
                        placeholder="Create a password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                      Confirm Password *
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
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {/* Affiliate Code Field */}
                  <div>
                    <label htmlFor="affiliateCode" className="block text-sm font-bold text-slate-900 mb-2">
                      <div className="flex items-center space-x-2">
                        <Gift className="h-4 w-4 text-[#05294E]" />
                        <span>Friend's Referral Code (Optional)</span>
                      </div>
                    </label>
                    <div className="relative">
                      {isReferralCodeLocked ? (
                        <Lock className="absolute left-4 top-4 h-5 w-5 text-green-500" />
                      ) : (
                        <Gift className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      )}
                      <input
                        id="affiliateCode"
                        name="affiliateCode"
                        type="text"
                        value={formData.affiliateCode || ''}
                        onChange={handleAffiliateCodeChange}
                        readOnly={isReferralCodeLocked}
                        className={`w-full pl-12 pr-4 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 ${
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
                        placeholder={isReferralCodeLocked ? "Referral code applied" : "Enter friend's referral code (e.g., MATR1234)"}
                        maxLength={8}
                      />
                      {affiliateCodeLoading && (
                        <div className="absolute right-4 top-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#05294E]"></div>
                        </div>
                      )}
                      {affiliateCodeValid === true && (
                        <div className="absolute right-4 top-4">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                      {affiliateCodeValid === false && formData.affiliateCode && (
                        <div className="absolute right-4 top-4">
                          <X className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </div>
                    {formData.affiliateCode && (
                      <div className="mt-2 text-sm">
                        {affiliateCodeValid === true && (
                          <p className="text-green-600 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid referral code! You'll get $50 off your selection process fee.
                            {isReferralCodeLocked && (
                              <span className="ml-2 text-blue-600">
                                (Applied from referral link)
                              </span>
                            )}
                          </p>
                        )}
                        {affiliateCodeValid === false && (
                          <p className="text-red-600 flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            Invalid referral code. Please check and try again.
                          </p>
                        )}
                      </div>
                    )}
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
                  <h2 className="text-3xl font-black text-slate-900 mb-2">University Registration</h2>
                  <p className="text-slate-600">Partner with us to reach talented international students</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="universityName" className="block text-sm font-bold text-slate-900 mb-2">
                      University Name *
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
                        placeholder="Enter university name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                      Contact Person Name *
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
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="position" className="block text-sm font-bold text-slate-900 mb-2">
                      Role at University *
                    </label>
                    <div className="relative">
                      <UserCheck className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="position"
                        name="position"
                        type="text"
                        required
                        value={formData.position || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder="e.g., Admissions Officer, Program Director"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                      Official Email *
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
                        placeholder="Official university email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-bold text-slate-900 mb-2">
                      University Website
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="website"
                        name="website"
                        type="url"
                        value={formData.website || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder="https://university.edu"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-bold text-slate-900 mb-2">
                      Location *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="location"
                        name="location"
                        type="text"
                        required
                        value={formData.location || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder="City, State"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                      Phone Number *
                    </label>
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
                      className="phone-input-university"
                      placeholder="Enter contact phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                      Password *
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
                        placeholder="Create a password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                      Confirm Password *
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
                        placeholder="Confirm your password"
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
                I have read and agree to the{' '}
                <span className="text-[#05294E] hover:text-[#041f3a] font-semibold underline">
                  Terms of Use
                </span>
                {' '}and{' '}
                <span className="text-[#05294E] hover:text-[#041f3a] font-semibold underline">
                  Privacy Policy
                </span>
                {' '}(you will be prompted to read both documents).
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className={`w-full flex justify-center py-4 px-4 border border-transparent text-lg font-black rounded-2xl text-white transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'student' 
                  ? 'bg-[#05294E] hover:bg-[#05294E]/90 focus:ring-[#05294E]' 
                  : 'bg-[#D0151C] hover:bg-[#B01218] focus:ring-[#D0151C]'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center">
                  Create {activeTab === 'student' ? 'Student' : 'University'} Account
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
                  <h2 className="text-2xl font-bold text-slate-900">Terms of Use</h2>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title="Close modal"
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
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Terms of Use</h3>
                    <div className="prose prose-slate max-w-none">
                      {/* 1. ACCEPTANCE OF TERMS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">1. ACCEPTANCE OF TERMS</h4>
                        <p className="text-slate-700 mb-4">
                          By accessing and using the Matrícula USA platform, you agree to comply with and be bound by these Terms of Service. 
                          If you do not agree to any part of these terms, you should not use our services.
                        </p>
                      </div>

                      {/* 2. SERVICE DESCRIPTION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">2. SERVICE DESCRIPTION</h4>
                        <p className="text-slate-700 mb-4">
                          Matrícula USA is a SaaS (Software as a Service) platform that offers:
                        </p>
                        
                        <div className="space-y-4 mb-4">
                          <div className="border border-slate-200 p-4 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">2.1 Email Hub for Universities</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Secure integration with Gmail accounts through OAuth 2.0</li>
                              <li>Professional interface for institutional email management</li>
                              <li>Organized tab system (Inbox, Sent, Starred, Drafts, Spam, Trash)</li>
                              <li>Real-time email counts</li>
                              <li>Smart forwarding functionality</li>
                              <li>Integrated composer for new emails</li>
                              <li>Advanced search and filters</li>
                              <li>Responsive interface for all devices</li>
                            </ul>
                          </div>

                          <div className="border border-slate-200 p-4 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">2.2 Scholarship Management</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Creation and management of scholarships</li>
                              <li>Student application process</li>
                              <li>Document and application status management</li>
                              <li>Integrated payment system</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 3. LICENSE GRANT */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">3. LICENSE GRANT</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">3.1 Limited License</h5>
                            <p className="text-slate-700">
                              We grant you a limited, non-exclusive, non-transferable, and revocable license to access and use 
                              the Matrícula USA platform in accordance with these Terms.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">3.2 Restrictions</h5>
                            <p className="text-slate-700 mb-2">You agree not to:</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              <li>Use the platform for illegal or unauthorized purposes</li>
                              <li>Attempt to access unauthorized systems or data</li>
                              <li>Interfere with platform operation</li>
                              <li>Share access credentials</li>
                              <li>Use the platform for spam or malicious content</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 4. THIRD-PARTY DEPENDENCIES */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">4. THIRD-PARTY DEPENDENCIES</h4>
                        <div className="space-y-4">
                          <div className="border border-slate-300 p-4 bg-slate-50 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">4.1 Google APIs</h5>
                            <p className="text-slate-700 mb-2">
                              The "Email Hub" functionality depends on Google APIs and is subject to Google's Terms of Service. 
                              By using this functionality, you agree to comply with:
                            </p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Google Terms of Service</li>
                              <li>Google Privacy Policy</li>
                              <li>Google API Services User Data Policy</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">4.2 Other Providers</h5>
                            <p className="text-slate-700 mb-2">Our platform also uses:</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              <li><strong>Supabase:</strong> For data storage and authentication</li>
                              <li><strong>Stripe:</strong> For payment processing</li>
                              <li><strong>Vercel/Netlify:</strong> For application hosting</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 5. INTELLECTUAL PROPERTY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">5. INTELLECTUAL PROPERTY</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">5.1 Platform Ownership</h5>
                            <p className="text-slate-700 text-sm">
                              The Matrícula USA platform, including its code, design, features, and content, is the exclusive 
                              property of Matrícula USA and is protected by intellectual property laws.
                            </p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-slate-900 mb-2">5.2 Customer Data</h5>
                            <p className="text-slate-700 text-sm mb-2">All customer data, including:</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Email content</li>
                              <li>Personal information</li>
                              <li>Submitted documents</li>
                              <li>Application history</li>
                            </ul>
                            <p className="text-slate-700 text-sm mt-2">
                              Remains the exclusive property of the customer. Matrícula USA acts only as a processor of this data.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 6. RESPONSIBILITIES */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">6. RESPONSIBILITIES</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">6.1 User Responsibilities</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Provide true and accurate information</li>
                              <li>Maintain security of credentials</li>
                              <li>Use the platform responsibly</li>
                              <li>Comply with applicable laws</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">6.2 Matrícula USA Responsibilities</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Maintain platform operation</li>
                              <li>Protect user data according to our Privacy Policy</li>
                              <li>Provide adequate technical support</li>
                              <li>Notify about significant changes</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 7. LIMITATION OF LIABILITY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">7. LIMITATION OF LIABILITY</h4>
                        <p className="text-slate-700 mb-2">Matrícula USA will not be liable for:</p>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li>Data loss due to technical failures</li>
                          <li>Temporary service interruptions</li>
                          <li>Indirect or consequential damages</li>
                          <li>Actions of third parties (Google, Stripe, etc.)</li>
                        </ul>
                      </div>

                      {/* 8. SUSPENSION AND TERMINATION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">8. SUSPENSION AND TERMINATION</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">8.1 Suspension</h5>
                            <p className="text-slate-700 mb-2">We may suspend your access if:</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              <li>You violate these Terms</li>
                              <li>You use the platform abusively</li>
                              <li>You fail to make due payments</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">8.2 Termination</h5>
                            <p className="text-slate-700 mb-2">You may terminate your account at any time. After termination:</p>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              <li>Your data will be deleted according to our Privacy Policy</li>
                              <li>Gmail integrations will be disconnected</li>
                              <li>Platform access will be revoked</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 9. MODIFICATIONS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">9. MODIFICATIONS</h4>
                        <p className="text-slate-700">
                          We reserve the right to modify these Terms at any time. Significant changes will be communicated 30 days in advance.
                        </p>
                      </div>

                      {/* 10. GOVERNING LAW */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">10. GOVERNING LAW</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">10.1 Jurisdiction</h5>
                            <p className="text-slate-700">
                              These Terms are governed by the laws of the State of California, United States.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">10.2 Dispute Resolution</h5>
                            <p className="text-slate-700">
                              Any disputes will be resolved in the courts of Los Angeles County, California, with express waiver of any other venue, 
                              no matter how privileged.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 11. ARBITRATION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">11. ARBITRATION</h4>
                        <p className="text-slate-700">
                          Any disputes arising from these Terms will be resolved through binding arbitration in accordance with 
                          the American Arbitration Association rules.
                        </p>
                      </div>

                      {/* 12. GENERAL PROVISIONS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">12. GENERAL PROVISIONS</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">12.1 Entire Agreement</h5>
                            <p className="text-slate-700">
                              These Terms constitute the complete agreement between the parties.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">12.2 Waiver</h5>
                            <p className="text-slate-700">
                              Failure to exercise any right does not constitute waiver.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">12.3 Severability</h5>
                            <p className="text-slate-700">
                              If any provision is found invalid, the remaining provisions will remain in effect.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 13. CONTACT */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">13. CONTACT</h4>
                        <p className="text-slate-700 mb-2">For questions about these Terms:</p>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-blue-800"><strong>Email:</strong> info@matriculausa.com</p>
                          <p className="text-blue-800"><strong>Phone:</strong> +1 (213) 676-2544</p>
                          <p className="text-blue-800"><strong>Address:</strong> Los Angeles - CA - USA</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Scroll indicator */}
                  {!hasScrolledToBottom && (
                    <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                      <span className="text-amber-800 font-medium">
                        Please scroll to the bottom to continue to Privacy Policy
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
                    Cancel
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
                    {hasScrolledToBottom ? 'Continue to Privacy Policy' : 'Scroll to Bottom First'}
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
                  <h2 className="text-2xl font-bold text-slate-900">Privacy Policy</h2>
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title="Close modal"
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
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Privacy Policy</h3>
                    <div className="prose prose-slate max-w-none">
                      {/* 1. INTRODUCTION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">1. INTRODUCTION</h4>
                        <p className="text-slate-700 mb-4">
                          Matrícula USA ("we", "our", "us") is committed to protecting the privacy and personal data of our users. 
                          This Privacy Policy describes how we collect, use, store, and protect your information when you use our 
                          Email Hub platform for universities.
                        </p>
                      </div>

                      {/* 2. DATA COLLECTED AND ACCESSED */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">2. DATA COLLECTED AND ACCESSED</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">2.1 User Account Data</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              <li>Full name</li>
                              <li>Email address</li>
                              <li>Phone number</li>
                              <li>Country of origin</li>
                              <li>Academic profile (study level, field of interest, GPA, English proficiency)</li>
                              <li>Payment information (through Stripe)</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">2.2 Gmail Data (Email Hub)</h5>
                            <p className="text-slate-700 mb-2">
                              Based on our platform's code analysis, when you connect your Gmail account, we access the following data:
                            </p>
                            
                            <div className="border border-slate-200 p-4 mb-4">
                              <h6 className="font-semibold text-slate-900 mb-2">gmail.readonly Permission:</h6>
                              <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                                <li>Email list (ID, threadId, sender, recipient, subject)</li>
                                <li>Complete email content (text and HTML body)</li>
                                <li>Email metadata (date, priority, attachments, labels)</li>
                                <li>Email count by category (Inbox, Sent, Starred, Drafts, Spam, Trash)</li>
                                <li>Email read status</li>
                                <li>Thread/conversation information</li>
                              </ul>
                            </div>

                            <div className="border border-slate-200 p-4">
                              <h6 className="font-semibold text-slate-900 mb-2">gmail.send Permission:</h6>
                              <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                                <li>Ability to send emails through Gmail API</li>
                                <li>Ability to forward existing emails</li>
                                <li>Ability to reply to emails</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. HOW WE USE YOUR INFORMATION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">3. HOW WE USE YOUR INFORMATION</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">3.1 Primary Email Hub Functionality</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              <li><strong>Email Viewing:</strong> We display complete email content to facilitate institutional management</li>
                              <li><strong>Category Organization:</strong> We organize emails into tabs (Inbox, Sent, Starred, etc.) with real-time counts</li>
                              <li><strong>Smart Forwarding:</strong> We allow forwarding emails with complete content preserved</li>
                              <li><strong>New Email Composition:</strong> Integrated interface for creating and sending new institutional emails</li>
                              <li><strong>Search and Filters:</strong> Search functionality to locate specific emails</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">3.2 Other Uses</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm ml-4">
                              <li>Scholarship and application management</li>
                              <li>Payment processing</li>
                              <li>User communication</li>
                              <li>Platform improvement</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 4. DATA SECURITY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">4. DATA SECURITY</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="border border-slate-200 p-4">
                            <h5 className="font-semibold text-slate-900 mb-2">4.1 Encryption and Storage</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li><strong>OAuth Tokens:</strong> We store Gmail access and refresh tokens encrypted using AES-GCM with PBKDF2-derived keys</li>
                              <li><strong>Sensitive Data:</strong> All sensitive data is encrypted before storage in Supabase</li>
                              <li><strong>Transmission:</strong> All communications are protected by HTTPS/TLS</li>
                            </ul>
                          </div>

                          <div className="border border-slate-200 p-4">
                            <h5 className="font-semibold text-slate-900 mb-2">4.2 Security Measures</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Secure OAuth 2.0 authentication</li>
                              <li>Access tokens with automatic expiration</li>
                              <li>Automatic token renewal for expired tokens</li>
                              <li>Detailed logs for security auditing</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 5. GOOGLE COMPLIANCE */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">5. GOOGLE COMPLIANCE</h4>
                        <div className="border border-slate-300 p-4 bg-slate-50 rounded-lg">
                          <h5 className="font-semibold text-slate-900 mb-2">IMPORTANT</h5>
                          <p className="text-slate-700 mb-2">
                            The use and transfer of information received from Google APIs to any other app by Matrícula USA will 
                            adhere to the <strong>Google API Services User Data Policy</strong>, including the <strong>Limited Use</strong> requirements.
                          </p>
                          <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                            <li>We use only necessary permissions (gmail.readonly and gmail.send)</li>
                            <li>We do not share Gmail data with third parties</li>
                            <li>We do not use Gmail data for advertising or profile analysis</li>
                            <li>We respect all Google API usage policies</li>
                          </ul>
                        </div>
                      </div>

                      {/* 6. YOUR RIGHTS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">6. YOUR RIGHTS (CCPA/State Laws)</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">6.1 Access and Portability</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Request access to all your personal data</li>
                              <li>Receive your data in a structured, machine-readable format</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">6.2 Correction and Update</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Correct inaccurate or incomplete personal data</li>
                              <li>Update your profile information at any time</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">6.3 Deletion</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Request deletion of your personal data</li>
                              <li>Disconnect your Gmail account at any time</li>
                              <li>Delete your platform account</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-900 mb-2">6.4 Consent Withdrawal</h5>
                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                              <li>Withdraw consent for Gmail data usage</li>
                              <li>Disconnect third-party integrations</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 7. DATA RETENTION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">7. DATA RETENTION</h4>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li><strong>Account Data:</strong> Kept while your account is active</li>
                          <li><strong>OAuth Tokens:</strong> Stored until you disconnect or delete your account</li>
                          <li><strong>Security Logs:</strong> Kept for 12 months for auditing</li>
                          <li><strong>Payment Data:</strong> Kept as required by law</li>
                        </ul>
                      </div>

                      {/* 8. DATA SHARING */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">8. DATA SHARING</h4>
                        <p className="text-slate-700 mb-2">
                          We do not sell, rent, or share your personal data with third parties, except:
                        </p>
                        <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                          <li>Essential service providers (Supabase, Stripe, Google)</li>
                          <li>When required by law</li>
                          <li>With your explicit consent</li>
                        </ul>
                      </div>

                      {/* 9. CHILDREN'S PRIVACY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">9. CHILDREN'S PRIVACY</h4>
                        <p className="text-slate-700">
                          Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
                        </p>
                      </div>

                      {/* 10. INTERNATIONAL DATA TRANSFERS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">10. INTERNATIONAL DATA TRANSFERS</h4>
                        <p className="text-slate-700">
                          Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
                        </p>
                      </div>

                      {/* 11. CONTACT */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">11. CONTACT</h4>
                        <p className="text-slate-700 mb-2">
                          To exercise your rights or clarify questions about this policy:
                        </p>
                        <div className="border border-slate-200 p-4">
                          <p className="text-slate-700"><strong>Email:</strong> info@matriculausa.com</p>
                          <p className="text-slate-700"><strong>Phone:</strong> +1 (213) 676-2544</p>
                          <p className="text-slate-700"><strong>Address:</strong> Los Angeles - CA - USA</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Scroll indicator */}
                  {!hasScrolledToBottomPrivacy && (
                    <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                      <span className="text-amber-800 font-medium">
                        Please scroll to the bottom to accept the privacy policy
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
                    Cancel
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
                    {hasScrolledToBottomPrivacy ? 'I Accept Privacy Policy' : 'Scroll to Bottom First'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de registro de estudante */}
          {showStudentVerificationNotice && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-2xl text-sm mb-4 mt-4">
              <div className="font-bold mb-1">Check your email!</div>
              A confirmation link has been sent to your email. Please check your inbox (and spam folder) to activate your account.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;