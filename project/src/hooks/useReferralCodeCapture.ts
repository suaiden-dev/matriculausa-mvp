import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useReferralCodeCapture = () => {
  const location = useLocation();

  useEffect(() => {
    // Captura código de referência da URL em qualquer página
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    
    if (refCode) {
      // Salva no localStorage se não existir ou se for diferente
      const existingCode = localStorage.getItem('pending_referral_code');
      if (!existingCode || existingCode !== refCode) {
        localStorage.setItem('pending_referral_code', refCode);
        console.log('[useReferralCodeCapture] Código de referência capturado e salvo:', refCode);
      }
    }
  }, [location.search]);

  return null;
};
