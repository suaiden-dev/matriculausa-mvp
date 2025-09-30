import React from 'react';
import { useMicrosoftConnection } from '../../hooks/useMicrosoftConnection';

export const MicrosoftConnectionStatus: React.FC = () => {
  const { 
    connections, 
    activeConnection, 
    loading, 
    error, 
    connectMicrosoft, 
    disconnectMicrosoft, 
    setActiveConnection, 
    clearError 
  } = useMicrosoftConnection();

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-sm text-blue-800">Processando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-red-800">Erro na conexão</h4>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
          >
            Limpar
          </button>
        </div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">Nenhuma conta Microsoft conectada</p>
          <button
            onClick={connectMicrosoft}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            Conectar Conta Microsoft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-green-800">
          Contas Microsoft Conectadas ({connections.length})
        </h4>
        <button
          onClick={connectMicrosoft}
          className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded"
        >
          Adicionar Conta
        </button>
      </div>

      <div className="space-y-2">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              activeConnection?.email === connection.email
                ? 'bg-blue-100 border-blue-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                activeConnection?.email === connection.email ? 'bg-blue-500' : 'bg-gray-300'
              }`}></div>
              <div>
                <p className="text-sm font-medium text-gray-900">{connection.email}</p>
                <p className="text-xs text-gray-500">
                  Conectado em {new Date(connection.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {activeConnection?.email !== connection.email && (
                <button
                  onClick={() => setActiveConnection(connection.email)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                >
                  Ativar
                </button>
              )}
              
              {activeConnection?.email === connection.email && (
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                  Ativa
                </span>
              )}
              
              <button
                onClick={() => disconnectMicrosoft(connection.email)}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
              >
                Desconectar
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeConnection && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-green-700">
            <strong>Conta ativa:</strong> {activeConnection.email}
          </p>
        </div>
      )}
    </div>
  );
};
