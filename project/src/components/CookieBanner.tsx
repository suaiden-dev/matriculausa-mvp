import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

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
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [, setSettings] = useState<ConsentSettings>({
    analytics_storage: 'denied'
  });

  const isPreQualification = location.pathname === '/pre-qualification';

  useEffect(() => {
    // Abrir o banner ao receber o evento do rodapé
    const handleOpenCookies = () => {
      setIsVisible(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenCookies);

    const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!savedConsent) {
      // Pequeno delay para aparecer de forma suave após o carregamento
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

  const saveAndApply = (consentSettings: ConsentSettings) => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentSettings));
    setSettings(consentSettings);
    updateGtagConsent(consentSettings);
    setIsVisible(false);
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

  if (!isVisible || isPreQualification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 pointer-events-none"
      >
        <div className="max-w-sm mx-auto sm:mx-0 sm:mr-auto pointer-events-auto">
          <div className="bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-200 p-4 backdrop-blur-xl relative">
            
            <div className="relative z-10 flex flex-col gap-3">
              <div className="text-left">
                <div className="text-slate-600 text-[13px] sm:text-sm leading-relaxed font-medium">
                  <Trans 
                    t={t} 
                    i18nKey="cookies.description"
                    components={[
                      <Link 
                        key="privacy-link"
                        to="/privacy-policy" 
                        className="text-[#05294E] hover:text-[#D0151C] underline font-bold transition-colors"
                      />
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-row gap-4 items-center justify-between">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-red-600 bg-transparent transition-all active:scale-95"
                >
                  {t('cookies.rejectAll')}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-[#05294E] hover:bg-[#063a6e] rounded-md transition-all shadow-sm hover:shadow active:scale-95 flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  {t('cookies.acceptAll')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieBanner;
