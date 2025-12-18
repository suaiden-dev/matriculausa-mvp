import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { getDisplayAmounts } from '../utils/paymentConverter';

/**
 * Hook para buscar dados do affiliate admin com cache
 * Cache: 3 minutos
 */
export function useAffiliateAdminDataQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.adminData(userId),
    queryFn: async () => {
      if (!userId) return null;

      console.log('[useAffiliateAdminDataQuery] Fetching admin data for userId:', userId);
      
      // 1. Descobrir affiliate_admin_id
      const { data: aaList, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      if (aaErr || !aaList || aaList.length === 0) {
        throw new Error('No affiliate admin found for user');
      }
      
      return {
        affiliateAdminId: aaList[0].id,
        userId
      };
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar sellers vinculados ao affiliate admin
 * Cache: 2 minutos
 */
export function useAffiliateSellersQuery(affiliateAdminId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.sellers(affiliateAdminId),
    queryFn: async () => {
      if (!affiliateAdminId) return [];

      console.log('[useAffiliateSellersQuery] Fetching sellers for admin:', affiliateAdminId);
      
      const { data: sellers, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('affiliate_admin_id', affiliateAdminId);
      
      if (error) throw error;
      
      return sellers || [];
    },
    enabled: !!affiliateAdminId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 8 * 60 * 1000, // 8 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar perfis de estudantes com fees usando RPC
 * Cache: 2 minutos
 */
export function useAffiliateStudentProfilesQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.studentProfiles(userId),
    queryFn: async () => {
      if (!userId) return [];

      console.log('[useAffiliateStudentProfilesQuery] Fetching profiles for userId:', userId);
      
      const { data: profiles, error } = await supabase
        .rpc('get_affiliate_admin_profiles_with_fees', { admin_user_id: userId });
      
      if (error) throw error;
      
      // Adicionar campos que o componente espera
      const transformedProfiles = (profiles || []).map((profile: any) => ({
        ...profile,
        id: profile.profile_id,
        referral_code_used: profile.seller_referral_code, // Código usado pelo estudante
        status: profile.has_paid_selection_process_fee ? 'active' : 'inactive' // Status baseado no pagamento
      }));
      
      return transformedProfiles;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 8 * 60 * 1000, // 8 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar overrides de fees de usuários
 * Cache: 5 minutos (dados mais estáveis)
 */
export function useUserFeeOverridesQuery(userIds: string[]) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.feeOverrides(userIds.sort()),
    queryFn: async () => {
      if (!userIds.length) return {};

      console.log('[useUserFeeOverridesQuery] Fetching overrides for users:', userIds.length);
      
      const overrideEntries = await Promise.allSettled(
        userIds.map(async (uid) => {
          const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: uid });
          return [uid, error ? null : data];
        })
      );

      const overridesMap: Record<string, any> = overrideEntries.reduce((acc: Record<string, any>, res) => {
        if (res.status === 'fulfilled') {
          const arr = res.value;
          const uid = arr[0];
          const data = arr[1];
          if (data) {
            acc[uid] = {
              selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
              scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
              i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
            };
          }
        }
        return acc;
      }, {});

      return overridesMap;
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar valores reais pagos de múltiplos usuários
 * Cache: 1 minuto (dados mais voláteis)
 */
export function useRealPaidAmountsQuery(userIds: string[]) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.realPaidAmounts(userIds.sort()),
    queryFn: async () => {
      if (!userIds.length) return {};

      console.log('[useRealPaidAmountsQuery] Fetching real amounts for users:', userIds.length);
      
      const realPaidAmountsMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {};
      
      await Promise.allSettled(
        userIds.map(async (userId) => {
          try {
            const amounts = await getDisplayAmounts(userId, ['selection_process', 'scholarship', 'i20_control']);
            realPaidAmountsMap[userId] = {
              selection_process: amounts.selection_process,
              scholarship: amounts.scholarship,
              i20_control: amounts.i20_control
            };
          } catch (error) {
            console.error(`Erro ao buscar valores pagos para user_id ${userId}:`, error);
          }
        })
      );

      return realPaidAmountsMap;
    },
    enabled: userIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar payment methods de estudantes
 * Cache: 3 minutos
 */
export function useStudentPaymentMethodsQuery(profileIds: string[]) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.paymentMethods(profileIds.sort()),
    queryFn: async () => {
      if (!profileIds.length) return {};

      console.log('[useStudentPaymentMethodsQuery] Fetching payment methods for profiles:', profileIds.length);
      
      const { data: userProfilesData, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          created_at,
          selection_process_fee_payment_method,
          i20_control_fee_payment_method,
          scholarship_applications (
            id,
            is_scholarship_fee_paid,
            scholarship_fee_payment_method
          )
        `)
        .in('id', profileIds);
      
      if (error) throw error;

      const paymentMethodsMap: Record<string, any> = {};
      const createdAtMap: Record<string, string> = {};
      
      (userProfilesData || []).forEach((p: any) => {
        paymentMethodsMap[p.id] = {
          selection_process: p.selection_process_fee_payment_method,
          i20_control: p.i20_control_fee_payment_method,
          scholarship: Array.isArray(p.scholarship_applications) 
            ? p.scholarship_applications.map((a: any) => ({
                is_paid: a.is_scholarship_fee_paid,
                method: a.scholarship_fee_payment_method
              }))
            : []
        };
        
        if (p.created_at) {
          createdAtMap[p.id] = p.created_at;
        }
      });

      return { paymentMethodsMap, createdAtMap };
    },
    enabled: profileIds.length > 0,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar fee overrides de estudantes específicos com cache
 * Cache: 5 minutos (dados estáveis)
 */
export function useStudentFeeOverridesQuery(userIds: string[]) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.studentOverrides(userIds.sort()),
    queryFn: async () => {
      if (!userIds.length) return {};

      console.log('[useStudentFeeOverridesQuery] Fetching overrides for users:', userIds.length);
      
      const overrideEntries = await Promise.allSettled(
        userIds.map(async (userId) => {
          const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: userId });
          const override = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
          return { userId, data: error ? null : override };
        })
      );

      const overridesMap: Record<string, any> = {};
      
      overrideEntries.forEach((res) => {
        if (res.status === 'fulfilled') {
          const { userId, data } = res.value;
          if (data) {
            overridesMap[userId] = {
              selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
              application_fee: data.application_fee != null ? Number(data.application_fee) : undefined,
              scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
              i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined
            };
          }
        }
      });

      return overridesMap;
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar dependentes dos estudantes
 * Cache: 3 minutos
 */
export function useStudentDependentsQuery(profileIds: string[]) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.studentDependents(profileIds.sort()),
    queryFn: async () => {
      if (!profileIds.length) return {};

      console.log('[useStudentDependentsQuery] Fetching dependents for profiles:', profileIds.length);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, dependents')
        .in('id', profileIds);

      if (error) throw error;

      const dependentsMap: Record<string, number> = {};
      (data || []).forEach((row) => {
        dependentsMap[row.id] = Number(row.dependents) || 0;
      });

      return dependentsMap;
    },
    enabled: profileIds.length > 0,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar usuários que usaram cupom BLACK
 * Cache: 10 minutos (dados menos voláteis)
 */
export function useBlackCouponUsersQuery() {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.blackCouponUsers(),
    queryFn: async () => {
      console.log('[useBlackCouponUsersQuery] Fetching BLACK coupon users');
      
      const { data, error } = await supabase
        .from('promotional_coupon_usage')
        .select('user_id, coupon_code')
        .ilike('coupon_code', 'BLACK');

      if (error) {
        console.error('Error fetching BLACK coupon users:', error);
        return new Set<string>();
      }

      const userIds = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row.user_id) {
          userIds.add(row.user_id);
        }
      });
      
      return userIds;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook composto para calcular estudantes com receita ajustada
 * Combina todos os dados necessários com cache otimizado
 */
export function useAdjustedStudentsCalculation(
  students: any[], 
  filteredStudents: any[]
) {
  // Derivar IDs únicos de uma vez só
  const uniqueUserIds = useMemo(() => 
    Array.from(new Set((students || []).map((s) => s.user_id).filter(Boolean))) as string[], 
    [students]
  );
  
  const profileIds = useMemo(() => 
    Array.from(new Set((students || []).map((s) => s.profile_id).filter(Boolean))) as string[], 
    [students]
  );

  // Hooks de dados necessários
  const { data: overridesMap = {} } = useStudentFeeOverridesQuery(uniqueUserIds);
  const { data: dependentsMap = {} } = useStudentDependentsQuery(profileIds);
  const { data: realPaidAmountsMap = {} } = useRealPaidAmountsQuery(uniqueUserIds);

  // Função para calcular receita de um estudante
  const calculateStudentRevenue = useMemo(() => {
    return (student: any) => {
      const dependents = dependentsMap[student.profile_id] || 0;
      const realPaid = realPaidAmountsMap[student.user_id] || {};

      let total = 0;
      
      // Selection Process Fee
      if (student.has_paid_selection_process_fee) {
        if (realPaid.selection_process !== undefined && realPaid.selection_process > 0) {
          total += realPaid.selection_process;
        } else {
          const systemType = student.system_type || 'legacy';
          const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
          total += systemType === 'simplified' ? baseSelectionFee : baseSelectionFee + (dependents * 150);
        }
      }
      
      // Scholarship Fee
      const hasAnyScholarshipPaid = student.is_scholarship_fee_paid || false;
      if (hasAnyScholarshipPaid) {
        if (realPaid.scholarship !== undefined && realPaid.scholarship > 0) {
          total += realPaid.scholarship;
        } else {
          const systemType = student.system_type || 'legacy';
          const scholarshipFee = systemType === 'simplified' ? 550 : 900;
          total += scholarshipFee;
        }
      }
      
      // I-20 Control Fee
      if (hasAnyScholarshipPaid && student.has_paid_i20_control_fee) {
        if (realPaid.i20_control !== undefined && realPaid.i20_control > 0) {
          total += realPaid.i20_control;
        } else {
          total += 900;
        }
      }

      return {
        ...student,
        total_paid_adjusted: total,
        hasMultipleApplications: student.hasMultipleApplications,
        applicationCount: student.applicationCount,
        allApplications: student.allApplications
      };
    };
  }, [overridesMap, dependentsMap, realPaidAmountsMap]);

  // Calcular estudantes ajustados (todos)
  const allAdjustedStudents = useMemo(() => {
    return (students || []).map(calculateStudentRevenue);
  }, [students, calculateStudentRevenue]);

  // Calcular estudantes ajustados (filtrados)
  const adjustedStudents = useMemo(() => {
    return (filteredStudents || []).map(calculateStudentRevenue);
  }, [filteredStudents, calculateStudentRevenue]);

  return {
    allAdjustedStudents,
    adjustedStudents,
    isLoading: !overridesMap || !dependentsMap || !realPaidAmountsMap,
    overridesMap,
    dependentsMap,
    realPaidAmountsMap
  };
}

/**
 * Hook composto para calcular revenue ajustada do affiliate admin
 * Combina múltiplas queries e calcula valores finais
 */
export function useAffiliateRevenueCalculationQuery(userId?: string) {
  // Queries básicas
  const { data: profiles } = useAffiliateStudentProfilesQuery(userId);
  
  // Derivar dados para próximas queries
  const uniqueUserIds = Array.from(new Set((profiles || []).map((p: any) => p.user_id).filter(Boolean))) as string[];
  
  // Queries dependentes
  const { data: overridesMap = {} } = useUserFeeOverridesQuery(uniqueUserIds);
  const { data: realPaidAmountsMap = {} } = useRealPaidAmountsQuery(uniqueUserIds);

  return useQuery({
    queryKey: queryKeys.affiliateAdmin.revenueCalculation(userId, profiles?.length || 0),
    queryFn: async () => {
      if (!profiles || !overridesMap || !realPaidAmountsMap) {
        return {
          totalRevenue: 0,
          adjustedRevenueByReferral: {},
          paidStudents: [],
          revenueBreakdown: []
        };
      }

      console.log('[useAffiliateRevenueCalculationQuery] Calculating revenue for:', profiles.length, 'profiles');

      // Filtrar apenas estudantes que pagaram Selection Process Fee
      const paidProfiles = profiles.filter((p: any) => p.has_paid_selection_process_fee);

      // Função para calcular revenue de um perfil
      const calculateProfileRevenue = (p: any) => {
        const deps = Number(p?.dependents || 0);
        const ov = overridesMap[p?.user_id] || {};
        const realPaid = realPaidAmountsMap[p?.user_id] || {};

        // Selection Process
        let selPaid = 0;
        if (p?.has_paid_selection_process_fee) {
          if (realPaid.selection_process !== undefined) {
            selPaid = realPaid.selection_process;
          } else {
            const baseSelDefault = p?.system_type === 'simplified' ? 350 : 400;
            const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
            selPaid = ov.selection_process_fee != null 
              ? baseSel 
              : (p?.system_type === 'simplified' ? baseSel : baseSel + (deps * 150));
          }
        }

        // Scholarship Fee
        const hasAnyScholarshipPaid = p?.is_scholarship_fee_paid || false;
        let schPaid = 0;
        if (hasAnyScholarshipPaid) {
          if (realPaid.scholarship !== undefined) {
            schPaid = realPaid.scholarship;
          } else {
            const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
            const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
            schPaid = schBase;
          }
        }

        // I-20 Control Fee
        let i20Paid = 0;
        if (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) {
          if (realPaid.i20_control !== undefined) {
            i20Paid = realPaid.i20_control;
          } else {
            const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
            i20Paid = i20Base;
          }
        }

        return { selPaid, schPaid, i20Paid, total: selPaid + schPaid + i20Paid };
      };

      // Calcular revenue por referral
      const revenueByReferral: Record<string, number> = {};
      const revenueBreakdown: Array<{profile_id: string, selection: number, scholarship: number, i20: number, total: number}> = [];
      
      let totalRevenue = 0;
      
      paidProfiles.forEach((p: any) => {
        const revenue = calculateProfileRevenue(p);
        const ref = p?.seller_referral_code || '__unknown__';
        
        revenueByReferral[ref] = (revenueByReferral[ref] || 0) + revenue.total;
        totalRevenue += revenue.total;
        
        if (revenue.total > 0) {
          revenueBreakdown.push({
            profile_id: p.profile_id,
            selection: revenue.selPaid,
            scholarship: revenue.schPaid,
            i20: revenue.i20Paid,
            total: revenue.total
          });
        }
      });

      return {
        totalRevenue,
        adjustedRevenueByReferral: revenueByReferral,
        paidStudents: paidProfiles,
        revenueBreakdown,
        totalStudents: profiles.length,
        paidStudentsCount: paidProfiles.length
      };
    },
    enabled: !!(profiles && overridesMap && realPaidAmountsMap),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 8 * 60 * 1000, // 8 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para cachear detalhes específicos de um estudante
 * Cache: 5 minutos (dados mais estáveis)
 */
export function useStudentDetailsQuery(studentId?: string, profileId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.studentDetails(studentId, profileId),
    queryFn: async () => {
      if (!studentId) return null;

      console.log('[useStudentDetailsQuery] Fetching details for student:', studentId);

      // Buscar detalhes do estudante usando a RPC existente
      const { data: sqlData, error: sqlError } = await supabase.rpc(
        'get_student_detailed_info',
        { target_student_id: studentId }
      );

      if (sqlError || !sqlData || sqlData.length === 0) {
        // Fallback para busca manual se RPC falhar
        const { data: studentData, error: studentError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', profileId || studentId)
          .single();

        if (studentError) throw studentError;
        return studentData;
      }

      return sqlData[0];
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para cachear aplicações de bolsa de um estudante
 * Cache: 3 minutos
 */
export function useStudentApplicationsQuery(profileId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.studentApplications(profileId),
    queryFn: async () => {
      if (!profileId) return [];

      console.log('[useStudentApplicationsQuery] Fetching applications for profile:', profileId);

      const { data: applications, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          scholarships(
            id,
            title,
            amount_usd,
            application_deadline,
            universities(id, name, logo_url)
          )
        `)
        .eq('student_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return applications || [];
    },
    enabled: !!profileId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para cachear documentos de um estudante
 * Cache: 2 minutos (podem ser atualizados com mais frequência)
 */
export function useStudentDocumentsQuery(profileId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.studentDocuments(profileId),
    queryFn: async () => {
      if (!profileId) return [];

      console.log('[useStudentDocumentsQuery] Fetching documents for profile:', profileId);

      // Buscar documentos das aplicações
      const { data: applications, error: appError } = await supabase
        .from('scholarship_applications')
        .select('id, documents')
        .eq('student_id', profileId);

      if (appError) throw appError;

      // Extrair documentos de todas as aplicações
      const allDocuments: any[] = [];
      (applications || []).forEach(app => {
        if (Array.isArray(app.documents)) {
          app.documents.forEach((doc: any) => {
            allDocuments.push({
              ...doc,
              application_id: app.id
            });
          });
        }
      });

      return allDocuments;
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 8 * 60 * 1000, // 8 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para cachear histórico de pagamentos de um estudante
 * Cache: 5 minutos (dados históricos estáveis)
 */
export function useStudentFeeHistoryQuery(studentUserId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.studentFeeHistory(studentUserId),
    queryFn: async () => {
      if (!studentUserId) return [];

      console.log('[useStudentFeeHistoryQuery] Fetching fee history for user:', studentUserId);

      // Buscar histórico de pagamentos individuais
      const { data: feeHistory, error } = await supabase
        .from('individual_fee_payments')
        .select('*')
        .eq('user_id', studentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return feeHistory || [];
    },
    enabled: !!studentUserId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook composto que substitui useStudentDetails com cache
 * Combina todos os dados necessários de um estudante
 */
export function useCachedStudentDetails(studentId?: string, profileId?: string) {
  // Query para detalhes básicos do estudante
  const studentDetailsQuery = useStudentDetailsQuery(studentId, profileId);
  
  // Query para aplicações do estudante
  const applicationsQuery = useStudentApplicationsQuery(profileId);
  
  // Query para documentos do estudante
  const documentsQuery = useStudentDocumentsQuery(profileId);
  
  // Query para histórico de pagamentos
  const feeHistoryQuery = useStudentFeeHistoryQuery(studentId);

  // Estados locais para compatibilidade com o hook original
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [i20ControlFeeDeadline, setI20ControlFeeDeadline] = useState<Date | null>(null);

  // Função para carregar detalhes (compatibilidade)
  const loadStudentDetails = useCallback(async (newStudentId: string, newProfileId?: string) => {
    setSelectedStudent(newStudentId);
    // As queries serão automaticamente ativadas quando studentId/profileId mudarem
  }, []);

  // Função para voltar à lista
  const backToList = useCallback(() => {
    setSelectedStudent(null);
    setI20ControlFeeDeadline(null);
  }, []);

  // Calcular deadline do I-20 Control Fee se necessário
  useEffect(() => {
    if (studentDetailsQuery.data && applicationsQuery.data) {
      // Lógica para calcular deadline baseada na aplicação
      const hasScholarshipPaid = applicationsQuery.data.some(app => app.is_scholarship_fee_paid);
      if (hasScholarshipPaid) {
        // Calcular deadline (10 dias após scholarship fee pago)
        // Esta lógica pode ser ajustada conforme necessário
        const scholarshipApp = applicationsQuery.data.find(app => app.is_scholarship_fee_paid);
        if (scholarshipApp && scholarshipApp.scholarship_fee_paid_at) {
          const deadline = new Date(scholarshipApp.scholarship_fee_paid_at);
          deadline.setDate(deadline.getDate() + 10);
          setI20ControlFeeDeadline(deadline);
        }
      }
    }
  }, [studentDetailsQuery.data, applicationsQuery.data]);

  return {
    // Estados compatíveis com o hook original
    selectedStudent: studentId, // Usar o parâmetro passado
    studentDetails: studentDetailsQuery.data,
    scholarshipApplication: applicationsQuery.data?.[0] || null,
    studentDocuments: documentsQuery.data || [],
    documentRequests: [], // Pode ser implementado se necessário
    feeHistory: feeHistoryQuery.data || [],
    i20ControlFeeDeadline,
    
    // Loading states
    loadingStudentDetails: studentDetailsQuery.isLoading || applicationsQuery.isLoading,
    isLoading: studentDetailsQuery.isLoading,
    
    // Error states
    error: studentDetailsQuery.error || applicationsQuery.error || documentsQuery.error || feeHistoryQuery.error,
    
    // Funções
    loadStudentDetails,
    backToList,
    
    // Query objects para controle avançado
    queries: {
      studentDetails: studentDetailsQuery,
      applications: applicationsQuery,
      documents: documentsQuery,
      feeHistory: feeHistoryQuery,
    },
    
    // Dados adicionais
    allApplications: applicationsQuery.data || [],
  };
}

/**
 * Hook para buscar estatísticas financeiras do affiliate admin com cache
 * Cache: 3 minutos
 */
export function useFinancialStatsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.financialOverview.stats(userId),
    queryFn: async () => {
      if (!userId) return null;

      console.log('[useFinancialStatsQuery] Fetching financial stats for userId:', userId);

      // Importar serviço apenas quando necessário (atenção ao case no nome do arquivo)
      const { AffiliatePaymentRequestService } = await import('../services/AffiliatePaymentRequestService');
      
      // 1. Descobrir affiliate_admin_id
      const { data: aaList, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      if (aaErr || !aaList || aaList.length === 0) {
        throw new Error('No affiliate admin found for user');
      }
      
      const affiliateAdminId = aaList[0].id;

      // 2. Buscar sellers vinculados
      const { data: sellers, error: sellersErr } = await supabase
        .from('sellers')
        .select('referral_code')
        .eq('affiliate_admin_id', affiliateAdminId);
      
      if (sellersErr || !sellers || sellers.length === 0) {
        console.error('No sellers found for affiliate admin:', affiliateAdminId);
        return null;
      }

      // 3. Buscar perfis usando RPC centralizada
      const { data: profiles, error: profilesErr } = await supabase
        .rpc('get_affiliate_admin_profiles_with_fees', { admin_user_id: userId });
      
      if (profilesErr || !profiles) {
        console.error('Error fetching student profiles:', profilesErr);
        return null;
      }

      // 4. Buscar payment methods e created_at
      const profileIds = profiles.map((p: any) => p.profile_id).filter(Boolean);
      const { data: userProfilesData, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          created_at,
          selection_process_fee_payment_method,
          i20_control_fee_payment_method,
          scholarship_applications (
            id,
            is_scholarship_fee_paid,
            scholarship_fee_payment_method
          )
        `)
        .in('id', profileIds);
      
      if (userProfilesError) {
        console.error('Error fetching payment methods:', userProfilesError);
      }

      // Criar mapas
      const paymentMethodsMap: Record<string, any> = {};
      const createdAtMap: Record<string, string> = {};
      (userProfilesData || []).forEach((p: any) => {
        paymentMethodsMap[p.id] = {
          selection_process: p.selection_process_fee_payment_method,
          i20_control: p.i20_control_fee_payment_method,
          scholarship: Array.isArray(p.scholarship_applications) 
            ? p.scholarship_applications.map((a: any) => ({
                is_paid: a.is_scholarship_fee_paid,
                method: a.scholarship_fee_payment_method
              }))
            : []
        };
        if (p.created_at) {
          createdAtMap[p.id] = p.created_at;
        }
      });

      // 5. Preparar overrides
      const uniqueUserIds = Array.from(new Set((profiles || []).map((p) => p.user_id).filter(Boolean)));
      const overrideEntries = await Promise.allSettled(uniqueUserIds.map(async (uid) => {
        const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: uid });
        return [uid, error ? null : data];
      }));
      const overridesMap: Record<string, any> = overrideEntries.reduce((acc: Record<string, any>, res) => {
        if (res.status === 'fulfilled') {
          const arr = res.value;
          const uid = arr[0];
          const data = arr[1];
          if (data) acc[uid] = {
            selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
            scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
            i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
          };
        }
        return acc;
      }, {});

      // 6. Buscar valores reais pagos
      const realPaidAmountsMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {};
      await Promise.all(profiles.map(async (p: any) => {
        if (!p.user_id) return;
        try {
          const amounts = await getDisplayAmounts(p.user_id, ['selection_process', 'scholarship', 'i20_control']);
          realPaidAmountsMap[p.user_id] = {
            selection_process: amounts.selection_process,
            scholarship: amounts.scholarship,
            i20_control: amounts.i20_control
          };
        } catch (error) {
          console.error(`Error fetching paid amounts for user_id ${p.user_id}:`, error);
        }
      }));

      // 7. Calcular total revenue
      const totalRevenue = (profiles || []).reduce((sum, p) => {
        const deps = Number(p?.dependents || 0);
        const ov = overridesMap[p?.user_id] || {};
        const realPaid = realPaidAmountsMap[p?.user_id] || {};

        let selPaid = 0;
        if (p?.has_paid_selection_process_fee) {
          if (realPaid.selection_process !== undefined) {
            selPaid = realPaid.selection_process;
          } else {
            const baseSelDefault = p?.system_type === 'simplified' ? 350 : 400;
            const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
            selPaid = ov.selection_process_fee != null 
              ? baseSel 
              : (p?.system_type === 'simplified' ? baseSel : baseSel + (deps * 150));
          }
        }

        const hasAnyScholarshipPaid = p?.is_scholarship_fee_paid || false;
        let schPaid = 0;
        if (hasAnyScholarshipPaid) {
          if (realPaid.scholarship !== undefined) {
            schPaid = realPaid.scholarship;
          } else {
            const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
            const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
            schPaid = schBase;
          }
        }

        let i20Paid = 0;
        if (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) {
          if (realPaid.i20_control !== undefined) {
            i20Paid = realPaid.i20_control;
          } else {
            const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
            i20Paid = i20Base;
          }
        }

        return sum + selPaid + schPaid + i20Paid;
      }, 0);

      // 8. Buscar valores de pagamentos manuais
      const manualPaidAmountsMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {};
      await Promise.all(profiles.map(async (p: any) => {
        if (!p.user_id) return;
        try {
          const { data: manualPayments, error } = await supabase
            .from('individual_fee_payments')
            .select('fee_type, amount')
            .eq('user_id', p.user_id)
            .eq('payment_method', 'manual')
            .in('fee_type', ['selection_process', 'scholarship', 'i20_control']);
          
          if (error) {
            console.error(`Error fetching manual payments for user_id ${p.user_id}:`, error);
            return;
          }
          
          const amounts: { selection_process?: number; scholarship?: number; i20_control?: number } = {};
          manualPayments?.forEach((payment: any) => {
            const amount = Number(payment.amount);
            if (payment.fee_type === 'selection_process') {
              amounts.selection_process = amount;
            } else if (payment.fee_type === 'scholarship') {
              amounts.scholarship = amount;
            } else if (payment.fee_type === 'i20_control') {
              amounts.i20_control = amount;
            }
          });
          
          if (Object.keys(amounts).length > 0) {
            manualPaidAmountsMap[p.user_id] = amounts;
          }
        } catch (error) {
          console.error(`Error fetching manual payments for user_id ${p.user_id}:`, error);
        }
      }));

      // 9. Calcular receita manual
      const manualRevenue = (profiles || []).reduce((sum, p) => {
        const deps = Number(p?.dependents || 0);
        const ov = overridesMap[p?.user_id] || {};
        const methods = paymentMethodsMap[p?.profile_id] || {};
        const manualPaid = manualPaidAmountsMap[p?.user_id] || {};
        
        let selManual = 0;
        if (p?.has_paid_selection_process_fee && methods.selection_process === 'manual') {
          if (manualPaid.selection_process !== undefined) {
            selManual = manualPaid.selection_process;
          } else {
            const baseSelectionFee = p?.system_type === 'simplified' ? 350 : 400;
            const sel = ov.selection_process_fee != null
              ? Number(ov.selection_process_fee)
              : (p?.system_type === 'simplified' ? baseSelectionFee : baseSelectionFee + (deps * 150));
            selManual = sel || 0;
          }
        }

        let schManual = 0;
        const hasScholarshipPaidManual = Array.isArray(methods.scholarship)
          ? methods.scholarship.some((a: any) => !!a?.is_paid && a?.method === 'manual')
          : false;
        if (hasScholarshipPaidManual) {
          if (manualPaid.scholarship !== undefined) {
            schManual = manualPaid.scholarship;
          } else {
            const baseScholarshipFee = p?.system_type === 'simplified' ? 550 : 900;
            const schol = ov.scholarship_fee != null
              ? Number(ov.scholarship_fee)
              : baseScholarshipFee;
            schManual = schol || 0;
          }
        }

        let i20Manual = 0;
        if (p?.is_scholarship_fee_paid && p?.has_paid_i20_control_fee && methods.i20_control === 'manual') {
          if (manualPaid.i20_control !== undefined) {
            i20Manual = manualPaid.i20_control;
          } else {
            const baseI20Fee = 900;
            const i20 = ov.i20_control_fee != null
              ? Number(ov.i20_control_fee)
              : baseI20Fee;
            i20Manual = i20 || 0;
          }
        }

        return sum + selManual + schManual + i20Manual;
      }, 0);

      // 10. Calcular estatísticas derivadas
      const totalReferrals = profiles.length || 0;
      let derivedCompleted = 0;
      let derivedPending = 0;
      profiles.forEach((p: any) => {
        const hasSelectionPaid = !!p?.has_paid_selection_process_fee;
        const hasScholarshipPaid = p?.is_scholarship_fee_paid || false;
        const hasI20Paid = !!p?.has_paid_i20_control_fee;
        const hasAnyPayment = hasSelectionPaid || hasScholarshipPaid || hasI20Paid;
        if (hasAnyPayment) derivedCompleted += 1; else derivedPending += 1;
      });

      // 11. Calcular receita últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7DaysRevenue = profiles
        .filter((p: any) => {
          const createdAt = createdAtMap[p?.profile_id];
          return createdAt && new Date(createdAt) >= sevenDaysAgo;
        })
        .reduce((sum: number, p: any) => {
          const deps = Number(p?.dependents || 0);
          const ov = overridesMap[p?.user_id] || {};
          const realPaid = realPaidAmountsMap[p?.user_id] || {};

          let selPaid = 0;
          if (p?.has_paid_selection_process_fee) {
            if (realPaid.selection_process !== undefined) {
              selPaid = realPaid.selection_process;
            } else {
              const baseSelDefault = p?.system_type === 'simplified' ? 350 : 400;
              const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
              selPaid = ov.selection_process_fee != null 
                ? baseSel 
                : (p?.system_type === 'simplified' ? baseSel : baseSel + (deps * 150));
            }
          }

          const hasAnyScholarshipPaid = p?.is_scholarship_fee_paid || false;
          let schPaid = 0;
          if (hasAnyScholarshipPaid) {
            if (realPaid.scholarship !== undefined) {
              schPaid = realPaid.scholarship;
            } else {
              const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
              const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
              schPaid = schBase;
            }
          }

          let i20Paid = 0;
          if (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) {
            if (realPaid.i20_control !== undefined) {
              i20Paid = realPaid.i20_control;
            } else {
              const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
              i20Paid = i20Base;
            }
          }

          return sum + selPaid + schPaid + i20Paid;
        }, 0);

      const averageCommissionPerReferral = totalReferrals > 0 ? totalRevenue / totalReferrals : 0;

      // 12. Carregar payment requests para calcular saldo disponível
      let availableBalance = Math.max(0, totalRevenue - manualRevenue);
      try {
        const affiliateRequests = await AffiliatePaymentRequestService.listAffiliatePaymentRequests(userId);
        const totalPaidOut = affiliateRequests
          .filter((r: any) => r.status === 'paid')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
        const totalApproved = affiliateRequests
          .filter((r: any) => r.status === 'approved')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
        const totalPending = affiliateRequests
          .filter((r: any) => r.status === 'pending')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);

        availableBalance = Math.max(0, (totalRevenue - manualRevenue) - totalPaidOut - totalApproved - totalPending);
      } catch (err) {
        console.error('Error loading affiliate payment requests for balance:', err);
      }

      // Retornar dados enriquecidos para analytics
      return {
        stats: {
          totalCredits: totalRevenue,
          totalEarned: availableBalance,
          totalReferrals,
          activeReferrals: derivedPending,
          completedReferrals: derivedCompleted,
          last7DaysRevenue,
          averageCommissionPerReferral,
          manualRevenue
        },
        enrichedProfiles: profiles.map((p: any) => ({
          ...p,
          created_at: createdAtMap[p.profile_id] || null
        })),
        overridesMap,
        realPaidAmountsMap,
        paymentMethodsMap
      };
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar payment requests do affiliate com cache
 * Cache: 2 minutos (dados que mudam com mais frequência)
 */
export function useAffiliatePaymentRequestsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliateAdmin.financialOverview.paymentRequests(userId),
    queryFn: async () => {
      if (!userId) return [];

      console.log('[useAffiliatePaymentRequestsQuery] Fetching payment requests for userId:', userId);

      // Importar serviço apenas quando necessário (atenção ao case no nome do arquivo)
      const { AffiliatePaymentRequestService } = await import('../services/AffiliatePaymentRequestService');
      const requests = await AffiliatePaymentRequestService.listAffiliatePaymentRequests(userId);
      
      return requests;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}