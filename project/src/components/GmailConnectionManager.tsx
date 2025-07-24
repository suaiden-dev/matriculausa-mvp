import React from 'react';
import { useGmailConnection } from '../hooks/useGmailConnection';
import { Trash2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

const GmailConnectionManager: React.FC = () => {
  const { 
    connections, 
    activeConnection, 
    loading, 
    error, 
    connectGmail, 
    disconnectGmail, 
    setActiveConnection,
    clearError 
  } = useGmailConnection();

  const handleDisconnect = async (email: string) => {
    if (confirm(`Tem certeza que deseja desconectar a conta ${email}?`)) {
      await disconnectGmail(email);
    }
  };

  const handleSetActive = (email: string) => {
    setActiveConnection(email);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Gmail Connections
          </h3>
          <p className="text-slate-600 text-sm">
            Gerencie suas contas Gmail conectadas
          </p>
        </div>
        <button
          onClick={connectGmail}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-[#05294E] to-[#D0151C] text-white rounded-lg hover:from-[#041f3f] hover:to-[#b01218] disabled:opacity-50 transition-all duration-300 font-semibold text-sm"
        >
          {loading ? 'Conectando...' : 'Conectar Nova Conta'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
          <button
            onClick={clearError}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {connections.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Nenhuma conta Gmail conectada</p>
          <p className="text-slate-500 text-sm">Conecte uma conta para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                activeConnection?.email === connection.email
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-slate-900">
                      {connection.email}
                    </h4>
                    {activeConnection?.email === connection.email && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    Conectado em {new Date(connection.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {activeConnection?.email !== connection.email && (
                  <button
                    onClick={() => handleSetActive(connection.email)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Ativar
                  </button>
                )}
                <button
                  onClick={() => handleDisconnect(connection.email)}
                  disabled={loading}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title={`Desconectar ${connection.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {connections.length > 0 && (
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <h4 className="font-semibold text-slate-900 mb-2">Conta Ativa</h4>
          <p className="text-slate-600 text-sm">
            {activeConnection ? (
              <>
                <span className="font-medium">{activeConnection.email}</span>
                <span className="text-slate-500"> - Esta conta será usada para enviar e receber emails</span>
              </>
            ) : (
              'Nenhuma conta ativa selecionada'
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default GmailConnectionManager; 