-- Migration: Create Seller Registration Functions
-- This creates the necessary functions for seller registration code management

-- Function to create a new seller registration code
CREATE OR REPLACE FUNCTION create_seller_registration_code(
  affiliate_admin_id_param uuid
)
RETURNS json AS $$
DECLARE
  new_code text;
  code_id uuid;
  result json;
BEGIN
  -- Generate a unique code (8 characters: 4 letters + 4 numbers)
  new_code := 'SELL' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
  
  -- Check if code already exists
  WHILE EXISTS(SELECT 1 FROM seller_registration_codes WHERE code = new_code) LOOP
    new_code := 'SELL' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
  END LOOP;
  
  -- Insert the new code
  INSERT INTO seller_registration_codes (
    code, 
    affiliate_admin_id, 
    is_active, 
    max_uses, 
    expires_at
  ) VALUES (
    new_code,
    affiliate_admin_id_param,
    true,
    10,
    now() + interval '1 year'
  ) RETURNING id INTO code_id;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'code', new_code,
    'id', code_id,
    'message', 'Registration code created successfully'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create registration code'
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_seller_registration_code(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_seller_registration_code(uuid) IS 'Creates a new unique seller registration code for affiliate admins';
