import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  CheckCircle, 
  BookOpen, 
  ShoppingCart, 
  FileText, 
  CreditCard, 
  GraduationCap,
  Users,
  Upload,
  Eye,
  DollarSign
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
  const [direction, setDirection] = useState(0);
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
      image: "/page 5.png"
    },
    {
      id: 6,
      title: t('stepByStepGuide.steps.step6.title'),
      description: t('stepByStepGuide.steps.step6.description'),
      icon: <CreditCard className="w-8 h-8" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      image: "/page 6.png"
    },
    {
      id: 7,
      title: t('stepByStepGuide.steps.step7.title'),
      description: t('stepByStepGuide.steps.step7.description'),
      icon: <FileText className="w-8 h-8" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      image: "/page 7.png"
    },
    {
      id: 8,
      title: t('stepByStepGuide.steps.step8.title'),
      description: t('stepByStepGuide.steps.step8.description'),
      icon: <Eye className="w-8 h-8" />,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      image: "/page 8.png"
    }
  ];

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setDirection(stepIndex > currentStep ? 1 : -1);
    setCurrentStep(stepIndex);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.width = `${progress}%`;
    }
  }, [progress]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

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
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden relative">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                title={t('stepByStepGuide.closeButton')}
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Play className="w-6 h-6" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-bold">
                    {t('stepByStepGuide.title')}
                  </Dialog.Title>
                  <p className="text-blue-100">
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

            {/* Content */}
            <div className="relative w-full">
              <div
                className="p-4 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center w-full"
              >
                {/* Left Side - Content */}
                <div className="flex-1 space-y-4 sm:space-y-6 w-full">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`p-2 sm:p-3 rounded-xl ${STEPS[currentStep].bgColor}`}>
                      <div className={STEPS[currentStep].color}>
                        {STEPS[currentStep].icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900">
                        {STEPS[currentStep].title}
                      </h3>
                      <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base leading-relaxed">
                        {STEPS[currentStep].description}
                      </p>
                    </div>
                  </div>

                  {/* Step Indicators */}
                  <div className="flex flex-wrap gap-2 mt-4 sm:mt-6">
                    {STEPS.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => goToStep(index)}
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all ${
                          index === currentStep
                            ? 'bg-blue-600 text-white'
                            : index < currentStep
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        ) : null}
                        {step.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Side - Image */}
                <div className="flex-1 flex justify-center w-full">
                  <div className="w-full max-w-xs sm:max-w-md">
                    {STEPS[currentStep].image ? (
                      <div
                        className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 flex items-center justify-center transition-transform duration-200 hover:scale-105 cursor-zoom-in relative min-h-[180px] min-w-[180px] sm:min-h-[320px] sm:min-w-[320px] max-w-full"
                        onClick={() => STEPS[currentStep].image && setPreviewImage(STEPS[currentStep].image!)}
                        title={t('stepByStepGuide.expandImage')}
                      >
                        <img
                          src={STEPS[currentStep].image}
                          alt={`Step ${STEPS[currentStep].id} screenshot`}
                          className="rounded-xl object-contain mx-auto w-full h-full"
                          style={{ background: '#fff', display: 'block', maxWidth: 320, maxHeight: 320 }}
                          onError={e => { 
                            e.currentTarget.style.display = 'none'; 
                            const nextSibling = e.currentTarget.nextElementSibling;
                            if (nextSibling && 'style' in nextSibling) {
                              (nextSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        {/* Fallback visual */}
                        <div style={{display:'none'}} className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-xl">
                          <span className="text-4xl text-gray-400 mb-2">🖼️</span>
                          <span className="text-xs text-gray-500">{t('stepByStepGuide.previewNotAvailable')}</span>
                        </div>
                        {/* Ícone de lupa */}
                        <span className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-1 text-xs shadow-lg pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" /></svg>
                        </span>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 sm:p-8 text-center">
                        <div className="text-blue-600 mb-2 sm:mb-4">
                          {STEPS[currentStep].icon}
                        </div>
                        <h4 className="font-semibold text-blue-900 mb-1 sm:mb-2 text-base sm:text-lg">
                          {STEPS[currentStep].title}
                        </h4>
                        <p className="text-blue-700 text-xs sm:text-sm">
                          {STEPS[currentStep].description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {t('stepByStepGuide.progress', { current: currentStep + 1, total: STEPS.length })}
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    currentStep === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('stepByStepGuide.previous')}
                </button>

                {currentStep === STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    {t('stepByStepGuide.startNow')}
                    <CheckCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    {t('stepByStepGuide.next')}
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