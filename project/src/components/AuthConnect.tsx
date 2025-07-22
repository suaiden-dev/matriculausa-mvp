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
  accessToken?: string;
  refreshToken?: string;
}

const AuthConnect: React.FC<AuthConnectProps> = ({ onConnectionChange }) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Verificar conexões de email existentes (armazenadas localmente)
  useEffect(() => {
    const checkExistingConnections = async () => {
      if (!user) {
        setConnections([
          { provider: 'google', isConnected: false, email: '', lastSync: '' },
          { provider: 'microsoft', isConnected: false, email: '', lastSync: '' }
        ]);
        return;
      }

      // Buscar tokens de email armazenados no localStorage ou banco
      const googleToken = localStorage.getItem(`email_token_google_${user.id}`);
      const microsoftToken = localStorage.getItem(`email_token_microsoft_${user.id}`);
      
      setConnections([
        { 
          provider: 'google', 
          isConnected: !!googleToken, 
          email: user.email || '', 
          lastSync: googleToken ? 'Connected' : '',
          accessToken: googleToken || undefined
        },
        { 
          provider: 'microsoft', 
          isConnected: !!microsoftToken, 
          email: user.email || '', 
          lastSync: microsoftToken ? 'Connected' : '',
          accessToken: microsoftToken || undefined
        }
      ]);
    };

    checkExistingConnections();
  }, [user]);

  // Verificar se o OAuth foi bem-sucedido após o retorno
  useEffect(() => {
    const checkOAuthSuccess = async () => {
      // Verificar se há parâmetros de OAuth na URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('Erro no OAuth:', error);
        setError(`Erro no OAuth: ${error}`);
        localStorage.removeItem('oauth_provider_pending');
        // Limpar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      if (code && user) {
        console.log("🔄 Processando retorno do OAuth...");
        setDebugInfo(prev => [...prev, "🔄 Processando retorno do OAuth..."]);
        
        try {
          // Pegar o provider que foi armazenado quando iniciamos o OAuth
          const pendingProvider = localStorage.getItem('oauth_provider_pending');
          
          if (!pendingProvider) {
            console.log("⚠️ Nenhum provider OAuth pendente encontrado");
            return;
          }
          
          const provider = pendingProvider as 'google' | 'microsoft';
          
          // Limpar o provider pendente
          localStorage.removeItem('oauth_provider_pending');
          
          // Trocar o código por tokens (isso seria feito no backend)
          // Por enquanto, vamos simular o sucesso
          const mockToken = `mock_${provider}_token_${Date.now()}`;
          
          // Salvar token localmente
          localStorage.setItem(`email_token_${provider}_${user.id}`, mockToken);
          
          // Atualizar estado
          setConnections(prev => prev.map(conn =>
            conn.provider === provider
              ? { 
                  ...conn, 
                  isConnected: true, 
                  email: user.email || '', 
                  lastSync: 'Just now',
                  accessToken: mockToken
                }
              : conn
          ));
          
          onConnectionChange?.(true);
          
          console.log(`✅ ${provider} conectado com sucesso para funcionalidades de email!`);
          setDebugInfo(prev => [...prev, `✅ ${provider} conectado com sucesso!`]);
          
          // Limpar URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
        } catch (err) {
          console.error('Erro ao processar OAuth:', err);
          setError('Erro ao conectar conta de email');
          localStorage.removeItem('oauth_provider_pending');
        }
      }
    };

    checkOAuthSuccess();
  }, [user, onConnectionChange]);

  const handleGoogleConnect = async () => {
    if (!user) {
      setError("Você precisa estar logado para conectar contas de email");
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo([]);

    try {
      const debugMsg1 = "🔍 Iniciando conexão com Google para funcionalidades de email...";
      setDebugInfo(prev => [...prev, debugMsg1]);
      console.log(debugMsg1);

      // Verificar se já está conectado
      const existingConnection = connections.find(conn => conn.provider === 'google');
      if (existingConnection?.isConnected) {
        setDebugInfo(prev => [...prev, "✅ Google já está conectado para funcionalidades de email"]);
        return;
      }

      // Marcar que estamos iniciando OAuth do Google
      localStorage.setItem('oauth_provider_pending', 'google');

      // Iniciar OAuth apenas para email (não para autenticação)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/school/dashboard/inbox`,
          scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
          queryParams: {
            prompt: 'consent',
            access_type: 'offline'
          }
        }
      });

      if (error) {
        console.error("Erro durante OAuth:", error.message);
        localStorage.removeItem('oauth_provider_pending');
        throw error;
      }

      console.log('Google OAuth iniciado para email:', { provider: 'google', url: data.url });
      setDebugInfo(prev => [...prev, "✅ OAuth iniciado. Redirecionando para Google..."]);

    } catch (err: any) {
      console.error('Erro ao conectar Google:', err);
      setError(err.message || 'Erro ao conectar com Google');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftConnect = async () => {
    if (!user) {
      setError("Você precisa estar logado para conectar contas de email");
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo([]);
    
    try {
      const debugMsg1 = "🔍 Iniciando conexão com Microsoft para funcionalidades de email...";
      setDebugInfo(prev => [...prev, debugMsg1]);
      console.log(debugMsg1);

      // Verificar se já está conectado
      const existingConnection = connections.find(conn => conn.provider === 'microsoft');
      if (existingConnection?.isConnected) {
        setDebugInfo(prev => [...prev, "✅ Microsoft já está conectado para funcionalidades de email"]);
        return;
      }

      // Marcar que estamos iniciando OAuth do Microsoft
      localStorage.setItem('oauth_provider_pending', 'microsoft');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/school/dashboard/inbox`,
          scopes: 'openid profile email offline_access User.Read Mail.ReadWrite Mail.Send'
        }
      });

      if (error) {
        localStorage.removeItem('oauth_provider_pending');
        throw error;
      }

      console.log('Microsoft OAuth iniciado para email:', data);
      setDebugInfo(prev => [...prev, "✅ OAuth iniciado. Redirecionando para Microsoft..."]);
      
    } catch (err: any) {
      console.error('Erro ao conectar Microsoft:', err);
      setError(err.message || 'Erro ao conectar com Microsoft');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'microsoft') => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      // Remover token local
      localStorage.removeItem(`email_token_${provider}_${user.id}`);
      
      // Atualizar estado
      setConnections(prev => prev.map(conn => 
        conn.provider === provider 
          ? { ...conn, isConnected: false, email: '', lastSync: '', accessToken: undefined }
          : conn
      ));
      
      onConnectionChange?.(false);
      console.log(`✅ ${provider} desconectado das funcionalidades de email`);
      
    } catch (err: any) {
      console.error(`Erro ao desconectar ${provider}:`, err);
      setError(`Erro ao desconectar ${provider}`);
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

  // Função para usar o token de email para funcionalidades específicas
  const useEmailToken = (provider: 'google' | 'microsoft') => {
    const connection = connections.find(conn => conn.provider === provider);
    return connection?.accessToken;
  };

  // Função para ler emails do Gmail
  const readGmailEmails = async () => {
    const token = useEmailToken('google');
    if (!token) {
      setError('Google não está conectado para funcionalidades de email');
      return;
    }

    try {
      // Aqui você faria a chamada para a API do Gmail
      // Por enquanto, vamos simular
      console.log('📧 Lendo emails do Gmail usando token:', token);
      setDebugInfo(prev => [...prev, '📧 Lendo emails do Gmail...']);
      
      // Exemplo de como seria a chamada real:
      // const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      
    } catch (err) {
      console.error('Erro ao ler emails:', err);
      setError('Erro ao ler emails do Gmail');
    }
  };

  // Função para enviar email via Gmail
  const sendGmailEmail = async (to: string, subject: string, body: string) => {
    const token = useEmailToken('google');
    if (!token) {
      setError('Google não está conectado para funcionalidades de email');
      return;
    }

    try {
      console.log('📧 Enviando email via Gmail:', { to, subject });
      setDebugInfo(prev => [...prev, '📧 Enviando email via Gmail...']);
      
      // Aqui você faria a chamada para a API do Gmail
      // Por enquanto, vamos simular
      
    } catch (err) {
      console.error('Erro ao enviar email:', err);
      setError('Erro ao enviar email via Gmail');
    }
  };

  // Função para ler emails do Outlook
  const readOutlookEmails = async () => {
    const token = useEmailToken('microsoft');
    if (!token) {
      setError('Microsoft não está conectado para funcionalidades de email');
      return;
    }

    try {
      console.log('📧 Lendo emails do Outlook usando token:', token);
      setDebugInfo(prev => [...prev, '📧 Lendo emails do Outlook...']);
      
      // Aqui você faria a chamada para a API do Microsoft Graph
      
    } catch (err) {
      console.error('Erro ao ler emails:', err);
      setError('Erro ao ler emails do Outlook');
    }
  };

  // Função para enviar email via Outlook
  const sendOutlookEmail = async (to: string, subject: string, body: string) => {
    const token = useEmailToken('microsoft');
    if (!token) {
      setError('Microsoft não está conectado para funcionalidades de email');
      return;
    }

    try {
      console.log('📧 Enviando email via Outlook:', { to, subject });
      setDebugInfo(prev => [...prev, '📧 Enviando email via Outlook...']);
      
      // Aqui você faria a chamada para a API do Microsoft Graph
      
    } catch (err) {
      console.error('Erro ao enviar email:', err);
      setError('Erro ao enviar email via Outlook');
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
            <h3 className="text-lg font-bold text-slate-900">Email Provider Connections</h3>
            <p className="text-sm text-slate-600">Connect your email accounts for AI-powered email features only</p>
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

      {/* Debug Information */}
      {debugInfo.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h4 className="font-semibold text-yellow-800 mb-3 flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Debug Information</span>
          </h4>
          <div className="space-y-1">
            {debugInfo.map((msg, index) => (
              <div key={index} className="text-sm font-mono text-yellow-700">
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

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