import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildDocReadyHtml, sendEmail, fetchUserContext } from '../shared/translation-emails.ts';

// @ts-ignore
declare const Deno: any;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Only callable with service role (admin)
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== serviceKey) {
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error || !user) return json({ error: 'Unauthorized' }, 401);
    // Check admin role
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (profile?.role !== 'admin') return json({ error: 'Forbidden' }, 403);
  }

  let translation_order_id: string;
  try {
    const body = await req.json();
    translation_order_id = body.translation_order_id;
  } catch (e: any) {
    return json({ error: 'Invalid JSON body', details: e?.message }, 400);
  }
  if (!translation_order_id) return json({ error: 'translation_order_id required' }, 400);

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {

  const { data: order, error: orderErr } = await adminClient
    .from('translation_orders')
    .select('id, user_id, document_url, original_filename, document_request_id, document_request_upload_id, resubmit_upload_id, certified_at, alpha_project_number')
    .eq('id', translation_order_id)
    .single();

  if (orderErr || !order) return json({ error: 'Order not found' }, 404);
  if (order.certified_at) return json({ error: 'Already finalized', certified_at: order.certified_at }, 400);
  if (!order.document_url) return json({ error: 'No document_url on order' }, 400);

  const now = new Date().toISOString();

  // ── Mirror: usa o próprio document_url como "arquivo certificado" de teste
  const { data: fileBlob, error: downloadErr } = await adminClient.storage
    .from('document-attachments')
    .download(order.document_url);

  if (downloadErr || !fileBlob) {
    return json({ error: 'Failed to download source document', details: downloadErr?.message }, 502);
  }

  const rawName = order.original_filename || order.document_url.split('/').pop() || 'document.pdf';
  const storagePath = `translations/certified/${order.id}/0_simulated_${rawName}`;

  const { error: uploadErr } = await adminClient.storage
    .from('document-attachments')
    .upload(storagePath, fileBlob, {
      contentType: fileBlob.type || 'application/pdf',
      upsert: true,
    });

  if (uploadErr) return json({ error: 'Failed to upload to storage', details: uploadErr.message }, 502);

  const { data: signedData, error: signedErr } = await adminClient.storage
    .from('document-attachments')
    .createSignedUrl(storagePath, 315360000); // 10 years

  if (signedErr || !signedData?.signedUrl) {
    return json({ error: 'Failed to create signed URL', details: signedErr?.message }, 502);
  }

  const mirrored = { name: rawName, storagePath, signedUrl: signedData.signedUrl };

  const updates: Record<string, unknown> = {
    certified_at: now,
    certified_file_url: mirrored.signedUrl,
    certified_files: [{ name: mirrored.name, url: mirrored.signedUrl }],
    certified_files_storage: [{ name: mirrored.name, path: mirrored.storagePath }],
    translation_status: 'Finalizado',
    alpha_project_status: 'Finalizado',
    alpha_synced_at: now,
    last_notified_status: 'Finalizado',
  };

  // ── Resubmit / first-submit
  let uploadId: string | null = null;

  if (order.document_request_id && !order.resubmit_upload_id) {
    const insertPayload: Record<string, unknown> = {
      document_request_id: order.document_request_id,
      uploaded_by: order.user_id,
      file_url: mirrored.storagePath,
      status: 'under_review',
      translation_order_id: order.id,
      is_admin_upload: false,
    };

    if (order.document_request_upload_id) {
      insertPayload.source = 'translation_resubmit';
    } else {
      insertPayload.source = 'translation_first_submit';
    }

    const { data: newUpload, error: insertErr } = await adminClient
      .from('document_request_uploads')
      .insert(insertPayload)
      .select('id')
      .single();

    if (!insertErr && newUpload) {
      uploadId = newUpload.id;
      updates.resubmit_upload_id = uploadId;
      updates.resubmitted_at = now;
    } else {
      console.error('[simulate-alpha-finalization] Resubmit failed:', insertErr);
    }
  }

  // ── Update order
  const { error: updateErr } = await adminClient
    .from('translation_orders')
    .update(updates)
    .eq('id', translation_order_id);

  if (updateErr) return json({ error: 'Failed to update order', details: updateErr.message }, 500);

  // ── Notifications
  await adminClient.from('student_notifications').insert({
    user_id: order.user_id,
    title: 'Documento traduzido enviado para revisão',
    message: `Seu documento traduzido "${rawName}" foi enviado automaticamente para revisão.`,
    type: 'translation_resubmit',
    link: '/student/dashboard/translations',
    idempotency_key: `sim_translation_resubmit_${order.id}`,
  }).maybeSingle();

  await adminClient.from('admin_notifications').insert({
    title: '[SIMULAÇÃO] Documento traduzido',
    message: `Simulação de finalização para order ${order.id} — "${rawName}"`,
    type: 'translation_resubmit',
    is_read: false,
  }).maybeSingle();

  // Send finalization email (fire-and-forget)
  (async () => {
    try {
      const user = await fetchUserContext(adminClient, order.user_id);
      if (user.email) {
        sendEmail(
          adminClient,
          user.email,
          'Your certified translation is ready — Matricula USA',
          buildDocReadyHtml({ name: user.name, docName: rawName }),
        );
      }
    } catch (emailErr: any) {
      console.error('[simulate-alpha-finalization] email failed:', emailErr?.message);
    }
  })();

  console.log(`[simulate-alpha-finalization] ✅ Order ${translation_order_id} simulado — storage: ${storagePath}`);

  return json({
    success: true,
    storagePath,
    signedUrl: mirrored.signedUrl,
    resubmit_upload_id: uploadId,
  });
  } catch (err: any) {
    console.error('[simulate-alpha-finalization] Unexpected error:', err);
    return json({ error: 'Internal Server Error', details: err?.message }, 500);
  }
});
