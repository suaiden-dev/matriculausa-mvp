import { useMsal } from '@azure/msal-react';
import { graphScopes } from '../lib/msalConfig';
import { useCallback } from 'react';

export const useAuthToken = () => {
  const { instance, accounts } = useMsal();
  
  console.log('useAuthToken - accounts.length:', accounts.length);
  console.log('useAuthToken - accounts:', accounts);

  const getToken = useCallback(async () => {
    if (accounts.length === 0) {
      throw new Error('Nenhuma conta encontrada');
    }

    // Verificar se MSAL está inicializado
    if (!instance.getConfiguration()) {
      throw new Error('MSAL não inicializado');
    }

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
    }
  }, [instance, accounts]);

  return { getToken, accounts };
};
