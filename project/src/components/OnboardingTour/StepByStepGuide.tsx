import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  CheckCircle, 
  BookOpen, 
  FileText, 
  CreditCard, 
  GraduationCap,
  Users,
  Upload,
  Home
} from 'lucide-react';
import ImagePreviewModal from '../ImagePreviewModal';

interface Step {
  id: number;
  title: string;
  description: string;
  image?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface StepByStepGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const StepByStepGuide: React.FC<StepByStepGuideProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const STEPS: Step[] = [
    {
      id: 1,
      title: t('stepByStepGuide.steps.step1.title'),
      description: t('stepByStepGuide.steps.step1.description'),
      icon: <GraduationCap className="w-8 h-8" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      id: 2,
      title: t('stepByStepGuide.steps.step2.title'),
      description: t('stepByStepGuide.steps.step2.description'),
      icon: <BookOpen className="w-8 h-8" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      image: "/page 2.png"
    },
    {
      id: 3,
      title: t('stepByStepGuide.steps.step3.title'),
      description: t('stepByStepGuide.steps.step3.description'),
      icon: <GraduationCap className="w-8 h-8" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      image: "/page 3.png"
    },
    {
      id: 4,
      title: t('stepByStepGuide.steps.step4.title'),
      description: t('stepByStepGuide.steps.step4.description'),
      icon: <Users className="w-8 h-8" />,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      image: "/page 4.png"
    },
    {
      id: 5,
      title: t('stepByStepGuide.steps.step5.title'),
      description: t('stepByStepGuide.steps.step5.description'),
      icon: <Upload className="w-8 h-8" />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      image: "/page 5.jpeg"
    },
    {
      id: 6,
      title: t('stepByStepGuide.steps.step6.title'),
      description: t('stepByStepGuide.steps.step6.description'),
      icon: <CreditCard className="w-8 h-8" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      image: "/page 6.jpeg"
    },
    {
      id: 7,
      title: t('stepByStepGuide.steps.step7.title'),
      description: t('stepByStepGuide.steps.step7.description'),
      icon: <FileText className="w-8 h-8" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      image: "/page  7.jpeg"
    }
  ];

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.width = `${progress}%`;
    }
  }, [progress]);

  // Esconder botões flutuantes quando modal está ativo
  useEffect(() => {
    if (!isOpen) return;
    
    // Pequeno delay para garantir que o modal está totalmente renderizado
    const timer = setTimeout(() => {
      // Esconder todos os botões flutuantes possíveis
      const selectors = [
        '.floating-whatsapp-button',
        '.floating-whatsapp-area',
        '.floating-cart-button', 
        '.floating-cart-area',
        '[class*="smart-chat"]',
        '[title*="Smart Assistant"]',
        '[title*="Help & Support"]',
        '[data-testid="cart-icon"]',
        'div[style*="position: fixed"][style*="bottom"]',
        'div[style*="position: fixed"][style*="right"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          (element as HTMLElement).style.setProperty('display', 'none', 'important');
        });
      });
    }, 50);
    
    return () => {
      clearTimeout(timer);
      // Restaurar botões quando modal fecha
      const selectors = [
        '.floating-whatsapp-button',
        '.floating-whatsapp-area',
        '.floating-cart-button',
        '.floating-cart-area', 
        '[class*="smart-chat"]',
        '[title*="Smart Assistant"]',
        '[title*="Help & Support"]',
        '[data-testid="cart-icon"]',
        'div[style*="position: fixed"][style*="bottom"]',
        'div[style*="position: fixed"][style*="right"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          (element as HTMLElement).style.removeProperty('display');
        });
      });
    };
  }, [isOpen]);


  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="relative z-50"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
          <Dialog.Panel className="w-full max-w-[92vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden relative max-h-[96vh] sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 sm:p-6">
              <button
                onClick={onClose}
                className="absolute top-1.5 right-1.5 sm:top-4 sm:right-4 p-1 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
                title={t('stepByStepGuide.closeButton')}
              >
                <X className="w-4 h-4 sm:w-6 sm:h-6" />
              </button>
              
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4 pr-6 sm:pr-8">
                <div className="p-1 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                  <Play className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-base sm:text-2xl font-bold truncate">
                    {t('stepByStepGuide.title')}
                  </Dialog.Title>
                  <p className="text-blue-100 text-xs sm:text-base">
                    {t('stepByStepGuide.subtitle')}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/20 rounded-full h-2">
                <motion.div
                  ref={progressRef}
                  className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Content - Layout Moderno */}
            <div className="relative w-full flex-1 overflow-y-auto">
              <div className="p-4 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-start w-full min-h-0">
                
                {/* Left Side - Content */}
                <div className="w-full lg:w-2/5 space-y-4 sm:space-y-6">
                  {/* Step Header */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${STEPS[currentStep].bgColor}`}>
                      <div className={`${STEPS[currentStep].color} w-6 h-6 sm:w-8 sm:h-8`}>
                        {STEPS[currentStep].icon}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
                        {STEPS[currentStep].title}
                      </h3>
                      <p className="text-gray-600 mt-2 text-sm sm:text-base leading-relaxed">
                        {STEPS[currentStep].description}
                      </p>
                    </div>
                  </div>

                  {/* Step Indicators - Layout mais limpo */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {STEPS.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => goToStep(index)}
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all min-w-[36px] sm:min-w-[44px] text-center flex items-center justify-center ${
                          index === currentStep
                            ? 'bg-blue-600 text-white shadow-lg'
                            : index < currentStep
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                        ) : null}
                        {index === 0 ? (
                          <Home className="w-4 h-4" />
                        ) : (
                          index
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Side - Image em Destaque */}
                <div className="w-full lg:w-3/5 flex justify-center">
                  <div className="w-full max-w-[280px] sm:max-w-[350px] lg:max-w-[400px]">
                    {STEPS[currentStep].image ? (
                      <div
                        className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 flex items-center justify-center transition-transform duration-200 hover:scale-105 cursor-zoom-in relative aspect-square w-full"
                        onClick={() => STEPS[currentStep].image && setPreviewImage(STEPS[currentStep].image!)}
                        title={t('stepByStepGuide.expandImage')}
                      >
                        <img
                          src={STEPS[currentStep].image}
                          alt={`Step ${STEPS[currentStep].id} screenshot`}
                          className="rounded-xl object-contain mx-auto w-full h-full"
                          style={{ background: '#fff' }}
                          onError={e => { 
                            console.error('❌ [StepByStepGuide] Erro ao carregar imagem:', STEPS[currentStep].image);
                            e.currentTarget.style.display = 'none'; 
                            const nextSibling = e.currentTarget.nextElementSibling;
                            if (nextSibling && 'style' in nextSibling) {
                              (nextSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                          onLoad={() => {
                            console.log('✅ [StepByStepGuide] Imagem carregada com sucesso:', STEPS[currentStep].image);
                          }}
                        />
                        {/* Fallback visual */}
                        <div style={{display:'none'}} className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-xl">
                          <span className="text-3xl text-gray-400 mb-2">🖼️</span>
                          <span className="text-sm text-gray-500 text-center px-2">{t('stepByStepGuide.previewNotAvailable')}</span>
                        </div>
                        {/* Ícone de lupa */}
                        <span className="absolute bottom-3 right-3 bg-blue-600 text-white rounded-full p-2 shadow-lg pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" /></svg>
                        </span>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 sm:p-8 text-center aspect-square flex flex-col justify-center">
                        <div className="text-blue-600 mb-4 w-12 h-12 sm:w-16 sm:h-16 mx-auto">
                          {STEPS[currentStep].icon}
                        </div>
                        <h4 className="font-semibold text-blue-900 mb-2 text-base sm:text-lg">
                          {STEPS[currentStep].title}
                        </h4>
                        <p className="text-blue-700 text-sm leading-relaxed">
                          {STEPS[currentStep].description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="text-sm text-gray-500 text-center sm:text-left">
                {t('stepByStepGuide.progress').replace('{current}', (currentStep + 1).toString()).replace('{total}', STEPS.length.toString())}
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm flex-1 sm:flex-none ${
                    currentStep === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('stepByStepGuide.previous')}</span>
                  <span className="sm:hidden">Prev</span>
                </button>

                {currentStep === STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">{t('stepByStepGuide.startNow')}</span>
                    <span className="sm:hidden">Start</span>
                    <CheckCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">{t('stepByStepGuide.next')}</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {/* Modal de imagem dentro do Dialog, acima de tudo */}
            {previewImage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};

export default StepByStepGuide; 