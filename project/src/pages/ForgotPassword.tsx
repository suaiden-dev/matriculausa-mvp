import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, Zap, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const location = useLocation();

  // Detect access_token in URL (Supabase reset link)
  const [showResetForm, setShowResetForm] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, '?'));
    const token = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (token && refresh) {
      setShowResetForm(true);
      setAccessToken(token);
      setRefreshToken(refresh);
      setEmailVerified(true); // Skip to password reset step
      setEmailSent(true);
    }
  }, [location]);

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Generate a simple 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Send email with verification code (simulated)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password?verified=true`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      setMessage(`Verification code sent to ${email}! For demo purposes, the code is: ${code}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) return { level: 'weak', color: 'bg-red-500', text: 'Weak' };
    if (strength <= 3) return { level: 'medium', color: 'bg-yellow-500', text: 'Medium' };
    if (strength <= 4) return { level: 'good', color: 'bg-blue-500', text: 'Good' };
    return { level: 'strong', color: 'bg-green-500', text: 'Strong' };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back to Login Link */}
        <div className="text-center">
          <Link 
            to="/login" 
            className="inline-flex items-center text-sm text-slate-600 hover:text-[#05294E] transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Link>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-[#05294E] w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl">
              {emailVerified ? <Lock className="h-8 w-8 text-white" /> : <Mail className="h-8 w-8 text-white" />}
            </div>
          </div>
          
          <h2 className="text-4xl font-black text-slate-900 mb-4">
            {!emailSent ? 'Forgot Password?' : 
             !emailVerified ? 'Verify Your Email' : 
             'Set New Password'}
          </h2>
          
          <p className="text-slate-600 text-lg leading-relaxed">
            {!emailSent 
              ? 'Enter your email address and we\'ll send you a verification code to reset your password.'
              : !emailVerified 
              ? 'Enter the verification code we sent to your email address.'
              : 'Create a new secure password for your account.'
            }
          </p>
        </div>

        {/* Main Form Container */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          {/* Step 1: Email Input */}
          {!emailSent && (
            <form onSubmit={handleSendVerification} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Email Input */}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-black rounded-2xl text-white bg-[#05294E] hover:bg-[#05294E]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending Code...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Send Verification Code
                    <Zap className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Email Verification - REMOVIDO */}
          {emailSent && !showResetForm && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-2xl text-sm flex items-center mb-4">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              A link to reset your password has been sent to your email. Please check your inbox (and spam/junk folder) to continue.
            </div>
          )}

          {/* Step 3: Password Reset */}
          {(emailVerified || showResetForm) && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError("");
              // Validar senha
              const passwordError = validatePassword(password);
              if (passwordError) {
                setError(passwordError);
                setLoading(false);
                return;
              }
              if (password !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
              }
              try {
                if (showResetForm && accessToken && refreshToken) {
                  // Só autentica e atualiza senha agora
                  const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  });
                  if (sessionError) throw sessionError;
                  const { error } = await supabase.auth.updateUser({ password });
                  if (error) throw error;
                  // Desloga imediatamente após atualizar senha
                  await supabase.auth.signOut();
                  setMessage('Password updated successfully! You can now sign in with your new password.');
                  setTimeout(() => { window.location.href = '/login'; }, 3000);
                } else {
                  // Simulação local (fluxo antigo)
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  setMessage('Password updated successfully! You can now sign in with your new password.');
                  setTimeout(() => { window.location.href = '/login'; }, 3000);
                }
              } catch (err: any) {
                setError(err.message || 'An error occurred while updating your password. Please try again.');
              } finally {
                setLoading(false);
              }
            }} className="space-y-6">
              {/* Success Message */}
              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {message}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full pl-12 pr-12 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Password strength:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.level === 'weak' ? 'text-red-600' :
                        passwordStrength.level === 'medium' ? 'text-yellow-600' :
                        passwordStrength.level === 'good' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.level === 'weak' ? 20 : 
                                            passwordStrength.level === 'medium' ? 40 :
                                            passwordStrength.level === 'good' ? 70 : 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full pl-12 pr-12 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300"
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Password Match Indicator */}
                {confirmPassword && (
                  <div className="mt-2 flex items-center">
                    {password === confirmPassword ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs">Passwords match</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs">Passwords do not match</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-slate-50 p-4 rounded-2xl">
                <h4 className="text-sm font-bold text-slate-900 mb-2">Password Requirements:</h4>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li className={`flex items-center ${password.length >= 8 ? 'text-green-600' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    At least 8 characters long
                  </li>
                  <li className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One uppercase letter
                  </li>
                  <li className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One lowercase letter
                  </li>
                  <li className={`flex items-center ${/\d/.test(password) ? 'text-green-600' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${/\d/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One number
                  </li>
                  <li className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One special character
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-black rounded-2xl text-white bg-[#05294E] hover:bg-[#05294E]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Updating Password...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Update Password
                    <Zap className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </form>
          )}

          {/* Trust Indicators */}
          <div className="flex justify-center items-center space-x-6 pt-6 border-t border-slate-200 mt-6">
            <div className="flex items-center text-xs text-slate-500">
              <Shield className="h-4 w-4 mr-1 text-green-500" />
              <span>Secure Process</span>
            </div>
            <div className="flex items-center text-xs text-slate-500">
              <CheckCircle className="h-4 w-4 mr-1 text-blue-500" />
              <span>Email Verified</span>
            </div>
            <div className="flex items-center text-xs text-slate-500">
              <Zap className="h-4 w-4 mr-1 text-[#D0151C]" />
              <span>Quick Reset</span>
            </div>
          </div>
        </div>

        {/* Additional Help */}
        <div className="text-center">
          <p className="text-sm text-slate-500">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@matriculausa.com" className="text-[#05294E] hover:underline font-medium">
              support@matriculausa.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;