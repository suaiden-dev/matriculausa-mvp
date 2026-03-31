import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface Step {
  id: string;
  title: string;
  status: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'default';
  isClickable?: boolean;
  disabled?: boolean;
}

interface ApplicationSidebarProps {
  steps: Step[];
  activeStep: string;
  onStepClick: (id: any) => void;
}

export const ApplicationSidebar: React.FC<ApplicationSidebarProps> = ({ steps, activeStep, onStepClick }) => {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const isActive = activeStep === step.id;
        
        const variantStyles = {
          success: {
            container: 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400',
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
            statusText: 'text-emerald-600'
          },
          warning: {
            container: 'bg-amber-50/60 border-amber-200 hover:border-amber-400 shadow-sm shadow-amber-500/5',
            icon: <Clock className="w-5 h-5 text-amber-600 animate-pulse" />,
            statusText: 'text-amber-600'
          },
          error: {
            container: 'bg-red-50/50 border-red-200 hover:border-red-400',
            icon: <AlertCircle className="w-5 h-5 text-red-600" />,
            statusText: 'text-red-600'
          },
          info: {
            container: 'bg-blue-50/50 border-blue-200 hover:border-blue-400 shadow-sm',
            icon: <Clock className="w-5 h-5 text-blue-600" />,
            statusText: 'text-blue-600'
          },
          default: {
            container: 'bg-slate-50 border-slate-200 hover:border-blue-300',
            icon: <Clock className="w-5 h-5 text-slate-400" />,
            statusText: 'text-slate-400'
          }
        };

        const styles = variantStyles[step.variant] || variantStyles.default;

        return (
          <motion.button
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => {
              if (!step.disabled && (step.variant !== 'error' || isActive)) {
                onStepClick(step.id);
              }
            }}
            className={`w-full group relative flex flex-col p-4 rounded-2xl border transition-all text-left ${
              styles.container
            } ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-500 !bg-white scale-[1.02] shadow-xl shadow-blue-500/10' : ''} ${
              (step.variant === 'error' || step.disabled) && !isActive ? 'cursor-not-allowed opacity-60 grayscale' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${styles.statusText}`}>
                {step.status}
              </span>
              {styles.icon}
            </div>
            
            <h4 className={`text-sm font-bold uppercase tracking-tight leading-tight ${
              isActive ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-600'
            }`}>
              {step.title}
            </h4>

            {step.variant !== 'error' && !step.disabled && !isActive && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 group-hover:text-blue-700 transition-colors">
                  {t('labels.clickToAccess')}
                </span>
                <ArrowRight className="w-3 h-3 text-blue-500 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
              </div>
            )}

            {/* Linha conectora visual (Exceto último) */}
            {index < steps.length - 1 && (
              <div className="hidden lg:block absolute left-1/2 -bottom-3 w-0.5 h-3 bg-slate-200 z-0" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
