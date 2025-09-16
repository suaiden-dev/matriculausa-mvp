import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useScholarshipPackages } from './useScholarshipPackages';

/**
 * Hook para gerenciar filtro automático de bolsas baseado no pacote do usuário
 * 
 * Funcionalidade:
 * - Se usuário tem pacote de vendedor, filtra bolsas >= valor mínimo do pacote
 * - Se usuário não tem pacote, retorna null (mostra todas as bolsas)
 * - Valores mínimos por pacote:
 *   - Package 1: $3,800
 *   - Package 2: $4,200  
 *   - Package 3: $4,500
 *   - Package 4: $5,000
 *   - Package 5: $5,500
 */
export const usePackageScholarshipFilter = () => {
  const { userProfile } = useAuth();
  const { packages, loading: packagesLoading } = useScholarshipPackages();

  return useMemo(() => {
    try {
      // Se ainda está carregando, não aplicar filtro
      if (packagesLoading) {
        return {
          minScholarshipValue: null,
          userPackage: null,
          hasPackage: false,
          loading: true
        };
      }

      // Verificar se o usuário tem um pacote de vendedor
      const hasPackage = Boolean(
        userProfile?.seller_referral_code && 
        userProfile?.scholarship_package_id
      );

      // Se tem pacote de vendedor, usar valor mínimo do pacote
      if (hasPackage && userProfile?.scholarship_package_id) {
        const userPackage = packages.find(p => p.id === userProfile.scholarship_package_id);
        
        if (userPackage) {
          return {
            minScholarshipValue: userPackage.scholarship_amount,
            userPackage,
            hasPackage: true,
            loading: false
          };
        }
      }

      // Se não tem pacote de vendedor, não aplicar filtro (mostrar todas as bolsas)
      return {
        minScholarshipValue: null,
        userPackage: null,
        hasPackage: false,
        loading: false
      };
    } catch (error) {
      // Em caso de erro, não aplicar filtro
      return {
        minScholarshipValue: null,
        userPackage: null,
        hasPackage: false,
        loading: false
      };
    }
  }, [userProfile, packages, packagesLoading]);
};
