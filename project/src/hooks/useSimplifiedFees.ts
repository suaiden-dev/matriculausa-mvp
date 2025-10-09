import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SimplifiedFees {
  fee350: number;
  fee550: number;
  fee900: number;
  loading: boolean;
  error: string | null;
}

export const useSimplifiedFees = (): SimplifiedFees => {
  const [fees, setFees] = useState<SimplifiedFees>({
    fee350: 350,
    fee550: 550,
    fee900: 900,
    loading: true,
    error: null
  });

  useEffect(() => {
    let isMounted = true;

    const fetchSimplifiedFees = async () => {
      try {
        console.log('🔍 [useSimplifiedFees] Iniciando busca das taxas simplificadas...');

        const { data, error } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['simplified_fee_350', 'simplified_fee_550', 'simplified_fee_900']);

        if (error) {
          throw error;
        }

        const feeData = {
          fee350: 350,
          fee550: 550,
          fee900: 900,
          loading: false,
          error: null
        };

        if (data && data.length > 0) {
          data.forEach(item => {
            switch (item.key) {
              case 'simplified_fee_350':
                feeData.fee350 = parseInt(item.value) || 350;
                break;
              case 'simplified_fee_550':
                feeData.fee550 = parseInt(item.value) || 550;
                break;
              case 'simplified_fee_900':
                feeData.fee900 = parseInt(item.value) || 900;
                break;
            }
          });
          console.log('✅ [useSimplifiedFees] Taxas carregadas do banco:', feeData);
        } else {
          console.log('⚠️ [useSimplifiedFees] Nenhum dado encontrado, usando valores padrão');
        }

        if (isMounted) {
          setFees(feeData);
        }
      } catch (err) {
        console.error('❌ [useSimplifiedFees] Erro ao buscar taxas:', err);
        if (isMounted) {
          setFees({
            fee350: 350,
            fee550: 550,
            fee900: 900,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }
    };

    fetchSimplifiedFees();

    return () => {
      isMounted = false;
    };
  }, []);

  return fees;
};
