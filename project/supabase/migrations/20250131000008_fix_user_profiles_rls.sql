/*
  # Fix User Profiles RLS Policies

  1. Problem
    - Universities cannot see students due to RLS policy issues
    - The is_admin field vs role field inconsistency
    - Missing policies for universities to view student profiles

  2. Solution
    - Drop problematic RLS policies
    - Create new policies that allow universities to see students
    - Fix admin access policies
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all data" ON user_profiles;

-- Create new policies for user_profiles

-- Policy 1: Admins can view all profiles (using role field)
CREATE POLICY "Admins can view all profiles" ON user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() AND up.role = 'admin'
  )
);

-- Policy 2: Admins can manage all profiles (using role field)
CREATE POLICY "Admins can manage all profiles" ON user_profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() AND up.role = 'admin'
  )
);

-- Policy 3: Universities can view student profiles for their scholarships
CREATE POLICY "Universities can view student profiles" ON user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scholarship_applications sa
    JOIN scholarships s ON s.id = sa.scholarship_id
    JOIN universities u ON u.id = s.university_id
    WHERE sa.student_id = user_profiles.id 
    AND u.user_id = auth.uid()
  )
);

-- Policy 4: Affiliate admins can view student profiles they referred
CREATE POLICY "Affiliate admins can view referred student profiles" ON user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scholarship_applications sa
    WHERE sa.student_id = user_profiles.id 
    AND sa.affiliate_admin_id IN (
      SELECT aa.id FROM affiliate_admins aa 
      WHERE aa.user_id = auth.uid()
    )
  )
);

-- Policy 5: Sellers can view student profiles they referred
CREATE POLICY "Sellers can view referred student profiles" ON user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scholarship_applications sa
    WHERE sa.student_id = user_profiles.id 
    AND sa.seller_id IN (
      SELECT s.id FROM sellers s 
      WHERE s.user_id = auth.uid()
    )
  )
);

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
