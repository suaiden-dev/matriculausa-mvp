-- Migration: Create Direct Sales Seller for dayle9260@uorak.com
-- This creates a virtual seller with referral_code 'SUAIDEN' for direct sales from admin advertisements
-- Package 3 will be automatically applied to students who register with this code

DO $$
DECLARE
  target_admin_id uuid;
  target_user_id uuid;
  existing_seller_id uuid;
  admin_email text := 'dayle9260@uorak.com';
  seller_referral_code text := 'SUAIDEN';
  seller_email text := 'direct-sales-dayle@matriculausa.com'; -- Email único para seller virtual
BEGIN
  -- 1. Find the affiliate admin by email
  SELECT aa.id, aa.user_id
  INTO target_admin_id, target_user_id
  FROM affiliate_admins aa
  JOIN auth.users au ON aa.user_id = au.id
  WHERE au.email = admin_email
  AND aa.is_active = true
  LIMIT 1;

  -- Check if admin exists
  IF target_admin_id IS NULL THEN
    RAISE EXCEPTION 'Affiliate admin with email % not found or is inactive', admin_email;
  END IF;

  -- 2. Check if seller with referral_code 'SUAIDEN' already exists
  SELECT id INTO existing_seller_id
  FROM sellers
  WHERE referral_code = seller_referral_code
  LIMIT 1;

  -- 3. If seller doesn't exist, create it
  -- Note: user_id is left NULL for virtual sellers since it has UNIQUE constraint
  -- The seller is tracked via affiliate_admin_id instead
  -- Email is unique, so we use a specific email for the virtual seller
  IF existing_seller_id IS NULL THEN
    -- Check if email already exists (shouldn't, but safety check)
    IF EXISTS (SELECT 1 FROM sellers WHERE email = seller_email) THEN
      RAISE EXCEPTION 'Email % already exists in sellers table', seller_email;
    END IF;
    
    INSERT INTO sellers (
      affiliate_admin_id,
      name,
      email,
      referral_code,
      is_active,
      commission_rate,
      created_at,
      updated_at
    ) VALUES (
      target_admin_id,
      'Direct Sales',
      seller_email,
      seller_referral_code,
      true,
      0.1000, -- 10% default commission rate
      now(),
      now()
    );

    RAISE NOTICE 'Direct Sales seller created successfully for admin % with referral_code %', admin_email, seller_referral_code;
  ELSE
    -- Verify the existing seller belongs to the correct admin
    IF existing_seller_id IN (
      SELECT id FROM sellers 
      WHERE affiliate_admin_id = target_admin_id 
      AND referral_code = seller_referral_code
    ) THEN
      RAISE NOTICE 'Direct Sales seller already exists for admin % with referral_code %', admin_email, seller_referral_code;
    ELSE
      RAISE EXCEPTION 'Seller with referral_code % already exists but belongs to a different admin', seller_referral_code;
    END IF;
  END IF;

END $$;

-- Add comment for documentation
COMMENT ON TABLE sellers IS 'Stores information about sellers. Direct Sales sellers are virtual sellers created for affiliate admins to track direct sales from advertisements.';

