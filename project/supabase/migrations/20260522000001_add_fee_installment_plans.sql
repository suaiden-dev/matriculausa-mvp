-- ============================================================
-- Migration: Dynamic Fee Installment Plans
-- Created: 2026-05-22
--
-- Adds a flexible installment plan system that supports any
-- fee type and any number of installments (2–10).
-- Replaces hardcoded placement_fee_installment_* columns in
-- user_profiles (kept for backward compat during transition).
-- ============================================================

-- 1. Create the fee_installment_plans table
CREATE TABLE IF NOT EXISTS fee_installment_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fee_type           text NOT NULL,
  total_amount       numeric(10,2) NOT NULL,
  total_installments int NOT NULL,
  installments_paid  int NOT NULL DEFAULT 0,
  amount_paid        numeric(10,2) NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'active',
  payment_method     text,
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  notes              text,

  CONSTRAINT fip_valid_status CHECK (status IN ('active', 'completed', 'cancelled')),
  CONSTRAINT fip_valid_installments CHECK (total_installments BETWEEN 2 AND 10),
  CONSTRAINT fip_valid_installments_paid CHECK (installments_paid >= 0),
  CONSTRAINT fip_valid_amount_paid CHECK (amount_paid >= 0)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_fip_user_id
  ON fee_installment_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_fip_fee_type_status
  ON fee_installment_plans(fee_type, status);

-- Only one ACTIVE plan per user+fee_type at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_fip_one_active_per_user_fee
  ON fee_installment_plans(user_id, fee_type)
  WHERE status = 'active';

-- 3. Enable RLS
ALTER TABLE fee_installment_plans ENABLE ROW LEVEL SECURITY;

-- Students can read their own plan
CREATE POLICY "students_read_own_installment_plan"
  ON fee_installment_plans FOR SELECT
  USING (user_id = auth.uid());

-- Admins and post_sales can read all plans
CREATE POLICY "admins_read_all_installment_plans"
  ON fee_installment_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'post_sales', 'school')
    )
  );

-- Admins and post_sales can write plans (via UI with user JWT)
CREATE POLICY "admins_write_installment_plans"
  ON fee_installment_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'post_sales')
    )
  );

-- 4. Link individual_fee_payments to plan (nullable — existing rows have no plan)
ALTER TABLE individual_fee_payments
  ADD COLUMN IF NOT EXISTS installment_plan_id uuid REFERENCES fee_installment_plans(id);

CREATE INDEX IF NOT EXISTS idx_ifp_installment_plan_id
  ON individual_fee_payments(installment_plan_id)
  WHERE installment_plan_id IS NOT NULL;

-- 5. Backfill: users mid-installment on placement_fee (1st paid, waiting for 2nd)
-- These users have placement_fee_installment_enabled=true and installment_number=1
INSERT INTO fee_installment_plans (
  user_id,
  fee_type,
  total_amount,
  total_installments,
  installments_paid,
  amount_paid,
  status,
  payment_method,
  notes
)
SELECT
  up.user_id,
  'placement_fee'                                                              AS fee_type,
  -- pending_balance is the 2nd installment amount = 50% of total
  -- so total = pending_balance * 2
  COALESCE(up.placement_fee_pending_balance * 2, 0)                           AS total_amount,
  2                                                                            AS total_installments,
  1                                                                            AS installments_paid,
  COALESCE(up.placement_fee_pending_balance, 0)                               AS amount_paid,
  'active'                                                                     AS status,
  COALESCE(up.placement_fee_payment_method, 'unknown')                        AS payment_method,
  'Backfilled from legacy placement_fee_installment_* columns on 2026-05-22'  AS notes
FROM user_profiles up
WHERE up.placement_fee_installment_enabled = TRUE
  AND up.placement_fee_installment_number = 1      -- 1st paid, 2nd pending
  AND up.placement_fee_pending_balance > 0
  AND NOT EXISTS (
    SELECT 1 FROM fee_installment_plans fip
    WHERE fip.user_id = up.user_id
      AND fip.fee_type = 'placement_fee'
      AND fip.status = 'active'
  );

-- 6. Link existing individual_fee_payments to the backfilled plans
-- (only placement payments for users who now have an active plan with installments_paid=1)
UPDATE individual_fee_payments ifp
SET installment_plan_id = fip.id
FROM fee_installment_plans fip
WHERE fip.user_id = ifp.user_id
  AND fip.fee_type = 'placement_fee'
  AND fip.status = 'active'
  AND fip.installments_paid = 1
  AND ifp.fee_type = 'placement'
  AND ifp.installment_plan_id IS NULL;

-- 7. Helper: updated_at auto-update trigger
CREATE OR REPLACE FUNCTION update_fee_installment_plans_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fip_updated_at
  BEFORE UPDATE ON fee_installment_plans
  FOR EACH ROW EXECUTE FUNCTION update_fee_installment_plans_updated_at();
