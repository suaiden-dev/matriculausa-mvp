-- Add parcelow_reference column to individual_fee_payments
ALTER TABLE individual_fee_payments 
ADD COLUMN IF NOT EXISTS parcelow_reference text;

-- Add comment
COMMENT ON COLUMN individual_fee_payments.parcelow_reference IS 'Reference ID usado na criação do pedido Parcelow';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_individual_fee_payments_parcelow_reference 
ON individual_fee_payments(parcelow_reference) 
WHERE parcelow_reference IS NOT NULL;

-- Update insert_individual_fee_payment RPC to handle parcelow_reference
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
        parcelow_reference,
        parcelow_status
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
        p_parcelow_reference,
        CASE WHEN p_parcelow_order_id IS NOT NULL THEN 'pending' ELSE NULL END
    )
    RETURNING individual_fee_payments.id INTO v_record_id;
    
    RETURN QUERY SELECT v_record_id AS id, v_payment_id AS payment_id;
END;
$$;
