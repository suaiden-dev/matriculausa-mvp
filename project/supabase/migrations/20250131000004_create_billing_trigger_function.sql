/*
  # Função para Registrar Faturamento Automaticamente
  
  Esta função registra automaticamente pagamentos na tabela affiliate_referrals
  quando uma taxa é marcada como paga, independentemente do método de pagamento.
*/

-- Função para registrar faturamento automaticamente
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
  referrer_id_found uuid;
  affiliate_code_found text;
BEGIN
  -- Buscar se o usuário usou algum código de referência
  SELECT referrer_id, affiliate_code 
  INTO used_code_record
  FROM used_referral_codes 
  WHERE user_id = user_id_param 
  LIMIT 1;

  -- Se encontrou código de referência, registrar no faturamento
  IF FOUND AND used_code_record.referrer_id IS NOT NULL THEN
    referrer_id_found := used_code_record.referrer_id;
    affiliate_code_found := used_code_record.affiliate_code;
    
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
    RAISE NOTICE 'Usuário % não usou código de referência, não há faturamento para registrar', user_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) IS 
'Registra automaticamente pagamentos na tabela affiliate_referrals para faturamento quando uma taxa é marcada como paga';

-- Grant de permissões
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO service_role;
