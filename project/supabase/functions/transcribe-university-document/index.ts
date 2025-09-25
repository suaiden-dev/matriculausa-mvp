import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranscribeRequest {
  document_id: string;
  document_name: string;
  file_url: string;
  mime_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📤 transcribe-university-document: Processing request');
    
    const { document_id, document_name, file_url, mime_type }: TranscribeRequest = await req.json();
    
    console.log('📤 transcribe-university-document: Request data:', {
      document_id,
      document_name,
      mime_type
    });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get document details
    const { data: document, error: documentError } = await supabase
      .from('university_knowledge_documents')
      .select('*, universities!inner(id, name, user_id)')
      .eq('id', document_id)
      .single();

    if (documentError || !document) {
      throw new Error('Document not found');
    }

    // Verify user has access to this document
    if (document.universities.user_id !== user.id) {
      throw new Error('Access denied to this document');
    }

    // Update document status to processing
    await supabase
      .from('university_knowledge_documents')
      .update({ transcription_status: 'processing' })
      .eq('id', document_id);

    console.log('🔄 transcribe-university-document: Document status updated to processing');

    // Send webhook for transcription
    try {
      const webhookUrl = 'https://nwh.suaiden.com/webhook/docs-matriculausa';
      const webhookPayload = {
        document_id: document_id,
        document_name: document_name,
        file_url: file_url,
        mime_type: mime_type,
        university_id: document.university_id,
        university_name: document.universities.name,
        user_id: user.id,
        user_email: user.email,
        document_type: 'university_knowledge'
      };

      console.log('📤 transcribe-university-document: Sending webhook for transcription:', webhookPayload);

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        console.error('❌ transcribe-university-document: Webhook failed');
        
        // Update document status to error
        await supabase
          .from('university_knowledge_documents')
          .update({ 
            transcription_status: 'error',
            webhook_result: { error: 'Webhook failed', status: webhookResponse.status }
          })
          .eq('id', document_id);
        
        throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
      }

      const webhookResult = await webhookResponse.json();
      console.log('✅ transcribe-university-document: Webhook sent successfully');

      // Update document with webhook result
      await supabase
        .from('university_knowledge_documents')
        .update({ 
          webhook_result: webhookResult,
          updated_at: new Date().toISOString()
        })
        .eq('id', document_id);

      console.log('✅ transcribe-university-document: Document updated with webhook result');

    } catch (webhookError) {
      console.error('❌ transcribe-university-document: Webhook error:', webhookError);
      
      // Update document status to error
      await supabase
        .from('university_knowledge_documents')
        .update({ 
          transcription_status: 'error',
          webhook_result: { error: webhookError.message }
        })
        .eq('id', document_id);
      
      throw webhookError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transcription webhook sent successfully',
        document_id: document_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ transcribe-university-document: Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})
