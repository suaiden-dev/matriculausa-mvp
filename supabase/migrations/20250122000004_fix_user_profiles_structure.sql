-- Migration: Fix user_profiles table structure
-- This migration ensures the user_profiles table has all necessary columns and constraints

-- First, let's check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    country TEXT,
    field_of_interest TEXT,
    academic_level TEXT,
    gpa DECIMAL(3,2),
    english_proficiency TEXT,
    status TEXT DEFAULT 'active',
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_application_fee_paid BOOLEAN DEFAULT false,
    has_paid_selection_process_fee BOOLEAN DEFAULT false,
    has_paid_i20_control_fee BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    role VARCHAR(50) DEFAULT 'student',
    stripe_customer_id TEXT,
    stripe_payment_intent_id TEXT,
    university_id UUID,
    documents_status TEXT DEFAULT 'pending',
    documents_uploaded BOOLEAN DEFAULT false,
    selected_scholarship_id UUID,
    has_paid_college_enrollment_fee BOOLEAN DEFAULT false,
    avatar_url TEXT,
    affiliate_code VARCHAR(255),
    seller_referral_code VARCHAR(255),
    scholarship_package_id UUID,
    dependents INTEGER DEFAULT 0,
    desired_scholarship_range INTEGER
);

-- Add any missing columns
DO $$
BEGIN
    -- Add dependents column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'dependents'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN dependents INTEGER DEFAULT 0;
    END IF;

    -- Add desired_scholarship_range column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'desired_scholarship_range'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN desired_scholarship_range INTEGER;
    END IF;

    -- Add scholarship_package_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'scholarship_package_id'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN scholarship_package_id UUID;
    END IF;

    -- Add seller_referral_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'seller_referral_code'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN seller_referral_code VARCHAR(255);
    END IF;

    -- Add affiliate_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'affiliate_code'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN affiliate_code VARCHAR(255);
    END IF;

    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN role VARCHAR(50) DEFAULT 'student';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    -- Policy for users to view their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" 
            ON public.user_profiles FOR SELECT 
            USING (auth.uid() = user_id);
    END IF;

    -- Policy for users to insert their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" 
            ON public.user_profiles FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Policy for users to update their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" 
            ON public.user_profiles FOR UPDATE 
            USING (auth.uid() = user_id);
    END IF;

    -- Policy for trigger to insert user profiles
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


