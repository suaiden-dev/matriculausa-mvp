-- Migration: Fix get_admin_analytics_fixed to use dynamic fees from packages
-- This replaces hardcoded values (600, 850, 1450) with dynamic package-based fees

-- Drop and recreate the function with dynamic fee calculation
DROP FUNCTION IF EXISTS get_admin_analytics_fixed(uuid);

CREATE OR REPLACE FUNCTION get_admin_analytics_fixed(admin_user_id uuid)
RETURNS TABLE (
  total_sellers bigint,
  active_sellers bigint,
  pending_sellers bigint,
  approved_sellers bigint,
  rejected_sellers bigint,
  total_students bigint,
  total_revenue numeric,
  monthly_growth numeric,
  conversion_rate numeric,
  avg_revenue_per_student numeric
) AS $$
DECLARE
  start_date timestamptz;
  end_date timestamptz;
BEGIN
  -- Current period (current month)
  start_date := date_trunc('month', now());
  end_date := date_trunc('month', now()) + interval '1 month' - interval '1 second';
  
  RETURN QUERY
  WITH seller_stats AS (
    SELECT 
      COUNT(*) as total_sellers,
      COUNT(*) FILTER (WHERE s.is_active = true) as active_sellers
    FROM sellers s
    JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
    WHERE aa.user_id = admin_user_id
  ),
  seller_status_stats AS (
    SELECT 
      pending_sellers,
      approved_sellers,
      rejected_sellers
    FROM get_admin_seller_status_stats(admin_user_id)
  ),
  student_stats AS (
    SELECT 
      COUNT(DISTINCT up.user_id) as total_students,
      -- Calculate total revenue using dynamic package fees or affiliate_referrals
      COALESCE(SUM(
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
        END
      ), 0) as total_revenue
    FROM user_profiles up
    JOIN sellers s ON up.seller_referral_code = s.referral_code
    JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
    LEFT JOIN scholarship_packages sp ON up.scholarship_package_id = sp.id
    LEFT JOIN affiliate_referrals ar ON ar.referred_id = up.user_id AND ar.status = 'completed'
    WHERE aa.user_id = admin_user_id
      AND up.seller_referral_code IS NOT NULL
      AND up.seller_referral_code != ''
      AND up.created_at >= start_date
      AND up.created_at <= end_date
  ),
  growth_stats AS (
    SELECT 
      COALESCE(
        CASE 
          WHEN prev_month.count > 0 THEN
            ((curr_month.count - prev_month.count)::numeric / prev_month.count::numeric) * 100
          ELSE 
            CASE WHEN curr_month.count > 0 THEN 100 ELSE 0 END
        END, 0
      ) as monthly_growth
    FROM (
      SELECT COUNT(DISTINCT up.user_id) as count
      FROM user_profiles up
      JOIN sellers s ON up.seller_referral_code = s.referral_code
      JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
      WHERE aa.user_id = admin_user_id
        AND up.seller_referral_code IS NOT NULL
        AND up.seller_referral_code != ''
        AND up.created_at >= start_date
        AND up.created_at <= end_date
    ) curr_month,
    (
      SELECT COUNT(DISTINCT up.user_id) as count
      FROM user_profiles up
      JOIN sellers s ON up.seller_referral_code = s.referral_code
      JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
      WHERE aa.user_id = admin_user_id
        AND up.seller_referral_code IS NOT NULL
        AND up.seller_referral_code != ''
        AND up.created_at >= date_trunc('month', now() - interval '1 month')
        AND up.created_at < start_date
    ) prev_month
  )
  SELECT 
    ss.total_sellers,
    ss.active_sellers,
    sss.pending_sellers,
    sss.approved_sellers,
    sss.rejected_sellers,
    st.total_students,
    st.total_revenue,
    gs.monthly_growth,
    CASE 
      WHEN ss.active_sellers > 0 THEN 
        (st.total_students::numeric / ss.active_sellers::numeric) * 100
      ELSE 0 
    END as conversion_rate,
    CASE 
      WHEN st.total_students > 0 THEN 
        st.total_revenue / st.total_students::numeric
      ELSE 0 
    END as avg_revenue_per_student
  FROM seller_stats ss
  CROSS JOIN seller_status_stats sss
  CROSS JOIN student_stats st
  CROSS JOIN growth_stats gs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_analytics_fixed(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_analytics_fixed(uuid) IS 'Returns general analytics for affiliate admin dashboard with DYNAMIC FEES from packages';
