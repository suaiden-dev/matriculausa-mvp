import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

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
  university_id?: string | null;
  // Novos campos para progresso do aluno
  documents_status?: 'pending' | 'analyzing' | 'approved' | 'rejected';
  documents_uploaded?: boolean;
  selected_scholarship_id?: string | null;
  has_paid_college_enrollment_fee?: boolean;
  has_paid_scholarship_fee?: boolean;
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
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
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
  const navigate = useNavigate();

  console.log('AUTH_DEBUG: AuthProvider renderizado.');
  console.log('AUTH_DEBUG: Estado inicial: loading=', loading, 'user=', user?.id);

  useEffect(() => {
    console.log('AUTH_DEBUG: useEffect disparado.');
    setLoading(true);

    const buildUser = (sessionUser: any, currentProfile: UserProfile | null): User => {
      console.log('AUTH_DEBUG: buildUser - Iniciando construção de objeto User. sessionUser ID:', sessionUser?.id, 'currentProfile ID:', currentProfile?.id);
    let role = sessionUser?.user_metadata?.role;
      if (!role && currentProfile) {
        if (currentProfile.is_admin) role = 'admin';
        else if (currentProfile.status === 'school') role = 'school';
      else role = 'student';
    }
    if (!role) {
      role = getDefaultRole(sessionUser?.email || '');
    }
      const builtUser: User = {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || '',
      role,
        university_id: currentProfile?.university_id ?? undefined,
        hasPaidProcess: currentProfile?.has_paid_selection_process_fee,
    };
      console.log('AUTH_DEBUG: buildUser - Objeto User construído:', builtUser);
      return builtUser;
    };

    const fetchAndSetUser = async (session: any) => {
      if (session?.user) {
        let profile: UserProfile | null = null;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
            .eq('user_id', session.user.id)
          .single();
          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
          }
          profile = data;
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
        setUserProfile(profile);
        setUser(buildUser(session.user, profile));
        setSupabaseUser(session.user);
        console.log('AUTH_DEBUG: onAuthStateChange - User e UserProfile setados com sucesso.');
      } else {
        setUser(null);
        setSupabaseUser(null);
          setUserProfile(null);
        console.log('AUTH_DEBUG: onAuthStateChange - User e UserProfile resetados para null.');
      }
    };
    
    // Check for session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchAndSetUser(session);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        fetchAndSetUser(session);
      }
    );

    return () => {
      console.log('AUTH_DEBUG: useEffect cleanup.');
      subscription.unsubscribe();
    };
  }, []);

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!supabaseUser) {
      throw new Error("User must be logged in to update profile");
    }
    
    // Remove user_id from updates if it exists, as it should not be updated.
    const { user_id, ...updateData } = updates;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', supabaseUser.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      setUserProfile(data as UserProfile);
    }
  };

  const getDefaultRole = (email: string): 'student' | 'school' | 'admin' => {
    // Admin emails can be hardcoded or checked against a list
    const adminEmails = ['admin@matriculausa.com', 'admin@example.com'];
    if (adminEmails.includes(email.toLowerCase())) {
      return 'admin';
    }
    return 'student';
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
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      // Opcional: notificar o usuário sobre o erro
    }
    // Limpar o estado local independentemente do erro do Supabase
    setUser(null);
    setUserProfile(null); 
    setLoading(false);
    console.log("AUTH_DEBUG: User logged out, user and userProfile set to null.");
  };

  const register = async (email: string, password: string, userData: { name: string; role: 'student' | 'school'; [key: string]: any }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
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
    isAuthenticated: !!user && !!supabaseUser,
    loading,
    updateUserProfile,
  };

  console.log('AUTH_DEBUG: AuthProvider renderizando com estados: user=', user?.id, 'userProfile=', userProfile, 'loading=', loading);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};