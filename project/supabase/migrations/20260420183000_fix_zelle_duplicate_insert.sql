-- Fix race condition for Zelle payments by adding duplicate check in the RPC
CREATE OR REPLACE FUNCTION public.insert_individual_fee_payment(p_user_id uuid, p_fee_type text, p_amount numeric, p_payment_date timestamp with time zone, p_payment_method text, p_payment_intent_id text DEFAULT NULL::text, p_stripe_charge_id text DEFAULT NULL::text, p_zelle_payment_id uuid DEFAULT NULL::uuid, p_gross_amount_usd numeric DEFAULT NULL::numeric, p_fee_amount_usd numeric DEFAULT NULL::numeric, p_parcelow_order_id text DEFAULT NULL::text, p_parcelow_checkout_url text DEFAULT NULL::text, p_parcelow_reference text DEFAULT NULL::text, p_source text DEFAULT 'matriculausa'::text)
 RETURNS TABLE(id uuid, payment_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_payment_id uuid;
  v_record_id uuid;
  v_existing_id uuid;
BEGIN
  -- Verificar se já existe registro com este payment_intent_id (Stripe/PIX)
  IF p_payment_intent_id IS NOT NULL AND p_payment_intent_id != '' THEN
    SELECT individual_fee_payments.id INTO v_existing_id
    FROM individual_fee_payments
    WHERE individual_fee_payments.payment_intent_id = p_payment_intent_id
      AND individual_fee_payments.fee_type = p_fee_type
      AND individual_fee_payments.user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
      v_payment_id := gen_random_uuid();
      RETURN QUERY SELECT v_existing_id AS id, v_payment_id AS payment_id;
      RETURN;
    END IF;
  END IF;

  -- Verificar se já existe registro com este parcelow_order_id
  IF p_parcelow_order_id IS NOT NULL AND p_parcelow_order_id != '' THEN
    SELECT individual_fee_payments.id INTO v_existing_id
    FROM individual_fee_payments
    WHERE individual_fee_payments.parcelow_order_id = p_parcelow_order_id
      AND individual_fee_payments.fee_type = p_fee_type
      AND individual_fee_payments.user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
      v_payment_id := gen_random_uuid();
      RETURN QUERY SELECT v_existing_id AS id, v_payment_id AS payment_id;
      RETURN;
    END IF;
  END IF;
  
  -- Verificar se já existe registro com este parcelow_reference
  IF p_parcelow_reference IS NOT NULL AND p_parcelow_reference != '' THEN
    SELECT individual_fee_payments.id INTO v_existing_id
    FROM individual_fee_payments
    WHERE individual_fee_payments.parcelow_reference = p_parcelow_reference
      AND individual_fee_payments.fee_type = p_fee_type
      AND individual_fee_payments.user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
      v_payment_id := gen_random_uuid();
      RETURN QUERY SELECT v_existing_id AS id, v_payment_id AS payment_id;
      RETURN;
    END IF;
  END IF;

  -- Verificar se já existe registro com este zelle_payment_id (Proteção contra Race Condition)
  IF p_zelle_payment_id IS NOT NULL THEN
    SELECT individual_fee_payments.id INTO v_existing_id
    FROM individual_fee_payments
    WHERE individual_fee_payments.zelle_payment_id = p_zelle_payment_id
      AND individual_fee_payments.fee_type = p_fee_type
      AND individual_fee_payments.user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
      v_payment_id := gen_random_uuid();
      RETURN QUERY SELECT v_existing_id AS id, v_payment_id AS payment_id;
      RETURN;
    END IF;
  END IF;
  
  -- Gerar payment_id único
  v_payment_id := gen_random_uuid();
  
  -- Inserir registro na tabela individual_fee_payments
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
    parcelow_status,
    parcelow_reference,
    source
  ) VALUES (
    p_user_id,
    p_fee_type,
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
    CASE WHEN p_parcelow_order_id IS NOT NULL THEN 'pending' ELSE NULL END,
    p_parcelow_reference,
    p_source
  )
  RETURNING individual_fee_payments.id INTO v_record_id;
  
  RETURN QUERY SELECT v_record_id AS id, v_payment_id AS payment_id;
END;
$function$
