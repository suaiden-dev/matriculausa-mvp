import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

async function verifyServiceRoleToken(token: string, jwtSecret: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (payload.role !== 'service_role') return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const binarySignature = Uint8Array.from(base64UrlDecode(parts[2]), (c) => c.charCodeAt(0));
    const data = encoder.encode(parts[0] + '.' + parts[1]);
    
    return await crypto.subtle.verify('HMAC', key, binarySignature, data);
  } catch (err) {
    console.error('[send-to-alpha] Error verifying service role token:', err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')!;
    const alphaApiKey = Deno.env.get('ALPHA_API_KEY')!;

    // Parse payload first for debug capability
    let translation_order_id = null;
    try {
      const body = await req.json();
      translation_order_id = body.translation_order_id;
    } catch (e) {
      // Ignore parse error here, will handle later
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    let user = null;
    let isAdmin = false;

    const isServiceRoleValid = await verifyServiceRoleToken(token, jwtSecret).catch(() => false);

    if (token === serviceKey || isServiceRoleValid) {
      isAdmin = true;
    } else {
      const { data: { user: authUser }, error: authError } = await adminClient.auth.getUser(token);
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = authUser;
    }

    if (!translation_order_id) {
      return new Response(JSON.stringify({ error: 'Missing translation_order_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the translation order — filter by user_id if not admin
    let query = adminClient
      .from('translation_orders')
      .select('*')
      .eq('id', translation_order_id);

    if (!isAdmin && user) {
      query = query.eq('user_id', user.id);
    }

    const { data: order, error: orderError } = await query.single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Translation order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Payment not confirmed yet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.alpha_project_number) {
      // Already submitted — idempotent response
      return new Response(
        JSON.stringify({ success: true, projectNumber: order.alpha_project_number, alreadySubmitted: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download file from private Supabase Storage via service role
    const storagePath = order.document_url;
    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from('document-attachments')
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.error('[send-to-alpha] Failed to download from storage:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download document from storage', details: downloadError?.message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileName = order.original_filename || storagePath.split('/').pop() || 'document.pdf';

    // Build multipart payload for Alpha API
    const projectName = fileName.replace(/\.[^/.]+$/, '') || 'Documento';
    const isCertified = order.document_type === 'notarized' ? 'true' : 'false';

    let studentEmail = '';
    if (isAdmin) {
      const { data: authUser, error: authUserErr } = await adminClient.auth.admin.getUserById(order.user_id);
      if (authUserErr || !authUser?.user?.email) {
        const { data: profile } = await adminClient.from('user_profiles').select('email').eq('user_id', order.user_id).single();
        studentEmail = profile?.email || '';
      } else {
        studentEmail = authUser.user.email;
      }
    } else if (user) {
      studentEmail = user.email!;
    }

    const formData = new FormData();
    formData.append('projectName', projectName);
    formData.append('sourceLanguage', order.source_language);
    formData.append('targetLanguage', order.target_language);
    formData.append('externalClientId', studentEmail);
    formData.append('isCertified', isCertified);
    formData.append('isPriority', 'false');
    formData.append('files', fileBlob, fileName);

    // Submit to Alpha Translations
    const alphaRes = await fetch('https://createprojectexternal-n3gdftgt2a-uc.a.run.app', {
      method: 'POST',
      headers: { 'x-api-key': alphaApiKey },
      body: formData,
    });

    let alphaData: any;
    try {
      alphaData = await alphaRes.json();
    } catch {
      alphaData = { error: 'Non-JSON response from Alpha API' };
    }

    if (!alphaRes.ok || !alphaData.success) {
      console.error('[send-to-alpha] Alpha API error:', alphaData);
      return new Response(JSON.stringify({ error: 'Alpha API rejected the request', details: alphaData }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Persist project number
    const { error: updateError } = await adminClient
      .from('translation_orders')
      .update({
        alpha_project_number: alphaData.projectNumber,
        alpha_project_status: 'Em Análise',
        translation_status: 'Em Análise',
        alpha_synced_at: new Date().toISOString(),
      })
      .eq('id', translation_order_id);

    if (updateError) {
      console.error('[send-to-alpha] Failed to save project number:', updateError);
    }

    console.log(`[send-to-alpha] Success — order ${translation_order_id} → Alpha #${alphaData.projectNumber}`);

    return new Response(
      JSON.stringify({ success: true, projectNumber: alphaData.projectNumber }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[send-to-alpha] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
