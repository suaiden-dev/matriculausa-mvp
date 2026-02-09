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
      
      let bucket = 'student-documents'; // Padrão
      let path = documentUrl;
      
      // Tentar extrair um nome de arquivo amigável da URL se fileName for genérico
      const getFriendlyName = (url: string) => {
        try {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1].split('?')[0];
          // Se o nome começar com timestamp (como os nossos), tentar limpar
          return lastPart.replace(/^\d+_/, '').replace(/%20/g, ' ');
        } catch (e) {
          return 'Document';
        }
      };

      if (!documentUrl) {
        setLoading(false);
        return;
      }

      // 1. Extrair bucket e path se for uma URL completa do Supabase ou caminho relativo
      if (documentUrl.startsWith('http')) {
        if (documentUrl.includes('/storage/v1/object/public/')) {
          const parts = documentUrl.split('/storage/v1/object/public/');
          if (parts.length > 1) {
            const pathParts = parts[1].split('/');
            if (pathParts.length > 1) {
              bucket = pathParts[0];
              path = pathParts.slice(1).join('/');
            }
          }
        } else if (documentUrl.includes('/storage/v1/object/sign/')) {
          setActualUrl(documentUrl);
          setDocumentType(detectDocumentType(documentUrl, fileName));
          setLoading(false);
          return;
        }
      } else {
        // Se for um path relativo, se contém 'transfer-forms', trocar bucket
        if (documentUrl.includes('transfer-forms')) {
          bucket = 'document-attachments';
        }
      }
      
      // Definir o título se for genérico
      if (!fileName || fileName === 'Document' || fileName === 'document.pdf') {
        const title = getFriendlyName(documentUrl);
        setDisplayTitle(title);
      } else {
        setDisplayTitle(fileName);
      }

      // 2. Gerar URL via Proxy (Edge Function)
      // Usamos fetch com header de Autorização para manter a URL limpa e segura
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const functionUrl = `https://fitpynguasqqutuhzifx.functions.supabase.co/document-proxy`;
      const proxyUrl = `${functionUrl}?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
      
      console.log('🔍 [MODAL] Buscando documento via Proxy (Secure Fetch)');
      
      try {
        const response = await fetch(proxyUrl, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          }
        });

        if (!response.ok) {
          if (response.status === 403) throw new Error('Acesso negado. Você não tem permissão para ver este documento.');
          if (response.status === 404) throw new Error('Documento não encontrado no servidor.');
          throw new Error(`Erro ao carregar documento: ${response.statusText}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Limpar URL anterior se existir
        if (actualUrl && actualUrl.startsWith('blob:')) {
          URL.revokeObjectURL(actualUrl);
        }

        setActualUrl(blobUrl);
        setDocumentType(detectDocumentType(documentUrl, fileName));
      } catch (err: any) {
        console.error('🔍 [MODAL] Error fetching document:', err);
        setError(err.message || 'Erro inesperado ao carregar o documento.');
      } finally {
        setLoading(false);
      }
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
      
      // Use filename provided or extract from URL
      const downloadName = fileName || documentUrl.substring(documentUrl.lastIndexOf('/') + 1);
      a.download = downloadName;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Failed to download document:', error);
      // Fallback for browsers that might have issues
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
          <div className="text-red-500 text-lg mb-4">⚠️ Error loading document</div>
          <div className="text-gray-600 text-center mb-4">{error}</div>
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
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center transition-opacity p-4 document-viewer-overlay"
      onClick={onClose}
      style={{ 
        zIndex: 9999999,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        position: 'fixed',
        backgroundColor: 'rgba(0, 0, 0, 0.75)'
      }}
    >
      <div 
        className="relative bg-white rounded-lg shadow-2xl max-w-6xl max-h-[95vh] w-full h-full flex flex-col overflow-hidden"
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
