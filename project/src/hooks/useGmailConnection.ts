import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

interface GmailConnection {
  id: string;
  user_id: string;
  provider: 'google';
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  email: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

interface UseGmailConnectionReturn {
  connections: GmailConnection[];
  activeConnection: GmailConnection | null;
  loading: boolean;
  error: string | null;
  connectGmail: () => Promise<void>;
  disconnectGmail: (email?: string) => Promise<void>;
  checkConnections: () => Promise<boolean>;
  setActiveConnection: (email: string) => void;
  clearError: () => void;
}

const ACTIVE_CONNECTION_KEY = 'matricula_usa_active_gmail_connection';

export const useGmailConnection = (): UseGmailConnectionReturn => {
  const [connections, setConnections] = useState<GmailConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar conexões automaticamente quando o hook é inicializado
  useEffect(() => {
    checkConnections();
  }, []);

  // 🔧 CONFIGURAR GMAIL WATCH AUTOMATICAMENTE quando conexões são detectadas
  useEffect(() => {
    if (connections.length > 0 && !loading) {
      console.log('🔧 useGmailConnection: Conexões Gmail detectadas, configurando Watch...');
      setupGmailWatch();
    }
  }, [connections.length, loading]);

  // Monitorar mudanças na activeConnection
  useEffect(() => {
    console.log('🔄 useGmailConnection: activeConnection changed to:', activeConnection?.email);
  }, [activeConnection?.email]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkConnections = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 Checking Gmail connections...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ No session found');
        return false;
      }

      console.log('🔍 Session found, checking email_connections for user:', session.user.id);
      const { data, error } = await supabase
        .from('email_connections')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('provider', 'google')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error checking Gmail connections:', error);
        return false;
      }

      if (data && data.length > 0) {
        console.log('✅ Gmail connections found:', data.length);
        setConnections(data);
        
        // Restaurar conta ativa do localStorage ou usar a primeira
        const savedActiveEmail = localStorage.getItem(ACTIVE_CONNECTION_KEY);
        const activeConn = savedActiveEmail 
          ? data.find(conn => conn.email === savedActiveEmail)
          : data[0];
        
        if (activeConn) {
          setActiveConnection(activeConn);
          localStorage.setItem(ACTIVE_CONNECTION_KEY, activeConn.email);
        }
        
        return true;
      }

      console.log('❌ No Gmail connections found');
      setConnections([]);
      setActiveConnection(null);
      localStorage.removeItem(ACTIVE_CONNECTION_KEY);
      return false;
    } catch (err) {
      console.error('❌ Error checking Gmail connections:', err);
      return false;
    }
  }, []);

  const setActiveConnectionByEmail = useCallback((email: string) => {
    console.log('🔄 setActiveConnectionByEmail called with:', email);
    console.log('🔄 Available connections:', connections.map(c => c.email));
    
    const connection = connections.find(conn => conn.email === email);
    if (connection) {
      console.log('🔄 Setting active connection to:', email);
      setActiveConnection(connection);
      localStorage.setItem(ACTIVE_CONNECTION_KEY, email);
      console.log('✅ Active connection set to:', email);
    } else {
      console.log('❌ Connection not found for email:', email);
    }
  }, [connections]);

  const connectGmail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Construir URL de autorização OAuth 2.0 manual com configuração dinâmica
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = config.getOAuthRedirectUrl();
      const state = `google_${session.user.id}`; // Incluir user_id no state para segurança
      
      // Log da configuração atual
      config.logCurrentConfig();
      
      // Debug: verificar se as variáveis estão configuradas
      console.log('🔍 Debug OAuth:', {
        clientId: clientId ? '✅ Configurado' : '❌ Vazio',
        redirectUri,
        state,
        sessionUserId: session.user.id,
        environment: config.isDevelopment() ? '🟢 Development' : '🔴 Production'
      });
      
      if (!clientId) {
        throw new Error('VITE_GOOGLE_CLIENT_ID não está configurado. Crie um arquivo .env com suas credenciais do Google Cloud Console.');
      }
      
      const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      console.log('🔗 Redirecting to Google OAuth:', authUrl.toString());

      // Redirecionar para Google OAuth
      window.location.href = authUrl.toString();

    } catch (err: any) {
      setError(err.message || 'Failed to connect Gmail');
      console.error('Error connecting Gmail:', err);
      setLoading(false);
    }
  }, []);

  const disconnectGmail = useCallback(async (email?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      if (email) {
        // Desconectar conta específica
        const { error } = await supabase
          .from('email_connections')
          .delete()
          .eq('user_id', session.user.id)
          .eq('provider', 'google')
          .eq('email', email);

        if (error) {
          throw error;
        }

        // Remover da lista de conexões
        setConnections(prev => prev.filter(conn => conn.email !== email));
        
        // Se era a conta ativa, limpar
        if (activeConnection?.email === email) {
          setActiveConnection(null);
          localStorage.removeItem(ACTIVE_CONNECTION_KEY);
        }
        
        console.log('✅ Disconnected Gmail account:', email);
        
        // Fazer refresh completo da página para limpar os emails da interface
        console.log('🔄 Refreshing page to clear emails from interface...');
        window.location.reload();
      } else {
        // Desconectar todas as contas (comportamento antigo)
        const { error } = await supabase
          .from('email_connections')
          .delete()
          .eq('user_id', session.user.id)
          .eq('provider', 'google');

        if (error) {
          throw error;
        }

        setConnections([]);
        setActiveConnection(null);
        localStorage.removeItem(ACTIVE_CONNECTION_KEY);
        console.log('✅ Disconnected all Gmail accounts');
        
        // Fazer refresh completo da página para limpar os emails da interface
        console.log('🔄 Refreshing page to clear emails from interface...');
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Gmail');
      console.error('Error disconnecting Gmail:', err);
    } finally {
      setLoading(false);
    }
  }, [activeConnection]);

  // 🔧 Função para configurar Gmail Watch automaticamente
  const setupGmailWatch = useCallback(async () => {
    try {
      console.log('🔧 setupGmailWatch: Iniciando configuração do Gmail Watch...');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-all-gmail-watches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ setupGmailWatch: Gmail Watch configurado com sucesso:', result);
      } else {
        console.warn('⚠️ setupGmailWatch: Erro ao configurar Gmail Watch:', response.status);
        const errorText = await response.text();
        console.warn('⚠️ setupGmailWatch: Detalhes do erro:', errorText);
      }
    } catch (error) {
      console.warn('⚠️ setupGmailWatch: Erro inesperado:', error);
    }
  }, []);

  return {
    connections,
    activeConnection,
    loading,
    error,
    connectGmail,
    disconnectGmail,
    checkConnections,
    setActiveConnection: setActiveConnectionByEmail,
    clearError,
  };
}; 