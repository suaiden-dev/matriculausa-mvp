import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get('bucket');
    const path = url.searchParams.get('path');

    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: 'Missing bucket or path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Support Authorization header ONLY (no more tokens in URLs for security)
    const authHeader = req.headers.get('Authorization');
    
    // DEBUG: Log headers to see what's coming in
    console.log(`[document-proxy] Incoming headers:`, Object.fromEntries(req.headers.entries()));
    if (authHeader) {
      console.log(`[document-proxy] Auth header found: ${authHeader.substring(0, 15)}... (len: ${authHeader.length})`);
    } else {
      console.warn(`[document-proxy] No Auth header found!`);
    }

    // Extract JWT token from Authorization header
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.error('[document-proxy] No token found in Authorization header');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'Missing authentication token.',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Verify Authentication using the token directly
    console.log('[document-proxy] Verifying user with token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[document-proxy] Authentication failed:', authError?.message || 'No user found');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to access this document.',
        details: authError?.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Admin client (Service Role) to fetch the actual file
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Authorization Check
    let isAuthorized = false;

    // A. Check if user is Admin
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role === 'admin') {
      isAuthorized = true;
      console.log(`[document-proxy] Access granted to Admin: ${user.id}`);
    }

    // B. Check if user is Owner
    // Most paths are structured as {user_id}/{something}
    if (!isAuthorized && path.startsWith(user.id)) {
      isAuthorized = true;
      console.log(`[document-proxy] Access granted to Owner: ${user.id}`);
    }

    // C. Special cases (e.g., identity photos or specific buckets)
    if (!isAuthorized && bucket === 'identity-photos') {
      // Logic for identity photos if path doesn't start with user.id
      // For now, sticking to owner/admin logic
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch and Stream the file
    console.log(`[document-proxy] Fetching file: bucket=${bucket}, path=${path}`);
    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from(bucket)
      .download(path);

    if (downloadError || !fileBlob) {
      return new Response(JSON.stringify({ error: 'File not found', details: downloadError }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get content type
    const contentType = fileBlob.type || 'application/octet-stream';

    return new Response(fileBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${path.split('/').pop()}"`,
      },
    });

  } catch (error) {
    console.error('[document-proxy] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
