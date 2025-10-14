import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { useModal } from '../contexts/ModalContext';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface PaymentMethodSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMethod: 'stripe' | 'zelle' | 'pix' | null;
  onMethodSelect: (method: 'stripe' | 'zelle' | 'pix') => void;
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'i20_control_fee';
  amount: number;
}

export const PaymentMethodSelectorDrawer: React.FC<PaymentMethodSelectorDrawerProps> = ({
  isOpen,
  onClose,
  selectedMethod,
  onMethodSelect,
  feeType,
  amount
}) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset confirmation state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Component cleanup if needed
    }
  }, [isOpen]);

  // Manage modal state in global context
  useEffect(() => {
    if (isOpen) {
      openModal();
    } else {
      closeModal();
    }
    
    // Cleanup when component unmounts
    return () => {
      if (isOpen) {
        closeModal();
      }
    };
  }, [isOpen, openModal, closeModal]);

  // Render drawer for mobile, dialog for desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[95vh] bg-white border-t border-gray-200 rounded-t-2xl">
          <DrawerHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <DrawerTitle className="text-xl font-bold">
                  {t('paymentSelector.title')}
                </DrawerTitle>
                <p className="text-blue-100 text-sm mt-1">
                  {t('paymentSelector.subtitle', { feeType: t(`paymentSelector.feeTypes.${feeType}`) })}
                </p>
              </div>
            </div>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onMethodSelect={onMethodSelect}
              feeType={feeType}
              amount={amount}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop dialog
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-[10030]"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10009]" aria-hidden="true" />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[10009]">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              title={t('common.close')}
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <Dialog.Title className="text-2xl font-bold">
                  {t('paymentSelector.title')}
                </Dialog.Title>
                <p className="text-blue-100">
                  {t('paymentSelector.subtitle', { feeType: t(`paymentSelector.feeTypes.${feeType}`) })}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onMethodSelect={onMethodSelect}
              feeType={feeType}
              amount={amount}
            />
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};