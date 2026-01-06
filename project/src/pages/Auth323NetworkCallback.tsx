import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import PencilLoader from '../components/PencilLoader';

const Auth323NetworkCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Estamos preparando o ambiente para você...');
  const [step, setStep] = useState(1);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[SSO Callback] 🚀 Iniciando processamento SSO...');
        
        // Verificar se há tokens no hash (vindo do Supabase após magic link)
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const accessTokenFromHash = hashParams.get('access_token');
        const refreshTokenFromHash = hashParams.get('refresh_token');
        
        if (accessTokenFromHash && refreshTokenFromHash) {
          console.log('[SSO Callback] 🔑 Tokens encontrados no hash (vindo do Supabase)');
          setStep(3);
          setMessage('Criando sessão...');
          
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessTokenFromHash,
              refresh_token: refreshTokenFromHash,
            });

            if (sessionError) {
              throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
            }

            if (!sessionData.session) {
              throw new Error('Sessão não foi criada corretamente');
            }

            console.log('[SSO Callback] ✅ Sessão criada com sucesso via hash!');
            setStep(4);
            setStatus('success');
            setMessage('Bem-vindo! Redirecionando...');
            toast.success('Login realizado com sucesso!');

            setTimeout(() => {
              navigate('/student/dashboard');
            }, 1500);
            return;
          } catch (hashErr: any) {
            console.error('[SSO Callback] ❌ Erro ao processar tokens do hash:', hashErr);
            throw hashErr;
          }
        }
        
        // Obter token da query string (vindo do 323 Network)
        const token = searchParams.get('token');
        const source = searchParams.get('source');
        const returnTo = searchParams.get('returnTo') || '/student/dashboard';

        console.log('[SSO Callback] 📋 Parâmetros recebidos:', {
          hasToken: !!token,
          source,
          returnTo,
        });

        if (!token) {
          throw new Error('Token não fornecido na URL');
        }

        if (source && source !== '323-network') {
          console.warn('[SSO Callback] ⚠️ Origem inválida:', source);
          // Não falhar, apenas logar
        }

        setStep(2);
        setMessage('Conectando com o 323 Network...');

        // Chamar Edge Function do Matrícula US para processar SSO
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('VITE_SUPABASE_URL não configurada');
        }

        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/sso-323-network-callback`;
        console.log('[SSO Callback] 🔗 Chamando Edge Function:', edgeFunctionUrl);

        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token }),
        });

        console.log('[SSO Callback] 📡 Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro ao validar token' }));
          console.error('[SSO Callback] ❌ Erro na resposta:', errorData);
          throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('[SSO Callback] ✅ Dados recebidos:', {
          success: data.success,
          isNewUser: data.isNewUser,
          hasSession: !!data.session,
          hasMagicLink: !!data.magicLink,
        });

        if (!data.success) {
          throw new Error(data.error || 'Falha ao processar autenticação');
        }

        setStep(3);
        setMessage('Preparando sua conta...');

        console.log('[SSO Callback] 📍 Step 3 - Iniciando criação de sessão');
        console.log('[SSO Callback] 📍 URL atual:', window.location.href);
        console.log('[SSO Callback] 📍 Hostname:', window.location.hostname);
        console.log('[SSO Callback] 📍 Dados recebidos:', {
          hasSession: !!data.session,
          hasMagicLink: !!data.magicLink,
          sessionKeys: data.session ? Object.keys(data.session) : null,
          magicLinkUrl: data.magicLink ? new URL(data.magicLink).origin : null,
        });

        // Se temos tokens diretamente, usar
        if (data.session?.access_token && data.session?.refresh_token) {
          console.log('[SSO Callback] 🔑 Usando tokens diretos da resposta');
          console.log('[SSO Callback] 🔑 Access token presente:', !!data.session.access_token);
          console.log('[SSO Callback] 🔑 Refresh token presente:', !!data.session.refresh_token);
          
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });

            console.log('[SSO Callback] 📍 Resultado setSession:', {
              hasSession: !!sessionData?.session,
              hasError: !!sessionError,
              errorMessage: sessionError?.message,
            });

            if (sessionError) {
              console.error('[SSO Callback] ❌ Erro ao criar sessão:', sessionError);
              console.error('[SSO Callback] ❌ Detalhes do erro:', JSON.stringify(sessionError, null, 2));
              throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
            }

            if (!sessionData.session) {
              console.error('[SSO Callback] ❌ Sessão não foi criada - sessionData:', sessionData);
              throw new Error('Sessão não foi criada corretamente');
            }

            console.log('[SSO Callback] ✅ Sessão criada com sucesso!');
            console.log('[SSO Callback] 👤 Usuário:', sessionData.session.user?.email);
            console.log('[SSO Callback] 🆕 Novo usuário?', data.isNewUser);
          } catch (sessionErr: any) {
            console.error('[SSO Callback] ❌ ERRO CRÍTICO no step 3:', sessionErr);
            console.error('[SSO Callback] ❌ Stack trace:', sessionErr.stack);
            throw sessionErr;
          }
        } 
        // Se temos magic link, usar para fazer login
        else if (data.magicLink) {
          console.log('[SSO Callback] 🔗 Usando magic link...');
          console.log('[SSO Callback] 🔗 Magic link URL:', data.magicLink);
          
          // Verificar se o magic link aponta para produção quando estamos em dev
          const magicLinkUrl = new URL(data.magicLink);
          const currentOrigin = window.location.origin;
          
          console.log('[SSO Callback] 🔗 Magic link origin:', magicLinkUrl.origin);
          console.log('[SSO Callback] 🔗 Current origin:', currentOrigin);
          
          // Se o magic link aponta para produção mas estamos em dev, tentar extrair tokens
          if (magicLinkUrl.origin !== currentOrigin && magicLinkUrl.origin.includes('matriculausa.com')) {
            console.warn('[SSO Callback] ⚠️ Magic link aponta para produção, mas estamos em dev!');
            console.warn('[SSO Callback] ⚠️ Tentando extrair tokens do hash...');
          }
          
          // Extrair tokens do hash do link
          try {
            const hash = magicLinkUrl.hash.substring(1); // Remove o #
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            console.log('[SSO Callback] 🔑 Tokens extraídos:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
            });

            if (accessToken && refreshToken) {
              console.log('[SSO Callback] 🔑 Tokens extraídos do magic link com sucesso');
              
              try {
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                if (sessionError) {
                  console.error('[SSO Callback] ❌ Erro ao criar sessão via magic link:', sessionError);
                  throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
                }

                if (!sessionData.session) {
                  throw new Error('Sessão não foi criada corretamente');
                }

                console.log('[SSO Callback] ✅ Sessão criada com sucesso via magic link!');
              } catch (sessionErr: any) {
                console.error('[SSO Callback] ❌ ERRO ao criar sessão do magic link:', sessionErr);
                throw sessionErr;
              }
            } else {
              // Se não conseguimos extrair tokens, verificar o redirect_to no magic link
              console.warn('[SSO Callback] ⚠️ Não foi possível extrair tokens do magic link');
              
              const redirectTo = magicLinkUrl.searchParams.get('redirect_to');
              console.log('[SSO Callback] 🔗 redirect_to no magic link:', redirectTo);
              
              // Se estamos em desenvolvimento e o redirect_to aponta para produção, corrigir
              if (currentOrigin.includes('localhost') || currentOrigin.includes('192.168') || currentOrigin.includes('127.0.0.1')) {
                if (redirectTo && redirectTo.includes('matriculausa.com')) {
                  console.error('[SSO Callback] ❌ ERRO: redirect_to aponta para produção em ambiente de desenvolvimento!');
                  console.error('[SSO Callback] ❌ redirect_to:', redirectTo);
                  console.error('[SSO Callback] ❌ Deveria ser:', `${currentOrigin}/auth/callback`);
                  
                  // Corrigir o redirect_to no magic link
                  magicLinkUrl.searchParams.set('redirect_to', `${currentOrigin}/auth/callback`);
                  const correctedLink = magicLinkUrl.toString();
                  console.log('[SSO Callback] ✅ Magic link corrigido:', correctedLink);
                  
                  // Redirecionar para o link corrigido
                  window.location.href = correctedLink;
                  return;
                }
              }
              
              // Se não estamos em dev, redirecionar normalmente
              console.log('[SSO Callback] 🔄 Redirecionando para magic link...');
              window.location.href = data.magicLink;
              return;
            }
          } catch (e: any) {
            console.error('[SSO Callback] ❌ ERRO ao processar magic link:', e);
            console.error('[SSO Callback] ❌ Stack:', e.stack);
            
            // Se estamos em dev e o erro é relacionado a produção, não redirecionar
            const currentOrigin = window.location.origin;
            if (currentOrigin.includes('localhost') || currentOrigin.includes('192.168') || currentOrigin.includes('127.0.0.1')) {
              if (e.message?.includes('produção') || e.message?.includes('matriculausa.com')) {
                throw e; // Re-throw para mostrar o erro
              }
            }
            
            // Se não conseguimos processar o link, redirecionar para ele (apenas se não for dev)
            console.warn('[SSO Callback] ⚠️ Não foi possível processar magic link, redirecionando:', e);
            window.location.href = data.magicLink;
            return;
          }
        } else {
          console.error('[SSO Callback] ❌ Nenhum método de autenticação disponível');
          console.error('[SSO Callback] ❌ Dados completos recebidos:', JSON.stringify(data, null, 2));
          throw new Error('Nenhum método de autenticação disponível');
        }

        setStep(4);
        setStatus('success');
        setMessage(data.isNewUser 
          ? 'Tudo pronto! Redirecionando você...' 
          : 'Bem-vindo de volta! Redirecionando...'
        );

        // Mostrar toast de sucesso
        toast.success(data.isNewUser ? 'Bem-vindo ao Matrícula US!' : 'Login realizado com sucesso!');

        // Redirecionar após 1.5 segundos
        setTimeout(() => {
          if (returnTo.startsWith('http')) {
            window.location.href = returnTo;
          } else {
            navigate(returnTo);
          }
        }, 1500);

      } catch (error: any) {
        console.error('[SSO Callback] ❌ ERRO COMPLETO no callback SSO:', error);
        console.error('[SSO Callback] ❌ Tipo do erro:', typeof error);
        console.error('[SSO Callback] ❌ Mensagem:', error.message);
        console.error('[SSO Callback] ❌ Stack:', error.stack);
        console.error('[SSO Callback] ❌ Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        
        setStatus('error');
        const errorMessage = error.message || 'Erro ao processar autenticação';
        setMessage(errorMessage);
        toast.error(errorMessage);
        
        // NÃO redirecionar automaticamente em caso de erro - deixar o usuário ver o erro
        // O usuário pode clicar em "Tentar Novamente" ou "Ir para Login"
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-md w-full mx-4">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-10">
          {/* Loading Animation - Pencil Loader */}
          {status === 'processing' && (
            <div className="flex flex-col items-center mb-8">
              <PencilLoader />
            </div>
          )}

          {/* Success Icon */}
          {status === 'success' && (
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
          )}

          {/* Error Icon */}
          {status === 'error' && (
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>
          )}

          {/* Main Message */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {status === 'processing' && 'Aguarde um momento'}
              {status === 'success' && 'Tudo pronto!'}
              {status === 'error' && 'Ops, algo deu errado'}
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Subtle Progress Indicator */}
          {status === 'processing' && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(step / 4) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Isso pode levar alguns segundos...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="w-5 h-5 text-green-600 animate-pulse" />
                  <p className="text-sm font-medium text-green-700">
                    Redirecionando você agora...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">
                  Não foi possível completar a autenticação. Você será redirecionado para a página de login em instantes.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Ir para Login
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Only show during processing */}
        {status === 'processing' && (
          <div className="text-center mt-8">
            <p className="text-xs text-gray-400">
              Conectando com segurança ao Matrícula USA
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth323NetworkCallback;

