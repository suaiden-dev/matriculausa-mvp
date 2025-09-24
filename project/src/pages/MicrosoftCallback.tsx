import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const MicrosoftCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autorização...');

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
          setMessage(`Erro: ${error} - ${errorDescription}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Código de autorização não fornecido');
          return;
        }

        setMessage('Trocando código por tokens...');

        // Obter token de autenticação do Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        // Chamar Edge Function para trocar code por tokens
        const response = await fetch(`https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-auth-callback?code=${code}&redirect_uri=${encodeURIComponent(window.location.origin + '/microsoft-email')}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao trocar código por tokens');
        }

        const result = await response.json();
        
        setStatus('success');
        setMessage('✅ Conta Microsoft conectada com sucesso!');
        
        // Redirecionar para gerenciamento de email após 3 segundos
        setTimeout(() => {
          navigate('/email-management');
        }, 3000);

      } catch (error: any) {
        console.error('Erro no callback:', error);
        setStatus('error');
        setMessage(`Erro: ${error.message}`);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            status === 'processing' ? 'bg-blue-100' :
            status === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {status === 'processing' && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            )}
            {status === 'success' && (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          
          <h2 className={`text-xl font-semibold mb-2 ${
            status === 'success' ? 'text-green-800' : 
            status === 'error' ? 'text-red-800' : 'text-blue-800'
          }`}>
            {status === 'processing' && 'Processando...'}
            {status === 'success' && 'Sucesso!'}
            {status === 'error' && 'Erro'}
          </h2>
          
          <p className="text-gray-600 mb-4">{message}</p>
          
          {status === 'success' && (
            <p className="text-sm text-gray-500">
              Redirecionando para gerenciamento de email...
            </p>
          )}
          
          {status === 'error' && (
            <button
              onClick={() => navigate('/email-management')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Voltar para Gerenciamento
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MicrosoftCallback;
