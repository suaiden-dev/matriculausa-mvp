-- Fix RLS policies for student_notifications to allow system notifications
-- The current policy is too restrictive and prevents universities from notifying students

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own notifications" ON student_notifications;

-- Create a new policy that allows:
-- 1. Users to insert notifications for themselves
-- 2. System/service role to insert notifications for any student
CREATE POLICY "Allow notification creation" ON student_notifications
  FOR INSERT WITH CHECK (
    -- Allow users to create notifications for themselves
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = student_notifications.student_id 
      AND user_profiles.user_id = auth.uid()
    )
    OR
    -- Allow service role (system) to create notifications for any student
    auth.role() = 'service_role'
  );

-- Also create a policy for service role to insert notifications
CREATE POLICY "Service role can insert notifications" ON student_notifications
  FOR INSERT TO service_role
  WITH CHECK (true);
