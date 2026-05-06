import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  ChevronDown,
  ArrowRight,
  CheckCircle,
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
  const { t } = useTranslation(['home', 'common']);
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
        t={t}
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
      
      <BottomCTASection onCTAClick={handleCTAClick} t={t} />
      
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
    <section ref={ref} className="relative pt-32 pb-32 lg:pt-0 lg:pb-0 overflow-hidden bg-[#05294E] min-h-[600px] lg:h-[768px] flex items-center">
      {/* Background Image Layer with Responsive Design */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 lg:right-auto lg:left-0 lg:w-[65%]">
          <img 
            src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/library-facade-white-columns-students.webp" 
            alt="Elite University Campus" 
            className="w-full h-full object-cover object-[55.6%_center] lg:object-center"
          />
          {/* Overlay for Mobile: Simple dark overlay for text readability */}
          <div className="absolute inset-0 bg-[#05294E]/30 lg:hidden"></div>
          
          {/* Desktop Transition Gradient: Solid blue on right to transparent on left */}
          <div className="absolute inset-0 hidden lg:block bg-gradient-to-l from-[#05294E] via-[#05294E]/30 to-transparent"></div>
        </div>
      </div>

      {/* Decorative Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-24 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -left-24 w-[600px] h-[600px] bg-[#D0151C]/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl lg:ml-auto">
          <motion.div
             initial="hidden"
             animate={controls}
             variants={{
               hidden: { opacity: 0, x: 50 },
               visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
             }}
             className="text-center lg:text-right"
          >


            <h1 className="text-5xl md:text-7xl lg:text-[100px] font-black text-white mb-8 tracking-tighter leading-[0.85] lg:pl-6">
              <span className="block mb-2">{t('howItWorks.title').split(' ')[0]}</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-200 block pb-2">
                {t('howItWorks.title').split(' ').slice(1).join(' ')}
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white mb-12 max-w-2xl mx-auto lg:ml-auto lg:mr-0 leading-relaxed font-medium drop-shadow-lg">
              {t('howItWorks.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-end">
              <button
                onClick={onCTAClick}
                className="group relative w-full sm:w-auto px-10 py-5 bg-[#D0151C] hover:bg-[#b01218] text-white rounded-2xl font-black text-xl transition-all duration-300 shadow-[0_20px_40px_rgba(208,21,28,0.3)] hover:shadow-[0_25px_50px_rgba(208,21,28,0.4)] hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden"
              >
                <span className="relative z-10">{t('howItWorks.cta.start')}</span>
                <span className="relative z-10 bg-white/20 p-1 rounded-lg">
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
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
const SelectionFeeShowcase: React.FC<{ t: any, onCTAClick: () => void }> = ({ t, onCTAClick }) => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  const texts = {
    title: t('howItWorks.selectionFeeShowcase.title'),
    subtitle: t('howItWorks.selectionFeeShowcase.subtitle'),
    traditionalTitle: t('howItWorks.selectionFeeShowcase.traditionalWay'),
    ourTitle: t('howItWorks.selectionFeeShowcase.ourWay'),
    savings: t('howItWorks.selectionFeeShowcase.savings'),
    startNow: t('howItWorks.selectionFeeShowcase.startProcess'),
    tradItems: t('howItWorks.selectionFeeShowcase.traditionalItems', { returnObjects: true }) as string[],
    ourItems: t('howItWorks.selectionFeeShowcase.ourItems', { returnObjects: true }) as string[]
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-4 mb-8 pb-6 border-b border-blue-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{texts.ourTitle}</h3>
                    <div className="text-blue-300 font-medium">{texts.savings}</div>
                  </div>
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
    <section ref={ref} className="relative py-16 md:py-24 overflow-hidden bg-[#05294E]">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-24 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -left-24 w-[500px] h-[500px] bg-[#D0151C]/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            {t('howItWorks.journey')}
          </h2>
          <div className="w-24 h-2 bg-[#D0151C] mx-auto rounded-full shadow-[0_0_20px_rgba(208,21,28,0.5)]"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-12 space-y-10 lg:space-y-12 relative">
            
            {/* Step 1 */}
            <div className="relative group w-full">
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-1/2 h-[calc(50%+2.5rem)] lg:h-[calc(50%+3rem)] bg-gradient-to-b from-blue-500/50 to-red-500/50"></div>
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
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 text-white tracking-tight">{t('howItWorks.steps.profile.title')}</h3>
                <p className="text-blue-100/70 text-base sm:text-lg mb-6 leading-relaxed font-medium">{t('howItWorks.steps.profile.description')}</p>
                <ul className="space-y-3">
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
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-0 h-[calc(100%+2.5rem)] lg:h-[calc(100%+3rem)] bg-gradient-to-b from-red-500/50 to-blue-500/50"></div>
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
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 text-white tracking-tight flex flex-wrap items-center gap-3">
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
                <p className="text-blue-100/70 text-base sm:text-lg mb-6 leading-relaxed font-medium">
                  {t('howItWorks.steps.selectionFee.description')}
                </p>
                <ul className="space-y-3">
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
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-0 h-[calc(100%+2.5rem)] lg:h-[calc(100%+3rem)] bg-gradient-to-b from-blue-500/50 to-red-500/50"></div>
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
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 text-white tracking-tight">{t('howItWorks.steps.documents.title')}</h3>
                <p className="text-blue-100/70 text-base sm:text-lg mb-6 leading-relaxed font-medium">{t('howItWorks.steps.documents.description')}</p>
                <ul className="space-y-3">
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
              <div className="absolute left-8 md:left-1/2 -translate-x-px w-1 top-0 h-[calc(100%+2.5rem)] lg:h-[calc(100%+3rem)] bg-gradient-to-b from-red-500/50 to-blue-500/50"></div>
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
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 text-white tracking-tight">{t('howItWorks.steps.applicationFee.title')}</h3>
                <p className="text-blue-100/70 text-base sm:text-lg mb-6 leading-relaxed font-medium">{t('howItWorks.steps.applicationFee.description')}</p>
                <ul className="space-y-3">
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
              <div className="w-[calc(100%-5rem)] md:w-[calc(50%-4rem)] bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/20">
                <h3 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 text-white tracking-tight">{t('howItWorks.steps.placementFee.title')}</h3>
                <p className="text-blue-100/70 text-base sm:text-lg mb-6 leading-relaxed font-medium">{t('howItWorks.steps.placementFee.description')}</p>
                <ul className="space-y-3">
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
    <section ref={ref} className="relative py-32 md:py-48 overflow-hidden bg-[#fcfdfe]">
      {/* High-end Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-100/30 rounded-full blur-[140px] opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-red-100/20 rounded-full blur-[120px] opacity-40"></div>
        
        {/* Premium texture overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        {/* Large Watermark Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center opacity-[0.02] select-none">
          <span className="text-[20vw] font-black text-slate-900 tracking-tighter leading-none">MATRICULAUSA</span>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={controls}
            variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}
          >
            <h2 className="text-5xl md:text-7xl font-black text-[#05294E] mb-8 tracking-tighter leading-[0.9] pr-6">
              {t('howItWorks.whyUs.mainTitle').split(' ').slice(0, -1).join(' ')} <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#05294E] via-[#D0151C] to-[#05294E]">
                {t('howItWorks.whyUs.mainTitle').split(' ').slice(-1)}
              </span>
            </h2>
            <div className="w-24 h-2.5 bg-gradient-to-r from-[#D0151C] to-red-400 mx-auto rounded-full shadow-lg shadow-red-500/20"></div>
          </motion.div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Featured Image with Premium Frame */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={controls}
            variants={{ visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.2 } } }}
            className="w-full lg:w-[45%] relative"
          >
            <div className="relative z-10 rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-[12px] border-white bg-slate-100 flex items-center justify-center h-[500px] lg:h-[650px]">
                <span className="text-2xl font-black text-slate-400 uppercase tracking-tighter text-center px-10">
                  {t('howItWorks.whyUs.placeholderPhoto')}
                </span>
            </div>
            
            {/* Decorative Geometric Accents */}
            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-[#D0151C] rounded-[3.5rem] -z-0 opacity-10 animate-pulse"></div>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl -z-10"></div>
          </motion.div>

          {/* Advantages Grid */}
          <div className="w-full lg:w-[55%] grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {[
              { 
                title: t('howItWorks.whyUs.smartDiscovery.title'), 
                desc: t('howItWorks.whyUs.smartDiscovery.description'),
                gradient: "from-blue-600 to-indigo-700"
              },
              { 
                title: t('howItWorks.whyUs.documentManagement.title'), 
                desc: t('howItWorks.whyUs.documentManagement.description'),
                gradient: "from-red-600 to-rose-700"
              },
              { 
                title: t('howItWorks.whyUs.personalSupport.title'), 
                desc: t('howItWorks.whyUs.personalSupport.description'),
                gradient: "from-amber-500 to-orange-700"
              },
              { 
                title: t('howItWorks.whyUs.successTracking.title'), 
                desc: t('howItWorks.whyUs.successTracking.description'),
                gradient: "from-emerald-600 to-teal-700"
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={controls}
                variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.4 + (idx * 0.1) } } }}
                className="relative group"
              >
                {/* Floating index number */}
                <span className="absolute -top-6 -right-2 text-7xl font-black text-slate-100/60 select-none z-0 transition-colors duration-500 group-hover:text-blue-50/50 leading-none">
                  0{idx + 1}
                </span>

                <div className="relative z-10 bg-white/90 backdrop-blur-md p-8 lg:p-10 rounded-[2.5rem] border border-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 h-full flex flex-col overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${item.gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-700`}></div>
                  
                  <h3 className="text-xl lg:text-2xl font-black text-[#05294E] mb-4 leading-tight group-hover:text-blue-900 transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-base lg:text-lg leading-relaxed font-medium flex-grow">
                    {item.desc}
                  </p>
                  
                  <div className="mt-8 flex items-center gap-2">
                     <div className={`w-6 h-1 rounded-full bg-gradient-to-r ${item.gradient}`}></div>
                     <div className="w-1.5 h-1 rounded-full bg-slate-200"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
const BottomCTASection: React.FC<{ onCTAClick: () => void, t: any }> = ({ onCTAClick, t }) => {
  
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-[#05294E] rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col-reverse lg:flex-row items-stretch min-h-[500px]">
          
          {/* Content side */}
          <div className="flex-1 p-10 md:p-16 lg:p-20 flex flex-col justify-center relative z-20 bg-[#05294E] -mt-4 lg:mt-0 rounded-b-[3.5rem] lg:rounded-br-none lg:rounded-l-[3.5rem]">
            
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                  {t('howItWorks.bottomCTA.title')}
                </h2>
                
                <p className="text-lg md:text-xl text-blue-100/80 max-w-xl mb-10 leading-relaxed font-medium">
                  {t('howItWorks.bottomCTA.description')}
                </p>

                <button
                  onClick={onCTAClick}
                  className="group inline-flex items-center px-10 py-5 bg-[#D0151C] hover:bg-[#E01B22] text-white font-black text-xl rounded-2xl shadow-[0_20px_40px_rgba(208,21,28,0.3)] hover:shadow-[0_25px_50px_rgba(208,21,28,0.4)] transition-all duration-300 hover:-translate-y-1"
                >
                  {t('howItWorks.bottomCTA.button')}
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </motion.div>
            </div>
          </div>

          {/* Image side with much better transition */}
          <div className="w-full lg:w-[45%] relative min-h-[350px] lg:min-h-full overflow-hidden lg:mt-0 z-10">
            <img 
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/graduates-throwing-caps-blue-sky-graduation.webp" 
              alt="Graduation success" 
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* The Smooth Transition Overlays */}
            {/* 1. Mobile transition: Stronger fade and solid top blend */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#05294E] via-[#05294E] to-transparent lg:hidden z-10"></div>
            <div className="absolute inset-0 bg-[#05294E]/20 lg:hidden z-10"></div>
            
            {/* 2. Desktop fade (left to right) */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#05294E] via-[#05294E]/20 to-transparent hidden lg:block z-10"></div>
            
            {/* 3. Extra deep blend for desktop to hide the edge perfectly */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#05294E] to-transparent hidden lg:block z-20"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;