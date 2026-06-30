// ============================================================
// Installment System Config
//
// To change the maximum number of installments across the
// entire platform: change MAX_INSTALLMENTS below.
// No backend or database changes required.
//
// To add a new fee type with installment support:
// 1. Add it to SUPPORTED_FEE_TYPES
// 2. Add its options to INSTALLMENT_OPTIONS
// 3. Add its label to FEE_TYPE_LABELS
// ============================================================

export const INSTALLMENT_CONFIG = {
  // Change this single value to raise/lower the platform-wide limit
  MAX_INSTALLMENTS: 3,

  // Fee types that support installment plans
  SUPPORTED_FEE_TYPES: [
    'placement_fee',
    'ds160_package',
    'i539_cos_package',
  ] as const,

  // Options presented to the admin per fee type (subset of 2..MAX_INSTALLMENTS)
  INSTALLMENT_OPTIONS: {
    placement_fee:    [2, 3] as number[],
    ds160_package:    [2, 3] as number[],
    i539_cos_package: [2, 3] as number[],
  } as const,

  // Human-readable labels for UI display
  FEE_TYPE_LABELS: {
    placement_fee:    'Placement Fee',
    ds160_package:    'DS-160 Package',
    i539_cos_package: 'I-539 COS Package',
  } as const,
} as const;

export type SupportedInstallmentFeeType =
  typeof INSTALLMENT_CONFIG.SUPPORTED_FEE_TYPES[number];

export interface InstallmentPlan {
  id: string;
  user_id: string;
  fee_type: string;
  total_amount: number;
  total_installments: number;
  installments_paid: number;
  amount_paid: number;
  status: 'active' | 'completed' | 'cancelled';
  payment_method: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  notes: string | null;
  /** ISO string of the most recent individual payment — computed client-side from individual_fee_payments */
  last_payment_date?: string | null;
}

/**
 * Splits a total amount into N equal installments.
 * The last installment absorbs any rounding difference.
 *
 * @example
 * computeInstallmentAmounts(350, 3) → [116.66, 116.66, 116.68]
 */
export function computeInstallmentAmounts(total: number, n: number): number[] {
  const base = Math.floor((total / n) * 100) / 100;
  const amounts = Array(n).fill(base);
  amounts[n - 1] = Math.round((total - base * (n - 1)) * 100) / 100;
  return amounts;
}

/**
 * Returns the amount due for a specific installment (1-indexed).
 */
export function getInstallmentAmount(total: number, n: number, installmentNumber: number): number {
  return computeInstallmentAmounts(total, n)[installmentNumber - 1];
}

/**
 * Returns the remaining amount on a plan after some installments are paid.
 */
export function getRemainingAmount(plan: Pick<InstallmentPlan, 'total_amount' | 'amount_paid'>): number {
  return Math.max(0, Math.round((plan.total_amount - plan.amount_paid) * 100) / 100);
}

/**
 * Returns true if a fee type supports installment plans.
 */
export function supportsInstallments(feeType: string): feeType is SupportedInstallmentFeeType {
  return (INSTALLMENT_CONFIG.SUPPORTED_FEE_TYPES as readonly string[]).includes(feeType);
}
