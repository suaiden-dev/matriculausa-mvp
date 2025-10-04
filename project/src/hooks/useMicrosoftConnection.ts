import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { activateFetchInterceptor } from '../lib/utils/fetchInterceptor';

// Constante para chave do localStorage
const ACTIVE_MICROSOFT_CONNECTION_KEY = 'active_microsoft_connection';

export interface MicrosoftConnection {
  id: string;
  user_id: string;
  email_address: string;
  access_token: string;
  refresh_token?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  isConnected?: boolean;
  isTokenExpired?: boolean;
}

export interface UseMicrosoftConnectionReturn {
  connections: MicrosoftConnection[];
  activeConnection: MicrosoftConnection | null;
  loading: boolean;
  error: string | null;
  connectMicrosoft: () => Promise<void>;
  disconnectMicrosoft: (email: string) => Promise<void>;
  setActiveConnection: (email: string) => Promise<void>;
  clearError: () => void;
  setShowSecurityWarning: (show: boolean) => void;
  activateFetchInterceptor: () => void;
}

export const useMicrosoftConnection = (): UseMicrosoftConnectionReturn => {
  const [connections, setConnections] = useState<MicrosoftConnection[]>([]);
  const [activeConnection, setActiveConnectionState] = useState<MicrosoftConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkConnections = useCallback(async (): Promise<boolean> => {
    try {
      let { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('⚠️ Sessão não encontrada, tentando obter sessão atual...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.log('❌ No session found');
          return false;
        }
        session = { user } as any;
      }
      
      if (!session?.user) {
        console.log('❌ No session found');
        return false;
      }

      // Session found, checking Microsoft connections
      const { data, error } = await supabase
        .from('email_configurations')
        .select('id, user_id, email_address, oauth_access_token, oauth_refresh_token, is_active, created_at, updated_at')
        .eq('user_id', session.user.id)
        .eq('provider_type', 'microsoft')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error checking Microsoft connections:', error);
        return false;
      }

      if (data && data.length > 0) {
        const processedConnections = data.map(conn => ({
          ...conn,
          access_token: conn.oauth_access_token,
          refresh_token: conn.oauth_refresh_token,
          isConnected: conn.is_active && !!conn.oauth_access_token,
          isTokenExpired: false // Será verificado pelo TokenManager
        }));

        setConnections(processedConnections);
        
        // Verificar se há conexão ativa no localStorage
        const activeEmail = localStorage.getItem(ACTIVE_MICROSOFT_CONNECTION_KEY);
        if (activeEmail) {
          const activeConn = processedConnections.find(conn => 
            conn.email_address === activeEmail && conn.isConnected
          );
          if (activeConn) {
            setActiveConnectionState(activeConn);
            console.log('✅ Setting active connection:', activeConn.email_address);
          }
        }
        
        return true;
      } else {
        setConnections([]);
        setActiveConnectionState(null);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking connections:', error);
      return false;
    }
  }, []);

  const setActiveConnection = async (email: string) => {
    try {
      const connection = connections.find(conn => conn.email_address === email);
      if (connection) {
        setActiveConnectionState(connection);
        localStorage.setItem(ACTIVE_MICROSOFT_CONNECTION_KEY, email);
        console.log('✅ Setting active connection:', email);
      }
    } catch (error) {
      console.error('❌ Error setting active connection:', error);
    }
  };

  useEffect(() => {
    checkConnections();
  }, []);

  useEffect(() => {
    if (connections.length > 0) {
      const activeEmail = localStorage.getItem(ACTIVE_MICROSOFT_CONNECTION_KEY);
      if (activeEmail) {
        const activeConn = connections.find(conn => 
          conn.email_address === activeEmail && conn.isConnected
        );
        if (activeConn) {
          setActiveConnectionState(activeConn);
          console.log('✅ Setting active connection:', activeConn.email_address);
        }
      }
    }
  }, [connections, checkConnections]);

  const connectMicrosoft = useCallback(async (forceNewLogin = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 Iniciando conexão Microsoft via Web App flow...');
      
      // USAR APENAS WEB APP FLOW - Redirecionar para Azure AD
      const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI || `${window.location.origin}/microsoft-email`;
      const scopes = ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'].join(' ');
      
      // Construir URL de autorização do Azure AD
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('prompt', 'consent'); // Forçar consentimento para obter refresh token
      authUrl.searchParams.set('state', 'microsoft-connection');
      
      console.log('🔄 Redirecionando para Azure AD...');
      console.log('🔗 URL:', authUrl.toString());
      
      // Redirecionar para Azure AD
      window.location.href = authUrl.toString();

    } catch (err: any) {
      console.error('❌ Error connecting to Microsoft:', err);
      setError(err.message || 'Erro ao conectar com Microsoft');
      setLoading(false);
    }
  }, []);

  const disconnectMicrosoft = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔌 Disconnecting Microsoft account:', email);

      // Buscar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No active session found');
      }

      // Deletar configuração do banco
      const { error: deleteError } = await supabase
        .from('email_configurations')
        .delete()
        .eq('user_id', session.user.id)
        .eq('email_address', email)
        .eq('provider_type', 'microsoft');

      if (deleteError) {
        console.error('❌ Error deleting Microsoft connection:', deleteError);
        throw deleteError;
      }

      console.log('✅ Microsoft connection deleted from database');

      // Limpar localStorage
      if (activeConnection?.email_address === email) {
        localStorage.removeItem(ACTIVE_MICROSOFT_CONNECTION_KEY);
        setActiveConnectionState(null);
      }

      // Recarregar conexões
      await checkConnections();

    } catch (err: any) {
      console.error('❌ Error disconnecting Microsoft:', err);
      setError(err.message || 'Erro ao desconectar Microsoft');
    } finally {
      setLoading(false);
    }
  }, [activeConnection, checkConnections]);

  // Função para ativar interceptador de fetch
  const handleActivateFetchInterceptor = useCallback(() => {
    activateFetchInterceptor();
    console.log('✅ Interceptador de fetch ativado');
  }, []);

  return {
    connections,
    activeConnection,
    loading,
    error,
    connectMicrosoft,
    disconnectMicrosoft,
    setActiveConnection,
    clearError,
    setShowSecurityWarning,
    activateFetchInterceptor: handleActivateFetchInterceptor
  };
};
