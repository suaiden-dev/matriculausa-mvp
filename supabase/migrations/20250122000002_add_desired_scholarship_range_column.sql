-- Migration: Add desired_scholarship_range column to user_profiles table
-- This column stores the desired scholarship range for students

-- Add the desired_scholarship_range column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'desired_scholarship_range'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN desired_scholarship_range INTEGER;
    
    -- Add a comment to explain the column
    COMMENT ON COLUMN public.user_profiles.desired_scholarship_range IS 'The desired scholarship range amount for the student';
  END IF;
END $$;



