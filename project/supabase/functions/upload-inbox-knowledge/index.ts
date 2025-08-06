import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  university_id: string;
  document_name: string;
  file_content: string; // base64
  mime_type: string;
}

interface KnowledgeDocument {
  id: string;
  university_id: string;
  document_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  transcription_status: string;
  uploaded_by_user_id: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📤 upload-inbox-knowledge: ===== FUNCTION CALLED =====');
    
    const { university_id, document_name, file_content, mime_type }: UploadRequest = await req.json();
    
    console.log('📤 Upload request received:', {
      university_id,
      document_name,
      mime_type,
      file_size: file_content.length
    });

    // Validar dados obrigatórios
    if (!university_id || !document_name || !file_content || !mime_type) {
      throw new Error('Missing required fields: university_id, document_name, file_content, mime_type');
    }

    // Validar tipos de arquivo permitidos
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(mime_type)) {
      throw new Error(`File type not allowed: ${mime_type}`);
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se o usuário está autenticado
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('✅ User authenticated:', user.id);

    // Verificar se o usuário pertence à universidade
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('university_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    if (userProfile.university_id !== university_id) {
      throw new Error('User does not belong to this university');
    }

    console.log('✅ User belongs to university:', university_id);

    // Sanitizar nome do arquivo
    const sanitizedFileName = document_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Gerar caminho do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `inbox-knowledge/${university_id}/${timestamp}_${sanitizedFileName}`;

    console.log('📁 File path:', filePath);

    // Converter base64 para buffer
    const fileBuffer = Uint8Array.from(atob(file_content), c => c.charCodeAt(0));

    // Upload para storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('inbox-knowledge')
      .upload(filePath, fileBuffer, { 
        upsert: true,
        contentType: mime_type,
        cacheControl: '3600'
      });

    if (storageError) {
      console.error('❌ Storage error:', storageError);
      throw new Error(`Failed to upload file: ${storageError.message}`);
    }

    if (!storageData?.path) {
      throw new Error('Failed to upload file to storage');
    }

    console.log('✅ File uploaded to storage:', storageData.path);

    // Obter URL pública do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from('inbox-knowledge')
      .getPublicUrl(storageData.path);

    // Inserir no banco de dados
    const { data: docData, error: dbError } = await supabase
      .from('inbox_knowledge_documents')
             .insert({
         university_id,
         document_name: document_name,
         file_url: publicUrl,
         file_size: fileBuffer.length,
         mime_type,
         transcription_status: 'completed',
         uploaded_by_user_id: user.id
       })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error(`Failed to save document: ${dbError.message}`);
    }

    console.log('✅ Document saved to database:', docData.id);

    // Enviar para processamento
    try {
      console.log('🔄 Sending document for processing:', {
        document_id: docData.id,
        university_id,
        file_url: storageData.path
      });

      const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-inbox-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          document_id: docData.id,
          university_id,
          file_url: storageData.path
        }),
      });

      const processResult = await processResponse.json();
      console.log('📊 Process response:', processResult);

      if (processResponse.ok && processResult.success) {
        console.log('✅ Document processed successfully');
      } else {
        console.warn('⚠️ Failed to process document:', processResult.error || 'Unknown error');
      }
    } catch (processError) {
      console.warn('⚠️ Error sending document for processing:', processError);
      // Não falhar o upload se o processamento falhar
    }

    const response: KnowledgeDocument = {
      id: docData.id,
      university_id: docData.university_id,
      document_name: docData.document_name,
      file_url: docData.file_url,
      file_size: docData.file_size,
      mime_type: docData.mime_type,
      transcription_status: docData.transcription_status,
      uploaded_by_user_id: docData.uploaded_by_user_id,
      created_at: docData.created_at
    };

    console.log('✅ Upload completed successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      document: response 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Error in upload-inbox-knowledge:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}); 