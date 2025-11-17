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
import type { PaymentRecord, PaymentStats } from '../data/types';

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
      
      // Buscar valores reais de pagamento de affiliate referrals
      const batchSize = 50;
      const batches: string[][] = [];
      for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
        batches.push(uniqueUserIds.slice(i, i + batchSize));
      }
      
      const batchPromises = batches.map(batch =>
        supabase
          .from('affiliate_referrals')
          .select('referred_id, payment_amount')
          .in('referred_id', batch)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      const allAffiliateReferrals = batchResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value.data || [])
        .flat()
        .filter(Boolean);

      const realPaymentAmounts = new Map<string, number>();
      allAffiliateReferrals?.forEach((ar: any) => {
        realPaymentAmounts.set(ar.referred_id, ar.payment_amount);
      });

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
 * Hook para buscar pagamentos Zelle com paginação
 */
export function useZellePaymentsQuery(page: number, pageSize: number, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.payments.zelle.list(page, pageSize),
    enabled,
    queryFn: async () => {
      return await loadZellePaymentsLoader(supabase, page, pageSize);
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

