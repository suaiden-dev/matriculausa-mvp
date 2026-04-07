import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ReferralCaptureResult {
  referralCode: string | null;
  isValid: boolean | null;
  isLoading: boolean;
  isNoDiscount: boolean; // true quando veio via ?sref= (sem desconto)
  clearReferralCode: () => void;
}

const STORAGE_KEY = 'pending_seller_referral_code';
const STORAGE_KEY_NO_DISCOUNT = 'pending_seller_referral_code_nodiscount';

/**
 * Hook para capturar e validar códigos de referral de vendedores vindos da URL.
 * Salva o código no localStorage para uso posterior no registro.
 *
 * - ?ref=CODE  → vincula ao vendedor E aplica $50 de desconto
 * - ?sref=CODE → vincula ao vendedor SEM aplicar desconto (tracking only)
 */
export const useReferralCapture = (): ReferralCaptureResult => {
  const location = useLocation();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNoDiscount, setIsNoDiscount] = useState(false);

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
    } catch (err) {
      console.error('[useReferralCapture] Exceção ao validar código:', err);
      return false;
    }
  };

  // Função para limpar o código do localStorage
  const clearReferralCode = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_NO_DISCOUNT);
    setReferralCode(null);
    setIsValid(null);
    setIsNoDiscount(false);
    console.log('[useReferralCapture] Código removido do localStorage');
  };

  // Efeito para capturar código da URL ao montar o componente
  useEffect(() => {
    const captureReferralCode = async () => {
      const searchParams = new URLSearchParams(location.search);
      const refParam = searchParams.get('ref');
      const srefParam = searchParams.get('sref');

      // sref tem prioridade — é explicitamente sem desconto
      const paramCode = srefParam || refParam;
      const noDiscount = !!srefParam && !refParam;

      if (!paramCode) {
        // Sem código na URL — verificar se existe algum salvo
        const savedRegular = localStorage.getItem(STORAGE_KEY);
        const savedNoDiscount = localStorage.getItem(STORAGE_KEY_NO_DISCOUNT);
        const savedCode = savedRegular || savedNoDiscount;
        const savedIsNoDiscount = !savedRegular && !!savedNoDiscount;

        if (savedCode) {
          console.log('[useReferralCapture] Código encontrado no localStorage:', savedCode, savedIsNoDiscount ? '(sem desconto)' : '');
          setReferralCode(savedCode);
          setIsNoDiscount(savedIsNoDiscount);
          setIsLoading(true);
          const valid = await validateCode(savedCode);
          setIsValid(valid);
          if (!valid) clearReferralCode();
          setIsLoading(false);
        }
        return;
      }

      console.log('[useReferralCapture] Código detectado na URL:', paramCode, noDiscount ? '(sem desconto)' : '(com desconto)');

      setIsLoading(true);
      const valid = await validateCode(paramCode);

      if (valid) {
        const codeToSave = paramCode.toUpperCase();
        // Salvar na chave correta e limpar a outra para evitar conflito
        const targetKey = noDiscount ? STORAGE_KEY_NO_DISCOUNT : STORAGE_KEY;
        const otherKey = noDiscount ? STORAGE_KEY : STORAGE_KEY_NO_DISCOUNT;
        localStorage.removeItem(otherKey);
        localStorage.setItem(targetKey, codeToSave);
        setReferralCode(codeToSave);
        setIsNoDiscount(noDiscount);
        setIsValid(true);
        console.log('[useReferralCapture] Código salvo como', noDiscount ? 'NO_DISCOUNT' : 'COM_DESCONTO', ':', codeToSave);
      } else {
        setReferralCode(null);
        setIsValid(false);
        setIsNoDiscount(false);
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
    isNoDiscount,
    clearReferralCode,
  };
};
