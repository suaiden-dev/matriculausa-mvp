-- Migration: Add seller_referral_code column to user_profiles table
-- This allows tracking which seller referred a student, separate from Matricula Rewards

-- Add seller_referral_code column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'seller_referral_code'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN seller_referral_code TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.seller_referral_code IS 'Referral code from a seller (different from Matricula Rewards affiliate code)';
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_seller_referral_code 
ON user_profiles(seller_referral_code);

-- Add policy to allow public read access to sellers table for referral code validation
-- This is necessary for the registration form to validate seller referral codes
CREATE POLICY "Enable read access for referral code validation"
  ON sellers
  FOR SELECT
  TO public
  USING (is_active = true);

-- Add policy to allow public read access to affiliate_codes table for referral code validation
-- This is necessary for the registration form to validate Matricula Rewards codes
CREATE POLICY "Enable read access for affiliate code validation"
  ON affiliate_codes
  FOR SELECT
  TO public
  USING (is_active = true);

-- Create affiliate_admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS affiliate_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for affiliate_admins
ALTER TABLE affiliate_admins ENABLE ROW LEVEL SECURITY;

-- Create policies for affiliate_admins
CREATE POLICY "Affiliate admins can view their own data"
  ON affiliate_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Affiliate admins can update their own data"
  ON affiliate_admins
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Affiliate admins can insert their own data"
  ON affiliate_admins
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for affiliate_admins
CREATE INDEX IF NOT EXISTS idx_affiliate_admins_user_id ON affiliate_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_admins_email ON affiliate_admins(email);
CREATE INDEX IF NOT EXISTS idx_affiliate_admins_is_active ON affiliate_admins(is_active);

-- Create updated_at trigger for affiliate_admins
CREATE TRIGGER update_affiliate_admins_updated_at 
  BEFORE UPDATE ON affiliate_admins 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to promote user to seller (from affiliate admin dashboard)
CREATE OR REPLACE FUNCTION create_seller_from_user_profile(
  user_profile_id UUID,
  affiliate_admin_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_profile RECORD;
  affiliate_admin_record RECORD;
  generated_referral_code TEXT;
  seller_id UUID;
BEGIN
  -- Get user profile information
  SELECT * INTO target_user_profile 
  FROM user_profiles 
  WHERE id = user_profile_id;
  
  IF target_user_profile IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'User profile not found'
    );
  END IF;
  
  -- Verify user has affiliate admin role
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = affiliate_admin_user_id 
    AND role = 'affiliate_admin' 
    AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'User does not have affiliate admin role or is inactive'
    );
  END IF;
  
  -- Get or create affiliate_admin record
  SELECT * INTO affiliate_admin_record 
  FROM affiliate_admins 
  WHERE user_id = affiliate_admin_user_id AND is_active = true;
  
  -- If affiliate_admin record doesn't exist, create it
  IF affiliate_admin_record IS NULL THEN
    SELECT email, raw_user_meta_data->>'name' as name, raw_user_meta_data->>'phone' as phone
    INTO affiliate_admin_record
    FROM auth.users 
    WHERE id = affiliate_admin_user_id;
    
    INSERT INTO affiliate_admins (user_id, email, name, phone, is_active)
    VALUES (
      affiliate_admin_user_id,
      affiliate_admin_record.email,
      COALESCE(affiliate_admin_record.name, 'Affiliate Admin'),
      affiliate_admin_record.phone,
      true
    ) RETURNING * INTO affiliate_admin_record;
  END IF;
  
  -- Check if user is already a seller
  IF EXISTS (SELECT 1 FROM sellers WHERE email = target_user_profile.email OR user_id = target_user_profile.user_id) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'User is already a seller'
    );
  END IF;
  
  -- Generate unique referral code
  generated_referral_code := 'SELLER_' || UPPER(substring(md5(random()::text) from 1 for 8));
  
  -- Ensure code is unique
  WHILE EXISTS (SELECT 1 FROM sellers WHERE referral_code = generated_referral_code) LOOP
    generated_referral_code := 'SELLER_' || UPPER(substring(md5(random()::text) from 1 for 8));
  END LOOP;
  
  -- Create seller record
  INSERT INTO sellers (
    user_id,
    email,
    name,
    phone,
    referral_code,
    is_active,
    affiliate_admin_id,
    commission_rate
  ) VALUES (
    target_user_profile.user_id,
    target_user_profile.email,
    target_user_profile.full_name,
    target_user_profile.phone,
    generated_referral_code,
    true,
    affiliate_admin_record.id,
    0.10
  ) RETURNING id INTO seller_id;
  
  -- Update user profile role to seller
  UPDATE user_profiles 
  SET role = 'seller', updated_at = now()
  WHERE id = user_profile_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'User successfully promoted to seller',
    'seller_id', seller_id,
    'referral_code', generated_referral_code
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Error creating seller: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_seller_from_user_profile(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE user_profiles IS 'User profiles with support for both Matricula Rewards and Seller referral codes';
