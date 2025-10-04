-- Migration: Add system_type to affiliate_admins table
-- This separates legacy system (Matheus) from simplified system (new admins)

-- Add system_type column to affiliate_admins
ALTER TABLE affiliate_admins 
ADD COLUMN system_type TEXT DEFAULT 'legacy' 
CHECK (system_type IN ('legacy', 'simplified'));

-- Mark Matheus Brant as legacy system (preserve current functionality)
UPDATE affiliate_admins 
SET system_type = 'legacy' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contato@brantimmigration.com');

-- Mark merari380@uorak.com as legacy system for testing
UPDATE affiliate_admins 
SET system_type = 'legacy' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'merari380@uorak.com');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_affiliate_admins_system_type ON affiliate_admins(system_type);

-- Add comment for documentation
COMMENT ON COLUMN affiliate_admins.system_type IS 'System type: legacy (current system with packages) or simplified (new system with fixed values)';

-- Create function to get system type
CREATE OR REPLACE FUNCTION get_affiliate_admin_system_type(admin_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(system_type, 'legacy') 
    FROM affiliate_admins 
    WHERE user_id = admin_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_affiliate_admin_system_type(UUID) TO authenticated;

-- Add comment for function
COMMENT ON FUNCTION get_affiliate_admin_system_type(UUID) IS 'Returns system type for an affiliate admin: legacy or simplified';
