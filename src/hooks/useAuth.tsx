import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'student' | 'school' | 'admin';
  university_id?: string;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: { name: string; role: 'student' | 'school'; [key: string]: any }) => Promise<void>;
  switchRole: (newRole: 'student' | 'school' | 'admin') => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        // Set user data from metadata or default
        const userData = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          role: session.user.user_metadata?.role || getDefaultRole(session.user.email!)
        };
        setUser(userData);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user);
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            role: session.user.user_metadata?.role || getDefaultRole(session.user.email!)
          };
          setUser(userData);

          // Handle login redirection based on user role
          if (event === 'SIGNED_IN') {
            redirectUserAfterLogin(userData.role);
          }
        } else {
          setSupabaseUser(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getDefaultRole = (email: string): 'student' | 'school' | 'admin' => {
    // Admin emails can be hardcoded or checked against a list
    const adminEmails = ['admin@matriculausa.com', 'admin@example.com'];
    if (adminEmails.includes(email.toLowerCase())) {
      return 'admin';
    }
    return 'student';
  };

  const redirectUserAfterLogin = (userRole: string) => {
    // Only redirect if we're on the login page
    if (window.location.pathname === '/login') {
      switch (userRole) {
        case 'student':
          window.location.href = '/student/dashboard';
          break;
        case 'school':
          window.location.href = '/school/dashboard';
          break;
        case 'admin':
          window.location.href = '/admin/dashboard';
          break;
        default:
          window.location.href = '/';
      }
    }
  };

  const checkSchoolTermsStatus = async () => {
    if (!user) return;
    
    try {
      const { data: university, error } = await supabase
        .from('universities')
        .select('terms_accepted, profile_completed')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking school terms:', error);
        window.location.href = '/school/termsandconditions';
        return;
      }

      if (!university || !university.terms_accepted) {
        window.location.href = '/school/termsandconditions';
      } else if (!university.profile_completed) {
        window.location.href = '/school/setup-profile';
      } else {
        window.location.href = '/school/dashboard';
      }
    } catch (error) {
      console.error('Error checking school status:', error);
      window.location.href = '/school/termsandconditions';
    }
  };

  const switchRole = (newRole: 'student' | 'school' | 'admin') => {
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      
      // Update user metadata in Supabase
      supabase.auth.updateUser({
        data: { role: newRole }
      }).catch(error => {
        console.error('Error updating user role:', error);
      });
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
    // Redirection will be handled by the auth state change listener
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    // Redirect to home page after logout
    window.location.href = '/';
  };

  const register = async (email: string, password: string, userData: { name: string; role: 'student' | 'school'; [key: string]: any }) => {
    // 1. Registrar o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...userData,
          name: userData.name,
          role: userData.role
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      throw authError;
    }

    console.log('User signed up successfully. Auth data:', authData);

    // 2. Se o registro no Auth foi bem-sucedido e temos um objeto de usuário, CHAMAR A EDGE FUNCTION PARA CRIAR O PERFIL
    if (authData.user) {
      console.log('User signed up successfully. Auth data:', authData);
      console.log('Attempting to call create-user-profile Edge Function for user ID:', authData.user.id);
      console.log('User data sent for profile creation:', userData);

      try {
        // ATENÇÃO: Substitua <YOUR_PROJECT_REF> pelo ID real do seu projeto Supabase
        const profileCreationResponse = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-user-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            user_id: authData.user.id,
            full_name: userData.name,
            phone: userData.phone || '',
            country: userData.country || '',
            field_of_interest: userData.fieldOfInterest || '',
            english_level: userData.englishLevel || '',
            role: userData.role,
            // Certifique-se de que quaisquer outras colunas NOT NULL em user_profiles recebam um valor padrão ou sejam passadas aqui
          }),
        });

        if (!profileCreationResponse.ok) {
          const errorData = await profileCreationResponse.json();
          console.error('Error calling create-user-profile Edge Function:', errorData);
        } else {
          console.log('User profile creation request sent to Edge Function successfully.');
        }

      } catch (efError) {
        console.error('Network error calling create-user-profile Edge Function:', efError);
      }
    } else {
      console.warn('Auth signup succeeded, but no user object returned to create profile. Profile creation skipped.');
    }

    return authData;
  };

  const value: AuthContextType = {
    user,
    supabaseUser,
    login,
    logout,
    register,
    switchRole,
    isAuthenticated: !!user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};