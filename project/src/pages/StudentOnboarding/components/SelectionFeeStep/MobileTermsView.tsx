import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Term } from './types';

interface MobileTermsViewProps {
  activeTerm: Term | null;
  loadingTerms: boolean;
  setShowTermsInDrawer: (value: boolean) => void;
  t: (key: string) => string;
}

export const MobileTermsView: React.FC<MobileTermsViewProps> = ({
  activeTerm,
  loadingTerms,
  setShowTermsInDrawer,
  t,
}) => {
  return (
    <div className="space-y-4 bg-white min-h-full flex flex-col">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <button
          onClick={() => setShowTermsInDrawer(false)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {activeTerm ? activeTerm.title : t('preCheckoutModal.termsAndConditions.title')}
        </h3>
      </div>

      {loadingTerms ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 text-sm">{t('preCheckoutModal.loading')}</p>
          </div>
        </div>
      ) : activeTerm ? (
        <>
          <div
            className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 mb-6"
            dangerouslySetInnerHTML={{ __html: activeTerm.content }}
          />
          <div className="border-t border-gray-200 bg-gray-50 p-4 -mx-4 -mb-4 rounded-b-2xl mt-4">
            <button
              onClick={() => setShowTermsInDrawer(false)}
              className="w-full py-3 px-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-lg text-sm"
            >
              {t('preCheckoutModal.closeTerms') || 'Fechar'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-slate-600 text-sm">{t('preCheckoutModal.noTermsFound')}</p>
        </div>
      )}
    </div>
  );
};
