-- Migration: Create Affiliate Admin Functions
-- This creates the necessary functions for affiliate admin role management

-- Function to promote user to affiliate admin
CREATE OR REPLACE FUNCTION promote_to_affiliate_admin(user_email text)
RETURNS json AS $$
DECLARE
  target_user_id uuid;
  result json;
BEGIN
  -- Get user ID by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'User with email ' || user_email || ' not found'
    );
  END IF;
  
  -- Update user metadata to set affiliate_admin role
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'affiliate_admin',
    'name', COALESCE(raw_user_meta_data ->> 'name', 'Affiliate Admin')
  )
  WHERE id = target_user_id;
  
  -- Ensure user profile exists and update role
  INSERT INTO user_profiles (user_id, full_name, role, status)
  VALUES (
    target_user_id, 
    COALESCE((SELECT raw_user_meta_data ->> 'name' FROM auth.users WHERE id = target_user_id), 'Affiliate Admin'),
    'affiliate_admin',
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    role = 'affiliate_admin',
    status = 'active',
    updated_at = now();
  
  -- Create affiliate_admin record
  INSERT INTO affiliate_admins (user_id, email, name, phone, is_active)
  VALUES (
    target_user_id,
    user_email,
    COALESCE((SELECT raw_user_meta_data ->> 'name' FROM auth.users WHERE id = target_user_id), 'Affiliate Admin'),
    COALESCE((SELECT raw_user_meta_data ->> 'phone' FROM auth.users WHERE id = target_user_id), ''),
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    is_active = true,
    updated_at = now();
  
  -- Return success result
  result := json_build_object(
    'success', true, 
    'message', 'User ' || user_email || ' has been promoted to affiliate admin',
    'user_id', target_user_id
  );
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false, 
      'error', SQLERRM,
      'message', 'Failed to promote user to affiliate admin'
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is affiliate admin
CREATE OR REPLACE FUNCTION is_affiliate_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_id_param AND role = 'affiliate_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify affiliate admin status
CREATE OR REPLACE FUNCTION verify_affiliate_admin_status(user_email text)
RETURNS TABLE (
  email text,
  user_id uuid,
  role text,
  is_affiliate_admin boolean,
  profile_exists boolean,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.email::text,
    au.id as user_id,
    COALESCE(up.role, au.raw_user_meta_data ->> 'role', 'student') as role,
    CASE 
      WHEN up.role = 'affiliate_admin' OR au.raw_user_meta_data ->> 'role' = 'affiliate_admin' THEN true
      ELSE false
    END as is_affiliate_admin,
    CASE 
      WHEN up.user_id IS NOT NULL THEN true
      ELSE false
    END as profile_exists,
    COALESCE(up.status, 'no_profile') as status
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.user_id
  WHERE au.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION promote_to_affiliate_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_affiliate_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_affiliate_admin_status(text) TO authenticated;

-- Add comments
COMMENT ON FUNCTION promote_to_affiliate_admin(text) IS 'Promotes a user to affiliate admin role';
COMMENT ON FUNCTION is_affiliate_admin(uuid) IS 'Checks if a user has affiliate admin role';
COMMENT ON FUNCTION verify_affiliate_admin_status(text) IS 'Verifies affiliate admin status of a user by email';
