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
  Upload,
} from 'lucide-react';
import { useRef } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────
type FormErrors = Partial<Record<keyof FormData | 'logo', string>>;

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
  'United States',
  'Brazil',
  'Portugal',
  'Angola',
  'Mozambique',
  'Cape Verde',
  'Mexico',
  'Colombia',
  'Argentina',
  'Chile',
  'Peru',
  'Other',
];

const HOW_FOUND_OPTIONS = [
  'Referral from another agency',
  'Social media',
  'Google / Online search',
  'Event or conference',
  'Email marketing',
  'Business partner',
  'Other',
];

const STUDENTS_PER_YEAR_OPTIONS = [
  { value: '1-10', label: '1 to 10 students' },
  { value: '11-50', label: '11 to 50 students' },
  { value: '51-100', label: '51 to 100 students' },
  { value: '101-300', label: '101 to 300 students' },
  { value: '300+', label: 'More than 300 students' },
];

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building2, subtitle: 'Basic information' },
  { id: 2, title: 'Location', icon: MapPin, subtitle: 'Where you are based' },
  { id: 3, title: 'Contact', icon: Phone, subtitle: 'How to reach you' },
  { id: 4, title: 'About Your Business', icon: Briefcase, subtitle: 'Operational profile' },
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
  const loadingRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
    if (!user?.id || loadingRef.current) return;
    loadingRef.current = true;
    const load = async () => {
      const { data } = await supabase
        .from('affiliate_admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setAffiliateId(data.id);
        if (data.onboarding_completed) {
          // Sync user_profiles to match affiliate_admins before navigating
          // Prevents AuthRedirect loop when user_profiles.onboarding_completed is stale
          await supabase
            .from('user_profiles')
            .update({ onboarding_completed: true })
            .eq('user_id', user.id);
          await refetchUserProfile();
          if (data.is_active) {
            navigate('/agency/dashboard');
          } else {
            navigate('/agency/pending-approval');
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
          phone: prev.phone || (data.phone?.startsWith('+') ? data.phone : '') || '',
          whatsapp: prev.whatsapp || (data.whatsapp?.startsWith('+') ? data.whatsapp : '') || '',
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
    load().finally(() => { loadingRef.current = false; });
  }, [user?.id]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) { setErrors(prev => ({ ...prev, logo: 'Please select an image file.' })); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, logo: 'Maximum size: 5MB.' })); return; }

    setUploadingLogo(true);
    setErrors(prev => ({ ...prev, logo: undefined }));
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/logo_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('user-avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(path);
      if (!urlData?.publicUrl) throw new Error('No URL');
      setLogoUrl(urlData.publicUrl);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, logo: err.message || 'Upload error.' }));
    } finally {
      setUploadingLogo(false);
    }
  };

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
    const e: FormErrors = {};
    if (step === 1) {
      if (!form.company_name.trim()) e.company_name = 'Agency name is required';
      if (!logoUrl) e.logo = 'Agency logo is required';
    }
    if (step === 2) {
      if (!form.country.trim()) e.country = 'Country is required';
      if (!form.city.trim()) e.city = 'City is required';
    }
    if (step === 3) {
      if (!form.phone.trim()) e.phone = 'Phone number is required';
    }
    if (step === 4) {
      if (!form.students_per_year) e.students_per_year = 'Please select a student volume';
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
          logo_url: logoUrl || null,
        })
        .eq('id', affiliateId);

      if (error) throw error;

      // Sync company_name and phone to user_profiles so the dashboard picks them up
      if (user?.id) {
        await supabase
          .from('user_profiles')
          .update({
            company_name: form.company_name.trim(),
            phone: form.phone.trim() || null,
            website: form.website.trim() || null,
            onboarding_completed: true,
          })
          .eq('user_id', user.id);
      }

      localStorage.removeItem('affiliate-onboarding-form');
      await refetchUserProfile();
      navigate('/agency/pending-approval');
    } catch (e: any) {
      setErrors({ company_name: e.message || 'Error saving. Please try again.' });
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
          <h2 className="text-3xl font-black text-[#05294E] mb-4">Profile Under Review</h2>
          <p className="text-slate-600 mb-10 leading-relaxed text-lg">
            Thank you for completing your registration! Our team is carefully reviewing your information.
          </p>
          <div className="bg-slate-50 rounded-2xl p-6 text-sm text-slate-500 mb-10 border border-slate-100">
            <div className="flex items-center justify-center gap-2 mb-2 text-[#05294E] font-bold">
              <Sparkles className="w-4 h-4" />
              <span>What happens next?</span>
            </div>
            Estimated review time: <strong className="text-slate-700">24 to 48 business hours</strong>.
            You will receive a confirmation email.
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 px-8 bg-[#05294E] text-white rounded-2xl font-black hover:bg-[#041f3a] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#05294E]/20"
          >
            Back to Home
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
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-0.5">Partners</div>
              <h1 className="font-black text-xl text-[#05294E] leading-tight">Agency Setup</h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Progress</span>
              <span className="text-sm font-black text-[#05294E]">Step {currentStep} of {STEPS.length}</span>
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
                <h3 className="text-2xl font-black text-[#05294E] mb-2">Complete Your Registration</h3>
                <p className="text-slate-500 leading-relaxed">
                  Fill in the information below so our team can validate and activate your partner account.
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
                          Step {idx + 1}
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
                        {currentStep === 1 && 'Tell us about your agency'}
                        {currentStep === 2 && 'Where are you located?'}
                        {currentStep === 3 && 'Communication channels'}
                        {currentStep === 4 && 'Business operations'}
                      </h2>
                      <p className="text-slate-500 text-lg">
                        {STEPS[currentStep - 1].subtitle} — We need this to validate your registration.
                      </p>
                    </header>

                    {/* ── STEP 1: Empresa ── */}
                    {currentStep === 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Logo Upload */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                            Agency Logo *
                          </label>
                          <div
                            onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                            className={`relative cursor-pointer group border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${
                              logoUrl
                                ? 'border-green-300 bg-green-50/30'
                                : errors.logo
                                  ? 'border-[#D0151C]/40 bg-red-50/20'
                                  : 'border-slate-200 hover:border-[#05294E]/40 hover:bg-[#05294E]/5'
                            }`}
                          >
                            {uploadingLogo ? (
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-[#05294E]/10 rounded-2xl flex items-center justify-center">
                                  <Loader2 className="w-8 h-8 text-[#05294E] animate-spin" />
                                </div>
                                <p className="text-sm font-bold text-slate-500">Uploading logo...</p>
                              </div>
                            ) : logoUrl ? (
                              <div className="flex flex-col items-center gap-3">
                                <img src={logoUrl} alt="Logo" className="h-24 w-auto object-contain rounded-2xl shadow-md" />
                                <p className="text-xs font-bold text-green-600 flex items-center gap-1.5">
                                  <CheckCircle className="w-4 h-4" /> Logo uploaded — click to replace
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-[#05294E]/10 transition-colors">
                                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#05294E] transition-colors" />
                                </div>
                                <div className="text-center">
                                  <p className="font-black text-slate-700 mb-1">Click to upload your logo</p>
                                  <p className="text-xs text-slate-400">PNG, JPG or SVG • Max 5MB</p>
                                </div>
                              </div>
                            )}
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </div>
                          {errors.logo && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.logo}</p>}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Agency Name *</label>
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
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Website (Optional)</label>
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
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Country *</label>
                          <input
                            type="text" value={form.country} onChange={e => set('country', e.target.value)}
                            className={inputCls(!!errors.country)}
                          />
                          {errors.country && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.country}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">State / Province</label>
                          <input
                            type="text" value={form.state} onChange={e => set('state', e.target.value)}
                            className={inputCls(false)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">City *</label>
                          <input
                            type="text" value={form.city} onChange={e => set('city', e.target.value)}
                            className={inputCls(!!errors.city)}
                          />
                          {errors.city && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.city}</p>}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Full Address</label>
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
                            <strong>Premium Tip:</strong> Having a registered physical address increases trust within our partner network.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 3: Contato ── */}
                    {currentStep === 3 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Primary Phone *</label>
                          <PhoneInput
                            international
                            defaultCountry="US"
                            addInternationalOption={false}
                            limitMaxLength={true}
                            value={form.phone}
                            onChange={(value) => set('phone', value || '')}
                            className={`agency-onboarding-phone w-full px-4 py-4 bg-white border rounded-[24px] text-slate-900 font-bold transition-all outline-none focus-within:ring-4 shadow-sm ${errors.phone ? 'border-[#D0151C]/30 focus-within:ring-[#D0151C]/5 focus-within:border-[#D0151C]' : 'border-slate-100 hover:border-slate-200 focus-within:ring-[#05294E]/5 focus-within:border-[#05294E]'}`}
                          />
                          {errors.phone && <p className="mt-2 text-xs font-bold text-[#D0151C] ml-1">{errors.phone}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">WhatsApp</label>
                          <PhoneInput
                            international
                            defaultCountry="US"
                            addInternationalOption={false}
                            limitMaxLength={true}
                            value={form.whatsapp}
                            onChange={(value) => set('whatsapp', value || '')}
                            className="agency-onboarding-phone w-full px-4 py-4 bg-white border border-slate-100 hover:border-slate-200 rounded-[24px] text-slate-900 font-bold transition-all outline-none focus-within:ring-4 focus-within:ring-[#05294E]/5 focus-within:border-[#05294E] shadow-sm"
                          />
                        </div>

                        <div className="md:col-span-2">
                           <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Contact Email</label>
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
                            How many students does your agency serve per year? *
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

                                        {/* Markets */}
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-5 ml-1">
                            Markets You Serve
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
                            How did you hear about Matricula USA?
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
                  Back
                </button>

                <div className="flex items-center gap-4">
                  {currentStep < STEPS.length ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="group flex items-center gap-3 px-10 py-4 bg-[#05294E] text-white rounded-2xl text-sm font-black hover:bg-[#041f3a] transition-all shadow-xl shadow-[#05294E]/20 transform hover:scale-[1.05] active:scale-[0.98]"
                    >
                      Next
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
                      {saving ? 'Finishing...' : 'Complete Registration'}
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
            Official Partner Platform — Matricula USA Group
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
