import React from 'react';
import { supabase } from '../lib/supabase';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  const [loading, setLoading] = React.useState(true);
  const [actualUrl, setActualUrl] = React.useState<string>(imageUrl);
  const [error, setError] = React.useState<string | null>(null);

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

  // Efeito para tentar carregar a URL e fallback para signed URL se necessário
  React.useEffect(() => {
    const testUrl = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Primeiro tenta carregar a URL original
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (response.ok) {
          setActualUrl(imageUrl);
          return;
        }
      } catch (e) {
        console.log('Public URL failed, trying signed URL...');
      }
      
      // Se a URL pública falhar, tenta gerar signed URL
      const signedUrl = await getSignedUrl(imageUrl);
      if (signedUrl) {
        setActualUrl(signedUrl);
      } else {
        setError('Não foi possível carregar o documento. Por favor, tente novamente.');
      }
    };
    
    testUrl();
  }, [imageUrl]);

  const handleDownload = async () => {
    try {
      const response = await fetch(actualUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Extract file name from URL
      a.download = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback for browsers that might have issues
      window.open(actualUrl, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="relative bg-white p-4 rounded-lg shadow-2xl max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the modal content
      >
        {loading && !error && (
          <div className="flex items-center justify-center min-h-[300px] min-w-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="ml-3 text-gray-600">Carregando documento...</div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center min-h-[300px] min-w-[300px] flex-col">
            <div className="text-red-500 text-lg mb-4">⚠️ Erro ao carregar documento</div>
            <div className="text-gray-600 text-center mb-4">{error}</div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
        
        {!error && (
          <img 
            src={actualUrl} 
            alt="Document preview" 
            className={`object-contain w-full h-full ${loading ? 'hidden' : ''}`}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Formato de documento não suportado para visualização. Tente fazer o download.');
            }}
          />
        )}
        
        <div className="absolute top-2 right-2 flex gap-2">
          {!error && (
            <button
              onClick={handleDownload}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              title="Download"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 text-white rounded-full hover:bg-gray-600 transition-colors"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal; 