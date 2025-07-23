import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  connection: GmailConnection | null;
  loading: boolean;
  error: string | null;
  connectGmail: () => Promise<void>;
  disconnectGmail: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
  clearError: () => void;
}

export const useGmailConnection = (): UseGmailConnectionReturn => {
  const [connection, setConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar conexão automaticamente quando o hook é inicializado
  useEffect(() => {
    checkConnection();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 Checking Gmail connection...');
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
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking Gmail connection:', error);
        return false;
      }

      if (data) {
        console.log('✅ Gmail connection found:', { id: data.id, email: data.email });
        setConnection(data);
        return true;
      }

      console.log('❌ No Gmail connection found');
      return false;
    } catch (err) {
      console.error('❌ Error checking Gmail connection:', err);
      return false;
    }
  }, []);

  const connectGmail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Construir URL de autorização OAuth 2.0 manual
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`;
      const state = `google_${session.user.id}`; // Incluir user_id no state para segurança
      
      // Debug: verificar se as variáveis estão configuradas
      console.log('🔍 Debug OAuth:', {
        clientId: clientId ? '✅ Configurado' : '❌ Vazio',
        redirectUri,
        state,
        sessionUserId: session.user.id
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

  const disconnectGmail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('email_connections')
        .delete()
        .eq('user_id', session.user.id)
        .eq('provider', 'google');

      if (error) {
        throw error;
      }

      setConnection(null);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Gmail');
      console.error('Error disconnecting Gmail:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    connection,
    loading,
    error,
    connectGmail,
    disconnectGmail,
    checkConnection,
    clearError,
  };
}; 