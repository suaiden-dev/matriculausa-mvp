import { useMemo } from 'react';
import { useSystemType } from './useSystemType';
import { useSimplifiedFees } from './useSimplifiedFees';
import { useFeeConfig } from './useFeeConfig';

export interface UserFees {
  selectionProcessFee: number;
  scholarshipFee: number;
  i20ControlFee: number;
  selectionProcessFeeString: string;
  scholarshipFeeString: string;
  i20ControlFeeString: string;
}

/**
 * Hook que retorna os valores corretos das taxas baseado no sistema do usuário
 */
export const useUserFees = (userId?: string): UserFees => {
  const { systemType } = useSystemType();
  const { fee350, fee550, fee900, loading: simplifiedFeesLoading } = useSimplifiedFees();
  const { getFeeAmount } = useFeeConfig(userId);

  return useMemo(() => {
    // Para sistema simplificado, usar valores vindo do banco (via useSimplifiedFees)
    if (systemType === 'simplified' && !simplifiedFeesLoading) {
      return {
        selectionProcessFee: fee350,
        scholarshipFee: fee550,
        i20ControlFee: fee900,
        selectionProcessFeeString: `$${fee350.toFixed(2)}`,
        scholarshipFeeString: `$${fee550.toFixed(2)}`,
        i20ControlFeeString: `$${fee900.toFixed(2)}`,
      };
    }

    // Para sistema legacy, usar valores padrão
    const selectionProcessFee = Number(getFeeAmount('selection_process')) || 400;
    const scholarshipFee = Number(getFeeAmount('scholarship_fee')) || 900;
    const i20ControlFee = Number(getFeeAmount('i20_control_fee')) || 900;

    return {
      selectionProcessFee,
      scholarshipFee,
      i20ControlFee,
      selectionProcessFeeString: `$${selectionProcessFee}`,
      scholarshipFeeString: `$${scholarshipFee}`,
      i20ControlFeeString: `$${i20ControlFee}`,
    };
  }, [systemType, simplifiedFeesLoading, fee350, fee550, fee900, getFeeAmount]);
};

/**
 * Hook que retorna os valores corretos das taxas para um usuário específico
 * Útil para dashboards que mostram dados de outros usuários
 */
export const useUserFeesForUser = (userId: string): UserFees => {
  const { getFeeAmount } = useFeeConfig(userId);
  
  // Para dashboards, sempre usar valores padrão por enquanto
  // TODO: Implementar lógica para detectar sistema do usuário específico
  const selectionProcessFee = Number(getFeeAmount('selection_process')) || 400;
  const scholarshipFee = Number(getFeeAmount('scholarship_fee')) || 900;
  const i20ControlFee = Number(getFeeAmount('i20_control_fee')) || 900;

  return {
    selectionProcessFee,
    scholarshipFee,
    i20ControlFee,
    selectionProcessFeeString: `$${selectionProcessFee}`,
    scholarshipFeeString: `$${scholarshipFee}`,
    i20ControlFeeString: `$${i20ControlFee}`,
  };
};
