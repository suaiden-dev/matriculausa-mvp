-- Migration: Fix user profile creation trigger to include referral codes
-- This ensures that seller_referral_code and affiliate_code are properly saved

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (
    user_id, 
    full_name, 
    status,
    phone,
    affiliate_code,
    seller_referral_code,
    system_type
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'active',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'affiliate_code',
    NEW.raw_user_meta_data->>'seller_referral_code',
    'legacy' -- Default system type, will be updated by trigger if seller_referral_code exists
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment
COMMENT ON FUNCTION handle_new_user() IS 'Creates user profile automatically when user signs up, including referral codes and phone';
