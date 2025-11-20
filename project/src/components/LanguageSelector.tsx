import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguageDetection } from '../hooks/useLanguageDetection';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

interface LanguageSelectorProps {
  variant?: 'header' | 'footer' | 'compact' | 'dashboard';
  showLabel?: boolean;
  showResetOption?: boolean;
  showAutoApplyStatus?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'header', 
  showLabel = true,
  showResetOption = false,
  showAutoApplyStatus = false
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { 
    browserLanguage, 
    isBrowserDefault, 
    isApplied,
    forceApplyDetectedLanguage,
    checkIfDetectedLanguageApplied
  } = useLanguageDetection();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  // Verificar se o idioma detectado foi aplicado
  const detectedLanguageApplied = checkIfDetectedLanguageApplied();

  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    setIsOpen(false);
    window.location.reload();
  };

  const handleResetToBrowserLanguage = async () => {
    if (browserLanguage && browserLanguage !== i18n.language) {
      await i18n.changeLanguage(browserLanguage);
      localStorage.setItem('i18nextLng', browserLanguage);
      window.location.reload();
    }
    setIsOpen(false);
  };

  const handleForceApplyDetectedLanguage = async () => {
    await forceApplyDetectedLanguage();
    setIsOpen(false);
    window.location.reload();
  };

  const baseClasses = "relative inline-block text-left";
  
  const buttonClasses = {
    header: "inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-colors",
    footer: "inline-flex items-center px-3 py-2 text-sm font-medium text-white hover:text-gray-200 transition-colors",
    compact: "inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors",
    dashboard: "inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 hover:border-slate-300"
  };

  const dropdownClasses = {
    header: "origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50",
    footer: "origin-top-right absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50",
    compact: "origin-top-right absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50",
    dashboard: "origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-xl bg-white border border-slate-200 focus:outline-none z-50"
  };

  // Verificar se o idioma atual é diferente do idioma do navegador
  const isDifferentFromBrowser = browserLanguage && browserLanguage !== i18n.language;

  return (
    <div className={baseClasses}>
      <div>
        <button
          type="button"
          className={buttonClasses[variant]}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded="true"
          aria-haspopup="true"
        >
          {(variant !== 'compact' && variant !== 'dashboard') && <Globe className="h-4 w-4 mr-2" />}
          <span className="flex items-center">
            <span className="mr-2">{currentLanguage.flag}</span>
            {showLabel && (
              <span className={variant === 'compact' ? 'hidden sm:inline' : variant === 'dashboard' ? 'hidden lg:inline' : ''}>
                {currentLanguage.name}
                {isBrowserDefault(currentLanguage.code) && (
                  <span className="ml-1 text-xs text-blue-600"></span>
                )}
                {showAutoApplyStatus && isBrowserDefault(currentLanguage.code) && (
                  detectedLanguageApplied ? (
                    <CheckCircle className="ml-1 h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="ml-1 h-3 w-3 text-yellow-600" />
                  )
                )}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </button>
      </div>

      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className={dropdownClasses[variant]} role="menu">
            <div className="py-1" role="none">
              {languages.map((language) => (
                <button
                  key={language.code}
                  className={`
                    group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors
                    ${currentLanguage.code === language.code ? 'bg-gray-50 text-[#05294E] font-medium' : ''}
                  `}
                  role="menuitem"
                  onClick={() => handleLanguageChange(language.code)}
                >
                  <span className="mr-3">{language.flag}</span>
                  <span className="flex-1 text-left">{language.name}</span>
                  {isBrowserDefault(language.code) && (
                    <span className="text-xs text-blue-600 mr-2"></span>
                  )}
                  {currentLanguage.code === language.code && (
                    <span className="ml-auto">
                      <svg className="h-4 w-4 text-[#05294E]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
              
              {/* Opção para redefinir para o idioma do navegador */}
              {showResetOption && isDifferentFromBrowser && browserLanguage && (
                <>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    className="group flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    role="menuitem"
                    onClick={handleResetToBrowserLanguage}
                  >
                    <RotateCcw className="h-4 w-4 mr-3 text-blue-500" />
                    <span>Redefinir para {languages.find(lang => lang.code === browserLanguage)?.name}</span>
                    <span className="ml-auto text-xs text-gray-400">(Navegador)</span>
                  </button>
                </>
              )}

              {/* Opção para forçar aplicação do idioma detectado */}
              {showAutoApplyStatus && isDifferentFromBrowser && browserLanguage && (
                <button
                  className="group flex items-center w-full px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 transition-colors"
                  role="menuitem"
                  onClick={handleForceApplyDetectedLanguage}
                >
                  <AlertCircle className="h-4 w-4 mr-3 text-yellow-500" />
                  <span>Forçar Aplicação do {languages.find(lang => lang.code === browserLanguage)?.name}</span>
                  <span className="ml-auto text-xs text-gray-400">(Auto)</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
