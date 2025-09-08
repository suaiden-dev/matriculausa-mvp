-- Migration: Create function to get seller registration status statistics
-- This function will provide pending, approved, and rejected seller counts for the affiliate admin dashboard

-- Drop function if it exists
DROP FUNCTION IF EXISTS get_admin_seller_status_stats(uuid);

-- Create function to get seller registration status statistics
CREATE OR REPLACE FUNCTION get_admin_seller_status_stats(admin_user_id uuid)
RETURNS TABLE (
  pending_sellers bigint,
  approved_sellers bigint,
  rejected_sellers bigint,
  total_registrations bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH admin_codes AS (
    -- Get all registration codes created by this admin
    SELECT code
    FROM seller_registration_codes
    WHERE admin_id = admin_user_id
      AND is_active = true
  ),
  current_registrations AS (
    -- Get current users who used these codes (pending or approved)
    SELECT 
      up.user_id,
      up.seller_referral_code,
      CASE 
        WHEN s.id IS NOT NULL THEN 'approved'
        ELSE 'pending'
      END as status
    FROM user_profiles up
    CROSS JOIN admin_codes ac
    LEFT JOIN sellers s ON s.user_id = up.user_id
    WHERE up.seller_referral_code = ac.code
      AND up.role = 'student'
  ),
  rejected_registrations AS (
    -- Get rejected registrations from history
    SELECT 
      srh.user_id,
      srh.registration_code as seller_referral_code,
      'rejected' as status
    FROM seller_registration_history srh
    WHERE srh.admin_id = admin_user_id
      AND srh.status = 'rejected'
      -- Only include if user is not currently using any registration code
      AND NOT EXISTS (
        SELECT 1 FROM user_profiles up2 
        WHERE up2.user_id = srh.user_id 
          AND up2.seller_referral_code IS NOT NULL
      )
  ),
  all_registrations AS (
    SELECT * FROM current_registrations
    UNION ALL
    SELECT * FROM rejected_registrations
  )
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_sellers,
    COUNT(*) FILTER (WHERE status = 'approved')::bigint as approved_sellers,
    COUNT(*) FILTER (WHERE status = 'rejected')::bigint as rejected_sellers,
    COUNT(*)::bigint as total_registrations
  FROM all_registrations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_seller_status_stats(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_seller_status_stats(uuid) IS 'Returns seller registration status statistics (pending, approved, rejected) for affiliate admin dashboard';
