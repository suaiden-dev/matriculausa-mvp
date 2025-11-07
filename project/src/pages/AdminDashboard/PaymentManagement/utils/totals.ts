import type { PaymentRecord } from '../data/types';

export function calculateSelectedTotalsUtil(
  payments: PaymentRecord[],
  selectedIds: Set<string>
) {
  const selectedPaymentRecords = payments.filter((p) => selectedIds.has(p.id));
  const totalAmount = selectedPaymentRecords.reduce((sum, p) => sum + p.amount, 0);
  const breakdownByMethod = selectedPaymentRecords.reduce((acc, p) => {
    const method = (p.payment_method || 'manual').toLowerCase();
    // ✅ CORREÇÃO: Mapear 'pix' para 'stripe' (Pix é processado via Stripe)
    const normalizedMethod = method === 'pix' ? 'stripe' : method;
    if (!acc[normalizedMethod]) acc[normalizedMethod] = { count: 0, amount: 0 } as { count: number; amount: number };
    acc[normalizedMethod].count += 1;
    acc[normalizedMethod].amount += p.amount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  return { totalAmount, breakdownByMethod, totalCount: selectedPaymentRecords.length };
}


