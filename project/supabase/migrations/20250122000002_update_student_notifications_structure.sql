-- Update student notifications table structure
-- Change from user_id (auth.users) to student_id (user_profiles)

-- First, drop existing constraints and indexes
ALTER TABLE student_notifications DROP CONSTRAINT IF EXISTS student_notifications_user_id_fkey;
DROP INDEX IF EXISTS idx_student_notifications_user_id;

-- Rename column from user_id to student_id
ALTER TABLE student_notifications RENAME COLUMN user_id TO student_id;

-- Change column type to match user_profiles.id (BIGINT)
ALTER TABLE student_notifications ALTER COLUMN student_id TYPE BIGINT;

-- Add foreign key constraint to user_profiles.id
ALTER TABLE student_notifications 
ADD CONSTRAINT student_notifications_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Create new index for student_id
CREATE INDEX idx_student_notifications_student_id ON student_notifications(student_id);

-- Update RLS policies to use student_id
DROP POLICY IF EXISTS "Users can view their own notifications" ON student_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON student_notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON student_notifications;

-- Create new RLS policies that check if the user has access to the student_id
CREATE POLICY "Users can view their own notifications" ON student_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = student_notifications.student_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications" ON student_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = student_notifications.student_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own notifications" ON student_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = student_notifications.student_id 
      AND user_profiles.user_id = auth.uid()
    )
  );
