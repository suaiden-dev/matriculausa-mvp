import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Phone, CheckCircle, X, ArrowLeft, UserCheck, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import Header from '../components/Header';

interface SellerRegistrationProps {}

const SellerRegistration: React.FC<SellerRegistrationProps> = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    registration_code: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasScrolledToBottomPrivacy, setHasScrolledToBottomPrivacy] = useState(false);
  
  // Estados para validação do código de registro
  const [registrationCodeValid, setRegistrationCodeValid] = useState<boolean | null>(null);
  const [registrationCodeLoading, setRegistrationCodeLoading] = useState(false);
  const [isRegistrationCodeLocked, setIsRegistrationCodeLocked] = useState(false);

  // Carregar código de registro da URL ou localStorage
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const codeFromUrl = searchParams.get('code');
    
    if (codeFromUrl) {
      console.log('[SELLER_REG] Código encontrado na URL:', codeFromUrl);
      setFormData(prev => ({ ...prev, registration_code: codeFromUrl }));
      setIsRegistrationCodeLocked(true);
      validateRegistrationCode(codeFromUrl);
    } else {
      // Verificar localStorage
      const pendingCode = localStorage.getItem('pending_seller_registration_code');
      if (pendingCode) {
        console.log('[SELLER_REG] Código encontrado no localStorage:', pendingCode);
        setFormData(prev => ({ ...prev, registration_code: pendingCode }));
        setIsRegistrationCodeLocked(true);
        validateRegistrationCode(pendingCode);
      }
    }
  }, [location.search]);

  // Validar código de registro de seller
  const validateRegistrationCode = async (code: string) => {
    if (!code || code.length < 4) {
      setRegistrationCodeValid(false);
      return;
    }

    setRegistrationCodeLoading(true);
    try {
      console.log('[SELLER_REG] Validando código de registro:', code);
      const { data, error } = await supabase
        .from('seller_registration_codes')
        .select('code, is_active')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      console.log('[SELLER_REG] Resultado da validação:', { data, error });

      if (error) {
        console.error('[SELLER_REG] Erro na validação:', error);
        setRegistrationCodeValid(false);
      } else if (data) {
        console.log('[SELLER_REG] Código válido:', data);
        setRegistrationCodeValid(true);
      } else {
        console.log('[SELLER_REG] Código não encontrado');
        setRegistrationCodeValid(false);
      }
    } catch (error) {
      console.error('[SELLER_REG] Exceção na validação:', error);
      setRegistrationCodeValid(false);
    } finally {
      setRegistrationCodeLoading(false);
    }
  };

  // Handle código de registro change
  const handleRegistrationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, registration_code: code }));
    
    if (code.length >= 4) {
      validateRegistrationCode(code);
    } else {
      setRegistrationCodeValid(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[SELLER_REG] Iniciando processo de registro de seller');
      console.log('[SELLER_REG] Dados do formulário:', formData);
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Validate allowed password characters: letters, numbers and @#$!
      const allowedPasswordRegex = /^[A-Za-z0-9@#$!]+$/;
      if (!allowedPasswordRegex.test(formData.password)) {
        setError('Password must contain only letters, numbers and the characters @#$!');
        setLoading(false);
        return;
      }
      
      // Validar telefone obrigatório
      if (!formData.phone || formData.phone.length < 8) {
        console.log('❌ [SELLER_REG] Phone validation failed:', {
          phone: formData.phone,
          length: formData.phone?.length
        });
        setError('Phone is required and must have at least 8 digits');
        setLoading(false);
        return;
      }
      
      // Validar aceitação dos termos
      if (!termsAccepted) {
        setError('You must accept the terms and conditions');
        setLoading(false);
        return;
      }

      // Validar código de registro
      if (!formData.registration_code || !registrationCodeValid) {
        setError('Invalid registration code');
        setLoading(false);
        return;
      }
      
      console.log('✅ [SELLER_REG] Validações passaram');
      
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'seller',
            phone: formData.phone
          }
        }
      });

      if (authError) {
        console.error('[SELLER_REG] Erro no signUp:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Falha ao criar usuário');
      }

      console.log('✅ [SELLER_REG] Usuário criado no auth:', authData.user.id);

      // 2. Criar registro pendente na tabela seller_registrations
      const { error: registrationError } = await supabase
        .from('seller_registrations')
        .insert({
          user_id: authData.user.id, // Adicionar o user_id
          admin_id: null, // Será preenchido quando o admin aprovar
          registration_code: formData.registration_code,
          email: formData.email.trim().toLowerCase(),
          full_name: formData.full_name,
          phone: formData.phone,
          status: 'pending'
        });

      if (registrationError) {
        console.error('[SELLER_REG] Erro ao criar registro pendente:', registrationError);
        // Não vamos falhar aqui, pois o usuário já foi criado
      }

      console.log('✅ [SELLER_REG] Registro pendente criado');

      // 3. Limpar localStorage
      localStorage.removeItem('pending_seller_registration_code');

      // 4. Mostrar modal de verificação
      setShowVerificationModal(true);

    } catch (err: any) {
      console.error('[SELLER_REG] Erro no registro:', err);
      let errorMessage = 'Authentication failed';
      
      if (err.message) {
        const message = err.message.toLowerCase();
        
        if (message.includes('email')) {
          errorMessage = 'This email is already in use';
        } else if (message.includes('password')) {
          errorMessage = 'Password must have at least 6 characters';
        } else if (message.includes('invalid')) {
          errorMessage = 'Invalid data provided';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle phone change
  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({ ...prev, phone: value || '' }));
  };

  // Scroll handlers for terms
  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToBottom(true);
    }
  };

  const handlePrivacyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToBottomPrivacy(true);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header da página de home */}
      <Header />
      
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header da página */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8">
              <img 
                src="/favicon-branco.png" 
                alt="Matrícula USA" 
                className="h-16 w-auto"
              />
            </div>
            <h1 className="text-5xl font-black text-slate-900 mb-4">
              Seller Registration
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Complete your registration to become a platform seller
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-slate-50 rounded-3xl p-8 shadow-lg border border-slate-200">
            {/* Seller Form Header */}
            <div className="text-center mb-8">
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Seller Registration</h2>
              <p className="text-slate-600">Complete your information to become a seller</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Registration Code - Largura total */}
              <div>
                <label htmlFor="registration_code" className="block text-sm font-bold text-slate-900 mb-2">
                  Registration Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="registration_code"
                    name="registration_code"
                    value={formData.registration_code}
                    onChange={handleRegistrationCodeChange}
                    disabled={isRegistrationCodeLocked}
                    className={`w-full pl-4 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 ${
                      isRegistrationCodeLocked 
                        ? 'bg-slate-100 cursor-not-allowed' 
                        : 'bg-white'
                    } ${
                      registrationCodeValid === true 
                        ? 'border-green-500' 
                        : registrationCodeValid === false 
                        ? 'border-red-500' 
                        : 'border-slate-300'
                    }`}
                    placeholder="Enter registration code"
                    required
                  />
                  {isRegistrationCodeLocked && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  {registrationCodeLoading && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {registrationCodeValid === true && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                  {registrationCodeValid === false && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                </div>
                {registrationCodeValid === false && (
                  <p className="mt-1 text-sm text-red-600">
                    Invalid or inactive registration code
                  </p>
                )}
                {registrationCodeValid === true && (
                  <p className="mt-1 text-sm text-green-600">
                    Valid code! You can continue with registration
                  </p>
                )}
              </div>

              {/* Grid de 2 colunas para os campos principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label htmlFor="full_name" className="block text-sm font-bold text-slate-900 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <PhoneInput
                      international
                      defaultCountry="BR"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                      placeholder="Enter your password"
                      required
                      minLength={6}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Minimum 6 characters. Only letters, numbers and @#$!
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                      placeholder="Confirm your password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              {/* Terms and Privacy - Largura total */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-gray-700">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Terms and Conditions
                    </button>
                    {' '}and the{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Privacy Policy
                    </button>
                  </label>
                </div>
              </div>

              {/* Error Message - Largura total */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Button - Largura total */}
              <button
                type="submit"
                disabled={loading || !registrationCodeValid || !termsAccepted}
                className={`group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl ${
                  loading || !registrationCodeValid || !termsAccepted
                    ? 'bg-slate-400'
                    : 'bg-[#05294E] hover:bg-[#041f3a]'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Seller Account'
                )}
              </button>

              {/* Login Link - Largura total */}
              <div className="text-center">
                <p className="text-sm text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-[#D0151C] hover:text-[#B01218] transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
        {showTermsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-medium">Terms and Conditions</h3>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div 
                className="p-6 overflow-y-auto max-h-[60vh]"
                onScroll={handleTermsScroll}
              >
                <div className="prose prose-sm max-w-none">
                  <h4>Terms and Conditions for Sellers</h4>
                  <p>
                    By registering as a seller, you agree to the following terms:
                  </p>
                  <ul>
                    <li>You will be responsible for your sales and commissions</li>
                    <li>Must follow all platform policies</li>
                    <li>Your access will be activated after administrator approval</li>
                    <li>You agree to maintain confidentiality of information</li>
                  </ul>
                  <p>
                    These terms may be updated at any time.
                  </p>
                </div>
              </div>
              <div className="p-6 border-t">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Modal */}
        {showPrivacyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-medium">Privacy Policy</h3>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div 
                className="p-6 overflow-y-auto max-h-[60vh]"
                onScroll={handlePrivacyScroll}
              >
                <div className="prose prose-sm max-w-none">
                  <h4>Privacy Policy for Sellers</h4>
                  <p>
                    Your personal information is protected and used only for:
                  </p>
                  <ul>
                    <li>Processing your registration and approval</li>
                    <li>Managing your seller account</li>
                    <li>Processing commissions and payments</li>
                    <li>Service-related communication</li>
                  </ul>
                  <p>
                    We do not share your information with third parties without your consent.
                  </p>
                </div>
              </div>
              <div className="p-6 border-t">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Modal */}
        {showVerificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Account Created Successfully!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Please check your email for a confirmation link to activate your seller account. 
                Click the link in the email to complete your registration.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    navigate('/');
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Go to Home
                </button>
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    navigate('/login');
                  }}
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default SellerRegistration;
