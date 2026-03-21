import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Loader2, Home, RefreshCw } from 'lucide-react';
import TransactionAnimation from './TransactionAnimation';
import { useTranslation } from 'react-i18next';

interface PaymentStatusOverlayProps {
  status: 'loading' | 'success' | 'error';
  title: string;
  message: string;
  errorDetails?: string | null;
  onRetry?: () => void;
  onHome?: () => void;
  isSuccess?: boolean; // Prop para compatibilidade com TransactionAnimation
  showPremiumLoading?: boolean; // Nova prop para modo tela cheia com animação premium
}

const PaymentStatusOverlay: React.FC<PaymentStatusOverlayProps> = ({
  status,
  title,
  message,
  errorDetails,
  onRetry,
  onHome,
  showPremiumLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Premium Backdrop with Glassmorphism - Light for consistency with SuccessOverlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-white/20 backdrop-blur-xl"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`relative z-10 w-full flex flex-col items-center ${
            showPremiumLoading 
              ? 'max-w-4xl' // Tela cheia (sem card) para modo premium
              : 'max-w-lg bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/50 overflow-hidden'
          }`}
        >
          {!showPremiumLoading && (
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[100px] pointer-events-none -z-10 transition-colors duration-700 ${
              status === 'loading' ? 'bg-blue-500/20' : 
              status === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`} />
          )}

          <div className="flex flex-col items-center text-center w-full">
            {status === 'loading' && (
              <div className={`space-y-8 py-4 flex flex-col items-center w-full`}>
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 rounded-full border-t-4 border-r-4 border-blue-600 border-l-4 border-l-transparent border-b-4 border-b-transparent"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin-slow" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className={`text-3xl font-black uppercase tracking-tight ${showPremiumLoading ? 'text-slate-900 drop-shadow-sm' : 'text-slate-900'}`}>{title}</h2>
                  <p className={`font-medium max-w-xs mx-auto leading-relaxed ${showPremiumLoading ? 'text-slate-600' : 'text-slate-600'}`}>{message}</p>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="w-full space-y-6">
                {showPremiumLoading ? (
                   /* No modo premium, usamos a animação de sucesso em tela cheia */
                   <div className="flex flex-col items-center">
                      <div className="flex justify-center -mb-4">
                        <TransactionAnimation isSuccess={true} />
                      </div>
                      <div className="space-y-3 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000 fill-both">
                        <h2 className="text-3xl font-black text-emerald-600 uppercase tracking-tight">{title}</h2>
                        <p className="text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">{message}</p>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">
                          {t('successPages.common.redirecting')}...
                        </p>
                      </div>
                   </div>
                ) : (
                  /* Modo não-premium (card padrão) */
                  <>
                    <div className="flex justify-center -mb-4">
                      <TransactionAnimation isSuccess={true} />
                    </div>
                    
                    <div className="space-y-3 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000 fill-both">
                      <h2 className="text-3xl font-black text-emerald-600 uppercase tracking-tight">{title}</h2>
                      <p className="text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">{message}</p>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">
                        {t('successPages.common.redirecting')}...
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-6 py-4">
                <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-red-100">
                  <XCircle className="w-12 h-12 text-red-500" />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
                  <p className="text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">{message}</p>
                  
                  {errorDetails && (
                    <div className="mt-4 p-4 bg-red-50/50 rounded-2xl border border-red-100/50 text-left">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                        {t('successPages.applicationFee.errorDetails')}
                      </p>
                      <p className="text-xs text-red-700 font-mono break-words">{errorDetails}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full">
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('common.retry')}
                    </button>
                  )}
                  {onHome && (
                    <button
                      onClick={onHome}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <Home className="w-4 h-4" />
                      {t('common.home')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <style>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentStatusOverlay;
