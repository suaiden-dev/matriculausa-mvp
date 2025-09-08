import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDetection } from '../hooks/useLanguageDetection';

const LanguageDetectionDemo: React.FC = () => {
  const { t } = useTranslation();
  const { 
    browserLanguage, 
    detectedLanguages, 
    getPreferredLanguage, 
    isBrowserDefault 
  } = useLanguageDetection();

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Demonstração da Detecção de Idioma
      </h2>
      
      <div className="space-y-6">
        {/* Informações do idioma detectado */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Idioma Detectado do Navegador
          </h3>
          <div className="space-y-2">
            <p className="text-blue-800">
              <strong>Idioma principal:</strong> {browserLanguage || 'Detectando...'}
            </p>
            <p className="text-blue-800">
              <strong>Idioma preferido:</strong> {getPreferredLanguage()}
            </p>
            <p className="text-blue-800">
              <strong>navigator.language:</strong> {navigator.language || 'Não disponível'}
            </p>
            <p className="text-blue-800">
              <strong>navigator.languages:</strong> {navigator.languages?.join(', ') || 'Não disponível'}
            </p>
          </div>
        </div>

        {/* Lista de idiomas suportados */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Idiomas Suportados
          </h3>
          <div className="space-y-2">
            {detectedLanguages.map((lang) => (
              <div 
                key={lang.code}
                className={`flex items-center justify-between p-3 rounded-md ${
                  isBrowserDefault(lang.code) 
                    ? 'bg-blue-100 border border-blue-200' 
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  <span className="text-sm text-gray-500">({lang.code})</span>
                </div>
                <div className="flex items-center space-x-2">
                  {isBrowserDefault(lang.code) && (
                    <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-200 rounded-full">
                      Padrão do Navegador
                    </span>
                  )}
                  {lang.code === getPreferredLanguage() && (
                    <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-200 rounded-full">
                      Atual
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teste de tradução */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Teste de Tradução
          </h3>
          <div className="space-y-2">
            <p className="text-green-800">
              <strong>Idioma atual:</strong> {t('language.current') || 'Idioma atual'}
            </p>
            <p className="text-green-800">
              <strong>Bem-vindo:</strong> {t('common.welcome') || 'Bem-vindo'}
            </p>
            <p className="text-green-800">
              <strong>Idioma:</strong> {t('language.language') || 'Idioma'}
            </p>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            Como Funciona
          </h3>
          <ul className="text-yellow-800 space-y-1 text-sm">
            <li>• O sistema detecta automaticamente o idioma do seu navegador</li>
            <li>• Se você já escolheu um idioma antes, essa preferência é mantida</li>
            <li>• Caso contrário, o idioma do navegador é usado como padrão</li>
            <li>• Você pode sempre alterar o idioma manualmente</li>
            <li>• Use a opção "Redefinir para [Idioma] (Navegador)" para voltar ao padrão</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LanguageDetectionDemo;
