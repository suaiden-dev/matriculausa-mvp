import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { usePaymentBlockedContext } from '../contexts/PaymentBlockedContext';

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingUniversity, setCheckingUniversity] = useState(false);
  const [checkingAgency, setCheckingAgency] = useState(false);
  const [checkingAffiliate, setCheckingAffiliate] = useState(false);
  const lastCheckedPath = useRef<string>('');
  const universityCache = useRef<{ [userId: string]: any }>({});
  const agencyCache = useRef<{ [userId: string]: any }>({});
  const affiliateCache = useRef<{ [userId: string]: any }>({});

  const checkUniversityStatus = useCallback(async (userId: string, universityId?: string) => {
    const cacheKey = universityId || userId;
    if (universityCache.current[cacheKey]) {
      return universityCache.current[cacheKey];
    }

    try {
      // school_manager: query by university id; school: query by user_id
      const query = universityId
        ? supabase.from('universities').select('terms_accepted, profile_completed').eq('id', universityId).maybeSingle()
        : supabase.from('universities').select('terms_accepted, profile_completed').eq('user_id', userId).maybeSingle();
      const { data: university, error } = await query;

      const result = {
        error: error && error.code !== 'PGRST116' ? error : null,
        university: university || null
      };

      universityCache.current[cacheKey] = result;
      setTimeout(() => {
        delete universityCache.current[cacheKey];
      }, 30000);

      return result;
    } catch (error) {
      return { error, university: null };
    }
  }, []);

  const checkAgencyStatus = useCallback(async (userId: string) => {
    if (agencyCache.current[userId]) {
      return agencyCache.current[userId];
    }

    try {
      const { data: agency, error } = await supabase
        .from('affiliate_admins')
        .select('terms_accepted, onboarding_completed, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      const result = {
        error: error && error.code !== 'PGRST116' ? error : null,
        agency: agency || null
      };

      agencyCache.current[userId] = result;
      setTimeout(() => {
        delete agencyCache.current[userId];
      }, 30000);

      return result;
    } catch (error) {
      return { error, agency: null };
    }
  }, []);

  const checkAffiliateStatus = useCallback(async (userId: string) => {
    if (affiliateCache.current[userId]) {
      return affiliateCache.current[userId];
    }

    try {
      const { data: affiliateCode, error } = await supabase
        .from('affiliate_codes')
        .select('terms_accepted')
        .eq('user_id', userId)
        .maybeSingle();

      const result = {
        error: error && error.code !== 'PGRST116' ? error : null,
        affiliateCode: affiliateCode || null
      };

      affiliateCache.current[userId] = result;
      setTimeout(() => {
        delete affiliateCache.current[userId];
      }, 30000);

      return result;
    } catch (error) {
      return { error, affiliateCode: null };
    }
  }, []);

  const { isBlocked: paymentIsBlocked, pendingPayment, rejectedPayment } = usePaymentBlockedContext();

  // Derivado do context — memoizado para evitar re-calculo em cada render
  const hasPendingOrRejectedSelectionPayment = React.useMemo(() => {
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
  }, [paymentIsBlocked, pendingPayment, rejectedPayment]);

  useEffect(() => {
    const currentPath = location.pathname;

    if (user) {
      if (currentPath === '/affiliate/termsandconditions') {
        delete affiliateCache.current[user.id];
      }
      if (currentPath === '/school/termsandconditions') {
        delete universityCache.current[user.id];
        if (user.university_id) delete universityCache.current[user.university_id];
      }
      if (currentPath === '/agency/termsandconditions') {
        delete agencyCache.current[user.id];
      }
    }

    // Redirecionamentos de Legado (Affiliate Admin -> Agency)
    // Executado antes de qualquer verificação de auth para garantir que a URL esteja correta
    const legacyRedirects: Record<string, string> = {
      '/affiliate-admin/onboarding': '/agency/onboarding',
      '/affiliate-admin/pending-approval': '/agency/pending-approval',
      '/affiliate-admin/dashboard': '/agency/dashboard',
      '/admin/dashboard/affiliate-management': '/admin/dashboard/agencies'
    };

    for (const [oldPath, newPath] of Object.entries(legacyRedirects)) {
      if (currentPath === oldPath || currentPath.startsWith(oldPath + '/')) {
        const remainingPath = currentPath.substring(oldPath.length);
        navigate(newPath + remainingPath + location.search, { replace: true });
        return;
      }
    }

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
              } else if (userRole === 'admin' || userRole === 'post_sales') {
                navigate('/admin/dashboard', { replace: true });
              } else if (userRole === 'seller') {
                navigate('/seller/dashboard', { replace: true });
              } else if (userRole === 'school' || userRole === 'school_manager') {
                navigate('/school/dashboard', { replace: true });
              } else if (userRole === 'affiliate') {
                navigate('/affiliate/dashboard', { replace: true });
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

    // Aguardar carregamento primordial
    if (loading) return;
    // Se não há usuário autenticado, verificar se está tentando acessar rota protegida
    if (!user) {
      const protectedPaths = [
        '/student/dashboard',
        '/school/dashboard',
        '/admin/dashboard',
        '/agency/dashboard',
        '/seller/dashboard',
        '/affiliate/dashboard'
      ];
      const isProtectedPath = protectedPaths.some(path => currentPath.startsWith(path));

      if (isProtectedPath) {
        const returnUrl = encodeURIComponent(currentPath + location.search);
        navigate(`/login?redirect=${returnUrl}`, { replace: true });
        return;
      }
      return;
    }

    // Detectar fluxo de recuperação de senha ou de aceitação de convite de seller
    const isPasswordResetFlow = currentPath.startsWith('/forgot-password') ||
      currentPath === '/seller/accept-invite' ||
      window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');
    if (isPasswordResetFlow) return;

    // Páginas públicas que não precisam de verificação
    const publicPaths = ['/schools', '/scholarships', '/about', '/how-it-works', '/universities'];
    if (publicPaths.some(path => currentPath === path || currentPath.startsWith(path))) return;

    // Evitar re-execução se o path e o role não mudaram e o estado de pagamento é estável
    const affiliateOnboardingDoneKey = user?.role === 'affiliate_admin'
      ? String(user?.onboarding_completed || userProfile?.onboarding_completed)
      : '';
    const checkKey = `${user?.id}-${user?.role}-${currentPath}-${affiliateOnboardingDoneKey}`;
    if (lastCheckedPath.current === checkKey && !currentPath.includes('/login') && !currentPath.includes('/auth')) {
      return;
    }

    // REDIRECIONAMENTO DE SEGURANÇA SE O USUÁRIO ESTÁ EM PATH ERRADO PARA O ROLE DELE
    // Mas só fazemos se não for uma rota pública

    const checkAndRedirect = async () => {
      lastCheckedPath.current = checkKey;
      const isWhitelistedInternalRegister = currentPath === '/student/register';

      // REDIRECIONAMENTO APÓS LOGIN
      // REDIRECIONAMENTO APÓS LOGIN (REMOVIDO PARA MOSTRAR MENSAGEM NO COMPONENTE)
      const isRegistrationPath = currentPath === '/login' || currentPath === '/register' || currentPath === '/auth';

      if (isRegistrationPath) {
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

        if (user.role === 'admin' || user.role === 'post_sales') { navigate('/admin/dashboard', { replace: true }); return; }
        if (user.role === 'affiliate_admin') {
          setCheckingAgency(true);
          const { error, agency } = await checkAgencyStatus(user.id);
          if (error) { navigate('/agency/dashboard', { replace: true }); setCheckingAgency(false); return; }
          if (!agency || !agency.terms_accepted) { navigate('/agency/termsandconditions', { replace: true }); setCheckingAgency(false); return; }
          if (!agency.onboarding_completed) { navigate('/agency/onboarding', { replace: true }); setCheckingAgency(false); return; }
          if (!agency.is_active) { navigate('/agency/pending-approval', { replace: true }); setCheckingAgency(false); return; }
          navigate('/agency/dashboard', { replace: true });
          setCheckingAgency(false);
          return;
        }
        if (user.role === 'seller') { navigate('/seller/dashboard', { replace: true }); return; }
        if (user.role === 'affiliate') {
          setCheckingAffiliate(true);
          const { error, affiliateCode } = await checkAffiliateStatus(user.id);
          if (error) { navigate('/affiliate/dashboard', { replace: true }); setCheckingAffiliate(false); return; }
          if (!affiliateCode || !affiliateCode.terms_accepted) { navigate('/affiliate/termsandconditions', { replace: true }); setCheckingAffiliate(false); return; }
          navigate('/affiliate/dashboard', { replace: true });
          setCheckingAffiliate(false);
          return;
        }

        if (user.role === 'student') {
          if (hasPendingOrRejectedSelectionPayment) {
            navigate('/student/onboarding?step=selection_fee', { replace: true });
            return;
          }
          navigate('/student/dashboard', { replace: true });
          return;
        }

        if (user.role === 'school' || user.role === 'school_manager') {
          setCheckingUniversity(true);
          const { error, university } = await checkUniversityStatus(user.id, user.role === 'school_manager' ? user.university_id : undefined);
          if (error) { navigate('/school/dashboard', { replace: true }); setCheckingUniversity(false); return; }
          // school_manager skips terms/profile checks (university already configured)
          if (user.role === 'school') {
            if (!university || !university.terms_accepted) { navigate('/school/termsandconditions', { replace: true }); setCheckingUniversity(false); return; }
            if (!university.profile_completed) { navigate('/school/setup-profile', { replace: true }); setCheckingUniversity(false); return; }
          }
          navigate('/school/dashboard', { replace: true });
          setCheckingUniversity(false);
          return;
        }

        navigate('/', { replace: true });
        return;
      }

      // PROTEÇÃO DE ROTAS POR ROLE
      if ((user.role === 'school' || user.role === 'school_manager') && (currentPath.startsWith('/student/') || currentPath.startsWith('/admin') || currentPath.startsWith('/agency/'))) {
        navigate('/school/dashboard', { replace: true }); return;
      }

      if (user.role === 'student' && (currentPath.startsWith('/school/') || currentPath.startsWith('/admin') || currentPath.startsWith('/agency/'))) {
        if (hasPendingOrRejectedSelectionPayment) { navigate('/student/onboarding?step=selection_fee', { replace: true }); return; }
        navigate('/student/dashboard', { replace: true }); return;
      }

      if ((user.role === 'admin' || user.role === 'post_sales') && ((currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) || currentPath.startsWith('/school/') || currentPath.startsWith('/agency/') || currentPath.startsWith('/seller/'))) {
        navigate('/admin/dashboard', { replace: true }); return;
      }

      if (user.role === 'affiliate_admin') {
        const tryingToAccessOtherDashboard = (currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) ||
          currentPath.startsWith('/school/') ||
          currentPath.startsWith('/admin/') ||
          currentPath.startsWith('/seller/');

        const isProtectedAffiliatePath = currentPath.startsWith('/agency/dashboard') ||
          currentPath.startsWith('/agency/onboarding') ||
          currentPath.startsWith('/agency/pending-approval') ||
          currentPath.startsWith('/agency/termsandconditions');

        const isAgenciasPage = currentPath === '/agencias';

        if (tryingToAccessOtherDashboard || isProtectedAffiliatePath || isAgenciasPage) {
          setCheckingAgency(true);
          const { error, agency } = await checkAgencyStatus(user.id);
          if (error) { setCheckingAgency(false); return; }

          if (!agency || !agency.terms_accepted) {
            if (currentPath !== '/agency/termsandconditions') {
              navigate('/agency/termsandconditions', { replace: true });
            }
            setCheckingAgency(false);
            return;
          }

          const affiliateOnboardingDone = agency.onboarding_completed;

          if (!affiliateOnboardingDone && currentPath !== '/agency/onboarding') {
            navigate('/agency/onboarding', { replace: true });
            setCheckingAgency(false);
            return;
          }
          if (affiliateOnboardingDone && !agency.is_active && currentPath !== '/agency/pending-approval') {
            navigate('/agency/pending-approval', { replace: true });
            setCheckingAgency(false);
            return;
          }
          if (affiliateOnboardingDone && agency.is_active && (tryingToAccessOtherDashboard || isAgenciasPage || currentPath === '/agency/onboarding' || currentPath === '/agency/pending-approval' || currentPath === '/agency/termsandconditions')) {
            navigate('/agency/dashboard', { replace: true });
            setCheckingAgency(false);
            return;
          }
          setCheckingAgency(false);
        }
      }

      if (user.role === 'seller' && ((currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) || currentPath.startsWith('/school/') || currentPath.startsWith('/admin/') || currentPath.startsWith('/agency/'))) {
        navigate('/seller/dashboard', { replace: true }); return;
      }

      if (user.role === 'affiliate') {
        const tryingToAccessOtherDashboard = (currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) ||
          currentPath.startsWith('/school/') ||
          currentPath.startsWith('/admin/') ||
          currentPath.startsWith('/agency/') ||
          currentPath.startsWith('/seller/');

        const isProtectedAffiliatePath = currentPath.startsWith('/affiliate/dashboard') ||
          currentPath.startsWith('/affiliate/termsandconditions');

        if (tryingToAccessOtherDashboard || isProtectedAffiliatePath) {
          setCheckingAffiliate(true);
          const { error, affiliateCode } = await checkAffiliateStatus(user.id);
          if (error) { setCheckingAffiliate(false); return; }

          if (!affiliateCode || !affiliateCode.terms_accepted) {
            if (currentPath !== '/affiliate/termsandconditions') {
              navigate('/affiliate/termsandconditions', { replace: true });
            }
            setCheckingAffiliate(false);
            return;
          }

          if (currentPath === '/affiliate/termsandconditions') {
            navigate('/affiliate/dashboard', { replace: true });
            setCheckingAffiliate(false);
            return;
          }
          setCheckingAffiliate(false);
        }
      }

      // VERIFICAÇÃO ADICIONAL PARA REDIRECIONAMENTO DA HOME LOGADA - Desativado para permitir exploração livre do site
      /*
      if (currentPath === '/') {
        if (user.role === 'school' || user.role === 'school_manager') {
          setCheckingUniversity(true);
          const { error, university } = await checkUniversityStatus(user.id, user.role === 'school_manager' ? user.university_id : undefined);
          if (error) { setCheckingUniversity(false); return; }
          if (user.role === 'school') {
            if (!university || !university.terms_accepted) { navigate('/school/termsandconditions', { replace: true }); setCheckingUniversity(false); return; }
            if (!university.profile_completed) { navigate('/school/setup-profile', { replace: true }); setCheckingUniversity(false); return; }
          }
          navigate('/school/dashboard', { replace: true });
          setCheckingUniversity(false);
          return;
        }

        // Admins e pós-vendas podem navegar livremente na Home (/) sem serem redirecionados de volta para o dashboard
        // if (user.role === 'admin' || user.role === 'post_sales') {
        //   navigate('/admin/dashboard', { replace: true });
        //   return;
        // }

        // Estudantes podem navegar livremente na Home (/) sem serem redirecionados de volta para o dashboard
        // if (user.role === 'student') {
        //   if (hasPendingOrRejectedSelectionPayment) {
        //     navigate('/student/onboarding?step=selection_fee', { replace: true });
        //   } else {
        //     navigate('/student/dashboard', { replace: true });
        //   }
        //   return;
        // }

        if (user.role === 'seller') {
          navigate('/seller/dashboard', { replace: true });
          return;
        }

        if (user.role === 'affiliate' || user.role === 'affiliate_admin') {
          const path = user.role === 'affiliate_admin' ? '/agency/dashboard' : '/affiliate/dashboard';
          navigate(path, { replace: true });
          return;
        }
      }
      */
    };

    checkAndRedirect();
  }, [user?.id, user?.role, user?.onboarding_completed, user?.is_active, userProfile?.onboarding_completed, loading, location.pathname, navigate, hasPendingOrRejectedSelectionPayment, checkAffiliateStatus]);

  if (checkingUniversity || checkingAgency || checkingAffiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirect;