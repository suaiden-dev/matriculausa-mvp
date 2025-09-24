import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateRequest {
  university_id: string;
}

interface UniversityKnowledgeDocument {
  id: string;
  university_id: string;
  document_name: string;
  transcription_text: string;
  transcription_status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📤 update-university-knowledge-prompt: Processing request');
    
    const { university_id }: UpdateRequest = await req.json();
    
    console.log('📤 update-university-knowledge-prompt: University ID:', university_id);

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

    // Get completed knowledge documents
    const { data: documents, error: documentsError } = await supabase
      .from('university_knowledge_documents')
      .select('id, document_name, transcription_text, transcription_status')
      .eq('university_id', university_id)
      .eq('transcription_status', 'completed')
      .not('transcription_text', 'is', null);

    if (documentsError) {
      console.error('❌ update-university-knowledge-prompt: Error fetching documents:', documentsError);
      throw new Error(`Failed to fetch documents: ${documentsError.message}`);
    }

    console.log(`📚 update-university-knowledge-prompt: Found ${documents?.length || 0} completed documents`);

    if (!documents || documents.length === 0) {
      console.log('ℹ️ update-university-knowledge-prompt: No completed documents found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No completed documents to process',
          documents_count: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Generate knowledge base prompt
    const knowledgeBasePrompt = generateUniversityKnowledgePrompt(documents, university.name);
    
    console.log('📝 update-university-knowledge-prompt: Generated knowledge base prompt (length:', knowledgeBasePrompt.length, 'chars)');

    // Update university with knowledge base prompt
    const { error: updateError } = await supabase
      .from('universities')
      .update({
        knowledge_base_prompt: knowledgeBasePrompt,
        updated_at: new Date().toISOString()
      })
      .eq('id', university_id);

    if (updateError) {
      console.error('❌ update-university-knowledge-prompt: Error updating university:', updateError);
      throw new Error(`Failed to update university: ${updateError.message}`);
    }

    console.log('✅ update-university-knowledge-prompt: University knowledge base updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'University knowledge base updated successfully',
        documents_count: documents.length,
        prompt_length: knowledgeBasePrompt.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ update-university-knowledge-prompt: Error:', error);
    
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

function generateUniversityKnowledgePrompt(documents: UniversityKnowledgeDocument[], universityName: string): string {
  let prompt = `\n\n## BASE DE CONHECIMENTO DA UNIVERSIDADE: ${universityName.toUpperCase()}\n\n`;
  prompt += `A seguir estão os documentos e informações específicas desta universidade que devem ser utilizados para responder às perguntas dos estudantes:\n\n`;

  documents.forEach((doc, index) => {
    prompt += `<knowledge-base id="doc_${doc.id}">\n`;
    prompt += `Documento: ${doc.document_name}\n`;
    prompt += `Conteúdo: ${doc.transcription_text}\n`;
    prompt += `</knowledge-base>\n\n`;
  });

  prompt += `\n## INSTRUÇÕES DE USO DA BASE DE CONHECIMENTO:\n`;
  prompt += `- Use as informações dos documentos acima para responder perguntas específicas sobre ${universityName}\n`;
  prompt += `- Sempre cite a fonte quando usar informações dos documentos\n`;
  prompt += `- Se não encontrar informação específica nos documentos, informe que não tem essa informação específica\n`;
  prompt += `- Mantenha um tom profissional e acolhedor\n`;
  prompt += `- Priorize informações atualizadas e relevantes\n\n`;

  return prompt;
}
