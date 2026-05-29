import React, { useEffect, useState } from 'react';
import { 
  ChevronDown,
  ArrowRight,
  Compass,
  Users
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
      <HeroSection t={t} />
      
      <JourneySection 
        t={t} 
        baseSelectionFee={baseSelectionFee}
        selectionProcessFee={selectionProcessFee}
        hasSellerPackage={hasSellerPackage}
        packageName={packageName || ''}
        isLoadingFee={baseSelectionFee === undefined}
      />

      <SelectionFeeShowcase 
        t={t}
        onCTAClick={handleCTAClick}
      />
      
      <WhyUsSection t={t} />
      
      <FAQSection 
        t={t}
        selectionProcessFee={selectionProcessFee}
        scholarshipFee={scholarshipFee}
        i20ControlFee={i20ControlFee}
      />

      <SmartChat />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               HERO SECTION                                 */
/* -------------------------------------------------------------------------- */
const HeroSection: React.FC<{ t: any }> = ({ t }) => {
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  return (
    <section ref={ref} className="relative pt-20 pb-20 lg:pt-0 lg:pb-0 overflow-hidden bg-[#05294E] min-h-[450px] lg:h-[600px] flex items-center home-page">
      {/* Background Image Layer with Responsive Design */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 lg:right-auto lg:left-0 lg:w-[65%]">
          <img 
            src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/library-facade-white-columns-students.webp" 
            alt="Elite University Campus" 
            className="w-full h-full object-cover object-[55.6%_center] lg:object-center"
          />
          {/* Overlay for Mobile: Simple dark overlay for text readability */}
          <div className="absolute inset-0 bg-[#05294E]/85 lg:hidden"></div>
          
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
        <div className="max-w-xl lg:max-w-[630px] lg:ml-auto">
          <motion.div
             initial="hidden"
             animate={controls}
             variants={{
               hidden: { opacity: 0, x: 50 },
               visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
             }}
             className="text-center lg:text-right"
          >


            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
              {t('howItWorks.title')}
            </h1>
            
            <p className="text-lg lg:text-xl text-white mb-6 max-w-2xl mx-auto lg:ml-auto lg:mr-0 leading-relaxed font-medium drop-shadow-lg">
              {t('howItWorks.subtitle')}
            </p>

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
    startNow: t('howItWorks.selectionFeeShowcase.startProcess'),
  };

  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-24 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
           initial="hidden"
           animate={controls}
           variants={{
             hidden: { opacity: 0, y: 30 },
             visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
           }}
           className="text-center mb-16 home-page"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-6 max-w-3xl mx-auto">
            {texts.title}
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            {texts.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2 } }
          }}
          className="max-w-6xl mx-auto bg-white p-4 sm:p-8"
        >
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse min-w-0 md:min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-8 px-6 text-sm font-bold uppercase tracking-widest text-slate-400 w-1/4 hidden md:table-cell">{t('howItWorks.showcaseTable.differential')}</th>
                  <th className="py-8 px-6 text-center text-sm font-bold uppercase tracking-widest text-slate-400/80 w-1/2 md:w-auto">{t('howItWorks.showcaseTable.doItAlone')}</th>
                  <th className="py-8 px-6 text-center text-sm font-bold uppercase tracking-widest text-slate-400/80 hidden md:table-cell">{t('howItWorks.showcaseTable.traditionalAgencies')}</th>
                  <th className="py-8 px-6 text-center bg-blue-50 border-x border-t border-blue-100 w-1/2 md:w-auto">
                    <img
                      src="/logo.png.png"
                      alt="Matrícula USA"
                      className="h-10 w-auto mx-auto"
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Row 1 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">{t('howItWorks.showcaseTable.accessScholarships')}</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.difficultOpportunities')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.fewOptions')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">{t('howItWorks.showcaseTable.exclusiveScholarships')}</span>
                    </div>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">{t('howItWorks.showcaseTable.supportMentorship')}</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.decideAlone')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.genericService')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">{t('howItWorks.showcaseTable.strategicOrientation')}</span>
                    </div>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">{t('howItWorks.showcaseTable.costTransparency')}</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.hiddenExpenses')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.extraFees')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">{t('howItWorks.showcaseTable.transparencyAllSteps')}</span>
                    </div>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">{t('howItWorks.showcaseTable.processOrganization')}</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.manualConfusing')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.slowProcess')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">{t('howItWorks.showcaseTable.simplePlatform')}</span>
                    </div>
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">{t('howItWorks.showcaseTable.approvalSecurity')}</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.noGuarantee')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('howItWorks.showcaseTable.guaranteeUnclear')}</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-b border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">{t('howItWorks.showcaseTable.refundSelection')}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-center mt-12">
            <button 
              onClick={onCTAClick}
              className="px-10 py-5 bg-[#D0151C] hover:bg-[#E01B22] text-white rounded-2xl font-black text-xl shadow-[0_20px_40px_rgba(208,21,28,0.25)] hover:shadow-[0_25px_50px_rgba(208,21,28,0.35)] transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-1"
            >
              {texts.startNow}
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
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
    <section ref={ref} className="relative py-16 md:py-24 overflow-hidden bg-white">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto relative mt-4">
          {/* Vertical central timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 hidden w-0.5 bg-slate-200 -translate-x-1/2 lg:block"></div>
          
          <div className="space-y-32 lg:space-y-24">
            
            {/* STEP 1: Análise de Perfil */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center group">
              {/* Visual mockup (left side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#05294E]/5 rounded-full blur-[80px] opacity-40"></div>
                    <div className="relative w-full max-w-[320px] bg-white rounded-3xl border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-6 space-y-4 text-left">
                      {/* Header containing counter */}
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{t('howItWorks.mockups.mySelection')}</h4>
                          <p className="text-[9px] text-muted-foreground font-bold">{t('howItWorks.mockups.preSelectedCourses')}</p>
                        </div>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                          {t('howItWorks.mockups.selectedCount')}
                        </span>
                      </div>

                      {/* Selected Scholarships List */}
                      <div className="space-y-3">
                        {/* Course 1 */}
                        <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:scale-[1.02] hover:bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[10px] font-black text-slate-900 leading-tight">Faculty and Staff Scholarship</h5>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">{t('howItWorks.mockups.undergraduate')}</p>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-2 border border-slate-100 flex items-center justify-between text-[8px] font-bold">
                            <div className="space-x-1.5">
                              <span className="text-slate-400 line-through">$6,000</span>
                              <span className="text-green-600">$4,000 / {t('howItWorks.mockups.year')}</span>
                            </div>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[7px] font-extrabold">33% OFF</span>
                          </div>
                        </div>

                        {/* Course 2 */}
                        <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:scale-[1.02] hover:bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[10px] font-black text-slate-900 leading-tight">Academic Excellence Scholarship</h5>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">{t('howItWorks.mockups.undergraduate')}</p>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-2 border border-slate-100 flex items-center justify-between text-[8px] font-bold">
                            <div className="space-x-1.5">
                              <span className="text-slate-400 line-through">$8,000</span>
                              <span className="text-green-600">$4,200 / {t('howItWorks.mockups.year')}</span>
                            </div>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[7px] font-extrabold">47% OFF</span>
                          </div>
                        </div>

                        {/* Course 3 */}
                        <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:scale-[1.02] hover:bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[10px] font-black text-slate-900 leading-tight">Special Scholarship</h5>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">{t('howItWorks.mockups.undergraduate')}</p>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-2 border border-slate-100 flex items-center justify-between text-[8px] font-bold">
                            <div className="space-x-1.5">
                              <span className="text-slate-400 line-through">$15,000</span>
                              <span className="text-green-600">$4,200 / {t('howItWorks.mockups.year')}</span>
                            </div>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[7px] font-extrabold">72% OFF</span>
                          </div>
                        </div>

                        {/* Course 4 */}
                        <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:scale-[1.02] hover:bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[10px] font-black text-slate-900 leading-tight">STEM Scholarship</h5>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">{t('howItWorks.mockups.graduate')}</p>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-2 border border-slate-100 flex items-center justify-between text-[8px] font-bold">
                            <div className="space-x-1.5">
                              <span className="text-slate-400 line-through">$15,000</span>
                              <span className="text-green-600">$4,200 / {t('howItWorks.mockups.year')}</span>
                            </div>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[7px] font-extrabold">72% OFF</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
              
              {/* Central Number Circle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex h-14 w-14 items-center justify-center rounded-full bg-white border-4 border-[#05294E] shadow-2xl z-30 group-hover:scale-110 transition-transform">
                <span className="text-base font-bold text-[#05294E]">1</span>
              </div>
              
              {/* Text Side (right side) */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 lg:px-16 text-center lg:text-left mt-8 lg:mt-0">
                <div className="mb-6 flex flex-col lg:flex-row items-center gap-2 lg:gap-4 justify-center lg:justify-start">
                  <h3 className="text-3xl font-bold text-foreground tracking-tight leading-none text-center lg:text-left">
                    {t('howItWorks.steps.profile.title')}
                  </h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-0">
                  {t('howItWorks.steps.profile.description')}
                </p>
              </div>
            </div>

            {/* STEP 2: Processo Seletivo (Reversed) */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center lg:flex-row-reverse group">
              {/* Visual mockup (right side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#05294E]/10 rounded-full blur-[100px] opacity-30"></div>
                    <div className="relative w-full max-w-[280px] bg-white rounded-3xl border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden text-left flex flex-col">
                      {/* Scholarship Card Header Image */}
                      <div className="relative w-full aspect-[8/3.5] bg-slate-900 overflow-hidden border-b border-slate-100 shrink-0">
                        <img
                          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop"
                          alt="St. Francis College Campus"
                          className="w-full h-full object-cover opacity-80"
                        />
                        {/* Top Right Badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                          <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[8px] font-bold shadow-sm uppercase tracking-wider flex items-center gap-1">
                            ★ {t('howItWorks.mockups.exclusive')}
                          </span>
                        </div>
                        {/* Course overlay label */}
                        <div className="absolute inset-y-0 left-0 w-[80%] bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-3">
                          <p className="text-[10px] font-black text-slate-900 leading-tight">
                            STEM SCHOLARSHIP
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col">
                        {/* Title & Uni */}
                        <div>
                          <h4 className="text-xs font-black text-slate-900 leading-tight">STEM Scholarship</h4>
                        </div>

                        {/* Financial Box */}
                        <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm space-y-1.5">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400 font-medium">{t('howItWorks.mockups.originalTuition', 'Anuidade Original')}</span>
                            <span className="text-slate-400 font-bold line-through">$15,000</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-[#05294E] font-bold">{t('howItWorks.mockups.withScholarship')}</span>
                            <span className="text-green-600 font-black text-xs">$3,800 / {t('howItWorks.mockups.year')}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[9px]">
                            <span className="text-slate-400 font-medium">{t('howItWorks.mockups.guaranteedDiscount')}</span>
                            <span className="text-green-600 font-extrabold bg-green-50 px-1.5 py-0.5 rounded text-[8px]">75% OFF</span>
                          </div>
                        </div>

                        {/* Select Button in Selected state */}
                        <div className="mt-auto">
                          <button
                            disabled
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-green-500/10 cursor-default"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <circle cx="12" cy="12" r="10" />
                              <path d="m9 12 2 2 4-4" />
                            </svg>
                            <span>{t('howItWorks.mockups.approved')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Central Number Circle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex h-14 w-14 items-center justify-center rounded-full bg-white border-4 border-[#05294E] shadow-2xl z-30 group-hover:scale-110 transition-transform">
                <span className="text-base font-bold text-[#05294E]">2</span>
              </div>
              
              {/* Text Side (left side on desktop) */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 lg:px-16 text-center lg:text-left mt-8 lg:mt-0">
                <div className="mb-6 flex flex-col lg:flex-row items-center gap-2 lg:gap-4 justify-center lg:justify-start lg:flex-row-reverse lg:text-right">
                  <h3 className="text-3xl font-bold text-foreground tracking-tight leading-none text-center lg:text-left">
                    {isLoadingFee ? (
                      <span className="inline-block h-8 w-40 bg-slate-200 rounded-lg animate-pulse"></span>
                    ) : (
                      <>
                        {t('howItWorks.steps.selectionFee.title', { selectionProcessFee: baseSelectionFee || selectionProcessFee }).replace(/\(\$[\d.]+\)/g, '').replace(/\$[\d.]+/g, '').trim()}
                      </>
                    )}
                    {hasSellerPackage && (
                      <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full uppercase tracking-[0.2em] font-black">
                        {packageName}
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-0 lg:text-right">
                  {t('howItWorks.steps.selectionFee.description')}
                </p>
              </div>
            </div>

            {/* STEP 3: Escolha Bolsas e Envie Documentos */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center group">
              {/* Visual mockup (left side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#05294E]/10 rounded-full blur-[100px] opacity-30"></div>
                    <div className="relative w-full max-w-[320px] bg-white rounded-3xl border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-5 space-y-4 text-left">
                      {/* Header do Mockup */}
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{t('howItWorks.mockups.onboarding')}</h4>
                          <p className="text-[9px] text-slate-400 font-bold">{t('howItWorks.mockups.universityDocuments')}</p>
                        </div>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {t('howItWorks.mockups.sentCount')}
                        </span>
                      </div>

                      {/* Lista de Documentos no Onboarding */}
                      <div className="space-y-2.5">
                        
                        {/* 1. Passaporte - Aprovado */}
                        <div className="p-3 rounded-2xl bg-emerald-50/20 border border-emerald-100 flex items-center justify-between transition-all hover:scale-[1.02]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                              </svg>
                            </div>
                            <div>
                              <h5 className="text-[10px] font-black text-slate-800 leading-tight">{t('howItWorks.mockups.officialPassport')}</h5>
                              <p className="text-[8px] text-emerald-600 font-black tracking-wider uppercase mt-0.5">{t('howItWorks.mockups.approvedCheck')}</p>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        </div>

                        {/* 2. Histórico Escolar - Em Análise */}
                        <div className="p-3 rounded-2xl bg-amber-50/30 border border-amber-100 flex items-center justify-between transition-all hover:scale-[1.02]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                              </svg>
                            </div>
                            <div>
                              <h5 className="text-[10px] font-black text-slate-800 leading-tight">{t('howItWorks.mockups.academicTranscripts')}</h5>
                              <p className="text-[8px] text-amber-600 font-black tracking-wider uppercase mt-0.5">{t('howItWorks.mockups.underReview')}</p>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/25 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          </div>
                        </div>

                        {/* 3. Comprovante Financeiro - Fazendo Upload (Ativo) */}
                        <div className="p-3 rounded-2xl bg-blue-50/20 border border-blue-100/80 space-y-2 transition-all hover:scale-[1.02]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                              </div>
                              <div>
                                <h5 className="text-[10px] font-black text-slate-800 leading-tight">{t('howItWorks.mockups.financialStatement')}</h5>
                                <p className="text-[8px] text-blue-600 font-black tracking-wider uppercase mt-0.5">{t('howItWorks.mockups.uploading')} 65%</p>
                              </div>
                            </div>
                          </div>
                          {/* Barra de Progresso de Upload */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '65%' }}></div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Central Number Circle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex h-14 w-14 items-center justify-center rounded-full bg-white border-4 border-[#05294E] shadow-2xl z-30 group-hover:scale-110 transition-transform">
                <span className="text-base font-bold text-[#05294E]">3</span>
              </div>
              
              {/* Text Side (right side) */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 lg:px-16 text-center lg:text-left mt-8 lg:mt-0">
                <div className="mb-6 flex flex-col lg:flex-row items-center gap-2 lg:gap-4 justify-center lg:justify-start">
                  <h3 className="text-3xl font-bold text-foreground tracking-tight leading-none text-center lg:text-left">
                    {t('howItWorks.steps.documents.title')}
                  </h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-0">
                  {t('howItWorks.steps.documents.description')}
                </p>
              </div>
            </div>

            {/* STEP 4: Taxa de Matrícula (Reversed) */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center lg:flex-row-reverse group">
              {/* Visual mockup (right side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-[100px] opacity-40"></div>
                    <div className="relative w-full max-w-[280px] bg-white rounded-2xl border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden text-left">

                      {/* Green top bar */}
                      <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 flex items-center justify-between">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{t('howItWorks.mockups.officeAdmissions')}</span>
                        <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                          </svg>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="px-5 py-4 space-y-4">

                        {/* Big check icon */}
                        <div className="flex flex-col items-center gap-1.5 pt-1">
                          <div className="h-14 w-14 rounded-full bg-emerald-50 border-4 border-emerald-400 flex items-center justify-center shadow-md shadow-emerald-200 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-emerald-500">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full uppercase tracking-widest">✓ {t('howItWorks.mockups.approved')}</span>
                        </div>

                        {/* Title */}
                        <div className="text-center space-y-0.5">
                          <h4 className="text-sm font-black text-slate-900">{t('howItWorks.mockups.congratulations')}</h4>
                          <p className="text-[9px] text-slate-500 font-medium leading-snug">{t('howItWorks.mockups.admittedMessage')}</p>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-slate-100 w-full"></div>

                        {/* Status pills */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-slate-400 font-semibold">{t('howItWorks.mockups.status')}</span>
                            <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{t('howItWorks.mockups.admittedVisa')}</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-slate-400 font-semibold">{t('howItWorks.mockups.scholarshipLabel')}</span>
                            <span className="text-emerald-600 font-extrabold">$3,800 / {t('howItWorks.mockups.year')}</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-slate-400 font-semibold">{t('howItWorks.mockups.startDate')}</span>
                            <span className="text-slate-700 font-bold">{t('howItWorks.mockups.fall2026')}</span>
                          </div>
                        </div>

                        {/* Footer stamp */}
                        <div className="flex items-center justify-center pt-1">
                          <div className="border-2 border-emerald-400 rounded-lg px-3 py-1 opacity-70 flex items-center justify-center">
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{t('howItWorks.mockups.approved')}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Central Number Circle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex h-14 w-14 items-center justify-center rounded-full bg-white border-4 border-[#05294E] shadow-2xl z-30 group-hover:scale-110 transition-transform">
                <span className="text-base font-bold text-[#05294E]">4</span>
              </div>
              
              {/* Text Side (left side on desktop) */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 lg:px-16 text-center lg:text-left mt-8 lg:mt-0">
                <div className="mb-6 flex flex-col lg:flex-row items-center gap-2 lg:gap-4 justify-center lg:justify-start lg:flex-row-reverse lg:text-right">
                  <h3 className="text-3xl font-bold text-foreground tracking-tight leading-none text-center lg:text-left">
                    {t('howItWorks.steps.applicationFee.title')}
                  </h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-0 lg:text-right">
                  {t('howItWorks.steps.applicationFee.description')}
                </p>
              </div>
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
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Featured Image with Premium Frame */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={controls}
            variants={{ visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.2 } } }}
            className="w-full lg:w-[45%]"
          >
            <div className="rounded-3xl overflow-hidden shadow-lg bg-slate-100 h-[500px] lg:h-[600px]">
              <img 
                src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=1200&auto=format&fit=crop"
                alt="MatriculaUSA Mentorship"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Lado Direito: Titulo e Descrição Integrados */}
          <div className="w-full lg:w-[55%]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={controls}
              variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}
              className="text-left home-page"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.95]">
                {t('howItWorks.whyUs.mainTitle')}
              </h2>
              
              <p className="text-slate-600 text-lg md:text-xl lg:text-2xl leading-relaxed font-medium">
                {t('howItWorks.whyUs.documentManagement.description')}
              </p>

              {/* Cards de Benefícios Pequenos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
                {/* Benefício 1: Clareza para escolher melhor */}
                <div className="bg-slate-50/40 backdrop-blur-sm border border-slate-100 p-6 rounded-3xl hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">
                    {t('howItWorks.whyUs.benefits.clarity.title')}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {t('howItWorks.whyUs.benefits.clarity.description')}
                  </p>
                </div>

                {/* Benefício 2: Acompanhamento humano */}
                <div className="bg-slate-50/40 backdrop-blur-sm border border-slate-100 p-6 rounded-3xl hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D0151C] flex items-center justify-center mb-4 shadow-sm">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">
                    {t('howItWorks.whyUs.benefits.support.title')}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {t('howItWorks.whyUs.benefits.support.description')}
                  </p>
                </div>
              </div>
            </motion.div>
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
    <section ref={ref} className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={controls}
           variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-8 text-center text-slate-900 home-page">{t('howItWorks.faq.title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 items-start">
            {/* Coluna Esquerda */}
            <div className="space-y-1">
              {[1, 3, 5, 7, 9, 11].map((num) => (
                <div 
                  key={num} 
                  className={`group transition-all duration-300 border-b border-slate-200 ${
                    openFaq === num 
                      ? 'bg-gradient-to-br from-white to-slate-50/30' 
                      : ''
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === num ? null : num)}
                    className="w-full text-left p-4 sm:p-5 flex items-center gap-4 group focus:outline-none"
                  >
                    <div className="flex-1">
                      <h3 className="text-sm sm:text-base font-bold leading-tight text-slate-900 transition-colors duration-500">
                        {t(`howItWorks.faq.q${num}.question`, { selectionProcessFee, scholarshipFee, i20ControlFee })}
                      </h3>
                    </div>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500 ${
                      openFaq === num ? 'bg-slate-100 text-slate-600 rotate-180' : 'bg-slate-50 text-slate-300 group-hover:text-slate-400'
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
                        <div className="px-4 sm:px-5 pb-5 pt-0">
                          <div 
                            className="text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 pt-3 pr-2 sm:pr-4 space-y-3"
                            dangerouslySetInnerHTML={{ __html: t(`howItWorks.faq.q${num}.answer`, { selectionProcessFee, scholarshipFee, i20ControlFee }) }} 
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Coluna Direita */}
            <div className="space-y-1 mt-1 md:mt-0">
              {[2, 4, 6, 8, 10, 12].map((num) => (
                <div 
                  key={num} 
                  className={`group transition-all duration-300 border-b border-slate-200 ${
                    openFaq === num 
                      ? 'bg-gradient-to-br from-white to-slate-50/30' 
                      : ''
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === num ? null : num)}
                    className="w-full text-left p-4 sm:p-5 flex items-center gap-4 group focus:outline-none"
                  >
                    <div className="flex-1">
                      <h3 className="text-sm sm:text-base font-bold leading-tight text-slate-900 transition-colors duration-500">
                        {t(`howItWorks.faq.q${num}.question`, { selectionProcessFee, scholarshipFee, i20ControlFee })}
                      </h3>
                    </div>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500 ${
                      openFaq === num ? 'bg-slate-100 text-slate-600 rotate-180' : 'bg-slate-50 text-slate-300 group-hover:text-slate-400'
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
                        <div className="px-4 sm:px-5 pb-5 pt-0">
                          <div 
                            className="text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 pt-3 pr-2 sm:pr-4 space-y-3"
                            dangerouslySetInnerHTML={{ __html: t(`howItWorks.faq.q${num}.answer`, { selectionProcessFee, scholarshipFee, i20ControlFee }) }} 
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};



export default HowItWorks;
