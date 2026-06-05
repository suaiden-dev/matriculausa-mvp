import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type TermType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'affiliate_terms'
  | 'seller_terms'
  | 'checkout_terms'
  | 'university_terms'
  | 'agency_terms';

// Hook específico para affiliates registrarem aceitações de termos de seus estudantes
export const useAffiliateTermsAcceptance = () => {
  const { user, userProfile } = useAuth();

  // Get user's IP address and user agent
  const getClientInfo = useCallback(async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return {
        ip_address: data.ip,
        user_agent: navigator.userAgent
      };
    } catch (error) {
      console.warn('Could not get IP address:', error);
      return {
        ip_address: null,
        user_agent: navigator.userAgent
      };
    }
  }, []);

  // Record term acceptance with affiliate information
  const recordAffiliateTermAcceptance = useCallback(async (
    termId: string, 
    termType: TermType,
    affiliateAdminId?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const clientInfo = await getClientInfo();
      
      console.log('🔍 [AffiliateTermsAcceptance] Registrando aceitação:', {
        termId,
        termType,
        userId: user.id,
        affiliateAdminId: affiliateAdminId,
        ip_address: clientInfo.ip_address,
        user_agent: clientInfo.user_agent?.substring(0, 50) + '...'
      });

      // Primeiro, registrar a aceitação normal
      const { data: acceptanceData, error: acceptanceError } = await supabase.rpc('record_term_acceptance', {
        p_user_id: user.id,
        p_term_id: termId,
        p_term_type: termType,
        p_ip_address: clientInfo.ip_address,
        p_user_agent: clientInfo.user_agent
      });

      if (acceptanceError) {
        console.error('Erro ao registrar aceitação de termos:', acceptanceError);
        throw acceptanceError;
      }

      const success = acceptanceData || true;

      // Term acceptance recorded successfully
      // Note: Notification with PDF will be sent after successful payment, not here

      console.log('✅ [AffiliateTermsAcceptance] Aceitação registrada com sucesso');
      return success;
    } catch (error: any) {
      console.error('Erro ao registrar aceitação de termos do affiliate:', error);
      return false;
    }
  }, [user, getClientInfo]);

  // Verificar se o usuário atual é referenciado por um affiliate através da cadeia seller->affiliate
  const checkIfUserHasAffiliate = useCallback(async (): Promise<string | null> => {
    if (!user || !userProfile?.seller_referral_code) return null;

    try {
      console.log('🔍 [AffiliateTermsAcceptance] Verificando cadeia affiliate para usuário:', user.id);
      console.log('🔍 [AffiliateTermsAcceptance] seller_referral_code:', userProfile.seller_referral_code);

      // Buscar a cadeia: aluno.seller_referral_code -> sellers.referral_code -> sellers.affiliate_admin_id -> affiliate_admins.id
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select(`
          referral_code,
          affiliate_admin_id
        `)
        .eq('referral_code', userProfile.seller_referral_code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (sellerError || !sellerData?.affiliate_admin_id) {
        console.log('⚠️ [AffiliateTermsAcceptance] Seller não encontrado ou sem affiliate_admin_id:', sellerError);
        return null;
      }

      console.log('✅ [AffiliateTermsAcceptance] Seller encontrado, affiliate_admin_id:', sellerData.affiliate_admin_id);
      
      // Retornar o affiliate_admin_id para uso posterior
      return sellerData.affiliate_admin_id;
    } catch (error) {
      console.error('Erro ao verificar affiliate do usuário:', error);
      return null;
    }
  }, [user, userProfile]);

  return {
    recordAffiliateTermAcceptance,
    checkIfUserHasAffiliate
  };
};