import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingUniversity, setCheckingUniversity] = useState(false);
  const lastCheckedPath = useRef<string>('');
  const universityCache = useRef<{ [userId: string]: any }>({});

  const checkUniversityStatus = useCallback(async (userId: string) => {
    // Usar cache se disponível
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

      // Cache por 30 segundos
      universityCache.current[userId] = result;
      setTimeout(() => {
        delete universityCache.current[userId];
      }, 30000);

      return result;
    } catch (error) {
      return { error, university: null };
    }
  }, []);

  // Verificar se há pagamento pendente ou rejeitado para selection_process
  const checkSelectionProcessPayment = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data: paymentData, error: paymentError } = await supabase.rpc('check_zelle_payments_status', {
        p_user_id: userId
      });

      if (paymentError || !paymentData || paymentData.length === 0) {
        return false;
      }

      const result = paymentData[0];
      
      // Verificar se há pagamento pendente para selection_process
      if (result.has_pending_payment && 
          result.pending_payment_id && 
          result.pending_payment_id !== '00000000-0000-0000-0000-000000000000' &&
          (result.pending_payment_fee_type === 'selection_process' || !result.pending_payment_fee_type || result.pending_payment_fee_type === '')) {
        return true;
      }

      // Verificar se há pagamento rejeitado recente para selection_process (mesmo que não seja o mesmo pagamento)
      // Se há rejeição recente E não há pagamento pendente, redirecionar para que o aluno veja a rejeição
      if (result.has_rejected_payment && 
          result.rejected_payment_id && 
          result.rejected_payment_id !== '00000000-0000-0000-0000-000000000000' &&
          (result.rejected_payment_fee_type === 'selection_process' || !result.rejected_payment_fee_type || result.rejected_payment_fee_type === '') &&
          !result.has_pending_payment) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AuthRedirect] Erro ao verificar pagamento:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    console.log('[AuthRedirect] 🔍 useEffect executado - loading:', loading, 'user:', !!user, 'pathname:', location.pathname);
    console.log('[AuthRedirect] 🔍 Timestamp:', new Date().toISOString());
    
    if (loading || !user) {
      console.log('[AuthRedirect] ⚠️ Loading ou sem usuário, não executando redirecionamento');
      return;
    }

    const currentPath = location.pathname;
    // Detectar fluxo de recuperação de senha
    const isPasswordResetFlow = currentPath.startsWith('/forgot-password') ||
      window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');
    if (isPasswordResetFlow) {
      // Não redirecionar durante o fluxo de recuperação de senha
      return;
    }
    
    // Páginas públicas que não precisam de verificação
    const publicPaths = ['/schools', '/scholarships', '/about', '/how-it-works', '/universities'];
    if (publicPaths.some(path => currentPath === path || currentPath.startsWith(path))) {
      return;
    }
    
    // Evitar re-execução se o path não mudou  
    if (lastCheckedPath.current === currentPath && !currentPath.includes('/login') && !currentPath.includes('/auth')) {
      return;
    }
    lastCheckedPath.current = currentPath;

    const checkAndRedirect = async () => {
      // Whitelist: permitir acesso explícito à página interna de cadastro de estudante
      const isWhitelistedInternalRegister = location.pathname === '/student/register';
      
      // NÃO redirecionar se há código de referência na URL (usuário veio de link de referência)
      const hasReferralCode = window.location.search.includes('ref=');
      if (hasReferralCode) {
        console.log('[AuthRedirect] ⚠️ Código de referência detectado, não redirecionando');
        return;
      }
      
      // REDIRECIONAMENTO APÓS LOGIN - verificar se usuário está na página de login/auth
      if (currentPath === '/login' || currentPath === '/auth' || currentPath === '/register') {
        // Redirecionamento baseado no role
        if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
          return;
        }
        
        if (user.role === 'affiliate_admin') {
          navigate('/affiliate-admin/dashboard', { replace: true });
          return;
        }
        
        if (user.role === 'seller') {
          navigate('/seller/dashboard', { replace: true });
          return;
        }
        
        if (user.role === 'student') {
          // Verificar se há pagamento pendente ou rejeitado para selection_process
          const hasPendingOrRejectedPayment = await checkSelectionProcessPayment(user.id);
          
          if (hasPendingOrRejectedPayment) {
            // Redirecionar para a página de pagamento se houver pagamento pendente/rejeitado
            navigate('/student/onboarding?step=selection_fee', { replace: true });
            return;
          }
          
          // Redirecionar para home após registro/login (sem redirecionamento automático para onboarding)
          navigate('/', { replace: true });
          return;
        }
        
        if (user.role === 'school') {
          setCheckingUniversity(true);
          
          const { error, university } = await checkUniversityStatus(user.id);
          
          if (error) {
            navigate('/school/dashboard', { replace: true });
            setCheckingUniversity(false);
            return;
          }

          // Se não existe universidade ou termos não foram aceitos
          if (!university || !university.terms_accepted) {
            navigate('/school/termsandconditions', { replace: true });
            setCheckingUniversity(false);
            return;
          }

          // Se termos aceitos mas perfil não completo
          if (!university.profile_completed) {
            navigate('/school/setup-profile', { replace: true });
            setCheckingUniversity(false);
            return;
          }

          // Se tudo OK, ir para dashboard
          navigate('/school/dashboard', { replace: true });
          setCheckingUniversity(false);
          return;
        }
        
        // Fallback para roles não reconhecidos ou casos inesperados
        navigate('/', { replace: true });
        return;
      }

      // PROTEÇÃO DE ROTAS - verificar se usuário está tentando acessar área restrita
      // Se usuário é school, verificar apenas se está tentando acessar áreas restritas de outros roles
      if (user.role === 'school' && (currentPath.startsWith('/student/') || currentPath.startsWith('/admin') || currentPath.startsWith('/affiliate-admin'))) {
        navigate('/school/dashboard', { replace: true });
        return;
      }

      // Se usuário é student e está tentando acessar áreas restritas de outros roles
      if (user.role === 'student' && (currentPath.startsWith('/school/') || currentPath.startsWith('/admin') || currentPath.startsWith('/affiliate-admin'))) {
        // Verificar se há pagamento pendente ou rejeitado antes de redirecionar
        const hasPendingOrRejectedPayment = await checkSelectionProcessPayment(user.id);
        
        if (hasPendingOrRejectedPayment) {
          navigate('/student/onboarding?step=selection_fee', { replace: true });
          return;
        }
        
        // Redirecionar para dashboard do aluno (sem verificar onboarding)
        navigate('/student/dashboard', { replace: true });
        return;
      }

      // Estudantes não precisam mais verificar termos aceitos
      // Eles aceitam automaticamente durante o registro
      
      // Se usuário é admin e está tentando acessar áreas restritas de outros roles (exceto a rota interna liberada)
      if (user.role === 'admin' && ((currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) || currentPath.startsWith('/school/') || currentPath.startsWith('/affiliate-admin') || currentPath.startsWith('/seller/'))) {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      
      // Se usuário é affiliate_admin e está tentando acessar áreas restritas de outros roles (exceto a rota interna liberada)
      if (user.role === 'affiliate_admin' && ((currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) || currentPath.startsWith('/school/') || currentPath.startsWith('/admin/dashboard'))) {
        navigate('/affiliate-admin/dashboard', { replace: true });
        return;
      }
      
      // Se usuário é seller e está tentando acessar áreas restritas de outros roles (exceto a rota interna liberada)
      if (user.role === 'seller' && ((currentPath.startsWith('/student/') && !isWhitelistedInternalRegister) || currentPath.startsWith('/school/') || currentPath.startsWith('/admin/') || currentPath.startsWith('/affiliate-admin/'))) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }

      // VERIFICAÇÃO ADICIONAL PARA ESCOLAS - apenas na página inicial
      if (user.role === 'school' && currentPath === '/') {
        setCheckingUniversity(true);
        
        const { error, university } = await checkUniversityStatus(user.id);
        
        if (error) {
          setCheckingUniversity(false);
          return; // Deixar na página atual se houver erro
        }

        // Se não existe universidade ou termos não foram aceitos
        if (!university || !university.terms_accepted) {
          navigate('/school/termsandconditions', { replace: true });
          setCheckingUniversity(false);
          return;
        }

        // Se termos aceitos mas perfil não completo
        if (!university.profile_completed) {
          navigate('/school/setup-profile', { replace: true });
          setCheckingUniversity(false);
          return;
        }

        // Se tudo OK e está na home, deixar na home - não redirecionar
        setCheckingUniversity(false);
      }

      // VERIFICAÇÃO ADICIONAL PARA ESTUDANTES - verificar pagamentos pendentes/rejeitados
      // Aplicar quando acessa home, dashboard ou overview
      if (user.role === 'student' && 
          (currentPath === '/' || 
           currentPath === '/student/dashboard' || 
           currentPath.startsWith('/student/dashboard/overview'))) {
        const hasPendingOrRejectedPayment = await checkSelectionProcessPayment(user.id);
        
        if (hasPendingOrRejectedPayment) {
          // Redirecionar para a página de pagamento se houver pagamento pendente/rejeitado
          navigate('/student/onboarding?step=selection_fee', { replace: true });
          return;
        }
      }
    };

    // Executar imediatamente, sem delay desnecessário
    checkAndRedirect();
  }, [user?.id, user?.role, loading, location.pathname, navigate, checkUniversityStatus, checkSelectionProcessPayment]);

  // Mostrar loading enquanto verifica universidade
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