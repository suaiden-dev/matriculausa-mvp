import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Dialog } from '@headlessui/react';
import { X, Shield, Scroll, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useDynamicFees } from '../hooks/useDynamicFees';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import { useAffiliateTermsAcceptance } from '../hooks/useAffiliateTermsAcceptance';
import { useReferralCode } from '../hooks/useReferralCode';
import { ModalContent } from './ModalContent';
import { useModal } from '../contexts/ModalContext';
import { IdentityPhotoUpload } from './IdentityPhotoUpload';
import { useStudentLogs } from '../hooks/useStudentLogs';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface Term {
  id: string;
  title: string;
  content: string;
  term_type: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: (finalAmount: number, discountCode?: string) => void;
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee';
  productName: string;
  productPrice: number;
  isLoading?: boolean; // Prop opcional para mostrar loading
}

// Shared modal content component - now imported from separate file

// Terms view component for mobile drawer
const MobileTermsView: React.FC<{
  activeTerm: Term | null;
  loadingTerms: boolean;
  hasScrolledToBottom: boolean;
  termsContentRef: React.RefObject<HTMLDivElement | null>;
  handleTermsScroll: () => void;
  checkIfContentNeedsScroll: () => boolean;
  handleTermsAccept: () => void;
  setShowTermsInDrawer: (value: boolean) => void;
  t: any;
}> = ({
  activeTerm,
  loadingTerms,
  hasScrolledToBottom,
  termsContentRef,
  handleTermsScroll,
  checkIfContentNeedsScroll,
  handleTermsAccept,
  setShowTermsInDrawer,
  t
}) => (
  <div className="space-y-4 bg-white min-h-full flex flex-col">
    {/* Header com botão de voltar */}
    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
      <button
        onClick={() => setShowTermsInDrawer(false)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>
    </div>

    {/* Content */}
    {loadingTerms ? (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">{t('preCheckoutModal.loading')}</p>
        </div>
      </div>
    ) : activeTerm ? (
      <>
        <div 
          ref={termsContentRef}
          onScroll={handleTermsScroll}
          className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600"
          dangerouslySetInnerHTML={{ __html: activeTerm.content }}
        />
        
        {!hasScrolledToBottom && checkIfContentNeedsScroll() && (
          <div className="flex items-center justify-center p-3 bg-amber-50 border border-amber-200 rounded-lg mt-4">
            <Scroll className="h-4 w-4 text-amber-600 mr-2" />
            <span className="text-amber-800 text-sm font-medium">
              {t('preCheckoutModal.scrollToBottomFirst')}
            </span>
          </div>
        )}

        {/* Footer com botão de aceitar */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 -mx-4 -mb-4 rounded-b-2xl mt-4">
          <button
            onClick={handleTermsAccept}
            disabled={!hasScrolledToBottom}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
              hasScrolledToBottom
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {hasScrolledToBottom 
              ? t('preCheckoutModal.acceptTerms') 
              : (checkIfContentNeedsScroll() 
                  ? t('preCheckoutModal.scrollToBottomFirst') 
                  : t('preCheckoutModal.readingTerms')
                )
            }
          </button>
        </div>
      </>
    ) : (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-600 text-sm">{t('preCheckoutModal.noTermsFound')}</p>
        </div>
      </div>
    )}
  </div>
);

export const PreCheckoutModal: React.FC<PreCheckoutModalProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
  feeType,
  productName,
  productPrice,
  isLoading = false // Valor padrão false
}) => {
  
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const { selectionProcessFee, scholarshipFee } = useDynamicFees();
  const { recordTermAcceptance } = useTermsAcceptance();
  const { recordAffiliateTermAcceptance, checkIfUserHasAffiliate } = useAffiliateTermsAcceptance();
  const { activeDiscount } = useReferralCode();
  const { openModal, closeModal } = useModal();
  const { logAction } = useStudentLogs(userProfile?.id || '');

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [showTermsInDrawer, setShowTermsInDrawer] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    isSelfReferral?: boolean;
  } | null>(null);
  const [hasUsedReferralCode, setHasUsedReferralCode] = useState(false);
  const [codeApplied, setCodeApplied] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [showCodeStep, setShowCodeStep] = useState(false);
  // Estado para cupom promocional aplicado (apenas leitura/exibição)
  const [promotionalCouponApplied, setPromotionalCouponApplied] = useState<{
    discountAmount: number;
    finalAmount: number;
    code?: string;
  } | null>(null);
  // Verificar se as taxas estão carregando (para uso futuro se necessário)
  // const isFeesLoading = (() => {
  //   if (userProfile?.system_type === 'simplified') {
  //     return simplifiedFeesLoading || !selectionProcessFee || !scholarshipFee;
  //   } else {
  //     return feeLoading || !selectionProcessFee || !scholarshipFee;
  //   }
  // })();

  // Preço calculado usando useDynamicFees que já considera system_type e dependentes
  const computedBasePrice = (() => {
    switch (feeType) {
      case 'selection_process':
        // ✅ CORREÇÃO: Usar useDynamicFees que já considera system_type e dependentes
        if (!selectionProcessFee) return 0; // Aguardar carregamento
        return parseFloat(selectionProcessFee.replace('$', ''));
      case 'application_fee': {
        const base = Number(getFeeAmount('application_fee'));
        const deps = Number(userProfile?.dependents) || 0;
        const systemType = userProfile?.system_type || 'legacy';
        const final = systemType === 'legacy' && deps > 0 ? base + deps * 100 : base;
        return final;
      }
      case 'scholarship_fee':
        // ✅ CORREÇÃO: Usar useDynamicFees que já considera system_type
        if (!scholarshipFee) return 0; // Aguardar carregamento
        return parseFloat(scholarshipFee.replace('$', ''));
      case 'enrollment_fee':
      default:
        return productPrice;
    }
  })();

  // Terms acceptance states
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [userClickedCheckbox, setUserClickedCheckbox] = useState(false); // Track user interaction
  const termsContentRef = useRef<HTMLDivElement>(null);
  
  // Identity photo upload states
  const [showPhotoUploadStep, setShowPhotoUploadStep] = useState(false);
  const [identityPhotoPath, setIdentityPhotoPath] = useState<string | null>(null);
  const [identityPhotoName, setIdentityPhotoName] = useState<string | null>(null);
  
  // Verificar se o usuário tem seller_referral_code
  const hasSellerReferralCode = userProfile?.seller_referral_code && userProfile.seller_referral_code.trim() !== '';
  
  // Verificar se o usuário já tem affiliate_code (friend code) do registro
  const hasAffiliateCode = userProfile?.affiliate_code && userProfile.affiliate_code.trim() !== '';

  // Buscar cupom promocional do banco de dados
  const checkPromotionalCouponFromDatabase = React.useCallback(async () => {
    if (!isOpen || !feeType || !user?.id) return;
    
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
        console.error('[PreCheckoutModal] Erro ao buscar cupom do banco:', error);
        return;
      }
      
      if (couponUsage && couponUsage.coupon_code) {
        // Verificar se é uma validação recente (menos de 24 horas) ou se já foi usado em pagamento
        const usedAt = new Date(couponUsage.used_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - usedAt.getTime()) / (1000 * 60 * 60);
        const isRecentValidation = hoursDiff < 24 || couponUsage.metadata?.is_validation === true;
        
        if (isRecentValidation) {
          setPromotionalCouponApplied({
            discountAmount: Number(couponUsage.discount_amount),
            finalAmount: Number(couponUsage.final_amount),
            code: couponUsage.coupon_code
          });
          console.log('[PreCheckoutModal] Cupom promocional carregado do banco:', couponUsage.coupon_code);
        } else {
          setPromotionalCouponApplied(null);
        }
      } else {
        setPromotionalCouponApplied(null);
      }
    } catch (error) {
      console.error('[PreCheckoutModal] Erro ao verificar cupom no banco:', error);
      setPromotionalCouponApplied(null);
    }
  }, [isOpen, feeType, user?.id]);

  // Verificar cupom no banco quando modal abre
  useEffect(() => {
    if (isOpen && feeType) {
      checkPromotionalCouponFromDatabase();
    }
  }, [isOpen, feeType, checkPromotionalCouponFromDatabase]);

  // Ouvir eventos de validação de cupom promocional
  useEffect(() => {
    // Verificar window ao montar
    const windowCoupon = (window as any).__promotional_coupon_validation;
    if (windowCoupon?.isValid && windowCoupon?.discountAmount) {
      setPromotionalCouponApplied({
        discountAmount: windowCoupon.discountAmount,
        finalAmount: windowCoupon.finalAmount || Math.max(0, computedBasePrice - windowCoupon.discountAmount),
        code: (window as any).__checkout_promotional_coupon
      });
    }
    
    // Ouvir eventos de validação de cupom
    const handleCouponValidation = (event: CustomEvent) => {
      if (event.detail?.isValid && event.detail?.discountAmount) {
        // Verificar se é para o feeType atual
        const eventFeeType = event.detail?.fee_type || feeType;
        const normalizedEventFeeType = eventFeeType === 'i20_control_fee' ? 'i20_control' : eventFeeType;
        const normalizedCurrentFeeType = feeType === 'i20_control_fee' ? 'i20_control' : feeType;
        
        if (normalizedEventFeeType === normalizedCurrentFeeType) {
          setPromotionalCouponApplied({
            discountAmount: event.detail.discountAmount,
            finalAmount: event.detail.finalAmount || Math.max(0, computedBasePrice - event.detail.discountAmount),
            code: (window as any).__checkout_promotional_coupon
          });
        }
      } else {
        // Se o cupom foi removido, verificar novamente no banco
        checkPromotionalCouponFromDatabase();
      }
    };

    window.addEventListener('promotionalCouponValidated', handleCouponValidation as EventListener);
    window.addEventListener('promotionalCouponRemoved', checkPromotionalCouponFromDatabase);
    
    return () => {
      window.removeEventListener('promotionalCouponValidated', handleCouponValidation as EventListener);
      window.removeEventListener('promotionalCouponRemoved', checkPromotionalCouponFromDatabase);
    };
  }, [computedBasePrice, feeType, checkPromotionalCouponFromDatabase]);


  // Buscar foto de identidade existente
  const fetchExistingPhoto = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔍 [PreCheckoutModal] Buscando foto de identidade existente para o usuário:', user.id);
      
      const { data, error } = await supabase
        .from('comprehensive_term_acceptance')
        .select('identity_photo_path, identity_photo_name')
        .eq('user_id', user.id)
        .not('identity_photo_path', 'is', null) // ✅ Apenas registros com foto
        .order('accepted_at', { ascending: false }) // ✅ Mais recente primeiro
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('🔍 [PreCheckoutModal] Erro ao buscar foto existente:', error);
        return;
      }

      if (data && data.identity_photo_path) {
        console.log('🔍 [PreCheckoutModal] ✅ Foto de identidade existente encontrada:', data.identity_photo_path);
        setIdentityPhotoPath(data.identity_photo_path);
        setIdentityPhotoName(data.identity_photo_name);
      } else {
        console.log('🔍 [PreCheckoutModal] ℹ️ Nenhuma foto de identidade encontrada para este usuário');
      }
    } catch (err) {
      console.error('🔍 [PreCheckoutModal] Erro inesperado ao buscar foto:', err);
    }
  };

  useEffect(() => {
    
    if (isOpen) {
      // Reset all state when modal opens
      setDiscountCode('');
      setValidationResult(null);
      setIsValidating(false);
      setCodeApplied(false);
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
      setShowTermsModal(false); // Reset terms modal state
      setActiveTerm(null); // Reset active term
      setUserClickedCheckbox(false); // Reset user interaction flag
      setShowPhotoUploadStep(false); // Reset photo upload step
      
      // ✅ LOGICA DE FOTO AUTOMÁTICA (Comentado para permitir testes reais com foto no localhost)
      /*
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        console.log('🔍 [PreCheckoutModal] Ambiente localhost detectado. Usando foto mock.');
        setIdentityPhotoPath('mock_localhost_photo.png');
        setIdentityPhotoName('mock_localhost_photo.png');
      } else {
        // Se não for localhost, tentar buscar foto existente no bucket
        setIdentityPhotoPath(null);
        setIdentityPhotoName(null);
        fetchExistingPhoto();
      }
      */
      
      // Fluxo normal: tentar buscar foto existente no bucket
      setIdentityPhotoPath(null);
      setIdentityPhotoName(null);
      fetchExistingPhoto();

      // ✅ CORREÇÃO: Se não tem seller_referral_code, mostrar campo diretamente (sem checkbox)
      // Não resetar hasReferralCode e showCodeStep se não tem seller_referral_code
      if (!hasSellerReferralCode) {
        setHasReferralCode(true); // Sempre mostrar campo se não tem seller_referral_code
        setShowCodeStep(true); // Sempre mostrar campo se não tem seller_referral_code
      } else {
        setHasReferralCode(false); // Reset apenas se tem seller_referral_code
        setShowCodeStep(false); // Reset apenas se tem seller_referral_code
      }
      setPromotionalCouponApplied(null); // Reset promotional coupon
      checkReferralCodeUsage();
      
      // iOS Safari zoom prevention
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
      
      // Hide floating elements when modal is open
      document.body.classList.add('modal-open');
    } else {
      // Clean up state when modal closes
      setDiscountCode('');
      setValidationResult(null);
      setIsValidating(false);
      setCodeApplied(false);
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
      setShowTermsModal(false);
      setActiveTerm(null);
      setUserClickedCheckbox(false);
      setShowPhotoUploadStep(false);
      setIdentityPhotoPath(null);
      setIdentityPhotoName(null);
      
      // Restore original viewport settings
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
      
      // Show floating elements again when modal closes
      document.body.classList.remove('modal-open');
    }
  }, [isOpen]);

  // Gerenciar estado do modal no contexto global
  useEffect(() => {
    if (isOpen) {
      openModal();
      return () => {
        closeModal();
      };
    }
  }, [isOpen, openModal, closeModal]);

  // Preencher automaticamente o campo de referral code se o usuário já tem affiliate_code
  useEffect(() => {
    
    if (isOpen && hasAffiliateCode && userProfile?.affiliate_code) {
      setDiscountCode(userProfile.affiliate_code);
      setHasReferralCode(true); // Marcar checkbox automaticamente
      setShowCodeStep(true); // Mostrar campo automaticamente
      // Automaticamente validar o código preenchido
      setTimeout(() => {
        if (userProfile.affiliate_code) {
          validateDiscountCodeForPrefill(userProfile.affiliate_code);
        }
      }, 100);
    }
  }, [isOpen, hasAffiliateCode, userProfile?.affiliate_code]);

  // Clean up state when component unmounts
  useEffect(() => {
    return () => {
      setDiscountCode('');
      setValidationResult(null);
      setIsValidating(false);
      setCodeApplied(false);
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
      setShowTermsModal(false);
      setActiveTerm(null);
      setUserClickedCheckbox(false);
      setShowPhotoUploadStep(false);
      setIdentityPhotoPath(null);
      setIdentityPhotoName(null);
      
      // Restore original viewport settings on unmount
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
      
      // Remove modal-open class on unmount
      document.body.classList.remove('modal-open');
    };
  }, []);

  // Check scroll requirements when activeTerm changes
  useEffect(() => {
    if (activeTerm && (showTermsModal || showTermsInDrawer)) {
      console.log('🔍 [PreCheckoutModal] activeTerm carregado, verificando scroll');
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        checkIfContentNeedsScroll();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeTerm, showTermsModal, showTermsInDrawer]);

  // Reset scroll state when showing terms in drawer
  useEffect(() => {
    if (showTermsInDrawer) {
      console.log('🔍 [PreCheckoutModal] Resetando estado de scroll para drawer');
      setHasScrolledToBottom(false);
    }
  }, [showTermsInDrawer]);

  // Load active terms from database
  const loadActiveTerms = async () => {
    try {
      setLoadingTerms(true);
      
      const { data, error } = await supabase
        .from('application_terms')
        .select('*')
        .eq('term_type', 'checkout_terms')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);


      if (error) {
        console.error('❌ [PreCheckoutModal] Erro na query:', error);
        return false;
      }

      if (data && data.length > 0) {
        setActiveTerm(data[0]);
        return true; // Indicate success
      }
      
      return false; // Indicate no active terms found
    } catch (error) {
      console.error('❌ [PreCheckoutModal] Erro inesperado:', error);
      return false; // Indicate failure
    } finally {
      setLoadingTerms(false);
    }
  };

  // Check if user already used referral code
  const checkReferralCodeUsage = async () => {
    try {
      // ✅ CORREÇÃO: Se já tem activeDiscount, não bloquear o usuário
      if (activeDiscount?.has_discount) {
        setHasUsedReferralCode(false); // Não bloquear
        return;
      }

      const { data, error } = await supabase
        .from('used_referral_codes')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasUsedReferralCode(true);
      }
    } catch (error) {
      console.error('Error checking referral code usage:', error);
    }
  };

  // Handle terms scroll and check if content needs scrolling
  const handleTermsScroll = () => {
    if (termsContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setHasScrolledToBottom(isAtBottom);
    }
  };

  // Check if content needs scrolling (content height > container height)
  const checkIfContentNeedsScroll = () => {
    if (termsContentRef.current) {
      const { scrollHeight, clientHeight } = termsContentRef.current;
      const needsScroll = scrollHeight > clientHeight;
      
      console.log('🔍 [PreCheckoutModal] Check scroll debug:', {
        scrollHeight,
        clientHeight,
        needsScroll,
        hasScrolledToBottom
      });
      
      // If content doesn't need scroll, automatically set as scrolled to bottom
      if (!needsScroll) {
        console.log('🔍 [PreCheckoutModal] Conteúdo não precisa de scroll, marcando como lido');
        setHasScrolledToBottom(true);
      }
      
      return needsScroll;
    }
    return false;
  };

  // Handle terms modal open
  const handleTermsClick = async () => {
    
    // Always load terms fresh to avoid stale state
    const hasTerms = await loadActiveTerms();
    
    // CORREÇÃO: Se não há termos ativos, criar um termo padrão para garantir consistência
    if (!hasTerms) {
      const defaultTerm = {
        id: 'default-checkout-terms',
        title: 'Checkout Terms and Conditions',
        content: 'By proceeding with this payment, you agree to our checkout terms and conditions.',
        term_type: 'checkout_terms',
        is_active: true,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setActiveTerm(defaultTerm);
    }
    
    // CORREÇÃO: Abrir o modal imediatamente - o useEffect vai garantir que o activeTerm seja carregado
    setShowTermsModal(true);
    setHasScrolledToBottom(false);
  };

  // Handle terms acceptance
  const handleTermsAccept = async () => {
    if (hasScrolledToBottom) {
      try {
        // Record acceptance of checkout terms
        if (activeTerm) {
          // Verificar se o usuário tem affiliate através do seller_referral_code
          const affiliateAdminId = await checkIfUserHasAffiliate();
          
          if (affiliateAdminId) {
            console.log('🔍 [PreCheckoutModal] Usuário tem affiliate através de seller, usando registro específico. Affiliate Admin ID:', affiliateAdminId);
            await recordAffiliateTermAcceptance(activeTerm.id, 'checkout_terms', affiliateAdminId);
          } else {
            console.log('🔍 [PreCheckoutModal] Usuário sem affiliate, usando registro normal');
            // ✅ NOTA: A foto será salva depois quando o usuário fizer upload e clicar em "Prosseguir"
            // Por isso não passamos identityPhotoPath aqui ainda
            await recordTermAcceptance(activeTerm.id, 'checkout_terms');
          }
        }
        
        console.log('🔍 [PreCheckoutModal] Termos aceitos e registrados');
        
        // Log da ação
        if (logAction && userProfile?.id && user?.id && activeTerm) {
          try {
            await logAction(
              'checkout_terms_accepted',
              `Checkout terms and conditions accepted by student`,
              user.id,
              'student',
              {
                student_id: userProfile.id,
                term_id: activeTerm.id,
                term_type: 'checkout_terms',
                term_title: activeTerm.title,
                accepted_at: new Date().toISOString(),
                fee_type: feeType
              }
            );
            console.log('✅ [PreCheckoutModal] Aceitação de termos logada com sucesso');
          } catch (logError) {
            console.error('⚠️ [PreCheckoutModal] Erro ao logar aceitação de termos (não crítico):', logError);
          }
        }
        
        setTermsAccepted(true);
        
        // Avançar para etapa de upload de foto
        setShowPhotoUploadStep(true);
        
        // Para mobile: fechar a visualização de termos no drawer
        if (isMobile) {
          setShowTermsInDrawer(false);
        } else {
          // Para desktop: fechar o modal
          setShowTermsModal(false);
        }
      } catch (error) {
        console.error('🔍 [PreCheckoutModal] Erro ao registrar aceitação dos termos:', error);
        // Still allow user to proceed even if recording fails
        setTermsAccepted(true);
        
        // Avançar para etapa de upload de foto mesmo se houver erro
        setShowPhotoUploadStep(true);
        
        // Para mobile: fechar a visualização de termos no drawer
        if (isMobile) {
          setShowTermsInDrawer(false);
        } else {
          // Para desktop: fechar o modal
          setShowTermsModal(false);
        }
      }
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 [PreCheckoutModal] Checkbox alterado:', e.target.checked);
    setUserClickedCheckbox(true); // Mark that user interacted with checkbox
    console.log('🔍 [PreCheckoutModal] userClickedCheckbox definido como true');
    
    if (e.target.checked) {
      // When checkbox is checked, load terms and show them
      console.log('🔍 [PreCheckoutModal] Checkbox marcado, carregando termos');
      
      if (isMobile) {
        // Para mobile: mostrar termos dentro do drawer
        console.log('🔍 [PreCheckoutModal] Mobile: mostrando termos no drawer');
        setShowTermsInDrawer(true);
        const termsLoaded = await loadActiveTerms(); // Carregar termos
        console.log('🔍 [PreCheckoutModal] Mobile: termos carregados:', termsLoaded);
      } else {
        // Para desktop: abrir modal como antes
        console.log('🔍 [PreCheckoutModal] Desktop: abrindo modal de termos');
        handleTermsClick();
      }
    } else {
      // When unchecked, reset terms acceptance
      console.log('🔍 [PreCheckoutModal] Checkbox desmarcado, resetando estados');
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
      setShowTermsModal(false); // Ensure modal is closed
      setShowTermsInDrawer(false); // Ensure drawer terms view is closed
    }
  };

  // Função para validar código preenchido automaticamente (sem dependências circulares)
  const validateDiscountCodeForPrefill = async (code: string) => {
    if (!code.trim()) {
      console.log('🔍 [PreCheckoutModal] Código vazio, não validando');
      return;
    }

    console.log('🔍 [PreCheckoutModal] Validando código preenchido automaticamente:', code);
    console.log('🔍 [PreCheckoutModal] Estados atuais antes da validação:', {
      hasUsedReferralCode,
      user: user?.id,
      code
    });
    setIsValidating(true);

    try {
      // Check if code exists and is active
      console.log('🔍 [PreCheckoutModal] Buscando código no banco:', code.trim().toUpperCase());
      const { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes')
        .select('user_id, code, is_active')
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      console.log('🔍 [PreCheckoutModal] Resultado da busca:', {
        affiliateCodeData,
        affiliateError,
        hasData: !!affiliateCodeData
      });

      if (affiliateError || !affiliateCodeData) {
        console.log('🔍 [PreCheckoutModal] ❌ Código preenchido é inválido ou inativo');
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.invalidCode')
        });
        return;
      }

      // Check if not self-referral
      if (affiliateCodeData.user_id === user?.id) {
        console.log('🔍 [PreCheckoutModal] ❌ Auto-referência detectada no preenchimento');
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.selfReferral'),
          isSelfReferral: true
        });
        return;
      }

      // Check if user already used any code
      // ✅ CORREÇÃO: Se já tem activeDiscount, permitir usar o código
      if (hasUsedReferralCode && !activeDiscount?.has_discount) {
        console.log('🔍 [PreCheckoutModal] ❌ Usuário já usou código anteriormente');
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.alreadyUsedCode')
        });
        return;
      }

      // Valid code - AGORA SALVAR NO BANCO IMEDIATAMENTE
      console.log('🔍 [PreCheckoutModal] ✅ Código preenchido é válido');
      
      // Salvar no banco via edge function
      try {
        console.log('🔍 [PreCheckoutModal] Salvando código preenchido no banco via edge function...');
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          throw new Error('Usuário não autenticado');
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-referral-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ affiliate_code: code.trim().toUpperCase() }),
        });

        const result = await response.json();
        console.log('🔍 [PreCheckoutModal] Resultado da aplicação do código preenchido:', result);
        
        if (!result.success) {
          console.error('🔍 [PreCheckoutModal] ❌ Erro ao aplicar código preenchido:', result.error);
          setValidationResult({
            isValid: false,
            message: result.error || 'Erro ao aplicar código'
          });
          return;
        }
        
        console.log('🔍 [PreCheckoutModal] ✅ Código preenchido salvo no banco com sucesso');
      } catch (error) {
        console.error('🔍 [PreCheckoutModal] ❌ Erro ao salvar código preenchido:', error);
        setValidationResult({
          isValid: false,
          message: 'Erro ao salvar código no banco'
        });
        return;
      }
      
      setValidationResult({
        isValid: true,
        message: t('preCheckoutModal.validCode'),
        discountAmount: 50
      });
      setCodeApplied(true);
      console.log('🔍 [PreCheckoutModal] Código aplicado com sucesso, codeApplied:', true);

    } catch (error) {
      console.error('🔍 [PreCheckoutModal] Erro ao validar código preenchido:', error);
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.errorValidating')
      });
    } finally {
      setIsValidating(false);
    }
  };


  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.pleaseEnterCode')
      });
      return;
    }

    // PRIMEIRO: Verificar se o usuário tem seller_referral_code
    if (hasSellerReferralCode) {
      console.log('🔍 [PreCheckoutModal] ❌ Usuário tem seller_referral_code, não pode usar código de desconto.');
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.sellerReferralCodeBlocked')
      });
      return;
    }

    console.log('🔍 [PreCheckoutModal] Validando código de desconto:', discountCode);
    setIsValidating(true);
    setValidationResult(null);

    try {
      // Check if code exists and is active
      const { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes')
        .select('user_id, code, is_active')
        .eq('code', discountCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (affiliateError || !affiliateCodeData) {
        console.log('🔍 [PreCheckoutModal] ❌ Código inválido ou inativo');
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.invalidCode')
        });
        return;
      }

      // Check if not self-referral
      if (affiliateCodeData.user_id === user?.id) {
        console.log('🔍 [PreCheckoutModal] ❌ Auto-referência detectada');
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.selfReferral'),
          isSelfReferral: true
        });
        return;
      }

      // Check if user already used any code
      // ✅ CORREÇÃO: Se já tem activeDiscount, permitir usar o código
      if (hasUsedReferralCode && !activeDiscount?.has_discount) {
        console.log('🔍 [PreCheckoutModal] ❌ Usuário já usou código anteriormente');
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.alreadyUsedCode')
        });
        return;
      }

      // Valid code - AGORA SALVAR NO BANCO IMEDIATAMENTE
      console.log('🔍 [PreCheckoutModal] ✅ Código válido, aplicando desconto...');
      
      // Salvar no banco via edge function
      try {
        console.log('🔍 [PreCheckoutModal] Salvando código no banco via edge function...');
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          throw new Error('Usuário não autenticado');
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-referral-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ affiliate_code: discountCode.trim().toUpperCase() }),
        });

        const result = await response.json();
        console.log('🔍 [PreCheckoutModal] Resultado da aplicação do código:', result);
        
        if (!result.success) {
          console.error('🔍 [PreCheckoutModal] ❌ Erro ao aplicar código:', result.error);
          setValidationResult({
            isValid: false,
            message: result.error || 'Erro ao aplicar código'
          });
          return;
        }
        
        console.log('🔍 [PreCheckoutModal] ✅ Código salvo no banco com sucesso');
      } catch (error) {
        console.error('🔍 [PreCheckoutModal] ❌ Erro ao salvar código:', error);
        setValidationResult({
          isValid: false,
          message: 'Erro ao salvar código no banco'
        });
        return;
      }
      
      setValidationResult({
        isValid: true,
        message: t('preCheckoutModal.validCode'),
        discountAmount: 50
      });
      setCodeApplied(true);

    } catch (error) {
      console.error('🔍 [PreCheckoutModal] Erro ao validar código:', error);
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.errorValidating')
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleProceed = async () => {
    // Check if terms are accepted
    if (!termsAccepted) {
      alert(t('preCheckoutModal.mustAcceptTerms'));
      return;
    }

    // Check if photo was uploaded
    if (!identityPhotoPath) {
      alert('Por favor, faça upload da sua foto com documento antes de prosseguir.');
      return;
    }

    // Salvar foto de identidade no registro de aceitação de termos
    if (activeTerm && identityPhotoPath) {
      try {
        console.log('🔍 [PreCheckoutModal] Salvando foto de identidade no registro de aceitação...', {
          userId: user?.id,
          termId: activeTerm.id,
          photoPath: identityPhotoPath,
          photoName: identityPhotoName
        });
        
        // Buscar o registro de aceitação mais recente
        const { data: termAcceptance, error: termError } = await supabase
          .from('comprehensive_term_acceptance')
          .select('id, accepted_at')
          .eq('user_id', user?.id)
          .eq('term_id', activeTerm.id)
          .eq('term_type', 'checkout_terms')
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // ✅ Usar maybeSingle para não falhar se não houver registro

        if (termError) {
          console.error('🔍 [PreCheckoutModal] Erro ao buscar registro de aceitação:', termError);
        } else if (termAcceptance) {
          console.log('🔍 [PreCheckoutModal] Registro encontrado:', termAcceptance.id);
          // Atualizar com a foto e definir status como 'pending'
          const { data: updateData, error: updateError } = await supabase
            .from('comprehensive_term_acceptance')
            .update({
              identity_photo_path: identityPhotoPath,
              identity_photo_name: identityPhotoName,
              identity_photo_status: 'pending' // ✅ Status inicial sempre 'pending' quando foto é enviada
            })
            .eq('id', termAcceptance.id)
            .select();

          if (updateError) {
            console.error('🔍 [PreCheckoutModal] ❌ Erro ao salvar foto:', updateError);
            console.error('🔍 [PreCheckoutModal] Detalhes do erro:', {
              code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint
            });
            // ✅ Tentar novamente com RPC se update direto falhar (após migration ser aplicada)
            try {
              const { data: rpcData, error: rpcError } = await supabase.rpc('update_term_acceptance_photo', {
                p_acceptance_id: termAcceptance.id,
                p_photo_path: identityPhotoPath,
                p_photo_name: identityPhotoName
              });
              if (rpcError) {
                console.error('🔍 [PreCheckoutModal] ❌ Erro ao salvar foto via RPC:', rpcError);
              } else if (rpcData) {
                console.log('🔍 [PreCheckoutModal] ✅ Foto salva com sucesso via RPC');
              }
            } catch (rpcErr) {
              console.error('🔍 [PreCheckoutModal] ❌ Erro ao tentar salvar via RPC:', rpcErr);
            }
          } else {
            console.log('🔍 [PreCheckoutModal] ✅ Foto salva com sucesso no registro de aceitação:', updateData);
          }
        } else {
          console.warn('🔍 [PreCheckoutModal] Nenhum registro de aceitação encontrado para atualizar');
        }
      } catch (error) {
        console.error('🔍 [PreCheckoutModal] Erro ao salvar foto de identidade:', error);
        // Não bloquear o fluxo se houver erro ao salvar foto
      }
    }

    console.log('🔍 [PreCheckoutModal] handleProceed chamado');
    console.log('🔍 [PreCheckoutModal] validationResult:', validationResult);
    console.log('🔍 [PreCheckoutModal] discountCode:', discountCode);
    console.log('🔍 [PreCheckoutModal] codeApplied:', codeApplied);
    console.log('🔍 [PreCheckoutModal] hasAffiliateCode:', hasAffiliateCode);
    console.log('🔍 [PreCheckoutModal] userAffiliateCode:', userProfile?.affiliate_code);
    console.log('🔍 [PreCheckoutModal] hasSellerReferralCode:', hasSellerReferralCode);
    console.log('🔍 [PreCheckoutModal] activeDiscount:', activeDiscount);
    console.log('🔍 [PreCheckoutModal] promotionalCouponApplied:', promotionalCouponApplied);
    
    // ✅ PRIORIDADE 1: Cupom promocional aplicado (BLACK, etc)
    if (promotionalCouponApplied) {
      console.log('🔍 [PreCheckoutModal] ✅ Cupom promocional aplicado - prosseguindo com desconto');
      const finalAmount = promotionalCouponApplied.finalAmount;
      const couponCode = promotionalCouponApplied.code || (window as any).__checkout_promotional_coupon;
      // Salvar cupom promocional no window para uso no checkout
      (window as any).__checkout_promotional_coupon = couponCode;
      (window as any).__checkout_final_amount = finalAmount;
      onProceedToCheckout(finalAmount, couponCode);
      onClose();
      return;
    }
    
    // ✅ PRIORIDADE 2: Para usuários com seller_referral_code, não precisa de código de desconto
    if (hasSellerReferralCode) {
      console.log('🔍 [PreCheckoutModal] ✅ Usuário com seller_referral_code - prosseguindo sem validação de código');
      const finalAmount = computedBasePrice; // calculado localmente
      onProceedToCheckout(finalAmount);
      onClose();
      return;
    }
    
    // ✅ PRIORIDADE 3: Se usuário tem activeDiscount (código já aplicado no registro)
    if (activeDiscount?.has_discount) {
      console.log('🔍 [PreCheckoutModal] ✅ Usuário com desconto ativo - calculando valor com desconto');
      // Calcular valor com desconto para exibição no PaymentMethodSelector
      const discountAmount = activeDiscount.discount_amount || 0;
      const finalAmountWithDiscount = Math.max(computedBasePrice - discountAmount, 0);
      // Salvar valor com desconto no window para uso no PaymentMethodSelector
      (window as any).__checkout_final_amount = finalAmountWithDiscount;
      // ✅ Flag para indicar que o desconto já foi aplicado (para evitar duplicação na edge function)
      (window as any).__checkout_discount_applied = true;
      console.log('🔍 [PreCheckoutModal] Valor com desconto salvo:', finalAmountWithDiscount, 'Desconto:', discountAmount);
      console.log('🔍 [PreCheckoutModal] Flag discount_already_applied definido como true');
      // ✅ Passar valor com desconto para handlePreCheckoutSuccess usar no PaymentMethodSelector
      // ✅ IMPORTANTE: Edge function NÃO deve aplicar desconto novamente, pois já está aplicado no valor
      onProceedToCheckout(finalAmountWithDiscount);
      onClose();
      return;
    }
    
    // ✅ CORREÇÃO: Se não tem seller_referral_code, o campo está sempre visível
    // Se o usuário preencheu um código, precisa validar antes de prosseguir
    // Se não preencheu ou código é inválido, pode prosseguir sem desconto
    if (!hasSellerReferralCode && discountCode.trim()) {
      // Se preencheu código, precisa estar válido para prosseguir
      if (validationResult?.isValid && codeApplied) {
        console.log('🔍 [PreCheckoutModal] ✅ Aplicando código novo e continuando');
        const discount = validationResult?.discountAmount || 0;
        const finalAmount = Math.max(productPrice - discount, 0);
        onProceedToCheckout(finalAmount, discountCode.trim().toUpperCase());
        onClose();
      } else if (validationResult && !validationResult.isValid) {
        // Se código foi validado mas é inválido, não pode prosseguir
        console.log('🔍 [PreCheckoutModal] ❌ Código inválido - não pode prosseguir');
        alert(t('preCheckoutModal.mustEnterValidCode'));
      } else {
        // Se preencheu mas não validou ainda, não pode prosseguir
        console.log('🔍 [PreCheckoutModal] ❌ Código preenchido mas não validado - não pode prosseguir');
        alert(t('preCheckoutModal.mustEnterValidCode'));
      }
    } else {
      // ✅ Usuário não preencheu código ou tem seller_referral_code - prosseguir sem desconto
      console.log('🔍 [PreCheckoutModal] ✅ Prosseguindo sem código');
      const finalAmount = computedBasePrice;
      onProceedToCheckout(finalAmount);
      onClose();
    }
  };


  // Don't render if not open
  if (!isOpen) {
    console.log('🔍 [PreCheckoutModal] Modal não está aberto, não renderizando');
    return null;
  }

  // Render drawer for mobile, dialog for desktop
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[95vh] bg-white border-t border-gray-200 rounded-t-2xl">
            <DrawerHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <DrawerTitle className="text-xl font-bold">
                  {showTermsInDrawer ? t('preCheckoutModal.termsAndConditions.title') : t('preCheckoutModal.securePayment')}
                </DrawerTitle>
              </div>
            </DrawerHeader>
            
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {showTermsInDrawer ? (
                <MobileTermsView
                  activeTerm={activeTerm}
                  loadingTerms={loadingTerms}
                  hasScrolledToBottom={hasScrolledToBottom}
                  termsContentRef={termsContentRef}
                  handleTermsScroll={handleTermsScroll}
                  checkIfContentNeedsScroll={checkIfContentNeedsScroll}
                  handleTermsAccept={handleTermsAccept}
                  setShowTermsInDrawer={setShowTermsInDrawer}
                  t={t}
                />
              ) : showPhotoUploadStep ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      Foto de Identidade
                    </h3>
                    <p className="text-sm text-gray-600">
                      Faça upload de uma foto sua segurando seu documento de identidade
                    </p>
                  </div>
                  
                  <IdentityPhotoUpload
                    onUploadSuccess={async (filePath, fileName) => {
                      setIdentityPhotoPath(filePath);
                      setIdentityPhotoName(fileName);
                      
                      // Log da ação
                      if (logAction && userProfile?.id && user?.id) {
                        try {
                          await logAction(
                            'identity_photo_upload',
                            `Identity photo uploaded by student during checkout`,
                            user.id,
                            'student',
                            {
                              student_id: userProfile.id,
                              file_path: filePath,
                              file_name: fileName,
                              uploaded_at: new Date().toISOString(),
                              fee_type: feeType
                            }
                          );
                          console.log('✅ [PreCheckoutModal] Upload de foto logado com sucesso');
                        } catch (logError) {
                          console.error('⚠️ [PreCheckoutModal] Erro ao logar upload de foto (não crítico):', logError);
                        }
                      }
                    }}
                    onUploadError={(error) => {
                      console.error('Erro ao fazer upload:', error);
                    }}
                    onRemove={() => {
                      setIdentityPhotoPath(null);
                      setIdentityPhotoName(null);
                    }}
                    initialPhotoPath={identityPhotoPath || undefined}
                  />
                  
                  <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-2xl">
                    <button
                      onClick={handleProceed}
                      disabled={isLoading || !identityPhotoPath}
                      className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base ${
                        identityPhotoPath
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{t('preCheckoutModal.processingPayment')}</span>
                        </div>
                      ) : (
                        t('preCheckoutModal.goToPayment')
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <ModalContent
                  productName={productName}
                  computedBasePrice={promotionalCouponApplied?.finalAmount || computedBasePrice}
                  hasUsedReferralCode={hasUsedReferralCode}
                  hasSellerReferralCode={Boolean(hasSellerReferralCode)}
                  activeDiscount={activeDiscount}
                  hasReferralCode={hasReferralCode}
                  showCodeStep={showCodeStep}
                  setHasReferralCode={setHasReferralCode}
                  setDiscountCode={setDiscountCode}
                  setValidationResult={setValidationResult}
                  setCodeApplied={setCodeApplied}
                  setShowCodeStep={setShowCodeStep}
                  discountCode={discountCode}
                  hasAffiliateCode={!!hasAffiliateCode}
                  validateDiscountCode={validateDiscountCode}
                  isValidating={isValidating}
                  validationResult={validationResult}
                  termsAccepted={termsAccepted}
                  handleCheckboxChange={handleCheckboxChange}
                  handleProceed={handleProceed}
                  isLoading={isLoading}
                  t={t}
                  promotionalCouponApplied={promotionalCouponApplied}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop dialog
  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="relative z-[10010]"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10009]" aria-hidden="true" />
        
        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[10009]">
          <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0 max-h-[95dvh] flex flex-col">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6 flex-shrink-0">
              <button
                onClick={onClose}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                title={t('preCheckoutModal.closeModal')}
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-2 sm:mb-4 pr-12">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-bold">
                    {t('preCheckoutModal.securePayment')}
                  </Dialog.Title>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {showPhotoUploadStep ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      Foto de Identidade
                    </h3>
                    <p className="text-sm text-gray-600">
                      Faça upload de uma foto sua segurando seu documento de identidade
                    </p>
                  </div>
                  
                  <IdentityPhotoUpload
                    onUploadSuccess={async (filePath, fileName) => {
                      setIdentityPhotoPath(filePath);
                      setIdentityPhotoName(fileName);
                      
                      // Log da ação
                      if (logAction && userProfile?.id && user?.id) {
                        try {
                          await logAction(
                            'identity_photo_upload',
                            `Identity photo uploaded by student during checkout`,
                            user.id,
                            'student',
                            {
                              student_id: userProfile.id,
                              file_path: filePath,
                              file_name: fileName,
                              uploaded_at: new Date().toISOString(),
                              fee_type: feeType
                            }
                          );
                          console.log('✅ [PreCheckoutModal] Upload de foto logado com sucesso');
                        } catch (logError) {
                          console.error('⚠️ [PreCheckoutModal] Erro ao logar upload de foto (não crítico):', logError);
                        }
                      }
                    }}
                    onUploadError={(error) => {
                      console.error('Erro ao fazer upload:', error);
                    }}
                    onRemove={() => {
                      setIdentityPhotoPath(null);
                      setIdentityPhotoName(null);
                    }}
                    initialPhotoPath={identityPhotoPath || undefined}
                  />
                  
                  <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-2xl">
                    <button
                      onClick={handleProceed}
                      disabled={isLoading || !identityPhotoPath}
                      className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base ${
                        identityPhotoPath
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{t('preCheckoutModal.processingPayment')}</span>
                        </div>
                      ) : (
                        t('preCheckoutModal.goToPayment')
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <ModalContent
                  productName={productName}
                  computedBasePrice={promotionalCouponApplied?.finalAmount || computedBasePrice}
                  hasUsedReferralCode={hasUsedReferralCode}
                  hasSellerReferralCode={!!hasSellerReferralCode}
                  activeDiscount={activeDiscount}
                  hasReferralCode={hasReferralCode}
                  showCodeStep={showCodeStep}
                  setHasReferralCode={setHasReferralCode}
                  setDiscountCode={setDiscountCode}
                  setValidationResult={setValidationResult}
                  setCodeApplied={setCodeApplied}
                  setShowCodeStep={setShowCodeStep}
                  discountCode={discountCode}
                  hasAffiliateCode={!!hasAffiliateCode}
                  validateDiscountCode={validateDiscountCode}
                  isValidating={isValidating}
                  validationResult={validationResult}
                  termsAccepted={termsAccepted}
                  handleCheckboxChange={handleCheckboxChange}
                  handleProceed={handleProceed}
                  isLoading={isLoading}
                  t={t}
                  promotionalCouponApplied={promotionalCouponApplied}
                />
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Terms and Conditions Modal for desktop */}
      {showTermsModal && userClickedCheckbox && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95dvh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-end p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                  title={t('preCheckoutModal.closeTerms')}
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500" />
                </button>
              </div>

              {/* Modal Content */}
              {activeTerm ? (
                <>
                  <div 
                    ref={termsContentRef}
                    onScroll={handleTermsScroll}
                    className="flex-1 overflow-y-auto p-4 sm:p-6"
                  >
                    <div 
                      className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-strong:text-gray-900"
                      dangerouslySetInnerHTML={{ __html: activeTerm.content }}
                    />
                    
                    {/* Scroll indicator */}
                    {!hasScrolledToBottom && checkIfContentNeedsScroll() && (
                      <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg mt-6">
                        <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                        <span className="text-amber-800 font-medium">
                          {t('preCheckoutModal.scrollToBottomFirst')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between p-4 sm:p-6 border-t border-slate-200 flex-shrink-0">
                    <button
                      onClick={() => setShowTermsModal(false)}
                      className="px-4 sm:px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors text-sm sm:text-base"
                    >
                      {t('preCheckoutModal.cancel')}
                    </button>
                    <button
                      onClick={handleTermsAccept}
                      disabled={!hasScrolledToBottom}
                      className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base ${
                        hasScrolledToBottom
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {hasScrolledToBottom 
                        ? t('preCheckoutModal.acceptTerms') 
                        : (checkIfContentNeedsScroll() 
                            ? t('preCheckoutModal.scrollToBottomFirst') 
                            : t('preCheckoutModal.readingTerms')
                          )
                      }
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">{t('preCheckoutModal.loading')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>,
        document.body
      )}
    </>
  );
};
