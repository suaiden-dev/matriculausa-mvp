import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import WhyDifferentSection from '../components/WhyDifferentSection';
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
  Quote
} from 'lucide-react';

const ForStudents: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Scroll Progress Bar */}
      {/* <ScrollProgress /> */}
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Benefits Section */}
      <BenefitsSection />
      
      {/* Social Proof Section */}
      <SocialProofSection />
      
      {/* Why Different Section */}
      <WhyDifferentSection />
      
      {/* How It Works Section */}
      <HowItWorksSection />
      
      {/* Comparison Section */}
      <ComparisonSection />
      
      {/* FAQ Section */}
      <FAQSection />
      
      {/* Guarantee Section */}
      <GuaranteeSection />
      
      {/* Special Offer Section - CTA FINAL */}
      <SpecialOfferSection />
    </div>
  );
};

// Hero Section Component
const HeroSection: React.FC = () => {
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
              <span className="block">Estude nos EUA com</span>
              <span className="block bg-gradient-to-r from-[#D0151C] to-red-400 bg-clip-text text-transparent">
                bolsas de estudos exclusivas
              </span>
              <span className="block text-2xl md:text-3xl lg:text-4xl mt-4 font-bold">
                Processo Seletivo com IA
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              variants={itemVariants}
              className="text-lg md:text-xl text-slate-200 leading-relaxed mb-8"
            >
              Estude pagando <span className="text-[#D0151C] font-bold">até 50% menos</span>, com bolsas híbridas e 
              chance de trabalhar legalmente — por apenas <span className="text-yellow-400 font-bold">$350</span> para começar.
            </motion.p>

            {/* CTA Button */}
            <motion.div variants={itemVariants} className="mb-8">
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(208, 21, 28, 0.4)"
                }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-8 md:px-12 py-4 md:py-6 bg-[#D0151C] text-white font-bold text-lg md:text-xl rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group w-full sm:w-auto justify-center"
              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 mr-3 group-hover:animate-spin" />
                Começar Agora
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>

            {/* Trust Elements */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-sm md:text-base">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <span>Aprovação em 24h</span>
              </div>
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-blue-400 mr-2" />
                <span>100% Garantido</span>
              </div>
              <div className="flex items-center">
                <Globe className="w-5 h-5 text-yellow-400 mr-2" />
                <span>+10.000 aprovados</span>
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
const BenefitsSection: React.FC = () => {
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
      title: "Economia Garantida",
      description: "Por apenas $350, acesse oportunidades que podem economizar milhares de dólares",
      highlight: "Até 90% de desconto",
      color: "emerald"
    },
    {
      icon: Clock,
      title: "Aprovação Rápida",
      description: "Receba ofertas de bolsas compatíveis com seu perfil em poucas semanas",
      highlight: "Em até 24h",
      color: "blue"
    },
    {
      icon: Globe,
      title: "Modalidade Híbrida",
      description: "Estude menos tempo presencialmente e mais online, facilitando sua adaptação",
      highlight: "Flexibilidade total",
      color: "purple"
    },
    {
      icon: Target,
      title: "Múltiplas Oportunidades",
      description: "Uma inscrição te coloca em vários processos seletivos ao mesmo tempo",
      highlight: "+45 universidades",
      color: "orange"
    },
    {
      icon: Shield,
      title: "100% Garantido",
      description: "Se não for aprovado, você recebe todo seu dinheiro de volta",
      highlight: "Risco zero",
      color: "red"
    },
    {
      icon: GraduationCap,
      title: "Suporte Completo",
      description: "Mentoria e acompanhamento durante todo o processo de aplicação",
      highlight: "24/7 disponível",
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
              Vantagens que fazem a diferença
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Descubra por que milhares de estudantes escolhem o Matrícula USA para realizar o sonho americano
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
                        {benefit.title}
                      </h3>
                      <span className={`text-xs font-bold ${colorClasses.text} bg-white px-2 py-1 rounded-full border ${colorClasses.border}`}>
                        {benefit.highlight}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {benefit.description}
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
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-12 py-6 bg-gradient-to-r from-[#D0151C] to-red-600 text-white font-bold text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <Sparkles className="w-6 h-6 mr-3" />
              Descobrir minha bolsa ideal
              <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// How It Works Section Component
const HowItWorksSection: React.FC = () => {
  const { ref } = useInView({ triggerOnce: true, threshold: 0.1 });

  const steps = [
    {
      step: 1,
      icon: DollarSign,
      title: "Taxa do Processo",
      description: "Pague a Taxa do Processo Seletivo de $350 e envie seus documentos.",
      price: "$350"
    },
    {
  step: 2,
  icon: Brain,
  title: "Escolha da Bolsa",
  description: "Você escolhe a bolsa que deseja aplicar. A IA só entra depois, analisando seus documentos para a aplicação.",
  price: "Grátis"
    },
    {
      step: 3,
      icon: UserCheck,
      title: "Aplicação e Pré-aprovação",
      description: "Você aplica para quantas quiser e recebe pré-aprovação.",
      price: "Grátis"
    },
    {
  step: 4,
  icon: CreditCard,
  title: "Taxa de Matrícula",
  description: "A taxa de matrícula é definida pela universidade e pode variar conforme a bolsa concedida.",
  price: "A definir"
    },
    {
      step: 5,
      icon: Award,
      title: "Taxa da Bolsa",
      description: "Pague a Taxa da Bolsa de $550 para formalizar a concessão.",
      price: "$550"
    },
    {
      step: 6,
      icon: FileText,
      title: "Control i20 Fee",
      description: "Pague a Control i20 Fee de $900 (até 10 dias após aprovação).",
      price: "$900"
    },
    {
      step: 7,
      icon: CheckCircle,
      title: "Vaga Garantida",
      description: "Sua vaga está segura e garantida — estamos prontos para te acompanhar.",
      price: "✓"
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
              {step.title}
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              {step.description}
            </p>
          </div>
          {/* Price */}
          <div className="flex-shrink-0 mt-6 md:mt-0 md:ml-8">
            <div className={`px-6 py-4 rounded-2xl font-bold text-lg border-2 ${
              step.price === "Grátis" 
                ? "bg-green-50 text-green-700 border-green-200" 
                : step.price === "✓" 
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-gradient-to-r from-[#D0151C] to-red-600 text-white border-transparent shadow-lg"
            }`}>
              {step.price}
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
            Como Funciona
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Processo simples e transparente em 7 passos para garantir sua bolsa de estudos
          </p>
        </div>
        {/* Steps com AnimatedList */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/5 to-[#D0151C]/5 rounded-3xl"></div>
          <div className="relative space-y-6 p-8">
            <AnimatedList items={stepCards} stagger={0.2} />
          </div>
        </div>
        {/* Final CTA */}
        <div className="text-center mt-16">
          <button
            className="inline-flex items-center px-12 py-6 bg-[#05294E] text-white font-bold text-xl rounded-2xl shadow-2xl hover:bg-[#0a3a62] transition-all duration-300 group"
          >
            <GraduationCap className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
            COMEÇAR AGORA
            <span className="ml-3">→</span>
          </button>
          <p className="mt-4 text-slate-500">
            Comece sua jornada para estudar nos EUA hoje mesmo
          </p>
        </div>
      </div>
    </section>
  );
};

// Comparison Section Component - Antes vs Depois
const ComparisonSection: React.FC = () => {
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

  const problems = [
    "Meses de pesquisa por universidades e bolsas sem saber se é elegível",
    "Nenhuma opção de estudar de forma híbrida",
    "Pagamento do valor integral da universidade (média $20.000/ano)",
    "Dificuldade para conseguir permissão de trabalho",
    "Insegurança se a bolsa vai sair",
    "Suporte inexistente após a matrícula",
    "Medo de investir e perder dinheiro",
    "Custo total muito maior no longo prazo"
  ];

  const solutions = [
    "IA exclusiva e equipe especializada mostram apenas bolsas que você pode realmente conquistar",
    "Bolsas híbridas que permitem estudar presencialmente poucas vezes ao ano, economizando moradia e transporte. Economia média de U$1,000/Year",
    "Bolsas que reduzem até 50% do valor, gerando economia de até $40.000 no curso",
    "Acesso a bolsas que oferecem OPT e CPT para trabalhar legalmente nos EUA",
    "Garantia de aprovação ou devolução do valor do processo seletivo",
    "Suporte exclusivo até o início das aulas",
    "Investimento inicial acessível (a partir de $350) com retorno alto em economia total",
    "Mesmo com todas as taxas, você economiza em média $37.000 no curso"
  ];

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
              De gasto alto e incerteza… para economia real e aprovação garantida
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Veja a diferença real entre estudar por conta própria vs. com o Matrícula USA
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
                  <h3 className="text-2xl font-bold text-red-600">Sem Matrícula USA</h3>
                  <p className="text-red-400">Processo tradicional</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {problems.map((problem, index) => (
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
                  💸 Custo total estimado: $80.000 - $120.000
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
                  <h3 className="text-2xl font-bold text-[#05294E]">Com Matrícula USA</h3>
                  <p className="text-green-600">Processo inteligente</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {solutions.map((solution, index) => (
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
                  💰 Economia média: $37.000 no curso total
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div variants={cardVariants} className="text-center">
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(208, 21, 28, 0.4)"
              }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-12 py-6 bg-[#D0151C] text-white font-bold text-xl rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group"
            >
              <TrendingUp className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" />
              QUERO ECONOMIZAR $37.000
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
const SpecialOfferSection: React.FC = () => {
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
  };  const benefits = [
    {
      icon: Zap,
      title: "Análise em 24h",
      description: "Análise de perfil em 24 horas para já saber suas melhores opções"
    },
    {
      icon: Sparkles,
      title: "Prioridade nas Bolsas",
      description: "Prioridade nas bolsas com vagas limitadas"
    },
    {
      icon: CheckCircle,
      title: "Acesso Antecipado",
      description: "Acesso antecipado às bolsas híbridas (as mais procuradas)"
    },
    {
      icon: ShieldCheck,
      title: "Suporte Dedicado",
      description: "Suporte dedicado para concluir sua inscrição sem erros"
    }
  ];

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
              Ganhe prioridade nas bolsas mais disputadas e benefícios exclusivos
            </h2>
            <p className="text-xl text-slate-200 max-w-3xl mx-auto mb-8">
              Ao se inscrever hoje, você garante:
            </p>
          </motion.div>

          {/* Benefits Grid */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            {benefits.map((benefit, index) => (
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
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="text-slate-200 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Urgency Section */}
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-r from-[#D0151C]/20 to-red-500/20 backdrop-blur-lg rounded-3xl p-8 border border-[#D0151C]/30 mb-12"
          >
            <div className="flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-yellow-400 mr-3" />
              <h3 className="text-2xl font-bold text-yellow-400">Atenção: Vagas Limitadas</h3>
            </div>
            <p className="text-center text-lg leading-relaxed">
              As bolsas são liberadas por ordem de inscrição. 
              <span className="text-[#D0151C] font-bold"> Cada dia de atraso pode significar perder a vaga dos seus sonhos.</span>
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div variants={itemVariants} className="text-center">
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 25px 50px rgba(208, 21, 28, 0.5)"
              }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-16 py-8 bg-[#D0151C] text-white font-black text-2xl rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center">
                <Sparkles className="w-8 h-8 mr-4 group-hover:animate-spin" />
                QUERO MINHA BOLSA AGORA
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="ml-4 text-3xl"
                >
                  🚀
                </motion.div>
              </div>
            </motion.button>
            <p className="mt-4 text-slate-300 text-sm">
              ⏰ Oferta válida por tempo limitado
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Guarantee Section Component
const GuaranteeSection: React.FC = () => {
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
  };  const guarantees = [
    {
      icon: Shield,
      title: "Garantia de Aprovação",
      description: "Se você seguir nosso processo e não for aprovado, devolvemos o valor da Taxa do Processo Seletivo integralmente.",
      color: "bg-green-500"
    },
    {
      icon: DollarSign,
      title: "Processo Transparente",
      description: "Sem taxas escondidas ou custos surpresa. Você sabe exatamente quanto vai pagar do início ao fim.",
      color: "bg-blue-500"
    },
    {
      icon: PhoneCall,
      title: "Apoio até a Chegada",
      description: "Não paramos no aceite da universidade. Nossa equipe acompanha todo o processo até o embarque.",
      color: "bg-purple-500"
    }
  ];

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
              Aprovação garantida ou seu dinheiro de volta
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Sabemos que investir no seu futuro exige confiança. Por isso, o Matrícula USA é o único programa que oferece:
            </p>
          </motion.div>

          {/* Guarantees Grid */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          >
            {guarantees.map((guarantee, index) => (
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
                
                <div className={`${guarantee.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <guarantee.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-[#05294E] mb-4">
                  {guarantee.title}
                </h3>
                
                <p className="text-slate-600 leading-relaxed">
                  {guarantee.description}
                </p>
              </motion.div>
            ))}
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
              O risco é todo nosso. Para você, é só aproveitar a oportunidade.
            </h3>
            
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(255, 255, 255, 0.2)"
              }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-12 py-6 bg-white text-[#05294E] font-bold text-xl rounded-2xl shadow-2xl hover:bg-slate-100 transition-all duration-300 group"
            >
              <RefreshCw className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
              COMEÇAR SEM RISCOS
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
const SocialProofSection: React.FC = () => {
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

  const testimonials = [
    {
      name: "Maria Silva",
      university: "University of California",
      course: "Computer Science",
      text: "Consegui uma bolsa de 40% e estou realizando meu sonho de estudar nos EUA. O processo foi muito mais simples do que imaginava.",
      image: "/api/placeholder/60/60",
      savings: "$18,000"
    },
    {
      name: "João Santos",
      university: "Arizona State University", 
      course: "Business Administration",
      text: "A modalidade híbrida foi perfeita para mim. Economizei muito em hospedagem e ainda tenho a experiência presencial.",
      image: "/api/placeholder/60/60",
      savings: "$22,000"
    },
    {
      name: "Ana Costa",
      university: "Florida International University",
      course: "International Business",
      text: "Aprovada em 3 universidades diferentes! A IA realmente encontrou as melhores opções para o meu perfil.",
      image: "/api/placeholder/60/60",
      savings: "$25,000"
    },
    {
      name: "Carlos Mendes",
      university: "Northern Arizona University",
      course: "Engineering",
      text: "Incrível como o processo foi rápido. Em 3 semanas já tinha 2 aprovações com bolsas excelentes!",
      image: "/api/placeholder/60/60",
      savings: "$30,000"
    },
    {
      name: "Fernanda Lima",
      university: "University of South Florida",
      course: "Marketing",
      text: "O suporte foi fantástico do início ao fim. Agora estou estudando e trabalhando legalmente nos EUA!",
      image: "/api/placeholder/60/60",
      savings: "$20,000"
    },
    {
      name: "Roberto Silva",
      university: "California State University",
      course: "Data Science",
      text: "Consegui uma bolsa híbrida que me permite estudar online e presencialmente. Perfeito para minha situação!",
      image: "/api/placeholder/60/60",
      savings: "$35,000"
    }
  ];

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
              Mais de 150 alunos aprovados só em 2024
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Veja o que nossos alunos estão dizendo sobre sua experiência
            </p>
          </motion.div>

          {/* Statistics */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-16"
          >
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <div className="text-2xl md:text-4xl font-black text-[#D0151C] mb-2">150+</div>
              <div className="text-slate-600 text-sm md:text-base">Alunos aprovados</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <div className="text-2xl md:text-4xl font-black text-[#D0151C] mb-2">92%</div>
              <div className="text-slate-600 text-sm md:text-base">Taxa de aprovação</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <div className="text-2xl md:text-4xl font-black text-[#D0151C] mb-2">$35k</div>
              <div className="text-slate-600 text-sm md:text-base">Economia média</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <div className="text-2xl md:text-4xl font-black text-[#D0151C] mb-2">45</div>
              <div className="text-slate-600 text-sm md:text-base">Universidades parceiras</div>
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
                        Economizou {testimonial.savings}
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
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(208, 21, 28, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-12 py-6 bg-[#D0151C] text-white font-bold text-xl rounded-2xl shadow-2xl hover:bg-red-600 transition-all duration-300 group"
            >
              <CheckCircle className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" />
              SER O PRÓXIMO APROVADO
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

export default ForStudents;