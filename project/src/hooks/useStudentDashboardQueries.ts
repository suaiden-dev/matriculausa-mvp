import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { requestCache } from '../lib/requestCache';
import { getGrossPaidAmounts } from '../utils/paymentConverter';

/**
 * Hook para buscar perfil do estudante com cache
 * Cache: 2 minutos
 */
export function useStudentProfileQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.profile(userId),
    queryFn: async () => {
      if (!userId) return null;

      // Tentar cache primeiro
      const cached = requestCache.get('user_profiles', { userId });
      if (cached) {
        console.log('[useStudentProfileQuery] Cache HIT para userId:', userId);
        return cached;
      }

      console.log('[useStudentProfileQuery] Cache MISS - fetching para userId:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      // Armazenar no cache
      if (data) {
        requestCache.set('user_profiles', data, { userId }, 2 * 60 * 1000); // 2 minutos
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar documentos do estudante com cache
 * Cache: 3 minutos
 * Nota: Mantém realtime subscription no componente para invalidação automática
 */
export function useStudentDocumentsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.documents.list(userId),
    queryFn: async () => {
      if (!userId) return [];

      // Tentar cache primeiro
      const cached = requestCache.get('student_documents', { userId });
      if (cached) {
        console.log('[useStudentDocumentsQuery] Cache HIT para userId:', userId);
        return cached;
      }

      console.log('[useStudentDocumentsQuery] Cache MISS - fetching para userId:', userId);

      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar documentos:', error);
        return [];
      }

      const documents = data || [];

      // Armazenar no cache
      requestCache.set('student_documents', documents, { userId }, 3 * 60 * 1000); // 3 minutos

      return documents;
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar aplicações do estudante com cache
 * Cache: 3 minutos
 */
export function useStudentApplicationsQuery(userProfileId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.applications.list(userProfileId),
    queryFn: async () => {
      if (!userProfileId) return [];

      // Tentar cache primeiro
      const cached = requestCache.get('scholarship_applications', { userProfileId });
      if (cached) {
        console.log('[useStudentApplicationsQuery] Cache HIT para userProfileId:', userProfileId);
        return cached;
      }

      console.log('[useStudentApplicationsQuery] Cache MISS - fetching para userProfileId:', userProfileId);

      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          scholarships(
            *,
            universities!inner(
              id,
              name,
              logo_url,
              location,
              is_approved
            )
          )
        `)
        .eq('student_id', userProfileId)
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar aplicações:', error);
        return [];
      }

      const applications = data || [];

      // Armazenar no cache
      requestCache.set('scholarship_applications', applications, { userProfileId }, 3 * 60 * 1000); // 3 minutos

      return applications;
    },
    enabled: !!userProfileId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar configurações de taxas do estudante com cache
 * Cache: 10 minutos (dados raramente mudam)
 * Usa RPC consolidado quando disponível
 */
export function useStudentFeesQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.fees.config(userId),
    queryFn: async () => {
      if (!userId) return null;

      // Tentar cache primeiro
      const cached = requestCache.get('student_fees_config', { userId });
      if (cached) {
        console.log('[useStudentFeesQuery] Cache HIT para userId:', userId);
        return cached;
      }

      console.log('[useStudentFeesQuery] Cache MISS - fetching para userId:', userId);

      try {
        // Tentar RPC consolidado primeiro
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_user_fee_config_consolidated',
          { target_user_id: userId }
        );

        if (!rpcError && rpcData) {
          const config = {
            overrides: rpcData.overrides || {},
            packageFees: rpcData.package_fees || {},
            systemType: rpcData.system_type || 'simplified',
            realPaymentAmounts: rpcData.real_payment_amounts || {},
          };

          // Armazenar no cache
          requestCache.set('student_fees_config', config, { userId }, 10 * 60 * 1000); // 10 minutos

          return config;
        }

        // Fallback: buscar dados individualmente
        const [overridesRes, packageFeesRes, paidAmountsRes] = await Promise.all([
          supabase
            .from('user_fee_overrides')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase.rpc('get_user_package_fees', { user_id_param: userId }),
          supabase.rpc('get_user_paid_fees_display', { user_id_param: userId }),
        ]);

        const config = {
          overrides: overridesRes.data || {},
          packageFees: packageFeesRes.data || {},
          systemType: (overridesRes.data?.system_type || 'simplified') as 'legacy' | 'simplified',
          realPaymentAmounts: paidAmountsRes.data || {},
        };

        // Armazenar no cache
        requestCache.set('student_fees_config', config, { userId }, 10 * 60 * 1000); // 10 minutos

        return config;
      } catch (error) {
        console.error('[useStudentFeesQuery] Erro ao buscar fees:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar valores reais pagos pelo estudante
 * Cache: 5 minutos
 */
export function useStudentPaidAmountsQuery(userId?: string, feeTypes?: string[]) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.fees.paidAmounts(userId),
    queryFn: async () => {
      if (!userId) return {};

      // Tentar cache primeiro
      const cached = requestCache.get('student_paid_amounts', { userId });
      if (cached) {
        console.log('[useStudentPaidAmountsQuery] Cache HIT para userId:', userId);
        return cached;
      }

      console.log('[useStudentPaidAmountsQuery] Cache MISS - fetching para userId:', userId);

      try {
        const types: ('selection_process' | 'application' | 'scholarship' | 'i20_control')[] = feeTypes as any || ['selection_process', 'scholarship', 'i20_control', 'application'];
        const amounts = await getGrossPaidAmounts(userId, types);

        // Armazenar no cache
        requestCache.set('student_paid_amounts', amounts, { userId }, 5 * 60 * 1000); // 5 minutos

        return amounts;
      } catch (error) {
        console.error('[useStudentPaidAmountsQuery] Erro ao buscar valores pagos:', error);
        return {};
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar cupom promocional do estudante
 * Cache: 5 minutos
 */
export function usePromotionalCouponQuery(userId?: string, feeType: string = 'selection_process') {
  return useQuery({
    queryKey: queryKeys.studentDashboard.coupons.promotional(userId, feeType),
    queryFn: async () => {
      if (!userId) return null;

      // Tentar cache primeiro
      const cached = requestCache.get('promotional_coupon_usage', { userId, feeType });
      if (cached) {
        console.log('[usePromotionalCouponQuery] Cache HIT para userId:', userId, 'feeType:', feeType);
        return cached;
      }

      console.log('[usePromotionalCouponQuery] Cache MISS - fetching para userId:', userId, 'feeType:', feeType);

      try {
        const { data: couponUsage, error } = await supabase
          .from('promotional_coupon_usage')
          .select('coupon_code, original_amount, discount_amount, final_amount, metadata, used_at')
          .eq('user_id', userId)
          .eq('fee_type', feeType)
          .order('used_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[usePromotionalCouponQuery] Erro ao buscar cupom:', error);
          return null;
        }

        if (couponUsage && couponUsage.coupon_code) {
          // Verificar se é uma validação recente (menos de 24 horas)
          const usedAt = new Date(couponUsage.used_at);
          const now = new Date();
          const hoursDiff = (now.getTime() - usedAt.getTime()) / (1000 * 60 * 60);
          const isRecentValidation = hoursDiff < 24 || couponUsage.metadata?.is_validation === true;

          if (isRecentValidation) {
            const result = {
              discountAmount: Number(couponUsage.discount_amount),
              finalAmount: Number(couponUsage.final_amount),
              code: couponUsage.coupon_code,
            };

            // Armazenar no cache
            requestCache.set('promotional_coupon_usage', result, { userId, feeType }, 5 * 60 * 1000); // 5 minutos

            return result;
          }
        }

        return null;
      } catch (error) {
        console.error('[usePromotionalCouponQuery] Erro ao verificar cupom:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar status da foto de identidade
 * Cache: 15 minutos (dados raramente mudam)
 */
export function useIdentityPhotoStatusQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.identityPhoto.status(userId),
    queryFn: async () => {
      if (!userId) return null;

      // Tentar cache primeiro
      const cached = requestCache.get('identity_photo_status', { userId });
      if (cached) {
        console.log('[useIdentityPhotoStatusQuery] Cache HIT para userId:', userId);
        return cached;
      }

      console.log('[useIdentityPhotoStatusQuery] Cache MISS - fetching para userId:', userId);

      try {
        const { data, error } = await supabase
          .from('comprehensive_term_acceptance')
          .select('identity_photo_status, identity_photo_path')
          .eq('user_id', userId)
          .eq('term_type', 'checkout_terms')
          .not('identity_photo_path', 'is', null)
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        const status = data?.identity_photo_status || null;

        // Armazenar no cache
        requestCache.set('identity_photo_status', status, { userId }, 15 * 60 * 1000); // 15 minutos

        return status as 'pending' | 'approved' | 'rejected' | null;
      } catch (error) {
        console.error('[useIdentityPhotoStatusQuery] Erro ao verificar status:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar scholarships disponíveis
 * Cache: 10 minutos (dados estáveis)
 */
export function useScholarshipsQuery() {
  return useQuery({
    queryKey: queryKeys.studentDashboard.scholarships.list(),
    queryFn: async () => {
      // Tentar cache primeiro
      const cached = requestCache.get('scholarships_list');
      if (cached) {
        console.log('[useScholarshipsQuery] Cache HIT');
        return cached;
      }

      console.log('[useScholarshipsQuery] Cache MISS - fetching');

      const { data, error } = await supabase
        .from('scholarships')
        .select(`
          *,
          universities!inner(
            id,
            name,
            logo_url,
            location,
            is_approved
          )
        `)
        .eq('is_active', true)
        .eq('universities.is_approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar scholarships:', error);
        return [];
      }

      const scholarships = data || [];

      // Armazenar no cache
      requestCache.set('scholarships_list', scholarships, undefined, 10 * 60 * 1000); // 10 minutos

      return scholarships;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar código de afiliado do usuário com cache
 * Cache: 5 minutos
 */
export function useAffiliateCodeQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.rewards.affiliateCode(userId),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('affiliate_codes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar código de afiliado:', error);
        return null;
      }

      // Se não existe código, cria um
      if (!data) {
        const { data: newCode, error: createError } = await supabase
          .rpc('create_affiliate_code_for_user', { user_id_param: userId });
        
        if (createError) {
          console.error('Erro ao criar código de afiliado:', createError);
          return null;
        }
        
        // Recarrega o código criado
        const { data: reloadedCode } = await supabase
          .from('affiliate_codes')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        return reloadedCode;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar créditos MatriculaCoin do usuário com cache
 * Cache: 2 minutos (pode mudar com frequência)
 */
export function useMatriculacoinCreditsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.rewards.credits(userId),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('matriculacoin_credits')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar créditos:', error);
        return null;
      }

      if (!data) {
        // Cria registro de créditos se não existir
        const { data: newCredits, error: createCreditsError } = await supabase
          .from('matriculacoin_credits')
          .insert([
            { user_id: userId, balance: 0, total_earned: 0, total_spent: 0 }
          ])
          .select()
          .single();

        if (createCreditsError) {
          console.error('Erro ao criar créditos:', createCreditsError);
          return null;
        }
        
        return newCredits;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true, // Revalidar ao voltar para a aba
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar referências (indicações) do usuário com cache
 * Cache: 3 minutos
 */
export function useAffiliateReferralsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.rewards.referrals(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data: referralsData, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Erro ao buscar indicações:', error);
        return [];
      }

      // Buscar nomes dos usuários indicados
      if (referralsData && referralsData.length > 0) {
        const referredIds = referralsData.map(r => r.referred_id).filter(Boolean);
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', referredIds);
        
        // Adicionar dados do usuário a cada referral
        return referralsData.map(referral => ({
          ...referral,
          referred_user: userProfiles?.find(up => up.user_id === referral.referred_id)
        }));
      }

      return [];
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar transações MatriculaCoin do usuário com cache
 * Cache: 3 minutos
 */
export function useMatriculacoinTransactionsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard.rewards.transactions(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('matriculacoin_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Erro ao buscar transações:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar universidades participantes do programa de recompensas
 * Cache: 10 minutos (dados estáticos)
 */
export function useParticipatingUniversitiesQuery() {
  return useQuery({
    queryKey: queryKeys.studentDashboard.rewards.universities(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, location, logo_url, type')
        .eq('is_approved', true)
        .eq('participates_in_matricula_rewards', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar universidades participantes:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
