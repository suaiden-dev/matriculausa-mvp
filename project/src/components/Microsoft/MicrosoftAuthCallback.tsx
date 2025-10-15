import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function MicrosoftAuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Processing Microsoft auth callback
        
        // Obter parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');
        
        if (error) {
          console.error('❌ Azure AD error:', error);
          setError(`Azure AD error: ${error}`);
          setStatus('error');
          return;
        }
        
        if (!code) {
          console.error('❌ No authorization code received');
          setError('No authorization code received');
          setStatus('error');
          return;
        }
        
        if (state !== 'microsoft-connection') {
          console.error('❌ Invalid state parameter');
          setError('Invalid state parameter');
          setStatus('error');
          return;
        }
        
        // Authorization code received, exchanging for tokens
        
        // Buscar sessão atual
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.error('❌ No active session found');
          setError('No active session found');
          setStatus('error');
          return;
        }
        
        // Trocar código por tokens usando a Edge Function
        const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI || `${window.location.origin}/microsoft-email`;
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/microsoft-auth-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            user_id: session.user.id
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Token exchange failed:', errorData);
          setError(`Token exchange failed: ${errorData.message || 'Unknown error'}`);
          setStatus('error');
          return;
        }
        
        const tokenData = await response.json();
        // Tokens received successfully
        
        // Redirecionar para o inbox
        navigate('/microsoft-inbox');
        
      } catch (err: any) {
        console.error('❌ Error processing callback:', err);
        setError(err.message || 'Unknown error');
        setStatus('error');
      }
    };
    
    handleCallback();
  }, [navigate]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Conectando com Microsoft...
          </h2>
          <p className="text-gray-600 text-center">
            Processando autorização, aguarde...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full h-8 w-8 bg-red-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Erro na Conexão
          </h2>
          <p className="text-gray-600 text-center mb-4">
            {error}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/microsoft-inbox')}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
