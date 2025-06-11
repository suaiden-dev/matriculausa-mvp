import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      setMessage('Password reset email sent! Please check your inbox and follow the instructions.');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setMessage('Password reset email sent again! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl font-black text-slate-900 mb-4">
            {emailSent ? 'Check Your Email' : 'Forgot Password?'}
          </h2>
          
          <p className="text-slate-600 text-lg leading-relaxed">
            {emailSent 
              ? 'We\'ve sent password reset instructions to your email address.'
              : 'No worries! Enter your email address and we\'ll send you instructions to reset your password.'
            }
          </p>
        </div>

        {/* Form or Success Message */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          {emailSent ? (
            <div className="space-y-6">
              {/* Success State */}
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Email Sent Successfully!</h3>
                <p className="text-slate-600 mb-6">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 p-6 rounded-2xl">
                <h4 className="font-bold text-slate-900 mb-3">What's next?</h4>
                <ol className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start">
                    <span className="bg-[#05294E] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    Check your email inbox (and spam folder)
                  </li>
                  <li className="flex items-start">
                    <span className="bg-[#05294E] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    Click the "Reset Password" link in the email
                  </li>
                  <li className="flex items-start">
                    <span className="bg-[#05294E] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                    Create your new password
                  </li>
                </ol>
              </div>

              {/* Resend Email Button */}
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-4">Didn't receive the email?</p>
                <button
                  onClick={handleResendEmail}
                  disabled={loading}
                  className="text-[#05294E] hover:text-[#05294E]/80 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Resend Email'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Success Message */}
              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {message}
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
                    Sending Reset Email...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Send Reset Instructions
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