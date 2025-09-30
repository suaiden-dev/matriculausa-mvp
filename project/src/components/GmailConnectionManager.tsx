import React, { useState } from 'react';
import { useGmailConnection } from '../hooks/useGmailConnection';
import { Trash2, Mail, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

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
  
  const [showConnectInfo, setShowConnectInfo] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState<{ show: boolean; email: string }>({ show: false, email: '' });

  const handleDisconnect = async (email: string) => {
    setDisconnectModal({ show: true, email });
  };

  const confirmDisconnect = async () => {
    await disconnectGmail(disconnectModal.email);
    setDisconnectModal({ show: false, email: '' });
  };

  const cancelDisconnect = () => {
    setDisconnectModal({ show: false, email: '' });
  };

  const handleSetActive = (email: string) => {
    setActiveConnection(email);
  };

  const handleConnectNewAccount = () => {
    setShowConnectInfo(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Gmail Connections
          </h3>
          <p className="text-slate-600 text-sm">
            Manage your connected Gmail accounts
          </p>
        </div>
        <button
          disabled={true}
          className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50 transition-all duration-300 font-semibold text-sm"
        >
          Gmail (Coming Soon)
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
          <p className="text-slate-600">No Gmail accounts connected</p>
          <p className="text-slate-500 text-sm">Connect an account to get started</p>
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
                    Connected on {new Date(connection.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {activeConnection?.email !== connection.email && (
                  <button
                    onClick={() => handleSetActive(connection.email)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Activate
                  </button>
                )}
                                 <button
                   onClick={() => handleDisconnect(connection.email)}
                   disabled={loading}
                   className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 font-medium"
                 >
                   Disconnect
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {connections.length > 0 && (
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <h4 className="font-semibold text-slate-900 mb-2">Active Account</h4>
          <p className="text-slate-600 text-sm">
            {activeConnection ? (
              <>
                <span className="font-medium">{activeConnection.email}</span>
                <span className="text-slate-500"> - This account will be used to send and receive emails</span>
              </>
            ) : (
              'No active account selected'
            )}
          </p>
        </div>
      )}

      {/* Connect New Account Info */}
      {showConnectInfo && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Connect New Gmail Account</h4>
              <p className="text-blue-700 text-sm mb-3">
                To connect a new Gmail account, you'll need to go through the OAuth process. This will redirect you to Google's authorization page.
              </p>
              <div className="flex space-x-3">
                <button
                  disabled={true}
                  className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50 transition-colors text-sm font-medium"
                >
                  Gmail (Coming Soon)
                </button>
                <button
                  onClick={() => setShowConnectInfo(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
                 </div>
       )}

       {/* Modal de Confirmação de Desconexão */}
       {disconnectModal.show && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-slate-900">Confirm Disconnection</h3>
               <button
                 onClick={cancelDisconnect}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
                 title="Close modal"
               >
                 <X className="h-5 w-5" />
               </button>
             </div>
             
             <div className="mb-6">
               <p className="text-slate-600 mb-2">
                 Are you sure you want to disconnect the account:
               </p>
               <p className="font-semibold text-slate-900 bg-slate-50 p-3 rounded-lg">
                 {disconnectModal.email}
               </p>
               <p className="text-sm text-slate-500 mt-2">
                 This action cannot be undone. You'll need to reconnect the account if you want to use it again.
               </p>
             </div>
             
             <div className="flex space-x-3">
               <button
                 onClick={cancelDisconnect}
                 className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
               >
                 Cancel
               </button>
               <button
                 onClick={confirmDisconnect}
                 disabled={loading}
                 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
               >
                 {loading ? 'Disconnecting...' : 'Disconnect'}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default GmailConnectionManager; 