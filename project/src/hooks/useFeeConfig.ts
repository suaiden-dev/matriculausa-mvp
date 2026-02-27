import { useEffect, useState } from "react";
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
}

export const useFeeConfig = (userId?: string) => {
  const [feeConfig, setFeeConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG);
  const [userPackageFees, setUserPackageFees] = useState<
    UserPackageFees | null
  >(null);
  const [userFeeOverrides, setUserFeeOverrides] = useState<
    UserFeeOverrides | null
  >(null);
  const [realPaymentAmounts, setRealPaymentAmounts] = useState<
    { [key: string]: number }
  >({});
  const [userSystemType, setUserSystemType] = useState<
    "legacy" | "simplified" | null
  >(null);
  const [userDependents, setUserDependents] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeeConfig();
  }, []);

  useEffect(() => {
    if (userId) {
      // ✅ OTIMIZAÇÃO: Tentar usar RPC consolidada primeiro (reduz de 4 queries para 1)
      loadUserFeeConfigConsolidated();
    }
  }, [userId]);

  const loadFeeConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Novo modelo: valores fixos. Ignorar overrides do banco.
      setFeeConfig(DEFAULT_FEE_CONFIG);
    } catch (err) {
      console.error("❌ [useFeeConfig] Erro inesperado:", err);
      setError("Erro ao carregar configurações de taxas");
      setFeeConfig(DEFAULT_FEE_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPackageFees = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .rpc("get_user_package_fees", {
          user_id_param: userId,
        });

      if (error) {
        console.warn(
          "⚠️ [useFeeConfig] Erro ao carregar taxas do pacote do usuário:",
          error,
        );
        setUserPackageFees(null);
        return;
      }

      setUserPackageFees(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error(
        "❌ [useFeeConfig] Erro inesperado ao carregar taxas do pacote:",
        err,
      );
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
        const rpc = await supabase.rpc("get_user_fee_overrides", {
          target_user_id: userId,
        });
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
          .from("user_fee_overrides")
          .select("*")
          .eq("user_id", userId)
          .single();
        if (!direct.error) {
          data = direct.data || null;
        } else if (direct.error?.code !== "PGRST116") {
          error = direct.error;
        }
      }

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
        console.warn(
          "⚠️ [useFeeConfig] Erro ao carregar overrides de taxas do usuário:",
          error,
        );
        setUserFeeOverrides(null);
        return;
      }

      // Normalizar para números (podem vir como string do Postgres)
      const normalized = data
        ? {
          selection_process_fee: data.selection_process_fee != null
            ? Number(data.selection_process_fee)
            : undefined,
          application_fee: data.application_fee != null
            ? Number(data.application_fee)
            : undefined,
          scholarship_fee: data.scholarship_fee != null
            ? Number(data.scholarship_fee)
            : undefined,
          i20_control_fee: data.i20_control_fee != null
            ? Number(data.i20_control_fee)
            : undefined,
        }
        : null;

      setUserFeeOverrides(normalized);
    } catch (err) {
      console.error(
        "❌ [useFeeConfig] Erro inesperado ao carregar overrides de taxas:",
        err,
      );
      setUserFeeOverrides(null);
    }
  };

  const loadRealPaymentAmounts = async () => {
    if (!userId) return;

    try {
      // ✅ Usar nova função que retorna TODOS os valores pagos (gross_amount_usd ou amount)
      const { data, error } = await supabase
        .rpc("get_user_paid_fees_display", {
          user_id_param: userId,
        });

      if (error) {
        console.warn(
          "⚠️ [useFeeConfig] Erro ao carregar valores reais de pagamento:",
          error,
        );
        setRealPaymentAmounts({});
        return;
      }

      if (data && data.length > 0) {
        // Mapear os dados para um objeto { fee_type: amount }
        // ✅ CORREÇÃO: Normalizar fee_type para garantir consistência
        const amounts: { [key: string]: number } = {};
        data.forEach((fee: any) => {
          // Normalizar fee_type: remover sufixo _fee se existir e garantir formato consistente
          let normalizedFeeType = fee.fee_type;
          if (normalizedFeeType) {
            // Remover sufixo _fee se existir
            normalizedFeeType = normalizedFeeType.replace(/_fee$/, "");
            // Garantir que está em formato snake_case
            normalizedFeeType = normalizedFeeType.replace(/-/g, "_");
          }

          if (normalizedFeeType) {
            amounts[normalizedFeeType] = Number(fee.display_amount);
            // ✅ Também adicionar com _fee para garantir compatibilidade
            amounts[`${normalizedFeeType}_fee`] = Number(fee.display_amount);
          }
        });

        setRealPaymentAmounts(amounts);

        // Debug - Sempre logar para facilitar troubleshooting
        console.log(
          "🔍 [useFeeConfig] Real payment amounts loaded for user:",
          userId,
          amounts,
        );
        console.log("🔍 [useFeeConfig] Raw data from RPC:", data);
      } else {
        setRealPaymentAmounts({});

        // Debug para jolie8862@uorak.com
        if (userId === "935e0eec-82c6-4a70-b013-e85dde6e63f7") {
          console.log(
            "🔍 [useFeeConfig] jolie8862@uorak.com - No real payment amounts found",
          );
        }
      }
    } catch (err) {
      console.error(
        "❌ [useFeeConfig] Erro inesperado ao carregar valores reais de pagamento:",
        err,
      );
      setRealPaymentAmounts({});
    }
  };

  // ✅ OTIMIZAÇÃO: Função consolidada para carregar todos os dados de uma vez
  const loadUserFeeConfigConsolidated = async () => {
    if (!userId) return;

    let useRpc = true;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_user_fee_config_consolidated",
        { target_user_id: userId },
      );

      if (!rpcError && rpcData) {
        // RPC retorna jsonb, processar os dados
        const data = typeof rpcData === "string"
          ? JSON.parse(rpcData)
          : rpcData;

        // Processar package fees
        if (data.user_package_fees && data.user_package_fees !== "null") {
          setUserPackageFees(data.user_package_fees);
        } else {
          setUserPackageFees(null);
        }

        // 🔍 Log de diagnóstico de dependentes
        console.log("🔍 [useFeeConfig] RPC data recebida:", {
          system_type: data.system_type,
          dependents: data.dependents,
          dependents_type: typeof data.dependents,
          has_dependents_key: "dependents" in data,
          all_keys: Object.keys(data),
        });

        // Processar dependentes
        const dependentsValue = data.dependents;
        if (
          dependentsValue !== undefined && dependentsValue !== null &&
          dependentsValue !== "null"
        ) {
          const parsedDependents = Number(dependentsValue);
          console.log(
            "✅ [useFeeConfig] Dependentes carregados:",
            parsedDependents,
          );
          setUserDependents(parsedDependents);
        } else {
          console.warn(
            "⚠️ [useFeeConfig] Dependentes não encontrados na RPC, valor:",
            dependentsValue,
          );
          setUserDependents(0);
        }

        // Processar fee overrides
        if (data.user_fee_overrides && data.user_fee_overrides !== "null") {
          const normalized = {
            selection_process_fee:
              data.user_fee_overrides.selection_process_fee != null
                ? Number(data.user_fee_overrides.selection_process_fee)
                : undefined,
            application_fee: data.user_fee_overrides.application_fee != null
              ? Number(data.user_fee_overrides.application_fee)
              : undefined,
            scholarship_fee: data.user_fee_overrides.scholarship_fee != null
              ? Number(data.user_fee_overrides.scholarship_fee)
              : undefined,
            i20_control_fee: data.user_fee_overrides.i20_control_fee != null
              ? Number(data.user_fee_overrides.i20_control_fee)
              : undefined,
          };
          setUserFeeOverrides(normalized);
        } else {
          setUserFeeOverrides(null);
        }

        // Processar real payment amounts
        if (
          data.real_payment_amounts &&
          Array.isArray(data.real_payment_amounts) &&
          data.real_payment_amounts.length > 0
        ) {
          const amounts: { [key: string]: number } = {};
          if (data.real_payment_amounts[0].payment_amount) {
            amounts.selection_process = Number(
              data.real_payment_amounts[0].payment_amount,
            );
          }
          setRealPaymentAmounts(amounts);
        } else {
          setRealPaymentAmounts({});
        }

        // Processar system_type
        const systemType = data.system_type || "legacy";
        setUserSystemType(systemType as "legacy" | "simplified");

        return;
      } else {
        console.warn(
          "⚠️ [PERFORMANCE] RPC consolidada falhou, usando queries individuais como fallback:",
          rpcError,
        );
        useRpc = false;
      }
    } catch (rpcError) {
      console.warn(
        "⚠️ [PERFORMANCE] RPC consolidada não disponível, usando queries individuais como fallback:",
        rpcError,
      );
      useRpc = false;
    }

    // Fallback: usar queries individuais se RPC não funcionou
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
      const { data, error } = await supabase
        .from("user_profiles")
        .select("system_type, dependents")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code !== "PGRST116") { // PGRST116 = no rows returned
          console.warn(
            "⚠️ [useFeeConfig] Erro ao carregar system_type:",
            error,
          );
        }
        setUserSystemType("legacy"); // Default para legacy
        return;
      }

      const systemType = data?.system_type || "legacy";
      setUserSystemType(systemType as "legacy" | "simplified");
      setUserDependents(data?.dependents || 0);

      // Debug para jolie8862@uorak.com
      if (userId === "935e0eec-82c6-4a70-b013-e85dde6e63f7") {
        console.log(
          "🔍 [useFeeConfig] jolie8862@uorak.com - System type loaded:",
          systemType,
        );
      }
    } catch (err) {
      console.error(
        "❌ [useFeeConfig] Erro inesperado ao carregar system_type:",
        err,
      );
      setUserSystemType("legacy");
    }
  };

  const updateFeeConfig = async (newConfig: Partial<FeeConfig>) => {
    try {
      setLoading(true);
      setError(null);

      // Atualizar configurações no banco de dados
      const updates = Object.entries(newConfig).map(([key, value]) => ({
        key,
        value: value.toString(),
      }));

      const { error: updateError } = await supabase
        .from("system_settings")
        .upsert(updates, { onConflict: "key" });

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado local
      setFeeConfig((prev) => ({ ...prev, ...newConfig }));
      console.log("✅ [useFeeConfig] Configurações atualizadas:", newConfig);
    } catch (err) {
      console.error("❌ [useFeeConfig] Erro ao atualizar configurações:", err);
      setError("Erro ao atualizar configurações de taxas");
    } finally {
      setLoading(false);
    }
  };

  const getFeeAmount = (feeType: string, customAmount?: number): number => {
    let baseAmount: number;

    // 1. Determinar o valor base
    if (customAmount !== undefined) {
      baseAmount = customAmount;
    } else if (userFeeOverrides) {
      // Tentar overrides
      let override: number | undefined;
      switch (feeType) {
        case "selection_process":
          override = userFeeOverrides.selection_process_fee;
          break;
        case "application_fee":
          override = userFeeOverrides.application_fee;
          break;
        case "scholarship_fee":
          override = userFeeOverrides.scholarship_fee;
          break;
        case "i20_control_fee":
        case "i-20_control_fee":
          override = userFeeOverrides.i20_control_fee;
          break;
      }

      if (override !== undefined && override !== null) {
        baseAmount = override;
      } else {
        baseAmount = getDefaultBaseAmount(feeType);
      }
    } else {
      baseAmount = getDefaultBaseAmount(feeType);
    }

    // 2. Tentar valor real pago (se já foi pago, retornamos DIRETO o valor pago, ignorando acréscimos extras pois já está consolidado)
    if (realPaymentAmounts && Object.keys(realPaymentAmounts).length > 0) {
      const normalizedFeeType = feeType.replace(/_fee$/, "");
      const possibleKeys = [
        normalizedFeeType,
        feeType,
        feeType.replace("_", "-"),
        normalizedFeeType.replace("_", "-"),
      ];

      for (const key of possibleKeys) {
        if (
          realPaymentAmounts[key] !== undefined &&
          realPaymentAmounts[key] !== null
        ) {
          return realPaymentAmounts[key];
        }
      }
    }

    // 3. Aplicar taxa de dependentes (+$100 cada) para taxas aplicáveis
    console.log(
      `🔍 [getFeeAmount] feeType=${feeType}, userDependents=${userDependents}, baseAmount=${baseAmount}`,
    );
    if (
      userDependents > 0 &&
      (feeType === "application_fee")
    ) {
      const additionalAmount = userDependents * 100;
      console.log(
        `➕ [useFeeConfig] Adding dependent fee for ${feeType}: $${additionalAmount} (${userDependents} dependents)`,
      );
      return baseAmount + additionalAmount;
    }

    return baseAmount;
  };

  // Função auxiliar para determinar o valor padrão sem dependentes
  const getDefaultBaseAmount = (feeType: string): number => {
    if (feeType === "selection_process") {
      return userSystemType === "simplified" ? 350 : 400;
    }
    if (feeType === "scholarship_fee") {
      if (userSystemType) return userSystemType === "simplified" ? 550 : 900;
      return feeConfig.scholarship_fee_default;
    }
    if (feeType === "i20_control_fee" || feeType === "i-20_control_fee") {
      return 900;
    }
    if (feeType === "application_fee") {
      return feeConfig.application_fee_default;
    }
    return feeConfig.application_fee_default;
  };

  const formatFeeAmount = (amount: number | string): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

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
    if (typeof text !== "string") {
      return text; // Retorna o valor original se não for string
    }

    return text
      .replace(
        /\${selectionProcessFee}/g,
        formatFeeAmount(feeConfig.selection_process_fee),
      )
      .replace(
        /\${scholarshipFee}/g,
        formatFeeAmount(feeConfig.scholarship_fee_default),
      )
      .replace(/\${i20ControlFee}/g, formatFeeAmount(feeConfig.i20_control_fee))
      .replace(
        /\${applicationFee}/g,
        formatFeeAmount(feeConfig.application_fee_default),
      );
  };

  const hasOverride = (feeType: string): boolean => {
    if (!userFeeOverrides) return false;

    switch (feeType) {
      case "selection_process":
        return userFeeOverrides.selection_process_fee !== undefined &&
          userFeeOverrides.selection_process_fee !== null;
      case "application_fee":
        return userFeeOverrides.application_fee !== undefined &&
          userFeeOverrides.application_fee !== null;
      case "scholarship_fee":
        return userFeeOverrides.scholarship_fee !== undefined &&
          userFeeOverrides.scholarship_fee !== null;
      case "i-20_control_fee":
      case "i20_control_fee":
        return userFeeOverrides.i20_control_fee !== undefined &&
          userFeeOverrides.i20_control_fee !== null;
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
    userDependents,
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
    hasOverride,
  };
};
