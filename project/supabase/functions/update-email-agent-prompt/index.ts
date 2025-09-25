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

    const { agent_id } = await req.json()

    console.log('🔄 [update-email-agent-prompt] Updating prompt for agent:', agent_id)

    // Get agent configuration
    const { data: agent, error: agentError } = await supabaseClient
      .from('ai_configurations')
      .select('*')
      .eq('id', agent_id)
      .eq('agent_type', 'email')
      .single()

    if (agentError) {
      console.error('❌ [update-email-agent-prompt] Error fetching agent:', agentError)
      throw agentError
    }

    if (!agent) {
      throw new Error('Email agent not found')
    }

    // Get completed knowledge documents for this agent
    const { data: knowledgeDocs, error: docsError } = await supabaseClient
      .from('email_knowledge_documents')
      .select('transcription, document_name')
      .eq('agent_id', agent_id)
      .eq('transcription_status', 'completed')
      .not('transcription', 'is', null)

    if (docsError) {
      console.error('❌ [update-email-agent-prompt] Error fetching knowledge documents:', docsError)
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
    const basePrompt = agent.custom_prompt || `You are a helpful email assistant for university admissions. Use the knowledge base to answer questions about admissions, scholarships, and university processes.`;

    const updatedPrompt = `${basePrompt}

<knowledge-base>
${knowledgeBaseContent}
</knowledge-base>

IMPORTANT: Use the information from the knowledge base above to answer student questions. If the information is not in the knowledge base, respond generally and suggest that the student contact the university directly for specific information.`

    // Update the prompt in ai_configurations
    const { error: updateError } = await supabaseClient
      .from('ai_configurations')
      .update({
        final_prompt: updatedPrompt,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent_id)

    if (updateError) {
      console.error('❌ [update-email-agent-prompt] Error updating prompt:', updateError)
      throw updateError
    }

    console.log('✅ [update-email-agent-prompt] Prompt updated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email agent prompt updated with knowledge base',
        agent_id,
        documents_count: knowledgeDocs?.length || 0,
        prompt_length: updatedPrompt.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ [update-email-agent-prompt] Error:', error)
    
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
