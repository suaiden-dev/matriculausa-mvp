import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface IdentityPhotoUploadProps {
  onUploadSuccess: (filePath: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
  onRemove?: () => void;
  initialPhotoPath?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const IdentityPhotoUpload: React.FC<IdentityPhotoUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  onRemove,
  initialPhotoPath
}) => {
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(initialPhotoPath || null);
  const [isRemoved, setIsRemoved] = useState(false); // Flag para controlar se foi removido manualmente
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar preview se já existe foto usando signed URL
  // ✅ CORREÇÃO: Só carregar se não foi removido manualmente e se há initialPhotoPath
  React.useEffect(() => {
    const loadPhotoPreview = async () => {
      // Se não há initialPhotoPath, limpar preview (se veio do initialPhotoPath)
      if (!initialPhotoPath) {
        // Se foi removido manualmente, já está limpo, não fazer nada
        if (isRemoved) {
          return;
        }
        // Se não foi removido manualmente mas initialPhotoPath foi removido externamente, limpar
        if (preview && uploadedFilePath === initialPhotoPath) {
          setPreview(null);
          setUploadedFilePath(null);
        }
        return;
      }
      
      // Se foi removido manualmente, não recarregar mesmo se há initialPhotoPath
      if (isRemoved) {
        return;
      }
      
      // Se há initialPhotoPath e ainda não carregou (ou é diferente do atual), carregar
      if (initialPhotoPath && uploadedFilePath !== initialPhotoPath) {
        try {
          console.log('🔍 [IdentityPhotoUpload] Carregando preview de:', initialPhotoPath);
          // Gerar signed URL (válida por 1 hora)
          const { data, error } = await supabase.storage
            .from('identity-photos')
            .createSignedUrl(initialPhotoPath, 60 * 60);
          
          if (error) {
            console.error('Erro ao gerar signed URL:', error);
            return;
          }
          
          setPreview(data.signedUrl);
          setUploadedFilePath(initialPhotoPath);
          console.log('🔍 [IdentityPhotoUpload] Preview carregado com sucesso');
        } catch (err) {
          console.error('Erro ao carregar preview:', err);
        }
      }
    };
    
    loadPhotoPreview();
  }, [initialPhotoPath, isRemoved, preview, uploadedFilePath]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validação de tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      const errorMsg = 'Apenas arquivos JPG e PNG são permitidos';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Validação de tamanho
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = 'O arquivo deve ter no máximo 5MB';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload via Edge Function
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-identity-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload da foto');
      }

      setUploadedFilePath(result.filePath);
      setIsRemoved(false); // ✅ Resetar flag quando novo upload é feito
      onUploadSuccess(result.filePath, result.fileName);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err);
      const errorMsg = err.message || 'Erro ao fazer upload da foto';
      setError(errorMsg);
      setPreview(null);
      onUploadError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    console.log('🔍 [IdentityPhotoUpload] Removendo foto...');
    setPreview(null);
    setUploadedFilePath(null);
    setError(null);
    setIsRemoved(true); // ✅ Marcar como removido para evitar recarregamento
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // ✅ Notificar componente pai que a foto foi removida
    onRemove?.();
    console.log('🔍 [IdentityPhotoUpload] Foto removida com sucesso');
  };

  return (
    <div className="space-y-4">
      {/* Imagem de ajuda */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <Camera className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">
              Como tirar a foto correta
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Tire uma selfie segurando seu documento de identidade ao lado do seu rosto. 
              Certifique-se de que tanto seu rosto quanto o documento estejam claramente visíveis.
            </p>
            <div className="flex justify-center">
              <img 
                src="/helpselfie.png" 
                alt="Exemplo de foto com documento" 
                className="max-w-full h-auto rounded-lg border-2 border-blue-300 shadow-sm"
                style={{ maxHeight: '200px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Área de upload */}
      {!preview || isRemoved ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center hover:border-blue-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            className="hidden"
            id="identity-photo-upload"
            disabled={uploading}
          />
          <label
            htmlFor="identity-photo-upload"
            className={`cursor-pointer flex flex-col items-center justify-center space-y-3 ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <>
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600">Enviando foto...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Clique para fazer upload da foto
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG ou PNG (máximo 5MB)
                  </p>
                </div>
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="relative">
          <div className="border-2 border-green-300 rounded-xl overflow-hidden bg-gray-50">
            <img
              src={preview || undefined}
              alt="Preview da foto de identidade"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            {uploadedFilePath && !isRemoved ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Foto enviada com sucesso</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-sm">Preview da foto</span>
              </div>
            )}
            <button
              onClick={handleRemove}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Remover
            </button>
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
};

