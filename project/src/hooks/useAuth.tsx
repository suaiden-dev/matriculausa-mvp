import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'student' | 'school' | 'admin';
  university_id?: string;
  hasPaidProcess?: boolean;
}

// Definição completa do tipo para o perfil do usuário (incluindo todas as colunas do seu schema)
export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  field_of_interest: string | null;
  academic_level: string | null;
  gpa: number | null;
  english_proficiency: string | null;
  status: string | null;
  last_active: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_application_fee_paid: boolean;
  has_paid_selection_process_fee: boolean;
  is_admin: boolean;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  // ... outras colunas se existirem
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  userProfile: UserProfile | null;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          setUserProfile(null);
        } else if (data) {
          setUserProfile(data as UserProfile);
        }
      } catch (err) {
        setUserProfile(null);
      }
    };

    const buildUser = (sessionUser: any, userProfile: UserProfile | null): User => {
      // Busca o role nos metadados, depois no perfil, depois padrão
      let role = sessionUser?.user_metadata?.role;
      if (!role && userProfile) {
        if (userProfile.is_admin) role = 'admin';
        else if (userProfile.status === 'school') role = 'school';
        else role = 'student';
      }
      if (!role) {
        role = getDefaultRole(sessionUser?.email || '');
      }
      return {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || '',
        role,
        university_id: userProfile?.university_id,
        hasPaidProcess: userProfile?.has_paid_selection_process_fee,
      };
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user.id);
          setTimeout(() => {
            setUser(prev => buildUser(session.user, userProfile));
          }, 0);
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
        setTimeout(() => {
          setUser(prev => buildUser(currentUser, userProfile));
        }, 0);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
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
    const { error } = await supabase.auth.signUp({
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

    if (error) {
      throw error;
    }
    // Registration redirection will be handled in the Auth component
  };

  const value: AuthContextType = {
    user,
    supabaseUser,
    userProfile,
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