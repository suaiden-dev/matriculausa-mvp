-- Migration: Create get_admin_sellers_analytics_fixed function
-- This function is missing and causing the seller count issue in the dashboard

-- Drop function if it exists
DROP FUNCTION IF EXISTS get_admin_sellers_analytics_fixed(uuid);

-- Create the missing function that the dashboard is trying to call
CREATE OR REPLACE FUNCTION get_admin_sellers_analytics_fixed(admin_user_id uuid)
RETURNS TABLE (
  seller_id uuid,
  seller_name text,
  seller_email text,
  referral_code text,
  students_count bigint,
  total_revenue numeric,
  avg_revenue_per_student numeric,
  last_referral_date timestamptz,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as seller_id,
    s.name as seller_name,
    s.email as seller_email,
    s.referral_code,
    COUNT(DISTINCT up.user_id) FILTER (WHERE up.seller_referral_code = s.referral_code) as students_count,
    -- Calculate total revenue based on boolean flags in user_profiles
    COALESCE(SUM(
      CASE
        WHEN up.has_paid_selection_process_fee = true AND up.is_scholarship_fee_paid = true THEN 1450.00
        WHEN up.has_paid_selection_process_fee = true THEN 600.00
        WHEN up.is_scholarship_fee_paid = true THEN 850.00
        ELSE 0.00
      END
    ), 0) as total_revenue,
    -- Calculate average revenue per student
    CASE 
      WHEN COUNT(DISTINCT up.user_id) FILTER (WHERE up.seller_referral_code = s.referral_code) > 0 THEN 
        COALESCE(SUM(
          CASE
            WHEN up.has_paid_selection_process_fee = true AND up.is_scholarship_fee_paid = true THEN 1450.00
            WHEN up.has_paid_selection_process_fee = true THEN 600.00
            WHEN up.is_scholarship_fee_paid = true THEN 850.00
            ELSE 0.00
          END
        ), 0) / COUNT(DISTINCT up.user_id) FILTER (WHERE up.seller_referral_code = s.referral_code)::numeric
      ELSE 0 
    END as avg_revenue_per_student,
    MAX(up.created_at) as last_referral_date,
    s.is_active
  FROM sellers s
  LEFT JOIN user_profiles up ON up.seller_referral_code = s.referral_code
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  WHERE aa.user_id = admin_user_id
    AND s.is_active = true  -- Only return ACTIVE sellers
  GROUP BY s.id, s.name, s.email, s.referral_code, s.is_active
  ORDER BY students_count DESC, total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_sellers_analytics_fixed(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_sellers_analytics_fixed(uuid) IS 'Returns detailed seller analytics for affiliate admin dashboard - FIXED VERSION';
