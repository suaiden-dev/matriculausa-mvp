import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface ReferralCodeResponse {
  success: boolean;
  discount_amount?: number;
  stripe_coupon_id?: string;
  message?: string;
  error?: string;
  referrer_id?: string;
}

interface ActiveDiscount {
  has_discount: boolean;
  affiliate_code?: string;
  discount_amount?: number;
  stripe_coupon_id?: string;
  referrer_id?: string;
  referrer_code?: string;
  applied_at?: string;
  expires_at?: string;
}

export const useReferralCode = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDiscount, setActiveDiscount] = useState<ActiveDiscount | null>(null);
  const [hasUsedReferralCode, setHasUsedReferralCode] = useState(false);

  // Verificar se usuário já usou código de referência
  useEffect(() => {
    if (user) {
      checkReferralCodeUsage();
      checkActiveDiscount();
    }
  }, [user]);

  const checkReferralCodeUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('used_referral_codes')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      if (error) {
        console.error('Error checking referral code usage:', error);
      } else {
        setHasUsedReferralCode(data && data.length > 0);
      }
    } catch (error) {
      console.error('Error checking referral code usage:', error);
    }
  };

  const checkActiveDiscount = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_active_discount', {
          user_id_param: user?.id
        });

      if (error) {
        console.error('Error checking active discount:', error);
      } else {
        setActiveDiscount(data);
      }
    } catch (error) {
      console.error('Error checking active discount:', error);
    }
  };

  const validateReferralCode = async (affiliateCode: string): Promise<ReferralCodeResponse> => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-referral-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ affiliate_code: affiliateCode }),
      });

      const result = await response.json();

      if (result.success) {
        // Atualiza o estado local
        setHasUsedReferralCode(true);
        await checkActiveDiscount();
      }

      return result;
    } catch (error) {
      console.error('Error validating referral code:', error);
      const errorMessage = 'Erro ao validar código de referência';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const getReferralCodeFromURL = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  };

  const applyReferralCodeFromURL = async (): Promise<ReferralCodeResponse | null> => {
    const codeFromURL = getReferralCodeFromURL();
    
    if (!codeFromURL || hasUsedReferralCode) {
      return null;
    }

    return await validateReferralCode(codeFromURL);
  };

  // Função de teste para debug
  const testReferralCode = async (testCode: string): Promise<ReferralCodeResponse> => {
    console.log('🧪 TESTE: Aplicando código de referência:', testCode);
    const result = await validateReferralCode(testCode);
    console.log('🧪 TESTE: Resultado:', result);
    return result;
  };

  return {
    loading,
    error,
    activeDiscount,
    hasUsedReferralCode,
    validateReferralCode,
    getReferralCodeFromURL,
    applyReferralCodeFromURL,
    checkActiveDiscount,
    testReferralCode, // Função de teste
  };
};
