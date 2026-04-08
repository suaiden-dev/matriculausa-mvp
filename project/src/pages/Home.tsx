import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Star, BookOpen, ChevronRight, GraduationCap, Clock, Gift } from 'lucide-react';
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
      id: 'static-1',
      title: 'Business Administration & Leadership',
      university: {
        name: 'Golden Gate University',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/golden-gate-university.png',
      },
      level: 'Graduação / Mestrado',
      field_of_study: 'Negócios',
      description: 'Prepare-se para cargos de liderança global com um currículo focado em estratégia, finanças e gestão inovadora no coração de San Francisco.'
    },
    {
      id: 'static-2',
      title: 'Contemporary Music Performance',
      university: {
        name: 'California College of Music',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/logo%20ccm.jpg',
      },
      level: 'Certificado / Graduação',
      field_of_study: 'Artes e Música',
      description: 'Desenvolva seu talento musical com professores que são profissionais da indústria em Los Angeles, em um ambiente focado em performance e produção.'
    },
    {
      id: 'static-3',
      title: 'Ciência da Computação & Engenharia',
      university: {
        name: 'University of South Florida',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/university-default-2024.jpg.jpg',
      },
      level: 'Graduação / Mestrado',
      field_of_study: 'Tecnologia',
      description: 'Participe de pesquisas de ponta e projetos práticos em tecnologias emergentes, IA e cibersegurança em uma das universidades que mais cresce nos EUA.'
    },
    {
      id: 'static-4',
      title: 'Global MBA Executive',
      university: {
        name: 'Westcliff University',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/westcliff-logo.png',
      },
      level: 'Mestrado Profissional',
      field_of_study: 'Administração',
      description: 'Um programa flexível desenhado para profissionais que buscam expandir sua rede de contatos internacional e dominar as práticas modernas de mercado.'
    },
    {
      id: 'static-5',
      title: 'Professional Pilot & Aviation',
      university: {
        name: 'Accelerated Flight Training',
        logo_url: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/university-default-2024.jpg.jpg',
      },
      level: 'Treinamento Profissional',
      field_of_study: 'Aviação',
      description: 'Conquiste suas licenças de voo em tempo recorde com treinamento intensivo e simuladores de última geração na ensolarada Flórida.'
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
        const totalGapWidth = gap * (visibleCols - 1);
        const containerW = sliderRef.current.clientWidth;
        setSlideItemWidth((containerW - totalGapWidth) / visibleCols);
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
            {/* Bottom Gradient to White for Section Transition */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-100"></div>
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
          <section className="py-24 bg-slate-50 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
                <div className="max-w-2xl text-center md:text-left">
                  <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6 leading-tight">
                    {t('home.featuredScholarships.title')}
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed font-medium">
                    {t('home.featuredScholarships.subtitle')}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCurrentScholarshipIndex((prev) => (prev - 1 + STATIC_SCHOLARSHIPS.length) % STATIC_SCHOLARSHIPS.length)}
                    className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-[#05294E] hover:text-white transition-all duration-300 shadow-sm"
                  >
                    <ChevronRight className="h-6 w-6 rotate-180" />
                  </button>
                  <button 
                    onClick={() => setCurrentScholarshipIndex((prev) => (prev + 1) % STATIC_SCHOLARSHIPS.length)}
                    className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-[#05294E] hover:text-white transition-all duration-300 shadow-sm"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
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
                    className="flex gap-6"
                    animate={{ 
                      x: -(currentScholarshipIndex * (slideItemWidth + 24)) // 24px is gap-6
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {infiniteScholarships.map((scholarship, index) => (
                      <div 
                        key={`${scholarship.id}-${index}`}
                        className="flex-shrink-0"
                        style={{ width: slideItemWidth > 0 ? `${slideItemWidth}px` : '100%' }}
                      >
                        <motion.div
                          className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-slate-100 flex flex-col h-[580px] group relative"
                          whileHover={{ y: -10 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Top Part: Placeholder instead of Image */}
                          <div className="h-32 relative overflow-hidden bg-gradient-to-br from-[#05294E] to-slate-900 flex items-center justify-center">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] group-hover:scale-110 transition-transform duration-700"></div>
                            <div className="relative z-10">
                              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                                <GraduationCap className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            
                          </div>

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
                              <Link
                                to={isAuthenticated ? "/student/dashboard" : "/register"}
                                className="w-full bg-[#D0151C] hover:bg-[#B01218] text-white py-3.5 rounded-xl font-black text-center transition-all duration-300 shadow-lg hover:shadow-red-500/20"
                              >
                                Fazer Inscrição
                              </Link>
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

        {/* Stats Section */}
        {/* Removed as per instructions */}

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
                    <div key={index} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                      <div className="animate-pulse">
                        <div className="bg-slate-200 h-20 w-full rounded-xl mb-6"></div>
                        <div className="bg-slate-200 h-4 w-3/4 rounded mx-auto"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* University Cards */}
              {!partnersLoading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {partnerUniversities.map((university, index) => (
                    <div 
                      key={index} 
                      className="group bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#05294E]/20 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
                    >
                      <div className="relative h-16 flex items-center justify-center overflow-hidden rounded-xl transition-colors duration-300">
                        {university.isLoading ? (
                          <div className="animate-pulse bg-slate-200 h-full w-full rounded-xl"></div>
                        ) : university.logoUrl ? (
                          <img
                            src={university.logoUrl}
                            alt={`${university.name} logo`}
                            className="max-h-full max-w-36 bg-inherit object-contain filter group-hover:scale-110 transition-transform duration-500"
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
                          className={`${university.logoUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full bg-gradient-to-br from-[#05294E] to-slate-700 rounded-xl`}
                          style={{ display: university.logoUrl ? 'none' : 'flex' }}
                        >
                          <span className="text-white font-bold text-lg">U</span>
                        </div>
                      </div>

                      {/* Hover Effect Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/5 to-[#D0151C]/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  ))}
                </div>
              )}

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

        {/* Testimonials */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                {t('home.successStories.title')}
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                {t('home.successStories.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
                <div className="flex items-center mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                  "{t('home.successStories.testimonial1.text')}"
                </p>
                <div className="flex items-center">
                  <img
                    src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2&fit=crop"
                    alt={t('home.successStories.testimonial1.author')}
                    className="w-14 h-14 rounded-2xl mr-4 shadow-lg object-cover"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{t('home.successStories.testimonial1.author')}</div>
                    <div className="text-sm text-[#05294E] font-medium">{t('home.successStories.testimonial1.field')}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
                <div className="flex items-center mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                  "{t('home.successStories.testimonial2.text')}"
                </p>
                <div className="flex items-center">
                  <img
                    src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2&fit=crop"
                    alt={t('home.successStories.testimonial2.author')}
                    className="w-14 h-14 rounded-2xl mr-4 shadow-lg object-cover"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{t('home.successStories.testimonial2.author')}</div>
                    <div className="text-sm text-[#D0151C] font-medium">{t('home.successStories.testimonial2.field')}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
                <div className="flex items-center mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                  "{t('home.successStories.testimonial3.text')}"
                </p>
                <div className="flex items-center">
                  <img
                    src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2&fit=crop"
                    alt={t('home.successStories.testimonial3.author')}
                    className="w-14 h-14 rounded-2xl mr-4 shadow-lg object-cover"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{t('home.successStories.testimonial3.author')}</div>
                    <div className="text-sm text-green-600 font-medium">{t('home.successStories.testimonial3.field')}</div>
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