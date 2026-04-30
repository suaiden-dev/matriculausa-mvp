import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import FAQSection from '../components/FAQSection';
import '../styles/scrollbar.css';
import { 
  GraduationCap, 
  Sparkles, 
  Zap,
  CheckCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Lock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  X
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
      <FeaturedScholarshipsSection />

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
      
      {/* Special Offer Section - CTA FINAL */}
      <SpecialOfferSection onCTAClick={handleCTAClick} />
    </div>
  );
};

// Hero Section Component
const HeroSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation(['home', 'common']);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

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
      className="relative flex w-full flex-col overflow-hidden bg-gradient-to-br from-[#05294E] via-[#05294E] to-[#0a3a62] text-white min-h-[90vh]"
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
        <div className="flex w-full flex-col justify-center px-6 py-16 md:w-1/2 lg:w-[55%] md:pr-12 lg:px-8 xl:px-12">
            <div>
                <motion.main variants={containerVariants}>
                    <motion.h1 className="text-5xl font-black leading-tight md:text-6xl lg:text-7xl" variants={itemVariants}>
                        <span className="block">{t("forStudents.hero.title")}</span>
                        <span className="block text-[#D0151C] mt-1">
                          {t("forStudents.hero.titleHighlight")}
                        </span>
                        <span className="block text-3xl md:text-4xl lg:text-5xl mt-6 font-bold text-white/90">
                          {t("forStudents.hero.subtitle")}
                        </span>
                    </motion.h1>
                    
                    <motion.div className="my-10 h-2 w-32 bg-[#D0151C] rounded-full" variants={itemVariants}></motion.div>
                    
                    <motion.div 
                      className="mb-12 max-w-2xl text-xl md:text-2xl text-slate-200 leading-relaxed font-medium" 
                      variants={itemVariants}
                      dangerouslySetInnerHTML={{ __html: t("forStudents.hero.description") }}
                    />
                    
                    <motion.div variants={itemVariants}>
                      <motion.button
                        onClick={onCTAClick}
                        whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(208, 21, 28, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-10 py-6 bg-[#D0151C] text-white font-bold text-xl rounded-2xl shadow-xl hover:bg-red-600 transition-all duration-300 group"
                      >
                        <Sparkles className="w-6 h-6 mr-3 group-hover:animate-spin" />
                        {t("forStudents.hero.ctaButton")}
                        <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
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
        initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
        animate={inView ? { clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' } : {}}
        transition={{ duration: 1.2, ease: "circOut", delay: 0.3 }}
      >
        <div className="absolute inset-0 bg-[#05294E]/20" />
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
      originalPrice: "U$ 55.000/ano",
      discountedPrice: "U$ 12.500/ano",
      image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=800",
      discount: "-77%",
      tag: "VIP"
    },
    {
      id: 2,
      university: "MIT",
      course: "Ciência da Computação",
      degree: "Mestrado",
      duration: "2 anos",
      modality: "Presencial",
      originalPrice: "U$ 60.000/ano",
      discountedPrice: "U$ 18.000/ano",
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800",
      discount: "-70%",
      tag: "PREMIUM"
    },
    {
      id: 3,
      university: "Stanford University",
      course: "Administração (MBA)",
      degree: "Mestrado",
      duration: "2 anos",
      modality: "Presencial",
      originalPrice: "U$ 75.000/ano",
      discountedPrice: "U$ 25.000/ano",
      image: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&q=80&w=800",
      discount: "-66%",
      tag: "VIP"
    },
    {
      id: 4,
      university: "Oxford University",
      course: "Relações Internacionais",
      degree: "Bacharelado",
      duration: "3 anos",
      modality: "Híbrido",
      originalPrice: "£ 35.000/ano",
      discountedPrice: "£ 15.000/ano",
      image: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&q=80&w=800",
      discount: "-57%",
      tag: "PREMIUM"
    },
    {
      id: 5,
      university: "University of Toronto",
      course: "Engenharia Civil",
      degree: "Bacharelado",
      duration: "4 anos",
      modality: "Presencial",
      originalPrice: "C$ 60.000/ano",
      discountedPrice: "C$ 20.000/ano",
      image: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&q=80&w=800",
      discount: "-66%",
      tag: "VIP"
    },
    {
      id: 6,
      university: "UCLA",
      course: "Cinema e Televisão",
      degree: "Bacharelado",
      duration: "4 anos",
      modality: "Presencial",
      originalPrice: "U$ 65.000/ano",
      discountedPrice: "U$ 16.500/ano",
      image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=800",
      discount: "-74%",
      tag: "PREMIUM"
    },
    {
      id: 7,
      university: "Cambridge University",
      course: "Direito",
      degree: "Mestrado",
      duration: "2 anos",
      modality: "Híbrido",
      originalPrice: "£ 40.000/ano",
      discountedPrice: "£ 18.000/ano",
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800",
      discount: "-55%",
      tag: "VIP"
    },
    {
      id: 8,
      university: "Yale University",
      course: "Economia",
      degree: "Bacharelado",
      duration: "4 anos",
      modality: "Presencial",
      originalPrice: "U$ 70.000/ano",
      discountedPrice: "U$ 21.000/ano",
      image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800",
      discount: "-70%",
      tag: "PREMIUM"
    },
    {
      id: 9,
      university: "University of Melbourne",
      course: "Ciências Biológicas",
      degree: "Bacharelado",
      duration: "3 anos",
      modality: "Presencial",
      originalPrice: "A$ 45.000/ano",
      discountedPrice: "A$ 15.000/ano",
      image: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&q=80&w=800",
      discount: "-66%",
      tag: "VIP"
    },
    {
      id: 10,
      university: "ETH Zurich",
      course: "Robótica",
      degree: "Mestrado",
      duration: "2 anos",
      modality: "Presencial",
      originalPrice: "€ 25.000/ano",
      discountedPrice: "€ 8.500/ano",
      image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800",
      discount: "-66%",
      tag: "PREMIUM"
    }
  ];

// Featured Scholarships Section Component
const FeaturedScholarshipsSection: React.FC = () => {
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
        <div className="mb-10">
          <h2 className="font-display text-3xl font-bold text-[#05294E] md:text-4xl text-center md:text-left">
            +154 Bolsas Exclusivas
          </h2>
        </div>

        <div className="relative group">
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
                      alt={item.university} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    <div className="absolute left-3 top-3 flex gap-2">
                      <div className="inline-flex items-center rounded-full px-2.5 py-0.5 transition-colors border-transparent bg-[#D0151C] text-white font-body text-xs font-semibold shadow-sm">
                        {item.discount}
                      </div>
                    </div>
                    
                    <div className="absolute bottom-3 left-3">
                      <h3 className="font-display text-2xl font-bold text-white">{item.university}</h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                      <GraduationCap className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-[#05294E]">{item.course}</span>
                      <span className="ml-auto flex items-center gap-1.5 text-xs font-medium bg-slate-100 px-2 py-1 rounded-md">
                        {item.degree}
                      </span>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <div className="flex flex-1 items-center gap-2">
                        <span>Duração: {item.duration}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                          <Lock className="h-3 w-3" />
                          Garantida
                        </span>
                      </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{item.modality}</span>
                    </div>

                    <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-400 line-through mb-1">{item.originalPrice}</p>
                        <p className="text-xl font-black leading-none text-green-600">{item.discountedPrice}</p>
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
      meta: t("forStudents.benefits.benefits.economy.highlight") 
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
        <header className="relative mb-10 border-b border-slate-200 pb-6">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#05294E]">{t("forStudents.benefits.title")}</h2>
          <p className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed">
            {t("forStudents.benefits.subtitle")}
          </p>
        </header>

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-6 auto-rows-[minmax(120px,auto)]">
          {features.map((f, i) => (
            <BentoCard key={i} span={spans[i]} title={f.title} blurb={f.blurb} meta={f.meta} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BentoCard({ span = "", title, blurb, meta }: { span?: string, title: string, blurb: string, meta?: string }) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:border-slate-300 hover:shadow-md ${span}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">&bull;</span>
          <h3 className="text-xl md:text-2xl font-bold leading-tight text-[#05294E] group-hover:text-[#D0151C] transition-colors">
            {title}
          </h3>
        </div>
        {meta && (
          <span className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs uppercase tracking-wider text-slate-600 bg-white shadow-sm font-medium">
            {meta}
          </span>
        )}
      </header>
      <p className="text-base md:text-lg text-slate-600 max-w-prose leading-relaxed mt-2">{blurb}</p>

      {/* Subtle background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/0 to-slate-100/0 group-hover:from-slate-100/50 group-hover:to-transparent transition-all duration-500 rounded-2xl -z-10" />
    </article>
  );
}

// How It Works Section Component
const HowItWorksSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { ref } = useInView({ triggerOnce: true, threshold: 0.1 });

  const steps = [
    {
      step: "01",
      title: "Desbloqueie seu Acesso",
      description: "Ao garantir sua vaga no processo seletivo, você destrava instantaneamente o acesso completo ao nosso catálogo de bolsas exclusivas."
    },
    {
      step: "02",
      title: "O Poder de Escolha",
      description: "Com o acesso liberado, você escolhe livremente a universidade e a bolsa de estudos que se alinham perfeitamente aos seus objetivos nos EUA."
    },
    {
      step: "03",
      title: "Matrícula Garantida",
      description: "Após a sua escolha, nossa equipe especializada assume toda a burocracia e realiza a sua matrícula oficial na universidade americana."
    },
    {
      step: "04",
      title: "Sua Carta de Aceite",
      description: "O passaporte para o seu futuro. Você recebe a Acceptance Letter oficial, a garantia absoluta de que sua vaga e sua bolsa estão confirmadas."
    }
  ];

  return (
    <section ref={ref} className="py-24 bg-white relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-50/50 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-50/50 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6 tracking-tight">
            Como Funciona o <span className="text-[#D0151C]">Processo Seletivo</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Uma trilha clara, rápida e sem burocracias. Entenda o que você desbloqueia ao garantir a sua vaga no processo.
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto mt-12">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden group hover:shadow-[0_8px_30px_rgb(208,21,28,0.08)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute -right-4 -top-6 text-[140px] leading-none font-black text-slate-50 group-hover:text-red-50/80 transition-colors duration-500 pointer-events-none select-none">
                {step.step}
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 font-bold text-sm mb-6 border border-slate-200 group-hover:bg-red-50 group-hover:text-[#D0151C] group-hover:border-red-100 transition-colors duration-300">
                  Passo {step.step}
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-[#05294E] mb-4 group-hover:text-[#D0151C] transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-slate-600 text-lg leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="text-center mt-20">
          <button
            onClick={onCTAClick}
            className="inline-flex items-center px-12 py-6 bg-[#05294E] text-white font-bold text-xl rounded-2xl shadow-xl hover:bg-[#D0151C] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
          >
            Começar Meu Processo Agora
            <span className="ml-3 group-hover:translate-x-1 transition-transform">→</span>
          </button>
          <p className="mt-4 text-slate-500 font-medium">
            Garantia de aprovação ou devolução da taxa.
          </p>
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

  const plans = [
    {
      id: "alone",
      name: "Tentando Sozinho",
      description: "ou com Agências Tradicionais",
      costLabel: "Gasto médio: U$ 40.000/ano",
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
      costLabel: "Economia média: U$ 25.000/ano",
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
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.4}
        .hline,.vline{position:absolute;background:#cbd5e1}
        .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s ease forwards}
        .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s ease forwards}
        .hline:nth-child(1){top:18%;animation-delay:.08s}
        .hline:nth-child(2){top:50%;animation-delay:.16s}
        .hline:nth-child(3){top:82%;animation-delay:.24s}
        .vline:nth-child(4){left:18%;animation-delay:.20s}
        .vline:nth-child(5){left:50%;animation-delay:.28s}
        .vline:nth-child(6){left:82%;animation-delay:.36s}
        @keyframes drawX{to{transform:scaleX(1)}}
        @keyframes drawY{to{transform:scaleY(1)}}
        .card-animate{opacity:0;transform:translateY(12px);animation:fadeUp .6s ease .25s forwards}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Subtle vignette for light mode */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(80%_60%_at_50%_15%,rgba(255,255,255,0.8),transparent_60%)]" />

      {/* Animated accent lines */}
      <div aria-hidden="true" className="accent-lines">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#05294E]">
            De gasto alto e incerteza… para <span className="text-[#D0151C]">economia real</span> e aprovação garantida
          </h2>
          <p className="text-slate-600 md:text-xl max-w-3xl mx-auto">
            Entenda por que o nosso processo seletivo é o atalho mais inteligente e seguro para o seu futuro acadêmico nos EUA.
          </p>

          <div className="mt-12 flex flex-col items-stretch gap-8 md:flex-row justify-center w-full max-w-4xl">
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`card-animate flex w-full md:w-[420px] flex-col justify-between text-left rounded-3xl border p-8 backdrop-blur-md shadow-2xl transition-all duration-300 ${
                  plan.isHighlight 
                    ? "border-red-200 bg-white/95 ring-2 ring-red-100 md:-translate-y-4 shadow-[0_20px_40px_rgb(208,21,28,0.1)]" 
                    : "border-slate-200 bg-white/60"
                }`}
                style={{ animationDelay: `${0.25 + i * 0.15}s` }}
              >
                <div>
                  <h3 className={`text-2xl font-black ${plan.isHighlight ? 'text-[#05294E]' : 'text-slate-700'}`}>
                    {plan.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1 mb-6">{plan.description}</p>
                  
                  <div className={`p-4 rounded-2xl mb-8 border ${plan.isHighlight ? 'bg-red-50 text-[#D0151C] border-red-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    <span className="font-bold">{plan.costLabel}</span>
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
                        <span className="text-slate-700 font-medium leading-snug">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto">
                  <button
                    onClick={plan.isHighlight ? onCTAClick : undefined}
                    className={`w-full flex items-center justify-center py-4 px-6 rounded-xl font-bold transition-all ${
                      plan.isHighlight 
                        ? "bg-[#D0151C] text-white hover:bg-red-600 shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {plan.buttonText}
                    {plan.isHighlight && <ArrowRight className="ml-2 w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Guarantee Element */}
          <div className="mt-16 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
            {(t("forStudents.guarantee.guarantees", { returnObjects: true }) as Array<{title: string, description: string}>).map((guarantee, index) => {
              const icons = [ShieldCheck, CheckCircle, GraduationCap];
              const IconComponent = icons[index] || ShieldCheck;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 hover:shadow-2xl hover:border-green-100 transition-all duration-300 relative overflow-hidden group text-left"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-green-100 transition-colors duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-7 h-7 text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-[#05294E] mb-3 leading-tight">
                      {guarantee.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      {guarantee.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// Special Offer Section Component
const SpecialOfferSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation(['home', 'common']);
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        duration: 0.6
      }
    }
  };  const benefits = t("forStudents.specialOffer.benefits", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;

  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-[#05294E] via-[#0a3a62] to-[#05294E] text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#D0151C]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">

            <h2 className="text-4xl md:text-5xl font-black mb-6">
              {t("forStudents.specialOffer.title")}
            </h2>
            <p className="text-xl text-slate-200 max-w-3xl mx-auto mb-8">
              {t("forStudents.specialOffer.subtitle")}
            </p>
          </motion.div>

          {/* Benefits Grid */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            {benefits.map((benefit, index) => {
              const icons = [Zap, Sparkles, CheckCircle, ShieldCheck];
              const IconComponent = icons[index] || Zap;
              
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ 
                    y: -5,
                    scale: 1.02
                  }}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-[#D0151C] rounded-xl flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                  <p className="text-slate-200 text-sm leading-relaxed">{benefit.description}</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Urgency Section */}
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-r from-[#D0151C]/20 to-red-500/20 backdrop-blur-lg rounded-3xl p-8 border border-[#D0151C]/30 mb-12"
          >
            <div className="flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-yellow-400 mr-3" />
              <h3 className="text-2xl font-bold text-yellow-400">{t("forStudents.specialOffer.urgencyTitle")}</h3>
            </div>
            <p className="text-center text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: t("forStudents.specialOffer.urgencyDescription") }} />
          </motion.div>

          {/* CTA */}
          <motion.div variants={itemVariants} className="text-center px-4 sm:px-0">
            <motion.button
              onClick={onCTAClick}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 25px 50px rgba(208, 21, 28, 0.5)"
              }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-12 md:px-16 py-4 sm:py-6 md:py-8 bg-[#D0151C] text-white font-black text-base sm:text-xl md:text-2xl rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex flex-col sm:flex-row items-center gap-2 sm:gap-3 md:gap-4">
                <Sparkles className="hidden sm:block w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 group-hover:animate-spin" />
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="whitespace-nowrap">{t("forStudents.specialOffer.ctaButton")}</span>
                </div>
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-xl sm:text-2xl md:text-3xl"
                >
                  🚀
                </motion.div>
              </div>
            </motion.button>
            <p className="mt-3 sm:mt-4 text-slate-300 text-xs sm:text-sm">
              {t("forStudents.specialOffer.ctaDescription")}
            </p>
          </motion.div>
        </motion.div>
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
        <h2 className="font-display text-4xl md:text-5xl font-bold text-[#05294E] tracking-tight mb-6">
          Relatos de quem já foi <span className="text-[#D0151C] italic">Aprovado.</span>
        </h2>
        <p className="text-slate-600 font-medium text-lg md:text-xl max-w-2xl mx-auto">
          Junte-se a milhares de estudantes que descobriram a estratégia certa para estudar no exterior.
        </p>
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
                      <p className="text-[13px] md:text-sm font-medium leading-relaxed mb-6 italic opacity-90">
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
          className="inline-flex items-center px-8 py-4 md:px-12 md:py-6 bg-[#D0151C] text-white font-bold text-lg md:text-xl rounded-2xl shadow-xl hover:bg-red-600 hover:scale-105 transition-all duration-300 group"
        >
          {t("forStudents.socialProof.ctaButton")}
          <div className="ml-3 group-hover:translate-x-2 transition-transform">
            →
          </div>
        </button>
      </div>
    </section>
  );
};


export default SelectionProcessLanding;