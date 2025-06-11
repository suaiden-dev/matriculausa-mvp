/*
  # Fix Admin Dashboard Permissions

  1. Security Updates
    - Ensure proper RLS policies for admin access to all tables
    - Add missing admin policies for user management
    - Fix admin users view permissions
  
  2. Admin Functions
    - Add helper functions for admin operations
    - Ensure proper logging and validation
*/

-- Enable RLS on all tables (ensure they're enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage user profiles" ON user_profiles;

-- Create comprehensive admin policies for user_profiles
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data ->> 'role' = 'admin'
        OR auth.users.email IN ('admin@matriculausa.com', 'admin@example.com')
      )
    )
  );

CREATE POLICY "Admins can update all user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data ->> 'role' = 'admin'
        OR auth.users.email IN ('admin@matriculausa.com', 'admin@example.com')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data ->> 'role' = 'admin'
        OR auth.users.email IN ('admin@matriculausa.com', 'admin@example.com')
      )
    )
  );

-- Create admin helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data ->> 'role' = 'admin'
      OR auth.users.email IN ('admin@matriculausa.com', 'admin@example.com')
    )
  );
$$;

-- Create function to safely get admin user data
CREATE OR REPLACE FUNCTION get_admin_users_data()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  full_name text,
  phone text,
  country text,
  field_of_interest text,
  academic_level text,
  status text,
  last_active timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data,
    COALESCE(up.full_name, au.raw_user_meta_data ->> 'name', split_part(au.email, '@', 1)) as full_name,
    up.phone,
    up.country,
    up.field_of_interest,
    up.academic_level,
    COALESCE(up.status, 'active') as status,
    COALESCE(up.last_active, au.created_at) as last_active
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.user_id
  ORDER BY au.created_at DESC;
END;
$$;

-- Create function to approve university
CREATE OR REPLACE FUNCTION approve_university(university_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Update university approval status
  UPDATE universities 
  SET is_approved = true, updated_at = now()
  WHERE id = university_id_param;

  -- Log the action
  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'approve_university',
    'university',
    university_id_param,
    jsonb_build_object('approved_at', now())
  );
END;
$$;

-- Create function to reject university
CREATE OR REPLACE FUNCTION reject_university(university_id_param uuid, reason_text text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log the action before deletion
  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'reject_university',
    'university',
    university_id_param,
    jsonb_build_object('reason', reason_text, 'rejected_at', now())
  );

  -- Delete the university (cascade will handle related records)
  DELETE FROM universities WHERE id = university_id_param;
END;
$$;

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  action_text text,
  target_type_text text,
  target_id_param uuid DEFAULT NULL,
  details_param jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), action_text, target_type_text, target_id_param, details_param);
END;
$$;

-- Create function to promote user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log the action (actual role update must be done via Supabase admin)
  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'promote_to_admin',
    'user',
    target_user_id,
    jsonb_build_object('promoted_at', now(), 'note', 'Role update required via Supabase admin panel')
  );
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users_data() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_university(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_university(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_user_to_admin(uuid) TO authenticated;