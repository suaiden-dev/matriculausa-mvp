import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const useReferralCodeCapture = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log('[useReferralCodeCapture] 🚀 Hook inicializado');

  useEffect(() => {
    console.log('[useReferralCodeCapture] 🔍 Hook executado - pathname:', location.pathname, 'search:', location.search);
    console.log('[useReferralCodeCapture] 🔍 URL completa:', window.location.href);
    console.log('[useReferralCodeCapture] 🔍 Timestamp:', new Date().toISOString());
    
    // NÃO executar na página de SellerStudentRegistration para evitar conflitos
    if (location.pathname === '/student/register') {
      console.log('[useReferralCodeCapture] ⚠️ Página SellerStudentRegistration detectada, não executando hook');
      return;
    }

    // Captura código de referência da URL em qualquer página
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    const sellerRegCode = params.get('code'); // Código de registro de seller

    console.log('[useReferralCodeCapture] 🔍 Parâmetros da URL:', { refCode, sellerRegCode, search: location.search });
    
    if (refCode) {
      console.log('[useReferralCodeCapture] ✅ Código de referência detectado na URL:', refCode);
      
      // LÓGICA SIMPLES: Igual ao Matricula Rewards
      // Detecta automaticamente o tipo de código baseado no formato
      const isSellerCode = refCode.startsWith('SELLER_') || refCode.length > 8;
      const isMatriculaRewardsCode = refCode.startsWith('MATR') || (refCode.length <= 8 && /^[A-Z0-9]+$/.test(refCode));
      
      console.log('[useReferralCodeCapture] Análise do código de referência:', {
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
          localStorage.removeItem('pending_affiliate_code');
          console.log('[useReferralCodeCapture] ✅ Código de seller capturado e salvo:', refCode);
        }
      } else if (isMatriculaRewardsCode) {
        // Código de Matricula Rewards - salva no campo original
        const existingCode = localStorage.getItem('pending_affiliate_code');
        if (!existingCode || existingCode !== refCode) {
          localStorage.setItem('pending_affiliate_code', refCode);
          // IMPORTANTE: Limpar o código de seller se existir
          localStorage.removeItem('pending_seller_referral_code');
          console.log('[useReferralCodeCapture] ✅ Código de Matricula Rewards capturado e salvo:', refCode);
        }
      } else {
        // Código não reconhecido - tenta salvar como Matricula Rewards por padrão
        const existingCode = localStorage.getItem('pending_affiliate_code');
        if (!existingCode || existingCode !== refCode) {
          localStorage.setItem('pending_affiliate_code', refCode);
          // IMPORTANTE: Limpar o código de seller se existir
          localStorage.removeItem('pending_seller_referral_code');
          console.log('[useReferralCodeCapture] ⚠️ Código não reconhecido, salvo como Matricula Rewards:', refCode);
        }
      }
    }

    // Captura código de registro de seller
    if (sellerRegCode) {
      console.log('[useReferralCodeCapture] Código de registro de seller detectado na URL:', sellerRegCode);
      
      const existingRegCode = localStorage.getItem('pending_seller_registration_code');
      if (!existingRegCode || existingRegCode !== sellerRegCode) {
        localStorage.setItem('pending_seller_registration_code', sellerRegCode);
        console.log('[useReferralCodeCapture] ✅ Código de registro de seller capturado e salvo:', sellerRegCode);
      }
    }
    
    // Log quando não há códigos de referência
    if (!refCode && !sellerRegCode) {
      console.log('[useReferralCodeCapture] ℹ️ Nenhum código de referência encontrado na URL');
    } else {
      console.log('[useReferralCodeCapture] ✅ Códigos encontrados - refCode:', refCode, 'sellerRegCode:', sellerRegCode);
    }
  }, [location.search, location.pathname]);

  return null;
};