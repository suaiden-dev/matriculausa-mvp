import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from 'usehooks-ts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Phone,
  Briefcase,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Globe,
  Instagram,
  Linkedin,
  Hash,
  Calendar,
  Users,
  Star,
  Check,
  Building,
  Mail,
  Smartphone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────
interface FormData {
  company_name: string;
  legal_name: string;
  cnpj: string;
  website: string;
  founded_year: string;
  country: string;
  state: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  linkedin: string;
  students_per_year: string;
  services: string[];
  markets: string[];
  how_found_us: string;
}

const SERVICES_OPTIONS = [
  'Intercâmbio / Estudo no exterior',
  'Imigração e vistos',
  'Cursos de inglês',
  'Ensino superior nos EUA',
  'Pós-graduação',
  'Treinamentos e certificações',
  'Consultoria educacional',
  'Outros',
];

const MARKETS_OPTIONS = [
  'Brasil',
  'Portugal',
  'Angola',
  'Moçambique',
  'Cabo Verde',
  'México',
  'Colômbia',
  'Argentina',
  'Chile',
  'Peru',
  'Outro',
];

const HOW_FOUND_OPTIONS = [
  'Indicação de outra agência',
  'Redes sociais',
  'Google / Pesquisa online',
  'Evento ou conferência',
  'Email marketing',
  'Parceiro comercial',
  'Outro',
];

const STUDENTS_PER_YEAR_OPTIONS = [
  { value: '1-10', label: '1 a 10 alunos' },
  { value: '11-50', label: '11 a 50 alunos' },
  { value: '51-100', label: '51 a 100 alunos' },
  { value: '101-300', label: '101 a 300 alunos' },
  { value: '300+', label: 'Mais de 300 alunos' },
];

const STEPS = [
  { id: 1, title: 'Dados da Empresa', icon: Building2, subtitle: 'Informações básicas' },
  { id: 2, title: 'Localização', icon: MapPin, subtitle: 'Onde você está' },
  { id: 3, title: 'Contato', icon: Phone, subtitle: 'Como te encontrar' },
  { id: 4, title: 'Sobre o Negócio', icon: Briefcase, subtitle: 'Perfil operacional' },
];

// ─── Animations ──────────────────────────────────────────────────────────
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const AffiliateAdminOnboarding: React.FC = () => {
  const { user, userProfile, refetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

  const [form, setForm] = useLocalStorage<FormData>('affiliate-onboarding-form', {
    company_name: '',
    legal_name: '',
    cnpj: '',
    website: '',
    founded_year: '',
    country: 'Brasil',
    state: '',
    city: '',
    address: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    linkedin: '',
    students_per_year: '',
    services: [],
    markets: [],
    how_found_us: '',
  });

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('affiliate_admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setAffiliateId(data.id);
        if (data.onboarding_completed) {
          if (data.is_active) {
            navigate('/affiliate-admin/dashboard');
          } else {
            navigate('/affiliate-admin/pending-approval');
          }
          return;
        }
        setForm(prev => ({
          ...prev,
          company_name: prev.company_name || data.company_name || (userProfile as any)?.full_name || '',
          legal_name: prev.legal_name || data.legal_name || '',
          cnpj: prev.cnpj || data.cnpj || '',
          website: prev.website || data.website || '',
          founded_year: prev.founded_year || data.founded_year || '',
          country: prev.country || data.country || 'Brasil',
          state: prev.state || data.state || '',
          city: prev.city || data.city || '',
          address: prev.address || data.address || '',
          phone: prev.phone || data.phone || '',
          whatsapp: prev.whatsapp || data.whatsapp || '',
          instagram: prev.instagram || data.instagram || '',
          linkedin: prev.linkedin || data.linkedin || '',
          students_per_year: prev.students_per_year || data.students_per_year || '',
          services: prev.services?.length ? prev.services : (data.services || []),
          markets: prev.markets?.length ? prev.markets : (data.markets || []),
          how_found_us: prev.how_found_us || data.how_found_us || '',
        }));
      } else {
        const { data: newRecord } = await supabase
          .from('affiliate_admins')
          .insert({ user_id: user.id, company_name: (userProfile as any)?.full_name || '', is_active: false })
          .select('id')
          .single();
        if (newRecord) setAffiliateId(newRecord.id);
        setForm(prev => ({
          ...prev,
          company_name: prev.company_name || (userProfile as any)?.full_name || '',
        }));
      }
    };
    load();
  }, [user?.id]);

  const set = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const toggleArray = (field: 'services' | 'markets', value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const validate = (step: number): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (step === 1) {
      if (!form.company_name.trim()) e.company_name = 'Nome da agência é obrigatório';
    }
    if (step === 2) {
      if (!form.country.trim()) e.country = 'País é obrigatório';
      if (!form.city.trim()) e.city = 'Cidade é obrigatória';
    }
    if (step === 3) {
      if (!form.phone.trim()) e.phone = 'Telefone é obrigatório';
    }
    if (step === 4) {
      if (!form.students_per_year) e.students_per_year = 'Selecione o volume de alunos';
      if (form.services.length === 0) e.services = 'Selecione pelo menos um serviço';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validate(currentStep)) setCurrentStep(s => s + 1);
  };

  const prevStep = () => setCurrentStep(s => s - 1);

  const handleSubmit = async () => {
    if (!validate(4)) return;
    if (!affiliateId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('affiliate_admins')
        .update({
          company_name: form.company_name.trim(),
          legal_name: form.legal_name.trim() || null,
          cnpj: form.cnpj.trim() || null,
          website: form.website.trim() || null,
          founded_year: form.founded_year.trim() || null,
          country: form.country.trim(),
          state: form.state.trim() || null,
          city: form.city.trim(),
          address: form.address.trim() || null,
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim() || null,
          instagram: form.instagram.trim() || null,
          linkedin: form.linkedin.trim() || null,
          students_per_year: form.students_per_year,
          services: form.services,
          markets: form.markets,
          how_found_us: form.how_found_us || null,
          onboarding_completed: true,
        })
        .eq('id', affiliateId);

      if (error) throw error;
      localStorage.removeItem('affiliate-onboarding-form');
      await refetchUserProfile();
      navigate('/affiliate-admin/pending-approval');
    } catch (e: any) {
      setErrors({ company_name: e.message || 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  if (affiliateId && userProfile?.onboarding_completed && !userProfile?.is_active) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[32px] shadow-2xl border border-slate-200/60 p-10 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#05294E] to-[#D0151C]" />
          <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Loader2 className="w-12 h-12 text-[#05294E] animate-spin" />
          </div>
          <h2 className="text-3xl font-black text-[#05294E] mb-4">Perfil em Análise</h2>
          <p className="text-slate-600 mb-10 leading-relaxed text-lg">
            Obrigado por completar seu cadastro! Nossa equipe está revisando suas informações cuidadosamente. 
          </p>
          <div className="bg-slate-50 rounded-2xl p-6 text-sm text-slate-500 mb-10 border border-slate-100">
            <div className="flex items-center justify-center gap-2 mb-2 text-[#05294E] font-bold">
              <Sparkles className="w-4 h-4" />
              <span>O que acontece agora?</span>
            </div>
            Tempo estimado de análise: <strong className="text-slate-700">24 a 48 horas úteis</strong>. 
            Você receberá um e-mail de confirmação.
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 px-8 bg-[#05294E] text-white rounded-2xl font-black hover:bg-[#041f3a] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#05294E]/20"
          >
            Voltar para Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-[#05294E]/10 selection:text-[#05294E]">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-[#05294E]/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-[#D0151C]/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png.png" alt="Matrícula USA" className="h-10 w-auto" />
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />
            <div className="hidden sm:block">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-0.5">Parceiros</div>
              <h1 className="font-black text-xl text-[#05294E] leading-tight">Configuração da Agência</h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Progresso</span>
              <span className="text-sm font-black text-[#05294E]">Passo {currentStep} de {STEPS.length}</span>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                <circle 
                  cx="32" cy="32" r="28" fill="none" stroke="#05294E" strokeWidth="4" 
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - currentStep / STEPS.length)}`}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#05294E]">
                {Math.round((currentStep / STEPS.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Sidebar - Steps Desktop */}
          <aside className="hidden lg:block lg:col-span-4 space-y-4">
            <div className="sticky top-32">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-[#05294E] mb-2">Finalize seu Cadastro</h3>
                <p className="text-slate-500 leading-relaxed">
                  Complete as informações abaixo para que nossa equipe possa validar e ativar sua conta de parceiro.
                </p>
              </div>
              
              <div className="space-y-3">
                {STEPS.map((step, idx) => {
                  const isActive = currentStep === step.id;
                  const isDone = currentStep > step.id;
                  return (
                    <div 
                      key={step.id}
                      className={`flex items-center gap-4 p-4 rounded-[20px] transition-all duration-300 border ${
                        isActive 
                          ? 'bg-white border-slate-200 shadow-xl shadow-slate-200/40 translate-x-2' 
                          : isDone 
                            ? 'bg-green-50/50 border-green-100 opacity-80' 
                            : 'bg-transparent border-transparent opacity-40'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-[#05294E] text-white rotate-3 shadow-lg' 
                          : isDone 
                            ? 'bg-green-500 text-white' 
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isDone ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isActive ? 'text-[#D0151C]' : 'text-slate-400'}`}>
                          Passo {idx + 1}
                        </div>
                        <div className={`font-black ${isActive ? 'text-[#05294E]' : 'text-slate-500'}`}>
                          {step.title}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Form Container */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-200/60 overflow-hidden min-h-[600px] flex flex-col">
              
              {/* Content Area */}
              <div className="p-8 md:p-12 flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={fadeIn}
                    className="h-full"
                  >
                    <header className="mb-10">
                      <div className="inline-flex items-center gap-2 bg-[#05294E]/10 px-4 py-1.5 rounded-full mb-4">
                        {React.createElement(STEPS[currentStep - 1].icon, { className: 'w-4 h-4 text-[#05294E]' })}
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#05294E]">
                          {STEPS[currentStep - 1].title}
                        </span>
                      </div>
                      <h2 className="text-4xl font-black text-[#05294E] mb-3">
                        {currentStep === 1 && 'Conte sobre sua agência'}
                        {currentStep === 2 && 'Onde vocês estão?'}
                        {currentStep === 3 && 'Canais de comunicação'}
                        {currentStep === 4 && 'Operação do negócio'}
                      </h2>
                      <p className="text-slate-500 text-lg">
                        {STEPS[currentStep - 1].subtitle} — Precisamos disso para validar seu cadastro.
                      </p>
                    </header>

                    {/* ── STEP 1: Empresa ── */}
                    {currentStep === 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Nome da Agência *</label>
                          <div className="relative group">
                            <Building2 className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)}
                              className={inputCls(!!errors.company_name)}
                            />
                            {errors.company_name && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.company_name}</p>}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Razão Social (Opcional)</label>
                          <div className="relative group">
                            <Hash className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="text" value={form.legal_name} onChange={e => set('legal_name', e.target.value)}
                              className={inputCls(false)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">CNPJ (Opcional)</label>
                          <input
                            type="text" value={form.cnpj} onChange={e => set('cnpj', e.target.value)}
                            className={inputCls(false)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Ano de Fundação</label>
                          <div className="relative group">
                            <Calendar className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="text" value={form.founded_year} onChange={e => set('founded_year', e.target.value)}
                              maxLength={4}
                              className={inputCls(false)}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Website</label>
                          <div className="relative group">
                            <Globe className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="url" value={form.website} onChange={e => set('website', e.target.value)}
                              className={inputCls(false)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 2: Localização ── */}
                    {currentStep === 2 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">País *</label>
                          <input
                            type="text" value={form.country} onChange={e => set('country', e.target.value)}
                            className={inputCls(!!errors.country)}
                          />
                          {errors.country && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.country}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Estado</label>
                          <input
                            type="text" value={form.state} onChange={e => set('state', e.target.value)}
                            className={inputCls(false)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Cidade *</label>
                          <input
                            type="text" value={form.city} onChange={e => set('city', e.target.value)}
                            className={inputCls(!!errors.city)}
                          />
                          {errors.city && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.city}</p>}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Endereço Completo</label>
                          <div className="relative group">
                            <MapPin className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="text" value={form.address} onChange={e => set('address', e.target.value)}
                              className={inputCls(false)}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 bg-[#05294E]/5 rounded-3xl p-6 flex gap-4 items-start border border-[#05294E]/10">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm text-[#05294E]">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            <strong>Dica Premium:</strong> Ter um endereço físico registrado aumenta a confiança da nossa rede de parceiros em seu negócio.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 3: Contato ── */}
                    {currentStep === 3 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Telefone Principal *</label>
                          <div className="relative group">
                            <Smartphone className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                              className={inputCls(!!errors.phone)}
                            />
                          </div>
                          {errors.phone && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.phone}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">WhatsApp de Suporte</label>
                          <div className="relative group">
                            <Phone className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                              className={inputCls(false)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Instagram (@usuario)</label>
                          <div className="relative group">
                            <Instagram className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="text" value={form.instagram} onChange={e => set('instagram', e.target.value)}
                              className={inputCls(false)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">LinkedIn URL</label>
                          <div className="relative group">
                            <Linkedin className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                            <input
                              type="text" value={form.linkedin} onChange={e => set('linkedin', e.target.value)}
                              className={inputCls(false)}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                           <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Email de Contato</label>
                           <div className="relative group">
                             <Mail className="absolute left-5 top-5 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#05294E]" />
                             <input
                               type="email" value={user?.email || ''} readOnly
                               className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-slate-500 font-bold cursor-not-allowed"
                             />
                           </div>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 4: Negócio ── */}
                    {currentStep === 4 && (
                      <div className="space-y-12">
                        {/* Volume */}
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-5 ml-1">
                            Quantos alunos sua agência atende por ano? *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {STUDENTS_PER_YEAR_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => set('students_per_year', opt.value)}
                                className={`flex items-center gap-3 px-6 py-4 rounded-3xl border-2 transition-all duration-300 group ${
                                  form.students_per_year === opt.value
                                    ? 'border-[#05294E] bg-[#05294E] text-white shadow-xl shadow-[#05294E]/20 -translate-y-1'
                                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                  form.students_per_year === opt.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                }`}>
                                  <Users className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-sm">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                          {errors.students_per_year && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.students_per_year}</p>}
                        </div>

                        {/* Services */}
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-5 ml-1">
                            Serviços Oferecidos *
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {SERVICES_OPTIONS.map(s => {
                              const selected = form.services.includes(s);
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => toggleArray('services', s)}
                                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all duration-200 font-bold text-sm ${
                                    selected
                                      ? 'border-[#05294E] bg-[#05294E]/10 text-[#05294E]'
                                      : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {selected ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200" />}
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                          {errors.services && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.services}</p>}
                        </div>

                        {/* Markets */}
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-5 ml-1">
                            Mercados de Atuação
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {MARKETS_OPTIONS.map(m => {
                              const selected = form.markets.includes(m);
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => toggleArray('markets', m)}
                                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all duration-200 font-bold text-sm ${
                                    selected
                                      ? 'border-[#D0151C] bg-[#D0151C]/10 text-[#D0151C]'
                                      : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {m}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* How found */}
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-5 ml-1">
                            Como conheceu a Matricula USA?
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {HOW_FOUND_OPTIONS.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => set('how_found_us', form.how_found_us === opt ? '' : opt)}
                                className={`flex items-center gap-3 px-6 py-4 rounded-3xl border-2 transition-all duration-300 ${
                                  form.how_found_us === opt
                                    ? 'border-[#05294E] bg-white text-[#05294E] shadow-xl shadow-slate-100'
                                    : 'border-slate-50 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                                }`}
                              >
                                <Star className={`w-5 h-5 ${form.how_found_us === opt ? 'text-[#05294E] fill-[#05294E]' : 'text-slate-300'}`} />
                                <span className="font-bold text-sm text-left">{opt}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Footer */}
              <div className="px-12 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black text-slate-400 hover:text-slate-900 transition-all disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Anterior
                </button>

                <div className="flex items-center gap-4">
                  {currentStep < STEPS.length ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="group flex items-center gap-3 px-10 py-4 bg-[#05294E] text-white rounded-2xl text-sm font-black hover:bg-[#041f3a] transition-all shadow-xl shadow-[#05294E]/20 transform hover:scale-[1.05] active:scale-[0.98]"
                    >
                      Próximo
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-[#D0151C] to-red-600 text-white rounded-2xl text-sm font-black hover:from-red-600 hover:to-red-700 transition-all shadow-xl shadow-[#D0151C]/20 transform hover:scale-[1.05] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      {saving ? 'Finalizando...' : 'Concluir Cadastro'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center border-t border-slate-200/40">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png.png" alt="Matrícula USA" className="h-8 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default" />
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Plataforma Oficial de Parcerias — Matricula USA Group
          </p>
        </div>
      </footer>
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inputCls = (hasError: boolean) =>
  `w-full pl-14 pr-6 py-5 bg-white border rounded-[24px] text-slate-900 font-bold transition-all outline-none focus:ring-4 ${
    hasError
      ? 'border-[#D0151C]/30 focus:ring-[#D0151C]/5 focus:border-[#D0151C]'
      : 'border-slate-100 hover:border-slate-200 focus:ring-[#05294E]/5 focus:border-[#05294E] shadow-sm'
  }`;

export default AffiliateAdminOnboarding;
