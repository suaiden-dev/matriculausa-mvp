import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Mail, Phone, Calendar, ArrowRight, Briefcase } from 'lucide-react';

const EB3SuccessPage: React.FC = () => {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getSessionIdFromUrl = () => {
      const queryParams = new URLSearchParams(window.location.search);
      return queryParams.get('session_id');
    };

    const id = getSessionIdFromUrl();
    if (id) {
      setSessionId(id);
      console.log('EB-3 Payment Session ID:', id);
      // sessionId está disponível para uso interno se necessário
      // Pode ser usado para analytics, debug ou futuras integrações
      const debugInfo = { sessionId: id, timestamp: new Date().toISOString() };
      console.log('Debug info:', debugInfo);
      // Simular verificação de pagamento
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } else {
      setLoading(false);
    }
  }, []);

  // Monitor sessionId para debug/analytics
  useEffect(() => {
    if (sessionId) {
      console.log('Session ID captured:', sessionId);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('eb3Success.loading.title')}</h2>
          <p className="text-gray-600">{t('eb3Success.loading.description')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </motion.div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('eb3Success.success.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('eb3Success.success.description')}
          </p>

        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {t('eb3Success.nextSteps.title')}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {t('eb3Success.nextSteps.steps', { returnObjects: true }).map((step: any, index: number) => (
              <div key={index} className="text-center">
                <div className={`rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center ${
                  index === 0 ? 'bg-blue-100' : 
                  index === 1 ? 'bg-green-100' : 
                  'bg-purple-100'
                }`}>
                  {index === 0 ? <Mail className="h-8 w-8 text-blue-600" /> :
                   index === 1 ? <Phone className="h-8 w-8 text-green-600" /> :
                   <Calendar className="h-8 w-8 text-purple-600" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Benefits Reminder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white mb-8"
        >
          <h2 className="text-2xl font-bold mb-4 text-center">
            {t('eb3Success.benefits.title')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {t('eb3Success.benefits.items', { returnObjects: true }).slice(0, 3).map((benefit: string, index: number) => (
                <div key={index} className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
            
            <div className="space-y-3">
              {t('eb3Success.benefits.items', { returnObjects: true }).slice(3, 6).map((benefit: string, index: number) => (
                <div key={index + 3} className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => navigate('/eb3-jobs')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            <Briefcase className="h-5 w-5 mr-2" />
            {t('eb3Success.actions.viewMoreJobs')}
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="bg-white hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-lg font-semibold transition-colors border border-gray-300 flex items-center justify-center"
          >
            {t('eb3Success.actions.backToHome')}
          </button>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-center mt-12 text-gray-600"
        >
          <p className="mb-2">
            <strong>{t('eb3Success.contact.title')}</strong> {t('eb3Success.contact.description')}
          </p>
          <p className="text-sm">
            {t('eb3Success.contact.email')} | {t('eb3Success.contact.whatsapp')}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default EB3SuccessPage;