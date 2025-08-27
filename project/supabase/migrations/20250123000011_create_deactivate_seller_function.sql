-- Migration: Create deactivate_seller_by_admin function
-- This function bypasses RLS policies to deactivate sellers

-- Drop function if it exists
DROP FUNCTION IF EXISTS deactivate_seller_by_admin(uuid, uuid);

-- Create the function that bypasses RLS
CREATE OR REPLACE FUNCTION deactivate_seller_by_admin(seller_id uuid, admin_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o admin tem permissão
  IF NOT EXISTS (
    SELECT 1 FROM affiliate_admins aa 
    WHERE aa.user_id = admin_user_id
  ) THEN
    RAISE EXCEPTION 'User is not an affiliate admin';
  END IF;

  -- Atualizar o seller (contorna RLS)
  UPDATE sellers 
  SET is_active = false 
  WHERE id = seller_id;
  
  -- Verificar se o update funcionou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller not found';
  END IF;
  
  -- Atualizar user_profiles
  UPDATE user_profiles 
  SET role = 'deactivated_seller' 
  WHERE user_id = seller_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION deactivate_seller_by_admin(uuid, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION deactivate_seller_by_admin(uuid, uuid) IS 'Deactivates a seller by bypassing RLS policies - requires affiliate admin permission';
