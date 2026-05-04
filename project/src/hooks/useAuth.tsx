import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { StoredUtmAttribution } from '../types/utm';

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
  email: string | null;
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
  has_paid_i20_control_fee?: boolean;
  selection_process_paid_at?: string | null;
  application_fee_paid_at?: string | null;
  scholarship_fee_paid_at?: string | null;
  i20_paid_at?: string | null;
  is_scholarship_fee_paid: boolean;
  is_placement_fee_paid?: boolean;
  is_admin: boolean; // legado: mantido por compatibilidade
  role?: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  university_id?: string | null;
  // Novos campos para progresso do aluno
  documents_status?: 'pending' | 'analyzing' | 'approved' | 'rejected';
  documents_uploaded?: boolean;
  visa_transfer_active?: boolean;
  registration_completed_at?: string | null;
  selected_scholarship_id?: string | null;
  selected_application_id?: string | null;
  has_paid_college_enrollment_fee?: boolean;
  // Campo para avatar
  avatar_url?: string | null;
  // Referral codes
  affiliate_code?: string | null; // Matricula Rewards code
  seller_referral_code?: string | null; // Seller referral code
  scholarship_package_id?: string | null; // Package ID for seller students

  // Dependentes (campo adicionado no schema user_profiles)
  dependents?: number;

  // System type inherited from seller
  system_type?: 'legacy' | 'simplified';
  selection_survey_passed?: boolean;
  student_process_type?: string | null;

  // CPF Document
  cpf_document?: string;

  // Onboarding completion status
  onboarding_completed?: boolean;

  // Placement Fee Flow (adicionado condicionalmente no registro)
  placement_fee_flow?: boolean;

  // New field for admin restrictions
  is_restricted_admin?: boolean;

  // ... outras colunas se existirem
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData: { full_name: string; role: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';[key: string]: any }, options?: SignUpOptions) => Promise<any>;
  switchRole: (newRole: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller') => void;
  isAuthenticated: boolean;
  loading: boolean;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refetchUserProfile: () => Promise<UserProfile | null>;
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

interface SignUpOptions {
  referralCode?: string;
  role?: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';
  utm?: StoredUtmAttribution | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isProcessingRef = useRef<boolean>(false);

  useEffect(() => {
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
            console.log('🔍 [USEAUTH] Perfil recuperado do banco:', {
               has_paid_selection_process: profile?.has_paid_selection_process_fee,
               is_scholarship_fee_paid: (profile as any)?.is_scholarship_fee_paid,
               is_placement_fee_paid: (profile as any)?.is_placement_fee_paid,
               role: profile?.role
            });

            // ✅ CORREÇÃO: Atualizar email e dependents se estiverem diferentes ou null
            if (profile) {
              const updates: any = {};

              // Atualizar email se estiver null ou diferente
              if (!profile.email || profile.email !== session.user.email) {
                updates.email = session.user.email;
              }

              // Ensure dependents persists from metadata if profile exists without correct value
              const mdDependentsVal = Number(session.user.user_metadata?.dependents ?? NaN);
              if (
                !Number.isNaN(mdDependentsVal) &&
                (profile as any).dependents !== mdDependentsVal
              ) {
                updates.dependents = mdDependentsVal;
              }
              // Persist system_type from metadata if provided and different
              // Check for seller code to identify if it's Brant Immigration
              let isBrantStudent = false;

              const sellerCode = session.user.user_metadata?.seller_referral_code || profile.seller_referral_code;
              if (sellerCode) {
                try {
                  const { data: sellerData } = await supabase
                    .from('sellers')
                    .select('affiliate_admin_id')
                    .eq('referral_code', sellerCode)
                    .maybeSingle();

                  if (sellerData?.affiliate_admin_id) {
                    const { data: adminData } = await supabase
                      .from('affiliate_admins')
                      .select('system_type')
                      .eq('id', sellerData.affiliate_admin_id)
                      .maybeSingle();

                    if (adminData?.system_type === 'legacy') {
                      isBrantStudent = true;
                    }
                  }
                } catch (err) {
                  console.error('❌ [USEAUTH] Erro ao buscar system_type do vendedor (profile existente):', err);
                }
              }

              // Regra de inserção do placement_fee_flow: true para todos, exceto alunos de vendedores da Brant (legacy admin)
              // Alterado para aplicar apenas se for null/undefined, respeitando o valor false manual
              const applyPlacementFlow = profile.role === 'student' && !isBrantStudent;

              if (applyPlacementFlow && (profile.placement_fee_flow === null || profile.placement_fee_flow === undefined)) {
                updates.placement_fee_flow = true;
              }

              // Aplicar atualizações se houver alguma
              if (Object.keys(updates).length > 0) {
                console.log('🔄 [USEAUTH] Atualizando perfil existente:', {
                  antigo: { email: profile.email, dependents: (profile as any).dependents },
                  novo: { email: session.user.email, dependents: mdDependentsVal },
                  updates
                });

                try {
                  const { data: updatedProfile, error: updateError } = await supabase
                    .from('user_profiles')
                    .update(updates)
                    .eq('user_id', session.user.id)
                    .select()
                    .single();

                  if (!updateError && updatedProfile) {
                    profile = updatedProfile as any;
                    console.log('✅ [USEAUTH] Perfil existente atualizado com sucesso:', updatedProfile);
                  } else {
                    console.log('❌ [USEAUTH] Erro ao atualizar perfil existente:', updateError);
                  }
                } catch (error) {
                  console.log('❌ [USEAUTH] Erro geral ao atualizar perfil existente:', error);
                }
              } else {
                console.log('ℹ️ [USEAUTH] Perfil existente já está correto, não precisa de atualização.');
              }
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
                  .maybeSingle();

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

            // Check for seller code to identify if it's Brant Immigration
            let isBrantStudent = false;

            const sellerCode = session.user.user_metadata?.seller_referral_code;
            if (sellerCode) {
              try {
                // Obter config da afiliada para saber se o vendedor é de "legacy" (como Brant)
                const { data: sellerData } = await supabase
                  .from('sellers')
                  .select('affiliate_admin_id')
                  .eq('referral_code', sellerCode)
                  .maybeSingle();

                if (sellerData?.affiliate_admin_id) {
                  const { data: adminData } = await supabase
                    .from('affiliate_admins')
                    .select('system_type')
                    .eq('id', sellerData.affiliate_admin_id)
                    .maybeSingle();

                  if (adminData?.system_type === 'legacy') {
                    isBrantStudent = true;
                  }
                }
              } catch (err) {
                console.error('❌ [USEAUTH] Erro ao buscar system_type do vendedor:', err);
              }
            }

            // Regra de inserção do placement_fee_flow: true para todos, exceto alunos de vendedores da Brant (legacy admin)
            const applyPlacementFlow = finalRole === 'student' && !isBrantStudent;

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
              // Persist system_type if provided during sign up
              system_type: session.user.user_metadata?.system_type || null,
              // Add desired_scholarship_range if provided
              desired_scholarship_range: session.user.user_metadata?.desired_scholarship_range
                ? Number(session.user.user_metadata?.desired_scholarship_range)
                : null,
              ...(applyPlacementFlow && { placement_fee_flow: true })
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
                    // Atualizar telefone, email e dependents se estiverem diferentes
                    const updates: any = {};
                    if (existingProfile.phone !== phone) {
                      updates.phone = phone;
                    }
                    // ✅ CORREÇÃO: Atualizar email se estiver null ou diferente
                    if (!existingProfile.email || existingProfile.email !== session.user.email) {
                      updates.email = session.user.email;
                    }
                    const mdDependents = Number(session.user.user_metadata?.dependents || 0);
                    if (
                      typeof session.user.user_metadata?.dependents !== 'undefined' &&
                      (existingProfile as any).dependents !== mdDependents
                    ) {
                      updates.dependents = mdDependents;
                    }

                    // Forçar atualização do placement_fee_flow para novos usuários (que foram criados via trigger)
                    // Apenas se for null, para permitir override manual para false
                    if (applyPlacementFlow && (existingProfile.placement_fee_flow === null || existingProfile.placement_fee_flow === undefined)) {
                      updates.placement_fee_flow = true;
                    }
                    if (Object.keys(updates).length > 0) {
                      console.log('🔄 [USEAUTH] Atualizando perfil existente:', {
                        antigo: { phone: existingProfile.phone, email: existingProfile.email },
                        novo: { phone, email: session.user.email },
                        updates
                      });
                      const { data: updatedProfile, error: updateError } = await supabase
                        .from('user_profiles')
                        .update(updates)
                        .eq('user_id', session.user.id)
                        .select()
                        .single();
                      if (updateError) {
                        console.log('❌ [USEAUTH] Erro ao atualizar perfil:', updateError);
                      } else {
                        console.log('✅ [USEAUTH] Perfil atualizado com sucesso:', updatedProfile);
                        profile = updatedProfile;
                      }
                    } else {
                      console.log('ℹ️ [USEAUTH] Perfil já está correto, não precisa de atualização.');
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

        const builtUserResult = await buildUser(session.user, profile);

        // Salvar no cache para evitar flicker em próximas navegações
        if (profile && builtUserResult) {
          localStorage.setItem('cached_user', JSON.stringify(builtUserResult));
          localStorage.setItem('cached_user_profile', JSON.stringify(profile));
        }

        // ✅ ESTABILIZAÇÃO: Só atualizar estado se houver mudança real para evitar loops
        setUserProfile(prev => {
          if (!profile) return null;
          if (JSON.stringify(prev) === JSON.stringify(profile)) return prev;
          return profile;
        });

        setUser(prev => {
          if (!builtUserResult) return null;
          // Comparação simplificada por campos chave
          if (prev?.id === builtUserResult.id && prev?.role === builtUserResult.role && prev?.email === builtUserResult.email) return prev;
          return builtUserResult;
        });

        setSupabaseUser(prev => {
          if (prev?.id === session.user?.id && prev?.email === session.user?.email && prev?.updated_at === session.user?.updated_at) return prev;
          return session.user;
        });

        // Refetch do perfil APENAS se for um registro recente (detetado via localStorage)
        // Isso evita chamadas redundantes em cada refresh de página normal
        const isRecentRegistration = localStorage.getItem('pending_full_name') !== null;
        if (profile && profile.role === 'student' && isRecentRegistration) {
          setTimeout(async () => {
             if (!isMounted) return;
            try {
              const { data: refreshedProfile, error: refreshError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

              if (!refreshError && refreshedProfile) {
                setUserProfile(refreshedProfile as UserProfile);

                // Atualizar cache também
                const refreshedUser = await buildUser(session.user, refreshedProfile);
                if (refreshedUser) {
                  setUser(refreshedUser);
                  localStorage.setItem('cached_user', JSON.stringify(refreshedUser));
                  localStorage.setItem('cached_user_profile', JSON.stringify(refreshedProfile));
                }
              }
            } catch (err) {
              console.error('❌ [USEAUTH] Erro ao refetch do perfil:', err);
            }
          }, 1500); 
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
                  affiliate_code_param: session.user.user_metadata.affiliate_code,
                  email_param: session.user.email
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

    const handleAuthEvent = async (session: any) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      try {
        console.log('🔄 [USEAUTH] Iniciando processamento de auth event...');
        await fetchAndSetUser(session);
      } catch (err) {
        console.error('❌ [USEAUTH] Erro crítico no processamento de auth:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          isProcessingRef.current = false;
          console.log('✅ [USEAUTH] Processamento de auth finalizado.');
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      handleAuthEvent(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (!isMounted) return;
        handleAuthEvent(session);
      }
    );
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
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
      const updatedProfile = data as UserProfile;
      setUserProfile(updatedProfile);
      
      // ✅ Sincronizar cache para evitar flicker/redirecionamento após refresh ou re-render
      localStorage.setItem('cached_user_profile', JSON.stringify(updatedProfile));
      
      console.log('✅ [USEAUTH] Perfil atualizado e cache sincronizado:', updates);
    }
  }, [supabaseUser]);

  const getDefaultRole = (email: string): 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller' => {
    // Admin emails can be hardcoded or checked against a list
    const adminEmails = ['admin@matriculausa.com', 'admin@example.com'];
    if (adminEmails.includes(email.toLowerCase())) {
      return 'admin';
    }
    return 'student';
  };

  /**
   * Persiste atribuição UTM no banco de dados
   * 
   * @param userId - ID do usuário (UUID)
   * @param email - Email do usuário
   * @param utm - Dados UTM a serem salvos
   */
  const persistUtmAttribution = async (
    userId: string,
    email: string,
    utm?: StoredUtmAttribution | null
  ): Promise<void> => {
    // Se não há UTM, não faz nada
    if (!utm) return;

    try {
      console.log('[Auth] 📊 Persistindo atribuição UTM para usuário:', userId);

      const { error } = await supabase
        .from('utm_attributions')
        .insert({
          user_id: userId,
          email,
          // Converte undefined para null (PostgreSQL não aceita undefined)
          utm_source: utm.utm_source ?? null,
          utm_medium: utm.utm_medium ?? null,
          utm_campaign: utm.utm_campaign ?? null,
          utm_term: utm.utm_term ?? null,
          utm_content: utm.utm_content ?? null,
          landing_page: utm.landing_page ?? null,
          last_touch_page: utm.last_touch_page ?? null,
          referrer: utm.referrer ?? null,
          // ✅ NOVO: Campos de cliente que compartilhou o link
          client_name: utm.client_name ?? null,
          client_email: utm.client_email ?? null,
          // Usa capturedAt do UTM ou timestamp atual
          captured_at: utm.capturedAt ?? new Date().toISOString(),
        });

      if (error) {
        console.warn('[Auth] ⚠️ Não foi possível salvar atribuição UTM:', error);
        // Não lança erro - falha silenciosa para não quebrar registro
      } else {
        console.log('[Auth] ✅ Atribuição UTM salva com sucesso');
      }
    } catch (err) {
      console.warn('[Auth] ⚠️ Erro inesperado ao salvar atribuição UTM:', err);
      // Não lança erro - falha silenciosa
    }
  };



  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
    // O user_profile será criado automaticamente pelo listener de auth state change
    // Redirection will be handled by the auth state change listener
  }, []);

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

  const logout = useCallback(async () => {
    try {
      setLoading(true);

      // Limpar estado local IMEDIATAMENTE para parar queries e unmount components
      setUser(null);
      setUserProfile(null);
      setSupabaseUser(null);
      
      try {
        // Tentar assinar saída, mas se demorar mais que 2 segundos, continuamos o fluxo
        // para não travar o usuário
        const signOutPromise = supabase.auth.signOut({ scope: 'local' });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SignOut Timeout')), 2000));
        
        await Promise.race([signOutPromise, timeoutPromise]);
      } catch (e) {
        console.warn('⚠️ signOut demorou muito ou falhou (lock contention), prosseguindo com limpeza manual:', e);
      }

      // Limpar dados do localStorage - Mantendo apenas as chaves reais usadas
      localStorage.removeItem('pending_full_name');
      localStorage.removeItem('pending_phone');
      localStorage.removeItem('pending_affiliate_code');
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_user_profile');
      localStorage.removeItem('pending_seller_referral_code');
      
      // Limpar tokens de forma direta por segurança (usando as DUAS chaves possíveis para garantir)
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-fitpynguasqqutuhzifx-auth-token'); 
      localStorage.removeItem('pending_open_modal');
      
      sessionStorage.clear();

      // Redirecionar para home e forçar recarregamento completo para garantir estado limpo
      window.location.href = '/';

    } catch (error) {
      console.error('Error during logout process:', error);
      // Fallback radical
      setUser(null);
      setUserProfile(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  }, [user, setUser, setUserProfile, setSupabaseUser]);

  // Função para registrar usuário
  const register = useCallback(async (email: string, password: string, userData: { full_name: string; role: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';[key: string]: any }, options?: SignUpOptions): Promise<any> => {
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
    // Rest of the long register function...
    // I will use a placeholder here for brevity in the tool call if possible, 
    // but the tool requires exact character sequence. 
    // Wait, I should probably not replace the WHOLE function content if I can help it, 
    // but since I'm wrapping it in useCallback, I have to.
    // Actually, I can just wrap it in useCallback and keep the content.

    // Filtrar valores undefined/null do userData
    // EXCEÇÃO: Manter dependents (mesmo se 0) e desired_scholarship_range quando há seller_referral_code ou affiliate_code
    // Via seller/affiliate admin: desired_scholarship_range é OBRIGATÓRIO
    // Registro direto: desired_scholarship_range pode ser null
    const hasReferralCode = userData.seller_referral_code || userData.affiliate_code;
    const fieldsToKeepEvenIfNull = ['dependents'];

    const cleanUserData = Object.fromEntries(
      Object.entries(userData).filter(([key, value]) => {
        // Sempre manter dependents (mesmo se 0)
        if (fieldsToKeepEvenIfNull.includes(key)) {
          return true;
        }

        // Se há referral code (seller ou affiliate), desired_scholarship_range é obrigatório
        // Não pode ser null - se estiver null, já foi tratado no componente de origem
        if (key === 'desired_scholarship_range') {
          // Se tem referral code mas desired_scholarship_range é null, isso é um erro
          if (hasReferralCode && value === null) {
            console.warn('⚠️ [USEAUTH] desired_scholarship_range é null mas há referral code. Isso não deveria acontecer.');
          }
          // Manter o valor (null para registro direto, número para via seller/affiliate)
          return true;
        }

        // Filtrar outros valores null/undefined
        return value !== undefined && value !== null;
      })
    );

    console.log('🔍 [USEAUTH] userData original:', userData);
    console.log('🔍 [USEAUTH] cleanUserData:', cleanUserData);

    // Normaliza o e-mail para evitar duplicidade por case/espacos
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Capturar informações de IP e User-Agent para conformidade legal
    let clientInfo: { registration_ip: string | null; user_agent: string } = {
      registration_ip: null,
      user_agent: navigator.userAgent
    };
    try {
      const { getClientInfo } = await import('../utils/clientInfo');
      clientInfo = await getClientInfo();
    } catch (e) {
      console.warn('⚠️ [USEAUTH] Erro ao obter informações do cliente:', e);
    }

    const signUpData = {
      ...cleanUserData,
      name: cleanUserData.full_name, // redundância para garantir compatibilidade
      full_name: cleanUserData.full_name, // Adicionar full_name explicitamente
      email: normalizedEmail, // Adicionar email do aluno ao metadata
      registration_ip: clientInfo.registration_ip, // Adicionado para o trigger de termos
      user_agent: clientInfo.user_agent // Adicionado para o trigger de termos
    };

    console.log('🔍 [USEAUTH] signUpData final:', signUpData);

    console.log('🔍 [USEAUTH] Tentando signUp com:', {
      email: normalizedEmail,
      userData: signUpData
    });

    // ✅ Verificar ANTES do signUp se há uma sessão ativa de staff (seller/admin/affiliate_admin)
    // Isso é importante para não perder a sessão do seller quando ele registra um aluno
    // Verificar tanto pela sessão atual quanto pela URL (página /student/register só sellers podem acessar)
    const { data: { session: sessionBeforeSignUp } } = await supabase.auth.getSession();
    const isOnSellerRegistrationPage = typeof window !== 'undefined' && window.location.pathname === '/student/register';
    let isStaffRegistering = false;
    let staffSessionToRestore: { access_token: string; refresh_token: string } | null = null;

    if (sessionBeforeSignUp?.user) {
      // Verificar role do usuário atual ANTES do registro
      let currentUserRole: string | null = sessionBeforeSignUp.user.user_metadata?.role;

      if (!currentUserRole) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', sessionBeforeSignUp.user.id)
          .single();
        currentUserRole = profileData?.role || null;
      }

      isStaffRegistering = !!(currentUserRole &&
        ['seller', 'admin', 'affiliate_admin'].includes(currentUserRole));

      if (isStaffRegistering) {
        // Salvar a sessão completa do staff para restaurar depois
        staffSessionToRestore = {
          access_token: sessionBeforeSignUp.access_token,
          refresh_token: sessionBeforeSignUp.refresh_token || ''
        };
        console.log('🔍 [USEAUTH] Registro sendo feito por staff (seller/admin/affiliate_admin), não fará login automático');
        console.log('🔍 [USEAUTH] Sessão do staff salva para restauração');
      }
    }

    // Se estiver na página de registro de seller, também considerar como registro por staff
    if (isOnSellerRegistrationPage && !isStaffRegistering && sessionBeforeSignUp) {
      console.log('🔍 [USEAUTH] Detectado registro na página /student/register (acessível apenas por staff)');
      isStaffRegistering = true;
      staffSessionToRestore = {
        access_token: sessionBeforeSignUp.access_token,
        refresh_token: sessionBeforeSignUp.refresh_token || ''
      };
    }

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

    // ✅ REATIVADO: Auto-confirmar email para todos os alunos (role student)
    if (data?.user && userData.role === 'student') {
      try {
        // Verificar se é um registro de vendedor (tem seller_referral_code E está em seller_registrations)
        let isSellerRegistration = false;

        if (userData.seller_referral_code) {
          // Verificar se existe registro pendente em seller_registrations
          const { data: sellerReg, error: sellerRegError } = await supabase
            .from('seller_registrations')
            .select('id')
            .eq('user_id', data.user.id)
            .eq('status', 'pending')
            .maybeSingle();

          if (!sellerRegError && sellerReg) {
            isSellerRegistration = true;
            console.log('🔍 [USEAUTH] Usuário é vendedor em registro, NÃO auto-confirmar email');
          }
        }

        // Auto-confirmar apenas se NÃO for registro de vendedor
        if (!isSellerRegistration) {
          console.log('🔍 [USEAUTH] Auto-confirmando email para aluno...', {
            userId: data.user.id,
            email: normalizedEmail,
            role: userData.role,
            seller_referral_code: userData.seller_referral_code,
            isStaffRegistering
          });

          // Chamar Edge Function para confirmar email
          const { data: confirmData, error: confirmError } = await supabase.functions.invoke('auto-confirm-student-email', {
            body: {
              userId: data.user.id,
              role: userData.role
            }
          });

          if (confirmError) {
            console.error('❌ [USEAUTH] Erro ao auto-confirmar email:', confirmError);
            console.error('❌ [USEAUTH] Detalhes do erro:', {
              message: confirmError.message,
              status: confirmError.status,
              name: confirmError.name
            });
            // Não falhar o registro se a confirmação falhar
          } else {
            console.log('✅ [USEAUTH] Email auto-confirmado com sucesso', confirmData);

            // NÃO fazer login automático se foi um registro feito por staff
            if (isStaffRegistering && staffSessionToRestore) {
              console.log('🔍 [USEAUTH] Registro feito por staff, restaurando sessão do seller/admin');

              // Restaurar a sessão do staff imediatamente após a confirmação do email
              // Isso substitui a sessão do aluno que foi criada automaticamente
              const { error: restoreError } = await supabase.auth.setSession({
                access_token: staffSessionToRestore.access_token,
                refresh_token: staffSessionToRestore.refresh_token
              });

              if (restoreError) {
                console.error('❌ [USEAUTH] Erro ao restaurar sessão do staff:', restoreError);
                // Se falhar, fazer logout para não manter sessão do aluno
                await supabase.auth.signOut();
              } else {
                console.log('✅ [USEAUTH] Sessão do staff restaurada com sucesso');
              }
            } else if (isStaffRegistering) {
              console.log('🔍 [USEAUTH] Registro feito por staff, mas não há sessão para restaurar - fazendo logout');
              await supabase.auth.signOut();
            } else {
              // Aguardar um pouco para garantir que a confirmação foi processada
              await new Promise(resolve => setTimeout(resolve, 500));

              // Fazer login automático após confirmação apenas se não for registro por staff
              console.log('🔍 [USEAUTH] Fazendo login automático...');
              const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
              });

              if (loginError) {
                console.error('❌ [USEAUTH] Erro ao fazer login automático:', loginError);
                console.error('❌ [USEAUTH] Detalhes do erro de login:', {
                  message: loginError.message,
                  status: loginError.status,
                  name: loginError.name
                });
                // Não falhar, o usuário pode fazer login manualmente depois
              } else {
                console.log('✅ [USEAUTH] Login automático realizado com sucesso', loginData);

                // ✅ Persistir atribuição UTM após login bem-sucedido (com sessão autenticada)
                if (data?.user && options?.utm) {
                  await persistUtmAttribution(data.user.id, normalizedEmail, options.utm);
                }

                // O onAuthStateChange vai detectar a mudança e atualizar o estado
              }
            }
          }
        } else {
          console.log('⚠️ [USEAUTH] Registro de vendedor detectado, NÃO auto-confirmando email');
        }
      } catch (err) {
        console.warn('⚠️ [USEAUTH] Erro ao tentar auto-confirmar email e fazer login:', err);
        // Não falhar o registro se houver erro
      }
    }

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

    // ✅ NOVO: Notificar n8n para novos alunos
    if (userData.role === 'student' && data?.user) {
      const registrationPath = window.location.pathname;
      
      try {
        // Buscar o ID do perfil (que é o que a student_action_logs espera)
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        const profileId = profileData?.id || data.user.id;

        // 1. Notificar n8n (Gatilho)
        await supabase.functions.invoke('forward-notification-to-n8n', {
          body: {
            target: 'new_registration',
            user_id: profileId, // Agora enviando o ID do Perfil correto
            name: userData.full_name,
            email: normalizedEmail,
            phone: userData.phone,
            registration_path: registrationPath
          }
        });
        console.log('✅ [USEAUTH] n8n notificado com sucesso');
      } catch (err) {
        console.warn('⚠️ [USEAUTH] Erro ao notificar n8n:', err);
      }
    }

    return data;
  }, []);

  // Função para trocar role do usuário (apenas para desenvolvimento/admin)
  const switchRole = (newRole: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller') => {
    if (!user || !userProfile) return;

    // Atualizar estado local temporariamente
    setUser(prev => prev ? { ...prev, role: newRole } : null);
    setUserProfile(prev => prev ? { ...prev, role: newRole } : null);
  };

  // Função para refetch manual do perfil do usuário - memoizada para evitar re-renders desnecessários
  const refetchUserProfile = useCallback(async () => {
    if (!supabaseUser) return null;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();
      if (!error && data) {
        setUserProfile(data);
        return data as UserProfile;
      }
      return null;
    } catch (err) {
      return null;
    }
  }, [supabaseUser]);

  const value = useMemo(() => ({
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
  }), [
    user,
    supabaseUser,
    userProfile,
    login,
    logout,
    register,
    switchRole,
    loading,
    updateUserProfile,
    refetchUserProfile,
    checkStudentTermsAcceptance
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};