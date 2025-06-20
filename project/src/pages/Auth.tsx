import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, UserCheck, Zap, Shield, Award, GraduationCap, Users, Globe, MapPin, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthProps {
  mode: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ mode }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'university'>('student');
  const [formData, setFormData] = useState({
    name: '',
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

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'school') {
        navigate('/school/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        
        const userData = {
          name: formData.name,
          role: (activeTab === 'student' ? 'student' : 'school') as 'student' | 'school',
          // Add additional registration data only for universities
          ...(activeTab === 'university' && {
            universityName: formData.universityName,
            position: formData.position,
            website: formData.website,
            location: formData.location
          })
        };

        await register(formData.email, formData.password, userData);

        // Se for registro de universidade, mostra modal e retorna
        if (activeTab === 'university') {
          setShowVerificationModal(true);
          return;
        }
        // Para estudante, após o registro bem-sucedido, permite que o useEffect reaja.
        return;
      } else {
        await login(formData.email, formData.password);
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
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleTabChange = (tab: 'student' | 'university') => {
    setActiveTab(tab);
  };

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
              Welcome Back
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
                  value={formData.email}
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
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-black rounded-2xl text-white bg-[#D0151C] hover:bg-[#B01218] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D0151C] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  Sign In
                  <Zap className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>

            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-[#D0151C] hover:text-[#B01218] font-medium transition-colors">
                Forgot your password?
              </Link>
            </div>

            {/* Login Help Section */}
            {error && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                <h4 className="text-sm font-bold text-blue-900 mb-2">Having trouble signing in?</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Double-check your email address and password</li>
                  <li>• Make sure your account is confirmed (check your email)</li>
                  <li>• Try resetting your password if you've forgotten it</li>
                  <li>• Contact support if you continue having issues</li>
                </ul>
              </div>
            )}

            {/* Trust Indicators */}
            <div className="flex justify-center items-center space-x-6 pt-6 border-t border-slate-200">
              <div className="flex items-center text-xs text-slate-500">
                <Shield className="h-4 w-4 mr-1 text-green-500" />
                <span>Secure Login</span>
              </div>
              <div className="flex items-center text-xs text-slate-500">
                <Award className="h-4 w-4 mr-1 text-yellow-500" />
                <span>Trusted Platform</span>
              </div>
              <div className="flex items-center text-xs text-slate-500">
                <Zap className="h-4 w-4 mr-1 text-[#D0151C]" />
                <span>Fast Access</span>
              </div>
            </div>
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
              onClick={() => { setShowVerificationModal(false); window.location.href = '/school/termsandconditions'; }}
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
                    <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
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
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder="Enter your email"
                      />
                    </div>
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
                        value={formData.password}
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
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                </div>

                {/* Student Benefits */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 mt-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-[#05294E]" />
                    What you'll get as a student:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3"></div>
                      AI-powered scholarship matching
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3"></div>
                      Access to exclusive opportunities
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3"></div>
                      Personal application support
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3"></div>
                      English proficiency assessment
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mr-3"></div>
                      Visa and immigration support
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
                        value={formData.universityName}
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
                        name="name"
                        type="text"
                        required
                        value={formData.name}
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
                        value={formData.position}
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
                        value={formData.email}
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
                        value={formData.website}
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
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder="City, State"
                      />
                    </div>
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
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
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
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                </div>

                {/* University Benefits */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 mt-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-[#D0151C]" />
                    What you'll get as a university partner:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#D0151C] rounded-full mr-3"></div>
                      Access to qualified international students
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#D0151C] rounded-full mr-3"></div>
                      AI-powered student matching
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#D0151C] rounded-full mr-3"></div>
                      Scholarship program management
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-[#D0151C] rounded-full mr-3"></div>
                      Analytics and reporting tools
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
                  <Zap className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>

            {/* Trust Indicators */}
            <div className="flex justify-center items-center space-x-6 pt-6 border-t border-slate-200">
              <div className="flex items-center text-xs text-slate-500">
                <Shield className="h-4 w-4 mr-1 text-green-500" />
                <span>Secure</span>
              </div>
              <div className="flex items-center text-xs text-slate-500">
                <Award className="h-4 w-4 mr-1 text-yellow-500" />
                <span>Trusted</span>
              </div>
              <div className="flex items-center text-xs text-slate-500">
                <Zap className="h-4 w-4 mr-1 text-[#D0151C]" />
                <span>Fast Setup</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;