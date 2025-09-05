import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Dialog } from '@headlessui/react';
import { X, AlertCircle, CheckCircle, Shield, Lock, Scroll } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';

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
  onProceedToCheckout: (discountCode?: string) => void;
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee';
  productName: string;
  productPrice: number;
  isLoading?: boolean; // Prop opcional para mostrar loading
}

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
  const { recordTermAcceptance } = useTermsAcceptance();
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

  // Reset state when modal opens/closes
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
      checkReferralCodeUsage();
      // Don't load terms automatically - only when checkbox is checked
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
          await recordTermAcceptance(activeTerm.id, 'checkout_terms');
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
      if (hasUsedReferralCode) {
        console.log('🔍 [PreCheckoutModal] ❌ Usuário já usou código anteriormente');
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.alreadyUsedCode')
        });
        return;
      }

      // Valid code
      console.log('🔍 [PreCheckoutModal] ✅ Código preenchido é válido');
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
      if (hasUsedReferralCode) {
        console.log('🔍 [PreCheckoutModal] ❌ Usuário já usou código anteriormente');
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.alreadyUsedCode')
        });
        return;
      }

      // Valid code
      console.log('🔍 [PreCheckoutModal] ✅ Código válido, aplicando desconto...');
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
    
    // ✅ CORREÇÃO: Só permite prosseguir se tiver código válido aplicado
    if (validationResult?.isValid && discountCode.trim() && codeApplied) {
      console.log('🔍 [PreCheckoutModal] ✅ Aplicando código e continuando para checkout');
      onProceedToCheckout(discountCode.trim().toUpperCase());
      onClose();
    } else {
      console.log('🔍 [PreCheckoutModal] ❌ Código não válido ou não aplicado - não pode prosseguir');
      alert(t('preCheckoutModal.mustEnterValidCode'));
    }
  };

  const handleSkip = () => {
    // Check if terms are accepted
    if (!termsAccepted) {
      alert(t('preCheckoutModal.mustAcceptTerms'));
      return;
    }

    console.log('🔍 [PreCheckoutModal] handleSkip chamado - prosseguindo sem código');
    onProceedToCheckout();
    onClose();
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
        <div className="fixed inset-0 flex items-center justify-center p-4 z-30">
          <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                title={t('preCheckoutModal.closeModal')}
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-bold">
                    {t('preCheckoutModal.securePayment')}
                  </Dialog.Title>
                  <p className="text-blue-100">
                    {t('preCheckoutModal.redirectToStripe')}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Product Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-0">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{productName}</h3>
                  <div className="inline-flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">{t('preCheckoutModal.securePaymentViaStripe')}</span>
                  </div>
                </div>
              </div>


              {/* Discount Code Input - Apenas para usuários sem seller_referral_code */}
              {!hasUsedReferralCode && !hasSellerReferralCode ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <label className="block text-lg font-semibold text-gray-900 mb-2">
                      {hasAffiliateCode ? t('preCheckoutModal.yourReferralCode') : t('preCheckoutModal.referralCode')}
                    </label>
                    <p className="text-sm text-gray-600 mb-4">
                      {hasAffiliateCode 
                        ? t('preCheckoutModal.usingYourReferralCode') 
                        : t('preCheckoutModal.enterReferralCode')
                      }
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder={t('preCheckoutModal.placeholder')}
                      readOnly={!!hasAffiliateCode}
                      className={`flex-1 px-5 py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center font-mono text-lg tracking-wider ${
                        hasAffiliateCode 
                          ? 'border-green-300 bg-green-50 cursor-not-allowed' 
                          : 'border-gray-300'
                      }`}
                      maxLength={8}
                    />
                    {!hasAffiliateCode && (
                      <button
                        onClick={validateDiscountCode}
                        disabled={isValidating || !discountCode.trim()}
                        className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
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
                  </div>
                  
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
            </div>
            <div className="flex items-start space-x-3 p-4 mx-6 mb-6 bg-slate-100 rounded-2xl">
                <input
                  id="termsAccepted"
                  name="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    console.log('🔍 [PreCheckoutModal] Checkbox onChange disparado:', e.target.checked);
                    handleCheckboxChange(e);
                  }}
                  className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                                 <label htmlFor="termsAccepted" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                   {t('preCheckoutModal.acceptContractTerms')}
                 </label>
              </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 px-6 py-6 border-t border-gray-200 bg-gray-50">
              {/* Para usuários COM seller_referral_code: apenas um botão */}
              {hasSellerReferralCode ? (
                <button
                  onClick={handleProceed}
                  disabled={isLoading || !termsAccepted}
                  className="flex-1 px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('preCheckoutModal.openingStripe')}</span>
                    </div>
                  ) : (
                    t('preCheckoutModal.goToPayment')
                  )}
                </button>
              ) : (
                /* Para usuários SEM seller_referral_code: dois botões (comportamento original) */
                <>
                  <button
                    onClick={handleSkip}
                    disabled={!termsAccepted}
                    className={`flex-1 px-6 py-4 border-2 rounded-xl font-semibold transition-all ${
                      termsAccepted
                        ? 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {t('preCheckoutModal.continueWithoutCode')}
                  </button>
                  <button
                    onClick={handleProceed}
                    disabled={isLoading || !termsAccepted || !(validationResult?.isValid && codeApplied)}
                    className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 ${
                      validationResult?.isValid && codeApplied
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    } ${isLoading || !termsAccepted || !(validationResult?.isValid && codeApplied) ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{t('preCheckoutModal.openingStripe')}</span>
                      </div>
                    ) : validationResult?.isValid && codeApplied ? (
                      t('preCheckoutModal.applyCodeAndContinue')
                    ) : (
                      t('preCheckoutModal.goToPayment')
                    )}
                  </button>
                </>
              )}
            </div>
            
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Terms and Conditions Modal */}
      {showTermsModal && userClickedCheckbox && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">
                  {activeTerm ? activeTerm.title : t('preCheckoutModal.termsAndConditions.title')}
                </h2>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  title={t('preCheckoutModal.closeTerms')}
                >
                  <X className="h-6 w-6 text-slate-500" />
                </button>
              </div>

              {/* Modal Content */}
              {activeTerm ? (
                <>
                  <div 
                    ref={termsContentRef}
                    onScroll={handleTermsScroll}
                    className="flex-1 overflow-y-auto p-6"
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
                  <div className="flex items-center justify-between p-6 border-t border-slate-200">
                    <button
                      onClick={() => setShowTermsModal(false)}
                      className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                    >
                      {t('preCheckoutModal.cancel')}
                    </button>
                    <button
                      onClick={handleTermsAccept}
                      disabled={!hasScrolledToBottom}
                      className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
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
