import React, { useState } from 'react';
import { ChevronDown, Plus, Mail, Settings } from 'lucide-react';
import { useGmailConnection } from '../../hooks/useGmailConnection';

interface GmailAccountSelectorProps {
  onAccountChange?: (email: string) => void;
}

const GmailAccountSelector: React.FC<GmailAccountSelectorProps> = ({ onAccountChange }) => {
  const { connections, activeConnection, connectGmail, setActiveConnection } = useGmailConnection();
  const [isOpen, setIsOpen] = useState(false);

  const handleAccountSelect = (email: string) => {
    console.log('🔄 GmailAccountSelector: handleAccountSelect called with:', email);
    console.log('🔄 Current activeConnection:', activeConnection?.email);
    
    setActiveConnection(email);
    onAccountChange?.(email);
    setIsOpen(false);
    
    console.log('🔄 GmailAccountSelector: Account selection completed');
  };

  const handleAddAccount = () => {
    setIsOpen(false);
    connectGmail();
  };

  if (connections.length === 0) {
    return (
      <button
        onClick={connectGmail}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Mail className="w-4 h-4" />
        Connect Gmail
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Mail className="w-4 h-4" />
        <span className="truncate max-w-48">
          {activeConnection?.email || 'Select Account'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {/* Contas conectadas */}
            {connections.map((connection) => (
              <button
                key={connection.id}
                onClick={() => handleAccountSelect(connection.email)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  activeConnection?.email === connection.email ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{connection.email}</div>
                  <div className="text-xs text-gray-500">
                    Connected {new Date(connection.created_at).toLocaleDateString()}
                  </div>
                </div>
                {activeConnection?.email === connection.email && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            ))}

            {/* Separador */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* Botão adicionar conta */}
            <button
              onClick={handleAddAccount}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add another account</span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default GmailAccountSelector; 