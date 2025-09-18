import { supabase } from '../../../lib/supabase';

export const handleViewDocument = (doc: any) => {
  
  
  // ✅ Aceitar tanto file_url quanto url (fallback)
  const fileUrl: string | undefined = doc?.file_url || doc?.url;
  if (!doc || !fileUrl) {
    return;
  }
  
  
  
  // ✅ CORREÇÃO: Se já é uma URL completa do Supabase, usar diretamente
  try {
    if (fileUrl && fileUrl.startsWith('https://fitpynguasqqutuhzifx.supabase.co')) {
      window.open(fileUrl, '_blank');
    } else if (fileUrl && !fileUrl.startsWith('http')) {
      // Se file_url é um path do storage, converter para URL pública
      const publicUrl = supabase.storage
        .from('student-documents')
        .getPublicUrl(fileUrl)
        .data.publicUrl;
      
      window.open(publicUrl, '_blank');
    } else {
      // Se já é uma URL completa, usar diretamente
      window.open(fileUrl, '_blank');
    }
  } catch (error) {
    
    // Fallback: tentar usar a URL original
    window.open(fileUrl, '_blank');
  }
};

export const handleDownloadDocument = async (doc: any) => {
  // ✅ Aceitar tanto file_url quanto url (fallback)
  const fileUrl: string | undefined = doc?.file_url || doc?.url;
  if (!fileUrl) return;
  
  try {
    
    
    // ✅ CORREÇÃO: Se já é uma URL completa do Supabase, usar diretamente
    let downloadUrl = fileUrl;
    if (fileUrl && fileUrl.startsWith('https://fitpynguasqqutuhzifx.supabase.co')) {
      
    } else if (fileUrl && !fileUrl.startsWith('http')) {
      // Se file_url é um path do storage, converter para URL pública
      const publicUrl = supabase.storage
        .from('student-documents')
        .getPublicUrl(fileUrl)
        .data.publicUrl;
      downloadUrl = publicUrl;
      
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
    alert(`Failed to download document: ${err.message}`);
  }
};
