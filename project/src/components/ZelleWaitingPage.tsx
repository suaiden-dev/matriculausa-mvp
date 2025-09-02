import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaymentStatus {
  status: 'pending' | 'approved' | 'rejected' | 'error';
  message: string;
  details?: string;
}

export const ZelleWaitingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'pending',
    message: t('zelleWaiting.messages.analyzing')
  });
  const [timeElapsed, setTimeElapsed] = useState(0);

  const paymentId = searchParams.get('payment_id');
  const feeType = searchParams.get('fee_type');
  const amount = searchParams.get('amount');

  // Simular contador de tempo
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Verificar status do pagamento a cada 10 segundos
  useEffect(() => {
    if (!paymentId) return;

    const checkPaymentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('zelle_payments')
          .select('status, updated_at')
          .eq('id', paymentId)
          .single();

        if (error) throw error;

        if (data.status === 'approved') {
          setPaymentStatus({
            status: 'approved',
            message: t('zelleWaiting.messages.approved'),
            details: t('zelleWaiting.details.approved')
          });
          // Redirecionar para página de sucesso após 3 segundos
          setTimeout(() => {
            navigate('/checkout/success?method=zelle&status=approved');
          }, 3000);
        } else if (data.status === 'rejected') {
          setPaymentStatus({
            status: 'rejected',
            message: t('zelleWaiting.messages.rejected'),
            details: t('zelleWaiting.details.rejected')
          });
        } else if (data.status === 'pending_verification') {
          // Continuar aguardando
          setPaymentStatus({
            status: 'pending',
            message: t('zelleWaiting.messages.analyzing'),
            details: `${t('zelleWaiting.waitTime')}: ${Math.floor(timeElapsed / 60)}:${(timeElapsed % 60).toString().padStart(2, '0')}`
          });
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    };

    // Verificar imediatamente
    checkPaymentStatus();

    // Verificar a cada 10 segundos
    const interval = setInterval(checkPaymentStatus, 10000);

    return () => clearInterval(interval);
  }, [paymentId, timeElapsed, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'approved':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-16 h-16 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-16 h-16 text-yellow-500" />;
      default:
        return <Clock className="w-16 h-16 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus.status) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'error':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  const getBackgroundColor = () => {
    switch (paymentStatus.status) {
      case 'approved':
        return 'bg-green-50';
      case 'rejected':
        return 'bg-red-50';
      case 'error':
        return 'bg-yellow-50';
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('zelleWaiting.title')}
          </h1>
          <p className="text-gray-600">
            {t('zelleWaiting.subtitle')}
          </p>
        </div>

        {/* Status Card */}
        <div className={`${getBackgroundColor()} rounded-lg border-2 border-gray-200 p-8 text-center`}>
          {/* Icon */}
          <div className="mb-6">
            {getStatusIcon()}
          </div>

          {/* Status Message */}
          <h2 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
            {paymentStatus.message}
          </h2>

          {/* Details */}
          {paymentStatus.details && (
            <p className="text-gray-700 mb-6">
              {paymentStatus.details}
            </p>
          )}

          {/* Timer */}
          {paymentStatus.status === 'pending' && (
            <div className="bg-white rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-mono text-lg">
                  {formatTime(timeElapsed)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {t('zelleWaiting.analysisTime')}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {paymentStatus.status === 'pending' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((timeElapsed / 40) * 100, 100)}%` }}
              ></div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {paymentStatus.status === 'rejected' && (
              <button
                onClick={() => navigate('/checkout/zelle')}
                className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {t('zelleWaiting.actions.tryAgain')}
              </button>
            )}
            
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              {t('zelleWaiting.actions.backToCheckout')}
            </button>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('zelleWaiting.paymentInfo.title')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('zelleWaiting.paymentInfo.feeType')}</span>
              <span className="font-medium text-gray-900">{feeType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('zelleWaiting.paymentInfo.amount')}</span>
              <span className="font-medium text-gray-900">${amount} USD</span>
            </div>
            {paymentId && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('zelleWaiting.paymentInfo.paymentId')}</span>
                <span className="font-mono text-sm text-gray-500">{paymentId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>
            {t('zelleWaiting.helpText')}
          </p>
        </div>
      </div>
    </div>
  );
};
