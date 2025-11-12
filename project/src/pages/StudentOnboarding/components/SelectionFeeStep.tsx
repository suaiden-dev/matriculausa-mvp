import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Dialog } from '@headlessui/react';
import { Loader2, CheckCircle, AlertCircle, CreditCard, X, Scroll, ArrowLeft, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';
import { useTermsAcceptance } from '../../../hooks/useTermsAcceptance';
import { useAffiliateTermsAcceptance } from '../../../hooks/useAffiliateTermsAcceptance';
import { useReferralCode } from '../../../hooks/useReferralCode';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
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

// Componente SVG para o logo do PIX (oficial)
const PixIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

// Componente SVG para o logo do Zelle (oficial)
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

// Componente SVG para o logo do Stripe (baseado no ícone oficial)
const StripeIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="2" fill="#7950F2"/>
    <path d="M6 8h12M6 12h8M6 16h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

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
      <h3 className="text-lg font-semibold text-gray-900">
        {activeTerm ? activeTerm.title : t('preCheckoutModal.termsAndConditions.title')}
      </h3>
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

export const SelectionFeeStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);
  const { isBlocked, pendingPayment, loading: paymentBlockedLoading } = usePaymentBlocked();
  const { recordTermAcceptance, checkTermAcceptance } = useTermsAcceptance();
  const { recordAffiliateTermAcceptance, checkIfUserHasAffiliate } = useAffiliateTermsAcceptance();
  const { activeDiscount, hasUsedReferralCode } = useReferralCode();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'zelle' | 'pix' | null>(null);
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [zellePaymentSubmitted, setZellePaymentSubmitted] = useState(false);
  const [isZelleProcessing, setIsZelleProcessing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Terms acceptance states
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTermsInDrawer, setShowTermsInDrawer] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [userClickedCheckbox, setUserClickedCheckbox] = useState(false);
  const termsContentRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Referral code states
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    isSelfReferral?: boolean;
  } | null>(null);
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [showCodeStep, setShowCodeStep] = useState(false);
  const [codeApplied, setCodeApplied] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        console.error('❌ [SelectionFeeStep] Erro na query:', error);
        return false;
      }

      if (data && data.length > 0) {
        setActiveTerm(data[0]);
        return true;
      }
      
      // Se não há termos ativos, criar um termo padrão
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
      return true;
    } catch (error) {
      console.error('❌ [SelectionFeeStep] Erro inesperado:', error);
      return false;
    } finally {
      setLoadingTerms(false);
    }
  };

  // Handle terms scroll and check if content needs scrolling
  const handleTermsScroll = useCallback(() => {
    if (termsContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setHasScrolledToBottom(isAtBottom);
    }
  }, []);

  // Check if content needs scrolling
  const checkIfContentNeedsScroll = useCallback(() => {
    if (termsContentRef.current) {
      const { scrollHeight, clientHeight } = termsContentRef.current;
      const needsScroll = scrollHeight > clientHeight;
      
      if (!needsScroll) {
        setHasScrolledToBottom(true);
      }
      
      return needsScroll;
    }
    return false;
  }, []);

  // Handle terms modal open
  const handleTermsClick = async () => {
    const hasTerms = await loadActiveTerms();
    
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
    
    setShowTermsModal(true);
    setHasScrolledToBottom(false);
  };

  // Handle terms acceptance
  const handleTermsAccept = async () => {
    if (hasScrolledToBottom) {
      try {
        if (activeTerm) {
          const affiliateAdminId = await checkIfUserHasAffiliate();
          
          if (affiliateAdminId) {
            await recordAffiliateTermAcceptance(activeTerm.id, 'checkout_terms', affiliateAdminId);
          } else {
            await recordTermAcceptance(activeTerm.id, 'checkout_terms');
          }
        }
        
        setTermsAccepted(true);
        
        if (isMobile) {
          setShowTermsInDrawer(false);
        } else {
          setShowTermsModal(false);
        }
      } catch (error) {
        console.error('Erro ao registrar aceitação dos termos:', error);
        setTermsAccepted(true);
        
        if (isMobile) {
          setShowTermsInDrawer(false);
        } else {
          setShowTermsModal(false);
        }
      }
    }
  };

  // Função para validar código preenchido automaticamente
  const validateDiscountCodeForPrefill = useCallback(async (code: string) => {
    if (!code.trim()) {
      return;
    }

    setIsValidating(true);

    try {
      const { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes')
        .select('user_id, code, is_active')
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (affiliateError || !affiliateCodeData) {
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.invalidCode') || 'Invalid code'
        });
        return;
      }

      // Check if not self-referral
      if (affiliateCodeData.user_id === user?.id) {
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.selfReferral') || 'Self-referral not allowed',
          isSelfReferral: true
        });
        return;
      }

      // Check if user already used any code
      if (hasUsedReferralCode && !activeDiscount?.has_discount) {
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.alreadyUsedCode') || 'Code already used'
        });
        return;
      }

      // Valid code - salvar no banco via RPC direta
      try {
        if (!user?.id || !user?.email) {
          throw new Error('User not authenticated');
        }

        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_and_apply_referral_code', {
            user_id_param: user.id,
            affiliate_code_param: code.trim().toUpperCase(),
            email_param: user.email
          });

        if (validationError) {
          console.error('[SelectionFeeStep] RPC error (prefill):', validationError);
          const errorMessage = validationError.message || validationError.details || (t('preCheckoutModal.errorValidating') || 'Erro ao validar código');
          setValidationResult({
            isValid: false,
            message: errorMessage
          });
          return;
        }

        if (!validationResult || !validationResult.success) {
          console.error('[SelectionFeeStep] Validation failed (prefill):', validationResult?.error);
          setValidationResult({
            isValid: false,
            message: validationResult?.error || t('preCheckoutModal.errorValidating') || 'Erro ao validar código'
          });
          return;
        }

        console.log('[SelectionFeeStep] Validation result (prefill):', validationResult);
      } catch (error) {
        console.error('[SelectionFeeStep] Error saving code (prefill):', error);
        setValidationResult({
          isValid: false,
          message: error instanceof Error ? error.message : (t('preCheckoutModal.errorValidating') || 'Erro ao validar código')
        });
        return;
      }
      
      setValidationResult({
        isValid: true,
        message: t('preCheckoutModal.validCode') || 'Valid code! $50 discount applied',
        discountAmount: 50
      });
      setCodeApplied(true);

    } catch (error) {
      console.error('Error validating code:', error);
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.errorValidating') || 'Error validating code'
      });
    } finally {
      setIsValidating(false);
    }
  }, [user?.id, hasUsedReferralCode, activeDiscount, t]);

  // Check if user already used referral code
  const checkReferralCodeUsage = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Se já tem activeDiscount, não bloquear
      if (activeDiscount?.has_discount) {
        return;
      }

      const { data, error } = await supabase
        .from('used_referral_codes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!error && data && data.length > 0) {
        // Usuário já usou código, mas não bloquear se tem activeDiscount
        return;
      }
    } catch (error) {
      console.error('Error checking referral code usage:', error);
    }
  }, [user?.id, activeDiscount]);

  // Verificar se usuário tem seller_referral_code
  const hasSellerReferralCode = userProfile?.seller_referral_code && userProfile.seller_referral_code.trim() !== '';
  
  // Verificar se usuário já tem affiliate_code (friend code) do registro
  const hasAffiliateCode = userProfile?.affiliate_code && userProfile.affiliate_code.trim() !== '';

  // Buscar código usado diretamente do banco quando componente monta (fallback se activeDiscount não carregou)
  useEffect(() => {
    const fetchUsedCode = async () => {
      if (!user?.id) {
        console.log('🔍 [SelectionFeeStep] Sem user.id, não buscando código');
        return;
      }
      
      console.log('🔍 [SelectionFeeStep] Verificando condições para buscar código:', {
        hasActiveDiscount: activeDiscount?.has_discount,
        activeDiscountCode: activeDiscount?.affiliate_code,
        hasDiscountCode: !!discountCode,
        codeApplied
      });
      
      // Se já tem activeDiscount, não precisa buscar
      if (activeDiscount?.has_discount && activeDiscount.affiliate_code) {
        console.log('🔍 [SelectionFeeStep] Já tem activeDiscount, não precisa buscar');
        return;
      }
      
      // Se já tem código no estado, não precisa buscar
      if (discountCode && codeApplied) {
        console.log('🔍 [SelectionFeeStep] Já tem código no estado, não precisa buscar');
        return;
      }

      console.log('🔍 [SelectionFeeStep] Buscando código usado no banco para user:', user.id);
      try {
        // Primeiro, buscar com status 'applied'
        let { data, error } = await supabase
          .from('used_referral_codes')
          .select('affiliate_code, discount_amount, status')
          .eq('user_id', user.id)
          .eq('status', 'applied')
          .order('applied_at', { ascending: false })
          .limit(1);

        // Se não encontrou com status 'applied', buscar qualquer código usado (pode estar 'pending')
        if (!error && (!data || data.length === 0)) {
          console.log('🔍 [SelectionFeeStep] Não encontrou com status applied, buscando qualquer código usado...');
          const { data: anyStatusData, error: anyStatusError } = await supabase
            .from('used_referral_codes')
            .select('affiliate_code, discount_amount, status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!anyStatusError && anyStatusData && anyStatusData.length > 0) {
            data = anyStatusData;
            error = null;
            console.log('🔍 [SelectionFeeStep] Encontrado código com outro status:', anyStatusData[0].status);
          }
        }

        if (error) {
          console.error('❌ [SelectionFeeStep] Erro ao buscar código usado:', error);
          return;
        }

        console.log('🔍 [SelectionFeeStep] Resultado da busca:', { data, error });

        if (data && data.length > 0 && data[0]?.affiliate_code) {
          const usedCode = data[0];
          console.log('✅ [SelectionFeeStep] Código usado encontrado no banco:', usedCode.affiliate_code);
          // Restaurar estado do código aplicado
          setDiscountCode(usedCode.affiliate_code);
          setCodeApplied(true);
          setHasReferralCode(true);
          setShowCodeStep(true);
          setValidationResult({
            isValid: true,
            message: t('preCheckoutModal.validCode') || 'Valid code! $50 discount applied',
            discountAmount: usedCode.discount_amount || 50
          });
          console.log('✅ [SelectionFeeStep] Estado restaurado com sucesso');
        } else {
          console.log('ℹ️ [SelectionFeeStep] Nenhum código usado encontrado no banco');
        }
      } catch (error) {
        console.error('❌ [SelectionFeeStep] Erro ao buscar código usado:', error);
      }
    };

    fetchUsedCode();
  }, [user?.id, activeDiscount?.has_discount, activeDiscount?.affiliate_code, discountCode, codeApplied, t]);

  // Restaurar estado do código aplicado quando há activeDiscount (ex: quando volta do checkout)
  useEffect(() => {
    console.log('🔍 [SelectionFeeStep] Verificando activeDiscount para restaurar:', {
      activeDiscount,
      hasDiscount: activeDiscount?.has_discount,
      affiliateCode: activeDiscount?.affiliate_code
    });
    
    if (activeDiscount?.has_discount && activeDiscount.affiliate_code) {
      console.log('✅ [SelectionFeeStep] Restaurando código aplicado via activeDiscount:', activeDiscount.affiliate_code);
      // Restaurar estado do código aplicado
      setDiscountCode(activeDiscount.affiliate_code);
      setCodeApplied(true);
      setHasReferralCode(true);
      setShowCodeStep(true);
      setValidationResult({
        isValid: true,
        message: t('preCheckoutModal.validCode') || 'Valid code! $50 discount applied',
        discountAmount: activeDiscount.discount_amount || 50
      });
    }
  }, [activeDiscount?.has_discount, activeDiscount?.affiliate_code, activeDiscount?.discount_amount, t]);

  // Preencher automaticamente o campo de referral code se o usuário já tem affiliate_code
  useEffect(() => {
    // Só preencher se não houver activeDiscount (para não sobrescrever o código já aplicado)
    if (hasAffiliateCode && userProfile?.affiliate_code && !activeDiscount?.has_discount) {
      setDiscountCode(userProfile.affiliate_code);
      setHasReferralCode(true);
      setShowCodeStep(true);
      // Automaticamente validar o código preenchido
      setTimeout(() => {
        if (userProfile.affiliate_code) {
          validateDiscountCodeForPrefill(userProfile.affiliate_code);
        }
      }, 100);
    }
  }, [hasAffiliateCode, userProfile?.affiliate_code, validateDiscountCodeForPrefill, activeDiscount?.has_discount]);

  // Validate discount code
  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.pleaseEnterCode') || 'Please enter a code'
      });
      return;
    }

    // Verificar se o usuário tem seller_referral_code
    if (hasSellerReferralCode) {
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.sellerReferralCodeBlocked') || 'Cannot use discount code with seller referral'
      });
      return;
    }

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
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.invalidCode') || 'Invalid code'
        });
        return;
      }

      // Check if not self-referral
      if (affiliateCodeData.user_id === user?.id) {
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.selfReferral') || 'Self-referral not allowed',
          isSelfReferral: true
        });
        return;
      }

      // Check if user already used any code
      if (hasUsedReferralCode && !activeDiscount?.has_discount) {
        setValidationResult({
          isValid: false,
          message: t('preCheckoutModal.alreadyUsedCode') || 'Code already used'
        });
        return;
      }

      // Valid code - salvar no banco via RPC direta
      try {
        if (!user?.id || !user?.email) {
          throw new Error('User not authenticated');
        }

        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_and_apply_referral_code', {
            user_id_param: user.id,
            affiliate_code_param: discountCode.trim().toUpperCase(),
            email_param: user.email
          });

        if (validationError) {
          console.error('[SelectionFeeStep] RPC error:', validationError);
          const errorMessage = validationError.message || validationError.details || (t('preCheckoutModal.errorValidating') || 'Erro ao validar código');
          setValidationResult({
            isValid: false,
            message: errorMessage
          });
          return;
        }

        if (!validationResult || !validationResult.success) {
          console.error('[SelectionFeeStep] Validation failed:', validationResult?.error);
          setValidationResult({
            isValid: false,
            message: validationResult?.error || t('preCheckoutModal.errorValidating') || 'Erro ao validar código'
          });
          return;
        }

        console.log('[SelectionFeeStep] Validation result:', validationResult);
      } catch (error) {
        console.error('[SelectionFeeStep] Error saving code:', error);
        setValidationResult({
          isValid: false,
          message: error instanceof Error ? error.message : (t('preCheckoutModal.errorValidating') || 'Erro ao validar código')
        });
        return;
      }
      
      setValidationResult({
        isValid: true,
        message: t('preCheckoutModal.validCode') || 'Valid code! $50 discount applied',
        discountAmount: 50
      });
      setCodeApplied(true);

    } catch (error) {
      console.error('Error validating code:', error);
      setValidationResult({
        isValid: false,
        message: t('preCheckoutModal.errorValidating') || 'Error validating code'
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserClickedCheckbox(true);
    
    if (e.target.checked) {
      if (isMobile) {
        setShowTermsInDrawer(true);
        await loadActiveTerms();
      } else {
        handleTermsClick();
      }
    } else {
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
      setShowTermsModal(false);
      setShowTermsInDrawer(false);
    }
  };

  // Verificar se usuário já aceitou termos
  useEffect(() => {
    const checkExistingAcceptance = async () => {
      if (!user?.id) return;
      
      try {
        const hasAccepted = await checkTermAcceptance('checkout_terms');
        if (hasAccepted) {
          console.log('✅ [SelectionFeeStep] Usuário já aceitou termos');
          setTermsAccepted(true);
        }
      } catch (error) {
        console.error('Erro ao verificar aceitação de termos:', error);
      }
    };

    checkExistingAcceptance();
  }, [user?.id, checkTermAcceptance]);

  // Check scroll requirements when activeTerm changes
  useEffect(() => {
    if (activeTerm && (showTermsModal || showTermsInDrawer)) {
      const timer = setTimeout(() => {
        checkIfContentNeedsScroll();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeTerm, showTermsModal, showTermsInDrawer, checkIfContentNeedsScroll]);

  // Reset scroll state when showing terms in drawer
  useEffect(() => {
    if (showTermsInDrawer) {
      setHasScrolledToBottom(false);
    }
  }, [showTermsInDrawer]);

  // Usar usePaymentBlocked para verificar pagamentos pendentes
  useEffect(() => {
    console.log('🔍 [SelectionFeeStep] Verificando estado de bloqueio:', {
      isBlocked,
      hasPendingPayment: !!pendingPayment,
      paymentBlockedLoading,
      pendingPaymentFeeType: pendingPayment?.fee_type
    });

    // Se está carregando, aguardar
    if (paymentBlockedLoading) {
      console.log('⏳ [SelectionFeeStep] Aguardando verificação de pagamentos pendentes...');
      return;
    }

    // Se há pagamento pendente, mostrar checkout automaticamente
    if (isBlocked && pendingPayment) {
      console.log('🚫 [SelectionFeeStep] Pagamento pendente detectado:', {
        id: pendingPayment.id,
        status: pendingPayment.status,
        fee_type: pendingPayment.fee_type
      });
      
      setIsZelleProcessing(true);
      setShowZelleCheckout(true);
      setSelectedMethod('zelle');
      console.log('🔄 [SelectionFeeStep] Mostrando checkout Zelle automaticamente');
    } else {
      console.log('✅ [SelectionFeeStep] Nenhum pagamento pendente');
    }
  }, [isBlocked, pendingPayment, paymentBlockedLoading]);

  const selectionFeeAmount = getFeeAmount('selection_process');

  // Calcular preço final com desconto
  const computedBasePrice = (() => {
    console.log('💰 [SelectionFeeStep] Calculando preço:', {
      selectionFeeAmount,
      activeDiscount,
      hasActiveDiscount: activeDiscount?.has_discount,
      validationResult,
      codeApplied,
      discountCode
    });

    if (activeDiscount?.has_discount) {
      // Se já tem desconto ativo, aplicar desconto
      const discount = activeDiscount.discount_amount || 50;
      const finalPrice = Math.max(selectionFeeAmount - discount, 0);
      console.log('💰 [SelectionFeeStep] Aplicando desconto via activeDiscount:', { discount, finalPrice });
      return finalPrice;
    }
    if (validationResult?.isValid && codeApplied) {
      // Se código foi validado e aplicado, aplicar desconto de $50
      const finalPrice = Math.max(selectionFeeAmount - 50, 0);
      console.log('💰 [SelectionFeeStep] Aplicando desconto via código validado:', { finalPrice });
      return finalPrice;
    }
    console.log('💰 [SelectionFeeStep] Sem desconto, usando preço original:', selectionFeeAmount);
    return selectionFeeAmount;
  })();

  const formattedAmount = computedBasePrice && !isNaN(computedBasePrice) 
    ? formatFeeAmount(computedBasePrice) 
    : '$0.00';
  
  const originalFormattedAmount = selectionFeeAmount && !isNaN(selectionFeeAmount) 
    ? formatFeeAmount(selectionFeeAmount) 
    : '$0.00';

  // Polling para verificar quando o pagamento Zelle for aprovado
  useEffect(() => {
    if (!zellePaymentSubmitted || !user?.id) {
      // Limpar intervalo se não estiver mais em polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    let attempts = 0;
    const maxAttempts = 30; // 30 tentativas = ~1 minuto

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      await refetchUserProfile();
      
      // Verificar se o pagamento foi processado
      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .select('has_paid_selection_process_fee')
        .eq('user_id', user.id)
        .single();
      
      if (updatedProfile?.has_paid_selection_process_fee) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setZellePaymentSubmitted(false);
        setShowZelleCheckout(false);
        onNext();
      } else if (attempts >= maxAttempts) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setZellePaymentSubmitted(false);
        // Mesmo que não tenha sido aprovado ainda, mostrar mensagem
        setError('Payment submitted successfully. It will be processed shortly. You can continue once it\'s approved.');
      }
    }, 2000); // Verificar a cada 2 segundos

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zellePaymentSubmitted, user?.id]);

  const handleCheckout = async (paymentMethod: 'stripe' | 'zelle' | 'pix') => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    // Check if terms are accepted
    if (!termsAccepted) {
      alert(t('preCheckoutModal.mustAcceptTerms') || 'You must accept the terms and conditions to proceed.');
      return;
    }

    // Check if referral code is required but not validated
    if (hasReferralCode && !(validationResult?.isValid) && !activeDiscount?.has_discount) {
      alert(t('preCheckoutModal.mustEnterValidCode') || 'Please enter and validate your referral code, or uncheck the referral code option.');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedMethod(paymentMethod);

    try {
      // Zelle mostra checkout inline
      if (paymentMethod === 'zelle') {
        // Verificar se há pagamento pendente usando o hook
        if (isBlocked && pendingPayment) {
          console.log('🚫 [SelectionFeeStep] Pagamento pendente detectado ao clicar em Zelle:', pendingPayment);
          setIsZelleProcessing(true);
          setShowZelleCheckout(true);
          setSelectedMethod('zelle');
          setLoading(false);
          return;
        }

        // Não há pagamento pendente - mostrar formulário normal
        setIsZelleProcessing(false);
        setShowZelleCheckout(true);
        setSelectedMethod('zelle');
        setLoading(false);
        return;
      }

      // Stripe e PIX usam a edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('User not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
      
      // Determinar código de desconto a ser enviado
      const discountCodeToSend = (() => {
        if (activeDiscount?.has_discount && activeDiscount.affiliate_code) {
          return activeDiscount.affiliate_code;
        }
        if (validationResult?.isValid && codeApplied && discountCode.trim()) {
          return discountCode.trim().toUpperCase();
        }
        return undefined;
      })();

      const requestBody = {
        price_id: 'price_selection_process_fee',
        amount: computedBasePrice, // Usar valor com desconto
        payment_method: paymentMethod,
        success_url: `${window.location.origin}/student/onboarding?step=scholarship_selection&payment=success`,
        cancel_url: `${window.location.origin}/student/onboarding?step=selection_fee&payment=cancelled`,
        mode: 'payment',
        payment_type: 'selection_process',
        fee_type: 'selection_process',
        ...(discountCodeToSend && { discount_code: discountCodeToSend })
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating checkout session');
      }

      const data = await response.json();
      
      if (data.session_url) {
        window.location.href = data.session_url;
      } else {
        throw new Error('Session URL not found');
      }
    } catch (err: any) {
      console.error('Error processing checkout:', err);
      setError(err.message || 'Error processing payment. Please try again.');
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'stripe' as const,
      name: 'Credit/Debit Card',
      description: 'Pay securely with your credit or debit card',
      icon: StripeIcon
    },
    {
      id: 'pix' as const,
      name: 'PIX',
      description: 'Instant payment method from Brazil',
      icon: PixIcon
    },
    {
      id: 'zelle' as const,
      name: 'Zelle',
      description: 'Pay via Zelle and send the proof of payment. Processing may take up to 48 hours.',
      icon: ZelleIcon,
      requiresVerification: true
    }
  ];

  // Verificar se já pagou
  const hasPaid = userProfile?.has_paid_selection_process_fee || false;

  if (hasPaid) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Selection Fee Paid!</h3>
        <p className="text-gray-600 mb-6">You've already paid the selection process fee.</p>
        <button
          onClick={onNext}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Payment Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Pay Selection Process Fee
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            Get started by paying the selection process fee
          </p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Selection Process Fee</h3>
                <p className="text-sm text-gray-500 mt-1">One-time payment</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              {computedBasePrice < selectionFeeAmount ? (
                <div>
                  <div className="text-lg sm:text-xl line-through text-gray-400">{originalFormattedAmount}</div>
                  <div className="text-3xl sm:text-4xl font-bold text-green-600">{formattedAmount}</div>
                  <div className="text-sm text-green-600 font-medium mt-1">$50 discount applied!</div>
                </div>
              ) : (
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">{formattedAmount}</div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              This fee covers the initial processing of your application and allows you to proceed with selecting scholarships from our partner universities.
            </p>
          </div>

          {/* Matricula Rewards / Referral Code Section */}
          {/* Mostrar seção sempre, exceto se tiver seller_referral_code */}
          {!hasSellerReferralCode ? (
            <div className="mb-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('preCheckoutModal.referralCode') || 'Matricula Rewards'}
                </h3>
                <p className="text-sm text-gray-600">
                  Have a referral code? Get $50 off your selection process fee!
                </p>
              </div>

              {/* Mostrar campo de código sempre */}
              {true && (
                <>
                  {/* Checkbox para perguntar se tem código - só aparece se não tem desconto ativo e não tem código aplicado */}
                  {!activeDiscount?.has_discount && !codeApplied && (
                    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <label htmlFor="hasReferralCode" className="checkbox-container cursor-pointer flex-shrink-0">
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
                          className="custom-checkbox"
                        />
                        <div className="checkmark" />
                      </label>
                      <label htmlFor="hasReferralCode" className="text-sm text-gray-700 leading-relaxed cursor-pointer flex-1">
                        {t('preCheckoutModal.haveReferralCode') || 'I have a referral code'}
                      </label>
                    </div>
                  )}

                  {/* Campo de input - aparece se checkbox marcado OU se já tem código aplicado */}
                  {((hasReferralCode && showCodeStep) || (activeDiscount?.has_discount && discountCode) || (codeApplied && discountCode)) && (
                    <div className="space-y-3">
                      {(activeDiscount?.has_discount || codeApplied) && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            <p className="text-green-800 text-sm font-medium">
                              {t('preCheckoutModal.discountAlreadyApplied') || 'Discount already applied'}
                            </p>
                          </div>
                        </div>
                      )}
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => {
                          // Só permitir edição se não houver desconto ativo e código não foi aplicado
                          if (!activeDiscount?.has_discount && !codeApplied) {
                            setDiscountCode(e.target.value.toUpperCase());
                          }
                        }}
                        placeholder={t('preCheckoutModal.placeholder') || 'Enter code'}
                        readOnly={!!activeDiscount?.has_discount || !!hasAffiliateCode || codeApplied}
                        className={`w-full px-4 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center font-mono text-base sm:text-lg tracking-wider ${
                          activeDiscount?.has_discount || hasAffiliateCode || codeApplied
                            ? 'border-green-300 bg-green-50 cursor-not-allowed' 
                            : 'border-gray-300'
                        }`}
                        style={{ fontSize: '16px' }}
                        maxLength={8}
                      />
                      {!activeDiscount?.has_discount && !hasAffiliateCode && !codeApplied && (
                        <button
                          onClick={validateDiscountCode}
                          disabled={isValidating || !discountCode.trim()}
                          className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          {isValidating ? (
                            <div className="flex items-center space-x-2 justify-center">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>{t('preCheckoutModal.validating') || 'Validating...'}</span>
                            </div>
                          ) : (
                            t('preCheckoutModal.validate') || 'Validate Code'
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
          ) : null}

          {/* Terms acceptance section */}
          <div className="mb-6">
            <div className="flex items-start space-x-3 p-3 sm:p-4 bg-slate-100 rounded-2xl">
              <label htmlFor="termsAccepted" className="checkbox-container cursor-pointer flex-shrink-0">
                <input
                  id="termsAccepted"
                  name="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={handleCheckboxChange}
                  className="custom-checkbox"
                />
                <div className="checkmark" />
              </label>
              <label htmlFor="termsAccepted" className="text-xs sm:text-sm text-slate-700 leading-relaxed cursor-pointer flex-1">
                {t('preCheckoutModal.acceptContractTerms') || 'I accept the terms and conditions'}
              </label>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Skeleton Loading enquanto verifica pagamentos pendentes */}
          {paymentBlockedLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 rounded mb-4"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-gray-200 rounded"></div>
                      <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Zelle Checkout Inline */}
              {showZelleCheckout ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Zelle Payment</h3>
                {/* Só mostrar botão X se não estiver processando */}
                {!isZelleProcessing && (
                  <button
                    onClick={() => {
                      setShowZelleCheckout(false);
                      setSelectedMethod(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
              
              <ZelleCheckout
                feeType="selection_process"
                amount={computedBasePrice}
                scholarshipsIds={[]}
                metadata={{
                  discount_applied: computedBasePrice < selectionFeeAmount,
                  original_amount: selectionFeeAmount,
                  final_amount: computedBasePrice,
                  ...(activeDiscount?.has_discount && activeDiscount.affiliate_code ? { discount_code: activeDiscount.affiliate_code } : {}),
                  ...(validationResult?.isValid && codeApplied && discountCode.trim() ? { discount_code: discountCode.trim().toUpperCase() } : {})
                }}
                onSuccess={() => {
                  // Pagamento aprovado - avançar para próxima step
                  console.log('✅ [SelectionFeeStep] Pagamento Zelle aprovado - avançando para próxima step');
                  setZellePaymentSubmitted(false);
                  setShowZelleCheckout(false);
                  setIsZelleProcessing(false);
                  onNext(); // Avançar para próxima step do onboarding
                }}
                onError={(error) => {
                  setError(error);
                  setZellePaymentSubmitted(false);
                  setIsZelleProcessing(false);
                }}
                onProcessingChange={(isProcessing) => {
                  setIsZelleProcessing(isProcessing);
                }}
              />
            </div>
          ) : (
            /* Payment Methods */
            <div className="space-y-4">
              {isBlocked && pendingPayment && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">
                        Payment Already Processing
                      </p>
                      <p className="text-xs sm:text-sm text-amber-700">
                        You have a Zelle payment currently being processed. Please wait for it to be reviewed before selecting another payment method.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-sm font-medium text-gray-700 mb-4">Select your payment method:</p>
              
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                const isProcessing = loading && isSelected;
                // Desabilitar outros métodos se há pagamento pendente, se termos não foram aceitos, ou se código não foi validado
                const isDisabled = loading || 
                  !termsAccepted || 
                  (hasReferralCode && !(validationResult?.isValid) && !activeDiscount?.has_discount) ||
                  (isBlocked && pendingPayment && method.id !== 'zelle');
                
                return (
                  <button
                    key={method.id}
                    onClick={() => handleCheckout(method.id)}
                    disabled={isDisabled}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                        <Icon className="w-12 h-12" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-semibold text-gray-900">
                            {method.name}
                          </h4>
                          {isProcessing && (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                          )}
                          {isSelected && !loading && (
                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {method.description}
                        </p>
                        
                        
                        {isDisabled && isBlocked && pendingPayment && method.id !== 'zelle' && (
                          <div className="mt-2 flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-xs text-amber-700">
                              Unavailable - Zelle payment processing
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Terms and Conditions Modal for desktop */}
      {showTermsModal && userClickedCheckbox && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <Dialog open={showTermsModal} onClose={() => setShowTermsModal(false)} className="relative z-[10021]">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10020]" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[10020]">
              <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden relative border-0 max-h-[95dvh] flex flex-col">
                <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6 flex-shrink-0">
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                    title={t('preCheckoutModal.closeTerms') || 'Close'}
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <div className="flex items-center gap-3 mb-2 sm:mb-4 pr-12">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <Dialog.Title className="text-xl sm:text-2xl font-bold">
                      {activeTerm ? activeTerm.title : t('preCheckoutModal.termsAndConditions.title')}
                    </Dialog.Title>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {loadingTerms ? (
                    <div className="flex items-center justify-center p-6">
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
                        className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600"
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
                    </>
                  ) : (
                    <div className="flex items-center justify-center p-6">
                      <p className="text-slate-600 text-sm">{t('preCheckoutModal.noTermsFound')}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-2xl">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowTermsModal(false)}
                      className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      {t('preCheckoutModal.closeTerms') || 'Close'}
                    </button>
                    <button
                      onClick={handleTermsAccept}
                      disabled={!hasScrolledToBottom}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
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
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </div>,
        document.body
      )}

      {/* Terms Drawer for mobile */}
      {showTermsInDrawer && (
        <Drawer open={showTermsInDrawer} onOpenChange={setShowTermsInDrawer}>
          <DrawerContent className="max-h-[95vh] bg-white border-t border-gray-200 rounded-t-2xl">
            <DrawerHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <DrawerTitle className="text-xl font-bold">
                  {t('preCheckoutModal.termsAndConditions.title')}
                </DrawerTitle>
              </div>
            </DrawerHeader>
            
            <div className="flex-1 overflow-y-auto p-4 bg-white">
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
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <style>{`
        /* Hide the default checkbox */
        .checkbox-container input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }

        .checkbox-container {
          display: block;
          position: relative;
          cursor: pointer;
          font-size: 20px;
          user-select: none;
        }

        /* Create a custom checkbox */
        .checkmark {
          position: relative;
          top: 0;
          left: 0;
          height: 1.3em;
          width: 1.3em;
          background-color: #ffffff;
          border: 2px solid #343434;
          border-radius: 5px;
          transition: all 0.5s;
        }

        /* When the checkbox is checked, keep white background */
        .checkbox-container input:checked ~ .checkmark {
          background-color: #ffffff;
          border: 2px solid #343434;
        }

        /* Create the checkmark/indicator (hidden when not checked) */
        .checkmark:after {
          content: "";
          position: absolute;
          display: none;
          filter: drop-shadow(0 0 10px #888);
        }

        /* Show the checkmark when checked */
        .checkbox-container input:checked ~ .checkmark:after {
          display: block;
        }

        /* Style the checkmark/indicator */
        .checkbox-container .checkmark:after {
          left: 0.4em;
          top: 0.15em;
          width: 0.35em;
          height: 0.6em;
          border: solid #343434;
          border-width: 0 0.15em 0.15em 0;
          border-radius: 2px;
          transform: rotate(45deg);
          animation: bounceFadeIn 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        @keyframes bounceFadeIn {
          0% {
            transform: rotate(45deg) scale(0.3);
            opacity: 0;
          }

          50% {
            transform: rotate(45deg) scale(1.1);
            opacity: 0.8;
          }

          100% {
            transform: rotate(45deg) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

