import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useFeeConfig } from './useFeeConfig';
import { useSystemType } from './useSystemType';
import { useSimplifiedFees } from './useSimplifiedFees';

export interface DynamicFeeValues {
  selectionProcessFee: string | undefined;
  scholarshipFee: string | undefined;
  i20ControlFee: string | undefined;
  selectionProcessFeeAmount: number | undefined;
  scholarshipFeeAmount: number | undefined;
  i20ControlFeeAmount: number | undefined;
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
    console.log('🔍 [useDynamicFees] systemType:', systemType);
    console.log('🔍 [useDynamicFees] simplifiedFeesLoading:', simplifiedFeesLoading);
    console.log('🔍 [useDynamicFees] feeLoading:', feeLoading);
    console.log('🔍 [useDynamicFees] fee350:', fee350, 'fee550:', fee550, 'fee900:', fee900);
    
    // Para sistema simplificado, usar valores fixos (PRIORIDADE MÁXIMA)
    if (systemType === 'simplified') {
      // Aguardar carregamento das taxas simplificadas
      if (simplifiedFeesLoading) {
        console.log('⏳ [useDynamicFees] Sistema simplificado carregando, aguardando...');
        // Retornar valores undefined para indicar que ainda está carregando
        return {
          selectionProcessFee: undefined as any,
          scholarshipFee: undefined as any,
          i20ControlFee: undefined as any,
          selectionProcessFeeAmount: undefined as any,
          scholarshipFeeAmount: undefined as any,
          i20ControlFeeAmount: undefined as any,
          hasSellerPackage: false
        };
      }
      
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

    // Para sistema legacy, aguardar carregamento das taxas
    if (feeLoading) {
      console.log('⏳ [useDynamicFees] Sistema legacy carregando, aguardando...');
      // Retornar valores undefined para indicar que ainda está carregando
      return {
        selectionProcessFee: undefined as any,
        scholarshipFee: undefined as any,
        i20ControlFee: undefined as any,
        selectionProcessFeeAmount: undefined as any,
        scholarshipFeeAmount: undefined as any,
        i20ControlFeeAmount: undefined as any,
        hasSellerPackage: false
      };
    }

    // Calcular valores usando lógica de overrides (SISTEMA LEGACY)
    console.log('🔍 [useDynamicFees] Usando lógica do sistema legacy');
    const baseScholarship = Number(getFeeAmount('scholarship_fee'));
    const baseI20 = Number(getFeeAmount('i20_control_fee'));

    // Verificar se há override para Selection Process Fee
    const hasSelectionOverride = hasOverride('selection_process');
    const baseSelectionFee = Number(getFeeAmount('selection_process'));
    
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
  }, [systemType, simplifiedFeesLoading, feeLoading, fee350, fee550, fee900, userProfile, getFeeAmount, hasOverride]);
};