import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Star, BookOpen, ChevronRight, Clock, Gift } from 'lucide-react';
import { useTranslationWithFees } from '../hooks/useTranslationWithFees';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { useAuth } from '../hooks/useAuth';
import { useUniversityLogos } from '../hooks/useUniversityLogos';
import SEOHead from '../components/SEO/SEOHead';
import { useWindowSize } from 'usehooks-ts';
import { motion } from 'framer-motion';

const Home: React.FC = () => {
  
  const { t } = useTranslationWithFees(['home', 'dashboard', 'common', 'school']);
  const navigate = useNavigate();
  const location = useLocation();
  const { isBlocked, pendingPayment } = usePaymentBlocked();
  const { universities: partnerUniversities, loading: partnersLoading } = useUniversityLogos();
  const { isAuthenticated, user, userProfile } = useAuth();
  const { width = 0 } = useWindowSize();

  // Dados Estáticos das Bolsas em Destaque
  const STATIC_SCHOLARSHIPS = [
    {
      id: 'b1069ada-917d-4f08-a5d0-3d6592e0a875',
      title: 'Master of Computer Information Systems',
      university: {
        name: 'Caroline University',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/user-avatars/caroline%20loho.png',
      },
      level: 'Mestrado / Pós-Graduação',
      field_of_study: 'STEM Scholarship',
      description: 'STEM Degree Scholarship covers 53% tuition of MCIS program for qualified students. During the enrollment students may apply for full-time or part-time CPT and 3 years OPT upon graduation.'
    },
    {
      id: '8e44fc08-3363-4c5e-a236-572206ecad65',
      title: 'Master of Business Administration',
      university: {
        name: 'Oikos University Los Angeles',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/user-avatars/oikos%20logo.svg',
      },
      level: 'Mestrado / Pós-Graduação',
      field_of_study: 'Leadership Scholarship',
      description: 'Established for students who demonstrate leadership. Award: Up to $4,000 tuition per semester. Eligibility: Must have completed two semesters with a 3.5/4.0 GPA.'
    },
    {
      id: 'aad50945-c9c4-4284-84e7-ca2779dcab1b',
      title: 'Master of Philosophy',
      university: {
        name: 'Caroline University',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/user-avatars/caroline%20loho.png',
      },
      level: 'Mestrado / Pós-Graduação',
      field_of_study: "Dean's Scholarship",
      description: "The Dean's Scholarship covers 15% or more of tuition ONLY. Other fees such as registration, technology fees, etc. are not included in the tuition."
    },
    {
      id: '83f80002-f56f-45d9-90bd-3f7931d78e4e',
      title: 'Bachelor of Arts in Biblical Studies',
      university: {
        name: 'Oikos University Los Angeles',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/user-avatars/oikos%20logo.svg',
      },
      level: 'Graduação / Bacharelado',
      field_of_study: 'Faculty and Staff Scholarship',
      description: 'Established by the faculty and staff of Oikos University for deserving students chosen by the scholarship committee. Award: Up to 10% of tuition per semester.'
    },
    {
      id: '9a010b5e-df72-4a03-ab2e-9f032646ba40',
      title: 'Master of Divinity',
      university: {
        name: 'Oikos University Los Angeles',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/user-avatars/oikos%20logo.svg',
      },
      level: 'Mestrado / Pós-Graduação',
      field_of_study: 'Chaplain Scholarship',
      description: 'Chaplain’s Scholarship has been established to honor students who have vowed and being trained as a professional pastor. Award: Up to 50% of tuition.'
    },
    {
      id: '59daad29-68be-43e3-851c-44ce3c014948',
      title: 'Doctor of Philosophy',
      university: {
        name: 'Oikos University Los Angeles',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/user-avatars/oikos%20logo.svg',
      },
      level: 'Doutorado',
      field_of_study: "President's Sacrificial Scholarship",
      description: "The President's Sacrificial Leadership Scholarship has been established to honor students who have exhibited extraordinary leadership qualities."
    },
    {
      id: 'b7bbfb1c-8e65-4624-84be-b6cae1e5ca18',
      title: 'Master of Business In Business Analytics',
      university: {
        name: 'Adelphi University',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/universities-logo/adelphi-university.png',
      },
      level: 'Mestrado / Pós-Graduação',
      field_of_study: 'STEM',
      description: 'Prepare-se para o mercado com o programa STEM de Business Analytics. Carga horária de 30 Credit hours para formação completa.'
    },
    {
      id: 'fb5e4a34-ba94-41b9-b14f-cd126f8119e7',
      title: 'Master Of Science In Computer Science',
      university: {
        name: 'Anderson University',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/universities-logo/anderson-university.png',
      },
      level: 'Mestrado / Pós-Graduação',
      field_of_study: 'STEM',
      description: 'Aprofunde seus conhecimentos em tecnologia e desenvolvimento de software. Carga horária total de 31 Credit hours.'
    },
    {
      id: 'cfbcc249-da4f-4892-9ecf-a3f9d2e694f7',
      title: 'MBA With Data Analytics Concentration',
      university: {
        name: 'Baptist University of Florida',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/universities-logo/baptist-university-of-florida.png',
      },
      level: 'Mestrado / Pós-Graduação',
      field_of_study: 'STEM',
      description: 'Combine administração de negócios com análise de dados avançada. Carga horária de 36 Credit hours.'
    }
  ];

  const [currentScholarshipIndex, setCurrentScholarshipIndex] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [slideItemWidth, setSlideItemWidth] = useState(0);

  // Array ampliado para simular loop infinito de forma suave
  const infiniteScholarships = Array(15).fill(STATIC_SCHOLARSHIPS).flat();

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
      setCurrentScholarshipIndex((prev) => (prev + 1) % (infiniteScholarships.length - 3));
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
      <div className="bg-white">
        {/* Full-Width Hero Section with Background Image */}
        <section className="relative min-h-[85vh] flex items-center pt-20 overflow-hidden text-white">
          {/* Background Image & Overlays */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/aerial-view-university-campus-quad-stadium.webp" 
              alt="University Campus"
              className="w-full h-full object-cover scale-105"
            />
            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-slate-950/40"></div>
            {/* Main Gradient: From Dark Blue-ish top to Transparent */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#05294E]/60 via-transparent to-transparent"></div>
            {/* Bottom Transition to Slate-50: Stronger fade to eliminate hard edges */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center text-center"
              >
                
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] drop-shadow-2xl max-w-5xl mx-auto">
                  {t('home.hero.title')}
                </h1>
                
                <p className="text-xl md:text-2xl mb-12 text-blue-50 leading-relaxed max-w-4xl mx-auto drop-shadow-lg font-medium">
                  {t('home.hero.description')}
                </p>
                
                <div className="flex flex-col items-center sm:flex-row gap-6 mb-12 w-full justify-center">
                  {/* Dynamic CTA Logic */}
                  {!isAuthenticated ? (
                    <>
                      <Link
                        to={`/register${location.search}`}
                        className="group bg-[#D0151C] hover:bg-[#B01218] text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all duration-300 shadow-2xl hover:shadow-red-500/20 flex items-center justify-center border-0"
                      >
                        {t('home.hero.cta')}
                        <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </>
                  ) : (
                    <>
                      {user?.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee ? (
                        hasPendingSelectionProcessPayment ? (
                          <div className="group bg-amber-500/20 backdrop-blur-md border-2 border-amber-500/40 rounded-2xl p-6 flex flex-col items-center sm:items-start">
                            <div className="flex items-center mb-2">
                              <Clock className="h-6 w-6 text-amber-400 mr-2 animate-spin" />
                              <span className="text-xl font-bold text-white">
                                {t('nav.processingZellePayment')}
                              </span>
                            </div>
                            <p className="text-sm text-amber-100">
                              {t('nav.zellePaymentPending')}
                            </p>
                          </div>
                        ) : (
                          <Link
                            to="/student/onboarding?step=selection_fee"
                            className="group bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all duration-300 shadow-2xl flex items-center justify-center border-0"
                          >
                            {t('nav.startSelectionProcess')}
                            <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        )
                      ) : (
                        <Link
                          to={getDashboardPath()}
                          className="group bg-[#05294E] hover:bg-[#02172B] text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all duration-300 shadow-2xl flex items-center justify-center border-0"
                        >
                          {t('nav.goToDashboard')}
                          <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      )}
                      
                      {user?.role === 'student' && (
                        <motion.button
                          onClick={goToMatriculaRewards}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="group bg-gradient-to-r from-slate-900 to-slate-700 text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all duration-300 shadow-2xl flex items-center justify-center gap-3 border border-white/20"
                        >
                          <Gift className="h-6 w-6 text-yellow-400" />
                          {t('matriculaRewards.visitRewardsStore')}
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                      )}
                    </>
                  )}
                </div>

              </motion.div>
            </div>
          </div>
        </section>

        {/* Highlighted Scholarships Slider Section (Triple View) */}
        {STATIC_SCHOLARSHIPS.length > 0 && (
          <section className="py-24 bg-slate-50 relative overflow-hidden -mt-2 z-10 pt-26">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
                <div className="max-w-2xl text-center md:text-left mx-auto md:mx-0">
                  <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6 leading-tight">
                    {t('home.featuredScholarships.title')}
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed font-medium">
                    {t('home.featuredScholarships.subtitle')}
                  </p>
                </div>
              </div>

              {/* Slider Container */}
              <div 
                className="relative overflow-visible"
                onMouseEnter={() => setIsCarouselHovered(true)}
                onMouseLeave={() => setIsCarouselHovered(false)}
              >
                <div className="overflow-hidden px-4 -mx-4 py-4" ref={sliderRef}>
                  <motion.div 
                    className="flex gap-6 cursor-grab active:cursor-grabbing"
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
                    {infiniteScholarships.map((scholarship, index) => (
                      <div 
                        key={`${scholarship.id}-${index}`}
                        className="flex-shrink-0"
                        style={{ width: slideItemWidth > 0 ? `${slideItemWidth}px` : '100%' }}
                      >
                        <motion.div
                          className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-slate-100 flex flex-col h-[400px] group relative"
                          whileHover={{ y: -10 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Top accent line */}
                          <div className="h-2 bg-gradient-to-r from-[#05294E] to-[#D0151C] opacity-80"></div>


                          {/* Content Part */}
                          <div className="p-8 flex flex-col flex-grow">
                            <div className="text-slate-500 text-xs font-black uppercase tracking-widest mb-3 flex items-center">
                              <span>{scholarship.level}</span>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-4 leading-tight group-hover:text-[#05294E] transition-colors">
                              {scholarship.title}
                            </h3>

                            <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-6">
                              {scholarship.description}
                            </p>
                            
                            <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-[#05294E] transition-colors mb-6">
                              <BookOpen className="h-4 w-4 mr-2" />
                              {scholarship.field_of_study}
                            </div>

                            <div className="mt-auto flex flex-col gap-3">
                              <button
                                onClick={() => navigate('/scholarships')}
                                className="w-full bg-[#05294E]/5 hover:bg-[#05294E]/10 text-[#05294E] py-3.5 rounded-xl font-bold text-center transition-all duration-300 border border-[#05294E]/10"
                              >
                                Mais Detalhes
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    ))}
                  </motion.div>
                </div>

                {/* Navigation Buttons - Sides */}
                <div className="hidden md:block">
                  <button 
                    onClick={() => setCurrentScholarshipIndex((prev) => Math.max(0, prev - 1))}
                    className="absolute -left-8 lg:-left-12 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#05294E] hover:text-white transition-all duration-300 shadow-xl"
                  >
                    <ChevronRight className="h-6 w-6 rotate-180" />
                  </button>
                  <button 
                    onClick={() => setCurrentScholarshipIndex((prev) => (prev + 1) % (infiniteScholarships.length - 3))}
                    className="absolute -right-8 lg:-right-12 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#05294E] hover:text-white transition-all duration-300 shadow-xl"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="mt-12 flex justify-center gap-2">
                {STATIC_SCHOLARSHIPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentScholarshipIndex(idx)}
                    className={`h-1.5 transition-all duration-500 rounded-full ${idx === currentScholarshipIndex % STATIC_SCHOLARSHIPS.length ? 'w-8 bg-[#05294E]' : 'w-2 bg-slate-200'}`}
                  />
                ))}
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
            
            {/* Modern Banner: Text Inside Image */}
            <div className="relative mb-20 group">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative overflow-hidden rounded-[2.5rem] shadow-2xl h-[500px] md:h-[600px]"
              >
                {/* Background Image */}
                <img
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/CAMPUS_5.jpg"
                  alt="Campus Universitário"
                  className="w-full h-full object-cover transition-transform duration-700"
                />
                
                {/* Glassmorphism/Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#05294E] via-[#05294E]/40 to-transparent flex flex-col items-center justify-center text-center px-6 md:px-12">
                  <div className="max-w-4xl backdrop-blur-sm bg-white/5 p-8 md:p-12 rounded-3xl border border-white/10">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
                      {t('home.trustedUniversities.titleMain')} <span className="text-[#D0151C]">{t('home.trustedUniversities.titleHighlight')}</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-blue-50 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                      {t('home.trustedUniversities.description')}
                    </p>
                  </div>
                </div>
              </motion.div>
              
              {/* Decorative elements around the banner */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#D0151C]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#05294E]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
            </div>

            {/* University Logos Grid */}
            <div className="relative">
              {/* Loading State */}
              {partnersLoading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {Array.from({ length: 15 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                      <div className="animate-pulse">
                        <div className="bg-slate-100 h-20 w-full rounded-xl mb-6"></div>
                        <div className="bg-slate-100 h-4 w-3/4 rounded mx-auto"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* University Cards */}
              {!partnersLoading && (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8"
                >
                  {partnerUniversities.map((university, index) => (
                    <motion.div 
                      key={index}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        show: { opacity: 1, y: 0 }
                      }}
                      className="group relative bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#05294E]/10 transition-all duration-500 overflow-hidden"
                    >
                      {/* Elegant background highlight on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="relative z-10 flex flex-col items-center justify-center">
                        <div className="h-20 w-full flex items-center justify-center transition-all duration-500 transform group-hover:scale-110">
                          {university.isLoading ? (
                            <div className="animate-pulse bg-slate-100 h-full w-full rounded-2xl"></div>
                          ) : university.logoUrl ? (
                            <img
                              src={university.logoUrl}
                              alt={`${university.name} logo`}
                              className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-700 opacity-70 group-hover:opacity-100"
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
                            className={`${university.logoUrl ? 'hidden' : 'flex'} items-center justify-center w-16 h-16 bg-gradient-to-br from-[#05294E] to-slate-700 rounded-2xl shadow-inner`}
                            style={{ display: university.logoUrl ? 'none' : 'flex' }}
                          >
                            <span className="text-white font-black text-2xl uppercase">{university.name.charAt(0)}</span>
                          </div>
                        </div>
                        
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* 75+ Universities Indicator */}
            <div className="flex justify-center mt-12">
              <div className="inline-flex items-center px-6 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-bold text-sm shadow-sm">
                75+ Universidades Parceiras
              </div>
            </div>

            {/* Call to Action Button - Moved below grid */}
            <div className="text-center pt-16">
              <Link
                to="/schools"
                className="group inline-flex items-center bg-[#05294E] text-white px-12 py-5 rounded-2xl text-xl font-bold hover:bg-[#02172B] transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                Ver Todas as Universidades
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Premium Features Section */}
        <section className="py-32 bg-white relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 skew-x-12 translate-x-32 z-0 hidden lg:block"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              {/* Image Column */}
              <div className="w-full lg:w-1/2 order-2 lg:order-1">
                <div className="relative">
                  {/* Modern geometric decorations */}
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                  
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
              <div className="w-full lg:w-1/2 order-1 lg:order-2">
                <div className="max-w-xl">
                  <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-8 leading-tight">
                    {t('home.features.titleMain')} <span className="text-[#D0151C]">{t('home.features.titleHighlight')}</span>
                  </h2>
                  
                  <div className="flex flex-col gap-6">
                    {/* Featured Item: Exclusive Scholarships */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 }}
                      className="p-8 rounded-3xl bg-gradient-to-br from-[#D0151C]/5 to-white border border-[#D0151C]/10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                      {/* Decorative red glow */}
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D0151C]/5 rounded-full blur-3xl group-hover:bg-[#D0151C]/10 transition-colors"></div>
                      
                      <div className="relative z-10">
                        <h3 className="text-2xl font-black text-slate-900 mb-4">{t('home.features.exclusiveScholarships.title')}</h3>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium max-w-lg">
                          {t('home.features.exclusiveScholarships.description')}
                        </p>
                      </div>
                    </motion.div>

                    {/* Bottom Grid for secondary items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Fast Process */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <h3 className="font-bold text-slate-900 mb-2">{t('home.features.fastProcess.title')}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                          {t('home.features.fastProcess.description')}
                        </p>
                      </motion.div>

                      {/* Personal Support */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <h3 className="font-bold text-slate-900 mb-2">{t('home.features.personalSupport.title')}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                          {t('home.features.personalSupport.description')}
                        </p>
                      </motion.div>
                    </div>
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
            <div className="relative mb-24 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[16/9] lg:aspect-[21/9] group"
              >
                <img
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/student-couple-graduation-diploma-campus.webp"
                  alt="Casal de estudantes comemorando a graduação"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                {/* Premium gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/60 via-transparent to-transparent"></div>
              </motion.div>
            </div>

            {/* Steps typography grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative max-w-6xl mx-auto">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white p-10 rounded-[2rem] shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100"
              >
                <div className="absolute -top-6 -right-6 text-[12rem] font-black text-slate-50 group-hover:text-blue-50 transition-colors duration-500 pointer-events-none leading-none select-none">
                  1
                </div>
                <div className="relative z-10">
                  <div className="text-[#05294E] font-black text-xl mb-4 tracking-widest">01</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{t('home.threeSteps.step1.title')}</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {t('home.threeSteps.step1.description')}
                  </p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white p-10 rounded-[2rem] shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100"
              >
                <div className="absolute -top-6 -right-6 text-[12rem] font-black text-slate-50 group-hover:text-red-50 transition-colors duration-500 pointer-events-none leading-none select-none">
                  2
                </div>
                <div className="relative z-10">
                  <div className="text-[#D0151C] font-black text-xl mb-4 tracking-widest">02</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{t('home.threeSteps.step2.title')}</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {t('home.threeSteps.step2.description')}
                  </p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-white p-10 rounded-[2rem] shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100"
              >
                <div className="absolute -top-6 -right-6 text-[12rem] font-black text-slate-50 group-hover:text-green-50 transition-colors duration-500 pointer-events-none leading-none select-none">
                  3
                </div>
                <div className="relative z-10">
                  <div className="text-green-600 font-black text-xl mb-4 tracking-widest">03</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{t('home.threeSteps.step3.title')}</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {t('home.threeSteps.step3.description')}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Success Wall */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Header */}
            <div className="text-center mb-12">

              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                {t('home.successWall.title.part1')}{' '}
                <em className="text-[#D0151C] not-italic font-black">
                  {t('home.successWall.title.highlight')}
                </em>
              </h2>
              <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
                {t('home.successWall.subtitle')}
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                { num: '+1.200', label: t('home.successWall.stats.enrolled') },
                { num: '98%',    label: t('home.successWall.stats.approval') },
                { num: '47',     label: t('home.successWall.stats.universities') },
              ].map((s) => (
                <div key={s.num} className="bg-white border border-slate-200 rounded-full px-5 py-2 text-center shadow-sm">
                  <span className="block text-lg font-bold text-[#05294E]">{s.num}</span>
                  <span className="text-xs text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Masonry Grid */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-5">

              {/* Card — Foto com imagem real */}
              <div className="break-inside-avoid bg-white border border-slate-200 rounded-3xl overflow-hidden mb-5 hover:shadow-xl transition-all duration-300 group">
                <div className="h-48 bg-blue-50 flex items-center justify-center relative">
                  <img
                    src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
                    alt={t('home.successWall.card1.author')}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg border-4 border-white"
                  />
                  <span className="absolute bottom-2 text-xs font-bold text-slate-400 bg-white/90 px-3 py-1 rounded-full uppercase tracking-wider">
                    {t('home.successWall.photoLabel')}
                  </span>
                </div>
                <div className="p-5">
                  <span className="inline-block text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-3 py-1 rounded-full mb-3">
                    {t('home.successWall.tagPhoto')}
                  </span>
                  <p className="text-slate-600 text-sm leading-relaxed italic mb-4">
                    "{t('home.successWall.card1.text')}"
                  </p>
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop"
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t('home.successWall.card1.author')}</p>
                      <p className="text-xs font-semibold text-[#05294E]">{t('home.successWall.card1.field')}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-yellow-400 fill-current" />)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card — Vídeo */}
              <div className="break-inside-avoid bg-white border border-slate-200 rounded-3xl overflow-hidden mb-5 hover:shadow-xl transition-all duration-300">
                <div className="h-40 bg-rose-50 flex flex-col items-center justify-center gap-2 relative cursor-pointer">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-[#D0151C] ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('home.successWall.videoLabel')}
                  </span>
                </div>
                <div className="p-5">
                  <span className="inline-block text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 px-3 py-1 rounded-full mb-3">
                    {t('home.successWall.tagVideo')}
                  </span>
                  <p className="text-slate-600 text-sm leading-relaxed italic mb-4">
                    "{t('home.successWall.card2.text')}"
                  </p>
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop"
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t('home.successWall.card2.author')}</p>
                      <p className="text-xs font-semibold text-[#D0151C]">{t('home.successWall.card2.field')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card — Depoimento puro */}
              <div className="break-inside-avoid bg-white border border-slate-200 rounded-3xl overflow-hidden mb-5 hover:shadow-xl transition-all duration-300">
                <div className="p-6">
                  <span className="inline-block text-xs font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full mb-4">
                    {t('home.successWall.tagTestimonial')}
                  </span>
                  <p className="text-slate-700 text-base leading-relaxed italic mb-5">
                    "{t('home.successWall.card3.text')}"
                  </p>
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop"
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t('home.successWall.card3.author')}</p>
                      <p className="text-xs font-semibold text-green-600">{t('home.successWall.card3.field')}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-yellow-400 fill-current" />)}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* How It Works Redirect Section (Replaces FAQ) */}
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-[#05294E] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row items-stretch">
              {/* Content Side */}
              <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center text-left">
                
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-8 leading-tight">
                  Ainda tem <span className="text-blue-400">dúvidas</span> sobre o processo?
                </h2>
                
                <p className="text-xl text-blue-100 mb-12 leading-relaxed">
                  Criamos um guia detalhado explicando cada etapa, desde a escolha da bolsa até o embarque para os Estados Unidos. Entenda como funciona o nosso suporte e para planejar seu futuro com segurança.
                </p>
                
                <Link
                  to="/how-it-works"
                  className="group inline-flex items-center justify-center bg-white text-[#05294E] px-10 py-5 rounded-2xl text-xl font-black hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-xl w-fit"
                >
                  Ver Como Funciona
                </Link>
              </div>

              {/* Image Side */}
              <div className="lg:w-2/5 relative min-h-[400px]">
                <img 
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/reading-room-library-green-lamps.webp" 
                  alt="Reading Room Library"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Overlay gradient to blend with context */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#05294E] via-transparent to-transparent lg:block hidden"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#05294E] via-transparent to-transparent lg:hidden block"></div>
              </div>
            </div>
          </div>
        </section>


      </div>
    </>
  );
};

export default Home;