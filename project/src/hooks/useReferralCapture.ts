import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ReferralCaptureResult {
  referralCode: string | null;
  isValid: boolean | null;
  isLoading: boolean;
  clearReferralCode: () => void;
}

const STORAGE_KEY = 'pending_seller_referral_code';

/**
 * Hook para capturar e validar códigos de referral de vendedores vindos da URL
 * Salva o código no localStorage para uso posterior no registro
 */
export const useReferralCapture = (): ReferralCaptureResult => {
  const location = useLocation();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Função para validar o código contra a tabela sellers
  const validateCode = async (code: string): Promise<boolean> => {
    try {
      console.log('[useReferralCapture] Validando código:', code);
      
      const { data, error } = await supabase
        .from('sellers')
        .select('id, referral_code, is_active')
        .eq('referral_code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('[useReferralCapture] Erro ao validar código:', error);
        return false;
      }

      const valid = !!data;
      console.log('[useReferralCapture] Código válido:', valid, data);
      return valid;
    } catch (error) {
      console.error('[useReferralCapture] Exceção ao validar código:', error);
      return false;
    }
  };

  // Função para limpar o código do localStorage
  const clearReferralCode = () => {
    localStorage.removeItem(STORAGE_KEY);
    setReferralCode(null);
    setIsValid(null);
    console.log('[useReferralCapture] Código removido do localStorage');
  };

  // Efeito para capturar código da URL ao montar o componente
  useEffect(() => {
    const captureReferralCode = async () => {
      // Ler query params da URL
      const searchParams = new URLSearchParams(location.search);
      const refParam = searchParams.get('ref');

      if (!refParam) {
        // Sem código na URL - verificar se existe algum salvo
        const savedCode = localStorage.getItem(STORAGE_KEY);
        if (savedCode) {
          console.log('[useReferralCapture] Código encontrado no localStorage:', savedCode);
          setReferralCode(savedCode);
          // Validar código salvo para garantir que ainda é válido
          setIsLoading(true);
          const valid = await validateCode(savedCode);
          setIsValid(valid);
          if (!valid) {
            // Se código salvo não é mais válido, remover
            clearReferralCode();
          }
          setIsLoading(false);
        }
        return;
      }

      console.log('[useReferralCapture] Código detectado na URL:', refParam);
      
      // Verificar se já existe um código diferente salvo
      const savedCode = localStorage.getItem(STORAGE_KEY);
      if (savedCode && savedCode !== refParam.toUpperCase()) {
        console.log('[useReferralCapture] Substituindo código anterior:', savedCode);
      }

      // Validar código da URL
      setIsLoading(true);
      const valid = await validateCode(refParam);
      
      if (valid) {
        // Salvar código no localStorage
        const codeToSave = refParam.toUpperCase();
        localStorage.setItem(STORAGE_KEY, codeToSave);
        setReferralCode(codeToSave);
        setIsValid(true);
        console.log('[useReferralCapture] Código válido salvo no localStorage:', codeToSave);
      } else {
        setReferralCode(null);
        setIsValid(false);
        console.log('[useReferralCapture] Código inválido, não foi salvo');
      }
      
      setIsLoading(false);
    };

    captureReferralCode();
  }, [location.search]);

  return {
    referralCode,
    isValid,
    isLoading,
    clearReferralCode
  };
};
