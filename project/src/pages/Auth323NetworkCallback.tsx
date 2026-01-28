import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import PencilLoader from '../components/PencilLoader';
import { useTranslation } from 'react-i18next';

const Auth323NetworkCallback: React.FC = () => {
  const { t, ready } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const hasProcessed = useRef(false); // Flag para evitar execução dupla

  // Inicializar mensagem quando i18n estiver pronto
  useEffect(() => {
    if (ready) {
      const translatedMessage = t('ssoCallback.processing.preparing');
      console.log('[SSO Callback] 🔍 Tradução:', translatedMessage);
      console.log('[SSO Callback] 🔍 Ready:', ready);
      // Verificar se a tradução foi resolvida (não retornou a chave)
      if (translatedMessage && translatedMessage !== 'ssoCallback.processing.preparing') {
        setMessage(translatedMessage);
      } else {
        console.warn('[SSO Callback] ⚠️ Tradução não encontrada, usando fallback');
        // Fallback se a tradução não estiver disponível
        setMessage('Estamos preparando o ambiente para você...');
      }
    }
  }, [ready, t]);

  useEffect(() => {
    // Prevenir execução dupla (React StrictMode em desenvolvimento)
    if (hasProcessed.current) {
      console.log('[SSO Callback] ⚠️ Callback já foi processado, ignorando execução dupla');
      return;
    }

    const handleCallback = async () => {
      try {
        // Marcar como processado imediatamente para evitar duplicação
        hasProcessed.current = true;
        console.log('[SSO Callback] 🚀 Iniciando processamento SSO...');
        console.log('[SSO Callback] 🌐 URL atual:', window.location.href);
        console.log('[SSO Callback] 🌐 Origin:', window.location.origin);
        console.log('[SSO Callback] 🌐 Hostname:', window.location.hostname);
        
        // Verificar se há tokens no hash (vindo do Supabase após magic link)
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const accessTokenFromHash = hashParams.get('access_token');
        const refreshTokenFromHash = hashParams.get('refresh_token');
        
        if (accessTokenFromHash && refreshTokenFromHash) {
          console.log('[SSO Callback] 🔑 Tokens encontrados no hash (vindo do Supabase)');
          setStep(3);
          setMessage(t('ssoCallback.processing.creatingSession'));
          
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessTokenFromHash,
              refresh_token: refreshTokenFromHash,
            });

            if (sessionError) {
              throw new Error(`${t('ssoCallback.error.sessionCreationError')}: ${sessionError.message}`);
            }

            if (!sessionData.session) {
              throw new Error(t('ssoCallback.error.sessionNotCreated'));
            }

            console.log('[SSO Callback] ✅ Sessão criada com sucesso via hash!');
            
            // ✅ Atualizar IP e User-Agent dos termos auto-aceitos
            try {
              const { getClientInfo } = await import('../utils/clientInfo');
              const clientInfo = await getClientInfo();
              if (clientInfo.registration_ip) {
                await supabase.rpc('update_term_acceptance_client_info', {
                  p_ip_address: clientInfo.registration_ip,
                  p_user_agent: clientInfo.user_agent
                });
                console.log('[SSO Callback] 📝 Informações de IP/UA atualizadas nos termos');
              }
            } catch (e) {
              console.warn('[SSO Callback] ⚠️ Erro ao atualizar informações legais:', e);
            }

            setStep(4);
            setStatus('success');
            setMessage(t('ssoCallback.success.returningUser'));
            toast.success(t('ssoCallback.success.loginSuccess'));

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
          throw new Error(t('ssoCallback.error.tokenNotProvided'));
        }

        if (source && source !== '323-network') {
          console.warn('[SSO Callback] ⚠️ Origem inválida:', source);
          // Não falhar, apenas logar
        }

        setStep(2);
        setMessage(t('ssoCallback.processing.connecting'));

        // Chamar Edge Function do Matrícula US para processar SSO
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error(t('ssoCallback.error.supabaseUrlNotConfigured'));
        }

        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/sso-323-network-callback`;
        const currentOrigin = window.location.origin;
        
        console.log('[SSO Callback] 🔗 Chamando Edge Function:', edgeFunctionUrl);
        console.log('[SSO Callback] 🌐 Origin atual (será enviado no header):', currentOrigin);

        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Origin': currentOrigin, // Enviar origin explicitamente
            'Referer': window.location.href, // Enviar referer completo
          },
          body: JSON.stringify({ token }),
        });

        console.log('[SSO Callback] 📡 Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: t('ssoCallback.error.tokenValidationError') }));
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
          // Traduzir mensagem de erro antes de lançar
          let errorMsg = data.error || t('authPage.messages.authenticationFailed');
          const msgLower = errorMsg.toLowerCase().trim();
          
          if (
            msgLower === 'this email is already registered. please sign in or use another email.' ||
            msgLower.includes('this email is already registered') ||
            msgLower.includes('email is already registered') ||
            msgLower.includes('already registered') ||
            msgLower.includes('user with this email address has already been registered') ||
            msgLower.includes('email already registered') ||
            msgLower.includes('user_already_registered') ||
            msgLower.includes('a user with this email address has already been registered')
          ) {
            errorMsg = t('authPage.messages.emailAlreadyRegistered');
          }
          
          throw new Error(errorMsg);
        }

        setStep(3);
        setMessage(t('ssoCallback.processing.preparingAccount'));

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
              throw new Error(`${t('ssoCallback.error.sessionCreationError')}: ${sessionError.message}`);
            }

            if (!sessionData.session) {
              console.error('[SSO Callback] ❌ Sessão não foi criada - sessionData:', sessionData);
              throw new Error(t('ssoCallback.error.sessionNotCreated'));
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
        // Se temos magic link, extrair token e verificar diretamente (sem redirecionar)
        else if (data.magicLink) {
          console.log('[SSO Callback] 🔗 Usando magic link...');
          console.log('[SSO Callback] 🔗 Magic link URL:', data.magicLink);
          
          const magicLinkUrl = new URL(data.magicLink);
          const currentOrigin = window.location.origin;
          
          console.log('[SSO Callback] 🔗 Magic link origin:', magicLinkUrl.origin);
          console.log('[SSO Callback] 🔗 Current origin:', currentOrigin);
          
          // Extrair token do magic link
          try {
            const token = magicLinkUrl.searchParams.get('token');
            const type = magicLinkUrl.searchParams.get('type');
            
            console.log('[SSO Callback] 🔑 Token extraído do magic link:', {
              hasToken: !!token,
              type,
            });

            if (token && type === 'magiclink') {
              console.log('[SSO Callback] 🔑 Verificando token via fetch direto ao Supabase Auth...');
              
              // Fazer fetch direto ao endpoint de verificação do Supabase Auth
              // Isso evita o redirecionamento que causa o problema
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const currentOrigin = window.location.origin;
              
              // Construir URL de verificação com redirect_to local
              const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`);
              verifyUrl.searchParams.set('token', token);
              verifyUrl.searchParams.set('type', type);
              verifyUrl.searchParams.set('redirect_to', `${currentOrigin}/auth/callback`);
              
              console.log('[SSO Callback] 🔗 URL de verificação:', verifyUrl.toString());
              
              try {
                // Fazer fetch com redirect: 'manual' para interceptar a resposta
                const verifyResponse = await fetch(verifyUrl.toString(), {
                  method: 'GET',
                  headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                  },
                  redirect: 'manual', // Não seguir redirects automaticamente
                });

                console.log('[SSO Callback] 📡 Status da resposta:', verifyResponse.status);
                console.log('[SSO Callback] 📡 Headers:', Object.fromEntries(verifyResponse.headers.entries()));

                // Se a resposta é um redirect (301, 302, etc), extrair tokens do Location header
                if (verifyResponse.status >= 300 && verifyResponse.status < 400) {
                  const location = verifyResponse.headers.get('Location');
                  console.log('[SSO Callback] 🔄 Redirect detectado para:', location);
                  
                  if (location) {
                    try {
                      const redirectUrl = new URL(location);
                      const hash = redirectUrl.hash.substring(1);
                      const hashParams = new URLSearchParams(hash);
                      const accessToken = hashParams.get('access_token');
                      const refreshToken = hashParams.get('refresh_token');
                      
                      if (accessToken && refreshToken) {
                        console.log('[SSO Callback] 🔑 Tokens extraídos do redirect');
                        
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                          access_token: accessToken,
                          refresh_token: refreshToken,
                        });

                        if (sessionError) {
                          throw new Error(`${t('ssoCallback.error.sessionCreationError')}: ${sessionError.message}`);
                        }

                        if (!sessionData.session) {
                          throw new Error(t('ssoCallback.error.sessionNotCreated'));
                        }

                        console.log('[SSO Callback] ✅ Sessão criada com sucesso!');
                        console.log('[SSO Callback] 👤 Usuário:', sessionData.user?.email);

                        // ✅ Atualizar IP e User-Agent dos termos auto-aceitos
                        try {
                          const { getClientInfo } = await import('../utils/clientInfo');
                          const clientInfo = await getClientInfo();
                          if (clientInfo.registration_ip) {
                            await supabase.rpc('update_term_acceptance_client_info', {
                              p_ip_address: clientInfo.registration_ip,
                              p_user_agent: clientInfo.user_agent
                            });
                            console.log('[SSO Callback] 📝 Informações de IP/UA atualizadas nos termos');
                          }
                        } catch (e) {
                          console.warn('[SSO Callback] ⚠️ Erro ao atualizar informações legais:', e);
                        }
                      } else {
                        throw new Error(t('ssoCallback.error.tokensNotFoundInRedirect'));
                      }
                    } catch (parseErr: any) {
                      console.error('[SSO Callback] ❌ Erro ao parsear redirect:', parseErr);
                      throw new Error(`${t('ssoCallback.error.sessionCreationError')}: ${parseErr.message}`);
                    }
                  } else {
                    throw new Error(t('ssoCallback.error.locationHeaderNotFound'));
                  }
                } else if (verifyResponse.ok) {
                  // Se a resposta é OK, tentar extrair tokens do body
                  const verifyResult = await verifyResponse.json().catch(() => ({}));
                  
                  if (verifyResult.access_token && verifyResult.refresh_token) {
                    console.log('[SSO Callback] 🔑 Tokens obtidos do body da resposta');
                    
                    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                      access_token: verifyResult.access_token,
                      refresh_token: verifyResult.refresh_token,
                    });

                    if (sessionError) {
                      throw new Error(`${t('ssoCallback.error.sessionCreationError')}: ${sessionError.message}`);
                    }

                    if (!sessionData.session) {
                      throw new Error(t('ssoCallback.error.sessionNotCreated'));
                    }

                    console.log('[SSO Callback] ✅ Sessão criada com sucesso!');
                  } else {
                    throw new Error(t('ssoCallback.error.tokensNotFoundInResponse'));
                  }
                } else {
                  const errorText = await verifyResponse.text().catch(() => 'Erro desconhecido');
                  throw new Error(`Erro HTTP ${verifyResponse.status}: ${errorText}`);
                }
              } catch (fetchErr: any) {
                console.error('[SSO Callback] ❌ ERRO ao verificar token:', fetchErr);
                throw new Error(`${t('ssoCallback.error.tokenValidationError')}: ${fetchErr.message}`);
              }
            } else {
              console.error('[SSO Callback] ❌ Token ou type não encontrados no magic link');
              throw new Error(t('ssoCallback.error.tokenNotFoundInMagicLink'));
            }
          } catch (e: any) {
            console.error('[SSO Callback] ❌ ERRO ao processar magic link:', e);
            console.error('[SSO Callback] ❌ Stack:', e.stack);
            throw e;
          }
        } else {
          console.error('[SSO Callback] ❌ Nenhum método de autenticação disponível');
          console.error('[SSO Callback] ❌ Dados completos recebidos:', JSON.stringify(data, null, 2));
          throw new Error(t('ssoCallback.error.noAuthMethod'));
        }

        setStep(4);
        setStatus('success');
        setMessage(data.isNewUser 
          ? t('ssoCallback.success.newUser')
          : t('ssoCallback.success.returningUser')
        );

        // Mostrar toast de sucesso
        toast.success(data.isNewUser ? t('ssoCallback.success.welcomeNew') : t('ssoCallback.success.loginSuccess'));

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
        
        // Resetar flag em caso de erro para permitir retry
        hasProcessed.current = false;
        
        setStatus('error');
        
        // Extrair mensagem de erro de várias fontes possíveis
        let errorMessage = 
          error?.message || 
          error?.error || 
          error?.data?.error ||
          error?.response?.data?.error ||
          (typeof error === 'string' ? error : null) ||
          t('authPage.messages.authenticationFailed');
        
        // Traduzir mensagens de erro comuns
        if (errorMessage) {
          const messageLower = errorMessage.toLowerCase().trim();
          
          // Detectar mensagens de email já cadastrado (todas as variações possíveis)
          if (
            messageLower === 'this email is already registered. please sign in or use another email.' ||
            messageLower.includes('this email is already registered') ||
            messageLower.includes('email is already registered') ||
            messageLower.includes('already registered') ||
            messageLower.includes('user with this email address has already been registered') ||
            messageLower.includes('email already registered') ||
            messageLower.includes('user_already_registered') ||
            messageLower.includes('a user with this email address has already been registered') ||
            messageLower.includes('email_already_registered')
          ) {
            errorMessage = t('authPage.messages.emailAlreadyRegistered');
          } else if (messageLower.includes('invalid_credentials') || messageLower.includes('invalid login credentials')) {
            errorMessage = t('authPage.messages.invalidCredentials');
          } else if (messageLower.includes('email_not_confirmed')) {
            errorMessage = t('authPage.messages.emailNotConfirmed');
          } else if (messageLower.includes('too_many_requests')) {
            errorMessage = t('authPage.messages.tooManyRequests');
          } else if (messageLower.includes('user_not_found')) {
            errorMessage = t('authPage.messages.userNotFound');
          } else if (messageLower.includes('weak_password')) {
            errorMessage = t('authPage.messages.weakPassword');
          } else if (messageLower.includes('email_address_invalid')) {
            errorMessage = t('authPage.messages.invalidEmail');
          } else if (messageLower.includes('signup_disabled')) {
            errorMessage = t('authPage.messages.signupDisabled');
          }
        }
        
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
              {ready && status === 'processing' && t('ssoCallback.processing.title')}
              {ready && status === 'success' && t('ssoCallback.success.title')}
              {ready && status === 'error' && t('ssoCallback.error.title')}
              {!ready && status === 'processing' && 'Aguarde um momento'}
              {!ready && status === 'success' && 'Tudo pronto!'}
              {!ready && status === 'error' && 'Ops, algo deu errado'}
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              {message || (ready ? t('ssoCallback.processing.preparing') : 'Estamos preparando o ambiente para você...')}
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
                {t('ssoCallback.processing.waitMessage')}
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
                    {t('ssoCallback.success.redirecting')}
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
                  {t('ssoCallback.error.authenticationFailed')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    hasProcessed.current = false; // Resetar flag para permitir retry
                    window.location.reload();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('ssoCallback.error.tryAgain')}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  {t('ssoCallback.error.goToLogin')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Only show during processing */}
        {status === 'processing' && (
          <div className="text-center mt-8">
            <p className="text-xs text-gray-400">
              {t('ssoCallback.processing.secureConnection')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth323NetworkCallback;

