import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, X, AlertCircle, XCircle } from 'lucide-react';
import { Scholarship } from '../types';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { convertCentsToDollars } from '../utils/currency';
import { calculateCardAmountWithFees, calculatePIXAmountWithFees, getExchangeRate } from '../utils/stripeFeeCalculator';
import { supabase } from '../lib/supabase';
import { ZelleCheckout } from './ZelleCheckout';

// Componente SVG para o logo do PIX
const PixIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

// Componente SVG para o logo do Zelle
const ZelleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#a0f" d="M35,42H13c-3.866,0-7-3.134-7-7V13c0-3.866,3.134-7,7-7h22c3.866,0,7,3.134,7,7v22C42,38.866,38.866,42,35,42z"/>
    <path fill="#fff" d="M17.5,18.5h14c0.552,0,1-0.448,1-1V15c0-0.552-0.448-1-1-1h-14c-0.552,0-1,0.448-1,1v2.5C16.5,18.052,16.948,18.5,17.5,18.5z"/>
    <path fill="#fff" d="M17,34.5h14.5c0.552,0,1-0.448,1-1V31c0-0.552-0.448-1-1-1H17c-0.552,0-1,0.448-1,1v2.5C16,34.052,16.448,34.5,17,34.5z"/>
    <path fill="#fff" d="M22.25,11v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,10.5,22.25,10.724,22.25,11z"/>
    <path fill="#fff" d="M22.25,32v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,31.5,22.25,31.724,22.25,32z"/>
    <path fill="#fff" d="M16.578,30.938H22l10.294-12.839c0.178-0.222,0.019-0.552-0.266-0.552H26.5L16.275,30.298C16.065,30.553,16.247,30.938,16.578,30.938z"/>
  </svg>
);

interface ScholarshipConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholarship: Scholarship;
  onStripeCheckout: (exchangeRate?: number) => void;
  onPixCheckout?: (exchangeRate?: number) => void;
  isProcessing?: boolean;
  feeType?: 'application_fee' | 'scholarship_fee';
  zelleMetadata?: { // Metadados para passar ao ZelleCheckout quando inline
    application_id?: string;
    selected_scholarship_id?: string;
    application_fee_amount?: number;
  };
}

export const ScholarshipConfirmationModal: React.FC<ScholarshipConfirmationModalProps> = ({
  isOpen,
  onClose,
  scholarship,
  onStripeCheckout,
  onPixCheckout,
  onZelleCheckout,
  onZelleSuccess,
  isProcessing = false,
  feeType = 'application_fee',
  zelleMetadata
}) => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { getFeeAmount: getFeeAmountFromConfig } = useFeeConfig(user?.id);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | null>(null);
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  
  // Estados para cupom promocional
  const [promotionalCoupon, setPromotionalCoupon] = useState('');
  const [promotionalCouponValidation, setPromotionalCouponValidation] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
  } | null>(null);
  const [isValidatingPromotionalCoupon, setIsValidatingPromotionalCoupon] = useState(false);
  const promotionalCouponInputRef = React.useRef<HTMLInputElement>(null);
  
  // Hook para detectar se é mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Evitar flicker: só mostra spinner após pequeno atraso
  useEffect(() => {
    let timeout: number | undefined;
    if (isProcessing || submitting) {
      timeout = window.setTimeout(() => setSpinnerVisible(true), 250);
    } else {
      setSpinnerVisible(false);
    }
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [isProcessing, submitting]);

  // Hide floating elements when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Valor dinâmico baseado no tipo de taxa
  const baseFeeAmount = useMemo(() => {
    if (feeType === 'scholarship_fee') {
      // Prioridade: 1) Valor da bolsa, 2) Override do usuário, 3) Valor padrão do config
      const scholarshipFeeFromConfig = getFeeAmountFromConfig('scholarship_fee');
      return scholarship.scholarship_fee_amount || scholarshipFeeFromConfig;
    }
    
    // Application Fee: PRIORIDADE 1 - Verificar override do usuário
    const overrideAmount = getFeeAmountFromConfig('application_fee');
    
    if (overrideAmount) {
      console.log('[ScholarshipConfirmationModal] Usando override de application_fee:', overrideAmount);
      // Aplicar +$100 por dependente ao valor de override
      const deps = Number(userProfile?.dependents) || 0;
      const final = deps > 0 ? overrideAmount + deps * 100 : overrideAmount;
      return final;
    }
    
    // PRIORIDADE 2 - Valor da scholarship (application_fee_amount em centavos)
    let applicationFeeAmountInCents = scholarship.application_fee_amount;
    
    if (!applicationFeeAmountInCents) {
      // Valor padrão em centavos: $350.00 = 35000 centavos
      applicationFeeAmountInCents = 35000;
    }
    
    // Converter centavos para dólares usando a função utilitária
    let applicationFeeAmount = convertCentsToDollars(applicationFeeAmountInCents);
    
    // ✅ CORREÇÃO: Aplicar +$100 por dependente para ambos os sistemas (legacy e simplified)
    const deps = Number(userProfile?.dependents) || 0;
    const final = deps > 0
      ? applicationFeeAmount + deps * 100
      : applicationFeeAmount;

    return final;
  }, [feeType, scholarship, getFeeAmountFromConfig, userProfile]);
  
  // Verificar se o usuário pode usar cupom promocional
  const hasSellerReferralCode = userProfile?.seller_referral_code && userProfile.seller_referral_code.trim() !== '';
  const isLegacySystem = userProfile?.system_type === 'legacy';
  // ✅ SEMPRE permitir uso de cupom promocional (campo sempre visível)
  const canUsePromotionalCoupon = true;
  
  // Calcular valor final considerando cupom promocional
  const feeAmount = promotionalCouponValidation?.isValid && promotionalCouponValidation.finalAmount
    ? promotionalCouponValidation.finalAmount
    : baseFeeAmount;
  
  const universityName = scholarship.universities?.name || scholarship.university_name || 'University';
  
  // Buscar taxa de câmbio para PIX
  useEffect(() => {
    if (onPixCheckout && feeAmount > 0) {
      getExchangeRate().then(rate => {
        setExchangeRate(rate);
        console.log('[ScholarshipConfirmationModal] Taxa de câmbio obtida:', rate);
      }).catch(error => {
        console.error('[ScholarshipConfirmationModal] Erro ao buscar taxa de câmbio:', error);
        setExchangeRate(5.6);
      });
    }
  }, [onPixCheckout, feeAmount]);
  
  // Calcular valores com markup de taxas do Stripe
  const cardAmountWithFees = useMemo(() => {
    return feeAmount > 0 ? calculateCardAmountWithFees(feeAmount) : 0;
  }, [feeAmount]);
  
  const pixAmountWithFees = useMemo(() => {
    return feeAmount > 0 && exchangeRate ? calculatePIXAmountWithFees(feeAmount, exchangeRate) : 0;
  }, [feeAmount, exchangeRate]);
  
  // Função para validar cupom promocional
  const validatePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim() || !user?.id) return;
    
    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    // ✅ CORREÇÃO: Normalizar feeType para corresponder ao banco (i20_control_fee -> i20_control)
    const normalizedFeeType = feeType === 'i20_control_fee' ? 'i20_control' : feeType;
    
    console.log('🔍 [ScholarshipConfirmationModal] Validando cupom promocional:', normalizedCode, 'para feeType:', normalizedFeeType);
    setIsValidatingPromotionalCoupon(true);
    setPromotionalCouponValidation(null);

    try {
      // ✅ Use new RPC that validates AND increments usage count for admin coupons
      const { data: result, error } = await supabase.rpc('validate_and_apply_admin_promotional_coupon', {
        p_code: normalizedCode,
        p_fee_type: normalizedFeeType, // ✅ Usar feeType normalizado (application_fee, scholarship_fee ou i20_control)
        p_user_id: user?.id
      });

      if (error) {
        console.error('🔍 [ScholarshipConfirmationModal] Erro RPC:', error);
        throw error;
      }

      console.log('🔍 [ScholarshipConfirmationModal] Resultado da validação do cupom promocional:', result);

      if (!result || !result.valid) {
        setPromotionalCouponValidation({
          isValid: false,
          message: result?.message || 'Invalid coupon code'
        });
        return;
      }

      // Calculate discount locally based on RPC result
      let discountAmount = 0;
      if (result.discount_type === 'percentage') {
        discountAmount = (baseFeeAmount * result.discount_value) / 100;
      } else {
        discountAmount = result.discount_value;
      }
      
      // Ensure discount doesn't exceed price
      discountAmount = Math.min(discountAmount, baseFeeAmount);
      const finalAmount = Math.max(0, baseFeeAmount - discountAmount);

      // Cupom válido
      const validationData = {
        isValid: true,
        message: `Cupom ${normalizedCode} aplicado! Desconto de $${discountAmount.toFixed(2)} aplicado.`,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        couponId: result.id // Store coupon ID for later use
      };
      
      setPromotionalCouponValidation(validationData);
      
      // ✅ Registrar uso do cupom no banco de dados
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (token) {
          console.log('[ScholarshipConfirmationModal] Registrando uso do cupom promocional...');
          const recordResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-promotional-coupon-validation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          body: JSON.stringify({
            coupon_code: normalizedCode,
            coupon_id: result.id,
            fee_type: feeType, // ✅ Usar feeType dinâmico
            original_amount: baseFeeAmount,
            discount_amount: discountAmount,
            final_amount: finalAmount
          }),
        });

        const recordResult = await recordResponse.json();
        if (recordResult.success) {
          console.log('[ScholarshipConfirmationModal] ✅ Uso do cupom registrado com sucesso!');
        } else {
          console.warn('[ScholarshipConfirmationModal] ⚠️ Aviso: Não foi possível registrar o uso do cupom:', recordResult.error);
        }
      }
      } catch (recordError) {
        console.warn('[ScholarshipConfirmationModal] ⚠️ Aviso: Erro ao registrar uso do cupom:', recordError);
        // Não quebra o fluxo - continua normalmente mesmo se o registro falhar
      }
      
      // Armazenar no window para o Overview acessar
      (window as any).__promotional_coupon_validation = validationData;
      
      // Disparar evento customizado para atualizar o Overview
      window.dispatchEvent(new CustomEvent('promotionalCouponValidated', {
        detail: {
          ...validationData,
          fee_type: feeType // ✅ Adicionar fee_type para distinguir entre application_fee e scholarship_fee
        }
      }));
      
      // Armazenar no window para uso no checkout
      (window as any).__checkout_promotional_coupon = normalizedCode;
      // ✅ Salvar valor final com desconto no window para uso no checkout PIX/Stripe
      (window as any).__checkout_final_amount = finalAmount;
      console.log('[ScholarshipConfirmationModal] Valor final com desconto salvo no window:', finalAmount);
      
    } catch (error: any) {
      console.error('Erro ao validar cupom promocional:', error);
      setPromotionalCouponValidation({
        isValid: false,
        message: error?.message || 'Erro ao validar cupom. Verifique sua conexão e tente novamente.'
      });
    } finally {
      setIsValidatingPromotionalCoupon(false);
    }
  };
  
  // Verificar no banco de dados se o usuário já usou cupom promocional
  const checkPromotionalCouponFromDatabase = async () => {
    if (!isOpen || !feeType || !user?.id) return;
    
    try {
      // Buscar registro mais recente de uso do cupom para este feeType
      const { data: couponUsage, error } = await supabase
        .from('promotional_coupon_usage')
        .select('coupon_code, original_amount, discount_amount, final_amount, metadata, used_at')
        .eq('user_id', user.id)
        .eq('fee_type', feeType) // ✅ Usar feeType dinâmico
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[ScholarshipConfirmationModal] Erro ao buscar cupom do banco:', error);
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
          (window as any).__checkout_promotional_coupon = couponUsage.coupon_code;
          // ✅ Restaurar valor final com desconto no window
          (window as any).__checkout_final_amount = Number(couponUsage.final_amount);
          console.log('[ScholarshipConfirmationModal] Valor final com desconto restaurado do banco:', couponUsage.final_amount);
          
          console.log('[ScholarshipConfirmationModal] Cupom carregado do banco:', couponUsage.coupon_code);
        }
      }
    } catch (error) {
      console.error('[ScholarshipConfirmationModal] Erro ao verificar cupom no banco:', error);
    }
  };

  // Verificar cupom no banco quando modal abre
  useEffect(() => {
    if (isOpen && feeType) {
      checkPromotionalCouponFromDatabase();
    }
  }, [isOpen, feeType, user?.id]);

  // Função para remover cupom promocional aplicado
  const removePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim() || !user?.id) return;
    
    console.log('[ScholarshipConfirmationModal] Removendo cupom promocional...');
    
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
          fee_type: feeType // ✅ Usar feeType dinâmico
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        console.warn('[ScholarshipConfirmationModal] ⚠️ Aviso: Não foi possível remover o cupom do banco:', result.error);
        // Continuar mesmo se falhar no banco - remover localmente
      } else {
        console.log('[ScholarshipConfirmationModal] ✅ Cupom removido do banco com sucesso!');
      }
    } catch (error) {
      console.warn('[ScholarshipConfirmationModal] ⚠️ Aviso: Erro ao remover cupom do banco:', error);
      // Continuar mesmo se falhar - remover localmente
    }
    
    // Limpar estados locais
    setPromotionalCoupon('');
    setPromotionalCouponValidation(null);
    setIsValidatingPromotionalCoupon(false);
    
    // Limpar window
    delete (window as any).__checkout_promotional_coupon;
    delete (window as any).__checkout_final_amount;
    
    // Limpar localStorage se existir
    if (feeType) {
      localStorage.removeItem(`__promotional_coupon_${feeType}`);
    }
    
    console.log('[ScholarshipConfirmationModal] Cupom removido com sucesso');
  };

  // Reset cupom quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setIsValidatingPromotionalCoupon(false);
    }
  }, [isOpen]);

  // Títulos e textos dinâmicos baseados no tipo de taxa
  const getModalContent = () => {
    if (feeType === 'scholarship_fee') {
      return {
        title: t('scholarshipConfirmationModal.scholarshipFee.title'),
        subtitle: t('scholarshipConfirmationModal.scholarshipFee.subtitle'),
        feeLabel: t('scholarshipConfirmationModal.scholarshipFee.feeLabel'),
        buttonText: t('scholarshipConfirmationModal.scholarshipFee.buttonText', { amount: feeAmount.toFixed(2) })
      };
    }
    
    return {
      title: t('scholarshipConfirmationModal.applicationFee.title'),
      subtitle: t('scholarshipConfirmationModal.applicationFee.subtitle'),
      feeLabel: t('scholarshipConfirmationModal.applicationFee.feeLabel'),
      buttonText: t('scholarshipConfirmationModal.applicationFee.buttonText', { amount: feeAmount.toFixed(2) })
    };
  };

  const modalContent = getModalContent();

  const handlePaymentMethodSelect = (method: 'stripe' | 'zelle' | 'pix') => {
    setSelectedPaymentMethod(method);
  };

  const handleProceed = async () => {
    if (!selectedPaymentMethod) return;

    try {
      setSubmitting(true);
      
      // Se houver cupom promocional válido, manter no localStorage para uso no checkout
      // O cupom será usado no checkout e depois removido quando o pagamento for confirmado
      
      if (selectedPaymentMethod === 'stripe') {
        onStripeCheckout(exchangeRate || undefined);
      } else if (selectedPaymentMethod === 'pix') {
        if (onPixCheckout) {
          onPixCheckout(exchangeRate || undefined);
        } else {
          onStripeCheckout(exchangeRate || undefined);
        }
      } else if (selectedPaymentMethod === 'zelle') {
        // Sempre chamar callback para redirecionar (tanto mobile quanto desktop)
        if (onZelleCheckout) {
          onZelleCheckout();
        } else {
          // Caso contrário, redirecionar para página de checkout Zelle (comportamento padrão)
          const params = new URLSearchParams({
            feeType: feeType,
            amount: feeAmount.toString(),
            scholarshipsIds: scholarship.id
          });
          
          if (feeType === 'application_fee') {
            params.append('applicationFeeAmount', feeAmount.toString());
          } else if (feeType === 'scholarship_fee') {
            params.append('scholarshipFeeAmount', feeAmount.toString());
          }
          
          navigate(`/checkout/zelle?${params.toString()}`);
        }
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Nunca mostrar Zelle inline - sempre redirecionar para página dedicada
  const showZelleInline = false;

  const canProceed = selectedPaymentMethod !== null;

  // Calcular valor dinâmico do botão baseado no método de pagamento selecionado
  const getButtonAmount = () => {
    if (!selectedPaymentMethod) return feeAmount;
    
    if (selectedPaymentMethod === 'stripe') {
      return cardAmountWithFees;
    } else if (selectedPaymentMethod === 'pix') {
      return pixAmountWithFees;
    } else {
      return feeAmount; // Zelle
    }
  };

  const buttonAmount = getButtonAmount();

  // Função para obter o texto do botão com valor dinâmico
  const getButtonText = () => {
    if (feeType === 'scholarship_fee') {
      if (selectedPaymentMethod === 'pix' && exchangeRate) {
        return t('scholarshipConfirmationModal.scholarshipFee.buttonText', { amount: `R$ ${buttonAmount.toFixed(2)}` });
      }
      return t('scholarshipConfirmationModal.scholarshipFee.buttonText', { amount: buttonAmount.toFixed(2) });
    }
    
    // Application Fee
    if (selectedPaymentMethod === 'pix' && exchangeRate) {
      return t('scholarshipConfirmationModal.applicationFee.buttonText', { amount: `R$ ${buttonAmount.toFixed(2)}` });
    }
    return t('scholarshipConfirmationModal.applicationFee.buttonText', { amount: buttonAmount.toFixed(2) });
  };

  // Componente de conteúdo comum para Drawer e Dialog
  const ModalContent = ({ isInDrawer = false }: { isInDrawer?: boolean }) => (
    <div className={isInDrawer ? 'flex flex-col min-h-0 h-full' : 'flex flex-col h-full min-h-0'}>
      {/* Loading Overlay */}
      {(isProcessing || submitting) && spinnerVisible && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-900">{t('scholarshipConfirmationModal.loading.processing')}</p>
            <p className="text-sm text-gray-600 mt-2">{t('scholarshipConfirmationModal.loading.redirecting')}</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      {isInDrawer ? (
        <DrawerHeader className="text-center flex-shrink-0">
          <DrawerTitle className="text-xl font-bold text-gray-900">
            {modalContent.title}
          </DrawerTitle>
          <DrawerDescription className="text-gray-600">
            {modalContent.subtitle}
          </DrawerDescription>
        </DrawerHeader>
      ) : (
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6 flex-shrink-0 border-b border-blue-700">
          <button
            onClick={onClose}
            disabled={isProcessing || submitting}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            title={t('common.close')}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="flex items-center gap-3 pr-12">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {modalContent.title}
              </h2>
              <p className="text-blue-100 text-sm">
                {modalContent.subtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`${isInDrawer ? 'flex-1 p-4 min-h-0 overflow-y-auto' : 'flex-1 overflow-y-auto p-4 sm:p-6 min-h-0'}`}>
        <div className="space-y-4">
        {/* Scholarship Info */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{t('scholarshipConfirmationModal.labels.selectedScholarship')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('scholarshipConfirmationModal.labels.scholarship')}:</span>
              <span className="font-medium text-gray-900 text-right ml-2 flex-1">{scholarship.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('scholarshipConfirmationModal.labels.university')}:</span>
              <span className="font-medium text-gray-900 text-right ml-2 flex-1">{universityName}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="text-gray-600">{modalContent.feeLabel}</span>
              {promotionalCouponValidation?.isValid ? (
                <div className="text-right animate-in fade-in slide-in-from-right duration-300">
                  <div className="font-bold text-base sm:text-lg text-gray-400 line-through transition-all">${baseFeeAmount.toFixed(2)}</div>
                  <div className="font-bold text-base sm:text-lg text-green-600 transition-all">${feeAmount.toFixed(2)} USD</div>
                  {promotionalCouponValidation.discountAmount && (
                    <div className="text-xs text-green-500 mt-1">
                      -${promotionalCouponValidation.discountAmount.toFixed(2)} de desconto
                    </div>
                  )}
                </div>
              ) : (
                <span className="font-bold text-base sm:text-lg text-green-600 transition-all">${feeAmount.toFixed(2)} USD</span>
              )}
            </div>
          </div>
        </div>

        {/* Promotional Coupon Section - sempre visível */}
        {canUsePromotionalCoupon && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3">
            <div className="text-center">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                Cupom Promocional
              </h3>
            </div>

            <div className="space-y-3">
              {promotionalCouponValidation?.isValid ? (
                // Cupom válido - mostrar apenas confirmação visual, sem duplicar valores
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      <span className="font-semibold text-green-800 text-sm sm:text-base">{promotionalCoupon}</span>
                      {promotionalCouponValidation.discountAmount && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          -${promotionalCouponValidation.discountAmount.toFixed(2)} de desconto
                        </span>
                      )}
                    </div>
                    <button
                      onClick={removePromotionalCoupon}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                      title="Remover cupom"
                    >
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ) : (
                // Input para validar cupom
                <>
                  <div className="flex gap-2">
                    <input
                      ref={promotionalCouponInputRef}
                      type="text"
                      id="promotional-coupon-input-scholarship"
                      name="promotional-coupon-scholarship"
                      value={promotionalCoupon}
                      onChange={(e) => {
                        const newValue = e.target.value.toUpperCase();
                        // Manter o cursor na posição correta
                        const cursorPosition = e.target.selectionStart;
                        setPromotionalCoupon(newValue);
                        // Restaurar posição do cursor após atualização
                        requestAnimationFrame(() => {
                          if (promotionalCouponInputRef.current) {
                            promotionalCouponInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                            promotionalCouponInputRef.current.focus();
                          }
                        });
                      }}
                      onBlur={(e) => {
                        // Manter o valor em uppercase quando perder foco
                        const upperValue = e.target.value.toUpperCase();
                        if (upperValue !== promotionalCoupon) {
                          setPromotionalCoupon(upperValue);
                        }
                      }}
                      placeholder="Digite o código"
                      className="flex-1 px-4 sm:px-5 py-2 sm:py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center font-mono text-sm sm:text-base tracking-wider border-gray-300"
                      style={{ fontSize: '16px' }}
                      maxLength={20}
                      autoComplete="off"
                    />
                    <button
                      onClick={validatePromotionalCoupon}
                      disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()}
                      className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform whitespace-nowrap text-sm sm:text-base bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {isValidatingPromotionalCoupon ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="hidden sm:inline">Validando...</span>
                        </div>
                      ) : (
                        'Validar'
                      )}
                    </button>
                  </div>
                  
                  {/* Validation Result - apenas para erros */}
                  {promotionalCouponValidation && !promotionalCouponValidation.isValid && (
                    <div className="p-3 rounded-xl border-2 animate-in fade-in slide-in-from-top duration-300 bg-red-50 border-red-300 text-red-800">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="font-medium text-xs sm:text-sm">{promotionalCouponValidation.message}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('scholarshipConfirmationModal.labels.choosePaymentMethod')}</h3>
          
          <div className="grid gap-2 sm:gap-3">
            {/* Stripe Option */}
            <label className="relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
              <input
                type="radio"
                name="payment-method"
                value="stripe"
                checked={selectedPaymentMethod === 'stripe'}
                onChange={() => handlePaymentMethodSelect('stripe')}
                className="sr-only"
              />
              <div className={`w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-full mr-2 sm:mr-3 flex items-center justify-center flex-shrink-0 ${
                selectedPaymentMethod === 'stripe' 
                  ? 'border-blue-600 bg-blue-600' 
                  : 'border-gray-300'
              }`}>
                {selectedPaymentMethod === 'stripe' && (
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                )}
              </div>
              
              <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm sm:text-base">{t('scholarshipConfirmationModal.payment.stripe.title')}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.stripe.description')}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t('paymentSelector.includesProcessingFees')}</div>
                  </div>
                </div>
                {feeAmount > 0 && (
                  <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                    ${cardAmountWithFees.toFixed(2)}
                  </span>
                )}
              </div>
            </label>

            {/* Zelle Option */}
            <label className="relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
              <input
                type="radio"
                name="payment-method"
                value="zelle"
                checked={selectedPaymentMethod === 'zelle'}
                onChange={() => handlePaymentMethodSelect('zelle')}
                className="sr-only"
              />
              <div className={`w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-full mr-2 sm:mr-3 flex items-center justify-center flex-shrink-0 ${
                selectedPaymentMethod === 'zelle' 
                  ? 'border-blue-600 bg-blue-600' 
                  : 'border-gray-300'
              }`}>
                {selectedPaymentMethod === 'zelle' && (
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                )}
              </div>
              
              <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <ZelleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-sm sm:text-base">{t('scholarshipConfirmationModal.payment.zelle.title')}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.zelle.description')}</div>
                </div>
                </div>
                <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                  ${feeAmount.toFixed(2)}
                </span>
              </div>
            </label>

            {/* PIX Option (if available) */}
            {onPixCheckout && (
              <label className="relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50">
                <input
                  type="radio"
                  name="payment-method"
                  value="pix"
                  checked={selectedPaymentMethod === 'pix'}
                  onChange={() => handlePaymentMethodSelect('pix')}
                  className="sr-only"
                />
                <div className={`w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-full mr-2 sm:mr-3 flex items-center justify-center flex-shrink-0 ${
                  selectedPaymentMethod === 'pix' 
                    ? 'border-blue-600 bg-blue-600' 
                    : 'border-gray-300'
                }`}>
                  {selectedPaymentMethod === 'pix' && (
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                  )}
                </div>
                
                <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <PixIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm sm:text-base">{t('scholarshipConfirmationModal.payment.pix.title')}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{t('scholarshipConfirmationModal.payment.pix.description')}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t('paymentSelector.includesProcessingFees')}</div>
                  </div>
                  </div>
                  {feeAmount > 0 && (
                    <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                      {exchangeRate ? `R$ ${pixAmountWithFees.toFixed(2)}` : '...'}
                    </span>
                  )}
                </div>
              </label>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Footer */}
      {isInDrawer ? (
        <DrawerFooter className="flex-row gap-2 flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4 mt-auto">
          <DrawerClose className="flex-1 bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
            {t('scholarshipConfirmationModal.payment.cancel')}
          </DrawerClose>
          <button
            onClick={handleProceed}
            disabled={!canProceed || isProcessing || submitting}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isProcessing || submitting ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t('scholarshipConfirmationModal.loading.processing')}
              </div>
            ) : (
              getButtonText()
            )}
          </button>
        </DrawerFooter>
      ) : (
        <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex gap-2 sm:gap-3 flex-shrink-0 border-t border-gray-100 mt-auto">
          <button
            onClick={onClose}
            disabled={isProcessing || submitting}
            className="flex-1 bg-white text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            {t('scholarshipConfirmationModal.payment.cancel')}
          </button>
          
          <button
            onClick={handleProceed}
            disabled={!canProceed || isProcessing || submitting}
            className="flex-1 bg-blue-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
          >
            {isProcessing || submitting ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t('scholarshipConfirmationModal.loading.processing')}
              </div>
            ) : (
              getButtonText()
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Usar Drawer em mobile, Dialog em desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[85vh] bg-white flex flex-col">
          <ModalContent isInDrawer={true} />
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4 z-30">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0 max-h-[90vh] flex flex-col">
          <ModalContent isInDrawer={false} />
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
