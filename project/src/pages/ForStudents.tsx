import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { AnimatedList } from "../components/ui/AnimatedList";
import FAQSection from '../components/FAQSection';
import '../styles/scrollbar.css';
import { 
  GraduationCap, 
  Sparkles, 
  Globe, 
  Shield, 
  Zap,
  CheckCircle,
  DollarSign,
  FileText,
  Brain,
  UserCheck,
  CreditCard,
  Award,
  PhoneCall,
  ArrowRight,
  ShieldCheck,
  Clock,
  Target,
  X,
  TrendingUp,
  RefreshCw,
  Quote,
  Coins,
  Users,
  Share2,
  Gift
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const ForStudents: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTAClick = () => {
    if (user) {
      navigate('/student/dashboard/scholarships');
    } else {
      navigate('/register');
    }
  };

  const handleMatriculaRewardsClick = () => {
    navigate('/matricula-rewards');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Scroll Progress Bar */}
      {/* <ScrollProgress /> */}
      
      {/* Hero Section */}
      <HeroSection onCTAClick={handleCTAClick} />
      
      {/* Benefits Section */}
      <BenefitsSection onCTAClick={handleCTAClick} />
      
      {/* Social Proof Section */}
      <SocialProofSection onCTAClick={handleCTAClick} />
      
      {/* How It Works Section */}
      <HowItWorksSection onCTAClick={handleCTAClick} />
      
      {/* Matricula Rewards Section */}
      <MatriculaRewardsSection onCTAClick={handleMatriculaRewardsClick} />
      
      {/* Comparison Section */}
      <ComparisonSection onCTAClick={handleCTAClick} />
      
      {/* FAQ Section */}
      <FAQSection />
      
      {/* Guarantee Section */}
      <GuaranteeSection onCTAClick={handleCTAClick} />
      
      {/* Special Offer Section - CTA FINAL */}
      <SpecialOfferSection onCTAClick={handleCTAClick} />
    </div>
  );
};

// Hero Section Component
const HeroSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation();
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

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
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <section ref={ref} className="relative min-h-screen bg-gradient-to-br from-[#05294E] via-[#05294E] to-[#0a3a62] text-white overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-[#D0151C]/10 to-blue-500/10 rounded-full blur-2xl animate-bounce"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <motion.div
          ref={ref}
          animate={controls}
          initial="hidden"
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[70vh]"
        >
          {/* Content Column */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Main Headline */}
            <motion.h1 
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
            >
              <span className="block">{t("forStudents.hero.title")}</span>
              <span className="block bg-gradient-to-r from-[#D0151C] to-red-400 bg-clip-text text-transparent">
                {t("forStudents.hero.titleHighlight")}
              </span>
              <span className="block text-2xl md:text-3xl lg:text-4xl mt-4 font-bold">
                {t("forStudents.hero.subtitle")}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              variants={itemVariants}
              className="text-lg md:text-xl text-slate-200 leading-relaxed mb-8"
              dangerouslySetInnerHTML={{ __html: t("forStudents.hero.description") }}
            />

            {/* CTA Button */}
            <motion.div variants={itemVariants} className="mb-8">
              <motion.button
                onClick={onCTAClick}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(208, 21, 28, 0.4)"
                }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-8 md:px-12 py-4 md:py-6 bg-[#D0151C] text-white font-bold text-lg md:text-xl rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group w-full sm:w-auto justify-center"
              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 mr-3 group-hover:animate-spin" />
                {t("forStudents.hero.ctaButton")}
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>

            {/* Trust Elements */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-sm md:text-base">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <span>{t("forStudents.hero.trustElements.approval24h")}</span>
              </div>
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-blue-400 mr-2" />
                <span>{t("forStudents.hero.trustElements.guaranteed")}</span>
              </div>
              <div className="flex items-center">
                <Globe className="w-5 h-5 text-yellow-400 mr-2" />
                <span>{t("forStudents.hero.trustElements.approved")}</span>
              </div>
            </motion.div>
          </div>

          {/* Image Column */}
          <motion.div 
            variants={{
              hidden: { x: 100, opacity: 0, scale: 0.8 },
              visible: {
                x: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 1,
                  delay: 0.5
                }
              }
            }}
            className="order-1 lg:order-2 relative"
          >
            <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
              {/* Background decoration */}
              <div className="absolute -top-4 -left-4 w-full h-full bg-gradient-to-br from-[#D0151C]/20 to-blue-500/20 rounded-3xl blur-lg"></div>
              
              {/* Main image container */}
              <motion.div 
                className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-1 border border-white/20"
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
              >
                <div className="rounded-3xl overflow-hidden">
                  {/* Student image */}
                  <img 
                    src="pexels-tamhoang139-1007066.jpg"
                    alt="Estudante universitário sorrindo"
                    className="aspect-[3/4] w-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Benefits Section Component
const BenefitsSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation();
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [visibleCards, setVisibleCards] = React.useState<number[]>([]);

  useEffect(() => {
    if (inView) {
      controls.start('visible');
      // Stagger the card appearances from right to left
      benefits.forEach((_, index) => {
        setTimeout(() => {
          setVisibleCards(prev => [...prev, index]);
        }, index * 200);
      });
    }
  }, [controls, inView]);

  const benefits = [
    {
      icon: DollarSign,
      titleKey: "forStudents.benefits.benefits.economy.title",
      descriptionKey: "forStudents.benefits.benefits.economy.description",
      highlightKey: "forStudents.benefits.benefits.economy.highlight",
      color: "emerald"
    },
    {
      icon: Clock,
      titleKey: "forStudents.benefits.benefits.fastApproval.title",
      descriptionKey: "forStudents.benefits.benefits.fastApproval.description",
      highlightKey: "forStudents.benefits.benefits.fastApproval.highlight",
      color: "blue"
    },
    {
      icon: Globe,
      titleKey: "forStudents.benefits.benefits.hybridMode.title",
      descriptionKey: "forStudents.benefits.benefits.hybridMode.description",
      highlightKey: "forStudents.benefits.benefits.hybridMode.highlight",
      color: "purple"
    },
    {
      icon: Target,
      titleKey: "forStudents.benefits.benefits.multipleOpportunities.title",
      descriptionKey: "forStudents.benefits.benefits.multipleOpportunities.description",
      highlightKey: "forStudents.benefits.benefits.multipleOpportunities.highlight",
      color: "orange"
    },
    {
      icon: Shield,
      titleKey: "forStudents.benefits.benefits.guaranteed.title",
      descriptionKey: "forStudents.benefits.benefits.guaranteed.description",
      highlightKey: "forStudents.benefits.benefits.guaranteed.highlight",
      color: "red"
    },
    {
      icon: GraduationCap,
      titleKey: "forStudents.benefits.benefits.support.title",
      descriptionKey: "forStudents.benefits.benefits.support.description",
      highlightKey: "forStudents.benefits.benefits.support.highlight",
      color: "indigo"
    }
  ];

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

  const cardVariants = {
    hidden: { x: 100, opacity: 0, scale: 0.8 },
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        damping: 20
      }
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      emerald: {
        bg: "from-emerald-400 to-emerald-600",
        text: "text-emerald-600",
        border: "border-emerald-200",
        shadow: "shadow-emerald-100"
      },
      blue: {
        bg: "from-blue-400 to-blue-600",
        text: "text-blue-600",
        border: "border-blue-200",
        shadow: "shadow-blue-100"
      },
      purple: {
        bg: "from-purple-400 to-purple-600",
        text: "text-purple-600",
        border: "border-purple-200",
        shadow: "shadow-purple-100"
      },
      orange: {
        bg: "from-orange-400 to-orange-600",
        text: "text-orange-600",
        border: "border-orange-200",
        shadow: "shadow-orange-100"
      },
      red: {
        bg: "from-red-400 to-red-600",
        text: "text-red-600",
        border: "border-red-200",
        shadow: "shadow-red-100"
      },
      indigo: {
        bg: "from-indigo-400 to-indigo-600",
        text: "text-indigo-600",
        border: "border-indigo-200",
        shadow: "shadow-indigo-100"
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <section ref={ref} className="py-20 bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
        >
          {/* Section Header */}
          <motion.div 
            variants={cardVariants} 
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">
              {t("forStudents.benefits.title")}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t("forStudents.benefits.subtitle")}
            </p>
          </motion.div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              const colorClasses = getColorClasses(benefit.color);
              const isVisible = visibleCards.includes(index);

              return (
                <motion.div
                  key={index}
                  initial={{ x: 100, opacity: 0, scale: 0.8 }}
                  animate={isVisible ? {
                    x: 0,
                    opacity: 1,
                    scale: 1,
                    transition: {
                      duration: 0.6,
                      damping: 20,
                      delay: index * 0.1
                    }
                  } : {}}
                  whileHover={{ 
                    y: -8,
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  className={`group relative bg-white rounded-2xl p-6 border ${colorClasses.border} hover:shadow-xl ${colorClasses.shadow} transition-all duration-300 overflow-hidden`}
                >
                  {/* Background decoration */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses.bg} opacity-5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300`}></div>
                  
                  {/* Icon */}
                  <div className={`relative w-12 h-12 bg-gradient-to-br ${colorClasses.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-[#05294E] group-hover:text-[#D0151C] transition-colors duration-300">
                        {t(benefit.titleKey)}
                      </h3>
                      <span className={`text-xs font-bold ${colorClasses.text} bg-white px-2 py-1 rounded-full border ${colorClasses.border}`}>
                        {t(benefit.highlightKey)}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {t(benefit.descriptionKey)}
                    </p>
                  </div>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <motion.div 
            variants={cardVariants}
            className="text-center mt-16"
          >
            <motion.button
              onClick={onCTAClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-12 py-6 bg-gradient-to-r from-[#D0151C] to-red-600 text-white font-bold text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <Sparkles className="w-6 h-6 mr-3" />
              {t("forStudents.benefits.ctaButton")}
              <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// How It Works Section Component
const HowItWorksSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation();
  const { ref } = useInView({ triggerOnce: true, threshold: 0.1 });

  const steps = [
    {
      step: 1,
      icon: DollarSign,
      titleKey: "forStudents.howItWorks.steps.processFee.title",
      descriptionKey: "forStudents.howItWorks.steps.processFee.description",
      priceKey: "forStudents.howItWorks.steps.processFee.price"
    },
    {
      step: 2,
      icon: Brain,
      titleKey: "forStudents.howItWorks.steps.scholarshipChoice.title",
      descriptionKey: "forStudents.howItWorks.steps.scholarshipChoice.description",
      priceKey: "forStudents.howItWorks.steps.scholarshipChoice.price"
    },
    {
      step: 3,
      icon: UserCheck,
      titleKey: "forStudents.howItWorks.steps.application.title",
      descriptionKey: "forStudents.howItWorks.steps.application.description",
      priceKey: "forStudents.howItWorks.steps.application.price"
    },
    {
      step: 4,
      icon: CreditCard,
      titleKey: "forStudents.howItWorks.steps.enrollmentFee.title",
      descriptionKey: "forStudents.howItWorks.steps.enrollmentFee.description",
      priceKey: "forStudents.howItWorks.steps.enrollmentFee.price"
    },
    {
      step: 5,
      icon: Award,
      titleKey: "forStudents.howItWorks.steps.scholarshipFee.title",
      descriptionKey: "forStudents.howItWorks.steps.scholarshipFee.description",
      priceKey: "forStudents.howItWorks.steps.scholarshipFee.price"
    },
    {
      step: 6,
      icon: FileText,
      titleKey: "forStudents.howItWorks.steps.i20Fee.title",
      descriptionKey: "forStudents.howItWorks.steps.i20Fee.description",
      priceKey: "forStudents.howItWorks.steps.i20Fee.price"
    },
    {
      step: 7,
      icon: CheckCircle,
      titleKey: "forStudents.howItWorks.steps.spotGuaranteed.title",
      descriptionKey: "forStudents.howItWorks.steps.spotGuaranteed.description",
      priceKey: "forStudents.howItWorks.steps.spotGuaranteed.price"
    }
  ];


  // AnimatedList integration
  const stepCards = steps.map((step, index) => {
    return (
      <div key={index} className="relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100">
        {/* Progress bar centralizada */}
        <div className="absolute left-1/2 top-0 transform -translate-x-1/2 h-2 bg-gradient-to-r from-[#05294E] to-[#D0151C] rounded-t-3xl"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}></div>
        <div className="flex flex-col md:flex-row items-center p-8">
          {/* Step Number Circle */}
          <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-[#05294E] to-[#0a3a62] rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-black text-white">{step.step}</span>
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-[#D0151C] to-red-600 rounded-xl flex items-center justify-center">
                <step.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="flex-grow text-center md:text-left">
            <h3 className="text-2xl font-bold text-[#05294E] mb-3">
              {t(step.titleKey)}
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              {t(step.descriptionKey)}
            </p>
          </div>
          {/* Price */}
          <div className="flex-shrink-0 mt-6 md:mt-0 md:ml-8">
            <div className={`px-6 py-4 rounded-2xl font-bold text-lg border-2 ${
              t(step.priceKey) === "Grátis" || t(step.priceKey) === "Free" || t(step.priceKey) === "Gratis"
                ? "bg-green-50 text-green-700 border-green-200" 
                : t(step.priceKey) === "✓" 
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-gradient-to-r from-[#D0151C] to-red-600 text-white border-transparent shadow-lg"
            }`}>
              {t(step.priceKey)}
            </div>
          </div>
        </div>
        {/* Connection line to next step */}
        {index < steps.length - 1 && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-3 w-0.5 h-6 bg-gradient-to-b from-[#D0151C] to-transparent"></div>
        )}
      </div>
    );
  });

  return (
    <section ref={ref} className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">
            {t("forStudents.howItWorks.title")}
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            {t("forStudents.howItWorks.subtitle")}
          </p>
        </div>
        {/* Steps com AnimatedList */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/5 to-[#D0151C]/5 rounded-3xl"></div>
          <div className="relative p-8">
            <AnimatedList 
              items={stepCards} 
              stagger={0.15} 
              className="space-y-6" 
            />
          </div>
        </div>
        {/* Final CTA */}
        <div className="text-center mt-16">
          <button
            onClick={onCTAClick}
            className="inline-flex items-center px-12 py-6 bg-[#05294E] text-white font-bold text-xl rounded-2xl shadow-2xl hover:bg-[#0a3a62] transition-all duration-300 group"
          >
            <GraduationCap className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
            {t("forStudents.howItWorks.ctaButton")}
            <span className="ml-3">→</span>
          </button>
          <p className="mt-4 text-slate-500">
            {t("forStudents.howItWorks.ctaDescription")}
          </p>
        </div>
      </div>
    </section>
  );
};

// Comparison Section Component - Before vs After
const ComparisonSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation();
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

  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const data = {
    before: {
      title: t("forStudents.comparison.before.title"),
      subtitle: t("forStudents.comparison.before.subtitle"),
      costLabel: t("forStudents.comparison.before.costLabel"),
      items: t("forStudents.comparison.before.items", { returnObjects: true }) as string[]
    },
    after: {
      title: t("forStudents.comparison.after.title"),
      subtitle: t("forStudents.comparison.after.subtitle"),
      savingsLabel: t("forStudents.comparison.after.savingsLabel"),
      items: t("forStudents.comparison.after.items", { returnObjects: true }) as string[]
    }
  };

  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
        >
          {/* Section Header */}
          <motion.div variants={cardVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">
              {t("forStudents.comparison.title")}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t("forStudents.comparison.subtitle")}
            </p>
          </motion.div>

          {/* Comparison Cards */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16"
          >
            {/* Without MatriculaUSA */}
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-3xl p-8 shadow-xl border-2 border-red-100 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-red-600"></div>
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mr-4">
                  <X className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-red-600">{data.before.title}</h3>
                  <p className="text-red-400">{data.before.subtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {data.before.items.map((problem: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-slate-700 leading-relaxed">{problem}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-200">
                <p className="text-red-700 font-bold text-center">
                  {data.before.costLabel}
                </p>
              </div>
            </motion.div>

            {/* With MatriculaUSA */}
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-3xl p-8 shadow-xl border-2 border-green-100 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-[#05294E] rounded-2xl flex items-center justify-center mr-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#05294E]">{data.after.title}</h3>
                  <p className="text-green-600">{data.after.subtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {data.after.items.map((solution: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-slate-700 leading-relaxed">{solution}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200">
                <p className="text-green-700 font-bold text-center">
                  {data.after.savingsLabel}
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div variants={cardVariants} className="text-center">
            <motion.button
              onClick={onCTAClick}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(208, 21, 28, 0.4)"
              }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-12 py-6 bg-[#D0151C] text-white font-bold text-xl rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group"
            >
              <TrendingUp className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" />
              {t("forStudents.comparison.ctaButton")}
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="ml-3"
              >
                →
              </motion.div>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Special Offer Section Component
const SpecialOfferSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation();
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

// Guarantee Section Component
const GuaranteeSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation();
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
        staggerChildren: 0.15
      }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        duration: 0.8
      }
    }
  };  const guarantees = t("forStudents.guarantee.guarantees", { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;

  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={cardVariants} className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-2xl mb-6 shadow-lg">
              <Shield className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">
              {t("forStudents.guarantee.title")}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              {t("forStudents.guarantee.subtitle")}
            </p>
          </motion.div>

          {/* Guarantees Grid */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          >
            {guarantees.map((guarantee, index) => {
              const icons = [Shield, DollarSign, PhoneCall];
              const colors = ["bg-green-500", "bg-blue-500", "bg-purple-500"];
              const IconComponent = icons[index] || Shield;
              const colorClass = colors[index] || "bg-green-500";
              
              return (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  whileHover={{ 
                    y: -10,
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                  }}
                  className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-100 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                  
                  <div className={`${colorClass} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#05294E] mb-4">
                    {guarantee.title}
                  </h3>
                  
                  <p className="text-slate-600 leading-relaxed">
                    {guarantee.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Bottom Message */}
          <motion.div 
            variants={cardVariants}
            className="bg-gradient-to-r from-[#05294E] to-[#0a3a62] rounded-3xl p-12 text-center text-white shadow-2xl"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="inline-block mb-6"
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            
            <h3 className="text-3xl md:text-4xl font-black mb-6">
              {t("forStudents.guarantee.bottomMessage")}
            </h3>
            
            <motion.button
              onClick={onCTAClick}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(255, 255, 255, 0.2)"
              }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-12 py-6 bg-white text-[#05294E] font-bold text-xl rounded-2xl shadow-2xl hover:bg-slate-100 transition-all duration-300 group"
            >
              <RefreshCw className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
              {t("forStudents.guarantee.ctaButton")}
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="ml-3"
              >
                →
              </motion.div>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Social Proof Section Component - Prova Social
const SocialProofSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation();
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        duration: 0.5
      }
    }
  };

  const testimonials = t("forStudents.socialProof.testimonials", { returnObjects: true }) as Array<{
    name: string;
    university: string;
    course: string;
    text: string;
    savings: string;
  }>;

  // Auto-scroll effect
  useEffect(() => {
    const cardsPerView = isMobile ? 1 : 3;
    const maxIndex = Math.max(0, testimonials.length - cardsPerView);
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex > maxIndex ? 0 : nextIndex;
      });
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [testimonials.length, isMobile]);

  return (
    <section ref={ref} className="py-20 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">
              {t("forStudents.socialProof.title")}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t("forStudents.socialProof.subtitle")}
            </p>
          </motion.div>

          {/* Statistics */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-16"
          >
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <div className="text-2xl md:text-4xl font-black text-[#D0151C] mb-2">150+</div>
              <div className="text-slate-600 text-sm md:text-base">{t("forStudents.socialProof.statistics.approved")}</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <div className="text-2xl md:text-4xl font-black text-[#D0151C] mb-2">92%</div>
              <div className="text-slate-600 text-sm md:text-base">{t("forStudents.socialProof.statistics.approvalRate")}</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <div className="text-2xl md:text-4xl font-black text-[#D0151C] mb-2">$35k</div>
              <div className="text-slate-600 text-sm md:text-base">{t("forStudents.socialProof.statistics.averageSavings")}</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <div className="text-2xl md:text-4xl font-black text-[#D0151C] mb-2">45</div>
              <div className="text-slate-600 text-sm md:text-base">{t("forStudents.socialProof.statistics.partnerUniversities")}</div>
            </div>
          </motion.div>

          {/* Responsive Carousel */}
          <motion.div variants={itemVariants} className="relative">
            <div className="overflow-hidden rounded-3xl">
              <motion.div
                className="flex transition-transform duration-1000 ease-in-out"
                animate={{
                  x: isMobile 
                    ? `-${currentIndex * 100}%` 
                    : `-${currentIndex * (100 / 3)}%`
                }}
                style={{
                  width: isMobile 
                    ? `${testimonials.length * 100}%` 
                    : `${(testimonials.length * 100) / 3}%`
                }}
              >
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={index}
                    className={`${isMobile ? 'w-full' : 'w-1/3'} px-2 md:px-4 flex-shrink-0`}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { 
                        delay: index * 0.1,
                        duration: 0.8 
                      }
                    }}
                  >
                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-lg border border-slate-100 h-full relative overflow-hidden">
                      {/* Background gradient */}
                      <div className="absolute top-0 right-0 w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-[#D0151C]/10 to-blue-500/10 rounded-bl-full"></div>
                      
                      {/* Savings badge */}
                      <div className="absolute top-3 md:top-4 right-3 md:right-4 bg-green-500 text-white text-xs font-bold px-2 md:px-3 py-1 rounded-full">
                        {t("forStudents.socialProof.statistics.averageSavings")} {testimonial.savings}
                      </div>
                      
                      <div className="flex items-center mb-4 md:mb-6">
                        {/* <img 
                          src={testimonial.image} 
                          alt={testimonial.name}
                          className="w-12 md:w-16 h-12 md:h-16 rounded-full mr-3 md:mr-4 bg-slate-200 border-2 md:border-4 border-white shadow-lg"
                        /> */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#05294E] text-sm md:text-lg truncate">{testimonial.name}</div>
                          <div className="text-xs md:text-sm text-[#D0151C] font-semibold truncate">{testimonial.course}</div>
                          <div className="text-xs md:text-sm text-slate-500 truncate">{testimonial.university}</div>
                        </div>
                      </div>
                      
                      <Quote className="w-6 md:w-8 h-6 md:h-8 text-slate-300 mb-3 md:mb-4" />
                      <p className="text-slate-700 text-wrap leading-relaxed w-72 text-xs md:text-sm" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        "{testimonial.text}"
                      </p>
                      
                      {/* Star rating */}
                      <div className="flex items-center mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-100">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ 
                                opacity: 1, 
                                scale: 1,
                                transition: { 
                                  delay: (index * 0.1) + (i * 0.1),
                                  duration: 0.3 
                                }
                              }}
                              className="text-sm md:text-lg"
                            >
                              ⭐
                            </motion.span>
                          ))}
                        </div>
                        <span className="ml-2 text-xs md:text-sm text-slate-500">5.0</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Carousel indicators */}
            <div className="flex justify-center mt-6 md:mt-8 space-x-2">
              {Array.from({ 
                length: isMobile ? testimonials.length : Math.ceil(testimonials.length / 3) 
              }).map((_, index) => {
                const isActive = isMobile 
                  ? currentIndex === index
                  : Math.floor(currentIndex / 3) === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(isMobile ? index : index * 3)}
                    className={`h-2 md:h-3 rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#D0151C] w-6 md:w-8' 
                        : 'bg-slate-300 hover:bg-slate-400 w-2 md:w-3'
                    }`}
                  />
                );
              })}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={itemVariants} className="text-center mt-16">
            <motion.button
              onClick={onCTAClick}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(208, 21, 28, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-12 py-6 bg-[#D0151C] text-white font-bold text-xl rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group"
            >
              <CheckCircle className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" />
              {t("forStudents.socialProof.ctaButton")}
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="ml-3"
              >
                →
              </motion.div>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Matricula Rewards Section Component
const MatriculaRewardsSection: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const { t } = useTranslation();
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [calculatorFriends, setCalculatorFriends] = React.useState(5);

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
  };

  const calculateSavings = (friends: number) => {
    const coins = friends * 180;
    const dollars = coins;
    return { coins, dollars };
  };

  const steps = [
    {
      number: "01",
      icon: Share2,
      title: t('matriculaRewardsLanding.howItWorks.steps.step1.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step1.description')
    },
    {
      number: "02",
      icon: Users,
      title: t('matriculaRewardsLanding.howItWorks.steps.step2.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step2.description')
    },
    {
      number: "03",
      icon: Coins,
      title: t('matriculaRewardsLanding.howItWorks.steps.step3.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step3.description')
    }
  ];

  return (
    <section ref={ref} className="py-20 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-200 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-200 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3 rounded-full text-sm font-semibold mb-6 border border-blue-200">
              <Gift className="h-4 w-4" />
              {t('matriculaRewardsLanding.badge')}
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              <span className="text-slate-900">{t('matriculaRewardsLanding.hero.title')}</span>
              <span className="block text-transparent bg-clip-text bg-blue-600 mt-2">
                {t('matriculaRewardsLanding.hero.titleHighlight')}
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              {t('matriculaRewardsLanding.hero.subtitle')}
            </p>
          </motion.div>

          {/* How It Works - Mobile Optimized */}
          <motion.div variants={itemVariants} className="mb-16">
            <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="group relative"
                >
                  {/* Step Card */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                    {/* Step Number */}
                    <div className="w-16 h-16 mx-auto mb-6 relative">
                      <div className="absolute inset-0 rounded-full border-2 border-slate-300 group-hover:border-blue-400 transition-all duration-300"></div>
                      <div className="absolute inset-2 rounded-full border border-slate-400 group-hover:border-blue-500 transition-all duration-300"></div>
                      <div className="absolute inset-3 rounded-full bg-white text-slate-700 flex items-center justify-center font-bold text-lg group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-lg">
                        {index + 1}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-slate-900 mb-3 text-center group-hover:text-blue-600 transition-colors duration-300">
                      {step.title}
                    </h3>
                    
                    <p className="text-sm text-slate-600 text-center leading-relaxed">
                      {step.description}
                    </p>

                    {/* Connection line for desktop */}
                    {index < steps.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-full w-8 h-0.5 bg-slate-300 transform translate-x-0 group-hover:bg-blue-400 transition-all duration-500"></div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Interactive Calculator - Mobile First */}
         

          {/* Final CTA */}
          <motion.div variants={itemVariants} className="text-center">
            <motion.button
              onClick={onCTAClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-2xl border-2 border-blue-600 hover:border-blue-700"
            >
              <div className="flex items-center justify-center gap-3">
                <Gift className="h-6 w-6" />
                <span>{t('matriculaRewardsLanding.finalCta.cards.startNow.cta')}</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
            <p className="mt-4 text-sm text-slate-600 max-w-md mx-auto">
              {t('matriculaRewardsLanding.finalCta.description')}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ForStudents;