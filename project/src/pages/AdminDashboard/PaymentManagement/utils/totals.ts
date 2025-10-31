import type { PaymentRecord } from '../data/types';

export function calculateSelectedTotalsUtil(
  payments: PaymentRecord[],
  selectedIds: Set<string>
) {
  const selectedPaymentRecords = payments.filter((p) => selectedIds.has(p.id));
  const totalAmount = selectedPaymentRecords.reduce((sum, p) => sum + p.amount, 0);
  const breakdownByMethod = selectedPaymentRecords.reduce((acc, p) => {
    const method = (p.payment_method || 'manual').toLowerCase();
    if (!acc[method]) acc[method] = { count: 0, amount: 0 } as { count: number; amount: number };
    acc[method].count += 1;
    acc[method].amount += p.amount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  return { totalAmount, breakdownByMethod, totalCount: selectedPaymentRecords.length };
}


