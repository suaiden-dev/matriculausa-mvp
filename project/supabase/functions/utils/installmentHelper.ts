// @ts-nocheck
// ============================================================
// Installment Helper — shared across all payment webhooks
//
// Provides two functions used by stripe-webhook,
// parcelow-webhook, verify-stripe-session-placement-fee,
// and approve-zelle-payment-automatic.
// ============================================================

export interface InstallmentPlan {
  id: string;
  user_id: string;
  fee_type: string;
  total_amount: number;
  total_installments: number;
  installments_paid: number;
  amount_paid: number;
  status: string;
  payment_method: string | null;
}

export interface ResolveResult {
  installmentNumber: number;
  plan: InstallmentPlan | null;
}

export interface RecordResult {
  isFullyPaid: boolean;
  updatedPlan: InstallmentPlan;
  remainingAmount: number;
}

/**
 * Resolves which installment number the current payment represents.
 *
 * Priority:
 * 1. metadataInstallmentNumber — present for Stripe/Zelle (reliable)
 * 2. plan.installments_paid + 1 — fallback for Parcelow (no metadata in webhooks)
 * 3. Returns installmentNumber=1 and plan=null if no active plan exists
 *
 * @param supabase     Service role Supabase client
 * @param userId       auth.users.id of the student
 * @param feeType      e.g. 'placement_fee', 'ds160_package'
 * @param metadataNum  installment_number from checkout metadata (may be null for Parcelow)
 */
export async function resolveInstallmentNumber(
  supabase: any,
  userId: string,
  feeType: string,
  metadataNum?: string | number | null,
): Promise<ResolveResult> {
  const { data: plan, error } = await supabase
    .from("fee_installment_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("fee_type", feeType)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.warn(`[installmentHelper] Error fetching plan for ${userId}/${feeType}:`, error.message);
  }

  if (!plan) {
    // No active installment plan → single full payment
    return { installmentNumber: 1, plan: null };
  }

  if (metadataNum != null && metadataNum !== "") {
    const parsed = parseInt(String(metadataNum), 10);
    if (!isNaN(parsed) && parsed >= 1) {
      return { installmentNumber: parsed, plan };
    }
  }

  // Parcelow fallback: next installment = already paid + 1
  return { installmentNumber: plan.installments_paid + 1, plan };
}

/**
 * Records a paid installment on the plan.
 * Increments installments_paid and amount_paid.
 * Marks plan as 'completed' when all installments are paid.
 *
 * @param supabase    Service role Supabase client
 * @param plan        The active plan (from resolveInstallmentNumber)
 * @param amountPaid  Net amount of THIS installment in USD
 * @param paymentDate ISO timestamp of the payment
 */
export async function recordInstallmentPayment(
  supabase: any,
  plan: InstallmentPlan,
  amountPaid: number,
  paymentDate: string,
): Promise<RecordResult> {
  const newInstallmentsPaid = plan.installments_paid + 1;
  const newAmountPaid = Math.round((Number(plan.amount_paid) + amountPaid) * 100) / 100;
  const isFullyPaid = newInstallmentsPaid >= plan.total_installments;
  const remainingAmount = Math.max(0, Math.round((Number(plan.total_amount) - newAmountPaid) * 100) / 100);

  const updatePayload: any = {
    installments_paid: newInstallmentsPaid,
    amount_paid: newAmountPaid,
    updated_at: paymentDate,
  };

  if (isFullyPaid) {
    updatePayload.status = "completed";
    updatePayload.completed_at = paymentDate;
  }

  const { data: updatedPlan, error } = await supabase
    .from("fee_installment_plans")
    .update(updatePayload)
    .eq("id", plan.id)
    .select()
    .single();

  if (error) {
    throw new Error(`[installmentHelper] Failed to update plan ${plan.id}: ${error.message}`);
  }

  console.log(
    `[installmentHelper] Plan ${plan.id}: installment ${newInstallmentsPaid}/${plan.total_installments} recorded.`,
    isFullyPaid ? "Plan COMPLETED." : `$${remainingAmount} remaining.`,
  );

  return { isFullyPaid, updatedPlan, remainingAmount };
}

/**
 * Links an individual_fee_payments record to its installment plan.
 * Call after inserting the individual_fee_payments row.
 *
 * @param supabase           Service role client
 * @param individualPaymentId uuid of the individual_fee_payments row
 * @param planId             uuid of the fee_installment_plans row
 */
export async function linkPaymentToPlan(
  supabase: any,
  individualPaymentId: string,
  planId: string,
): Promise<void> {
  const { error } = await supabase
    .from("individual_fee_payments")
    .update({ installment_plan_id: planId })
    .eq("id", individualPaymentId);

  if (error) {
    console.warn(`[installmentHelper] Failed to link payment ${individualPaymentId} to plan ${planId}:`, error.message);
    // Non-fatal: audit trail is preserved; just the FK is missing
  }
}

/**
 * Computes the legacy user_profiles fields to mirror after an installment payment.
 * Used during the backward-compat transition period.
 *
 * Returns an object to spread into the user_profiles UPDATE call.
 */
export function buildLegacyProfileMirror(
  feeType: string,
  installmentNumber: number,
  totalInstallments: number,
  remainingAmount: number,
  isFullyPaid: boolean,
): Record<string, unknown> {
  if (feeType !== "placement_fee") {
    // Legacy columns only exist for placement_fee
    return {};
  }

  return {
    placement_fee_installment_number: installmentNumber,
    placement_fee_pending_balance: isFullyPaid ? 0 : remainingAmount,
    // Keep installment_enabled = true until fully paid (for backward compat reads)
    placement_fee_installment_enabled: !isFullyPaid,
  };
}
