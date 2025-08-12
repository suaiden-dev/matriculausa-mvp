import React from 'react';
import { CheckCircle, DollarSign, Award, FileText, ArrowRight, Lock, Clock } from 'lucide-react';

interface Step {
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface ProgressBarProps {
  steps: Step[];
}

const getStepColor = (completed: boolean, current: boolean) => {
  if (completed) return 'from-green-400 to-green-600 border-green-500 text-white shadow-green-200';
  if (current) return 'from-yellow-300 to-yellow-500 border-yellow-400 text-white shadow-yellow-200 animate-pulse';
  return 'from-slate-200 to-slate-300 border-slate-300 text-slate-400';
};

const getStepIcon = (idx: number, completed: boolean, current: boolean) => {
  if (completed) return <CheckCircle className="h-7 w-7 text-white" />;
  if (current) {
    if (idx === 1) return <DollarSign className="h-7 w-7 text-white" />;
    if (idx === 2) return <Award className="h-7 w-7 text-white" />;
    if (idx === 3) return <FileText className="h-7 w-7 text-white" />;
    return <Clock className="h-7 w-7 text-white" />;
  }
  return <Lock className="h-7 w-7 text-slate-400" />;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ steps }) => {
  const currentIdx = steps.findIndex(step => step.current);
  // Valores das taxas (ajuste conforme necessário)
  const feeValues = [
    '$350', // Selection Process Fee
    '$350', // Application Fee
    '$550', // Scholarship Fee
    '$900', // I-20 Control Fee
  ];
  return (
    <div className="w-full flex flex-col items-center pb-8 md:pb-16 mb-4 md:mb-8">
      {/* Desktop: horizontal, Mobile: vertical */}
      <div className="w-full">
        <div className="hidden md:flex relative w-full max-w-2xl mx-auto overflow-x-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50">
          <div className="flex items-center w-full justify-between px-2 gap-4 md:gap-6 lg:gap-8 py-4">
            {/* Linha de conexão */}
            <div className="absolute top-1/2 left-0 right-0 z-0 h-2 flex items-center pointer-events-none select-none">
              <div className="w-full h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-300 to-slate-300 opacity-60" />
            </div>
            {steps.map((step, idx) => (
              <React.Fragment key={idx}>
                {/* Seta animada antes da etapa atual */}
                {idx === currentIdx && idx !== 0 && (
                  <span className="z-10 mx-2 flex items-center animate-bounce" aria-label="Next step">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 16H24" stroke="#FACC15" strokeWidth="3" strokeLinecap="round"/>
                      <path d="M18 10L24 16L18 22" stroke="#FACC15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
                <div className="flex flex-col items-center min-w-[80px] md:min-w-[90px] z-10">
                  <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full border-4 font-bold text-lg mb-1 transition-colors duration-300 shadow-xl bg-gradient-to-br ${getStepColor(step.completed, step.current)}`}
                    style={{ boxShadow: step.current ? '0 0 0 4px #fde68a55' : undefined }}>
                    {getStepIcon(idx, step.completed, step.current)}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Mobile: vertical/empilhado */}
        <div className="flex flex-col gap-3 md:hidden w-full">
          {steps.map((step, idx) => (
            <div key={idx} className={`flex items-center gap-3 rounded-xl p-3 shadow-md border-2 ${step.completed ? 'bg-green-500/90 border-green-400' : step.current ? 'bg-yellow-400/90 border-yellow-300 animate-pulse' : 'bg-slate-200/80 border-slate-300'} transition-all`}>
              <div className={`w-11 h-11 flex items-center justify-center rounded-full border-4 font-bold text-lg ${step.completed ? 'border-green-400 bg-green-500' : step.current ? 'border-yellow-300 bg-yellow-400' : 'border-slate-300 bg-slate-200'}`}>
                {getStepIcon(idx, step.completed, step.current)}
              </div>
              <div className="flex flex-col flex-1">
                <div className="text-sm font-bold text-[#05294E]">{step.label}</div>
                <div className="text-xs font-bold text-blue-700">{feeValues[idx]}</div>
                <div className="text-xs text-slate-700 leading-tight">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Linha de textos das etapas, centralizada e alinhada com os círculos (desktop) */}
      <div className="hidden md:flex w-full max-w-2xl mx-auto justify-between px-2 gap-4 md:gap-6 lg:gap-8 mt-4">
        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center min-w-[80px] md:min-w-[90px] text-center">
            <div className="flex flex-col items-center w-full">
              <div className="text-xs md:text-sm font-bold mb-0.5 text-white whitespace-nowrap drop-shadow-sm tracking-wide">
                {step.label}
              </div>
              <div className="text-[11px] md:text-sm font-bold text-yellow-300 mb-0.5">{feeValues[idx]}</div>
              <div className="text-[10px] md:text-xs text-blue-100 max-w-[90px] md:max-w-[120px] leading-tight mb-1 font-medium">
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar; 