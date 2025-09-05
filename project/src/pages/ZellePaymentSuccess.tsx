import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const ZellePaymentSuccess: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const method = searchParams.get('method');
  const status = searchParams.get('status');
  const feeType = searchParams.get('fee_type');
  const amount = searchParams.get('amount');
  const { user } = useAuth();

  // Se não for um pagamento Zelle aprovado, redireciona
  if (method !== 'zelle' || status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('zelleSuccess.invalidStatus.title')}</h2>
          <p className="text-slate-600 mb-6">{t('zelleSuccess.invalidStatus.message')}</p>
          <Link
            to="/"
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold inline-flex items-center"
          >
            {t('zelleSuccess.invalidStatus.returnHome')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  const getFeeTypeName = (type: string | null) => {
    if (!type) return t('zelleSuccess.feeTypes.default');
    return t(`zelleSuccess.feeTypes.${type}`) || t('zelleSuccess.feeTypes.default');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('zelleSuccess.title')}</h2>
        
        <p className="text-slate-600 mb-6">
          {t('zelleSuccess.subtitle', { name: user?.name || 'valued customer' })}
        </p>

        {/* Payment Details */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{t('zelleSuccess.paymentDetails.title')}</h3>
              <p className="text-sm text-slate-600">{t('zelleSuccess.paymentDetails.subtitle')}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">{t('zelleSuccess.paymentDetails.feeType')}</span>
              <span className="font-medium text-slate-900">{getFeeTypeName(feeType)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t('zelleSuccess.paymentDetails.amount')}</span>
              <span className="font-medium text-slate-900">${amount} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t('zelleSuccess.paymentDetails.status')}</span>
              <span className="font-medium text-green-600">{t('zelleSuccess.paymentDetails.approved')}</span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
          <h3 className="font-bold text-slate-900 mb-2">{t('zelleSuccess.whatsNext.title')}</h3>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              {t('zelleSuccess.whatsNext.step1')}
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              {t('zelleSuccess.whatsNext.step2')}
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              {t('zelleSuccess.whatsNext.step3')}
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/student/dashboard"
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold flex items-center justify-center"
          >
            {t('zelleSuccess.actions.goToDashboard')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            to="/"
            className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium"
          >
            {t('zelleSuccess.actions.returnHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ZellePaymentSuccess;
