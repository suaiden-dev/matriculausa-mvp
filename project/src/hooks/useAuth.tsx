import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  avatar_url: string | null;
  email: string;
  name?: string;
  role: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';
  university_id?: string;
  hasPaidProcess?: boolean;
  university_image?: string;
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
  has_paid_i20_control_fee?: boolean; // adicionada para refletir Overview
  is_admin: boolean; // legado: mantido por compatibilidade
  role?: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  university_id?: string | null;
  // Novos campos para progresso do aluno
  documents_status?: 'pending' | 'analyzing' | 'approved' | 'rejected';
  documents_uploaded?: boolean;
  selected_scholarship_id?: string | null;
  has_paid_college_enrollment_fee?: boolean;
  // Campo para avatar
  avatar_url?: string | null;
  // Referral codes
  affiliate_code?: string | null; // Matricula Rewards code
  seller_referral_code?: string | null; // Seller referral code
  scholarship_package_id?: string | null; // Package ID for seller students

  // Dependentes (campo adicionado no schema user_profiles)
  dependents?: number;

  // ... outras colunas se existirem
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: { full_name: string; role: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller'; [key: string]: any }) => Promise<void>;
  switchRole: (newRole: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller') => void;
  isAuthenticated: boolean;
  loading: boolean;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refetchUserProfile: () => Promise<void>;
  checkStudentTermsAcceptance: (userId: string) => Promise<boolean>;
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

    // Proteção contra loops infinitos no Safari iOS
    let isMounted = true;

    const buildUser = async (sessionUser: any, currentProfile: UserProfile | null): Promise<User> => {
      // Prioridade: perfil.role -> user_metadata.role -> verificar se é universidade -> verificar se é vendedor -> perfil.is_admin -> fallback por email
      let role = currentProfile?.role as User['role'] | undefined;
      if (!role) role = sessionUser?.user_metadata?.role as User['role'] | undefined;
      
      // Se ainda não tem role, verificar se é uma universidade
      if (!role) {
        try {
          const { data: university } = await supabase
            .from('universities')
            .select('id, image_url, logo_url')
            .eq('user_id', sessionUser.id)
            .single();
          
          if (university) {
            role = 'school';
            // Adicionar a imagem da universidade ao user
            if (university.image_url || university.logo_url) {
              sessionUser.university_image = university.image_url || university.logo_url;
            }
          }
        } catch (error) {
          // Se não encontrar universidade, continuar com a lógica normal
        }
      }
      
      // Se ainda não tem role, verificar se é um vendedor
      if (!role) {
        try {
          console.log('🔍 [USEAUTH] Verificando se usuário é vendedor...');
          const { data: seller, error: sellerError } = await supabase
            .from('sellers')
            .select('id, referral_code')
            .eq('user_id', sessionUser.id)
            .eq('is_active', true)
            .single();
          
          if (sellerError) {
            console.log('🔍 [USEAUTH] Erro ao verificar vendedor:', sellerError);
          } else if (seller) {
            role = 'seller';
            console.log('✅ [USEAUTH] Usuário identificado como vendedor:', seller);
          } else {
            console.log('🔍 [USEAUTH] Usuário não é vendedor ativo');
          }
        } catch (error) {
          console.log('🔍 [USEAUTH] Erro geral ao verificar vendedor:', error);
          // Se não encontrar vendedor, continuar com a lógica normal
        }
      }
      
      if (!role && currentProfile) role = currentProfile.is_admin ? 'admin' : undefined;
      if (!role) role = getDefaultRole(sessionUser?.email || '');

      const builtUser: User = {
        id: sessionUser.id,
        avatar_url: currentProfile?.avatar_url || null,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || '',
        role,
        university_id: currentProfile?.university_id ?? undefined,
        hasPaidProcess: currentProfile?.has_paid_selection_process_fee,
        university_image: (sessionUser as any).university_image || null,
      };
      // Usuario construído com sucesso
      return builtUser;
    };

    const fetchAndSetUser = async (session: any) => {
      if (session?.user) {
        // Verificar se é OAuth de email (não para autenticação)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        // Se há código OAuth na URL, é provavelmente para email
        if (code && state && (state.startsWith('google_') || state.startsWith('microsoft_'))) {
          console.log('🔄 [USEAUTH] OAuth de email detectado. Não processando autenticação...');
          // Não processar autenticação para OAuth de email
          return;
        }
        
        let profile: UserProfile | null = null;
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (error) {
            console.log("🔍 [USEAUTH] Erro ao buscar perfil via tabela:", error);
            // Para erros de permissão, tentar usar função RPC
            if (error.code === '403' || error.code === '406') {
              console.log('🔍 [USEAUTH] Tentando buscar perfil via RPC...');
              try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_user_profile');
                if (rpcError) {
                  console.log('🔍 [USEAUTH] Erro ao buscar via RPC:', rpcError);
                  profile = null;
                } else {
                  profile = rpcData?.[0] || null;
                  console.log('🔍 [USEAUTH] Perfil encontrado via RPC:', profile);
                }
              } catch (rpcErr) {
                console.log('🔍 [USEAUTH] Erro geral na RPC:', rpcErr);
                profile = null;
              }
            }
          } else {
            profile = data || null;
            // Ensure dependents persists from metadata if profile exists without correct value
            const mdDependentsVal = Number(session.user.user_metadata?.dependents ?? NaN);
            if (
              profile &&
              !Number.isNaN(mdDependentsVal) &&
              (profile as any).dependents !== mdDependentsVal
            ) {
              try {
                const { data: updatedProfile, error: depUpdateError } = await supabase
                  .from('user_profiles')
                  .update({ dependents: mdDependentsVal })
                  .eq('user_id', session.user.id)
                  .select()
                  .single();
                if (!depUpdateError && updatedProfile) {
                  profile = updatedProfile as any;
                }
              } catch (_) {}
            }
          }
        } catch (error) {
          console.log("🔍 [USEAUTH] Erro geral ao buscar perfil:", error);
          profile = null;
        }
        if (!profile) {
          try {
            console.log('🔍 [USEAUTH] Perfil não encontrado, criando novo perfil');
            console.log('🔍 [USEAUTH] session.user.id:', session.user.id);
            console.log('🔍 [USEAUTH] session.user.user_metadata:', session.user.user_metadata);
            
            const pendingFullName = localStorage.getItem('pending_full_name');
            const pendingPhone = localStorage.getItem('pending_phone');
            const pendingAffiliateCode = localStorage.getItem('pending_affiliate_code');
            
            console.log('🔍 [USEAUTH] Dados do localStorage:');
            console.log('🔍 [USEAUTH] - pendingFullName:', pendingFullName);
            console.log('🔍 [USEAUTH] - pendingPhone:', pendingPhone);
            console.log('🔍 [USEAUTH] - pendingAffiliateCode:', pendingAffiliateCode);
            
            const fullName = pendingFullName || 
              session.user.user_metadata?.full_name || 
              session.user.user_metadata?.name || 
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
            
            const desiredRoleFromMetadata = (session.user.user_metadata?.role as 'student' | 'school' | 'admin' | undefined) || 'student';

            // Se o usuário tem seller_referral_code, sempre começar como 'student'
            // O role será elevado para 'seller' apenas após aprovação do admin
            const finalRole = session.user.user_metadata?.seller_referral_code ? 'student' : desiredRoleFromMetadata;

            // Buscar o pacote de bolsas se fornecido
            let scholarshipPackageId = null;
            if (session.user.user_metadata?.scholarship_package_number) {
              try {
                const { data: packageData, error: packageError } = await supabase
                  .from('scholarship_packages')
                  .select('id')
                  .eq('package_number', session.user.user_metadata.scholarship_package_number)
                  .eq('is_active', true)
                  .single();
                
                if (!packageError && packageData) {
                  scholarshipPackageId = packageData.id;
                  console.log('✅ [USEAUTH] Pacote de bolsas encontrado:', packageData.id);
                } else {
                  console.warn('⚠️ [USEAUTH] Pacote de bolsas não encontrado:', packageError);
                }
              } catch (err) {
                console.error('❌ [USEAUTH] Erro ao buscar pacote de bolsas:', err);
              }
            }

            const profileData = {
              user_id: session.user.id,
              full_name: fullName,
              email: session.user.email, // Adicionar o email do usuário
              phone: phone,
              status: 'active',
              role: finalRole,
              // Include referral codes if provided
              affiliate_code: session.user.user_metadata?.affiliate_code || null,
              seller_referral_code: session.user.user_metadata?.seller_referral_code || null,
              scholarship_package_id: scholarshipPackageId,
              // Persist dependents if provided during sign up
              dependents: typeof session.user.user_metadata?.dependents !== 'undefined'
                ? Number(session.user.user_metadata?.dependents) || 0
                : 0,
              // Add desired_scholarship_range if provided
              desired_scholarship_range: session.user.user_metadata?.desired_scholarship_range 
                ? Number(session.user.user_metadata?.desired_scholarship_range) 
                : null
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
                    // Atualizar telefone e dependents se estiverem diferentes
                    const updates: any = {};
                    if (existingProfile.phone !== phone) {
                      updates.phone = phone;
                    }
                    const mdDependents = Number(session.user.user_metadata?.dependents || 0);
                    if (
                      typeof session.user.user_metadata?.dependents !== 'undefined' &&
                      (existingProfile as any).dependents !== mdDependents
                    ) {
                      updates.dependents = mdDependents;
                    }
                    if (Object.keys(updates).length > 0) {
                      console.log('🔄 [USEAUTH] Atualizando telefone do perfil existente:', { antigo: existingProfile.phone, novo: phone });
                      const { data: updatedProfile, error: updateError } = await supabase
                        .from('user_profiles')
                        .update(updates)
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
                } catch (error) {
                  console.error('❌ [USEAUTH] Erro geral ao criar perfil:', error);
                }
              } else {
                console.error('❌ [USEAUTH] Erro geral ao criar perfil:', insertError);
              }
            } else {
              console.log('✅ [USEAUTH] Perfil criado com sucesso:', newProfile);
              console.log('🔍 [USEAUTH] Telefone no perfil criado:', newProfile?.phone);
              profile = newProfile;
              
              // Processar código de afiliado se existir (do localStorage)
              if (pendingAffiliateCode) {
                console.log('🎁 [USEAUTH] Processando código de afiliado do localStorage:', pendingAffiliateCode);
                try {
                  // Verificar se o código é válido
                  const { data: affiliateCodeData, error: affiliateError } = await supabase
                    .from('affiliate_codes')
                    .select('user_id, code')
                    .eq('code', pendingAffiliateCode)
                    .eq('is_active', true)
                    .single();
                  
                  if (affiliateError || !affiliateCodeData) {
                    console.log('❌ [USEAUTH] Código de afiliado inválido:', pendingAffiliateCode);
                  } else {
                    // Verificar se não é auto-indicação
                    if (affiliateCodeData.user_id === session.user.id) {
                      console.log('⚠️ [USEAUTH] Tentativa de auto-indicação detectada');
                    } else {
                      // Criar registro de indicação
                      const { error: referralError } = await supabase
                        .from('affiliate_referrals')
                        .insert({
                          referrer_id: affiliateCodeData.user_id,
                          referred_id: session.user.id,
                          affiliate_code: pendingAffiliateCode,
                          status: 'pending',
                          credits_earned: 180 // 180 Matricula Coins
                        });
                      
                      if (referralError) {
                        console.log('❌ [USEAUTH] Erro ao criar indicação:', referralError);
                      } else {
                        console.log('✅ [USEAUTH] Indicação criada com sucesso');
                        // Limpar código do localStorage
                        localStorage.removeItem('pending_affiliate_code');
                      }
                    }
                  }
                } catch (error) {
                  console.error('❌ [USEAUTH] Erro ao processar código de afiliado:', error);
                }
              }
              
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
        // Garantir que o campo role do perfil esteja alinhado com o metadata e com dados de universidade
        try {
          const metadataRole = session.user.user_metadata?.role as 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller' | undefined;
          let finalRole: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller' | undefined = profile?.role || metadataRole;

          if (!finalRole || (finalRole === 'student' && metadataRole === 'school')) {
            // Se tiver universidade vinculada, forçar role 'school'
            const { data: uni } = await supabase
              .from('universities')
              .select('id, image_url, logo_url')
              .eq('user_id', session.user.id)
              .single();
            if (uni) {
              finalRole = 'school';
              // Atualizar a imagem da universidade no user se necessário
              if (uni.image_url || uni.logo_url) {
                session.user.university_image = uni.image_url || uni.logo_url;
              }
            }
          }

          if (finalRole && profile && profile.role !== finalRole) {
            const { data: updated, error: roleUpdateError } = await supabase
              .from('user_profiles')
              .update({ role: finalRole })
              .eq('user_id', session.user.id)
              .select()
              .single();
            if (!roleUpdateError && updated) {
              profile = updated as any;
            }
          }
        } catch (e) {
          // se falhar, seguimos com o profile atual
        }

        setUserProfile(profile);
        const builtUser = await buildUser(session.user, profile);
        setUser(builtUser);
        setSupabaseUser(session.user);

        // Salvar no cache para evitar flicker em próximas navegações
        if (profile && builtUser) {
          localStorage.setItem('cached_user', JSON.stringify(builtUser));
          localStorage.setItem('cached_user_profile', JSON.stringify(profile));
        }

        // Sincronizar telefone do user_metadata se o perfil não tiver
        if (profile && !profile.phone && session.user.user_metadata?.phone) {
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
        
        if (session.user.user_metadata?.affiliate_code) {
          console.log('🎁 [USEAUTH] Processando código de afiliado do user_metadata:', session.user.user_metadata.affiliate_code);
          
          // Verificar se já existe um registro para este código
          const { data: existingRecord } = await supabase
            .from('used_referral_codes')
            .select('id, status')
            .eq('user_id', session.user.id)
            .eq('affiliate_code', session.user.user_metadata.affiliate_code)
            .single();
          
          if (existingRecord) {
            console.log('🔍 [USEAUTH] Registro já existe:', existingRecord);
            if (existingRecord.status !== 'applied') {
              console.log('🔍 [USEAUTH] Atualizando status para applied...');
              await supabase
                .from('used_referral_codes')
                .update({ 
                  status: 'applied',
                  stripe_coupon_id: 'MATR_' + session.user.user_metadata.affiliate_code,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingRecord.id);
            }
          } else {
            console.log('🔍 [USEAUTH] Criando novo registro...');
            try {
              // Usar a função validate_and_apply_referral_code para processar o código
              const { data: validationResult, error: validationError } = await supabase
                .rpc('validate_and_apply_referral_code', {
                  user_id_param: session.user.id,
                  affiliate_code_param: session.user.user_metadata.affiliate_code
                });

              if (validationError) {
                console.error('❌ [USEAUTH] Erro ao processar affiliate_code do user_metadata:', validationError);
              } else if (validationResult?.success) {
                console.log('✅ [USEAUTH] Affiliate_code do user_metadata processado com sucesso:', validationResult);
                
                // Atualizar status para 'applied' imediatamente
                await supabase
                  .from('used_referral_codes')
                  .update({ 
                    status: 'applied',
                    stripe_coupon_id: 'MATR_' + session.user.user_metadata.affiliate_code,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', session.user.id)
                  .eq('affiliate_code', session.user.user_metadata.affiliate_code);
              } else {
                console.log('⚠️ [USEAUTH] Affiliate_code do user_metadata não pôde ser processado:', validationResult?.error);
              }
            } catch (error) {
              console.error('❌ [USEAUTH] Erro ao processar affiliate_code do user_metadata:', error);
            }
          }
        }
      } else {
        setUser(null);
        setSupabaseUser(null);
        setUserProfile(null);
      }
    };

    // Verificar se já temos dados em cache para evitar flicker
    const cachedUser = localStorage.getItem('cached_user');
    const cachedProfile = localStorage.getItem('cached_user_profile');
    
    if (cachedUser && cachedProfile) {
      try {
        const userData = JSON.parse(cachedUser);
        const profileData = JSON.parse(cachedProfile);
        setUser(userData);
        setUserProfile(profileData);
        setLoading(false);
      } catch (e) {
        // Se falhar ao parsear cache, continuar com verificação normal
      }
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      fetchAndSetUser(session);
      setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (!isMounted) return; // Proteção contra updates após unmount
        fetchAndSetUser(session);
        setLoading(false);
      }
    );
    return () => {
      isMounted = false;
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

  const getDefaultRole = (email: string): 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller' => {
    // Admin emails can be hardcoded or checked against a list
    const adminEmails = ['admin@matriculausa.com', 'admin@example.com'];
    if (adminEmails.includes(email.toLowerCase())) {
      return 'admin';
    }
    return 'student';
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

  // Check if student has accepted terms
  const checkStudentTermsAcceptance = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_user_term_acceptance', {
        p_user_id: userId,
        p_term_type: 'terms_of_service'
      });

      if (error) {
        console.error('Error checking terms acceptance:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking terms acceptance:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Forçar limpeza de todos os dados de autenticação
      await supabase.auth.signOut({ scope: 'local' });
      
      // Limpar estado local imediatamente
      setUser(null);
      setUserProfile(null);
      
      // Limpar dados do localStorage
      localStorage.removeItem('pending_full_name');
      localStorage.removeItem('pending_phone');
      localStorage.removeItem('pending_affiliate_code');
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_user_profile');
      localStorage.removeItem('pending_seller_referral_code');
      localStorage.removeItem('sb-fitpynguasqqutuhzifx-auth-token');
      sessionStorage.clear();
      
      // Forçar refresh da página para limpar completamente o estado
      if (window.location.pathname.includes('/inbox')) {
        console.log('🔄 Logout from inbox page - refreshing to clear emails...');
        window.location.href = '/';
      } else {
        // Redirecionar para home sem usar navigate para evitar problemas de estado
        window.location.href = '/';
      }
      
    } catch (error) {
      console.error('Error during logout process:', error);
      
      // Mesmo com erro, limpar tudo e forçar redirecionamento
      setUser(null);
      setUserProfile(null);
      
      // Limpar localStorage
      localStorage.removeItem('pending_full_name');
      localStorage.removeItem('pending_phone');
      localStorage.removeItem('pending_affiliate_code');
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_user_profile');
      localStorage.removeItem('sb-fitpynguasqqutuhzifx-auth-token');
      sessionStorage.clear();
      
      // Forçar redirecionamento
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  // Função para registrar usuário
  const register = async (email: string, password: string, userData: { full_name: string; role: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller'; [key: string]: any }) => {
    console.log('🔍 [USEAUTH] Iniciando função register');
    console.log('🔍 [USEAUTH] userData recebido:', userData);
    
    // Garantir que full_name não seja undefined
    if (!userData.full_name || userData.full_name.trim() === '') {
      throw new Error('Nome completo é obrigatório');
    }
    
    // Salvar dados no localStorage para uso posterior
    localStorage.setItem('pending_full_name', userData.full_name);
    if (userData.phone) {
      localStorage.setItem('pending_phone', userData.phone);
    }
    
    // Filtrar valores undefined/null do userData
    const cleanUserData = Object.fromEntries(
      Object.entries(userData).filter(([/*k*/ _k, value]) => value !== undefined && value !== null)
    );
    
    console.log('🔍 [USEAUTH] userData original:', userData);
    console.log('🔍 [USEAUTH] cleanUserData:', cleanUserData);
    
    const signUpData = {
      ...cleanUserData,
      name: cleanUserData.full_name, // redundância para garantir compatibilidade
      full_name: cleanUserData.full_name, // Adicionar full_name explicitamente
    };
    
    console.log('🔍 [USEAUTH] signUpData final:', signUpData);
    
    // Normaliza o e-mail para evitar duplicidade por case/espacos
    const normalizedEmail = (email || '').trim().toLowerCase();

    console.log('🔍 [USEAUTH] Tentando signUp com:', {
      email: normalizedEmail,
      userData: signUpData
    });

    const { error, data } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: signUpData,
      }
    });

    if (error) {
      console.log('❌ [USEAUTH] Erro no signUp:', error);
      console.log('❌ [USEAUTH] Detalhes do erro:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      throw error;
    }
    
    console.log('✅ [USEAUTH] SignUp bem-sucedido');
    console.log('🔍 [USEAUTH] data.user:', data?.user);
    
    // Se o usuário tem scholarship_package_number, converter para scholarship_package_id
    if (userData.scholarship_package_number && data?.user) {
      try {
        console.log('🔍 [USEAUTH] Convertendo scholarship_package_number para scholarship_package_id...');
        
        const { data: packageData, error: packageError } = await supabase
          .from('scholarship_packages')
          .select('id, scholarship_amount')
          .eq('package_number', userData.scholarship_package_number)
          .eq('is_active', true)
          .single();
        
        if (packageError) {
          console.warn('⚠️ [USEAUTH] Erro ao buscar pacote:', packageError);
        } else if (packageData) {
          console.log('🔍 [USEAUTH] Pacote encontrado:', packageData.id);
          
          // Atualizar o user_profiles com o scholarship_package_id e desired_scholarship_range
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ 
              scholarship_package_id: packageData.id,
              desired_scholarship_range: userData.desired_scholarship_range || packageData.scholarship_amount
            })
            .eq('user_id', data.user.id);
          
          if (updateError) {
            console.warn('⚠️ [USEAUTH] Erro ao atualizar scholarship_package_id:', updateError);
          } else {
            console.log('✅ [USEAUTH] scholarship_package_id atualizado com sucesso');
          }
        }
      } catch (err) {
        console.warn('⚠️ [USEAUTH] Erro na conversão do pacote:', err);
      }
    }
  };

  // Função para trocar role do usuário (apenas para desenvolvimento/admin)
  const switchRole = (newRole: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller') => {
    if (!user || !userProfile) return;
    
    // Atualizar estado local temporariamente
    setUser(prev => prev ? { ...prev, role: newRole } : null);
    setUserProfile(prev => prev ? { ...prev, role: newRole } : null);
  };

  // Função para refetch manual do perfil do usuário - memoizada para evitar re-renders desnecessários
  const refetchUserProfile = useCallback(async () => {
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
  }, [supabaseUser]);

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
    checkStudentTermsAcceptance,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};