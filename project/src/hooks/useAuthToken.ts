import { useMsal } from '@azure/msal-react';
import { graphScopes } from '../lib/msalConfig';
import { useCallback, useRef } from 'react';
import ImprovedTokenRenewalService from '../lib/improvedTokenRenewal';
import { useAuth } from './useAuth';

export const useAuthToken = () => {
  const { instance, accounts } = useMsal();
  const { user } = useAuth();
  const isGettingToken = useRef(false);
  
  // console.log('useAuthToken - accounts.length:', accounts.length);

  const getToken = useCallback(async () => {
    if (accounts.length === 0) {
      throw new Error('Nenhuma conta encontrada');
    }

    // Verificar se MSAL está inicializado
    if (!instance.getConfiguration()) {
      throw new Error('MSAL não inicializado');
    }

    // Proteção contra múltiplas chamadas simultâneas
    if (isGettingToken.current) {
      console.log('Token já sendo obtido, aguardando...');
      // Aguardar um pouco e tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (isGettingToken.current) {
        throw new Error('Token em processo, tente novamente em alguns segundos');
      }
    }

    isGettingToken.current = true;

    try {
      // Tentar token silencioso primeiro com configurações otimizadas
      console.log('Tentando token silencioso...');
      
      // Usar a conta ativa do MSAL se disponível, senão usar a primeira
      const activeAccount = instance.getActiveAccount() || accounts[0];
      
      const response = await instance.acquireTokenSilent({
        scopes: graphScopes,
        account: activeAccount,
        forceRefresh: false, // Não forçar refresh desnecessário
        extraQueryParameters: {
          'prompt': 'none' // Evitar prompts desnecessários
        }
      });
      console.log('Token silencioso obtido com sucesso');
      return response.accessToken;
    } catch (silentError: any) {
      console.log('Token silencioso falhou:', silentError.message);
      
      // Verificar se é erro de token expirado ou problema de rede
      if (silentError.errorCode === 'token_expired' || 
          silentError.errorCode === 'invalid_grant' ||
          silentError.message?.includes('expired')) {
        console.log('Token expirado, tentando renovação...');
        
        try {
          // Tentar renovação usando o novo serviço melhorado
          if (user && accounts[0]?.username) {
            console.log('🔄 Tentando renovação usando serviço melhorado...');
            const renewalService = ImprovedTokenRenewalService.getInstance();
            const newToken = await renewalService.getValidToken(user.id, accounts[0].username);
            
            if (newToken) {
              console.log('✅ Token renovado com sucesso via serviço melhorado');
              return newToken;
            }
          }
          
          // Fallback: tentar renovação via MSAL
          const refreshResponse = await instance.acquireTokenSilent({
            scopes: graphScopes,
            account: accounts[0],
            forceRefresh: true, // Forçar renovação
            extraQueryParameters: {
              'prompt': 'none'
            }
          });
          console.log('Token renovado com sucesso via MSAL');
          return refreshResponse.accessToken;
        } catch (refreshError) {
          console.log('Renovação falhou, tentando login interativo...');
        }
      }
      
      try {
        // Verificar se há interação em progresso
        const inProgress = instance.getActiveAccount();
        if (inProgress) {
          console.log('Interação já em progresso, aguardando...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Se falhar, tentar login interativo
        const response = await instance.acquireTokenPopup({
          scopes: graphScopes,
          account: accounts[0],
          prompt: 'select_account', // Permitir seleção de conta
          extraQueryParameters: {
            'prompt': 'consent' // Forçar consentimento para renovar tokens
          }
        });
        console.log('Token interativo obtido com sucesso');
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Erro ao obter token:', interactiveError);
        throw new Error('Falha na autenticação. Tente fazer login novamente.');
      }
    } finally {
      isGettingToken.current = false;
    }
  }, [instance, accounts]);

  return { getToken, accounts };
};
