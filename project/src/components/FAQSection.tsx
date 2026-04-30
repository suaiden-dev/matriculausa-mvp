import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FAQSection: React.FC = () => {
  const { t } = useTranslation();
  const controls = useAnimation();
  const { ref, inView } = useInView({ triggerOnce: true });
  const [openItem, setOpenItem] = useState<number | null>(null);
  const contentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

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
        duration: 0.6
      }
    }
  };

  const toggleItem = (index: number) => {
    setOpenItem((current) => (current === index ? null : index));
  };

  const faqs = t('forStudents.faq.items', { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>;

  return (
    <section ref={ref} className="py-24 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          animate={controls}
          initial="hidden"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">
              {t('forStudents.faq.title')}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t('forStudents.faq.subtitle')}
            </p>
          </motion.div>

          <motion.div variants={containerVariants} className="w-full">
            {faqs.map((faq, index) => {
              const isOpen = openItem === index;

              return (
                <div
                  key={index}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    aria-expanded={isOpen}
                    className="flex items-center justify-between w-full py-6 text-left text-[#05294E] hover:text-[#D0151C] transition-colors duration-300 focus:outline-none"
                  >
                    <span className="text-xl font-bold pr-8">{faq.question}</span>

                    <div className="relative w-6 h-6 flex-shrink-0">
                      <Plus
                        className={`absolute inset-0 text-[#05294E] transition-opacity duration-300 ${isOpen ? "opacity-0" : "opacity-100"}`}
                        strokeWidth={2}
                      />
                      <Minus
                        className={`absolute inset-0 text-[#D0151C] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
                        strokeWidth={2}
                      />
                    </div>
                  </button>

                  {/* Content wrapper */}
                  <motion.div
                    initial={false}
                    animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div
                      ref={(el) => {
                        contentRefs.current[index] = el;
                      }}
                      className="pb-6 text-slate-600 text-lg leading-relaxed select-text pr-12"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </motion.div>
                </div>
              );
            })}
          </motion.div>

          <motion.div variants={itemVariants} className="text-center mt-12">
            <p className="text-lg text-slate-500">
              {t('forStudents.faq.contact')}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;