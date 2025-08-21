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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // idioma padrão
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false // react já faz escape
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;
