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
  refetchUserProfile: () => Promise<void>;
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
      let role = sessionUser?.user_metadata?.role;
      if (!role && currentProfile) {
        if (currentProfile.is_admin) role = 'admin';
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
        if (!profile) {
          try {
            console.log('🔍 [USEAUTH] Perfil não encontrado, criando novo perfil');
            console.log('🔍 [USEAUTH] session.user.id:', session.user.id);
            console.log('🔍 [USEAUTH] session.user.user_metadata:', session.user.user_metadata);
            
            const pendingFullName = localStorage.getItem('pending_full_name');
            const pendingPhone = localStorage.getItem('pending_phone');
            
            console.log('🔍 [USEAUTH] Dados do localStorage:');
            console.log('🔍 [USEAUTH] - pendingFullName:', pendingFullName);
            console.log('🔍 [USEAUTH] - pendingPhone:', pendingPhone);
            
            const fullName = pendingFullName || 
              session.user.user_metadata?.full_name || 
              session.user.user_metadata?.name || 
              session.user.email?.split('@')[0] || 
              'User';
            const phone = pendingPhone || 
              session.user.user_metadata?.phone || 
              null;
            
            console.log('🔍 [USEAUTH] Valores finais para criação do perfil:');
            console.log('🔍 [USEAUTH] - fullName:', fullName);
            console.log('🔍 [USEAUTH] - phone:', phone);
            
            // Debug: verificar se o telefone está no user_metadata
            console.log('Debug - user_metadata:', session.user.user_metadata);
            console.log('Debug - phone from user_metadata:', session.user.user_metadata?.phone);
            console.log('Debug - phone from localStorage:', pendingPhone);
            
            const profileData = {
              user_id: session.user.id,
              full_name: fullName,
              phone: phone,
              status: 'active'
            };
            
            console.log('🔍 [USEAUTH] profileData que será inserido:', profileData);
            
            const { data: newProfile, error: insertError } = await supabase
              .from('user_profiles')
              .insert(profileData)
              .select()
              .single();
            
            console.log('🔍 [USEAUTH] Resultado da inserção do perfil:');
            console.log('🔍 [USEAUTH] - newProfile:', newProfile);
            console.log('🔍 [USEAUTH] - insertError:', insertError);
            
            if (insertError) {
              console.log('❌ [USEAUTH] Erro ao inserir perfil:', insertError);
              // Log detalhado do erro
              if (insertError.code === '23505' || insertError.code === '409' || insertError.message?.includes('duplicate')) {
                console.log('⚠️ [USEAUTH] Conflito: perfil já existe. Buscando perfil existente e atualizando telefone se necessário.');
                try {
                  const { data: existingProfile, error: fetchError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();
                  if (fetchError) {
                    console.log('❌ [USEAUTH] Erro ao buscar perfil existente:', fetchError);
                  } else if (existingProfile) {
                    profile = existingProfile;
                    // Atualizar telefone se estiver diferente
                    if (existingProfile.phone !== phone) {
                      console.log('🔄 [USEAUTH] Atualizando telefone do perfil existente:', { antigo: existingProfile.phone, novo: phone });
                      const { data: updatedProfile, error: updateError } = await supabase
                        .from('user_profiles')
                        .update({ phone })
                        .eq('user_id', session.user.id)
                        .select()
                        .single();
                      if (updateError) {
                        console.log('❌ [USEAUTH] Erro ao atualizar telefone:', updateError);
                      } else {
                        console.log('✅ [USEAUTH] Telefone atualizado com sucesso:', updatedProfile);
                        profile = updatedProfile;
                      }
                    } else {
                      console.log('ℹ️ [USEAUTH] Telefone já está correto no perfil existente.');
                    }
                  }
                } catch (retryError) {
                  console.log('❌ [USEAUTH] Erro ao buscar/atualizar perfil existente:', retryError);
                }
              } else {
                console.error('❌ [USEAUTH] Erro inesperado ao criar perfil:', insertError);
              }
            } else {
              console.log('✅ [USEAUTH] Perfil criado com sucesso:', newProfile);
              console.log('🔍 [USEAUTH] Telefone no perfil criado:', newProfile?.phone);
              profile = newProfile;
              if (session.user.user_metadata?.role === 'school') {
                try {
                  const { error: universityError } = await supabase
                    .from('universities')
                    .insert({
                      user_id: session.user.id,
                      name: fullName,
                      description: 'University profile created during registration',
                      location: session.user.user_metadata?.location || '',
                      website: session.user.user_metadata?.website || '',
                      contact: {
                        name: fullName,
                        position: session.user.user_metadata?.position || '',
                        email: session.user.email,
                        phone: session.user.user_metadata?.phone || ''
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
              if (pendingFullName) {
                console.log('🧹 [USEAUTH] Removendo pending_full_name do localStorage');
                localStorage.removeItem('pending_full_name');
              }
              if (pendingPhone) {
                console.log('🧹 [USEAUTH] Removendo pending_phone do localStorage');
                localStorage.removeItem('pending_phone');
              }
            }
          } catch (error) {
            console.error('❌ [USEAUTH] Erro geral ao criar perfil:', error);
          }
        }
        setUserProfile(profile);
        setUser(buildUser(session.user, profile));
        setSupabaseUser(session.user);

        // Sincronizar telefone do user_metadata se o perfil não tiver
        if (!profile.phone && session.user.user_metadata?.phone) {
          console.log('🔄 [USEAUTH] Sincronizando telefone do user_metadata para o perfil:', session.user.user_metadata.phone);
          try {
            const { data: updatedProfile, error: updateError } = await supabase
              .from('user_profiles')
              .update({ phone: session.user.user_metadata.phone })
              .eq('user_id', session.user.id)
              .select()
              .single();
            if (updateError) {
              console.error('❌ [USEAUTH] Erro ao atualizar telefone do perfil:', updateError);
            } else {
              profile = updatedProfile;
              console.log('✅ [USEAUTH] Telefone atualizado no perfil:', updatedProfile.phone);
            }
          } catch (err) {
            console.error('❌ [USEAUTH] Erro inesperado ao atualizar telefone:', err);
          }
        }
      } else {
        setUser(null);
        setSupabaseUser(null);
        setUserProfile(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchAndSetUser(session);
      setLoading(false);
    });
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
    console.log('🔍 [USEAUTH] Iniciando função register');
    console.log('🔍 [USEAUTH] userData recebido:', userData);
    console.log('🔍 [USEAUTH] Telefone no userData:', userData.phone);
    
    // Garantir que full_name não seja undefined
    if (!userData.full_name || userData.full_name.trim() === '') {
      throw new Error('Nome completo é obrigatório');
    }
    
    console.log('💾 [USEAUTH] Salvando no localStorage:');
    console.log('💾 [USEAUTH] - pending_full_name:', userData.full_name);
    console.log('💾 [USEAUTH] - pending_phone:', userData.phone || '');
    
    localStorage.setItem('pending_full_name', userData.full_name);
    localStorage.setItem('pending_phone', userData.phone || '');
    
    // Filtrar valores undefined/null do userData
    const cleanUserData = Object.fromEntries(
      Object.entries(userData).filter(([key, value]) => value !== undefined && value !== null)
    );
    
    console.log('🔍 [USEAUTH] cleanUserData:', cleanUserData);
    console.log('🔍 [USEAUTH] Telefone no cleanUserData:', cleanUserData.phone);
    
    const signUpData = {
      ...cleanUserData,
      name: cleanUserData.full_name, // redundância para garantir compatibilidade
    };
    
    console.log('🔍 [USEAUTH] signUpData que será enviado:', signUpData);
    console.log('🔍 [USEAUTH] Telefone no signUpData:', signUpData.phone);
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: signUpData,
      }
    });

    if (error) {
      console.log('❌ [USEAUTH] Erro no signUp:', error);
      throw error;
    }
    
    console.log('✅ [USEAUTH] SignUp bem-sucedido');
    console.log('🔍 [USEAUTH] data.user:', data?.user);
    console.log('🔍 [USEAUTH] data.user.user_metadata:', data?.user?.user_metadata);
    
    // O user_profile será criado naturalmente quando o usuário fizer login
    // Salvar dados no localStorage para uso posterior
    if (data?.user) {
      console.log('✅ [USEAUTH] Usuário registrado com sucesso');
    } else {
      console.log('⚠️ [USEAUTH] Usuário criado, mas precisa confirmar o e-mail');
    }
    // Registration redirection will be handled in the Auth component
  };

  // Função para refetch manual do perfil do usuário
  const refetchUserProfile = async () => {
    if (!supabaseUser) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();
      if (!error) setUserProfile(data);
    } catch (err) {
      // Ignorar erros silenciosamente
    }
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
    refetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};