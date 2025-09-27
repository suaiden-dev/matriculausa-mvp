import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MicrosoftCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authorization...');
  const [step, setStep] = useState(1);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extrair parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');


        if (error) {
          setStatus('error');
          setMessage(`Error: ${error} - ${errorDescription}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Authorization code not provided');
          return;
        }

        setStep(2);
        setMessage('Exchanging authorization code for tokens...');
        
        // Chamar Edge Function para trocar code por tokens
        const url = `https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-auth-callback?code=${code}&redirect_uri=${encodeURIComponent('http://localhost:5173/microsoft-email')}`;
        
        // 🔑 OBTER TOKEN DE AUTORIZAÇÃO DO USUÁRIO
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Usuário não está autenticado');
        }
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
          
          throw new Error(errorData.error || 'Failed to exchange authorization code for tokens');
        }

        const result = await response.json();
        
        setStep(3);
        setStatus('success');
        setMessage('Microsoft account connected successfully!');
        
        // Redirecionar direto para o inbox do Microsoft após 2 segundos
        setTimeout(() => {
          // Usar o config ID do resultado para redirecionar para o inbox específico
          const configId = result.configId || result.email_configuration_id;
          if (configId) {
            navigate(`/school/dashboard/email/inbox?config=${configId}`);
          } else {
            // Fallback para a página de gerenciamento se não tiver config ID
            navigate('/school/dashboard/email');
          }
        }, 2000);

      } catch (error: any) {
        console.error('Error in Microsoft callback:', error);
        setStatus('error');
        setMessage(`Error: ${error.message}`);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-lg w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full shadow-lg flex items-center justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Microsoft Account Setup</h1>
          <p className="text-gray-600">Connecting your Microsoft account to Matricula USA</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              status === 'processing' ? 'bg-blue-100' :
              status === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {status === 'processing' && (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
              {status === 'error' && (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
          </div>

          {/* Progress Steps */}
          {status === 'processing' && (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
                <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  3
                </div>
              </div>
              <div className="text-center text-sm text-gray-500">
                {step === 1 && 'Receiving authorization...'}
                {step === 2 && 'Exchanging tokens...'}
                {step === 3 && 'Finalizing connection...'}
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="text-center mb-6">
            <h2 className={`text-xl font-semibold mb-2 ${
              status === 'success' ? 'text-green-800' : 
              status === 'error' ? 'text-red-800' : 'text-blue-800'
            }`}>
              {status === 'processing' && 'Processing...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Error'}
            </h2>
            <p className="text-gray-600">{message}</p>
          </div>

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-700">
                  <ArrowRight className="w-4 h-4 inline mr-1" />
                  Redirecting to Microsoft inbox...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700">
                  There was an issue connecting your Microsoft account. Please try again.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/school/dashboard/email')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back to Email Management
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Powered by Microsoft Graph API
          </p>
        </div>
      </div>
    </div>
  );
};

export default MicrosoftCallback;
