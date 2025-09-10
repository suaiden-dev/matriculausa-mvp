import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Phone, CheckCircle, UserCheck, Shield, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import Header from '../components/Header';

interface SellerRegistrationProps {}

const SellerRegistration: React.FC<SellerRegistrationProps> = () => {
  const { t: _t } = useTranslation();
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

  // States para validação do código de registro
  const [registrationCodeValid, setRegistrationCodeValid] = useState<boolean | null>(null);
  const [registrationCodeLoading, setRegistrationCodeLoading] = useState(false);
  const [isRegistrationCodeLocked, setIsRegistrationCodeLocked] = useState(false);

  // Carrega o código de registro da URL ou do localStorage
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const codeFromUrl = searchParams.get('code');
    const codeToValidate = codeFromUrl || localStorage.getItem('pending_seller_registration_code');

    if (codeToValidate) {
      console.log('[SELLER_REG] Código encontrado:', codeToValidate);
      setFormData(prev => ({ ...prev, registration_code: codeToValidate }));
      setIsRegistrationCodeLocked(true);
      validateRegistrationCode(codeToValidate);
    }
  }, [location.search]);

  // Valida o código de registro do vendedor
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

      if (error || !data) {
        console.error('[SELLER_REG] Erro de validação ou código não encontrado:', error);
        setRegistrationCodeValid(false);
      } else {
        console.log('[SELLER_REG] Código válido:', data);
        setRegistrationCodeValid(true);
      }
    } catch (err) {
      console.error('[SELLER_REG] Exceção na validação:', err);
      setRegistrationCodeValid(false);
    } finally {
      setRegistrationCodeLoading(false);
    }
  };

  // Lida com a mudança no campo do código de registro
  const handleRegistrationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, registration_code: code }));

    if (code.length >= 4) {
      validateRegistrationCode(code);
    } else {
      setRegistrationCodeValid(null);
    }
  };

  // Lida com a submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações iniciais
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!/^[A-Za-z0-9@#$!]+$/.test(formData.password)) {
      setError('Password must contain only letters, numbers and the characters @#$!');
      return;
    }
    if (!formData.phone || formData.phone.length < 8) {
      setError('Phone is required and must have at least 8 digits');
      return;
    }
    if (!termsAccepted) {
      setError('You must accept the terms and conditions');
      return;
    }
    if (!registrationCodeValid) {
      setError('Invalid registration code');
      return;
    }

    setLoading(true);

    try {
      console.log('[SELLER_REG] Iniciando processo de registro de vendedor');
      console.log('[SELLER_REG] Dados do formulário:', formData);

      // 1. Criar usuário na autenticação
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'student', // Usuário começa como 'student'
            phone: formData.phone,
            seller_referral_code: formData.registration_code
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');
      
      console.log('✅ [SELLER_REG] Usuário criado com sucesso:', authData.user.id);

      // 2. Enviar notificação para o admin do afiliado
      try {
        console.log('📧 [SELLER_REG] Buscando admin do afiliado para notificação...');
        
        // Busca o admin_id associado ao código de registro
        const { data: codeData, error: codeError } = await supabase
          .from('seller_registration_codes')
          .select('admin_id')
          .eq('code', formData.registration_code)
          .single();

        if (codeError || !codeData?.admin_id) {
          throw new Error('Affiliate admin not found for this code.');
        }

        const affiliateAdminId = codeData.admin_id;
        console.log('✅ [SELLER_REG] ID do admin do afiliado encontrado:', affiliateAdminId);

        // Busca os dados do admin do afiliado
        const { data: adminData, error: adminError } = await supabase
          .rpc('get_user_email_by_id', { user_id_param: affiliateAdminId });
        
        if (adminError || !adminData || adminData.length === 0) {
            console.warn('⚠️ [SELLER_REG] Não foi possível buscar dados do admin, a notificação pode falhar.');
        }

        const adminUser = adminData?.[0] || { full_name: 'Affiliate Admin', email: 'admin@matriculausa.com' };
        
        const notificationPayload = {
          tipo_notf: "Novo vendedor se registrou",
          email_affiliate_admin: adminUser.email,
          nome_affiliate_admin: adminUser.full_name,
          email_seller: formData.email.trim().toLowerCase(),
          nome_seller: formData.full_name,
          phone_seller: formData.phone,
          o_que_enviar: `Um novo vendedor ${formData.full_name} (${formData.email}) se registrou usando seu código ${formData.registration_code}. Acesse o dashboard para aprovar ou rejeitar a solicitação.`,
          registration_code: formData.registration_code,
          seller_id: authData.user.id,
          dashboard_link: "/affiliate-admin/dashboard?tab=pending"
        };
        
        console.log('🚀 [SELLER_REG] Enviando webhook para n8n...');
        const notificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationPayload),
        });

        if (notificationResponse.ok) {
          console.log('✅ [SELLER_REG] Notificação enviada com sucesso!');
        } else {
          console.warn('⚠️ [SELLER_REG] Falha ao enviar notificação:', notificationResponse.statusText);
        }

      } catch (notificationError) {
        console.error('❌ [SELLER_REG] Erro no processo de notificação:', notificationError);
        // Não interrompe o fluxo de registro se a notificação falhar
      }

      // 3. Limpar localStorage e mostrar modal de sucesso
      localStorage.removeItem('pending_seller_registration_code');
      setShowVerificationModal(true);

    } catch (err: any) {
      console.error('❌ [SELLER_REG] Erro no registro:', err);
      let errorMessage = 'Authentication failed. Please try again.';
      if (err.message) {
        if (err.message.toLowerCase().includes('email')) {
          errorMessage = 'This email is already in use';
        } else if (err.message.toLowerCase().includes('password')) {
          errorMessage = 'Password must have at least 6 characters';
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({ ...prev, phone: value || '' }));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
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

          <div className="bg-slate-50 rounded-3xl p-8 shadow-lg border border-slate-200">
            <div className="text-center mb-8">
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Seller Registration</h2>
              <p className="text-slate-600">Complete your information to become a seller</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    className={`w-full pl-4 pr-10 py-4 border placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 ${
                      isRegistrationCodeLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    } ${
                      registrationCodeValid === true ? 'border-green-500' : registrationCodeValid === false ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="Enter registration code"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {isRegistrationCodeLocked && !registrationCodeLoading && <Shield className="w-5 h-5 text-blue-600" />}
                    {registrationCodeLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>}
                    {registrationCodeValid === true && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {registrationCodeValid === false && <X className="w-5 h-5 text-red-600" />}
                  </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-bold text-slate-900 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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

                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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

                <div>
                  <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                    Phone
                  </label>
                  <div className="relative group">
                     <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
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

                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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

              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="terms-acceptance"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E] flex-shrink-0"
                />
                <label htmlFor="terms-acceptance" className="text-sm text-slate-600 cursor-pointer leading-relaxed">
                  By clicking Create Seller Account, you agree to our{' '}
                  <a 
                    href="/terms-of-service" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#05294E] hover:text-[#05294E]/80 font-medium underline"
                  >
                    Terms of Use
                  </a>
                  {' '}and{' '}
                  <a 
                    href="/privacy-policy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#05294E] hover:text-[#05294E]/80 font-medium underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

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

      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-center shadow-2xl">
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
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Home
              </button>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  navigate('/login');
                }}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
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