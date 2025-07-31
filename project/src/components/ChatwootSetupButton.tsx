import React, { useState } from 'react';
import { createChatwootAndQRCodeDirect } from '../lib/chatwootUtils';
import { useAuth } from '../hooks/useAuth';

interface ChatwootSetupButtonProps {
  onSuccess?: (data: {
    qr_code: string;
    instance_name: string;
    chatwoot_access_token: string;
    chatwoot_password: string;
  }) => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const ChatwootSetupButton: React.FC<ChatwootSetupButtonProps> = ({
  onSuccess,
  onError,
  className = '',
  children = 'Configurar Chatwoot + WhatsApp'
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async () => {
    if (!user) {
      onError?.('Usuário não autenticado');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 [ChatwootSetupButton] ===== INICIANDO CONFIGURAÇÃO =====');
      console.log('👤 [ChatwootSetupButton] Usuário:', user.id);
      console.log('📧 [ChatwootSetupButton] Email:', user.email);
      console.log('📝 [ChatwootSetupButton] Nome:', user.user_metadata?.name || user.email);

      const result = await createChatwootAndQRCodeDirect(
        user.id,
        user.email || '',
        user.user_metadata?.name || user.email || 'Usuário',
        'Basic',
        1
      );

      console.log('📊 [ChatwootSetupButton] Resultado:', result);

      if (result.success) {
        console.log('✅ [ChatwootSetupButton] Configuração realizada com sucesso');
        onSuccess?.({
          qr_code: result.qr_code!,
          instance_name: result.instance_name!,
          chatwoot_access_token: result.chatwoot_access_token!,
          chatwoot_password: result.chatwoot_password!
        });
      } else {
        console.error('❌ [ChatwootSetupButton] Erro na configuração:', result.error);
        onError?.(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('💥 [ChatwootSetupButton] Erro inesperado:', error);
      onError?.(error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleSetup}
        disabled={isLoading || !user}
        className={`bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors ${className}`}
      >
        {isLoading ? 'Configurando...' : children}
      </button>
      
      {/* Botão de debug */}
      <button
        onClick={() => {
          console.log('🧪 [ChatwootSetupButton] ===== DEBUG INFO =====');
          console.log('🧪 [ChatwootSetupButton] User ID:', user?.id);
          console.log('🧪 [ChatwootSetupButton] User Email:', user?.email);
          console.log('🧪 [ChatwootSetupButton] User Metadata:', user?.user_metadata);
          console.log('🧪 [ChatwootSetupButton] Função createChatwootAndQRCodeDirect existe:', typeof createChatwootAndQRCodeDirect);
        }}
        className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
      >
        Debug Info
      </button>
    </div>
  );
};

export default ChatwootSetupButton; 