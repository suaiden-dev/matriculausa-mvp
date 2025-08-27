import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDetection } from '../hooks/useLanguageDetection';

const LanguageTest: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const { 
    browserLanguage, 
    detectedLanguages, 
    getPreferredLanguage, 
    isBrowserDefault,
    isApplied,
    forceApplyDetectedLanguage,
    checkIfDetectedLanguageApplied
  } = useLanguageDetection();

  useEffect(() => {
    // Listener para mudanças de idioma
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const forceLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const resetToBrowserLanguage = async () => {
    // Mapear idioma do navegador
    const lang = browserLanguage.toLowerCase();
    let mappedLang = 'en';
    
    if (['en', 'en-us', 'en-gb', 'en-ca', 'en-au'].includes(lang)) mappedLang = 'en';
    else if (['pt', 'pt-br', 'pt-pt'].includes(lang) || lang.startsWith('pt')) mappedLang = 'pt';
    else if (['es', 'es-es', 'es-mx', 'es-ar', 'es-cl', 'es-co', 'es-pe'].includes(lang) || lang.startsWith('es')) mappedLang = 'es';
    
    await forceLanguage(mappedLang);
  };

  const handleForceApplyDetected = async () => {
    await forceApplyDetectedLanguage();
  };

  // Função para simular primeira visita
  const simulateFirstVisit = () => {
    // Limpar localStorage
    localStorage.removeItem('i18nextLng');
    localStorage.removeItem('i18n_initialized');
    
    // Recarregar página para forçar nova detecção
    window.location.reload();
  };

  // Verificar se o idioma detectado foi aplicado
  const detectedLanguageApplied = checkIfDetectedLanguageApplied();

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Teste de Detecção de Idioma
      </h2>
      
      <div className="space-y-4">
        {/* Status atual */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Status Atual
          </h3>
          <div className="space-y-2 text-blue-800">
            <p><strong>Idioma atual da aplicação:</strong> {currentLang}</p>
            <p><strong>Idioma do navegador:</strong> {browserLanguage}</p>
            <p><strong>Idioma no localStorage:</strong> {localStorage.getItem('i18nextLng') || 'Nenhum'}</p>
            <p><strong>Primeira visita marcada:</strong> {localStorage.getItem('i18n_initialized') ? 'Não' : 'Sim'}</p>
            <p><strong>Idioma detectado aplicado:</strong> 
              {detectedLanguageApplied ? (
                <span className="text-green-600 font-semibold"> ✅ Sim</span>
              ) : (
                <span className="text-red-600 font-semibold"> ❌ Não</span>
              )}
            </p>
          </div>
        </div>

        {/* Aplicação Automática */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            Aplicação Automática
          </h3>
          <div className="space-y-2 text-purple-800">
            <p><strong>Status:</strong> 
              {detectedLanguageApplied ? (
                <span className="text-green-600 font-semibold">✅ Funcionando perfeitamente</span>
              ) : (
                <span className="text-yellow-600 font-semibold">⚠️ Necessita intervenção</span>
              )}
            </p>
            {!detectedLanguageApplied && browserLanguage && (
              <div className="mt-3">
                <button
                  onClick={handleForceApplyDetected}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  🔄 Forçar Aplicação do Idioma Detectado
                </button>
                <p className="text-xs text-purple-600 mt-1">
                  Clique aqui para aplicar automaticamente o idioma {browserLanguage}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Simular Primeira Visita */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            Simular Primeira Visita
          </h3>
          <div className="space-y-2 text-orange-800">
            <p className="text-sm">
              Use esta opção para testar a detecção automática como se fosse sua primeira visita ao site.
            </p>
            <button
              onClick={simulateFirstVisit}
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              🆕 Simular Primeira Visita
            </button>
            <p className="text-xs text-orange-600 mt-1">
              Isso limpará o localStorage e recarregará a página para testar a detecção automática
            </p>
          </div>
        </div>

        {/* Controles */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Controles
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => forceLanguage('en')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentLang === 'en' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🇺🇸 English
            </button>
            <button
              onClick={() => forceLanguage('pt')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentLang === 'pt' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🇧🇷 Português
            </button>
            <button
              onClick={() => forceLanguage('es')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentLang === 'es' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🇪🇸 Español
            </button>
          </div>
          
          <div className="mt-3">
            <button
              onClick={resetToBrowserLanguage}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              🔄 Reset para Idioma do Navegador
            </button>
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
                  {lang.code === browserLanguage && detectedLanguageApplied && (
                    <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-200 rounded-full">
                      Aplicado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teste de tradução */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Teste de Tradução
          </h3>
          <div className="space-y-2 text-green-800">
            <p><strong>Idioma atual:</strong> {t('language.current') || 'Idioma atual'}</p>
            <p><strong>Bem-vindo:</strong> {t('common.welcome') || 'Bem-vindo'}</p>
            <p><strong>Idioma:</strong> {t('language.language') || 'Idioma'}</p>
          </div>
        </div>

        {/* Debug */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Debug Info
          </h3>
          <div className="space-y-2 text-yellow-800 text-sm">
            <p><strong>navigator.language:</strong> {navigator.language}</p>
            <p><strong>navigator.languages:</strong> {navigator.languages?.join(', ')}</p>
            <p><strong>i18n.isInitialized:</strong> {i18n.isInitialized ? 'Sim' : 'Não'}</p>
            <p><strong>i18n.language:</strong> {i18n.language}</p>
            <p><strong>i18n.languages:</strong> {i18n.languages?.join(', ')}</p>
            <p><strong>Hook isApplied:</strong> {isApplied ? 'Sim' : 'Não'}</p>
            <p><strong>Detected Language Applied:</strong> {detectedLanguageApplied ? 'Sim' : 'Não'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageTest;
