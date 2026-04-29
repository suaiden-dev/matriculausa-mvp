import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

// ─── Namespaces disponíveis ───────────────────────────────────────────────────
export const NAMESPACES = [
  'common',
  'home',
  'auth',
  'payment',
  'registration',
  'dashboard',
  'scholarships',
  'eb3',
  'school',
  'about',
  'contact',
  'help',
] as const;

export type Namespace = typeof NAMESPACES[number];

// ─── Função de mapeamento de idioma ──────────────────────────────────────────
const mapBrowserLanguage = (browserLang: string): string => {
  const lang = browserLang.toLowerCase();
  if (['en', 'en-us', 'en-gb', 'en-ca', 'en-au'].includes(lang)) return 'en';
  if (['pt', 'pt-br', 'pt-pt'].includes(lang)) return 'pt';
  if (['es', 'es-es', 'es-mx', 'es-ar', 'es-cl', 'es-co', 'es-pe'].includes(lang)) return 'es';
  if (lang.startsWith('pt')) return 'pt';
  if (lang.startsWith('es')) return 'es';
  return 'en';
};

const getPreferredLanguage = (): string => {
  const savedLang = localStorage.getItem('i18nextLng');
  const isFirstVisit = !localStorage.getItem('i18n_initialized');
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  const mappedLang = mapBrowserLanguage(browserLang);
  if (isFirstVisit) return mappedLang;
  if (savedLang && ['en', 'pt', 'es'].includes(savedLang)) return savedLang;
  return mappedLang;
};

// ─── Inicialização ────────────────────────────────────────────────────────────
const initI18n = async () => {
  const preferredLang = getPreferredLanguage();

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .use(
      // Lazy loading por namespace via dynamic import do Vite
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`./locales/${language}/${namespace}.json`)
      )
    )
    .init({
      lng: preferredLang,
      fallbackLng: 'en',

      // defaultNS é onde o useTranslation() sem argumento busca primeiro
      defaultNS: 'common',

      // fallbackNS: ordem de busca quando a chave não é encontrada no namespace principal
      // A otimização é feita por componente via useTranslation(['namespace', 'common'])
      // que controla QUAIS namespaces são carregados para cada página
      fallbackNS: ['common', 'home', 'auth', 'payment', 'registration', 'dashboard', 'scholarships', 'eb3', 'school', 'about', 'contact', 'help'],

      ns: NAMESPACES,

      // Pré-carrega TODOS os namespaces do idioma preferido para garantir compatibilidade
      preload: [preferredLang],

      debug: false,

      interpolation: {
        escapeValue: false,
      },

      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        convertDetectedLanguage: (lng: string) => mapBrowserLanguage(lng),
      },
    });

  // Quando o idioma muda, pré-carrega todos os namespaces do novo idioma e atualiza a tag HTML
  i18n.on('languageChanged', (lng) => {
    if (!['en', 'pt', 'es'].includes(lng)) return;
    
    // Atualizar atributo lang do HTML para SEO e ferramentas de acessibilidade
    document.documentElement.lang = lng;
    
    // O resourcesToBackend carregará os namespaces sob demanda automaticamente
  });

  localStorage.setItem('i18n_initialized', 'true');

  return i18n;
};

const i18nInstance = initI18n();

export default i18nInstance;
