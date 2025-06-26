import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingUniversity, setCheckingUniversity] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      console.log('AUTH_DEBUG: AuthRedirect - Aguardando user. loading:', loading, 'user exists:', !!user);
      return;
    }

    const checkAndRedirect = async () => {
      const currentPath = location.pathname;
      
      // Se usuário é school, verificar apenas se está tentando acessar áreas restritas de outros roles
      if (user.role === 'school' && (currentPath.startsWith('/student') || currentPath.startsWith('/admin'))) {
        console.log('AUTH_DEBUG: Usuário escola tentando acessar área restrita:', currentPath);
        navigate('/school/dashboard');
        return;
      }

      // Se usuário é school, verificar status quando necessário
      if (user.role === 'school' && !currentPath.startsWith('/school')) {
        // Verificar apenas se está vindo de login/registro ou se está em página inicial
        const shouldCheckStatus = currentPath === '/login' || currentPath === '/auth' || 
                                 currentPath === '/register' || currentPath === '/';
        
        if (shouldCheckStatus) {
          console.log('AUTH_DEBUG: Verificando status da escola em:', currentPath);
          setCheckingUniversity(true);
          
          try {
            const { data: university, error } = await supabase
              .from('universities')
              .select('terms_accepted, profile_completed')
              .eq('user_id', user.id)
              .single();

            console.log('AUTH_DEBUG: Status da universidade:', university);

            if (error && error.code !== 'PGRST116') {
              console.error('Error checking university status:', error);
              navigate('/school/dashboard');
              return;
            }

            // Se não existe universidade ou termos não foram aceitos
            if (!university || !university.terms_accepted) {
              console.log('AUTH_DEBUG: Redirecionando para termos e condições');
              navigate('/school/termsandconditions');
              return;
            }

            // Se termos aceitos mas perfil não completo
            if (!university.profile_completed) {
              console.log('AUTH_DEBUG: Redirecionando para setup de perfil');
              navigate('/school/setup-profile');
              return;
            }

            // Se tudo OK e está vindo de login/auth, ir para dashboard
            if (currentPath === '/login' || currentPath === '/auth' || currentPath === '/register') {
              console.log('AUTH_DEBUG: Redirecionando para dashboard após login');
              navigate('/school/dashboard');
            }
            // Se está na home (/), deixar na home - não redirecionar
          } catch (error) {
            console.error('Error in school redirect:', error);
            navigate('/school/dashboard');
          } finally {
            setCheckingUniversity(false);
          }
          return;
        }
      }
      
      // Se usuário é student e está tentando acessar áreas restritas de outros roles
      if (user.role === 'student' && (currentPath.startsWith('/school') || currentPath.startsWith('/admin'))) {
        console.log('AUTH_DEBUG: Redirecionando estudante para dashboard - área restrita');
        navigate('/student/dashboard');
        return;
      }
      
      // Se usuário é admin e está tentando acessar áreas restritas de outros roles
      if (user.role === 'admin' && (currentPath.startsWith('/student') || currentPath.startsWith('/school'))) {
        console.log('AUTH_DEBUG: Redirecionando admin para dashboard - área restrita');
        navigate('/admin/dashboard');
        return;
      }
    };

    checkAndRedirect();
  }, [user, loading, navigate, location.pathname]);

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