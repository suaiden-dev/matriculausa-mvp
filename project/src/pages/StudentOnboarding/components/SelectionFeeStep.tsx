import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Dialog } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, X, ArrowLeft, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';
import { useTermsAcceptance } from '../../../hooks/useTermsAcceptance';
import { useAffiliateTermsAcceptance } from '../../../hooks/useAffiliateTermsAcceptance';
import { useReferralCode } from '../../../hooks/useReferralCode';
import { supabase } from '../../../lib/supabase';
import { calculateCardAmountWithFees, calculatePIXAmountWithFees, getExchangeRate } from '../../../utils/stripeFeeCalculator';
import { StepProps } from '../types';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { IdentityPhotoUpload } from '../../../components/IdentityPhotoUpload';
import { useStudentLogs } from '../../../hooks/useStudentLogs';
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

// Componente para o logo do Stripe (estilo S logo)
const StripeIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-[#635bff] rounded-lg overflow-hidden shadow-sm shadow-[#635bff]/20`}>
    <span 
      className="text-white font-black text-[28px] leading-[0] select-none"
      style={{ 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transform: 'translateY(-1.5px)' // Puxando para cima para compensar o peso da fonte
      }}
    >
      S
    </span>
  </div>
);

const ParcelowIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg overflow-hidden p-0.5 shadow-sm border border-gray-100`}>
    <img 
      src="/parcelow_share.webp" 
      alt="Parcelow" 
      className="w-full h-full object-contain scale-110" 
    />
  </div>
);

// Terms view component for mobile drawer
const MobileTermsView: React.FC<{
  activeTerm: Term | null;
  loadingTerms: boolean;
  hasScrolledToBottom: boolean;
  termsContentRef: React.RefObject<HTMLDivElement>;
  handleTermsScroll: () => void;
  handleTermsAccept: () => void;
  setShowTermsInDrawer: (value: boolean) => void;
  identityPhotoPath: string | null;
  setIdentityPhotoPath: (path: string | null) => void;
  setIdentityPhotoName: (name: string | null) => void;
  userId: string | undefined;
  studentId: string | undefined;
  logAction: any;
  t: any;
}> = ({
  activeTerm,
  loadingTerms,
  hasScrolledToBottom,
  termsContentRef,
  handleTermsScroll,
  handleTermsAccept,
  setShowTermsInDrawer,
  identityPhotoPath,
  setIdentityPhotoPath,
  setIdentityPhotoName,
  userId,
  studentId,
  logAction,
  t
}) => {
  const [page, setPage] = React.useState<'terms' | 'selfie'>('terms');

  return (
  <div className="space-y-4 bg-white min-h-full flex flex-col">
    {/* Header */}
    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
      <button
        onClick={() => {
          if (page === 'selfie') {
            setPage('terms');
          } else {
            setShowTermsInDrawer(false);
          }
        }}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>
      <h3 className="text-lg font-semibold text-gray-900">
        {page === 'selfie'
          ? 'Verificação de Identidade'
          : (activeTerm ? activeTerm.title : t('preCheckoutModal.termsAndConditions.title'))
        }
      </h3>
    </div>

    {/* PAGE 1: Terms Content */}
    {page === 'terms' && (
      <>
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
              className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 mb-6"
              dangerouslySetInnerHTML={{ __html: activeTerm.content }}
            />


            <div className="border-t border-gray-200 bg-gray-50 p-4 -mx-4 -mb-4 rounded-b-2xl mt-4">
              <button
                onClick={() => setPage('selfie')}
                disabled={!hasScrolledToBottom}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
                  hasScrolledToBottom
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {hasScrolledToBottom
                  ? t('preCheckoutModal.confirmReading') || 'Confirmar Leitura'
                  : t('preCheckoutModal.scrollToBottomFirst')
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
      </>
    )}

    {/* PAGE 2: Selfie Upload */}
    {page === 'selfie' && (
      <>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-2xl pt-1 pb-4 px-4 sm:pt-2 sm:pb-6 sm:px-6 border border-gray-100 shadow-sm">
            <div className="text-center mb-3">
              <h4 className="text-xl font-black text-gray-900 mb-1 uppercase tracking-tight">
                Verificação de Identidade
              </h4>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                Para finalizar a aceitação dos termos, precisamos verificar sua identidade.
              </p>
            </div>

            <IdentityPhotoUpload
              initialPhotoPath={identityPhotoPath || undefined}
              onUploadSuccess={async (filePath, fileName) => {
                setIdentityPhotoPath(filePath);
                setIdentityPhotoName(fileName);
                if (logAction && studentId && userId) {
                  try {
                    await logAction(
                      'identity_photo_upload',
                      `Identity photo uploaded by student during terms acceptance`,
                      userId,
                      'student',
                      {
                        student_id: studentId,
                        file_path: filePath,
                        file_name: fileName,
                        uploaded_at: new Date().toISOString(),
                        term_id: activeTerm?.id
                      }
                    );
                  } catch (logError) {
                    console.error('⚠️ [SelectionFeeStep] Erro ao logar upload de foto:', logError);
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
            />
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-4 -mx-4 -mb-4 rounded-b-2xl mt-4">
          <button
            onClick={handleTermsAccept}
            disabled={!identityPhotoPath}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
              identityPhotoPath
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {t('preCheckoutModal.acceptTerms') || 'Aceitar e Confirmar'}
          </button>
        </div>
      </>
    )}
  </div>
  );
};

export const SelectionFeeStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);
  const { isBlocked, pendingPayment, loading: paymentBlockedLoading, refetch: refetchPaymentStatus } = usePaymentBlocked();
  const { recordTermAcceptance, checkTermAcceptance } = useTermsAcceptance();
  const { recordAffiliateTermAcceptance, checkIfUserHasAffiliate } = useAffiliateTermsAcceptance();
  const { activeDiscount, hasUsedReferralCode } = useReferralCode();
  const { logAction } = useStudentLogs(userProfile?.id || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [zellePaymentSubmitted, setZellePaymentSubmitted] = useState(false);
  const [isZelleProcessing, setIsZelleProcessing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Terms acceptance states
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasAcceptedTermsInDB, setHasAcceptedTermsInDB] = useState(false); // Flag para indicar se já aceitou no banco
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTermsInDrawer, setShowTermsInDrawer] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [userClickedCheckbox, setUserClickedCheckbox] = useState(false);
  const [termsModalPage, setTermsModalPage] = useState<'terms' | 'selfie'>('terms');
  const termsContentRef = useRef<HTMLDivElement>(null);

  // Identity Photo States
  const [identityPhotoPath, setIdentityPhotoPath] = useState<string | null>(null);
  const [identityPhotoName, setIdentityPhotoName] = useState<string | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Exchange rate for PIX
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

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
  
  // CPF validation modal state
  const [showCpfModal, setShowCpfModal] = useState<boolean>(false);
  const [codeApplied, setCodeApplied] = useState(false);

  // Promotional coupon states (admin coupons)
  const [promotionalCoupon, setPromotionalCoupon] = useState('');
  const [isValidatingPromotionalCoupon, setIsValidatingPromotionalCoupon] = useState(false);
  const [promotionalCouponValidation, setPromotionalCouponValidation] = useState<{
    isValid: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
    couponId?: string;
  } | null>(null);
  const promotionalCouponInputRef = useRef<HTMLInputElement>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Buscar taxa de câmbio para PIX
  useEffect(() => {
    getExchangeRate().then(rate => {
      setExchangeRate(rate);
      console.log('[SelectionFeeStep] Taxa de câmbio obtida:', rate);
    }).catch(error => {
      console.error('[SelectionFeeStep] Erro ao buscar taxa de câmbio:', error);
      setExchangeRate(5.6); // Fallback
    });
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


  // After terms content renders in the modal, check if the container actually needs scroll.
  // We wait for the next animation frame + a small delay to ensure the HTML content
  // (injected via dangerouslySetInnerHTML) has fully painted before measuring.
  useEffect(() => {
    if (!showTermsModal || loadingTerms || !activeTerm || termsModalPage !== 'terms') return;

    let raf: number;
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(() => {
        if (termsContentRef.current) {
          const { scrollHeight, clientHeight } = termsContentRef.current;
          // Only auto-allow if content genuinely fits without scrolling
          if (scrollHeight <= clientHeight) {
            setHasScrolledToBottom(true);
          }
        }
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [showTermsModal, loadingTerms, activeTerm, termsModalPage]);

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
    setTermsModalPage('terms');
  };

  // Handle terms acceptance
  const handleTermsAccept = async () => {
    if (hasScrolledToBottom) {
      // Validate identity photo
      if (!identityPhotoPath) {
        alert(t('preCheckoutModal.uploadPhotoRequired') || 'Por favor, envie uma selfie com seu documento para continuar.');
        return;
      }

      try {
        if (activeTerm) {
          const affiliateAdminId = await checkIfUserHasAffiliate();
          
          if (affiliateAdminId) {
            await recordAffiliateTermAcceptance(activeTerm.id, 'checkout_terms', affiliateAdminId);
          } else {
            await recordTermAcceptance(activeTerm.id, 'checkout_terms');
          }

          // Save identity photo to the acceptance record
          const { data: termAcceptance } = await supabase
            .from('comprehensive_term_acceptance')
            .select('id')
            .eq('user_id', user?.id)
            .eq('term_id', activeTerm.id)
            .eq('term_type', 'checkout_terms')
            .order('accepted_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (termAcceptance) {
            await supabase
              .from('comprehensive_term_acceptance')
              .update({
                identity_photo_path: identityPhotoPath,
                identity_photo_name: identityPhotoName,
                identity_photo_status: 'pending'
              })
              .eq('id', termAcceptance.id);
          }

          // Log the action is handled by the upload component
        }
        
        setTermsAccepted(true);
        setHasAcceptedTermsInDB(true); // Mark as accepted in DB
        
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
  /* 
  const checkReferralCodeUsage = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      if (activeDiscount?.has_discount) {
        return;
      }

      const { data, error } = await supabase
        .from('used_referral_codes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!error && data && data.length > 0) {
        return;
      }
    } catch (error) {
      console.error('Error checking referral code usage:', error);
    }
  }, [user?.id, activeDiscount]);
  */

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

  // Restaurar cupom promocional aplicado (quando volta do checkout)
  useEffect(() => {
    const restorePromotionalCoupon = async () => {
      if (!user?.id) return;
      
      try {
        console.log('[SelectionFeeStep] Buscando cupom promocional aplicado...');
        
        const { data: couponRecords, error } = await supabase
          .from('promotional_coupon_usage')
          .select('*')
          .eq('user_id', user.id)
          .eq('fee_type', 'selection_process')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[SelectionFeeStep] Erro ao buscar cupom promocional:', error);
          return;
        }

        // Filtrar apenas registros de validação (não pagamentos confirmados)
        const validationRecords = (couponRecords || []).filter(record => {
          const isValidationPayment = record.payment_id?.startsWith('validation_');
          const isValidationMetadata = record.metadata?.is_validation === true;
          return isValidationPayment || isValidationMetadata;
        });

        if (validationRecords && validationRecords.length > 0) {
          const latestRecord = validationRecords[0];
          console.log('[SelectionFeeStep] ✅ Cupom promocional encontrado, restaurando:', latestRecord.coupon_code);
          
          // Restaurar estado do cupom
          setPromotionalCoupon(latestRecord.coupon_code);
          setPromotionalCouponValidation({
            isValid: true,
            message: `Coupon ${latestRecord.coupon_code} applied! You saved $${latestRecord.discount_amount?.toFixed(2)}`,
            discountAmount: latestRecord.discount_amount,
            finalAmount: latestRecord.final_amount,
            couponId: latestRecord.coupon_id
          });
          
          // Salvar no window para checkout
          (window as any).__checkout_promotional_coupon = latestRecord.coupon_code;
          (window as any).__checkout_final_amount = latestRecord.final_amount;
          
          console.log('[SelectionFeeStep] Estado do cupom promocional restaurado com sucesso');
        } else {
          console.log('[SelectionFeeStep] Nenhum cupom promocional válido encontrado');
        }
      } catch (error) {
        console.error('[SelectionFeeStep] Erro ao restaurar cupom promocional:', error);
      }
    };

    restorePromotionalCoupon();
  }, [user?.id]);

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

  // Função para validar cupom promocional (admin coupons)
  const validatePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim()) {
      setPromotionalCouponValidation({
        isValid: false,
        message: 'Please enter a coupon code'
      });
      return;
    }

    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    const normalizedFeeType = 'selection_process';
    
    setIsValidatingPromotionalCoupon(true);
    setPromotionalCouponValidation(null);

    try {
      const { data: result, error } = await supabase.rpc('validate_and_apply_admin_promotional_coupon', {
        p_code: normalizedCode,
        p_fee_type: normalizedFeeType,
        p_user_id: user?.id
      });

      if (error) {
        console.error('[SelectionFeeStep] Erro RPC:', error);
        throw error;
      }

      if (!result || !result.valid) {
        setPromotionalCouponValidation({
          isValid: false,
          message: result?.message || 'Invalid coupon code'
        });
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (result.discount_type === 'percentage') {
        discountAmount = (selectionFeeAmount * result.discount_value) / 100;
      } else {
        discountAmount = result.discount_value;
      }
      
      discountAmount = Math.min(discountAmount, selectionFeeAmount);
      const finalAmount = Math.max(0, selectionFeeAmount - discountAmount);

      const validationData = {
        isValid: true,
        message: `Coupon ${normalizedCode} applied! You saved $${discountAmount.toFixed(2)}`,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        couponId: result.id
      };
      
      setPromotionalCouponValidation(validationData);
      
      // ✅ Registrar uso do cupom no banco de dados via Edge Function
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (token) {
          console.log('[SelectionFeeStep] Registrando uso do cupom promocional...');
          const recordResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-promotional-coupon-validation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              coupon_code: normalizedCode,
              coupon_id: result.id,
              fee_type: 'selection_process',
              original_amount: selectionFeeAmount,
              discount_amount: discountAmount,
              final_amount: finalAmount
            }),
          });

          const recordResult = await recordResponse.json();
          if (recordResult.success) {
            console.log('[SelectionFeeStep] ✅ Uso do cupom registrado com sucesso!');
          } else {
            console.warn('[SelectionFeeStep] ⚠️ Aviso: Não foi possível registrar o uso do cupom:', recordResult.error);
          }
        }
      } catch (recordError) {
        console.warn('[SelectionFeeStep] ⚠️ Aviso: Erro ao registrar uso do cupom:', recordError);
        // Não quebra o fluxo - continua normalmente mesmo se o registro falhar
      }
      
      // Salvar no window para checkout
      (window as any).__checkout_promotional_coupon = normalizedCode;
      (window as any).__checkout_final_amount = finalAmount;

    } catch (error: any) {
      console.error('[SelectionFeeStep] Erro ao validar cupom:', error);
      setPromotionalCouponValidation({
        isValid: false,
        message: 'Failed to validate coupon'
      });
    } finally {
      setIsValidatingPromotionalCoupon(false);
    }
  };

  // Função para remover cupom promocional aplicado
  const removePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim() || !user?.id) return;
    
    console.log('[SelectionFeeStep] Removendo cupom promocional...');
    
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
          fee_type: 'selection_process'
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        console.warn('[SelectionFeeStep] ⚠️ Aviso: Não foi possível remover o cupom do banco:', result.error);
        // Continuar mesmo se falhar no banco - remover localmente
      } else {
        console.log('[SelectionFeeStep] ✅ Cupom removido do banco com sucesso!');
      }
    } catch (error) {
      console.warn('[SelectionFeeStep] ⚠️ Aviso: Erro ao remover cupom do banco:', error);
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
    localStorage.removeItem('__promotional_coupon_selection_process');
    
    console.log('[SelectionFeeStep] Cupom removido com sucesso');
  };

  // Handle checkbox change
  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Se já aceitou os termos no banco, não permite desmarcar
    if (hasAcceptedTermsInDB && !e.target.checked) {
      e.preventDefault();
      return;
    }
    
    setUserClickedCheckbox(true);
    
    if (e.target.checked) {
      if (isMobile) {
        setShowTermsInDrawer(true);
        await loadActiveTerms();
      } else {
        handleTermsClick();
      }
    } else {
      // Só permite desmarcar se não foi aceito no banco ainda
      if (!hasAcceptedTermsInDB) {
        setTermsAccepted(false);
        setHasScrolledToBottom(false);
        setShowTermsModal(false);
        setShowTermsInDrawer(false);
      }
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
          setHasAcceptedTermsInDB(true); // Marcar que já foi aceito no banco
        }
      } catch (error) {
        console.error('Erro ao verificar aceitação de termos:', error);
      }
    };

    checkExistingAcceptance();
  }, [user?.id, checkTermAcceptance]);



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

  // Identificar se há um pagamento Zelle pendente ESPECÍFICO para Taxa de Seleção
  const hasZellePendingSelectionFee = isBlocked && pendingPayment?.fee_type === 'selection_process';



  const selectionFeeAmount = getFeeAmount('selection_process');

  // Calcular preço final com desconto
  const computedBasePrice = (() => {
    console.log('💰 [SelectionFeeStep] Calculando preço:', {
      selectionFeeAmount,
      activeDiscount,
      hasActiveDiscount: activeDiscount?.has_discount,
      validationResult,
      codeApplied,
      discountCode,
      promotionalCouponValidation
    });

    // 1. Cupom promocional tem prioridade
    if (promotionalCouponValidation?.isValid && promotionalCouponValidation.finalAmount !== undefined) {
      console.log('💰 [SelectionFeeStep] Aplicando cupom promocional:', { 
        finalAmount: promotionalCouponValidation.finalAmount 
      });
      return promotionalCouponValidation.finalAmount;
    }
    
    // 2. Depois verifica activeDiscount (referral code)
    if (activeDiscount?.has_discount) {
      // Se já tem desconto ativo, aplicar desconto
      const discount = activeDiscount.discount_amount || 50;
      const finalPrice = Math.max(selectionFeeAmount - discount, 0);
      console.log('💰 [SelectionFeeStep] Aplicando desconto via activeDiscount:', { discount, finalPrice });
      return finalPrice;
    }
    
    // 3. Código validado e aplicado
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

  // Calcular valores com taxas do Stripe/PIX para exibição
  const cardAmountWithFees = computedBasePrice > 0 ? calculateCardAmountWithFees(computedBasePrice) : 0;
  const pixAmountWithFees = computedBasePrice > 0 && exchangeRate ? calculatePIXAmountWithFees(computedBasePrice, exchangeRate) : 0;

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

  const handleCheckout = async (paymentMethod: 'stripe' | 'zelle' | 'pix' | 'parcelow') => {
    // Verificar CPF se o método for Parcelow
    if (paymentMethod === 'parcelow' && !userProfile?.cpf_document) {
      setShowCpfModal(true);
      return;
    }

    setLoading(true);
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

      // Stripe, PIX e Parcelow usam edge functions
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('User not authenticated');
      }

      // Determinar qual Edge Function chamar
      let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
      
      if (paymentMethod === 'parcelow') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-selection-process`;
      }
      
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

      // Preparar metadata - incluir taxa de câmbio para PIX (para garantir consistência entre frontend e backend)
      const metadata: any = {};
      if (paymentMethod === 'pix' && exchangeRate && exchangeRate > 0) {
        metadata.exchange_rate = exchangeRate.toString();
        console.log('[SelectionFeeStep] Incluindo taxa de câmbio no metadata para PIX:', exchangeRate);
      }

      const requestBody = {
        price_id: 'price_selection_process_fee',
        amount: computedBasePrice, // Usar valor com desconto
        payment_method: paymentMethod,
        success_url: `${window.location.origin}/student/onboarding?step=scholarship_selection&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/student/onboarding?step=selection_fee&payment=cancelled`,
        mode: 'payment',
        payment_type: 'selection_process',
        fee_type: 'selection_process',
        ...(discountCodeToSend && { discount_code: discountCodeToSend }),
        promotional_coupon: (window as any).__checkout_promotional_coupon || null,
        ...(Object.keys(metadata).length > 0 && { metadata })
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
      name: 'Cartão de Crédito',
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
      id: 'parcelow' as const,
      name: 'Parcelow',
      description: 'Pay with Credit Card in up to 12 installments',
      icon: ParcelowIcon
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
      <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center md:text-left space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Taxa do Processo Seletivo</h2>
          <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mt-2">Pagamento do processo seletivo concluído.</p>
        </div>

        {/* Main White Container */}
        <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="relative z-10 text-center py-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Taxa do Processo Seletivo Paga!</h3>
            <p className="text-gray-500 mb-8 font-medium">Você já realizou o pagamento da taxa do processo seletivo.</p>
            <button
              onClick={onNext}
              className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 pb-12">
      {/* Payment Section */}
      <div className="space-y-6">
        <div className="text-center md:text-left">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-3 uppercase tracking-tighter">
            Pagar Taxa do Processo Seletivo
          </h2>
          <p className="text-lg md:text-xl text-white/60 font-medium">
            Inicie seu processo pagando a taxa do processo seletivo
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-6 md:space-y-0 relative z-10">
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Taxa de Processo Seletivo</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Pagamento Único</p>
              </div>
            </div>
            <div className="text-left md:text-right">
              {computedBasePrice < selectionFeeAmount ? (
                <div className="flex flex-col md:items-end">
                  <div className="text-xl line-through text-gray-300 font-bold">{originalFormattedAmount}</div>
                  <div className="text-4xl md:text-5xl font-black text-emerald-500 tracking-tighter">{formattedAmount}</div>
                  <div className="inline-flex items-center bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full mt-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500 mr-2" />
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                      {promotionalCouponValidation?.isValid 
                        ? `Cupom ${promotionalCoupon} Aplicado!`
                        : 'Desconto de $50 Aplicado!'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">{formattedAmount}</div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100">
            <p className="text-sm md:text-base text-gray-600 leading-relaxed font-medium">
              Esta taxa cobre o processamento inicial da sua candidatura e permite que você prossiga com a seleção de bolsas de estudo em nossas universidades parceiras.
            </p>
          </div>

          {/* Matricula Rewards / Referral Code Section */}
          {/* Mostrar seção sempre, exceto se tiver seller_referral_code */}
          {!hasSellerReferralCode ? (
            <div className="mb-6 space-y-4">

              {/* Mostrar campo de código sempre */}
              {true && (
                <>
                  {/* Checkbox para perguntar se tem código - só aparece se não tem desconto ativo e não tem código aplicado */}
                  {!activeDiscount?.has_discount && !codeApplied && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
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
                    <div className="pt-4 flex flex-col xl:flex-row xl:justify-center gap-12">
                      {/* Referral Code (Left) */}
                      <div className="space-y-4 max-w-md w-full">
                        <div className="text-center">
                          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                            {hasReferralCode ? 'Código de Indicação' : (t('preCheckoutModal.referralCode') || 'Código de Referência')}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Use um código de indicação e ganhe $50 de desconto!
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1 group/input">
                              <input
                                type="text"
                                value={discountCode}
                                onChange={(e) => {
                                  if (!activeDiscount?.has_discount && !codeApplied) {
                                    setDiscountCode(e.target.value.toUpperCase());
                                  }
                                }}
                                placeholder={t('preCheckoutModal.placeholder') || 'Digite o código'}
                                readOnly={!!activeDiscount?.has_discount || !!hasAffiliateCode || codeApplied}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-center font-black text-gray-900 text-lg tracking-[0.2em] placeholder:text-gray-300"
                                maxLength={8}
                              />
                              {(activeDiscount?.has_discount || codeApplied) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500" />
                            </div>

                            {!activeDiscount?.has_discount && !hasAffiliateCode && !codeApplied && (
                              <button
                                onClick={validateDiscountCode}
                                disabled={isValidating || !discountCode.trim()}
                                className={`px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 whitespace-nowrap sm:w-auto w-full ${
                                  isValidating || !discountCode.trim()
                                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                                }`}
                              >
                                {isValidating ? (
                                  <div className="flex items-center space-x-2 justify-center">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>{t('preCheckoutModal.validating') || 'Validando...'}</span>
                                  </div>
                                ) : (
                                  'Validar'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {validationResult && !validationResult.isValid && (
                          <p className="text-sm text-red-600 text-center">
                            {validationResult.message}
                          </p>
                        )}
                      </div>

                      {/* Promotional Coupon (Right) */}
                      <div className="space-y-4 max-w-md w-full">
                        <div className="text-center">
                          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                            Cupom Promocional
                          </h3>
                          <p className="text-sm text-gray-600">
                            Tem um cupom promocional? Aplique aqui para economizar ainda mais!
                          </p>
                        </div>

                        <div className="space-y-3">
                          {promotionalCouponValidation?.isValid ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-inner relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
                              
                              <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Cupom Aplicado</span>
                                    <span className="text-lg font-black text-gray-800 uppercase tracking-tight">{promotionalCoupon}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={removePromotionalCoupon}
                                  className="px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-gray-100 hover:border-red-100"
                                >
                                  Remover
                                </button>
                              </div>

                              <div className="space-y-3 pt-4 border-t border-gray-100 relative z-10">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                  <span>Preço Original:</span>
                                  <span className="line-through text-gray-300">
                                    ${selectionFeeAmount.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                  <span>Desconto:</span>
                                  <span className="text-emerald-500">
                                    -${promotionalCouponValidation.discountAmount?.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xl font-black uppercase tracking-tight pt-3 text-gray-900">
                                  <span>Total Final:</span>
                                  <span className="text-emerald-500">
                                    ${promotionalCouponValidation.finalAmount?.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1 group/input">
                                  <input
                                    ref={promotionalCouponInputRef}
                                    type="text"
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
                                    placeholder={t('preCheckoutModal.placeholder') || 'Digite o código'}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-center font-black text-gray-900 text-lg tracking-[0.2em] placeholder:text-gray-300"
                                    maxLength={20}
                                    autoComplete="off"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500" />
                                </div>
                                <button
                                  onClick={validatePromotionalCoupon}
                                  disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()}
                                  className={`px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 whitespace-nowrap sm:w-auto w-full ${
                                    isValidatingPromotionalCoupon || !promotionalCoupon.trim()
                                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                                  }`}
                                >
                                  {isValidatingPromotionalCoupon ? (
                                    <div className="flex items-center justify-center space-x-2">
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                      <span>Validando...</span>
                                    </div>
                                  ) : (
                                    'Validar'
                                  )}
                                </button>
                              </div>
                              
                              {promotionalCouponValidation && !promotionalCouponValidation.isValid && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 backdrop-blur-md">
                                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                  <span className="text-sm text-red-400 font-medium">{promotionalCouponValidation.message}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}



          {/* Terms acceptance section */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-100 rounded-lg group/terms hover:bg-gray-100/50 transition-colors duration-300 shadow-sm">
              <label htmlFor="termsAccepted" className={`checkbox-container ${hasAcceptedTermsInDB ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} flex-shrink-0`}>
                <input
                  id="termsAccepted"
                  name="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={handleCheckboxChange}
                  disabled={hasAcceptedTermsInDB}
                  className="custom-checkbox"
                />
                <div className="checkmark border-gray-300" />
              </label>
              <label htmlFor="termsAccepted" className={`text-xs sm:text-sm text-gray-600 leading-relaxed flex-1 ${hasAcceptedTermsInDB ? 'cursor-default' : 'cursor-pointer'} group-hover/terms:text-gray-900 transition-colors`}>
                <span className="text-red-500 font-bold mr-1">*</span>
                {t('preCheckoutModal.acceptContractTerms') || 'Eu aceito os termos e condições do contrato de prestação de serviços.'}
              </label>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Skeleton Loading enquanto verifica pagamentos pendentes */}
          {/* Condicional Principal: Loading -> Zelle -> Lista de Métodos */}
          {/* Condicional Principal: Loading -> Zelle Bloqueado -> Lista de Métodos */}
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
          ) : hasZellePendingSelectionFee ? (
            <div className="flex flex-col gap-0">
              {/* Banner de aviso âmbar */}
              <div className="bg-amber-50 border border-amber-200 rounded-t-[2rem] px-6 py-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-700 uppercase tracking-tight">Pagamento Zelle em Análise</p>
                  <p className="text-xs text-amber-600/80 font-medium mt-0.5 leading-relaxed">
                    Você já iniciou um pagamento via Zelle para esta taxa. Aguarde a confirmação antes de tentar outro método. Isso pode levar até 48 horas.
                  </p>
                </div>
              </div>

              {/* ZelleCheckout inline — aberto automaticamente */}
              <div className="border border-amber-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                <ZelleCheckout
                  feeType="selection_process"
                  amount={computedBasePrice}
                  scholarshipsIds={[]}
                  metadata={{
                    discount_applied: computedBasePrice < selectionFeeAmount,
                    original_amount: selectionFeeAmount,
                    final_amount: computedBasePrice,
                    ...(activeDiscount?.has_discount && activeDiscount.affiliate_code ? { discount_code: activeDiscount.affiliate_code } : {}),
                    ...(validationResult?.isValid && codeApplied && discountCode.trim() ? { discount_code: discountCode.trim().toUpperCase() } : {}),
                    promotional_coupon: (window as any).__checkout_promotional_coupon || null
                  }}
                  onSuccess={() => {
                    console.log('✅ [SelectionFeeStep] Pagamento Zelle aprovado');
                    setZellePaymentSubmitted(false);
                    setShowZelleCheckout(false);
                    setIsZelleProcessing(false);
                    onNext(); 
                  }}
                  onError={(error) => {
                    setError(error);
                    setZellePaymentSubmitted(false);
                    setIsZelleProcessing(false);
                  }}
                  onProcessingChange={(isProcessing) => {
                    setIsZelleProcessing(isProcessing);
                    if (isProcessing) refetchPaymentStatus();
                  }}
                />
              </div>
            </div>
          ) : showZelleCheckout ? (
            <div className="space-y-6 bg-white border border-gray-100 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
              <div className="flex items-center justify-between mb-2 relative z-10">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Pagamento Zelle</h3>
                
                {!isZelleProcessing && (
                  <button
                    onClick={() => {
                      setShowZelleCheckout(false);
                      setSelectedMethod(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                  >
                    <X className="w-5 h-5" />
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
                  ...(validationResult?.isValid && codeApplied && discountCode.trim() ? { discount_code: discountCode.trim().toUpperCase() } : {}),
                  promotional_coupon: (window as any).__checkout_promotional_coupon || null
                }}
                onSuccess={() => {
                  console.log('✅ [SelectionFeeStep] Pagamento Zelle aprovado');
                  setZellePaymentSubmitted(false);
                  setShowZelleCheckout(false);
                  setIsZelleProcessing(false);
                  onNext(); 
                }}
                onError={(error) => {
                  setError(error);
                  setZellePaymentSubmitted(false);
                  setIsZelleProcessing(false);
                }}
                onProcessingChange={(isProcessing) => {
                  setIsZelleProcessing(isProcessing);
                  if (isProcessing) refetchPaymentStatus();
                }}
              />
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              {!!isBlocked && !!pendingPayment && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 backdrop-blur-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-amber-500 uppercase tracking-tight mb-1">
                        Pagamento em Processamento
                      </p>
                      <p className="text-xs text-white/60 font-medium">
                        Você já tem um pagamento via Zelle sendo processado. Por favor, aguarde a revisão antes de tentar outro método.
                      </p>
                    </div>
                  </div>
                </div>
              )}
               
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Selecione o método de pagamento:</p>
               
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                const isProcessing = loading && isSelected;
                const isDisabled = !!loading || 
                  !termsAccepted || 
                  (hasReferralCode && !(validationResult?.isValid) && !activeDiscount?.has_discount) ||
                  (!!isBlocked && !!pendingPayment && method.id !== 'zelle');
                
                return (
                  <button
                    key={method.id}
                    onClick={() => handleCheckout(method.id)}
                    disabled={isDisabled}
                    className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group/method ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'}`}
                  >
                    <div className="flex items-center space-x-5 relative z-10">
                      <div className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-white border border-gray-100 transition-transform duration-500 group-hover/method:scale-110 shadow-sm`}>
                        <Icon className="w-10 h-10 text-gray-700" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                {method.name}
                              </h4>
                              {method.id === 'stripe' && (
                                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide leading-tight">* Podem incluir taxas de processamento</span>
                              )}
                              {method.id === 'pix' && (
                                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide leading-tight">* Podem incluir taxas de processamento</span>
                              )}
                              {method.id === 'parcelow' && (
                                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide leading-tight max-w-[200px] sm:max-w-none">* Podem incluir taxas de operadora e processamento da plataforma</span>
                              )}
                              {method.id === 'zelle' && (
                                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide leading-tight flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  Processamento pode levar até 48 horas
                                </span>
                              )}
                            </div>

                          <div className="flex items-center gap-3">
                            {method.id === 'stripe' && cardAmountWithFees > 0 && (
                              <span className="text-black text-lg font-black px-2">
                                ${cardAmountWithFees.toFixed(2)}
                              </span>
                            )}
                            {method.id === 'parcelow' && computedBasePrice > 0 && (
                              <div className="flex flex-col items-end">
                                 <span className="text-black text-lg font-black px-2">
                                   ${computedBasePrice.toFixed(2)}
                                 </span>
                                <span className="text-xs font-bold text-black mt-1 whitespace-nowrap">
                                  Até 12x no cartão
                                </span>
                              </div>
                            )}
                            {method.id === 'pix' && pixAmountWithFees > 0 && exchangeRate && (
                               <span className="text-black text-lg font-black px-2">
                                 R$ {pixAmountWithFees.toFixed(2)}
                               </span>
                            )}
                            {method.id === 'zelle' && computedBasePrice > 0 && (
                               <span className="text-black text-lg font-black px-2">
                                 ${computedBasePrice.toFixed(2)}
                               </span>
                            )}
                            
                            {isProcessing && (
                              <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                            )}
                            {isSelected && !loading && (
                              <div className="bg-blue-500 rounded-full p-1 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>

                        {isDisabled && !!isBlocked && !!pendingPayment && method.id !== 'zelle' && (
                          <div className="mt-3 flex items-center space-x-2 bg-amber-50 border border-amber-100 w-fit px-2 py-1 rounded-lg">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">
                              Indisponível - Zelle em processamento
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
        </div>
      </div>

      {/* Terms and Conditions Modal for desktop */}
      {showTermsModal && userClickedCheckbox && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <Dialog open={showTermsModal} onClose={() => setShowTermsModal(false)} className="relative z-[10021]">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10020]" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[10020]">
              <Dialog.Panel className="w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden relative max-h-[90dvh] flex flex-col">
                <div className="relative bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-indigo-800/90 text-white p-6 sm:p-8 flex-shrink-0 border-b border-white/10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                  
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="absolute top-4 right-4 p-2.5 hover:bg-white/20 rounded-2xl transition-all duration-300 group/close z-50"
                    title={t('preCheckoutModal.closeTerms') || 'Close'}
                  >
                    <X className="w-6 h-6 group-hover/close:rotate-90 transition-transform duration-500" />
                  </button>
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div>
                      <Dialog.Title className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">
                        {activeTerm?.title ? activeTerm.title : t('preCheckoutModal.termsAndConditions.title')}
                      </Dialog.Title>
                      <p className="text-blue-100/60 text-xs font-bold uppercase tracking-widest mt-1">Contrato de Prestação de Serviços</p>
                    </div>
                  </div>
                </div>

                {/* PAGE 1: Terms Content */}
                {termsModalPage === 'terms' && (
                  <div
                    ref={termsContentRef}
                    onScroll={handleTermsScroll}
                    className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
                  >
                    {loadingTerms ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{t('preCheckoutModal.loading')}</p>
                      </div>
                    ) : activeTerm ? (
                      <>
                        <div 
                          className="prose prose-blue max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-gray-600 prose-p:leading-relaxed prose-strong:text-gray-900"
                          dangerouslySetInnerHTML={{ __html: activeTerm?.content || '' }}
                        />
                        

                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">{t('preCheckoutModal.noTermsFound')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* PAGE 2: Selfie Upload */}
                {termsModalPage === 'selfie' && (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="max-w-3xl mx-auto">
                      <div className="bg-gray-50 rounded-3xl pt-2 pb-6 px-6 sm:pt-4 sm:pb-10 sm:px-10 border border-gray-100 shadow-sm">
                        <div className="text-center mb-4">
                          <h4 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">
                            Verificação de Identidade
                          </h4>
                          <p className="text-base text-gray-600 font-medium">
                            Para finalizar a aceitação dos termos, precisamos verificar sua identidade.
                          </p>
                        </div>

                        <IdentityPhotoUpload
                          initialPhotoPath={identityPhotoPath || undefined}
                          onUploadSuccess={async (filePath, fileName) => {
                            setIdentityPhotoPath(filePath);
                            setIdentityPhotoName(fileName);
                            if (logAction && userProfile?.id && user?.id) {
                              try {
                                await logAction(
                                  'identity_photo_upload',
                                  `Identity photo uploaded by student during terms acceptance (desktop)`,
                                  user.id,
                                  'student',
                                  {
                                    student_id: userProfile.id,
                                    file_path: filePath,
                                    file_name: fileName,
                                    uploaded_at: new Date().toISOString(),
                                    term_id: activeTerm?.id
                                  }
                                );
                              } catch (logError) {
                                console.error('⚠️ [SelectionFeeStep] Erro ao logar upload de foto:', logError);
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
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 bg-gray-50/80 backdrop-blur-md p-6 sm:p-8 flex-shrink-0">
                  <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                    {termsModalPage === 'terms' ? (
                      <>
                        <button
                          onClick={() => setShowTermsModal(false)}
                          className="flex-[1] px-8 py-4 bg-gray-200/50 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all active:scale-95"
                        >
                          {t('preCheckoutModal.closeTerms') || 'Fechar'}
                        </button>
                        <button
                          onClick={() => setTermsModalPage('selfie')}
                          disabled={!hasScrolledToBottom}
                          className={`flex-[2] px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 ${
                            hasScrolledToBottom
                              ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/25 hover:shadow-blue-500/40'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-100'
                          }`}
                        >
                          {hasScrolledToBottom
                            ? t('preCheckoutModal.confirmReading') || 'Confirmar Leitura'
                            : t('preCheckoutModal.scrollToBottomFirst')
                          }
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setTermsModalPage('terms')}
                          className="flex-[1] px-8 py-4 bg-gray-200/50 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all active:scale-95"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={handleTermsAccept}
                          disabled={!identityPhotoPath}
                          className={`flex-[2] px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 ${
                            identityPhotoPath
                              ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/25 hover:shadow-blue-500/40'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-100'
                          }`}
                        >
                          {t('preCheckoutModal.acceptTerms') || 'Aceitar e Confirmar'}
                        </button>
                      </>
                    )}
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
                setShowTermsInDrawer={setShowTermsInDrawer}
                activeTerm={activeTerm}
                loadingTerms={loadingTerms}
                hasScrolledToBottom={hasScrolledToBottom}
                termsContentRef={termsContentRef}
                handleTermsScroll={handleTermsScroll}
                handleTermsAccept={handleTermsAccept}
                identityPhotoPath={identityPhotoPath}
                setIdentityPhotoPath={setIdentityPhotoPath}
                setIdentityPhotoName={setIdentityPhotoName}
                userId={user?.id}
                studentId={userProfile?.id}
                logAction={logAction}
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
      {/* Modal de Aviso de CPF necessário para Parcelow */}
      <Dialog
        open={showCpfModal}
        onClose={() => setShowCpfModal(false)}
        className="relative z-[100]"
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
                {t('scholarshipDeadline.parcelowCpfModal.title')}
              </Dialog.Title>
              <Dialog.Description className="text-gray-600 mb-6">
                {t('scholarshipDeadline.parcelowCpfModal.description')}
              </Dialog.Description>
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => {
                    setShowCpfModal(false);
                    navigate('/student/dashboard/profile');
                  }}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                >
                  {t('scholarshipDeadline.parcelowCpfModal.confirm')}
                </button>
                <button
                  onClick={() => setShowCpfModal(false)}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  {t('scholarshipDeadline.parcelowCpfModal.cancel')}
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

