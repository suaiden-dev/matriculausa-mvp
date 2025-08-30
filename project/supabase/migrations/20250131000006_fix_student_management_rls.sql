/*
  # Fix Student Management RLS Policies

  1. Problem
    - Universities cannot see students due to RLS policy issues
    - The is_admin() function may not be working correctly
    - Policies for scholarship_applications need to be fixed

  2. Solution
    - Drop and recreate problematic RLS policies
    - Ensure universities can see applications for their scholarships
    - Fix admin access policies
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "University owners can view applications for their scholarships" ON scholarship_applications;
DROP POLICY IF EXISTS "University owners can update applications for their scholarships" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can view all scholarship applications" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can update all scholarship applications" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can insert scholarship applications" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can delete scholarship applications" ON scholarship_applications;

-- Recreate university policies for scholarship_applications
CREATE POLICY "University owners can view applications for their scholarships"
  ON scholarship_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scholarships s
      JOIN universities u ON s.university_id = u.id
      WHERE s.id = scholarship_applications.scholarship_id
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "University owners can update applications for their scholarships"
  ON scholarship_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scholarships s
      JOIN universities u ON s.university_id = u.id
      WHERE s.id = scholarship_applications.scholarship_id
      AND u.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scholarships s
      JOIN universities u ON s.university_id = u.id
      WHERE s.id = scholarship_applications.scholarship_id
      AND u.user_id = auth.uid()
    )
  );

-- Recreate admin policies for scholarship_applications
CREATE POLICY "Admins can view all scholarship applications"
  ON scholarship_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all scholarship applications"
  ON scholarship_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert scholarship applications"
  ON scholarship_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete scholarship applications"
  ON scholarship_applications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Ensure students can still see their own applications
CREATE POLICY "Students can view their own applications"
  ON scholarship_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own applications"
  ON scholarship_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Fix user_profiles policies for admin access
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all user profiles" ON user_profiles;

CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all user profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Ensure RLS is enabled on all relevant tables
ALTER TABLE scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON scholarship_applications TO authenticated;
GRANT SELECT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, UPDATE ON scholarships TO authenticated;
GRANT SELECT, UPDATE ON universities TO authenticated;
