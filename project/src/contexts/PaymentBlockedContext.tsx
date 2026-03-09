import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ZellePayment {
    id: string;
    fee_type: string;
    amount: number;
    status: string;
    created_at: string;
    admin_notes?: string | null;
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
    pendingPayment: ZellePayment | null;
    rejectedPayment: RejectedPayment | null;
    approvedPayment: ApprovedPayment | null;
    totalPending: number;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const PaymentBlockedContext = createContext<PaymentBlockedState | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const PaymentBlockedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    // Guardar apenas o ID (primitivo) para não sofrer instabilidade de referência de objeto
    const userIdRef = useRef<string | null>(null);

    const [state, setState] = useState<Omit<PaymentBlockedState, 'refetch'>>({
        isBlocked: false,
        pendingPayment: null,
        rejectedPayment: null,
        approvedPayment: null,
        totalPending: 0,
        loading: true,
        error: null,
    });

    const checkPayments = useCallback(async (userId: string) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const { data: paymentData, error: paymentError } = await supabase.rpc(
                'check_zelle_payments_status',
                { p_user_id: userId },
            );

            if (paymentError) {
                setState(prev => ({ ...prev, loading: false, error: 'Failed to check payment status' }));
                return;
            }

            let pendingPayment: ZellePayment | null = null;
            let rejectedPayment: RejectedPayment | null = null;
            let approvedPayment: ApprovedPayment | null = null;
            let isBlocked = false;
            let totalPending = 0;

            if (paymentData && paymentData.length > 0) {
                const result = paymentData[0];

                isBlocked = result.has_pending_payment;
                totalPending = result.total_pending;

                if (
                    result.has_pending_payment &&
                    result.pending_payment_id &&
                    result.pending_payment_id !== '00000000-0000-0000-0000-000000000000'
                ) {
                    pendingPayment = {
                        id: result.pending_payment_id,
                        fee_type: result.pending_payment_fee_type || '',
                        amount: result.pending_payment_amount,
                        status: result.pending_payment_status || 'pending',
                        created_at: result.pending_payment_created_at,
                    };
                }

                if (
                    result.has_rejected_payment &&
                    result.rejected_payment_id &&
                    result.rejected_payment_id !== '00000000-0000-0000-0000-000000000000'
                ) {
                    rejectedPayment = {
                        id: result.rejected_payment_id,
                        fee_type: result.rejected_payment_fee_type || '',
                        amount: result.rejected_payment_amount,
                        status: result.rejected_payment_status || 'rejected',
                        admin_notes: result.rejected_payment_admin_notes || null,
                        created_at: result.rejected_payment_created_at,
                    };
                }

                if (
                    result.has_approved_payment &&
                    result.approved_payment_id &&
                    result.approved_payment_id !== '00000000-0000-0000-0000-000000000000'
                ) {
                    approvedPayment = {
                        id: result.approved_payment_id,
                        fee_type: result.approved_payment_fee_type || '',
                        amount: result.approved_payment_amount,
                        status: result.approved_payment_status || 'approved',
                        created_at: result.approved_payment_created_at,
                    };
                }
            }

            setState({ isBlocked, pendingPayment, rejectedPayment, approvedPayment, totalPending, loading: false, error: null });
        } catch {
            setState(prev => ({ ...prev, loading: false, error: 'An unexpected error occurred' }));
        }
    }, []); // sem dependências: a função em si nunca muda

    // Executar UMA vez quando o user.id aparecer ou mudar
    useEffect(() => {
        const currentId = user?.id ?? null;

        if (currentId === userIdRef.current) return; // mesmo ID: não refazemos
        userIdRef.current = currentId;

        if (!currentId) {
            setState({ isBlocked: false, pendingPayment: null, rejectedPayment: null, approvedPayment: null, totalPending: 0, loading: false, error: null });
            return;
        }

        checkPayments(currentId);
    }, [user?.id, checkPayments]);

    const refetch = useCallback(() => {
        if (userIdRef.current) {
            checkPayments(userIdRef.current);
        }
    }, [checkPayments]);

    return (
        <PaymentBlockedContext.Provider value={{ ...state, refetch }}>
            {children}
        </PaymentBlockedContext.Provider>
    );
};

// ─────────────────────────────────────────────
// Hook de consumo
// ─────────────────────────────────────────────

export const usePaymentBlockedContext = (): PaymentBlockedState => {
    const ctx = useContext(PaymentBlockedContext);
    if (!ctx) {
        throw new Error('usePaymentBlockedContext must be used inside <PaymentBlockedProvider>');
    }
    return ctx;
};
