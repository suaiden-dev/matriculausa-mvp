import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ✅ OTIMIZAÇÃO: Lazy loading de traduções
// Carregar apenas o idioma necessário, não todos de uma vez
const resources = {
  en: {
    translation: () => import('./locales/en.json')
  },
  pt: {
    translation: () => import('./locales/pt.json')
  },
  es: {
    translation: () => import('./locales/es.json')
  }
};

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

// Função para obter idioma preferido do usuário
const getPreferredLanguage = (): string => {
  // Verificar localStorage primeiro (preferência salva do usuário)
  const savedLang = localStorage.getItem('i18nextLng');
  const isFirstVisit = !localStorage.getItem('i18n_initialized');
  
  // Detectar idioma do navegador
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  const mappedLang = mapBrowserLanguage(browserLang);
  
  // Se é primeira visita, usar idioma do navegador
  if (isFirstVisit) {
    return mappedLang;
  }
  
  // Se não é primeira visita, verificar localStorage
  if (savedLang && ['en', 'pt', 'es'].includes(savedLang)) {
    return savedLang;
  }
  
  // Fallback para idioma do navegador
  return mappedLang;
};

// ✅ OTIMIZAÇÃO: Carregar traduções de forma assíncrona
const loadTranslations = async (lang: string) => {
  try {
    const translation = await resources[lang as keyof typeof resources]?.translation();
    return translation.default || translation;
  } catch (error) {
    console.error(`Error loading ${lang} translations:`, error);
    // Fallback para inglês
    if (lang !== 'en') {
      const enTranslation = await resources.en.translation();
      return enTranslation.default || enTranslation;
    }
    return {};
  }
};

// Inicializar i18n
const initI18n = async () => {
  const preferredLang = getPreferredLanguage();
  
  // ✅ OTIMIZAÇÃO: Carregar apenas o idioma necessário
  const initialTranslation = await loadTranslations(preferredLang);
  
  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        [preferredLang]: {
          translation: initialTranslation
        }
      },
      lng: preferredLang,
      fallbackLng: 'en',
      debug: false, // ✅ OTIMIZAÇÃO: Desabilitar debug em produção
      
      interpolation: {
        escapeValue: false
      },
      
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        convertDetectedLanguage: (lng: string) => {
          return mapBrowserLanguage(lng);
        }
      }
    });

  // ✅ OTIMIZAÇÃO: Carregar outros idiomas de forma lazy quando necessário
  i18n.on('languageChanged', async (lng) => {
    if (!i18n.hasResourceBundle(lng, 'translation')) {
      const translation = await loadTranslations(lng);
      i18n.addResourceBundle(lng, 'translation', translation, true, true);
    }
  });

  // Marcar como inicializado
  localStorage.setItem('i18n_initialized', 'true');
  
  return i18n;
};

// Inicializar e exportar
const i18nInstance = initI18n();

export default i18nInstance;
