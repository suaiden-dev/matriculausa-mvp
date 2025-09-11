import { useTranslation } from 'react-i18next';
import { useFeeConfig } from './useFeeConfig';

/**
 * Hook personalizado que combina useTranslation com processamento de placeholders de taxas
 * Substitui automaticamente placeholders como ${selectionProcessFee} pelos valores reais das taxas
 */
export const useTranslationWithFees = () => {
  const { t } = useTranslation();
  const { processTranslation } = useFeeConfig();

  /**
   * Função que traduz e processa placeholders de taxas
   * @param key - Chave da tradução
   * @param options - Opções do i18next
   * @returns Texto traduzido com valores das taxas substituídos
   */
  const tWithFees = (key: string, options?: any) => {
    const translatedText = t(key, options);
    
    // Se for um array (como items), retorna sem processar
    if (Array.isArray(translatedText)) {
      return translatedText;
    }
    
    // Se for um objeto, retorna sem processar
    if (typeof translatedText === 'object' && translatedText !== null) {
      return translatedText;
    }
    
    return processTranslation(translatedText);
  };

  return {
    t: tWithFees,
    tRaw: t, // Versão original sem processamento de taxas
    processTranslation
  };
};
