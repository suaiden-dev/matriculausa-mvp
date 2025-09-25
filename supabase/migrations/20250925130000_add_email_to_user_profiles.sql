-- Migration: Add email field to user_profiles and fix trigger
-- This migration adds the missing email field and updates the trigger to sync it

-- Add email column to user_profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN email TEXT;
    END IF;
END $$;

-- Create or replace the trigger function to handle new user creation with email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into user_profiles table when a new user is created
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    phone,
    status,
    role,
    -- Include referral codes if provided
    affiliate_code,
    seller_referral_code,
    scholarship_package_id,
    -- Persist dependents if provided during sign up
    dependents,
    -- Persist desired scholarship range if provided
    desired_scholarship_range,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email, -- Add email from auth.users
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'active',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'affiliate_code', NULL),
    COALESCE(NEW.raw_user_meta_data->>'seller_referral_code', NULL),
    CASE 
      WHEN NEW.raw_user_meta_data->>'scholarship_package_number' IS NOT NULL THEN
        (SELECT id FROM scholarship_packages 
         WHERE package_number = (NEW.raw_user_meta_data->>'scholarship_package_number')::integer 
         AND is_active = true 
         LIMIT 1)
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'dependents' IS NOT NULL THEN
        (NEW.raw_user_meta_data->>'dependents')::integer
      ELSE 0
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'desired_scholarship_range' IS NOT NULL THEN
        (NEW.raw_user_meta_data->>'desired_scholarship_range')::integer
      ELSE NULL
    END,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing user_profiles with email from auth.users where email is missing
UPDATE public.user_profiles 
SET email = auth_users.email,
    updated_at = NOW()
FROM auth.users AS auth_users
WHERE user_profiles.user_id = auth_users.id 
AND (user_profiles.email IS NULL OR user_profiles.email = '');

-- Create a trigger to sync email updates from auth.users to user_profiles
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in user_profiles when it's changed in auth.users
  UPDATE public.user_profiles 
  SET email = NEW.email,
      updated_at = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the operation
    RAISE LOG 'Error in sync_user_email trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;

-- Create the trigger on auth.users table for email updates
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_email();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_email() TO anon;