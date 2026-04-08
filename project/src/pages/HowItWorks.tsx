import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Star,
  ChevronDown,
  ArrowRight,
  Sparkles,
  CheckCircle,
  GraduationCap,
  Globe
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
      
      <SuccessStoriesSection t={t} />

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
    <section ref={ref} className="relative bg-gradient-to-br from-[#05294E] via-slate-800 to-[#0a3a62] text-white py-20 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#D0151C]/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[120px]"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
             className="lg:col-span-7 text-center lg:text-left"
             initial="hidden"
             animate={controls}
             variants={{
               hidden: { opacity: 0, y: 30 },
               visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
             }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 mx-auto lg:mx-0">
              <Sparkles className="w-4 h-4 text-blue-300" />
              <span className="text-sm font-semibold tracking-wide text-blue-100 uppercase">
                {t("howItWorks.stats.success") || 'O Seu Passaporte'}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black mb-6 leading-[1.1] tracking-tight">
              {t('howItWorks.title')}
            </h1>
            
            <h2 className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium">
              {t('howItWorks.subtitle')}
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-14">
              <button
                onClick={onCTAClick}
                className="w-full sm:w-auto px-8 py-4 bg-[#D0151C] hover:bg-red-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2 group"
              >
                {t('howItWorks.cta.start') || 'Começar Processo Agora'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-8 text-slate-300">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2 shrink-0" />
                <span className="text-sm sm:text-base font-medium">{t('howItWorks.stats.setup')}</span>
              </div>
              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/20"></div>
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-blue-400 mr-2 shrink-0" />
                <span className="text-sm sm:text-base font-medium">{t('howItWorks.stats.secure')}</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="lg:col-span-5 relative"
            initial="hidden"
            animate={controls}
            variants={{
              hidden: { opacity: 0, x: 50, scale: 0.9 },
              visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.8, delay: 0.2 } }
            }}
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 to-red-500/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/10 aspect-[4/5] sm:aspect-[3/2] lg:aspect-[4/5]">
                <img 
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/aerial-view-university-campus-quad-stadium.webp" 
                  alt="University Campus" 
                  className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/80 via-[#05294E]/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center lg:text-left">
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Rede Global</p>
                    <p className="text-sm font-medium">Conectando você às melhores universidades dos EUA</p>
                  </div>
                </div>
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 border border-blue-200 mb-6">
            <Star className="w-4 h-4 text-blue-600 fill-blue-600" />
            <span className="text-xs font-bold tracking-wide text-blue-700 uppercase">High Value Investment</span>
          </div>
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
    <section ref={ref} className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">{t('howItWorks.journey')}</h2>
        <div className="w-24 h-1.5 bg-[#D0151C] mx-auto rounded-full mb-4"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-8 space-y-12 relative before:absolute before:inset-0 before:left-8 md:before:left-1/2 before:-translate-x-px before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-200 before:to-transparent">
          
          {/* Step 1 */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={controls}
             variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }}
             className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-blue-600 text-white shadow-xl md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-transform duration-300 group-hover:scale-110">
              <span className="font-bold text-xl">1</span>
            </div>
            <div className="w-[calc(100%-5rem)] md:w-[calc(50%-3rem)] bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-3 text-[#05294E]">{t('howItWorks.steps.profile.title')}</h3>
              <p className="text-slate-600 mb-4">{t('howItWorks.steps.profile.description')}</p>
              <ul className="space-y-2">
                {(t('howItWorks.steps.profile.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-500">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Step 2 (Fee) */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={controls}
             variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } } }}
             className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-[#05294E] text-white shadow-xl md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-transform duration-300 group-hover:scale-110">
              <span className="font-bold text-xl">2</span>
            </div>
            <div className="w-[calc(100%-5rem)] md:w-[calc(50%-3rem)] bg-gradient-to-br from-[#05294E]/5 to-transparent p-6 sm:p-8 rounded-3xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-3 text-[#05294E] flex flex-wrap items-center gap-2">
                {isLoadingFee ? (
                  <span className="inline-block h-6 w-32 bg-slate-200 rounded animate-pulse"></span>
                ) : (
                  <>
                    {t('howItWorks.steps.selectionFee.title', { selectionProcessFee: baseSelectionFee || selectionProcessFee }).replace(/\(\$[\d.]+\)/g, '').replace(/\$[\d.]+/g, '').trim()}
                  </>
                )}
                {hasSellerPackage && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full uppercase tracking-widest font-bold">
                    {packageName}
                  </span>
                )}
              </h3>
              <p className="text-slate-600 mb-4">
                {t('howItWorks.steps.selectionFee.description')}
              </p>
              <ul className="space-y-2">
                {(t('howItWorks.steps.selectionFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-500">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={controls}
             variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3 } } }}
             className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-blue-600 text-white shadow-xl md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-transform duration-300 group-hover:scale-110">
              <span className="font-bold text-xl">3</span>
            </div>
            <div className="w-[calc(100%-5rem)] md:w-[calc(50%-3rem)] bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-3 text-[#05294E]">{t('howItWorks.steps.documents.title')}</h3>
              <p className="text-slate-600 mb-4">{t('howItWorks.steps.documents.description')}</p>
              <ul className="space-y-2">
                {(t('howItWorks.steps.documents.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-500">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Step 4 */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={controls}
             variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.4 } } }}
             className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-blue-600 text-white shadow-xl md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-transform duration-300 group-hover:scale-110">
              <span className="font-bold text-xl">4</span>
            </div>
            <div className="w-[calc(100%-5rem)] md:w-[calc(50%-3rem)] bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-3 text-[#05294E]">{t('howItWorks.steps.applicationFee.title')}</h3>
              <p className="text-slate-600 mb-4">{t('howItWorks.steps.applicationFee.description')}</p>
              <ul className="space-y-2">
                {(t('howItWorks.steps.applicationFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-500">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Step 5 */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={controls}
             variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } } }}
             className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-blue-600 text-white shadow-xl md:absolute md:left-1/2 md:-translate-x-1/2 shrink-0 z-10 transition-transform duration-300 group-hover:scale-110">
              <span className="font-bold text-xl">5</span>
            </div>
            <div className="w-[calc(100%-5rem)] md:w-[calc(50%-3rem)] bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-3 text-[#05294E]">{t('howItWorks.steps.placementFee.title')}</h3>
              <p className="text-slate-600 mb-4">{t('howItWorks.steps.placementFee.description')}</p>
              <ul className="space-y-2">
                {(t('howItWorks.steps.placementFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-500">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

        </div>

        <div className="lg:col-span-4 hidden lg:block sticky top-24">
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 aspect-[3/4]">
             <img 
               src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/group-students-talking-campus-stairs.webp" 
               alt="Students journey" 
               className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-1000"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/80 via-transparent to-transparent"></div>
             <div className="absolute bottom-8 left-8 right-8 text-white">
                <p className="text-2xl font-bold mb-2">Sua Jornada</p>
                <p className="text-blue-100 italic">Cada passo planejado para o seu sucesso acadêmico nos Estados Unidos.</p>
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
    <section ref={ref} className="bg-gradient-to-br from-slate-50 to-blue-50/50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-[#05294E] mb-4">{t('howItWorks.whyUs.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: t('howItWorks.whyUs.smartDiscovery.title'), desc: t('howItWorks.whyUs.smartDiscovery.description') },
            { title: t('howItWorks.whyUs.documentManagement.title'), desc: t('howItWorks.whyUs.documentManagement.description') },
            { title: t('howItWorks.whyUs.personalSupport.title'), desc: t('howItWorks.whyUs.personalSupport.description') },
            { title: t('howItWorks.whyUs.successTracking.title'), desc: t('howItWorks.whyUs.successTracking.description') }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={controls}
              variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: idx * 0.1 } } }}
              className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 hover:shadow-xl border border-slate-100 hover:-translate-y-2 transition-all duration-300 flex flex-col h-full"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-4 leading-tight">{item.title}</h3>
              <p className="text-slate-600 text-lg mt-auto leading-relaxed">{item.desc}</p>
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
/*                            SUCCESS STORIES                                 */
/* -------------------------------------------------------------------------- */
const SuccessStoriesSection: React.FC<{ t: any }> = ({ t }) => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-slate-50 to-blue-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-16 text-[#05294E]">Success Stories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.values(t('howItWorks.successStories', { returnObjects: true }))
            .filter((item): item is { text: string; name: string; major: string } => typeof item === 'object' && item !== null && 'text' in item)
            .map((story, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 20 }}
              animate={controls}
              variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.1 } } }}
              className="bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200"
            >
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-8 text-lg leading-relaxed italic">
                "{story.text}"
              </p>
              <div className="flex items-center mt-auto">
                <img
                  src={[
                    "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/diverse-students-group-laptop-outdoors.webp",
                    "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/group-students-studying-campus-lawn.webp",
                    "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/group-four-students-graduation-blue-gown.webp",
                    "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2&fit=crop",
                    "https://images.pexels.com/photos/1181696/pexels-photo-1181696.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2&fit=crop"
                  ][index] || "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/diverse-students-group-laptop-outdoors.webp"}
                  alt={story.name}
                  className="w-14 h-14 rounded-full mr-4 shadow-md object-cover"
                />
                <div>
                  <div className="font-bold text-slate-900">{story.name}</div>
                  <div className="text-sm text-green-600 font-medium">{story.major}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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