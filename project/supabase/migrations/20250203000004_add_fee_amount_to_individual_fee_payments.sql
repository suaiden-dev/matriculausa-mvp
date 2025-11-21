-- Migration: Add fee_amount_usd column to individual_fee_payments
-- Description: Adiciona coluna para armazenar as taxas do Stripe em USD (para pagamentos PIX)

-- Adicionar coluna fee_amount_usd na tabela individual_fee_payments
ALTER TABLE individual_fee_payments 
ADD COLUMN IF NOT EXISTS fee_amount_usd numeric(10,2);

-- Adicionar comentário na coluna
COMMENT ON COLUMN individual_fee_payments.fee_amount_usd IS 'Taxas do Stripe em USD (fee do BalanceTransaction) - usado principalmente para pagamentos PIX';

-- Atualizar função RPC insert_individual_fee_payment para aceitar p_fee_amount_usd
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
  RETURNING id INTO v_record_id;
  
  -- Retornar id do registro e payment_id gerado
  RETURN QUERY SELECT v_record_id, v_payment_id;
END;
$$;

