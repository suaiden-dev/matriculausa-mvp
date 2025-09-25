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

        console.log('🔍 DEBUG - URL completa:', window.location.href);
        console.log('🔍 DEBUG - Search params:', window.location.search);
        console.log('🔍 DEBUG - Code recebido:', code ? 'PRESENTE' : 'AUSENTE');
        console.log('🔍 DEBUG - Error recebido:', error || 'NENHUM');
        console.log('🔍 DEBUG - Error description:', errorDescription || 'NENHUMA');

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

        // A Edge Function não precisa de autenticação do usuário
        console.log('🔍 DEBUG - Edge Function não precisa de autenticação do usuário');
        
        // Chamar Edge Function para trocar code por tokens
        const url = `https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-auth-callback?code=${code}&redirect_uri=${encodeURIComponent('http://localhost:5173/microsoft-email')}`;
        const headers = {
          'Content-Type': 'application/json',
        };
        
        console.log('🔍 DEBUG - URL da Edge Function:', url);
        console.log('🔍 DEBUG - Headers da requisição:', headers);
        console.log('🔍 DEBUG - Headers simplificados (sem autenticação)');
        console.log('🔍 DEBUG - Edge Function usará SERVICE_ROLE_KEY internamente');
        console.log('🔍 DEBUG - Não precisa de autenticação do usuário');
        console.log('🔍 DEBUG - Edge Function é pública e usa SERVICE_ROLE_KEY');
        console.log('🔍 DEBUG - Code recebido:', code ? 'PRESENTE' : 'AUSENTE');
        console.log('🔍 DEBUG - Redirect URI:', window.location.origin + '/microsoft-email');
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });

        console.log('🔍 DEBUG - Status da resposta:', response.status);
        console.log('🔍 DEBUG - OK da resposta:', response.ok);
        console.log('🔍 DEBUG - Headers da resposta:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          console.error('❌ Erro na resposta da Edge Function');
          console.error('❌ Status:', response.status);
          console.error('❌ StatusText:', response.statusText);
          
          let errorData;
          try {
            errorData = await response.json();
            console.error('❌ Error data:', errorData);
          } catch (jsonError) {
            console.error('❌ Erro ao fazer parse do JSON:', jsonError);
            const textResponse = await response.text();
            console.error('❌ Resposta como texto:', textResponse);
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
          }
          
          throw new Error(errorData.error || 'Erro ao trocar código por tokens');
        }

        const result = await response.json();
        console.log('✅ DEBUG - Resultado da Edge Function:', result);
        
        setStatus('success');
        setMessage('✅ Conta Microsoft conectada com sucesso!');
        
        // Redirecionar para gerenciamento de email após 3 segundos
        setTimeout(() => {
          navigate('/school/dashboard/email');
        }, 3000);

      } catch (error: any) {
        console.error('❌ Erro no callback:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
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
