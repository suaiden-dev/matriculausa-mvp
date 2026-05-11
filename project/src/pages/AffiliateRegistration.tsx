import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Share2, Coins, GraduationCap, Sparkles, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../lib/supabase';

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

// Tela exibida após signup quando confirmação de email é obrigatória
const EmailConfirmationScreen: React.FC<{ email: string }> = ({ email }) => {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05294E] via-[#083a6e] to-[#0a4a8a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-10 shadow-2xl text-center">
          {/* Ícone */}
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-[#05294E]" />
          </div>

          {/* Título */}
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            Confirme seu email
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Enviamos um link de confirmação para{' '}
            <strong className="text-slate-800 break-all">{email}</strong>.
            <br className="hidden sm:block" />
            Clique no link para ativar sua conta e começar a indicar.
          </p>

          {/* Passos */}
          <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-3 mb-6">
            {[
              { step: '1', text: 'Abra o email que enviamos para você' },
              { step: '2', text: 'Clique no botão "Confirmar email"' },
              { step: '3', text: 'Você será direcionado para o seu dashboard' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#05294E] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                  {step}
                </div>
                <span className="text-sm text-slate-600">{text}</span>
              </div>
            ))}
          </div>

          {/* Reenviar */}
          {resent ? (
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm mb-4">
              <CheckCircle className="w-4 h-4" />
              Email reenviado com sucesso!
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 mb-4"
            >
              {resending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resending ? 'Reenviando...' : 'Reenviar email de confirmação'}
            </button>
          )}

          {/* Ir para login */}
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#05294E] text-white font-bold rounded-xl hover:bg-[#041f38] transition-colors text-sm"
          >
            Ir para o login
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-slate-400 text-xs mt-4">
            Não recebeu? Verifique a pasta de spam.
          </p>
        </div>
      </div>
    </div>
  );
};

const AffiliateRegistration: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: formData.password.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(formData.password) },
    { label: 'Uma letra minúscula', met: /[a-z]/.test(formData.password) },
    { label: 'Um número', met: /\d/.test(formData.password) },
    { label: 'Um caractere especial', met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: formData.full_name,
            role: 'affiliate',
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          if (signInError) throw new Error('Usuário já cadastrado. Verifique sua senha ou faça login.');
          navigate('/affiliate/dashboard');
          return;
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error('Erro ao criar conta.');

      const userId = authData.user.id;

      if (authData.session) {
        // Sessão imediata — sem confirmação de email
        await supabase
          .from('user_profiles')
          .update({
            role: 'affiliate',
            full_name: formData.full_name,
            phone: formData.phone || null,
          })
          .eq('user_id', userId);

        await supabase.rpc('create_affiliate_code_for_user', { user_id_param: userId });

        navigate('/affiliate/dashboard');
      } else {
        // Confirmação de email necessária — mostra tela dedicada
        setAwaitingConfirmation(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Tela de confirmação de email
  if (awaitingConfirmation) {
    return <EmailConfirmationScreen email={formData.email} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05294E] via-[#083a6e] to-[#0a4a8a]">

      <div className="flex items-start justify-center px-4 pt-16 pb-12">
        <div className="w-full max-w-5xl">

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm font-semibold px-5 py-2.5 rounded-full mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              Programa de Recompensas MatriculaUSA
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
              Transforme suas indicações
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 mt-1">
                em descontos reais
              </span>
            </h1>
            <p className="text-white/70 mt-4 text-base max-w-lg mx-auto leading-relaxed">
              Compartilhe seu código, indique quem quer estudar nos EUA e acumule <strong className="text-white">MatriculaCoins</strong> a cada indicação confirmada.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

            {/* Benefícios */}
            <div className="space-y-4 text-white">
              {[
                {
                  icon: Share2,
                  title: 'Compartilhe & Ganhe',
                  desc: 'Receba seu código único e compartilhe com quem quiser estudar nos EUA.',
                  iconBg: 'bg-blue-400/20',
                  iconColor: 'text-blue-300',
                },
                {
                  icon: Coins,
                  title: 'Ganhe Recompensas',
                  desc: '100 coins por indicação confirmada. Sem limite — quanto mais indica, mais ganha.',
                  iconBg: 'bg-yellow-400/20',
                  iconColor: 'text-yellow-300',
                },
                {
                  icon: GraduationCap,
                  title: 'Resgate Recompensas',
                  desc: 'Troque seus coins por benefícios exclusivos dentro da plataforma Matrícula USA.',
                  iconBg: 'bg-green-400/20',
                  iconColor: 'text-green-300',
                },
              ].map(({ icon: Icon, title, desc, iconBg, iconColor }) => (
                <div key={title} className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                  <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div>
                    <p className="font-bold text-white">{title}</p>
                    <p className="text-white/65 text-sm mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}

              <p className="text-white/50 text-xs text-center pt-2">
                Já tem conta?{' '}
                <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                  Faça login
                </Link>
              </p>
            </div>

            {/* Formulário */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-black text-slate-900">Crie sua conta gratuita</h2>
                <p className="text-slate-500 text-sm mt-1">Comece a indicar e acumular coins hoje mesmo.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      autoComplete="name"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Telefone <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <PhoneInput
                    international
                    defaultCountry="US"
                    addInternationalOption={false}
                    limitMaxLength={true}
                    maxLength={20}
                    value={formData.phone}
                    onChange={(value) => setFormData(prev => ({ ...prev, phone: value || '' }))}
                    className="quick-registration-phone w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-[#05294E]/20 focus-within:border-[#05294E] text-slate-900 transition-all duration-200 text-sm"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Força da senha:</span>
                        <span className={`text-xs font-semibold ${
                          passwordStrength.level === 'weak' ? 'text-red-600' :
                          passwordStrength.level === 'medium' ? 'text-yellow-600' :
                          passwordStrength.level === 'good' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>{passwordStrength.text}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.level === 'weak' ? 20 : passwordStrength.level === 'medium' ? 40 : passwordStrength.level === 'good' ? 70 : 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirmar senha */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {formData.confirmPassword && (
                    <div className="mt-1.5 flex items-center gap-1">
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs text-green-600">Senhas coincidem</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-xs text-red-500">Senhas não coincidem</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Requisitos */}
                {formData.password && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Requisitos da senha:</p>
                    <ul className="space-y-1">
                      {passwordRequirements.map(({ label, met }) => (
                        <li key={label} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-slate-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${met ? 'bg-green-500' : 'bg-slate-300'}`} />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {error && (
                  <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#05294E] text-white font-black rounded-xl hover:bg-[#041f38] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
                >
                  {loading ? 'Criando conta...' : 'Começar agora — é grátis'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateRegistration;
