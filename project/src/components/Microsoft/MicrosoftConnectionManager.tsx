import React, { useState } from 'react';
import { useMicrosoftConnection } from '../hooks/useMicrosoftConnection';
import { Trash2, Mail, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const MicrosoftConnectionManager: React.FC = () => {
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
  
  const [showConnectInfo, setShowConnectInfo] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState<{ show: boolean; email: string }>({ show: false, email: '' });

  const handleDisconnect = async (email: string) => {
    setDisconnectModal({ show: true, email });
  };

  const confirmDisconnect = async () => {
    await disconnectMicrosoft(disconnectModal.email);
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
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Microsoft Accounts</h3>
            <p className="text-sm text-slate-500">Manage your Microsoft email connections</p>
          </div>
        </div>
        <button
          onClick={handleConnectNewAccount}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Connecting...' : 'Connect New Account'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Connections List */}
      {connections.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-900 mb-2">No Microsoft accounts connected</h4>
          <p className="text-slate-500 mb-4">
            Connect your Microsoft account to start processing emails automatically
          </p>
          <button
            disabled={true}
            className="px-4 py-2 bg-gray-400 text-white text-sm font-medium rounded-lg cursor-not-allowed opacity-50"
          >
            Microsoft (Coming Soon)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{connection.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        activeConnection?.email === connection.email
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {activeConnection?.email === connection.email ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          'Inactive'
                        )}
                      </span>
                      <span className="text-xs text-slate-500">
                        Connected {new Date(connection.created_at).toLocaleDateString()}
                      </span>
                    </div>
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
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Connect New Microsoft Account</h4>
              <p className="text-sm text-blue-700 mb-3">
                You'll be redirected to Microsoft to authorize access to your email account. 
                Make sure you're logged into the correct Microsoft account.
              </p>
              <div className="flex space-x-2">
                <button
                  disabled={true}
                  className="px-3 py-1 bg-gray-400 text-white text-sm font-medium rounded-lg cursor-not-allowed opacity-50"
                >
                  Microsoft (Coming Soon)
                </button>
                <button
                  onClick={() => setShowConnectInfo(false)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {disconnectModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start space-x-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-slate-900">Disconnect Account</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to disconnect <strong>{disconnectModal.email}</strong>? 
                  This will stop automatic email processing for this account.
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmDisconnect}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </button>
              <button
                onClick={cancelDisconnect}
                disabled={loading}
                className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 text-sm font-medium rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MicrosoftConnectionManager;
