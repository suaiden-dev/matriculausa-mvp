import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';
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

const STEPS: Step[] = [
  {
    id: 1,
    title: "Welcome to Matrícula USA! 🎓",
    description: "Let's guide you through the entire application process for scholarships in the USA. It's easier than you think!",
    icon: <GraduationCap className="w-8 h-8" />, // Mantém o chapéu
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    id: 2,
    title: "1. Explore Scholarships",
    description: "Browse our list of scholarships. Each one has detailed information about values, requirements, and partner universities. Click on the ones that interest you!",
    icon: <BookOpen className="w-8 h-8" />, // Livro aberto
    color: "text-green-600",
    bgColor: "bg-green-50",
    image: "/page 2.png" // Screenshot real
  },
  {
    id: 3,
    title: "2. Add to Selection List",
    description: "Select the scholarships you want to apply for and add them to your selection list. You can choose multiple scholarships and manage your selections easily.",
    icon: <GraduationCap className="w-8 h-8" />, // Chapéu de formatura
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    image: "/page 3.png" // Screenshot real
  },
  {
    id: 4,
    title: "3. Student Type",
    description: "Select your student type: Initial, Transfer, or Status Change. This helps us direct the best opportunities for your profile.",
    icon: <Users className="w-8 h-8" />, // Ícone de usuários
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    image: "/page 4.png" // Screenshot real
  },
  {
    id: 5,
    title: "4. Upload Documents",
    description: "Upload your documents: Passport, High School Diploma, and a Bank Statement. Our team will review everything and give you feedback.",
    icon: <Upload className="w-8 h-8" />, // Upload
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    image: "/page 5.png" // Screenshot real
  },
  {
    id: 6,
    title: "5. Application Fee Selection",
    description: "Once your documents are approved, you must choose only one scholarship to proceed. (See the screenshot for details.)",
    icon: <CreditCard className="w-8 h-8" />, // Cartão de crédito
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    image: "/page 6.png" // Screenshot real
  },
  {
    id: 7,
    title: "6. My Applications & Scholarship Fee",
    description: "Inside 'My Applications', after paying the Application Fee, you will be able to pay the Scholarship Fee for your chosen scholarship.",
    icon: <FileText className="w-8 h-8" />, // Documento
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    image: "/page 7.png" // Screenshot real
  },
  {
    id: 8,
    title: "7. Application Chat & I-20 Control Fee",
    description: "In the Application Chat, you can talk directly to the university. The university may request more documents. Here you will also pay the I-20 Control Fee if required.",
    icon: <Eye className="w-8 h-8" />, // Olho para acompanhamento
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    image: "/page 8.png" // Screenshot real
  }
];

interface StepByStepGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const StepByStepGuide: React.FC<StepByStepGuideProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
                title="Close step-by-step guide"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Play className="w-6 h-6" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-bold">
                    Step-by-Step Guide
                  </Dialog.Title>
                  <p className="text-blue-100">
                    How the application process works
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
                        onClick={() => setPreviewImage(STEPS[currentStep].image)}
                        title="Expand image"
                      >
                        <img
                          src={STEPS[currentStep].image}
                          alt={`Step ${STEPS[currentStep].id} screenshot`}
                          className="rounded-xl object-contain mx-auto w-full h-full"
                          style={{ background: '#fff', display: 'block', maxWidth: 320, maxHeight: 320 }}
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                        />
                        {/* Fallback visual */}
                        <div style={{display:'none'}} className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-xl">
                          <span className="text-4xl text-gray-400 mb-2">🖼️</span>
                          <span className="text-xs text-gray-500">Preview not available</span>
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
                Step {currentStep + 1} of {STEPS.length}
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
                  Previous
                </button>

                {currentStep === STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Start Now!
                    <CheckCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Next
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