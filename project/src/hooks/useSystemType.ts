import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type SystemType = 'legacy' | 'simplified';

export const useSystemType = (): {
  systemType: SystemType;
  loading: boolean;
  error: string | null;
} => {
  const [systemType, setSystemType] = useState<SystemType>('legacy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const detectSystemType = async () => {
      if (!user || !userProfile) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Se for Matheus, sempre legacy
        if (user.email === 'contato@brantimmigration.com') {
          setSystemType('legacy');
          setLoading(false);
          return;
        }

        // Se for merari380@uorak.com, sempre legacy (para testes)
        if (user.email === 'merari380@uorak.com') {
          setSystemType('legacy');
          setLoading(false);
          return;
        }

        // Para affiliate admins, buscar no banco
        if (userProfile.role === 'affiliate_admin') {
          const { data, error: fetchError } = await supabase
            .from('affiliate_admins')
            .select('system_type')
            .eq('user_id', user.id)
            .single();

          if (fetchError) {
            console.warn('Error fetching system type:', fetchError);
            setSystemType('legacy'); // Default to legacy
          } else {
            setSystemType((data?.system_type as SystemType) || 'legacy');
          }
        } 
        // Para sellers, buscar o system_type do admin deles
        else if (userProfile.role === 'seller') {
          // Usar RPC function para buscar system type
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_affiliate_admin_system_type', { seller_user_id: user.id });

          if (rpcError) {
            console.warn('RPC failed, trying direct query:', rpcError);
            
            // Fallback para query direta
            const { data, error: fetchError } = await supabase
              .from('sellers')
              .select(`
                affiliate_admin_id,
                affiliate_admins!inner(system_type)
              `)
              .eq('user_id', user.id)
              .single();

            if (fetchError) {
              console.warn('Error fetching seller admin system type:', fetchError);
              setSystemType('legacy'); // Default to legacy
            } else {
              const detectedType = (data?.affiliate_admins?.system_type as SystemType) || 'legacy';
              setSystemType(detectedType);
            }
          } else {
            const detectedType = (rpcData as SystemType) || 'legacy';
            setSystemType(detectedType);
          }
        } else {
          // Para outros usuários, default to legacy
          setSystemType('legacy');
        }
      } catch (err) {
        console.error('Error detecting system type:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSystemType('legacy'); // Default to legacy on error
      } finally {
        setLoading(false);
      }
    };

    detectSystemType();
  }, [user, userProfile]);

  return {
    systemType,
    loading,
    error
  };
};

// Hook específico para verificar se é sistema legacy
export const useIsLegacySystem = (): boolean => {
  const { systemType } = useSystemType();
  return systemType === 'legacy';
};

// Hook específico para verificar se é sistema simplified
export const useIsSimplifiedSystem = (): boolean => {
  const { systemType } = useSystemType();
  return systemType === 'simplified';
};
