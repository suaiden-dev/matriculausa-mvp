-- Add onboarding_completed field to user_profiles table
-- This field tracks whether a student has completed the onboarding process

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN public.user_profiles.onboarding_completed IS 'Indicates whether the student has completed the onboarding process. Used to redirect new students to onboarding page.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON public.user_profiles(onboarding_completed) WHERE onboarding_completed = FALSE;

