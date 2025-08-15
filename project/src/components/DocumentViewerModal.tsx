import React from 'react';
import { supabase } from '../lib/supabase';

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

  // Função para tentar gerar signed URL se a URL pública falhar
  const getSignedUrl = async (originalUrl: string): Promise<string | null> => {
    try {
      // Extrair o path do bucket da URL pública
      const urlParts = originalUrl.split('/storage/v1/object/public/student-documents/');
      if (urlParts.length !== 2) return null;
      
      const filePath = urlParts[1];
      const { data, error } = await supabase.storage
        .from('student-documents')
        .createSignedUrl(filePath, 60 * 60); // 1 hora
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (e) {
      console.error('Exception creating signed URL:', e);
      return null;
    }
  };

  // Detectar tipo de documento baseado na URL ou nome do arquivo
  const detectDocumentType = (url: string, name?: string): 'pdf' | 'image' | 'unknown' => {
    const fullName = name || url;
    const lowerName = fullName.toLowerCase();
    
    if (lowerName.includes('.pdf')) return 'pdf';
    if (lowerName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'image';
    return 'unknown';
  };

  // Efeito para tentar carregar a URL e fallback para signed URL se necessário
  React.useEffect(() => {
    const testUrl = async () => {
      setLoading(true);
      setError(null);
      
      // Detectar tipo de documento
      const type = detectDocumentType(documentUrl, fileName);
      setDocumentType(type);
      
      try {
        // Primeiro tenta carregar a URL original
        const response = await fetch(documentUrl, { method: 'HEAD' });
        if (response.ok) {
          setActualUrl(documentUrl);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('Public URL failed, trying signed URL...');
      }
      
      // Se a URL pública falhar, tenta gerar signed URL
      const signedUrl = await getSignedUrl(documentUrl);
      if (signedUrl) {
        setActualUrl(signedUrl);
        setLoading(false);
      } else {
        setError('Não foi possível carregar o documento. Por favor, tente novamente.');
        setLoading(false);
      }
    };
    
    testUrl();
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity p-4"
      onClick={onClose}
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
};

export default DocumentViewerModal;
