import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Called by pg_cron every 10 minutes — no user JWT, protected by CRON_SECRET header
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Auth via CRON_SECRET header
  const cronSecret = Deno.env.get('CRON_SECRET');
  const incoming = req.headers.get('x-cron-secret');
  if (cronSecret && incoming !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const alphaApiKey = Deno.env.get('ALPHA_API_KEY')!;

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    // Fetch all in-progress orders already submitted to Alpha
    const { data: orders, error: fetchError } = await adminClient
      .from('translation_orders')
      .select('id, user_id, alpha_project_number, translation_status, certified_at, original_filename, document_request_upload_id, document_request_id, resubmit_upload_id')
      .eq('payment_status', 'paid')
      .not('alpha_project_number', 'is', null)
      .not('translation_status', 'in', '("Finalizado","Cancelado")');

    if (fetchError) {
      console.error('[sync-alpha-status] Failed to fetch orders:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!orders || orders.length === 0) {
      console.log('[sync-alpha-status] No orders to sync');
      return new Response(JSON.stringify({ synced: 0 }), { status: 200 });
    }

    console.log(`[sync-alpha-status] Syncing ${orders.length} orders`);

    // Get unique user IDs to fetch emails
    const userIds = [...new Set(orders.map((o: any) => o.user_id))];

    const userEmailMap: Record<string, string> = {};
    for (const userId of userIds) {
      const { data: userData } = await adminClient.auth.admin.getUserById(userId as string);
      if (userData?.user?.email) {
        userEmailMap[userId as string] = userData.user.email;
      }
    }

    // Group orders by student email
    const ordersByEmail: Record<string, typeof orders> = {};
    for (const order of orders) {
      const email = userEmailMap[order.user_id];
      if (!email) continue;
      if (!ordersByEmail[email]) ordersByEmail[email] = [];
      ordersByEmail[email].push(order);
    }

    let synced = 0;
    const now = new Date().toISOString();

    // For each student, call Alpha API once and update all their orders
    for (const [email, studentOrders] of Object.entries(ordersByEmail)) {
      let alphaProjects: any[] = [];
      try {
        const alphaRes = await fetch(
          `https://getprojectstatusexternal-n3gdftgt2a-uc.a.run.app?externalClientId=${encodeURIComponent(email)}`,
          { headers: { 'x-api-key': alphaApiKey } }
        );
        if (!alphaRes.ok) {
          console.warn(`[sync-alpha-status] Alpha API error for ${email}: HTTP ${alphaRes.status}`);
          continue;
        }
        const alphaData = await alphaRes.json();
        alphaProjects = alphaData.projects ?? [];
      } catch (err) {
        console.warn(`[sync-alpha-status] Failed to fetch Alpha status for ${email}:`, err);
        continue;
      }

      for (const order of studentOrders) {
        const project = alphaProjects.find(
          (p: any) => p.projectNumber === order.alpha_project_number
        );
        if (!project) continue;

        const updates: Record<string, any> = {
          alpha_project_status: project.project_status,
          translation_status: project.translation_status,
          alpha_synced_at: now,
        };

        // T16 — Detect finalization and save certified file URL
        const isFirstFinalization =
          Array.isArray(project.certifiedFiles) &&
          project.certifiedFiles.length > 0 &&
          !order.certified_at;

        let mirrored: { name: string; storagePath: string; signedUrl: string }[] = [];

        if (isFirstFinalization) {
          console.log(`[sync-alpha-status] Order ${order.id} finalized — ${project.certifiedFiles.length} file(s)`);

          // Mirror all certified files to Supabase Storage
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

        const { error: updateError } = await adminClient
          .from('translation_orders')
          .update(updates)
          .eq('id', order.id);

        if (updateError) {
          console.error(`[sync-alpha-status] Failed to update order ${order.id}:`, updateError);
        } else {
          synced++;
        }
      }
    }

    console.log(`[sync-alpha-status] Done — ${synced}/${orders.length} orders updated`);
    return new Response(JSON.stringify({ synced, total: orders.length }), { status: 200 });

  } catch (err) {
    console.error('[sync-alpha-status] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
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
      // 1. Download from Firebase
      const fileRes = await fetch(file.url);
      if (!fileRes.ok) {
        throw new Error(`HTTP ${fileRes.status} fetching Firebase URL`);
      }
      const fileBlob = await fileRes.blob();

      // 2. Build filename and storage path
      const rawName = file.name
        || file.url.split('/').pop()?.split('?')[0]
        || 'document.pdf';
      const storagePath = `translations/certified/${orderId}/${i}_${rawName}`;

      // 3. Upload to Supabase Storage
      const { error: uploadError } = await adminClient.storage
        .from('document-attachments')
        .upload(storagePath, fileBlob, {
          contentType: fileBlob.type || 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 4. Generate long-lived signed URL (10 years = 315360000 seconds)
      const { data: signedData, error: signedError } = await adminClient.storage
        .from('document-attachments')
        .createSignedUrl(storagePath, 315360000);

      if (signedError || !signedData?.signedUrl) {
        throw signedError ?? new Error('No signed URL returned');
      }

      results.push({ name: rawName, storagePath, signedUrl: signedData.signedUrl });
    } catch (err: any) {
      console.error(`[sync-alpha-status] [mirror] Failed to mirror file ${i} for order ${orderId}:`, err?.message ?? err);
      // Continue with remaining files
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
  certFile: { storagePath?: string; signedUrl?: string; name?: string },
  _now: string
): Promise<{ uploadId: string | null; error: string | null }> {
  try {
    const storagePath = certFile.storagePath;

    // If we have a storage path (mirroring succeeded), use it directly
    // If not (mirror failed), download from Firebase URL and re-upload
    let finalPath = storagePath;
    if (!finalPath && certFile.signedUrl) {
      const fileRes = await fetch(certFile.signedUrl);
      if (!fileRes.ok) throw new Error(`Failed to download certified file: HTTP ${fileRes.status}`);
      const fileBlob = await fileRes.blob();
      const rawName = certFile.name || 'translated_document.pdf';
      const fileName = `translated_${rawName}`;
      finalPath = `translations/resubmit/${order.user_id}/${Date.now()}_${fileName}`;
      const { data: storageData, error: uploadError } = await adminClient.storage
        .from('document-attachments')
        .upload(finalPath, fileBlob, { contentType: fileBlob.type || 'application/pdf', upsert: false });
      if (uploadError) throw uploadError;
      finalPath = storageData.path;
    }

    if (!finalPath) throw new Error('No storage path available for resubmit');

    // Create new document_request_uploads record
    const { data: newUpload, error: insertError } = await adminClient
      .from('document_request_uploads')
      .insert({
        document_request_id: order.document_request_id,
        uploaded_by: order.user_id,
        file_url: finalPath,
        status: 'pending',
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
  certFile: { storagePath?: string; name?: string },
  _now: string
): Promise<{ uploadId: string | null; error: string | null }> {
  try {
    if (!certFile.storagePath) {
      throw new Error('No storage path available for first submit');
    }

    const { data: newUpload, error: insertError } = await adminClient
      .from('document_request_uploads')
      .insert({
        document_request_id: order.document_request_id,
        uploaded_by: order.user_id,
        file_url: certFile.storagePath,
        status: 'pending',
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
