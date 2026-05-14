import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Dialog } from '@headlessui/react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'success' | 'warning' | 'danger';
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'success' | 'warning' | 'danger';
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmationOptions) => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (modalState) {
      modalState.resolve(false);
      setModalState(null);
    }
  }, [modalState]);

  const handleConfirm = useCallback(() => {
    if (modalState) {
      modalState.resolve(true);
      setModalState(null);
    }
  }, [modalState]);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {modalState && (
        <Dialog open={modalState.isOpen} onClose={handleClose} className="fixed z-[100] inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-200">
              <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl sm:mx-0 sm:h-12 sm:w-12 ${
                    modalState.type === 'success' ? 'bg-green-100' :
                    modalState.type === 'warning' ? 'bg-amber-100' :
                    'bg-red-100'
                  }`}>
                    {modalState.type === 'success' ? (
                      <CheckCircle className="h-7 w-7 text-green-600" />
                    ) : modalState.type === 'warning' ? (
                      <AlertTriangle className="h-7 w-7 text-amber-600" />
                    ) : (
                      <XCircle className="h-7 w-7 text-red-600" />
                    )}
                  </div>
                  <div className="mt-4 text-center sm:mt-0 sm:ml-6 sm:text-left">
                    <Dialog.Title as="h3" className="text-xl leading-6 font-bold text-slate-900">
                      {modalState.title}
                    </Dialog.Title>
                    <div className="mt-3">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {modalState.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-2.5 text-base font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-0 sm:w-auto sm:text-sm ${
                    modalState.type === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                    modalState.type === 'warning' ? 'bg-[#05294E] hover:bg-[#041f38] focus:ring-[#05294E]' :
                    'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {modalState.confirmText}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 w-full inline-flex justify-center rounded-xl border border-slate-300 shadow-sm px-6 py-2.5 bg-white text-base font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:w-auto sm:text-sm transition-all"
                >
                  {modalState.cancelText}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </ConfirmationContext.Provider>
  );
};
