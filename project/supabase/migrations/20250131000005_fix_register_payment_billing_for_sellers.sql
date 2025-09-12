/*
  # Correção da Função register_payment_billing para Sellers
  
  Esta migração corrige a função register_payment_billing para considerar
  tanto códigos de referência tradicionais quanto seller_referral_codes.
*/

-- Função corrigida para registrar faturamento automaticamente
CREATE OR REPLACE FUNCTION register_payment_billing(
  user_id_param uuid,
  fee_type_param text,
  amount_param numeric,
  payment_session_id_param text DEFAULT NULL,
  payment_method_param text DEFAULT 'manual'
)
RETURNS void AS $$
DECLARE
  used_code_record record;
  seller_record record;
  referrer_id_found uuid;
  affiliate_code_found text;
BEGIN
  -- Primeiro, tentar buscar código de referência tradicional
  SELECT referrer_id, affiliate_code 
  INTO used_code_record
  FROM used_referral_codes 
  WHERE user_id = user_id_param 
  LIMIT 1;

  -- Se encontrou código de referência tradicional, usar ele
  IF FOUND AND used_code_record.referrer_id IS NOT NULL THEN
    referrer_id_found := used_code_record.referrer_id;
    affiliate_code_found := used_code_record.affiliate_code;
    
    -- Log para debug
    RAISE NOTICE 'Usando código de referência tradicional: user_id=%, referrer_id=%, affiliate_code=%', 
      user_id_param, referrer_id_found, affiliate_code_found;
  ELSE
    -- Se não encontrou código tradicional, tentar seller_referral_code
    SELECT s.user_id as referrer_id, s.referral_code as affiliate_code
    INTO seller_record
    FROM user_profiles up
    JOIN sellers s ON up.seller_referral_code = s.referral_code
    WHERE up.user_id = user_id_param 
      AND up.seller_referral_code IS NOT NULL
      AND s.is_active = true
    LIMIT 1;

    -- Se encontrou seller_referral_code, usar ele
    IF FOUND AND seller_record.referrer_id IS NOT NULL THEN
      referrer_id_found := seller_record.referrer_id;
      affiliate_code_found := seller_record.affiliate_code;
      
      -- Log para debug
      RAISE NOTICE 'Usando seller_referral_code: user_id=%, referrer_id=%, affiliate_code=%', 
        user_id_param, referrer_id_found, affiliate_code_found;
    END IF;
  END IF;

  -- Se encontrou algum tipo de código de referência, registrar no faturamento
  IF referrer_id_found IS NOT NULL THEN
    -- Registrar na tabela affiliate_referrals para faturamento
    INSERT INTO affiliate_referrals (
      referrer_id,
      referred_id,
      affiliate_code,
      payment_amount,
      credits_earned,
      status,
      payment_session_id,
      completed_at
    ) VALUES (
      referrer_id_found,
      user_id_param,
      affiliate_code_found,
      amount_param,
      CASE 
        WHEN fee_type_param = 'selection_process' THEN 180
        WHEN fee_type_param = 'scholarship_fee' THEN 200
        WHEN fee_type_param = 'i20_control_fee' THEN 150
        ELSE 0
      END,
      'completed',
      payment_session_id_param,
      NOW()
    ) ON CONFLICT (referred_id) DO UPDATE SET
      payment_amount = affiliate_referrals.payment_amount + amount_param,
      updated_at = NOW();
    
    -- Log para debug
    RAISE NOTICE 'Faturamento registrado: user_id=%, fee_type=%, amount=%, referrer_id=%', 
      user_id_param, fee_type_param, amount_param, referrer_id_found;
  ELSE
    -- Log quando não há código de referência
    RAISE NOTICE 'Usuário % não tem código de referência (tradicional ou seller), não há faturamento para registrar', user_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) IS 
'Registra automaticamente pagamentos na tabela affiliate_referrals para faturamento quando uma taxa é marcada como paga. Considera tanto códigos de referência tradicionais quanto seller_referral_codes.';

-- Grant de permissões
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO service_role;
