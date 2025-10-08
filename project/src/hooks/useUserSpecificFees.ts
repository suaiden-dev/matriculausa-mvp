import { useMemo, useState, useEffect } from 'react';
import { useSimplifiedFees } from './useSimplifiedFees';
import { useFeeConfig } from './useFeeConfig';
import { supabase } from '../lib/supabase';

export interface UserSpecificFees {
  selectionProcessFee: number;
  scholarshipFee: number;
  i20ControlFee: number;
  selectionProcessFeeString: string;
  scholarshipFeeString: string;
  i20ControlFeeString: string;
  systemType: 'legacy' | 'simplified';
  isSimplified: boolean;
  loading: boolean;
}

/**
 * Hook que calcula taxas para um usuário específico
 * Detecta automaticamente o sistema do usuário baseado no seller_referral_code
 */
export const useUserSpecificFees = (userId: string): UserSpecificFees => {
  const { getFeeAmount } = useFeeConfig(userId);
  const { fee350, fee550, fee900, loading: simplifiedFeesLoading } = useSimplifiedFees();
  const [userSystemType, setUserSystemType] = useState<'legacy' | 'simplified'>('legacy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectUserSystemType = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_user_system_type', { user_id_param: userId });

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

    if (userId) {
      detectUserSystemType();
    }
  }, [userId]);
  
  return useMemo(() => {
    // Se ainda está carregando, usar valores padrão
    if (loading || simplifiedFeesLoading) {
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
        isSimplified: false,
        loading: true
      };
    }

    // Para sistema simplificado, usar valores fixos
    if (userSystemType === 'simplified') {
      return {
        selectionProcessFee: fee350,
        scholarshipFee: fee550,
        i20ControlFee: fee900,
        selectionProcessFeeString: `$${fee350.toFixed(2)}`,
        scholarshipFeeString: `$${fee550.toFixed(2)}`,
        i20ControlFeeString: `$${fee900.toFixed(2)}`,
        systemType: 'simplified',
        isSimplified: true,
        loading: false
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
      isSimplified: false,
      loading: false
    };
  }, [userSystemType, loading, simplifiedFeesLoading, fee350, fee550, fee900, getFeeAmount]);
};
