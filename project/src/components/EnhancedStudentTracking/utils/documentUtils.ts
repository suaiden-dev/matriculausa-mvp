import { supabase } from '../../../lib/supabase';

export const handleViewDocument = async (doc: any) => {
  console.log('=== DEBUG handleViewDocument ===');
  
  // ✅ Aceitar tanto file_url quanto url (fallback)
  const fileUrl: string | undefined = doc?.file_url || doc?.url;
  let bucket: string = doc?.bucket_id || 'student-documents'; // Padrão

  if (!doc || !fileUrl) {
    console.log('Documento ou file_url/url está vazio ou undefined');
    return;
  }
  
  // Se for uma URL completa externa (não Supabase) ou já for um link assinado/temporário, abrir diretamente
  if (fileUrl.startsWith('http')) {
    const isSupabasePublic = fileUrl.includes('/storage/v1/object/public/');
    const isSupabaseSigned = fileUrl.includes('/storage/v1/object/sign/') || fileUrl.includes('token=');
    
    if (!isSupabasePublic || isSupabaseSigned) {
      console.log('🔍 [UTILS] URL já é externa ou assinada. Abrindo diretamente.');
      window.open(fileUrl, '_blank');
      return;
    }
  }

  // Extrair o bucket e o path se for uma URL completa do Supabase (Pública)
  let path = fileUrl;
  if (fileUrl.includes('/storage/v1/object/public/')) {
    const parts = fileUrl.split('/storage/v1/object/public/');
    if (parts.length > 1) {
      const pathParts = parts[1].split('/');
      if (pathParts.length > 1) {
        bucket = pathParts[0]; 
        path = pathParts.slice(1).join('/'); 
      }
    }
  }
  
  // Se o path contém 'transfer-forms' ou começa com 'uploads/', deve usar o bucket 'document-attachments'
  if (path.includes('transfer-forms') || path.startsWith('uploads/')) {
    bucket = 'document-attachments';
  }

  try {
    // ✅ SOLUÇÃO DEFINITIVA E SEGURA: Usar Signed URL oficial do Supabase
    // Isso evita problemas de Proxy 404, Blobs e CORS
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (signedError) {
      console.error('🔍 [UTILS] Erro Supabase:', signedError);
      throw new Error(`Erro ao acessar arquivo: ${signedError.message}`);
    }

    if (signedData?.signedUrl) {
      console.log('🔍 [UTILS] URL Assinada gerada com sucesso. Abrindo em nova aba...');
      window.open(signedData.signedUrl, '_blank');
    } else {
      throw new Error('Não foi possível gerar o link de acesso seguro.');
    }
  } catch (err: any) {
    console.error('🔍 [UTILS] Erro ao abrir documento:', err);
    alert('Erro ao carregar o documento com segurança. Verifique se você está logado.');
  }
};

export const handleDownloadDocument = async (doc: any) => {
  // ✅ Aceitar tanto file_url quanto url (fallback)
  const fileUrl: string | undefined = doc?.file_url || doc?.url;
  let bucket: string = doc?.bucket_id || 'student-documents';

  if (!fileUrl) return;
  
  try {
    console.log('=== DEBUG handleDownloadDocument ===');
    
    // Extrair o path se for uma URL completa do Supabase
    let path = fileUrl;
    if (fileUrl.startsWith('http')) {
      const isSupabasePublic = fileUrl.includes('/storage/v1/object/public/');
      const isSupabaseSigned = fileUrl.includes('/storage/v1/object/sign/') || fileUrl.includes('token=');

      if (!isSupabasePublic || isSupabaseSigned) {
        // Se for externo ou já assinado, baixar direto
        console.log('🔍 [UTILS] URL já é externa ou assinada para download. Baixando diretamente.');
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = doc.filename || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (isSupabasePublic) {
        const parts = fileUrl.split('/storage/v1/object/public/');
        if (parts.length > 1) {
          const pathParts = parts[1].split('/');
          bucket = pathParts[0];
          path = pathParts.slice(1).join('/');
        }
      }
    }

    // Se o path contém 'transfer-forms' ou começa com 'uploads/', deve usar o bucket 'document-attachments'
    if (path.includes('transfer-forms') || path.startsWith('uploads/')) {
      bucket = 'document-attachments';
    }

    // ✅ SOLUÇÃO DEFINITIVA E SEGURA: Usar Signed URL com download forçado
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600, {
        download: doc.filename || `${doc.type || 'document'}.pdf`
      });

    if (signedError) {
      console.error('🔍 [UTILS] Erro Supabase no Download:', signedError);
      throw new Error(`Erro ao acessar arquivo para download: ${signedError.message}`);
    }

    if (signedData?.signedUrl) {
      console.log('🔍 [UTILS] URL de Download gerada com sucesso');
      const link = document.createElement('a');
      link.href = signedData.signedUrl;
      link.download = doc.filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      throw new Error('Não foi possível gerar o link de download seguro.');
    }
  } catch (err: any) {
    console.error('Erro no download:', err);
    alert(`Failed to download document: ${err.message}`);
  }
};
