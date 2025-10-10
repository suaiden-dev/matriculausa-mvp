-- Migration: Fix total_paid calculation in get_admin_students_analytics
-- This corrects the revenue calculation to match the Overview.tsx logic exactly
-- Problem: Enhanced Student Tracking shows $0.00 for legacy admin but Overview shows correct $2,950.00

-- Drop existing function
DROP FUNCTION IF EXISTS get_admin_students_analytics(uuid);

-- Recreate function with CORRECT total_paid calculation matching Overview logic
CREATE OR REPLACE FUNCTION get_admin_students_analytics(admin_user_id uuid)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  student_email text,
  country text,
  referred_by_seller_id uuid,
  seller_name text,
  seller_referral_code text,
  referral_code_used text,
  total_paid numeric,
  created_at timestamptz,
  status text,
  application_status text,
  system_type text,
  profile_id uuid,
  has_paid_selection_process_fee boolean,
  has_paid_i20_control_fee boolean,
  is_scholarship_fee_paid boolean,
  is_application_fee_paid boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id as student_id,
    COALESCE(up.full_name, 'Nome não disponível') as student_name,
    COALESCE(u.email, up.email, 'Email não disponível') as student_email,
    COALESCE(up.country, 'País não disponível') as country,
    s.id as referred_by_seller_id,
    COALESCE(s.name, 'Vendedor não disponível') as seller_name,
    COALESCE(s.referral_code, '') as seller_referral_code,
    COALESCE(up.seller_referral_code, '') as referral_code_used,
    
    -- CÁLCULO CORRETO DE TOTAL_PAID (replicando lógica do Overview.tsx linhas 130-161)
    (
      -- Selection Process Fee (com dependentes se não houver override)
      CASE 
        WHEN up.has_paid_selection_process_fee = true THEN
          COALESCE(
            (SELECT selection_process_fee FROM get_user_fee_overrides(up.user_id)),
            CASE
              WHEN COALESCE(up.system_type, 'legacy') = 'simplified' THEN 350
              ELSE 400 + (COALESCE(up.dependents, 0) * 150)
            END
          )
        ELSE 0
      END
      
      + 
      
      -- Scholarship Fee (sem dependentes, com override)
      CASE
        WHEN up.is_scholarship_fee_paid = true THEN
          COALESCE(
            (SELECT scholarship_fee FROM get_user_fee_overrides(up.user_id)),
            CASE
              WHEN COALESCE(up.system_type, 'legacy') = 'simplified' THEN 550
              ELSE 900
            END
          )
        ELSE 0
      END
      
      +
      
      -- I-20 Control Fee (sem dependentes, sempre 900, com override)
      CASE
        WHEN up.has_paid_i20_control_fee = true THEN
          COALESCE(
            (SELECT i20_control_fee FROM get_user_fee_overrides(up.user_id)),
            900
          )
        ELSE 0
      END
    ) as total_paid,
    
    up.created_at,
    COALESCE(up.status, 'active') as status,
    COALESCE(sa.status, 'Not specified') as application_status,
    COALESCE(up.system_type, 'legacy') as system_type,
    up.id as profile_id,
    COALESCE(up.has_paid_selection_process_fee, false) as has_paid_selection_process_fee,
    COALESCE(up.has_paid_i20_control_fee, false) as has_paid_i20_control_fee,
    COALESCE(up.is_scholarship_fee_paid, false) as is_scholarship_fee_paid,
    COALESCE(up.is_application_fee_paid, false) as is_application_fee_paid
  FROM user_profiles up
  JOIN auth.users u ON up.user_id = u.id
  JOIN sellers s ON up.seller_referral_code = s.referral_code
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  LEFT JOIN scholarship_applications sa ON sa.student_id = up.id
  WHERE aa.user_id = admin_user_id
    AND up.seller_referral_code IS NOT NULL
    AND up.seller_referral_code != ''
    AND s.is_active = true
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_students_analytics(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_students_analytics(uuid) IS 'Returns student analytics with CORRECT total_paid calculation matching Overview.tsx logic exactly - fixes $0.00 revenue issue for legacy admin';
