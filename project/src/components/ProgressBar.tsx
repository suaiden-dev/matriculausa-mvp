import React from 'react';
import { CheckCircle, ArrowRight, DollarSign, FileText, Award, Globe } from 'lucide-react';

interface ProgressBarProps {
  hasPaidSelectionProcessFee: boolean;
  hasPaidApplicationFee: boolean;
  hasPaidScholarshipFee: boolean;
  hasPaidI20ControlFee: boolean;
}

const steps = [
  {
    key: 'selection_process',
    label: 'Selection Process Fee',
    value: 350,
    icon: <Award className="w-6 h-6" />,
  },
  {
    key: 'application',
    label: 'Application Fee',
    value: 150,
    icon: <FileText className="w-6 h-6" />,
  },
  {
    key: 'scholarship',
    label: 'Scholarship Fee',
    value: 550,
    icon: <DollarSign className="w-6 h-6" />,
  },
  {
    key: 'i20_control',
    label: 'I-20 Control Fee',
    value: 200,
    icon: <Globe className="w-6 h-6" />,
  },
];

const ProgressBar: React.FC<ProgressBarProps> = ({
  hasPaidSelectionProcessFee,
  hasPaidApplicationFee,
  hasPaidScholarshipFee,
  hasPaidI20ControlFee,
}) => {
  const statusArr = [
    hasPaidSelectionProcessFee,
    hasPaidApplicationFee,
    hasPaidScholarshipFee,
    hasPaidI20ControlFee,
  ];

  // Find the index of the next unpaid step
  const nextStepIdx = statusArr.findIndex((paid) => !paid);

  return (
    <div className="w-full flex flex-col items-center mb-8">
      <div className="flex w-full max-w-3xl items-center justify-between relative">
        {steps.map((step, idx) => {
          const isPaid = statusArr[idx];
          const isNext = idx === nextStepIdx;
          const isFuture = idx > nextStepIdx;
          let color = 'bg-gray-300 border-gray-400 text-gray-500';
          if (isPaid) color = 'bg-green-500 border-green-600 text-white';
          else if (isNext) color = 'bg-yellow-400 border-yellow-500 text-yellow-900 animate-pulse';

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative">
              <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center mb-2 z-10 ${color}`}
                style={{ boxShadow: isNext ? '0 0 0 4px #fde68a' : undefined }}>
                {isPaid ? <CheckCircle className="w-7 h-7" /> : step.icon}
              </div>
              <span className="text-xs font-semibold text-center whitespace-nowrap">
                {step.label}
              </span>
              <span className="text-xs text-gray-500 font-bold mt-1">${step.value}</span>
              {/* Arrow to next step */}
              {isNext && idx < steps.length - 1 && (
                <ArrowRight className="absolute right-[-32px] top-5 w-8 h-8 text-yellow-400 animate-bounce" />
              )}
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className={`absolute top-6 left-full w-8 h-1 ${isPaid ? 'bg-green-500' : isNext ? 'bg-yellow-400' : 'bg-gray-300'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar; 