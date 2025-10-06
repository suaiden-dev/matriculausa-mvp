import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useAffiliateDataDebug = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔍 [DEBUG] Iniciando busca de afiliados...');

        // Teste 1: Verificar se a tabela affiliate_admins existe
        const { data: affiliateAdmins, error: affiliateError } = await supabase
          .from('affiliate_admins')
          .select('*');

        console.log('🔍 [DEBUG] Teste 1 - affiliate_admins:', {
          data: affiliateAdmins,
          error: affiliateError,
          count: affiliateAdmins?.length || 0
        });

        if (affiliateError) {
          throw new Error(`Erro ao buscar affiliate_admins: ${affiliateError.message}`);
        }

        // Teste 2: Verificar user_profiles
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email, role')
          .eq('role', 'affiliate_admin');

        console.log('🔍 [DEBUG] Teste 2 - user_profiles com role affiliate_admin:', {
          data: userProfiles,
          error: profilesError,
          count: userProfiles?.length || 0
        });

        // Teste 3: Tentar fazer join manualmente
        if (affiliateAdmins && affiliateAdmins.length > 0) {
          const userIds = affiliateAdmins.map(aa => aa.user_id);
          const { data: profiles, error: joinError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, email, phone, country')
            .in('user_id', userIds);

          console.log('🔍 [DEBUG] Teste 3 - join manual:', {
            userIds: userIds,
            profiles: profiles,
            error: joinError
          });

          // Combinar dados
          const combinedData = affiliateAdmins.map(aa => {
            const profile = profiles?.find(p => p.user_id === aa.user_id);
            return {
              ...aa,
              full_name: profile?.full_name || 'Nome não encontrado',
              email: profile?.email || 'Email não encontrado',
              phone: profile?.phone,
              country: profile?.country
            };
          });

          console.log('🔍 [DEBUG] Dados combinados:', combinedData);
          setData(combinedData);
        } else {
          setData([]);
        }

      } catch (err: any) {
        console.error('🔍 [DEBUG] Erro:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, loading, error };
};