-- Migration: Fix RPC insert_individual_fee_payment to handle Parcelow upserts and unify fee_types
-- Description: 
-- 1. Unifica fee_type para i20_control
-- 2. Adiciona p_parcelow_reference ao RPC
-- 3. Garante que registros pendentes da Parcelow sejam atualizados em vez de duplicados

CREATE OR REPLACE FUNCTION insert_individual_fee_payment(
  p_user_id uuid,
  p_fee_type text,
  p_amount numeric,
  p_payment_date timestamptz,
  p_payment_method text,
  p_payment_intent_id text DEFAULT NULL,
  p_stripe_charge_id text DEFAULT NULL,
  p_zelle_payment_id uuid DEFAULT NULL,
  p_gross_amount_usd numeric DEFAULT NULL,
  p_fee_amount_usd numeric DEFAULT NULL,
  p_parcelow_order_id text DEFAULT NULL,
  p_parcelow_checkout_url text DEFAULT NULL,
  p_parcelow_reference text DEFAULT NULL
)
RETURNS TABLE(id uuid, payment_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
  v_record_id uuid;
  v_existing_id uuid;
  v_normalized_fee_type text;
BEGIN
  -- Normalizar fee_type
  v_normalized_fee_type := CASE 
    WHEN p_fee_type = 'i20_control_fee' THEN 'i20_control'
    WHEN p_fee_type = 'selection_process_fee' THEN 'selection_process'
    ELSE p_fee_type
  END;

  -- 1. SE for Parcelow, tentar atualizar registro PENDENTE existente para o mesmo fee_type
  -- Isso evita a criação de múltiplas instâncias quando o usuário entra no checkout várias vezes
  IF p_payment_method = 'parcelow' THEN
    SELECT individual_fee_payments.id INTO v_existing_id
    FROM individual_fee_payments
    WHERE individual_fee_payments.user_id = p_user_id 
      AND individual_fee_payments.fee_type = v_normalized_fee_type 
      AND individual_fee_payments.payment_method = 'parcelow'
      AND (individual_fee_payments.parcelow_status = 'pending' OR individual_fee_payments.parcelow_status IS NULL)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE individual_fee_payments
      SET 
        parcelow_order_id = COALESCE(p_parcelow_order_id, parcelow_order_id),
        parcelow_checkout_url = COALESCE(p_parcelow_checkout_url, parcelow_checkout_url),
        parcelow_reference = COALESCE(p_parcelow_reference, parcelow_reference),
        amount = p_amount,
        gross_amount_usd = p_gross_amount_usd,
        fee_amount_usd = p_fee_amount_usd,
        payment_date = p_payment_date,
        updated_at = NOW()
      WHERE individual_fee_payments.id = v_existing_id;

      v_payment_id := gen_random_uuid();
      RETURN QUERY SELECT v_existing_id AS id, v_payment_id AS payment_id;
      RETURN;
    END IF;
  END IF;

  -- 2. Verificar se já existe registro com este payment_intent_id (Stripe/Zelle/etc)
  IF p_payment_intent_id IS NOT NULL AND p_payment_intent_id != '' THEN
    SELECT individual_fee_payments.id INTO v_existing_id
    FROM individual_fee_payments
    WHERE individual_fee_payments.payment_intent_id = p_payment_intent_id
      AND individual_fee_payments.fee_type = v_normalized_fee_type
      AND individual_fee_payments.user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
      v_payment_id := gen_random_uuid();
      RETURN QUERY SELECT v_existing_id AS id, v_payment_id AS payment_id;
      RETURN;
    END IF;
  END IF;
  
  -- 3. Gerar payment_id único e inserir novo registro
  v_payment_id := gen_random_uuid();
  
  INSERT INTO individual_fee_payments (
    user_id,
    fee_type,
    amount,
    payment_date,
    payment_method,
    payment_intent_id,
    stripe_charge_id,
    zelle_payment_id,
    gross_amount_usd,
    fee_amount_usd,
    parcelow_order_id,
    parcelow_checkout_url,
    parcelow_reference,
    parcelow_status
  ) VALUES (
    p_user_id,
    v_normalized_fee_type,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_payment_intent_id,
    p_stripe_charge_id,
    p_zelle_payment_id,
    p_gross_amount_usd,
    p_fee_amount_usd,
    p_parcelow_order_id,
    p_parcelow_checkout_url,
    p_parcelow_reference,
    CASE WHEN p_parcelow_order_id IS NOT NULL THEN 'pending' ELSE NULL END
  )
  RETURNING individual_fee_payments.id INTO v_record_id;
  
  RETURN QUERY SELECT v_record_id AS id, v_payment_id AS payment_id;
END;
$$;
