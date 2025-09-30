import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getOptimizedMsalConfig, clearMsalInstances, diagnoseAuthIssues } from '../lib/microsoftAuthConfig';

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
  setActiveConnection: (email: string) => Promise<void>;
  clearError: () => void;
  showSecurityWarning: boolean;
  setShowSecurityWarning: (show: boolean) => void;
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

      // Session found, checking Microsoft connections
      const { data, error } = await supabase
        .from('email_configurations')
        .select('id, user_id, email_address, oauth_access_token, oauth_refresh_token, is_active, created_at, updated_at')
        .eq('user_id', session.user.id)
        .eq('provider_type', 'microsoft')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error checking Microsoft connections:', error);
        console.error('❌ Error details:', { code: error.code, message: error.message, details: error.details });
        return false;
      }

      if (data && data.length > 0) {
        // Microsoft connections found
        const mapped = data.map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          email_address: row.email_address,
          access_token: row.oauth_access_token,
          refresh_token: row.oauth_refresh_token,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          isConnected: !!row.oauth_access_token,
        }));
        // Mapped connections
        setConnections(mapped);
        
        // Restaurar conta ativa do localStorage ou usar a mais recente
        const savedActiveEmail = localStorage.getItem(ACTIVE_MICROSOFT_CONNECTION_KEY);
        let activeConn = savedActiveEmail 
          ? mapped.find(conn => conn.email_address === savedActiveEmail)
          : null;
        
        // Se não encontrou a conta salva ou não há conta salva, usar a mais recente
        if (!activeConn && mapped.length > 0) {
          activeConn = mapped[0]; // A primeira é sempre a mais recente (order by created_at desc)
        }
        
        if (activeConn) {
          // Setting active connection
          console.log('✅ Setting active connection:', activeConn.email_address);
          setActiveConnectionState(activeConn as MicrosoftConnection);
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

  const setActiveConnection = useCallback(async (email: string) => {
    const connection = connections.find(conn => conn.email_address === email);
    
    if (connection) {
      setActiveConnectionState(connection);
      localStorage.setItem(ACTIVE_MICROSOFT_CONNECTION_KEY, email);
      
      // Atualizar conta ativa no MSAL
      try {
        const { MSALAccountManager } = await import('../lib/msalAccountManager');
        const msalInstance = await MSALAccountManager.getInstance().getMSALInstance();
        const accounts = msalInstance.getAllAccounts();
        const msalAccount = accounts.find(acc => acc.username === email);
        if (msalAccount) {
          msalInstance.setActiveAccount(msalAccount);
        }
      } catch (error) {
        console.warn('Erro ao definir conta ativa no MSAL:', error);
      }
      
      // Disparar evento para notificar outros componentes sobre a mudança
      window.dispatchEvent(new CustomEvent('microsoft-connection-updated'));
    } else {
      // Verificar se existe uma conta inativa com este email
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const { data: inactiveConnection } = await supabase
            .from('email_configurations')
            .select('*')
            .eq('user_id', session.session.user.id)
            .eq('provider_type', 'microsoft')
            .eq('email_address', email)
            .eq('is_active', false)
            .limit(1);
          
          if (inactiveConnection?.[0]) {
            // Reativar a conta inativa
            const { error: updateError } = await supabase
              .from('email_configurations')
              .update({ is_active: true })
              .eq('id', inactiveConnection[0].id);
            
            if (!updateError) {
              // Recarregar as conexões
              await checkConnections();
            }
          }
        }
      } catch (error) {
        console.error('Error trying to reactivate account:', error);
      }
    }
  }, [connections, checkConnections]);

  const connectMicrosoft = useCallback(async (forceNewLogin = false) => {
    try {
      setLoading(true);
      setError(null);


      // Diagnosticar problemas de configuração
      const issues = diagnoseAuthIssues();
      if (issues.length > 0) {
        console.warn('⚠️ Problemas de configuração detectados:', issues);
      }
      
      // Limpar instâncias MSAL duplicadas
      clearMsalInstances();
      
      // Limpar cache MSAL se há muitas contas
      if ((window as any).msalInstance) {
        const accounts = (window as any).msalInstance.getAllAccounts();
        if (accounts.length > 3) {
          try {
            await (window as any).msalInstance.clearCache();
          } catch (error) {
            console.warn('⚠️ Erro ao limpar cache MSAL:', error);
          }
        }
      }
      
      // Usar MSAL para autorização com PKCE automático
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const msalConfig = getOptimizedMsalConfig();
      
      // Verificar se já existe uma instância MSAL
      const existingInstance = (window as any).msalInstance;
      let msalInstance;
      
      if (existingInstance) {
        msalInstance = existingInstance;
      } else {
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
              scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
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
        scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
        prompt: 'consent', // FORÇAR CONSENTIMENTO para obter refresh token
        extraQueryParameters: {
          'prompt': 'consent', // Forçar consentimento para obter refresh token
          'response_mode': 'query',
          'scope': 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access' // Adicionar scope explicitamente
        }
      }).catch(async (error: any) => {
        console.error('❌ Erro no login popup:', error);
        
        // Se popup falhar, tentar redirect
        if (error.errorCode === 'popup_window_error' || error.errorCode === 'user_cancelled') {
          console.log('🔄 Popup falhou, tentando redirect...');
          return await msalInstance.loginRedirect({
            scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
            prompt: 'consent', // FORÇAR CONSENTIMENTO para obter refresh token
            extraQueryParameters: {
              'prompt': 'consent',
              'scope': 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'
            }
          });
        }
        throw error;
      });


      // Mostrar aviso de segurança após login bem-sucedido
      setShowSecurityWarning(true);
      
      // Verificar se temos refresh token
      if (loginResponse.refreshToken) {
      } else {
        
        // Tentar obter refresh token via acquireTokenSilent
        try {
          const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
            account: loginResponse.account,
            forceRefresh: false
          });
          
          console.log('🔍 DEBUG - tokenResponse do acquireTokenSilent:', {
            hasAccessToken: !!tokenResponse.accessToken,
            hasRefreshToken: !!tokenResponse.refreshToken,
            hasExpiresOn: !!tokenResponse.expiresOn
          });
          
          if (tokenResponse.refreshToken) {
            loginResponse.refreshToken = tokenResponse.refreshToken;
          } else {
          }
        } catch (tokenError) {
        }
      }
      
      // SOLUÇÃO ALTERNATIVA: Tentar obter refresh token via acquireTokenPopup
      if (!loginResponse.refreshToken) {
        try {
          const popupResponse = await msalInstance.acquireTokenPopup({
            scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
            account: loginResponse.account,
            prompt: 'consent'
          });
          
          console.log('🔍 DEBUG - popupResponse:', {
            hasAccessToken: !!popupResponse.accessToken,
            hasRefreshToken: !!popupResponse.refreshToken,
            hasExpiresOn: !!popupResponse.expiresOn
          });
          
          if (popupResponse.refreshToken) {
            loginResponse.refreshToken = popupResponse.refreshToken;
          } else {
          }
        } catch (popupError) {
        }
      }
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
      

      // Salvar tokens na tabela COM REFRESH TOKEN
      
      const { data: existingConfigs } = await supabase
        .from('email_configurations')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('email_address', userEmail)
        .eq('provider_type', 'microsoft')
        .limit(1);
      
      const existingConfig = existingConfigs?.[0];

      if (existingConfig?.id) {
        const { error: updateError } = await supabase
          .from('email_configurations')
          .update({
            oauth_access_token: loginResponse.accessToken,
            oauth_refresh_token: loginResponse.refreshToken || '', // SALVAR REFRESH TOKEN
            oauth_token_expires_at: loginResponse.expiresOn?.toISOString() || new Date(Date.now() + 3600 * 1000).toISOString(),
            is_active: true
          })
          .eq('id', existingConfig.id)
          .select()
          .limit(1);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('email_configurations')
          .insert([{
            user_id: session.user.id,
            name: 'Microsoft Account',
            email_address: userEmail,
            provider_type: 'microsoft',
            oauth_access_token: loginResponse.accessToken,
            oauth_refresh_token: loginResponse.refreshToken || '', // SALVAR REFRESH TOKEN
            oauth_token_expires_at: loginResponse.expiresOn?.toISOString() || new Date(Date.now() + 3600 * 1000).toISOString(),
            is_active: true
          }])
          .select()
          .limit(1);
        if (insertError) throw insertError;
      }

      // conexão salva/atualizada com sucesso

      
      // Recarregar conexões
      await checkConnections();
      

    } catch (err: any) {
      console.error('❌ Error in handleSuccessfulLogin:', err);
      throw err; // Re-throw para ser tratado pelo connectMicrosoft
    }
  };

  const disconnectMicrosoft = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);


      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Buscar a conexão específica
      const { data: connections, error: fetchError } = await supabase
        .from('email_configurations')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('email_address', email)
        .eq('provider_type', 'microsoft')
        .limit(1);
      
      const connection = connections?.[0];

      if (fetchError || !connection) {
        throw new Error('Connection not found');
      }

      // Remover a conexão
      const { error: deleteError } = await supabase
        .from('email_configurations')
        .delete()
        .eq('id', connection.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }


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

  // Detectar quando uma nova conta foi adicionada e defini-la como ativa
  useEffect(() => {
    if (connections.length > 0) {
      const savedActiveEmail = localStorage.getItem(ACTIVE_MICROSOFT_CONNECTION_KEY);
      const hasActiveConnection = savedActiveEmail && connections.find(conn => conn.email_address === savedActiveEmail);
      
      // Se não há conta ativa salva ou a conta salva não existe mais, usar a mais recente
      if (!hasActiveConnection) {
        const newestConnection = connections[0]; // A primeira é sempre a mais recente
        if (newestConnection) {
          setActiveConnectionState(newestConnection);
          localStorage.setItem(ACTIVE_MICROSOFT_CONNECTION_KEY, newestConnection.email_address);
        }
      }
    }
  }, [connections]);

  // Escutar eventos de atualização das conexões Microsoft
  useEffect(() => {
    const handleMicrosoftConnectionUpdate = () => {
      // Apenas recarregar se não estiver já carregando
      if (!loading) {
        checkConnections();
      }
    };

    window.addEventListener('microsoft-connection-updated', handleMicrosoftConnectionUpdate);
    
    return () => {
      window.removeEventListener('microsoft-connection-updated', handleMicrosoftConnectionUpdate);
    };
  }, [checkConnections, loading]);

  return {
    connections,
    activeConnection,
    loading,
    error,
    connectMicrosoft,
    disconnectMicrosoft,
    setActiveConnection,
    clearError,
    showSecurityWarning,
    setShowSecurityWarning
  };
};
