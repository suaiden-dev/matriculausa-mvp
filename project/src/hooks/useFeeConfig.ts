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
  application_fee_default: 350,
  scholarship_fee_default: 900,
  i20_control_fee: 900
};

interface UserFeeOverrides {
  selection_process_fee?: number;
  application_fee?: number;
  scholarship_fee?: number;
  i20_control_fee?: number;
}

export const useFeeConfig = (userId?: string) => {
  const [feeConfig, setFeeConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG);
  const [userPackageFees, setUserPackageFees] = useState<UserPackageFees | null>(null);
  const [userFeeOverrides, setUserFeeOverrides] = useState<UserFeeOverrides | null>(null);
  const [realPaymentAmounts, setRealPaymentAmounts] = useState<{[key: string]: number}>({});
  const [userSystemType, setUserSystemType] = useState<'legacy' | 'simplified' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeeConfig();
  }, []);

  useEffect(() => {
    if (userId) {
      loadUserPackageFees();
      loadUserFeeOverrides();
      loadRealPaymentAmounts();
      loadUserSystemType();
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

  const loadUserFeeOverrides = async () => {
    if (!userId) return;

    try {
      // Tentar primeiro via função SECURITY DEFINER para bypass de RLS em dashboards
      let data: any = null;
      let error: any = null;

      try {
        const rpc = await supabase.rpc('get_user_fee_overrides', { user_id_param: userId });
        if (!rpc.error) {
          data = rpc.data || null;
        } else {
          error = rpc.error;
        }
      } catch (e) {
        error = e;
      }

      // Fallback: tentar select direto (caso o contexto atual permita SELECT)
      if (!data) {
        const direct = await supabase
          .from('user_fee_overrides')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (!direct.error) {
          data = direct.data || null;
        } else if (direct.error?.code !== 'PGRST116') {
          error = direct.error;
        }
      }

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('⚠️ [useFeeConfig] Erro ao carregar overrides de taxas do usuário:', error);
        setUserFeeOverrides(null);
        return;
      }

      // Normalizar para números (podem vir como string do Postgres)
      const normalized = data ? {
        selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
        application_fee: data.application_fee != null ? Number(data.application_fee) : undefined,
        scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
        i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
      } : null;

      setUserFeeOverrides(normalized);
    } catch (err) {
      console.error('❌ [useFeeConfig] Erro inesperado ao carregar overrides de taxas:', err);
      setUserFeeOverrides(null);
    }
  };

  const loadRealPaymentAmounts = async () => {
    if (!userId) return;

    try {
      // Usar função RPC com SECURITY DEFINER para bypassar RLS
      const { data, error } = await supabase
        .rpc('get_real_payment_amount', {
          user_id_param: userId
        });

      if (error) {
        console.warn('⚠️ [useFeeConfig] Erro ao carregar valores reais de pagamento:', error);
        setRealPaymentAmounts({});
        return;
      }

      if (data && data.length > 0 && data[0].payment_amount) {
        setRealPaymentAmounts({
          selection_process: data[0].payment_amount
        });
        
        // Debug para jolie8862@uorak.com
        if (userId === '935e0eec-82c6-4a70-b013-e85dde6e63f7') {
          console.log('🔍 [useFeeConfig] jolie8862@uorak.com - Real payment amount loaded:', data[0].payment_amount);
        }
      } else {
        setRealPaymentAmounts({});
        
        // Debug para jolie8862@uorak.com
        if (userId === '935e0eec-82c6-4a70-b013-e85dde6e63f7') {
          console.log('🔍 [useFeeConfig] jolie8862@uorak.com - No real payment amount found');
        }
      }
    } catch (err) {
      console.error('❌ [useFeeConfig] Erro inesperado ao carregar valores reais de pagamento:', err);
      setRealPaymentAmounts({});
    }
  };

  const loadUserSystemType = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('system_type')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.warn('⚠️ [useFeeConfig] Erro ao carregar system_type:', error);
        }
        setUserSystemType('legacy'); // Default para legacy
        return;
      }

      const systemType = data?.system_type || 'legacy';
      setUserSystemType(systemType as 'legacy' | 'simplified');
      
      // Debug para jolie8862@uorak.com
      if (userId === '935e0eec-82c6-4a70-b013-e85dde6e63f7') {
        console.log('🔍 [useFeeConfig] jolie8862@uorak.com - System type loaded:', systemType);
      }
    } catch (err) {
      console.error('❌ [useFeeConfig] Erro inesperado ao carregar system_type:', err);
      setUserSystemType('legacy');
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

    // PRIORIDADE 1: Verificar se há valor real pago na tabela affiliate_referrals
    if (realPaymentAmounts && Object.keys(realPaymentAmounts).length > 0) {
      switch (feeType) {
        case 'selection_process':
          if (realPaymentAmounts.selection_process !== undefined) {
            // Debug para jolie8862@uorak.com
            if (userId === '935e0eec-82c6-4a70-b013-e85dde6e63f7') {
              console.log('🔍 [useFeeConfig] jolie8862@uorak.com - Using REAL payment amount:', realPaymentAmounts.selection_process);
            }
            return realPaymentAmounts.selection_process;
          }
          break;
      }
    }

    // PRIORIDADE 1.5: Para selection_process sem valor real pago, usar system_type
    if (feeType === 'selection_process' && (!realPaymentAmounts || !realPaymentAmounts.selection_process)) {
      if (userSystemType === 'simplified') {
        // Debug para jolie8862@uorak.com
        if (userId === '935e0eec-82c6-4a70-b013-e85dde6e63f7') {
          console.log('🔍 [useFeeConfig] jolie8862@uorak.com - Using system_type simplified for Selection Process: 350');
        }
        return 350;
      } else {
        return 400; // legacy
      }
    }

    // PRIORIDADE 2: Verificar se há override personalizado para este usuário
    if (userFeeOverrides) {
      switch (feeType) {
        case 'selection_process':
          if (userFeeOverrides.selection_process_fee !== undefined) {
            return userFeeOverrides.selection_process_fee;
          }
          break;
        case 'application_fee':
          if (userFeeOverrides.application_fee !== undefined) {
            return userFeeOverrides.application_fee;
          }
          break;
        case 'scholarship_fee':
          if (userFeeOverrides.scholarship_fee !== undefined) {
            return userFeeOverrides.scholarship_fee;
          }
          break;
        case 'i-20_control_fee':
        case 'i20_control_fee':
          if (userFeeOverrides.i20_control_fee !== undefined) {
            return userFeeOverrides.i20_control_fee;
          }
          break;
      }
    }

    // PRIORIDADE 3: Usar valores baseados no system_type do usuário
    // Para scholarship_fee, usar valores diferentes baseados no sistema
    if (feeType === 'scholarship_fee') {
      // Usar system_type carregado diretamente da tabela user_profiles
      if (userSystemType) {
        const amount = userSystemType === 'simplified' ? 550 : 900;
        
        // Debug para jolie8862@uorak.com
        if (userId === '935e0eec-82c6-4a70-b013-e85dde6e63f7') {
          console.log('🔍 [useFeeConfig] jolie8862@uorak.com - Scholarship Fee system_type:', userSystemType, 'amount:', amount);
        }
        
        return amount;
      }
      // Fallback para valores padrão se não conseguir determinar o sistema
      return feeConfig.scholarship_fee_default;
    }

    // PRIORIDADE 4: Para i20_control_fee, sempre $900 para ambos os sistemas
    if (feeType === 'i-20_control_fee' || feeType === 'i20_control_fee') {
      return 900;
    }

    // PRIORIDADE 5: Usar valores padrão do sistema para outros tipos de taxa
    switch (feeType) {
      case 'selection_process':
        return feeConfig.selection_process_fee;
      case 'application_fee':
        return feeConfig.application_fee_default;
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

  const hasOverride = (feeType: string): boolean => {
    if (!userFeeOverrides) return false;
    
    switch (feeType) {
      case 'selection_process':
        return userFeeOverrides.selection_process_fee !== undefined && userFeeOverrides.selection_process_fee !== null;
      case 'application_fee':
        return userFeeOverrides.application_fee !== undefined && userFeeOverrides.application_fee !== null;
      case 'scholarship_fee':
        return userFeeOverrides.scholarship_fee !== undefined && userFeeOverrides.scholarship_fee !== null;
      case 'i-20_control_fee':
      case 'i20_control_fee':
        return userFeeOverrides.i20_control_fee !== undefined && userFeeOverrides.i20_control_fee !== null;
      default:
        return false;
    }
  };

  return {
    feeConfig,
    userPackageFees,
    userFeeOverrides,
    realPaymentAmounts,
    userSystemType,
    loading,
    error,
    loadFeeConfig,
    loadUserPackageFees,
    loadUserFeeOverrides,
    loadRealPaymentAmounts,
    loadUserSystemType,
    updateFeeConfig,
    getFeeAmount,
    formatFeeAmount,
    processTranslation,
    hasOverride
  };
};
