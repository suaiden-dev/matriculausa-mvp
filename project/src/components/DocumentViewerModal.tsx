import React from 'react';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';

interface DocumentViewerModalProps {
  documentUrl: string;
  onClose: () => void;
  fileName?: string;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ documentUrl, onClose, fileName }) => {
  const [loading, setLoading] = React.useState(true);
  const [actualUrl, setActualUrl] = React.useState<string>(documentUrl);
  const [error, setError] = React.useState<string | null>(null);
  const [documentType, setDocumentType] = React.useState<'pdf' | 'image' | 'unknown'>('unknown');

  // Hide floating elements when modal is open
  React.useEffect(() => {
    // Hide floating elements when modal opens
    document.body.classList.add('modal-open');
    
    // Cleanup function to show floating elements when modal closes
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  // Função para tentar gerar signed URL se a URL pública falhar
  const getSignedUrl = async (originalUrl: string): Promise<string | null> => {
    try {
      // Tentar diferentes buckets
      const buckets = ['document-attachments', 'student-documents', 'zelle_comprovantes'];
      
      for (const bucket of buckets) {
        try {
          const urlParts = originalUrl.split(`/storage/v1/object/public/${bucket}/`);
          if (urlParts.length === 2) {
            const filePath = urlParts[1];
            
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(filePath, 60 * 60); // 1 hora
            
            if (error) {
              continue;
            }
            
            return data.signedUrl;
          }
        } catch (e) {
          continue;
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };

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
    
    // Fallback: verificar palavras-chave
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
      
      // ✅ CORREÇÃO: Garantir que documentUrl seja sempre uma URL completa
      let finalDocumentUrl = documentUrl;
      
      // Se documentUrl é um caminho relativo (não começa com http), converter para URL completa
      if (documentUrl && !documentUrl.startsWith('http')) {
        // Verificar se é um caminho do storage (começa com 'uploads/' ou similar)
        if (documentUrl.includes('/') && !documentUrl.startsWith('http')) {
          // ✅ CORREÇÃO: Tentar primeiro document-attachments (onde são salvos os documentos de new request)
          // depois zelle_comprovantes (para comprovantes Zelle) e student-documents como fallback
          const buckets = ['document-attachments', 'zelle_comprovantes', 'student-documents'];
          
          for (const bucket of buckets) {
            const testUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/${bucket}/${documentUrl}`;
            
            try {
              const response = await fetch(testUrl, { method: 'HEAD' });
              if (response.ok) {
                finalDocumentUrl = testUrl;
                break;
              }
            } catch (e) {
              // Continuar para o próximo bucket
            }
          }
          
          // Se nenhum bucket funcionou, usar document-attachments como padrão
          if (!finalDocumentUrl.startsWith('http')) {
            finalDocumentUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/${documentUrl}`;
          }
        }
      }
      
      // Detectar tipo de documento
      const type = detectDocumentType(finalDocumentUrl, fileName);
      setDocumentType(type);
      
      try {
        // Primeiro tenta carregar a URL original
        const response = await fetch(finalDocumentUrl, { method: 'HEAD' });
        
        if (response.ok) {
          setActualUrl(finalDocumentUrl);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Erro ao testar URL original
      }
      
      // Se a URL original falhou, tentar signed URL
      const signedUrl = await getSignedUrl(finalDocumentUrl);
      if (signedUrl) {
        setActualUrl(signedUrl);
        setLoading(false);
      } else {
        setError('Failed to load document');
        setLoading(false);
      }
    };
    
    if (documentUrl) {
      testUrl();
    }
  }, [documentUrl, fileName]);

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
          <div className="ml-3 text-gray-600">Carregando documento...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[400px] min-w-[400px] flex-col">
          <div className="text-red-500 text-lg mb-4">⚠️ Erro ao carregar documento</div>
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
        <div className="text-gray-700 text-lg mb-4">📄 Documento disponível</div>
        <div className="text-gray-600 text-center mb-4">
          Este tipo de documento não pode ser visualizado no navegador.
          <br />
          Clique em "Download" para baixar e abrir em um aplicativo apropriado.
        </div>
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Download Documento
        </button>
      </div>
    );
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] transition-opacity p-4 document-viewer-overlay"
      onClick={onClose}
      style={{ 
        zIndex: 9999,
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
            {fileName || 'Documento'}
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
  return createPortal(modalContent, document.body);
};

export default DocumentViewerModal;
