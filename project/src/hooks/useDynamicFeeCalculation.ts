import { useMemo, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useSystemType } from './useSystemType';
import { useSimplifiedFees } from './useSimplifiedFees';
import { useFeeConfig } from './useFeeConfig';
import { supabase } from '../lib/supabase';

export interface DynamicFeeCalculation {
  selectionProcessFee: number;
  scholarshipFee: number;
  i20ControlFee: number;
  selectionProcessFeeString: string;
  scholarshipFeeString: string;
  i20ControlFeeString: string;
  systemType: 'legacy' | 'simplified';
  isSimplified: boolean;
}

/**
 * Hook que calcula dinamicamente os valores das taxas baseado no sistema do usuário
 * - Sistema simplificado: 350, 550, 900
 * - Sistema legacy: valores do feeConfig ou padrões (400, 900, 900)
 * - Usuários sem vendedor: valores padrão do sistema
 */
export const useDynamicFeeCalculation = (userId?: string): DynamicFeeCalculation => {
  const { userProfile } = useAuth();
  const { systemType } = useSystemType();
  const { fee350, fee550, fee900, loading: simplifiedFeesLoading } = useSimplifiedFees();
  const { getFeeAmount } = useFeeConfig(userId);

  return useMemo(() => {
    // Para sistema simplificado, usar valores fixos
    if (systemType === 'simplified' && !simplifiedFeesLoading) {
      return {
        selectionProcessFee: fee350,
        scholarshipFee: fee550,
        i20ControlFee: fee900,
        selectionProcessFeeString: `$${fee350.toFixed(2)}`,
        scholarshipFeeString: `$${fee550.toFixed(2)}`,
        i20ControlFeeString: `$${fee900.toFixed(2)}`,
        systemType: 'simplified',
        isSimplified: true
      };
    }

    // Para sistema legacy ou usuários sem vendedor, usar valores do feeConfig ou padrões
    const selectionProcessFee = Number(getFeeAmount('selection_process')) || 400;
    const scholarshipFee = Number(getFeeAmount('scholarship_fee')) || 900;
    const i20ControlFee = Number(getFeeAmount('i20_control_fee')) || 900;

    return {
      selectionProcessFee,
      scholarshipFee,
      i20ControlFee,
      selectionProcessFeeString: `$${selectionProcessFee.toFixed(2)}`,
      scholarshipFeeString: `$${scholarshipFee.toFixed(2)}`,
      i20ControlFeeString: `$${i20ControlFee.toFixed(2)}`,
      systemType: 'legacy',
      isSimplified: false
    };
  }, [systemType, simplifiedFeesLoading, fee350, fee550, fee900, getFeeAmount]);
};

/**
 * Hook para calcular taxas de um usuário específico (útil para dashboards)
 * Detecta automaticamente o sistema do usuário baseado no seller_referral_code
 */
export const useDynamicFeeCalculationForUser = (targetUserId: string): DynamicFeeCalculation => {
  const { getFeeAmount } = useFeeConfig(targetUserId);
  const { fee350, fee550, fee900, loading: simplifiedFeesLoading } = useSimplifiedFees();
  const [userSystemType, setUserSystemType] = useState<'legacy' | 'simplified'>('legacy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectUserSystemType = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_user_system_type', { user_id_param: targetUserId });

        if (error) {
          console.error('Error detecting user system type:', error);
          setUserSystemType('legacy');
        } else {
          setUserSystemType(data as 'legacy' | 'simplified');
        }
      } catch (err) {
        console.error('Error detecting user system type:', err);
        setUserSystemType('legacy');
      } finally {
        setLoading(false);
      }
    };

    if (targetUserId) {
      detectUserSystemType();
    }
  }, [targetUserId]);
  
  return useMemo(() => {
    // Para sistema simplificado, usar valores fixos (PRIORIDADE)
    if (userSystemType === 'simplified' && !simplifiedFeesLoading) {
      return {
        selectionProcessFee: fee350,
        scholarshipFee: fee550,
        i20ControlFee: fee900,
        selectionProcessFeeString: `$${fee350.toFixed(2)}`,
        scholarshipFeeString: `$${fee550.toFixed(2)}`,
        i20ControlFeeString: `$${fee900.toFixed(2)}`,
        systemType: 'simplified',
        isSimplified: true
      };
    }

    // Se ainda está carregando, usar valores padrão temporários
    if (loading || simplifiedFeesLoading) {
      const selectionProcessFee = Number(getFeeAmount('selection_process')) || 350;
      const scholarshipFee = Number(getFeeAmount('scholarship_fee')) || 550;
      const i20ControlFee = Number(getFeeAmount('i20_control_fee')) || 900;

      return {
        selectionProcessFee,
        scholarshipFee,
        i20ControlFee,
        selectionProcessFeeString: `$${selectionProcessFee.toFixed(2)}`,
        scholarshipFeeString: `$${scholarshipFee.toFixed(2)}`,
        i20ControlFeeString: `$${i20ControlFee.toFixed(2)}`,
        systemType: 'legacy',
        isSimplified: false
      };
    }

    // Para sistema legacy, usar valores do feeConfig ou padrões
    const selectionProcessFee = Number(getFeeAmount('selection_process')) || 400;
    const scholarshipFee = Number(getFeeAmount('scholarship_fee')) || 900;
    const i20ControlFee = Number(getFeeAmount('i20_control_fee')) || 900;

    return {
      selectionProcessFee,
      scholarshipFee,
      i20ControlFee,
      selectionProcessFeeString: `$${selectionProcessFee.toFixed(2)}`,
      scholarshipFeeString: `$${scholarshipFee.toFixed(2)}`,
      i20ControlFeeString: `$${i20ControlFee.toFixed(2)}`,
      systemType: 'legacy',
      isSimplified: false
    };
  }, [userSystemType, loading, simplifiedFeesLoading, fee350, fee550, fee900, getFeeAmount]);
};
