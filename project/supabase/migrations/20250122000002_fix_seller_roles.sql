/*
  # Fix Seller Roles
  
  This migration fixes users who are active sellers but have incorrect roles
  in their user_profiles table.
  
  1. Update user_profiles.role to 'seller' for users who are active sellers
  2. Ensure consistency between sellers table and user_profiles table
*/

-- Update user_profiles to set role = 'seller' for users who are active sellers
UPDATE user_profiles 
SET role = 'seller', updated_at = now()
WHERE user_id IN (
  SELECT s.user_id 
  FROM sellers s 
  WHERE s.is_active = true
)
AND (role != 'seller' OR role IS NULL);

-- Log the changes
INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid, -- system user
  'fix_seller_roles',
  'user_profiles',
  up.user_id,
  jsonb_build_object(
    'old_role', up.role,
    'new_role', 'seller',
    'fixed_at', now(),
    'reason', 'User is active seller but had incorrect role'
  )
FROM user_profiles up
JOIN sellers s ON up.user_id = s.user_id
WHERE s.is_active = true
AND up.role = 'seller';

-- Add comment
COMMENT ON TABLE user_profiles IS 'User profile information - role should match seller status when applicable';
