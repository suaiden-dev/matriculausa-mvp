import React from 'react';
import { CheckCircle, DollarSign, FileText, Lock, Clock, Sparkles } from 'lucide-react';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useAuth } from '../hooks/useAuth';
import { useDynamicFees } from '../hooks/useDynamicFees';

interface Step {
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface ProgressBarProps {
  steps: Step[];
  feeValues?: (string | React.ReactNode)[];
  applicationId?: string | null;
  isSelectionProcessUnlocked?: boolean;
  isApplicationFeeUnlocked?: boolean;
  isScholarshipFeeUnlocked?: boolean;
  isI20Unlocked?: boolean;
  progress?: number; // 0 to steps.length-1
}

const getStepColor = (completed: boolean, current: boolean) => {
  if (completed) return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.4)]';
  if (current) return 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse';
  return 'bg-white/10 backdrop-blur-md border-white/20 text-white/40';
};

const getStepIcon = (idx: number, completed: boolean, current: boolean) => {
  if (completed) return <CheckCircle className="h-6 w-6 md:h-7 md:w-7 text-white" />;
  if (current) {
    if (idx === 0) return <DollarSign className="h-6 w-6 md:h-7 md:w-7 text-white" />;
    if (idx === 1) return <DollarSign className="h-6 w-6 md:h-7 md:w-7 text-white" />;
    if (idx === 2) return <DollarSign className="h-6 w-6 md:h-7 md:w-7 text-white" />;
    if (idx === 3) return <FileText className="h-6 w-6 md:h-7 md:w-7 text-white" />;
    return <Clock className="h-6 w-6 md:h-7 md:w-7 text-white" />;
  }
  return <Lock className="h-6 w-6 md:h-7 md:w-7 text-white/30" />;
};

const FeeSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-3 md:h-4 bg-white/20 rounded w-12 md:w-16"></div>
  </div>
);

// Imports removidos: useNavigate

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  steps, 
  feeValues: customFeeValues,
  progress: customProgress
}) => {
  const { user } = useAuth();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const { selectionProcessFee, scholarshipFee, i20ControlFee } = useDynamicFees();
  const pathRef = React.useRef<SVGPathElement>(null);
  const [ready, setReady] = React.useState(false);
  const [pathLength, setPathLength] = React.useState(0);

  React.useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
      // Delay pequeno mas suficiente para garantir que o navegador processe o posicionamento inicial
      // sem a classe de transição ativa.
      const timer = setTimeout(() => {
        setReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Funções de navegação removidas

  const isFeesLoading = !selectionProcessFee || !scholarshipFee || !i20ControlFee;
  
  const defaultFeeValues = [
    selectionProcessFee || `$${getFeeAmount('selection_process')}`,
    'As per university',
    scholarshipFee || `$${getFeeAmount('scholarship_fee')}`,
    i20ControlFee || `$${getFeeAmount('i20_control_fee')}`,
  ];
  
  const feeValues = customFeeValues || defaultFeeValues;
  const displayFeeValues = feeValues.map((value, index) => {
    if (index === 1 && value === '$350.00') return 'As per university';
    return value;
  });

  // Calculate generic progress based on steps if not provided
  const calculateProgress = () => {
    if (customProgress !== undefined) return customProgress;
    
    const lastCompletedIdx = [...steps].reverse().findIndex(s => s.completed);
    if (lastCompletedIdx !== -1) {
      const idx = steps.length - 1 - lastCompletedIdx;
      // If next step is current, maybe we are at that index
      if (idx + 1 < steps.length && steps[idx+1].current) return idx + 0.5;
      return idx;
    }
    
    const currentIdx = steps.findIndex(s => s.current);
    return currentIdx !== -1 ? currentIdx : 0;
  };

  const progress = calculateProgress();
  const progressRatio = progress / (steps.length - 1);
  
  // Get point on path for the sparkle
  const getPointAtProgress = () => {
    if (!pathRef.current || pathLength === 0) return { x: 50, y: 75 };
    const point = pathRef.current.getPointAtLength(pathLength * progressRatio);
    return { x: point.x, y: point.y };
  };

  const sparklePos = getPointAtProgress();

  return (
    <div className="w-full relative pt-0 pb-6 md:pt-0 md:pb-10">
      {/* Desktop Version */}
      <div className="hidden md:block w-full max-w-4xl mx-auto px-4">
        <div className="relative h-40 md:h-56 flex items-center justify-between">
          {/* Sinuous SVG Path - Refatorado para visibilidade e precisão */}
          <svg 
            viewBox="0 0 1000 150" 
            className="absolute top-1/2 left-0 w-full h-48 -translate-y-1/2 z-0 pointer-events-none overflow-visible" 
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="50%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              
              {/* Máscara para preenchimento progressivo */}
              <mask id="progressMask">
                <path 
                  d="M 50 75 C 125 50, 275 50, 350 75 S 575 100, 650 75 S 875 50, 950 75" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="10" 
                  strokeLinecap="round"
                  strokeDasharray={pathLength || 1000}
                  strokeDashoffset={(pathLength || 1000) * (1 - progressRatio)}
                  className={ready ? "transition-all duration-1000 ease-in-out" : ""}
                />
              </mask>
            </defs>

            {/* Linha de fundo (rastro) */}
            <path 
              d="M 50 75 C 125 50, 275 50, 350 75 S 575 100, 650 75 S 875 50, 950 75" 
              fill="none" 
              stroke="white" 
              strokeOpacity="0.05" 
              strokeWidth="10" 
              strokeLinecap="round"
            />
            
            {/* Linha animada principal com efeito pontilhado e máscara de progresso */}
            <path 
              ref={pathRef}
              d="M 50 75 C 125 50, 275 50, 350 75 S 575 100, 650 75 S 875 50, 950 75" 
              fill="none" 
              stroke="url(#lineGradient)" 
              strokeWidth="5" 
              strokeLinecap="round" 
              mask="url(#progressMask)"
              className={`opacity-90 animate-dash ${ready ? "visible" : "invisible"}`}
              filter="url(#glow)"
            />
            
          </svg>

          {/* Marcador animado fora do SVG para evitar distorção de aspecto */}
          <div 
            className={`absolute z-20 pointer-events-none flex items-center justify-center transition-all duration-1000 ease-in-out ${
              ready && (progress % 1 !== 0) ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
            style={{ 
              left: `${(sparklePos.x / 1000) * 100}%`, 
              top: `calc(${(sparklePos.y / 150) * 100}% + 4px)`,
              transform: 'translate(-50%, -50%)',
              willChange: 'left, top'
            }}
          >
             <div className="relative flex items-center justify-center w-10 h-10">
                <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-20" />
                <div className="relative text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                   <Sparkles className="w-7 h-7 animate-spin-slower" />
                </div>
             </div>
          </div>



          {steps.map((step, idx) => {
            return (
              <div 
                key={idx} 
                className={`group relative flex flex-col items-center z-10 transition-all duration-500`}
              >
                {/* Step Circle with Glassmorphism */}
                <div className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl border-2 transition-all duration-500 shadow-lg ${getStepColor(step.completed, step.current)}`}>
                  {getStepIcon(idx, step.completed, step.current)}
                </div>

                {/* Labels Visible on Bottom */}
                <div className="absolute top-full mt-3 flex flex-col items-center w-32 md:w-40 text-center pointer-events-none">
                  <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest mt-1 ${step.completed ? 'text-emerald-400' : step.current ? 'text-amber-300' : 'text-white/30'}`}>
                    {step.label}
                  </span>
                  <span className="text-[9px] md:text-[11px] font-bold text-white/50 mt-0.5">
                    {isFeesLoading && idx !== 1 ? <FeeSkeleton /> : displayFeeValues[idx]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Version: Vertical Connection */}
      <div className="md:hidden w-full flex flex-col gap-8 px-4 relative">
        {/* Vertical Line for Mobile */}
        <div className="absolute left-10 top-10 bottom-10 w-[2px] bg-white/5 opacity-20 z-0" />
        <div 
          className={`absolute left-10 top-10 w-[2px] bg-gradient-to-b from-emerald-500 via-amber-400 to-indigo-500 z-0 ${ready ? "transition-all duration-1000 ease-in-out opacity-100" : "opacity-0"}`} 
          style={{ height: `calc(${progressRatio * 100}% - 20px)` }}
        />
        
        {steps.map((step, idx) => {
          return (
            <div 
              key={idx}
              className={`relative flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 z-10 ${step.current ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}
            >
              <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border-2 ${getStepColor(step.completed, step.current)}`}>
                {getStepIcon(idx, step.completed, step.current)}
              </div>
              
              <div className="flex flex-col">
                <span className={`text-xs font-black uppercase tracking-wider ${step.completed ? 'text-emerald-400' : step.current ? 'text-amber-400' : 'text-white/30'}`}>
                  {step.label}
                </span>
                <span className="text-[10px] font-bold text-white/50">
                  {isFeesLoading && idx !== 1 ? '---' : displayFeeValues[idx]}
                </span>
                <p className="text-[11px] text-white/70 leading-relaxed mt-1">{step.description}</p>
              </div>

              {step.current && (
                <div className="ml-auto">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .animate-dash {
          stroke-dasharray: 12;
          animation: dash 60s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        .animate-spin-slower {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;