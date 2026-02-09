import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../hooks/useAuth';
import { useReferralCode } from '../hooks/useReferralCode';
import { supabase } from '../lib/supabase';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface PaymentMethodSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMethod: 'stripe' | 'zelle' | 'pix' | 'parcelow' | null;
  onMethodSelect: (method: 'stripe' | 'zelle' | 'pix' | 'parcelow', exchangeRate?: number) => void;
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'i20_control_fee';
  amount: number;
  isLoading?: boolean;
}

export const PaymentMethodSelectorDrawer: React.FC<PaymentMethodSelectorDrawerProps> = ({
  isOpen,
  onClose,
  selectedMethod,
  onMethodSelect,
  feeType,
  amount,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeDiscount } = useReferralCode();
  const [isMobile, setIsMobile] = useState(false);
  const { openModal, closeModal } = useModal();
  
  // Estados para cupom promocional
  const [promotionalCoupon, setPromotionalCoupon] = useState<string>('');
  const [promotionalCouponValidation, setPromotionalCouponValidation] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
    originalAmount?: number;
  } | null>(null);
  const [isValidatingPromotionalCoupon, setIsValidatingPromotionalCoupon] = useState(false);
  const promotionalCouponInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ Mostrar cupom promocional apenas se o usuário NÃO tiver usado o referral code do Matricula Rewards
  const shouldShowPromotionalCoupon = !activeDiscount?.has_discount;

  // Método selecionado efetivo
  const effectiveSelectedMethod = selectedMethod;

  // Valor final considerando desconto promocional
  const finalAmount = promotionalCouponValidation?.isValid && promotionalCouponValidation.finalAmount
    ? promotionalCouponValidation.finalAmount
    : amount;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync state with global modal context
  useEffect(() => {
    if (isOpen) {
      openModal();
      return () => {
        closeModal();
      };
    }
  }, [isOpen, openModal, closeModal]);

  // Função para validar cupom promocional
  const validatePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim() || !user?.id) return;
    
    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    const normalizedFeeType = feeType === 'i20_control_fee' ? 'i20_control' : feeType;
    
    console.log('🔍 [PaymentMethodSelectorDrawer] Validando cupom promocional:', normalizedCode, 'para feeType:', normalizedFeeType);
    setIsValidatingPromotionalCoupon(true);
    setPromotionalCouponValidation(null);

    try {
      const { data: result, error } = await supabase.rpc('validate_and_apply_admin_promotional_coupon', {
        p_code: normalizedCode,
        p_fee_type: normalizedFeeType,
        p_user_id: user.id
      });

      if (error) {
        console.error('🔍 [PaymentMethodSelectorDrawer] Erro RPC:', error);
        setPromotionalCouponValidation({
          isValid: false,
          message: error.message || t('paymentSelector.promotionalCoupon.error')
        });
        return;
      }

      if (result && result.is_valid) {
        setPromotionalCouponValidation({
          isValid: true,
          message: t('paymentSelector.promotionalCoupon.success'),
          discountAmount: result.discount_amount,
          finalAmount: result.final_amount,
          originalAmount: result.original_amount
        });
        
        (window as any).__checkout_promotional_coupon = normalizedCode;
        (window as any).__checkout_final_amount = result.final_amount;
        (window as any).__promotional_coupon_validation = {
          isValid: true,
          discountAmount: result.discount_amount,
          finalAmount: result.final_amount,
          fee_type: feeType
        };
        
        window.dispatchEvent(new CustomEvent('promotionalCouponValidated', { 
          detail: { 
            code: normalizedCode, 
            discountAmount: result.discount_amount,
            finalAmount: result.final_amount,
            fee_type: feeType
          } 
        }));
      } else {
        setPromotionalCouponValidation({
          isValid: false,
          message: result?.message || t('paymentSelector.promotionalCoupon.invalid')
        });
      }
    } catch (error: any) {
      console.error('🔍 [PaymentMethodSelectorDrawer] Erro ao validar cupom:', error);
      setPromotionalCouponValidation({
        isValid: false,
        message: error.message || t('paymentSelector.promotionalCoupon.error')
      });
    } finally {
      setIsValidatingPromotionalCoupon(false);
    }
  };

  const removePromotionalCoupon = async () => {
    if (!user?.id) return;
    
    const normalizedFeeType = feeType === 'i20_control_fee' ? 'i20_control' : feeType;
    
    try {
      await supabase
        .from('promotional_coupon_usage')
        .delete()
        .eq('user_id', user.id)
        .eq('fee_type', normalizedFeeType)
        .eq('status', 'validated');
        
      setPromotionalCoupon('');
      setPromotionalCouponValidation(null);
      
      delete (window as any).__checkout_promotional_coupon;
      delete (window as any).__checkout_final_amount;
      delete (window as any).__promotional_coupon_validation;
      
      window.dispatchEvent(new CustomEvent('promotionalCouponRemoved', { detail: { fee_type: feeType } }));
    } catch (error) {
      console.error('🔍 [PaymentMethodSelectorDrawer] Erro ao remover cupom:', error);
    }
  };

  // Render for mobile
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[95vh] bg-white border-t border-gray-200 rounded-t-2xl outline-none">
          <DrawerHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <DrawerTitle className="text-xl font-bold">
                  {t('paymentSelector.title')}
                </DrawerTitle>
                <p className="text-blue-100 text-sm mt-1">
                  {t('paymentSelector.subtitle', { feeType: t(`paymentSelector.feeTypes.${feeType}`) })}
                </p>
              </div>
            </div>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4 relative">
            {shouldShowPromotionalCoupon && (
              <div className="space-y-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                  <Tag className="w-4 h-4" />
                  <span>{t('paymentSelector.promotionalCoupon.label')}</span>
                </div>
                
                <div className="flex gap-2">
                  <input
                    ref={promotionalCouponInputRef}
                    type="text"
                    value={promotionalCoupon}
                    onChange={(e) => setPromotionalCoupon(e.target.value.toUpperCase())}
                    placeholder={t('paymentSelector.promotionalCoupon.placeholder')}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase"
                    disabled={isValidatingPromotionalCoupon || promotionalCouponValidation?.isValid}
                  />
                  <button
                    onClick={validatePromotionalCoupon}
                    disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim() || promotionalCouponValidation?.isValid}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:bg-gray-300"
                  >
                    {isValidatingPromotionalCoupon ? t('paymentSelector.promotionalCoupon.validating') : t('paymentSelector.promotionalCoupon.validate')}
                  </button>
                </div>

                {promotionalCouponValidation && (
                  <div className={`text-xs p-2 rounded-lg ${promotionalCouponValidation.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <div className="flex items-center justify-between">
                      <span>{promotionalCouponValidation.message}</span>
                      {promotionalCouponValidation.isValid && (
                        <button onClick={removePromotionalCoupon} className="text-green-900 font-bold ml-2">X</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <PaymentMethodSelector
              selectedMethod={effectiveSelectedMethod}
              onMethodSelect={onMethodSelect}
              feeType={feeType}
              amount={finalAmount}
            />

            {isLoading && (
              <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-blue-800 font-semibold">{t('paymentSelector.loading.processing')}</p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Render for desktop
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[10020]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0 outline-none">
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold">
                  {t('paymentSelector.title')}
                </Dialog.Title>
                <p className="text-blue-100 text-sm">
                  {t('paymentSelector.subtitle', { feeType: t(`paymentSelector.feeTypes.${feeType}`) })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 relative">
            {shouldShowPromotionalCoupon && (
              <div className="space-y-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-800 font-semibold">
                    <Tag className="w-4 h-4" />
                    <span>{t('paymentSelector.promotionalCoupon.label')}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <input
                    ref={promotionalCouponInputRef}
                    type="text"
                    value={promotionalCoupon}
                    onChange={(e) => setPromotionalCoupon(e.target.value.toUpperCase())}
                    placeholder={t('paymentSelector.promotionalCoupon.placeholder')}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                    disabled={isValidatingPromotionalCoupon || promotionalCouponValidation?.isValid}
                  />
                  <button
                    onClick={validatePromotionalCoupon}
                    disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim() || promotionalCouponValidation?.isValid}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                  >
                    {isValidatingPromotionalCoupon ? t('paymentSelector.promotionalCoupon.validating') : t('paymentSelector.promotionalCoupon.validate')}
                  </button>
                </div>

                {promotionalCouponValidation && (
                  <div className={`text-sm p-3 rounded-lg border flex items-center justify-between ${
                    promotionalCouponValidation.isValid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {promotionalCouponValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{promotionalCouponValidation.message}</span>
                    </div>
                    {promotionalCouponValidation.isValid && (
                      <button onClick={removePromotionalCoupon} className="p-1 hover:bg-green-100 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <PaymentMethodSelector
              selectedMethod={effectiveSelectedMethod}
              onMethodSelect={onMethodSelect}
              feeType={feeType}
              amount={finalAmount}
            />

            {isLoading && (
              <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t('preCheckoutModal.processingPayment')}
                </h3>
                <p className="text-gray-600">
                  {t('paymentSelector.loading.processing')}
                </p>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};