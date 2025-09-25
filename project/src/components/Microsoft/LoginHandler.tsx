'use client';

import { useMsal } from '@azure/msal-react';
import { useEffect } from 'react';

export default function MicrosoftLoginHandler() {
  const { instance, accounts } = useMsal();

  useEffect(() => {
    console.log('LoginHandler - useEffect executado, accounts.length:', accounts.length);
    console.log('LoginHandler - accounts:', accounts);
    
    // Verificar se há uma conta após redirect
    if (accounts.length > 0) {
      console.log('Login realizado com sucesso:', accounts[0]);
    } else {
      console.log('LoginHandler - Nenhuma conta encontrada');
    }
  }, [accounts]);

  return null; // Este componente não renderiza nada
}
