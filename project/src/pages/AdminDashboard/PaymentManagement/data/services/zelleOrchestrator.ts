import { SupabaseClient } from "@supabase/supabase-js";
import { recordIndividualFeePayment } from "../../../../../lib/paymentRecorder";
import config from "../../../../../lib/config";

type PaymentLike = {
  id: string;
  user_id: string;
  student_id?: string;
  student_email: string;
  student_name: string;
  fee_type: string;
  fee_type_global?: string;
  amount: number;
  admin_approved_at?: string;
  created_at: string;
  scholarships_ids?: string[];
  scholarship_id?: string | null;
  metadata?: any; // Metadata do pagamento (inclui dados de cupom promocional)
};

export async function approveZelleFlow(params: {
  supabase: SupabaseClient;
  adminUserId: string;
  payment: PaymentLike;
}) {
  const { supabase, adminUserId, payment } = params;
  
  // Garantir que temos o student_id (profile id) correto
  let finalStudentId = payment.student_id;
  if (!finalStudentId || finalStudentId === "") {
    console.log("🔍 [approveZelleFlow] student_id ausente, buscando via user_id:", payment.user_id);
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", payment.user_id)
      .single();
    if (profile) {
      finalStudentId = profile.id;
      console.log("✅ [approveZelleFlow] student_id recuperado:", finalStudentId);
    }
  }

  console.log("🚀 [approveZelleFlow] Iniciando processamento de aprovação:", {

    payment_id: payment.id,
    fee_type: payment.fee_type,
    fee_type_global: payment.fee_type_global,
    student_id: payment.student_id,
    user_id: payment.user_id
  });

  // Selection Process logic
  const isSelectionProcess = String(payment.fee_type_global).toLowerCase() === "selection_process" || 
                           String(payment.fee_type).toLowerCase() === "selection_process" || 
                           String(payment.fee_type).toLowerCase() === "selection_process_fee";
                           
  if (isSelectionProcess) {
    console.log("📝 [approveZelleFlow] Entrou no bloco de Selection Process");
    // Mark on profile
    await supabase
      .from("user_profiles")
      .update({
        has_paid_selection_process_fee: true,
        selection_process_fee_payment_method: "zelle",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", payment.user_id)
      .select();

    // Record payment (individual table)
    const approvedAt = payment.admin_approved_at || new Date().toISOString();
    await recordIndividualFeePayment(
      supabase,
      {
        userId: payment.user_id,
        feeType: "selection_process",
        amount: payment.amount,
        paymentDate: approvedAt,
        paymentMethod: "zelle",
        zellePaymentId: payment.id,
      },
    );

    // ✅ REMOVIDO: Envio de documento de aceitação de termos - agora é enviado no momento do upload do comprovante no ZelleCheckoutPage.tsx
    // Isso garante que o documento seja enviado independentemente de aprovação automática ou manual

    // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)

    // Resolve dynamic amount from package overrides
    let correctAmount = payment.amount;
    try {
      const { data: userPackageFees } = await supabase.rpc(
        "get_user_package_fees",
        {
          user_id_param: payment.user_id,
        },
      );
      if (userPackageFees && userPackageFees.length > 0) {
        correctAmount = userPackageFees[0].selection_process_fee ??
          correctAmount;
      }
    } catch (_) {}

    // Log action
    console.log("📤 [approveZelleFlow] Chamando log_student_action para Selection Process:", {
      p_student_id: finalStudentId,
      p_performed_by: adminUserId
    });
    
    const { data: logData, error: logError } = await supabase.rpc("log_student_action", {
      p_student_id: finalStudentId,
      p_action_type: "fee_payment",
      p_action_description:
        `Selection Process Fee paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: "admin",
      p_metadata: {
        fee_type: "selection_process",
        payment_method: "zelle",
        amount: correctAmount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
        ip: undefined,
      },
    });

    if (logError) {
      console.error("❌ [approveZelleFlow] Erro ao gravar log de atividade:", logError);
    } else {
      console.log("✅ [approveZelleFlow] Log de atividade gravado com sucesso:", logData);
    }

    // Billing
    await supabase.rpc("register_payment_billing", {
      user_id_param: payment.user_id,
      fee_type_param: "selection_process",
      amount_param: correctAmount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: "zelle",
    });
    // ✅ REMOVIDO: Recompensa de coins para referrer - agora é feito apenas no pagamento I20 via trigger
    // Os triggers handle_i20_payment_rewards() e handle_selection_process_payment_tracking()
    // cuidam automaticamente de creditar coins e atualizar status
  }

  // I-20 Control logic
  const feeTypeSafe = String(payment.fee_type || "").toLowerCase();
  const feeTypeGlobalSafe = String(payment.fee_type_global || "").toLowerCase();
  const isI20 = feeTypeGlobalSafe === "i20_control_fee" ||
    feeTypeGlobalSafe === "i-20_control_fee" ||
    feeTypeSafe === "i20_control" ||
    feeTypeSafe === "i20_control_fee" ||
    feeTypeSafe === "i-20_control_fee" ||
    feeTypeSafe === "control_fee";

  if (isI20) {
    await supabase
      .from("user_profiles")
      .update({
        has_paid_i20_control_fee: true,
        i20_control_fee_payment_method: "zelle",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", payment.user_id)
      .select();

    const approvedAt = payment.admin_approved_at || payment.created_at;
    await recordIndividualFeePayment(
      supabase,
      {
        userId: payment.user_id,
        feeType: "i20_control",
        amount: payment.amount,
        paymentDate: approvedAt,
        paymentMethod: "zelle",
        zellePaymentId: payment.id,
      },
    );

    // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)

    let correctAmount = payment.amount;
    try {
      const { data: userPackageFees } = await supabase.rpc(
        "get_user_package_fees",
        {
          user_id_param: payment.user_id,
        },
      );
      if (userPackageFees && userPackageFees.length > 0) {
        correctAmount = userPackageFees[0].i20_control_fee ?? correctAmount;
      }
    } catch (_) {}

    console.log("📤 [approveZelleFlow] Chamando log_student_action para I-20 Control:", {
      p_student_id_original: payment.student_id,
      p_performed_by: adminUserId
    });
    
    await supabase.rpc("log_student_action", {
      p_student_id: finalStudentId,
      p_action_type: "fee_payment",
      p_action_description:
        `I-20 Control Fee paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: "admin",
      p_metadata: {
        fee_type: "i20_control",
        payment_method: "zelle",
        amount: correctAmount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
        ip: undefined,
      },
    });

    await supabase.rpc("register_payment_billing", {
      user_id_param: payment.user_id,
      fee_type_param: "i20_control_fee",
      amount_param: correctAmount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: "zelle",
    });
  }

  // ✅ NOVO: Placement Fee logic
  const isPlacement = feeTypeSafe === "placement_fee" || 
                      feeTypeSafe === "placement" || 
                      feeTypeGlobalSafe === "placement_fee";

  if (isPlacement) {
    // Verificar se parcelamento estava habilitado para este aluno (auto-detecção)
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("placement_fee_installment_enabled, placement_fee_installment_number")
      .eq("user_id", payment.user_id)
      .single();

    const isInstallmentEnabled = profileData?.placement_fee_installment_enabled === true;
    
    // 🔍 Prioridade 1: Verificar metadata do pagamento (Fonte da verdade do checkout)
    const metadataInstallment = payment.metadata?.installment_number;
    
    if (isInstallmentEnabled) {
      if (metadataInstallment === 1) {
        console.log("📝 [approveZelleFlow] Detectada 1ª Parcela via Metadata");
        await approvePartialZelleFlow({ supabase, adminUserId, payment });
        return;
      } else if (metadataInstallment === 2) {
        console.log("📝 [approveZelleFlow] Detectada 2ª Parcela via Metadata");
        await approveSecondInstallmentFlow({ supabase, adminUserId, payment });
        return;
      }
    }

    // 🔍 Prioridade 2: Fallback para detecção via perfil (se metadata estiver ausente)
    // Para evitar race conditions com os triggers de banco de dados (que já inserem o registro na
    // tabela individual_fee_payments antes de executarmos este fluxo), contamos os pagamentos anteriores
    // excluindo este pagamento atual.
    const { data: placementPayments, error: placementError } = await supabase
      .from("individual_fee_payments")
      .select("id, zelle_payment_id")
      .eq("user_id", payment.user_id)
      .eq("fee_type", "placement");

    if (placementError) {
      console.error("❌ [approveZelleFlow] Erro ao buscar pagamentos de placement anteriores:", placementError);
    }

    const previousPayments = placementPayments 
      ? placementPayments.filter(p => p.zelle_payment_id !== payment.id)
      : [];
    const actualInstallmentNumber = previousPayments.length;

    // Se parcelamento estava habilitado e é a 1ª parcela → redirecionar para approvePartialZelleFlow
    if (isInstallmentEnabled && actualInstallmentNumber === 0) {
      console.log("📝 [approveZelleFlow] Detectada 1ª Parcela via Profile Fallback");
      await approvePartialZelleFlow({ supabase, adminUserId, payment });
      return;
    }

    // Se parcelamento estava habilitado e é a 2ª parcela → redirecionar para approveSecondInstallmentFlow
    if (isInstallmentEnabled && actualInstallmentNumber === 1) {
      console.log("📝 [approveZelleFlow] Detectada 2ª Parcela via Profile Fallback");
      await approveSecondInstallmentFlow({ supabase, adminUserId, payment });
      return;
    }

    // Mark on profile (pagamento completo normal)
    await supabase
      .from("user_profiles")
      .update({
        is_placement_fee_paid: true,
        placement_fee_payment_method: "zelle",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", payment.user_id)
      .select();

    // Record payment (individual table)
    const approvedAt = payment.admin_approved_at || payment.created_at;
    const paymentRecord = await recordIndividualFeePayment(
      supabase,
      {
        userId: payment.user_id,
        feeType: "placement", // individual_fee_payments usa 'placement'
        amount: payment.amount,
        paymentDate: approvedAt,
        paymentMethod: "zelle",
        zellePaymentId: payment.id,
      },
    );

    if (paymentRecord.success && paymentRecord.recordId) {
      await handleInstallmentPlanAssociation(supabase, payment.user_id, payment.amount, "placement", paymentRecord.recordId);
    }

    // Log action
    console.log("📤 [approveZelleFlow] Chamando log_student_action para Placement Fee:", {
      p_student_id: finalStudentId,
      p_performed_by: adminUserId
    });
    
    await supabase.rpc("log_student_action", {
      p_student_id: finalStudentId,
      p_action_type: "fee_payment",
      p_action_description: `Placement Fee paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: "admin",
      p_metadata: {
        fee_type: "placement_fee",
        payment_method: "zelle",
        amount: payment.amount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
        ip: undefined,
      },
    });

    // Billing
    await supabase.rpc("register_payment_billing", {
      user_id_param: payment.user_id,
      fee_type_param: "placement_fee",
      amount_param: payment.amount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: "zelle",
    });
  }

  // ✅ NOVO: DS-160 Package logic
  const isDs160 = feeTypeSafe === "ds160_package" || 
                  feeTypeGlobalSafe === "ds160_package" ||
                  feeTypeSafe === "control_fee";
  
  if (isDs160) {
    // Buscar se há plano de parcelamento ativo
    const { data: activePlan } = await supabase
      .from('fee_installment_plans')
      .select('*')
      .eq('user_id', payment.user_id)
      .eq('fee_type', 'ds160_package')
      .eq('status', 'active')
      .maybeSingle();

    let isFullyPaid = true;
    if (activePlan) {
      const nextPaidCount = (activePlan.installments_paid || 0) + 1;
      const nextAmountPaid = Number(activePlan.amount_paid || 0) + payment.amount;
      isFullyPaid = nextPaidCount >= (activePlan.total_installments || 2) || 
                   nextAmountPaid >= Number(activePlan.total_amount || 0);
    }

    // Mark on profile
    await supabase
      .from("user_profiles")
      .update({
        has_paid_ds160_package: isFullyPaid,
        ds160_package_payment_method: "zelle",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", payment.user_id)
      .select();

    // Record payment (individual table)
    const approvedAt = payment.admin_approved_at || payment.created_at;
    const paymentRecord = await recordIndividualFeePayment(
      supabase,
      {
        userId: payment.user_id,
        feeType: "ds160_package",
        amount: payment.amount,
        paymentDate: approvedAt,
        paymentMethod: "zelle",
        zellePaymentId: payment.id,
      },
    );

    if (paymentRecord.success && paymentRecord.recordId) {
      await handleInstallmentPlanAssociation(supabase, payment.user_id, payment.amount, "ds160_package", paymentRecord.recordId);
    }

    // Log action
    await supabase.rpc("log_student_action", {
      p_student_id: finalStudentId,
      p_action_type: "fee_payment",
      p_action_description: `DS-160 Package Fee paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: "admin",
      p_metadata: {
        fee_type: "ds160_package",
        payment_method: "zelle",
        amount: payment.amount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
      },
    });

    // Billing
    await supabase.rpc("register_payment_billing", {
      user_id_param: payment.user_id,
      fee_type_param: "ds160_package",
      amount_param: payment.amount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: "zelle",
    });
  }

  // ✅ NOVO: I-539 COS Package logic
  const isI539 = feeTypeSafe === "i539_cos_package" || 
                 feeTypeGlobalSafe === "i539_cos_package" ||
                 feeTypeSafe === "control_fee";
  
  if (isI539) {
    // Buscar se há plano de parcelamento ativo
    const { data: activePlan } = await supabase
      .from('fee_installment_plans')
      .select('*')
      .eq('user_id', payment.user_id)
      .eq('fee_type', 'i539_cos_package')
      .eq('status', 'active')
      .maybeSingle();

    let isFullyPaid = true;
    if (activePlan) {
      const nextPaidCount = (activePlan.installments_paid || 0) + 1;
      const nextAmountPaid = Number(activePlan.amount_paid || 0) + payment.amount;
      isFullyPaid = nextPaidCount >= (activePlan.total_installments || 2) || 
                   nextAmountPaid >= Number(activePlan.total_amount || 0);
    }

    // Mark on profile
    await supabase
      .from("user_profiles")
      .update({
        has_paid_i539_cos_package: isFullyPaid,
        i539_cos_package_payment_method: "zelle",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", payment.user_id)
      .select();

    // Record payment (individual table)
    const approvedAt = payment.admin_approved_at || payment.created_at;
    const paymentRecord = await recordIndividualFeePayment(
      supabase,
      {
        userId: payment.user_id,
        feeType: "i539_cos_package",
        amount: payment.amount,
        paymentDate: approvedAt,
        paymentMethod: "zelle",
        zellePaymentId: payment.id,
      },
    );

    if (paymentRecord.success && paymentRecord.recordId) {
      await handleInstallmentPlanAssociation(supabase, payment.user_id, payment.amount, "i539_cos_package", paymentRecord.recordId);
    }

    // Log action
    await supabase.rpc("log_student_action", {
      p_student_id: finalStudentId,
      p_action_type: "fee_payment",
      p_action_description: `I-539 COS Package Fee paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: "admin",
      p_metadata: {
        fee_type: "i539_cos_package",
        payment_method: "zelle",
        amount: payment.amount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
      },
    });

    // Billing
    await supabase.rpc("register_payment_billing", {
      user_id_param: payment.user_id,
      fee_type_param: "i539_cos_package",
      amount_param: payment.amount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: "zelle",
    });
  }

  // ✅ NOVO: Reinstatement Fee logic
  const isReinstatement = feeTypeSafe === "reinstatement_fee" || 
                          feeTypeSafe === "reinstatement_package" ||
                          feeTypeGlobalSafe === "reinstatement_fee" ||
                          feeTypeGlobalSafe === "reinstatement_package" ||
                          feeTypeSafe === "control_fee";
  
  if (isReinstatement) {
    // Mark on profile
    await supabase
      .from("user_profiles")
      .update({
        has_paid_reinstatement_package: true,
        reinstatement_package_payment_method: "zelle",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", payment.user_id)
      .select();

    // Record payment (individual table)
    const approvedAt = payment.admin_approved_at || payment.created_at;
    await recordIndividualFeePayment(
      supabase,
      {
        userId: payment.user_id,
        feeType: "reinstatement_fee",
        amount: payment.amount,
        paymentDate: approvedAt,
        paymentMethod: "zelle",
        zellePaymentId: payment.id,
      },
    );

    // Log action
    await supabase.rpc("log_student_action", {
      p_student_id: finalStudentId,
      p_action_type: "fee_payment",
      p_action_description: `Reinstatement Fee paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: "admin",
      p_metadata: {
        fee_type: "reinstatement_fee",
        payment_method: "zelle",
        amount: payment.amount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
      },
    });

    // Billing
    await supabase.rpc("register_payment_billing", {
      user_id_param: payment.user_id,
      fee_type_param: "reinstatement_fee",
      amount_param: payment.amount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: "zelle",
    });
  }

  // Migma application fee: update scholarship_applications via user_id (student_profile_id/scholarships_ids are null for Migma)
  if (payment.fee_type === "application_fee_migma") {
    const approvedAt = payment.admin_approved_at || payment.created_at;
    await recordIndividualFeePayment(supabase, {
      userId: payment.user_id,
      feeType: "application" as any,
      amount: payment.amount,
      paymentDate: approvedAt,
      paymentMethod: "zelle",
      zellePaymentId: payment.id,
    });

    // Find user_profiles.id from user_id, then update scholarship_applications via student_id
    const { data: profileRow } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", payment.user_id)
      .maybeSingle();

    if (profileRow?.id) {
      await supabase
        .from("scholarship_applications")
        .update({
          is_application_fee_paid: true,
          application_fee_payment_method: "zelle",
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", profileRow.id)
        .neq("status", "rejected");
    }

    await supabase.rpc("log_student_action", {
      p_student_id: finalStudentId,
      p_action_type: "fee_payment",
      p_action_description: `Application Fee (Migma) paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: "admin",
      p_metadata: {
        fee_type: "application",
        payment_method: "zelle",
        amount: payment.amount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
        source: "migma",
      },
    });
  }

  // Application/Scholarship fees logic (applications table updates, logging, billing scholarship)
  if (
    payment.fee_type === "application_fee" ||
    payment.fee_type === "scholarship_fee"
  ) {
    if (payment.scholarships_ids && payment.scholarships_ids.length > 0) {
      // Registrar pagamento na tabela individual_fee_payments
      const approvedAt = payment.admin_approved_at || payment.created_at;
      const feeType = payment.fee_type === "application_fee"
        ? "application"
        : "scholarship";
      await recordIndividualFeePayment(
        supabase,
        {
          userId: payment.user_id,
          feeType: feeType as any,
          amount: payment.amount,
          paymentDate: approvedAt,
          paymentMethod: "zelle",
          zellePaymentId: payment.id,
        },
      );

      // Registrar uso do cupom promocional se houver
      if (payment.metadata && typeof payment.metadata === "object") {
        // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)
      }

      const { data: updateData } = await supabase
        .from("scholarship_applications")
        .update({
          [
            ["application_fee", "application_fee_migma"].includes(payment.fee_type)
              ? "is_application_fee_paid"
              : "is_scholarship_fee_paid"
          ]: true,
          [
            ["application_fee", "application_fee_migma"].includes(payment.fee_type)
              ? "application_fee_payment_method"
              : "scholarship_fee_payment_method"
          ]: "zelle",
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", payment.student_id)
        .in("scholarship_id", payment.scholarships_ids)
        .select();
      for (const app of updateData || []) {
        await supabase.rpc("log_student_action", {
          p_student_id: finalStudentId,
          p_action_type: "fee_payment",
          p_action_description: `${
            ["application_fee", "application_fee_migma"].includes(payment.fee_type)
              ? "Application Fee"
              : "Scholarship Fee"
          } paid via Zelle (approved by admin)`,
          p_performed_by: adminUserId,
          p_performed_by_type: "admin",
          p_metadata: {
            fee_type: ["application_fee", "application_fee_migma"].includes(payment.fee_type)
              ? "application"
              : "scholarship",
            payment_method: "zelle",
            amount: payment.amount,
            payment_id: payment.id,
            zelle_payment_id: payment.id,
            application_id: app.id,
            scholarship_id: app.scholarship_id,
            ip: undefined,
          },
        });
      }
    } else {
      const { data: updateData } = await supabase
        .from("scholarship_applications")
        .update({
          [
            ["application_fee", "application_fee_migma"].includes(payment.fee_type)
              ? "is_application_fee_paid"
              : "is_scholarship_fee_paid"
          ]: true,
          [
            ["application_fee", "application_fee_migma"].includes(payment.fee_type)
              ? "application_fee_payment_method"
              : "scholarship_fee_payment_method"
          ]: "zelle",
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", payment.student_id)
        .neq("status", "rejected") // ✅ CORREÇÃO: Não marcar como paga candidaturas que já foram rejeitadas
        .select();

      // Log para cada candidatura atualizada no modo fallback
      for (const app of updateData || []) {
        await supabase.rpc("log_student_action", {
          p_student_id: finalStudentId,
          p_action_type: "fee_payment",
          p_action_description: `${
            ["application_fee", "application_fee_migma"].includes(payment.fee_type)
              ? "Application Fee"
              : "Scholarship Fee"
          } paid via Zelle (approved by admin) - fallback mode`,
          p_performed_by: adminUserId,
          p_performed_by_type: "admin",
          p_metadata: {
            fee_type: ["application_fee", "application_fee_migma"].includes(payment.fee_type)
              ? "application"
              : "scholarship",
            payment_method: "zelle",
            amount: payment.amount,
            payment_id: payment.id,
            zelle_payment_id: payment.id,
            mode: "fallback_all_applications",
            application_id: app.id,
            scholarship_id: app.scholarship_id,
            ip: undefined,
          },
        });
      }

      const approvedAt = payment.admin_approved_at || payment.created_at;
      const feeType = payment.fee_type === "application_fee"
        ? "application"
        : "scholarship";
      await recordIndividualFeePayment(
        supabase,
        {
          userId: payment.user_id,
          feeType: feeType as any,
          amount: payment.amount,
          paymentDate: approvedAt,
          paymentMethod: "zelle",
          zellePaymentId: payment.id,
        },
      );

    }

    if (payment.fee_type === "scholarship_fee") {
      let correctAmount = payment.amount;
      try {
        const { data: userPackageFees } = await supabase.rpc(
          "get_user_package_fees",
          {
            user_id_param: payment.user_id,
          },
        );
        if (userPackageFees && userPackageFees.length > 0) {
          correctAmount = userPackageFees[0].scholarship_fee ?? correctAmount;
        }
      } catch (_) {}
      await supabase.rpc("register_payment_billing", {
        user_id_param: payment.user_id,
        fee_type_param: "scholarship_fee",
        amount_param: correctAmount,
        payment_session_id_param: `zelle_${payment.id}`,
        payment_method_param: "zelle",
      });
    }
  }

  // Registrar comissão para application_fee
  if (payment.fee_type === "application_fee" || payment.fee_type === "application_fee_migma") {
    await supabase.rpc("register_payment_billing", {
      user_id_param: payment.user_id,
      fee_type_param: "application_fee",
      amount_param: payment.amount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: "zelle",
    });
  }

  // Update user_profiles for application_fee flag
  if (payment.fee_type === "application_fee" || payment.fee_type === "application_fee_migma") {
    const { data: updatedProfiles } = await supabase
      .from("user_profiles")
      .update({
        is_application_fee_paid: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", payment.user_id)
      .select("id");

    // Fallback: if no profile found via user_id, try by email (covers Migma students without MatriculaUSA auth entry)
    if ((!updatedProfiles || updatedProfiles.length === 0) && payment.student_email) {
      await supabase
        .from("user_profiles")
        .update({
          is_application_fee_paid: true,
          updated_at: new Date().toISOString(),
        })
        .eq("email", payment.student_email);
    }
  }

  // Mark translation_orders as paid and send confirmation email
  if (payment.fee_type === 'translation') {
    const translationOrderId = payment.metadata?.translation_order_id;
    if (translationOrderId) {
      try {
        const { error: tErr } = await supabase.functions.invoke('approve-zelle-payment-automatic', {
          body: {
            user_id: payment.user_id,
            fee_type_global: 'translation',
            direct_translation_order_id: translationOrderId,
          },
        });
        if (tErr) {
          console.error('❌ [zelleOrchestrator] Failed to mark translation orders as paid:', tErr);
        } else {
          console.log('✅ [zelleOrchestrator] Translation orders marked as paid, confirmation email sent');
        }
      } catch (tCatch: any) {
        console.error('❌ [zelleOrchestrator] Exception approving translation:', tCatch?.message);
      }
    } else {
      console.warn('⚠️ [zelleOrchestrator] translation fee_type but no translation_order_id in metadata:', payment.metadata);
    }
  }

  // Prepare notification data
  const { data: adminProfile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", adminUserId)
    .single();
  const adminName = adminProfile?.full_name || "Admin";

  // Migma callback: if payment originated from Migma, notify via server-side edge function (with logs)
  if (payment.fee_type === "application_fee_migma" && payment.metadata?.source === 'migma') {
    try {
      const { data: migmaResult, error: migmaErr } = await supabase.functions.invoke('migma-notify-payment', {
        body: {
          zelle_payment_id: payment.id,
          action: 'approved',
          approved_by: adminName,
        },
      });
      if (migmaErr) {
        console.error('❌ [zelleOrchestrator] Migma callback falhou:', migmaErr);
      } else {
        console.log('✅ [zelleOrchestrator] Migma callback enviado com sucesso:', migmaResult);
      }
    } catch (migmaErr) {
      console.error('❌ [zelleOrchestrator] Erro ao chamar Migma callback:', migmaErr);
    }
  }

  const feeTypeDisplay = payment.fee_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const feeTypeDisplayForNotif = (payment.fee_type === 'ds160_package' || payment.fee_type === 'i539_cos_package') ? 'Control Fee' : feeTypeDisplay;

  // Student approval notification (webhook) - NOW MAPPED EXACTLY LIKE STRIPE
  try {
    let tipoNotfAluno = "Pagamento aprovado";
    let oQueEnviar = `Seu pagamento de ${feeTypeDisplayForNotif} no valor de $${payment.amount} foi aprovado e processado com sucesso!`;

    if (payment.fee_type === 'selection_process') {
      tipoNotfAluno = "Pagamento de selection process confirmado";
      oQueEnviar = `O pagamento da taxa de processo seletivo foi confirmado para ${payment.student_name}. Agora você pode selecionar as escolas para aplicar.`;
    } else if (payment.fee_type === 'application_fee') {
      tipoNotfAluno = "Pagamento de application fee confirmado";
    } else if (payment.fee_type === 'placement_fee' || payment.fee_type === 'placement') {
      tipoNotfAluno = "Pagamento de placement fee confirmado";
    } else if (payment.fee_type === 'i20_control' || payment.fee_type === 'i20_control_fee') {
      tipoNotfAluno = "Pagamento de i20 control fee confirmado";
      oQueEnviar = `O pagamento do I-20 Control Fee no valor de $${payment.amount} foi pago e aprovado. Informaremos quando o documento estiver pronto!`;
    } else if (payment.fee_type === 'ds160_package' || payment.fee_type === 'i539_cos_package') {
      tipoNotfAluno = "Pagamento de Control Fee confirmado";
    } else if (payment.fee_type === 'reinstatement_package' || payment.fee_type === 'reinstatement_fee') {
      tipoNotfAluno = "Pagamento de reinstatement_fee confirmado";
    } else if (payment.fee_type === 'translation') {
      tipoNotfAluno = "Pagamento de tradução confirmado";
      oQueEnviar = `Seu pagamento de tradução no valor de $${payment.amount} foi aprovado. Sua tradução será iniciada em breve!`;
    }

    const approvalPayload = {
      tipo_notf: tipoNotfAluno,
      email_aluno: payment.student_email,
      nome_aluno: payment.student_name,
      email_universidade: "",
      o_que_enviar: oQueEnviar,
      payment_id: payment.id,
      fee_type: payment.fee_type,
      amount: payment.amount,
      approved_by: adminName,
      payment_method: "zelle",
      currency: "USD",
      currency_symbol: "$",
      formatted_amount: `$${payment.amount}`
    };
    console.log(
      "📧 [zelleOrchestrator] Enviando webhook de aprovação para aluno:",
      approvalPayload,
    );
    const webhookResponse = await fetch(
      "https://nwh.suaiden.com/webhook/notfmatriculausa",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalPayload),
      },
    );
    if (webhookResponse.ok) {
      console.log(
        "✅ [zelleOrchestrator] Webhook de aprovação para aluno enviado com sucesso",
      );
    } else {
      const errorText = await webhookResponse.text();
      console.error(
        "❌ [zelleOrchestrator] Erro ao enviar webhook de aprovação para aluno:",
        webhookResponse.status,
        errorText,
      );
    }
  } catch (error) {
    console.error(
      "❌ [zelleOrchestrator] Exceção ao enviar webhook de aprovação para aluno:",
      error,
    );
  }

  // University notifications for application/scholarship
  try {
    const notificationEndpoint = payment.fee_type === "application_fee"
      ? "notify-university-application-fee-paid"
      : payment.fee_type === "scholarship_fee"
      ? "notify-university-scholarship-fee-paid"
      : null;
    if (notificationEndpoint) {
      const payload = {
        application_id: payment.student_id,
        user_id: payment.user_id,
        scholarship_id: payment.scholarship_id || null,
      };
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${notificationEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        },
      );
    }
  } catch (_) {}

  // Admin / Affiliate admin / Seller notifications (best-effort)
  try {
    const isDevelopment = config.isDevelopment();
    const devBlockedEmails = [
      "luizedmiola@gmail.com",
      "chimentineto@gmail.com",
      "fsuaiden@gmail.com",
      "rayssathefuture@gmail.com",
      "gui.reis@live.com",
      "admin@matriculausa.com",
    ];

    // Buscar seller_referral_code do aluno
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("seller_referral_code")
      .eq("user_id", payment.user_id)
      .single();

    let sellerData: any = null;
    if (userProfile?.seller_referral_code) {
      const { data: sellerByCode } = await supabase
        .from("sellers")
        .select(
          "id, user_id, name, email, referral_code, affiliate_admin_id, commission_rate",
        )
        .eq("referral_code", userProfile.seller_referral_code)
        .single();
      if (sellerByCode) {
        sellerData = sellerByCode;
        console.log("✅ [zelleOrchestrator] Seller encontrado:", {
          seller_id: sellerData.user_id,
          seller_name: sellerData.name,
          seller_email: sellerData.email,
          referral_code: sellerData.referral_code,
          affiliate_admin_id: sellerData.affiliate_admin_id,
        });
      }
    }

    if (!sellerData) {
      console.warn(
        "⚠️ [zelleOrchestrator] Nenhum seller encontrado para o aluno:",
        {
          student_user_id: payment.user_id,
          student_name: payment.student_name,
          seller_referral_code: userProfile?.seller_referral_code || "N/A",
        },
      );
    }

    let affiliateAdminData: any = null;
    if (sellerData && sellerData.affiliate_admin_id) {
      const { data: affiliateData } = await supabase
        .from("affiliate_admins")
        .select("user_id")
        .eq("id", sellerData.affiliate_admin_id)
        .single();
      if (affiliateData?.user_id) {
        const { data: userProfileData } = await supabase
          .from("user_profiles")
          .select("full_name, email, phone")
          .eq("user_id", affiliateData.user_id)
          .single();
        if (userProfileData) {
          affiliateAdminData = {
            user_id: affiliateData.user_id,
            user_profiles: userProfileData,
          };
        }
      }
    }

    // 1. Notify generic admin
    let emailAdmin = "admin@matriculausa.com";
    if (isDevelopment && devBlockedEmails.includes(emailAdmin)) {
      console.log(
        `[NOTIFICAÇÃO] Email de admin bloqueado em desenvolvimento: ${emailAdmin}`,
      );
      emailAdmin = "";
    }

    if (emailAdmin) {
      const isPlacement = payment.fee_type === "placement_fee" || payment.fee_type === "placement";
      const adminPayload = {
        tipo_notf: isPlacement ? `Pagamento de Placement Fee confirmado - Admin` : "Pagamento de aluno aprovado",
        email_admin: emailAdmin,
        nome_admin: "Admin MatriculaUSA",
        email_aluno: payment.student_email,
        nome_aluno: payment.student_name,
        email_seller: sellerData?.email || "",
        nome_seller: sellerData?.name || "N/A",
        email_affiliate_admin: affiliateAdminData?.user_profiles?.email || "",
        nome_affiliate_admin: affiliateAdminData?.user_profiles?.full_name ||
          "Affiliate Admin",
        o_que_enviar:
          `Pagamento de ${payment.fee_type} no valor de ${payment.amount} do aluno ${payment.student_name} foi aprovado. ${
            sellerData
              ? `Seller responsável: ${sellerData.name} (${sellerData.referral_code})`
              : "Sem seller associado"
          }`,
        payment_id: payment.id,
        fee_type: payment.fee_type,
        amount: payment.amount,
        seller_id: sellerData?.user_id || null,
        referral_code: sellerData?.referral_code || null,
      };
      console.log(
        "📧 [zelleOrchestrator] Enviando webhook de aprovação para admin:",
        adminPayload,
      );
      const adminWebhookResponse = await fetch(
        "https://nwh.suaiden.com/webhook/notfmatriculausa",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adminPayload),
        },
      );
      if (adminWebhookResponse.ok) {
        console.log(
          "✅ [zelleOrchestrator] Webhook de aprovação para admin enviado com sucesso",
        );
      } else {
        const errorText = await adminWebhookResponse.text();
        console.error(
          "❌ [zelleOrchestrator] Erro ao enviar webhook de aprovação para admin:",
          adminWebhookResponse.status,
          errorText,
        );
      }
    }

    // 2. Notify ALL system administrators
    try {
      const { data: adminUsers } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, email, phone")
        .eq("role", "admin");

      if (adminUsers && adminUsers.length > 0) {
        console.log(
          `📧 [zelleOrchestrator] Enviando notificações para ${adminUsers.length} administradores...`,
        );

        let tipoNotfAdmin = "Pagamento de aluno aprovado";
        if (payment.fee_type === 'selection_process') {
          tipoNotfAdmin = "Pagamento de selection process confirmado";
        } else if (payment.fee_type === 'application_fee') {
          tipoNotfAdmin = "Pagamento de application fee confirmado";
        } else if (payment.fee_type === 'placement_fee' || payment.fee_type === 'placement') {
          tipoNotfAdmin = "Pagamento de Placement Fee confirmado - Admin";
        } else if (payment.fee_type === 'i20_control' || payment.fee_type === 'i20_control_fee') {
          tipoNotfAdmin = "Pagamento de i20 control fee confirmado";
        } else if (payment.fee_type === 'ds160_package' || payment.fee_type === 'i539_cos_package') {
          tipoNotfAdmin = "Pagamento de Control Fee confirmado";
        } else if (payment.fee_type === 'reinstatement_package' || payment.fee_type === 'reinstatement_fee') {
          tipoNotfAdmin = "Pagamento de reinstatement_fee confirmado";
        } else if (payment.fee_type === 'translation') {
          tipoNotfAdmin = "Pagamento de tradução confirmado";
        }

        for (const admin of adminUsers) {
          const adminEmail = admin.email;
          if (isDevelopment && devBlockedEmails.includes(adminEmail)) {
            console.log(
              `📧 [zelleOrchestrator] Notificação bloqueada para admin ${adminEmail} em desenvolvimento`,
            );
            continue;
          }

          const adminNotificationPayload = {
            tipo_notf: tipoNotfAdmin,
            email_admin: adminEmail,
            nome_admin: admin.full_name || "Admin",
            phone_admin: admin.phone || "",
            email_aluno: payment.student_email,
            nome_aluno: payment.student_name,
            email_seller: sellerData?.email || "",
            nome_seller: sellerData?.name || "N/A",
            email_affiliate_admin: affiliateAdminData?.user_profiles?.email ||
              "",
            nome_affiliate_admin:
              affiliateAdminData?.user_profiles?.full_name || "N/A",
            o_que_enviar:
              `Pagamento de ${feeTypeDisplayForNotif} no valor de ${payment.amount} do aluno ${payment.student_name} foi aprovado manualmente. ${
                sellerData
                  ? `Seller responsável: ${sellerData.name} (${sellerData.referral_code})`
                  : "Sem seller associado"
              }`,
            payment_id: payment.id,
            fee_type: payment.fee_type,
            amount: payment.amount,
            seller_id: sellerData?.user_id || null,
            referral_code: sellerData?.referral_code || null,
            commission_rate: sellerData?.commission_rate || null,
            approved_by: adminName, // Usar o nome do admin real ao invés de string genérica
            payment_method: "zelle",
            currency: "USD",
            currency_symbol: "$",
            formatted_amount: `$${payment.amount}`
          };

          console.log(
            `📧 [zelleOrchestrator] Enviando notificação para admin ${adminEmail}`,
          );

          await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(adminNotificationPayload),
          }).catch((err) =>
            console.error(`❌ Erro ao notificar admin ${adminEmail}:`, err)
          );
        }
        console.log(
          `✅ [zelleOrchestrator] Notificações concluídas para administradores`,
        );
      }
    } catch (error) {
      console.error(
        "❌ [zelleOrchestrator] Erro ao notificar administradores:",
        error,
      );
    }

    // 3. Notify affiliate admin and seller
    if (sellerData) {
      const { data: sellerProfile } = await supabase
        .from("user_profiles")
        .select("phone")
        .eq("user_id", sellerData.user_id)
        .single();
      const sellerPhone = sellerProfile?.phone;

      // Notify affiliate admin
      if (affiliateAdminData?.user_profiles?.email) {
        let emailAffiliateAdmin = affiliateAdminData.user_profiles.email;
        if (isDevelopment && devBlockedEmails.includes(emailAffiliateAdmin)) {
          console.log(
            `📧 [zelleOrchestrator] Notificação bloqueada para affiliate admin ${emailAffiliateAdmin} em desenvolvimento`,
          );
          emailAffiliateAdmin = "";
        }

        if (emailAffiliateAdmin) {
          const isPlacement = payment.fee_type === "placement_fee" || payment.fee_type === "placement";
          const affiliateAdminPayload = {
            tipo_notf: isPlacement ? `Pagamento de Placement Fee confirmado - Affiliate Admin` : "Pagamento de aluno do seu seller aprovado",
            email_affiliate_admin: emailAffiliateAdmin,
            nome_affiliate_admin: affiliateAdminData.user_profiles.full_name ||
              "Affiliate Admin",
            phone_affiliate_admin: affiliateAdminData.user_profiles.phone || "",
            email_aluno: payment.student_email,
            nome_aluno: payment.student_name,
            phone_aluno: "",
            email_seller: sellerData.email,
            nome_seller: sellerData.name,
            phone_seller: sellerPhone || "",
            o_que_enviar:
              `Pagamento de ${payment.fee_type} no valor de ${payment.amount} do aluno ${payment.student_name} foi aprovado. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
            payment_id: payment.id,
            fee_type: payment.fee_type,
            amount: payment.amount,
            seller_id: sellerData.user_id,
            referral_code: sellerData.referral_code,
          };
          console.log(
            "📧 [zelleOrchestrator] Enviando webhook de aprovação para affiliate admin:",
            affiliateAdminPayload,
          );
          const affiliateAdminWebhookResponse = await fetch(
            "https://nwh.suaiden.com/webhook/notfmatriculausa",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(affiliateAdminPayload),
            },
          );
          if (affiliateAdminWebhookResponse.ok) {
            console.log(
              "✅ [zelleOrchestrator] Webhook de aprovação para affiliate admin enviado com sucesso",
            );
          } else {
            const errorText = await affiliateAdminWebhookResponse.text();
            console.error(
              "❌ [zelleOrchestrator] Erro ao enviar webhook de aprovação para affiliate admin:",
              affiliateAdminWebhookResponse.status,
              errorText,
            );
          }
        }
      }

      // Notify seller
      let emailSeller = sellerData.email;
      if (isDevelopment && devBlockedEmails.includes(emailSeller)) {
        console.log(
          `📧 [zelleOrchestrator] Notificação bloqueada para seller ${emailSeller} em desenvolvimento`,
        );
        emailSeller = "";
      }

      if (emailSeller) {
        const isPlacement = payment.fee_type === "placement_fee" || payment.fee_type === "placement";
        const sellerPayload = {
          tipo_notf: isPlacement ? `Pagamento de Placement Fee confirmado - Seller` : "Pagamento do seu aluno aprovado",
          email_seller: emailSeller,
          nome_seller: sellerData.name,
          phone_seller: sellerPhone || "",
          email_aluno: payment.student_email,
          nome_aluno: payment.student_name,
          o_que_enviar:
            `Parabéns! O pagamento de ${(payment.fee_type === 'ds160_package' || payment.fee_type === 'i539_cos_package') ? 'Control Fee' : payment.fee_type} no valor de ${payment.amount} do seu aluno ${payment.student_name} foi aprovado. Você ganhará comissão sobre este pagamento!`,
          payment_id: payment.id,
          fee_type: payment.fee_type,
          amount: payment.amount,
          seller_id: sellerData.user_id,
          referral_code: sellerData.referral_code,
        };
        console.log(
          "📧 [zelleOrchestrator] Enviando webhook de aprovação para seller:",
          sellerPayload,
        );
        const sellerWebhookResponse = await fetch(
          "https://nwh.suaiden.com/webhook/notfmatriculausa",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sellerPayload),
          },
        );
        if (sellerWebhookResponse.ok) {
          console.log(
            "✅ [zelleOrchestrator] Webhook de aprovação para seller enviado com sucesso",
          );
        } else {
          const errorText = await sellerWebhookResponse.text();
          console.error(
            "❌ [zelleOrchestrator] Erro ao enviar webhook de aprovação para seller:",
            sellerWebhookResponse.status,
            errorText,
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "❌ [zelleOrchestrator] Exceção ao enviar notificações para admin/affiliate/seller:",
      error,
    );
  }
}

export async function rejectZelleFlow(params: {
  supabase: SupabaseClient;
  adminUserId: string;
  payment: PaymentLike;
  reason: string;
}) {
  const { supabase, adminUserId, payment, reason } = params;

  // Garantir que temos o student_id (profile id) correto
  let finalStudentId = payment.student_id;
  if (!finalStudentId || finalStudentId === "") {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", payment.user_id)
      .single();
    if (profile) finalStudentId = profile.id;
  }
  try {
    const { data: adminProfile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("user_id", adminUserId)
      .single();
    const adminName = adminProfile?.full_name || "Admin";
    const rejectionPayload = {
      tipo_notf: "Pagamento Zelle rejeitado",
      email_aluno: payment.student_email,
      nome_aluno: payment.student_name,
      email_universidade: "",
      o_que_enviar:
        `Seu pagamento de ${payment.fee_type} no valor de $${payment.amount} foi rejeitado. Motivo: ${reason}`,
      payment_id: payment.id,
      fee_type: payment.fee_type,
      amount: payment.amount,
      rejection_reason: reason,
      rejected_by: adminName,
    };
    await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rejectionPayload),
    });

    // Migma callback: if payment originated from Migma, notify via server-side edge function (with logs)
    if (payment.fee_type === "application_fee_migma" && payment.metadata?.source === 'migma') {
      try {
        const { data: migmaResult, error: migmaErr } = await supabase.functions.invoke('migma-notify-payment', {
          body: {
            zelle_payment_id: payment.id,
            action: 'rejected',
            rejected_by: adminName,
            rejection_reason: reason,
          },
        });
        if (migmaErr) {
          console.error('❌ [zelleOrchestrator] Migma rejection callback falhou:', migmaErr);
        } else {
          console.log('✅ [zelleOrchestrator] Migma rejection callback enviado com sucesso:', migmaResult);
        }
      } catch (migmaErr) {
        console.error('❌ [zelleOrchestrator] Erro ao chamar Migma rejection callback:', migmaErr);
      }
    }
  } catch (_) {}

  // Criar notificação in-app para o aluno
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      console.error(
        "❌ [rejectZelleFlow] Access token não encontrado para criar notificação",
      );
      return;
    }

    // Formatar o tipo de taxa de forma amigável
    const feeTypeLabel = String(payment.fee_type || "payment")
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    // Formatar o valor - o amount já vem em dólares (não em centavos)
    // Exemplo: 210.00 já é $210, não precisa dividir por 100
    const amountInDollars = typeof payment.amount === "number"
      ? (payment.amount % 1 === 0
        ? payment.amount.toString()
        : payment.amount.toFixed(2))
      : parseFloat(payment.amount) || payment.amount;

    // Usar user_id (UUID de auth.users) para que a Edge Function busque o student_id correto
    const notificationPayload = {
      user_id: payment.user_id, // UUID que referencia auth.users.id
      title: "Payment Rejected",
      message:
        `Your ${feeTypeLabel} payment of $${amountInDollars} has been rejected. Reason: ${reason}. Please review and submit a new payment if needed.`,
      link: "/student/dashboard/applications",
    };

    console.log(
      "📤 [rejectZelleFlow] Criando notificação in-app:",
      notificationPayload,
    );

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(notificationPayload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ [rejectZelleFlow] Erro ao criar notificação:",
        response.status,
        errorText,
      );
    } else {
      const result = await response.json();
      console.log(
        "✅ [rejectZelleFlow] Notificação in-app criada com sucesso!",
        result,
      );
    }
    // Log rejection action
    await supabase.rpc("log_student_action", {
      p_student_id: finalStudentId,
      p_action_type: "fee_payment_rejection",
      p_action_description:
        `Zelle payment for ${feeTypeLabel} rejected. Reason: ${reason}`,
      p_performed_by: adminUserId,
      p_performed_by_type: "admin",
      p_metadata: {
        payment_id: payment.id,
        fee_type: payment.fee_type,
        amount: payment.amount,
        reason: reason,
      },
    });
  } catch (error) {
    console.error(
      "❌ [rejectZelleFlow] Erro ao criar notificação in-app ou log:",
      error,
    );
    // Não falhar o processo se a notificação ou log falhar
  }
}

// Helper to handle fee installment plans updates and associations on Zelle approval
async function handleInstallmentPlanAssociation(
  supabase: SupabaseClient,
  userId: string,
  paymentAmount: number,
  paymentFeeType: string,
  individualFeePaymentId: string
) {
  try {
    let planFeeType = paymentFeeType;
    if (paymentFeeType === 'placement' || paymentFeeType === 'placement_fee') {
      planFeeType = 'placement_fee';
    } else if (paymentFeeType === 'selection_process' || paymentFeeType === 'selection_process_fee') {
      planFeeType = 'selection_process_fee';
    } else if (paymentFeeType === 'i20_control' || paymentFeeType === 'i20_control_fee' || paymentFeeType === 'control_fee') {
      planFeeType = 'i20_control_fee';
    } else if (paymentFeeType === 'ds160_package') {
      planFeeType = 'ds160_package';
    } else if (paymentFeeType === 'i539_cos_package') {
      planFeeType = 'i539_cos_package';
    }

    // Buscar plano ativo para o user_id + fee_type
    const { data: activePlan, error: planError } = await supabase
      .from('fee_installment_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('fee_type', planFeeType)
      .eq('status', 'active')
      .maybeSingle();

    if (planError) {
      console.error('❌ [zelleOrchestrator] Erro ao buscar fee_installment_plans ativo:', planError);
      return;
    }

    if (!activePlan) {
      console.log('ℹ️ [zelleOrchestrator] Nenhum fee_installment_plans ativo encontrado para:', { userId, planFeeType });
      return;
    }

    console.log('📝 [zelleOrchestrator] Plano ativo encontrado:', activePlan);

    const nextPaidCount = (activePlan.installments_paid || 0) + 1;
    const nextAmountPaid = Number(activePlan.amount_paid || 0) + paymentAmount;
    
    const isCompleted = nextPaidCount >= (activePlan.total_installments || 2) || 
                        nextAmountPaid >= Number(activePlan.total_amount || 0);

    const updateFields: any = {
      installments_paid: nextPaidCount,
      amount_paid: nextAmountPaid,
      updated_at: new Date().toISOString(),
    };

    if (isCompleted) {
      updateFields.status = 'completed';
      updateFields.completed_at = new Date().toISOString();
    }

    // 1. Atualizar o plano de parcelamento
    const { error: updatePlanError } = await supabase
      .from('fee_installment_plans')
      .update(updateFields)
      .eq('id', activePlan.id);

    if (updatePlanError) {
      console.error('❌ [zelleOrchestrator] Erro ao atualizar fee_installment_plans:', updatePlanError);
      return;
    }

    // 2. Vincular o plan_id no registro de individual_fee_payments
    const { error: updatePaymentError } = await supabase
      .from('individual_fee_payments')
      .update({ installment_plan_id: activePlan.id })
      .eq('id', individualFeePaymentId);

    if (updatePaymentError) {
      console.error('❌ [zelleOrchestrator] Erro ao vincular installment_plan_id no individual_fee_payments:', updatePaymentError);
    } else {
      console.log('✅ [zelleOrchestrator] Plano vinculado e atualizado com sucesso para o pagamento:', individualFeePaymentId);
    }
  } catch (err) {
    console.error('❌ [zelleOrchestrator] Exceção em handleInstallmentPlanAssociation:', err);
  }
}

// ─── Placement Fee Installment Flows ────────────────────────────────────────

/**
 * Approves the first installment (50%) of a placement fee payment.
 * - Marks `is_placement_fee_paid = true` (unlocks Kanban flow)
 * - Records `placement_fee_pending_balance`, `placement_fee_due_date`, `placement_fee_installment_number = 1`
 * - Does NOT record full billing (only partial)
 * - Notifies student via webhook
 */
export async function approvePartialZelleFlow(params: {
  supabase: SupabaseClient;
  adminUserId: string;
  payment: PaymentLike;
}) {
  const { supabase, adminUserId, payment } = params;

  // Garantir que temos o student_id (profile id) correto
  let finalStudentId = payment.student_id;
  if (!finalStudentId || finalStudentId === "") {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", payment.user_id)
      .single();
    if (profile) finalStudentId = profile.id;
  }


  const pendingBalance = payment.amount; // valor pago = 1ª parcela; mesmo valor ainda pendente
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 dias

  // 1. Aprovar o Zelle payment (status → approved)
  await supabase
    .from("zelle_payments")
    .update({
      status: "approved",
      admin_approved_by: adminUserId,
      admin_approved_at: new Date().toISOString(),
      admin_notes: "Approved as 1st installment (50%)",
    })
    .eq("id", payment.id);

  // 2. Atualizar user_profiles: desbloquear fluxo
  // NOTA: O saldo pendente e o número da parcela são gerenciados automaticamente 
  // pelo trigger 'trg_after_insert_placement_payment' no banco ao registrar o pagamento individual.
  await supabase
    .from("user_profiles")
    .update({
      is_placement_fee_paid: true, // Necessário para desbloquear o Kanban/Flow do aluno
      placement_fee_payment_method: "zelle",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", payment.user_id);

  // 3. Registrar pagamento parcial em individual_fee_payments
  const paymentRecord = await recordIndividualFeePayment(supabase, {
    userId: payment.user_id,
    feeType: "placement" as any,
    amount: payment.amount,
    paymentDate: payment.admin_approved_at || new Date().toISOString(),
    paymentMethod: "zelle",
    zellePaymentId: payment.id,
  });

  // Note: the DB trigger trg_after_insert_placement_payment handles
  // fee_installment_plans update and installment_plan_id linking automatically.

  // 4. Log da ação
  await supabase.rpc("log_student_action", {
    p_student_id: finalStudentId,
    p_action_type: "fee_payment",
    p_action_description: "Placement Fee 1ª Parcela aprovada manualmente",
    p_performed_by: adminUserId,
    p_performed_by_type: "admin",
    p_metadata: {
      fee_type: "placement_installment_1",
      payment_method: "zelle",
      amount: payment.amount,
      pending_balance: pendingBalance,
      payment_id: payment.id,
    },
  });

  // 5. Notificar o aluno via webhook
  try {
    const dueDateFormatted = new Date(dueDate).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
    const notificationPayload = {
      tipo_notf: "1ª Parcela do Placement Fee aprovada",
      email_aluno: payment.student_email,
      nome_aluno: payment.student_name,
      email_universidade: "",
      o_que_enviar: `Sua 1ª parcela do Placement Fee ($${payment.amount.toFixed(2)}) foi aprovada. Você já pode continuar o processo. O download dos documentos finais será liberado após o pagamento da 2ª parcela ($${pendingBalance.toFixed(2)}), com vencimento em ${dueDateFormatted}.`,
      payment_id: payment.id,
      fee_type: "placement_installment_1",
      amount: payment.amount,
    };
    await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationPayload),
    });
  } catch (_) {}
}

/**
 * Approves the second (final) installment of a placement fee payment.
 * - Clears `placement_fee_pending_balance = 0`, `placement_fee_installment_number = 2`
 * - Downloads (Acceptance Letter, I-20) are unblocked automatically
 * - Notifies student via webhook
 */
export async function approveSecondInstallmentFlow(params: {
  supabase: SupabaseClient;
  adminUserId: string;
  payment: PaymentLike;
}) {
  const { supabase, adminUserId, payment } = params;

  // Garantir que temos o student_id (profile id) correto
  let finalStudentId = payment.student_id;
  if (!finalStudentId || finalStudentId === "") {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", payment.user_id)
      .single();
    if (profile) finalStudentId = profile.id;
  }


  // 1. Aprovar o Zelle payment
  await supabase
    .from("zelle_payments")
    .update({
      status: "approved",
      admin_approved_by: adminUserId,
      admin_approved_at: new Date().toISOString(),
      admin_notes: "Approved as 2nd installment — placement fee fully paid",
    })
    .eq("id", payment.id);

  // 2. Atualizar perfil
  // NOTA: O saldo pendente é zerado e o número da parcela é incrementado para 2
  // automaticamente pelo trigger no banco ao registrar o pagamento individual.
  await supabase
    .from("user_profiles")
    .update({
      placement_fee_payment_method: "zelle",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", payment.user_id);

  // 3. Registrar 2ª parcela em individual_fee_payments
  const paymentRecord = await recordIndividualFeePayment(supabase, {
    userId: payment.user_id,
    feeType: "placement" as any,
    amount: payment.amount,
    paymentDate: payment.admin_approved_at || new Date().toISOString(),
    paymentMethod: "zelle",
    zellePaymentId: payment.id,
  });

  // Note: the DB trigger trg_after_insert_placement_payment handles
  // fee_installment_plans update and installment_plan_id linking automatically.

  // 4. Billing
  await supabase.rpc("register_payment_billing", {
    user_id_param: payment.user_id,
    fee_type_param: "placement_fee",
    amount_param: payment.amount,
    payment_session_id_param: `zelle_${payment.id}`,
    payment_method_param: "zelle",
  });

  // 5. Log
  await supabase.rpc("log_student_action", {
    p_student_id: finalStudentId,
    p_action_type: "fee_payment",
    p_action_description: "Placement Fee 2ª Parcela aprovada — dívida quitada",
    p_performed_by: adminUserId,
    p_performed_by_type: "admin",
    p_metadata: {
      fee_type: "placement_installment_2",
      payment_method: "zelle",
      amount: payment.amount,
      payment_id: payment.id,
    },
  });

  // 6. Notificar o aluno
  try {
    const notificationPayload = {
      tipo_notf: "Placement Fee totalmente quitado",
      email_aluno: payment.student_email,
      nome_aluno: payment.student_name,
      email_universidade: "",
      o_que_enviar: `Sua 2ª parcela do Placement Fee ($${payment.amount.toFixed(2)}) foi aprovada. O Placement Fee está totalmente quitado e seus documentos finais (Acceptance Letter e I-20) estão liberados para download!`,
      payment_id: payment.id,
      fee_type: "placement_installment_2",
      amount: payment.amount,
    };
    await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationPayload),
    });
  } catch (_) {}
}
