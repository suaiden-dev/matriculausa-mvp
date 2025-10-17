import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MergeRequest {
  user_id: string;
  file_paths: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    
    const { user_id, file_paths }: MergeRequest = await req.json();

    // Validar dados obrigatórios
    if (!user_id || !file_paths || !Array.isArray(file_paths) || file_paths.length === 0) {
      throw new Error('Missing required fields: user_id, file_paths');
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

    // Verificar se o user_id corresponde ao usuário autenticado
    if (user.id !== user_id) {
      throw new Error('User ID mismatch');
    }

    // Se há apenas um arquivo, retornar o mesmo caminho
    if (file_paths.length === 1) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          merged_file_path: file_paths[0],
          message: 'Single file, no merge needed'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Baixar todos os arquivos PDF
    const pdfBuffers: Uint8Array[] = [];
    
    for (const filePath of file_paths) {
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('student-documents')
        .download(filePath);
      
      if (downloadError) {
        throw new Error(`Failed to download file: ${filePath}`);
      }
      
      const arrayBuffer = await fileData.arrayBuffer();
      pdfBuffers.push(new Uint8Array(arrayBuffer));
    }

    // Usar pdf-lib para fazer o merge (mais confiável no Deno)
    const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');
    
    const mergedPdf = await PDFDocument.create();
    
    for (let i = 0; i < pdfBuffers.length; i++) {
      try {
        
        const pdf = await PDFDocument.load(pdfBuffers[i]);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
        
      } catch (pdfError) {
        throw new Error(`Failed to process PDF file ${i + 1}: ${pdfError.message}`);
      }
    }

    // Salvar o PDF mesclado
    const mergedPdfBytes = await mergedPdf.save();
    // Validar tamanho máximo de 10MB
    const maxMergedSize = 10 * 1024 * 1024; // 10MB
    if (mergedPdfBytes.byteLength > maxMergedSize) {
      throw new Error(`Merged PDF exceeds 10MB limit (${(mergedPdfBytes.byteLength / (1024*1024)).toFixed(2)}MB)`);
    }
    const timestamp = Date.now();
    const mergedFileName = `${user_id}/funds_proof_merged_${timestamp}.pdf`;
    
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-documents')
      .upload(mergedFileName, mergedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload merged PDF: ${uploadError.message}`);
    }


    // Opcional: Deletar os arquivos originais para economizar espaço
    try {
      const { error: deleteError } = await supabase.storage
        .from('student-documents')
        .remove(file_paths);
      
      if (deleteError) {
        // Não falhar a operação por causa disso
      } else {
      }
    } catch (deleteError) {
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        merged_file_path: uploadData.path,
        original_files_count: file_paths.length,
        message: 'PDFs merged successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    
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
