import React from 'react';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';

interface DocumentViewerModalProps {
  documentUrl: string;
  onClose: () => void;
  fileName?: string;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ documentUrl, onClose, fileName }) => {
  console.log('🔍 [MODAL] DocumentViewerModal rendered with URL:', documentUrl);
  console.log('🔍 [MODAL] documentUrl prop:', documentUrl);
  console.log('🔍 [MODAL] onClose prop:', onClose);
  console.log('🔍 [MODAL] fileName prop:', fileName);

  const [loading, setLoading] = React.useState(true);
  const [actualUrl, setActualUrl] = React.useState<string>(documentUrl);
  const [error, setError] = React.useState<string | null>(null);
  const [documentType, setDocumentType] = React.useState<'pdf' | 'image' | 'unknown'>('unknown');
  const [displayTitle, setDisplayTitle] = React.useState<string>(fileName || 'Document');

  // Detectar tipo de documento baseado na URL ou nome do arquivo
  const detectDocumentType = (url: string, name?: string): 'pdf' | 'image' | 'unknown' => {
    const fullName = name || url;
    const lowerName = fullName.toLowerCase();

    // ✅ CORREÇÃO: Extrair extensão da URL mesmo com parâmetros de query
    const extractFileExtension = (url: string): string | null => {
      try {
        // Remover parâmetros de query (tudo após ?)
        const urlWithoutQuery = url.split('?')[0];
        // Extrair nome do arquivo
        const fileName = urlWithoutQuery.split('/').pop() || '';
        // Extrair extensão
        const extension = fileName.split('.').pop() || '';
        return extension.toLowerCase();
      } catch (e) {
        return null;
      }
    };

    // Extrair extensão da URL
    const fileExtension = extractFileExtension(url);

    // Verificar extensões de PDF
    if (fileExtension === 'pdf' || lowerName.includes('.pdf') || lowerName.endsWith('pdf')) {
      return 'pdf';
    }

    // Verificar extensões de imagem
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif'];
    if (fileExtension && imageExtensions.includes(fileExtension)) {
      return 'image';
    }

    // Fallback: verificar se contém extensões na URL
    if (lowerName.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) {
      return 'image';
    }

    // Fallback: verificar palavra-chave
    if (lowerName.includes('image') || lowerName.includes('photo') || lowerName.includes('captura') || lowerName.includes('wordmark')) {
      return 'image';
    }

    return 'unknown';
  };

  // Efeito para tentar carregar a URL e fallback para signed URL se necessário
  React.useEffect(() => {
    const testUrl = async () => {
      setLoading(true);
      setError(null);

      // Buckets candidatos para tentar acessar o arquivo
      // 1. student-documents (padrão)
      // 2. document-attachments (transfer forms)
      // 3. term-acceptances (possível local para termos)
      // 4. legal-documents (fallback)
      const candidateBuckets = ['student-documents', 'document-attachments', 'term-acceptances', 'legal-documents', 'public'];
      let path = documentUrl;

      // Tentar extrair um nome de arquivo amigável da URL se fileName for genérico
      const getFriendlyName = (url: string) => {
        try {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1].split('?')[0];
          return lastPart.replace(/^\d+_/, '').replace(/%20/g, ' ');
        } catch (e) {
          return 'Document';
        }
      };

      if (!documentUrl) {
        setLoading(false);
        return;
      }

      // Se for URL completa, usar lógica existente para extrair bucket
      if (documentUrl.startsWith('http')) {
        if (documentUrl.includes('/storage/v1/object/public/')) {
          // ✅ MELHORIA: Verificar se a URL pertence a OUTRO projeto Supabase
          // Se o domínio da URL for diferente do domínio do cliente local, usamos a URL direta
          const currentDomain = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;
          const urlDomain = new URL(documentUrl).hostname;
          
          if (currentDomain !== urlDomain) {
            console.log('🌐 [MODAL] Detectada URL de sistema externo (Migma). Usando URL direta.');
            setActualUrl(documentUrl);
            setDocumentType(detectDocumentType(documentUrl, fileName));
            setLoading(false);
            return;
          }

          const parts = documentUrl.split('/storage/v1/object/public/');
          if (parts.length > 1) {
            const pathParts = parts[1].split('/');
            if (pathParts.length > 1) {
              const extractedBucket = pathParts[0];
              const extractedPath = pathParts.slice(1).join('/');
              // Sobrepor buckets candidatos com o extraído (tentar ele primeiro)
              candidateBuckets.unshift(extractedBucket);
              path = extractedPath;
            }
          }
        } else if (documentUrl.includes('/storage/v1/object/sign/')) {
          setActualUrl(documentUrl);
          setDocumentType(detectDocumentType(documentUrl, fileName));
          setLoading(false);
          return;
        }
      } else {
        // Se for path relativo, ajustar path se necessário
        if (documentUrl.includes('transfer-forms')) {
          candidateBuckets.unshift('document-attachments');
        }
      }

      // Definir título
      if (!fileName || fileName === 'Document' || fileName === 'document.pdf') {
        const title = getFriendlyName(documentUrl);
        setDisplayTitle(title);
      } else {
        setDisplayTitle(fileName);
      }

      // Tentar gerar URL assinada e validar com HEAD request
      for (const bucket of candidateBuckets) {
        try {
          // Lógica especial para 'public' bucket (não precisa de assinatura)
          if (bucket === 'public') {
            const { data: publicData } = supabase.storage
              .from(bucket)
              .getPublicUrl(path);

            if (publicData?.publicUrl) {
              // Verificar se URL pública é válida
              try {
                const response = await fetch(publicData.publicUrl, { method: 'HEAD' });
                if (response.ok) {
                  console.log(`✅ [MODAL] Arquivo encontrado no bucket '${bucket}':`, publicData.publicUrl);
                  setActualUrl(publicData.publicUrl);
                  setDocumentType(detectDocumentType(path, fileName));
                  setLoading(false);
                  return;
                }
              } catch (e) {
                console.warn(`⚠️ [MODAL] Falha ao verificar URL pública no bucket '${bucket}'`, e);
              }
            }
            continue;
          }

          // Para buckets privados, gerar signed URL
          console.log(`🔄 [MODAL] Tentando bucket: '${bucket}' para path: '${path}'`);
          const { data: signedData, error: signedError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600);

          if (signedError) {
            console.warn(`⚠️ [MODAL] Erro ao gerar URL assinada para bucket '${bucket}':`, signedError.message);
            continue;
          }

          if (signedData?.signedUrl) {
            // Verificar se a URL assinada é acessível (HEAD request)
            try {
              // Adicionar timestamp para evitar cache
              const urlCheck = `${signedData.signedUrl}&t=${Date.now()}`;
              const response = await fetch(urlCheck, { method: 'HEAD' });

              if (response.ok) {
                console.log(`✅ [MODAL] Arquivo encontrado e validado no bucket '${bucket}'`);
                setActualUrl(signedData.signedUrl); // Usar URL original sem timestamp extra
                setDocumentType(detectDocumentType(path, fileName));
                setLoading(false);
                return; // Sucesso! Sair do loop
              } else {
                console.warn(`⚠️ [MODAL] URL assinada gerada mas retornou ${response.status} para bucket '${bucket}'`);
              }
            } catch (networkError) {
              console.warn(`⚠️ [MODAL] Erro de rede ao validar URL no bucket '${bucket}'`, networkError);
              // Em caso de erro de rede (CORS etc), ainda pode ser válido tentar usar a URL se for o único sucesso
              // Mas aqui vamos continuar tentando outros buckets
            }
          }
        } catch (err) {
          console.warn(`⚠️ [MODAL] Exceção ao tentar bucket '${bucket}'`, err);
        }
      }

      // Se chegou aqui, nenhum bucket funcionou
      console.error('❌ [MODAL] Falha em todos os buckets candidatos:', candidateBuckets);
      setError('Não foi possível localizar o arquivo em nenhum dos locais de armazenamento esperados.');
      setLoading(false);
    };

    if (documentUrl) {
      testUrl();
    }
  }, [documentUrl, fileName]);

  // Esconder botões flutuantes quando modal está ativo
  React.useEffect(() => {
    // Pequeno delay para garantir que o modal está totalmente renderizado
    const timer = setTimeout(() => {
      // Esconder todos os botões flutuantes possíveis
      const selectors = [
        '.floating-whatsapp-button',
        '.floating-whatsapp-area',
        '.floating-cart-button',
        '.floating-cart-area',
        '[class*="smart-chat"]',
        '[title*="Smart Assistant"]',
        '[title*="Help & Support"]',
        '[data-testid="cart-icon"]',
        'div[style*="position: fixed"][style*="bottom"]',
        'div[style*="position: fixed"][style*="right"]'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          (element as HTMLElement).style.setProperty('display', 'none', 'important');
        });
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      // Restaurar botões quando modal fecha
      const selectors = [
        '.floating-whatsapp-button',
        '.floating-whatsapp-area',
        '.floating-cart-button',
        '.floating-cart-area',
        '[class*="smart-chat"]',
        '[title*="Smart Assistant"]',
        '[title*="Help & Support"]',
        '[data-testid="cart-icon"]',
        'div[style*="position: fixed"][style*="bottom"]',
        'div[style*="position: fixed"][style*="right"]'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          (element as HTMLElement).style.removeProperty('display');
        });
      });
    };
  }, []);

  const handleDownload = async () => {
    try {
      const response = await fetch(actualUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      // ✅ CORREÇÃO: Limpar o nome do download para remover tokens e parâmetros
      let downloadName = fileName || documentUrl.split('/').pop()?.split('?')[0] || 'document';

      // Se não tiver extensão, tentar deduzir do tipo detectado
      if (!downloadName.includes('.')) {
        const ext = documentType === 'pdf' ? 'pdf' : (documentType === 'image' ? 'png' : '');
        if (ext) downloadName = `${downloadName}.${ext}`;
      }

      // Limpar caracteres estranhos
      downloadName = downloadName.replace(/[/\\?%*:|"<>]/g, '_');

      a.download = downloadName;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Failed to download document:', error);
      // Fallback: Tentar limpar a URL mesmo no window.open se possível
      window.open(actualUrl, '_blank');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px] min-w-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="ml-3 text-gray-600">Loading document...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[400px] min-w-[400px] flex-col">
          <div className="text-red-500 text-lg mb-4">⚠️ Erro ao carregar</div>
          <div className="text-gray-600 text-center mb-4 max-w-md px-4">
            Não foi possível visualizar este documento. Por favor, entre em contato com o suporte.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      );
    }

    // Para PDFs, usa iframe
    if (documentType === 'pdf') {
      return (
        <div className="w-full h-full min-h-[600px]">
          <iframe
            src={actualUrl}
            className="w-full h-full border-0 rounded"
            title="PDF Document"
            onError={() => {
              setError('Erro ao carregar PDF. Tente fazer o download para visualizar.');
            }}
          />
        </div>
      );
    }

    // Para imagens, usa img tag
    if (documentType === 'image') {
      return (
        <img
          src={actualUrl}
          alt="Document preview"
          className="object-contain w-full h-full max-h-[80vh]"
          onLoad={() => {
            // Imagem carregada com sucesso
          }}
          onError={() => {
            setError('Erro ao carregar imagem. Tente fazer o download.');
          }}
        />
      );
    }

    // Para tipos desconhecidos, oferece apenas download
    return (
      <div className="flex items-center justify-center min-h-[400px] min-w-[400px] flex-col">
        <div className="text-gray-700 text-lg mb-4">📄 Document available</div>
        <div className="text-gray-600 text-center mb-4">
          This document type cannot be viewed in the browser.
          <br />
          Click "Download" to download and open in an appropriate application.
        </div>
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Download Document
        </button>
      </div>
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center transition-opacity document-viewer-overlay"
      onClick={onClose}
      style={{
        zIndex: 9999999,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        position: 'fixed'
      }}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl w-[98vw] h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com título e botões */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {displayTitle}
          </h3>
          <div className="flex gap-2">
            {!error && !loading && (
              <button
                onClick={handleDownload}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                title="Download"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Fechar
            </button>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );

  // Usar Portal para renderizar o modal diretamente no body
  console.log('🔍 [MODAL] Creating portal with content');
  return createPortal(modalContent, document.body);
};

export default DocumentViewerModal;
