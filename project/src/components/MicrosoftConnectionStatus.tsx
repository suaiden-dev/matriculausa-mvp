import React from 'react';
import { useMicrosoftConnection } from '../hooks/useMicrosoftConnection';

interface MicrosoftConnectionStatusProps {
  onReconnect?: () => void;
}

export const MicrosoftConnectionStatus: React.FC<MicrosoftConnectionStatusProps> = ({ onReconnect }) => {
  const { connections, activeConnection, connectMicrosoft } = useMicrosoftConnection();

  // Verificar se há conexões com tokens expirados
  const hasExpiredTokens = connections.some(conn => conn.isTokenExpired);
  const activeConnectionExpired = activeConnection?.isTokenExpired;
  
  // Verificar se não há conexões ativas (problema de MSAL)
  const hasNoActiveConnections = connections.length === 0;

  if (!hasExpiredTokens && !activeConnectionExpired && !hasNoActiveConnections) {
    return null;
  }

  const handleReconnect = async () => {
    try {
      await connectMicrosoft(true); // Forçar novo login
      onReconnect?.();
    } catch (error) {
      console.error('Erro ao reconectar:', error);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            {hasNoActiveConnections ? 'Conexão Microsoft Perdida' : 'Conexão Microsoft Expirada'}
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              {hasNoActiveConnections 
                ? 'Sua conexão com o Microsoft foi perdida. Para continuar usando os recursos de email, você precisa reconectar sua conta.'
                : 'Sua conexão com o Microsoft expirou. Para continuar usando os recursos de email, você precisa reconectar sua conta.'
              }
            </p>
            {hasNoActiveConnections && (
              <p className="mt-1 text-xs text-yellow-600">
                💡 Isso acontece quando não há contas MSAL disponíveis. O sistema tentará renovar via refresh token primeiro, mas se falhar, você precisará reconectar.
              </p>
            )}
            {!hasNoActiveConnections && (hasExpiredTokens || activeConnectionExpired) && (
              <p className="mt-1 text-xs text-yellow-600">
                💡 O sistema tentará renovar automaticamente via refresh token. Se falhar, reconecte manualmente.
              </p>
            )}
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                onClick={handleReconnect}
                className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
              >
                Reconectar Agora
              </button>
              <button
                onClick={() => window.location.reload()}
                className="ml-3 bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicrosoftConnectionStatus;
