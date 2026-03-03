import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, ShieldCheck } from 'lucide-react';
import { IdentityPhotoUpload } from './IdentityPhotoUpload';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const IdentityVerificationModal: React.FC<IdentityVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState<'upload' | 'success'>('upload');

  const handleUploadSuccess = async (filePath: string) => {
    if (!user) return;

    try {
      console.log('🔍 [IdentityVerificationModal] Upload de foto concluído:', filePath);
      
      // Atualizar comprehensive_term_acceptance onde o term_type é 'checkout_terms'
      // Se não existir, inserir um novo (embora deva existir se vier do quick registration)
      const { data: existingAcceptance } = await supabase
        .from('comprehensive_term_acceptance')
        .select('id')
        .eq('user_id', user.id)
        .eq('term_type', 'checkout_terms')
        .maybeSingle();

      if (existingAcceptance) {
        console.log('🔍 [IdentityVerificationModal] Atualizando registro existente de termos...');
        const { error } = await supabase
          .from('comprehensive_term_acceptance')
          .update({
            identity_photo_path: filePath,
            identity_photo_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAcceptance.id);

        if (error) throw error;
      } else {
        console.log('🔍 [IdentityVerificationModal] Criando novo registro de termos com foto...');
        // Buscar o ID do termo mais recente se necessário, ou usar um ID genérico se a tabela permitir
        // No checkout terms, geralmente o ID do termo é buscado do hook
        const { data: latestTerm } = await supabase
          .from('application_terms')
          .select('id')
          .eq('term_type', 'checkout_terms')
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error } = await supabase
          .from('comprehensive_term_acceptance')
          .insert({
            user_id: user.id,
            term_id: latestTerm?.id,
            term_type: 'checkout_terms',
            identity_photo_path: filePath,
            identity_photo_status: 'pending',
            accepted_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      console.error('❌ [IdentityVerificationModal] Erro ao salvar foto de identidade:', err);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="absolute right-0 top-0 pr-4 pt-4 z-10">
                  <button
                    type="button"
                    className="rounded-full bg-white/10 p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="bg-white px-4 pb-4 pt-8 sm:p-8 sm:pb-6">
                  <AnimatePresence mode="wait">
                    {step === 'upload' ? (
                      <motion.div
                        key="upload-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="w-full"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="bg-blue-100 p-2 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900">
                              {t('authPage.messages.identityVerificationModal.title')}
                            </Dialog.Title>
                            <p className="text-sm text-gray-500 mt-1">
                              {t('authPage.messages.identityVerificationModal.subtitle')}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">
                              {t('authPage.messages.identityVerificationModal.description')}
                            </p>
                          </div>

                          <IdentityPhotoUpload 
                            onUploadSuccess={(path) => handleUploadSuccess(path)}
                            onUploadError={(err) => console.error('Upload error:', err)}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="success-step"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                      >
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
                          <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-gray-900 mb-4">
                          {t('authPage.messages.identityVerificationModal.successTitle')}
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                          {t('authPage.messages.identityVerificationModal.successMessage')}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
