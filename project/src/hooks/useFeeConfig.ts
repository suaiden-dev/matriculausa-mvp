import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { UserPackageFees } from "../types";

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
  i20_control_fee: 900,
};

interface UserFeeOverrides {
  selection_process_fee?: number;
  application_fee?: number;
  scholarship_fee?: number;
  i20_control_fee?: number;
  placement_fee?: number;
  ds160_package_fee?: number;
  i539_cos_package_fee?: number;
}

export const useFeeConfig = (userId?: string) => {
  const [state, setState] = useState<{
    feeConfig: FeeConfig;
    userPackageFees: UserPackageFees | null;
    userFeeOverrides: UserFeeOverrides | null;
    realPaymentAmounts: { [key: string]: number };
    userSystemType: "legacy" | "simplified" | null;
    userDependents: number;
    loading: boolean;
    error: string | null;
  }>({
    feeConfig: DEFAULT_FEE_CONFIG,
    userPackageFees: null,
    userFeeOverrides: null,
    realPaymentAmounts: {},
    userSystemType: null,
    userDependents: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadFeeConfig();
  }, []);

  useEffect(() => {
    if (userId) {
      loadUserFeeConfigConsolidated();
    }
  }, [userId]);

  const loadFeeConfig = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      setState(prev => ({ ...prev, feeConfig: DEFAULT_FEE_CONFIG, loading: false }));
    } catch (err) {
      console.error("❌ [useFeeConfig] Erro inesperado:", err);
      setState(prev => ({ ...prev, error: "Erro ao carregar configurações de taxas", feeConfig: DEFAULT_FEE_CONFIG, loading: false }));
    }
  };

  const loadUserPackageFees = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc("get_user_package_fees", { user_id_param: userId });
      if (error) {
        console.warn("⚠️ [useFeeConfig] Erro ao carregar taxas do pacote:", error);
        setState(prev => ({ ...prev, userPackageFees: null }));
        return;
      }
      setState(prev => ({ ...prev, userPackageFees: data && data.length > 0 ? data[0] : null }));
    } catch (err) {
      console.error("❌ [useFeeConfig] Erro inesperado:", err);
      setState(prev => ({ ...prev, userPackageFees: null }));
    }
  };

  const loadUserFeeOverrides = async () => {
    if (!userId) return;
    try {
      let data: any = null;
      let error: any = null;
      try {
        const rpc = await supabase.rpc("get_user_fee_overrides", { target_user_id: userId });
        if (!rpc.error) data = rpc.data || null;
        else error = rpc.error;
      } catch (e) { error = e; }

      if (!data) {
        const direct = await supabase.from("user_fee_overrides").select("*").eq("user_id", userId).single();
        if (!direct.error) data = direct.data || null;
        else if (direct.error?.code !== "PGRST116") error = direct.error;
      }

      if (error && error.code !== "PGRST116") {
        console.warn("⚠️ [useFeeConfig] Erro ao carregar overrides:", error);
        setState(prev => ({ ...prev, userFeeOverrides: null }));
        return;
      }

      const normalized = data ? {
        selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
        application_fee: data.application_fee != null ? Number(data.application_fee) : undefined,
        scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
        i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
        placement_fee: data.placement_fee != null ? Number(data.placement_fee) : undefined,
        ds160_package_fee: data.ds160_package_fee != null ? Number(data.ds160_package_fee) : undefined,
        i539_cos_package_fee: data.i539_cos_package_fee != null ? Number(data.i539_cos_package_fee) : undefined,
      } : null;

      setState(prev => ({ ...prev, userFeeOverrides: normalized }));
    } catch (err) {
      console.error("❌ [useFeeConfig] Erro inesperado:", err);
      setState(prev => ({ ...prev, userFeeOverrides: null }));
    }
  };

  const loadRealPaymentAmounts = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc("get_user_paid_fees_display", { user_id_param: userId });
      if (error) {
        console.warn("⚠️ [useFeeConfig] Erro ao carregar valores reais:", error);
        setState(prev => ({ ...prev, realPaymentAmounts: {} }));
        return;
      }

      if (data && data.length > 0) {
        const amounts: { [key: string]: number } = {};
        data.forEach((fee: any) => {
          let normalizedFeeType = fee.fee_type;
          if (normalizedFeeType) {
            normalizedFeeType = normalizedFeeType.replace(/_fee$/, "").replace(/-/g, "_");
          }
          if (normalizedFeeType) {
            amounts[normalizedFeeType] = Number(fee.display_amount);
            amounts[`${normalizedFeeType}_fee`] = Number(fee.display_amount);
          }
        });
        setState(prev => ({ ...prev, realPaymentAmounts: amounts }));
      } else {
        setState(prev => ({ ...prev, realPaymentAmounts: {} }));
      }
    } catch (err) {
      console.error("❌ [useFeeConfig] Erro inesperado:", err);
      setState(prev => ({ ...prev, realPaymentAmounts: {} }));
    }
  };

  const loadUserFeeConfigConsolidated = async () => {
    if (!userId) return;
    let useRpc = true;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_user_fee_config_consolidated", { target_user_id: userId });
      if (!rpcError && rpcData) {
        const data = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
        const updates: any = {};

        updates.userPackageFees = (data.user_package_fees && data.user_package_fees !== "null") ? data.user_package_fees : null;

        const dependentsValue = data.dependents;
        if (dependentsValue !== undefined && dependentsValue !== null && dependentsValue !== "null") {
          updates.userDependents = Number(dependentsValue);
        } else {
          updates.userDependents = 0;
        }

        if (data.user_fee_overrides && data.user_fee_overrides !== "null") {
          updates.userFeeOverrides = {
            selection_process_fee: data.user_fee_overrides.selection_process_fee != null ? Number(data.user_fee_overrides.selection_process_fee) : undefined,
            application_fee: data.user_fee_overrides.application_fee != null ? Number(data.user_fee_overrides.application_fee) : undefined,
            scholarship_fee: data.user_fee_overrides.scholarship_fee != null ? Number(data.user_fee_overrides.scholarship_fee) : undefined,
            i20_control_fee: data.user_fee_overrides.i20_control_fee != null ? Number(data.user_fee_overrides.i20_control_fee) : undefined,
            placement_fee: data.user_fee_overrides.placement_fee != null ? Number(data.user_fee_overrides.placement_fee) : undefined,
            ds160_package_fee: data.user_fee_overrides.ds160_package_fee != null ? Number(data.user_fee_overrides.ds160_package_fee) : undefined,
            i539_cos_package_fee: data.user_fee_overrides.i539_cos_package_fee != null ? Number(data.user_fee_overrides.i539_cos_package_fee) : undefined,
          };
        } else {
          updates.userFeeOverrides = null;
        }

        if (data.real_payment_amounts && Array.isArray(data.real_payment_amounts) && data.real_payment_amounts.length > 0) {
          const amounts: { [key: string]: number } = {};
          if (data.real_payment_amounts[0].payment_amount) {
            amounts.selection_process = Number(data.real_payment_amounts[0].payment_amount);
          }
          updates.realPaymentAmounts = amounts;
        } else {
          updates.realPaymentAmounts = {};
        }

        updates.userSystemType = data.system_type || "legacy";
        
        // ✅ ATUALIZAÇÃO ÚNICA: Consolidando todos os estados em um único render
        setState(prev => ({ ...prev, ...updates, loading: false }));
        return;
      } else {
        useRpc = false;
      }
    } catch (rpcError) {
      useRpc = false;
    }

    if (!useRpc) {
      loadUserPackageFees();
      loadUserFeeOverrides();
      loadRealPaymentAmounts();
      loadUserSystemType();
    }
  };

  const loadUserSystemType = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.from("user_profiles").select("system_type, dependents").eq("user_id", userId).single();
      if (error) {
        setState(prev => ({ ...prev, userSystemType: "legacy" }));
        return;
      }
      setState(prev => ({ ...prev, userSystemType: (data?.system_type || "legacy") as any, userDependents: data?.dependents || 0 }));
    } catch (err) {
      setState(prev => ({ ...prev, userSystemType: "legacy" }));
    }
  };

  const updateFeeConfig = async (newConfig: Partial<FeeConfig>) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const updates = Object.entries(newConfig).map(([key, value]) => ({ key, value: value.toString() }));
      const { error: updateError } = await supabase.from("system_settings").upsert(updates, { onConflict: "key" });
      if (updateError) throw updateError;
      setState(prev => ({ ...prev, feeConfig: { ...prev.feeConfig, ...newConfig }, loading: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: "Erro ao atualizar configurações de taxas", loading: false }));
    }
  };

  const getFeeAmount = (feeType: string, customAmount?: number): number => {
    let baseAmount: number;
    const { userFeeOverrides, realPaymentAmounts, userDependents } = state;

    if (customAmount !== undefined) {
      baseAmount = customAmount;
    } else if (userFeeOverrides) {
      let override: number | undefined;
      switch (feeType) {
        case "selection_process": override = userFeeOverrides.selection_process_fee; break;
        case "application_fee": override = userFeeOverrides.application_fee; break;
        case "scholarship_fee": override = userFeeOverrides.scholarship_fee; break;
        case "i20_control_fee":
        case "i-20_control_fee": override = userFeeOverrides.i20_control_fee; break;
        case "placement_fee": override = userFeeOverrides.placement_fee; break;
        case "ds160_package":
        case "ds160_package_fee": override = userFeeOverrides.ds160_package_fee; break;
        case "i539_cos_package":
        case "i539_cos_package_fee": override = userFeeOverrides.i539_cos_package_fee; break;
      }
      baseAmount = (override !== undefined && override !== null) ? override : getDefaultBaseAmount(feeType);
    } else {
      baseAmount = getDefaultBaseAmount(feeType);
    }

    if (realPaymentAmounts && Object.keys(realPaymentAmounts).length > 0) {
      const normalizedFeeType = feeType.replace(/_fee$/, "");
      const possibleKeys = [normalizedFeeType, feeType, feeType.replace("_", "-"), normalizedFeeType.replace("_", "-")];
      for (const key of possibleKeys) {
        if (realPaymentAmounts[key] !== undefined && realPaymentAmounts[key] !== null) return realPaymentAmounts[key];
      }
    }

    if (userDependents > 0 && (feeType === "application_fee")) {
      return baseAmount + (userDependents * 100);
    }
    return baseAmount;
  };

  const getDefaultBaseAmount = (feeType: string): number => {
    const { userSystemType, feeConfig } = state;
    if (feeType === "selection_process") return userSystemType === "simplified" ? 350 : 400;
    if (feeType === "scholarship_fee") {
      if (userSystemType) return userSystemType === "simplified" ? 550 : 900;
      return feeConfig.scholarship_fee_default;
    }
    if (feeType === "i20_control_fee" || feeType === "i-20_control_fee") return 900;
    if (feeType === "placement_fee" || feeType === "placement") return 1200;
    if (feeType === "ds160_package" || feeType === "i539_cos_package") return 1800;
    if (feeType === "application_fee") return feeConfig.application_fee_default;
    if (feeType === "reinstatement_fee") return 500;
    return feeConfig.application_fee_default;
  };

  const formatFeeAmount = (amount: number | string, forceDollars: boolean = false): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (forceDollars) return `$${numAmount.toFixed(2)}`;
    if (numAmount >= 10000) return `$${(numAmount / 100).toFixed(2)}`;
    return `$${numAmount.toFixed(2)}`;
  };

  const processTranslation = (text: any): string => {
    if (typeof text !== "string") return text;
    const { feeConfig } = state;
    return text
      .replace(/\${selectionProcessFee}/g, formatFeeAmount(feeConfig.selection_process_fee))
      .replace(/\${scholarshipFee}/g, formatFeeAmount(feeConfig.scholarship_fee_default))
      .replace(/\${i20ControlFee}/g, formatFeeAmount(feeConfig.i20_control_fee))
      .replace(/\${applicationFee}/g, formatFeeAmount(feeConfig.application_fee_default));
  };

  const hasOverride = (feeType: string): boolean => {
    if (!state.userFeeOverrides) return false;
    const { userFeeOverrides } = state;
    switch (feeType) {
      case "selection_process": return userFeeOverrides.selection_process_fee != null;
      case "application_fee": return userFeeOverrides.application_fee != null;
      case "scholarship_fee": return userFeeOverrides.scholarship_fee != null;
      case "i-20_control_fee":
      case "i20_control_fee": return userFeeOverrides.i20_control_fee != null;
      case "placement_fee": return userFeeOverrides.placement_fee != null;
      case "ds160_package":
      case "ds160_package_fee": return userFeeOverrides.ds160_package_fee != null;
      case "i539_cos_package":
      case "i539_cos_package_fee": return userFeeOverrides.i539_cos_package_fee != null;
      default: return false;
    }
  };

  // ✅ OTIMIZAÇÃO: Memoizando o retorno do hook para evitar re-renders em componentes que consomem o hook
  return useMemo(() => ({
    ...state,
    loadFeeConfig,
    loadUserPackageFees,
    loadUserFeeOverrides,
    loadRealPaymentAmounts,
    loadUserSystemType,
    updateFeeConfig,
    getFeeAmount,
    formatFeeAmount,
    processTranslation,
    hasOverride,
  }), [state, userId]);
};
