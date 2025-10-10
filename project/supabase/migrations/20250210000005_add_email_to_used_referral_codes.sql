-- Migration: Add email column to used_referral_codes table
-- This ensures the student email is saved when they use a referral code

-- Add email column to used_referral_codes table
ALTER TABLE used_referral_codes 
ADD COLUMN email text;

-- Add comment to explain the column
COMMENT ON COLUMN used_referral_codes.email IS 'Email of the student who used the referral code';

-- Update the validate_and_apply_referral_code function to include email
CREATE OR REPLACE FUNCTION validate_and_apply_referral_code(
  user_id_param uuid,
  affiliate_code_param text,
  email_param text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  referrer_user_id uuid;
  discount_amount numeric := 50.00;
  stripe_coupon_id text;
  normalized_code text;
  existing_used record;
BEGIN
  normalized_code := upper(trim(affiliate_code_param));

  -- Se já usou este mesmo código, retorna sucesso idempotente
  SELECT * INTO existing_used
  FROM used_referral_codes
  WHERE user_id = user_id_param AND upper(affiliate_code) = normalized_code
  LIMIT 1;

  IF found THEN
    -- Se o registro existe mas não tem email, atualizar com o email fornecido
    IF existing_used.email IS NULL AND email_param IS NOT NULL THEN
      UPDATE used_referral_codes 
      SET email = email_param, updated_at = now()
      WHERE id = existing_used.id;
    END IF;
    
    RETURN json_build_object(
      'success', true,
      'referrer_id', existing_used.referrer_id,
      'discount_amount', existing_used.discount_amount,
      'stripe_coupon_id', existing_used.stripe_coupon_id,
      'affiliate_code', existing_used.affiliate_code
    );
  END IF;

  -- Verifica se o código existe e está ativo (case-insensitive)
  SELECT user_id INTO referrer_user_id
  FROM affiliate_codes
  WHERE upper(code) = normalized_code AND is_active = true;

  IF referrer_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código de referência inválido');
  END IF;

  -- Bloqueia auto-referência
  IF referrer_user_id = user_id_param THEN
    RETURN json_build_object('success', false, 'error', 'Não é possível usar seu próprio código de referência');
  END IF;

  -- Se já usou algum código diferente, bloqueia
  IF EXISTS(SELECT 1 FROM used_referral_codes WHERE user_id = user_id_param) THEN
    RETURN json_build_object('success', false, 'error', 'Você já utilizou um código de referência');
  END IF;

  -- Cupom genérico por affiliate_code
  stripe_coupon_id := 'MATR_' || normalized_code;

  INSERT INTO used_referral_codes (
    user_id,
    affiliate_code,
    referrer_id,
    discount_amount,
    stripe_coupon_id,
    status,
    applied_at,
    email
  ) VALUES (
    user_id_param,
    normalized_code,
    referrer_user_id,
    discount_amount,
    stripe_coupon_id,
    'applied',
    now(),
    email_param
  );

  RETURN json_build_object(
    'success', true,
    'referrer_id', referrer_user_id,
    'discount_amount', discount_amount,
    'stripe_coupon_id', stripe_coupon_id,
    'affiliate_code', normalized_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_and_apply_referral_code(uuid, text, text) TO authenticated, service_role;

-- Add comment to the function
COMMENT ON FUNCTION validate_and_apply_referral_code(uuid, text, text) IS 'Validates and applies referral code, now includes student email for tracking';
