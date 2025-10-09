-- Migration: Add system_type to user_profiles and create function to inherit seller system type
-- This allows students to inherit the system type from their referring seller

-- Add system_type column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN system_type TEXT DEFAULT 'legacy' 
CHECK (system_type IN ('legacy', 'simplified'));

-- Create function to get seller system type by referral code
CREATE OR REPLACE FUNCTION get_seller_system_type_by_referral_code(referral_code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(aa.system_type, 'legacy')
    FROM sellers s
    JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
    WHERE s.referral_code = referral_code
    AND s.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_seller_system_type_by_referral_code(TEXT) TO authenticated, anon;

-- Add comment for function
COMMENT ON FUNCTION get_seller_system_type_by_referral_code(TEXT) IS 'Returns the system type (legacy or simplified) of the seller associated with a referral code';

-- Create function to update user system type based on seller referral code
CREATE OR REPLACE FUNCTION update_user_system_type_from_seller()
RETURNS TRIGGER AS $$
DECLARE
  seller_system_type TEXT;
BEGIN
  -- Only update if seller_referral_code is provided and not null
  IF NEW.seller_referral_code IS NOT NULL AND NEW.seller_referral_code != '' THEN
    -- Get the system type of the seller
    SELECT get_seller_system_type_by_referral_code(NEW.seller_referral_code) INTO seller_system_type;
    
    -- Update the user's system type to match the seller's system type
    IF seller_system_type IS NOT NULL THEN
      NEW.system_type := seller_system_type;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set system type when user is created
CREATE OR REPLACE TRIGGER set_user_system_type_trigger
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_system_type_from_seller();

-- Update existing users who have seller_referral_code to inherit the system type
UPDATE user_profiles 
SET system_type = get_seller_system_type_by_referral_code(seller_referral_code)
WHERE seller_referral_code IS NOT NULL 
AND seller_referral_code != ''
AND system_type = 'legacy';
