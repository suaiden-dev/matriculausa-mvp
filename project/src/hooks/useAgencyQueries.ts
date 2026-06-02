import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { getDisplayAmounts } from '../utils/paymentConverter';

/**
 * Hook para buscar dados do affiliate admin com cache
 * Cache: 3 minutos
 */
export function useAgencyDataQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.agency.adminData(userId),
    queryFn: async () => {
      if (!userId) return null;

      
      // 1. Descobrir affiliate_admin_id e simplified_pricing_for_students
      const { data: aaList, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id, simplified_pricing_for_students')
        .eq('user_id', userId)
        .limit(1);
      
      if (aaErr || !aaList || aaList.length === 0) {
        throw new Error('No affiliate admin found for user');
      }
      
      return {
        affiliateAdminId: aaList[0].id,
        simplifiedPricing: aaList[0].simplified_pricing_for_students === true,
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
export function useAgencySellersQuery(affiliateAdminId?: string) {
  return useQuery({
    queryKey: queryKeys.agency.sellers(affiliateAdminId),
    queryFn: async () => {
      if (!affiliateAdminId) return [];

      
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
export function useAgencyStudentProfilesQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.agency.studentProfiles(userId),
    queryFn: async () => {
      if (!userId) return [];

      
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
    queryKey: queryKeys.agency.feeOverrides(userIds.sort()),
    queryFn: async () => {
      if (!userIds.length) return {};

      
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
    queryKey: queryKeys.agency.realPaidAmounts(userIds.sort()),
    queryFn: async () => {
      if (!userIds.length) return {};

      
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
    queryKey: queryKeys.agency.paymentMethods(profileIds.sort()),
    queryFn: async () => {
      if (!profileIds.length) return {};

      
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
    queryKey: queryKeys.agency.studentOverrides(userIds.sort()),
    queryFn: async () => {
      if (!userIds.length) return {};

      
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
    queryKey: queryKeys.agency.studentDependents(profileIds.sort()),
    queryFn: async () => {
      if (!profileIds.length) return {};

      
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
    queryKey: queryKeys.agency.blackCouponUsers(),
    queryFn: async () => {
      
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
  filteredStudents: any[],
  agencySimplifiedPricing?: boolean
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

  // Função para calcular receita de um estudante (affiliate admin: sempre valor ORIGINAL da taxa, não valor real pago com taxas do gateway)
  const calculateStudentRevenue = useMemo(() => {
    return (student: any) => {
      const dependents = dependentsMap[student.profile_id] || 0;
      const ov = overridesMap[student.user_id] || {};
      const isSimplified = agencySimplifiedPricing !== undefined 
        ? agencySimplifiedPricing 
        : (student.system_type === 'simplified');

      let total = 0;
      const baseSelection = isSimplified ? 350 : 400;
      const selectionOriginal = ov.selection_process_fee != null
        ? Number(ov.selection_process_fee)
        : (isSimplified ? baseSelection : baseSelection + dependents * 150);
      const scholarshipOriginal = ov.scholarship_fee != null
        ? Number(ov.scholarship_fee)
        : (isSimplified ? 550 : 900);
      const i20Original = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;

      if (student.has_paid_selection_process_fee) total += selectionOriginal;
      if (student.is_scholarship_fee_paid) total += scholarshipOriginal;
      if (student.is_scholarship_fee_paid && student.has_paid_i20_control_fee) total += i20Original;

      return {
        ...student,
        total_paid_adjusted: total,
        hasMultipleApplications: student.hasMultipleApplications,
        applicationCount: student.applicationCount,
        allApplications: student.allApplications
      };
    };
  }, [overridesMap, dependentsMap, agencySimplifiedPricing]);

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
    isLoading: !overridesMap || !dependentsMap,
    overridesMap,
    dependentsMap,
    realPaidAmountsMap
  };
}

/**
 * Hook para buscar todas as comissões reais da agência
 * Cache: 2 minutos
 */
export function useAgencyCommissionsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.agency.commissions(userId),
    queryFn: async () => {
      if (!userId) return [];


      // 1. Descobrir affiliate_admin_id
      const { data: aaList, error: aaErr } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (aaErr || !aaList || aaList.length === 0) return [];
      const affiliateAdminId = aaList[0].id;

      // 2. Buscar comissões
      const { data, error } = await supabase
        .from('agency_commissions')
        .select('*')
        .eq('agency_id', affiliateAdminId)
        .order('created_at', { ascending: false });

      if (error) return []; // tabela pode não existir ainda
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook composto para calcular revenue ajustada do affiliate admin
 * Combina múltiplas queries e calcula valores finais
 */
export function useAgencyRevenueCalculationQuery(userId?: string) {
  // Queries básicas
  const { data: profiles } = useAgencyStudentProfilesQuery(userId);
  const { data: commissions } = useAgencyCommissionsQuery(userId);
  
  return useQuery({
    queryKey: queryKeys.agency.revenueCalculation(userId, profiles?.length || 0, commissions?.length || 0),
    queryFn: async () => {
      if (!profiles || !commissions) {
        return {
          totalRevenue: 0,
          adjustedRevenueByReferral: {},
          paidStudents: [],
          revenueBreakdown: []
        };
      }


      // Calcular revenue por referral usando comissões REAIS
      const revenueByReferral: Record<string, number> = {};
      const revenueBreakdown: Array<{profile_id: string, selection: number, scholarship: number, i20: number, total: number}> = [];
      
      let totalRevenue = 0;
      
      // Criar mapa de estudantes para acesso rápido
      const studentsMap: Record<string, any> = {};
      profiles.forEach((p: any) => {
        studentsMap[p.profile_id] = p;
      });

      commissions.forEach((c: any) => {
        const ref = c.affiliate_code || studentsMap[c.student_id]?.seller_referral_code || '__unknown__';
        const amount = Number(c.amount) || 0;

        revenueByReferral[ref] = (revenueByReferral[ref] || 0) + amount;
        totalRevenue += amount;
        
        // Mapear para o formato de breakdown esperado pela UI antiga
        const existingBreakdown = revenueBreakdown.find(b => b.profile_id === c.student_id);
        if (existingBreakdown) {
          if (c.fee_type === 'selection_process') existingBreakdown.selection += amount;
          else if (c.fee_type === 'scholarship') existingBreakdown.scholarship += amount;
          else if (c.fee_type === 'i20_control') existingBreakdown.i20 += amount;
          existingBreakdown.total += amount;
        } else {
          revenueBreakdown.push({
            profile_id: c.student_id,
            selection: c.fee_type === 'selection_process' ? amount : 0,
            scholarship: c.fee_type === 'scholarship' ? amount : 0,
            i20: c.fee_type === 'i20_control' ? amount : 0,
            total: amount
          });
        }
      });

      const paidProfiles = profiles.filter((p: any) => p.has_paid_selection_process_fee);

      return {
        totalRevenue,
        adjustedRevenueByReferral: revenueByReferral,
        paidStudents: paidProfiles,
        revenueBreakdown,
        totalStudents: profiles.length,
        paidStudentsCount: paidProfiles.length
      };
    },
    enabled: !!(profiles && commissions),
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
    queryKey: queryKeys.agency.studentDetails(studentId, profileId),
    queryFn: async () => {
      if (!studentId) return null;


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
    queryKey: queryKeys.agency.studentApplications(profileId),
    queryFn: async () => {
      if (!profileId) return [];


      const { data: applications, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          scholarships(
            id,
            title,
            amount_usd,
            application_deadline,
            universities(id, name, logo_url, university_fees_page_url)
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
    queryKey: queryKeys.agency.studentDocuments(profileId),
    queryFn: async () => {
      if (!profileId) return [];


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
    queryKey: queryKeys.agency.studentFeeHistory(studentUserId),
    queryFn: async () => {
      if (!studentUserId) return [];


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
  // Queries básicas
  const { data: profiles } = useAgencyStudentProfilesQuery(userId);
  const { data: commissions } = useAgencyCommissionsQuery(userId);
  
  return useQuery({
    queryKey: queryKeys.agency.financialOverview.stats(userId, profiles?.length || 0, commissions?.length || 0),
    queryFn: async () => {
      if (!userId || !profiles || !commissions) return null;


      // Importar serviço apenas quando necessário
      const { AffiliatePaymentRequestService } = await import('../services/AffiliatePaymentRequestService');
      
      // 1. Total de receita de comissão
      const totalRevenue = commissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      // 2. Estatísticas de indicações
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

      // 3. Receita últimos 7 dias (baseada em comissões REAIS)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7DaysRevenue = commissions
        .filter((c: any) => c.created_at && new Date(c.created_at) >= sevenDaysAgo)
        .reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);

      const averageCommissionPerReferral = totalReferrals > 0 ? totalRevenue / totalReferrals : 0;

      // 4. Carregar payment requests para calcular saldo disponível
      let totalPaidOut = 0;
      let totalApproved = 0;
      let totalPending = 0;

      try {
        const affiliateRequests = await AffiliatePaymentRequestService.listAffiliatePaymentRequests(userId);
        totalPaidOut = affiliateRequests
          .filter((r: any) => r.status === 'paid')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
        totalApproved = affiliateRequests
          .filter((r: any) => r.status === 'approved')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
        totalPending = affiliateRequests
          .filter((r: any) => r.status === 'pending')
          .reduce((sum: number, r: any) => sum + (Number(r.amount_usd) || 0), 0);
      } catch (err) {
        console.error('Error loading affiliate payment requests for balance:', err);
      }

      const availableBalance = Math.max(0, totalRevenue - totalPaidOut - totalApproved - totalPending);

      // 5. Mapear perfis para compatibilidade (created_at vem de user_profiles se precisarmos em algum lugar)
      // Aqui simplificamos pois o grosso da lógica de receita bruta foi removido

      return {
        stats: {
          totalCredits: totalRevenue,
          totalEarned: availableBalance,
          totalReferrals,
          activeReferrals: derivedPending,
          completedReferrals: derivedCompleted,
          last7DaysRevenue,
          averageCommissionPerReferral,
          manualRevenue: 0 // No novo sistema não rastreamos "manual revenue" bruto da mesma forma
        },
        enrichedProfiles: profiles,
        commissions,
        payouts: {
          paid: totalPaidOut,
          approved: totalApproved,
          pending: totalPending
        }
      };
    },
    enabled: !!(userId && profiles && commissions),
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
export function useAgencyPaymentRequestsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.agency.financialOverview.paymentRequests(userId),
    queryFn: async () => {
      if (!userId) return [];


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