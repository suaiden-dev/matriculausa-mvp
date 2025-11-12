import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import React from 'react';

interface ReferralCodeResponse {
  success: boolean;
  error?: string;
  discount_amount?: number;
  affiliate_code?: string;
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

  const checkReferralCodeUsage = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('used_referral_codes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error checking referral code usage:', error);
      } else {
        setHasUsedReferralCode(data && data.length > 0);
      }
    } catch (error) {
      console.error('Error checking referral code usage:', error);
    }
  }, [user?.id]);

  const checkActiveDiscount = useCallback(async () => {
    if (!user?.id) {
      console.log('🔍 [useReferralCode] Sem user.id, não verificando desconto');
      return;
    }
    
    console.log('🔍 [useReferralCode] Verificando desconto ativo para user:', user.id);
    try {
      const { data, error } = await supabase.rpc('get_user_active_discount', {
        user_id_param: user.id
      });

      if (error) {
        console.error('❌ [useReferralCode] Erro ao verificar desconto:', error);
      } else {
        console.log('✅ [useReferralCode] Resultado do desconto:', data);
        setActiveDiscount(data);
      }
    } catch (error) {
      console.error('❌ [useReferralCode] Erro ao verificar desconto:', error);
    }
  }, [user?.id]);

  // Verificar se usuário já usou código de referência
  useEffect(() => {
    if (user?.id) {
      checkReferralCodeUsage();
      checkActiveDiscount();
    }
  }, [user?.id, checkReferralCodeUsage, checkActiveDiscount]);

  const validateReferralCode = useCallback(async (affiliateCode: string): Promise<ReferralCodeResponse> => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    console.log('🔍 [useReferralCode] Validando código de referência:', affiliateCode);
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
      console.log('🔍 [useReferralCode] Resultado da validação:', result);

      if (result.success) {
        console.log('🔍 [useReferralCode] ✅ Código válido, atualizando estado local...');
        // Atualiza o estado local
        setHasUsedReferralCode(true);
        await checkActiveDiscount();
        console.log('🔍 [useReferralCode] ✅ Estado atualizado com sucesso');
      }

      return result;
    } catch (error) {
      console.error('🔍 [useReferralCode] Erro ao validar código:', error);
      const errorMessage = 'Erro ao validar código de referência';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, checkActiveDiscount]);

  const getReferralCodeFromURL = useCallback((): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  }, []);

  const applyReferralCodeFromURL = useCallback(async (): Promise<ReferralCodeResponse | null> => {
    const codeFromURL = getReferralCodeFromURL();
    
    if (!codeFromURL || hasUsedReferralCode) {
      return null;
    }

    return await validateReferralCode(codeFromURL);
  }, [getReferralCodeFromURL, hasUsedReferralCode, validateReferralCode]);

  // Função de teste para debug
  const testReferralCode = useCallback(async (testCode: string): Promise<ReferralCodeResponse> => {
    console.log('🧪 TESTE: Aplicando código de referência:', testCode);
    return await validateReferralCode(testCode);
  }, [validateReferralCode]);

  // Memoizar o retorno para evitar re-renderizações
  const memoizedReturn = React.useMemo(() => ({
    loading,
    error,
    activeDiscount,
    hasUsedReferralCode,
    validateReferralCode,
    getReferralCodeFromURL,
    applyReferralCodeFromURL,
    testReferralCode
  }), [
    loading,
    error,
    activeDiscount,
    hasUsedReferralCode,
    validateReferralCode,
    getReferralCodeFromURL,
    applyReferralCodeFromURL,
    testReferralCode
  ]);

  return memoizedReturn;
};
