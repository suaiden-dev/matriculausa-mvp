-- ============================================================
-- COMMISSION MIGRATION — Executar em ordem, bloco por bloco
-- Fee types atuais: selection_process, application, placement, i20_control
-- ============================================================

-- ============================================================
-- BLOCO 1: DIAGNÓSTICO (read-only — já executado, referência)
-- ============================================================

-- 1a. Ver commission_rules atuais de todas as agências
-- SELECT id, commission_rules FROM affiliate_admins ORDER BY created_at;

-- 1b. Confirmar schema atual de affiliate_referrals
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'affiliate_referrals' ORDER BY ordinal_position;

-- 1c. Contar agências por schema (old vs new)
-- SELECT
--   CASE
--     WHEN commission_rules IS NULL THEN 'null'
--     WHEN (commission_rules->'selection_process') ? 'enabled' THEN 'new_schema'
--     ELSE 'old_schema'
--   END AS shape,
--   COUNT(*) AS cnt
-- FROM affiliate_admins GROUP BY 1;
-- RESULTADO: 5 null, 1 old_schema (3359472d — valores customizados, preservar)


-- ============================================================
-- BLOCO 2: Adicionar coluna pending_commission_amount
-- ============================================================

ALTER TABLE affiliate_referrals
  ADD COLUMN IF NOT EXISTS pending_commission_amount NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN affiliate_referrals.pending_commission_amount IS
'Comissão ganha mas não liberada. Movida para commission_amount quando aluno paga i20_control_fee (última taxa).';


-- ============================================================
-- BLOCO 3: Atualizar DEFAULT do column commission_rules
-- Fee types: selection_process, application, placement, i20_control
-- ============================================================

ALTER TABLE affiliate_admins
  ALTER COLUMN commission_rules
  SET DEFAULT '{
    "selection_process": {"type":"fixed","value":100,"enabled":true, "trigger":"on_payment"},
    "application":       {"type":"fixed","value":0,  "enabled":false,"trigger":"on_payment"},
    "placement":         {"type":"fixed","value":0,  "enabled":false,"trigger":"on_payment"},
    "i20_control":       {"type":"fixed","value":0,  "enabled":false,"trigger":"on_payment"},
    "reinstatement":     {"type":"fixed","value":0,  "enabled":false,"trigger":"on_payment"}
  }'::jsonb;


-- ============================================================
-- BLOCO 4a: Agências com commission_rules = NULL (5 agências)
-- Recebem o default completo
-- ============================================================

UPDATE affiliate_admins
SET commission_rules = '{
  "selection_process": {"type":"fixed","value":100,"enabled":true, "trigger":"on_payment"},
  "application":       {"type":"fixed","value":0,  "enabled":false,"trigger":"on_payment"},
  "placement":         {"type":"fixed","value":0,  "enabled":false,"trigger":"on_payment"},
  "i20_control":       {"type":"fixed","value":0,  "enabled":false,"trigger":"on_payment"},
  "reinstatement":     {"type":"fixed","value":0,  "enabled":false,"trigger":"on_payment"}
}'::jsonb
WHERE commission_rules IS NULL;


-- ============================================================
-- BLOCO 4b: Agências com schema antigo (sem 'enabled') — 1 agência (3359472d)
-- Preserva valores customizados, injeta enabled+trigger
-- scholarship → migrado para placement (mantendo valor original)
-- ============================================================

UPDATE affiliate_admins
SET commission_rules = jsonb_build_object(
  'selection_process', COALESCE(commission_rules->'selection_process', '{"type":"fixed","value":0}'::jsonb) || '{"enabled":true,"trigger":"on_payment"}'::jsonb,
  'application',       COALESCE(commission_rules->'application',       '{"type":"fixed","value":0}'::jsonb) || '{"enabled":true,"trigger":"on_payment"}'::jsonb,
  -- scholarship antiga → vira placement (preserva o valor que estava em scholarship)
  'placement',         COALESCE(commission_rules->'placement', commission_rules->'scholarship', '{"type":"fixed","value":0}'::jsonb) || '{"enabled":true,"trigger":"on_payment"}'::jsonb,
  'i20_control',       COALESCE(commission_rules->'i20_control',       '{"type":"fixed","value":0}'::jsonb) || '{"enabled":true,"trigger":"on_payment"}'::jsonb,
  'reinstatement',     COALESCE(commission_rules->'reinstatement',     '{"type":"fixed","value":0,"enabled":false}'::jsonb) || '{"trigger":"on_payment"}'::jsonb
)
WHERE commission_rules IS NOT NULL
  AND NOT (commission_rules->'selection_process') ? 'enabled';


-- ============================================================
-- BLOCO 4c: Confirmar resultado após migration
-- ============================================================

SELECT id, commission_rules FROM affiliate_admins ORDER BY created_at;


-- ============================================================
-- BLOCO 5: Nova função register_payment_billing()
-- Fee types mapeados: selection_process, application_fee, placement_fee, i20_control_fee
-- Rodar por último, após blocos 2-4 concluídos
-- ============================================================

CREATE OR REPLACE FUNCTION register_payment_billing(
  user_id_param            uuid,
  fee_type_param           text,
  amount_param             numeric,
  payment_session_id_param text DEFAULT NULL,
  payment_method_param     text DEFAULT 'manual'
)
RETURNS void AS $BILLING$
DECLARE
  used_code_record     record;
  seller_record        record;
  agency_record        record;
  referrer_id_found    uuid;
  affiliate_code_found text;

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
  -- backward compat: scholarship_fee (fluxo antigo)
  ELSIF fee_type_param = 'scholarship_fee' THEN
    UPDATE user_profiles
    SET scholarship_fee_paid_at = COALESCE(scholarship_fee_paid_at, NOW())
    WHERE user_id = user_id_param;
  END IF;

  -- STEP 2: Resolver referrer (B2C ou seller B2B)
  SELECT referrer_id, affiliate_code
  INTO used_code_record
  FROM used_referral_codes
  WHERE user_id = user_id_param
  LIMIT 1;

  IF FOUND AND used_code_record.referrer_id IS NOT NULL THEN
    referrer_id_found    := used_code_record.referrer_id;
    affiliate_code_found := used_code_record.affiliate_code;
    SELECT id INTO agency_record FROM affiliate_admins WHERE user_id = referrer_id_found;
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

    IF FOUND AND seller_record.referrer_id IS NOT NULL THEN
      referrer_id_found    := seller_record.referrer_id;
      affiliate_code_found := seller_record.affiliate_code;
    END IF;
  END IF;

  -- STEP 3: Mapear fee_type_param → chave de commission_rules
  normalized_fee_key := CASE fee_type_param
    WHEN 'selection_process'     THEN 'selection_process'
    WHEN 'selection_process_fee' THEN 'selection_process'
    WHEN 'application_fee'       THEN 'application'
    WHEN 'placement_fee'         THEN 'placement'
    WHEN 'reinstatement_package' THEN 'reinstatement'
    -- "Control Fee" — 3 fee types diferentes, mesma chave de comissão
    -- i20_control_fee ($900, legado), ds160_package ($1800, F-1 inicial), i539_cos_package ($1800, COS)
    WHEN 'i20_control_fee'       THEN 'i20_control'
    WHEN 'i20_control'           THEN 'i20_control'
    WHEN 'ds160_package'         THEN 'i20_control'
    WHEN 'i539_cos_package'      THEN 'i20_control'
    -- backward compat: scholarship mapeia para placement (fluxo antigo → novo)
    WHEN 'scholarship_fee'       THEN 'placement'
    ELSE NULL  -- outros pacotes sem comissão
  END;

  -- Última taxa em todas as trilhas → libera comissões pendentes (on_last_fee)
  -- trilha legada:        selection → application → placement    → i20_control_fee ($900)
  -- trilha F-1 inicial:   selection → application → placement    → ds160_package ($1800)
  -- trilha COS/reinst.:   selection → application → reinstatement → i539_cos_package ($1800)
  is_last_fee := fee_type_param IN ('i20_control_fee', 'i20_control', 'ds160_package', 'i539_cos_package');

  -- STEP 4: Calcular comissão com lógica de trigger
  IF seller_record.affiliate_admin_id IS NOT NULL AND normalized_fee_key IS NOT NULL THEN
    SELECT commission_rules
    INTO agency_record
    FROM affiliate_admins
    WHERE id = seller_record.affiliate_admin_id AND is_active = true
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

  -- STEP 5: Upsert em affiliate_referrals
  IF referrer_id_found IS NOT NULL THEN
    INSERT INTO affiliate_referrals (
      referrer_id, referred_id, affiliate_code,
      payment_amount, credits_earned,
      commission_amount, pending_commission_amount,
      status, payment_session_id, completed_at
    ) VALUES (
      referrer_id_found, user_id_param, affiliate_code_found,
      amount_param, 0,
      immediate_commission, deferred_commission,
      'completed', payment_session_id_param, NOW()
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
      last_status_update        = NOW();

    RAISE NOTICE '[billing] user=% fee=% key=% amount=% imediato=% diferido=% ultima_taxa=%',
      user_id_param, fee_type_param, normalized_fee_key, amount_param,
      immediate_commission, deferred_commission, is_last_fee;
  END IF;

END;
$BILLING$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text)
  TO authenticated, service_role;
