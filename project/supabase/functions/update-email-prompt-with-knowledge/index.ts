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

    const { university_id } = await req.json()

    console.log('🔄 [update-email-prompt-with-knowledge] Updating prompt for university:', university_id)

    // Get university AI settings
    const { data: aiSettings, error: settingsError } = await supabaseClient
      .from('university_ai_settings')
      .select('*')
      .eq('university_id', university_id)
      .single()

    if (settingsError) {
      console.error('❌ [update-email-prompt-with-knowledge] Error fetching AI settings:', settingsError)
      throw settingsError
    }

    if (!aiSettings) {
      throw new Error('University AI settings not found')
    }

    // Get completed knowledge documents
    const { data: knowledgeDocs, error: docsError } = await supabaseClient
      .from('email_knowledge_documents')
      .select('transcription, document_name')
      .eq('university_id', university_id)
      .eq('transcription_status', 'completed')
      .not('transcription', 'is', null)

    if (docsError) {
      console.error('❌ [update-email-prompt-with-knowledge] Error fetching knowledge documents:', docsError)
      throw docsError
    }

    // Generate knowledge base content
    let knowledgeBaseContent = ''
    if (knowledgeDocs && knowledgeDocs.length > 0) {
      knowledgeBaseContent = knowledgeDocs
        .map(doc => `## ${doc.document_name}\n\n${doc.transcription}`)
        .join('\n\n---\n\n')
    }

    // Generate updated prompt with knowledge base
    const basePrompt = aiSettings.custom_instructions || 'Você é um assistente de admissões virtual, amigável e eficiente, trabalhando para esta universidade. Sua comunicação deve ser clara, profissional e encorajadora. Você representa a plataforma Matrícula USA.';

    const updatedPrompt = `${basePrompt}

<knowledge-base>
${knowledgeBaseContent}
</knowledge-base>

IMPORTANTE: Use as informações da base de conhecimento acima para responder às perguntas dos estudantes. Se a informação não estiver na base de conhecimento, responda de forma geral e sugira que o estudante entre em contato diretamente com a universidade para informações específicas.`

    // Update the prompt in university_ai_settings
    const { error: updateError } = await supabaseClient
      .from('university_ai_settings')
      .update({
        custom_instructions: updatedPrompt,
        updated_at: new Date().toISOString()
      })
      .eq('university_id', university_id)

    if (updateError) {
      console.error('❌ [update-email-prompt-with-knowledge] Error updating prompt:', updateError)
      throw updateError
    }

    console.log('✅ [update-email-prompt-with-knowledge] Prompt updated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email prompt updated with knowledge base',
        university_id,
        documents_count: knowledgeDocs?.length || 0,
        prompt_length: updatedPrompt.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ [update-email-prompt-with-knowledge] Error:', error)
    
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
