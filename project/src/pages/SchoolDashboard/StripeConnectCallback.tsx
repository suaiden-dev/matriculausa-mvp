import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const StripeConnectCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { university } = useUniversity();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!university) return;

    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage('Erro durante a autorização do Stripe');
          setError(error);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Código de autorização não recebido');
          return;
        }

        // Chamar edge function para processar o callback
        const { data, error: processError } = await supabase.functions.invoke('process-stripe-connect-callback', {
          body: {
            university_id: university.id,
            code,
            state
          }
        });

        if (processError) {
          throw new Error(processError.message);
        }

        if (data?.success) {
          setStatus('success');
          setMessage('Conta Stripe conectada com sucesso!');
          
          // Redirecionar após 3 segundos
          setTimeout(() => {
            navigate('/school/dashboard/stripe-connect');
          }, 3000);
        } else {
          throw new Error(data?.message || 'Erro ao processar conexão');
        }

      } catch (error: any) {
        console.error('Error processing callback:', error);
        setStatus('error');
        setMessage('Erro ao processar conexão com Stripe');
        setError(error.message);
      }
    };

    processCallback();
  }, [university, searchParams, navigate]);

  const handleRetry = () => {
    navigate('/school/dashboard/stripe-connect');
  };

  const handleDashboard = () => {
    navigate('/school/dashboard');
  };

  if (!university) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#05294E] mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processando conexão...
            </h2>
            <p className="text-gray-600">
              Aguarde enquanto processamos sua conexão com o Stripe
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sucesso!
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleDashboard}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Voltar ao Dashboard
              </button>
              <a
                href="https://dashboard.stripe.com/connect/accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-2 text-blue-600 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Dashboard Stripe
              </a>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Erro na Conexão
            </h2>
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-600 font-mono">
                  {error}
                </p>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                onClick={handleDashboard}
                className="w-full px-4 py-2 text-gray-600 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StripeConnectCallback;
