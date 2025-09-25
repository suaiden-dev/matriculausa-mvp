import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadRequest {
  university_id: string;
  document_name: string;
  file_content: string;
  mime_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📤 upload-university-knowledge: Processing request');
    
    const { university_id, document_name, file_content, mime_type }: UploadRequest = await req.json();
    
    console.log('📤 upload-university-knowledge: Request data:', {
      university_id,
      document_name,
      mime_type: mime_type
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

    // Verify user has access to this university
    const { data: university, error: universityError } = await supabase
      .from('universities')
      .select('id, name')
      .eq('id', university_id)
      .eq('user_id', user.id)
      .single();

    if (universityError || !university) {
      throw new Error('University not found or access denied');
    }

    // Upload file to storage
    const fileExt = document_name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `university-knowledge/${university_id}/${fileName}`;
    
    // Convert base64 to Uint8Array
    const fileBytes = Uint8Array.from(atob(file_content), c => c.charCodeAt(0));
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('university-knowledge')
      .upload(filePath, fileBytes, {
        contentType: mime_type,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ upload-university-knowledge: Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('university-knowledge')
      .getPublicUrl(filePath);

    // Insert document into database
    const { data: document, error: insertError } = await supabase
      .from('university_knowledge_documents')
      .insert({
        university_id: university_id,
        document_name: document_name,
        file_url: publicUrl,
        file_size: fileBytes.length,
        mime_type: mime_type,
        uploaded_by_user_id: user.id,
        transcription_status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ upload-university-knowledge: Database insert error:', insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log('✅ upload-university-knowledge: Document uploaded successfully:', document.id);

    // Send webhook for transcription
    try {
      const webhookUrl = 'https://nwh.suaiden.com/webhook/docs-matriculausa';
      const webhookPayload = {
        document_id: document.id,
        document_name: document_name,
        file_url: publicUrl,
        mime_type: mime_type,
        university_id: university_id,
        university_name: university.name,
        user_id: user.id,
        user_email: user.email
      };

      console.log('📤 upload-university-knowledge: Sending webhook for transcription:', webhookPayload);

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        console.warn('⚠️ upload-university-knowledge: Webhook failed, but document was saved');
      } else {
        console.log('✅ upload-university-knowledge: Webhook sent successfully');
      }
    } catch (webhookError) {
      console.warn('⚠️ upload-university-knowledge: Webhook error (non-critical):', webhookError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        document: document,
        message: 'Document uploaded successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ upload-university-knowledge: Error:', error);
    
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
