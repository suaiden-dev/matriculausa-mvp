import { useCallback } from 'react';
import { generateShareableLink, getStoredUtmParams } from '../utils/utmTracker';

/**
 * Hook para gerar link de compartilhamento com UTM orgânico
 * 
 * Quando uma aluna quer compartilhar o link do Brant com uma amiga,
 * este hook gera um link personalizado que marca o tráfego como orgânico.
 * 
 * @returns Função para obter link de compartilhamento
 * 
 * @example
 * const { getShareableLink } = useUtmShareLink();
 * const link = getShareableLink('Maria Silva');
 * // Retorna: https://matriculausa.com/register?ref=BRANT&utm_source=brant&utm_medium=organic&gs=1&client=Maria%20Silva
 */
export const useUtmShareLink = () => {
  /**
   * Gera link de compartilhamento com parâmetros UTM orgânicos
   * 
   * O link gerado sempre inclui:
   * - ref=BRANT (código do seller)
   * - utm_source=brant (origem)
   * - utm_medium=organic (marca como tráfego orgânico)
   * - gs=1 (identificador de compartilhamento)
   * - client=nome ou email (se fornecido)
   * 
   * Se houver parâmetros UTM salvos no localStorage (ex: campanha),
   * eles também serão incluídos no link.
   * 
   * @param clientName - Nome do cliente que está compartilhando (opcional)
   * @param clientEmail - Email do cliente que está compartilhando (opcional)
   * @returns URL completa pronta para compartilhar
   */
  const getShareableLink = useCallback((clientName?: string, clientEmail?: string): string => {
    // Lê UTM atual do localStorage (se existir)
    const storedUtm = getStoredUtmParams();
    
    // Gera link de compartilhamento
    const link = generateShareableLink(storedUtm, clientName, clientEmail);
    
    console.log('[useUtmShareLink] 🔗 Link gerado para compartilhamento:', link);
    
    return link;
  }, []);

  return {
    getShareableLink,
  };
};

