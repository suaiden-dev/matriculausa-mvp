-- Migration: Create function to get seller admin system type by seller code
-- This function allows checking system type using seller referral code

CREATE OR REPLACE FUNCTION get_seller_admin_system_type_by_code(seller_code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(aa.system_type, 'legacy')
    FROM sellers s
    JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
    WHERE s.referral_code = seller_code
    AND s.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_seller_admin_system_type_by_code(TEXT) TO authenticated;

-- Add comment for function
COMMENT ON FUNCTION get_seller_admin_system_type_by_code(TEXT) IS 'Returns system type for a seller admin by seller referral code: legacy or simplified';
