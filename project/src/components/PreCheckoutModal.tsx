import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Dialog } from '@headlessui/react';
import { X, AlertCircle, CheckCircle, Shield, Lock, Scroll } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useDynamicFees } from '../hooks/useDynamicFees';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import { useAffiliateTermsAcceptance } from '../hooks/useAffiliateTermsAcceptance';
import { useReferralCode } from '../hooks/useReferralCode';
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

// Shared modal content component
const ModalContent: React.FC<{
  productName: string;
  computedBasePrice: number;
  hasUsedReferralCode: boolean;
  hasSellerReferralCode: boolean;
  activeDiscount: any;
  hasReferralCode: boolean;
  showCodeStep: boolean;
  setHasReferralCode: (value: boolean) => void;
  setDiscountCode: (value: string) => void;
  setValidationResult: (value: any) => void;
  setCodeApplied: (value: boolean) => void;
  setShowCodeStep: (value: boolean) => void;
  discountCode: string;
  hasAffiliateCode: boolean;
  validateDiscountCode: () => void;
  isValidating: boolean;
  validationResult: any;
  termsAccepted: boolean;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProceed: () => void;
  isLoading: boolean;
  t: any;
}> = ({
  productName,
  hasUsedReferralCode,
  hasSellerReferralCode,
  activeDiscount,
  hasReferralCode,
  showCodeStep,
  setHasReferralCode,
  setDiscountCode,
  setValidationResult,
  setCodeApplied,
  setShowCodeStep,
  discountCode,
  hasAffiliateCode,
  validateDiscountCode,
  isValidating,
  validationResult,
  termsAccepted,
  handleCheckboxChange,
  handleProceed,
  isLoading,
  t
}) => (
  <div className="space-y-4 sm:space-y-6 bg-white min-h-full">
    {/* Product Info */}
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border-0">
      <div className="text-center">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">{productName}</h3>
        <div className="inline-flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full">
          <Lock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">{t('preCheckoutModal.securePaymentGateway')}</span>
        </div>
      </div>
    </div>

    {/* Discount Code Section */}
    {(!hasUsedReferralCode && !hasSellerReferralCode) || activeDiscount?.has_discount ? (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('preCheckoutModal.referralCode')}
          </h3>
        </div>

        {activeDiscount?.has_discount ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="text-green-800 font-semibold">Code already used</p>
                <p className="text-green-600 text-sm">Your discount has already been applied previously</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Checkbox para perguntar se tem código */}
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <input
                id="hasReferralCode"
                name="hasReferralCode"
                type="checkbox"
                checked={hasReferralCode}
                onChange={(e) => {
                  setHasReferralCode(e.target.checked);
                  if (!e.target.checked) {
                    setDiscountCode('');
                    setValidationResult(null);
                    setCodeApplied(false);
                    setShowCodeStep(false);
                  } else {
                    setShowCodeStep(true);
                  }
                }}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
              />
              <label htmlFor="hasReferralCode" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                {t('preCheckoutModal.haveReferralCode')}
              </label>
            </div>
            
            {/* Campo de input - só aparece se checkbox marcado */}
            {hasReferralCode && showCodeStep && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder={t('preCheckoutModal.placeholder')}
                  readOnly={!!hasAffiliateCode}
                  className={`w-full px-4 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center font-mono text-base sm:text-lg tracking-wider ${
                    hasAffiliateCode 
                      ? 'border-green-300 bg-green-50 cursor-not-allowed' 
                      : 'border-gray-300'
                  }`}
                  style={{ fontSize: '16px' }}
                  maxLength={8}
                />
                {!hasAffiliateCode && (
                  <button
                    onClick={validateDiscountCode}
                    disabled={isValidating || !discountCode.trim()}
                    className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {isValidating ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{t('preCheckoutModal.validating')}</span>
                      </div>
                    ) : (
                      t('preCheckoutModal.validate')
                    )}
                  </button>
                )}
                
                {/* Validation Result */}
                {validationResult && (
                  <div className={`p-4 rounded-xl border-2 ${
                    validationResult.isValid 
                      ? 'bg-green-50 border-green-300 text-green-800' 
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {validationResult.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium text-sm">{validationResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    ) : !hasSellerReferralCode && (
      <div className="bg-green-50 rounded-xl p-6 text-center border-0">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <span className="text-xl font-bold text-green-800">
            {t('preCheckoutModal.codeAlreadyUsed')}
          </span>
        </div>
        <p className="text-green-700 text-base">
          {t('preCheckoutModal.discountAlreadyApplied')}
        </p>
      </div>
    )}

    {/* Terms acceptance */}
    <div className="flex items-start space-x-3 p-3 sm:p-4 bg-slate-100 rounded-2xl">
      <input
        id="termsAccepted"
        name="termsAccepted"
        type="checkbox"
        checked={termsAccepted}
        onChange={handleCheckboxChange}
        className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
      />
      <label htmlFor="termsAccepted" className="text-xs sm:text-sm text-slate-700 leading-relaxed cursor-pointer">
        {t('preCheckoutModal.acceptContractTerms')}
      </label>
    </div>

    {/* Footer */}
    <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-2xl">
      <button
        onClick={handleProceed}
        disabled={isLoading || !termsAccepted || (hasReferralCode && !(validationResult?.isValid) && !activeDiscount?.has_discount)}
        className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base ${
          validationResult?.isValid
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
        } ${isLoading || !termsAccepted || (hasReferralCode && !(validationResult?.isValid) && !activeDiscount?.has_discount) ? 'opacity-75 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>{t('preCheckoutModal.processingPayment')}</span>
          </div>
        ) : (hasReferralCode || validationResult?.isValid) ? (
          t('preCheckoutModal.applyCodeAndContinue')
        ) : (
          t('preCheckoutModal.goToPayment')
        )}
      </button>
    </div>
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
  console.log('🔍 [PreCheckoutModal] Componente renderizado, isOpen:', isOpen);
  
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const { selectionProcessFee, scholarshipFee } = useDynamicFees();
  const { recordTermAcceptance } = useTermsAcceptance();
  const { recordAffiliateTermAcceptance, checkIfUserHasAffiliate } = useAffiliateTermsAcceptance();
  const { activeDiscount } = useReferralCode();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

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
      case 'application_fee':
        return Number(getFeeAmount('application_fee'));
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
  
  // Verificar se o usuário tem seller_referral_code
  const hasSellerReferralCode = userProfile?.seller_referral_code && userProfile.seller_referral_code.trim() !== '';
  
  // Verificar se o usuário já tem affiliate_code (friend code) do registro
  const hasAffiliateCode = userProfile?.affiliate_code && userProfile.affiliate_code.trim() !== '';
  
  console.log('🔍 [PreCheckoutModal] Estados atuais:', {
    termsAccepted,
    showTermsModal,
    hasScrolledToBottom,
    activeTerm: activeTerm ? 'loaded' : 'null',
    loadingTerms,
    hasSellerReferralCode,
    hasAffiliateCode,
    userAffiliateCode: userProfile?.affiliate_code,
    discountCode,
    validationResult,
    codeApplied
  });

  // Reset state when modal opens/closes and control iOS zoom
  useEffect(() => {
    console.log('🔍 [PreCheckoutModal] useEffect triggered, isOpen:', isOpen);
    
    if (isOpen) {
      // Reset all state when modal opens
      console.log('🔍 [PreCheckoutModal] Modal abrindo, resetando estados');
      setDiscountCode('');
      setValidationResult(null);
      setIsValidating(false);
      setCodeApplied(false);
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
      setShowTermsModal(false); // Reset terms modal state
      setActiveTerm(null); // Reset active term
      setUserClickedCheckbox(false); // Reset user interaction flag
      setHasReferralCode(false); // Reset referral code checkbox
      setShowCodeStep(false); // Reset code step
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
      console.log('🔍 [PreCheckoutModal] Modal fechando, limpando estados');
      setDiscountCode('');
      setValidationResult(null);
      setIsValidating(false);
      setCodeApplied(false);
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
      setShowTermsModal(false);
      setActiveTerm(null);
      setUserClickedCheckbox(false);
      
      // Restore original viewport settings
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
      
      // Show floating elements again when modal closes
      document.body.classList.remove('modal-open');
    }
  }, [isOpen]);

  // Preencher automaticamente o campo de referral code se o usuário já tem affiliate_code
  useEffect(() => {
    console.log('🔍 [PreCheckoutModal] useEffect preenchimento automático:', {
      isOpen,
      hasAffiliateCode,
      userAffiliateCode: userProfile?.affiliate_code
    });
    
    if (isOpen && hasAffiliateCode && userProfile?.affiliate_code) {
      console.log('🔍 [PreCheckoutModal] Preenchendo campo com affiliate_code do usuário:', userProfile.affiliate_code);
      setDiscountCode(userProfile.affiliate_code);
      setHasReferralCode(true); // Marcar checkbox automaticamente
      setShowCodeStep(true); // Mostrar campo automaticamente
      // Automaticamente validar o código preenchido
      setTimeout(() => {
        if (userProfile.affiliate_code) {
          console.log('🔍 [PreCheckoutModal] Chamando validateDiscountCodeForPrefill...');
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
    if (activeTerm && showTermsModal) {
      console.log('🔍 [PreCheckoutModal] activeTerm carregado, verificando scroll');
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        checkIfContentNeedsScroll();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeTerm, showTermsModal]);

  // Load active terms from database
  const loadActiveTerms = async () => {
    try {
      setLoadingTerms(true);
      console.log('🔍 [PreCheckoutModal] Iniciando busca de termos no banco...');
      
      const { data, error } = await supabase
        .from('application_terms')
        .select('*')
        .eq('term_type', 'checkout_terms')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('🔍 [PreCheckoutModal] Resultado da query:', { data, error });

      if (error) {
        console.error('❌ [PreCheckoutModal] Erro na query:', error);
        return false;
      }

      if (data && data.length > 0) {
        console.log('✅ [PreCheckoutModal] Dados encontrados no banco:', data[0]);
        console.log('🔍 [PreCheckoutModal] Content length:', data[0].content?.length);
        console.log('🔍 [PreCheckoutModal] Content preview:', data[0].content?.substring(0, 100));
        console.log('🔍 [PreCheckoutModal] Title:', data[0].title);
        setActiveTerm(data[0]);
        console.log('✅ [PreCheckoutModal] activeTerm definido:', data[0]);
        return true; // Indicate success
      }
      
      console.log('⚠️ [PreCheckoutModal] Nenhum termo ativo encontrado');
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
        console.log('🔍 [PreCheckoutModal] Usuário já tem desconto ativo, permitindo pagamento');
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
      
      // If content doesn't need scroll, automatically set as scrolled to bottom
      if (!needsScroll) {
        setHasScrolledToBottom(true);
      }
      
      return needsScroll;
    }
    return false;
  };

  // Handle terms modal open
  const handleTermsClick = async () => {
    console.log('🔍 [PreCheckoutModal] handleTermsClick chamado');
    console.log('🔍 [PreCheckoutModal] activeTerm atual:', activeTerm);
    console.log('🔍 [PreCheckoutModal] showTermsModal atual:', showTermsModal);
    
    // Always load terms fresh to avoid stale state
    console.log('🔍 [PreCheckoutModal] Carregando termos...');
    const hasTerms = await loadActiveTerms();
    console.log('🔍 [PreCheckoutModal] Termos carregados:', hasTerms);
    
    // CORREÇÃO: Se não há termos ativos, criar um termo padrão para garantir consistência
    if (!hasTerms) {
      console.log('🔍 [PreCheckoutModal] Nenhum termo ativo encontrado, criando termo padrão');
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
      console.log('🔍 [PreCheckoutModal] Termo padrão criado');
    }
    
    // CORREÇÃO: Abrir o modal imediatamente - o useEffect vai garantir que o activeTerm seja carregado
    console.log('🔍 [PreCheckoutModal] Abrindo modal de termos');
    setShowTermsModal(true);
    setHasScrolledToBottom(false);
  };

  // Handle terms acceptance
  const handleTermsAccept = async () => {
    console.log('🔍 [PreCheckoutModal] handleTermsAccept chamado');
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
            await recordTermAcceptance(activeTerm.id, 'checkout_terms');
          }
        }
        
        console.log('🔍 [PreCheckoutModal] Termos aceitos e registrados, fechando modal');
        setTermsAccepted(true);
        setShowTermsModal(false);
      } catch (error) {
        console.error('🔍 [PreCheckoutModal] Erro ao registrar aceitação dos termos:', error);
        // Still allow user to proceed even if recording fails
        setTermsAccepted(true);
        setShowTermsModal(false);
      }
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 [PreCheckoutModal] Checkbox alterado:', e.target.checked);
    setUserClickedCheckbox(true); // Mark that user interacted with checkbox
    console.log('🔍 [PreCheckoutModal] userClickedCheckbox definido como true');
    
    if (e.target.checked) {
      // When checkbox is checked, open terms modal
      console.log('🔍 [PreCheckoutModal] Checkbox marcado, abrindo modal de termos');
      handleTermsClick();
    } else {
      // When unchecked, reset terms acceptance
      console.log('🔍 [PreCheckoutModal] Checkbox desmarcado, resetando estados');
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
      setShowTermsModal(false); // Ensure modal is closed
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

  const handleProceed = () => {
    // Check if terms are accepted
    if (!termsAccepted) {
      alert(t('preCheckoutModal.mustAcceptTerms'));
      return;
    }

    console.log('🔍 [PreCheckoutModal] handleProceed chamado');
    console.log('🔍 [PreCheckoutModal] validationResult:', validationResult);
    console.log('🔍 [PreCheckoutModal] discountCode:', discountCode);
    console.log('🔍 [PreCheckoutModal] codeApplied:', codeApplied);
    console.log('🔍 [PreCheckoutModal] hasAffiliateCode:', hasAffiliateCode);
    console.log('🔍 [PreCheckoutModal] userAffiliateCode:', userProfile?.affiliate_code);
    console.log('🔍 [PreCheckoutModal] hasSellerReferralCode:', hasSellerReferralCode);
    console.log('🔍 [PreCheckoutModal] activeDiscount:', activeDiscount);
    
    // ✅ CORREÇÃO: Para usuários com seller_referral_code, não precisa de código de desconto
    if (hasSellerReferralCode) {
      console.log('🔍 [PreCheckoutModal] ✅ Usuário com seller_referral_code - prosseguindo sem validação de código');
      const finalAmount = computedBasePrice; // calculado localmente
      onProceedToCheckout(finalAmount);
      onClose();
      return;
    }
    
    // ✅ NOVO: Se usuário tem activeDiscount (código já aplicado no registro)
    if (activeDiscount?.has_discount) {
      console.log('🔍 [PreCheckoutModal] ✅ Usuário com desconto ativo - prosseguindo (edge function aplicará desconto)');
      // ✅ SEGURANÇA: Não calcular desconto no frontend, deixar edge function controlar
      onProceedToCheckout(computedBasePrice);
      onClose();
      return;
    }
    
    // ✅ Se usuário marcou que tem código (e não tem activeDiscount), precisa validar
    if (hasReferralCode) {
      if (validationResult?.isValid && discountCode.trim() && codeApplied) {
        console.log('🔍 [PreCheckoutModal] ✅ Aplicando código novo e continuando');
        const discount = validationResult?.discountAmount || 0;
        const finalAmount = Math.max(productPrice - discount, 0);
        onProceedToCheckout(finalAmount, discountCode.trim().toUpperCase());
        onClose();
      } else {
        console.log('🔍 [PreCheckoutModal] ❌ Código não válido ou não aplicado - não pode prosseguir');
        alert(t('preCheckoutModal.mustEnterValidCode'));
      }
    } else {
      // ✅ Usuário não tem código - prosseguir sem desconto
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
  
  console.log('🔍 [PreCheckoutModal] Modal está aberto, renderizando componente');
  console.log('🔍 [PreCheckoutModal] Estados finais para renderização:', {
    hasAffiliateCode,
    userAffiliateCode: userProfile?.affiliate_code,
    discountCode,
    validationResult,
    codeApplied,
    termsAccepted,
    hasUsedReferralCode,
    userProfile: userProfile ? 'loaded' : 'null',
    isOpen,
    feeType,
    productName,
    onProceedToCheckout: typeof onProceedToCheckout,
    onClose: typeof onClose,
    t: typeof t,
    supabase: typeof supabase,
    user: user?.id,
    loadingTerms,
    showTermsModal,
    hasScrolledToBottom
  });

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
                  {t('preCheckoutModal.securePayment')}
                </DrawerTitle>
              </div>
            </DrawerHeader>
            
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <ModalContent
                productName={productName}
                computedBasePrice={computedBasePrice}
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
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Terms and Conditions Modal for mobile drawer */}
        {showTermsModal && userClickedCheckbox && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50 p-2">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-lg font-bold text-slate-900 pr-4">
                  {activeTerm ? activeTerm.title : t('preCheckoutModal.termsAndConditions.title')}
                </h2>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {activeTerm ? (
                <>
                  <div 
                    ref={termsContentRef}
                    onScroll={handleTermsScroll}
                    className="flex-1 overflow-y-auto p-4"
                  >
                    <div 
                      className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-strong:text-gray-900"
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
                  </div>

                  <div className="flex items-center justify-between p-4 border-t border-slate-200 flex-shrink-0">
                    <button
                      onClick={() => setShowTermsModal(false)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors text-sm"
                    >
                      {t('preCheckoutModal.cancel')}
                    </button>
                    <button
                      onClick={handleTermsAccept}
                      disabled={!hasScrolledToBottom}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
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
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 text-sm">{t('preCheckoutModal.loading')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Desktop dialog
  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="relative z-50"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" aria-hidden="true" />
        
        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-30">
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
              <ModalContent
                productName={productName}
                computedBasePrice={computedBasePrice}
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
              />
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Terms and Conditions Modal for desktop */}
      {showTermsModal && userClickedCheckbox && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95dvh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 pr-4">
                  {activeTerm ? activeTerm.title : t('preCheckoutModal.termsAndConditions.title')}
                </h2>
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
