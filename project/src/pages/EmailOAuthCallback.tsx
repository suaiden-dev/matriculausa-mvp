import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const EmailOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando conexão de email...');

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        if (error) {
          console.error('❌ Erro no OAuth:', error);
          setStatus('error');
          setMessage(`Erro no OAuth: ${error}`);
          // Redirecionar para a página correta baseada no provider
          const provider = state ? state.split('_')[0] : 'google';
          const redirectPath = provider === 'microsoft' 
            ? '/school/dashboard/microsoft-email' 
            : '/school/dashboard/inbox';
          setTimeout(() => navigate(redirectPath), 3000);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Parâmetros OAuth inválidos');
          // Redirecionar para a página correta baseada no provider
          const provider = state ? state.split('_')[0] : 'google';
          const redirectPath = provider === 'microsoft' 
            ? '/school/dashboard/microsoft-email' 
            : '/school/dashboard/inbox';
          setTimeout(() => navigate(redirectPath), 3000);
          return;
        }

        // Extrair provider do state
        const provider = state.split('_')[0] as 'google' | 'microsoft';
        
        // Usar URL dinâmica baseada no ambiente atual
        const redirectUri = `${window.location.origin}/email-oauth-callback`;
        
        console.log('🔍 DEBUG: OAuth Callback Environment detection:', {
          hostname: window.location.hostname,
          redirectUri,
          provider
        });

        console.log('✅ OAuth bem-sucedido! Processando...');
        setMessage(`Processando tokens do ${provider}...`);

        // Trocar código por tokens via Edge Function
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exchange-oauth-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            code,
            provider,
            redirect_uri: redirectUri
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.tokens) {
          // Salvar tokens na tabela
          const { data: connectionData, error: insertError } = await supabase
            .from('email_connections')
            .upsert({
              user_id: user!.id,
              provider,
              access_token: result.tokens.access_token,
              refresh_token: result.tokens.refresh_token,
              expires_at: result.tokens.expires_at,
              email: user!.email,
              scopes: provider === 'google' 
                ? 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
                : 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send'
            })
            .select()
            .single();

          if (insertError) {
            console.error('Erro ao salvar conexão:', insertError);
            setStatus('error');
            setMessage('Erro ao salvar conexão de email');
          } else {
            console.log('✅ Conexão salva com sucesso:', connectionData);
            
            // 🔧 CONFIGURAR GMAIL WATCH AUTOMATICAMENTE
            if (provider === 'google') {
              try {
                console.log('🔧 Configurando Gmail Watch automaticamente...');
                setMessage('Configurando monitoramento de emails...');
                
                const watchResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-all-gmail-watches`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  }
                });

                if (watchResponse.ok) {
                  const watchResult = await watchResponse.json();
                  console.log('✅ Gmail Watch configurado:', watchResult);
                } else {
                  console.warn('⚠️ Erro ao configurar Gmail Watch:', watchResponse.status);
                }
              } catch (watchError) {
                console.warn('⚠️ Erro ao configurar Gmail Watch:', watchError);
                // Não falhar o processo se o Watch der erro
              }
            }
            
            setStatus('success');
            setMessage(`${provider} conectado com sucesso! Redirecionando...`);
            
            // Redirecionar para a página correta baseada no provider
            const redirectPath = provider === 'microsoft' 
              ? '/school/dashboard/microsoft-email' 
              : '/school/dashboard/inbox';
            setTimeout(() => navigate(redirectPath), 2000);
          }
        } else {
          setStatus('error');
          setMessage('Erro ao processar tokens');
        }

      } catch (err: any) {
        console.error('Erro ao processar OAuth:', err);
        setStatus('error');
        setMessage(`Erro ao processar OAuth: ${err.message}`);
        // Redirecionar para a página correta baseada no provider
        const urlParams = new URLSearchParams(window.location.search);
        const state = urlParams.get('state');
        const provider = state ? state.split('_')[0] : 'google';
        const redirectPath = provider === 'microsoft' 
          ? '/school/dashboard/microsoft-email' 
          : '/school/dashboard/inbox';
        setTimeout(() => navigate(redirectPath), 3000);
      }
    };

    processOAuthCallback();
  }, [navigate, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'processing' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto mb-4"></div>
          )}
          
          {status === 'success' && (
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {status === 'processing' && 'Conectando Email...'}
            {status === 'success' && 'Conexão Bem-sucedida!'}
            {status === 'error' && 'Erro na Conexão'}
          </h2>
          
          <p className="text-slate-600 mb-6">{message}</p>
          
          {status === 'error' && (
            <button
              onClick={() => {
                // Redirecionar para a página correta baseada no provider
                const urlParams = new URLSearchParams(window.location.search);
                const state = urlParams.get('state');
                const provider = state ? state.split('_')[0] : 'google';
                const redirectPath = provider === 'microsoft' 
                  ? '/school/dashboard/microsoft-email' 
                  : '/school/dashboard/inbox';
                navigate(redirectPath);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#05294E] to-[#D0151C] text-white rounded-lg hover:from-[#041f3f] hover:to-[#b01218] transition-all duration-300"
            >
              Voltar ao Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailOAuthCallback; 