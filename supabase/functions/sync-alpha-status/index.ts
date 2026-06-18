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
    // Include new fields for resubmit logic (T16/T17)
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

        if (isFirstFinalization) {
          updates.certified_files = project.certifiedFiles;
          updates.certified_at = now;
          // Expose first file URL for student download button
          updates.certified_file_url = project.certifiedFiles[0].url;
          console.log(`[sync-alpha-status] Order ${order.id} finalized — ${project.certifiedFiles.length} file(s)`);

          // T17 — Resubmit if linked to a rejected document_request_upload
          if (order.document_request_upload_id && !order.resubmit_upload_id) {
            console.log(`[sync-alpha-status] Order ${order.id} has link — attempting resubmit`);
            const resubmit = await performResubmit(adminClient, order, project.certifiedFiles[0], now);
            if (resubmit.uploadId) {
              updates.resubmit_upload_id = resubmit.uploadId;
              updates.resubmitted_at = now;
              console.log(`[sync-alpha-status] Resubmit OK — new upload ${resubmit.uploadId}`);

              // T18 — Notify student and admin
              await sendResubmitNotifications(
                adminClient,
                order.user_id,
                order.original_filename || 'document'
              );
            } else {
              console.error(`[sync-alpha-status] Resubmit FAILED for order ${order.id}: ${resubmit.error}`);
            }
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

// ─── T17: Resubmit automático ─────────────────────────────────────────────────

async function performResubmit(
  adminClient: ReturnType<typeof createClient>,
  order: {
    id: string;
    user_id: string;
    document_request_upload_id: string;
    document_request_id: string | null;
  },
  certifiedFile: { url: string; name?: string },
  _now: string
): Promise<{ uploadId: string | null; error: string | null }> {
  try {
    // 1. Download certified file from Firebase Storage (public URL)
    const fileRes = await fetch(certifiedFile.url);
    if (!fileRes.ok) {
      throw new Error(`Failed to download certified file: HTTP ${fileRes.status}`);
    }
    const fileBlob = await fileRes.blob();

    // Build a clean filename: prepend "translated_" to the original name
    const rawName = certifiedFile.name
      || certifiedFile.url.split('/').pop()?.split('?')[0]
      || 'document.pdf';
    const fileName = `translated_${rawName}`;

    // 2. Upload to Supabase Storage
    const storagePath = `translations/resubmit/${order.user_id}/${Date.now()}_${fileName}`;
    const { data: storageData, error: uploadError } = await adminClient.storage
      .from('document-attachments')
      .upload(storagePath, fileBlob, {
        contentType: fileBlob.type || 'application/pdf',
        upsert: false,
      });
    if (uploadError) throw uploadError;

    // 3. Create new document_request_uploads record
    const { data: newUpload, error: insertError } = await adminClient
      .from('document_request_uploads')
      .insert({
        document_request_id: order.document_request_id,
        uploaded_by: order.user_id,
        file_url: storageData.path,
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

// ─── T18: Notificações pós-resubmit ──────────────────────────────────────────

async function sendResubmitNotifications(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  originalFilename: string
): Promise<void> {
  const idempotencyKey = `translation_resubmit_${userId}_${Date.now()}`;

  // Student notification (user_id = auth user ID)
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

  // Admin notification
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
