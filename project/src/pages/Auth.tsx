import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, UserCheck, Zap, Shield, Award, GraduationCap, Users, Globe, MapPin, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
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
    location: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showStudentVerificationNotice, setShowStudentVerificationNotice] = useState(false);
  
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Global scroll-to-top on login/register page load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      // console.log('Scroll position reset to top on login/register page load.');
    }, 75);
    return () => clearTimeout(timer);
  }, []);

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
            phone: formData.phone || ''
          })
        };

        console.log('🔍 [AUTH] userData criado:', userData);
        console.log('🔍 [AUTH] Telefone no userData:', userData.phone);
        
        // Salvar no localStorage antes de chamar register
        console.log('💾 [AUTH] Salvando telefone no localStorage:', formData.phone);
        localStorage.setItem('pending_phone', formData.phone || '');
        
        await register(formData.email, formData.password, userData);

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
                      />
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
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
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