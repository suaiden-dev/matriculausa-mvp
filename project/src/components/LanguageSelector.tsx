import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';

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
  variant?: 'header' | 'footer' | 'compact';
  showLabel?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'header', 
  showLabel = true 
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  const baseClasses = "relative inline-block text-left";
  
  const buttonClasses = {
    header: "inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-colors",
    footer: "inline-flex items-center px-3 py-2 text-sm font-medium text-white hover:text-gray-200 transition-colors",
    compact: "inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
  };

  const dropdownClasses = {
    header: "origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50",
    footer: "origin-top-right absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50",
    compact: "origin-top-right absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
  };

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
          {variant !== 'compact' && <Globe className="h-4 w-4 mr-2" />}
          <span className="flex items-center">
            <span className="mr-2">{currentLanguage.flag}</span>
            {showLabel && (
              <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
                {currentLanguage.name}
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
                  {language.name}
                  {currentLanguage.code === language.code && (
                    <span className="ml-auto">
                      <svg className="h-4 w-4 text-[#05294E]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
