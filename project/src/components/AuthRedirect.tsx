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

  useEffect(() => {
    if (loading || !user) {
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
          // Estudantes agora aceitam termos automaticamente durante o registro
          // Não precisamos mais verificar termos aceitos
          navigate('/student/dashboard', { replace: true });
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
    };

    // Executar imediatamente, sem delay desnecessário
    checkAndRedirect();
  }, [user?.id, user?.role, loading, location.pathname, navigate, checkUniversityStatus]);

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