import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Building2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Users,
  DollarSign,
  Globe,
  TrendingUp,
  Shield,
  Handshake,
  Star,
  ChevronRight,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Check,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

type TabType = 'login' | 'request';

// ─── Animation Variants ────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};
const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

// ─── Benefits ──────────────────────────────────────────────────────────────
const benefits = [
  {
    icon: DollarSign,
    color: 'from-green-400 to-emerald-600',
    bg: 'bg-green-50',
    title: 'Comissões Atrativas',
    description: 'Ganhe comissões por cada aluno matriculado através da sua agência. Remuneração transparente e pontual.',
  },
  {
    icon: Globe,
    color: 'from-blue-400 to-blue-600',
    bg: 'bg-blue-50',
    title: 'Alcance Global',
    description: 'Acesse universidades nos EUA com vagas reais. Ofereça mais opções e valor para os seus clientes.',
  },
  {
    icon: TrendingUp,
    color: 'from-purple-400 to-purple-600',
    bg: 'bg-purple-50',
    title: 'Painel Completo',
    description: 'Dashboard exclusivo para acompanhar alunos, comissões e pagamentos em tempo real.',
  },
  {
    icon: Shield,
    color: 'from-[#D0151C] to-red-600',
    bg: 'bg-red-50',
    title: 'Suporte Dedicado',
    description: 'Equipe especializada para auxiliar você e seus alunos em cada etapa do processo.',
  },
  {
    icon: Users,
    color: 'from-indigo-400 to-indigo-600',
    bg: 'bg-indigo-50',
    title: 'Vendedores Próprios',
    description: 'Cadastre membros da sua equipe como vendedores e gerencie toda a sua operação internamente.',
  },
  {
    icon: Zap,
    color: 'from-yellow-400 to-orange-500',
    bg: 'bg-yellow-50',
    title: 'Processo Ágil',
    description: 'Do cadastro do aluno à matrícula confirmada, um fluxo digitalmente integrado e sem burocracia.',
  },
];

// ─── Steps ─────────────────────────────────────────────────────────────────
const steps = [
  { number: '01', title: 'Crie sua Conta', description: 'Preencha o formulário com os dados da sua agência e crie sua senha de acesso.' },
  { number: '02', title: 'Acesso Imediato', description: 'Sua conta é criada instantaneamente. Você será direcionado para o onboarding da agência.' },
  { number: '03', title: 'Complete o Perfil', description: 'Preencha as informações complementares da sua agência para que nossa equipe possa validar sua parceria.' },
  { number: '04', title: 'Comece a Operar', description: 'Com o perfil completo, você já pode cadastrar alunos e gerenciar suas comissões em tempo real.' },
];

// ─── Main Component ─────────────────────────────────────────────────────────
const AgencyLogin: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <FormSection />
      <CTASection />
    </div>
  );
};

// ─── Hero Section ───────────────────────────────────────────────────────────
const HeroSection: React.FC = () => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  const scrollToForm = () => {
    document.getElementById('agency-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={ref}
      className="relative min-h-screen bg-gradient-to-br from-[#05294E] via-[#05294E] to-[#0a3a62] text-white overflow-hidden flex items-center"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-[#D0151C]/10 to-blue-500/10 rounded-full blur-2xl" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          {/* Left column */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2 mb-6 backdrop-blur-sm">
              <Handshake className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-white/90">Portal de Parceiros</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6"
            >
              <span className="block">Cresça com a</span>
              <span className="block bg-gradient-to-r from-[#D0151C] to-red-400 bg-clip-text text-transparent">
                Matricula USA
              </span>
              <span className="block text-2xl md:text-3xl font-bold text-slate-200 mt-2">
                Seja uma agência parceira
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 max-w-xl"
            >
              Conecte seus alunos às melhores universidades americanas, acompanhe todo o processo em um painel dedicado e receba comissões por cada matrícula confirmada.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <motion.button
                onClick={scrollToForm}
                whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(208, 21, 28, 0.4)' }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center px-8 py-4 bg-[#D0151C] text-white font-bold text-lg rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group"
              >
                <Sparkles className="w-5 h-5 mr-2 group-hover:animate-spin" />
                Quero ser parceiro
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                onClick={() => document.getElementById('agency-login')?.scrollIntoView({ behavior: 'smooth' })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 border border-white/30 text-white font-semibold text-lg rounded-2xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
              >
                Já sou parceiro — Entrar
              </motion.button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 text-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-slate-200">Sem custo de adesão</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-slate-200">Pagamentos garantidos</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="text-slate-200">+500 alunos matriculados</span>
              </div>
            </motion.div>
          </div>

          {/* Right column — floating stats */}
          <motion.div
            variants={{
              hidden: { x: 80, opacity: 0, scale: 0.9 },
              visible: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.8, delay: 0.4 } },
            }}
            className="relative"
          >
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { value: '+500', label: 'Alunos Matriculados', color: 'text-[#D0151C]', icon: GraduationCapIcon },
                { value: '+40', label: 'Agências Parceiras', color: 'text-green-400', icon: Building2 },
                { value: '+30', label: 'Universidades Parceiras', color: 'text-blue-400', icon: Globe },
                { value: '100%', label: 'Digital e Sem Burocracia', color: 'text-yellow-400', icon: Zap },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center"
                >
                  <stat.icon className={`w-7 h-7 ${stat.color} mx-auto mb-2`} />
                  <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-300 mt-1 leading-snug">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80L1440 80L1440 40C1200 80 800 0 500 40C300 65 100 20 0 40L0 80Z" fill="white" />
        </svg>
      </div>
    </section>
  );
};

// Helper icon proxy for GraduationCap (lucide name conflict)
const GraduationCapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

// ─── Benefits Section ────────────────────────────────────────────────────────
const BenefitsSection: React.FC = () => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-[#05294E]/10 border border-[#05294E]/20 rounded-full px-5 py-2 mb-4">
            <Star className="w-4 h-4 text-[#05294E]" />
            <span className="text-sm font-bold text-[#05294E]">Por que ser parceiro?</span>
          </motion.div>
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-black text-[#05294E] mb-4">
            Vantagens exclusivas para <br />
            <span className="bg-gradient-to-r from-[#D0151C] to-red-500 bg-clip-text text-transparent">agências parceiras</span>
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-slate-600 max-w-2xl mx-auto">
            Oferecemos as ferramentas e o suporte que sua agência precisa para ampliar resultados e entregar mais valor aos seus alunos.
          </motion.p>
        </motion.div>

        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-default"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <b.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{b.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── How It Works Section ────────────────────────────────────────────────────
const HowItWorksSection: React.FC = () => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  return (
    <section ref={ref} className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-[#D0151C]/10 border border-[#D0151C]/20 rounded-full px-5 py-2 mb-4">
            <ChevronRight className="w-4 h-4 text-[#D0151C]" />
            <span className="text-sm font-bold text-[#D0151C]">Como funciona</span>
          </motion.div>
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-black text-[#05294E] mb-4">
            Do cadastro ao primeiro pagamento
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-slate-600 max-w-2xl mx-auto">
            Um processo simples, totalmente digital e pensado para que sua agência esteja operando o mais rápido possível.
          </motion.p>
        </motion.div>

        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative"
        >
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#05294E]/20 via-[#D0151C]/40 to-[#05294E]/20" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 text-center group"
            >
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#05294E] to-[#0a3a62] text-white font-black text-xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto">
                {step.number}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2">
                    <ChevronRight className="w-5 h-5 text-[#D0151C]" />
                  </div>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── Form Section ─────────────────────────────────────────────────────────────
const FormSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('request');
  const { login, register, user } = useAuth();
  const routerNavigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && user.role === 'affiliate_admin') {
      if (!user.onboarding_completed || !user.is_active) {
        routerNavigate('/affiliate-admin/onboarding', { replace: true });
      } else {
        routerNavigate('/affiliate-admin/dashboard', { replace: true });
      }
    }
  }, [user, routerNavigate]);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Request state
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    full_name: '',
    company_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    country: '',
    message: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await login(loginEmail.trim().toLowerCase(), loginPassword);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
        setLoginError('Email ou senha inválidos.');
      } else if (msg.includes('not confirmed') || msg.includes('email_not_confirmed')) {
        setLoginError('Email não confirmado. Verifique sua caixa de entrada.');
      } else {
        setLoginError(msg || 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRequestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRequestForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);

    if (requestForm.password !== requestForm.confirm_password) {
      setRequestError('As senhas não coincidem.');
      return;
    }
    if (requestForm.password.length < 6) {
      setRequestError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setRequestLoading(true);
    try {
      const email = requestForm.email.trim().toLowerCase();

      // 1. Criar conta usando a função centralizada que já trata auto-confirm e login
      await register(email, requestForm.password, {
        full_name: requestForm.full_name.trim(),
        role: 'affiliate_admin',
        company_name: requestForm.company_name.trim(),
      });

      // 2. Inserir solicitação pendente para controle administrativo
      const { error: reqError } = await supabase.from('agency_requests').insert({
        full_name: requestForm.full_name.trim(),
        company_name: requestForm.company_name.trim(),
        email,
        phone: requestForm.phone.trim() || null,
        country: requestForm.country.trim() || null,
        message: requestForm.message.trim() || null,
      });
      if (reqError) console.warn('⚠️ Erro ao registrar log de solicitação:', reqError);

      setRequestSuccess(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setRequestError('Este email já possui uma conta cadastrada. Faça login na aba "Já sou parceiro".');
      } else {
        setRequestError(msg || 'Erro ao enviar solicitação. Tente novamente.');
      }
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <section id="agency-form" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — Info */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#05294E]/10 border border-[#05294E]/20 rounded-full px-5 py-2 mb-6">
              <Building2 className="w-4 h-4 text-[#05294E]" />
              <span className="text-sm font-bold text-[#05294E]">Área de Agências</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6 leading-tight">
              Comece agora ou <br />
              <span className="bg-gradient-to-r from-[#D0151C] to-red-500 bg-clip-text text-transparent">acesse seu painel</span>
            </h2>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Se você já é parceiro, use o formulário de login. Ainda não tem acesso? Solicite uma parceria e nossa equipe entrará em contato em até 48 horas.
            </p>

            {/* Checklist */}
            <ul className="space-y-3 mb-10">
              {[
                'Sem taxa de adesão ou mensalidade',
                'Ativação da conta em até 48h',
                'Dashboard exclusivo para gestão',
                'Suporte dedicado para sua agência',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-slate-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>

            {/* Contact info */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700 mb-3">Dúvidas? Entre em contato:</p>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-[#05294E]" />
                <span>parceiros@matriculausa.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MessageSquare className="w-4 h-4 text-[#05294E]" />
                <span>WhatsApp disponível no horário comercial</span>
              </div>
            </div>
          </motion.div>

          {/* Right — Form card */}
          <motion.div
            id="agency-login"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('request')}
                  className={`flex-1 py-4 text-sm font-bold transition-all duration-200 ${
                    activeTab === 'request'
                      ? 'text-[#05294E] border-b-2 border-[#D0151C] bg-white'
                      : 'text-slate-500 hover:text-slate-700 bg-slate-50'
                  }`}
                >
                  Solicitar Parceria
                </button>
                <button
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 py-4 text-sm font-bold transition-all duration-200 ${
                    activeTab === 'login'
                      ? 'text-[#05294E] border-b-2 border-[#D0151C] bg-white'
                      : 'text-slate-500 hover:text-slate-700 bg-slate-50'
                  }`}
                >
                  Já sou parceiro
                </button>
              </div>

              <div className="p-6 md:p-8">
                {/* ── REQUEST TAB ── */}
                {activeTab === 'request' && (
                  <>
                    {requestSuccess ? (
                      <div className="text-center py-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
                          <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3">Conta Criada!</h3>
                        <p className="text-slate-500 mb-2 leading-relaxed">
                          Sua conta de agência foi criada com sucesso.
                        </p>
                        <p className="text-slate-400 text-sm mb-6">
                          Você está sendo redirecionado para o onboarding para completar seu perfil.
                        </p>
                        <button
                          onClick={() => {
                            setRequestSuccess(false);
                            setActiveTab('login');
                            setRequestForm({ full_name: '', company_name: '', email: '', password: '', confirm_password: '', phone: '', country: '', message: '' });
                          }}
                          className="px-6 py-3 bg-[#05294E] text-white rounded-xl font-bold hover:bg-[#0a3a62] transition-colors"
                        >
                          Ir para o Login
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRequestSubmit} className="space-y-4">
                        <p className="text-sm text-slate-500 mb-2">
                          Crie sua conta agora. Após aprovação da equipe, você terá acesso ao painel.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome completo *</label>
                            <input
                              type="text" name="full_name" required value={requestForm.full_name} onChange={handleRequestChange}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome da agência *</label>
                            <input
                              type="text" name="company_name" required value={requestForm.company_name} onChange={handleRequestChange}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="email" name="email" required value={requestForm.email} onChange={handleRequestChange}
                              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha *</label>
                            <div className="relative">
                              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type={showRegPassword ? 'text' : 'password'} name="password" required
                                value={requestForm.password} onChange={handleRequestChange}
                                className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors"
                              />
                              <button type="button" onClick={() => setShowRegPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar senha *</label>
                            <div className="relative">
                              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type={showRegConfirm ? 'text' : 'password'} name="confirm_password" required
                                value={requestForm.confirm_password} onChange={handleRequestChange}
                                className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                                  requestForm.confirm_password && requestForm.confirm_password !== requestForm.password
                                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                                    : 'border-slate-300 focus:ring-[#05294E]/30 focus:border-[#05294E]'
                                }`}
                              />
                              <button type="button" onClick={() => setShowRegConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone / WhatsApp</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="tel" name="phone" value={requestForm.phone} onChange={handleRequestChange}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">País</label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="text" name="country" value={requestForm.country} onChange={handleRequestChange}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mensagem (opcional)</label>
                          <textarea
                            name="message" value={requestForm.message} onChange={handleRequestChange} rows={3}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors resize-none"
                          />
                        </div>

                        {requestError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-700">{requestError}</p>
                          </div>
                        )}

                        <motion.button
                          type="submit"
                          disabled={requestLoading}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-4 bg-gradient-to-r from-[#D0151C] to-red-600 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {requestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          {requestLoading ? 'Enviando...' : 'Enviar Solicitação'}
                        </motion.button>

                        <p className="text-center text-xs text-slate-400">
                          Já tem acesso?{' '}
                          <button type="button" onClick={() => setActiveTab('login')} className="text-[#05294E] font-semibold hover:underline">
                            Faça login aqui
                          </button>
                        </p>
                      </form>
                    )}
                  </>
                )}

                {/* ── LOGIN TAB ── */}
                {activeTab === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-semibold text-slate-700">Senha</label>
                        <Link to="/forgot-password" className="text-xs text-[#05294E] hover:underline font-medium">
                          Esqueci minha senha
                        </Link>
                      </div>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] transition-colors"
                        />
                        <button
                          type="button" onClick={() => setShowLoginPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {loginError && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{loginError}</p>
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      disabled={loginLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 bg-gradient-to-r from-[#05294E] to-[#0a3a62] text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      {loginLoading ? 'Entrando...' : 'Acessar Painel'}
                    </motion.button>

                    <p className="text-center text-xs text-slate-400">
                      Ainda não é parceiro?{' '}
                      <button type="button" onClick={() => setActiveTab('request')} className="text-[#D0151C] font-semibold hover:underline">
                        Solicite uma parceria
                      </button>
                    </p>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ─── Final CTA Section ────────────────────────────────────────────────────────
const CTASection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-[#05294E] via-[#05294E] to-[#0a3a62] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-20 w-64 h-64 bg-[#D0151C]/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2 mb-6 backdrop-blur-sm">
            <Handshake className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-white/90">Torne-se um parceiro</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Pronto para ampliar{' '}
            <span className="bg-gradient-to-r from-[#D0151C] to-red-400 bg-clip-text text-transparent">
              seus resultados?
            </span>
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Junte-se a mais de 40 agências que já utilizam a plataforma Matricula USA para ampliar sua oferta e gerar novas receitas.
          </p>
          <motion.button
            onClick={() => document.getElementById('agency-form')?.scrollIntoView({ behavior: 'smooth' })}
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(208, 21, 28, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center px-10 py-5 bg-[#D0151C] text-white font-bold text-lg rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group"
          >
            <Sparkles className="w-5 h-5 mr-2 group-hover:animate-spin" />
            Solicitar Parceria Agora
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default AgencyLogin;
