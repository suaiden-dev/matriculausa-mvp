import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useGmailConnection } from '../hooks/useGmailConnection';

interface EmailConnection {
  id: string;
  provider: 'google' | 'microsoft';
  isConnected: boolean;
  email?: string;
  expires_at?: string;
}

const EmailConnectionManager: React.FC = () => {
  const { user } = useAuth();
  const { connections: gmailConnections, disconnectGmail, loading: gmailLoading, error: gmailError } = useGmailConnection();
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Verificar conexões existentes na tabela
  const checkExistingConnections = async () => {
    if (!user) return;

    try {
      // Para Gmail, usar os dados do hook
      const googleConnections = gmailConnections || [];
      
      // Para Microsoft, buscar da tabela
      const { data: microsoftData, error } = await supabase
        .from('email_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'microsoft');

      if (error) {
        console.error('Erro ao buscar conexões Microsoft:', error);
        return;
      }

      const microsoftConnection = microsoftData?.[0];

      // Criar lista de conexões
      const connectionList: EmailConnection[] = [];

      // Adicionar conexões Gmail
      if (googleConnections.length > 0) {
        googleConnections.forEach(conn => {
          connectionList.push({
            id: conn.id,
            provider: 'google',
            isConnected: true,
            email: conn.email,
            expires_at: conn.expires_at
          });
        });
      } else {
        // Adicionar placeholder para Gmail se não houver conexões
        connectionList.push({
          id: '',
          provider: 'google',
          isConnected: false,
          email: undefined,
          expires_at: undefined
        });
      }

      // Adicionar conexão Microsoft
      connectionList.push({
        id: microsoftConnection?.id || '',
        provider: 'microsoft',
        isConnected: !!microsoftConnection,
        email: microsoftConnection?.email,
        expires_at: microsoftConnection?.expires_at
      });

      setConnections(connectionList);
    } catch (error) {
      console.error('Erro ao verificar conexões:', error);
    }
  };

  // Verificar se OAuth foi bem-sucedido (agora processado na página de callback)
  const checkOAuthSuccess = () => {
    // Esta função agora só verifica se há parâmetros OAuth na URL
    // O processamento real é feito na página EmailOAuthCallback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state && (state.startsWith('google_') || state.startsWith('microsoft_'))) {
      console.log('🔄 OAuth detectado, redirecionando para página de callback...');
      // Redirecionar para a página de callback
      window.location.href = `/email-oauth-callback?${window.location.search}`;
    }
  };

  useEffect(() => {
    checkExistingConnections();
    checkOAuthSuccess();
  }, [user, gmailConnections]);

  const handleGoogleConnect = async () => {
    if (!user) {
      setError("Você precisa estar logado para conectar contas de email");
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo([]);

    try {
      const debugMsg1 = "🔍 Iniciando conexão com Google...";
      setDebugInfo(prev => [...prev, debugMsg1]);
      console.log(debugMsg1);

      const existingConnection = connections.find(conn => conn.provider === 'google');
      if (existingConnection?.isConnected) {
        setDebugInfo(prev => [...prev, "✅ Google já está conectado"]);
        return;
      }

      // Criar URL de autorização do Google manualmente
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      // Usar URL dinâmica baseada no ambiente atual
      const redirectUri = `${window.location.origin}/email-oauth-callback`;
      
      console.log('🔍 DEBUG: Environment detection:', {
        hostname: window.location.hostname,
        redirectUri
      });
      
      const state = `google_${Date.now()}`; // State para identificar o provider
      
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      const authUrl = new URL('https://accounts.google.com/oauth/authorize');
      authUrl.searchParams.set('client_id', googleClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      console.log('Google OAuth URL:', authUrl.toString());
      setDebugInfo(prev => [...prev, "✅ Redirecionando para Google..."]);
      
      // Redirecionar para Google
      window.location.href = authUrl.toString();

    } catch (err: any) {
      console.error('Erro ao conectar Google:', err);
      setError(err.message || 'Erro ao conectar com Google');
      setDebugInfo(prev => [...prev, `❌ Erro: ${err.message}`]);
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
      const debugMsg1 = "🔍 Iniciando conexão com Microsoft...";
      setDebugInfo(prev => [...prev, debugMsg1]);
      console.log(debugMsg1);

      const existingConnection = connections.find(conn => conn.provider === 'microsoft');
      if (existingConnection?.isConnected) {
        setDebugInfo(prev => [...prev, "✅ Microsoft já está conectado"]);
        return;
      }

      // Criar URL de autorização do Microsoft manualmente
      const microsoftClientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
      
      // Usar URL dinâmica baseada no ambiente atual
      const redirectUri = `${window.location.origin}/email-oauth-callback`;
      
      console.log('🔍 DEBUG: Environment detection for Microsoft:', {
        hostname: window.location.hostname,
        redirectUri
      });
      
      const state = `microsoft_${Date.now()}`; // State para identificar o provider
      
      const scopes = [
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/User.Read'
      ].join(' ');

      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', microsoftClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_mode', 'query');

      console.log('Microsoft OAuth URL:', authUrl.toString());
      setDebugInfo(prev => [...prev, "✅ Redirecionando para Microsoft..."]);
      
      // Redirecionar para Microsoft
      window.location.href = authUrl.toString();

    } catch (err: any) {
      console.error('Erro ao conectar Microsoft:', err);
      setError(err.message || 'Erro ao conectar com Microsoft');
      setDebugInfo(prev => [...prev, `❌ Erro: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'microsoft', email?: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🔌 Desconectando ${provider}${email ? ` (${email})` : ''}...`);
      
      if (provider === 'google') {
        // Usar a funcionalidade específica do hook para Gmail
        await disconnectGmail(email);
        console.log(`✅ Gmail desconectado${email ? ` (${email})` : ''} com sucesso`);
        setDebugInfo(prev => [...prev, `✅ Gmail desconectado${email ? ` (${email})` : ''}`]);
      } else {
        // Para Microsoft, manter a lógica antiga
        const { error: deleteError } = await supabase
          .from('email_connections')
          .delete()
          .eq('user_id', user.id)
          .eq('provider', provider);

        if (deleteError) {
          throw deleteError;
        }

        // Atualizar estado local
        setConnections(prev => 
          prev.map(conn => 
            conn.provider === provider 
              ? { ...conn, isConnected: false, email: undefined, expires_at: undefined }
              : conn
          )
        );

        console.log(`✅ ${provider} desconectado com sucesso`);
        setDebugInfo(prev => [...prev, `✅ ${provider} desconectado`]);
      }

    } catch (err: any) {
      console.error(`Erro ao desconectar ${provider}:`, err);
      setError(`Erro ao desconectar ${provider}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Funções para usar os tokens (exemplo)
  const readGmailEmails = async () => {
    console.log('Lendo emails do Gmail...');
    // Implementar usando tokens da tabela email_connections
  };

  const sendGmailEmail = async (to: string, subject: string, body: string) => {
    console.log('Enviando email via Gmail...', { to, subject, body });
    // Implementar usando tokens da tabela email_connections
  };

  const readOutlookEmails = async () => {
    console.log('Lendo emails do Outlook...');
    // Implementar usando tokens da tabela email_connections
  };

  const sendOutlookEmail = async (to: string, subject: string, body: string) => {
    console.log('Enviando email via Outlook...', { to, subject, body });
    // Implementar usando tokens da tabela email_connections
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Email Provider Connections
        </h3>
        <p className="text-gray-600">
          Faça login para conectar suas contas de email para funcionalidades de IA.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        Email Provider Connections
      </h3>
      <p className="text-slate-600 mb-6">
        Conecte suas contas de email para funcionalidades de IA.
      </p>

      <div className="space-y-4">
        {connections.map((connection) => (
          <div key={connection.provider} className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-slate-50 border-slate-200">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                connection.provider === 'google' 
                  ? 'bg-gradient-to-br from-red-500 to-red-600' 
                  : 'bg-gradient-to-br from-blue-500 to-blue-600'
              }`}>
                <span className="text-white font-bold text-sm">
                  {connection.provider === 'google' ? 'G' : 'M'}
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 capitalize">
                  {connection.provider}
                </h4>
                {connection.email && (
                  <p className="text-sm text-slate-600">{connection.email}</p>
                )}
                {connection.expires_at && (
                  <p className="text-xs text-slate-500">
                    Expira: {new Date(connection.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {connection.isConnected ? (
                <>
                  <span className="text-green-700 text-sm font-medium">Conectado</span>
                  <button
                    onClick={() => handleDisconnect(connection.provider, connection.email)}
                    disabled={loading || gmailLoading}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Desconectar
                  </button>
                </>
              ) : (
                <button
                  onClick={connection.provider === 'google' ? handleGoogleConnect : handleMicrosoftConnect}
                  disabled={loading || gmailLoading}
                  className="px-4 py-2 bg-gradient-to-r from-[#05294E] to-[#D0151C] text-white rounded-lg hover:from-[#041f3f] hover:to-[#b01218] disabled:opacity-50 transition-all duration-300 font-semibold"
                >
                  {loading || gmailLoading ? 'Conectando...' : 'Conectar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(error || gmailError) && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-medium">{error || gmailError}</p>
        </div>
      )}

      {debugInfo.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <h4 className="font-semibold text-yellow-800 mb-3">Debug Info:</h4>
          <div className="space-y-1">
            {debugInfo.map((info, index) => (
              <p key={index} className="text-sm font-mono text-yellow-700">{info}</p>
            ))}
          </div>
        </div>
      )}

      {/* Exemplo de uso dos tokens */}
      <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-3">Funcionalidades de Email:</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={readGmailEmails}
            className="px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-medium"
          >
            Ler Gmail
          </button>
          <button
            onClick={() => sendGmailEmail('test@example.com', 'Teste', 'Corpo do email')}
            className="px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-medium"
          >
            Enviar Gmail
          </button>
          <button
            onClick={readOutlookEmails}
            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium"
          >
            Ler Outlook
          </button>
          <button
            onClick={() => sendOutlookEmail('test@example.com', 'Teste', 'Corpo do email')}
            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium"
          >
            Enviar Outlook
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConnectionManager; 