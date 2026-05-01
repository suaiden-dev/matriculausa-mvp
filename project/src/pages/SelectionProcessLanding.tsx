import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import FAQSection from '../components/FAQSection';
import '../styles/scrollbar.css';
import { 
  GraduationCap, 
  CheckCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BookOpen,
  X,
  Briefcase
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const SelectionProcessLanding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTAClick = () => {
    if (user) {
      navigate('/student/dashboard/scholarships');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Scroll Progress Bar */}
      {/* <ScrollProgress /> */}
      
      {/* Hero Section */}
      <HeroSection onCTAClick={handleCTAClick} />
      
      {/* Featured Scholarships Section */}
      <FeaturedScholarshipsSection onCTAClick={handleCTAClick} />

      {/* How It Works Section */}
      <HowItWorksSection onCTAClick={handleCTAClick} />

      {/* Features/Benefits Section */}
      <FeaturesSection />
      
      {/* Social Proof Section */}
      <SocialProofSection onCTAClick={handleCTAClick} />
      
      {/* Comparison Section */}
      <ComparisonSection onCTAClick={handleCTAClick} />
      
      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm font-medium">
            © 2026 Matrícula USA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Hero Section Component
const HeroSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation(['home', 'common']);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <motion.section
      ref={ref}
      className="relative flex w-full flex-col-reverse md:flex-col overflow-hidden bg-gradient-to-br from-[#05294E] via-[#05294E] to-[#0a3a62] text-white min-h-[90vh]"
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Background Elements for extra aesthetics */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col md:flex-row flex-1">
        {/* Left Side: Content */}
        <div className="flex w-full flex-col justify-center items-center text-center md:items-start md:text-left px-6 py-16 md:w-1/2 lg:w-[55%] md:pr-12 lg:px-8 xl:px-12">
            <div>
                <motion.main variants={containerVariants}>
                    <motion.h1 className="text-5xl font-black leading-tight md:text-7xl tracking-tight text-center md:text-left" variants={itemVariants}>
                        <span className="block">{t("forStudents.hero.title")}</span>
                        <span className="block text-[#D0151C] mt-1">
                          {t("forStudents.hero.titleHighlight")}
                        </span>
                    </motion.h1>
                    
                    <motion.div className="my-8 h-2 w-32 bg-[#D0151C] rounded-full mx-auto md:mx-0" variants={itemVariants}></motion.div>
                    
                    <motion.div 
                      className="mb-12 max-w-2xl text-xl md:text-2xl text-slate-200 leading-relaxed font-medium text-center md:text-left" 
                      variants={itemVariants}
                      dangerouslySetInnerHTML={{ __html: t("forStudents.hero.description") }}
                    />
                    
                    <motion.div variants={itemVariants}>
                      <motion.button
                        onClick={onCTAClick}
                        whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(208, 21, 28, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-10 py-6 bg-[#D0151C] text-white font-bold text-lg rounded-2xl shadow-xl hover:bg-red-600 transition-all duration-300 group"
                      >
                        {t("forStudents.hero.ctaButton")}
                      </motion.button>
                    </motion.div>
                </motion.main>
            </div>


        </div>
      </div>

      {/* Right Side: Image with Clip Path Animation */}
      <motion.div 
        className="w-full min-h-[400px] md:min-h-full md:absolute md:right-0 md:top-0 md:bottom-0 md:w-1/2 lg:w-[45%] bg-cover bg-center"
        style={{ 
          backgroundImage: `url('pexels-tamhoang139-1007066.jpg')`,
        }}
        initial={{ clipPath: isMobile ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' : 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
        animate={inView ? { clipPath: isMobile ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' : 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' } : {}}
        transition={{ duration: 1.2, ease: "circOut", delay: 0.3 }}
      >
      </motion.div>
    </motion.section>
  );
};

const scholarshipsData = [
    {
      id: 1,
      university: "Harvard University",
      course: "Engenharia de Software",
      degree: "Bacharelado",
      duration: "4 anos",
      modality: "Presencial",
      workAuth: ["CPT", "OPT"],
      originalPrice: "U$ 24.500/ano",
      discountedPrice: "U$ 8.500/ano",
      monthlyPrice: "U$ 708/mês",
      originalMonthlyPrice: "U$ 2.041/mês",
      image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=800",
      discount: "-65%",
      tag: "VIP"
    },
    {
      id: 2,
      university: "MIT",
      course: "Ciência da Computação",
      degree: "Mestrado",
      duration: "2 anos",
      modality: "Presencial",
      workAuth: ["CPT", "OPT"],
      originalPrice: "U$ 26.000/ano",
      discountedPrice: "U$ 9.800/ano",
      monthlyPrice: "U$ 816/mês",
      originalMonthlyPrice: "U$ 2.166/mês",
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800",
      discount: "-62%",
      tag: "PREMIUM"
    },
    {
      id: 3,
      university: "Stanford University",
      course: "Administração (MBA)",
      degree: "Mestrado",
      duration: "2 anos",
      modality: "Presencial",
      workAuth: ["CPT", "OPT"],
      originalPrice: "U$ 28.500/ano",
      discountedPrice: "U$ 11.200/ano",
      monthlyPrice: "U$ 933/mês",
      originalMonthlyPrice: "U$ 2.375/mês",
      image: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&q=80&w=800",
      discount: "-60%",
      tag: "VIP"
    },
    {
      id: 4,
      university: "Oxford University",
      course: "Relações Internacionais",
      degree: "Bacharelado",
      duration: "3 anos",
      modality: "Híbrido",
      workAuth: ["CPT"],
      originalPrice: "U$ 18.000/ano",
      discountedPrice: "U$ 7.500/ano",
      monthlyPrice: "U$ 625/mês",
      originalMonthlyPrice: "U$ 1.500/mês",
      image: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&q=80&w=800",
      discount: "-58%",
      tag: "PREMIUM"
    },
    {
      id: 5,
      university: "University of Toronto",
      course: "Engenharia Civil",
      degree: "Bacharelado",
      duration: "4 anos",
      modality: "Presencial",
      workAuth: ["CPT", "OPT"],
      originalPrice: "U$ 16.500/ano",
      discountedPrice: "U$ 6.900/ano",
      monthlyPrice: "U$ 575/mês",
      originalMonthlyPrice: "U$ 1.375/mês",
      image: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&q=80&w=800",
      discount: "-58%",
      tag: "VIP"
    },
    {
      id: 6,
      university: "UCLA",
      course: "Cinema e Televisão",
      degree: "Bacharelado",
      duration: "4 anos",
      modality: "Presencial",
      workAuth: ["CPT", "OPT"],
      originalPrice: "U$ 22.000/ano",
      discountedPrice: "U$ 10.500/ano",
      monthlyPrice: "U$ 875/mês",
      originalMonthlyPrice: "U$ 1.833/mês",
      image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=800",
      discount: "-52%",
      tag: "PREMIUM"
    },
    {
      id: 7,
      university: "Cambridge University",
      course: "Direito",
      degree: "Mestrado",
      duration: "2 anos",
      modality: "Híbrido",
      workAuth: ["CPT"],
      originalPrice: "U$ 19.500/ano",
      discountedPrice: "U$ 8.200/ano",
      monthlyPrice: "U$ 683/mês",
      originalMonthlyPrice: "U$ 1.625/mês",
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800",
      discount: "-58%",
      tag: "VIP"
    },
    {
      id: 8,
      university: "Yale University",
      course: "Economia",
      degree: "Bacharelado",
      duration: "4 anos",
      modality: "Presencial",
      workAuth: ["CPT", "OPT"],
      originalPrice: "U$ 25.000/ano",
      discountedPrice: "U$ 12.000/ano",
      monthlyPrice: "U$ 1.000/mês",
      originalMonthlyPrice: "U$ 2.083/mês",
      image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800",
      discount: "-52%",
      tag: "PREMIUM"
    },
    {
      id: 9,
      university: "University of Melbourne",
      course: "Ciências Biológicas",
      degree: "Bacharelado",
      duration: "3 anos",
      modality: "Presencial",
      workAuth: ["CPT", "OPT"],
      originalPrice: "U$ 14.000/ano",
      discountedPrice: "U$ 5.500/ano",
      monthlyPrice: "U$ 458/mês",
      originalMonthlyPrice: "U$ 1.166/mês",
      image: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&q=80&w=800",
      discount: "-60%",
      tag: "VIP"
    },
    {
      id: 10,
      university: "ETH Zurich",
      course: "Robótica",
      degree: "Mestrado",
      duration: "2 anos",
      modality: "Presencial",
      workAuth: ["CPT", "OPT"],
      originalPrice: "U$ 12.500/ano",
      discountedPrice: "U$ 4.800/ano",
      monthlyPrice: "U$ 400/mês",
      originalMonthlyPrice: "U$ 1.041/mês",
      image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800",
      discount: "-60%",
      tag: "PREMIUM"
    }
  ];

// Featured Scholarships Section Component
const FeaturedScholarshipsSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [itemsPerView, setItemsPerView] = React.useState(1);
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width >= 768) setItemsPerView(3);
      else if (width >= 640) setItemsPerView(2);
      else setItemsPerView(1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, scholarshipsData.length - itemsPerView);

  const scroll = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
    } else {
      setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    }
  };

  const scrollTo = (index: number) => {
    setCurrentIndex(Math.min(index, maxIndex));
  };

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    }, 5000);
    return () => clearInterval(timer);
  }, [maxIndex]);

  return (
    <section className="bg-slate-50/50 py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#05294E] text-center md:text-left">
            +154 Bolsas Exclusivas
          </h2>
          <button 
            onClick={onCTAClick}
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-[#05294E] text-white rounded-xl font-bold text-lg hover:bg-[#D0151C] transition-all group shadow-lg hover:shadow-xl active:scale-95"
          >
            Descobrir mais Bolsas
          </button>
        </div>

        <div className="relative">
          {/* Navigation Buttons */}
          <button 
            onClick={() => scroll('left')}
            className="absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2 z-20 h-12 w-12 hidden md:flex items-center justify-center rounded-full bg-white text-slate-500 shadow-xl border border-slate-100 transition-all hover:bg-[#D0151C] hover:text-white hover:scale-110 active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button 
            onClick={() => scroll('right')}
            className="absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2 z-20 h-12 w-12 hidden md:flex items-center justify-center rounded-full bg-white text-slate-500 shadow-xl border border-slate-100 transition-all hover:bg-[#D0151C] hover:text-white hover:scale-110 active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="overflow-hidden px-4 md:px-0">
            <div className="flex gap-4 md:gap-6 pt-4 pb-6">
            {scholarshipsData.map((item, index) => (
              <motion.div 
                key={item.id} 
                animate={{ 
                  x: isMobile 
                    ? `calc(-${currentIndex * 100}% - ${currentIndex * 16}px)`
                    : `calc(-${currentIndex * 100}% - ${currentIndex * 24}px)`,
                  scale: currentIndex === index ? 1 : 0.95,
                  opacity: 1,
                }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="flex-none w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-16px)]"
              >
                <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.course} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    <div className="absolute left-3 top-3 flex gap-2">
                      <div className="inline-flex items-center rounded-full px-2.5 py-0.5 transition-colors border-transparent bg-[#D0151C] text-white font-body text-xs font-semibold shadow-sm">
                        {item.discount}
                      </div>
                    </div>
                    
                    <div className="absolute bottom-3 left-3">
                      <h3 className="text-2xl font-bold text-white tracking-tight">{item.course}</h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    {/* Header Info: Degree Badge */}
                    <div className="mb-4 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#05294E]/5 text-[#05294E] border border-[#05294E]/10 flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-[#05294E]/60" />
                        {item.degree}
                      </span>
                    </div>

                    {/* Info Rows */}
                    <div className="space-y-3.5 mb-6">
                      {/* Duration */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Duração</span>
                        </div>
                        <span className="font-semibold text-[#05294E]">{item.duration}</span>
                      </div>

                      {/* Modality */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Modalidade</span>
                        </div>
                        <span className="font-semibold text-[#05294E]">{item.modality}</span>
                      </div>

                      {/* Work Authorization (CPT/OPT) */}
                      {item.workAuth && (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            <span>Permissão de Trabalho</span>
                          </div>
                          <div className="flex gap-1">
                            {item.workAuth.map((auth, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                {auth}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-slate-400 line-through">{item.originalMonthlyPrice}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-black leading-none text-green-600">{item.monthlyPrice}</p>
                          <span className="text-sm font-bold text-slate-500">|</span>
                          <p className="text-sm font-bold text-slate-500 whitespace-nowrap">{item.discountedPrice}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          </div>
      </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mt-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 transition-all duration-300 rounded-full ${
                currentIndex === index 
                  ? "w-8 bg-[#D0151C]" 
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-14 flex md:hidden justify-center px-4">
          <button 
            onClick={onCTAClick}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#05294E] text-white rounded-xl font-bold text-lg hover:bg-[#D0151C] transition-all group shadow-lg hover:shadow-xl active:scale-95"
          >
            Descobrir mais Bolsas
          </button>
        </div>
      </div>
    </section>
  );
};

// Features Section Component (adapted from user's Bento code)
const FeaturesSection: React.FC = () => {
  const { t } = useTranslation(['home', 'common']);

  const features = [
    { 
      title: t("forStudents.benefits.benefits.economy.title"), 
      blurb: t("forStudents.benefits.benefits.economy.description"), 
      meta: t("forStudents.benefits.benefits.economy.highlight"),
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80"
    },
    { 
      title: t("forStudents.benefits.benefits.fastApproval.title"), 
      blurb: t("forStudents.benefits.benefits.fastApproval.description"), 
      meta: t("forStudents.benefits.benefits.fastApproval.highlight") 
    },
    { 
      title: t("forStudents.benefits.benefits.hybridMode.title"), 
      blurb: t("forStudents.benefits.benefits.hybridMode.description"), 
      meta: t("forStudents.benefits.benefits.hybridMode.highlight") 
    },
    { 
      title: t("forStudents.benefits.benefits.multipleOpportunities.title"), 
      blurb: t("forStudents.benefits.benefits.multipleOpportunities.description"), 
      meta: t("forStudents.benefits.benefits.multipleOpportunities.highlight") 
    },
    { 
      title: t("forStudents.benefits.benefits.guaranteed.title"), 
      blurb: t("forStudents.benefits.benefits.guaranteed.description"), 
      meta: t("forStudents.benefits.benefits.guaranteed.highlight") 
    },
    { 
      title: t("forStudents.benefits.benefits.support.title"), 
      blurb: t("forStudents.benefits.benefits.support.description"), 
      meta: t("forStudents.benefits.benefits.support.highlight") 
    }
  ];

  const spans = [
    "md:col-span-4 md:row-span-2",
    "md:col-span-2 md:row-span-1",
    "md:col-span-2 md:row-span-1",
    "md:col-span-2 md:row-span-1",
    "md:col-span-2 md:row-span-1",
    "md:col-span-2 md:row-span-1",
  ];

  return (
    <div className="w-full relative overflow-hidden bg-white">
      <section className="relative mx-auto max-w-6xl px-6 py-24 z-10">
        <header className="relative mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#05294E]">{t("forStudents.benefits.title")}</h2>
        </header>

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-6 auto-rows-[minmax(120px,auto)]">
          {features.map((f, i) => (
            <BentoCard key={i} span={spans[i]} title={f.title} blurb={f.blurb} meta={f.meta} image={(f as any).image} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BentoCard({ span = "", title, blurb, meta, image }: { span?: string, title: string, blurb: string, meta?: string, image?: string }) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 transition hover:border-slate-300 hover:shadow-md flex flex-col ${span}`}
    >
      {image && (
        <div className="relative h-48 md:h-64 w-full overflow-hidden">
          <img 
            src={image} 
            alt={title} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        </div>
      )}
      <div className="p-6 flex flex-col flex-1 items-center text-center md:items-start md:text-left">
        <header className="mb-4 flex flex-col md:flex-row items-center md:items-start justify-between gap-3 w-full">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h3 className="text-2xl font-bold leading-tight text-[#05294E] group-hover:text-[#D0151C] transition-colors tracking-tight">
              {title}
            </h3>
          </div>
          {meta && (
            <span className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs uppercase tracking-wider text-slate-600 bg-white shadow-sm font-medium">
              {meta}
            </span>
          )}
        </header>
        <p className="text-base md:text-lg text-slate-600 max-w-prose leading-relaxed mt-2 text-center md:text-left">{blurb}</p>
      </div>

      {/* Subtle background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/0 to-slate-100/0 group-hover:from-slate-100/50 group-hover:to-transparent transition-all duration-500 rounded-2xl -z-10" />
    </article>
  );
}

// Timeline Component Internal
interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstDotRef = useRef<HTMLDivElement>(null);
  const lastDotRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [lineBounds, setLineBounds] = useState({ top: 0, height: 0 });

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref, data]);

  useEffect(() => {
    if (firstDotRef.current && lastDotRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const firstRect = firstDotRef.current.getBoundingClientRect();
      const lastRect = lastDotRef.current.getBoundingClientRect();
      
      const top = firstRect.top + firstRect.height / 2 - containerRect.top;
      const bottom = lastRect.top + lastRect.height / 2 - containerRect.top;
      
      setLineBounds({ top, height: bottom - top });
    }
  }, [height, data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, lineBounds.height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full bg-white font-sans md:px-10"
      ref={containerRef}
    >
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => {
          const itemRef = useRef(null);
          const { scrollYProgress: itemProgress } = useScroll({
            target: itemRef,
            offset: ["start 80%", "start 20%"]
          });
          const titleOpacity = useTransform(itemProgress, [0, 0.5, 1], [0.5, 1, 0.5]);
          const scale = useTransform(itemProgress, [0, 0.5, 1], [0.9, 1, 0.9]);

          return (
            <div
              key={index}
              ref={itemRef}
              className={`flex justify-start ${index === 0 ? 'pt-10 md:pt-10' : 'pt-10 md:pt-40'} md:gap-6`}
            >
              <div className="sticky flex flex-col md:flex-row z-40 items-start md:items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
                <div 
                  ref={index === 0 ? firstDotRef : index === data.length - 1 ? lastDotRef : null}
                  className="h-10 absolute left-3 md:left-3 top-0 w-10 rounded-full bg-white flex items-center justify-center border border-slate-300 shadow-sm"
                >
                  <div className="h-4 w-4 rounded-full bg-[#05294E]/20 border border-[#05294E]/40 p-2" />
                </div>
                <motion.h3 
                  style={{ opacity: titleOpacity, scale }}
                  className="hidden md:block text-2xl md:pl-14 md:text-4xl font-black tracking-tight text-[#05294E]"
                >
                  {item.title}
                </motion.h3>
              </div>

              <div className="relative pl-20 pr-4 md:pl-0 w-full">
                <motion.h3 
                  style={{ opacity: titleOpacity }}
                  className="md:hidden block text-2xl mb-4 text-left font-black tracking-tight text-[#05294E] h-10 flex items-center"
                >
                  {item.title}
                </motion.h3>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  {item.content}
                </motion.div>
              </div>
            </div>
          );
        })}
        <div
          style={{
            height: lineBounds.height + "px",
            top: lineBounds.top + "px",
          }}
          className="absolute md:left-8 left-8 w-[2px] bg-slate-200 z-10"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-full bg-gradient-to-t from-[#D0151C] via-[#05294E] to-transparent from-[0%] via-[10%] rounded-full shadow-[0_0_15px_rgba(208,21,28,0.8)]"
          />
        </div>
      </div>
    </div>
  );
};

// How It Works Section Component
const HowItWorksSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const steps = [
    {
      title: "Passo 01",
      content: (
        <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md mb-12 md:mb-0">
          <h3 className="text-2xl md:text-3xl font-bold text-[#05294E] mb-4 tracking-tight">
            Desbloqueie seu Acesso
          </h3>
          <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium">
            Ao garantir sua vaga no processo seletivo, você destrava instantaneamente o acesso completo ao nosso catálogo de bolsas exclusivas. É o primeiro passo para transformar seu sonho em realidade.
          </p>
        </div>
      )
    },
    {
      title: "Passo 02",
      content: (
        <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md mb-12 md:mb-0">
          <h3 className="text-2xl md:text-3xl font-bold text-[#05294E] mb-4 tracking-tight">
            O Poder de Escolha
          </h3>
          <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium">
            Com o acesso liberado, você escolhe livremente a universidade e a bolsa de estudos que se alinham perfeitamente aos seus objetivos nos EUA. Nosso filtro inteligente ajuda você a encontrar o match ideal.
          </p>
        </div>
      )
    },
    {
      title: "Passo 03",
      content: (
        <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md mb-12 md:mb-0">
          <h3 className="text-2xl md:text-3xl font-bold text-[#05294E] mb-4 tracking-tight">
            Matrícula Garantida
          </h3>
          <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium">
            Após a sua escolha, nossa equipe especializada assume toda a burocracia e realiza a sua matrícula oficial na universidade americana. Você não se preocupa com formulários complexos ou processos exaustivos.
          </p>
        </div>
      )
    },
    {
      title: "Passo 04",
      content: (
        <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md">
          <h3 className="text-2xl md:text-3xl font-bold text-[#05294E] mb-4 tracking-tight">
            Sua Carta de Aceite
          </h3>
          <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium">
            O passaporte para o seu futuro. Você recebe a Acceptance Letter oficial, a garantia absoluta de que sua vaga e sua bolsa estão confirmadas. Agora é só preparar as malas!
          </p>
        </div>
      )
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-50/30 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-50/30 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-[#05294E] tracking-tight">
            Como Funciona o <span className="text-[#D0151C]">Processo Seletivo</span>
          </h2>
        </div>

        {/* Timeline Component */}
        <div className="relative">
          <Timeline data={steps} />
        </div>

        {/* Final CTA */}
        <div className="text-center mt-10">
          <motion.button
            onClick={onCTAClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center px-12 py-6 bg-[#05294E] text-white font-bold text-lg rounded-2xl shadow-xl hover:bg-[#D0151C] hover:shadow-2xl transition-all duration-300 group"
          >
            Começar Meu Processo Agora
          </motion.button>
        </div>
      </div>
    </section>
  );
};

// Comparison Section Component - Adapted to Light Theme & Value Proposition
const ComparisonSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation(['home', 'common']);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect?.width ?? window.innerWidth));
      const h = Math.max(1, Math.floor(rect?.height ?? window.innerHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    type P = { x: number; y: number; v: number; o: number };
    let parts: P[] = [];
    let raf = 0;

    const make = (): P => ({
      x: Math.random() * (canvas.width / (window.devicePixelRatio || 1)),
      y: Math.random() * (canvas.height / (window.devicePixelRatio || 1)),
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    });

    const init = () => {
      parts = [];
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const count = Math.floor((w * h) / 12000);
      for (let i = 0; i < count; i++) parts.push(make());
    };

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * w;
          p.y = h + Math.random() * 40;
          p.v = Math.random() * 0.25 + 0.05;
          p.o = Math.random() * 0.35 + 0.15;
        }
        // Partículas escuras para fundo claro
        ctx.fillStyle = `rgba(5, 41, 78, ${p.o * 0.4})`; 
        ctx.fillRect(p.x, p.y, 1.5, 3);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement || document.body);

    init();
    raf = requestAnimationFrame(draw);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const [isMonthly, setIsMonthly] = useState(true);

  const plans = [
    {
      id: "alone",
      name: "Tentando Sozinho",
      description: "ou com Agências Tradicionais",
      costLabel: isMonthly ? "U$ 3.167/mês" : "U$ 38.000/ano",
      isHighlight: false,
      features: [
        { text: "Processos confusos e burocráticos" },
        { text: "Risco de escolher a universidade errada" },
        { text: "Mensalidades altíssimas sem bolsa" },
        { text: "Suporte demorado ou inexistente" },
      ],
      buttonText: "Continuar Sozinho",
    },
    {
      id: "matriculausa",
      name: "Com a MatriculaUSA",
      description: "Aprovação e Economia Garantida",
      costLabel: isMonthly ? "U$ 1.000/mês" : "U$ 12.000/ano",
      isHighlight: true,
      features: [
        { text: "Processo 100% guiado e transparente" },
        { text: "Match perfeito com seu perfil" },
        { text: "Garantia de bolsas exclusivas de até 70%" },
        { text: "Suporte prioritário via WhatsApp" },
      ],
      buttonText: "Garantir Minha Vaga",
    },
  ];

  return (
    <section
      data-comparison
      className="relative py-24 md:py-32 bg-slate-50 text-[#05294E] overflow-hidden isolate"
    >
      <style>{`
        .card-animate{opacity:0;transform:translateY(12px);animation:fadeUp .6s ease .25s forwards}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Subtle vignette for light mode */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(80%_60%_at_50%_15%,rgba(255,255,255,0.8),transparent_60%)]" />



      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center relative">
          {/* Section Background Watermark */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10vw] font-black text-[#05294E]/[0.02] select-none pointer-events-none whitespace-nowrap uppercase tracking-tighter z-0">
            Garantia
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#05294E] relative z-10">
            Menos Gasto. <span className="text-[#D0151C]"> Mais Certeza.</span>
          </h2>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-2 bg-slate-200/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIsMonthly(true)}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                isMonthly 
                  ? "bg-[#05294E] text-white shadow-md scale-100" 
                  : "text-slate-500 hover:text-[#05294E] hover:bg-slate-200/50"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsMonthly(false)}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                !isMonthly 
                  ? "bg-[#05294E] text-white shadow-md scale-100" 
                  : "text-slate-500 hover:text-[#05294E] hover:bg-slate-200/50"
              }`}
            >
              Anual
            </button>
          </div>

          <div className="mt-8 flex flex-col items-stretch gap-8 md:flex-row justify-center w-full max-w-4xl">
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`card-animate flex w-full md:w-[420px] flex-col justify-between text-center rounded-3xl border p-8 backdrop-blur-md shadow-2xl transition-all duration-300 ${
                  plan.isHighlight 
                    ? "border-red-200 bg-white/95 ring-2 ring-red-100 md:-translate-y-4 shadow-[0_20px_40px_rgb(208,21,28,0.1)]" 
                    : "border-slate-200 bg-white/60"
                }`}
                style={{ animationDelay: `${0.25 + i * 0.15}s` }}
              >
                <div>
                  <h3 className={`text-2xl font-bold tracking-tight mb-6 ${plan.isHighlight ? 'text-[#05294E]' : 'text-slate-700'}`}>
                    {plan.name}
                  </h3>

                  
                  <div className={`mb-8 ${plan.isHighlight ? 'text-[#D0151C]' : 'text-slate-600'}`}>
                    <span className="text-4xl font-black tracking-tight">{plan.costLabel}</span>
                  </div>

                  <div className="h-px w-full bg-slate-200 mb-6" />
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        {plan.isHighlight ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-slate-600 font-medium leading-snug">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.isHighlight && (
                  <div className="mt-auto">
                    <button
                      onClick={onCTAClick}
                      className="w-full flex items-center justify-center py-4 px-6 rounded-xl font-bold text-lg transition-all bg-[#D0151C] text-white hover:bg-red-600 shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5"
                    >
                      {plan.buttonText}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Guarantee Element - Now part of the background/footer of the section */}
          <div className="mt-16 w-full max-w-5xl flex justify-center">
            {(t("forStudents.guarantee.guarantees", { returnObjects: true }) as Array<{title: string, description: string}>)
              .filter((_, index) => index === 0)
              .map((guarantee, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="relative z-10 flex flex-col items-center text-center max-w-3xl w-full mx-4"
                >
                  {/* Subtle Background Watermark */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-7xl md:text-9xl font-black text-[#05294E]/[0.03] select-none pointer-events-none whitespace-nowrap uppercase tracking-tighter">
                    {guarantee.title}
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-2xl md:text-3xl font-bold text-[#05294E] mb-4 tracking-tight leading-tight">
                      {guarantee.title}
                    </h3>
                    <p className="text-base md:text-xl font-medium text-slate-500 leading-relaxed max-w-2xl">
                      {guarantee.description}
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};




// Social Proof Section Component - Prova Social
const SocialProofSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const { t } = useTranslation(['home', 'common']);
  const [isMobile, setIsMobile] = React.useState(false);

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
        <h2 className="text-4xl md:text-5xl font-black text-[#05294E] tracking-tight">
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


export default SelectionProcessLanding;