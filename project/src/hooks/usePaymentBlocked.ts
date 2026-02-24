import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

interface ZellePayment {
  id: string;
  fee_type: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes?: string | null;
}

interface PaymentBlockedState {
  isBlocked: boolean;
  pendingPayment: ZellePayment | null;
  rejectedPayment: ZellePayment | null;
  approvedPayment: ZellePayment | null;
  totalPending: number;
  loading: boolean;
  error: string | null;
}

export const usePaymentBlocked = (): PaymentBlockedState => {
  const { user } = useAuth();
  const [state, setState] = useState<PaymentBlockedState>({
    isBlocked: false,
    pendingPayment: null,
    rejectedPayment: null,
    approvedPayment: null,
    totalPending: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const checkPendingPayments = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase.rpc(
          "check_pending_zelle_payments",
          {
            p_user_id: user.id,
          },
        );

        if (error) {
          console.error("Error checking pending payments:", error);
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Failed to check payment status",
          }));
          return;
        }

        if (data && data.length > 0) {
          const result = data[0];

          // Buscar pagamentos rejeitados e aprovados recentes
          const [rejectedRes, approvedRes] = await Promise.all([
            supabase
              .from("zelle_payments")
              .select("id, fee_type, amount, status, created_at, admin_notes")
              .eq("user_id", user.id)
              .eq("status", "rejected")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("zelle_payments")
              .select("id, fee_type, amount, status, created_at, admin_notes")
              .eq("user_id", user.id)
              .in("status", ["approved", "verified"])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          setState({
            isBlocked: result.has_pending_payment,
            pendingPayment: result.has_pending_payment
              ? {
                id: result.pending_payment_id,
                fee_type: result.pending_payment_fee_type,
                amount: result.pending_payment_amount,
                status: result.pending_payment_status,
                created_at: result.pending_payment_created_at,
              }
              : null,
            rejectedPayment: rejectedRes.data || null,
            approvedPayment: approvedRes.data || null,
            totalPending: result.total_pending,
            loading: false,
            error: null,
          });
        } else {
          setState({
            isBlocked: false,
            pendingPayment: null,
            rejectedPayment: null,
            approvedPayment: null,
            totalPending: 0,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error("Error in checkPendingPayments:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "An unexpected error occurred",
        }));
      }
    };

    checkPendingPayments();

    // Refresh every 30 seconds to check for status updates
    const interval = setInterval(checkPendingPayments, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  return state;
};
