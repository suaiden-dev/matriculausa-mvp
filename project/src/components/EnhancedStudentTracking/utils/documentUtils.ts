import { supabase } from '../../../lib/supabase';

export const handleViewDocument = (doc: any) => {
  console.log('=== DEBUG handleViewDocument ===');
  console.log('Documento recebido:', doc);
  
  // ✅ Aceitar tanto file_url quanto url (fallback)
  const fileUrl: string | undefined = doc?.file_url || doc?.url;
  if (!doc || !fileUrl) {
    console.log('Documento ou file_url/url está vazio ou undefined');
    console.log('doc:', doc);
    console.log('doc.file_url:', doc?.file_url);
    console.log('doc.url:', doc?.url);
    return;
  }
  
  console.log('fileUrl resolvido:', fileUrl);
  console.log('Tipo de fileUrl:', typeof fileUrl);
  
  // ✅ CORREÇÃO: Se já é uma URL completa do Supabase, usar diretamente
  try {
    if (fileUrl && fileUrl.startsWith('https://fitpynguasqqutuhzifx.supabase.co')) {
      console.log('Usando URL completa do Supabase:', fileUrl);
      window.open(fileUrl, '_blank');
    } else if (fileUrl && !fileUrl.startsWith('http')) {
      // Se file_url é um path do storage, converter para URL pública
      const publicUrl = supabase.storage
        .from('student-documents')
        .getPublicUrl(fileUrl)
        .data.publicUrl;
      
      console.log('URL pública gerada:', publicUrl);
      window.open(publicUrl, '_blank');
    } else {
      // Se já é uma URL completa, usar diretamente
      console.log('Usando URL existente:', fileUrl);
      window.open(fileUrl, '_blank');
    }
  } catch (error) {
    console.error('Erro ao gerar URL pública:', error);
    // Fallback: tentar usar a URL original
    window.open(fileUrl, '_blank');
  }
};

export const handleDownloadDocument = async (doc: any) => {
  // ✅ Aceitar tanto file_url quanto url (fallback)
  const fileUrl: string | undefined = doc?.file_url || doc?.url;
  if (!fileUrl) return;
  
  try {
    console.log('=== DEBUG handleDownloadDocument ===');
    console.log('Documento para download:', doc);
    console.log('fileUrl resolvido:', fileUrl);
    
    // ✅ CORREÇÃO: Se já é uma URL completa do Supabase, usar diretamente
    let downloadUrl = fileUrl;
    if (fileUrl && fileUrl.startsWith('https://fitpynguasqqutuhzifx.supabase.co')) {
      console.log('Usando URL completa do Supabase para download:', downloadUrl);
    } else if (fileUrl && !fileUrl.startsWith('http')) {
      // Se file_url é um path do storage, converter para URL pública
      const publicUrl = supabase.storage
        .from('student-documents')
        .getPublicUrl(fileUrl)
        .data.publicUrl;
      downloadUrl = publicUrl;
      console.log('URL pública para download:', downloadUrl);
    }
    
    // Fazer download usando a URL pública
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error('Failed to download document: ' + response.statusText);
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // ✅ CORREÇÃO: Usar filename se disponível
    link.download = doc.filename || `${doc.type || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('Erro no download:', err);
    alert(`Failed to download document: ${err.message}`);
  }
};
