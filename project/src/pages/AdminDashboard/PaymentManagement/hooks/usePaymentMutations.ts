import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateZelleQueries, invalidateUniversityRequestsQueries, invalidateAffiliateRequestsQueries, invalidatePaymentQueries } from '../../../../lib/queryKeys';
import { approveZelleStatusService, rejectZelleStatusService, addZelleAdminNotesService } from '../data/services/zellePaymentsService';
import { approveZelleFlow, rejectZelleFlow } from '../data/services/zelleOrchestrator';
import { supabase } from '../../../../lib/supabase';
import { UniversityPaymentRequestService } from '../../../../services/UniversityPaymentRequestService';
import { AffiliatePaymentRequestService } from '../../../../services/AffiliatePaymentRequestService';
import type { PaymentRecord } from '../data/types';

/**
 * Mutation para aprovar pagamento Zelle
 */
export function useApproveZellePaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, adminUserId, payment }: { paymentId: string; adminUserId: string; payment: PaymentRecord }) => {
      // Atualizar status
      const { error: statusError } = await approveZelleStatusService({ paymentId, adminUserId });
      if (statusError) throw statusError;

      // Executar fluxo completo de aprovação
      await approveZelleFlow({
        supabase,
        adminUserId,
        payment: {
          id: payment.id,
          user_id: payment.user_id || '',
          student_id: payment.student_id,
          student_email: payment.student_email,
          student_name: payment.student_name,
          fee_type: payment.fee_type,
          fee_type_global: payment.fee_type_global,
          amount: payment.amount,
          admin_approved_at: payment.admin_approved_at,
          created_at: payment.created_at,
          scholarships_ids: payment.scholarships_ids,
          scholarship_id: payment.scholarship_id || null,
        },
      });
    },
    onSuccess: () => {
      // Invalidação automática + refetch em background
      invalidateZelleQueries(queryClient);
      invalidatePaymentQueries(queryClient); // stats também precisam atualizar
    },
  });
}

/**
 * Mutation para rejeitar pagamento Zelle
 */
export function useRejectZellePaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, reason, adminUserId, payment }: { paymentId: string; reason: string; adminUserId: string; payment: PaymentRecord }) => {
      // Atualizar status
      const { error: statusError } = await rejectZelleStatusService({ paymentId, reason });
      if (statusError) throw statusError;

      // Executar fluxo completo de rejeição
      await rejectZelleFlow({
        supabase,
        adminUserId,
        payment: {
          id: payment.id,
          user_id: payment.user_id || '',
          student_id: payment.student_id,
          student_email: payment.student_email,
          student_name: payment.student_name,
          fee_type: payment.fee_type,
          fee_type_global: payment.fee_type_global,
          amount: payment.amount,
          admin_approved_at: payment.admin_approved_at,
          created_at: payment.created_at,
          scholarships_ids: payment.scholarships_ids,
        },
        reason,
      });
    },
    onSuccess: () => {
      invalidateZelleQueries(queryClient);
      invalidatePaymentQueries(queryClient);
    },
  });
}

/**
 * Mutation para adicionar notas em pagamento Zelle
 */
export function useAddZelleNotesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, notes, adminUserId }: { paymentId: string; notes: string; adminUserId: string }) => {
      const { error } = await addZelleAdminNotesService({ paymentId, notes, adminUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateZelleQueries(queryClient);
    },
  });
}

/**
 * Mutation para aprovar solicitação de pagamento de universidade
 */
export function useApproveUniversityRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adminId }: { id: string; adminId: string }) => {
      await UniversityPaymentRequestService.adminApprove(id, adminId);
    },
    onSuccess: () => {
      invalidateUniversityRequestsQueries(queryClient);
      invalidatePaymentQueries(queryClient);
    },
  });
}

/**
 * Mutation para rejeitar solicitação de pagamento de universidade
 */
export function useRejectUniversityRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adminId, reason }: { id: string; adminId: string; reason: string }) => {
      await UniversityPaymentRequestService.adminReject(id, adminId, reason);
    },
    onSuccess: () => {
      invalidateUniversityRequestsQueries(queryClient);
      invalidatePaymentQueries(queryClient);
    },
  });
}

/**
 * Mutation para marcar solicitação de pagamento de universidade como paga
 */
export function useMarkUniversityPaidMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adminId, reference }: { id: string; adminId: string; reference?: string }) => {
      await UniversityPaymentRequestService.adminMarkPaid(id, adminId, reference);
    },
    onSuccess: () => {
      invalidateUniversityRequestsQueries(queryClient);
      invalidatePaymentQueries(queryClient);
    },
  });
}

/**
 * Mutation para adicionar notas em solicitação de pagamento de universidade
 */
export function useAddUniversityNotesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await UniversityPaymentRequestService.adminAddNotes(id, notes);
    },
    onSuccess: () => {
      invalidateUniversityRequestsQueries(queryClient);
    },
  });
}

/**
 * Mutation para criar solicitação de pagamento de universidade (admin)
 */
export function useCreateUniversityPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      universityId: string;
      adminId: string;
      amount: number;
      payoutMethod: 'zelle' | 'bank_transfer' | 'stripe';
      payoutDetails: Record<string, any>;
    }) => {
      await UniversityPaymentRequestService.adminCreatePaymentRequest(data);
    },
    onSuccess: () => {
      invalidateUniversityRequestsQueries(queryClient);
      invalidatePaymentQueries(queryClient);
    },
  });
}

/**
 * Mutation para aprovar solicitação de pagamento de afiliado
 */
export function useApproveAffiliateRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adminId }: { id: string; adminId: string }) => {
      await AffiliatePaymentRequestService.adminApprove(id, adminId);
    },
    onSuccess: () => {
      invalidateAffiliateRequestsQueries(queryClient);
      invalidatePaymentQueries(queryClient);
    },
  });
}

/**
 * Mutation para rejeitar solicitação de pagamento de afiliado
 */
export function useRejectAffiliateRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adminId, reason }: { id: string; adminId: string; reason: string }) => {
      await AffiliatePaymentRequestService.adminReject(id, adminId, reason);
    },
    onSuccess: () => {
      invalidateAffiliateRequestsQueries(queryClient);
      invalidatePaymentQueries(queryClient);
    },
  });
}

/**
 * Mutation para marcar solicitação de pagamento de afiliado como paga
 */
export function useMarkAffiliatePaidMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adminId, reference }: { id: string; adminId: string; reference?: string }) => {
      await AffiliatePaymentRequestService.adminMarkPaid(id, adminId, reference);
    },
    onSuccess: () => {
      invalidateAffiliateRequestsQueries(queryClient);
      invalidatePaymentQueries(queryClient);
    },
  });
}

/**
 * Mutation para adicionar notas em solicitação de pagamento de afiliado
 */
export function useAddAffiliateNotesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await AffiliatePaymentRequestService.adminAddNotes(id, notes);
    },
    onSuccess: () => {
      invalidateAffiliateRequestsQueries(queryClient);
    },
  });
}

