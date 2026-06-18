import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const alphaApiKey = Deno.env.get('ALPHA_API_KEY')!;

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
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { translation_order_id } = await req.json();
    if (!translation_order_id) {
      return new Response(JSON.stringify({ error: 'Missing translation_order_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the translation order — must belong to the authenticated user
    const { data: order, error: orderError } = await adminClient
      .from('translation_orders')
      .select('*')
      .eq('id', translation_order_id)
      .eq('user_id', user.id)
      .single();

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
    const formData = new FormData();
    formData.append('projectName', order.document_type || 'Documento');
    formData.append('sourceLanguage', order.source_language);
    formData.append('targetLanguage', order.target_language);
    formData.append('externalClientId', user.email!);
    formData.append('isCertified', 'true');
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
