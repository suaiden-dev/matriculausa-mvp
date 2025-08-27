-- Migration: Fix seller_referral_code validation in get_user_active_discount function
-- This prevents users with seller_referral_code from using Matricula Rewards codes

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_active_discount(uuid);

-- Recreate the function with seller_referral_code validation
CREATE OR REPLACE FUNCTION get_user_active_discount(user_id_param uuid)
RETURNS json AS $$
DECLARE
  discount_record record;
  user_has_seller_code boolean;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Checking discount for user: %', user_id_param;
  
  -- PRIMEIRO: Verificar se o usuário tem seller_referral_code
  SELECT EXISTS(
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_id_param 
    AND seller_referral_code IS NOT NULL 
    AND seller_referral_code != ''
  ) INTO user_has_seller_code;
  
  -- Se o usuário tem seller_referral_code, NÃO pode usar códigos de Matricula Rewards
  IF user_has_seller_code THEN
    RAISE NOTICE 'User % has seller_referral_code, cannot use Matricula Rewards codes', user_id_param;
    RETURN json_build_object(
      'has_discount', false,
      'blocked_reason', 'seller_referral_code_exists',
      'message', 'Usuários com código de vendedor não podem usar códigos de Matricula Rewards'
    );
  END IF;
  
  -- SEGUNDO: Verificar se há desconto ativo (apenas para usuários sem seller_referral_code)
  SELECT 
    urc.affiliate_code,
    urc.discount_amount,
    urc.stripe_coupon_id,
    urc.referrer_id,
    urc.applied_at,
    urc.expires_at,
    ac.code as referrer_code
  INTO discount_record
  FROM used_referral_codes urc
  LEFT JOIN affiliate_codes ac ON urc.referrer_id = ac.user_id
  WHERE urc.user_id = user_id_param 
    AND urc.status = 'applied'
    AND (urc.expires_at IS NULL OR urc.expires_at > now())
  ORDER BY urc.applied_at DESC
  LIMIT 1;
  
  -- Log para debug
  IF discount_record IS NULL THEN
    RAISE NOTICE 'No discount found for user: %', user_id_param;
    RETURN json_build_object('has_discount', false);
  ELSE
    RAISE NOTICE 'Discount found for user: % - coupon: %', user_id_param, discount_record.stripe_coupon_id;
  END IF;
  
  RETURN json_build_object(
    'has_discount', true,
    'affiliate_code', discount_record.affiliate_code,
    'discount_amount', discount_record.discount_amount,
    'stripe_coupon_id', discount_record.stripe_coupon_id,
    'referrer_id', discount_record.referrer_id,
    'referrer_code', discount_record.referrer_code,
    'applied_at', discount_record.applied_at,
    'expires_at', discount_record.expires_at
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_active_discount(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_active_discount(uuid) IS 'Get active discount for user, blocking users with seller_referral_code from using Matricula Rewards codes';
