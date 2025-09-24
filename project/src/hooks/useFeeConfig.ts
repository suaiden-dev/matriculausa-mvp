import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPackageFees } from '../types';

export interface FeeConfig {
  selection_process_fee: number;
  application_fee_default: number;
  scholarship_fee_default: number;
  i20_control_fee: number;
}

const DEFAULT_FEE_CONFIG: FeeConfig = {
  selection_process_fee: 400,
  application_fee_default: 400,
  scholarship_fee_default: 900,
  i20_control_fee: 900
};

export const useFeeConfig = (userId?: string) => {
  const [feeConfig, setFeeConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG);
  const [userPackageFees, setUserPackageFees] = useState<UserPackageFees | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeeConfig();
  }, []);

  useEffect(() => {
    if (userId) {
      loadUserPackageFees();
    }
  }, [userId]);

  const loadFeeConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Novo modelo: valores fixos. Ignorar overrides do banco.
      setFeeConfig(DEFAULT_FEE_CONFIG);

    } catch (err) {
      console.error('❌ [useFeeConfig] Erro inesperado:', err);
      setError('Erro ao carregar configurações de taxas');
      setFeeConfig(DEFAULT_FEE_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPackageFees = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_package_fees', {
          user_id_param: userId
        });

      if (error) {
        console.warn('⚠️ [useFeeConfig] Erro ao carregar taxas do pacote do usuário:', error);
        setUserPackageFees(null);
        return;
      }

      setUserPackageFees(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error('❌ [useFeeConfig] Erro inesperado ao carregar taxas do pacote:', err);
      setUserPackageFees(null);
    }
  };

  const updateFeeConfig = async (newConfig: Partial<FeeConfig>) => {
    try {
      setLoading(true);
      setError(null);

      // Atualizar configurações no banco de dados
      const updates = Object.entries(newConfig).map(([key, value]) => ({
        key,
        value: value.toString()
      }));

      const { error: updateError } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' });

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado local
      setFeeConfig(prev => ({ ...prev, ...newConfig }));
      console.log('✅ [useFeeConfig] Configurações atualizadas:', newConfig);

    } catch (err) {
      console.error('❌ [useFeeConfig] Erro ao atualizar configurações:', err);
      setError('Erro ao atualizar configurações de taxas');
    } finally {
      setLoading(false);
    }
  };

  const getFeeAmount = (feeType: string, customAmount?: number): number => {
    if (customAmount !== undefined) {
      return customAmount;
    }

    // Novo modelo: sempre usar valores do sistema (fixos)
    switch (feeType) {
      case 'selection_process':
        return feeConfig.selection_process_fee;
      case 'application_fee':
        return feeConfig.application_fee_default;
      case 'scholarship_fee':
        return feeConfig.scholarship_fee_default;
      case 'i-20_control_fee':
      case 'i20_control_fee':
        return feeConfig.i20_control_fee;
      default:
        return feeConfig.application_fee_default;
    }
  };

  const formatFeeAmount = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Se o valor for maior ou igual a 10000, está em centavos (ex: 70000 = $700.00)
    if (numAmount >= 10000) {
      const dollars = numAmount / 100;
      return `$${dollars.toFixed(2)}`;
    }
    // Se o valor for menor que 10000, já está em dólares (ex: 350 = $350.00)
    return `$${numAmount.toFixed(2)}`;
  };

  const processTranslation = (text: any): string => {
    // Verifica se o texto é uma string válida
    if (typeof text !== 'string') {
      return text; // Retorna o valor original se não for string
    }
    
    return text
      .replace(/\${selectionProcessFee}/g, formatFeeAmount(feeConfig.selection_process_fee))
      .replace(/\${scholarshipFee}/g, formatFeeAmount(feeConfig.scholarship_fee_default))
      .replace(/\${i20ControlFee}/g, formatFeeAmount(feeConfig.i20_control_fee))
      .replace(/\${applicationFee}/g, formatFeeAmount(feeConfig.application_fee_default));
  };

  return {
    feeConfig,
    userPackageFees,
    loading,
    error,
    loadFeeConfig,
    loadUserPackageFees,
    updateFeeConfig,
    getFeeAmount,
    formatFeeAmount,
    processTranslation
  };
};
