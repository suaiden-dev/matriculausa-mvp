-- Migration: Fix get_student_fee_history function
-- This ensures the function works properly with RLS policies

-- Drop and recreate the function
CREATE OR REPLACE FUNCTION get_student_fee_history(target_student_id uuid)
RETURNS TABLE (
  payment_id uuid,
  fee_type text,
  fee_name text,
  amount_paid numeric,
  currency text,
  payment_status text,
  payment_date timestamptz,
  stripe_payment_intent text,
  notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sct.id as payment_id,
    CASE 
      WHEN sct.amount = 2500 THEN 'application'
      WHEN sct.amount = 5000 THEN 'scholarship'
      WHEN sct.amount = 10000 THEN 'i20_control'
      WHEN sct.amount = 15000 THEN 'selection_process'
      ELSE 'custom'
    END as fee_type,
    CASE 
      WHEN sct.amount = 2500 THEN 'Application Fee ($25.00)'
      WHEN sct.amount = 5000 THEN 'Scholarship Fee ($50.00)'
      WHEN sct.amount = 10000 THEN 'I-20 Control Fee ($100.00)'
      WHEN sct.amount = 15000 THEN 'Selection Process Fee ($150.00)'
      ELSE 'Custom Fee ($' || (sct.amount::numeric / 100)::text || ')'
    END as fee_name,
    (sct.amount::numeric / 100) as amount_paid,
    'USD' as currency,
    sct.status as payment_status,
    COALESCE(sct.updated_at, sct.created_at) as payment_date,
    sct.payment_intent_id as stripe_payment_intent,
    COALESCE(sct.error_message, '') as notes
  FROM stripe_connect_transfers sct
  WHERE sct.user_id = target_student_id
  ORDER BY sct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_student_fee_history(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_student_fee_history(uuid) IS 'Get payment history for a specific student - bypasses RLS for secure access';
