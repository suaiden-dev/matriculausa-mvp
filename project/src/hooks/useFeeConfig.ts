import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface FeeConfig {
  selection_process_fee: number;
  application_fee_default: number;
  scholarship_fee_default: number;
  i20_control_fee: number;
}

const DEFAULT_FEE_CONFIG: FeeConfig = {
  selection_process_fee: 350,
  application_fee_default: 350,
  scholarship_fee_default: 550,
  i20_control_fee: 900
};

export const useFeeConfig = () => {
  const [feeConfig, setFeeConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeeConfig();
  }, []);

  const loadFeeConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar configurações de taxas do banco de dados
      const { data: systemSettings, error: settingsError } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'selection_process_fee',
          'application_fee_default', 
          'scholarship_fee_default',
          'i20_control_fee'
        ]);

      if (settingsError) {
        console.warn('⚠️ [useFeeConfig] Erro ao carregar configurações do banco, usando valores padrão:', settingsError);
        setFeeConfig(DEFAULT_FEE_CONFIG);
        return;
      }

      // Converter dados do banco para o formato esperado
      const configFromDB: Partial<FeeConfig> = {};
      systemSettings?.forEach(setting => {
        const value = parseFloat(setting.value);
        if (!isNaN(value)) {
          switch (setting.key) {
            case 'selection_process_fee':
              configFromDB.selection_process_fee = value;
              break;
            case 'application_fee_default':
              configFromDB.application_fee_default = value;
              break;
            case 'scholarship_fee_default':
              configFromDB.scholarship_fee_default = value;
              break;
            case 'i20_control_fee':
              configFromDB.i20_control_fee = value;
              break;
          }
        }
      });

      // Mesclar com valores padrão
      const finalConfig: FeeConfig = {
        ...DEFAULT_FEE_CONFIG,
        ...configFromDB
      };

      setFeeConfig(finalConfig);

    } catch (err) {
      console.error('❌ [useFeeConfig] Erro inesperado:', err);
      setError('Erro ao carregar configurações de taxas');
      setFeeConfig(DEFAULT_FEE_CONFIG);
    } finally {
      setLoading(false);
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

  const formatFeeAmount = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
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
    loading,
    error,
    loadFeeConfig,
    updateFeeConfig,
    getFeeAmount,
    formatFeeAmount,
    processTranslation
  };
};
