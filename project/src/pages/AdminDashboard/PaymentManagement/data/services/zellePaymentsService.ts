import { supabase } from "../../../../../lib/supabase";

export async function addZelleAdminNotesService(params: {
  paymentId: string;
  notes: string;
  adminUserId: string;
}) {
  const { paymentId, notes, adminUserId } = params;
  const { error } = await supabase
    .from("zelle_payments")
    .update({
      admin_notes: notes,
      admin_approved_by: adminUserId,
      admin_approved_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  // Registrar no log de atividades do estudante
  if (!error) {
    try {
      // Buscar o user_id do pagamento para encontrar o profile_id
      const { data: paymentData } = await supabase
        .from("zelle_payments")
        .select("user_id, fee_type")
        .eq("id", paymentId)
        .single();

      if (paymentData) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("user_id", paymentData.user_id)
          .single();

        if (profile) {
          const feeLabel = String(paymentData.fee_type || "payment")
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());

          await supabase.rpc("log_student_action", {
            p_student_id: profile.id,
            p_action_type: "admin_note_created",
            p_action_description:
              `Admin note added to Zelle payment (${feeLabel}): ${notes}`,
            p_performed_by: adminUserId,
            p_performed_by_type: "admin",
            p_metadata: {
              payment_id: paymentId,
              notes: notes,
              fee_type: paymentData.fee_type,
            },
          });
        }
      }
    } catch (logError) {
      console.warn("⚠️ Error logging Zelle note action:", logError);
    }
  }

  return { error };
}

export async function approveZelleStatusService(params: {
  paymentId: string;
  adminUserId: string;
}) {
  const { paymentId, adminUserId } = params;
  const { error } = await supabase
    .from("zelle_payments")
    .update({
      status: "approved",
      admin_approved_by: adminUserId,
      admin_approved_at: new Date().toISOString(),
    })
    .eq("id", paymentId);
  return { error };
}

export async function rejectZelleStatusService(params: {
  paymentId: string;
  reason: string;
}) {
  const { paymentId, reason } = params;
  const { error } = await supabase
    .from("zelle_payments")
    .update({
      status: "rejected",
      admin_notes: reason,
    })
    .eq("id", paymentId);
  return { error };
}

export async function sendRejectionWebhookService(
  payload: Record<string, any>,
) {
  const res = await fetch("https://nwh.suaiden.com/webhook/notfmatriculausa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status };
}

export async function sendInAppNotificationService(params: {
  accessToken: string;
  functionsUrl: string;
  payload: Record<string, any>;
}) {
  const { accessToken, functionsUrl, payload } = params;
  const res = await fetch(`${functionsUrl}/create-student-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status };
}
