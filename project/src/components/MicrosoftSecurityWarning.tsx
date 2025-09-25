import React, { useState } from 'react';

interface MicrosoftSecurityWarningProps {
  onDismiss: () => void;
}

const MicrosoftSecurityWarning: React.FC<MicrosoftSecurityWarningProps> = ({ onDismiss }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 shadow-xl">
        <div className="flex items-center mb-4">
          <div className="bg-yellow-100 p-2 rounded-full mr-3">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">⚠️ Aviso Importante sobre Segurança Microsoft</h2>
        </div>

        <div className="mb-4">
          <p className="text-gray-700 mb-3">
            A Microsoft pode bloquear temporariamente sua conta por medidas de segurança após o login. 
            Isso é normal e acontece para proteger sua conta.
          </p>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            {showDetails ? 'Ocultar detalhes' : 'Ver detalhes e soluções'}
          </button>

          {showDetails && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold mb-2">🔍 Por que isso acontece?</h3>
              <ul className="text-sm space-y-1 mb-4">
                <li>• A Microsoft detecta login de "dispositivo não reconhecido" (nosso site)</li>
                <li>• Sistema de segurança bloqueia a conta temporariamente</li>
                <li>• Isso é uma medida de proteção da sua conta</li>
              </ul>

              <h3 className="font-bold mb-2">✅ Como resolver:</h3>
              <ol className="text-sm space-y-1 mb-4">
                <li>1. <strong>Aguarde 15-30 minutos</strong> e tente novamente</li>
                <li>2. Use <strong>"Outras maneiras de entrar"</strong> no site da Microsoft</li>
                <li>3. Verifique se há <strong>códigos de verificação</strong> no seu email/telefone</li>
                <li>4. Use um <strong>dispositivo que você já usou</strong> para acessar a Microsoft</li>
              </ol>

              <h3 className="font-bold mb-2">🛡️ Para evitar no futuro:</h3>
              <ul className="text-sm space-y-1">
                <li>• Configure <strong>métodos de recuperação</strong> na sua conta Microsoft</li>
                <li>• Adicione <strong>email alternativo</strong> e <strong>número de telefone</strong></li>
                <li>• Use <strong>Microsoft Authenticator</strong> para autenticação</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Entendi
          </button>
          <button
            onClick={() => {
              window.open('https://account.microsoft.com/security', '_blank');
              onDismiss();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Ir para Segurança Microsoft
          </button>
        </div>
      </div>
    </div>
  );
};

export default MicrosoftSecurityWarning;
