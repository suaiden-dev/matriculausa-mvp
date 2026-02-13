import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TFOE_WEBHOOK_URL = 'https://nwh.thefutureofenglish.com/webhook/tfoetranslations';
const TFOE_N8N_TOKEN = 'tfoe_n8n_2026_a7b3c9d1e5f2'; // Static token for n8n access

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { translation_order_ids } = await req.json();

    if (!translation_order_ids || !Array.isArray(translation_order_ids) || translation_order_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid translation_order_ids' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[submit-tfoe-translation] Processing ${translation_order_ids.length} orders for user ${user.id}`);

    // Fetch translation orders
    const { data: orders, error: ordersError } = await adminClient
      .from('translation_orders')
      .select('*')
      .in('id', translation_order_ids)
      .eq('user_id', user.id);

    if (ordersError || !orders || orders.length === 0) {
      console.error('[submit-tfoe-translation] Error fetching orders:', ordersError);
      return new Response(JSON.stringify({ error: 'Orders not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile for client name
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();

    const clientName = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown';

    // Process each order
    const results = [];
    for (const order of orders) {
      try {
        // Extract document path from URL
        // Expected format: https://.../storage/v1/object/public/student-documents/{path}
        // or direct path like: {user_id}/passport.pdf
        let documentPath = order.document_url;
        
        // If it's a full URL, extract the path
        if (documentPath.includes('/storage/v1/object/')) {
          const urlParts = documentPath.split('/student-documents/');
          documentPath = urlParts[1] || documentPath;
        }

        // Generate n8n access URL
        const n8nAccessUrl = `${supabaseUrl}/functions/v1/n8n-storage-access?bucket=student-documents&path=${encodeURIComponent(documentPath)}&token=${TFOE_N8N_TOKEN}`;

        // Sanitize filename for TFOE
        const originalFilename = documentPath.split('/').pop() || 'document.pdf';
        const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const tfoeFilename = `${order.id}_${sanitizedFilename}`;

        // Construct TFOE payload
        const tfoePayload = {
          filename: tfoeFilename,
          original_filename: originalFilename,
          original_document_id: order.id,
          url: n8nAccessUrl,
          mimetype: 'application/pdf',
          size: 0,
          user_id: user.id,
          pages: order.page_count,
          document_type: 'Certificado',
          total_cost: order.total_price.toString(),
          source_language: order.source_language,
          target_language: 'English',
          is_bank_statement: order.original_document_type === 'funds_proof',
          client_name: clientName,
          source_currency: null,
          target_currency: null,
          isPdf: true,
          fileExtension: 'pdf',
          tableName: 'profiles',
          schema: 'matriculausa', // Identificador para o n8n tratar o user_id diferente
        };

        console.log(`[submit-tfoe-translation] Submitting order ${order.id} to TFOE`);

        // Submit to TFOE webhook
        const tfoeResponse = await fetch(TFOE_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tfoePayload),
        });

        if (!tfoeResponse.ok) {
          throw new Error(`TFOE webhook returned ${tfoeResponse.status}: ${await tfoeResponse.text()}`);
        }

        const tfoeResult = await tfoeResponse.json();
        console.log(`[submit-tfoe-translation] TFOE response for order ${order.id}:`, tfoeResult);

        // Extract verification code and document ID from TFOE response
        // Response is an array with one object
        const tfoeData = Array.isArray(tfoeResult) ? tfoeResult[0] : tfoeResult;
        
        // Update translation order with TFOE data
        const { error: updateError } = await adminClient
          .from('translation_orders')
          .update({
            tfoe_verification_code: tfoeData.verification_code,
            tfoe_document_id: tfoeData.id,
            tfoe_status: 'pending',
            tfoe_submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`[submit-tfoe-translation] Error updating order ${order.id}:`, updateError);
          throw updateError;
        }

        results.push({
          order_id: order.id,
          success: true,
          tfoe_verification_code: tfoeData.verification_code,
          tfoe_document_id: tfoeData.id,
        });

      } catch (error) {
        console.error(`[submit-tfoe-translation] Error processing order ${order.id}:`, error);
        
        // Mark order as failed
        await adminClient
          .from('translation_orders')
          .update({
            tfoe_status: 'failed',
            notes: `TFOE submission failed: ${error.message}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        results.push({
          order_id: order.id,
          success: false,
          error: error.message,
        });
      }
    }

    // Check if all submissions failed
    const allFailed = results.every(r => !r.success);
    if (allFailed) {
      return new Response(JSON.stringify({ 
        error: 'All TFOE submissions failed',
        results 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[submit-tfoe-translation] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
