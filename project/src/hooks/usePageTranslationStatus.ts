import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Páginas que não possuem traduções completas
const UNTRANSLATED_PAGES = [
  '/for-universities',
  '/school/register',
  '/admin/register',
  '/seller/register',
  '/student/register'
];

// Páginas que possuem traduções completas
const TRANSLATED_PAGES = [
  '/',
  '/about',
  '/how-it-works',
  '/scholarships',
  '/schools',
  '/matricula-rewards',
  '/student/dashboard',
  '/school/dashboard',
  '/admin/dashboard',
  '/affiliate-admin/dashboard'
];

export const usePageTranslationStatus = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  
  const currentPath = location.pathname;
  
  // Verificar se a página atual está na lista de páginas sem tradução
  const isUntranslatedPage = UNTRANSLATED_PAGES.some(page => 
    currentPath.startsWith(page)
  );
  
  // Verificar se a página atual está na lista de páginas traduzidas
  const isTranslatedPage = TRANSLATED_PAGES.some(page => 
    currentPath.startsWith(page)
  );
  
  // Priorizar páginas sem tradução sobre páginas traduzidas
  // Se está na lista de sem tradução, não mostrar seletor
  // Se está na lista de traduzidas, mostrar seletor
  // Se não está em nenhuma lista, assumir que tem tradução (padrão)
  const hasTranslation = !isUntranslatedPage && (isTranslatedPage || (!isUntranslatedPage && !isTranslatedPage));
  
  // Verificar se o idioma atual é inglês (páginas sem tradução geralmente estão em inglês)
  const isEnglish = i18n.language === 'en';
  
  return {
    hasTranslation,
    isUntranslatedPage,
    isTranslatedPage,
    isEnglish,
    currentPath
  };
};
