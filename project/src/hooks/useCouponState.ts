import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface CouponValidation {
  isValid: boolean;
  message?: string;
  discountAmount?: number;
  finalAmount?: number;
  couponId?: string;
}

interface StoredCouponState {
  couponCode: string;
  validation: CouponValidation;
}

export function useCouponState(feeType: string, baseAmount: number) {
  const storageKey = `musa_coupon_${feeType}`;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const [hasCoupon, setHasCoupon] = useState(false);
  const [promotionalCoupon, setPromotionalCoupon] = useState('');
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const couponInputRef = useRef<HTMLInputElement>(null);

  // Restore persisted coupon state on mount — avoids re-calling the RPC on refresh
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (!saved) return;
      const { couponCode, validation } = JSON.parse(saved) as StoredCouponState;
      if (couponCode && validation?.isValid) {
        setHasCoupon(true);
        setPromotionalCoupon(couponCode);
        setCouponValidation(validation);
        // Restore window vars used during checkout redirect
        (window as any)[`__checkout_${feeType}_coupon`] = couponCode;
        (window as any)[`__checkout_${feeType}_final_amount`] = validation.finalAmount;
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey, feeType]);

  const validateCoupon = async () => {
    if (!promotionalCoupon.trim()) return;
    const normalizedCode = promotionalCoupon.trim().toUpperCase();
    setIsValidatingCoupon(true);
    setCouponValidation(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error: rpcError } = await supabase.rpc(
        'validate_and_apply_admin_promotional_coupon',
        { p_code: normalizedCode, p_fee_type: feeType, p_user_id: user?.id }
      );

      if (rpcError) throw rpcError;

      if (!result || !result.valid) {
        setCouponValidation({ isValid: false, message: result?.message || 'Código de cupom inválido' });
        return;
      }

      let discountAmount = result.discount_type === 'percentage'
        ? (baseAmount * result.discount_value) / 100
        : result.discount_value;
      discountAmount = Math.min(discountAmount, baseAmount);
      const finalAmount = Math.max(0, baseAmount - discountAmount);

      const validation: CouponValidation = { isValid: true, discountAmount, finalAmount, couponId: result.id };
      setCouponValidation(validation);

      // Persist so page refresh doesn't re-call the RPC
      sessionStorage.setItem(storageKey, JSON.stringify({ couponCode: normalizedCode, validation }));

      // Restore window vars used during checkout redirect
      (window as any)[`__checkout_${feeType}_coupon`] = normalizedCode;
      (window as any)[`__checkout_${feeType}_final_amount`] = finalAmount;

      // Record validation event (best-effort, non-blocking)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          await fetch(`${SUPABASE_URL}/functions/v1/record-promotional-coupon-validation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              coupon_code: normalizedCode,
              coupon_id: result.id,
              fee_type: feeType,
              original_amount: baseAmount,
              discount_amount: discountAmount,
              final_amount: finalAmount,
            }),
          });
        }
      } catch {
        // non-blocking
      }
    } catch (e: any) {
      setCouponValidation({ isValid: false, message: 'Falha ao validar cupom. Tente novamente.' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    const code = promotionalCoupon.trim();
    if (!code) return;

    // Clear local + sessionStorage immediately for instant UX
    sessionStorage.removeItem(storageKey);
    setHasCoupon(false);
    setPromotionalCoupon('');
    setCouponValidation(null);
    delete (window as any)[`__checkout_${feeType}_coupon`];
    delete (window as any)[`__checkout_${feeType}_final_amount`];

    // Decrement usage counter in background
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        await fetch(`${SUPABASE_URL}/functions/v1/remove-promotional-coupon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ coupon_code: code.toUpperCase(), fee_type: feeType }),
        });
      }
    } catch {
      // non-blocking
    }
  };

  // Call after successful payment to clean up sessionStorage
  const clearCouponStorage = () => {
    sessionStorage.removeItem(storageKey);
    delete (window as any)[`__checkout_${feeType}_coupon`];
    delete (window as any)[`__checkout_${feeType}_final_amount`];
  };

  const effectiveAmount = couponValidation?.isValid && couponValidation.finalAmount !== undefined
    ? couponValidation.finalAmount
    : baseAmount;

  const appliedCoupon = couponValidation?.isValid && promotionalCoupon.trim()
    ? promotionalCoupon.trim().toUpperCase()
    : null;

  return {
    hasCoupon,
    setHasCoupon,
    promotionalCoupon,
    setPromotionalCoupon,
    couponValidation,
    setCouponValidation,
    isValidatingCoupon,
    couponInputRef,
    validateCoupon,
    removeCoupon,
    clearCouponStorage,
    effectiveAmount,
    appliedCoupon,
  };
}
