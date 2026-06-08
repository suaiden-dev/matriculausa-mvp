import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Star, ChevronRight, Clock, Gift, Building, Lock } from 'lucide-react';
import { useTranslationWithFees } from '../hooks/useTranslationWithFees';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { useAuth } from '../hooks/useAuth';
import { useUniversityLogos } from '../hooks/useUniversityLogos';
import SEOHead from '../components/SEO/SEOHead';
import ImageCollage from '../components/Home/ImageCollage';
import { useWindowSize } from 'usehooks-ts';
import { motion } from 'framer-motion';
import { useScholarships } from '../hooks/useScholarships';
import { useTranslation } from 'react-i18next';

const Home: React.FC = () => {
  
  const { t } = useTranslationWithFees(['home', 'dashboard', 'common', 'school']);
  const navigate = useNavigate();
  const location = useLocation();
  const { isBlocked, pendingPayment } = usePaymentBlocked();
  const { universities: partnerUniversities, loading: partnersLoading } = useUniversityLogos();
  const { isAuthenticated, user, userProfile } = useAuth();
  const { width = 0 } = useWindowSize();

  // Dados das Bolsas em Destaque

  const [currentScholarshipIndex, setCurrentScholarshipIndex] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [slideItemWidth, setSlideItemWidth] = useState(0);

  // Integração Inteligente com Supabase e Hooks de Tradução Isolada
  const { t: tSch } = useTranslation(['scholarships', 'common', 'school', 'dashboard']);
  const { scholarships: dbScholarships, loading: scholarshipsLoading } = useScholarships();

  const getLevelLabel = (lvl: string) => {
    switch (lvl?.toLowerCase()) {
      case 'undergraduate':
        return tSch('scholarshipsPage.filters.levels.undergraduate', 'Graduação');
      case 'graduate':
        return tSch('scholarshipsPage.filters.levels.graduate', 'Pós-Graduação');
      case 'doctorate':
        return tSch('scholarshipsPage.filters.levels.doctorate', 'Doutorado');
      default:
        return lvl;
    }
  };

  const getDeliveryModeLabel = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'in_person':
        return tSch('scholarshipsPage.detail.inPersonUS', 'Presencial (Estados Unidos)');
      case 'online':
        return tSch('scholarshipsPage.filters.courseModalities.online', 'Online');
      case 'hybrid':
        return tSch('scholarshipsPage.filters.courseModalities.hybrid', 'Híbrido');
      default:
        return mode;
    }
  };

  const formatAmount = (amount: any) => {
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'number') return amount.toLocaleString('en-US');
    return amount;
  };

  const canViewSensitive = isAuthenticated && (
    user?.role !== 'student' || 
    (userProfile as any)?.has_paid_selection_process_fee ||
    (userProfile as any)?.has_paid_application_fee
  );

  const HOME_SCHOLARSHIP_IDS = [
    'b1069ada-917d-4f08-a5d0-3d6592e0a875', // STEM Scholarship (MCIS)
    '8e44fc08-3363-4c5e-a236-572206ecad65', // Leadership Scholarship (MBA)
    '7cc8fce4-e7c1-47f1-a49d-d722c44184a3', // Dean's Scholarship (MPhil)
    '83f80002-f56f-45d9-90bd-3f7931d78e4e', // Faculty and Staff Scholarship (Biblical Studies)
    '9a010b5e-df72-4a03-ab2e-9f032646ba40', // Chaplain Scholarship (Divinity)
    '59daad29-68be-43e3-851c-44ce3c014948', // President's Sacrificial Scholarship (PhD)
    'b7bbfb1c-8e65-4624-84be-b6cae1e5ca18', // Master of Business In Business Analytics
    'fb5e4a34-ba94-41b9-b14f-cd126f8119e7', // Master Of Science In Computer Science
    'cfbcc249-da4f-4892-9ecf-a3f9d2e694f7'  // MBA With Data Analytics Concentration
  ];

  const featuredScholarships = React.useMemo(() => {
    if (!dbScholarships || dbScholarships.length === 0) return [];
    return HOME_SCHOLARSHIP_IDS.map(id => dbScholarships.find(s => s.id === id)).filter(Boolean);
  }, [dbScholarships]);

  const activeList = featuredScholarships;
  const infiniteScholarships = Array(15).fill(activeList).flat();

  // Cálculo de largura exata do card em pixels para evitar esticamentos (stretching)
  useEffect(() => {
    const updateWidth = () => {
      if (sliderRef.current) {
        const visibleCols = width < 640 ? 1 : width < 1024 ? 2 : 3;
        const gap = 24; // 24px = gap-6
        const padding = 32; // px-4 = 16px * 2 (horizontal padding)
        const totalGapWidth = gap * (visibleCols - 1);
        const containerW = sliderRef.current.clientWidth;
        setSlideItemWidth((containerW - totalGapWidth - padding) / visibleCols);
      }
    };
    
    updateWidth();
    const timeoutId = setTimeout(updateWidth, 100); // Delay for ensure layout
    return () => clearTimeout(timeoutId);
  }, [width]);

  // Verificar se há pagamento Zelle pendente do tipo selection_process
  const hasPendingSelectionProcessPayment = isBlocked && pendingPayment && pendingPayment.fee_type === 'selection_process';

  // Lógica de Autoplay para o carrossel estático
  useEffect(() => {
    if (isCarouselHovered) return;

    const interval = setInterval(() => {
      setCurrentScholarshipIndex((prev) => (infiniteScholarships.length > 3 ? (prev + 1) % (infiniteScholarships.length - 3) : 0));
    }, 6000);

    return () => clearInterval(interval);
  }, [isCarouselHovered, infiniteScholarships.length]);

  // Função para determinar o dashboard conforme a role (igual Header)
  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'student': return '/student/dashboard';
      case 'school': return '/school/dashboard';
      case 'admin': return '/admin/dashboard';
      case 'affiliate_admin': return '/agency/dashboard';
      case 'seller': return '/seller/dashboard';
      default: return '/';
    }
  };


  // Função para redirecionar para Matricula Rewards
  const goToMatriculaRewards = () => {
    navigate('/student/dashboard/rewards');
  };

  return (
    <>
      <SEOHead />
      <div className="bg-white home-page">
        <section className="relative flex flex-col lg:block lg:h-[600px] overflow-hidden bg-white">
          {/* Background Image Layer — right side only */}
          <div className="relative h-[500px] sm:h-[550px] lg:absolute lg:inset-0 lg:z-0 lg:h-full flex justify-end order-2 lg:order-none">
            {/* Soft white gradient at the top of the mobile image */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white via-white/30 to-transparent z-10 lg:hidden pointer-events-none" />

            <picture className="w-full h-full">
              <source 
                srcSet="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/new_hero_large_matriculausa.webp" 
                media="(min-width: 1024px)" 
              />
              <img 
                src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/new_hero_matriculausa_mobile.webp" 
                alt="Estudante rumo aos EUA"
                className="w-full h-full object-cover object-[86.2%_bottom] lg:object-right"
              />
            </picture>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 sm:px-6 lg:px-8 w-full lg:h-full lg:flex lg:items-center order-1 lg:order-none">
            <div className="max-w-3xl lg:mr-auto">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center lg:text-left"
              >
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 leading-tight text-slate-900 tracking-tight">
                  {t('home.hero.titleMain')}{' '}
                  <span className="text-[#D0151C] italic">{t('home.hero.titleHighlight')}</span>
                </h1>

                <p className="text-sm md:text-base lg:text-lg mb-8 text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mr-auto lg:ml-0 font-medium">
                  {t('home.hero.description')}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center lg:justify-start">
                  {/* Dynamic CTA Logic */}
                  {!isAuthenticated ? (
                    <>
                      <Link
                        to={`/register${location.search}`}
                        className="group bg-[#D0151C] hover:bg-[#b01218] text-white px-8 py-3.5 rounded-xl text-lg font-bold transition-all duration-300 shadow-[0_15px_30px_rgba(208,21,28,0.25)] hover:shadow-[0_20px_40px_rgba(208,21,28,0.35)] hover:-translate-y-0.5 flex items-center justify-center border-0"
                      >
                        {t('home.hero.cta')}
                      </Link>
                    </>
                  ) : (
                    <>
                      {user?.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee ? (
                        hasPendingSelectionProcessPayment ? (
                          <div className="group bg-amber-500/20 backdrop-blur-md border-2 border-amber-500/40 rounded-xl p-4.5 flex flex-col items-center sm:items-start">
                            <div className="flex items-center mb-1.5">
                              <Clock className="h-5 w-5 text-amber-400 mr-2 animate-spin" />
                              <span className="text-lg font-bold text-white">
                                {t('nav.processingZellePayment')}
                              </span>
                            </div>
                            <p className="text-xs text-amber-100">
                              {t('nav.zellePaymentPending')}
                            </p>
                          </div>
                        ) : (
                          <Link
                            to="/student/onboarding?step=selection_fee"
                            className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl text-lg font-bold transition-all duration-300 shadow-2xl flex items-center justify-center border-0"
                          >
                            {t('nav.startSelectionProcess')}
                          </Link>
                        )
                      ) : (
                        <Link
                          to={getDashboardPath()}
                          className="group bg-[#05294E] hover:bg-[#02172B] text-white px-8 py-3.5 rounded-xl text-lg font-bold transition-all duration-300 shadow-2xl flex items-center justify-center border-0"
                        >
                          {t('nav.goToDashboard')}
                        </Link>
                      )}
                      
                      {user?.role === 'student' && (
                        <motion.button
                          onClick={goToMatriculaRewards}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="group bg-gradient-to-r from-slate-900 to-slate-700 text-white px-8 py-3.5 rounded-xl text-lg font-bold transition-all duration-300 shadow-2xl flex items-center justify-center gap-2.5 border border-white/20"
                        >
                          <Gift className="h-5 w-5 text-yellow-400" />
                          {t('matriculaRewards.visitRewardsStore')}
                        </motion.button>
                      )}
                    </>
                  )}
                </div>

                {/* Trust Indicators / Social Proof */}
                <div className="flex flex-col gap-1.5 sm:gap-3.5 items-center lg:items-start">
                  {/* Student Avatars + Enrolled Text */}
                  <div className="flex items-center gap-0.5 lg:gap-3">
                    <div className="flex -space-x-2.5 overflow-hidden">
                      <img 
                        className="inline-block h-9 w-9 rounded-full ring-2 ring-white object-cover" 
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
                        alt="Student Avatar 1" 
                      />
                      <img 
                        className="inline-block h-9 w-9 rounded-full ring-2 ring-white object-cover" 
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" 
                        alt="Student Avatar 2" 
                      />
                      <img 
                        className="inline-block h-9 w-9 rounded-full ring-2 ring-white object-cover" 
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" 
                        alt="Student Avatar 3" 
                      />
                    </div>
                    <span className="text-slate-900/80 font-semibold text-xs sm:text-sm leading-none">
                      {t('home.cta.badge', { students: t('home.trustIndicators.studentsEnrolled') })}
                    </span>
                  </div>

                  {/* Stars + Rating Text */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-slate-900/90 font-bold text-sm sm:text-base leading-none">
                      {t('home.trustIndicators.rating')}
                    </span>
                  </div>
                </div>

              </motion.div>
            </div>
          </div>
        </section>

        {/* Highlighted Scholarships Slider Section (Triple View) */}
        {(scholarshipsLoading || featuredScholarships.length > 0) && (
          <section className="py-24 bg-slate-50 relative overflow-hidden pt-26">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="max-w-2xl text-center md:text-left mx-auto md:mx-0">
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                    {t('home.featuredScholarships.titleMain', 'Bolsas')}{' '}
                    <span className="text-[#D0151C] italic">{t('home.featuredScholarships.titleHighlight', 'mais procuradas.')}</span>
                  </h2>
                </div>
                <div className="shrink-0 hidden md:flex justify-center">
                  <Link
                    to="/scholarships"
                    className="group inline-flex items-center gap-1.5 text-slate-900 hover:text-[#D0151C] font-black text-lg transition-colors duration-300"
                  >
                    <span>{t('home.featuredScholarships.viewAll', 'Ver todas')}</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Slider Container */}
              <div 
                className="relative overflow-visible"
                onMouseEnter={() => setIsCarouselHovered(true)}
                onMouseLeave={() => setIsCarouselHovered(false)}
              >
                <div className="overflow-hidden px-4 -mx-4 py-4" ref={sliderRef}>
                  {scholarshipsLoading ? (
                    <div className="flex gap-6">
                      {Array.from({ length: width < 640 ? 1 : width < 1024 ? 2 : 3 }).map((_, index) => (
                        <div 
                          key={`skeleton-${index}`}
                          className="flex-shrink-0"
                          style={{ width: slideItemWidth > 0 ? `${slideItemWidth}px` : '100%' }}
                        >
                          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-[0_12px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-[480px] relative text-left animate-pulse">
                            {/* Card Header Skeleton */}
                            <div className="relative h-44 w-full bg-slate-100 border-b border-slate-200 shrink-0">
                              {/* Left Text Overlay Mock */}
                              <div className="absolute inset-y-0 left-0 w-[55%] sm:w-[58%] bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent flex flex-col justify-center pl-4 pr-8">
                                <div className="h-4 bg-slate-200 rounded w-16 mb-4 mt-8 animate-pulse" />
                                <div className="h-5 bg-slate-200 rounded w-[88%] mb-1 animate-pulse" />
                                <div className="h-4 bg-slate-200 rounded w-[60%] animate-pulse" />
                              </div>
                              {/* Floating Level/Modal Badge Mock */}
                              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                                <div className="h-6 w-20 bg-slate-200 rounded-xl animate-pulse" />
                                <div className="h-6 w-12 bg-slate-200 rounded-xl animate-pulse" />
                              </div>
                            </div>
                            
                            {/* Card Body Skeleton */}
                            <div className="p-6 flex-1 flex flex-col justify-between overflow-hidden">
                              <div className="min-h-0 flex-1 flex flex-col space-y-4">
                                {/* University details Mock */}
                                <div className="flex items-center gap-2 mb-1 shrink-0">
                                  <div className="w-7 h-7 rounded-md bg-slate-200 animate-pulse" />
                                  <div className="h-3 bg-slate-200 rounded w-24 animate-pulse" />
                                </div>
                                {/* Scholarship title Mock */}
                                <div className="space-y-2 shrink-0">
                                  <div className="h-5 bg-slate-200 rounded w-[90%] animate-pulse" />
                                  <div className="h-5 bg-slate-200 rounded w-[70%] animate-pulse" />
                                </div>
                                {/* Specs Tags Mock */}
                                <div className="flex flex-wrap gap-2 shrink-0 pt-2">
                                  <div className="h-6 bg-slate-200 rounded-xl w-32 animate-pulse" />
                                  <div className="h-6 bg-slate-200 rounded-xl w-16 animate-pulse" />
                                </div>
                              </div>
                              
                              {/* Financial details Mock */}
                              <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4.5 sm:p-5 mt-2 flex items-center justify-between gap-4 shrink-0">
                                <div className="space-y-2">
                                  <div className="h-3 bg-slate-200 rounded w-16 animate-pulse" />
                                  <div className="h-4 bg-slate-200 rounded w-20 animate-pulse" />
                                  <div className="h-5 bg-slate-200 rounded w-24 animate-pulse" />
                                </div>
                                <div className="space-y-2 flex flex-col items-end">
                                  <div className="h-3 bg-slate-200 rounded w-16 animate-pulse" />
                                  <div className="h-6 bg-slate-200 rounded w-24 animate-pulse" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <motion.div 
                      className="flex gap-6"
                      animate={{ 
                        x: -(currentScholarshipIndex * (slideItemWidth + 24)) // 24px is gap-6
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      onTouchStart={(e) => {
                        setIsCarouselHovered(true);
                        sliderRef.current?.setAttribute('data-touch-start', e.targetTouches[0].clientX.toString());
                      }}
                      onTouchMove={(e) => {
                        sliderRef.current?.setAttribute('data-touch-end', e.targetTouches[0].clientX.toString());
                      }}
                      onTouchEnd={() => {
                        setIsCarouselHovered(false);
                        const touchStart = parseFloat(sliderRef.current?.getAttribute('data-touch-start') || '0');
                        const touchEnd = parseFloat(sliderRef.current?.getAttribute('data-touch-end') || '0');
                        
                        if (!touchStart || !touchEnd) return;
                        
                        const distance = touchStart - touchEnd;
                        const swipeThreshold = 50;
                        
                        if (distance > swipeThreshold) {
                          // Swiped left (Next slide)
                          setCurrentScholarshipIndex((prev) => (prev + 1) % (infiniteScholarships.length - 3));
                        } else if (distance < -swipeThreshold) {
                          // Swiped right (Prev slide)
                          setCurrentScholarshipIndex((prev) => Math.max(0, prev - 1));
                        }
                        
                        sliderRef.current?.removeAttribute('data-touch-start');
                        sliderRef.current?.removeAttribute('data-touch-end');
                      }}
                    >
                      {infiniteScholarships.map((scholarship: any, index) => {
                        const recAnnualSavings = (Number(scholarship.original_annual_value) || 0) - (Number(scholarship.annual_value_with_scholarship) || 0);
                        const recImage = scholarship.image_url || scholarship.universities?.image_url;

                        return (
                          <div 
                            key={`${scholarship.id}-${index}`}
                            className="flex-shrink-0"
                            style={{ width: slideItemWidth > 0 ? `${slideItemWidth}px` : '100%' }}
                          >
                            <motion.div
                              onClick={() => {
                                navigate(`/scholarships/${scholarship.id}`);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="group bg-white rounded-[2rem] border border-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:border-blue-200 hover:shadow-[0_12px_25px_rgba(5,41,78,0.08)] transition-all duration-500 overflow-hidden cursor-pointer flex flex-col h-[480px] relative text-left"
                              whileHover={{ y: -10 }}
                            >
                              {/* Card Header (Cover Image with Course Banner & Matricula Logo) */}
                              <div className="relative h-44 w-full bg-white z-10 overflow-hidden border-b border-slate-100 shrink-0">
                                
                                {/* Full Background Image */}
                                <div className="absolute inset-0 z-0">
                                  {recImage ? (
                                    <img 
                                      src={recImage} 
                                      alt={scholarship.title} 
                                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" 
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-400">
                                      <Building className="h-12 w-12 text-[#05294E]/20" />
                                    </div>
                                  )}
                                </div>

                                {/* Text Overlay Layer (Left side fade) */}
                                <div className="absolute inset-y-0 left-0 w-[55%] sm:w-[58%] z-10 bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-4 pr-8">
                                  {/* Top Left Logo */}
                                  <div className="absolute top-4 left-4">
                                    <img 
                                      src="/logo.png" 
                                      alt="Matricula USA" 
                                      className="h-5 w-auto object-contain mb-1.5 drop-shadow-sm" 
                                    />
                                  </div>
                                  
                                  {/* Course / Field as Main Banner Text */}
                                  <p className="w-[88%] text-sm font-black font-['Montserrat',sans-serif] text-slate-900 line-clamp-3 pt-0.5 mt-8" style={{ lineHeight: 0.95 }}>
                                    {scholarship.field_of_study || tSch('scholarshipsPage.filters.anyField')}
                                  </p>
                                </div>

                                {/* Top Right Badges */}
                                <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
                                  {scholarship.is_exclusive && (
                                    <div className="bg-amber-500 text-white px-2.5 py-1.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-white" />
                                      {tSch('common.exclusive', 'Exclusiva')}
                                    </div>
                                  )}
                                </div>

                                {/* Floating Level/Modal Badges */}
                                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
                                  <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-800 shadow-sm border border-white/20">
                                    {getLevelLabel(scholarship.level || '')}
                                  </span>
                                  {scholarship.scholarship_percentage && (
                                    <span className="px-2.5 py-1 bg-green-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                      {scholarship.scholarship_percentage}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Card Body */}
                              <div className="p-6 flex-1 flex flex-col justify-between overflow-hidden">
                                <div className="min-h-0 flex-1 flex flex-col">
                                  {/* University details */}
                                  <div className="flex items-center gap-2 mb-3 shrink-0">
                                    <div className="relative w-7 h-7 rounded-md border border-slate-100 bg-white p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                      {scholarship.universities?.logo_url ? (
                                        <img 
                                          src={canViewSensitive ? scholarship.universities.logo_url : "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/universities-logo/University_lock_icon.webp"} 
                                          alt={canViewSensitive ? (scholarship.universities.name || "University Logo") : "University Logo"} 
                                          className={`w-full h-full object-contain transition-all duration-500 ${!canViewSensitive ? 'blur-[3px] opacity-40' : ''}`} 
                                        />
                                      ) : (
                                        <Building className={`w-4 h-4 text-slate-400 ${!canViewSensitive ? 'blur-[1.5px]' : ''}`} />
                                      )}
                                      {!canViewSensitive && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[0.5px]">
                                          <Lock className="h-3 w-3 text-slate-700" />
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[85%]">
                                      {canViewSensitive
                                        ? (scholarship.universities?.name || scholarship.university_name || 'Universidade')
                                        : '********'}
                                    </span>
                                  </div>

                                  {/* Scholarship title */}
                                  <h3 className="text-base font-black text-slate-900 line-clamp-2 leading-snug mb-2 shrink-0">
                                    {scholarship.title}
                                  </h3>

                                  {/* Course / Field of Study */}
                                  {scholarship.field_of_study && (
                                    <div className="mb-2 shrink-0">
                                      <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                                        <span className="truncate">{scholarship.field_of_study}</span>
                                      </span>
                                    </div>
                                  )}

                                  {/* Specs Tags (Delivery Mode & Work Permissions) */}
                                  {(scholarship.delivery_mode || (scholarship.work_permissions && scholarship.work_permissions.length > 0)) && (
                                    <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                                      {scholarship.delivery_mode && (
                                        <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                                          <span className="truncate">{getDeliveryModeLabel(scholarship.delivery_mode)}</span>
                                        </span>
                                      )}

                                      {scholarship.work_permissions && scholarship.work_permissions.map((perm: string, i: number) => (
                                        <span key={i} className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                                          <span className="truncate">{perm}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Financial details - Premium Pricing Section */}
                                <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4.5 sm:p-5 mt-2 flex items-center justify-between gap-4 shrink-0">
                                  {/* Left Side: Original Cost & Savings Badge */}
                                  <div className="flex flex-col text-left">
                                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                      {tSch('scholarshipsPage.detail.annualCost', 'Investimento Anual')}
                                    </span>
                                    <span className="text-sm font-bold text-slate-400 line-through leading-tight">
                                      ${formatAmount(scholarship.original_annual_value)}
                                    </span>
                                    {recAnnualSavings > 0 && (
                                      <span className="inline-flex items-center w-fit text-[10px] font-black text-green-700 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-xl mt-2 uppercase tracking-wider">
                                        -{tSch('scholarshipsPage.detail.annualSavings', 'Economia Anual').split(' ')[0]} ${formatAmount(recAnnualSavings)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Right Side: Hero Price with Scholarship */}
                                  <div className="flex flex-col text-right">
                                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">
                                      {tSch('scholarshipsPage.detail.withScholarship', 'Com Bolsa')}
                                    </span>
                                    <div className="flex items-baseline justify-end">
                                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                                        ${formatAmount(scholarship.annual_value_with_scholarship)}
                                      </span>
                                      <span className="text-xs font-bold text-slate-500 ml-0.5">
                                        {tSch('scholarshipsPage.detail.perYear', '/ano')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>

                {/* Navigation Buttons - Sides */}
                {!scholarshipsLoading && infiniteScholarships.length > 3 && (
                  <div className="hidden md:block">
                    <button 
                      onClick={() => setCurrentScholarshipIndex((prev) => Math.max(0, prev - 1))}
                      className="absolute -left-8 lg:-left-12 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#05294E] hover:text-white transition-all duration-300 shadow-xl"
                    >
                      <ChevronRight className="h-6 w-6 rotate-180" />
                    </button>
                    <button 
                      onClick={() => setCurrentScholarshipIndex((prev) => (infiniteScholarships.length > 3 ? (prev + 1) % (infiniteScholarships.length - 3) : 0))}
                      className="absolute -right-8 lg:-right-12 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#05294E] hover:text-white transition-all duration-300 shadow-xl"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Indicators */}
              {!scholarshipsLoading && featuredScholarships.length > 0 && (
                <div className="mt-12 flex justify-center gap-2">
                  {featuredScholarships.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentScholarshipIndex(idx)}
                      className={`h-1.5 transition-all duration-500 rounded-full ${idx === currentScholarshipIndex % featuredScholarships.length ? 'w-8 bg-[#05294E]' : 'w-2 bg-slate-200'}`}
                    />
                  ))}
                </div>
              )}

              {/* Botão "Ver todas" apenas no Mobile */}
              <div className="mt-10 flex justify-center md:hidden">
                <Link
                  to="/scholarships"
                  className="group inline-flex items-center gap-1.5 text-slate-900 hover:text-[#D0151C] font-black text-lg transition-colors duration-300"
                >
                  <span>{t('home.featuredScholarships.viewAll', 'Ver todas')}</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Premium Features Section — Arco-inspired bento layout */}
        <section className="py-24 md:py-32 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Centered Header */}
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-5">
                {t('home.features.titleMain')}{' '}
                <span className="text-[#D0151C] italic">{t('home.features.titleHighlight')}</span>
              </h2>
              <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                {t('home.features.subtitle')}
              </p>
            </div>

            {/* Grid: cards (left) + image (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 lg:gap-3 xl:gap-4 items-stretch">
              {/* Cards Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {/* Card 1: Opportunities — Coral/Red accent */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="relative overflow-hidden rounded-3xl p-8 md:p-10 min-h-[280px] md:min-h-[340px] flex flex-col items-center text-center md:items-start md:text-left gap-6 md:gap-6 bg-[#D0151C] text-white"
                >
                  <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <img src="/icons/selection.svg" alt="" className="w-12 h-12 brightness-0 invert opacity-90" />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 leading-tight">
                      {t('home.features.opportunities.title')}
                    </h3>
                    <p className="text-base md:text-[15px] text-white/90 leading-relaxed">
                      {t('home.features.opportunities.description')}
                    </p>
                  </div>
                </motion.div>

                {/* Card 2: Universities — Mid blue */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="relative overflow-hidden rounded-3xl p-8 md:p-10 min-h-[280px] md:min-h-[340px] flex flex-col items-center text-center md:items-start md:text-left gap-6 md:gap-6 bg-[#2E5BBF] text-white"
                >
                  <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <img src="/icons/scholarship.svg" alt="" className="w-12 h-12 brightness-0 invert opacity-90" />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 leading-tight">
                      {t('home.features.universities.title')}
                    </h3>
                    <p className="text-base md:text-[15px] text-white/90 leading-relaxed">
                      {t('home.features.universities.description')}
                    </p>
                  </div>
                </motion.div>

                {/* Card 3: Confidence — Dark navy */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative overflow-hidden rounded-3xl p-8 md:p-10 min-h-[280px] md:min-h-[340px] flex flex-col items-center text-center md:items-start md:text-left gap-6 md:gap-6 bg-[#05294E] text-white"
                >
                  <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <img src="/icons/award.svg" alt="" className="w-12 h-12 brightness-0 invert opacity-90" />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 leading-tight">
                      {t('home.features.confidence.title')}
                    </h3>
                    <p className="text-base md:text-[15px] text-white/90 leading-relaxed">
                      {t('home.features.confidence.description')}
                    </p>
                  </div>
                </motion.div>

                {/* Card 4: Partner Universities Marquee — wide */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="relative rounded-3xl py-6 sm:col-span-2 lg:col-span-3 bg-transparent flex flex-col sm:flex-row items-center gap-6"
                >
                  {/* Heading (left) */}
                  <div className="shrink-0 text-center sm:text-left sm:pr-6 sm:border-r sm:border-slate-200">
                    <p className="text-3xl md:text-4xl font-black text-slate-900 leading-none">
                      {t('home.features.universitiesNumber', '+500')}
                    </p>
                    <p className="text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wider mt-1">
                      {t('home.features.universitiesCount', 'universidades')}
                    </p>
                  </div>

                  {/* Marquee (right) */}
                  <div className="relative flex-1 w-full overflow-hidden">
                    {/* Side fade gradients */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-white via-white/70 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-white via-white/70 to-transparent z-10 pointer-events-none" />

                    {partnersLoading ? (
                      <div className="flex gap-10 overflow-hidden animate-pulse">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="flex-shrink-0 w-[140px] h-16" />
                        ))}
                      </div>
                    ) : (
                      <div className="animate-marquee flex gap-10 items-center">
                        {[...partnerUniversities, ...partnerUniversities].map((university, index) => (
                          <div
                            key={`features-marquee-${university.name}-${index}`}
                            className="flex-shrink-0 w-[140px] h-16 flex items-center justify-center select-none"
                          >
                            {university.logoUrl ? (
                              <img
                                src={university.logoUrl}
                                alt={`${university.name} logo`}
                                className="max-h-full max-w-full object-contain grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-500"
                              />
                            ) : (
                              <span className="text-slate-500 font-black text-base uppercase tracking-wider">{university.name.charAt(0)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Image Column (right) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative min-h-[400px] lg:min-h-0 flex items-center justify-center lg:block"
              >
                <img
                  src="/banner_vertical.png"
                  alt="Students on campus"
                  className="relative lg:absolute lg:inset-0 w-auto h-[400px] lg:w-full lg:h-full object-contain object-center scale-110 translate-x-4 lg:translate-x-0"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* How It Works — Smart Living-inspired layout */}
        <section className="py-24 md:py-32 bg-slate-50 relative overflow-hidden">
          {/* Decorative dotted background */}
          <div
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          {/* Soft diagonal accent */}
          <div className="absolute top-0 left-0 w-1/2 h-full bg-white/60 -skew-x-12 -translate-x-32 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Image Composition (Left) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="w-full"
              >
                <ImageCollage
                  mainImage="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/college_friends_enjoying_the_sun_%20campus_walk.webp"
                  secondaryImage="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/library-facade-white-columns-students.webp"
                  mainAlt="Amigos da faculdade caminhando pelo campus"
                  secondaryAlt="Biblioteca da universidade com colunas brancas"
                />
              </motion.div>

              {/* Content (Right) */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative flex flex-col items-center text-center md:items-start md:text-left"
              >
                <h2 className="font-black text-slate-900 leading-tight mb-6" style={{ fontSize: 'clamp(28px, 4.5vw, 52px)' }}>
                  {t('home.threeSteps.titleMain', 'Uma experiência que pode')}{' '}
                  <span className="text-[#D0151C] italic">{t('home.threeSteps.titleHighlight', 'mudar sua vida.')}</span>
                </h2>

                <p className="text-slate-600 mb-10 max-w-xl" style={{ fontSize: '16px', lineHeight: '1.6' }}>
                  {t('home.features.subtitle')}
                </p>

                {/* Two feature blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 mb-10 w-full">
                  {['step1', 'step2'].map((stepKey) => (
                    <div key={stepKey} className="flex flex-col items-center text-center md:items-start md:text-left bg-slate-50/80 p-8 md:p-10 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                      <div className="mb-5">
                        {stepKey === 'step1' ? (
                          <svg className="w-10 h-10 text-[#D0151C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-10 h-10 text-[#D0151C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87a4 4 0 00-6 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 mb-3" style={{ fontSize: '22px', lineHeight: '1.3' }}>
                        {t(`home.threeSteps.${stepKey}.title`)}
                      </h3>
                      <p className="text-slate-600" style={{ fontSize: '15px', lineHeight: '1.6' }}>
                        {t(`home.threeSteps.${stepKey}.description`)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* CTA Button — matches hero CTA */}
                <Link
                  to="/scholarships"
                  className="group inline-flex items-center justify-center bg-[#D0151C] hover:bg-[#b01218] text-white px-8 py-3.5 rounded-xl text-lg font-bold transition-all duration-300 shadow-[0_15px_30px_rgba(208,21,28,0.25)] hover:shadow-[0_20px_40px_rgba(208,21,28,0.35)] hover:-translate-y-0.5 border-0"
                >
                  {t('home.cta.studyAndWork', 'Estudar e trabalhar nos EUA')}
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Success Wall */}
        <SocialProofSection onCTAClick={() => {
          if (isAuthenticated) {
            navigate('/student/dashboard/scholarships');
          } else {
            navigate('/selection-fee-registration');
          }
        }} />

      </div>
    </>
  );
};

// Social Proof Section — Photo Mosaic (Arco-inspired)
const SocialProofSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation(['home', 'common']);

  const photos = [
    "/client-1.jpeg",
    "/client-2.jpeg",
    "/client-3.jpeg",
    "/client-4.jpeg",
    "/client-5.jpeg",
    "/client-6.jpeg",
    "/client-7.jpeg",
    "/client-8.jpeg",
  ];

  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            {t('home.successWall.title.part1', 'Veja quem já está vivendo a')}{' '}
            <span className="text-[#D0151C] italic">{t('home.successWall.title.highlight', 'experiência.')}</span>
          </h2>
        </div>

        {/* Mobile: horizontal scroll wrapper — keeps EXACT desktop grid layout */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div
            className="grid grid-cols-12 gap-4 auto-rows-[275px]"
            style={{ width: '1100px' }}
          >
            {/* ROW 1 — same as desktop */}
            <div className="col-span-3 col-start-2 relative rounded-2xl overflow-hidden bg-slate-200">
              <img src={photos[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="col-span-2 relative rounded-2xl overflow-hidden bg-slate-200">
              <img src={photos[5]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="col-span-2 relative rounded-2xl overflow-hidden bg-slate-200">
              <img src={photos[2]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="col-span-3 relative rounded-2xl overflow-hidden bg-slate-200">
              <img src={photos[3]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            {/* ROW 2 — same as desktop */}
            <div className="col-span-2 relative rounded-2xl overflow-hidden bg-slate-200">
              <img src={photos[4]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="col-span-4 relative rounded-2xl overflow-hidden bg-slate-200">
              <img src={photos[1]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-top" />
            </div>
            <div className="col-span-3 relative rounded-2xl overflow-hidden bg-slate-200">
              <img src={photos[6]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="col-span-3 relative rounded-2xl overflow-hidden bg-slate-200">
              <img src={photos[7]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Desktop: Photo Mosaic — 2 rows, equal heights, varied widths */}
        <div className="hidden md:grid grid-cols-12 gap-5 auto-rows-[260px] lg:auto-rows-[300px]">
          {/* ROW 1 — indented (1 col gap on each side) */}
          <div className="col-span-3 col-start-2 relative rounded-2xl overflow-hidden bg-slate-200 transition-shadow duration-300 group">
            <img src={photos[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>
          <div className="col-span-2 relative rounded-2xl overflow-hidden bg-slate-200 transition-shadow duration-300 group">
            <img src={photos[5]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>
          <div className="col-span-2 relative rounded-2xl overflow-hidden bg-slate-200 transition-shadow duration-300 group">
            <img src={photos[2]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>
          <div className="col-span-3 relative rounded-2xl overflow-hidden bg-slate-200 transition-shadow duration-300 group">
            <img src={photos[3]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>

          {/* ROW 2 */}
          <div className="col-span-2 relative rounded-2xl overflow-hidden bg-slate-200 transition-shadow duration-300 group">
            <img src={photos[4]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>
          <div className="col-span-4 relative rounded-2xl overflow-hidden bg-slate-200 transition-shadow duration-300 group">
            <img src={photos[1]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
          </div>
          <div className="col-span-3 relative rounded-2xl overflow-hidden bg-slate-200 transition-shadow duration-300 group">
            <img src={photos[6]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>
          <div className="col-span-3 relative rounded-2xl overflow-hidden bg-slate-200 transition-shadow duration-300 group">
            <img src={photos[7]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <button
            onClick={onCTAClick}
            className="group inline-flex items-center justify-center bg-[#D0151C] hover:bg-[#b01218] text-white px-8 py-3.5 rounded-xl text-lg font-bold transition-all duration-300 shadow-[0_15px_30px_rgba(208,21,28,0.25)] hover:shadow-[0_20px_40px_rgba(208,21,28,0.35)] hover:-translate-y-0.5 border-0"
          >
            {t("forStudents.socialProof.ctaButton")}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Home;
