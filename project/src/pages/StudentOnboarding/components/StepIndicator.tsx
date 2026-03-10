import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingStep } from '../types';

interface StepIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  steps?: { key: OnboardingStep; label: string }[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, completedSteps }) => {
  const { t } = useTranslation();

  const STEPS: { key: OnboardingStep; label: string }[] = [
    { key: 'selection_fee', label: t('studentOnboarding.stepper.steps.selectionFee') },
    { key: 'selection_survey', label: t('studentOnboarding.stepper.steps.selectionSurvey') },
    { key: 'scholarship_selection', label: t('studentOnboarding.stepper.steps.scholarshipSelection') },
    { key: 'process_type', label: t('studentOnboarding.stepper.steps.processType') },
    { key: 'documents_upload', label: t('studentOnboarding.stepper.steps.documentsUpload') },
    { key: 'payment', label: t('studentOnboarding.stepper.steps.payment') },
    { key: 'scholarship_fee', label: t('studentOnboarding.stepper.steps.scholarshipFee') },
  ];

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const totalSteps = STEPS.length;

  return (
    <div className="w-full mb-6 sm:mb-8 bg-white border border-gray-100 rounded-3xl p-4 md:p-6 shadow-xl">
      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden border border-gray-100">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step labels - simplified for mobile */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-6 px-1">
        <span className="font-bold tracking-widest uppercase">{t('studentOnboarding.stepper.step')} {currentStepIndex + 1} {t('studentOnboarding.stepper.of')} {totalSteps}</span>
        <span className="font-black text-gray-900 uppercase tracking-tight">{STEPS[currentStepIndex]?.label || t('studentOnboarding.stepper.initiating')}</span>
      </div>

      {/* Desktop: Show all steps */}
      <div className="hidden lg:flex items-center justify-between mt-4 relative">
        {/* Linha de conexão de fundo */}
        <div className="absolute top-4 left-0 w-full h-[1px] bg-gray-200 z-0" />

        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key);
          const isCurrent = step.key === currentStep;
          const isPast = index < currentStepIndex;

          return (
            <div
              key={step.key}
              className={`flex flex-col items-center flex-1 z-10 transition-all duration-500 ${isCurrent ? 'scale-110' : ''
                }`}
            >
              <div className="mb-3 relative">
                {isCompleted || isPast ? (
                  <div className="bg-emerald-500/10 rounded-full p-1 border border-emerald-500/20">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isCurrent ? 'bg-blue-600 border-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-gray-50 border-gray-200'}`}>
                    {isCurrent ? (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                    )}
                  </div>
                )}
              </div>
              <span className={`text-[10px] text-center max-w-[100px] font-bold uppercase tracking-tighter transition-colors duration-500 ${isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

