import { motion, useAnimation } from 'framer-motion';
import React, { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

const WhyDifferentSection: React.FC = () => {
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
    hidden: { x: -30, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };

  // CSS Animation styles for smooth vertical scrolling
  const scrollAnimation = `
    @keyframes verticalScroll {
      0% {
        transform: translateY(0);
      }
      100% {
        transform: translateY(-50%);
      }
    }
    
    .vertical-scroll {
      animation: verticalScroll 24s linear infinite;
    }
    
    .vertical-scroll:hover {
      animation-play-state: paused;
    }
    
    .scroll-container {
      height: 400px;
      overflow: hidden;
      position: relative;
      background: linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 15%, rgba(255,255,255,0) 85%, rgba(255,255,255,0.9) 100%);
    }
    
    .scroll-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to bottom, white 0%, rgba(255,255,255,0.8) 50%, transparent 100%);
      z-index: 10;
      pointer-events: none;
    }
    
    .scroll-container::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to top, white 0%, rgba(255,255,255,0.8) 50%, transparent 100%);
      z-index: 10;
      pointer-events: none;
    }
  `;

  const differentials = [
    {
      title: "Conexão direta com universidades",
      description: "Relacionamento direto com mais de 45 universidades americanas, garantindo acesso exclusivo a oportunidades."
    },
    {
      title: "Bolsas exclusivas e opções híbridas",
      description: "Acesso a bolsas que você não encontra em outros lugares, incluindo modalidades híbridas inovadoras."
    },
    {
      title: "Processo simples, online e seguro",
      description: "Tecnologia avançada que simplifica todo o processo de aplicação, do perfil à aprovação."
    },
    {
      title: "Garantia de aprovação ou reembolso",
      description: "Somos a única plataforma que garante sua aprovação ou devolve 100% do valor investido."
    },
    {
      title: "Possibilidade de trabalhar legalmente nos EUA",
      description: "Bolsas com direito a OPT e CPT, permitindo experiência de trabalho durante e após os estudos."
    }
  ];

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
        >
          {/* Section Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">
              Por que o Matrícula USA é diferente?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Nossa plataforma tecnológica redefine o caminho para estudar nos EUA
            </p>
          </motion.div>

          {/* Vertical Scrolling Container */}
          <motion.div variants={containerVariants} className="max-w-3xl mx-auto">
            <div className="scroll-container">
              <div className="vertical-scroll px-8 space-y-6">
                {/* First set of cards */}
                {differentials.map((item, index) => (
                  <div
                    key={`first-${index}`}
                    className="bg-white border-l-4 border-[#05294E] p-8 rounded-r-lg shadow-[0_4px_20px_-2px_rgba(5,41,78,0.08)] hover:shadow-[0_8px_30px_-4px_rgba(5,41,78,0.12)] hover:border-[#D0151C] transition-all duration-300 cursor-pointer transform hover:scale-[1.02] mb-6"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-[#05294E] font-mono text-sm font-bold bg-gradient-to-r from-slate-100 to-slate-200 px-3 py-1 rounded-lg flex-shrink-0 mt-1">
                        0{index + 1}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-[#05294E] leading-tight mb-2">
                          {item.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-base">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Duplicate set for seamless loop */}
                {differentials.map((item, index) => (
                  <div
                    key={`second-${index}`}
                    className="bg-white border-l-4 border-[#05294E] p-8 rounded-r-lg shadow-[0_4px_20px_-2px_rgba(5,41,78,0.08)] hover:shadow-[0_8px_30px_-4px_rgba(5,41,78,0.12)] hover:border-[#D0151C] transition-all duration-300 cursor-pointer transform hover:scale-[1.02] mb-6"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-[#05294E] font-mono text-sm font-bold bg-gradient-to-r from-slate-100 to-slate-200 px-3 py-1 rounded-lg flex-shrink-0 mt-1">
                        0{index + 1}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-[#05294E] leading-tight mb-2">
                          {item.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-base">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: scrollAnimation }} />
    </section>
  );
};

export default WhyDifferentSection;