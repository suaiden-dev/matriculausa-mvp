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
    const fetchSimplifiedFees = async () => {
      try {
        setFees(prev => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['simplified_fee_350', 'simplified_fee_550', 'simplified_fee_900']);

        if (error) {
          throw error;
        }

        if (data) {
          const feeData = data.reduce((acc, item) => {
            switch (item.key) {
              case 'simplified_fee_350':
                acc.fee350 = parseInt(item.value) || 350;
                break;
              case 'simplified_fee_550':
                acc.fee550 = parseInt(item.value) || 550;
                break;
              case 'simplified_fee_900':
                acc.fee900 = parseInt(item.value) || 900;
                break;
            }
            return acc;
          }, { fee350: 350, fee550: 550, fee900: 900 });

          setFees({
            ...feeData,
            loading: false,
            error: null
          });
        } else {
          // Use default values if no data found
          setFees({
            fee350: 350,
            fee550: 550,
            fee900: 900,
            loading: false,
            error: null
          });
        }
      } catch (err) {
        console.error('Error fetching simplified fees:', err);
        setFees(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
      }
    };

    fetchSimplifiedFees();
  }, []);

  return fees;
};
