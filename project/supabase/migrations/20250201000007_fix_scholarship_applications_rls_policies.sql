/*
  # Fix Scholarship Applications RLS Policies
  
  1. Problem
    - University owners cannot update scholarship applications
    - The old policies that query auth.users directly are still active
    - These policies conflict with the new is_admin() function approach
    - Result: updateData returns empty array (no rows updated)
  
  2. Solution
    - Drop all existing scholarship_applications policies
    - Recreate them with proper permissions
    - Ensure university owners can update applications for their scholarships
    - Ensure admins can manage all applications
    - Ensure students can manage their own applications
*/

-- Drop all existing scholarship_applications policies
DROP POLICY IF EXISTS "Students can view their own applications" ON scholarship_applications;
DROP POLICY IF EXISTS "Students can insert their own applications" ON scholarship_applications;
DROP POLICY IF EXISTS "University owners can view applications for their scholarships" ON scholarship_applications;
DROP POLICY IF EXISTS "University owners can update applications for their scholarships" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can view all scholarship applications" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can update all scholarship applications" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can insert scholarship applications" ON scholarship_applications;
DROP POLICY IF EXISTS "Admins can delete scholarship applications" ON scholarship_applications;

-- Recreate scholarship_applications policies with proper permissions

-- Student policies
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

CREATE POLICY "Students can update their own applications"
  ON scholarship_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- University owner policies
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

-- Admin policies (using is_admin() function)
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON scholarship_applications TO authenticated;
