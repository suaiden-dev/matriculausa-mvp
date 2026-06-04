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
      // Se não há usuário, usar legacy por padrão
      if (!user || !userProfile) {
        setSystemType('legacy');
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
          setHasChecked(true);
          return;
        }

        // Se for merari380@uorak.com, sempre legacy (para testes)
        if (user.email === 'merari380@uorak.com') {
          setSystemType('legacy');
          setLoading(false);
          setHasChecked(true);
          return;
        }

        // ✅ CORREÇÃO: Não forçar legacy apenas por ter seller_referral_code
        // O system_type deve ser herdado do seller (simplified ou legacy)
        // Se tem seller_referral_code, verificar o system_type do seller
        if (userProfile.seller_referral_code) {

          // Sempre consultar o RPC para respeitar simplified_pricing_for_students da agência
          // (não usar userProfile.system_type pois todas as agências são 'simplified'
          //  mas apenas The Future of English dá desconto na selection_process_fee)
          try {
            const { data, error } = await supabase
              .rpc('get_seller_admin_system_type_by_code', { seller_code: userProfile.seller_referral_code });
            
            if (error) {
              console.error('Erro ao detectar sistema do seller:', error);
              setSystemType('legacy');
            } else {
              setSystemType(data as SystemType);
            }
          } catch (err) {
            console.error('Erro ao detectar sistema do seller:', err);
            setSystemType('legacy');
          }
          
          setLoading(false);
          return;
        }

        // Para todos os usuários, usar a coluna system_type da tabela user_profiles
        
        if (userProfile.system_type) {
          setSystemType(userProfile.system_type as SystemType);
        } else {
          // Para usuários sem system_type definido, detectar baseado no seller_referral_code
          if (userProfile.seller_referral_code) {
            
            try {
              const { data, error } = await supabase
                .rpc('get_seller_admin_system_type_by_code', { seller_code: userProfile.seller_referral_code });
              
              if (error) {
                console.error('Erro ao detectar sistema do seller:', error);
                setSystemType('legacy');
              } else {
                setSystemType(data as SystemType);
              }
            } catch (err) {
              console.error('Erro ao detectar sistema do seller:', err);
              setSystemType('legacy');
            }
          } else {
            // Para usuários sem system_type definido, usar legacy
            setSystemType('legacy');
          }
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
  }, [user, userProfile]); // ✅ CORREÇÃO: Remover hasChecked, sempre re-executar quando userProfile mudar

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
