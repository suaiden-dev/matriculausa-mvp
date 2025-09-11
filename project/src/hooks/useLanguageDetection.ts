import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageInfo {
  code: string;
  name: string;
  flag: string;
  isBrowserDefault: boolean;
}

const languages: LanguageInfo[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', isBrowserDefault: false },
  { code: 'pt', name: 'Português', flag: '🇧🇷', isBrowserDefault: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', isBrowserDefault: false }
];

export const useLanguageDetection = () => {
  const { i18n } = useTranslation();
  const [browserLanguage, setBrowserLanguage] = useState<string>('');
  const [detectedLanguages, setDetectedLanguages] = useState<LanguageInfo[]>([]);
  const [isApplied, setIsApplied] = useState(false);

  // Função para mapear idiomas do navegador para idiomas suportados
  const mapBrowserLanguage = (browserLang: string): string => {
    const lang = browserLang.toLowerCase();
    
    // Mapeamento direto
    if (['en', 'en-us', 'en-gb', 'en-ca', 'en-au'].includes(lang)) return 'en';
    if (['pt', 'pt-br', 'pt-pt'].includes(lang)) return 'pt';
    if (['es', 'es-es', 'es-mx', 'es-ar', 'es-cl', 'es-co', 'es-pe'].includes(lang)) return 'es';
    
    // Fallback para idiomas similares
    if (lang.startsWith('pt')) return 'pt';
    if (lang.startsWith('es')) return 'es';
    
    // Fallback para inglês como padrão universal
    return 'en';
  };

  // Detectar idiomas do navegador
  const detectBrowserLanguages = () => {
    const browserLangs = navigator.languages || [navigator.language || 'en'];
    const primaryLang = mapBrowserLanguage(browserLangs[0]);
    
    setBrowserLanguage(primaryLang);
    
    // Marcar o idioma detectado como padrão do navegador
    const updatedLanguages = languages.map(lang => ({
      ...lang,
      isBrowserDefault: lang.code === primaryLang
    }));
    
    setDetectedLanguages(updatedLanguages);
    
    return primaryLang;
  };

  // Função para forçar a aplicação do idioma detectado
  const forceApplyDetectedLanguage = async () => {
    if (!browserLanguage) return;
    
    try {
      console.log('🔄 Forçando aplicação do idioma detectado:', browserLanguage);
      
      // Mudar idioma da aplicação
      await i18n.changeLanguage(browserLanguage);
      
      // Salvar no localStorage
      localStorage.setItem('i18nextLng', browserLanguage);
      
      setIsApplied(true);
      console.log('✅ Idioma detectado aplicado com sucesso:', browserLanguage);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao aplicar idioma detectado:', error);
      return false;
    }
  };

  // Obter idioma preferido do usuário
  const getPreferredLanguage = (): string => {
    // Verificar localStorage primeiro (preferência salva do usuário)
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && ['en', 'pt', 'es'].includes(savedLang)) {
      return savedLang;
    }
    
    // Retornar idioma detectado do navegador
    return browserLanguage || 'en';
  };

  // Verificar se um idioma é o padrão do navegador
  const isBrowserDefault = (languageCode: string): boolean => {
    return languageCode === browserLanguage;
  };

  // Obter informações completas de um idioma
  const getLanguageInfo = (languageCode: string): LanguageInfo | undefined => {
    return detectedLanguages.find(lang => lang.code === languageCode);
  };

  // Verificar se o idioma detectado foi aplicado
  const checkIfDetectedLanguageApplied = (): boolean => {
    return i18n.language === browserLanguage;
  };

  useEffect(() => {
    // Detectar idiomas na montagem
    const detectedLang = detectBrowserLanguages();
    
    // Verificar se o idioma detectado já está aplicado
    if (i18n.isInitialized && i18n.language !== detectedLang) {
      forceApplyDetectedLanguage();
    }
  }, []);

  // Monitorar mudanças de idioma
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('🌍 Idioma mudou para:', lng);
      
      // Verificar se o idioma detectado foi aplicado
      if (lng === browserLanguage) {
        setIsApplied(true);
      } else {
        setIsApplied(false);
      }
    };

    if (i18n.isInitialized) {
      i18n.on('languageChanged', handleLanguageChange);
    }

    return () => {
      if (i18n.isInitialized) {
        i18n.off('languageChanged', handleLanguageChange);
      }
    };
  }, [i18n, browserLanguage]);

  return {
    browserLanguage,
    detectedLanguages,
    getPreferredLanguage,
    isBrowserDefault,
    getLanguageInfo,
    mapBrowserLanguage,
    forceApplyDetectedLanguage,
    isApplied,
    checkIfDetectedLanguageApplied
  };
};
