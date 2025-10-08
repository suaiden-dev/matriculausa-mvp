import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useFeeConfig } from './useFeeConfig';
import { useSystemType } from './useSystemType';
import { useSimplifiedFees } from './useSimplifiedFees';

export interface DynamicFeeValues {
  selectionProcessFee: string;
  scholarshipFee: string;
  i20ControlFee: string;
  selectionProcessFeeAmount: number;
  scholarshipFeeAmount: number;
  i20ControlFeeAmount: number;
  hasSellerPackage: boolean;
  packageName?: string;
  packageNumber?: number;
}

export const useDynamicFees = (): DynamicFeeValues => {
  const { userProfile } = useAuth();
  const { getFeeAmount, hasOverride, loading: feeLoading } = useFeeConfig(userProfile?.user_id);
  const { systemType } = useSystemType();
  const { fee350, fee550, fee900, loading: simplifiedFeesLoading } = useSimplifiedFees();
  // Pacotes dinâmicos descontinuados com nova estrutura de preços

  return useMemo(() => {
    try {
      // Se ainda está carregando, retornar valores padrão (novos defaults)
      if (feeLoading) {
        return {
          selectionProcessFee: '$400.00',
          scholarshipFee: '$900.00',
          i20ControlFee: '$900.00',
          selectionProcessFeeAmount: 400,
          scholarshipFeeAmount: 900,
          i20ControlFeeAmount: 900,
          hasSellerPackage: false
        };
      }

      // Para sistema simplificado, usar valores fixos
      console.log('🔍 [useDynamicFees] systemType:', systemType);
      console.log('🔍 [useDynamicFees] simplifiedFeesLoading:', simplifiedFeesLoading);
      console.log('🔍 [useDynamicFees] fee350:', fee350, 'fee550:', fee550, 'fee900:', fee900);
      
      if (systemType === 'simplified' && !simplifiedFeesLoading) {
        console.log('✅ [useDynamicFees] Usando valores do sistema simplificado:', { fee350, fee550, fee900 });
        return {
          selectionProcessFee: `$${fee350.toFixed(2)}`,
          scholarshipFee: `$${fee550.toFixed(2)}`,
          i20ControlFee: `$${fee900.toFixed(2)}`,
          selectionProcessFeeAmount: fee350,
          scholarshipFeeAmount: fee550,
          i20ControlFeeAmount: fee900,
          hasSellerPackage: false
        };
      }

      // Calcular valores usando lógica de overrides
      const baseScholarship = Number(getFeeAmount('scholarship_fee')) || 0;
      const baseI20 = Number(getFeeAmount('i20_control_fee')) || 0;

      // Verificar se há override para Selection Process Fee
      const hasSelectionOverride = hasOverride('selection_process');
      const baseSelectionFee = Number(getFeeAmount('selection_process')) || 0;
      
      let finalSelectionFee = baseSelectionFee;
      
      // Se NÃO há override, adicionar dependentes; se há override, usar valor exato
      if (!hasSelectionOverride) {
        const dependents = Number(userProfile?.dependents) || 0;
        const dependentsCost = dependents * 150;
        finalSelectionFee = baseSelectionFee + dependentsCost;
      }

      return {
        selectionProcessFee: `$${finalSelectionFee.toFixed(2)}`,
        scholarshipFee: `$${baseScholarship.toFixed(2)}`,
        i20ControlFee: `$${baseI20.toFixed(2)}`,
        selectionProcessFeeAmount: finalSelectionFee,
        scholarshipFeeAmount: baseScholarship,
        i20ControlFeeAmount: baseI20,
        hasSellerPackage: false
      };
    } catch (error) {
      // Em caso de erro, retornar valores padrão
      console.warn('Error in useDynamicFees:', error);
      return {
        selectionProcessFee: '$400.00',
        scholarshipFee: '$900.00',
        i20ControlFee: '$900.00',
        selectionProcessFeeAmount: 400,
        scholarshipFeeAmount: 900,
        i20ControlFeeAmount: 900,
        hasSellerPackage: false
      };
    }
  }, [userProfile, feeLoading, getFeeAmount]);
};