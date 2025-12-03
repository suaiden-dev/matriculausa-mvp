import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

const TARGET_AFFILIATE_EMAIL = 'info@thefutureofenglish.com';

/**
 * Hook para verificar se o seller_referral_code do usuário atual
 * pertence ao affiliate admin com email específico
 */
export const useAffiliateAdminCheck = (): {
  isTheFutureOfEnglishAffiliate: boolean;
  affiliateAdminEmail: string | null;
  loading: boolean;
} => {
  const { userProfile } = useAuth();
  const [affiliateEmail, setAffiliateEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAffiliateAdmin = async () => {
      // Reset states
      setLoading(true);
      setAffiliateEmail(null);

      // Se não há seller_referral_code, não é do affiliate admin
      if (!userProfile?.seller_referral_code) {
        setLoading(false);
        return;
      }

      try {
        // ✅ Usar RPC function para evitar problemas de RLS
        // A função faz JOIN completo e retorna o email do affiliate admin
        const { data: result, error: queryError } = await supabase.rpc('get_affiliate_admin_email_by_seller_code', {
          seller_code: userProfile.seller_referral_code
        });

        if (queryError) {
          console.error('❌ [useAffiliateAdminCheck] Erro ao buscar email via RPC:', queryError);
          setLoading(false);
          return;
        }

        if (result && result.length > 0 && result[0]?.email) {
          setAffiliateEmail(result[0].email);
        } else {
          console.log('⚠️ [useAffiliateAdminCheck] Email do affiliate admin não encontrado');
        }
      } catch (error) {
        console.error('❌ [useAffiliateAdminCheck] Erro ao verificar affiliate admin:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAffiliateAdmin();
  }, [userProfile?.seller_referral_code]);

  // Verificar se o email corresponde ao target
  const isTheFutureOfEnglishAffiliate = useMemo(() => {
    return affiliateEmail?.toLowerCase() === TARGET_AFFILIATE_EMAIL.toLowerCase();
  }, [affiliateEmail]);

  return {
    isTheFutureOfEnglishAffiliate,
    affiliateAdminEmail: affiliateEmail,
    loading
  };
};

