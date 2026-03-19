import React from 'react';
import { Transition } from '@headlessui/react';
import { Loader2, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';

interface PaymentLoadingOverlayProps {
  show: boolean;
  step: string;
  progress: number;
}

export const PaymentLoadingOverlay: React.FC<PaymentLoadingOverlayProps> = ({ show, step, progress }) => {
  return (
    <Transition
      show={show}
      as={React.Fragment}
      enter="ease-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 overflow-hidden">
        {/* Backdrop com desfoque pesado para foco total */}
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

        {/* Card de Conteúdo */}
        <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 overflow-hidden">
          {/* Decoração de fundo sutil */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Ícone Animado Principal */}
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20 scale-150" />
              <div className="relative w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shadow-sm">
                <Loader2 className="w-10 h-10 text-[#05294E] animate-spin" />
              </div>
            </div>

            {/* Mensagem Principal */}
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">
              {step}
            </h3>
            
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">
              Por favor, não feche esta janela
            </p>

            {/* Barra de Progresso */}
            <div className="w-full mb-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-[#05294E] uppercase tracking-widest">
                  Processando
                </span>
                <span className="text-lg font-black text-[#05294E]">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                <div 
                  className="h-full bg-[#05294E] rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Brilho animado na barra */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                </div>
              </div>
            </div>

            {/* Selos de Confiança / Footer */}
            <div className="grid grid-cols-2 gap-4 w-full pt-6 border-t border-slate-50">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-left">
                  Ambiente<br/>Seguro
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-left">
                  Conexão<br/>Criptografada
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estilos inline para animações customizadas (shimmer) se não houver no tailwind config */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}} />
      </div>
    </Transition>
  );
};
