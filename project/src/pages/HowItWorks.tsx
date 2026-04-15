import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  ChevronDown,
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Globe,
  Users,
  Award,
  Headphones,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDynamicFees } from '../hooks/useDynamicFees';
import { useAffiliateAdminCheck } from '../hooks/useAffiliateAdminCheck';
import { useAuth } from '../hooks/useAuth';
import { useSystemType } from '../hooks/useSystemType';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useSimplifiedFees } from '../hooks/useSimplifiedFees';
import SmartChat from '../components/SmartChat';

const HowItWorks: React.FC = () => {
  const { t, i18n } = useTranslation(['home', 'common']);
  const navigate = useNavigate();
  const { selectionProcessFee, scholarshipFee, i20ControlFee, hasSellerPackage, packageName } = useDynamicFees();
  const { affiliateAdminEmail, loading: affiliateCheckLoading, isTheFutureOfEnglishAffiliate } = useAffiliateAdminCheck();
  const { userProfile } = useAuth();
  const { systemType, loading: systemTypeLoading } = useSystemType();
  const { getFeeAmount, hasOverride, loading: feeLoading } = useFeeConfig(userProfile?.user_id);
  const { fee350, loading: simplifiedFeesLoading } = useSimplifiedFees();
  
  const isBrantImmigrationAffiliate = affiliateAdminEmail?.toLowerCase() === 'contato@brantimmigration.com';
  
  const baseSelectionFee = React.useMemo(() => {
    if (affiliateCheckLoading || systemTypeLoading || (systemType === 'simplified' && simplifiedFeesLoading) || (systemType === 'legacy' && feeLoading)) {
      return undefined;
    }
    if (isTheFutureOfEnglishAffiliate) {
      return '$350.00';
    }
    if (isBrantImmigrationAffiliate) {
      return '$400.00';
    }
    if (systemType === 'simplified') {
      return `$${fee350.toFixed(2)}`;
    }
    const hasSelectionOverride = hasOverride('selection_process');
    if (hasSelectionOverride) {
      const overrideValue = Number(getFeeAmount('selection_process'));
      return `$${overrideValue.toFixed(2)}`;
    } else {
      return '$400.00';
    }
  }, [affiliateCheckLoading, systemTypeLoading, simplifiedFeesLoading, feeLoading, isTheFutureOfEnglishAffiliate, isBrantImmigrationAffiliate, systemType, fee350, hasOverride, getFeeAmount]);

  const handleCTAClick = () => {
    if (userProfile) {
      navigate('/student/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      <HeroSection onCTAClick={handleCTAClick} t={t} />
      
      <SelectionFeeShowcase 
        i18n={i18n}
        onCTAClick={handleCTAClick}
      />
      
      <JourneySection 
        t={t} 
        baseSelectionFee={baseSelectionFee}
        selectionProcessFee={selectionProcessFee}
        hasSellerPackage={hasSellerPackage}
        packageName={packageName || ''}
        isLoadingFee={baseSelectionFee === undefined}
      />
      
      <WhyUsSection t={t} />
      
      <FAQSection 
        t={t}
        selectionProcessFee={selectionProcessFee}
        scholarshipFee={scholarshipFee}
        i20ControlFee={i20ControlFee}
      />
      
      <BottomCTASection onCTAClick={handleCTAClick} i18n={i18n} />
      
      <SmartChat />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               HERO SECTION                                 */
/* -------------------------------------------------------------------------- */
const HeroSection: React.FC<{ onCTAClick: () => void, t: any }> = ({ onCTAClick, t }) => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  return (
    <section ref={ref} className="relative bg-[#05294E] text-white pt-24 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(208,21,28,0.05),transparent_50%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] opacity-50"></div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">
          <motion.div
             className="lg:col-span-7 text-center lg:text-left"
             initial="hidden"
             animate={controls}
             variants={{
               hidden: { opacity: 0, y: 30 },
               visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
             }}
          >


            <h1 className="text-5xl md:text-6xl lg:text-8xl font-black mb-8 leading-[1] tracking-tighter">
              <span className="block text-white mb-2">{t('howItWorks.title').split(' ')[0]}</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-white to-blue-400">
                {t('howItWorks.title').split(' ').slice(1).join(' ')}
              </span>
            </h1>
            
            <p className="text-lg md:text-2xl text-blue-100/70 max-w-2xl mx-auto lg:mx-0 mb-12 leading-relaxed font-light italic">
              {t('howItWorks.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 mb-16">
              <button
                onClick={onCTAClick}
                className="group relative w-full sm:w-auto px-10 py-5 bg-[#D0151C] hover:bg-[#E01B22] text-white font-black text-xl rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_50px_rgba(208,21,28,0.3)] flex items-center justify-center gap-3 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  {t('howItWorks.cta.start') || 'Começar Processo Agora'}
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center justify-center lg:justify-start gap-8 lg:gap-12">
              <div className="flex flex-col items-center lg:items-start group">
                <span className="text-3xl lg:text-4xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors">{t('howItWorks.stats.setup') || '5 Min'}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-300/60">Setup Inteligente</span>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10"></div>
              <div className="flex flex-col items-center lg:items-start group">
                <span className="text-3xl lg:text-4xl font-black text-white mb-1 group-hover:text-red-400 transition-colors">{t('howItWorks.stats.secure') || '100%'}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-300/60">Seguro & Criptografado</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column with Enhanced Visuals */}
          <motion.div 
            className="lg:col-span-5 relative lg:ml-8"
            initial="hidden"
            animate={controls}
            variants={{
              hidden: { opacity: 0, scale: 0.9, x: 50 },
              visible: { opacity: 1, scale: 1, x: 0, transition: { duration: 1, delay: 0.3, ease: "easeOut" } }
            }}
          >
            <div className="relative group">
              {/* Background Glow */}
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-600/20 to-red-600/10 blur-3xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
              
              {/* Main Image Container */}
              <div className="relative rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10 aspect-[4/5]">
                <img 
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/CAMPUS_5.jpg" 
                  alt="Elite University Campus" 
                  className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-[3s] ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05294E] via-transparent to-transparent opacity-80"></div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                        SELECTION FEE SHOWCASE                              */
/* -------------------------------------------------------------------------- */
const SelectionFeeShowcase: React.FC<{ i18n: any, onCTAClick: () => void }> = ({ i18n, onCTAClick }) => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const isPortuguese = i18n.language.startsWith('pt');
  const isSpanish = i18n.language.startsWith('es');

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  const texts = {
    title: isPortuguese ? "Por que o Processo Seletivo é o melhor caminho?" : (isSpanish ? "¿Por qué el Proceso de Selección es el mejor camino?" : "Why is the Selection Process the best path?"),
    subtitle: isPortuguese ? "Sua Chave de Ouro para as Universidades Americanas. Diferente de agências tradicionais, nossa taxa consolida tudo em um único investimento inicial." : (isSpanish ? "Su Llave de Oro para las Universidades Americanas. A diferencia de las agencias tradicionales, nuestra tarifa consolida todo en una sola inversión inicial." : "Your Golden Key to American Universities. Unlike traditional agencies, our fee consolidates everything into a single initial investment."),
    traditionalTitle: isPortuguese ? "Meio Tradicional (Agências)" : (isSpanish ? "Forma Tradicional (Agencias)" : "Traditional Way (Agencies)"),
    ourTitle: isPortuguese ? "Com Matrícula USA" : (isSpanish ? "Con Matrícula USA" : "With Matrícula USA"),
    savings: isPortuguese ? "Economia Significativa" : (isSpanish ? "Ahorro Significativo" : "Significant Savings"),
    startNow: isPortuguese ? "Iniciar Processo Seletivo" : (isSpanish ? "Iniciar Proceso de Selección" : "Start Selection Process"),
    tradItems: isPortuguese ? [
      "Taxa de consultoria de agência elevada",
      "Taxas avulsas de universidades",
      "Nenhuma garantia realista de bolsa de estudos",
      "Intermediários lentos e dependência de terceiros"
    ] : [
      "High agency consulting fees",
      "Separate university application fees",
      "No realistic scholarship guarantee",
      "Slow intermediaries and third-party dependency"
    ],
    ourItems: isPortuguese ? [
      "Plataforma completa de organização e análise de perfil",
      "Aplicação direta em até 3 universidades sem taxas avulsas",
      "Acesso à nossa rede parceira com bolsas exclusivas",
      "Suporte humano dedicado por WhatsApp e plataforma"
    ] : [
      "Full platform for organization and profile analysis",
      "Direct application to up to 3 universities without separate fees",
      "Access to our partner network with exclusive scholarships",
      "Dedicated human support via WhatsApp and platform"
    ]
  };



  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
           initial="hidden"
           animate={controls}
           variants={{
             hidden: { opacity: 0, y: 30 },
             visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
           }}
           className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] mb-6">
            {texts.title}
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            {texts.subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Traditional Card */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={controls}
            variants={{ visible: { opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.2 } } }}
            className="bg-white rounded-[2rem] p-8 md:p-10 shadow-lg border border-slate-200 opacity-90 grayscale-[0.2]"
          >
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-700">{texts.traditionalTitle}</h3>
              </div>
            </div>
            <ul className="space-y-5">
              {texts.tradItems.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  </div>
                  <span className="text-slate-600 leading-relaxed text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pricing Card Premium */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={controls}
            variants={{ visible: { opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.4 } } }}
            className="bg-[#05294E] rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-blue-400/30 transition-all duration-700"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-blue-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{texts.ourTitle}</h3>
                    <div className="text-blue-300 font-medium">{texts.savings}</div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-2xl font-bold text-white uppercase tracking-wider">Investimento Único</div>
                  <div className="text-blue-200 text-sm">transparência total</div>
                </div>
              </div>

              <ul className="space-y-5 mb-10">
                {texts.ourItems.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-blue-100 leading-relaxed text-lg">{item}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={onCTAClick}
                className="w-full py-4 bg-white hover:bg-slate-50 text-[#05294E] rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                {texts.startNow}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};


/* -------------------------------------------------------------------------- */
/*                            JOURNEY SECTION                                 */
/* -------------------------------------------------------------------------- */
const JourneySection: React.FC<{ 
  t: any, baseSelectionFee: any, selectionProcessFee: any, 
  hasSellerPackage: boolean, packageName: string, isLoadingFee: boolean
}> = ({ t, baseSelectionFee, selectionProcessFee, hasSellerPackage, packageName, isLoadingFee }) => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  return (
    <section ref={ref} className="relative py-32 overflow-hidden bg-[#05294E]">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-24 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -left-24 w-[500px] h-[500px] bg-[#D0151C]/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            {t('howItWorks.journey')}
          </h2>
          <div className="w-24 h-2 bg-[#D0151C] mx-auto rounded-full shadow-[0_0_20px_rgba(208,21,28,0.5)]"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-12 space-y-20 relative">
            
            {/* Step 1 */}
            <div className="relative group w-full">
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-1/2 h-[calc(50%+5rem)] bg-gradient-to-b from-blue-500/50 to-red-500/50"></div>
              <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6, delay: 0.1 }}
                 className="relative flex items-center justify-between md:justify-normal md:flex-row-reverse w-full"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-all duration-500 border border-white/20 group-hover:scale-110">
                  <span className="font-black text-2xl">01</span>
                </div>
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-3xl font-black mb-5 text-white tracking-tight">{t('howItWorks.steps.profile.title')}</h3>
                <p className="text-blue-100/70 text-lg mb-8 leading-relaxed font-medium">{t('howItWorks.steps.profile.description')}</p>
                <ul className="space-y-4">
                  {(t('howItWorks.steps.profile.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-blue-100/70 font-medium group/li">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
            </div>

            {/* Step 2 (Fee) */}
            <div className="relative group w-full">
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-0 h-[calc(100%+5rem)] bg-gradient-to-b from-red-500/50 to-blue-500/50"></div>
              <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6, delay: 0.2 }}
                 className="relative flex items-center justify-between md:justify-normal w-full"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_0_30px_rgba(208,21,28,0.5)] md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-all duration-500 border border-white/20 group-hover:scale-110">
                  <span className="font-black text-2xl">02</span>
                </div>
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-3xl font-black mb-5 text-white tracking-tight flex flex-wrap items-center gap-3">
                  {isLoadingFee ? (
                    <span className="inline-block h-8 w-40 bg-white/10 rounded-lg animate-pulse"></span>
                  ) : (
                    <>
                      {t('howItWorks.steps.selectionFee.title', { selectionProcessFee: baseSelectionFee || selectionProcessFee }).replace(/\(\$[\d.]+\)/g, '').replace(/\$[\d.]+/g, '').trim()}
                    </>
                  )}
                  {hasSellerPackage && (
                    <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-full uppercase tracking-[0.2em] font-black">
                      {packageName}
                    </span>
                  )}
                </h3>
                <p className="text-blue-100/70 text-lg mb-8 leading-relaxed font-medium">
                  {t('howItWorks.steps.selectionFee.description')}
                </p>
                <ul className="space-y-4">
                  {(t('howItWorks.steps.selectionFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-blue-100/70 font-medium group/li">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(208,21,28,0.5)]" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
            </div>

            {/* Step 3 */}
            <div className="relative group w-full">
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-0 h-[calc(100%+5rem)] bg-gradient-to-b from-blue-500/50 to-red-500/50"></div>
              <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6, delay: 0.3 }}
                 className="relative flex items-center justify-between md:justify-normal md:flex-row-reverse w-full"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_30_rgba(59,130,246,0.5)] md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-all duration-500 border border-white/20 group-hover:scale-110">
                  <span className="font-black text-2xl">03</span>
                </div>
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-3xl font-black mb-5 text-white tracking-tight">{t('howItWorks.steps.documents.title')}</h3>
                <p className="text-blue-100/70 text-lg mb-8 leading-relaxed font-medium">{t('howItWorks.steps.documents.description')}</p>
                <ul className="space-y-4">
                  {(t('howItWorks.steps.documents.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-blue-100/70 font-medium group/li">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
            </div>

            {/* Step 4 */}
            <div className="relative group w-full">
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-0 h-[calc(100%+5rem)] bg-gradient-to-b from-red-500/50 to-blue-500/50"></div>
              <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6, delay: 0.4 }}
                 className="relative flex items-center justify-between md:justify-normal w-full"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_0_30px_rgba(208,21,28,0.5)] md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-all duration-500 border border-white/20 group-hover:scale-110">
                  <span className="font-black text-2xl">04</span>
                </div>
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-3xl font-black mb-5 text-white tracking-tight">{t('howItWorks.steps.applicationFee.title')}</h3>
                <p className="text-blue-100/70 text-lg mb-8 leading-relaxed font-medium">{t('howItWorks.steps.applicationFee.description')}</p>
                <ul className="space-y-4">
                  {(t('howItWorks.steps.applicationFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-blue-100/70 font-medium group/li">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(208,21,28,0.5)]" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
            </div>

            {/* Step 5 */}
            <div className="relative group w-full">
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-0 h-1/2 bg-gradient-to-b from-blue-500/50 to-blue-500/50"></div>
              <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6, delay: 0.5 }}
                 className="relative flex items-center justify-between md:justify-normal md:flex-row-reverse w-full"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-all duration-500 border border-white/20 group-hover:scale-110">
                  <span className="font-black text-2xl">05</span>
                </div>
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-3xl font-black mb-5 text-white tracking-tight">{t('howItWorks.steps.placementFee.title')}</h3>
                <p className="text-blue-100/70 text-lg mb-8 leading-relaxed font-medium">{t('howItWorks.steps.placementFee.description')}</p>
                <ul className="space-y-4">
                  {(t('howItWorks.steps.placementFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-blue-100/70 font-medium group/li">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                              WHY US SECTION                                */
/* -------------------------------------------------------------------------- */
const WhyUsSection: React.FC<{ t: any }> = ({ t }) => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  return (
    <section ref={ref} className="relative py-32 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6 tracking-tight">
            {t('howItWorks.whyUs.title')}
          </h2>
          <div className="w-20 h-1.5 bg-[#D0151C] mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              title: t('howItWorks.whyUs.smartDiscovery.title'), 
              desc: t('howItWorks.whyUs.smartDiscovery.description'),
              icon: Users,
              color: "blue"
            },
            { 
              title: t('howItWorks.whyUs.documentManagement.title'), 
              desc: t('howItWorks.whyUs.documentManagement.description'),
              icon: Award,
              color: "red"
            },
            { 
              title: t('howItWorks.whyUs.personalSupport.title'), 
              desc: t('howItWorks.whyUs.personalSupport.description'),
              icon: Monitor,
              color: "yellow"
            },
            { 
              title: t('howItWorks.whyUs.successTracking.title'), 
              desc: t('howItWorks.whyUs.successTracking.description'),
              icon: Headphones,
              color: "blue"
            }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={controls}
              variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: idx * 0.1 } } }}
              className="group relative bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-all duration-300 flex flex-col h-full"
            >
              <div className={`w-16 h-16 rounded-2xl mb-8 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                item.color === 'red' ? 'bg-red-50 text-[#D0151C]' : 
                item.color === 'yellow' ? 'bg-yellow-50 text-yellow-600' : 
                'bg-blue-50 text-blue-600'
              }`}>
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#05294E] mb-4 leading-tight">{item.title}</h3>
              <p className="text-slate-600 text-lg leading-relaxed flex-grow">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                               FAQ SECTION                                  */
/* -------------------------------------------------------------------------- */
const FAQSection: React.FC<{ t: any, selectionProcessFee: any, scholarshipFee: any, i20ControlFee: any }> = ({ t, selectionProcessFee, scholarshipFee, i20ControlFee }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={controls}
           variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-12 text-center text-[#05294E]">{t('howItWorks.faq.title')}</h2>
          <div className="flex flex-col gap-5 max-w-3xl mx-auto">
            {Array.from({ length: 11 }, (_, i) => i + 1).map((num) => (
              <div 
                key={num} 
                className={`group rounded-3xl transition-all duration-500 border ${
                  openFaq === num 
                    ? 'bg-gradient-to-br from-white to-blue-50/30 border-blue-300 shadow-xl shadow-blue-900/5' 
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === num ? null : num)}
                  className="w-full text-left p-6 sm:p-7 flex items-center gap-5 group"
                >
                  <div className="flex-1">
                    <h3 className={`text-base sm:text-lg font-bold leading-tight transition-colors duration-500 ${
                      openFaq === num ? 'text-blue-900' : 'text-[#05294E]'
                    }`}>
                      {t(`howItWorks.faq.q${num}.question`, { selectionProcessFee, scholarshipFee, i20ControlFee })}
                    </h3>
                  </div>
                  <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500 ${
                    openFaq === num ? 'bg-blue-100 text-blue-600 rotate-180' : 'bg-slate-50 text-slate-300 group-hover:text-slate-400'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === num && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="px-6 sm:px-7 pb-7 pt-0">
                        <div 
                          className="text-slate-600 text-base sm:text-lg leading-relaxed border-t border-slate-100 pt-5 pr-4 sm:pr-8 space-y-4"
                          dangerouslySetInnerHTML={{ __html: t(`howItWorks.faq.q${num}.answer`, { selectionProcessFee, scholarshipFee, i20ControlFee }) }} 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};



/* -------------------------------------------------------------------------- */
/*                                BOTTOM CTA                                  */
/* -------------------------------------------------------------------------- */
const BottomCTASection: React.FC<{ onCTAClick: () => void, i18n: any }> = ({ onCTAClick, i18n }) => {
  const isPortuguese = i18n.language.startsWith('pt');
  
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-gradient-to-br from-[#05294E] to-[#0a3a62] rounded-[3rem] text-center shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center">
          
          <div className="flex-1 p-10 md:p-16 text-center lg:text-left relative z-10">
            {/* Decorative backgrounds */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px]"></div>
            
            <GraduationCap className="w-16 h-16 text-white/90 mb-8 mx-auto lg:mx-0" />
            
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
              {isPortuguese ? "Pronto para estudar nos EUA?" : "Ready to study in the US?"}
            </h2>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl mb-10 leading-relaxed mx-auto lg:mx-0">
              {isPortuguese 
                ? "Junte-se a centenas de estudantes e inicie seu processo agora mesmo. A sua aprovação está mais próxima do que nunca." 
                : "Join hundreds of students and start your process right now. Your approval is closer than ever."}
            </p>

            <button
              onClick={onCTAClick}
              className="inline-flex items-center px-10 py-5 bg-[#D0151C] hover:bg-red-600 text-white font-bold text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group"
            >
              {isPortuguese ? "Iniciar Minha Jornada" : "Start My Journey"}
              <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="w-full lg:w-[40%] h-64 lg:h-[600px] relative">
            <img 
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/graduates-throwing-caps-blue-sky-graduation.webp" 
              alt="Graduation success" 
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#05294E] via-[#05294E]/20 to-transparent"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;