import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { document_id, document_name, file_url, mime_type, agent_id } = await req.json()

    console.log('🔄 [transcribe-email-document] Starting transcription for:', document_id)

    // Update document status to processing
    const { error: updateError } = await supabaseClient
      .from('email_knowledge_documents')
      .update({ 
        transcription_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', document_id)

    if (updateError) {
      console.error('❌ [transcribe-email-document] Error updating status:', updateError)
      throw updateError
    }

    // Send webhook to n8n for transcription
    const webhookUrl = 'https://nwh.suaiden.com/webhook/docs-matriculausa'
    const webhookPayload = {
      user_id: 'system', // System user for email agents
      agent_id: agent_id || 'default', // Use 'default' if agent_id is null
      file_name: document_name,
      file_type: mime_type,
      file_url: file_url
    }

    console.log('📤 [transcribe-email-document] Sending webhook to n8n:', webhookUrl)
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error('❌ [transcribe-email-document] Webhook error:', errorText)
      
      // Update document status to error
      await supabaseClient
        .from('email_knowledge_documents')
        .update({ 
          transcription_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', document_id)
      
      throw new Error(`Webhook failed: ${webhookResponse.status} - ${errorText}`)
    }

    const webhookResult = await webhookResponse.json()
    console.log('✅ [transcribe-email-document] Webhook response:', webhookResult)

    // Processar resposta do n8n e salvar transcrição
    console.log('🔍 [transcribe-email-document] Processing webhook result:', JSON.stringify(webhookResult, null, 2));
    
    if (webhookResult && (webhookResult.transcription || webhookResult.description || webhookResult.courses)) {
      let transcription = '';
      
      // Extrair transcrição da resposta
      if (webhookResult.transcription) {
        transcription = webhookResult.transcription;
      } else if (webhookResult.description) {
        transcription = webhookResult.description;
      } else if (webhookResult.courses && Array.isArray(webhookResult.courses)) {
        transcription = webhookResult.courses.join('\n');
      }

      console.log('📝 [transcribe-email-document] Extracted transcription length:', transcription.length);

      // Salvar transcrição na tabela
      const { error: updateError } = await supabaseClient
        .from('email_knowledge_documents')
        .update({
          transcription: transcription,
          transcription_status: 'completed',
          transcription_processed_at: new Date().toISOString()
        })
        .eq('id', document_id);

      if (updateError) {
        console.error('❌ [transcribe-email-document] Error updating transcription:', updateError);
      } else {
        console.log('✅ [transcribe-email-document] Transcription saved successfully');
      }
    } else {
      console.log('⚠️ [transcribe-email-document] No transcription data found in webhook result');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transcription webhook sent successfully',
        document_id,
        webhook_result: webhookResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ [transcribe-email-document] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
