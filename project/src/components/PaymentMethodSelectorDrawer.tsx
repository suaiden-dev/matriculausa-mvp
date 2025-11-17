import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../hooks/useAuth';
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
  const { userProfile } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const { openModal, closeModal } = useModal();
  
  // Estados para cupom promocional
  const [promotionalCoupon, setPromotionalCoupon] = useState<string>('');
  const [promotionalCouponValidation, setPromotionalCouponValidation] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
  } | null>(null);
  const [isValidatingPromotionalCoupon, setIsValidatingPromotionalCoupon] = useState(false);
  const promotionalCouponInputRef = useRef<HTMLInputElement>(null);
  
  // Verificar se o usuário pode usar cupom promocional (seller_referral_code + legacy)
  const hasSellerReferralCode = userProfile?.seller_referral_code && userProfile.seller_referral_code.trim() !== '';
  const isLegacySystem = userProfile?.system_type === 'legacy';
  const canUsePromotionalCoupon = hasSellerReferralCode && isLegacySystem;
  
  // Verificar se o feeType permite cupom promocional (não application_fee e não selection_process)
  const shouldShowPromotionalCoupon = canUsePromotionalCoupon && feeType && feeType !== 'application_fee' && feeType !== 'selection_process';
  
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

  // Função para validar cupom promocional
  const validatePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim()) {
      setPromotionalCouponValidation({
        isValid: false,
        message: 'Por favor, digite o código do cupom'
      });
      return;
    }

    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    console.log('🔍 [PaymentMethodSelectorDrawer] Validando cupom promocional:', normalizedCode);
    setIsValidatingPromotionalCoupon(true);
    setPromotionalCouponValidation(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-promotional-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          coupon_code: normalizedCode,
          fee_type: feeType,
          purchase_amount: amount
        }),
      });

      if (!response.ok) {
        console.error('🔍 [PaymentMethodSelectorDrawer] Erro HTTP:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🔍 [PaymentMethodSelectorDrawer] Resposta de erro:', errorText);
        setPromotionalCouponValidation({
          isValid: false,
          message: `Erro ao conectar com o servidor (${response.status}). Tente novamente.`
        });
        return;
      }

      const result = await response.json();
      console.log('🔍 [PaymentMethodSelectorDrawer] Resultado da validação do cupom promocional:', result);

      if (!result.success) {
        setPromotionalCouponValidation({
          isValid: false,
          message: result.error || 'Cupom inválido'
        });
        return;
      }

      // Cupom válido
      const validationData = {
        isValid: true,
        message: `Cupom ${normalizedCode} aplicado! Desconto de $${result.discount_amount.toFixed(2)} aplicado.`,
        discountAmount: result.discount_amount,
        finalAmount: result.final_amount
      };
      
      setPromotionalCouponValidation(validationData);
      
      // Salvar no window para uso no checkout
      (window as any).__checkout_promotional_coupon = normalizedCode;
      (window as any).__checkout_final_amount = result.final_amount;
      
      // Salvar no localStorage para persistir
      const couponData = {
        code: normalizedCode,
        validation: validationData,
        feeType: feeType,
        timestamp: Date.now()
      };
      localStorage.setItem(`__promotional_coupon_${feeType}`, JSON.stringify(couponData));

    } catch (error: any) {
      console.error('🔍 [PaymentMethodSelectorDrawer] Erro ao validar cupom promocional:', error);
      setPromotionalCouponValidation({
        isValid: false,
        message: error?.message || 'Erro ao validar cupom. Verifique sua conexão e tente novamente.'
      });
    } finally {
      setIsValidatingPromotionalCoupon(false);
    }
  };

  // Carregar cupom do localStorage quando modal abre
  useEffect(() => {
    if (isOpen && shouldShowPromotionalCoupon && feeType) {
      try {
        const savedCoupon = localStorage.getItem(`__promotional_coupon_${feeType}`);
        if (savedCoupon) {
          const couponData = JSON.parse(savedCoupon);
          // Verificar se o cupom ainda é válido (menos de 24 horas)
          const isExpired = Date.now() - couponData.timestamp > 24 * 60 * 60 * 1000;
          
          if (!isExpired && couponData.code && couponData.validation) {
            setPromotionalCoupon(couponData.code);
            setPromotionalCouponValidation(couponData.validation);
            // Restaurar no window também
            (window as any).__promotional_coupon_validation = couponData.validation;
            (window as any).__checkout_promotional_coupon = couponData.code;
            (window as any).__checkout_final_amount = couponData.validation.finalAmount;
            console.log('[PaymentMethodSelectorDrawer] Cupom restaurado do localStorage:', couponData.code);
          } else {
            // Remover cupom expirado
            localStorage.removeItem(`__promotional_coupon_${feeType}`);
          }
        }
      } catch (error) {
        console.error('[PaymentMethodSelectorDrawer] Erro ao carregar cupom do localStorage:', error);
      }
    } else if (!isOpen) {
      // Limpar estados quando modal fecha (mas manter no localStorage)
      setPromotionalCoupon('');
      setPromotionalCouponValidation(null);
      setIsValidatingPromotionalCoupon(false);
    }
  }, [isOpen, shouldShowPromotionalCoupon, feeType]);

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
          
          <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
            {/* Cupom Promocional Section - apenas para usuários com seller_referral_code + legacy system_type e feeTypes permitidos */}
            {shouldShowPromotionalCoupon && (
              <div className="space-y-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
                    <Tag className="w-5 h-5 text-blue-600" />
                    Cupom Promocional
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={promotionalCouponInputRef}
                      type="text"
                      id="promotional-coupon-input-drawer"
                      name="promotional-coupon"
                      value={promotionalCoupon}
                      onChange={(e) => {
                        const newValue = e.target.value.toUpperCase();
                        const cursorPosition = e.target.selectionStart;
                        setPromotionalCoupon(newValue);
                        requestAnimationFrame(() => {
                          if (promotionalCouponInputRef.current) {
                            promotionalCouponInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                            promotionalCouponInputRef.current.focus();
                          }
                        });
                      }}
                      onBlur={(e) => {
                        const upperValue = e.target.value.toUpperCase();
                        if (upperValue !== promotionalCoupon) {
                          setPromotionalCoupon(upperValue);
                        }
                      }}
                      placeholder="Digite o código"
                      className="flex-1 px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center font-mono text-base tracking-wider border-gray-300"
                      style={{ fontSize: '16px' }}
                      maxLength={20}
                      autoComplete="off"
                    />
                    <button
                      onClick={validatePromotionalCoupon}
                      disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform whitespace-nowrap"
                    >
                      {isValidatingPromotionalCoupon ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="hidden sm:inline">Validando...</span>
                        </div>
                      ) : (
                        'Validar'
                      )}
                    </button>
                  </div>
                  
                  {/* Validation Result */}
                  {promotionalCouponValidation && (
                    <div className={`p-3 rounded-xl border-2 ${
                      promotionalCouponValidation.isValid 
                        ? 'bg-green-50 border-green-300 text-green-800' 
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {promotionalCouponValidation.isValid ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium text-sm">{promotionalCouponValidation.message}</span>
                      </div>
                      {promotionalCouponValidation.isValid && promotionalCouponValidation.discountAmount && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-600 line-through">${amount.toFixed(2)} (original)</p>
                          <p className="text-green-700 font-bold">${promotionalCouponValidation.finalAmount?.toFixed(2)} (com desconto)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onMethodSelect={onMethodSelect}
              feeType={feeType}
              amount={finalAmount}
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
            {/* Cupom Promocional Section - apenas para usuários com seller_referral_code + legacy system_type e feeTypes permitidos */}
            {shouldShowPromotionalCoupon && (
              <div className="space-y-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
                    <Tag className="w-5 h-5 text-blue-600" />
                    Cupom Promocional
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={promotionalCouponInputRef}
                      type="text"
                      id="promotional-coupon-input-dialog"
                      name="promotional-coupon"
                      value={promotionalCoupon}
                      onChange={(e) => {
                        const newValue = e.target.value.toUpperCase();
                        const cursorPosition = e.target.selectionStart;
                        setPromotionalCoupon(newValue);
                        requestAnimationFrame(() => {
                          if (promotionalCouponInputRef.current) {
                            promotionalCouponInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                            promotionalCouponInputRef.current.focus();
                          }
                        });
                      }}
                      onBlur={(e) => {
                        const upperValue = e.target.value.toUpperCase();
                        if (upperValue !== promotionalCoupon) {
                          setPromotionalCoupon(upperValue);
                        }
                      }}
                      placeholder="Digite o código"
                      className="flex-1 px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center font-mono text-base tracking-wider border-gray-300"
                      style={{ fontSize: '16px' }}
                      maxLength={20}
                      autoComplete="off"
                    />
                    <button
                      onClick={validatePromotionalCoupon}
                      disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform whitespace-nowrap"
                    >
                      {isValidatingPromotionalCoupon ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Validando...</span>
                        </div>
                      ) : (
                        'Validar'
                      )}
                    </button>
                  </div>
                  
                  {/* Validation Result */}
                  {promotionalCouponValidation && (
                    <div className={`p-3 rounded-xl border-2 ${
                      promotionalCouponValidation.isValid 
                        ? 'bg-green-50 border-green-300 text-green-800' 
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {promotionalCouponValidation.isValid ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium text-sm">{promotionalCouponValidation.message}</span>
                      </div>
                      {promotionalCouponValidation.isValid && promotionalCouponValidation.discountAmount && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-600 line-through">${amount.toFixed(2)} (original)</p>
                          <p className="text-green-700 font-bold">${promotionalCouponValidation.finalAmount?.toFixed(2)} (com desconto)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onMethodSelect={onMethodSelect}
              feeType={feeType}
              amount={finalAmount}
            />
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};