import { useMsal } from '@azure/msal-react';
import { graphScopes } from '../lib/msalConfig';
import { useCallback, useRef } from 'react';

export const useAuthToken = () => {
  const { instance, accounts } = useMsal();
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
      // Tentar token silencioso primeiro
      console.log('Tentando token silencioso...');
      const response = await instance.acquireTokenSilent({
        scopes: graphScopes,
        account: accounts[0],
      });
      console.log('Token silencioso obtido com sucesso');
      return response.accessToken;
    } catch (silentError) {
      console.log('Token silencioso falhou, tentando login interativo...');
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
