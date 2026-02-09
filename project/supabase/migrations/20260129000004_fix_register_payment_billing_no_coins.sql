/*
  # Atualizar register_payment_billing para não creditar coins

  Esta migration atualiza a função register_payment_billing para:
  1. NÃO mais definir credits_earned baseado no tipo de pagamento
  2. Sempre usar 0 para credits_earned (os triggers cuidam disso agora)
  3. Manter o registro de faturamento para tracking
*/

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
    -- ✅ MUDANÇA: credits_earned agora é sempre 0 - os triggers cuidam de creditar coins
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
      0, -- ✅ Sempre 0 - triggers cuidam de creditar coins no momento certo
      'completed',
      payment_session_id_param,
      NOW()
    ) ON CONFLICT (referred_id) DO UPDATE SET
      payment_amount = affiliate_referrals.payment_amount + amount_param,
      last_status_update = NOW();
    
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
'Registra automaticamente pagamentos na tabela affiliate_referrals para faturamento quando uma taxa é marcada como paga. NÃO credita coins - isso é feito pelos triggers handle_i20_payment_rewards() e handle_selection_process_payment_tracking().';

-- Grant de permissões
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO service_role;
