import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { usePaymentBlockedContext } from '../contexts/PaymentBlockedContext';

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingUniversity, setCheckingUniversity] = useState(false);
  const lastCheckedPath = useRef<string>('');
  const universityCache = useRef<{ [userId: string]: any }>({});

  const checkUniversityStatus = useCallback(async (userId: string) => {
    if (universityCache.current[userId]) {
      return universityCache.current[userId];
    }

    try {
      const { data: university, error } = await supabase
        .from('universities')
        .select('terms_accepted, profile_completed')
        .eq('user_id', userId)
        .single();

      const result = {
        error: error && error.code !== 'PGRST116' ? error : null,
        university: university || null
      };

      universityCache.current[userId] = result;
      setTimeout(() => {
        delete universityCache.current[userId];
      }, 30000);

      return result;
    } catch (error) {
      return { error, university: null };
    }
  }, []);

  const { isBlocked: paymentIsBlocked, pendingPayment, rejectedPayment } = usePaymentBlockedContext();

  // Derivado do context — sem request adicional
  const hasPendingOrRejectedSelectionPayment = (() => {
    if (pendingPayment &&
      pendingPayment.id !== '00000000-0000-0000-0000-000000000000' &&
      (pendingPayment.fee_type === 'selection_process' || !pendingPayment.fee_type || pendingPayment.fee_type === '')) {
      return paymentIsBlocked;
    }
    if (rejectedPayment &&
      rejectedPayment.id !== '00000000-0000-0000-0000-000000000000' &&
      (rejectedPayment.fee_type === 'selection_process' || !rejectedPayment.fee_type || rejectedPayment.fee_type === '') &&
      !pendingPayment) {
      return true;
    }
    return false;
  })();

  useEffect(() => {
    // Tratar erros de verificação de email no hash da URL
    const hash = window.location.hash;
    if (hash && !user && !loading) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');

      if (error && errorCode) {
        console.error('[AuthRedirect] ❌ Erro de verificação de email detectado:', { error, errorCode, errorDescription });

        if (errorCode === 'otp_expired' || error === 'access_denied') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);

          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              const userRole = session.user.user_metadata?.role || 'student';
              if (userRole === 'student') {
                navigate('/student/dashboard', { replace: true });
              } else if (userRole === 'admin') {
                navigate('/admin/dashboard', { replace: true });
              } else if (userRole === 'seller') {
                navigate('/seller/dashboard', { replace: true });
              } else if (userRole === 'school') {
                navigate('/school/dashboard', { replace: true });
              } else {
                navigate('/login?info=email_already_confirmed&message=' + encodeURIComponent('Seu email já foi confirmado! Você pode fazer login agora.'));
              }
            } else {
              const friendlyMessage = 'Seu email já foi confirmado! Você pode fazer login agora com seu email e senha.';
              navigate('/login?info=email_already_confirmed&message=' + encodeURIComponent(friendlyMessage));
            }
          });
          return;
        }
      }
    } else if (hash && user) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Aguardar carregamento
    if (loading) return;

    // Se não há usuário autenticado, verificar se está tentando acessar rota protegida
    if (!user) {
      const currentPath = location.pathname;
      const protectedPaths = [
        '/student/dashboard',
        '/school/dashboard',
        '/admin/dashboard',
        '/affiliate-admin/dashboard',
        '/seller/dashboard'
      ];
      const isProtectedPath = protectedPaths.some(path => currentPath.startsWith(path));

      if (isProtectedPath) {
        const returnUrl = encodeURIComponent(currentPath + location.search);
        navigate(`/login?redirect=${returnUrl}`, { replace: true });
        return;
      }
      return;
    }

    const currentPath = location.pathname;

    // Detectar fluxo de recuperação de senha
    const isPasswordResetFlow = currentPath.startsWith('/forgot-password') ||
      window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');
    if (isPasswordResetFlow) return;

    // Páginas públicas que não precisam de verificação
    const publicPaths = ['/schools', '/scholarships', '/about', '/how-it-works', '/universities'];
    if (publicPaths.some(path => currentPath === path || currentPath.startsWith(path))) return;

    // Evitar re-execução se o path não mudou
    if (lastCheckedPath.current === currentPath && !currentPath.includes('/login') && !currentPath.includes('/auth')) {
      return;
    }
    lastCheckedPath.current = currentPath;

    const checkAndRedirect = async () => {
      const isWhitelistedInternalRegister = location.pathname === '/student/register';

      // REDIRECIONAMENTO APÓS LOGIN
      if (currentPath === '/login' || currentPath === '/auth' || currentPath === '/register') {
        const searchParams = new URLSearchParams(location.search);
        const redirectParam = searchParams.get('redirect');

        if (redirectParam) {
          try {
            const decodedRedirect = decodeURIComponent(redirectParam);
            navigate(decodedRedirect, { replace: true });
            return;
          } catch {
            // Se houver erro, continuar com redirecionamento padrão
          }
        }

        if (user.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return; }
        if (user.role === 'affiliate_admin') { navigate('/affiliate-admin/dashboard', { replace: true }); return; }
        if (user.role === 'seller') { navigate('/seller/dashboard', { replace: true }); return; }

        if (user.role === 'student') {
          if (hasPendingOrRejectedSelectionPayment) {
            navigate('/student/onboarding?step=selection_fee', { replace: true });
            return;
          }
          navigate('/student/dashboard', { replace: true });
          return;
        }

        if (user.role === 'school') {
          setCheckingUniversity(true);
          const { error, university } = await checkUniversityStatus(user.id);
          if (error) { navigate('/school/dashboard', { replace: true }); setCheckingUniversity(false); return; }
          if (!university || !university.terms_accepted) { navigate('/school/termsandconditions', { replace: true }); setCheckingUniversity(false); return; }
          if (!university.profile_completed) { navigate('/school/setup-profile', { replace: true }); setCheckingUniversity(false); return; }
          navigate('/school/dashboard', { replace: true });
          setCheckingUniversity(false);
          return;
        }

        navigate('/', { replace: true });
        return;
      }

      // PROTEÇÃO DE ROTAS
      if (user.role === 'school' && (currentPath.startsWith('/student/') || currentPath.startsWith('/admin') || currentPath.startsWith('/affiliate-admin'))) {
        navigate('/school/dashboard', { replace: true }); return;
      }

      if (user.role === 'student' && (currentPath.startsWith('/school/') || currentPath.startsWith('/admin') || currentPath.startsWith('/affiliate-admin'))) {
        if (hasPendingOrRejectedSelectionPayment) { navigate('/student/onboarding?step=selection_fee', { replace: true }); return; }
        navigate('/student/dashboard', { replace: true }); return;
      }

      if (user.role === 'admin' && ((currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) || currentPath.startsWith('/school/') || currentPath.startsWith('/affiliate-admin') || currentPath.startsWith('/seller/'))) {
        navigate('/admin/dashboard', { replace: true }); return;
      }

      if (user.role === 'affiliate_admin' && ((currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) || currentPath.startsWith('/school/') || currentPath.startsWith('/admin/dashboard'))) {
        navigate('/affiliate-admin/dashboard', { replace: true }); return;
      }

      if (user.role === 'seller' && ((currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) || currentPath.startsWith('/school/') || currentPath.startsWith('/admin/') || currentPath.startsWith('/affiliate-admin/'))) {
        navigate('/seller/dashboard', { replace: true }); return;
      }

      // VERIFICAÇÃO ADICIONAL PARA ESCOLAS - apenas na página inicial
      if (user.role === 'school' && currentPath === '/') {
        setCheckingUniversity(true);
        const { error, university } = await checkUniversityStatus(user.id);
        if (error) { setCheckingUniversity(false); return; }
        if (!university || !university.terms_accepted) { navigate('/school/termsandconditions', { replace: true }); setCheckingUniversity(false); return; }
        if (!university.profile_completed) { navigate('/school/setup-profile', { replace: true }); setCheckingUniversity(false); return; }
        setCheckingUniversity(false);
      }

    };

    checkAndRedirect();
  }, [user?.id, user?.role, loading, location.pathname, navigate, checkUniversityStatus, hasPendingOrRejectedSelectionPayment]);

  if (checkingUniversity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirect;