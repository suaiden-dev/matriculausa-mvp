import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface AffiliateAdminInfo {
  id: string;
  system_type: 'legacy' | 'simplified';
  is_active: boolean;
}

export const useAffiliateAdminId = (): {
  affiliateAdminId: string | null;
  affiliateAdminInfo: AffiliateAdminInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} => {
  const { user } = useAuth();
  const [affiliateAdminId, setAffiliateAdminId] = useState<string | null>(null);
  const [affiliateAdminInfo, setAffiliateAdminInfo] = useState<AffiliateAdminInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAffiliateAdminId = useCallback(async () => {
    if (!user?.id) {
      setAffiliateAdminId(null);
      setAffiliateAdminInfo(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [useAffiliateAdminId] Buscando affiliate_admin para user:', user.id);
      
      const { data, error: fetchError } = await supabase
        .from('affiliate_admins')
        .select('id, system_type, is_active')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No rows found - user is not an affiliate admin
          console.log('⚠️ [useAffiliateAdminId] Usuário não é affiliate admin:', user.id);
          setAffiliateAdminId(null);
          setAffiliateAdminInfo(null);
          setError('User is not an affiliate admin');
        } else {
          console.error('❌ [useAffiliateAdminId] Erro ao buscar affiliate_admin:', fetchError);
          setError(fetchError.message);
        }
        return;
      }

      console.log('✅ [useAffiliateAdminId] Affiliate admin encontrado:', data);
      setAffiliateAdminId(data.id);
      setAffiliateAdminInfo({
        id: data.id,
        system_type: data.system_type || 'legacy',
        is_active: data.is_active
      });
      setError(null);

    } catch (err) {
      console.error('❌ [useAffiliateAdminId] Erro inesperado:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAffiliateAdminId();
  }, [fetchAffiliateAdminId]);

  return {
    affiliateAdminId,
    affiliateAdminInfo,
    loading,
    error,
    refetch: fetchAffiliateAdminId
  };
};
