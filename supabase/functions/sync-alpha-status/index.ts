import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildDocReadyHtml, buildStatusUpdateHtml, STATUS_LABELS, sendEmail, fetchUserContext, sendAdminOrderCompletedEmail } from '../shared/translation-emails.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Called by pg_cron every 10 minutes (x-cron-secret) or manually from admin dashboard (JWT).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const alphaApiKey = Deno.env.get('ALPHA_API_KEY')!;
  const cronSecret = Deno.env.get('CRON_SECRET');

  const incomingCronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization');

  let isAuthorized = false;
  if (incomingCronSecret && cronSecret && incomingCronSecret === cronSecret) {
    isAuthorized = true;
  } else if (authHeader) {
    const tempClient = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await tempClient.auth.getUser(token);
    if (!error && user) isAuthorized = true;
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    // Fetch all orders that need syncing.
    // Only skip Finalizado/Cancelado orders that already have certified_at —
    // orders stuck as "Finalizado" without certified files must still be retried.
    const { data: orders, error: fetchError } = await adminClient
      .from('translation_orders')
      .select('id, user_id, alpha_project_number, translation_status, certified_at, original_filename, document_request_upload_id, document_request_id, resubmit_upload_id, last_notified_status')
      .eq('payment_status', 'paid')
      .not('alpha_project_number', 'is', null)
      .or('translation_status.not.in.(Finalizado,Cancelado),certified_at.is.null');

    if (fetchError) {
      console.error('[sync-alpha-status] Failed to fetch orders:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[sync-alpha-status] ${orders?.length ?? 0} active orders to sync`);

    // Fetch ALL projects from Alpha in a single call — no externalClientId filter.
    // Per-email filtering omits finalized projects; fetching globally mirrors lush behavior.
    let alphaProjects: any[] = [];
    try {
      const alphaRes = await fetch(
        'https://getprojectstatusexternal-n3gdftgt2a-uc.a.run.app',
        { headers: { 'x-api-key': alphaApiKey } }
      );
      if (!alphaRes.ok) {
        const body = await alphaRes.text().catch(() => '');
        console.error(`[sync-alpha-status] Alpha API error: HTTP ${alphaRes.status} — ${body}`);
        return new Response(JSON.stringify({ error: `Alpha API returned HTTP ${alphaRes.status}` }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const alphaData = await alphaRes.json();
      alphaProjects = alphaData.projects ?? [];
      console.log(`[sync-alpha-status] Alpha returned ${alphaProjects.length} total projects`);
    } catch (err) {
      console.error('[sync-alpha-status] Failed to fetch Alpha status:', err);
      return new Response(JSON.stringify({ error: 'Failed to reach Alpha API' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let synced = 0;
    const now = new Date().toISOString();

    for (const order of orders) {
      // Compare as strings to avoid type mismatch (Alpha may return number or string)
      const project = alphaProjects.find(
        (p: any) => String(p.projectNumber) === String(order.alpha_project_number)
      );
      if (!project) {
        console.log(`[sync-alpha-status] Order ${order.id} — project ${order.alpha_project_number} not found in Alpha response`);
        continue;
      }

      const updates: Record<string, any> = {
        alpha_project_status: project.project_status,
        translation_status: project.translation_status,
        alpha_synced_at: now,
      };

      // T16 — Detect first finalization and mirror certified files
      const isFirstFinalization =
        Array.isArray(project.certifiedFiles) &&
        project.certifiedFiles.length > 0 &&
        !order.certified_at;

      let mirrored: { name: string; storagePath: string; signedUrl: string }[] = [];

      if (isFirstFinalization) {
        console.log(`[sync-alpha-status] Order ${order.id} finalized — ${project.certifiedFiles.length} file(s)`);

        mirrored = await mirrorCertifiedFiles(adminClient, order.id, order.user_id, project.certifiedFiles);

        if (mirrored.length === 0) {
          // Mirror failed completely — skip update entirely, cron will retry next cycle
          console.error(`[sync-alpha-status] [mirror] Order ${order.id} — mirror failed completely, skipping update (will retry)`);
          continue;
        }

        updates.certified_at = now;
        updates.certified_file_url = mirrored[0].signedUrl;
        updates.certified_files = mirrored.map(f => ({ name: f.name, url: f.signedUrl }));
        updates.certified_files_storage = mirrored.map(f => ({ name: f.name, path: f.storagePath }));
        console.log(`[sync-alpha-status] [mirror] Order ${order.id} — ${mirrored.length} file(s) mirrored to Storage`);

        // T17/T17B — Auto-submit to document_request if linked
        if (order.document_request_id && !order.resubmit_upload_id) {
          const certFile = mirrored[0];

          if (order.document_request_upload_id) {
            // Cenário A — resubmit: replace the rejected upload
            console.log(`[sync-alpha-status] Order ${order.id} — Cenário A: resubmitting rejected upload`);
            const resubmit = await performResubmit(adminClient, order, certFile, now);
            if (resubmit.uploadId) {
              updates.resubmit_upload_id = resubmit.uploadId;
              updates.resubmitted_at = now;
              console.log(`[sync-alpha-status] Resubmit OK — new upload ${resubmit.uploadId}`);
            } else {
              console.error(`[sync-alpha-status] Resubmit FAILED for order ${order.id}: ${resubmit.error}`);
            }
          } else {
            // Cenário B — voluntary link: create first upload for the linked request
            console.log(`[sync-alpha-status] Order ${order.id} — Cenário B: first submit to linked request ${order.document_request_id}`);
            const submit = await performFirstSubmit(adminClient, order, certFile, now);
            if (submit.uploadId) {
              updates.resubmit_upload_id = submit.uploadId;
              updates.resubmitted_at = now;
              console.log(`[sync-alpha-status] First submit OK — new upload ${submit.uploadId}`);
            } else {
              console.error(`[sync-alpha-status] First submit FAILED for order ${order.id}: ${submit.error}`);
            }
          }

          // T18 — Notify student and admin (both Cenários A and B)
          await sendResubmitNotifications(adminClient, order.user_id, order.original_filename || 'document');
        }
      }

      const newStatus: string = updates.translation_status ?? order.translation_status;

      const { error: updateError } = await adminClient
        .from('translation_orders')
        .update(updates)
        .eq('id', order.id);

      if (updateError) {
        console.error(`[sync-alpha-status] Failed to update order ${order.id}:`, updateError);
      } else {
        synced++;

        // Activity log: status change + resubmit
        (async () => {
          try {
            const { data: up } = await adminClient.from('user_profiles').select('id').eq('user_id', order.user_id).maybeSingle();
            if (!up) return;

            // Log status update / completion
            if (newStatus !== order.translation_status) {
              const isComplete = newStatus === 'Finalizado';
              await adminClient.rpc('log_student_action', {
                p_student_id: up.id,
                p_action_type: isComplete ? 'translation_completed' : 'translation_status_updated',
                p_action_description: `Translation status updated: ${order.translation_status} → ${newStatus}`,
                p_performed_by: order.user_id,
                p_performed_by_type: 'student',
                p_metadata: {
                  translation_order_id: order.id,
                  new_status: newStatus,
                  previous_status: order.translation_status,
                  alpha_project_number: order.alpha_project_number,
                  ...(isComplete ? { certified_files_count: mirrored.length, linked_to_document_request: !!order.document_request_id } : {}),
                },
              });
            }

            // Log resubmit (Cenário A or B)
            if (updates.resubmit_upload_id) {
              await adminClient.rpc('log_student_action', {
                p_student_id: up.id,
                p_action_type: 'translation_resubmitted',
                p_action_description: `Certified document resubmitted to document request`,
                p_performed_by: order.user_id,
                p_performed_by_type: 'student',
                p_metadata: {
                  translation_order_id: order.id,
                  document_request_id: order.document_request_id,
                  resubmit_upload_id: updates.resubmit_upload_id,
                  scenario: order.document_request_upload_id ? 'A' : 'B',
                },
              });
            }
          } catch (logErr: any) {
            console.error(`[sync-alpha-status] log failed for order ${order.id}:`, logErr?.message);
          }
        })();

        // Send status email if status changed to a notifiable value (deduplicated by last_notified_status)
        const NOTIFIABLE = ['Em Tradução', 'Em Certificação', 'Finalizado'];
        if (NOTIFIABLE.includes(newStatus) && newStatus !== order.last_notified_status) {
          (async () => {
            try {
              const user = await fetchUserContext(adminClient, order.user_id);
              if (!user.email) return;
              const docName = order.original_filename || 'Documento';
              const isComplete = newStatus === 'Finalizado';
              const label = STATUS_LABELS[newStatus];
              const subject = label?.subject ?? `Tradução — ${newStatus}`;
              const html = isComplete
                ? buildDocReadyHtml({ name: user.name, docName })
                : buildStatusUpdateHtml({ name: user.name, docName, status: newStatus, statusBody: label?.body ?? '' });
              sendEmail(adminClient, user.email, subject, html);
              if (isComplete) {
                const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'support@matriculausa.com';
                sendAdminOrderCompletedEmail(adminClient, order.id, order.user_id, supportEmail);
              }
              await adminClient.from('translation_orders').update({ last_notified_status: newStatus }).eq('id', order.id);
            } catch (err: any) {
              console.error(`[sync-alpha-status] email failed for order ${order.id}:`, err?.message);
            }
          })();
        }
      }
    }

    // ── Pass 2: cancellation detection on already-finalized orders ────────────
    // Uses alphaProjects already in memory — zero extra Alpha API calls.
    // Catches any order we marked Finalizado that Alpha subsequently cancelled.
    let cancelled = 0;
    try {
      const { data: finalizedOrders } = await adminClient
        .from('translation_orders')
        .select('id, user_id, alpha_project_number, original_filename')
        .eq('payment_status', 'paid')
        .eq('translation_status', 'Finalizado')
        .not('alpha_project_number', 'is', null);

      if (finalizedOrders && finalizedOrders.length > 0) {
        for (const fo of finalizedOrders) {
          const project = alphaProjects.find(
            (p: any) => String(p.projectNumber) === String(fo.alpha_project_number)
          );
          if (!project) continue;
          const alphaStatus: string = project.translation_status ?? project.project_status ?? '';
          if (alphaStatus === 'Cancelado') {
            const { error: cancelErr } = await adminClient
              .from('translation_orders')
              .update({
                translation_status: 'Cancelado',
                alpha_project_status: 'Cancelado',
                alpha_synced_at: now,
              })
              .eq('id', fo.id);
            if (cancelErr) {
              console.error(`[sync-alpha-status] [cancel-check] Failed to cancel order ${fo.id}:`, cancelErr);
            } else {
              cancelled++;
              console.log(`[sync-alpha-status] [cancel-check] Order ${fo.id} (Alpha #${fo.alpha_project_number}) — cancelled by Alpha, updated`);
            }
          }
        }
      }
    } catch (cancelCheckErr) {
      console.error('[sync-alpha-status] [cancel-check] Unexpected error:', cancelCheckErr);
    }
    // ── End Pass 2 ─────────────────────────────────────────────────────────────

    console.log(`[sync-alpha-status] Done — ${synced}/${orders.length} synced, ${cancelled} cancelled`);
    return new Response(JSON.stringify({ synced, total: orders.length, cancelled }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[sync-alpha-status] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Mirror certified files to Supabase Storage ───────────────────────────────

async function mirrorCertifiedFiles(
  adminClient: ReturnType<typeof createClient>,
  orderId: string,
  _userId: string,
  certifiedFiles: { url: string; name?: string }[]
): Promise<{ name: string; storagePath: string; signedUrl: string }[]> {
  const results: { name: string; storagePath: string; signedUrl: string }[] = [];

  for (let i = 0; i < certifiedFiles.length; i++) {
    const file = certifiedFiles[i];
    try {
      const fileRes = await fetch(file.url);
      if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status} fetching Firebase URL`);
      const fileBlob = await fileRes.blob();

      const rawName = file.name
        || file.url.split('/').pop()?.split('?')[0]
        || 'document.pdf';
      const storagePath = `translations/certified/${orderId}/${i}_${rawName}`;

      const { error: uploadError } = await adminClient.storage
        .from('document-attachments')
        .upload(storagePath, fileBlob, {
          contentType: fileBlob.type || 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await adminClient.storage
        .from('document-attachments')
        .createSignedUrl(storagePath, 315360000);

      if (signedError || !signedData?.signedUrl) {
        throw signedError ?? new Error('No signed URL returned');
      }

      results.push({ name: rawName, storagePath, signedUrl: signedData.signedUrl });
    } catch (err: any) {
      console.error(`[sync-alpha-status] [mirror] Failed to mirror file ${i} for order ${orderId}:`, err?.message ?? err);
    }
  }

  return results;
}

// ─── T17: Resubmit automático (Cenário A — upload rejeitado) ──────────────────

async function performResubmit(
  adminClient: ReturnType<typeof createClient>,
  order: {
    id: string;
    user_id: string;
    document_request_upload_id: string;
    document_request_id: string | null;
  },
  certFile: { storagePath: string; name?: string },
  _now: string
): Promise<{ uploadId: string | null; error: string | null }> {
  try {
    if (!certFile.storagePath) throw new Error('No storage path available for resubmit');

    const { data: newUpload, error: insertError } = await adminClient
      .from('document_request_uploads')
      .insert({
        document_request_id: order.document_request_id,
        uploaded_by: order.user_id,
        file_url: certFile.storagePath,
        status: 'under_review',
        source: 'translation_resubmit',
        translation_order_id: order.id,
        is_admin_upload: false,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    return { uploadId: newUpload.id, error: null };
  } catch (err: any) {
    return { uploadId: null, error: err.message ?? String(err) };
  }
}

// ─── T17B: First submit automático (Cenário B — vínculo voluntário) ───────────

async function performFirstSubmit(
  adminClient: ReturnType<typeof createClient>,
  order: {
    id: string;
    user_id: string;
    document_request_id: string;
  },
  certFile: { storagePath: string; name?: string },
  _now: string
): Promise<{ uploadId: string | null; error: string | null }> {
  try {
    if (!certFile.storagePath) throw new Error('No storage path available for first submit');

    const { data: newUpload, error: insertError } = await adminClient
      .from('document_request_uploads')
      .insert({
        document_request_id: order.document_request_id,
        uploaded_by: order.user_id,
        file_url: certFile.storagePath,
        status: 'under_review',
        source: 'translation_first_submit',
        translation_order_id: order.id,
        is_admin_upload: false,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    return { uploadId: newUpload.id, error: null };
  } catch (err: any) {
    return { uploadId: null, error: err.message ?? String(err) };
  }
}

// ─── T18: Notificações pós-resubmit/first-submit ─────────────────────────────

async function sendResubmitNotifications(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  originalFilename: string
): Promise<void> {
  const idempotencyKey = `translation_resubmit_${userId}_${Date.now()}`;

  const { error: studentErr } = await adminClient
    .from('student_notifications')
    .insert({
      user_id: userId,
      title: 'Documento traduzido enviado para revisão',
      message: `Seu documento traduzido "${originalFilename}" foi enviado automaticamente para revisão. Aguarde a avaliação do responsável.`,
      type: 'translation_resubmit',
      link: '/student/dashboard/translations',
      idempotency_key: idempotencyKey,
    });

  if (studentErr) {
    console.warn('[sync-alpha-status] Failed to insert student notification:', studentErr.message);
  }

  const { error: adminErr } = await adminClient
    .from('admin_notifications')
    .insert({
      title: '[Tradução] Documento resubmetido automaticamente',
      message: `O documento "${originalFilename}" foi traduzido e reenviado automaticamente para revisão do aluno.`,
      type: 'translation_resubmit',
      is_read: false,
    });

  if (adminErr) {
    console.warn('[sync-alpha-status] Failed to insert admin notification:', adminErr.message);
  }
}
