import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Tag, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
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
  const { user, userProfile } = useAuth();
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
      
      // ✅ Registrar uso do cupom no banco de dados
      try {
        console.log('[PaymentMethodSelectorDrawer] Registrando uso do cupom promocional...');
        const recordResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-promotional-coupon-validation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            coupon_code: normalizedCode,
            fee_type: feeType,
            original_amount: amount,
            discount_amount: result.discount_amount,
            final_amount: result.final_amount
          }),
        });

        const recordResult = await recordResponse.json();
        if (recordResult.success) {
          console.log('[PaymentMethodSelectorDrawer] ✅ Uso do cupom registrado com sucesso!');
        } else {
          console.warn('[PaymentMethodSelectorDrawer] ⚠️ Aviso: Não foi possível registrar o uso do cupom:', recordResult.error);
        }
      } catch (recordError) {
        console.warn('[PaymentMethodSelectorDrawer] ⚠️ Aviso: Erro ao registrar uso do cupom:', recordError);
        // Não quebra o fluxo - continua normalmente mesmo se o registro falhar
      }
      
      // Salvar no window para uso no checkout
      (window as any).__checkout_promotional_coupon = normalizedCode;
      (window as any).__checkout_final_amount = result.final_amount;
      
      // ✅ REMOVIDO: Não salvar mais no localStorage - apenas no banco de dados

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

  // Função para remover cupom promocional aplicado
  const removePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim() || !feeType || !user?.id) return;
    
    console.log('[PaymentMethodSelectorDrawer] Removendo cupom promocional...');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Remover do banco de dados
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-promotional-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          coupon_code: promotionalCoupon.trim().toUpperCase(),
          fee_type: feeType
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        console.warn('[PaymentMethodSelectorDrawer] ⚠️ Aviso: Não foi possível remover o cupom do banco:', result.error);
        // Continuar mesmo se falhar no banco - remover localmente
          } else {
        console.log('[PaymentMethodSelectorDrawer] ✅ Cupom removido do banco com sucesso!');
      }
    } catch (error) {
      console.warn('[PaymentMethodSelectorDrawer] ⚠️ Aviso: Erro ao remover cupom do banco:', error);
      // Continuar mesmo se falhar - remover localmente
    }
    
    // Limpar estados locais
    setPromotionalCoupon('');
    setPromotionalCouponValidation(null);
    setIsValidatingPromotionalCoupon(false);
    
    // Limpar window
    delete (window as any).__promotional_coupon_validation;
    delete (window as any).__checkout_promotional_coupon;
    delete (window as any).__checkout_final_amount;
    
    // Limpar localStorage se existir
    if (feeType) {
            localStorage.removeItem(`__promotional_coupon_${feeType}`);
          }
    
    console.log('[PaymentMethodSelectorDrawer] Cupom removido com sucesso');
  };

  // Verificar no banco de dados se o usuário já usou cupom promocional
  const checkPromotionalCouponFromDatabase = async () => {
    if (!isOpen || !shouldShowPromotionalCoupon || !feeType || !user?.id) return;
    
    try {
      // Normalizar fee_type para corresponder ao banco
      const normalizedFeeType = feeType === 'i20_control_fee' ? 'i20_control' : feeType;
      
      // Buscar registro mais recente de uso do cupom para este feeType
      const { data: couponUsage, error } = await supabase
        .from('promotional_coupon_usage')
        .select('coupon_code, original_amount, discount_amount, final_amount, metadata, used_at')
        .eq('user_id', user.id)
        .eq('fee_type', normalizedFeeType)
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[PaymentMethodSelectorDrawer] Erro ao buscar cupom do banco:', error);
        return;
      }
      
      if (couponUsage && couponUsage.coupon_code) {
        // Verificar se é uma validação recente (menos de 24 horas) ou se já foi usado em pagamento
        const usedAt = new Date(couponUsage.used_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - usedAt.getTime()) / (1000 * 60 * 60);
        const isRecentValidation = hoursDiff < 24 || couponUsage.metadata?.is_validation === true;
        
        if (isRecentValidation) {
          // Carregar cupom do banco
          setPromotionalCoupon(couponUsage.coupon_code);
          const validationData = {
            isValid: true,
            message: `Cupom ${couponUsage.coupon_code} aplicado! Desconto de $${Number(couponUsage.discount_amount).toFixed(2)} aplicado.`,
            discountAmount: Number(couponUsage.discount_amount),
            finalAmount: Number(couponUsage.final_amount)
          };
          setPromotionalCouponValidation(validationData);
          
          // Restaurar no window
          (window as any).__promotional_coupon_validation = validationData;
          (window as any).__checkout_promotional_coupon = couponUsage.coupon_code;
          (window as any).__checkout_final_amount = couponUsage.final_amount;
          
          console.log('[PaymentMethodSelectorDrawer] Cupom carregado do banco:', couponUsage.coupon_code, 'para feeType:', feeType);
        }
      }
    } catch (error) {
      console.error('[PaymentMethodSelectorDrawer] Erro ao verificar cupom no banco:', error);
      }
  };

  // Verificar cupom no banco quando modal abre
  useEffect(() => {
    if (isOpen && shouldShowPromotionalCoupon && feeType) {
      checkPromotionalCouponFromDatabase();
    } else if (!isOpen) {
      // Limpar estados quando modal fecha
      setPromotionalCoupon('');
      setPromotionalCouponValidation(null);
      setIsValidatingPromotionalCoupon(false);
    }
  }, [isOpen, shouldShowPromotionalCoupon, feeType, user?.id]);

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
                      disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim() || promotionalCouponValidation?.isValid}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform whitespace-nowrap ${
                        promotionalCouponValidation?.isValid
                          ? 'bg-green-600 text-white hover:bg-green-700 cursor-default'
                          : isValidatingPromotionalCoupon || !promotionalCoupon.trim()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isValidatingPromotionalCoupon ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="hidden sm:inline">Validando...</span>
                        </div>
                      ) : promotionalCouponValidation?.isValid ? (
                        <div className="flex items-center justify-center space-x-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="hidden sm:inline">Validado</span>
                        </div>
                      ) : (
                        'Validar'
                      )}
                    </button>
                  </div>
                  
                  {/* Validation Result */}
                  {promotionalCouponValidation?.isValid ? (
                    // Cupom válido - mostrar informações e botão para remover
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-800">{promotionalCoupon}</span>
                        </div>
                        <button
                          onClick={removePromotionalCoupon}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                          title="Remover cupom"
                        >
                          <XCircle className="w-5 h-5 text-green-600 hover:text-red-600" />
                        </button>
                      </div>
                      <div className="text-sm text-green-700">
                        <p className="line-through text-gray-500">${amount.toFixed(2)} (original)</p>
                        <p className="font-bold text-lg">${promotionalCouponValidation.finalAmount?.toFixed(2)} (com desconto)</p>
                        {promotionalCouponValidation.discountAmount && (
                          <p className="text-xs mt-1">-${promotionalCouponValidation.discountAmount.toFixed(2)} de desconto</p>
                        )}
                      </div>
                    </div>
                  ) : promotionalCouponValidation && !promotionalCouponValidation.isValid ? (
                    // Erro de validação
                    <div className="p-3 rounded-xl border-2 bg-red-50 border-red-300 text-red-800">
                      <div className="flex items-center space-x-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-sm">{promotionalCouponValidation.message}</span>
                      </div>
                    </div>
                  ) : null}
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
                      disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim() || promotionalCouponValidation?.isValid}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform whitespace-nowrap ${
                        promotionalCouponValidation?.isValid
                          ? 'bg-green-600 text-white hover:bg-green-700 cursor-default'
                          : isValidatingPromotionalCoupon || !promotionalCoupon.trim()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isValidatingPromotionalCoupon ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Validando...</span>
                        </div>
                      ) : promotionalCouponValidation?.isValid ? (
                        <div className="flex items-center justify-center space-x-2">
                          <CheckCircle className="w-5 h-5" />
                          <span>Validado</span>
                        </div>
                      ) : (
                        'Validar'
                      )}
                    </button>
                  </div>
                  
                  {/* Validation Result */}
                  {promotionalCouponValidation?.isValid ? (
                    // Cupom válido - mostrar informações e botão para remover
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-800">{promotionalCoupon}</span>
                        </div>
                        <button
                          onClick={removePromotionalCoupon}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                          title="Remover cupom"
                        >
                          <XCircle className="w-5 h-5 text-green-600 hover:text-red-600" />
                        </button>
                      </div>
                      <div className="text-sm text-green-700">
                        <p className="line-through text-gray-500">${amount.toFixed(2)} (original)</p>
                        <p className="font-bold text-lg">${promotionalCouponValidation.finalAmount?.toFixed(2)} (com desconto)</p>
                        {promotionalCouponValidation.discountAmount && (
                          <p className="text-xs mt-1">-${promotionalCouponValidation.discountAmount.toFixed(2)} de desconto</p>
                        )}
                      </div>
                    </div>
                  ) : promotionalCouponValidation && !promotionalCouponValidation.isValid ? (
                    // Erro de validação
                    <div className="p-3 rounded-xl border-2 bg-red-50 border-red-300 text-red-800">
                      <div className="flex items-center space-x-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-sm">{promotionalCouponValidation.message}</span>
                      </div>
                    </div>
                  ) : null}
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