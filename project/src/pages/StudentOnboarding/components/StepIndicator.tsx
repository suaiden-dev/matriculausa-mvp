import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { OnboardingStep } from '../types';

interface StepIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
}

const STEPS: { key: OnboardingStep; label: string }[] = [
  { key: 'selection_fee', label: 'Selection Fee' },
  { key: 'scholarship_selection', label: 'Choose Scholarships' },
  { key: 'scholarship_review', label: 'Review Scholarships' },
  { key: 'process_type', label: 'Process Type' },
  { key: 'documents_upload', label: 'Upload Documents' },
  { key: 'waiting_approval', label: 'My Applications' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, completedSteps }) => {
  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const totalSteps = STEPS.length;

  return (
    <div className="w-full mb-6 sm:mb-8">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-4">
        <div
          className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step labels - simplified for mobile */}
      <div className="flex items-center justify-between text-sm sm:text-base text-gray-600 mb-4">
        <span className="font-medium">Step {currentStepIndex + 1} of {totalSteps}</span>
        <span className="font-semibold text-gray-900">{STEPS[currentStepIndex]?.label || 'Getting Started'}</span>
      </div>

      {/* Desktop: Show all steps */}
      <div className="hidden lg:flex items-center justify-between mt-6">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key);
          const isCurrent = step.key === currentStep;
          const isPast = index < currentStepIndex;

          return (
            <div
              key={step.key}
              className={`flex flex-col items-center flex-1 ${
                isCurrent ? 'text-blue-600' : isCompleted || isPast ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              <div className="mb-2">
                {isCompleted || isPast ? (
                  <CheckCircle className="w-7 h-7 text-green-500" />
                ) : (
                  <Circle className={`w-7 h-7 ${isCurrent ? 'text-blue-600 border-2 border-blue-600' : 'text-gray-400'}`} />
                )}
              </div>
              <span className="text-xs sm:text-sm text-center max-w-[100px] font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

