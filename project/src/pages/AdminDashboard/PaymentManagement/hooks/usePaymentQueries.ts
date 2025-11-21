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
import { getGrossPaidAmounts } from '../../../../utils/paymentConverter';
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
      
      // ✅ CORREÇÃO: Buscar valores brutos pagos (COM taxas do Stripe) de individual_fee_payments
      // Para Payment Management do superADMIN, mostrar o valor que o aluno realmente pagou (bruto)
      // Processar em batches para evitar sobrecarga
      const batchSize = 10; // Reduzir batch size para evitar sobrecarga de chamadas ao Stripe
      const batches: string[][] = [];
      for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
        batches.push(uniqueUserIds.slice(i, i + batchSize));
      }
      
      const realPaymentAmounts = new Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number }>();
      
      // Processar batches em paralelo
      const batchPromises = batches.map(async (batch) => {
        const batchResults = await Promise.allSettled(
          batch.map(async (userId) => {
            try {
              const amounts = await getGrossPaidAmounts(userId, ['selection_process', 'scholarship', 'i20_control', 'application']);
              return { userId, amounts };
            } catch (error) {
              console.error(`Erro ao buscar valores brutos pagos para user_id ${userId}:`, error);
              return { userId, amounts: {} };
            }
          })
        );
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            const { userId, amounts } = result.value;
            realPaymentAmounts.set(userId, {
              selection_process: amounts.selection_process,
              scholarship: amounts.scholarship,
              i20_control: amounts.i20_control,
              application: amounts.application,
            });
          }
        });
      });
      
      await Promise.allSettled(batchPromises);

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

