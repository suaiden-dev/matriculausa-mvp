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
    // ✅ PRIORIDADE MÁXIMA ABSOLUTA: Verificar se há overrides ANTES de qualquer outra lógica
    // Se ainda estiver carregando, aguardar antes de aplicar valores
    if (feeLoading || affiliateCheckLoading) {
      // Aguardar verificação do affiliate e carregamento de fees antes de continuar
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
    
    // ✅ IMPORTANTE: getFeeAmount já verifica (em ordem de prioridade):
    // 1. Override personalizado
    // 2. Valor real pago (realPaymentAmounts de individual_fee_payments)
    // 3. Valores padrão
    // Portanto, vamos usar getFeeAmount diretamente e verificar se o valor retornado
    // é diferente dos valores fixos esperados (indicando override ou valor pago)
    
    // ✅ PRIORIDADE ALTA: Verificar se é affiliate admin "info@thefutureofenglish.com"
    if (isTheFutureOfEnglishAffiliate) {
      // ✅ Valores fixos para affiliate admin "info@thefutureofenglish.com"
      // Mas getFeeAmount já verifica override e valor pago primeiro
      const actualSelection = Number(getFeeAmount('selection_process'));
      const actualScholarship = Number(getFeeAmount('scholarship_fee'));
      const actualI20 = Number(getFeeAmount('i20_control_fee'));
      
      // Se o valor retornado for diferente dos valores fixos esperados, usar o valor retornado
      // (pode ser override ou valor já pago)
      const finalSelection = (actualSelection !== 350 && actualSelection !== 400) 
        ? actualSelection 
        : 350; // Usar valor fixo do affiliate se não houver override/pagamento
      const finalScholarship = (actualScholarship !== 550 && actualScholarship !== 900) 
        ? actualScholarship 
        : 550; // Usar valor fixo do affiliate se não houver override/pagamento
      const finalI20 = (actualI20 !== 900) 
        ? actualI20 
        : 900; // Usar valor fixo do affiliate se não houver override/pagamento
      
      return {
        selectionProcessFee: `$${finalSelection.toFixed(2)}`,
        scholarshipFee: `$${finalScholarship.toFixed(2)}`,
        i20ControlFee: `$${finalI20.toFixed(2)}`,
        selectionProcessFeeAmount: finalSelection,
        scholarshipFeeAmount: finalScholarship,
        i20ControlFeeAmount: finalI20,
        hasSellerPackage: false
      };
    }

    // ✅ PRIORIDADE ALTA: Valores fixos para affiliate admin "contato@brantimmigration.com"
    const isBrantImmigrationAffiliate = affiliateAdminEmail?.toLowerCase() === 'contato@brantimmigration.com';
    if (isBrantImmigrationAffiliate) {
      // Selection Process: $400 base + $150 por dependente
      const dependents = Number(userProfile?.dependents) || 0;
      const defaultSelectionAmount = 400 + (dependents * 150);
      
      // getFeeAmount já verifica override e valor pago primeiro
      const feeAmountValue = Number(getFeeAmount('selection_process'));
      const actualScholarship = Number(getFeeAmount('scholarship_fee'));
      const actualI20 = Number(getFeeAmount('i20_control_fee'));
      
      // Se o valor retornado for diferente do padrão esperado, usar o valor retornado
      // (pode ser override ou valor já pago)
      const finalSelection = (feeAmountValue !== 400 && feeAmountValue !== 350) 
        ? feeAmountValue // Override ou valor pago
        : defaultSelectionAmount; // Usar valor padrão do Brant com dependentes
      const finalScholarship = (actualScholarship !== 900 && actualScholarship !== 550) 
        ? actualScholarship 
        : 900; // Usar valor fixo do Brant se não houver override/pagamento
      const finalI20 = (actualI20 !== 900) 
        ? actualI20 
        : 900; // Usar valor fixo do Brant se não houver override/pagamento
      
      return {
        selectionProcessFee: `$${finalSelection.toFixed(2)}`,
        scholarshipFee: `$${finalScholarship.toFixed(2)}`,
        i20ControlFee: `$${finalI20.toFixed(2)}`,
        selectionProcessFeeAmount: finalSelection,
        scholarshipFeeAmount: finalScholarship,
        i20ControlFeeAmount: finalI20,
        hasSellerPackage: false
      };
    }

    // ✅ CORREÇÃO: Aguardar systemType estar pronto antes de calcular
    if (systemTypeLoading) {
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
    
    // Para sistema simplificado, usar valores fixos (mas considerar overrides)
    if (systemType === 'simplified') {
      // Aguardar carregamento das taxas simplificadas
      if (simplifiedFeesLoading) {
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
      // getFeeAmount já verifica override e valor pago primeiro
      const actualSelection = Number(getFeeAmount('selection_process'));
      const actualScholarship = Number(getFeeAmount('scholarship_fee'));
      const actualI20 = Number(getFeeAmount('i20_control_fee'));
      
      return {
        selectionProcessFee: `$${actualSelection.toFixed(2)}`,
        scholarshipFee: `$${actualScholarship.toFixed(2)}`,
        i20ControlFee: `$${actualI20.toFixed(2)}`,
        selectionProcessFeeAmount: actualSelection,
        scholarshipFeeAmount: actualScholarship,
        i20ControlFeeAmount: actualI20,
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
    // ✅ IMPORTANTE: getFeeAmount já verifica (em ordem):
    // 1. Override personalizado
    // 2. Valor real pago (realPaymentAmounts)
    // 3. Valores padrão
    // Então podemos usar getFeeAmount diretamente, pois ele já retorna o valor correto
    const actualSelection = Number(getFeeAmount('selection_process'));
    const actualScholarship = Number(getFeeAmount('scholarship_fee'));
    const actualI20 = Number(getFeeAmount('i20_control_fee'));
    
    // Para legacy, se não houver override/pagamento, calcular base + dependentes
    // Se o valor retornado for 400 ou 350 (valores padrão), calcular com dependentes se necessário
    let finalSelectionFee: number;
    if (actualSelection === 400 || actualSelection === 350) {
      // Para legacy, a base deve ser 400 independentemente do valor global (350 é do simplificado)
      const baseSelectionFee = 400;
      const dependents = Number(userProfile?.dependents) || 0;
      
      // ✅ Custo de $150 por dependente só se for do affiliate admin "contato@brantimmigration.com"
      const isBrantImmigrationAffiliate = affiliateAdminEmail?.toLowerCase() === 'contato@brantimmigration.com';
      const dependentsCost = isBrantImmigrationAffiliate ? dependents * 150 : 0;
      
      finalSelectionFee = baseSelectionFee + dependentsCost;
    } else {
      // Se o valor for diferente de 400 ou 350, é override ou valor pago, usar diretamente
      finalSelectionFee = actualSelection;
    }

    return {
      selectionProcessFee: `$${finalSelectionFee.toFixed(2)}`,
      scholarshipFee: `$${actualScholarship.toFixed(2)}`,
      i20ControlFee: `$${actualI20.toFixed(2)}`,
      selectionProcessFeeAmount: finalSelectionFee,
      scholarshipFeeAmount: actualScholarship,
      i20ControlFeeAmount: actualI20,
      hasSellerPackage: false
    };
  }, [systemType, systemTypeLoading, simplifiedFeesLoading, feeLoading, fee350, fee550, fee900, userProfile, getFeeAmount, hasOverride, isTheFutureOfEnglishAffiliate, affiliateAdminEmail, affiliateCheckLoading]);
};