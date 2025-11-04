import { supabase } from '../../../../../lib/supabase';

export async function addZelleAdminNotesService(params: {
  paymentId: string;
  notes: string;
  adminUserId: string;
}) {
  const { paymentId, notes, adminUserId } = params;
  const { error } = await supabase
    .from('zelle_payments')
    .update({
      admin_notes: notes,
      admin_approved_by: adminUserId,
      admin_approved_at: new Date().toISOString(),
    })
    .eq('id', paymentId);
  return { error };
}

export async function approveZelleStatusService(params: {
  paymentId: string;
  adminUserId: string;
}) {
  const { paymentId, adminUserId } = params;
  const { error } = await supabase
    .from('zelle_payments')
    .update({
      status: 'approved',
      admin_approved_by: adminUserId,
      admin_approved_at: new Date().toISOString(),
    })
    .eq('id', paymentId);
  return { error };
}

export async function rejectZelleStatusService(params: {
  paymentId: string;
  reason: string;
}) {
  const { paymentId, reason } = params;
  const { error } = await supabase
    .from('zelle_payments')
    .update({
      status: 'rejected',
      admin_notes: reason,
    })
    .eq('id', paymentId);
  return { error };
}

export async function sendRejectionWebhookService(payload: Record<string, any>) {
  const res = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status };
}


