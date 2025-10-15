import React, { useState } from 'react';
import { ChevronDown, Plus, Mail, Settings, X, Loader2 } from 'lucide-react';
import { useMicrosoftConnection } from '../../hooks/useMicrosoftConnection';

interface MicrosoftAccountSelectorProps {
  onAccountChange?: (email: string) => void;
}

const MicrosoftAccountSelector: React.FC<MicrosoftAccountSelectorProps> = ({ onAccountChange }) => {
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
  const [isOpen, setIsOpen] = useState(false);

  const handleAccountSelect = (email: string) => {
    // MicrosoftAccountSelector: handleAccountSelect called
    
    setActiveConnection(email);
    onAccountChange?.(email);
    setIsOpen(false);
    
    // MicrosoftAccountSelector: Account selection completed
  };

  const handleAddAccount = async () => {
    setIsOpen(false);
    try {
      await connectMicrosoft(true); // Forçar novo login
    } catch (error) {
      console.error('Error adding new account:', error);
    }
  };

  const handleDisconnectAccount = async (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await disconnectMicrosoft(email);
    } catch (error) {
      console.error('Error disconnecting account:', error);
    }
  };

  if (connections.length === 0) {
    return (
      <button
        onClick={connectMicrosoft}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
        {loading ? 'Conectando...' : 'Conectar Microsoft'}
      </button>
    );
  }

  return (
    <div className="relative">
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
        <span className="truncate max-w-48">
          {loading ? 'Conectando...' : (activeConnection?.email_address || 'Selecionar Conta')}
          {connections.length > 1 && (
            <span className="ml-1 text-xs bg-blue-500 text-white px-1 rounded">
              {connections.length}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-64 bg-white border border-gray-300 rounded-md shadow-lg z-[9999]">
          <div className="py-1">
            {/* Account List */}
            {connections.map((connection) => (
              <div
                key={connection.id}
                className={`px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between group ${
                  activeConnection?.email_address === connection.email_address 
                    ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-500' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <button
                  onClick={() => handleAccountSelect(connection.email_address)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{connection.email_address}</span>
                </button>
                
                <div className="flex items-center gap-2">
                  {activeConnection?.email_address === connection.email_address && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-blue-600 font-medium">Active</span>
                    </div>
                  )}
                  
                  {connections.length > 1 && (
                    <button
                      onClick={(e) => handleDisconnectAccount(connection.email_address, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                      title="Desconectar conta"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Account Button */}
            <button
              onClick={handleAddAccount}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Adicionando conta...' : 'Adicionar Conta Microsoft'}
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MicrosoftAccountSelector;
