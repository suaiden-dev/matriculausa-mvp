/*
  # Fix Admin Permissions - Use is_admin() function in RLS policies

  1. Problem
    - RLS policies are directly querying auth.users table
    - authenticated role doesn't have permission to access auth.users
    - This causes "permission denied for table users" errors

  2. Solution
    - Drop all existing admin RLS policies that query auth.users directly
    - Recreate them using the is_admin() function which has SECURITY DEFINER
    - The is_admin() function can access auth.users with elevated privileges

  3. Tables Updated
    - admin_logs
    - scholarship_applications  
    - user_profiles
    - scholarships
    - universities
*/

-- Drop existing admin policies that directly query auth.users
DROP POLICY IF EXISTS "Admins can view all logs" ON admin_logs;
DROP POLICY IF EXISTS "Admins can insert logs" ON admin_logs;
DROP POLICY IF EXISTS "Admins can view and manage admin logs" ON admin_logs;

DROP POLICY IF EXISTS "Admins can manage all applications" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can view all scholarship applications" ON scholarship_applications;

DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage user profiles" ON user_profiles;

DROP POLICY IF EXISTS "Admins can view all scholarships" ON scholarships;

DROP POLICY IF EXISTS "Admins can view all universities" ON universities;
DROP POLICY IF EXISTS "Admins can update all universities" ON universities;
DROP POLICY IF EXISTS "Admins can delete all universities" ON universities;

-- Recreate admin policies using is_admin() function

-- Admin logs policies
CREATE POLICY "Admins can view all admin logs"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert admin logs"
  ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update admin logs"
  ON admin_logs
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete admin logs"
  ON admin_logs
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Scholarship applications policies
CREATE POLICY "Admins can view all scholarship applications"
  ON scholarship_applications
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all scholarship applications"
  ON scholarship_applications
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert scholarship applications"
  ON scholarship_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete scholarship applications"
  ON scholarship_applications
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- User profiles policies
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Scholarships policies
CREATE POLICY "Admins can view all scholarships"
  ON scholarships
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all scholarships"
  ON scholarships
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert scholarships"
  ON scholarships
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete scholarships"
  ON scholarships
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Universities policies
CREATE POLICY "Admins can view all universities"
  ON universities
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all universities"
  ON universities
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert universities"
  ON universities
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete universities"
  ON universities
  FOR DELETE
  TO authenticated
  USING (is_admin());