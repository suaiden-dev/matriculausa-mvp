import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar arquivos de tradução
import enTranslations from './locales/en.json';
import ptTranslations from './locales/pt.json';
import esTranslations from './locales/es.json';

const resources = {
  en: {
    translation: enTranslations
  },
  pt: {
    translation: ptTranslations
  },
  es: {
    translation: esTranslations
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
  
  console.log('🌐 Idioma detectado do navegador:', browserLang);
  console.log('🗺️ Idioma mapeado:', mappedLang);
  console.log('🔍 Idioma encontrado no localStorage:', savedLang);
  console.log('🆕 É primeira visita?', isFirstVisit);
  
  // Se é primeira visita, usar idioma do navegador
  if (isFirstVisit) {
    console.log('🎯 Primeira visita - usando idioma do navegador:', mappedLang);
    return mappedLang;
  }
  
  // Se não é primeira visita, verificar localStorage
  if (savedLang && ['en', 'pt', 'es'].includes(savedLang)) {
    console.log('🔍 Usando idioma salvo no localStorage:', savedLang);
    return savedLang;
  }
  
  // Fallback para idioma do navegador
  console.log('🔄 Fallback para idioma do navegador:', mappedLang);
  return mappedLang;
};

// Inicializar i18n
const initI18n = async () => {
  const preferredLang = getPreferredLanguage();
  
  console.log('🚀 Iniciando i18n com idioma preferido:', preferredLang);
  
  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: preferredLang, // Usar idioma detectado automaticamente
      fallbackLng: 'en',
      
      interpolation: {
        escapeValue: false // react já faz escape
      },
      
      detection: {
        // Ordem de detecção: localStorage > navigator > htmlTag
        order: ['localStorage', 'navigator', 'htmlTag'],
        
        // Cache das preferências
        caches: ['localStorage'],
        
        // Função customizada para mapear idiomas detectados
        convertDetectedLanguage: (lng: string) => {
          const mapped = mapBrowserLanguage(lng);
          console.log('🔧 Convertendo idioma detectado:', lng, '→', mapped);
          return mapped;
        }
      }
    });

  console.log('✅ i18n inicializado com idioma:', i18n.language);
  
  // IMPORTANTE: Forçar a aplicação do idioma detectado
  if (i18n.language !== preferredLang) {
    console.log('⚠️ Idioma não foi aplicado automaticamente. Forçando...');
    console.log('🔄 Mudando de', i18n.language, 'para', preferredLang);
    
    try {
      await i18n.changeLanguage(preferredLang);
      console.log('✅ Idioma forçado com sucesso para:', preferredLang);
      
      // Salvar no localStorage para futuras visitas
      localStorage.setItem('i18nextLng', preferredLang);
      console.log('💾 Idioma salvo no localStorage:', preferredLang);
    } catch (error) {
      console.error('❌ Erro ao forçar idioma:', error);
    }
  } else {
    console.log('✅ Idioma já está correto:', preferredLang);
  }
  
  // Marcar como inicializado para futuras visitas
  localStorage.setItem('i18n_initialized', 'true');
  
  // Verificação final
  console.log('🎯 Idioma final da aplicação:', i18n.language);
  console.log('🎯 Idioma no localStorage:', localStorage.getItem('i18nextLng'));
  
  return i18n;
};

// Inicializar e exportar
const i18nInstance = initI18n();

export default i18nInstance;
