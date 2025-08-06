import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Remove um documento específico da base de conhecimento por ID
 */
function removeDocumentFromPrompt(prompt: string, documentId: string): string {
  const regex = new RegExp(`<knowledge-base id="doc_${documentId}">[\\s\\S]*?<\\/knowledge-base>\\s*`, 'g');
  return prompt.replace(regex, '');
}

/**
 * Remove documento da base de conhecimento e atualiza o prompt
 */
async function removeDocumentFromKnowledge(supabase: any, aiConfigId: string, documentId: string): Promise<boolean> {
  try {
    // 1. Buscar configuração de AI
    const { data: config, error: configError } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('id', aiConfigId)
      .single();

    if (configError || !config) {
      console.error('Erro ao buscar configuração de AI:', configError);
      return false;
    }

    // 2. Remover documento do prompt
    const updatedPrompt = removeDocumentFromPrompt(config.final_prompt || '', documentId);

    // 3. Atualizar configuração de AI
    const { error: updateError } = await supabase
      .from('ai_configurations')
      .update({ 
        final_prompt: updatedPrompt,
        updated_at: new Date().toISOString()
      })
      .eq('id', aiConfigId);

    if (updateError) {
      console.error('Erro ao atualizar prompt:', updateError);
      return false;
    }

    console.log('✅ Documento removido da base de conhecimento:', documentId);
    return true;
  } catch (error) {
    console.error('Erro ao remover documento da base de conhecimento:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { ai_configuration_id, document_id } = await req.json()

    if (!ai_configuration_id || !document_id) {
      return new Response(
        JSON.stringify({ error: 'ai_configuration_id and document_id are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔄 Removendo documento da base de conhecimento:', { ai_configuration_id, document_id })

    // Remover documento da base de conhecimento
    const success = await removeDocumentFromKnowledge(supabase, ai_configuration_id, document_id)

    if (success) {
      console.log('✅ Documento removido com sucesso')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Documento removido com sucesso',
          ai_configuration_id,
          document_id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.error('❌ Falha ao remover documento')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha ao remover documento',
          ai_configuration_id,
          document_id
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ Erro na edge function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 