import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

type ConsentSettings = {
  analytics_storage: 'granted' | 'denied';
};

const CONSENT_STORAGE_KEY = 'matricula_usa_cookie_consent';

const CookieBanner: React.FC = () => {
  const { t } = useTranslation(['common']);
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [settings, setSettings] = useState<ConsentSettings>({
    analytics_storage: 'denied'
  });

  useEffect(() => {
    const handleOpenCookies = () => {
      setIsVisible(true);
      setIsCustomizing(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenCookies);

    const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!savedConsent) {
      // Pequeno delay para UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('open-cookie-settings', handleOpenCookies);
      };
    } else {
      try {
        const parsed = JSON.parse(savedConsent) as ConsentSettings;
        setSettings(parsed);
        updateGtagConsent(parsed);
      } catch (e) {
        setIsVisible(true);
      }
    }

    return () => window.removeEventListener('open-cookie-settings', handleOpenCookies);
  }, []);

  const updateGtagConsent = (consentSettings: ConsentSettings) => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', consentSettings);
    }
  };

  const handleAcceptAll = () => {
    const allGranted: ConsentSettings = {
      analytics_storage: 'granted'
    };
    saveAndApply(allGranted);
  };

  const handleRejectAll = () => {
    const allDenied: ConsentSettings = {
      analytics_storage: 'denied'
    };
    saveAndApply(allDenied);
  };

  const handleSaveCustom = () => {
    saveAndApply(settings);
  };

  const saveAndApply = (consentSettings: ConsentSettings) => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentSettings));
    setSettings(consentSettings);
    updateGtagConsent(consentSettings);
    setIsVisible(false);
  };

  const toggleSetting = (key: keyof ConsentSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key] === 'granted' ? 'denied' : 'granted'
    }));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden pointer-events-auto">
          <div className="p-6 md:p-8">
            {!isCustomizing ? (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">

                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2 md:hidden">
                    <h3 className="font-bold text-gray-900">{t('cookies.title')}</h3>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 hidden md:block">{t('cookies.title')}</h3>
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                    <Trans
                      i18nKey="cookies.description"
                      components={[
                        <Link key="privacy-link" to="/privacy-policy" className="text-[#05294E] font-bold underline hover:text-[#041d38]" />
                      ]}
                    />
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 mt-4 md:mt-0">
                  <button
                    onClick={() => setIsCustomizing(true)}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    {t('cookies.customize')}
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="px-8 py-2.5 bg-[#05294E] text-white text-sm font-bold rounded-xl hover:bg-[#041d38] transition-all shadow-lg shadow-blue-900/10"
                  >
                    {t('cookies.acceptAll')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{t('cookies.manage.title', t('cookieSettings'))}</h3>
                  </div>
                  <button 
                    onClick={() => setIsCustomizing(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Necessários */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 text-sm">{t('cookies.manage.necessary.title')}</h4>
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {t('cookies.manage.necessary.description')}
                    </p>
                  </div>

                  {/* Analíticos */}
                  <div 
                    onClick={() => toggleSetting('analytics_storage')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      settings.analytics_storage === 'granted' 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 text-sm">{t('cookies.manage.analytics.title')}</h4>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        settings.analytics_storage === 'granted' ? 'bg-[#05294E] border-[#05294E]' : 'bg-white border-gray-300'
                      }`}>
                        {settings.analytics_storage === 'granted' && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {t('cookies.manage.analytics.description')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                  <button
                    onClick={handleRejectAll}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium order-2 sm:order-1"
                  >
                    {t('cookies.rejectAll')}
                  </button>
                  <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
                    <button
                      onClick={() => setIsCustomizing(false)}
                      className="flex-grow sm:flex-grow-0 px-6 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                    >
                      {t('common.back', 'Voltar')}
                    </button>
                    <button
                      onClick={handleSaveCustom}
                      className="flex-grow sm:flex-grow-0 px-8 py-2.5 bg-[#05294E] text-white text-sm font-bold rounded-xl hover:bg-[#041d38] transition-all shadow-lg shadow-blue-900/10"
                    >
                      {t('cookies.save')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieBanner;
