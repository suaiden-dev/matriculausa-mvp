/*
  # Atualização do registro de pagamento para cálculo dinâmico de comissão

  Esta migração atualiza a função register_payment_billing para:
  1. Identificar o ID da agência (affiliate_admin_id) responsável pela indicação.
  2. Ler a coluna commission_rules (JSONB) da agência correspondente.
  3. Mapear o tipo de taxa paga (selection_process, scholarship, etc) para a regra correspondente.
  4. Calcular a comissão baseada no tipo ('fixed' ou 'percentage').
  5. Acumular o 'commission_amount' calculado na tabela affiliate_referrals.
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
  agency_id_found uuid;
  rules jsonb;
  calc_commission numeric := 0;
  fee_key text;
  rule_type text;
  rule_value numeric;
BEGIN
  -- 1. Atualizar flags de pagamento e timestamps no user_profiles
  IF fee_type_param = 'selection_process' THEN
    UPDATE user_profiles 
    SET 
        has_paid_selection_process_fee = true,
        selection_process_paid_at = COALESCE(selection_process_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'application_fee' THEN
    UPDATE user_profiles 
    SET 
        is_application_fee_paid = true,
        application_fee_paid_at = COALESCE(application_fee_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'scholarship_fee' THEN
    UPDATE user_profiles 
    SET 
        scholarship_fee_paid_at = COALESCE(scholarship_fee_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'i20_control_fee' THEN
    UPDATE user_profiles 
    SET 
        has_paid_i20_control_fee = true,
        i20_paid_at = COALESCE(i20_paid_at, NOW())
    WHERE user_id = user_id_param;
  END IF;

  -- 2. Tentar buscar código de referência tradicional (B2C)
  SELECT referrer_id, affiliate_code 
  INTO used_code_record
  FROM used_referral_codes 
  WHERE user_id = user_id_param 
  LIMIT 1;

  IF FOUND AND used_code_record.referrer_id IS NOT NULL THEN
    referrer_id_found := used_code_record.referrer_id;
    affiliate_code_found := used_code_record.affiliate_code;
    -- Verifica se esse parceiro também possui uma conta de agência (B2B)
    SELECT id INTO agency_id_found FROM affiliate_admins WHERE user_id = referrer_id_found;
  ELSE
    -- 3. Se não, buscar código de um seller de agência
    SELECT s.user_id as referrer_id, s.referral_code as affiliate_code, s.affiliate_admin_id
    INTO seller_record
    FROM user_profiles up
    JOIN sellers s ON up.seller_referral_code = s.referral_code
    WHERE up.user_id = user_id_param 
      AND up.seller_referral_code IS NOT NULL
      AND s.is_active = true
    LIMIT 1;

    IF FOUND AND seller_record.referrer_id IS NOT NULL THEN
      referrer_id_found := seller_record.referrer_id;
      affiliate_code_found := seller_record.affiliate_code;
      agency_id_found := seller_record.affiliate_admin_id;
    END IF;
  END IF;

  -- 4. Se encontrou uma indicação, processa faturamento e comissão
  IF referrer_id_found IS NOT NULL THEN
    -- Mapear fee_type_param para a chave de regra do JSON
    fee_key := CASE fee_type_param
      WHEN 'selection_process' THEN 'selection_process'
      WHEN 'application_fee' THEN 'application'
      WHEN 'scholarship_fee' THEN 'scholarship'
      WHEN 'i20_control_fee' THEN 'i20_control'
      ELSE NULL
    END;

    -- Calcular comissão flexível
    IF agency_id_found IS NOT NULL AND fee_key IS NOT NULL THEN
      SELECT commission_rules INTO rules FROM affiliate_admins WHERE id = agency_id_found;
      
      IF rules IS NOT NULL AND rules ? fee_key THEN
        rule_type := rules -> fee_key ->> 'type';
        rule_value := (rules -> fee_key ->> 'value')::numeric;
        
        IF rule_type = 'fixed' THEN
          calc_commission := rule_value;
        ELSIF rule_type = 'percentage' THEN
          calc_commission := (amount_param * rule_value) / 100.0;
        END IF;
      END IF;
    END IF;

    -- 5. Gravar registro ou atualizar valores acumulados
    INSERT INTO affiliate_referrals (
      referrer_id,
      referred_id,
      affiliate_code,
      payment_amount,
      commission_amount,
      credits_earned,
      status,
      payment_session_id,
      completed_at
    ) VALUES (
      referrer_id_found,
      user_id_param,
      affiliate_code_found,
      amount_param,
      calc_commission,
      0, 
      'completed',
      payment_session_id_param,
      NOW()
    ) ON CONFLICT (referred_id) DO UPDATE SET
      payment_amount = affiliate_referrals.payment_amount + amount_param,
      commission_amount = COALESCE(affiliate_referrals.commission_amount, 0) + calc_commission,
      last_status_update = NOW();
    
    RAISE NOTICE 'Faturamento registrado: fee=%, amount=%, commission=%', 
      fee_type_param, amount_param, calc_commission;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
