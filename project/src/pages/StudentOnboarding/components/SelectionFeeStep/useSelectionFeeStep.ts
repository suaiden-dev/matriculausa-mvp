import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../hooks/useAuth';
import { useFeeConfig } from '../../../../hooks/useFeeConfig';
import { usePaymentBlocked } from '../../../../hooks/usePaymentBlocked';
import { useTermsAcceptance } from '../../../../hooks/useTermsAcceptance';
import { useAffiliateTermsAcceptance } from '../../../../hooks/useAffiliateTermsAcceptance';
import { useReferralCode } from '../../../../hooks/useReferralCode';
import { useStudentLogs } from '../../../../hooks/useStudentLogs';
import { supabase } from '../../../../lib/supabase';
import { calculateCardAmountWithFees, calculatePIXAmountWithFees, getExchangeRate } from '../../../../utils/stripeFeeCalculator';
import { Term, PaymentMethod, ValidationResult, PromotionalCouponValidation } from './types';

export const useSelectionFeeStep = (onNext: () => void) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);
  const {
    isBlocked, pendingPayment, rejectedPayment, approvedPayment,
    loading: paymentBlockedLoading, refetch: refetchPaymentStatus,
  } = usePaymentBlocked();
  const { recordTermAcceptance, checkTermAcceptance } = useTermsAcceptance();
  const { recordAffiliateTermAcceptance, checkIfUserHasAffiliate } = useAffiliateTermsAcceptance();
  const { activeDiscount, hasUsedReferralCode } = useReferralCode();
  useStudentLogs(userProfile?.id || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showZelleCheckout, setShowZelleCheckout] = useState(false);
  const [zellePaymentSubmitted, setZellePaymentSubmitted] = useState(false);
  const [isZelleProcessing, setIsZelleProcessing] = useState(false);
  const hasProcessedApproval = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasAcceptedTermsInDB, setHasAcceptedTermsInDB] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTermsInDrawer, setShowTermsInDrawer] = useState(false);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);

  // Exchange rate for PIX
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Referral code
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [showCodeStep, setShowCodeStep] = useState(false);
  const [showCpfModal, setShowCpfModal] = useState<boolean>(false);
  const [codeApplied, setCodeApplied] = useState(false);

  // Parcelow CPF inline
  const [showInlineCpf, setShowInlineCpf] = useState(false);
  const [inlineCpf, setInlineCpf] = useState('');
  const [savingCpf, setSavingCpf] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);

  // Promotional coupon
  const [promotionalCoupon, setPromotionalCoupon] = useState('');
  const [isValidatingPromotionalCoupon, setIsValidatingPromotionalCoupon] = useState(false);
  const [promotionalCouponValidation, setPromotionalCouponValidation] = useState<PromotionalCouponValidation | null>(null);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    getExchangeRate()
      .then(rate => setExchangeRate(rate))
      .catch(() => setExchangeRate(5.6));
  }, []);

  useEffect(() => {
    if (approvedPayment && approvedPayment.fee_type === 'selection_process' && !hasProcessedApproval.current) {
      hasProcessedApproval.current = true;
      const proceed = async () => {
        await refetchUserProfile();
        setZellePaymentSubmitted(false);
        setShowZelleCheckout(false);
        onNext();
      };
      proceed();
    }
  }, [approvedPayment, refetchUserProfile, onNext]);

  useEffect(() => {
    if (paymentBlockedLoading) return;
    if (isBlocked && pendingPayment) {
      setIsZelleProcessing(true);
      setShowZelleCheckout(true);
      setSelectedMethod('zelle');
    }
  }, [isBlocked, pendingPayment, paymentBlockedLoading]);

  useEffect(() => {
    const checkExistingAcceptance = async () => {
      if (!user?.id) return;
      try {
        const hasAccepted = await checkTermAcceptance('checkout_terms');
        if (hasAccepted) {
          setTermsAccepted(true);
          setHasAcceptedTermsInDB(true);
        }
      } catch (e) {
        console.error('Erro ao verificar aceitação de termos:', e);
      }
    };
    checkExistingAcceptance();
  }, [user?.id, checkTermAcceptance]);

  useEffect(() => {
    if (activeDiscount?.has_discount && activeDiscount.affiliate_code) {
      setDiscountCode(activeDiscount.affiliate_code);
      setCodeApplied(true);
      setHasReferralCode(true);
      setShowCodeStep(true);
      setValidationResult({
        isValid: true,
        message: t('preCheckoutModal.validCode') || 'Valid code! $50 discount applied',
        discountAmount: activeDiscount.discount_amount || 50,
      });
    }
  }, [activeDiscount?.has_discount, activeDiscount?.affiliate_code, activeDiscount?.discount_amount, t]);

  const hasAffiliateCode = userProfile?.affiliate_code && userProfile.affiliate_code.trim() !== '';

  const validateDiscountCodeForPrefill = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setIsValidating(true);
    try {
      const { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes')
        .select('user_id, code, is_active')
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (affiliateError || !affiliateCodeData) {
        setValidationResult({ isValid: false, message: t('preCheckoutModal.invalidCode') || 'Invalid code' });
        return;
      }
      if (affiliateCodeData.user_id === user?.id) {
        setValidationResult({ isValid: false, message: t('preCheckoutModal.selfReferral') || 'Self-referral not allowed', isSelfReferral: true });
        return;
      }
      if (hasUsedReferralCode && !activeDiscount?.has_discount) {
        setValidationResult({ isValid: false, message: t('preCheckoutModal.alreadyUsedCode') || 'Code already used' });
        return;
      }

      if (!user?.id || !user?.email) throw new Error('User not authenticated');
      const { data: result, error: rpcError } = await supabase.rpc('validate_and_apply_referral_code', {
        user_id_param: user.id,
        affiliate_code_param: code.trim().toUpperCase(),
        email_param: user.email,
      });
      if (rpcError || !result?.success) {
        setValidationResult({ isValid: false, message: result?.error || t('preCheckoutModal.errorValidating') || 'Error' });
        return;
      }
      setValidationResult({ isValid: true, message: t('preCheckoutModal.validCode') || 'Valid code! $50 discount applied', discountAmount: 50 });
      setCodeApplied(true);
    } catch (e) {
      setValidationResult({ isValid: false, message: t('preCheckoutModal.errorValidating') || 'Error validating code' });
    } finally {
      setIsValidating(false);
    }
  }, [user?.id, hasUsedReferralCode, activeDiscount, t]);

  useEffect(() => {
    const fetchUsedCode = async () => {
      if (!user?.id || activeDiscount?.has_discount || (discountCode && codeApplied)) return;
      try {
        let { data, error } = await supabase
          .from('used_referral_codes')
          .select('affiliate_code, discount_amount, status')
          .eq('user_id', user.id)
          .eq('status', 'applied')
          .order('applied_at', { ascending: false })
          .limit(1);

        if (!error && (!data || data.length === 0)) {
          const { data: anyStatusData, error: anyStatusError } = await supabase
            .from('used_referral_codes')
            .select('affiliate_code, discount_amount, status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!anyStatusError && anyStatusData && anyStatusData.length > 0) {
            data = anyStatusData;
            error = null;
          }
        }

        if (!error && data && data.length > 0 && data[0]?.affiliate_code) {
          const usedCode = data[0];
          setDiscountCode(usedCode.affiliate_code);
          setCodeApplied(true);
          setHasReferralCode(true);
          setShowCodeStep(true);
          setValidationResult({ isValid: true, message: t('preCheckoutModal.validCode') || 'Valid code!', discountAmount: usedCode.discount_amount || 50 });
        }
      } catch (e) {
        console.error('Erro ao buscar código usado:', e);
      }
    };
    fetchUsedCode();
  }, [user?.id, activeDiscount?.has_discount, activeDiscount?.affiliate_code, discountCode, codeApplied, t]);

  useEffect(() => {
    if (hasAffiliateCode && userProfile?.affiliate_code && !activeDiscount?.has_discount) {
      setDiscountCode(userProfile.affiliate_code);
      setHasReferralCode(true);
      setShowCodeStep(true);
      setTimeout(() => {
        if (userProfile.affiliate_code) validateDiscountCodeForPrefill(userProfile.affiliate_code);
      }, 100);
    }
  }, [hasAffiliateCode, userProfile?.affiliate_code, validateDiscountCodeForPrefill, activeDiscount?.has_discount]);

  useEffect(() => {
    const restorePromotionalCoupon = async () => {
      if (!user?.id) return;
      try {
        const { data: couponRecords, error } = await supabase
          .from('promotional_coupon_usage')
          .select('*')
          .eq('user_id', user.id)
          .eq('fee_type', 'selection_process')
          .order('created_at', { ascending: false });

        if (error) return;
        const validationRecords = (couponRecords || []).filter(r =>
          r.payment_id?.startsWith('validation_') || r.metadata?.is_validation === true
        );
        if (validationRecords.length > 0) {
          const latest = validationRecords[0];
          setPromotionalCoupon(latest.coupon_code);
          setPromotionalCouponValidation({
            isValid: true,
            message: `Coupon ${latest.coupon_code} applied!`,
            discountAmount: latest.discount_amount,
            finalAmount: latest.final_amount,
            couponId: latest.coupon_id,
          });
          (window as any).__checkout_promotional_coupon = latest.coupon_code;
          (window as any).__checkout_final_amount = latest.final_amount;
        }
      } catch (e) {
        console.error('Erro ao restaurar cupom:', e);
      }
    };
    restorePromotionalCoupon();
  }, [user?.id]);

  useEffect(() => {
    if (!zellePaymentSubmitted || !user?.id) {
      if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
      return;
    }
    let attempts = 0;
    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      await refetchUserProfile();
      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .select('has_paid_selection_process_fee')
        .eq('user_id', user.id)
        .single();

      if (updatedProfile?.has_paid_selection_process_fee) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setZellePaymentSubmitted(false);
        setShowZelleCheckout(false);
        onNext();
      } else if (attempts >= 30) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setZellePaymentSubmitted(false);
      }
    }, 2000);
    return () => { if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zellePaymentSubmitted, user?.id]);

  // ── Functions ──────────────────────────────────────────────────────────────

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

      if (!error && data && data.length > 0) {
        setActiveTerm(data[0]);
        return true;
      }
      const defaultTerm: Term = {
        id: 'default-checkout-terms',
        title: 'Checkout Terms and Conditions',
        content: 'By proceeding with this payment, you agree to our checkout terms and conditions.',
        term_type: 'checkout_terms',
        is_active: true,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setActiveTerm(defaultTerm);
      return true;
    } catch (e) {
      return false;
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleTermsClick = async () => {
    await loadActiveTerms();
    setShowTermsModal(true);
  };

  const handleTermsAcceptRecord = async () => {
    try {
      if (activeTerm && !termsAccepted) {
        const affiliateAdminId = await checkIfUserHasAffiliate();
        if (affiliateAdminId) {
          await recordAffiliateTermAcceptance(activeTerm.id, 'checkout_terms', affiliateAdminId);
        } else {
          await recordTermAcceptance(activeTerm.id, 'checkout_terms');
        }
        setTermsAccepted(true);
        setHasAcceptedTermsInDB(true);
      }
    } catch (e) {
      setTermsAccepted(true);
    }
  };

  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hasAcceptedTermsInDB) { e.preventDefault(); return; }
    const isChecked = e.target.checked;
    setTermsAccepted(isChecked);
    if (isChecked) {
      setLoading(true);
      if (!activeTerm) await loadActiveTerms();
      await handleTermsAcceptRecord();
      setLoading(false);
    }
  };

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) { setValidationResult({ isValid: false, message: t('preCheckoutModal.pleaseEnterCode') || 'Please enter a code' }); return; }
    setIsValidating(true);
    setValidationResult(null);
    try {
      const { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes').select('user_id, code, is_active')
        .eq('code', discountCode.trim().toUpperCase()).eq('is_active', true).single();

      if (affiliateError || !affiliateCodeData) { setValidationResult({ isValid: false, message: t('preCheckoutModal.invalidCode') || 'Invalid code' }); return; }
      if (affiliateCodeData.user_id === user?.id) { setValidationResult({ isValid: false, message: t('preCheckoutModal.selfReferral') || 'Self-referral not allowed', isSelfReferral: true }); return; }
      if (hasUsedReferralCode && !activeDiscount?.has_discount) { setValidationResult({ isValid: false, message: t('preCheckoutModal.alreadyUsedCode') || 'Code already used' }); return; }

      if (!user?.id || !user?.email) throw new Error('User not authenticated');
      const { data: result, error: rpcError } = await supabase.rpc('validate_and_apply_referral_code', {
        user_id_param: user.id,
        affiliate_code_param: discountCode.trim().toUpperCase(),
        email_param: user.email,
      });
      if (rpcError || !result?.success) {
        setValidationResult({ isValid: false, message: result?.error || t('preCheckoutModal.errorValidating') || 'Error' });
        return;
      }
      setValidationResult({ isValid: true, message: t('preCheckoutModal.validCode') || 'Valid code! $50 discount applied', discountAmount: 50 });
      setCodeApplied(true);
    } catch (e) {
      setValidationResult({ isValid: false, message: t('preCheckoutModal.errorValidating') || 'Error validating code' });
    } finally {
      setIsValidating(false);
    }
  };

  const selectionFeeAmount = getFeeAmount('selection_process');

  const computedBasePrice = (() => {
    if (promotionalCouponValidation?.isValid && promotionalCouponValidation.finalAmount !== undefined) return promotionalCouponValidation.finalAmount;
    if (activeDiscount?.has_discount) { const discount = activeDiscount.discount_amount || 50; return Math.max(selectionFeeAmount - discount, 0); }
    if (validationResult?.isValid && codeApplied) return Math.max(selectionFeeAmount - 50, 0);
    return selectionFeeAmount;
  })();

  const formattedAmount = computedBasePrice && !isNaN(computedBasePrice) ? formatFeeAmount(computedBasePrice) : '$0.00';
  const originalFormattedAmount = selectionFeeAmount && !isNaN(selectionFeeAmount) ? formatFeeAmount(selectionFeeAmount) : '$0.00';
  const cardAmountWithFees = computedBasePrice > 0 ? calculateCardAmountWithFees(computedBasePrice) : 0;
  const pixAmountWithFees = computedBasePrice > 0 && exchangeRate ? calculatePIXAmountWithFees(computedBasePrice, exchangeRate) : 0;

  const validatePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim()) { setPromotionalCouponValidation({ isValid: false, message: 'Please enter a coupon code' }); return; }
    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    setIsValidatingPromotionalCoupon(true);
    setPromotionalCouponValidation(null);
    try {
      const { data: result, error } = await supabase.rpc('validate_and_apply_admin_promotional_coupon', {
        p_code: normalizedCode, p_fee_type: 'selection_process', p_user_id: user?.id,
      });
      if (error) throw error;
      if (!result || !result.valid) { setPromotionalCouponValidation({ isValid: false, message: result?.message || 'Invalid coupon code' }); return; }

      let discountAmount = result.discount_type === 'percentage' ? (selectionFeeAmount * result.discount_value) / 100 : result.discount_value;
      discountAmount = Math.min(discountAmount, selectionFeeAmount);
      const finalAmount = Math.max(0, selectionFeeAmount - discountAmount);
      setPromotionalCouponValidation({ isValid: true, message: `Coupon ${normalizedCode} applied! You saved $${discountAmount.toFixed(2)}`, discountAmount, finalAmount, couponId: result.id });

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-promotional-coupon-validation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ coupon_code: normalizedCode, coupon_id: result.id, fee_type: 'selection_process', original_amount: selectionFeeAmount, discount_amount: discountAmount, final_amount: finalAmount }),
          });
        }
      } catch (recordError) { console.warn('[useSelectionFeeStep] Não foi possível registrar o uso do cupom:', recordError); }

      (window as any).__checkout_promotional_coupon = normalizedCode;
      (window as any).__checkout_final_amount = finalAmount;
    } catch (e: any) {
      setPromotionalCouponValidation({ isValid: false, message: 'Failed to validate coupon' });
    } finally {
      setIsValidatingPromotionalCoupon(false);
    }
  };

  const removePromotionalCoupon = async () => {
    if (!promotionalCoupon.trim() || !user?.id) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-promotional-coupon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ coupon_code: promotionalCoupon.trim().toUpperCase(), fee_type: 'selection_process' }),
        });
      }
    } catch (e) { console.warn('[useSelectionFeeStep] Erro ao remover cupom:', e); }
    setPromotionalCoupon('');
    setPromotionalCouponValidation(null);
    setIsValidatingPromotionalCoupon(false);
    delete (window as any).__promotional_coupon_validation;
    delete (window as any).__checkout_promotional_coupon;
    delete (window as any).__checkout_final_amount;
    localStorage.removeItem('__promotional_coupon_selection_process');
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const saveCpfAndCheckout = async () => {
    const cleaned = inlineCpf.replace(/\D/g, '');
    if (cleaned.length !== 11) { setCpfError('CPF inválido. Digite os 11 dígitos.'); return; }
    if (!user?.id) return;
    setSavingCpf(true);
    setCpfError(null);
    try {
      const { error } = await supabase.from('user_profiles').update({ cpf_document: cleaned }).eq('user_id', user.id);
      if (error) throw error;
      await refetchUserProfile();
      setShowInlineCpf(false);
      setInlineCpf('');
      handleCheckout('parcelow');
    } catch (err: any) {
      setCpfError('Erro ao salvar CPF. Tente novamente.');
    } finally {
      setSavingCpf(false);
    }
  };

  const handleCheckout = async (paymentMethod: PaymentMethod) => {
    if (paymentMethod === 'parcelow' && !userProfile?.cpf_document) {
      setShowInlineCpf(true);
      setSelectedMethod('parcelow');
      return;
    } else {
      setShowInlineCpf(false);
    }

    setLoading(true);
    if (!user?.id) { setError('User not authenticated'); return; }
    if (!termsAccepted) { alert(t('preCheckoutModal.mustAcceptTerms') || 'You must accept the terms and conditions.'); setLoading(false); return; }
    if (hasReferralCode && !(validationResult?.isValid) && !activeDiscount?.has_discount) {
      alert(t('preCheckoutModal.mustEnterValidCode') || 'Please validate your referral code.'); setLoading(false); return;
    }

    setError(null);
    setSelectedMethod(paymentMethod);

    try {
      if (paymentMethod === 'zelle') {
        if (isBlocked && pendingPayment) { setIsZelleProcessing(true); setShowZelleCheckout(true); setSelectedMethod('zelle'); setLoading(false); return; }
        setIsZelleProcessing(false);
        setShowZelleCheckout(true);
        setSelectedMethod('zelle');
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('User not authenticated');

      let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
      if (paymentMethod === 'parcelow') apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-selection-process`;

      const discountCodeToSend = (() => {
        if (activeDiscount?.has_discount && activeDiscount.affiliate_code) return activeDiscount.affiliate_code;
        if (validationResult?.isValid && codeApplied && discountCode.trim()) return discountCode.trim().toUpperCase();
        return undefined;
      })();

      const metadata: any = {};
      if (paymentMethod === 'pix' && exchangeRate && exchangeRate > 0) metadata.exchange_rate = exchangeRate.toString();

      const requestBody = {
        price_id: 'price_selection_process_fee',
        amount: computedBasePrice,
        payment_method: paymentMethod,
        success_url: `${window.location.origin}/student/onboarding?step=scholarship_selection&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/student/onboarding?step=selection_fee&payment=cancelled`,
        mode: 'payment',
        payment_type: 'selection_process',
        fee_type: 'selection_process',
        ...(discountCodeToSend && { discount_code: discountCodeToSend }),
        promotional_coupon: (window as any).__checkout_promotional_coupon || null,
        ...(Object.keys(metadata).length > 0 && { metadata }),
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Error creating checkout session'); }
      const data = await response.json();
      const redirectUrl = data.session_url || data.checkout_url;
      if (redirectUrl) { window.location.href = redirectUrl; } else { throw new Error('Session/Checkout URL not found'); }
    } catch (err: any) {
      console.error('Error processing checkout:', err);
      setError(err.message || 'Error processing payment. Please try again.');
      setLoading(false);
    }
  };

  const hasSellerReferralCode = userProfile?.seller_referral_code && userProfile.seller_referral_code.trim() !== '';
  const hasZellePendingSelectionFee = isBlocked && pendingPayment?.fee_type === 'selection_process';
  const hasPaid = userProfile?.has_paid_selection_process_fee || false;

  return {
    // State
    t, navigate, user, userProfile, loading, error, selectedMethod, setSelectedMethod,
    showZelleCheckout, setShowZelleCheckout, zellePaymentSubmitted, setZellePaymentSubmitted,
    isZelleProcessing, setIsZelleProcessing,
    termsAccepted, hasAcceptedTermsInDB, showTermsModal, setShowTermsModal,
    showTermsInDrawer, setShowTermsInDrawer, activeTerm, loadingTerms,
    exchangeRate, discountCode, setDiscountCode, isValidating, validationResult, setValidationResult,
    hasReferralCode, setHasReferralCode, showCodeStep, setShowCodeStep,
    showCpfModal, setShowCpfModal, codeApplied, setCodeApplied,
    showInlineCpf, setShowInlineCpf, inlineCpf, setInlineCpf,
    savingCpf, cpfError, setCpfError,
    promotionalCoupon, setPromotionalCoupon, isValidatingPromotionalCoupon,
    promotionalCouponValidation, setPromotionalCouponValidation,
    // Computed
    selectionFeeAmount, computedBasePrice, formattedAmount, originalFormattedAmount,
    cardAmountWithFees, pixAmountWithFees,
    hasSellerReferralCode, hasAffiliateCode, hasZellePendingSelectionFee, hasPaid,
    // Payment status
    isBlocked, pendingPayment, rejectedPayment, paymentBlockedLoading, refetchPaymentStatus,
    activeDiscount,
    // Functions
    handleCheckout, handleCheckboxChange, handleTermsClick,
    validateDiscountCode, validatePromotionalCoupon, removePromotionalCoupon,
    saveCpfAndCheckout, formatCpf, onNext, refetchUserProfile,
    setError,
  };
};
