import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useFeeConfig } from './useFeeConfig';
import { useScholarshipPackages } from './useScholarshipPackages';

export interface DynamicFeeValues {
  selectionProcessFee: string;
  scholarshipFee: string;
  i20ControlFee: string;
  hasSellerPackage: boolean;
  packageName?: string;
  packageNumber?: number;
}

export const useDynamicFees = (): DynamicFeeValues => {
  const { userProfile } = useAuth();
  const { getFeeAmount, loading: feeLoading } = useFeeConfig(userProfile?.user_id);
  const { packages, loading: packagesLoading } = useScholarshipPackages();

  return useMemo(() => {
    try {
      // Se ainda está carregando, retornar valores padrão
      if (feeLoading || packagesLoading) {
        return {
          selectionProcessFee: '$350.00',
          scholarshipFee: '$550.00',
          i20ControlFee: '$900.00',
          hasSellerPackage: false
        };
      }

      // Verificar se o usuário tem um pacote de vendedor
      const hasSellerPackage = Boolean(
        userProfile?.seller_referral_code && 
        (userProfile as any)?.scholarship_package_id
      );

      // Se tem pacote de vendedor, usar valores dinâmicos
      if (hasSellerPackage && (userProfile as any)?.scholarship_package_id) {
        const userPackage = packages.find(p => p.id === (userProfile as any).scholarship_package_id);
        
        if (userPackage) {
          // Considerar dependentes para Selection Process e I-20 Control Fee
          const dependents = Number(userProfile?.dependents) || 0;
          const dependentCost = dependents * 75; // $75 por dependente para cada taxa
          
          return {
            selectionProcessFee: `$${userPackage.selection_process_fee + dependentCost}`,
            scholarshipFee: `$${userPackage.scholarship_fee}`, // Scholarship fee não tem dependentes
            i20ControlFee: `$${userPackage.i20_control_fee + dependentCost}`,
            hasSellerPackage: true,
            packageName: userPackage.name,
            packageNumber: userPackage.package_number
          };
        }
      }

      // Se não tem pacote de vendedor ou não está logado, usar valores padrão do sistema
      return {
        selectionProcessFee: `$${getFeeAmount('selection_process')}`,
        scholarshipFee: `$${getFeeAmount('scholarship_fee')}`,
        i20ControlFee: `$${getFeeAmount('i20_control_fee')}`,
        hasSellerPackage: false
      };
    } catch (error) {
      // Em caso de erro, retornar valores padrão
      console.warn('Error in useDynamicFees:', error);
      return {
        selectionProcessFee: '$350.00',
        scholarshipFee: '$550.00',
        i20ControlFee: '$900.00',
        hasSellerPackage: false
      };
    }
  }, [userProfile, packages, feeLoading, packagesLoading, getFeeAmount]);
};