-- Migration: Installment plan audit trail
-- Adds cancelled_by/cancelled_at to fee_installment_plans,
-- and extends performed_by_type CHECK to include 'post_sales'

-- 1. Audit columns on fee_installment_plans
ALTER TABLE fee_installment_plans
  ADD COLUMN IF NOT EXISTS cancelled_by  uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz;

-- 2. Extend performed_by_type CHECK on student_action_logs to include post_sales
ALTER TABLE student_action_logs
  DROP CONSTRAINT IF EXISTS student_action_logs_performed_by_type_check;

ALTER TABLE student_action_logs
  ADD CONSTRAINT student_action_logs_performed_by_type_check
    CHECK (performed_by_type = ANY (ARRAY[
      'student'::text,
      'admin'::text,
      'university'::text,
      'system'::text,
      'post_sales'::text
    ]));
