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
    
    // PRIMEIRO: Verificar diretamente na tabela used_referral_codes
    let appliedCodeFromTable: any = null;
    try {
      console.log('🔍 [useReferralCode] Buscando códigos usados diretamente na tabela...');
      const { data: usedCodes, error: usedCodesError } = await supabase
        .from('used_referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false })
        .limit(5);

      if (usedCodesError) {
        console.error('❌ [useReferralCode] Erro ao buscar códigos usados:', usedCodesError);
      } else {
        console.log('🔍 [useReferralCode] Códigos encontrados na tabela:', usedCodes);
        if (usedCodes && usedCodes.length > 0) {
          // Procurar por um código com status 'applied'
          appliedCodeFromTable = usedCodes.find(code => code.status === 'applied');
          if (appliedCodeFromTable) {
            console.log('✅ [useReferralCode] Código aplicado encontrado na tabela:', appliedCodeFromTable);
          } else {
            console.log('⚠️ [useReferralCode] Nenhum código com status "applied" encontrado. Status encontrados:', usedCodes.map(c => c.status));
            // Se não encontrou com status 'applied', tentar com qualquer status (fallback)
            appliedCodeFromTable = usedCodes[0];
            console.log('⚠️ [useReferralCode] Usando primeiro código encontrado como fallback:', appliedCodeFromTable);
          }
        } else {
          console.log('ℹ️ [useReferralCode] Nenhum código usado encontrado na tabela');
        }
      }
    } catch (error) {
      console.error('❌ [useReferralCode] Erro ao buscar códigos usados:', error);
    }

    // SEGUNDO: Chamar a função RPC
    try {
      const { data, error } = await supabase.rpc('get_user_active_discount', {
        user_id_param: user.id
      });

      if (error) {
        console.error('❌ [useReferralCode] Erro ao verificar desconto via RPC:', error);
        // Se a RPC falhou mas temos um código na tabela, usar como fallback
        if (appliedCodeFromTable) {
          console.log('🔄 [useReferralCode] RPC falhou, usando código da tabela como fallback');
          setActiveDiscount({
            has_discount: true,
            affiliate_code: appliedCodeFromTable.affiliate_code,
            discount_amount: appliedCodeFromTable.discount_amount || 50,
            stripe_coupon_id: appliedCodeFromTable.stripe_coupon_id,
            referrer_id: appliedCodeFromTable.referrer_id,
            applied_at: appliedCodeFromTable.applied_at,
            expires_at: appliedCodeFromTable.expires_at
          });
        }
      } else {
        console.log('✅ [useReferralCode] Resultado do desconto via RPC:', data);
        // Se a RPC retornou sem desconto mas temos um código na tabela, usar como fallback
        if (!data?.has_discount && appliedCodeFromTable) {
          console.log('🔄 [useReferralCode] RPC não encontrou desconto, mas temos código na tabela. Usando como fallback');
          setActiveDiscount({
            has_discount: true,
            affiliate_code: appliedCodeFromTable.affiliate_code,
            discount_amount: appliedCodeFromTable.discount_amount || 50,
            stripe_coupon_id: appliedCodeFromTable.stripe_coupon_id,
            referrer_id: appliedCodeFromTable.referrer_id,
            applied_at: appliedCodeFromTable.applied_at,
            expires_at: appliedCodeFromTable.expires_at
          });
        } else {
          setActiveDiscount(data);
        }
      }
    } catch (error) {
      console.error('❌ [useReferralCode] Erro ao verificar desconto via RPC:', error);
      // Se a RPC deu erro mas temos um código na tabela, usar como fallback
      if (appliedCodeFromTable) {
        console.log('🔄 [useReferralCode] RPC deu erro, usando código da tabela como fallback');
        setActiveDiscount({
          has_discount: true,
          affiliate_code: appliedCodeFromTable.affiliate_code,
          discount_amount: appliedCodeFromTable.discount_amount || 50,
          stripe_coupon_id: appliedCodeFromTable.stripe_coupon_id,
          referrer_id: appliedCodeFromTable.referrer_id,
          applied_at: appliedCodeFromTable.applied_at,
          expires_at: appliedCodeFromTable.expires_at
        });
      }
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
