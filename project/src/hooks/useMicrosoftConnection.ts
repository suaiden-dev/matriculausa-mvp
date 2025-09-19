import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
}

export interface UseMicrosoftConnectionReturn {
  connections: MicrosoftConnection[];
  activeConnection: MicrosoftConnection | null;
  loading: boolean;
  error: string | null;
  connectMicrosoft: () => Promise<void>;
  disconnectMicrosoft: (email: string) => Promise<void>;
  setActiveConnection: (email: string) => void;
  clearError: () => void;
}

export const useMicrosoftConnection = (): UseMicrosoftConnectionReturn => {
  const [connections, setConnections] = useState<MicrosoftConnection[]>([]);
  const [activeConnection, setActiveConnectionState] = useState<MicrosoftConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkConnections = useCallback(async (): Promise<boolean> => {
    try {
      // console.log('🔍 Checking Microsoft connections...');
      let { data: { session } } = await supabase.auth.getSession();
      
      // Se não há sessão, tentar obter a sessão atual
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

      console.log('🔍 Session found, checking email_connections for user:', session.user.id);
      const { data, error } = await supabase
        .from('email_processing_configs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error checking Microsoft connections:', error);
        console.error('❌ Error details:', { code: error.code, message: error.message, details: error.details });
        return false;
      }

      if (data && data.length > 0) {
        console.log('✅ Microsoft connections found:', data.length);
        setConnections(data);
        
        // Restaurar conta ativa do localStorage ou usar a primeira
        const savedActiveEmail = localStorage.getItem(ACTIVE_MICROSOFT_CONNECTION_KEY);
        const activeConn = savedActiveEmail 
          ? data.find(conn => conn.email_address === savedActiveEmail)
          : data[0];
        
        if (activeConn) {
          console.log('🔄 Setting active connection:', activeConn.email_address);
          setActiveConnectionState(activeConn);
          localStorage.setItem(ACTIVE_MICROSOFT_CONNECTION_KEY, activeConn.email_address);
        } else {
          console.log('⚠️ No active connection found');
        }
        
        return true;
      }

      console.log('❌ No Microsoft connections found');
      setConnections([]);
      setActiveConnectionState(null);
      localStorage.removeItem(ACTIVE_MICROSOFT_CONNECTION_KEY);
      return false;
    } catch (err) {
      console.error('❌ Error checking Microsoft connections:', err);
      return false;
    }
  }, []);

  const setActiveConnection = useCallback((email: string) => {
    console.log('🔄 Setting active Microsoft connection:', email);
    const connection = connections.find(conn => conn.email_address === email);
    if (connection) {
      setActiveConnectionState(connection);
      localStorage.setItem(ACTIVE_MICROSOFT_CONNECTION_KEY, email);
      console.log('✅ Active Microsoft connection set:', email);
    } else {
      console.error('❌ Connection not found for email:', email);
    }
  }, [connections]);

  const connectMicrosoft = useCallback(async (forceNewLogin = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔗 Iniciando conexão com Microsoft...', forceNewLogin ? '(forçando novo login)' : '');

      // Usar MSAL para autorização com PKCE automático
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const { msalConfig } = await import('../lib/msalConfig');
      
      // Verificar se já existe uma instância MSAL
      const existingInstance = (window as any).msalInstance;
      let msalInstance;
      
      if (existingInstance) {
        console.log('🔄 Reutilizando instância MSAL existente');
        msalInstance = existingInstance;
      } else {
        console.log('🆕 Criando nova instância MSAL');
        msalInstance = new PublicClientApplication(msalConfig);
        
        // Inicializar MSAL
        await msalInstance.initialize();
        
        // Armazenar instância globalmente para reutilização
        (window as any).msalInstance = msalInstance;
      }
      
      // Verificar se já há uma conta logada (apenas se não forçar novo login)
      if (!forceNewLogin) {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          console.log('👤 Conta já logada encontrada, tentando token silencioso...');
          try {
            const silentResponse = await msalInstance.acquireTokenSilent({
              scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send'],
              account: accounts[0]
            });
            
            console.log('✅ Token silencioso obtido com sucesso');
            await handleSuccessfulLogin(silentResponse);
            return;
          } catch (silentError) {
            console.log('⚠️ Token silencioso falhou, tentando login interativo...');
          }
        }
      } else {
        console.log('🔄 Forçando novo login, pulando token silencioso...');
      }
      
      // Fazer login com popup para evitar redirecionamento
      console.log('🔐 Iniciando login interativo...');
      const loginResponse = await msalInstance.loginPopup({
        scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send'],
        prompt: 'select_account',
        extraQueryParameters: {
          'prompt': 'consent'
        }
      });

      console.log('✅ Microsoft login successful:', loginResponse.account?.username);
      await handleSuccessfulLogin(loginResponse);

    } catch (err: any) {
      console.error('❌ Error connecting to Microsoft:', err);
      
      // Tratar erros específicos
      if (err.errorCode === 'user_cancelled') {
        setError('Login cancelado pelo usuário');
      } else if (err.errorCode === 'popup_window_error') {
        setError('Erro no popup. Verifique se os popups estão habilitados no navegador');
      } else if (err.message?.includes('window closed')) {
        setError('Popup foi fechado prematuramente. Tente novamente');
      } else {
        setError(err.message || 'Falha ao conectar com Microsoft. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSuccessfulLogin = async (loginResponse: any) => {
    try {
      // Buscar informações do usuário
      console.log('📧 Buscando informações do usuário...');
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${loginResponse.accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error(`Erro ao buscar informações do usuário: ${userInfoResponse.status}`);
      }

      const userInfo = await userInfoResponse.json();
      const userEmail = userInfo.mail || userInfo.userPrincipalName;
      
      console.log('👤 Usuário identificado:', userEmail);

      // Buscar user_id do contexto atual
      let { data: { session } } = await supabase.auth.getSession();
      
      // Se não há sessão, tentar obter a sessão atual
      if (!session?.user) {
        console.log('⚠️ Sessão não encontrada, tentando obter sessão atual...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('❌ Erro ao obter usuário:', userError);
          throw new Error('Usuário não autenticado no sistema. Faça login no sistema primeiro.');
        }
        session = { user } as any;
      }
      
      if (!session?.user) {
        throw new Error('User not authenticated');
      }
      
      console.log('✅ Usuário autenticado:', session.user.id);

      // Salvar tokens na tabela
      console.log('💾 Salvando conexão no banco de dados...');
      const { data: connectionData, error: insertError } = await supabase
        .from('email_processing_configs')
        .upsert({
          user_id: session.user.id,
          email_address: userEmail,
          access_token: loginResponse.accessToken,
          refresh_token: 'msal_token',
          is_active: true
        }, {
          onConflict: 'user_id,email_address'
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao salvar conexão:', insertError);
        throw insertError;
      }

      console.log('✅ Microsoft connection saved:', connectionData);
      
      // Recarregar conexões
      await checkConnections();
      
      console.log('🎉 Conexão Microsoft estabelecida com sucesso!');

    } catch (err: any) {
      console.error('❌ Error in handleSuccessfulLogin:', err);
      throw err; // Re-throw para ser tratado pelo connectMicrosoft
    }
  };

  const disconnectMicrosoft = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Disconnecting Microsoft connection:', email);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Buscar a conexão específica
      const { data: connection, error: fetchError } = await supabase
        .from('email_processing_configs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('email_address', email)
        .single();

      if (fetchError || !connection) {
        throw new Error('Connection not found');
      }

      // Remover a conexão
      const { error: deleteError } = await supabase
        .from('email_processing_configs')
        .delete()
        .eq('id', connection.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      console.log('✅ Microsoft connection disconnected:', email);

      // Atualizar estado local
      await checkConnections();

      // Se a conexão desconectada era a ativa, limpar
      if (activeConnection?.email_address === email) {
        setActiveConnectionState(null);
        localStorage.removeItem(ACTIVE_MICROSOFT_CONNECTION_KEY);
      }

    } catch (err: any) {
      console.error('❌ Error disconnecting Microsoft:', err);
      setError(err.message || 'Failed to disconnect Microsoft account');
    } finally {
      setLoading(false);
    }
  }, [activeConnection, checkConnections]);

  // Verificar conexões na inicialização
  useEffect(() => {
    // Aguardar um pouco para garantir que o MSAL está inicializado
    const timer = setTimeout(() => {
      checkConnections();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [checkConnections]);

  return {
    connections,
    activeConnection,
    loading,
    error,
    connectMicrosoft,
    disconnectMicrosoft,
    setActiveConnection,
    clearError
  };
};
