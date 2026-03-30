import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { queryKeys } from '../../../../lib/queryKeys';
import { loadPaymentsBaseDataOptimized } from '../data/loaders/paymentsLoaderOptimized';
import { loadZellePaymentsLoader } from '../data/loaders/zelleLoader';
import { loadUniversitiesLoader, loadAffiliatesLoader } from '../data/loaders/referencesLoader';
import { UniversityPaymentRequestService } from '../../../../services/UniversityPaymentRequestService';
import { AffiliatePaymentRequestService } from '../../../../services/AffiliatePaymentRequestService';
import { getPaymentDatesForUsersLoaderOptimized } from '../data/loaders/paymentDatesLoaderOptimized';
import { transformPaymentsToRecordsAndStats } from '../utils/transformPayments';
import { useFeeConfig } from '../../../../hooks/useFeeConfig';
import { getGrossPaidAmountsBatch } from '../../../../utils/paymentConverter';
// import type { PaymentRecord, PaymentStats } from '../data/types';

/**
 * Hook para buscar dados base de payments (aplicações, zelle, stripe)
 * Usado quando university = 'all' (processamento client-side)
 */
export function usePaymentsQuery(enabled: boolean = true) {
  const { getFeeAmount } = useFeeConfig();

  return useQuery({
    queryKey: queryKeys.payments.list(),
    enabled,
    queryFn: async () => {
      const baseData = await loadPaymentsBaseDataOptimized(supabase);
      
      // Buscar payment dates em batch
      const allUserIds = [
        ...(baseData.applications?.map((app: any) => app.user_profiles?.user_id).filter(Boolean) || []),
        ...(baseData.zellePayments?.map((p: any) => p.user_profiles?.user_id).filter(Boolean) || []),
        ...(baseData.stripeUsers?.map((user: any) => user.user_id).filter(Boolean) || []),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];
      
      // ✅ TASK-10: 1 única query para todos os usuários (elimina N+1)
      const realPaymentAmounts = await getGrossPaidAmountsBatch(
        uniqueUserIds,
        ['selection_process', 'scholarship', 'i20_control', 'application', 'placement', 'ds160_package', 'i539_cos_package', 'reinstatement_package']
      );

      const individualPaymentDates = await getPaymentDatesForUsersLoaderOptimized(supabase, uniqueUserIds);

      // Transformar em registros e stats
      const result = transformPaymentsToRecordsAndStats({
        applications: baseData.applications,
        zellePayments: baseData.zellePayments,
        stripeUsers: baseData.stripeUsers,
        overridesMap: baseData.overridesMap,
        userSystemTypesMap: baseData.userSystemTypesMap,
        individualPaymentDates,
        getFeeAmount,
        realPaymentAmounts,
      });

      return result;
    },
    staleTime: 30 * 1000, // 30 segundos - dados dinâmicos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false, // Reduzir requisições desnecessárias
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar todos os pagamentos Zelle (sem paginação)
 */
export function useZellePaymentsQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.payments.zelle.list(),
    enabled,
    queryFn: async () => {
      return await loadZellePaymentsLoader(supabase);
    },
    staleTime: 30 * 1000, // 30 segundos - dados dinâmicos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false, // Reduzir requisições desnecessárias
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar solicitações de pagamento de universidades
 */
export function useUniversityRequestsQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.payments.universityRequests.list(),
    enabled,
    queryFn: async () => {
      return await UniversityPaymentRequestService.listAllPaymentRequests();
    },
    staleTime: 30 * 1000, // 30 segundos - dados dinâmicos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false, // Reduzir requisições desnecessárias
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar solicitações de pagamento de afiliados
 */
export function useAffiliateRequestsQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.payments.affiliateRequests.list(),
    enabled,
    queryFn: async () => {
      return await AffiliatePaymentRequestService.listAllPaymentRequests();
    },
    staleTime: 30 * 1000, // 30 segundos - dados dinâmicos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false, // Reduzir requisições desnecessárias
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar universidades (dados estáticos - cache longo)
 */
export function useUniversitiesQuery() {
  return useQuery({
    queryKey: queryKeys.payments.references.universities,
    queryFn: async () => {
      return await loadUniversitiesLoader(supabase);
    },
    staleTime: 10 * 60 * 1000, // 10 minutos - dados estáticos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar afiliados (dados semi-estáticos - cache médio)
 */
export function useAffiliatesQuery() {
  return useQuery({
    queryKey: queryKeys.payments.references.affiliates,
    queryFn: async () => {
      return await loadAffiliatesLoader(supabase);
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados semi-estáticos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

