import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Settings,
  ExternalLink,
  Shield,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface AuthConnectProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

interface EmailConnection {
  provider: 'google' | 'microsoft';
  email: string;
  isConnected: boolean;
  lastSync?: string;
}

const AuthConnect: React.FC<AuthConnectProps> = ({ onConnectionChange }) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data - será substituído por dados reais
  useEffect(() => {
    // Simular verificação de conexões existentes
    const mockConnections: EmailConnection[] = [
      {
        provider: 'google',
        email: '',
        isConnected: false
      },
      {
        provider: 'microsoft',
        email: '',
        isConnected: false
      }
    ];
    setConnections(mockConnections);
  }, []);

  const handleGoogleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/school/dashboard/inbox`,
          scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email'
        }
      });

      if (error) {
        throw error;
      }

      // Se chegou aqui, o redirecionamento foi iniciado
      console.log('Google OAuth iniciado:', data);
      
      // Simular conexão bem-sucedida após redirecionamento
      // Em produção, isso seria verificado após o retorno do OAuth
      setTimeout(() => {
        setConnections(prev => prev.map(conn => 
          conn.provider === 'google' 
            ? { ...conn, isConnected: true, email: 'user@gmail.com', lastSync: 'Just now' }
            : conn
        ));
        onConnectionChange?.(true);
      }, 2000);
      
    } catch (err: any) {
      console.error('Erro ao conectar Google:', err);
      setError(err.message || 'Erro ao conectar com Google');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/school/dashboard/inbox`,
          scopes: 'openid profile email offline_access User.Read Mail.ReadWrite Mail.Send'
        }
      });

      if (error) {
        throw error;
      }

      console.log('Microsoft OAuth iniciado:', data);
      
      // Simular conexão bem-sucedida após redirecionamento
      setTimeout(() => {
        setConnections(prev => prev.map(conn => 
          conn.provider === 'microsoft' 
            ? { ...conn, isConnected: true, email: 'user@outlook.com', lastSync: 'Just now' }
            : conn
        ));
        onConnectionChange?.(true);
      }, 2000);
      
    } catch (err: any) {
      console.error('Erro ao conectar Microsoft:', err);
      setError(err.message || 'Erro ao conectar com Microsoft');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'microsoft') => {
    setLoading(true);
    setError(null);
    
    try {
      // Aqui você implementaria a lógica para desconectar
      // Por enquanto, apenas atualizamos o estado local
      setConnections(prev => prev.map(conn => 
        conn.provider === provider 
          ? { ...conn, isConnected: false, email: '' }
          : conn
      ));
      
      onConnectionChange?.(false);
      
    } catch (err: any) {
      console.error('Erro ao desconectar:', err);
      setError(err.message || 'Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
        );
      case 'microsoft':
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
        );
      default:
        return <Mail className="h-5 w-5 text-slate-500" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'Google (Gmail)';
      case 'microsoft':
        return 'Microsoft (Outlook)';
      default:
        return provider;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] w-10 h-10 rounded-xl flex items-center justify-center">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Email Connections</h3>
            <p className="text-sm text-slate-600">Connect your email accounts to manage messages</p>
          </div>
        </div>
        
        <button 
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Settings"
          aria-label="Email settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="space-y-4 mb-6">
        {connections.map((connection) => (
          <div 
            key={connection.provider}
            className={`p-4 rounded-xl border transition-colors ${
              connection.isConnected 
                ? 'bg-green-50 border-green-200' 
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getProviderIcon(connection.provider)}
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {getProviderName(connection.provider)}
                  </h4>
                  {connection.isConnected ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700">{connection.email}</span>
                      {connection.lastSync && (
                        <span className="text-xs text-slate-500">
                          • Last sync: {connection.lastSync}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">Not connected</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {connection.isConnected ? (
                  <button
                    onClick={() => handleDisconnect(connection.provider)}
                    disabled={loading}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={connection.provider === 'google' ? handleGoogleConnect : handleMicrosoftConnect}
                    disabled={loading}
                    className="px-4 py-2 bg-[#05294E] text-white text-sm font-semibold rounded-lg hover:bg-[#041f3f] transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
          <Shield className="h-4 w-4 text-[#05294E]" />
          <span>Benefits of Email Integration</span>
        </h4>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Centralized email management</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>AI-powered response suggestions</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Automatic email categorization</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Real-time notifications</span>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800 font-medium">Secure Connection</p>
            <p className="text-xs text-blue-700 mt-1">
              Your email credentials are securely stored and encrypted. We only access the permissions you authorize.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthConnect; 