-- Migration: Create get_admin_students_analytics with dynamic fees from packages
-- This function was missing and causing errors in the affiliate admin dashboard

-- Drop function if it exists
DROP FUNCTION IF EXISTS get_admin_students_analytics(uuid);

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
  application_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id as student_id,
    COALESCE(up.full_name, 'Nome não disponível') as student_name,
    COALESCE(u.email, 'Email não disponível') as student_email,
    COALESCE(up.country, 'País não disponível') as country,
    s.id as referred_by_seller_id,
    COALESCE(s.name, 'Vendedor não disponível') as seller_name,
    COALESCE(s.referral_code, '') as seller_referral_code,
    COALESCE(up.seller_referral_code, '') as referral_code_used,
    -- Calculate total_paid using dynamic package fees or affiliate_referrals
    COALESCE(
      CASE
        -- First try to get from affiliate_referrals (most accurate)
        WHEN ar.payment_amount IS NOT NULL THEN ar.payment_amount
        -- Fallback to package-based calculation
        WHEN up.scholarship_package_id IS NOT NULL THEN
          CASE
            WHEN up.has_paid_selection_process_fee = true AND up.is_scholarship_fee_paid = true THEN 
              sp.selection_process_fee + sp.scholarship_fee
            WHEN up.has_paid_selection_process_fee = true THEN sp.selection_process_fee
            WHEN up.is_scholarship_fee_paid = true THEN sp.scholarship_fee
            ELSE 0.00
          END
        -- Final fallback to default values
        ELSE
          CASE
            WHEN up.has_paid_selection_process_fee = true AND up.is_scholarship_fee_paid = true THEN 1450.00
            WHEN up.has_paid_selection_process_fee = true THEN 600.00
            WHEN up.is_scholarship_fee_paid = true THEN 850.00
            ELSE 0.00
          END
      END, 0
    ) as total_paid,
    up.created_at,
    COALESCE(up.status, 'active') as status,
    COALESCE(sa.status, 'Not specified') as application_status
  FROM user_profiles up
  JOIN auth.users u ON up.user_id = u.id
  JOIN sellers s ON up.seller_referral_code = s.referral_code
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  LEFT JOIN scholarship_packages sp ON up.scholarship_package_id = sp.id
  LEFT JOIN affiliate_referrals ar ON ar.referred_id = up.user_id AND ar.status = 'completed'
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
COMMENT ON FUNCTION get_admin_students_analytics(uuid) IS 'Returns student analytics for affiliate admin dashboard with DYNAMIC FEES from packages';
