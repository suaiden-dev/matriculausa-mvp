import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const originalUrl = url.searchParams.get('url')
    const bucketParam = url.searchParams.get('bucket')
    const pathParam = url.searchParams.get('path')
    const token = url.searchParams.get('token')
    
    // Shared secret tokens to prevent abuse
    const N8N_STORAGE_SECRET = Deno.env.get('N8N_STORAGE_SECRET') || 'n8n_default_secret_2026';
    const TFOE_N8N_TOKEN = 'tfoe_n8n_2026_a7b3c9d1e5f2';

    if (!token || (token !== N8N_STORAGE_SECRET && token !== TFOE_N8N_TOKEN)) {
      console.error('[n8n-storage-proxy] Unauthorized access attempt: Invalid token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let bucket = bucketParam
    let path = pathParam

    // Auto-extract from URL if provided
    if (originalUrl) {
      try {
        const parsedUrl = new URL(originalUrl)
        // Expected format: .../storage/v1/object/public/BUCKET/PATH
        const pathParts = parsedUrl.pathname.split('/')
        const objectIndex = pathParts.indexOf('object')
        if (objectIndex !== -1 && pathParts.length > objectIndex + 3) {
          bucket = pathParts[objectIndex + 2]
          path = pathParts.slice(objectIndex + 3).join('/')
        }
      } catch (e) {
        console.error('[n8n-storage-proxy] Error parsing URL:', e);
      }
    }

    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: 'Bucket and Path are required (or valid URL)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[n8n-storage-proxy] Fetching private file: ${bucket}/${path}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(path)

    if (error) {
      console.error('[n8n-storage-proxy] Storage error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const contentType = data.type || 'application/octet-stream'

    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      }
    })

  } catch (error) {
    console.error('[n8n-storage-proxy] Internal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
