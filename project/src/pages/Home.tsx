import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Star, ChevronLeft, ChevronRight, Clock, Gift, Building, Lock } from 'lucide-react';
import { useTranslationWithFees } from '../hooks/useTranslationWithFees';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { useAuth } from '../hooks/useAuth';
import { useUniversityLogos } from '../hooks/useUniversityLogos';
import SEOHead from '../components/SEO/SEOHead';
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
      case 'affiliate_admin': return '/affiliate-admin/dashboard';
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
                  {t('home.hero.title')}
                </h1>
                
                <p className="text-lg lg:text-xl mb-8 text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mr-auto lg:ml-0 font-medium">
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
                    <span className="text-slate-900/80 font-semibold text-sm sm:text-base leading-none">
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
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
                    {t('home.featuredScholarships.title')}
                  </h2>
                </div>
                <div className="shrink-0 hidden md:flex justify-center">
                  <Link
                    to="/scholarships"
                    className="group inline-flex items-center gap-1.5 text-slate-900 hover:text-[#D0151C] font-black text-lg transition-colors duration-300"
                  >
                    <span>Ver todas</span>
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
                              className="group bg-white rounded-[2rem] border border-slate-200 shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:border-blue-200 hover:shadow-[0_24px_50px_rgba(5,41,78,0.12)] transition-all duration-500 overflow-hidden cursor-pointer flex flex-col h-[480px] relative text-left"
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
                  <span>Ver todas</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Trusted Universities Section */}
        <section className="py-24 bg-white relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-64 h-64 bg-[#05294E]/3 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-64 h-64 bg-[#D0151C]/3 rounded-full blur-3xl"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            
            {/* Header Section */}
            <div className="text-center max-w-7xl mx-auto mb-20">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                  {t('home.trustedUniversities.titleMain')}{' '}
                  <span className="text-[#D0151C]">{t('home.trustedUniversities.titleHighlight')}</span>
                </h2>
              </motion.div>
            </div>

            {/* University Logos Grid / Carousel */}
            <div className="relative">
              {/* Loading State */}
              {partnersLoading && (
                <div className="flex gap-8 overflow-hidden py-4 animate-pulse">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex-shrink-0 w-[200px] h-28 bg-slate-50 rounded-[2rem] border border-slate-100" />
                  ))}
                </div>
              )}

              {/* University Cards Carousel */}
              {!partnersLoading && (
                <div className="relative w-full overflow-hidden py-4">
                  {/* Elegant fade gradients on the sides */}
                  <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />
                  
                  <div className="animate-marquee flex gap-8 py-4">
                    {[...partnerUniversities, ...partnerUniversities].map((university, index) => (
                      <div 
                        key={`${university.name}-${index}`}
                        className="group relative flex-shrink-0 w-[200px] h-28 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#05294E]/10 transition-all duration-500 overflow-hidden flex items-center justify-center select-none"
                      >
                        {/* Elegant background highlight on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                          <div className="h-full w-full flex items-center justify-center transition-all duration-500 transform group-hover:scale-110">
                            {university.isLoading ? (
                              <div className="animate-pulse bg-slate-100 h-full w-full rounded-2xl"></div>
                            ) : university.logoUrl ? (
                              <img
                                src={university.logoUrl}
                                alt={`${university.name} logo`}
                                className="max-h-full max-w-full object-contain transition-all duration-700 opacity-75 group-hover:opacity-100 filter grayscale group-hover:grayscale-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            
                            {/* Fallback Icon */}
                            <div 
                              className={`${university.logoUrl ? 'hidden' : 'flex'} items-center justify-center w-12 h-12 bg-gradient-to-br from-[#05294E] to-slate-700 rounded-2xl shadow-inner`}
                              style={{ display: university.logoUrl ? 'none' : 'flex' }}
                            >
                              <span className="text-white font-black text-xl uppercase">{university.name.charAt(0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Integrated Universities CTA */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5 }}
              className="mt-14 flex justify-center"
            >
              <Link
                to="/schools"
                aria-label="Ver todas as universidades parceiras"
                className="group relative inline-flex items-center px-8 py-4 rounded-full bg-white text-slate-700 font-extrabold text-sm sm:text-base tracking-wide hover:text-[#05294E] hover:shadow-[0_10px_30px_rgba(5,41,78,0.06)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <span>Conheça +75 universidades parceiras</span>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Premium Features Section */}
        <section className="py-32 bg-white relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 skew-x-12 translate-x-32 z-0 hidden lg:block"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row gap-12 xl:gap-16 items-center">
              {/* Image Column (Desktop) */}
              <div className="w-full lg:w-[45%] order-2 lg:order-1 hidden lg:block">
                <div className="relative">
                  {/* Modern geometric decorations */}
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10"
                  >
                    <img
                      src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/group-students-talking-campus-stairs.webp"
                      alt="Students on campus"
                      className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/5] md:aspect-[16/10] lg:aspect-[4/5]"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Content Column */}
              <div className="w-full lg:w-[55%] order-1 lg:order-2">
                <div className="w-full">
                  <h2 className="text-center lg:text-left text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
                    {t('home.features.titleMain')} {t('home.features.titleHighlight')}
                  </h2>

                  {/* Mobile-only Image (positioned below title and above the items) */}
                  <div className="block lg:hidden mb-8">
                    <div className="relative">
                      {/* Modern geometric decorations */}
                      <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative z-10"
                      >
                        <img
                          src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/group-students-talking-campus-stairs.webp"
                          alt="Students on campus"
                          className="rounded-3xl shadow-2xl w-full object-cover aspect-[16/10]"
                        />
                      </motion.div>
                    </div>
                  </div>

                  {/* Bento Grid Interno */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* Card 1: Opportunities (Vertical Alto) */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      className="md:col-span-1 md:row-span-2 p-6 rounded-2xl bg-white border-2 border-slate-200/80 flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[350px] md:min-h-full"
                    >
                      <div className="flex flex-col justify-center items-center">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">
                          {t('home.features.opportunities.title')}
                        </h3>
                        <p className="text-xs md:text-[13px] text-slate-600 leading-relaxed font-semibold max-w-[280px] md:max-w-[170px] mx-auto">
                          {t('home.features.opportunities.description')}
                        </p>
                      </div>
                    </motion.div>

                    {/* Card 2: Universities (Horizontal Largo) */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="md:col-span-2 p-6 rounded-2xl bg-white border-2 border-slate-200/80 flex flex-col justify-center"
                    >
                      <div className="text-center sm:text-left">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">
                          {t('home.features.universities.title')}
                        </h3>
                        <p className="text-xs md:text-[13px] text-slate-600 leading-relaxed font-semibold">
                          {t('home.features.universities.description')}
                        </p>
                      </div>
                    </motion.div>

                    {/* Card 3: Confidence */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="md:col-span-1 p-6 rounded-2xl bg-white border-2 border-slate-200/80 flex flex-col justify-center"
                    >
                      <div className="text-center sm:text-left">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">
                          {t('home.features.confidence.title')}
                        </h3>
                        <p className="text-xs md:text-[13px] text-slate-600 leading-relaxed font-semibold">
                          {t('home.features.confidence.description')}
                        </p>
                      </div>
                    </motion.div>

                    {/* Card 4: More Than Study */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="md:col-span-1 p-6 rounded-2xl bg-white border-2 border-slate-200/80 flex flex-col justify-center"
                    >
                      <div className="text-center sm:text-left">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">
                          {t('home.features.moreThanStudy.title')}
                        </h3>
                        <p className="text-xs md:text-[13px] text-slate-600 leading-relaxed font-semibold">
                          {t('home.features.moreThanStudy.description')}
                        </p>
                      </div>
                    </motion.div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-32 bg-slate-50 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#05294E]/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                {t('home.threeSteps.title')}
              </h2>
            </div>
            
            {/* Centerpiece Image */}
            <div className="relative mb-6 max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[21/9] lg:aspect-[32/9]"
              >
                <img
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/college_friends_enjoying_the_sun_%20campus_walk.webp"
                  alt="Amigos da faculdade caminhando pelo campus"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>

            {/* Steps typography grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative max-w-6xl mx-auto justify-center">
              {['step1', 'step2', 'step4', 'step5'].map((stepKey, idx) => (
                <motion.div
                  key={stepKey}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * (idx + 1) }}
                  className="bg-white p-8 lg:p-6 rounded-2xl shadow-lg relative overflow-hidden border border-slate-100 flex flex-col justify-between"
                >
                  <div className="relative z-10 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">
                      {t(`home.threeSteps.${stepKey}.title`)}
                    </h3>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      {t(`home.threeSteps.${stepKey}.description`)}
                    </p>
                  </div>
                </motion.div>
              ))}
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

        {/* How It Works Redirect Section (Replaces FAQ) */}
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-[#05294E] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col-reverse lg:flex-row items-stretch">
              {/* Content Side */}
              <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center text-left relative z-20 bg-[#05294E] -mt-12 lg:mt-0 rounded-b-[3rem] lg:rounded-br-none lg:rounded-l-[3rem]">
                
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-8 leading-tight">
                  Ainda tem <span className="text-blue-400">dúvidas</span> sobre o processo?
                </h2>
                
                <p className="text-xl text-blue-100 mb-12 leading-relaxed">
                  Preparamos um guia completo com cada etapa do processo, da escolha da bolsa até a carta de aceite. Simples, claro e com suporte sempre que precisar.
                </p>
                
                <Link
                  to="/how-it-works"
                  className="group inline-flex items-center justify-center bg-white text-[#05294E] px-10 py-5 rounded-2xl text-xl font-black hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-xl w-fit"
                >
                  Ver Como Funciona
                </Link>
              </div>

              {/* Image Side */}
              <div className="lg:w-2/5 relative min-h-[400px] lg:mt-0 z-10">
                <img 
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/reading-room-library-green-lamps.webp" 
                  alt="Reading Room Library"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Overlay gradient to blend with context */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#05294E] via-transparent to-transparent lg:block hidden"></div>
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#05294E] via-[#05294E] to-transparent lg:hidden block"></div>
                <div className="absolute inset-0 bg-[#05294E]/10 lg:hidden block"></div>
              </div>
            </div>
          </div>
        </section>


      </div>
    </>
  );
};

// Social Proof Section Component - Prova Social
const SocialProofSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useTranslation(['home', 'common']);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const testimonials = [
    {
      name: "Mariana Costa",
      type: "Estudante VIP",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
      text: "Consegui minha bolsa para Administração com 60% de desconto. O serviço se pagou no primeiro mês!"
    },
    {
      name: "Rodrigo Santos",
      type: "Membro Premium",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop",
      text: "A consultoria é imbatível. Já economizei mais de $20 mil dólares em anuidades este ano."
    },
    {
      name: "Beatriz Helena",
      type: "Estudante VIP",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop",
      text: "A seleção de universidades é o diferencial. Recebi apenas o que realmente combinava com meu perfil."
    },
    {
      name: "Lucas Oliveira",
      type: "Membro VIP",
      image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop",
      text: "A economia que tive na minha aplicação para o Canadá foi surreal. Melhor investimento!"
    }
  ];

  const maxIndex = isMobile ? testimonials.length - 1 : testimonials.length - 3;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  // Auto-scroll
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [maxIndex]);

  return (
    <section className="bg-slate-50 py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 text-center mb-16 md:mb-20">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Relatos de quem já foi <span className="text-[#D0151C] italic">Aprovado.</span>
        </h2>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 md:px-12 relative">
        <div className="relative w-full" role="region" aria-roledescription="carousel">
          <div className="overflow-hidden rounded-[2rem] py-4">
            <div 
              className="flex transition-transform duration-500 ease-in-out" 
              style={{ transform: `translateX(-${currentIndex * (isMobile ? 100 : 33.333)}%)` }}
            >
              {testimonials.map((testimonial, idx) => (
                <div 
                  key={idx}
                  role="group" 
                  aria-roledescription="slide" 
                  className="min-w-full md:min-w-[33.333%] px-3 flex-shrink-0"
                >
                  <div className="relative h-[480px] overflow-hidden rounded-[2rem] shadow-xl group border border-slate-200">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name} 
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white text-left">
                      <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-base md:text-lg font-medium leading-relaxed mb-6 italic opacity-90">
                        "{testimonial.text}"
                      </p>
                      <div className="border-t border-white/20 pt-6">
                        <h4 className="text-base md:text-lg font-bold tracking-tight">{testimonial.name}</h4>
                        <p className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase mt-1">
                          {testimonial.type}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={prevSlide}
            className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-slate-200 text-slate-600 hover:text-[#D0151C] hover:bg-slate-50 transition-colors bg-white/90 backdrop-blur-sm absolute top-1/2 -translate-y-1/2 left-0 lg:-left-6 z-10 shadow-lg hover:scale-110"
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Previous slide</span>
          </button>
          
          <button 
            onClick={nextSlide}
            className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-slate-200 text-slate-600 hover:text-[#D0151C] hover:bg-slate-50 transition-colors bg-white/90 backdrop-blur-sm absolute top-1/2 -translate-y-1/2 right-0 lg:-right-6 z-10 shadow-lg hover:scale-110"
          >
            <ChevronRight className="h-6 w-6" />
            <span className="sr-only">Next slide</span>
          </button>
        </div>
      </div>
      
      {/* CTA */}
      <div className="text-center mt-16 px-4">
        <button
          onClick={onCTAClick}
          className="inline-flex items-center px-8 py-4 md:px-12 md:py-6 bg-[#D0151C] text-white font-bold text-lg rounded-2xl shadow-xl hover:bg-red-600 hover:scale-105 transition-all duration-300 group"
        >
          {t("forStudents.socialProof.ctaButton")}
        </button>
      </div>
    </section>
  );
};

export default Home;
