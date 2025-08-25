/*
  # Add Seller Verification Function
  
  This migration adds a function to verify if a user is a seller,
  similar to the existing admin verification functions.
  
  1. Function to check if user is seller
  2. Function to verify seller status by email
  3. Ensure proper permissions and security
*/

-- Function to check if current user is seller
CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sellers
    WHERE user_id = auth.uid()
    AND is_active = true
  );
$$;

-- Function to verify seller status by email
CREATE OR REPLACE FUNCTION verify_seller_user(user_email text)
RETURNS TABLE (
  email text,
  user_id uuid,
  role text,
  is_seller boolean,
  profile_exists boolean,
  status text,
  referral_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.email::text,
    au.id as user_id,
    COALESCE(au.raw_user_meta_data ->> 'role', 'student') as role,
    CASE 
      WHEN s.user_id IS NOT NULL AND s.is_active = true THEN true
      ELSE false
    END as is_seller,
    CASE 
      WHEN up.user_id IS NOT NULL THEN true
      ELSE false
    END as profile_exists,
    COALESCE(up.status, 'no_profile') as status,
    COALESCE(s.referral_code, '') as referral_code
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.user_id
  LEFT JOIN sellers s ON au.id = s.user_id
  WHERE au.email = user_email;
END;
$$;

-- Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION is_seller() TO authenticated;
GRANT EXECUTE ON FUNCTION is_seller() TO anon;
GRANT EXECUTE ON FUNCTION verify_seller_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_seller_user(text) TO anon;

-- Also grant to service_role for admin operations
GRANT EXECUTE ON FUNCTION is_seller() TO service_role;
GRANT EXECUTE ON FUNCTION verify_seller_user(text) TO service_role;

-- Add comment
COMMENT ON FUNCTION is_seller() IS 'Returns true if the current user is an active seller';
COMMENT ON FUNCTION verify_seller_user(text) IS 'Verifies if a user with given email is a seller and returns relevant information';
