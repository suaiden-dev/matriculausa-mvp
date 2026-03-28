import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, CheckCircle2, AlertTriangle, FileUp, CreditCard } from 'lucide-react';

interface ApplicationStatusHeroProps {
  status: 'pending_payment_confirm' | 'pending_documents' | 'under_review' | 'pending_package_fee' | 'approved' | 'action_required';
  title: string;
  description: string;
  nextStepLabel: string;
  onNextStepClick: () => void;
  showButton?: boolean;
  progress?: {
    current: number;
    total: number;
    label: string;
  };
}

export const ApplicationStatusHero: React.FC<ApplicationStatusHeroProps> = ({
  status,
  title,
  description,
  nextStepLabel,
  onNextStepClick,
  showButton = true,
  progress
}) => {
  const getIcon = () => {
    switch (status) {
      case 'pending_payment_confirm': return <Clock className="w-10 h-10 text-amber-500" />;
      case 'pending_documents': return <FileUp className="w-10 h-10 text-blue-500" />;
      case 'under_review': return <CheckCircle2 className="w-10 h-10 text-emerald-500" />;
      case 'pending_package_fee': return <CreditCard className="w-10 h-10 text-purple-500" />;
      case 'action_required': return <AlertTriangle className="w-10 h-10 text-red-500" />;
      default: return <CheckCircle2 className="w-10 h-10 text-emerald-500" />;
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'pending_payment_confirm': return 'bg-amber-50 border-amber-200';
      case 'pending_documents': return 'bg-blue-50 border-blue-200';
      case 'under_review': return 'bg-emerald-50 border-emerald-200';
      case 'pending_package_fee': return 'bg-purple-50 border-purple-200';
      case 'action_required': return 'bg-red-50 border-red-200';
      default: return 'bg-white border-slate-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative p-8 md:p-12 rounded-[2.5rem] border-2 shadow-2xl overflow-hidden ${getStatusBg()}`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          {getIcon()}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter mb-3 leading-tight">
            {title}
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mb-8">
            {description}
          </p>

          {progress && (
            <div className="max-w-md mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">{progress.label}</span>
                <span className="text-xs font-black text-slate-600">{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-100">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  className="h-full bg-blue-600 rounded-full shadow-lg"
                />
              </div>
            </div>
          )}
          
          {showButton && (
            <button
              onClick={onNextStepClick}
              className="group flex items-center gap-3 bg-slate-900 hover:bg-black text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:shadow-xl hover:-translate-y-1"
            >
              <span className="flex-1">{nextStepLabel}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
