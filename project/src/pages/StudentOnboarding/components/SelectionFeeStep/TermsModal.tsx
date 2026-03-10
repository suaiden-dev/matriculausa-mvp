import React from 'react';
import ReactDOM from 'react-dom';
import { Dialog } from '@headlessui/react';
import { X, AlertCircle } from 'lucide-react';
import { Term } from './types';

interface TermsModalProps {
  showTermsModal: boolean;
  setShowTermsModal: (v: boolean) => void;
  activeTerm: Term | null;
  loadingTerms: boolean;
  t: (key: string) => string;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  showTermsModal,
  setShowTermsModal,
  activeTerm,
  loadingTerms,
  t,
}) => {
  if (!showTermsModal) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <Dialog open={showTermsModal} onClose={() => setShowTermsModal(false)} className="relative z-[10021]">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10020]" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[10020]">
          <Dialog.Panel className="w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden relative max-h-[90dvh] flex flex-col">
            <div className="relative bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-indigo-800/90 text-white p-6 sm:p-8 flex-shrink-0 border-b border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
              <button
                onClick={() => setShowTermsModal(false)}
                className="absolute top-4 right-4 p-2.5 hover:bg-white/20 rounded-2xl transition-all duration-300 group/close z-50"
                title={t('preCheckoutModal.closeTerms') || 'Close'}
              >
                <X className="w-6 h-6 group-hover/close:rotate-90 transition-transform duration-500" />
              </button>
              <div className="flex items-center gap-4 relative z-10">
                <div>
                  <Dialog.Title className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">
                    {activeTerm?.title ?? t('preCheckoutModal.termsAndConditions.title')}
                  </Dialog.Title>
                  <p className="text-blue-100/60 text-xs font-bold uppercase tracking-widest mt-1">
                    {t('selectionFeeStep.main.serviceContract')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {loadingTerms ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{t('preCheckoutModal.loading')}</p>
                </div>
              ) : activeTerm ? (
                <div
                  className="prose prose-blue max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-gray-600 prose-p:leading-relaxed prose-strong:text-gray-900"
                  dangerouslySetInnerHTML={{ __html: activeTerm.content || '' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-xs">{t('preCheckoutModal.noTermsFound')}</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50/80 backdrop-blur-md p-6 sm:p-8 flex-shrink-0">
              <div className="flex justify-center max-w-xs mx-auto">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="w-full px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl active:scale-95 shadow-blue-500/20"
                >
                  {t('common.close') || 'Fechar'}
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>,
    document.body
  );
};
