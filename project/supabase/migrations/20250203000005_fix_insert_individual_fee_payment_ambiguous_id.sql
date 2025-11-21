-- Migration: Fix insert_individual_fee_payment function - ambiguous id column
-- Description: Corrige a ambiguidade da coluna "id" no RETURN QUERY

-- Atualizar função RPC insert_individual_fee_payment para corrigir ambiguidade
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
  p_fee_amount_usd numeric DEFAULT NULL
)
RETURNS TABLE(id uuid, payment_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
  v_record_id uuid;
BEGIN
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
    fee_amount_usd
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
    p_fee_amount_usd
  )
  RETURNING individual_fee_payments.id INTO v_record_id;
  
  -- Retornar id do registro e payment_id gerado com aliases explícitos
  RETURN QUERY SELECT v_record_id AS id, v_payment_id AS payment_id;
END;
$$;

