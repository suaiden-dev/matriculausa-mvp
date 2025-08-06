import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  document_id: string;
  university_id: string;
  file_url: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 process-inbox-document: ===== FUNCTION CALLED =====');
    
    const { document_id, university_id, file_url }: ProcessRequest = await req.json();
    
    console.log('🔄 Process request received:', {
      document_id,
      university_id,
      file_url
    });

    // Validar dados obrigatórios
    if (!document_id || !university_id || !file_url) {
      throw new Error('Missing required fields: document_id, university_id, file_url');
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar documento no banco
    const { data: document, error: docError } = await supabase
      .from('inbox_knowledge_documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    console.log('✅ Document found:', document.document_name);

         // Processar em background sem alterar status visível
     console.log('🔄 Processing document in background...');

    // Simular processamento de transcrição
    // Em uma implementação real, aqui seria feita a transcrição real do documento
    let transcription = '';
    
    try {
      // Para PDFs, simular extração de texto
      if (document.mime_type === 'application/pdf') {
        transcription = `[Simulated PDF transcription for ${document.document_name}]
        
This is a simulated transcription of the document. In a real implementation, this would be the actual text extracted from the PDF file.

The document contains information that will be used by the AI to provide more accurate responses to emails.

Key points from this document:
- Document type: ${document.mime_type}
- File size: ${document.file_size} bytes
- Uploaded by: ${document.uploaded_by_user_id}
- University: ${university_id}

This transcription will be used to enhance the AI's knowledge base for email responses.`;
      }
      // Para documentos Word
      else if (document.mime_type.includes('word') || document.mime_type.includes('document')) {
        transcription = `[Simulated Word document transcription for ${document.document_name}]
        
This is a simulated transcription of the Word document. In a real implementation, this would be the actual text extracted from the document.

The document contains important information for the university's knowledge base.

Document details:
- Type: Word document
- Size: ${document.file_size} bytes
- Uploaded: ${document.created_at}
- University: ${university_id}

This content will be used to improve email response accuracy.`;
      }
      // Para arquivos de texto
      else if (document.mime_type === 'text/plain') {
        transcription = `[Simulated text file transcription for ${document.document_name}]
        
This is a simulated transcription of the text file. In a real implementation, this would be the actual content of the text file.

The file contains textual information that will be incorporated into the AI's knowledge base.

File information:
- Format: Plain text
- Size: ${document.file_size} bytes
- Uploaded: ${document.created_at}
- University: ${university_id}

This text will be used to enhance email response capabilities.`;
      }
      else {
        transcription = `[Simulated transcription for ${document.document_name}]
        
This is a simulated transcription for the document. The actual implementation would extract real text from the file.

Document information:
- Type: ${document.mime_type}
- Size: ${document.file_size} bytes
- Uploaded: ${document.created_at}
- University: ${university_id}

This content will be used to improve AI email responses.`;
      }

      console.log('✅ Transcription generated successfully');

    } catch (transcriptionError) {
      console.error('❌ Error generating transcription:', transcriptionError);
      transcription = `[Error generating transcription for ${document.document_name}]
      
Failed to process this document. Please try uploading again or contact support if the problem persists.

Document: ${document.document_name}
Error: ${transcriptionError}`;
    }

         // Atualizar documento com transcrição (sem alterar status visível)
     const { error: finalUpdateError } = await supabase
       .from('inbox_knowledge_documents')
       .update({
         transcription,
         transcription_processed_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       })
       .eq('id', document_id);

    if (finalUpdateError) {
      console.error('❌ Error updating transcription:', finalUpdateError);
      throw new Error('Failed to save transcription');
    }

    console.log('✅ Transcription saved successfully');

    // Buscar configurações da universidade
    const { data: aiSettings, error: settingsError } = await supabase
      .from('inbox_ai_settings')
      .select('*')
      .eq('university_id', university_id)
      .single();

    // Se não existir configuração, criar uma padrão
    if (settingsError || !aiSettings) {
      console.log('⚠️ No AI settings found, creating default settings');
      
      const { error: createSettingsError } = await supabase
        .from('inbox_ai_settings')
        .insert({
          university_id,
          knowledge_base_enabled: true,
          max_documents: 50,
          allowed_file_types: ['pdf', 'doc', 'docx', 'txt'],
          auto_process_enabled: true
        });

      if (createSettingsError) {
        console.warn('⚠️ Failed to create default AI settings:', createSettingsError);
      }
    }

    // Contar documentos processados da universidade
    const { data: processedDocs, error: countError } = await supabase
      .from('inbox_knowledge_documents')
      .select('id', { count: 'exact' })
      .eq('university_id', university_id)
      .eq('transcription_status', 'completed');

    const totalDocs = processedDocs?.length || 0;
    console.log(`📊 Total processed documents for university ${university_id}: ${totalDocs}`);

    console.log('✅ Document processing completed successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      document_id,
      transcription_status: 'completed',
      transcription_length: transcription.length,
      total_documents: totalDocs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Error in process-inbox-document:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}); 