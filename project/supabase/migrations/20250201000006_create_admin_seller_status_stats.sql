-- Migration: Create get_admin_seller_status_stats function
-- This function is missing and causing errors in the affiliate admin dashboard

-- Drop function if it exists
DROP FUNCTION IF EXISTS get_admin_seller_status_stats(uuid);

CREATE OR REPLACE FUNCTION get_admin_seller_status_stats(admin_user_id uuid)
RETURNS TABLE (
  pending_sellers bigint,
  approved_sellers bigint,
  rejected_sellers bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE s.status = 'pending') as pending_sellers,
    COUNT(*) FILTER (WHERE s.status = 'approved') as approved_sellers,
    COUNT(*) FILTER (WHERE s.status = 'rejected') as rejected_sellers
  FROM sellers s
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  WHERE aa.user_id = admin_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_seller_status_stats(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_seller_status_stats(uuid) IS 'Returns seller status statistics for affiliate admin dashboard';
