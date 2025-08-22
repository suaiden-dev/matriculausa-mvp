import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useReferralCodeCapture = () => {
  const location = useLocation();

  useEffect(() => {
    // Captura código de referência da URL em qualquer página
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    
    if (refCode) {
      console.log('[useReferralCodeCapture] Código detectado na URL:', refCode);
      
      // Detecta automaticamente o tipo de código baseado no formato
      const isSellerCode = refCode.startsWith('SELLER_') || refCode.length > 8;
      const isMatriculaRewardsCode = refCode.startsWith('MATR') || (refCode.length <= 8 && /^[A-Z0-9]+$/.test(refCode));
      
      console.log('[useReferralCodeCapture] Análise do código:', {
        code: refCode,
        isSellerCode,
        isMatriculaRewardsCode,
        length: refCode.length
      });
      
      if (isSellerCode) {
        // Código de seller - salva separadamente
        const existingSellerCode = localStorage.getItem('pending_seller_referral_code');
        if (!existingSellerCode || existingSellerCode !== refCode) {
          localStorage.setItem('pending_seller_referral_code', refCode);
          // IMPORTANTE: Limpar o código de Matricula Rewards se existir
          localStorage.removeItem('pending_referral_code');
          console.log('[useReferralCodeCapture] ✅ Código de seller capturado e salvo:', refCode);
        }
      } else if (isMatriculaRewardsCode) {
        // Código de Matricula Rewards - salva no campo original
        const existingCode = localStorage.getItem('pending_referral_code');
        if (!existingCode || existingCode !== refCode) {
          localStorage.setItem('pending_referral_code', refCode);
          // IMPORTANTE: Limpar o código de seller se existir
          localStorage.removeItem('pending_seller_referral_code');
          console.log('[useReferralCodeCapture] ✅ Código de Matricula Rewards capturado e salvo:', refCode);
        }
      } else {
        // Código não reconhecido - tenta salvar como Matricula Rewards por padrão
        const existingCode = localStorage.getItem('pending_referral_code');
        if (!existingCode || existingCode !== refCode) {
          localStorage.setItem('pending_referral_code', refCode);
          // IMPORTANTE: Limpar o código de seller se existir
          localStorage.removeItem('pending_seller_referral_code');
          console.log('[useReferralCodeCapture] ⚠️ Código não reconhecido, salvo como Matricula Rewards:', refCode);
        }
      }
    }
  }, [location.search]);

  return null;
};
