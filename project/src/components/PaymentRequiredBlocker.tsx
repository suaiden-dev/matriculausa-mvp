import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import Header from './Header';

interface PaymentRequiredBlockerProps {
  pageType: 'scholarships' | 'universities';
  showHeader?: boolean; // Nova prop para controlar se deve mostrar o header
}

const PaymentRequiredBlocker: React.FC<PaymentRequiredBlockerProps> = ({ 
  pageType, 
  showHeader = true // Por padrão, mostra o header
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const getPageContent = () => {
    switch (pageType) {
      case 'scholarships':
        return {
          title: t('paymentBlocker.scholarships.title'),
          description: t('paymentBlocker.scholarships.description'),
          icon: '🎓',
          gradient: 'from-blue-600 to-indigo-700'
        };
      case 'universities':
        return {
          title: t('paymentBlocker.universities.title'),
          description: t('paymentBlocker.universities.description'),
          icon: '🏛️',
          gradient: 'from-purple-600 to-violet-700'
        };
      default:
        return {
          title: t('paymentBlocker.default.title'),
          description: t('paymentBlocker.default.description'),
          icon: '🔒',
          gradient: 'from-slate-600 to-slate-700'
        };
    }
  };

  const content = getPageContent();

  const handleMainButtonClick = () => {
    if (isAuthenticated) {
      navigate('/student/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      {showHeader && <Header />} {/* Renderiza header apenas se showHeader for true */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center">

          {/* Content */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
              {content.title}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
              {content.description}
            </p>
          </div>

          {/* Payment Info Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-slate-500">{t('paymentBlocker.selectionProcessFee')}</div>
                <div className="text-2xl font-bold text-slate-900">$600</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-center text-blue-800 text-sm font-medium">
                <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
                {t('paymentBlocker.completeApplicationJourney')}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleMainButtonClick}
              className="inline-flex items-center justify-center w-full max-w-md bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-white/20"
            >
              <CreditCard className="h-5 w-5 mr-3" />
              {t('paymentBlocker.goToDashboardAndPayFee')}
              <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </button>

            <Link
              to="/how-it-works"
              className="inline-flex items-center justify-center w-full max-w-md bg-white text-slate-700 py-3 px-6 rounded-xl font-semibold border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300"
            >
              {t('paymentBlocker.learnHowItWorks')}
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-600">
              <Lock className="h-4 w-4 mr-2 text-slate-500" />
              {t('paymentBlocker.contentLockedMessage')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentRequiredBlocker;