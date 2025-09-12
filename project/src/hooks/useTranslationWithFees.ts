import { useTranslation } from 'react-i18next';
import { useFeeConfig } from './useFeeConfig';

/**
 * Hook personalizado que combina useTranslation com processamento de placeholders de taxas
 * Substitui automaticamente placeholders como ${selectionProcessFee} pelos valores reais das taxas
 */
export const useTranslationWithFees = () => {
  const { t } = useTranslation();
  const { processTranslation } = useFeeConfig(undefined);

  /**
   * Função que traduz e processa placeholders de taxas
   * @param key - Chave da tradução
   * @param options - Opções do i18next
   * @returns Texto traduzido com valores das taxas substituídos
   */
  const tWithFees = (key: string, options?: any): string => {
    const translatedText = t(key, options);
    
    // Se for um array (como items), retorna como string
    if (Array.isArray(translatedText)) {
      return translatedText.join(' ');
    }
    
    // Se for um objeto, retorna como string
    if (typeof translatedText === 'object' && translatedText !== null) {
      return JSON.stringify(translatedText);
    }
    
    // Se for string, processa os placeholders
    if (typeof translatedText === 'string') {
      return processTranslation(translatedText);
    }
    
    return String(translatedText || '');
  };

  return {
    t: tWithFees,
    tRaw: (key: string, options?: any): string => {
      const result = t(key, options);
      if (Array.isArray(result)) {
        return result.join(' ');
      }
      if (typeof result === 'object' && result !== null) {
        return JSON.stringify(result);
      }
      return String(result || '');
    }, // Versão original sem processamento de taxas
    processTranslation
  };
};
