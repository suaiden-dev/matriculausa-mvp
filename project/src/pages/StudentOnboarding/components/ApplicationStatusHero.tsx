import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Clock, CheckCircle2, AlertTriangle, FileUp, FileText } from 'lucide-react';

interface ApplicationStatusHeroProps {
  status: 'pending_payment_confirm' | 'pending_documents' | 'under_review' | 'under_review_docs' | 'pending_package_fee' | 'approved' | 'action_required' | 'waiting_acceptance';
  title: string;
  description: string;
  nextStepLabel: string;
  onNextStepClick: () => void;
  showButton?: boolean;
}

export const ApplicationStatusHero: React.FC<ApplicationStatusHeroProps> = ({
  status,
  title,
  description,
  nextStepLabel,
  onNextStepClick,
  showButton = true
}) => {
  const { t } = useTranslation();
  const getStatusInfo = () => {
    switch (status) {
      case 'pending_payment_confirm':
        return {
          icon: <Clock className="w-10 h-10 text-amber-500" />,
          label: t('common:status.under_review'),
          colorClass: 'text-amber-500 bg-amber-50 border-amber-100'
        };
      case 'pending_documents':
        return {
          icon: <FileUp className="w-10 h-10 text-blue-500" />,
          label: t('common:status.action_required'),
          colorClass: 'text-blue-500 bg-blue-50 border-blue-100'
        };
      case 'under_review':
        return {
          icon: <Clock className="w-10 h-10 text-blue-500" />,
          label: t('common:status.under_review'),
          colorClass: 'text-blue-500 bg-blue-50 border-blue-100'
        };
      case 'pending_package_fee':
        return {
          icon: <FileText className="w-10 h-10 text-purple-500" />,
          label: t('common:status.blocked'),
          colorClass: 'text-purple-500 bg-purple-50 border-purple-100'
        };
      case 'under_review_docs':
        return {
          icon: <Clock className="w-10 h-10 text-blue-500" />,
          label: t('common:status.under_review'),
          colorClass: 'text-blue-500 bg-blue-50 border-blue-100'
        };
      case 'waiting_acceptance':
        return {
          icon: <Clock className="w-10 h-10 text-blue-500" />,
          label: t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress'),
          colorClass: 'text-blue-500 bg-blue-50 border-blue-100'
        };
      case 'action_required':
        return {
          icon: <AlertTriangle className="w-10 h-10 text-red-500" />,
          label: t('common:status.rejected'),
          colorClass: 'text-red-500 bg-red-50 border-red-100'
        };
      case 'approved':
        return {
          icon: <CheckCircle2 className="w-10 h-10 text-emerald-500" />,
          label: t('common:status.approved'),
          colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-100'
        };
      default:
        return {
          icon: <CheckCircle2 className="w-10 h-10 text-emerald-500" />,
          label: t('common:status.completed'),
          colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-100'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative p-6 md:p-12 rounded-[1.5rem] md:rounded-[2.5rem] border-2 shadow-2xl overflow-hidden bg-white border-slate-200"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-start gap-4 md:gap-8">
        <div className="flex-1 text-left w-full">
          
          <div className="flex items-center md:items-start gap-4 md:gap-6 mb-4 md:mb-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl shadow-xl flex items-center justify-center flex-shrink-0">
              <div className="scale-75 md:scale-100">
                {statusInfo.icon}
              </div>
            </div>
            <h3 className="text-xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none md:leading-tight">
              {title}
            </h3>
          </div>
          
          <p className="text-gray-600 text-sm md:text-lg leading-relaxed max-w-2xl mb-6 md:mb-8">
            {description}
          </p>
          
          {showButton && (
            <button
              onClick={onNextStepClick}
              className="w-full md:w-auto group flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white px-6 md:px-8 py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all hover:shadow-xl md:hover:-translate-y-1"
            >
              <span className="flex-1 md:flex-none">{nextStepLabel}</span>
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
