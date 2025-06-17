/*
  # Fix user signup database error

  1. Database Trigger Setup
    - Create or replace the handle_new_user trigger function
    - Set up trigger on auth.users to automatically create user_profiles entry
    - Handle user metadata properly from signup process

  2. Security
    - Ensure RLS policies allow the trigger to insert data
    - Maintain existing security constraints

  3. Data Handling
    - Extract name and role from user metadata
    - Set appropriate defaults for missing fields
    - Handle both student and university registrations
*/

-- Create or replace the trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into user_profiles table when a new user is created
  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    phone,
    country,
    field_of_interest,
    academic_level,
    status,
    last_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    COALESCE(NEW.raw_user_meta_data->>'fieldOfInterest', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'student' THEN 'undergraduate'
      ELSE NULL
    END,
    'active',
    NOW(),
    NOW(),
    NOW()
  );

  -- If the user is registering as a university, create a universities entry
  IF NEW.raw_user_meta_data->>'role' = 'school' THEN
    INSERT INTO public.universities (
      user_id,
      name,
      description,
      location,
      website,
      contact,
      is_approved,
      profile_completed,
      terms_accepted,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'universityName', 'Unnamed University'),
      'University profile created during registration',
      COALESCE(NEW.raw_user_meta_data->>'location', ''),
      COALESCE(NEW.raw_user_meta_data->>'website', ''),
      jsonb_build_object(
        'name', COALESCE(NEW.raw_user_meta_data->>'name', ''),
        'position', COALESCE(NEW.raw_user_meta_data->>'position', ''),
        'email', NEW.email
      ),
      false, -- needs admin approval
      false, -- profile not completed yet
      false, -- terms not accepted yet
      NOW(),
      NOW()
    );
  END IF;

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
      ON user_profiles
      FOR INSERT
      TO authenticated, anon
      WITH CHECK (true);
  END IF;
END $$;

-- Add a policy that allows the trigger to insert universities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'universities' 
    AND policyname = 'Allow trigger to insert universities'
  ) THEN
    CREATE POLICY "Allow trigger to insert universities"
      ON universities
      FOR INSERT
      TO authenticated, anon
      WITH CHECK (true);
  END IF;
END $$;