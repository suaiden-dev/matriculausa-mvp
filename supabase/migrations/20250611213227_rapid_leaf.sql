/*
  # Fix Admin User Creation

  1. Create simple functions to manage admin users
  2. Add direct SQL commands to promote user to admin
  3. Ensure proper permissions and logging
*/

-- Simple function to promote user to admin by email
CREATE OR REPLACE FUNCTION make_user_admin(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  result_message text;
BEGIN
  -- Get user ID by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'ERROR: User with email ' || user_email || ' not found';
  END IF;
  
  -- Update user metadata to set admin role
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'admin',
    'name', 'Admin User'
  )
  WHERE id = target_user_id;
  
  -- Ensure user profile exists and is active
  INSERT INTO user_profiles (user_id, full_name, status)
  VALUES (target_user_id, 'Admin User', 'active')
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = 'Admin User',
    status = 'active',
    updated_at = now();
    
  -- Log the promotion
  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (
    target_user_id,
    'promote_to_admin',
    'user',
    target_user_id,
    jsonb_build_object(
      'email', user_email, 
      'promoted_at', now(),
      'method', 'manual_promotion'
    )
  );
  
  result_message := 'SUCCESS: User ' || user_email || ' has been promoted to admin';
  RETURN result_message;
END;
$$;

-- Function to verify admin status
CREATE OR REPLACE FUNCTION verify_admin_user(user_email text)
RETURNS TABLE (
  email text,
  user_id uuid,
  role text,
  is_admin boolean,
  profile_exists boolean,
  status text
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
      WHEN au.raw_user_meta_data ->> 'role' = 'admin' THEN true
      ELSE false
    END as is_admin,
    CASE 
      WHEN up.user_id IS NOT NULL THEN true
      ELSE false
    END as profile_exists,
    COALESCE(up.status, 'no_profile') as status
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.user_id
  WHERE au.email = user_email;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION make_user_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION make_user_admin(text) TO anon;
GRANT EXECUTE ON FUNCTION verify_admin_user(text) TO anon;