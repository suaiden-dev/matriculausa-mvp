/*
  # Add admin policies and functions

  1. Admin Access
    - Create view for user data access
    - Add admin policies for all relevant tables
    - Create admin functions for common operations

  2. Security
    - Add RLS policies that check for admin role
    - Create secure functions for university management
    - Add admin activity logging
*/

-- Create a view for user data that admins can access
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  au.raw_user_meta_data,
  up.full_name,
  up.phone,
  up.country,
  up.field_of_interest,
  up.academic_level,
  up.status,
  up.last_active
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;

-- Update user_profiles policies for admin access
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Update scholarship_applications policies for admin access
CREATE POLICY "Admins can view all scholarship applications"
  ON scholarship_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Update admin_logs policies
CREATE POLICY "Admins can view and manage admin logs"
  ON admin_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Update scholarships policies for admin access
CREATE POLICY "Admins can view all scholarships"
  ON scholarships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Update universities policies for admin access  
CREATE POLICY "Admins can view all universities"
  ON universities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Admins can update all universities"
  ON universities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Admins can delete all universities"
  ON universities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Create admin functions for common operations
CREATE OR REPLACE FUNCTION approve_university(university_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'role')::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update university
  UPDATE universities 
  SET is_approved = true, updated_at = now()
  WHERE id = university_id_param;

  -- Log the action
  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id)
  VALUES (auth.uid(), 'approve_university', 'university', university_id_param);
END;
$$;

CREATE OR REPLACE FUNCTION reject_university(university_id_param UUID, reason_text TEXT DEFAULT '')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'role')::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Log the action before deletion
  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'reject_university', 'university', university_id_param, 
          jsonb_build_object('reason', reason_text));

  -- Delete university (cascades to scholarships)
  DELETE FROM universities WHERE id = university_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION promote_user_to_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'role')::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update user metadata (this requires service role key in practice)
  -- For now, we'll just log the action
  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id)
  VALUES (auth.uid(), 'promote_to_admin', 'user', target_user_id);
  
  -- Note: Actual role update would need to be done via Supabase Admin API
END;
$$;

CREATE OR REPLACE FUNCTION log_admin_action(
  action_text TEXT,
  target_type_text TEXT,
  target_id_param UUID DEFAULT NULL,
  details_param JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'role')::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), action_text, target_type_text, target_id_param, details_param);
END;
$$;