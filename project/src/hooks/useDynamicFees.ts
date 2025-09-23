import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useFeeConfig } from './useFeeConfig';

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
  // Pacotes dinâmicos descontinuados com nova estrutura de preços

  return useMemo(() => {
    try {
      // Se ainda está carregando, retornar valores padrão (novos defaults)
      if (feeLoading) {
        return {
          selectionProcessFee: '$400.00',
          scholarshipFee: '$900.00',
          i20ControlFee: '$900.00',
          hasSellerPackage: false
        };
      }

      // Calcular valores base do sistema
      const baseSelection = Number(getFeeAmount('selection_process')) || 0;
      const baseScholarship = Number(getFeeAmount('scholarship_fee')) || 0;
      const baseI20 = Number(getFeeAmount('i20_control_fee')) || 0;

      // Dependentes impactam 100% apenas o Selection Process
      const dependents = Number(userProfile?.dependents) || 0;
      const dependentsCost = dependents * 150;

      return {
        selectionProcessFee: `$${(baseSelection + dependentsCost).toFixed(2)}`,
        scholarshipFee: `$${baseScholarship.toFixed(2)}`,
        i20ControlFee: `$${baseI20.toFixed(2)}`,
        hasSellerPackage: false
      };
    } catch (error) {
      // Em caso de erro, retornar valores padrão
      console.warn('Error in useDynamicFees:', error);
      return {
        selectionProcessFee: '$400.00',
        scholarshipFee: '$900.00',
        i20ControlFee: '$900.00',
        hasSellerPackage: false
      };
    }
  }, [userProfile, feeLoading, getFeeAmount]);
};