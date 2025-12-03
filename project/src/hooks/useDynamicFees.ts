import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useFeeConfig } from './useFeeConfig';
import { useSystemType } from './useSystemType';
import { useSimplifiedFees } from './useSimplifiedFees';
import { useAffiliateAdminCheck } from './useAffiliateAdminCheck';

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
  const { systemType, loading: systemTypeLoading } = useSystemType();
  const { fee350, fee550, fee900, loading: simplifiedFeesLoading } = useSimplifiedFees();
  const { isTheFutureOfEnglishAffiliate, affiliateAdminEmail, loading: affiliateCheckLoading } = useAffiliateAdminCheck();
  // Pacotes dinâmicos descontinuados com nova estrutura de preços

  return useMemo(() => {
    // ✅ PRIORIDADE MÁXIMA: Verificar se é affiliate admin "info@thefutureofenglish.com"
    // Se ainda estiver carregando, aguardar antes de aplicar valores fixos
    if (affiliateCheckLoading) {
      console.log('⏳ [useDynamicFees] Verificação de affiliate admin ainda carregando, aguardando...');
      // Aguardar verificação do affiliate antes de continuar
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
    
    if (isTheFutureOfEnglishAffiliate) {
      // ✅ Valores fixos para affiliate admin "info@thefutureofenglish.com"
      console.log('✅ [useDynamicFees] Usando valores fixos para affiliate admin info@thefutureofenglish.com');
      return {
        selectionProcessFee: '$350.00',
        scholarshipFee: '$550.00',
        i20ControlFee: '$900.00',
        selectionProcessFeeAmount: 350,
        scholarshipFeeAmount: 550,
        i20ControlFeeAmount: 900,
        hasSellerPackage: false
      };
    }

    // ✅ CORREÇÃO: Aguardar systemType estar pronto antes de calcular
    if (systemTypeLoading) {
      console.log('⏳ [useDynamicFees] SystemType ainda carregando, aguardando...');
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
      
      // ✅ CORREÇÃO: Para sistema simplificado, Selection Process Fee é fixo em $350 (sem dependentes)
      // Dependentes só afetam Application Fee ($100 por dependente)
      
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
    const baseScholarship = Number(getFeeAmount('scholarship_fee'));
    const baseI20 = Number(getFeeAmount('i20_control_fee'));

    // Verificar se há override para Selection Process Fee
    const hasSelectionOverride = hasOverride('selection_process');
    
    // Se há override, usar o valor do override diretamente (já vem do getFeeAmount)
    // Se não há override, calcular base + dependentes
    let finalSelectionFee: number;
    if (hasSelectionOverride) {
      // Usar valor do override (getFeeAmount já retorna o valor do override)
      finalSelectionFee = Number(getFeeAmount('selection_process'));
    } else {
      // Para legacy, a base deve ser 400 independentemente do valor global (350 é do simplificado)
      const baseSelectionFee = 400;
      const dependents = Number(userProfile?.dependents) || 0;
      
      // ✅ Custo de $150 por dependente só se for do affiliate admin "contato@brantimmigration.com"
      const isBrantImmigrationAffiliate = affiliateAdminEmail?.toLowerCase() === 'contato@brantimmigration.com';
      const dependentsCost = isBrantImmigrationAffiliate ? dependents * 150 : 0;
      
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
  }, [systemType, systemTypeLoading, simplifiedFeesLoading, feeLoading, fee350, fee550, fee900, userProfile, getFeeAmount, hasOverride, isTheFutureOfEnglishAffiliate, affiliateAdminEmail, affiliateCheckLoading]);
};