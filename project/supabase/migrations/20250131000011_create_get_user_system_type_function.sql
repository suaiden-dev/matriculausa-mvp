-- Migration: Create function to get user system type based on seller referral code
-- This allows dynamic detection of system type for any user

CREATE OR REPLACE FUNCTION get_user_system_type(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  user_system_type TEXT;
  seller_code TEXT;
BEGIN
  -- Get the seller_referral_code from user_profiles
  SELECT seller_referral_code INTO seller_code
  FROM user_profiles
  WHERE user_id = user_id_param;
  
  -- If no seller code, return 'legacy' (default)
  IF seller_code IS NULL THEN
    RETURN 'legacy';
  END IF;
  
  -- Get system type from seller's admin
  SELECT aa.system_type INTO user_system_type
  FROM sellers s
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  WHERE s.referral_code = seller_code
  AND s.is_active = true;
  
  -- Return system type or default to 'legacy'
  RETURN COALESCE(user_system_type, 'legacy');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_system_type(UUID) TO authenticated, anon;

-- Comment
COMMENT ON FUNCTION get_user_system_type(UUID) IS 'Returns the system type (legacy or simplified) for a given user based on their seller referral code.';
