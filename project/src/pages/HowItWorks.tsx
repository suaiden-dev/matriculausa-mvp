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
      
      <BottomCTASection onCTAClick={handleCTAClick} t={t} />
      
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
        <div className="absolute bottom-1/4 -left-24 w-[500px] h-[500px] bg-[#D0151C]/5 rounded-full blur-[120px]"></div>
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
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-6">
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
          className="max-w-6xl mx-auto bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100/80 p-4 sm:p-8"
        >
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-8 px-6 text-sm font-bold uppercase tracking-widest text-slate-400 w-1/4">Diferencial</th>
                  <th className="py-8 px-6 text-center text-sm font-bold uppercase tracking-widest text-slate-400/80">Fazer Sozinho (DIY)</th>
                  <th className="py-8 px-6 text-center text-sm font-bold uppercase tracking-widest text-slate-400/80">Agências Tradicionais</th>
                  <th className="py-8 px-6 text-center text-sm font-bold uppercase tracking-widest text-[#05294E] bg-[#05294E]/[0.03] rounded-t-[2rem] border-x border-t border-[#05294E]/10">Matrícula USA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Row 1 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6">
                    <p className="text-base font-bold text-slate-800">Acesso a Bolsas de Estudos</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dificuldade extrema em achar e negociar</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Foco em custo integral ou pouca bolsa</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-[#05294E]/[0.03] border-x border-[#05294E]/10">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Bolsas exclusivas de até 50% de desconto</span>
                    </div>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6">
                    <p className="text-base font-bold text-slate-800">Suporte & Mentoria</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sem ajuda. Risco alto de erros nos docs</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Processos burocráticos lentos e manuais</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-[#05294E]/[0.03] border-x border-[#05294E]/10">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Orientação estratégica e IA dedicada 24h</span>
                    </div>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6">
                    <p className="text-base font-bold text-slate-800">Transparência de Custos</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Múltiplas taxas extras por faculdade</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Taxas ocultas e comissões extras</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-[#05294E]/[0.03] border-x border-[#05294E]/10">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Valor único transparente e sem surpresas</span>
                    </div>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6">
                    <p className="text-base font-bold text-slate-800">Preparação de Visto & I-20</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lidar com o consulado sem preparo</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Suporte básico cobrado separadamente</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-[#05294E]/[0.03] border-x border-[#05294E]/10">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Simulações de entrevista de visto inclusas</span>
                    </div>
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6">
                    <p className="text-base font-bold text-slate-800">Garantia de Aprovação</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Risco total de perder tempo e dinheiro</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nenhuma garantia em caso de rejeição</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-[#05294E]/[0.03] border-x border-[#05294E]/10">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Aprovação garantida ou reembolso total</span>
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
        <div className="text-center mb-16 home-page">
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
            {t('howItWorks.journey')}
          </h2>
          <div className="w-24 h-1 bg-[#D0151C] mx-auto rounded-full"></div>
        </div>

        <div className="max-w-5xl mx-auto relative mt-16">
          {/* Vertical central timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 hidden w-0.5 bg-slate-200 -translate-x-1/2 lg:block"></div>
          
          <div className="space-y-32 lg:space-y-24">
            
            {/* STEP 1: Análise de Perfil */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center group">
              {/* Visual mockup (left side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="absolute inset-0 bg-[#05294E]/5 rounded-full blur-3xl"></div>
                    <div className="grid grid-cols-3 gap-4 relative z-10 w-full">
                      {/* Harvard */}
                      <div className="h-24 rounded-2xl bg-white border border-border/40 shadow-sm flex flex-col p-4 transition-all duration-700 hover:border-[#05294E]/30 hover:shadow-xl hover:-translate-y-1 ">
                        <div className="flex justify-between items-start mb-auto">
                          <div className="h-5 w-5 rounded-lg bg-slate-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-[#05294E]">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                            </svg>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
                        </div>
                        <p className="text-[10px] font-bold text-foreground tracking-tight line-clamp-1">Harvard</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                          <span className="text-[7px] font-bold text-muted-foreground uppercase">Compatível</span>
                        </div>
                      </div>

                      {/* Columbia */}
                      <div className="h-24 rounded-2xl bg-white border border-border/40 shadow-sm flex flex-col p-4 transition-all duration-700 hover:border-[#05294E]/30 hover:shadow-xl hover:-translate-y-1 mt-8">
                        <div className="flex justify-between items-start mb-auto">
                          <div className="h-5 w-5 rounded-lg bg-slate-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-slate-300">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                            </svg>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-slate-200"></div>
                        </div>
                        <p className="text-[10px] font-bold text-foreground tracking-tight line-clamp-1">Columbia</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 w-1 rounded-full bg-slate-200"></div>
                          <span className="text-[7px] font-bold text-muted-foreground uppercase">Compatível</span>
                        </div>
                      </div>

                      {/* MIT */}
                      <div className="h-24 rounded-2xl bg-white border border-border/40 shadow-sm flex flex-col p-4 transition-all duration-700 hover:border-[#05294E]/30 hover:shadow-xl hover:-translate-y-1 ">
                        <div className="flex justify-between items-start mb-auto">
                          <div className="h-5 w-5 rounded-lg bg-slate-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-[#05294E]">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                            </svg>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
                        </div>
                        <p className="text-[10px] font-bold text-foreground tracking-tight line-clamp-1">MIT</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                          <span className="text-[7px] font-bold text-muted-foreground uppercase">Compatível</span>
                        </div>
                      </div>

                      {/* Stanford */}
                      <div className="h-24 rounded-2xl bg-white border border-border/40 shadow-sm flex flex-col p-4 transition-all duration-700 hover:border-[#05294E]/30 hover:shadow-xl hover:-translate-y-1 mt-8">
                        <div className="flex justify-between items-start mb-auto">
                          <div className="h-5 w-5 rounded-lg bg-slate-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-[#05294E]">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                            </svg>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
                        </div>
                        <p className="text-[10px] font-bold text-foreground tracking-tight line-clamp-1">Stanford</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                          <span className="text-[7px] font-bold text-muted-foreground uppercase">Compatível</span>
                        </div>
                      </div>

                      {/* NYU */}
                      <div className="h-24 rounded-2xl bg-white border border-border/40 shadow-sm flex flex-col p-4 transition-all duration-700 hover:border-[#05294E]/30 hover:shadow-xl hover:-translate-y-1 ">
                        <div className="flex justify-between items-start mb-auto">
                          <div className="h-5 w-5 rounded-lg bg-slate-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-slate-300">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                            </svg>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-slate-200"></div>
                        </div>
                        <p className="text-[10px] font-bold text-foreground tracking-tight line-clamp-1">NYU</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 w-1 rounded-full bg-slate-200"></div>
                          <span className="text-[7px] font-bold text-muted-foreground uppercase">Compatível</span>
                        </div>
                      </div>

                      {/* UCLA */}
                      <div className="h-24 rounded-2xl bg-white border border-border/40 shadow-sm flex flex-col p-4 transition-all duration-700 hover:border-[#05294E]/30 hover:shadow-xl hover:-translate-y-1 mt-8">
                        <div className="flex justify-between items-start mb-auto">
                          <div className="h-5 w-5 rounded-lg bg-slate-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-[#05294E]">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                            </svg>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
                        </div>
                        <p className="text-[10px] font-bold text-foreground tracking-tight line-clamp-1">UCLA</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                          <span className="text-[7px] font-bold text-muted-foreground uppercase">Compatível</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#05294E]/20 to-transparent -rotate-12 animate-pulse z-20"></div>
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
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-6">
                  {t('howItWorks.steps.profile.description')}
                </p>
                <ul className="space-y-3 flex flex-col items-center lg:items-start">
                  {(t('howItWorks.steps.profile.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-500 font-medium text-center lg:text-left">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#05294E] mt-2 shrink-0" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* STEP 2: Processo Seletivo (Reversed) */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center lg:flex-row-reverse group">
              {/* Visual mockup (right side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-accent/5 rounded-full blur-[100px] opacity-50"></div>
                    <div className="relative w-full max-w-[360px] bg-white rounded-[2.5rem] border border-border/40 shadow-[0_32px_64px_rgba(0,0,0,0.06)] overflow-hidden">
                      <div className="bg-slate-50/50 border-b border-border/30 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bolsas Disponíveis</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-filter h-3.5 w-3.5 text-muted-foreground/40">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                        </svg>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Discarded 1 */}
                        <div className="group relative bg-slate-50/50 border border-slate-100 rounded-2xl p-4 opacity-40 transition-all">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] font-bold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase">Incompatível</span>
                            <span className="text-[9px] font-bold text-slate-400">Anuidade Cheia</span>
                          </div>
                          <p className="mt-2 text-[11px] font-bold text-slate-500">Boston University • 10% Bolsa</p>
                          <div className="mt-1 flex items-center gap-1.5 opacity-60">
                            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                            <span className="text-[8px] font-medium text-slate-400">Custo fora do orçamento</span>
                          </div>
                        </div>
                        {/* Selected */}
                        <div className="relative bg-white border-2 border-accent rounded-2xl p-5 shadow-[0_15px_30px_rgba(var(--accent-rgb),0.1)] scale-[1.05] z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-sparkles h-3.5 w-3.5">
                                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                                  <path d="M20 3v4"></path>
                                  <path d="M22 5h-4"></path>
                                  <path d="M4 17v2"></path>
                                  <path d="M5 18H3"></path>
                                </svg>
                              </div>
                              <span className="text-[8px] font-bold text-accent uppercase tracking-widest">Melhor Correspondência</span>
                            </div>
                            <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center text-accent-foreground shadow-lg shadow-accent/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-circle-check h-3 w-3">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="m9 12 2 2 4-4"></path>
                              </svg>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Florida Tech • 60% Bolsa</p>
                                <p className="text-xl font-bold text-[#D0151C]">Anuidade Reduzida</p>
                              </div>
                              <div className="text-right">
                                <span className="inline-block px-2 py-1 bg-[#D0151C] text-white text-[8px] font-bold rounded-lg uppercase tracking-tighter">100% Compatível</span>
                              </div>
                            </div>
                            <div className="h-px bg-slate-50 w-full"></div>
                            <div className="flex items-center gap-3 text-[8px] font-bold text-red-700/60 italic">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-plane h-3 w-3">
                                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
                              </svg>
                              <span>Bolsa Garantida • Campus Completo • 10/10 Suporte</span>
                            </div>
                          </div>
                        </div>
                        {/* Discarded 3 */}
                        <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-4 opacity-20">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-tighter">Incompatível</span>
                            <span className="text-[9px] font-bold text-slate-300">Sem Bolsa</span>
                          </div>
                          <p className="mt-2 text-[11px] font-bold text-slate-300">NYU • Sem Bolsa</p>
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
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-6 lg:text-right">
                  {t('howItWorks.steps.selectionFee.description')}
                </p>
                <ul className="space-y-3 flex flex-col items-center lg:items-end">
                  {(t('howItWorks.steps.selectionFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 lg:flex-row-reverse text-slate-500 font-medium text-center lg:text-right">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#05294E] mt-2 shrink-0" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* STEP 3: Escolha Bolsas e Envie Documentos */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center group">
              {/* Visual mockup (left side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#05294E]/10 rounded-full blur-[100px] opacity-30"></div>
                    <div className="relative w-full max-w-[320px] space-y-3">
                      {/* Notification 1 */}
                      <div className="relative w-full bg-white/70 backdrop-blur-2xl rounded-[22px] p-4 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-700 hover:scale-[1.02] hover:bg-white/90 cursor-default z-30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-[5px] bg-[#05294E] flex items-center justify-center shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-white">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                              </svg>
                            </div>
                            <span className="text-[10px] font-bold text-black/50 uppercase tracking-tight">MATRÍCULA USA VIP</span>
                          </div>
                          <span className="text-[10px] text-black/40 font-medium">agora</span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-bold text-black tracking-tight">Histórico Traduzido</p>
                          <p className="text-[12px] text-black/60 leading-tight line-clamp-1">Documento traduzido e validado com sucesso.</p>
                        </div>
                        <div className="absolute top-4 right-4 h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                      </div>
                      
                      {/* Notification 2 */}
                      <div className="relative w-full bg-white/70 backdrop-blur-2xl rounded-[22px] p-4 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-700 hover:scale-[1.02] hover:bg-white/90 cursor-default opacity-60 scale-[0.96] -mt-10 z-20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-[5px] bg-[#05294E] flex items-center justify-center shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-white">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                              </svg>
                            </div>
                            <span className="text-[10px] font-bold text-black/50 uppercase tracking-tight">MATRÍCULA USA VIP</span>
                          </div>
                          <span className="text-[10px] text-black/40 font-medium">3m atrás</span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-bold text-black tracking-tight">Recomendação Carregada</p>
                          <p className="text-[12px] text-black/60 leading-tight line-clamp-1">Suas cartas de recomendação foram vinculadas.</p>
                        </div>
                      </div>

                      {/* Notification 3 */}
                      <div className="relative w-full bg-white/70 backdrop-blur-2xl rounded-[22px] p-4 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-700 hover:scale-[1.02] hover:bg-white/90 cursor-default opacity-30 scale-[0.92] -mt-10 z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-[5px] bg-[#05294E] flex items-center justify-center shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3 text-white">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                              </svg>
                            </div>
                            <span className="text-[10px] font-bold text-black/50 uppercase tracking-tight">MATRÍCULA USA VIP</span>
                          </div>
                          <span className="text-[10px] text-black/40 font-medium">10m atrás</span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-bold text-black tracking-tight">Perfil Aprovado</p>
                          <p className="text-[12px] text-black/60 leading-tight line-clamp-1">Seu perfil foi aceito pelas universidades selecionadas.</p>
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
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-6">
                  {t('howItWorks.steps.documents.description')}
                </p>
                <ul className="space-y-3 flex flex-col items-center lg:items-start">
                  {(t('howItWorks.steps.documents.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-500 font-medium text-center lg:text-left">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#05294E] mt-2 shrink-0" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* STEP 4: Taxa de Matrícula (Reversed) */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center lg:flex-row-reverse group">
              {/* Visual mockup (right side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center scale-90">
                    <div className="absolute inset-0 bg-[#05294E]/5 rounded-full blur-[80px] opacity-40"></div>
                    <div className="relative w-full max-w-[240px] flex flex-col drop-shadow-[0_15px_30px_rgba(0,0,0,0.1)]">
                      <div className="bg-slate-900 text-white rounded-t-[1.5rem] p-4 text-[10px]">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-1.5 line-clamp-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-plane h-3 w-3 text-accent">
                              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
                            </svg>
                            <span className="font-bold uppercase tracking-widest text-white/70">STUDENT VISA</span>
                          </div>
                          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="space-y-0.5">
                            <p className="text-[7px] font-bold text-white/40 uppercase">Estudante</p>
                            <p className="font-bold">ALUNO VIP</p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <p className="text-[7px] font-bold text-white/40 uppercase">Status</p>
                            <p className="font-bold text-accent">APROVADO</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white border-x border-border/10 p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="text-left">
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">SAO</p>
                            <p className="text-xl font-bold text-slate-900 leading-none">GRU</p>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-plane h-3 w-3 text-[#05294E]/30 rotate-90">
                            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
                          </svg>
                          <div className="text-right">
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">USA</p>
                            <p className="text-xl font-bold text-slate-900 leading-none">MIA</p>
                          </div>
                        </div>
                        <div className="bg-[#05294E]/[0.03] rounded-xl p-3 border border-[#05294E]/5 flex justify-between items-center">
                          <div className="space-y-0.5">
                            <p className="text-[7px] font-bold text-[#05294E]/60 uppercase">Bolsa de Estudos</p>
                            <p className="text-sm font-bold text-[#05294E]">60% Aprovada</p>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-circle-check h-4 w-4 text-accent">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="m9 12 2 2 4-4"></path>
                          </svg>
                        </div>
                      </div>
                      <div className="relative py-1.5 bg-white border-x border-border/10 flex items-center justify-between">
                        <div className="h-4 w-2 bg-slate-50 border-r border-border/10 rounded-r-full -ml-[1px]"></div>
                        <div className="border-t border-dashed border-slate-200 flex-1 mx-2"></div>
                        <div className="h-4 w-2 bg-slate-50 border-l border-border/10 rounded-l-full -mr-[1px]"></div>
                      </div>
                      <div className="bg-white rounded-b-[1.5rem] p-4 pt-1 border-x border-b border-border/10 flex flex-col items-center">
                        <div className="flex justify-between w-full mb-4 text-[7px] font-bold">
                          <p className="text-[#05294E] uppercase">I-20 Emitido</p>
                          <p className="text-slate-400 uppercase">Confirmado</p>
                        </div>
                        <div className="w-full h-8 flex justify-center gap-[1px] opacity-40">
                          <div className="bg-slate-900 h-full" style={{ width: '1.17px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.39px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.00px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.87px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.12px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.85px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.64px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.10px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.04px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '3.33px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.88px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.02px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.35px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '0.76px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.31px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.72px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.72px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.32px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.00px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.81px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '0.95px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '2.53px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.33px' }}></div>
                          <div className="bg-slate-900 h-full" style={{ width: '1.15px' }}></div>
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
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-6 lg:text-right">
                  {t('howItWorks.steps.applicationFee.description')}
                </p>
                <ul className="space-y-3 flex flex-col items-center lg:items-end">
                  {(t('howItWorks.steps.applicationFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 lg:flex-row-reverse text-slate-500 font-medium text-center lg:text-right">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#05294E] mt-2 shrink-0" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* STEP 5: Taxa de Colocação */}
            <div className="relative flex flex-col gap-20 lg:flex-row items-center group">
              {/* Visual mockup (left side) */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#05294E]/10 rounded-full blur-[100px] opacity-30"></div>
                    <div className="relative w-full max-w-[280px] bg-white rounded-[2rem] border border-border/40 shadow-[0_20px_40px_rgba(0,0,0,0.08)] p-6 text-center space-y-4">
                      {/* Success Checkmark Stamp */}
                      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border-4 border-white shadow-md flex items-center justify-center text-emerald-500 animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="w-8 h-8">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-wider">
                          Vaga Garantida
                        </span>
                        <h4 className="text-lg font-black text-slate-900 pt-2">Matrícula Confirmada!</h4>
                        <p className="text-xs text-muted-foreground">Florida Institute of Technology</p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 text-left space-y-2 border border-slate-100">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground font-semibold">Tipo de Visto</span>
                          <span className="text-slate-900 font-bold">F-1 Student</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground font-semibold">Embarque</span>
                          <span className="text-slate-900 font-bold">Agosto, 2026</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground font-semibold">Status de Suporte</span>
                          <span className="text-emerald-600 font-bold">100% Concluído</span>
                        </div>
                      </div>

                      <p className="text-[9px] font-bold text-[#05294E] italic">"Parabéns! Sua jornada rumo aos EUA está prestes a começar."</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Central Number Circle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex h-14 w-14 items-center justify-center rounded-full bg-white border-4 border-[#05294E] shadow-2xl z-30 group-hover:scale-110 transition-transform">
                <span className="text-base font-bold text-[#05294E]">5</span>
              </div>
              
              {/* Text Side (right side) */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 lg:px-16 text-center lg:text-left mt-8 lg:mt-0">
                <div className="mb-6 flex flex-col lg:flex-row items-center gap-2 lg:gap-4 justify-center lg:justify-start">
                  <h3 className="text-3xl font-bold text-foreground tracking-tight leading-none text-center lg:text-left">
                    {t('howItWorks.steps.placementFee.title')}
                  </h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed font-medium mb-6">
                  {t('howItWorks.steps.placementFee.description')}
                </p>
                <ul className="space-y-3 flex flex-col items-center lg:items-start">
                  {(t('howItWorks.steps.placementFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-500 font-medium text-center lg:text-left">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#05294E] mt-2 shrink-0" />
                      <span className="text-sm sm:text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
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

  const leftFaqs = [1, 3, 5, 7, 9, 11];
  const rightFaqs = [2, 4, 6, 8, 10];

  return (
    <section ref={ref} className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={controls}
           variants={{ visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-8 text-center text-slate-900 home-page">{t('howItWorks.faq.title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Coluna Esquerda */}
            <div className="flex flex-col gap-1">
              {leftFaqs.map((num) => (
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
            <div className="flex flex-col gap-1">
              {rightFaqs.map((num) => (
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



/* -------------------------------------------------------------------------- */
/*                                BOTTOM CTA                                  */
/* -------------------------------------------------------------------------- */
const BottomCTASection: React.FC<{ onCTAClick: () => void, t: any }> = ({ onCTAClick, t }) => {
  
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-[#05294E] rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col-reverse lg:flex-row items-stretch min-h-[500px]">
          
          {/* Content side */}
          <div className="flex-1 p-10 md:p-16 lg:p-20 flex flex-col justify-center relative z-20 bg-[#05294E] -mt-4 lg:mt-0 rounded-b-[3.5rem] lg:rounded-br-none lg:rounded-l-[3.5rem] home-page">
            
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