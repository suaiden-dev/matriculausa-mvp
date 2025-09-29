import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

interface PaymentStatus {
  status: 'analyzing' | 'under_review' | 'approved' | 'rejected' | 'error';
  message: string;
  details?: string;
  analysisResult?: string;
}

export const ZelleWaitingPage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuth();
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'analyzing',
    message: t('zelleWaiting.messages.analyzing')
  });
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [webhookResponseReceived, setWebhookResponseReceived] = useState(false);
  const [n8nAnalysisResult, setN8nAnalysisResult] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  
  // Ref para controlar se o useEffect deve executar
  const shouldCheckDatabase = useRef(true);

  // Função para chamar a Edge Function de aprovação automática
  const approvePaymentAutomatically = async () => {
    try {
      console.log('🚀 [ZelleWaiting] Iniciando aprovação automática...');
      console.log('�� [ZelleWaiting] Parâmetros:', {
        user_id: user?.id,
        fee_type_global: feeType,
        payment_id: paymentId,
        scholarshipsIds
      });

      if (!user?.id || !feeType) {
        throw new Error('Parâmetros obrigatórios não encontrados');
      }

      const { data, error } = await supabase.functions.invoke('approve-zelle-payment-automatic', {
        body: {
          user_id: user.id,
          fee_type_global: feeType,
          payment_id: paymentId,
          scholarship_ids: scholarshipsIds
        }
      });

      if (error) {
        console.error('❌ [ZelleWaiting] Erro na Edge Function:', error);
        throw error;
      }

      console.log('✅ [ZelleWaiting] Aprovação automática concluída:', data);
      return data;
    } catch (error) {
      console.error('❌ [ZelleWaiting] Erro ao aprovar pagamento automaticamente:', error);
      throw error;
    }
  };

  const paymentId = searchParams.get('payment_id');
  const feeType = searchParams.get('fee_type');
  const amount = searchParams.get('amount');
  const scholarshipsIds = searchParams.get('scholarshipsIds');

  // Simular contador de tempo
  useEffect(() => {
    if (webhookResponseReceived) return; // Para o timer quando receber resposta
    
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [webhookResponseReceived]);

  // Verificar se há resposta do n8n armazenada
  useEffect(() => {
    // Verificar sempre, mesmo sem paymentId (para usar fallback)
    // Evitar execução duplicada se já processamos a resposta
    if (webhookResponseReceived) {
      return;
    }

    const checkN8nResponse = async () => {
      try {
        console.log('�� [ZelleWaiting] Verificando resposta do n8n para paymentId:', paymentId);
        
        // Verificar se há uma resposta do n8n armazenada no localStorage
        let storedResponse = null;
        
        if (paymentId) {
          storedResponse = localStorage.getItem(`n8n_response_${paymentId}`);
          console.log('�� [ZelleWaiting] Resposta armazenada com paymentId:', storedResponse);
        }
        
        // Fallback: verificar resposta mais recente se não tiver paymentId
        if (!storedResponse) {
          storedResponse = localStorage.getItem('latest_n8n_response');
          console.log('�� [ZelleWaiting] Resposta armazenada (fallback):', storedResponse);
        }
        
        if (storedResponse) {
          const responseData = JSON.parse(storedResponse);
          console.log('🔍 [ZelleWaiting] Dados parseados:', responseData);
          
          if (responseData.response) {
            setN8nAnalysisResult(responseData.response);
            setWebhookResponseReceived(true);
            console.log('�� [ZelleWaiting] Resposta do n8n encontrada:', responseData.response);
            console.log('�� [ZelleWaiting] webhookResponseReceived definido como true');
            
            // Processar imediatamente a resposta
            const response = responseData.response.toLowerCase();
            console.log('🔍 [ZelleWaiting] Analisando resposta:', response);
            
            // Verificar se é especificamente "The proof of payment is valid"
            if (response === 'the proof of payment is valid.') {
              // Resposta positiva específica - aprovar automaticamente
              console.log('✅ [ZelleWaiting] Resposta positiva específica detectada - aprovando automaticamente');
              
              // Desabilitar verificação do banco ANTES de aprovar para evitar redirecionamento duplicado
              shouldCheckDatabase.current = false;
              
              // Chamar Edge Function para aprovar automaticamente
              try {
                await approvePaymentAutomatically();
                console.log('✅ [ZelleWaiting] Pagamento aprovado automaticamente via Edge Function');
              } catch (error) {
                console.error('❌ [ZelleWaiting] Erro ao aprovar automaticamente:', error);
                // Continuar mesmo com erro, pois o n8n já validou
              }
              
              // Desabilitar verificação do banco para evitar sobrescrita
              shouldCheckDatabase.current = false;
              // Redirecionar IMEDIATAMENTE para página de sucesso (evitar duplicação)
              if (!hasRedirected) {
                setHasRedirected(true);
                navigate(`/zelle/success?method=zelle&status=approved&fee_type=${feeType}&amount=${amount}`);
              }
            } else {
              // Qualquer outra resposta - vai para revisão manual
              console.log('❌ [ZelleWaiting] Resposta não é "valid" - mudando para revisão manual');
              console.log('❌ [ZelleWaiting] Resposta recebida:', responseData.response);
              setPaymentStatus({
                status: 'under_review',
                message: t('zelleWaiting.messages.under_review'),
                details: t('zelleWaiting.details.under_review')
              });
              // Desabilitar verificação do banco para evitar sobrescrita
              shouldCheckDatabase.current = false;
            }
          }
        } else {
          console.log('⚠️ [ZelleWaiting] Nenhuma resposta do n8n encontrada no localStorage');
        }
      } catch (error) {
        console.error('Erro ao verificar resposta do n8n:', error);
      }
    };

    checkN8nResponse();
  }, [paymentId, webhookResponseReceived]);

  // Verificar status do pagamento e implementar análise real
  useEffect(() => {
    if (!paymentId) return;
    
    // Se já temos resposta do n8n processada, desabilitar verificação do banco
    if (n8nAnalysisResult && webhookResponseReceived) {
      console.log('�� [ZelleWaiting] Resposta do n8n já processada, desabilitando verificação do banco');
      shouldCheckDatabase.current = false;
      return;
    }
    
    // Se a verificação do banco foi desabilitada, não executar
    if (!shouldCheckDatabase.current) {
      console.log('�� [ZelleWaiting] Verificação do banco desabilitada, não executando');
      return;
    }

    const checkPaymentStatus = async () => {
      // Verificar novamente se já temos resposta do n8n (dupla verificação)
      if (n8nAnalysisResult && webhookResponseReceived) {
        console.log('�� [ZelleWaiting] Resposta do n8n já processada, cancelando verificação do banco');
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('zelle_payments')
          .select('status, updated_at, admin_notes')
          .eq('id', paymentId)
          .single();

        if (error) {
          console.log('⚠️ [ZelleWaiting] Erro na consulta do banco, mas continuando sem mostrar erro ao usuário');
          return; // Não mostrar erro, apenas continuar
        }

        if (data.status === 'approved') {
          // Redirecionar IMEDIATAMENTE para página de sucesso (evitar duplicação)
          if (!hasRedirected) {
            setHasRedirected(true);
            navigate(`/zelle/success?method=zelle&status=approved&fee_type=${feeType}&amount=${amount}`);
          }
        } else if (data.status === 'rejected') {
          setPaymentStatus({
            status: 'rejected',
            message: t('zelleWaiting.messages.rejected'),
            details: t('zelleWaiting.details.rejected')
          });
        } else if (data.status === 'pending_verification') {
          console.log('🔍 [ZelleWaiting] Status: pending_verification');
          console.log('�� [ZelleWaiting] n8nAnalysisResult:', n8nAnalysisResult);
          console.log('�� [ZelleWaiting] webhookResponseReceived:', webhookResponseReceived);
          
          // Se já temos resposta do n8n, não fazer nada (deixar o estado atual)
          if (n8nAnalysisResult && webhookResponseReceived) {
            console.log('�� [ZelleWaiting] Resposta do n8n já processada, mantendo estado atual');
            return; // Não alterar o status se já foi processado
          }
          
          // Verificação adicional: se o status atual já é 'under_review', não alterar
          if (paymentStatus.status === 'under_review') {
            console.log('🎯 [ZelleWaiting] Status já é under_review, não alterando');
            return;
          }
          
          // Ainda não recebemos resposta do n8n - continuar análise
          setPaymentStatus({
            status: 'analyzing',
            message: t('zelleWaiting.messages.analyzing'),
            details: `${t('zelleWaiting.waitTime')}: ${Math.floor(timeElapsed / 60)}:${(timeElapsed % 60).toString().padStart(2, '0')}`
          });
        }
      } catch (error) {
        console.log('⚠️ [ZelleWaiting] Erro na verificação do banco, mas continuando sem mostrar erro ao usuário');
        // Não mostrar erro ao usuário, apenas continuar
      }
    };

    // Aguardar um pouco antes de verificar o banco para dar tempo do n8n processar
    const timeoutId = setTimeout(() => {
      // Verificar novamente se o n8n já processou antes de consultar o banco
      if (n8nAnalysisResult && webhookResponseReceived) {
        console.log('🔍 [ZelleWaiting] n8n já processado durante o timeout, cancelando verificação do banco');
        return;
      }
      
      // Se já redirecionamos, não fazer nada
      if (hasRedirected) {
        console.log('🔍 [ZelleWaiting] Já redirecionado, cancelando verificação do banco');
        return;
      }
      
      checkPaymentStatus();
    }, 2000); // Aguardar 2 segundos

    return () => clearTimeout(timeoutId);

    // Verificar a cada 5 segundos para análise mais responsiva (desabilitado)
    // const interval = setInterval(checkPaymentStatus, 5000);

    // return () => clearInterval(interval);
  }, [paymentId, navigate, hasRedirected]);

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
      case 'analyzing':
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />;
      case 'under_review':
        return <Clock className="w-16 h-16 text-orange-500" />;
      default:
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />;
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
      case 'analyzing':
        return 'text-blue-600';
      case 'under_review':
        return 'text-orange-600';
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
      case 'analyzing':
        return 'bg-blue-50';
      case 'under_review':
        return 'bg-orange-50';
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
          <div className="mb-6 flex justify-center">
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

          {/* Timer - apenas para análise automática */}
          {paymentStatus.status === 'analyzing' && (
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

          {/* Progress Bar - apenas para análise automática */}
          {paymentStatus.status === 'analyzing' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div 
                className="h-2 rounded-full transition-all duration-1000 bg-blue-600"
                style={{ 
                  width: `${Math.min((timeElapsed / 120) * 100, 100)}%` 
                }}
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
              onClick={() => navigate('/student/dashboard')}
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
              <span className="font-medium text-gray-900">{feeType?.replace('_', ' ').toUpperCase()}</span>
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
          {paymentStatus.status === 'under_review' 
              ? t('zelleWaiting.helpText.underReview')
              : t('zelleWaiting.helpText.default')
            }
          </p>
        </div>
      </div>
    </div>
  );
};