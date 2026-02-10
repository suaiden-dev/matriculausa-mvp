import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

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
    error: null
  });

  useEffect(() => {
    if (!user?.id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const checkPayments = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Buscar pagamentos pendentes e rejeitados usando RPC unificada
        const { data: paymentData, error: paymentError } = await supabase.rpc('check_zelle_payments_status', {
          p_user_id: user.id
        });

        if (paymentError) {
          console.error('Error checking payment status:', paymentError);
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Failed to check payment status' 
          }));
          return;
        }

        // Processar resultado da RPC
        let pendingPayment: PendingPayment | null = null;
        let rejectedPayment: RejectedPayment | null = null;
        let approvedPayment: ApprovedPayment | null = null;
        let isBlocked = false;
        let totalPending = 0;

        if (paymentData && paymentData.length > 0) {
          const result = paymentData[0];
          
          // Processar pagamento pendente
          isBlocked = result.has_pending_payment;
          totalPending = result.total_pending;
          
          // Verificar se há ID válido (não NULL e não UUID zero)
          if (result.has_pending_payment && result.pending_payment_id && result.pending_payment_id !== '00000000-0000-0000-0000-000000000000') {
            pendingPayment = {
              id: result.pending_payment_id,
              fee_type: result.pending_payment_fee_type || '',
              amount: result.pending_payment_amount,
              status: result.pending_payment_status || 'pending',
              created_at: result.pending_payment_created_at
            };
          }

          // Processar pagamento rejeitado
          // Verificar se há ID válido (não NULL e não UUID zero)
          if (result.has_rejected_payment && result.rejected_payment_id && result.rejected_payment_id !== '00000000-0000-0000-0000-000000000000') {
            rejectedPayment = {
              id: result.rejected_payment_id,
              fee_type: result.rejected_payment_fee_type || '',
              amount: result.rejected_payment_amount,
              status: result.rejected_payment_status || 'rejected',
              admin_notes: result.rejected_payment_admin_notes || null,
              created_at: result.rejected_payment_created_at
            };
          }

          // Processar pagamento aprovado
          // Verificar se há ID válido (não NULL e não UUID zero)
          if (result.has_approved_payment && result.approved_payment_id && result.approved_payment_id !== '00000000-0000-0000-0000-000000000000') {
            approvedPayment = {
              id: result.approved_payment_id,
              fee_type: result.approved_payment_fee_type || '',
              amount: result.approved_payment_amount,
              status: result.approved_payment_status || 'approved',
              created_at: result.approved_payment_created_at
            };
          }
        }

          setState({
          isBlocked,
          pendingPayment,
          rejectedPayment,
          approvedPayment,
          totalPending,
            loading: false,
            error: null
          });
      } catch (error) {
        console.error('Error in checkPayments:', error);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'An unexpected error occurred' 
        }));
      }
    };

    // Primeira verificação imediata
    checkPayments();

    // Polling controlado a cada 60 segundos
    const interval = setInterval(() => {
      checkPayments();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

  return state;
};
