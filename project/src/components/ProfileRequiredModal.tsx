import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { UserCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorType: 'cpf_missing' | 'profile_incomplete' | null;
}

export const ProfileRequiredModal: React.FC<ProfileRequiredModalProps> = ({
  isOpen,
  onClose,
  errorType,
}) => {
  const navigate = useNavigate();

  const handleGoToProfile = () => {
    onClose();
    navigate('/student/dashboard/profile');
  };

  const getModalContent = () => {
    switch (errorType) {
      case 'cpf_missing':
        return {
          icon: <AlertCircle className="w-16 h-16 text-amber-500" />,
          title: 'CPF Necessário',
          description: 'Para pagar via Parcelow/PIX, é necessário cadastrar seu CPF no seu perfil.',
          details: 'O CPF é obrigatório para processar pagamentos via Parcelow. Isso garante a segurança da sua transação e está de acordo com as regulamentações brasileiras.',
          buttonText: 'Ir para Perfil',
          buttonIcon: <ArrowRight className="w-5 h-5" />,
        };
      case 'profile_incomplete':
        return {
          icon: <UserCircle className="w-16 h-16 text-blue-500" />,
          title: 'Complete seu Perfil',
          description: 'Seu perfil está incompleto. Por favor, preencha todas as informações necessárias antes de prosseguir com o pagamento.',
          details: 'Precisamos de algumas informações adicionais para processar seu pagamento com segurança. Isso leva apenas alguns minutos!',
          buttonText: 'Completar Perfil',
          buttonIcon: <ArrowRight className="w-5 h-5" />,
        };
      default:
        return null;
    }
  };

  const content = getModalContent();

  if (!content) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 px-6 pt-6 pb-4">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                  
                  <div className="flex flex-col items-center">
                    <div className="mb-4 p-4 rounded-full bg-white shadow-lg">
                      {content.icon}
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="text-2xl font-bold text-slate-900"
                    >
                      {content.title}
                    </Dialog.Title>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-4">
                  <p className="text-base text-slate-700 font-medium">
                    {content.description}
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-sm text-blue-900">
                      {content.details}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                    onClick={onClose}
                  >
                    Agora Não
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                    onClick={handleGoToProfile}
                  >
                    {content.buttonText}
                    {content.buttonIcon}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
