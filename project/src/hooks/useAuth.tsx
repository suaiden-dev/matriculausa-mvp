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
  university_id?: string | null;
  // Novos campos para progresso do aluno
  documents_status?: 'pending' | 'analyzing' | 'approved' | 'rejected';
  documents_uploaded?: boolean;
  selected_scholarship_id?: string | null;
  has_paid_college_enrollment_fee?: boolean;
  // ... outras colunas se existirem
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: { full_name: string; role: 'student' | 'school'; [key: string]: any }) => Promise<void>;
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

  useEffect(() => {
    setLoading(true);

    // Detectar fluxo de recuperação de senha
    const isPasswordResetFlow =
      window.location.pathname.startsWith('/forgot-password') &&
      (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token'));
    if (isPasswordResetFlow) {
      setUser(null);
      setSupabaseUser(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    const buildUser = (sessionUser: any, currentProfile: UserProfile | null): User => {
      // Priorizar role do metadata do usuário
      let role = sessionUser?.user_metadata?.role;
      
      // Se não tem role no metadata, verificar perfil
      if (!role && currentProfile) {
        if (currentProfile.is_admin) role = 'admin';
        else role = 'student'; // Default para student se não for admin
      }
      
      // Se ainda não tem role, usar default baseado no email
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
      return builtUser;
    };

    const fetchAndSetUser = async (session: any) => {
      if (session?.user) {
        let profile: UserProfile | null = null;
        
        // Primeiro, tentar buscar o perfil existente
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
            
          if (error) {
            if (error.code === 'PGRST116') {
              // Perfil não encontrado - isso é normal
            } else {
              console.log("Error fetching user profile:", error);
            }
          }
          
          profile = data || null;
        } catch (error) {
          console.log("Error fetching user profile:", error);
        }
        
        // Se não existe perfil, criar um novo
        if (!profile) {
          try {
            const pendingFullName = localStorage.getItem('pending_full_name');
            const fullName = pendingFullName || 
                            session.user.user_metadata?.full_name || 
                            session.user.user_metadata?.name || 
                            session.user.email?.split('@')[0] || 
                            'User';
            
            const { data: newProfile, error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                user_id: session.user.id,
                full_name: fullName,
                status: 'active'
              })
              .select()
              .single();
              
            if (insertError) {
              if (insertError.code === '23505') { // Duplicate key error
                // Se já existe, tentar buscar novamente
                try {
                  const { data: existingProfile } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();
                  profile = existingProfile;
                } catch (retryError) {
                  console.log("Error fetching existing profile:", retryError);
                }
              } else {
                console.error("Error creating user profile:", insertError);
              }
            } else {
              profile = newProfile;
              
              // Se é uma escola, criar registro na tabela universities
              if (session.user.user_metadata?.role === 'school') {
                try {
                  const { error: universityError } = await supabase
                    .from('universities')
                    .insert({
                      user_id: session.user.id,
                      name: session.user.user_metadata?.universityName || 'New University',
                      description: 'University profile created during registration',
                      location: session.user.user_metadata?.location || '',
                      website: session.user.user_metadata?.website || '',
                      contact: {
                        name: fullName,
                        position: session.user.user_metadata?.position || '',
                        email: session.user.email
                      },
                      is_approved: false,
                      profile_completed: false,
                      terms_accepted: false
                    });
                    
                  if (universityError) {
                    console.error('Error creating university:', universityError);
                  }
                } catch (error) {
                  console.error('Error creating university:', error);
                }
              }
              
              // Limpar localStorage se foi usado
              if (pendingFullName) {
                localStorage.removeItem('pending_full_name');
              }
            }
          } catch (error) {
            console.error("Error creating user profile:", error);
            // Continuar mesmo se falhar
          }
        }
        
        setUserProfile(profile);
        setUser(buildUser(session.user, profile));
        setSupabaseUser(session.user);
      } else {
        setUser(null);
        setSupabaseUser(null);
        setUserProfile(null);
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
    // O user_profile será criado automaticamente pelo listener de auth state change
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
  };

  const register = async (email: string, password: string, userData: { full_name: string; role: 'student' | 'school'; [key: string]: any }) => {
    // Garantir que full_name não seja undefined
    if (!userData.full_name || userData.full_name.trim() === '') {
      throw new Error('Nome completo é obrigatório');
    }
    
    localStorage.setItem('pending_full_name', userData.full_name);
    
    // Filtrar valores undefined/null do userData
    const cleanUserData = Object.fromEntries(
      Object.entries(userData).filter(([key, value]) => value !== undefined && value !== null)
    );
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...cleanUserData,
          name: cleanUserData.full_name, // redundância para garantir compatibilidade
        },
      }
    });

    if (error) {
      throw error;
    }
    // O user_profile será criado naturalmente quando o usuário fizer login
    // Salvar dados no localStorage para uso posterior
    if (data?.user) {
      // Usuário registrado com sucesso
    } else {
      // Usuário criado, mas precisa confirmar o e-mail antes de ativar a conta
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};