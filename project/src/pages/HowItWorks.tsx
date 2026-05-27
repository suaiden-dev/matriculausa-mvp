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
          className="max-w-6xl mx-auto bg-white p-4 sm:p-8"
        >
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse min-w-0 md:min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-8 px-6 text-sm font-bold uppercase tracking-widest text-slate-400 w-1/4 hidden md:table-cell">Diferencial</th>
                  <th className="py-8 px-6 text-center text-sm font-bold uppercase tracking-widest text-slate-400/80 w-1/2 md:w-auto">Fazer sozinho</th>
                  <th className="py-8 px-6 text-center text-sm font-bold uppercase tracking-widest text-slate-400/80 hidden md:table-cell">Agências tradicionais</th>
                  <th className="py-8 px-6 text-center text-sm font-bold uppercase tracking-widest text-[#05294E] bg-blue-50 border-x border-t border-blue-100 w-1/2 md:w-auto">
                    <div className="inline-block bg-[#D0151C] text-white text-[9px] font-black px-3.5 py-1 rounded-full uppercase tracking-widest shadow-sm mb-2 whitespace-nowrap">
                      Recomendado
                    </div>
                    <span className="block">Matrícula USA</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Row 1 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">Acesso a bolsas</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Difícil encontrar oportunidades reais</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Poucas opções ou descontos limitados</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Bolsas exclusivas com grandes descontos</span>
                    </div>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">Suporte e mentoria</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Você decide tudo por conta própria</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Atendimento genérico e pouco personalizado</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Orientação estratégica com especialistas</span>
                    </div>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">Transparência nos custos</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gastos podem aparecer no caminho</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Taxas extras e pouca clareza</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Transparência em todos os passos</span>
                    </div>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">Organização do processo</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Manual, confuso e fácil de errar</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Processo lento e espalhado</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span className="text-[10px] text-[#05294E] font-black uppercase tracking-wider">Tudo simples em uma única plataforma</span>
                    </div>
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-8 px-6 hidden md:table-cell">
                    <p className="text-base font-bold text-slate-800">Segurança na aprovação</p>
                  </td>
                  <td className="py-8 px-6 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sem garantia se não avançar</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center hidden md:table-cell">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Garantia nem sempre clara</span>
                    </div>
                  </td>
                  <td className="py-8 px-6 text-center bg-blue-50 border-x border-b border-blue-100">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
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
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Minha Seleção</h4>
                          <p className="text-[9px] text-muted-foreground font-bold">Cursos Pré-Selecionados</p>
                        </div>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                          4 / 4 Selecionados
                        </span>
                      </div>

                      {/* Selected Scholarships List */}
                      <div className="space-y-3">
                        {/* Course 1 */}
                        <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:scale-[1.02] hover:bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[10px] font-black text-slate-900 leading-tight">Master of Science in Computer Science</h5>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Mestrado</p>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-2 border border-slate-100 flex items-center justify-between text-[8px] font-bold">
                            <div className="space-x-1.5">
                              <span className="text-slate-400 line-through">$37,480</span>
                              <span className="text-green-600">$24,370 / ano</span>
                            </div>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[7px] font-extrabold">35% OFF</span>
                          </div>
                        </div>

                        {/* Course 2 */}
                        <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:scale-[1.02] hover:bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[10px] font-black text-slate-900 leading-tight">Professional MBA</h5>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Pós-Graduação / MBA</p>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-2 border border-slate-100 flex items-center justify-between text-[8px] font-bold">
                            <div className="space-x-1.5">
                              <span className="text-slate-400 line-through">$32,700</span>
                              <span className="text-green-600">$19,500 / ano</span>
                            </div>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[7px] font-extrabold">40% OFF</span>
                          </div>
                        </div>

                        {/* Course 3 */}
                        <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:scale-[1.02] hover:bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[10px] font-black text-slate-900 leading-tight">Master of Business in Business Analytics</h5>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Mestrado</p>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-2 border border-slate-100 flex items-center justify-between text-[8px] font-bold">
                            <div className="space-x-1.5">
                              <span className="text-slate-400 line-through">$44,700</span>
                              <span className="text-green-600">$21,900 / ano</span>
                            </div>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[7px] font-extrabold">51% OFF</span>
                          </div>
                        </div>

                        {/* Course 4 */}
                        <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:scale-[1.02] hover:bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[10px] font-black text-slate-900 leading-tight">MS Computer Science</h5>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Mestrado</p>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-2 border border-slate-100 flex items-center justify-between text-[8px] font-bold">
                            <div className="space-x-1.5">
                              <span className="text-slate-400 line-through">$27,000</span>
                              <span className="text-green-600">$16,625 / ano</span>
                            </div>
                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[7px] font-extrabold">38% OFF</span>
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
                            ★ Exclusiva
                          </span>
                        </div>
                        {/* Course overlay label */}
                        <div className="absolute inset-y-0 left-0 w-[80%] bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-3">
                          <p className="text-[10px] font-black text-slate-900 leading-tight">
                            MS COMPUTER SCIENCE
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col">
                        {/* Title & Uni */}
                        <div>
                          <h4 className="text-xs font-black text-slate-900 leading-tight">MS Computer Science</h4>
                        </div>

                        {/* Financial Box */}
                        <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm space-y-1.5">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400 font-medium">Anuidade Original</span>
                            <span className="text-slate-400 font-bold line-through">$27,000</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-[#05294E] font-bold">Com Bolsa de Estudo</span>
                            <span className="text-green-600 font-black text-xs">$16,625 / ano</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[9px]">
                            <span className="text-slate-400 font-medium">Desconto Garantido</span>
                            <span className="text-green-600 font-extrabold bg-green-50 px-1.5 py-0.5 rounded text-[8px]">38% OFF</span>
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
                            <span>Aprovado</span>
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
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Onboarding</h4>
                          <p className="text-[9px] text-slate-400 font-bold">Documentos da Universidade</p>
                        </div>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                          2 / 4 Enviados
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
                              <h5 className="text-[10px] font-black text-slate-800 leading-tight">Passaporte Oficial</h5>
                              <p className="text-[8px] text-emerald-600 font-black tracking-wider uppercase mt-0.5">Aprovado ✓</p>
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
                              <h5 className="text-[10px] font-black text-slate-800 leading-tight">Histórico Escolar</h5>
                              <p className="text-[8px] text-amber-600 font-black tracking-wider uppercase mt-0.5">Em Análise</p>
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
                                <h5 className="text-[10px] font-black text-slate-800 leading-tight">Comprovante Financeiro</h5>
                                <p className="text-[8px] text-blue-600 font-black tracking-wider uppercase mt-0.5">Enviando... 65%</p>
                              </div>
                            </div>
                          </div>
                          {/* Barra de Progresso de Upload */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '65%' }}></div>
                          </div>
                        </div>

                        {/* 4. Proficiência em Inglês - Pendente / Ação Necessária */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between transition-all hover:scale-[1.02]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                                <path d="M12 9v4" />
                                <path d="M12 16v.01" />
                              </svg>
                            </div>
                            <div>
                              <h5 className="text-[10px] font-black text-slate-500 leading-tight">Proficiência em Inglês</h5>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pendente</p>
                            </div>
                          </div>
                          <button className="px-2.5 py-1 bg-[#05294E] hover:bg-[#083a6e] text-white rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition-colors cursor-default">
                            Upload
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                          </button>
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
                    <div className="absolute inset-0 bg-[#05294E]/10 rounded-full blur-[100px] opacity-30"></div>
                    <div className="relative w-full max-w-[300px] bg-white rounded-2xl border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 space-y-4 overflow-hidden text-left">
                      {/* University Header */}
                      <div className="flex justify-between items-start pt-2">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-800 tracking-wider uppercase font-serif">FLORIDA INSTITUTE OF TECHNOLOGY</p>
                          <p className="text-[7px] text-muted-foreground uppercase tracking-widest">Office of Admissions</p>
                        </div>
                        <div className="h-6 w-6 rounded bg-[#05294E]/10 flex items-center justify-center text-[#05294E]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                          </svg>
                        </div>
                      </div>

                      <div className="h-px bg-slate-100 w-full"></div>

                      {/* Letter Content Mock */}
                      <div className="space-y-3">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">OFFICIAL ACCEPTANCE</span>
                          <h4 className="text-sm font-black text-slate-900 pt-1">Congratulations!</h4>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                          We are thrilled to inform you that you have been admitted to the incoming class of 2026.
                        </p>
                      </div>

                      {/* Official Seal and Details */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 relative overflow-hidden">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-muted-foreground font-semibold">Scholarship Award</span>
                          <span className="text-[#05294E] font-extrabold">$28,500 / Yr</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-muted-foreground font-semibold">Academic Program</span>
                          <span className="text-slate-900 font-bold">Computer Science, B.S.</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-muted-foreground font-semibold">Status</span>
                          <span className="text-emerald-600 font-bold">Admitted (F-1)</span>
                        </div>
                        
                        {/* Stamp Overlay */}
                        <div className="absolute right-2 bottom-0 opacity-15 rotate-12 pointer-events-none">
                          <div className="border-4 border-[#05294E] rounded-full p-1.5 flex flex-col items-center justify-center w-14 h-14">
                            <span className="text-[6px] font-black text-[#05294E] uppercase leading-none">ACCEPTED</span>
                            <span className="text-[4px] font-bold text-[#05294E] leading-none">FIT 2026</span>
                          </div>
                        </div>
                      </div>

                      {/* Sign and Seal */}
                      <div className="flex justify-between items-end pt-1">
                        <div className="space-y-0.5">
                          <div className="h-3 w-16 bg-slate-100 rounded opacity-70 flex items-center justify-center">
                            <span className="text-[6px] font-bold italic text-slate-400 font-serif">M. Anderson</span>
                          </div>
                          <p className="text-[6px] text-muted-foreground uppercase">Dean of Admissions</p>
                        </div>
                        <div className="h-6 w-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="m9 12 2 2 4-4"/>
                          </svg>
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



export default HowItWorks;
