-- Migration: Add handle_new_user trigger function
-- This trigger automatically creates a user profile when a new user signs up

-- Create or replace the trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into user_profiles table when a new user is created
  INSERT INTO public.user_profiles (
    user_id,
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

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the trigger function has the right permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Add a policy that allows the trigger to insert into user_profiles
-- This is needed because the trigger runs with the user's permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Allow trigger to insert user profiles'
  ) THEN
    CREATE POLICY "Allow trigger to insert user profiles" 
      ON public.user_profiles FOR INSERT 
      WITH CHECK (true);
  END IF;
END $$;



