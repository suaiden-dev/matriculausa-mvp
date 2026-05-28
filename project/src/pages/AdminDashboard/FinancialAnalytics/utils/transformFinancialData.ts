import type {
  FinancialDataInputs,
  ProcessedFinancialData,
} from "../data/types";

/**
 * Processa applications e cria payment records
 * EXATAMENTE igual ao Payment Management
 */
function processApplications(
  applications: any[],
  overridesMap: { [key: string]: any },
  userSystemTypesMap: Map<string, string>,
  realPaymentAmounts: Map<
    string,
    {
      selection_process?: number;
      scholarship?: number;
      i20_control?: number;
      application?: number;
      placement?: number;
    }
  >,
  individualPaymentDates: Map<string, Map<string, string>>,
  getFeeAmount: (key: "i20_control_fee" | "application_fee") => number,
  globalFeesProcessed: {
    [userId: string]: {
      selection_process: boolean;
      i20_control: boolean;
      application_fee: boolean;
      placement: boolean;
    };
  },
  paymentRecords: any[],
  individualFeePayments: any[],
): void {
  applications?.forEach((app: any) => {
    const student = app.user_profiles;
    const scholarship = app.scholarships;
    const university = scholarship?.universities;
    if (!student || !scholarship || !university) return;

    const studentName = student.full_name || "Unknown Student";
    const studentEmail = student.email || "";
    const universityName = university.name || "Unknown University";
    const sellerReferralCode = student.seller_referral_code || null;
    if (!studentName || !universityName) return;

    const dependents = Number(student?.dependents) || 0;
    const userOverrides = overridesMap[student?.user_id] || {};
    const realPaid = realPaymentAmounts?.get(student?.user_id);
    const systemType = userSystemTypesMap.get(student.user_id) || "legacy";
    const dependentCost = systemType === "simplified" ? 0 : (dependents * 150);

    // Mapear transações físicas reais deste usuário
    const userPhysicalPayments = (individualFeePayments || []).filter(
      (p) => p.user_id === student.user_id
    );

    // Tipos de taxas a processar
    const feeTypesToProcess: {
      key: "selection_process" | "application" | "scholarship" | "i20_control_fee" | "placement";
      flagPaid: boolean;
      fallbackAmount: number;
      paymentMethodFallback: string;
    }[] = [
      {
        key: "selection_process",
        flagPaid: !!student.has_paid_selection_process_fee && student?.source !== 'migma',
        fallbackAmount: realPaid?.selection_process ? Math.round(realPaid.selection_process * 100) : (userOverrides.selection_process_fee !== undefined ? Math.round(userOverrides.selection_process_fee * 100) : Math.round((systemType === "simplified" ? 350 : 400 + dependentCost) * 100)),
        paymentMethodFallback: student.selection_process_fee_payment_method || "manual",
      },
      {
        key: "application",
        flagPaid: !!app.is_application_fee_paid,
        fallbackAmount: realPaid?.application ? Math.round(realPaid.application * 100) : (scholarship?.application_fee_amount ? (parseFloat(scholarship.application_fee_amount) > 1000 ? Math.round(parseFloat(scholarship.application_fee_amount)) : Math.round(parseFloat(scholarship.application_fee_amount) * 100)) + (student?.source !== 'migma' ? dependents * 10000 : 0) : Math.round(getFeeAmount("application_fee") * 100) + (student?.source !== 'migma' ? dependents * 10000 : 0)),
        paymentMethodFallback: app.application_fee_payment_method || "manual",
      },
      {
        key: "scholarship",
        flagPaid: !!app.is_scholarship_fee_paid && scholarship.id !== "31c9b8e6-af11-4462-8494-c79854f3f66e",
        fallbackAmount: realPaid?.scholarship ? Math.round(realPaid.scholarship * 100) : (userOverrides.scholarship_fee !== undefined ? Math.round(userOverrides.scholarship_fee * 100) : Math.round(900 * 100)),
        paymentMethodFallback: app.scholarship_fee_payment_method || "manual",
      },
      {
        key: "i20_control_fee",
        flagPaid: !!student.has_paid_i20_control_fee,
        fallbackAmount: realPaid?.i20_control ? Math.round(realPaid.i20_control * 100) : (userOverrides.i20_control_fee !== undefined ? Math.round(userOverrides.i20_control_fee * 100) : Math.round(getFeeAmount("i20_control_fee") * 100)),
        paymentMethodFallback: student.i20_control_fee_payment_method || "manual",
      },
      {
        key: "placement",
        flagPaid: !!student.is_placement_fee_paid,
        fallbackAmount: realPaid?.placement ? Math.round(realPaid.placement * 100) : (userOverrides.placement_fee !== undefined ? Math.round(userOverrides.placement_fee * 100) : Math.round(10000 * 100)),
        paymentMethodFallback: student.placement_fee_payment_method || "manual",
      },
    ];

    if (!globalFeesProcessed[student.user_id]) {
      globalFeesProcessed[student.user_id] = {
        selection_process: false,
        i20_control: false,
        application_fee: false,
        placement: false,
      };
    }

    feeTypesToProcess.forEach((cfg) => {
      if (!cfg.flagPaid) return;

      // Buscar se temos pagamentos físicos correspondentes no individual_fee_payments
      const physicals = userPhysicalPayments.filter((p) => {
        const typeNormalized = p.fee_type === "selection_process_fee" ? "selection_process" :
                               p.fee_type === "application_fee" ? "application" :
                               p.fee_type === "scholarship_fee" ? "scholarship" :
                               p.fee_type === "i20_control" || p.fee_type === "i20_control_fee" ? "i20_control_fee" :
                               p.fee_type === "placement_fee" ? "placement" : p.fee_type;
        return typeNormalized === cfg.key;
      });

      if (physicals.length > 0) {
        // Ordenar pagamentos físicos por data ASC para saber a ordem correta das parcelas
        const sortedPhysicals = [...physicals].sort((a, b) => 
          new Date(a.payment_date || 0).getTime() - new Date(b.payment_date || 0).getTime()
        );

        // Para cada pagamento físico real, cria um record correspondente (Mapeamento de Parcelas!)
        sortedPhysicals.forEach((p, idx) => {
          const installmentInfo = sortedPhysicals.length > 1 ? ` (${idx + 1}/${sortedPhysicals.length})` : "";
          paymentRecords.push({
            id: p.id, // ID real da transação no Supabase
            student_id: student.user_id,
            fee_type: cfg.key,
            installment_info: installmentInfo, // Adiciona info de parcela ex: " (1/3)"
            amount: Math.round(Number(p.amount) * 100),
            status: "paid",
            payment_date: p.payment_date || student.last_payment_date || app.paid_at || app.created_at,
            payment_method: p.payment_method || cfg.paymentMethodFallback,
            student_name: studentName,
            student_email: studentEmail,
            seller_referral_code: sellerReferralCode,
            university_name: universityName,
            created_at: app.created_at,
          });
        });
      } else {
        // Fallback sintético para usuários antigos sem registros físicos
        paymentRecords.push({
          id: `${student.user_id}-${cfg.key}`,
          student_id: student.user_id,
          fee_type: cfg.key,
          amount: cfg.fallbackAmount,
          status: "paid",
          payment_date: individualPaymentDates.get(student.user_id)?.get(cfg.key === "i20_control_fee" ? "i20_control" : cfg.key) || student.last_payment_date || app.paid_at || app.created_at,
          payment_method: cfg.paymentMethodFallback,
          student_name: studentName,
          student_email: studentEmail,
          seller_referral_code: sellerReferralCode,
          university_name: universityName,
          created_at: app.created_at,
        });
      }

      // Marcar como processado nas flags globais para evitar re-processamento
      if (cfg.key === "selection_process") globalFeesProcessed[student.user_id].selection_process = true;
      if (cfg.key === "application") globalFeesProcessed[student.user_id].application_fee = true;
      if (cfg.key === "i20_control_fee") globalFeesProcessed[student.user_id].i20_control = true;
      if (cfg.key === "placement") globalFeesProcessed[student.user_id].placement = true;
    });
  });
}

/**
 * Processa pagamentos Zelle
 * EXATAMENTE igual ao Payment Management
 */
function processZellePayments(
  applications: any[],
  paymentRecords: any[],
  zellePaymentsByUser: { [userId: string]: any[] },
  individualPaymentDates: Map<string, Map<string, string>>,
): void {
  Object.keys(zellePaymentsByUser).forEach((userId) => {
    const userZellePayments = zellePaymentsByUser[userId];
    const firstPayment = userZellePayments[0];
    const student = firstPayment.user_profiles;
    if (!student) return;
    const studentName = student.full_name || "Unknown Student";
    const studentEmail = student.email || "";
    const sellerReferralCode = student.seller_referral_code || null;
    if (!studentName) return;

    const hasApplication = applications?.some((app) =>
      (app as any).user_profiles?.user_id === (student as any).user_id
    );
    if (hasApplication) return;

    const paidFeeTypes = new Set(userZellePayments.map((payment) => {
      if (payment.fee_type === "application_fee") return "application";
      if (payment.fee_type === "selection_process_fee") {
        return "selection_process";
      }
      if (payment.fee_type === "scholarship_fee") return "scholarship";
      if (payment.fee_type === "i20_control_fee") return "i20_control_fee";
      if (payment.fee_type === "placement_fee" || payment.fee_type === "placement") return "placement";
      return payment.fee_type_global;
    }));

    if (paidFeeTypes.has("selection_process")) {
      const selectionPayment = userZellePayments.find((p: any) =>
        p.fee_type_global === "selection_process" ||
        p.fee_type === "selection_process_fee"
      );
      paymentRecords.push({
        id: `zelle-${selectionPayment.id}-selection`,
        student_id: userId,
        fee_type: "selection_process",
        amount: Math.round(parseFloat(selectionPayment.amount) * 100),
        status: "paid",
        payment_date:
          individualPaymentDates.get(userId)?.get("selection_process") ||
          selectionPayment.admin_approved_at || selectionPayment.created_at,
        payment_method: "zelle",
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: "No University Selected",
        created_at: selectionPayment.created_at,
      });
    }

    if (paidFeeTypes.has("application")) {
      const applicationPayment = userZellePayments.find((p: any) =>
        p.fee_type_global === "application" || p.fee_type === "application_fee"
      );
      const applicationAmount = Math.round(
        parseFloat(applicationPayment.amount) * 100,
      );
      paymentRecords.push({
        id: `zelle-${applicationPayment.id}-application`,
        student_id: userId,
        fee_type: "application",
        amount: applicationAmount,
        status: "paid",
        payment_date: individualPaymentDates.get(userId)?.get("application") ||
          applicationPayment.admin_approved_at || applicationPayment.created_at,
        payment_method: "zelle",
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: "No University Selected",
        created_at: applicationPayment.created_at,
      });
    }

    if (paidFeeTypes.has("scholarship")) {
      const scholarshipPayment = userZellePayments.find((p: any) =>
        p.fee_type_global === "scholarship" || p.fee_type === "scholarship_fee"
      );
      paymentRecords.push({
        id: `zelle-${scholarshipPayment.id}-scholarship`,
        student_id: userId,
        fee_type: "scholarship",
        amount: Math.round(parseFloat(scholarshipPayment.amount) * 100),
        status: "paid",
        payment_date: individualPaymentDates.get(userId)?.get("scholarship") ||
          scholarshipPayment.admin_approved_at || scholarshipPayment.created_at,
        payment_method: "zelle",
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: "No University Selected",
        created_at: scholarshipPayment.created_at,
      });
    }

    if (paidFeeTypes.has("i20_control_fee")) {
      const i20Payment = userZellePayments.find((p: any) =>
        p.fee_type_global === "i20_control_fee" ||
        p.fee_type === "i20_control_fee"
      );
      paymentRecords.push({
        id: `zelle-${i20Payment.id}-i20`,
        student_id: userId,
        fee_type: "i20_control_fee",
        amount: Math.round(parseFloat(i20Payment.amount) * 100),
        status: "paid",
        payment_date: individualPaymentDates.get(userId)?.get("i20_control") ||
          i20Payment.admin_approved_at || i20Payment.created_at,
        payment_method: "zelle",
        student_name: studentName,
        student_email: studentEmail,
        seller_referral_code: sellerReferralCode,
        university_name: "No University Selected",
        created_at: i20Payment.created_at,
      });
    }

    if (paidFeeTypes.has("placement")) {
      const placementPayment = userZellePayments.find((p: any) =>
        p.fee_type_global === "placement" ||
        p.fee_type === "placement_fee" ||
        p.fee_type === "placement"
      );
      if (placementPayment) {
        paymentRecords.push({
          id: `zelle-${placementPayment.id}-placement`,
          student_id: userId,
          fee_type: "placement",
          amount: Math.round(parseFloat(placementPayment.amount) * 100),
          status: "paid",
          payment_date: individualPaymentDates.get(userId)?.get("placement") ||
            placementPayment.admin_approved_at || placementPayment.created_at,
          payment_method: "zelle",
          student_name: studentName,
          student_email: studentEmail,
          seller_referral_code: sellerReferralCode,
          university_name: "No University Selected",
          created_at: placementPayment.created_at,
        });
      }
    }
  });
}

/**
 * Processa usuários Stripe
 * EXATAMENTE igual ao Payment Management
 */
function processStripeUsers(
  stripeUsers: any[],
  applications: any[],
  zellePaymentsByUser: { [userId: string]: any[] },
  overridesMap: { [key: string]: any },
  userSystemTypesMap: Map<string, string>,
  realPaymentAmounts: Map<
    string,
    {
      selection_process?: number;
      scholarship?: number;
      i20_control?: number;
      application?: number;
      placement?: number;
    }
  >,
  individualPaymentDates: Map<string, Map<string, string>>,
  getFeeAmount: (key: "i20_control_fee" | "application_fee") => number,
  paymentRecords: any[],
  individualFeePayments: any[],
): void {
  stripeUsers?.forEach((stripeUser: any) => {
    if (!stripeUser) return;
    const studentName = stripeUser.full_name || "Unknown Student";
    const studentEmail = stripeUser.email || "";
    const sellerReferralCode = stripeUser.seller_referral_code || null;
    if (!studentName) return;

    const hasApplication = applications?.some((app) =>
      (app as any).user_profiles?.user_id === (stripeUser as any).user_id
    );
    if (hasApplication) return;
    const hasZellePayment = zellePaymentsByUser &&
      Object.keys(zellePaymentsByUser).includes(stripeUser.user_id);
    if (hasZellePayment) return;

    const dependents = Number(stripeUser?.dependents) || 0;
    const userOverrides = overridesMap[stripeUser?.user_id] || {};
    const systemType = userSystemTypesMap.get(stripeUser.user_id) || "legacy";
    const dependentCost = systemType === "simplified" ? 0 : (dependents * 150);

    const userPhysicalPayments = (individualFeePayments || []).filter(
      (p) => p.user_id === stripeUser.user_id
    );

    const realPaid = realPaymentAmounts?.get(stripeUser?.user_id);

    const configList: {
      key: "selection_process" | "application" | "scholarship" | "i20_control_fee" | "placement";
      flagPaid: boolean;
      fallbackAmount: number;
      paymentMethodFallback: string;
    }[] = [
      {
        key: "selection_process",
        flagPaid: !!stripeUser.has_paid_selection_process_fee,
        fallbackAmount: realPaid?.selection_process ? Math.round(realPaid.selection_process * 100) : (userOverrides.selection_process_fee !== undefined ? Math.round(userOverrides.selection_process_fee * 100) : Math.round((systemType === "simplified" ? 350 : 400 + dependentCost) * 100)),
        paymentMethodFallback: stripeUser.selection_process_fee_payment_method || "manual",
      },
      {
        key: "application",
        flagPaid: !!stripeUser.is_application_fee_paid,
        fallbackAmount: Math.round(getFeeAmount("application_fee") * 100) + (systemType === "legacy" && dependents > 0 ? dependents * 10000 : 0),
        paymentMethodFallback: "manual",
      },
      {
        key: "scholarship",
        flagPaid: !!stripeUser.is_scholarship_fee_paid,
        fallbackAmount: userOverrides.scholarship_fee !== undefined ? Math.round(userOverrides.scholarship_fee * 100) : Math.round(900 * 100),
        paymentMethodFallback: "manual",
      },
      {
        key: "i20_control_fee",
        flagPaid: !!stripeUser.has_paid_i20_control_fee,
        fallbackAmount: realPaid?.i20_control ? Math.round(realPaid.i20_control * 100) : (userOverrides.i20_control_fee !== undefined ? Math.round(userOverrides.i20_control_fee * 100) : Math.round(getFeeAmount("i20_control_fee") * 100)),
        paymentMethodFallback: stripeUser.i20_control_fee_payment_method || "manual",
      },
      {
        key: "placement",
        flagPaid: !!stripeUser.is_placement_fee_paid,
        fallbackAmount: realPaid?.placement ? Math.round(realPaid.placement * 100) : (userOverrides.placement_fee !== undefined ? Math.round(userOverrides.placement_fee * 100) : Math.round(10000 * 100)),
        paymentMethodFallback: stripeUser.placement_fee_payment_method || "manual",
      },
    ];

    configList.forEach((cfg) => {
      if (!cfg.flagPaid) return;

      const physicals = userPhysicalPayments.filter((p) => {
        const typeNormalized = p.fee_type === "selection_process_fee" ? "selection_process" :
                               p.fee_type === "application_fee" ? "application" :
                               p.fee_type === "scholarship_fee" ? "scholarship" :
                               p.fee_type === "i20_control" || p.fee_type === "i20_control_fee" ? "i20_control_fee" :
                               p.fee_type === "placement_fee" ? "placement" : p.fee_type;
        return typeNormalized === cfg.key;
      });

      if (physicals.length > 0) {
        const sortedPhysicals = [...physicals].sort((a, b) => 
          new Date(a.payment_date || 0).getTime() - new Date(b.payment_date || 0).getTime()
        );

        sortedPhysicals.forEach((p, idx) => {
          const installmentInfo = sortedPhysicals.length > 1 ? ` (${idx + 1}/${sortedPhysicals.length})` : "";
          paymentRecords.push({
            id: p.id,
            student_id: stripeUser.user_id,
            fee_type: cfg.key,
            installment_info: installmentInfo,
            amount: Math.round(Number(p.amount) * 100),
            status: "paid",
            payment_date: p.payment_date || stripeUser.last_payment_date || stripeUser.created_at,
            payment_method: p.payment_method || cfg.paymentMethodFallback,
            student_name: studentName,
            student_email: studentEmail,
            seller_referral_code: sellerReferralCode,
            university_name: "No University Selected",
            created_at: stripeUser.created_at,
          });
        });
      } else {
        paymentRecords.push({
          id: `stripe-${stripeUser.user_id}-${cfg.key}`,
          student_id: stripeUser.user_id,
          fee_type: cfg.key,
          amount: cfg.fallbackAmount,
          status: "paid",
          payment_date: individualPaymentDates.get(stripeUser.user_id)?.get(cfg.key === "i20_control_fee" ? "i20_control" : cfg.key) || stripeUser.last_payment_date || stripeUser.created_at,
          payment_method: cfg.paymentMethodFallback,
          student_name: studentName,
          student_email: studentEmail,
          seller_referral_code: sellerReferralCode,
          university_name: "No University Selected",
          created_at: stripeUser.created_at,
        });
      }
    });
  });
}

/**
 * Transforma dados financeiros em payment records e breakdowns
 */
export async function transformFinancialData(
  inputs: FinancialDataInputs,
): Promise<ProcessedFinancialData> {
  const {
    applications,
    zellePayments,
    stripeUsers,
    overridesMap,
    userSystemTypesMap,
    realPaymentAmounts,
    individualPaymentDates,
    individualFeePayments,
    getFeeAmount,
  } = inputs;

  const paymentRecords: any[] = [];

  // Inicializar métodos fixos para garantis que apareçam mesmo que zerados
  const paymentsByMethod: Record<string, { count: number; revenue: number }> = {
    "stripe": { count: 0, revenue: 0 },
    "zelle": { count: 0, revenue: 0 },
    "parcelow": { count: 0, revenue: 0 },
    "manual": { count: 0, revenue: 0 },
  };

  const paymentsByFeeType: Record<string, { count: number; revenue: number }> =
    {
      "selection_process": { count: 0, revenue: 0 },
      "application": { count: 0, revenue: 0 },
      "placement": { count: 0, revenue: 0 },
      "scholarship": { count: 0, revenue: 0 },
      "i20_control_fee": { count: 0, revenue: 0 },
    };

  const globalFeesProcessed: {
    [userId: string]: {
      selection_process: boolean;
      i20_control: boolean;
      application_fee: boolean;
      placement: boolean;
    };
  } = {};

  // Processar applications
  processApplications(
    applications,
    overridesMap,
    userSystemTypesMap,
    realPaymentAmounts,
    individualPaymentDates,
    getFeeAmount,
    globalFeesProcessed,
    paymentRecords,
    individualFeePayments,
  );

  // Criar zellePaymentsByUser antes de processar (necessário para processStripeUsers)
  const zellePaymentsByUser: { [userId: string]: any[] } = {};
  zellePayments?.forEach((zellePayment: any) => {
    const student = zellePayment.user_profiles;
    if (student?.user_id) {
      if (!zellePaymentsByUser[student.user_id]) {
        zellePaymentsByUser[student.user_id] = [];
      }
      zellePaymentsByUser[student.user_id].push(zellePayment);
    }
  });

  // Processar Zelle payments
  processZellePayments(
    applications,
    paymentRecords,
    zellePaymentsByUser,
    individualPaymentDates,
  );

  // Processar Stripe users
  processStripeUsers(
    stripeUsers,
    applications,
    zellePaymentsByUser,
    overridesMap,
    userSystemTypesMap,
    realPaymentAmounts,
    individualPaymentDates,
    getFeeAmount,
    paymentRecords,
    individualFeePayments,
  );

  // Calcular estatísticas
  const paidRecords = paymentRecords.filter((p) => p.status === "paid");
  const studentRevenue = paidRecords.reduce((sum, p) => sum + p.amount, 0);

  // Processar dados por método de pagamento (dinamicamente)
  paidRecords.forEach((record) => {
    const method = (record.payment_method || "manual").toLowerCase();
    
    // Normalização robusta de métodos
    let normalizedMethod = method;
    if (method === "pix" || method.includes("stripe")) {
      normalizedMethod = "stripe";
    }

    if (!paymentsByMethod[normalizedMethod]) {
      paymentsByMethod[normalizedMethod] = { count: 0, revenue: 0 };
    }

    paymentsByMethod[normalizedMethod].count++;
    paymentsByMethod[normalizedMethod].revenue += record.amount;
  });

  // Processar dados por tipo de taxa
  paidRecords.forEach((record) => {
    const feeType = record.fee_type;
    if (paymentsByFeeType[feeType]) {
      paymentsByFeeType[feeType].count++;
      paymentsByFeeType[feeType].revenue += record.amount;
    } else if (feeType === "placement_fee" && paymentsByFeeType["placement"]) {
      // Handle the case where the record might still use the un-normalized name
      paymentsByFeeType["placement"].count++;
      paymentsByFeeType["placement"].revenue += record.amount;
    }
  });

  const totalMethodRevenue = Object.values(paymentsByMethod).reduce(
    (sum, method) => sum + method.revenue,
    0,
  );
  const totalFeeRevenue = Object.values(paymentsByFeeType).reduce(
    (sum, fee) => sum + fee.revenue,
    0,
  );

  return {
    paymentRecords,
    paymentsByMethod,
    paymentsByFeeType,
    revenueData: [], // Será calculado em calculateMetrics
    metrics: {
      totalRevenue: studentRevenue,
      monthlyRevenue: studentRevenue,
      revenueGrowth: 0,
      totalPayments: paymentRecords.length,
      paidPayments: paidRecords.length,
      pendingPayments: 0,
      conversionRate: 0,
      averageTransactionValue: 0,
      totalStudents: 0,
      pendingPayouts: 0,
      completedPayouts: 0,
      completedAffiliatePayouts: 0,
      completedUniversityPayouts: 0,
      universityPayouts: 0,
      affiliatePayouts: 0,
      newUsers: 0,
      newUsersGrowth: 0,
      selectionProcessPaidCount: paymentsByFeeType["selection_process"]?.count || 0,
      selectionProcessGrowth: 0,
      selectionConversionRate: 0,
    },
    paymentMethodData: Object.entries(paymentsByMethod).map(
      ([method, data]) => {
        let displayName: string;
        switch (method) {
          case "stripe":
            displayName = "Stripe";
            break;
          case "zelle":
            displayName = "Zelle";
            break;
          case "parcelow":
            displayName = "Parcelow";
            break;
          case "manual":
            displayName = "Outside";
            break;
          default:
            displayName = method.charAt(0).toUpperCase() + method.slice(1);
        }

        return {
          method: displayName,
          count: data.count,
          revenue: data.revenue,
          percentage: totalMethodRevenue > 0
            ? (data.revenue / totalMethodRevenue) * 100
            : 0,
        };
      },
    ),
    feeTypeData: Object.entries(paymentsByFeeType).map(([feeType, data]) => ({
      feeType: feeType === "selection_process"
        ? "Selection Process"
        : feeType === "application"
        ? "Application Fee"
        : feeType === "scholarship"
        ? "Scholarship Fee"
        : feeType === "placement"
        ? "Placement Fee"
        : "I-20 Control Fee",
      count: data.count,
      revenue: data.revenue,
      percentage: totalFeeRevenue > 0
        ? (data.revenue / totalFeeRevenue) * 100
        : 0,
    })),
  };
}
