import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

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

const REFERRAL_QUERY_KEY = (userId?: string) => ['referral-discount', userId] as const;
const REFERRAL_USAGE_KEY = (userId?: string) => ['referral-usage', userId] as const;

/**
 * Hook de código de referência — otimizado com React Query.
 * Todas as instâncias compartilham o mesmo cache, eliminando
 * chamadas duplicadas ao banco quando o hook é usado em múltiplos componentes.
 */
export const useReferralCode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query 1: verifica se o usuário já usou um código de referência
  const { data: hasUsedReferralCode = false } = useQuery({
    queryKey: REFERRAL_USAGE_KEY(user?.id),
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from('used_referral_codes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      if (error) return false;
      return !!(data && data.length > 0);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos — dado estável
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query 2: busca o desconto ativo do usuário
  const { data: activeDiscount = null, isLoading: loading } = useQuery<ActiveDiscount | null>({
    queryKey: REFERRAL_QUERY_KEY(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('🔍 [useReferralCode] Verificando desconto ativo para user:', user.id);

      // Verificar diretamente na tabela used_referral_codes
      let appliedCodeFromTable: any = null;
      const { data: usedCodes, error: usedCodesError } = await supabase
        .from('used_referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false })
        .limit(5);

      if (usedCodesError) {
        console.error('❌ [useReferralCode] Erro ao buscar códigos usados:', usedCodesError);
      } else if (usedCodes && usedCodes.length > 0) {
        appliedCodeFromTable = usedCodes.find((code: any) => code.status === 'applied') || usedCodes[0];
        console.log('🔍 [useReferralCode] Código encontrado na tabela:', appliedCodeFromTable);
      } else {
        console.log('ℹ️ [useReferralCode] Nenhum código usado encontrado na tabela');
      }

      // Chamar a RPC para obter desconto ativo
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_active_discount', {
        user_id_param: user.id
      });

      if (rpcError || !rpcData?.has_discount) {
        if (appliedCodeFromTable) {
          console.log('🔄 [useReferralCode] RPC sem resultado, usando fallback da tabela:', appliedCodeFromTable.affiliate_code);
          return {
            has_discount: true,
            affiliate_code: appliedCodeFromTable.affiliate_code,
            discount_amount: appliedCodeFromTable.discount_amount || 50,
            stripe_coupon_id: appliedCodeFromTable.stripe_coupon_id,
            referrer_id: appliedCodeFromTable.referrer_id,
            applied_at: appliedCodeFromTable.applied_at,
            expires_at: appliedCodeFromTable.expires_at,
          } as ActiveDiscount;
        }
        if (rpcError) console.error('❌ [useReferralCode] Erro via RPC:', rpcError);
        return rpcData ?? null;
      }

      console.log('✅ [useReferralCode] Desconto ativo via RPC:', rpcData);
      return rpcData as ActiveDiscount;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos — desconto raramente muda
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Valida um código de referência via Edge Function
  const validateReferralCode = useCallback(async (affiliateCode: string): Promise<ReferralCodeResponse> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    console.log('🔍 [useReferralCode] Validando código de referência:', affiliateCode);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-referral-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ affiliate_code: affiliateCode }),
      });

      const result = await response.json();
      console.log('🔍 [useReferralCode] Resultado da validação:', result);

      if (result.success) {
        console.log('✅ [useReferralCode] Código válido, invalidando cache para re-fetch...');
        // Invalidar o cache para forçar re-fetch com o novo desconto
        queryClient.invalidateQueries({ queryKey: REFERRAL_USAGE_KEY(user.id) });
        queryClient.invalidateQueries({ queryKey: REFERRAL_QUERY_KEY(user.id) });
      }

      return result;
    } catch (err) {
      console.error('❌ [useReferralCode] Erro ao validar código:', err);
      return { success: false, error: 'Erro ao validar código de referência' };
    }
  }, [user, queryClient]);

  const getReferralCodeFromURL = useCallback((): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  }, []);

  const applyReferralCodeFromURL = useCallback(async (): Promise<ReferralCodeResponse | null> => {
    const codeFromURL = getReferralCodeFromURL();
    if (!codeFromURL || hasUsedReferralCode) return null;
    return await validateReferralCode(codeFromURL);
  }, [getReferralCodeFromURL, hasUsedReferralCode, validateReferralCode]);

  const testReferralCode = useCallback(async (testCode: string): Promise<ReferralCodeResponse> => {
    return await validateReferralCode(testCode);
  }, [validateReferralCode]);

  return {
    loading,
    error: null,
    activeDiscount,
    hasUsedReferralCode,
    validateReferralCode,
    getReferralCodeFromURL,
    applyReferralCodeFromURL,
    testReferralCode,
  };
};
