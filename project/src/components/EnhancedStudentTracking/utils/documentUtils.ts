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
  
  // Se for uma URL completa externa (não Supabase), abrir diretamente
  if (fileUrl.startsWith('http') && !fileUrl.includes('supabase.co')) {
    window.open(fileUrl, '_blank');
    return;
  }

  // Extrair o bucket e o path se for uma URL completa do Supabase
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

  // Obter token de sessão para autenticação no Proxy
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  if (!token) {
    console.warn('🔍 [UTILS] Alerta: Nenhum token de sessão encontrado!');
  } else {
    console.log(`🔍 [UTILS] Token encontrado: ${token.substring(0, 10)}...`);
  }

  // Gerar URL via Proxy (Edge Function)
  const functionUrl = `https://fitpynguasqqutuhzifx.functions.supabase.co/document-proxy`;
  const proxyUrl = `${functionUrl}?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
  
  console.log('🔍 [UTILS] Buscando documento via Proxy (Secure Fetch)');
  
  const headers = {
    'Authorization': token ? `Bearer ${token}` : '',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
  };
  
  console.log('🔍 [UTILS] Headers sendo enviados:', {
    hasAuth: !!headers.Authorization,
    hasApikey: !!headers.apikey,
    apikeyLength: headers.apikey?.length
  });
  
  try {
    const response = await fetch(proxyUrl, { headers });

    if (!response.ok) {
      throw new Error(`Erro ao buscar documento: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Abrir o Blob URL em uma nova aba
    // Isso é seguro porque Blob URLs não são compartilháveis entre sessões/navegadores
    window.open(blobUrl, '_blank');
  } catch (err: any) {
    console.error('🔍 [UTILS] Error opening document:', err);
    alert('Erro ao carregar o documento com segurança. Verifique se você está logado.');
  }
};

export const handleDownloadDocument = async (doc: any) => {
  // ✅ Aceitar tanto file_url quanto url (fallback)
  const fileUrl: string | undefined = doc?.file_url || doc?.url;
  const bucket: string = doc?.bucket_id || 'student-documents';

  if (!fileUrl) return;
  
  try {
    console.log('=== DEBUG handleDownloadDocument ===');
    
    // Extrair o path se for uma URL completa do Supabase
    let path = fileUrl;
    if (fileUrl.includes('/storage/v1/object/public/')) {
      const parts = fileUrl.split('/storage/v1/object/public/');
      if (parts.length > 1) {
        path = parts[1].split('/').slice(1).join('/');
      }
    } else if (fileUrl.startsWith('http') && !fileUrl.includes('supabase.co')) {
      // Se for externo, baixar direto
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename || 'document';
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Obter token de sessão
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Gerar URL via Proxy
    const functionUrl = `https://fitpynguasqqutuhzifx.functions.supabase.co/document-proxy`;
    const proxyUrl = `${functionUrl}?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
    
    console.log('Iniciando download via Proxy:', proxyUrl);
    
    const response = await fetch(proxyUrl, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download document: ' + response.statusText);
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
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
