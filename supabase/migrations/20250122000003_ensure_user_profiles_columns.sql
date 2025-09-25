-- Migration: Ensure all necessary columns exist in user_profiles table
-- This migration adds any missing columns that might be causing the registration error

-- Add dependents column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'dependents'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN dependents INTEGER DEFAULT 0;
    
    COMMENT ON COLUMN public.user_profiles.dependents IS 'Number of dependents for the student';
  END IF;
END $$;

-- Add desired_scholarship_range column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'desired_scholarship_range'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN desired_scholarship_range INTEGER;
    
    COMMENT ON COLUMN public.user_profiles.desired_scholarship_range IS 'The desired scholarship range amount for the student';
  END IF;
END $$;

-- Add scholarship_package_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'scholarship_package_id'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN scholarship_package_id UUID REFERENCES scholarship_packages(id);
    
    COMMENT ON COLUMN public.user_profiles.scholarship_package_id IS 'Reference to the scholarship package selected by the student';
  END IF;
END $$;

-- Add seller_referral_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'seller_referral_code'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN seller_referral_code VARCHAR(255);
    
    COMMENT ON COLUMN public.user_profiles.seller_referral_code IS 'Referral code from the seller who referred this student';
  END IF;
END $$;

-- Add affiliate_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'affiliate_code'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN affiliate_code VARCHAR(255);
    
    COMMENT ON COLUMN public.user_profiles.affiliate_code IS 'Affiliate code used during registration';
  END IF;
END $$;

-- Add role column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN role VARCHAR(50) DEFAULT 'student';
    
    COMMENT ON COLUMN public.user_profiles.role IS 'User role: student, school, admin, affiliate_admin, seller';
  END IF;
END $$;



