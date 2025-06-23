import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Shield, Lock, Mail, User, Eye, EyeOff, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AdminRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    adminKey: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Chave secreta para validar o registro de admin (você pode mudar isso)
  const ADMIN_SECRET_KEY = 'MATRICULA_USA_ADMIN_2024';

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'A senha deve ter pelo menos 8 caracteres';
    }
    if (!hasUpperCase) {
      return 'A senha deve conter pelo menos uma letra maiúscula';
    }
    if (!hasLowerCase) {
      return 'A senha deve conter pelo menos uma letra minúscula';
    }
    if (!hasNumbers) {
      return 'A senha deve conter pelo menos um número';
    }
    if (!hasSpecialChar) {
      return 'A senha deve conter pelo menos um caractere especial';
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

    if (strength <= 2) return { level: 'weak', color: 'bg-red-500', text: 'Fraca' };
    if (strength <= 3) return { level: 'medium', color: 'bg-yellow-500', text: 'Média' };
    if (strength <= 4) return { level: 'good', color: 'bg-blue-500', text: 'Boa' };
    return { level: 'strong', color: 'bg-green-500', text: 'Forte' };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validar chave de admin
      if (formData.adminKey !== ADMIN_SECRET_KEY) {
        throw new Error('Chave de administrador inválida');
      }

      // Validar senha
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      // Verificar se as senhas coincidem
      if (formData.password !== formData.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      // Registrar o usuário no Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'admin'
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Promover o usuário para admin usando a função do banco
        const { data: promoteResult, error: promoteError } = await supabase.rpc('make_user_admin', {
          user_email: formData.email
        });

        if (promoteError) {
          console.error('Erro ao promover usuário:', promoteError);
          throw new Error('Erro ao promover usuário para administrador: ' + promoteError.message);
        }

        // Verificar se a promoção foi bem-sucedida
        if (promoteResult && !promoteResult.success) {
          console.error('Falha na promoção:', promoteResult.message);
          throw new Error('Falha ao promover usuário: ' + promoteResult.message);
        }

        setSuccess('Conta de administrador criada com sucesso! Você será redirecionado para o login.');
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta de administrador');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl">
              <Crown className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-black text-white mb-4">
            Registro de Administrador
          </h1>
          <p className="text-purple-200 text-lg leading-relaxed">
            Configure sua conta de administrador para o sistema Matrícula USA
          </p>
          
          {/* Security Notice */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
            <div className="flex items-center justify-center text-white">
              <Shield className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Acesso Restrito - Apenas Administradores</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm mb-6 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-6 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Admin Key */}
            <div>
              <label htmlFor="adminKey" className="block text-sm font-bold text-slate-900 mb-2">
                Chave de Administrador *
              </label>
              <div className="relative">
                <Crown className="absolute left-4 top-4 h-5 w-5 text-purple-500" />
                <input
                  id="adminKey"
                  name="adminKey"
                  type="password"
                  required
                  value={formData.adminKey}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  placeholder="Digite a chave secreta de administrador"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Esta chave é necessária para criar contas de administrador
              </p>
            </div>

            {/* Name */}
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
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  placeholder="Your full name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                Email *
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
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  placeholder="admin@matriculausa.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Strength */}
              {formData.password && (
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
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Match */}
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center">
                  {formData.password === formData.confirmPassword ? (
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
                <li className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  At least 8 characters
                </li>
                <li className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  One uppercase letter
                </li>
                <li className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  One lowercase letter
                </li>
                <li className={`flex items-center ${/\d/.test(formData.password) ? 'text-green-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${/\d/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  One number
                </li>
                <li className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  One special character
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !formData.adminKey || !formData.name || !formData.email || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-black rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center">
                  <Crown className="mr-2 h-5 w-5" />
                  Create Admin Account
                  <Zap className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          {/* Security Info */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="bg-purple-50 p-4 rounded-2xl">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-purple-900 mb-1">Security Information</h4>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>• This account will have full access to the system</li>
                    <li>• Keep your credentials secure</li>
                    <li>• Use a strong and unique password</li>
                    <li>• The admin key is required for validation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Login */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-purple-200 hover:text-white font-medium text-sm transition-colors"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistration;