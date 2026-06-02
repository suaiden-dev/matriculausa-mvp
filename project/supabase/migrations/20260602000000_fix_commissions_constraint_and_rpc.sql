-- Migration: Fix commission constraint and register_payment_billing RPC

-- 1. Drop the unique constraint on (referred_id, fee_type)
ALTER TABLE affiliate_referrals 
  DROP CONSTRAINT IF EXISTS affiliate_referrals_referred_id_fee_type_key;

-- 2. Add unique constraint on referred_id
ALTER TABLE affiliate_referrals 
  ADD CONSTRAINT affiliate_referrals_referred_id_key UNIQUE (referred_id);

-- 3. Recreate register_payment_billing function
CREATE OR REPLACE FUNCTION register_payment_billing(
  user_id_param uuid,
  fee_type_param text,
  amount_param numeric,
  payment_session_id_param text DEFAULT NULL,
  payment_method_param text DEFAULT 'manual'
)
RETURNS void AS $$
DECLARE
  used_code_record     record;
  seller_record        record;
  agency_record        record;
  referrer_id_found    uuid;
  affiliate_code_found text;
  agency_id_found      uuid;

  rule_json            jsonb;
  rule_type            text;
  rule_value           numeric(10,2);
  rule_enabled         boolean;
  rule_trigger         text;
  computed_commission  numeric(10,2);

  normalized_fee_key   text;
  immediate_commission numeric(10,2) := 0;
  deferred_commission  numeric(10,2) := 0;
  is_last_fee          boolean := false;
BEGIN

  -- STEP 1: Atualizar flags de pagamento no user_profiles
  IF fee_type_param IN ('selection_process', 'selection_process_fee') THEN
    UPDATE user_profiles
    SET has_paid_selection_process_fee = true,
        selection_process_paid_at = COALESCE(selection_process_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'application_fee' THEN
    UPDATE user_profiles
    SET is_application_fee_paid = true,
        application_fee_paid_at = COALESCE(application_fee_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'placement_fee' THEN
    UPDATE user_profiles
    SET is_placement_fee_paid = true,
        placement_fee_paid_at = COALESCE(placement_fee_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param IN ('i20_control_fee', 'i20_control') THEN
    UPDATE user_profiles
    SET has_paid_i20_control_fee = true,
        i20_paid_at = COALESCE(i20_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'ds160_package' THEN
    UPDATE user_profiles
    SET has_paid_ds160_package = true
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'i539_cos_package' THEN
    UPDATE user_profiles
    SET has_paid_i539_cos_package = true
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'reinstatement_package' THEN
    UPDATE user_profiles
    SET is_reinstatement_paid = true,
        reinstatement_paid_at = COALESCE(reinstatement_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'scholarship_fee' THEN
    UPDATE user_profiles
    SET scholarship_fee_paid_at = COALESCE(scholarship_fee_paid_at, NOW())
    WHERE user_id = user_id_param;
  END IF;

  -- STEP 2: Resolver referrer (B2C via used_referral_codes ou seller B2B)
  SELECT referrer_id, affiliate_code
  INTO used_code_record
  FROM used_referral_codes
  WHERE user_id = user_id_param
  LIMIT 1;

  IF FOUND AND used_code_record.referrer_id IS NOT NULL THEN
    referrer_id_found    := used_code_record.referrer_id;
    affiliate_code_found := used_code_record.affiliate_code;
    SELECT id INTO agency_id_found FROM affiliate_admins WHERE user_id = referrer_id_found;
  ELSE
    SELECT s.user_id          AS referrer_id,
           s.referral_code    AS affiliate_code,
           s.affiliate_admin_id
    INTO seller_record
    FROM user_profiles up
    JOIN sellers s ON up.seller_referral_code = s.referral_code
    WHERE up.user_id = user_id_param
      AND up.seller_referral_code IS NOT NULL
      AND s.is_active = true
    LIMIT 1;

    IF FOUND THEN
      affiliate_code_found := seller_record.affiliate_code;
      agency_id_found      := seller_record.affiliate_admin_id;

      IF seller_record.referrer_id IS NOT NULL THEN
        referrer_id_found := seller_record.referrer_id;
      ELSIF seller_record.affiliate_admin_id IS NOT NULL THEN
        SELECT aa.user_id INTO referrer_id_found
        FROM affiliate_admins aa
        WHERE aa.id = seller_record.affiliate_admin_id
          AND aa.is_active = true;
      END IF;
    END IF;
  END IF;

  -- STEP 3: Mapear fee_type_param → chave de commission_rules
  normalized_fee_key := CASE fee_type_param
    WHEN 'selection_process'     THEN 'selection_process'
    WHEN 'selection_process_fee' THEN 'selection_process'
    WHEN 'application_fee'       THEN 'application'
    WHEN 'placement_fee'         THEN 'placement'
    WHEN 'reinstatement_package' THEN 'reinstatement'
    WHEN 'i20_control_fee'       THEN 'i20_control'
    WHEN 'i20_control'           THEN 'i20_control'
    WHEN 'ds160_package'         THEN 'i20_control'
    WHEN 'i539_cos_package'      THEN 'i20_control'
    WHEN 'scholarship_fee'       THEN 'placement'
    ELSE NULL
  END;

  is_last_fee := fee_type_param IN ('i20_control_fee', 'i20_control', 'ds160_package', 'i539_cos_package');

  -- STEP 4: Calcular comissão com lógica de trigger
  IF agency_id_found IS NOT NULL AND normalized_fee_key IS NOT NULL THEN
    SELECT commission_rules
    INTO agency_record
    FROM affiliate_admins
    WHERE id = agency_id_found AND is_active = true
    LIMIT 1;

    IF FOUND AND agency_record.commission_rules IS NOT NULL THEN
      rule_json := agency_record.commission_rules -> normalized_fee_key;

      IF rule_json IS NOT NULL THEN
        rule_type    := COALESCE(rule_json->>'type',               'fixed');
        rule_value   := COALESCE((rule_json->>'value')::numeric,   0);
        rule_enabled := COALESCE((rule_json->>'enabled')::boolean, true);
        rule_trigger := COALESCE(rule_json->>'trigger',            'on_payment');

        IF rule_enabled = true AND rule_value > 0 THEN
          computed_commission := CASE rule_type
            WHEN 'percentage' THEN ROUND((amount_param * rule_value / 100.0)::numeric, 2)
            ELSE rule_value
          END;

          IF rule_trigger = 'on_last_fee' THEN
            deferred_commission := computed_commission;
          ELSE
            immediate_commission := computed_commission;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- STEP 5: Upsert em affiliate_referrals (por referred_id único)
  IF referrer_id_found IS NOT NULL THEN
    INSERT INTO affiliate_referrals (
      referrer_id, referred_id, affiliate_code,
      payment_amount, credits_earned,
      commission_amount, pending_commission_amount,
      status, payment_session_id, completed_at,
      fee_type
    ) VALUES (
      referrer_id_found, user_id_param, affiliate_code_found,
      amount_param, 0,
      immediate_commission, deferred_commission,
      'completed', payment_session_id_param, NOW(),
      fee_type_param
    )
    ON CONFLICT (referred_id) DO UPDATE SET
      payment_amount            = affiliate_referrals.payment_amount + amount_param,
      commission_amount         = COALESCE(affiliate_referrals.commission_amount, 0)
                                  + immediate_commission
                                  + CASE WHEN is_last_fee
                                      THEN COALESCE(affiliate_referrals.pending_commission_amount, 0)
                                      ELSE 0
                                    END,
      pending_commission_amount = CASE WHEN is_last_fee
                                    THEN 0
                                    ELSE COALESCE(affiliate_referrals.pending_commission_amount, 0)
                                         + deferred_commission
                                  END,
      fee_type                  = fee_type_param,
      last_status_update        = NOW();

    RAISE NOTICE '[billing] user=% fee=% key=% amount=% imediato=% diferido=% ultima_taxa=%',
      user_id_param, fee_type_param, normalized_fee_key, amount_param,
      immediate_commission, deferred_commission, is_last_fee;
  ELSE
    RAISE NOTICE '[billing] SKIP: referrer_id_found is NULL for user=% fee=%',
      user_id_param, fee_type_param;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO service_role;
