import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

interface PendingPayment {
  id: string;
  fee_type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface RejectedPayment {
  id: string;
  fee_type: string;
  amount: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface ApprovedPayment {
  id: string;
  fee_type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface PaymentBlockedState {
  isBlocked: boolean;
  pendingPayment: PendingPayment | null;
  rejectedPayment: RejectedPayment | null;
  approvedPayment: ApprovedPayment | null;
  totalPending: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePaymentBlocked = (): PaymentBlockedState => {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<PaymentBlockedState, "refetch">>({
    isBlocked: false,
    pendingPayment: null,
    rejectedPayment: null,
    approvedPayment: null,
    totalPending: 0,
    loading: true,
    error: null,
  });

  const checkPayments = useCallback(async () => {
    if (!user?.id) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data: paymentData, error: paymentError } = await supabase.rpc(
        "check_zelle_payments_status",
        {
          p_user_id: user.id,
        },
      );

      if (paymentError) {
        console.error("Error checking payment status:", paymentError);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to check payment status",
        }));
        return;
      }

      let pendingPayment: PendingPayment | null = null;
      let rejectedPayment: RejectedPayment | null = null;
      let approvedPayment: ApprovedPayment | null = null;
      let isBlocked = false;
      let totalPending = 0;

      if (paymentData && paymentData.length > 0) {
        const result = paymentData[0];

        isBlocked = result.has_pending_payment;
        totalPending = result.total_pending;

        if (
          result.has_pending_payment && result.pending_payment_id &&
          result.pending_payment_id !== "00000000-0000-0000-0000-000000000000"
        ) {
          pendingPayment = {
            id: result.pending_payment_id,
            fee_type: result.pending_payment_fee_type || "",
            amount: result.pending_payment_amount,
            status: result.pending_payment_status || "pending",
            created_at: result.pending_payment_created_at,
          };
        }

        if (
          result.has_rejected_payment && result.rejected_payment_id &&
          result.rejected_payment_id !== "00000000-0000-0000-0000-000000000000"
        ) {
          rejectedPayment = {
            id: result.rejected_payment_id,
            fee_type: result.rejected_payment_fee_type || "",
            amount: result.rejected_payment_amount,
            status: result.rejected_payment_status || "rejected",
            admin_notes: result.rejected_payment_admin_notes || null,
            created_at: result.rejected_payment_created_at,
          };
        }

        if (
          result.has_approved_payment && result.approved_payment_id &&
          result.approved_payment_id !== "00000000-0000-0000-0000-000000000000"
        ) {
          approvedPayment = {
            id: result.approved_payment_id,
            fee_type: result.approved_payment_fee_type || "",
            amount: result.approved_payment_amount,
            status: result.approved_payment_status || "approved",
            created_at: result.approved_payment_created_at,
          };
        }
      }

      const nextState = {
        isBlocked,
        pendingPayment,
        rejectedPayment,
        approvedPayment,
        totalPending,
        loading: false,
        error: null,
      };

      // Só atualizar se houver mudança real para evitar re-renders desnecessários
      setState((prev) => {
        const isSame = prev.isBlocked === nextState.isBlocked &&
          prev.totalPending === nextState.totalPending &&
          prev.pendingPayment?.id === nextState.pendingPayment?.id &&
          prev.pendingPayment?.status === nextState.pendingPayment?.status &&
          prev.pendingPayment?.fee_type ===
            nextState.pendingPayment?.fee_type &&
          prev.rejectedPayment?.id === nextState.rejectedPayment?.id &&
          prev.rejectedPayment?.status === nextState.rejectedPayment?.status &&
          prev.rejectedPayment?.fee_type ===
            nextState.rejectedPayment?.fee_type &&
          prev.approvedPayment?.id === nextState.approvedPayment?.id &&
          prev.approvedPayment?.status === nextState.approvedPayment?.status &&
          prev.approvedPayment?.fee_type ===
            nextState.approvedPayment?.fee_type;

        if (isSame && prev.loading === nextState.loading) {
          return prev;
        }
        return nextState;
      });
    } catch (error) {
      console.error("Error in checkPayments:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "An unexpected error occurred",
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    checkPayments();

    // Polling a cada 60 segundos
    const interval = setInterval(() => {
      checkPayments();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [checkPayments]);

  return { ...state, refetch: checkPayments };
};
