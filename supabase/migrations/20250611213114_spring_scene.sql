/*
  # Create Admin User Function
  
  1. Function to promote existing user to admin
  2. Function to create admin user if needed
  3. Ensure proper admin access
*/

-- Function to promote existing user to admin (requires manual execution)
CREATE OR REPLACE FUNCTION promote_existing_user_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update user metadata to set admin role
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'admin',
    'name', 'Admin User'
  )
  WHERE id = target_user_id;
  
  -- Ensure user profile exists
  INSERT INTO user_profiles (user_id, full_name, status)
  VALUES (target_user_id, 'Admin User', 'active')
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = 'Admin User',
    status = 'active';
    
  -- Log the promotion
  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (
    target_user_id, -- Self-promotion for initial admin
    'promote_to_admin',
    'user',
    target_user_id,
    jsonb_build_object('email', user_email, 'promoted_at', now())
  );
END;
$$;

-- Function to check if user is admin by email
CREATE OR REPLACE FUNCTION check_admin_status(user_email text)
RETURNS TABLE (
  user_id uuid,
  email text,
  is_admin boolean,
  role text,
  name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::text,
    CASE 
      WHEN au.raw_user_meta_data ->> 'role' = 'admin' THEN true
      WHEN au.email IN ('admin@matriculausa.com', 'admin@example.com', 'gokusr80@gmail.com') THEN true
      ELSE false
    END as is_admin,
    COALESCE(au.raw_user_meta_data ->> 'role', 'student') as role,
    COALESCE(au.raw_user_meta_data ->> 'name', split_part(au.email, '@', 1)) as name
  FROM auth.users au
  WHERE au.email = user_email;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION promote_existing_user_to_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_admin_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_admin_status(text) TO anon;